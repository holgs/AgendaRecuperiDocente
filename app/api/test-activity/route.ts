import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user in public.users table by email (for FK constraint)
    console.log('TEST - Finding user by email:', user.email)
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    console.log('TEST - User lookup result:', { existingUser, userCheckError })

    if (userCheckError) {
      console.error('TEST - Error looking up user:', userCheckError)
      return NextResponse.json({
        error: 'Failed to lookup user',
        details: userCheckError
      }, { status: 500 })
    }

    if (!existingUser) {
      console.log('TEST - User not found by email, inserting into public.users')
      const { data: newUser, error: insertUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          role: 'admin',
          name: user.email?.split('@')[0] || 'User'
        })
        .select('id')
        .single()

      if (insertUserError) {
        console.error('TEST - Error inserting user:', insertUserError)
        return NextResponse.json({
          error: 'Failed to create user record',
          details: insertUserError
        }, { status: 500 })
      }
      console.log('TEST - User inserted successfully:', newUser)
    }

    // Get the actual user ID from public.users (might be different from auth user.id)
    const publicUserId = existingUser?.id || user.id

    const body = await request.json()
    console.log('TEST - Request body:', body)

    // Minimal insert - only absolutely required fields
    const minimalActivity = {
      teacher_id: body.teacher_id,
      school_year_id: body.school_year_id,
      recovery_type_id: body.recovery_type_id,
      date: new Date(body.date).toISOString(),
      module_number: parseInt(body.module_number),
      class_name: body.class_name,
      title: `Test ${body.class_name}`,
      duration_minutes: 50,
      modules_equivalent: 1,
      status: 'planned',
      created_by: publicUserId  // Use the ID from public.users, not auth
    }

    console.log('TEST - Minimal activity data:', minimalActivity)

    const { data, error } = await supabase
      .from('recovery_activities')
      .insert(minimalActivity)
      .select()
      .single()

    console.log('TEST - Result:', { data, error })

    if (error) {
      return NextResponse.json({
        error: error.message,
        details: error,
        hint: error.hint,
        code: error.code
      }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error) {
    console.error('TEST - Exception:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
