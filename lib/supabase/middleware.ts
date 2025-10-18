import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user role for authenticated users
  let userRole: 'admin' | 'teacher' | null = null
  if (user) {
    const { data: publicUser } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single()

    userRole = publicUser?.role as 'admin' | 'teacher' | null
  }

  // Redirect authenticated users from login page to appropriate dashboard
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = userRole === 'teacher' ? '/dashboard/teacher' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect unauthenticated users from protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Role-based route protection
  if (user && userRole) {
    const pathname = request.nextUrl.pathname

    // Teachers can only access /dashboard/teacher routes
    if (userRole === 'teacher' && pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/teacher')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/teacher'
      return NextResponse.redirect(url)
    }

    // Admins cannot access the teacher self-service area (/dashboard/teacher but NOT /dashboard/teachers)
    // /dashboard/teacher = teacher self-service area
    // /dashboard/teachers = admin page to manage teachers
    if (userRole === 'admin' && pathname === '/dashboard/teacher') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Protected routes - require authentication
  if (!user && request.nextUrl.pathname.startsWith('/api')) {
    // Allow public endpoints
    const publicEndpoints = ['/api/health']
    const isPublicEndpoint = publicEndpoints.some(endpoint =>
      request.nextUrl.pathname.startsWith(endpoint)
    )

    if (!isPublicEndpoint) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
