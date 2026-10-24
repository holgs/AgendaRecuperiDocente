import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchBudgetActivities, groupBudgetActivities, summarizeBudget } from '@/lib/budgets/usage'

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
        contract_type,
        is_archived,
        teacher_budgets!inner (
          id,
          school_year_id,
          modules_annual,
          modules_used,
          minutes_weekly,
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

    const activitiesByTeacher = groupBudgetActivities(
      await fetchBudgetActivities(supabase, activeYear.id)
    )

    // Transform data to include computed fields
    const teachersWithStats = (teachers || []).map(teacher => {
      const budget = Array.isArray(teacher.teacher_budgets)
        ? teacher.teacher_budgets[0]
        : teacher.teacher_budgets

      const usage = summarizeBudget(budget?.minutes_annual || 0, activitiesByTeacher.get(teacher.id) ?? [])
      return {
        id: teacher.id,
        nome: teacher.nome,
        cognome: teacher.cognome,
        email: teacher.email,
        contract_type: (teacher as any).contract_type ?? null,
        is_archived: (teacher as any).is_archived ?? false,
        budget: budget ? {
          id: budget.id,
          modulesAnnual: budget.modules_annual,
          ...usage,
          modulesAvailable: Math.max(0, budget.modules_annual - usage.modulesUsed),
          minutesWeekly: budget.minutes_weekly || 0,
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
