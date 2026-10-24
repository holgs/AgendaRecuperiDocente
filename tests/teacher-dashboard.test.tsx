// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import TeacherDashboardPage from '@/app/dashboard/teacher/page'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/components/calendar/activity-dialog', () => ({ ActivityDialog: () => null }))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('refreshes recovered and remaining minutes immediately after complete and reopen', async () => {
  let completed = false
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      completed = JSON.parse(init.body as string).status === 'completed'
      return { ok: true, json: async () => ({}) }
    }
    if (input === '/api/teachers/me') return { ok: true, json: async () => ({
      teacher: { id: 'holger', display_name: 'Holger Ferrero', email: '' },
      currentBudget: {
        school_year_id: 'year', school_year_name: '2026-27', minutes_annual: 1050,
        minutes_used: 105, minutes_completed: completed ? 105 : 50, minutes_planned: completed ? 0 : 55,
        minutes_remaining: completed ? 945 : 1000, minutes_available: 945,
        modules_annual: 21, modules_used: 2, modules_remaining: 19, percentage_used: 10,
      },
    }) }
    if (input === '/api/teachers/me/activities') return { ok: true, json: async () => ({ activities: [{
      id: 'activity', date: '2026-09-21', module_number: 5, class_name: '1CLS',
      title: 'Recupero 1CLS', duration_minutes: 55, status: completed ? 'completed' : 'planned', recovery_type: null,
    }] }) }
    return { ok: true, json: async () => [] }
  })
  vi.stubGlobal('fetch', fetchMock)
  await act(async () => { render(<TeacherDashboardPage />) })
  const recovered = () => screen.getByText('Recuperato').parentElement?.textContent
  const remaining = () => screen.getByText('Ancora da recuperare').parentElement?.textContent
  await waitFor(() => expect(recovered()).toContain('50min'))
  expect(remaining()).toContain('16h 40min')
  fireEvent.click(screen.getByTitle('Segna come completata'))
  await waitFor(() => expect(recovered()).toContain('1h 45min'))
  expect(remaining()).toContain('15h 45min')
  fireEvent.click(screen.getByTitle('Riapri attività'))
  await waitFor(() => expect(recovered()).toContain('50min'))
  expect(remaining()).toContain('16h 40min')
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/teachers/me')).toHaveLength(3)
})
