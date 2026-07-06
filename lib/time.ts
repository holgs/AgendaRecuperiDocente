/**
 * Time / minute formatting helpers.
 * Minutes are the single internal unit of account (Punto 3). These helpers are for
 * DISPLAY only — never convert back to minutes for calculations from a formatted string.
 */

/** ISO weekday for a date: 1 = Monday .. 7 = Sunday. Accepts a Date or date string. */
export function isoWeekday(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const js = d.getDay() // 0=Sun .. 6=Sat
  return ((js + 6) % 7) + 1
}

/** "125" -> "2h 05min". Negative and zero handled. */
export function formatHoursMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : ''
  const abs = Math.abs(Math.round(totalMinutes))
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  if (hours === 0) return `${sign}${minutes}min`
  return `${sign}${hours}h ${minutes.toString().padStart(2, '0')}min`
}

/** "125" -> "125 min (2h 05min)" for compact display. */
export function formatMinutesWithHours(totalMinutes: number): string {
  return `${Math.round(totalMinutes)} min (${formatHoursMinutes(totalMinutes)})`
}
