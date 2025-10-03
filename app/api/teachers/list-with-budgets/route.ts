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
          modules_annual,
          modules_used,
          minutes_annual,
          minutes_used
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

    // Transform data to include computed fields
    const teachersWithStats = (teachers || []).map(teacher => {
      const budget = Array.isArray(teacher.teacher_budgets)
        ? teacher.teacher_budgets[0]
        : teacher.teacher_budgets

      return {
        id: teacher.id,
        nome: teacher.nome,
        cognome: teacher.cognome,
        email: teacher.email,
        budget: budget ? {
          id: budget.id,
          modulesAnnual: budget.modules_annual,
          modulesUsed: budget.modules_used || 0,
          modulesAvailable: budget.modules_annual - (budget.modules_used || 0),
          minutesAnnual: budget.minutes_annual,
          minutesUsed: budget.minutes_used || 0,
          minutesAvailable: budget.minutes_annual - (budget.minutes_used || 0),
          percentageUsed: budget.minutes_annual > 0
            ? Math.round(((budget.minutes_used || 0) / budget.minutes_annual) * 100)
            : 0
        } : null
      }
    })

    return NextResponse.json({
      teachers: teachersWithStats,
      activeYear: {
        id: activeYear.id,
        name: activeYear.name
      }
    })
  } catch (error) {
    console.error('Error fetching teachers with budgets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
