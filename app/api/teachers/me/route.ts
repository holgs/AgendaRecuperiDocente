import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTeacher } from '@/lib/auth/roles'

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

    // Get current budget for active school year
    const { data: budgetData, error: budgetError } = await supabase
      .from('teacher_budgets')
      .select(
        `
        id,
        minutes_weekly,
        minutes_annual,
        modules_annual,
        minutes_used,
        modules_used,
        school_year:school_years (
          id,
          name,
          is_active
        )
      `
      )
      .eq('teacher_id', user.teacherId)
      .eq('school_years.is_active', true)
      .single()

    if (budgetError && budgetError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (no budget for active year)
      console.error('Budget query error:', budgetError)
      return NextResponse.json({ error: 'Errore nel recupero del budget' }, { status: 500 })
    }

    // Calculate budget details
    let currentBudget = null
    if (budgetData && budgetData.school_year) {
      const schoolYear = Array.isArray(budgetData.school_year)
        ? budgetData.school_year[0]
        : budgetData.school_year

      const minutesRemaining = budgetData.minutes_annual - (budgetData.minutes_used || 0)
      const modulesRemaining = budgetData.modules_annual - (budgetData.modules_used || 0)
      const percentageUsed =
        budgetData.modules_annual > 0
          ? Math.round(((budgetData.modules_used || 0) / budgetData.modules_annual) * 100)
          : 0

      currentBudget = {
        id: budgetData.id,
        school_year_id: schoolYear.id,
        school_year_name: schoolYear.name,
        minutes_weekly: budgetData.minutes_weekly,
        minutes_annual: budgetData.minutes_annual,
        minutes_used: budgetData.minutes_used || 0,
        minutes_remaining: minutesRemaining,
        modules_annual: budgetData.modules_annual,
        modules_used: budgetData.modules_used || 0,
        modules_remaining: modulesRemaining,
        percentage_used: percentageUsed,
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
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}
