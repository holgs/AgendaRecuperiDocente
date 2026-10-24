import { describe, expect, it } from 'vitest'
import { summarizeBudget, fetchBudgetActivities, type BudgetActivity } from '@/lib/budgets/usage'
import { teacherSummary, type ReportData } from '@/lib/reports/compute'
import type { SupabaseClient } from '@supabase/supabase-js'

const completed: BudgetActivity[] = [55, 50].map(duration_minutes => ({
  teacher_id: 'holger', duration_minutes, modules_equivalent: 1, status: 'completed',
}))

describe('recovery minutes', () => {
  it('reproduces Holger: 1050 annual, 105 recovered, 945 to recover and plan, 10% used', () => {
    expect(summarizeBudget(1050, completed)).toEqual({
      minutesAnnual: 1050, minutesPlanned: 0, minutesCompleted: 105,
      minutesUsed: 105, minutesAvailable: 945, minutesRemaining: 945,
      modulesUsed: 2, percentageUsed: 10,
    })
  })

  it('reserves plans without counting them as recovered; completing/reopening does not double count', () => {
    const activities = [...completed, { teacher_id: 'holger', duration_minutes: 45, status: 'planned' }]
    expect(summarizeBudget(1050, activities)).toMatchObject({
      minutesCompleted: 105, minutesPlanned: 45, minutesUsed: 150,
      minutesAvailable: 900, minutesRemaining: 945,
    })
    activities[2].status = 'completed'
    expect(summarizeBudget(1050, activities)).toMatchObject({
      minutesCompleted: 150, minutesPlanned: 0, minutesUsed: 150,
      minutesAvailable: 900, minutesRemaining: 900,
    })
    activities[2].status = 'planned'
    expect(summarizeBudget(1050, activities).minutesRemaining).toBe(945)
    activities.pop()
    expect(summarizeBudget(1050, activities).minutesAvailable).toBe(945)
  })

  it('ignores cancelled activities, handles zero budgets and clamps exhausted balances', () => {
    expect(summarizeBudget(1050, [{ teacher_id: 'holger', duration_minutes: 100, status: 'cancelled' }]).minutesUsed).toBe(0)
    expect(summarizeBudget(0, []).percentageUsed).toBe(0)
    expect(summarizeBudget(50, completed)).toMatchObject({ minutesAvailable: 0, minutesRemaining: 0, minutesCompleted: 105 })
  })

  it('keeps reports consistent even with a stale zero budget counter', () => {
    const data = {
      budgets: [{ teacher_id: 'holger', teacher_name: 'Ferrero Holger', minutes_annual: 1050, minutes_used: 0 }],
      activities: completed,
    } as ReportData
    expect(teacherSummary(data)[0]).toMatchObject({ recuperato: 105, pianificato: 0, daFare: 945, pctCompletamento: 10 })
  })

  it('reads beyond PostgREST first page with teacher/year/status filters on each page', async () => {
    const calls: unknown[][] = []
    const rows = Array.from({ length: 1001 }, () => completed[0])
    const client = { from(table: string) {
      const filters: unknown[] = [table]
      let start = 0, end = 0
      const query = {
        select() { return query },
        eq(...args: unknown[]) { filters.push(args); return query },
        in(...args: unknown[]) { filters.push(args); return query },
        order() { return query },
        range(a: number, b: number) { start = a; end = b; return query },
        then(resolve: (result: unknown) => void) { calls.push(filters); resolve({ data: rows.slice(start, end + 1), error: null }) },
      }
      return query
    }} as unknown as SupabaseClient
    const all = await fetchBudgetActivities(client, '2026-27', 'holger')
    expect(all).toHaveLength(1001)
    expect(summarizeBudget(60000, all).minutesCompleted).toBe(55055)
    expect(calls).toHaveLength(2)
    for (const filters of calls) {
      expect(filters).toContainEqual(['school_year_id', '2026-27'])
      expect(filters).toContainEqual(['teacher_id', 'holger'])
      expect(filters).toContainEqual(['status', ['planned', 'completed']])
    }
  })

  it('does not turn an activity query failure into a zero total', async () => {
    const query = {
      select() { return query }, eq() { return query }, in() { return query },
      order() { return query }, range() { return query },
      then(resolve: (result: unknown) => void) { resolve({ data: null, error: { message: 'database unavailable' } }) },
    }
    await expect(fetchBudgetActivities({ from: () => query } as unknown as SupabaseClient, '2026-27', 'holger'))
      .rejects.toThrow('Errore nel recupero dei minuti')
  })
})
