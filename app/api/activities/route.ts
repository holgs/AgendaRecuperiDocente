import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const schoolYearId = searchParams.get('schoolYearId')
    const teacherId = searchParams.get('teacherId')

    let query = supabase
      .from('recovery_activities')
      .select(`
        *,
        teacher:teachers (
          cognome,
          nome
        ),
        recovery_type:recovery_types (
          name,
          color
        )
      `)
      .order('date', { ascending: false })

    if (schoolYearId) {
      query = query.eq('school_year_id', schoolYearId)
    }

    if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    }

    const { data: activities, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { teacher_id, date, module_number, class_name, recovery_type_id, school_year_id } = body

    // Validation: Required fields
    if (!teacher_id || !date || !module_number || !class_name) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti: teacher_id, date, module_number, class_name' },
        { status: 400 }
      )
    }

    // Validation: Check teacher budget
    const { data: budget, error: budgetError } = await supabase
      .from('teacher_budgets')
      .select('*')
      .eq('teacher_id', teacher_id)
      .eq('school_year_id', school_year_id)
      .single()

    if (budgetError || !budget) {
      return NextResponse.json(
        { error: 'Budget non trovato per questo docente' },
        { status: 404 }
      )
    }

    const modulesRemaining = budget.modules_annual - (budget.modules_used || 0)
    if (modulesRemaining < 1) {
      return NextResponse.json(
        { error: 'Budget esaurito: non ci sono moduli disponibili' },
        { status: 400 }
      )
    }

    // Validation: Check teacher overlap (same teacher, same date, same module)
    const { data: teacherOverlap, error: overlapError } = await supabase
      .from('recovery_activities')
      .select('id')
      .eq('teacher_id', teacher_id)
      .eq('date', date)
      .eq('module_number', module_number)
      .limit(1)

    if (overlapError) {
      throw overlapError
    }

    if (teacherOverlap && teacherOverlap.length > 0) {
      return NextResponse.json(
        { error: 'Sovrapposizione docente: il modulo è già occupato per questo docente' },
        { status: 400 }
      )
    }

    // Warning: Check class overlap (same class, same date, same module) - but allow
    const { data: classOverlap } = await supabase
      .from('recovery_activities')
      .select('id, teacher:teachers(cognome, nome)')
      .eq('class_name', class_name)
      .eq('date', date)
      .eq('module_number', module_number)
      .limit(1)

    // Create activity - duration always 50 minutes (1 module)
    const { data: activity, error: createError } = await supabase
      .from('recovery_activities')
      .insert({
        teacher_id,
        school_year_id,
        recovery_type_id,
        date,
        module_number,
        class_name,
        duration_minutes: 50,
        modules_equivalent: 1,
        status: 'planned',
        created_by: user.id
      })
      .select(`
        *,
        teacher:teachers (cognome, nome),
        recovery_type:recovery_types (name, color)
      `)
      .single()

    if (createError) {
      throw createError
    }

    // Update teacher budget
    const { error: updateError } = await supabase
      .from('teacher_budgets')
      .update({
        modules_used: (budget.modules_used || 0) + 1,
        minutes_used: (budget.minutes_used || 0) + 50
      })
      .eq('id', budget.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      activity,
      warning: classOverlap && classOverlap.length > 0
        ? `Attenzione: la classe ${class_name} ha già un'attività in questo modulo`
        : null
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}