import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Full export of a single school year's data.
 * Year-scoped tables are teacher_budgets and recovery_activities; the school_year
 * row itself is included as metadata. Teachers and recovery_types are shared across
 * years, so their referenced fields are denormalized into the rows for readability
 * rather than exported as separate tables.
 */
export interface YearExport {
  meta: {
    schoolYearId: string
    schoolYearName: string
    exportedAt: string
    formatVersion: number
  }
  school_year: Record<string, unknown> | null
  teacher_budgets: Record<string, unknown>[]
  recovery_activities: Record<string, unknown>[]
  counts: {
    teacher_budgets: number
    recovery_activities: number
  }
}

export const EXPORT_FORMAT_VERSION = 1

/**
 * Build a complete export object for one school year.
 * Throws a plain Error (message safe to log server-side) on failure.
 */
export async function buildYearExport(
  supabase: SupabaseClient,
  schoolYearId: string
): Promise<YearExport> {
  const { data: schoolYear, error: syError } = await supabase
    .from('school_years')
    .select('*')
    .eq('id', schoolYearId)
    .single()

  if (syError || !schoolYear) {
    throw new Error('Anno scolastico non trovato')
  }

  const { data: budgets, error: bError } = await supabase
    .from('teacher_budgets')
    .select(`
      *,
      teacher:teachers ( cognome, nome, email )
    `)
    .eq('school_year_id', schoolYearId)

  if (bError) {
    throw new Error('Errore nel recupero dei tesoretti')
  }

  const { data: activities, error: aError } = await supabase
    .from('recovery_activities')
    .select(`
      *,
      teacher:teachers ( cognome, nome, email ),
      recovery_type:recovery_types ( name )
    `)
    .eq('school_year_id', schoolYearId)
    .order('date', { ascending: true })

  if (aError) {
    throw new Error('Errore nel recupero delle attività')
  }

  const teacher_budgets = budgets ?? []
  const recovery_activities = activities ?? []

  return {
    meta: {
      schoolYearId,
      schoolYearName: schoolYear.name as string,
      exportedAt: new Date().toISOString(),
      formatVersion: EXPORT_FORMAT_VERSION,
    },
    school_year: schoolYear,
    teacher_budgets,
    recovery_activities,
    counts: {
      teacher_budgets: teacher_budgets.length,
      recovery_activities: recovery_activities.length,
    },
  }
}

/**
 * Count year-scoped rows without loading them — used to check whether an existing
 * backup is still up to date before allowing deletion.
 */
export async function countYearRows(
  supabase: SupabaseClient,
  schoolYearId: string
): Promise<{ teacher_budgets: number; recovery_activities: number }> {
  const [{ count: budgetCount }, { count: activityCount }] = await Promise.all([
    supabase
      .from('teacher_budgets')
      .select('id', { count: 'exact', head: true })
      .eq('school_year_id', schoolYearId),
    supabase
      .from('recovery_activities')
      .select('id', { count: 'exact', head: true })
      .eq('school_year_id', schoolYearId),
  ])

  return {
    teacher_budgets: budgetCount ?? 0,
    recovery_activities: activityCount ?? 0,
  }
}
