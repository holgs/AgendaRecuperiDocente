import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTeacher } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/teachers/me/activities/[id]
 * Update a planned activity (completed activities are immutable)
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

    // Check if activity is completed (immutable)
    if (existingActivity.status === 'completed') {
      return NextResponse.json(
        { error: 'Le attività completate non possono essere modificate' },
        { status: 400 }
      )
    }

    // Step 2: Parse and validate update data
    const body = await request.json()
    const { date, module_number, class_name, description } = body

    // Build update object (only allow specific fields)
    const updates: any = {}
    if (date !== undefined) updates.date = date
    if (module_number !== undefined) updates.module_number = module_number
    if (class_name !== undefined) updates.class_name = class_name
    if (description !== undefined) updates.description = description

    // Step 3: If date or module_number changed, re-check for overlaps
    if (updates.date || updates.module_number) {
      const checkDate = updates.date || existingActivity.date
      const checkModule = updates.module_number || existingActivity.module_number

      // Check teacher overlap (excluding current activity)
      const { data: teacherOverlap } = await supabase
        .from('recovery_activities')
        .select('id, title')
        .eq('teacher_id', teacherId)
        .eq('date', checkDate)
        .eq('module_number', checkModule)
        .neq('id', activityId)
        .maybeSingle()

      if (teacherOverlap) {
        return NextResponse.json(
          {
            error: `Sovrapposizione docente: hai già un'attività programmata per questo modulo (${teacherOverlap.title})`,
            conflicting_activity_id: teacherOverlap.id,
          },
          { status: 400 }
        )
      }
    }

    // Step 4: Update the activity
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Nessun campo da aggiornare' },
        { status: 400 }
      )
    }

    updates.updated_at = new Date().toISOString()

    const { data: updatedActivity, error: updateError } = await supabase
      .from('recovery_activities')
      .update(updates)
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
        )
      `
      )
      .single()

    if (updateError || !updatedActivity) {
      console.error('Error updating activity:', updateError)
      return NextResponse.json(
        { error: 'Errore nell\'aggiornamento dell\'attività' },
        { status: 500 }
      )
    }

    return NextResponse.json({ activity: updatedActivity })
  } catch (error) {
    console.error('Error in PATCH /api/teachers/me/activities/[id]:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}

/**
 * DELETE /api/teachers/me/activities/[id]
 * Delete a planned activity and refund the budget
 */
export async function DELETE(
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
        { error: 'Non hai i permessi per eliminare questa attività' },
        { status: 403 }
      )
    }

    // Check if activity is completed (cannot delete)
    if (existingActivity.status === 'completed') {
      return NextResponse.json(
        { error: 'Le attività completate non possono essere eliminate' },
        { status: 400 }
      )
    }

    // Step 2: Get budget to refund
    const { data: budget, error: budgetError } = await supabase
      .from('teacher_budgets')
      .select('id, modules_used, minutes_used')
      .eq('teacher_id', teacherId)
      .eq('school_year_id', existingActivity.school_year_id)
      .single()

    if (budgetError || !budget) {
      console.error('Budget not found for refund:', budgetError)
      // Continue with deletion even if budget update fails
    }

    // Step 3: Delete the activity
    const { error: deleteError } = await supabase
      .from('recovery_activities')
      .delete()
      .eq('id', activityId)

    if (deleteError) {
      console.error('Error deleting activity:', deleteError)
      return NextResponse.json(
        { error: 'Errore nell\'eliminazione dell\'attività' },
        { status: 500 }
      )
    }

    // Step 4: Refund budget (restore modules and minutes)
    if (budget) {
      const modulesToRefund = existingActivity.modules_equivalent || 0
      const minutesToRefund = existingActivity.duration_minutes || 0

      const { error: refundError } = await supabase
        .from('teacher_budgets')
        .update({
          modules_used: Math.max(0, (budget.modules_used || 0) - modulesToRefund),
          minutes_used: Math.max(0, (budget.minutes_used || 0) - minutesToRefund),
        })
        .eq('id', budget.id)

      if (refundError) {
        console.error('Error refunding budget:', refundError)
        // Activity is already deleted, log error but return success
      }

      return NextResponse.json({
        message: 'Attività eliminata con successo',
        refunded_modules: modulesToRefund,
        refunded_minutes: minutesToRefund,
      })
    }

    return NextResponse.json({
      message: 'Attività eliminata con successo',
    })
  } catch (error) {
    console.error('Error in DELETE /api/teachers/me/activities/[id]:', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}
