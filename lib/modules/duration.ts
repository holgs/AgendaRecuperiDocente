import type { SupabaseClient } from '@supabase/supabase-js'
import { isoWeekday } from '@/lib/time'

/** Fallback duration when no grid entry is configured for a slot (legacy default). */
export const DEFAULT_MODULE_MINUTES = 50

export interface ResolvedDuration {
  minutes: number
  /** 'grid' when taken from module_durations, 'default' when the fallback was used. */
  source: 'grid' | 'default'
}

/**
 * Resolve how many minutes a recovery activity consumes, based on the admin-defined
 * module_durations grid for (school year, weekday-of-date, module slot).
 * Falls back to DEFAULT_MODULE_MINUTES when the slot is not configured, so activity
 * creation never hard-blocks on a missing grid entry.
 */
export async function resolveModuleDuration(
  supabase: SupabaseClient,
  params: { schoolYearId: string; date: string | Date; moduleNumber: number | null | undefined }
): Promise<ResolvedDuration> {
  const { schoolYearId, date, moduleNumber } = params

  if (!moduleNumber) {
    return { minutes: DEFAULT_MODULE_MINUTES, source: 'default' }
  }

  const dayOfWeek = isoWeekday(date)

  const { data, error } = await supabase
    .from('module_durations')
    .select('duration_minutes')
    .eq('school_year_id', schoolYearId)
    .eq('day_of_week', dayOfWeek)
    .eq('module_number', moduleNumber)
    .maybeSingle()

  if (error || !data) {
    return { minutes: DEFAULT_MODULE_MINUTES, source: 'default' }
  }

  return { minutes: data.duration_minutes, source: 'grid' }
}
