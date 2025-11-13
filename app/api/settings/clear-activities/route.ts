import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/settings/clear-activities
 * Eliminates all recovery activities and resets teacher budgets
 * Admin only
 */
export async function DELETE() {
  try {
    // Require admin authentication
    const user = await requireAdmin()

    const supabase = await createClient()

    // Delete all recovery activities
    const { error: deleteError } = await supabase
      .from('recovery_activities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (workaround for Supabase delete all syntax)

    if (deleteError) {
      throw deleteError
    }

    // Reset all teacher budgets (modules_used and minutes_used to 0)
    const { error: resetError } = await supabase
      .from('teacher_budgets')
      .update({
        modules_used: 0,
        minutes_used: 0,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

    if (resetError) {
      throw resetError
    }

    // Log the action
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'clear_all_activities',
        table_name: 'recovery_activities',
        new_values: { deleted_all: true, reset_budgets: true },
      })

    if (logError) {
      console.error('Failed to log clear activities action:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'Tutte le pianificazioni sono state eliminate e i budget sono stati resettati',
    })
  } catch (error) {
    console.error('Error clearing activities:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Accesso negato') ? 403 : 500 }
      )
    }

    return NextResponse.json(
      { error: 'Errore durante l\'eliminazione delle pianificazioni' },
      { status: 500 }
    )
  }
}
