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

    const body = await request.json()
    console.log('TEST - Request body:', body)

    // Minimal insert - only absolutely required fields
    const minimalActivity = {
      teacher_id: body.teacher_id,
      school_year_id: body.school_year_id,
      date: new Date(body.date).toISOString(),
      module_number: parseInt(body.module_number),
      class_name: body.class_name,
      title: `Test ${body.class_name}`,
      duration_minutes: 50,
      modules_equivalent: 1,
      status: 'planned'
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
