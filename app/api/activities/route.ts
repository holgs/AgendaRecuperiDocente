import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const schoolYearId = searchParams.get('schoolYearId')
    const teacherId = searchParams.get('teacherId')

    let query = supabase
      .from('recovery_activities')
      .select(`
        *,
        teacher:teachers (
          cognome,
          nome
        ),
        recovery_type:recovery_types (
          name,
          color
        )
      `)
      .order('date', { ascending: false })

    if (schoolYearId) {
      query = query.eq('school_year_id', schoolYearId)
    }

    if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    }

    const { data: activities, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
