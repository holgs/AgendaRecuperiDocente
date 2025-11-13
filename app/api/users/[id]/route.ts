import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/users/[id]
 * Delete an admin user
 * Admin only - prevents deletion of last admin
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    const currentUser = await requireAdmin()

    const supabase = await createClient()
    const { id } = await params

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Non puoi eliminare il tuo stesso account' },
        { status: 400 }
      )
    }

    // Check if user exists and is admin
    const { data: userToDelete, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', id)
      .single()

    if (fetchError || !userToDelete) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    if (userToDelete.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo gli utenti amministratori possono essere eliminati tramite questo endpoint' },
        { status: 400 }
      )
    }

    // Count remaining admin users
    const { count, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if (countError) {
      throw countError
    }

    // Prevent deletion of last admin
    if (count && count <= 1) {
      return NextResponse.json(
        { error: 'Impossibile eliminare l\'ultimo amministratore del sistema' },
        { status: 400 }
      )
    }

    // Delete user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    // Log the action
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: currentUser.id,
        action: 'delete_admin_user',
        table_name: 'users',
        record_id: id,
        old_values: { email: userToDelete.email, role: userToDelete.role },
      })

    if (logError) {
      console.error('Failed to log delete user action:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'Utente eliminato con successo',
    })
  } catch (error) {
    console.error('Error deleting user:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Accesso negato') ? 403 : 500 }
      )
    }

    return NextResponse.json(
      { error: 'Errore durante l\'eliminazione dell\'utente' },
      { status: 500 }
    )
  }
}
