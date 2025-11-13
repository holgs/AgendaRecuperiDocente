import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  provisionTeacherUser,
  getRoleBasedDashboardPath,
  teacherHasBudget,
} from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

/**
 * OAuth Callback Handler
 * Handles Google OAuth callback, provisions users, and redirects based on role
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(
        `${origin}/login?error=auth_failed&message=${encodeURIComponent(error.message)}`
      )
    }

    const authUser = data.user

    if (!authUser?.email) {
      return NextResponse.redirect(
        `${origin}/login?error=no_email&message=${encodeURIComponent('Impossibile ottenere email dall\'account Google')}`
      )
    }

    // Validate email domain
    if (!authUser.email.endsWith('@piaggia.it')) {
      await supabase.auth.signOut()
      return NextResponse.redirect(
        `${origin}/access-denied?reason=invalid_domain`
      )
    }

    try {
      // Provision or get existing user
      const user = await provisionTeacherUser(authUser.email)

      if (!user) {
        // Teacher record not found
        return NextResponse.redirect(
          `${origin}/access-denied?reason=no_teacher_profile`
        )
      }

      // For teachers, check if budget exists
      if (user.role === 'teacher' && user.teacherId) {
        const hasBudget = await teacherHasBudget(user.teacherId)
        if (!hasBudget) {
          return NextResponse.redirect(
            `${origin}/access-denied?reason=no_budget`
          )
        }
      }

      // Redirect based on role
      const dashboardPath = getRoleBasedDashboardPath(user.role)
      return NextResponse.redirect(`${origin}${dashboardPath}`)
    } catch (error) {
      console.error('User provisioning error:', error)
      await supabase.auth.signOut()
      return NextResponse.redirect(
        `${origin}/login?error=provisioning_failed&message=${encodeURIComponent(
          error instanceof Error ? error.message : 'Errore sconosciuto'
        )}`
      )
    }
  }

  // No code in URL, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
