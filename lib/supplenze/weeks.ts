/**
 * Number of weeks covered by a substitution period (inclusive of both dates).
 * Rounded to the nearest week, minimum 1. Used as the default in the form; the
 * admin can override it.
 */
export function computeWeeks(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
  if (!Number.isFinite(days) || days <= 0) return 1
  return Math.max(1, Math.round(days / 7))
}
