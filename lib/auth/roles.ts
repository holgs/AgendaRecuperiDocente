// Authentication and Role Management Utilities

import { createClient } from '@/lib/supabase/server'

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'teacher'

/**
 * Extended user information including role and teacher linkage
 */
export interface ExtendedUser {
  id: string
  email: string
  role: UserRole
  name: string | null
  teacherId: string | null
  teacher: {
    id: string
    cognome: string
    nome: string
    email: string | null
  } | null
}

/**
 * Get the authenticated user with role information
 * @returns Extended user object or null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<ExtendedUser | null> {
  const supabase = await createClient()

  // Get authentication user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return null
  }

  // Get user from public schema with teacher linkage
  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .select(
      `
      id,
      email,
      role,
      name,
      teachers (
        id,
        cognome,
        nome,
        email
      )
    `
    )
    .eq('email', authUser.email)
    .single()

  if (publicError || !publicUser) {
    return null
  }

  // Extract teacher data (if linked)
  const teacher = Array.isArray(publicUser.teachers)
    ? publicUser.teachers[0]
    : publicUser.teachers

  return {
    id: publicUser.id,
    email: publicUser.email,
    role: publicUser.role as UserRole,
    name: publicUser.name,
    teacherId: teacher?.id || null,
    teacher: teacher || null,
  }
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getAuthenticatedUser()
  return user?.role === 'admin'
}

/**
 * Check if current user is a teacher
 */
export async function isTeacher(): Promise<boolean> {
  const user = await getAuthenticatedUser()
  return user?.role === 'teacher'
}

/**
 * Get the teacher ID for the current user
 * @returns Teacher ID or null if user is not a teacher or not linked
 */
export async function getCurrentTeacherId(): Promise<string | null> {
  const user = await getAuthenticatedUser()
  return user?.teacherId || null
}

/**
 * Require admin role or throw error
 * Use in API routes that need admin access
 */
export async function requireAdmin(): Promise<ExtendedUser> {
  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error('Utente non autenticato')
  }

  if (user.role !== 'admin') {
    throw new Error('Accesso negato: richiesti permessi di amministratore')
  }

  return user
}

/**
 * Require teacher role or throw error
 * Use in teacher-specific API routes
 */
export async function requireTeacher(): Promise<ExtendedUser> {
  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error('Utente non autenticato')
  }

  if (user.role !== 'teacher') {
    throw new Error('Accesso negato: richiesti permessi docente')
  }

  if (!user.teacherId) {
    throw new Error('Profilo docente non collegato')
  }

  return user
}

/**
 * Provision a new user account after Google OAuth login
 * Creates user record and links to existing teacher profile by email
 *
 * @param authEmail - Email from Google OAuth
 * @returns Created user or null if teacher not found
 */
export async function provisionTeacherUser(
  authEmail: string
): Promise<ExtendedUser | null> {
  const supabase = await createClient()

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('*, teachers(*)')
    .eq('email', authEmail)
    .single()

  if (existingUser) {
    // User already exists, return it
    const teacher = Array.isArray(existingUser.teachers)
      ? existingUser.teachers[0]
      : existingUser.teachers

    return {
      id: existingUser.id,
      email: existingUser.email,
      role: existingUser.role as UserRole,
      name: existingUser.name,
      teacherId: teacher?.id || null,
      teacher: teacher || null,
    }
  }

  // Validate email domain
  if (!authEmail.endsWith('@piaggia.it')) {
    throw new Error('Dominio email non autorizzato. Utilizzare un account @piaggia.it')
  }

  // Find matching teacher by email
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('*')
    .eq('email', authEmail)
    .single()

  if (teacherError || !teacher) {
    // No matching teacher found
    return null
  }

  // Create new user record
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      email: authEmail,
      role: 'teacher',
      name: `${teacher.nome} ${teacher.cognome}`,
    })
    .select()
    .single()

  if (userError || !newUser) {
    throw new Error('Errore nella creazione dell\'utente')
  }

  // Link teacher to user
  const { error: linkError } = await supabase
    .from('teachers')
    .update({ user_id: newUser.id })
    .eq('id', teacher.id)

  if (linkError) {
    // Rollback user creation if linking fails
    await supabase.from('users').delete().eq('id', newUser.id)
    throw new Error('Errore nel collegamento del profilo docente')
  }

  return {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role as UserRole,
    name: newUser.name,
    teacherId: teacher.id,
    teacher: {
      id: teacher.id,
      cognome: teacher.cognome,
      nome: teacher.nome,
      email: teacher.email,
    },
  }
}

/**
 * Check if a teacher has a budget for the active school year
 * @param teacherId - Teacher ID to check
 * @returns True if budget exists, false otherwise
 */
export async function teacherHasBudget(teacherId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('teacher_budgets')
    .select('id, school_years!inner(is_active)')
    .eq('teacher_id', teacherId)
    .eq('school_years.is_active', true)
    .single()

  return !error && data !== null
}

/**
 * Get redirect path based on user role
 * @param role - User role
 * @returns Dashboard path for the role
 */
export function getRoleBasedDashboardPath(role: UserRole): string {
  return role === 'admin' ? '/dashboard' : '/dashboard/teacher'
}
