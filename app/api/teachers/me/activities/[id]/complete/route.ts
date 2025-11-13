import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTeacher } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/teachers/me/activities/[id]/complete
 * Toggle activity completion status (planned <-> completed)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require teacher authentication
    const user = await requireTeacher()
    const teacherId = user.teacherId!

    const supabase = await createClient()
    const activityId = params.id

    // Step 1: Fetch existing activity and verify ownership
    const { data: existingActivity, error: fetchError } = await supabase
      .from('recovery_activities')
      .select('*')
      .eq('id', activityId)
      .single()

    if (fetchError || !existingActivity) {
      return NextResponse.json({ error: 'Attività non trovata' }, { status: 404 })
    }

    // Verify ownership
    if (existingActivity.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'Non hai i permessi per modificare questa attività' },
        { status: 403 }
      )
    }

    // Step 2: Parse request body
    const body = await request.json()
    const { completed } = body

    if (typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: 'Campo "completed" richiesto (true o false)' },
        { status: 400 }
      )
    }

    // Step 3: Determine new status
    const newStatus = completed ? 'completed' : 'planned'

    // If status is already the target, return early
    if (existingActivity.status === newStatus) {
      return NextResponse.json({
        activity: existingActivity,
        message: `L'attività è già ${newStatus === 'completed' ? 'completata' : 'pianificata'}`,
      })
    }

    // Step 4: Update activity status
    const { data: updatedActivity, error: updateError } = await supabase
      .from('recovery_activities')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activityId)
      .select(
        `
        *,
        recovery_type:recovery_types (
          id,
          name,
          color
        ),
        school_year:school_years (
          id,
          name
        ),
        teacher:teachers (
          id,
          cognome,
          nome
        )
      `
      )
      .single()

    if (updateError || !updatedActivity) {
      console.error('Error updating activity status:', updateError)
      return NextResponse.json(
        { error: 'Errore nell\'aggiornamento dello stato dell\'attività' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      activity: updatedActivity,
      message: `Attività ${newStatus === 'completed' ? 'completata' : 'ripristinata a pianificata'} con successo`,
    })
  } catch (error) {
    console.error('Error in PATCH /api/teachers/me/activities/[id]/complete:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}
