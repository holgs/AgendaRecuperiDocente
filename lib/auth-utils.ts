import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user details from database
  const dbUser = await prisma.users.findUnique({
    where: { email: user.email || '' }
  })

  return {
    id: user.id,
    email: user.email,
    role: dbUser?.role || 'viewer',
    name: dbUser?.name
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

export async function requireRole(role: string | string[]) {
  const user = await requireAuth()
  const allowedRoles = Array.isArray(role) ? role : [role]

  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden: Insufficient permissions')
  }

  return user
}