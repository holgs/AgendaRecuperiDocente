import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseTesorettiCSV, splitDocenteName } from '@/lib/csv-parser'
import { ImportResult } from '@/lib/validations/import'

export const dynamic = 'force-dynamic'

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

    // Find or create school year using Supabase (bypassing Prisma pooler issues)
    const { data: existingYear } = await supabase
      .from('school_years')
      .select('*')
      .eq('name', schoolYearName)
      .single()

    let schoolYear = existingYear

    if (!schoolYear) {
      // Extract start and end year from name
      const [startYearStr, endYearShort] = schoolYearName.split('-')
      const startYear = parseInt(startYearStr)
      const endYear = parseInt(`${startYearStr.substring(0, 2)}${endYearShort}`)

      // Create dates (September 1st to August 31st)
      const startDate = new Date(startYear, 8, 1).toISOString()
      const endDate = new Date(endYear, 7, 31).toISOString()

      // Create school year
      const { data: newYear, error: createError } = await supabase
        .from('school_years')
        .insert({
          name: schoolYearName,
          start_date: startDate,
          end_date: endDate,
          weeks_count: 36,
          is_active: true
        })
        .select()
        .single()

      if (createError) {
        throw new Error(`Failed to create school year: ${createError.message}`)
      }

      schoolYear = newYear

      // Deactivate all other school years
      await supabase
        .from('school_years')
        .update({ is_active: false })
        .neq('id', schoolYear.id)
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

    // Process each valid row using Supabase client
    for (const row of parseResult.data) {
      try {
        const { cognome, nome, email } = splitDocenteName(row.docente)

        // Find or create teacher using Supabase
        const { data: existingTeacher } = await supabase
          .from('teachers')
          .select('*')
          .ilike('cognome', cognome)
          .ilike('nome', nome)
          .single()

        let teacher = existingTeacher

        if (!teacher) {
          const { data: newTeacher, error: teacherError } = await supabase
            .from('teachers')
            .insert({
              cognome,
              nome,
              email
            })
            .select()
            .single()

          if (teacherError) {
            throw new Error(`Failed to create teacher: ${teacherError.message}`)
          }
          teacher = newTeacher
        } else if (!teacher.email) {
          // Update existing teacher with generated email if missing
          await supabase
            .from('teachers')
            .update({ email })
            .eq('id', teacher.id)
        }

        // Check if budget already exists
        const { data: existingBudget } = await supabase
          .from('teacher_budgets')
          .select('*')
          .eq('teacher_id', teacher.id)
          .eq('school_year_id', schoolYear.id)
          .single()

        if (existingBudget) {
          // Update existing budget
          const { error: updateError } = await supabase
            .from('teacher_budgets')
            .update({
              minutes_weekly: row.minutiSettimanali,
              minutes_annual: row.tesorettoAnnuale,
              modules_annual: row.moduliAnnui,
              import_date: new Date().toISOString(),
              import_source: file.name
            })
            .eq('id', existingBudget.id)

          if (updateError) {
            throw new Error(`Failed to update budget: ${updateError.message}`)
          }
        } else {
          // Create new budget
          const { error: insertError } = await supabase
            .from('teacher_budgets')
            .insert({
              teacher_id: teacher.id,
              school_year_id: schoolYear.id,
              minutes_weekly: row.minutiSettimanali,
              minutes_annual: row.tesorettoAnnuale,
              modules_annual: row.moduliAnnui,
              minutes_used: 0,
              modules_used: 0,
              import_date: new Date().toISOString(),
              import_source: file.name
            })

          if (insertError) {
            throw new Error(`Failed to create budget: ${insertError.message}`)
          }
        }

        importResult.imported++
      } catch (error) {
        importResult.failed++
        importResult.errors.push({
          row: 0,
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
