import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/roles'
import { buildYearExport, countYearRows, EXPORT_FORMAT_VERSION } from '@/lib/backup/export'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * Map an auth/permission error to an HTTP status, without leaking internals.
 */
function authErrorStatus(message: string): number {
  if (message.includes('Accesso negato')) return 403
  if (message.includes('non autenticato')) return 401
  return 500
}

/**
 * GET /api/backup
 * Admin only. Lists every school year with its row counts and backup status
 * (whether a verified, up-to-date backup exists), plus the archived backups.
 */
export async function GET() {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: schoolYears, error: syError } = await supabase
      .from('school_years')
      .select('id, name, is_active, start_date, end_date')
      .order('start_date', { ascending: false })

    if (syError) throw new Error('Errore nel recupero degli anni scolastici')

    const { data: backups, error: bError } = await supabase
      .from('year_backups')
      .select('id, school_year_id, school_year_name, row_counts, created_at')
      .order('created_at', { ascending: false })

    if (bError) throw new Error('Errore nel recupero dei backup')

    const backupList = backups ?? []

    const years = await Promise.all(
      (schoolYears ?? []).map(async (sy) => {
        const counts = await countYearRows(supabase, sy.id)
        const latest = backupList.find((b) => b.school_year_id === sy.id)
        const verified =
          !!latest &&
          (latest.row_counts as { teacher_budgets?: number; recovery_activities?: number })
            ?.teacher_budgets === counts.teacher_budgets &&
          (latest.row_counts as { recovery_activities?: number })?.recovery_activities ===
            counts.recovery_activities

        return {
          id: sy.id,
          name: sy.name,
          is_active: sy.is_active,
          counts,
          backup: {
            exists: !!latest,
            verified,
            latestAt: latest?.created_at ?? null,
          },
        }
      })
    )

    return NextResponse.json({ years, backups: backupList })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore interno'
    console.error('GET /api/backup failed:', message)
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) })
  }
}

const createBackupSchema = z.object({
  schoolYearId: z.string().uuid('ID anno scolastico non valido'),
})

/**
 * POST /api/backup
 * Admin only. Builds a full export of the given school year and stores it as a
 * verified backup copy in public.year_backups.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const supabase = await createClient()

    const body = await request.json().catch(() => null)
    const parsed = createBackupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const { schoolYearId } = parsed.data
    const exportData = await buildYearExport(supabase, schoolYearId)

    const { data: backup, error: insertError } = await supabase
      .from('year_backups')
      .insert({
        school_year_id: schoolYearId,
        school_year_name: exportData.meta.schoolYearName,
        payload: exportData,
        row_counts: exportData.counts,
        format_version: EXPORT_FORMAT_VERSION,
        created_by: admin.id,
      })
      .select('id, school_year_name, row_counts, created_at')
      .single()

    if (insertError) throw new Error('Errore nel salvataggio del backup')

    // Best-effort audit log
    await supabase.from('activity_logs').insert({
      user_id: admin.id,
      action: 'create_year_backup',
      table_name: 'year_backups',
      record_id: backup.id,
      new_values: { school_year_id: schoolYearId, counts: exportData.counts },
    })

    return NextResponse.json({ backup }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore interno'
    console.error('POST /api/backup failed:', message)
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) })
  }
}
