import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { parseActivitiesCSV } from '@/lib/csv-parser'
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
    const parseResult = parseActivitiesCSV(csvContent)

    const importResult: ImportResult = {
      success: true,
      imported: 0,
      failed: parseResult.errors.length,
      errors: parseResult.errors,
      warnings: parseResult.warnings
    }

    // CRITICAL: Delete all existing activities for this school year
    const deletedCount = await prisma.recovery_activities.deleteMany({
      where: {
        school_year_id: schoolYearId
      }
    })

    // Reset all budgets for this school year
    await prisma.teacher_budgets.updateMany({
      where: {
        school_year_id: schoolYearId
      },
      data: {
        minutes_used: 0,
        modules_used: 0
      }
    })

    // Process each valid row
    for (const row of parseResult.data) {
      try {
        const teacher = await prisma.teachers.findFirst({
          where: {
            cognome: { equals: row.cognome, mode: 'insensitive' },
            nome: { equals: row.nome, mode: 'insensitive' }
          }
        })

        if (!teacher) {
          importResult.failed++
          importResult.errors.push({
            row: 0,
            docente: `${row.cognome} ${row.nome}`,
            error: 'Teacher not found'
          })
          continue
        }

        const recoveryType = await prisma.recovery_types.findFirst({
          where: {
            name: { equals: row.tipologia, mode: 'insensitive' },
            is_active: true
          }
        })

        if (!recoveryType) {
          importResult.failed++
          importResult.errors.push({
            row: 0,
            docente: `${row.cognome} ${row.nome}`,
            error: `Recovery type "${row.tipologia}" not found`
          })
          continue
        }

        const modulesEquivalent = Math.floor(row.durata / 50)
        const activityDate = new Date(row.data)

        if (isNaN(activityDate.getTime())) {
          importResult.failed++
          importResult.errors.push({
            row: 0,
            docente: `${row.cognome} ${row.nome}`,
            error: `Invalid date: ${row.data}`
          })
          continue
        }

        await prisma.recovery_activities.create({
          data: {
            teacher_id: teacher.id,
            school_year_id: schoolYearId,
            recovery_type_id: recoveryType.id,
            date: activityDate,
            duration_minutes: row.durata,
            modules_equivalent: modulesEquivalent,
            title: row.titolo,
            description: row.descrizione || null,
            status: 'completed',
            created_by: user.id
          }
        })

        const budget = await prisma.teacher_budgets.findFirst({
          where: {
            teacher_id: teacher.id,
            school_year_id: schoolYearId
          }
        })

        if (budget) {
          await prisma.teacher_budgets.update({
            where: { id: budget.id },
            data: {
              minutes_used: (budget.minutes_used || 0) + row.durata,
              modules_used: (budget.modules_used || 0) + modulesEquivalent
            }
          })
        }

        importResult.imported++
      } catch (error) {
        importResult.failed++
        importResult.errors.push({
          row: 0,
          docente: `${row.cognome} ${row.nome}`,
          error: error instanceof Error ? error.message : 'Failed to import'
        })
      }
    }

    importResult.success = importResult.failed === 0

    return NextResponse.json({
      ...importResult,
      message: `Deleted ${deletedCount.count} old activities, imported ${importResult.imported} new`
    }, {
      status: importResult.success ? 200 : 207
    })
  } catch (error) {
    console.error('Error importing activities:', error)
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
