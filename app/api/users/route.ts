import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/roles'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema for creating new admin users
const createUserSchema = z.object({
  email: z.string().email('Email non valida'),
  name: z.string().min(1, 'Nome richiesto'),
  role: z.enum(['admin', 'teacher']).default('admin'),
})

/**
 * GET /api/users
 * List all admin users
 * Admin only
 */
export async function GET() {
  try {
    // Require admin authentication
    await requireAdmin()

    const supabase = await createClient()

    // Fetch all admin users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Accesso negato') ? 403 : 500 }
      )
    }

    return NextResponse.json(
      { error: 'Errore durante il caricamento degli utenti' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/users
 * Create new admin user
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const currentUser = await requireAdmin()

    const supabase = await createClient()

    // Parse and validate request body
    const body = await request.json()
    const validation = createUserSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { email, name, role } = validation.data

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un utente con questa email esiste già' },
        { status: 409 }
      )
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        name,
        role,
      })
      .select('id, email, name, role, created_at')
      .single()

    if (createError) {
      throw createError
    }

    // Log the action
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: currentUser.id,
        action: 'create_admin_user',
        table_name: 'users',
        record_id: newUser.id,
        new_values: { email, name, role },
      })

    if (logError) {
      console.error('Failed to log create user action:', logError)
    }

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Accesso negato') ? 403 : 500 }
      )
    }

    return NextResponse.json(
      { error: 'Errore durante la creazione dell\'utente' },
      { status: 500 }
    )
  }
}
