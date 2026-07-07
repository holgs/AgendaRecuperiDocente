import { isoWeekday } from "@/lib/time"

// ---- Shared report data shapes -------------------------------------------

export interface ReportActivity {
  id: string
  teacher_id: string
  teacher_name: string
  date: string
  duration_minutes: number
  status: string
  recovery_type_id: string | null
  recovery_type_name: string | null
  class_name: string | null
  module_number: number | null
}

export interface ReportBudget {
  teacher_id: string
  teacher_name: string
  minutes_annual: number
  minutes_used: number
}

export interface ReportData {
  schoolYear: { id: string; name: string }
  budgets: ReportBudget[]
  activities: ReportActivity[]
}

// ---- 1. Per-teacher summary ----------------------------------------------

export interface TeacherSummaryRow {
  teacher_id: string
  teacher_name: string
  monteOre: number // minutes_annual
  recuperato: number // completed minutes
  pianificato: number // planned minutes
  daFare: number // annual - used (not yet planned)
  pctCompletamento: number // recuperato / annual
}

export function teacherSummary(data: ReportData): TeacherSummaryRow[] {
  const completedByTeacher = new Map<string, number>()
  const plannedByTeacher = new Map<string, number>()

  for (const a of data.activities) {
    const map = a.status === "completed" ? completedByTeacher : a.status === "planned" ? plannedByTeacher : null
    if (map) map.set(a.teacher_id, (map.get(a.teacher_id) ?? 0) + (a.duration_minutes || 0))
  }

  return data.budgets.map((b) => {
    const recuperato = completedByTeacher.get(b.teacher_id) ?? 0
    const pianificato = plannedByTeacher.get(b.teacher_id) ?? 0
    const monteOre = b.minutes_annual || 0
    const daFare = Math.max(0, monteOre - (b.minutes_used || 0))
    return {
      teacher_id: b.teacher_id,
      teacher_name: b.teacher_name,
      monteOre,
      recuperato,
      pianificato,
      daFare,
      pctCompletamento: monteOre > 0 ? Math.round((recuperato / monteOre) * 100) : 0,
    }
  })
}

// ---- 2. Trend over time ---------------------------------------------------

export type Granularity = "week" | "month"

export interface TrendPoint {
  bucket: string // label, e.g. "2025-W38" or "2025-10"
  recuperato: number // completed minutes in the bucket
  cumulato: number // running total of recuperato
}

/** ISO week number (1-53) for a date. */
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = isoWeekday(d) // 1..7 (Mon..Sun)
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function bucketKey(dateStr: string, granularity: Granularity): string {
  const d = new Date(dateStr)
  if (granularity === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }
  return `${d.getFullYear()}-W${String(isoWeek(d)).padStart(2, "0")}`
}

export function trend(
  activities: ReportActivity[],
  granularity: Granularity,
  teacherId?: string
): TrendPoint[] {
  const sums = new Map<string, number>()
  for (const a of activities) {
    if (a.status !== "completed") continue
    if (teacherId && a.teacher_id !== teacherId) continue
    if (!a.date) continue
    const key = bucketKey(a.date, granularity)
    sums.set(key, (sums.get(key) ?? 0) + (a.duration_minutes || 0))
  }

  const keys = Array.from(sums.keys()).sort()
  let running = 0
  return keys.map((k) => {
    running += sums.get(k) ?? 0
    return { bucket: k, recuperato: sums.get(k) ?? 0, cumulato: running }
  })
}

// ---- 3. Activities filter -------------------------------------------------

export interface ActivityFilters {
  from?: string
  to?: string
  teacherId?: string
  recoveryTypeId?: string
  status?: string
  className?: string
}

export function filterActivities(
  activities: ReportActivity[],
  filters: ActivityFilters
): ReportActivity[] {
  return activities.filter((a) => {
    if (filters.from && a.date < filters.from) return false
    if (filters.to && a.date > filters.to + "T23:59:59") return false
    if (filters.teacherId && a.teacher_id !== filters.teacherId) return false
    if (filters.recoveryTypeId && a.recovery_type_id !== filters.recoveryTypeId) return false
    if (filters.status && a.status !== filters.status) return false
    if (filters.className && a.class_name !== filters.className) return false
    return true
  })
}

// ---- 4. Distribution by type / class -------------------------------------

export interface DistributionRow {
  label: string
  minutes: number
  count: number
}

function distributeBy(
  activities: ReportActivity[],
  keyFn: (a: ReportActivity) => string
): DistributionRow[] {
  const minutes = new Map<string, number>()
  const counts = new Map<string, number>()
  for (const a of activities) {
    const key = keyFn(a)
    minutes.set(key, (minutes.get(key) ?? 0) + (a.duration_minutes || 0))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(minutes.keys())
    .map((label) => ({ label, minutes: minutes.get(label) ?? 0, count: counts.get(label) ?? 0 }))
    .sort((a, b) => b.minutes - a.minutes)
}

export function distributionByType(activities: ReportActivity[]): DistributionRow[] {
  return distributeBy(activities, (a) => a.recovery_type_name || "Senza tipo")
}

export function distributionByClass(activities: ReportActivity[]): DistributionRow[] {
  return distributeBy(activities, (a) => a.class_name || "Senza classe")
}
