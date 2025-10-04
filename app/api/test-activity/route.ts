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

    // Ensure user exists in public.users table (for FK constraint)
    console.log('TEST - Checking if user exists in public.users:', user.id)
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    console.log('TEST - User check result:', { existingUser, userCheckError })

    if (!existingUser && !userCheckError) {
      console.log('TEST - User not found, inserting into public.users')
      const { error: insertUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          role: 'admin',
          name: user.email?.split('@')[0] || 'User'
        })

      if (insertUserError) {
        console.error('TEST - Error inserting user:', insertUserError)
        return NextResponse.json({
          error: 'Failed to create user record',
          details: insertUserError
        }, { status: 500 })
      }
      console.log('TEST - User inserted successfully')
    }

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
      created_by: user.id
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
