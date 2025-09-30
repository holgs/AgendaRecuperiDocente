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
    const schoolYearId = formData.get('schoolYearId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!schoolYearId) {
      return NextResponse.json({ error: 'School year ID required' }, { status: 400 })
    }

    // Verify school year exists
    const schoolYear = await prisma.school_years.findUnique({
      where: { id: schoolYearId }
    })

    if (!schoolYear) {
      return NextResponse.json({ error: 'School year not found' }, { status: 404 })
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
            school_year_id: schoolYearId
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
              school_year_id: schoolYearId,
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