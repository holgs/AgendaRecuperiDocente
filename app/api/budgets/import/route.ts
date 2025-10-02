import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { parseTesorettiCSV, splitDocenteName } from '@/lib/csv-parser'
import { ImportResult } from '@/lib/validations/import'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const schoolYearName = formData.get('schoolYearName') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!schoolYearName) {
      return NextResponse.json({ error: 'School year name required' }, { status: 400 })
    }

    // Validate school year format (YYYY-YY)
    const yearRegex = /^\d{4}-\d{2}$/
    if (!yearRegex.test(schoolYearName)) {
      return NextResponse.json({ error: 'Invalid school year format. Use YYYY-YY (e.g. 2024-25)' }, { status: 400 })
    }

    // Find or create school year
    let schoolYear = await prisma.school_years.findFirst({
      where: { name: schoolYearName }
    })

    if (!schoolYear) {
      // Extract start and end year from name (e.g., "2024-25" -> start: 2024, end: 2025)
      const [startYearStr, endYearShort] = schoolYearName.split('-')
      const startYear = parseInt(startYearStr)
      const endYear = parseInt(`${startYearStr.substring(0, 2)}${endYearShort}`)

      // Create dates (September 1st to August 31st)
      const startDate = new Date(startYear, 8, 1) // September is month 8 (0-indexed)
      const endDate = new Date(endYear, 7, 31) // August is month 7

      // Calculate weeks (approximately 36 weeks in a school year)
      const weeksCount = 36

      schoolYear = await prisma.school_years.create({
        data: {
          name: schoolYearName,
          start_date: startDate,
          end_date: endDate,
          weeks_count: weeksCount,
          is_active: true // Set as active by default
        }
      })

      // Deactivate all other school years
      await prisma.school_years.updateMany({
        where: {
          id: { not: schoolYear.id }
        },
        data: {
          is_active: false
        }
      })
    }

    // Read CSV file content
    const csvContent = await file.text()

    // Parse and validate CSV
    const parseResult = parseTesorettiCSV(csvContent)

    const importResult: ImportResult = {
      success: true,
      imported: 0,
      failed: parseResult.errors.length,
      errors: parseResult.errors,
      warnings: parseResult.warnings
    }

    // Process each valid row
    for (const row of parseResult.data) {
      try {
        const { cognome, nome } = splitDocenteName(row.docente)

        // Find or create teacher
        let teacher = await prisma.teachers.findFirst({
          where: {
            cognome: { equals: cognome, mode: 'insensitive' },
            nome: { equals: nome, mode: 'insensitive' }
          }
        })

        if (!teacher) {
          teacher = await prisma.teachers.create({
            data: {
              cognome,
              nome
            }
          })
        }

        // Check if budget already exists for this teacher and school year
        const existingBudget = await prisma.teacher_budgets.findFirst({
          where: {
            teacher_id: teacher.id,
            school_year_id: schoolYear.id
          }
        })

        if (existingBudget) {
          // Update existing budget
          await prisma.teacher_budgets.update({
            where: { id: existingBudget.id },
            data: {
              minutes_weekly: row.minutiSettimanali,
              minutes_annual: row.tesorettoAnnuale,
              modules_annual: row.moduliAnnui,
              import_date: new Date(),
              import_source: file.name
            }
          })
        } else {
          // Create new budget
          await prisma.teacher_budgets.create({
            data: {
              teacher_id: teacher.id,
              school_year_id: schoolYear.id,
              minutes_weekly: row.minutiSettimanali,
              minutes_annual: row.tesorettoAnnuale,
              modules_annual: row.moduliAnnui,
              minutes_used: 0,
              modules_used: 0,
              import_date: new Date(),
              import_source: file.name
            }
          })
        }

        importResult.imported++
      } catch (error) {
        importResult.failed++
        importResult.errors.push({
          row: 0, // We don't have row number here
          docente: row.docente,
          error: error instanceof Error ? error.message : 'Failed to import row'
        })
      }
    }

    importResult.success = importResult.failed === 0

    return NextResponse.json(importResult, {
      status: importResult.success ? 200 : 207 // 207 Multi-Status for partial success
    })
  } catch (error) {
    console.error('Error importing budgets:', error)
    return NextResponse.json(
      {
        success: false,
        imported: 0,
        failed: 0,
        errors: [{
          row: 0,
          error: error instanceof Error ? error.message : 'Internal server error'
        }],
        warnings: []
      } as ImportResult,
      { status: 500 }
    )
  }
}
