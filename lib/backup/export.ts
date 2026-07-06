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

// PostgREST caps a single SELECT at 1000 rows by default, so a plain query would
// silently truncate large tables. We page through in chunks to fetch everything.
const PAGE_SIZE = 1000

/**
 * Fetch every row for `table` matching school_year_id, following PostgREST
 * pagination so nothing is silently truncated at 1000 rows.
 */
async function fetchAllForYear(
  supabase: SupabaseClient,
  table: string,
  select: string,
  schoolYearId: string
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = []
  let from = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .eq('school_year_id', schoolYearId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Errore nel recupero di ${table}`)
    }

    const rows = (data ?? []) as unknown as Record<string, unknown>[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}

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

  const teacher_budgets = await fetchAllForYear(
    supabase,
    'teacher_budgets',
    `*, teacher:teachers ( cognome, nome, email )`,
    schoolYearId
  )

  const recovery_activities = await fetchAllForYear(
    supabase,
    'recovery_activities',
    `*, teacher:teachers ( cognome, nome, email ), recovery_type:recovery_types ( name )`,
    schoolYearId
  )

  // Paginated fetch is ordered by id for stable paging; present activities by date.
  recovery_activities.sort((a, b) =>
    String(a.date ?? '').localeCompare(String(b.date ?? ''))
  )

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
