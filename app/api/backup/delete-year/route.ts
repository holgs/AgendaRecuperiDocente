import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/roles'
import { countYearRows } from '@/lib/backup/export'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const deleteSchema = z.object({
  schoolYearId: z.string().uuid('ID anno scolastico non valido'),
  // Double-step confirmation: the admin must type the exact school year name.
  confirmName: z.string().min(1, 'Conferma richiesta'),
})

/**
 * POST /api/backup/delete-year
 * Admin only. Deletes all year-scoped data (activities + budgets) for a school year.
 * Guardrails:
 *  - the typed confirmName must exactly match the school year name;
 *  - a backup must exist AND be up to date (row_counts == current counts), otherwise
 *    deletion is refused. This enforces "no deletion without a verified backup".
 * The school_year row and shared entities (teachers, recovery_types) are NOT deleted.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const supabase = await createClient()

    const body = await request.json().catch(() => null)
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: parsed.error.errors },
        { status: 400 }
      )
    }
    const { schoolYearId, confirmName } = parsed.data

    const { data: schoolYear, error: syError } = await supabase
      .from('school_years')
      .select('id, name')
      .eq('id', schoolYearId)
      .single()

    if (syError || !schoolYear) {
      return NextResponse.json({ error: 'Anno scolastico non trovato' }, { status: 404 })
    }

    if (confirmName.trim() !== schoolYear.name) {
      return NextResponse.json(
        { error: 'Il nome digitato non corrisponde all\'anno scolastico' },
        { status: 400 }
      )
    }

    // Verify an up-to-date backup exists before deleting anything.
    const currentCounts = await countYearRows(supabase, schoolYearId)

    const { data: latestBackup, error: backupError } = await supabase
      .from('year_backups')
      .select('id, row_counts, created_at')
      .eq('school_year_id', schoolYearId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (backupError) throw new Error('Errore nella verifica del backup')

    if (!latestBackup) {
      return NextResponse.json(
        {
          error:
            'Eliminazione bloccata: nessun backup esiste per questo anno. Crea prima una copia di backup.',
        },
        { status: 409 }
      )
    }

    const backupCounts = latestBackup.row_counts as {
      teacher_budgets?: number
      recovery_activities?: number
    }
    const isVerified =
      backupCounts?.teacher_budgets === currentCounts.teacher_budgets &&
      backupCounts?.recovery_activities === currentCounts.recovery_activities

    if (!isVerified) {
      return NextResponse.json(
        {
          error:
            'Eliminazione bloccata: il backup esistente non è aggiornato rispetto ai dati attuali. Crea una nuova copia di backup prima di eliminare.',
        },
        { status: 409 }
      )
    }

    // Delete year-scoped data. Activities first (they reference budgets indirectly via teacher/year).
    const { error: actDeleteError } = await supabase
      .from('recovery_activities')
      .delete()
      .eq('school_year_id', schoolYearId)

    if (actDeleteError) throw new Error('Errore nell\'eliminazione delle attività')

    const { error: budgetDeleteError } = await supabase
      .from('teacher_budgets')
      .delete()
      .eq('school_year_id', schoolYearId)

    if (budgetDeleteError) throw new Error('Errore nell\'eliminazione dei tesoretti')

    await supabase.from('activity_logs').insert({
      user_id: admin.id,
      action: 'delete_year_data',
      table_name: 'school_years',
      record_id: schoolYearId,
      old_values: { school_year_name: schoolYear.name, deleted_counts: currentCounts },
    })

    return NextResponse.json({
      success: true,
      message: `Dati dell'anno ${schoolYear.name} eliminati`,
      deleted: currentCounts,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore interno'
    console.error('POST /api/backup/delete-year failed:', message)
    const status = message.includes('Accesso negato')
      ? 403
      : message.includes('non autenticato')
        ? 401
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
