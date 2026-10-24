import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTeacher } from '@/lib/auth/roles'
import { fetchBudgetActivities, summarizeBudget } from '@/lib/budgets/usage'

export const dynamic = 'force-dynamic'

/**
 * GET /api/teachers/me
 * Returns authenticated teacher's profile and current budget
 */
export async function GET() {
  try {
    // Require teacher authentication
    const user = await requireTeacher()

    if (!user.teacherId) {
      return NextResponse.json(
        { error: 'Profilo docente non collegato' },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    // Get teacher profile
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('id, cognome, nome, email')
      .eq('id', user.teacherId)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: 'Profilo docente non trovato' },
        { status: 404 }
      )
    }

    // Resolve the active year before selecting a budget. Filtering an embedded
    // relation alone does not exclude budgets belonging to previous years.
    const { data: activeYear, error: yearError } = await supabase
      .from('school_years')
      .select('id, name')
      .eq('is_active', true)
      .maybeSingle()
    if (yearError) throw yearError

    let currentBudget = null
    if (activeYear) {
      const { data: budget, error: budgetError } = await supabase
        .from('teacher_budgets')
        .select('id, minutes_weekly, minutes_annual, modules_annual')
        .eq('teacher_id', user.teacherId)
        .eq('school_year_id', activeYear.id)
        .maybeSingle()
      if (budgetError) throw budgetError

      if (budget) {
        const activities = await fetchBudgetActivities(supabase, activeYear.id, user.teacherId)
        const usage = summarizeBudget(budget.minutes_annual || 0, activities)
        currentBudget = {
          id: budget.id,
          school_year_id: activeYear.id,
          school_year_name: activeYear.name,
          minutes_weekly: budget.minutes_weekly,
          minutes_annual: usage.minutesAnnual,
          minutes_used: usage.minutesUsed,
          minutes_completed: usage.minutesCompleted,
          minutes_planned: usage.minutesPlanned,
          minutes_available: usage.minutesAvailable,
          minutes_remaining: usage.minutesRemaining,
          modules_annual: budget.modules_annual,
          modules_used: usage.modulesUsed,
          modules_remaining: Math.max(0, budget.modules_annual - usage.modulesUsed),
          percentage_used: usage.percentageUsed,
        }
      }
    }

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        cognome: teacher.cognome,
        nome: teacher.nome,
        email: teacher.email,
        display_name: `${teacher.nome} ${teacher.cognome}`,
      },
      currentBudget,
      message: currentBudget
        ? null
        : "Il budget per l'anno scolastico corrente non è ancora stato caricato",
    })
  } catch (error) {
    console.error('Error in GET /api/teachers/me:', error)
    if (error instanceof Error) {
      const status = error.message === 'Utente non autenticato' ? 401
        : error.message.startsWith('Accesso negato') || error.message === 'Profilo docente non collegato' ? 403
        : 500
      return NextResponse.json({ error: error.message }, { status })
    }
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}
