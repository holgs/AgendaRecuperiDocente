import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getTeacher } from '@/app/api/teachers/me/route'
import { GET as getAdminDetail } from '@/app/api/teachers/[id]/route'
import { GET as getAdminList } from '@/app/api/teachers/list-with-budgets/route'
import { POST as createTeacherActivity } from '@/app/api/teachers/me/activities/route'
import { POST as createAdminActivity } from '@/app/api/activities/route'

const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, any>[]>,
  failActivities: false,
}))
vi.mock('@/lib/auth/roles', () => ({ requireTeacher: async () => ({ id: 'user', teacherId: 'holger' }) }))
vi.mock('@/lib/modules/duration', () => ({ resolveModuleDuration: async () => ({ minutes: 55, source: 'grid' }) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
  from(table: string) {
    let rows = [...(state.tables[table] ?? [])]
    let single = false
    const query = {
      select() { return query },
      eq(key: string, value: unknown) { rows = rows.filter(row => row[key] === value); return query },
      in(key: string, values: unknown[]) { rows = rows.filter(row => values.includes(row[key])); return query },
      order() { return query },
      range(start: number, end: number) { rows = rows.slice(start, end + 1); return query },
      single() { single = true; return query },
      maybeSingle() { single = true; return query },
      then(resolve: (value: unknown) => void) {
        if (table === 'recovery_activities' && state.failActivities) return resolve({ data: null, error: { message: 'query failed' } })
        resolve({ data: single ? rows[0] ?? null : rows, error: null })
      },
    }
    return query
  },
}) }))

beforeEach(() => {
  state.failActivities = false
  const budget = { id: 'budget', teacher_id: 'holger', school_year_id: 'current', minutes_annual: 1050, minutes_used: 0, modules_annual: 21, modules_used: 0 }
  state.tables = {
    teachers: [{ id: 'holger', nome: 'Holger', cognome: 'Ferrero', 'teacher_budgets.school_year_id': 'current', teacher_budgets: [budget] }],
    school_years: [{ id: 'old', name: '2025-26', is_active: false }, { id: 'current', name: '2026-27', is_active: true }],
    teacher_budgets: [{ ...budget, id: 'old-budget', school_year_id: 'old', minutes_annual: 9000 }, budget],
    recovery_activities: [
      { id: 'a', teacher_id: 'holger', school_year_id: 'current', duration_minutes: 55, modules_equivalent: 1, status: 'completed' },
      { id: 'b', teacher_id: 'holger', school_year_id: 'current', duration_minutes: 50, modules_equivalent: 1, status: 'completed' },
      { id: 'past', teacher_id: 'holger', school_year_id: 'old', duration_minutes: 700, status: 'completed' },
      { id: 'other', teacher_id: 'other', school_year_id: 'current', duration_minutes: 300, status: 'completed' },
    ],
  }
})

describe('dashboard API regression with stale budget counters', () => {
  it('teacher selects only the active-year budget and their own actual minutes', async () => {
    const response = await getTeacher()
    expect(response.status).toBe(200)
    expect((await response.json()).currentBudget).toMatchObject({
      id: 'budget', school_year_id: 'current', minutes_annual: 1050,
      minutes_used: 105, minutes_completed: 105, minutes_remaining: 945, minutes_available: 945, percentage_used: 10,
    })
  })

  it('admin detail and list agree with teacher despite zero stored counters', async () => {
    const request = new NextRequest('https://example.test/api/teachers/holger')
    const detail = await (await getAdminDetail(request, { params: { id: 'holger' } })).json()
    expect(detail.budget).toMatchObject({ minutesUsed: 105, minutesAvailable: 945, percentageUsed: 10 })
    expect(detail.activityStats).toEqual({ toPlan: 945, planned: 0, completed: 105 })
    const list = await (await getAdminList(request)).json()
    expect(list.teachers[0].budget).toMatchObject({ minutesUsed: 105, minutesAvailable: 945, percentageUsed: 10 })
  })

  it('reopening/completing changes recovered minutes without changing reserved minutes', async () => {
    state.tables.recovery_activities[0].status = 'planned'
    let budget = (await (await getTeacher()).json()).currentBudget
    expect(budget).toMatchObject({ minutes_completed: 50, minutes_planned: 55, minutes_remaining: 1000, minutes_used: 105, minutes_available: 945 })
    state.tables.recovery_activities[0].status = 'completed'
    budget = (await (await getTeacher()).json()).currentBudget
    expect(budget).toMatchObject({ minutes_completed: 105, minutes_remaining: 945, minutes_used: 105 })
  })

  it.each(['no active year', 'no current budget'])('handles %s without using prior-year totals', async scenario => {
    if (scenario === 'no active year') state.tables.school_years[1].is_active = false
    else state.tables.teacher_budgets.pop()
    const response = await getTeacher()
    expect(response.status).toBe(200)
    expect((await response.json()).currentBudget).toBeNull()
  })

  it('fails explicitly when activity totals cannot be read', async () => {
    state.failActivities = true
    const response = await getTeacher()
    expect(response.status).toBe(500)
    expect((await response.json()).currentBudget).toBeUndefined()
  })

  it.each([createTeacherActivity, createAdminActivity])('rejects new activity if actual remaining minutes are insufficient', async handler => {
    state.tables.teacher_budgets[1].minutes_annual = 150 // 105 used; only 45 available, despite cache = 0
    const request = new NextRequest('https://example.test/api/activities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacher_id: 'holger', school_year_id: 'current', date: '2026-10-26', module_number: 1, class_name: '1CLS', recovery_type_id: 'type' }),
    })
    const response = await handler(request)
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('minuti disponibili insufficienti')
  })
})
