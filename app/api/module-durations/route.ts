import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/roles'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

function authErrorStatus(message: string): number {
  if (message.includes('Accesso negato')) return 403
  if (message.includes('non autenticato')) return 401
  return 500
}

/**
 * GET /api/module-durations?schoolYearId=...
 * Returns the module-duration grid for a school year. Readable by any authenticated
 * user (teachers need it too); writes are admin-only.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const schoolYearId = request.nextUrl.searchParams.get('schoolYearId')
    if (!schoolYearId) {
      return NextResponse.json({ error: 'schoolYearId richiesto' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('module_durations')
      .select('day_of_week, module_number, duration_minutes')
      .eq('school_year_id', schoolYearId)
      .order('day_of_week', { ascending: true })
      .order('module_number', { ascending: true })

    if (error) throw new Error('Errore nel recupero della griglia')

    return NextResponse.json({ cells: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore interno'
    console.error('GET /api/module-durations failed:', message)
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) })
  }
}

const putSchema = z.object({
  schoolYearId: z.string().uuid('ID anno scolastico non valido'),
  cells: z
    .array(
      z.object({
        day_of_week: z.number().int().min(1).max(7),
        module_number: z.number().int().min(1).max(20),
        duration_minutes: z.number().int().positive(),
      })
    )
    .max(200),
})

/**
 * PUT /api/module-durations
 * Admin only. Replaces the entire grid for a school year with the provided cells.
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const supabase = await createClient()

    const body = await request.json().catch(() => null)
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.errors },
        { status: 400 }
      )
    }
    const { schoolYearId, cells } = parsed.data

    // Replace strategy: clear the year's grid, then insert the provided cells.
    const { error: deleteError } = await supabase
      .from('module_durations')
      .delete()
      .eq('school_year_id', schoolYearId)

    if (deleteError) throw new Error('Errore nell\'aggiornamento della griglia')

    if (cells.length > 0) {
      const rows = cells.map((c) => ({
        school_year_id: schoolYearId,
        day_of_week: c.day_of_week,
        module_number: c.module_number,
        duration_minutes: c.duration_minutes,
      }))
      const { error: insertError } = await supabase.from('module_durations').insert(rows)
      if (insertError) throw new Error('Errore nel salvataggio della griglia')
    }

    await supabase.from('activity_logs').insert({
      user_id: admin.id,
      action: 'update_module_durations',
      table_name: 'module_durations',
      record_id: schoolYearId,
      new_values: { cell_count: cells.length },
    })

    return NextResponse.json({ success: true, count: cells.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore interno'
    console.error('PUT /api/module-durations failed:', message)
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) })
  }
}
