import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/teachers/route'

const state = vi.hoisted(() => ({
  signedIn: true,
  role: 'teacher' as string | null,
  directoryError: false,
  directoryCalls: 0,
  teacherTableCalls: 0,
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: state.signedIn ? { email: 'docente@piaggia.it' } : null } }) },
  rpc: async (name: string) => {
    state.directoryCalls++
    if (name !== 'active_teacher_directory') throw new Error('Unexpected RPC')
    return state.directoryError
      ? { data: null, error: { message: 'directory unavailable' } }
      : { data: [{ id: 'colleague', cognome: 'Rossi', nome: 'Anna' }], error: null }
  },
  from: (table: string) => {
    if (table === 'users') return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.role ? { role: state.role } : null, error: null }) }) }),
    }
    if (table === 'teachers') {
      state.teacherTableCalls++
      const query = { select: () => query, order: () => query,
        then: (resolve: (value: unknown) => void) => resolve({ data: [{ id: 'teacher', email: 'admin-visible@piaggia.it', teacher_budgets: [{ modules_annual: 12 }] }], error: null }) }
      return query
    }
    throw new Error('Unexpected table')
  },
}) }))

beforeEach(() => { state.signedIn = true; state.role = 'teacher'; state.directoryError = false; state.directoryCalls = 0; state.teacherTableCalls = 0 })
const request = () => new NextRequest('https://example.test/api/teachers')

describe('co-teacher directory', () => {
  it('returns only the minimal directory to an authenticated teacher', async () => {
    const res = await GET(request())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ teachers: [{ id: 'colleague', cognome: 'Rossi', nome: 'Anna' }] })
    expect(state.directoryCalls).toBe(1)
    expect(state.teacherTableCalls).toBe(0)
  })
  it('keeps the existing full list for administrators', async () => {
    state.role = 'admin'
    const res = await GET(request())
    expect(res.status).toBe(200)
    expect((await res.json()).teachers[0].teacher_budgets[0].modules_annual).toBe(12)
    expect(state.directoryCalls).toBe(0)
  })
  it('rejects requests without an authenticated and provisioned user', async () => {
    state.signedIn = false
    expect((await GET(request())).status).toBe(401)
    state.signedIn = true; state.role = null
    expect((await GET(request())).status).toBe(403)
    expect(state.directoryCalls).toBe(0)
  })
  it('reports directory failures instead of returning a misleading empty list', async () => {
    state.directoryError = true
    const res = await GET(request())
    expect(res.status).toBe(500)
  })
})
