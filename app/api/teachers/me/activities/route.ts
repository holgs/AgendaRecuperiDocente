import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTeacher } from '@/lib/auth/roles'
import { resolveModuleDuration } from '@/lib/modules/duration'

export const dynamic = 'force-dynamic'

/**
 * GET /api/teachers/me/activities
 * Returns authenticated teacher's recovery activities with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Require teacher authentication
    const user = await requireTeacher()
    const teacherId = user.teacherId!

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const schoolYearId = searchParams.get('school_year_id')
    const status = searchParams.get('status') // 'planned' | 'completed' | 'all'

    // Build query for teacher's activities
    let query = supabase
      .from('recovery_activities')
      .select(
        `
        id,
        date,
        module_number,
        class_name,
        title,
        description,
        duration_minutes,
        modules_equivalent,
        status,
        created_at,
        updated_at,
        recovery_type:recovery_types (
          id,
          name,
          color
        ),
        school_year:school_years (
          id,
          name
        )
      `
      )
      .eq('teacher_id', teacherId)
      .order('date', { ascending: false })

    // Filter by school year if provided, otherwise get active year's activities
    if (schoolYearId) {
      query = query.eq('school_year_id', schoolYearId)
    } else {
      // Get active school year
      const { data: activeYear } = await supabase
        .from('school_years')
        .select('id')
        .eq('is_active', true)
        .single()

      if (activeYear) {
        query = query.eq('school_year_id', activeYear.id)
      }
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: activities, error } = await query

    if (error) {
      console.error('Error fetching teacher activities:', error)
      return NextResponse.json({ error: 'Errore nel recupero delle attività' }, { status: 500 })
    }

    // Calculate summary statistics
    const planned = activities?.filter((a) => a.status === 'planned').length || 0
    const completed = activities?.filter((a) => a.status === 'completed').length || 0
    const totalModules =
      activities?.reduce((sum, a) => sum + (a.modules_equivalent || 0), 0) || 0

    return NextResponse.json({
      activities: activities || [],
      summary: {
        total_activities: activities?.length || 0,
        total_modules: totalModules,
        planned,
        completed,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/teachers/me/activities:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}

/**
 * POST /api/teachers/me/activities
 * Create a new recovery activity for the authenticated teacher
 */
export async function POST(request: NextRequest) {
  try {
    // Require teacher authentication
    const user = await requireTeacher()
    const teacherId = user.teacherId!
    const userId = user.id

    const supabase = await createClient()
    const body = await request.json()

    // Extract and validate required fields
    const { date, module_number, class_name, recovery_type_id, school_year_id, description } =
      body

    // Validation: Required fields
    if (!date || !module_number || !class_name || !recovery_type_id || !school_year_id) {
      return NextResponse.json(
        {
          error:
            'Campi obbligatori mancanti: date, module_number, class_name, recovery_type_id, school_year_id',
        },
        { status: 400 }
      )
    }

    // Step 1: Get teacher's budget for this school year
    const { data: budget, error: budgetError } = await supabase
      .from('teacher_budgets')
      .select('id, modules_annual, modules_used, minutes_annual, minutes_used')
      .eq('teacher_id', teacherId)
      .eq('school_year_id', school_year_id)
      .single()

    if (budgetError || !budget) {
      return NextResponse.json(
        { error: 'Budget non trovato per questo anno scolastico' },
        { status: 404 }
      )
    }

    // Step 2: Resolve module duration from the admin grid and check budget in MINUTES
    const modulesUsed = budget.modules_used || 0
    const { minutes: durationMinutes } = await resolveModuleDuration(supabase, {
      schoolYearId: school_year_id,
      date,
      moduleNumber: module_number,
    })
    const minutesRemaining = (budget.minutes_annual || 0) - (budget.minutes_used || 0)
    if (durationMinutes > minutesRemaining) {
      return NextResponse.json(
        {
          error: 'Budget esaurito: minuti disponibili insufficienti per questo modulo',
          budget: {
            annual_minutes: budget.minutes_annual || 0,
            used_minutes: budget.minutes_used || 0,
            remaining_minutes: minutesRemaining,
          },
        },
        { status: 400 }
      )
    }

    // Step 3: Check for teacher overlap (same teacher, date, module) - BLOCKING
    const { data: teacherOverlap } = await supabase
      .from('recovery_activities')
      .select('id, title')
      .eq('teacher_id', teacherId)
      .eq('date', date)
      .eq('module_number', module_number)
      .maybeSingle()

    if (teacherOverlap) {
      return NextResponse.json(
        {
          error: `Sovrapposizione docente: hai già un'attività programmata per questo modulo (${teacherOverlap.title})`,
          conflicting_activity_id: teacherOverlap.id,
        },
        { status: 400 }
      )
    }

    // Step 4: Check for class overlap (same class, date, module) - WARNING only
    const { data: classOverlap } = await supabase
      .from('recovery_activities')
      .select(
        `
        id,
        title,
        teacher:teachers (
          nome,
          cognome
        )
      `
      )
      .eq('class_name', class_name)
      .eq('date', date)
      .eq('module_number', module_number)
      .maybeSingle()

    let warning = null
    if (classOverlap) {
      const teacher = Array.isArray(classOverlap.teacher)
        ? classOverlap.teacher[0]
        : classOverlap.teacher
      if (teacher) {
        warning = `Attenzione: la classe ${class_name} ha già un'attività in questo modulo con ${teacher.nome} ${teacher.cognome}`
      }
    }

    // Step 5: Get recovery type (for the activity title)
    const { data: recoveryType } = await supabase
      .from('recovery_types')
      .select('name')
      .eq('id', recovery_type_id)
      .single()

    if (!recoveryType) {
      return NextResponse.json({ error: 'Tipo di recupero non trovato' }, { status: 404 })
    }

    // Duration already resolved from the module grid (Step 2). Keep a legacy
    // module-equivalent for backward compatibility (minutes are authoritative).
    const modulesEquivalent = Math.round(durationMinutes / 50)

    // Generate activity title
    const activityTitle = `${recoveryType.name} - ${class_name} - Modulo ${module_number}`

    // Step 6: Insert new activity
    const { data: newActivity, error: activityError } = await supabase
      .from('recovery_activities')
      .insert({
        teacher_id: teacherId,
        school_year_id,
        recovery_type_id,
        date,
        module_number,
        class_name,
        title: activityTitle,
        description: description || null,
        duration_minutes: durationMinutes,
        modules_equivalent: modulesEquivalent,
        status: 'planned',
        created_by: userId,
      })
      .select(
        `
        *,
        recovery_type:recovery_types (
          id,
          name,
          color
        ),
        school_year:school_years (
          id,
          name
        )
      `
      )
      .single()

    if (activityError || !newActivity) {
      console.error('Error creating activity:', activityError)
      return NextResponse.json({ error: 'Errore nella creazione dell\'attività' }, { status: 500 })
    }

    // Step 7: Update budget (deduct modules and minutes)
    const { error: budgetUpdateError } = await supabase
      .from('teacher_budgets')
      .update({
        modules_used: modulesUsed + modulesEquivalent,
        minutes_used: (budget.minutes_used || 0) + durationMinutes,
      })
      .eq('id', budget.id)

    if (budgetUpdateError) {
      console.error('Error updating budget:', budgetUpdateError)
      // Rollback: Delete the activity we just created
      await supabase.from('recovery_activities').delete().eq('id', newActivity.id)
      return NextResponse.json(
        { error: 'Errore nell\'aggiornamento del budget' },
        { status: 500 }
      )
    }

    // Return success with activity and optional warning (minutes are authoritative)
    const newMinutesUsed = (budget.minutes_used || 0) + durationMinutes
    return NextResponse.json(
      {
        activity: newActivity,
        warning,
        budget: {
          minutes_used: newMinutesUsed,
          minutes_remaining: (budget.minutes_annual || 0) - newMinutesUsed,
          duration_minutes: durationMinutes,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/teachers/me/activities:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}
