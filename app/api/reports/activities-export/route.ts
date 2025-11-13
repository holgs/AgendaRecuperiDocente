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

    // Get active school year
    const { data: activeYear, error: yearError } = await supabase
      .from('school_years')
      .select('*')
      .eq('is_active', true)
      .single()

    if (yearError || !activeYear) {
      return NextResponse.json({
        error: 'No active school year found'
      }, { status: 404 })
    }

    // Get all teachers with their budgets for active year
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select(`
        id,
        nome,
        cognome,
        email,
        teacher_budgets!inner (
          id,
          school_year_id,
          modules_annual
        )
      `)
      .eq('teacher_budgets.school_year_id', activeYear.id)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })

    if (teachersError) {
      console.error('Error fetching teachers:', teachersError)
      return NextResponse.json(
        { error: 'Failed to fetch teachers' },
        { status: 500 }
      )
    }

    // Get all completed activities for active year
    const { data: completedActivities, error: activitiesError } = await supabase
      .from('recovery_activities')
      .select('teacher_id, modules_equivalent, status')
      .eq('school_year_id', activeYear.id)
      .eq('status', 'completed')

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      )
    }

    // Calculate completed modules per teacher
    const completedModulesByTeacher = (completedActivities || []).reduce((acc, activity) => {
      if (!acc[activity.teacher_id]) {
        acc[activity.teacher_id] = 0
      }
      acc[activity.teacher_id] += activity.modules_equivalent || 0
      return acc
    }, {} as Record<string, number>)

    // Build report data
    const reportData = (teachers || []).map(teacher => {
      const budget = Array.isArray(teacher.teacher_budgets)
        ? teacher.teacher_budgets[0]
        : teacher.teacher_budgets

      const modulesAnnual = budget?.modules_annual || 0
      const modulesCompleted = completedModulesByTeacher[teacher.id] || 0
      const percentage = modulesAnnual > 0
        ? ((modulesCompleted / modulesAnnual) * 100).toFixed(2)
        : '0.00'

      return {
        nome: teacher.nome,
        cognome: teacher.cognome,
        moduliDaRecuperare: modulesAnnual.toFixed(2),
        moduliRecuperati: modulesCompleted.toFixed(2),
        percentuale: `${percentage}%`
      }
    })

    return NextResponse.json({
      schoolYear: activeYear.name,
      generatedAt: new Date().toISOString(),
      data: reportData
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
