import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveModuleDuration } from '@/lib/modules/duration'

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
    console.log('🚀 POST /api/activities - Starting')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 User:', user?.id)

    if (!user) {
      console.log('❌ No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📦 Request body:', body)
    const { teacher_id, date, module_number, class_name, recovery_type_id, school_year_id, co_teacher_name } = body

    // Validation: Required fields
    if (!teacher_id || !date || !module_number || !class_name) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti: teacher_id, date, module_number, class_name' },
        { status: 400 }
      )
    }

    // Validation: Check teacher budget
    console.log('🔍 Fetching budget for teacher:', teacher_id, 'year:', school_year_id)
    const { data: budget, error: budgetError } = await supabase
      .from('teacher_budgets')
      .select('*')
      .eq('teacher_id', teacher_id)
      .eq('school_year_id', school_year_id)
      .single()

    console.log('💰 Budget result:', { budget, budgetError })

    if (budgetError || !budget) {
      console.log('❌ Budget not found or error:', budgetError)
      return NextResponse.json(
        { error: 'Budget non trovato per questo docente' },
        { status: 404 }
      )
    }

    // Resolve module duration from the admin-defined grid (Punto 3): the minutes
    // deducted depend on the weekday of `date` and the module slot, not a fixed 50.
    const { minutes: durationMinutes } = await resolveModuleDuration(supabase, {
      schoolYearId: school_year_id,
      date,
      moduleNumber: module_number,
    })

    // Budget is accounted in MINUTES (single source of truth).
    const minutesRemaining = (budget.minutes_annual || 0) - (budget.minutes_used || 0)
    if (durationMinutes > minutesRemaining) {
      return NextResponse.json(
        { error: 'Budget esaurito: minuti disponibili insufficienti per questo modulo' },
        { status: 400 }
      )
    }

    // Convert date string to ISO for database queries
    const dateStart = new Date(date)
    dateStart.setHours(0, 0, 0, 0)
    const dateStartISO = dateStart.toISOString()

    const dateEnd = new Date(date)
    dateEnd.setHours(23, 59, 59, 999)
    const dateEndISO = dateEnd.toISOString()

    console.log('📅 Date range for overlap check:', { dateStartISO, dateEndISO })

    // Validation: Check teacher overlap (same teacher, same date, same module)
    console.log('🔍 Checking teacher overlap...')
    const { data: teacherOverlap, error: overlapError } = await supabase
      .from('recovery_activities')
      .select('id')
      .eq('teacher_id', teacher_id)
      .gte('date', dateStartISO)
      .lte('date', dateEndISO)
      .eq('module_number', module_number)
      .limit(1)

    console.log('👥 Teacher overlap result:', { teacherOverlap, overlapError })

    if (overlapError) {
      console.log('❌ Teacher overlap check error:', overlapError)
      throw overlapError
    }

    if (teacherOverlap && teacherOverlap.length > 0) {
      console.log('❌ Teacher overlap found')
      return NextResponse.json(
        { error: 'Sovrapposizione docente: il modulo è già occupato per questo docente' },
        { status: 400 }
      )
    }

    // Warning: Check class overlap (same class, same date, same module) - but allow
    console.log('🔍 Checking class overlap...')
    const { data: classOverlap } = await supabase
      .from('recovery_activities')
      .select('id, teacher:teachers(cognome, nome)')
      .eq('class_name', class_name)
      .gte('date', dateStartISO)
      .lte('date', dateEndISO)
      .eq('module_number', module_number)
      .limit(1)

    console.log('🏫 Class overlap result:', classOverlap)

    // Create activity - duration always 50 minutes (1 module)
    console.log('📝 Creating activity...')

    // Find user in public.users by email for FK constraint
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    const publicUserId = existingUser?.id || user.id

    const activityData = {
      teacher_id,
      school_year_id,
      recovery_type_id,
      date: dateStartISO,
      module_number,
      class_name,
      title: `Recupero ${class_name} - Unità Oraria ${module_number}`,
      duration_minutes: durationMinutes,
      modules_equivalent: Math.round(durationMinutes / 50),
      status: 'planned',
      created_by: publicUserId,
      co_teacher_name: co_teacher_name || null
    }
    console.log('📝 Activity data:', activityData)

    const { data: activity, error: createError } = await supabase
      .from('recovery_activities')
      .insert(activityData)
      .select(`
        *,
        teacher:teachers (cognome, nome),
        recovery_type:recovery_types (name, color)
      `)
      .single()

    console.log('✅ Create activity result:', { activity, createError })

    if (createError) {
      console.log('❌ Create activity error:', createError)
      throw createError
    }

    // Update teacher budget
    console.log('💰 Updating budget...')
    const budgetUpdate = {
      modules_used: (budget.modules_used || 0) + Math.round(durationMinutes / 50),
      minutes_used: (budget.minutes_used || 0) + durationMinutes
    }
    console.log('💰 Budget update data:', budgetUpdate)

    const { error: updateError } = await supabase
      .from('teacher_budgets')
      .update(budgetUpdate)
      .eq('id', budget.id)

    console.log('✅ Update budget result:', { updateError })

    if (updateError) {
      console.log('❌ Update budget error:', updateError)
      throw updateError
    }

    console.log('🎉 Activity created successfully!')

    return NextResponse.json({
      activity,
      warning: classOverlap && classOverlap.length > 0
        ? `Attenzione: la classe ${class_name} ha già un'attività in questo modulo`
        : null
    }, { status: 201 })

  } catch (error) {
    console.error('❌ CRITICAL ERROR in POST /api/activities:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
