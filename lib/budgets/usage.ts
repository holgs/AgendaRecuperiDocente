import type { SupabaseClient } from '@supabase/supabase-js'

export interface BudgetActivity {
  teacher_id: string
  duration_minutes: number | null
  modules_equivalent?: number | null
  status: string
}

/** Activities are authoritative: legacy budget counters can be stale under RLS. */
export function summarizeBudget(
  minutesAnnual: number,
  activities: readonly BudgetActivity[],
) {
  let minutesPlanned = 0
  let minutesCompleted = 0
  let modulesUsed = 0
  for (const activity of activities) {
    if (activity.status !== 'planned' && activity.status !== 'completed') continue
    const minutes = activity.duration_minutes ?? 0
    if (activity.status === 'completed') minutesCompleted += minutes
    else minutesPlanned += minutes
    modulesUsed += activity.modules_equivalent ?? 0
  }
  const minutesUsed = minutesPlanned + minutesCompleted
  return {
    minutesAnnual,
    minutesPlanned,
    minutesCompleted,
    minutesUsed,
    // Reserved minutes are unavailable for new plans, but still need recovery.
    minutesAvailable: Math.max(0, minutesAnnual - minutesUsed),
    minutesRemaining: Math.max(0, minutesAnnual - minutesCompleted),
    modulesUsed,
    percentageUsed: minutesAnnual > 0 ? Math.round(minutesUsed / minutesAnnual * 100) : 0,
  }
}

/** Read all pages, scoped to a school year and optionally one teacher, respecting RLS. */
export async function fetchBudgetActivities(
  supabase: SupabaseClient,
  schoolYearId: string,
  teacherId?: string,
): Promise<BudgetActivity[]> {
  const activities: BudgetActivity[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    let query = supabase.from('recovery_activities')
      .select('teacher_id, duration_minutes, modules_equivalent, status')
      .eq('school_year_id', schoolYearId)
      .in('status', ['planned', 'completed'])
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (teacherId) query = query.eq('teacher_id', teacherId)
    const { data, error } = await query
    if (error) throw new Error('Errore nel recupero dei minuti delle attività')
    activities.push(...(data ?? []))
    if (!data || data.length < pageSize) return activities
  }
}

export function groupBudgetActivities(activities: readonly BudgetActivity[]) {
  const byTeacher = new Map<string, BudgetActivity[]>()
  for (const activity of activities) {
    const rows = byTeacher.get(activity.teacher_id) ?? []
    rows.push(activity)
    byTeacher.set(activity.teacher_id, rows)
  }
  return byTeacher
}
