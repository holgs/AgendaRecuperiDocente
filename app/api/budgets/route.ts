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
    const teacherId = searchParams.get('teacherId')
    const schoolYearId = searchParams.get('schoolYearId')

    let query = supabase
      .from('teacher_budgets')
      .select(`
        *,
        teacher:teachers (*),
        school_year:school_years (*)
      `)
      .order('import_date', { ascending: false })

    if (teacherId) {
      query = query.eq('teacher_id', teacherId)
    }

    if (schoolYearId) {
      query = query.eq('school_year_id', schoolYearId)
    }

    const { data: budgets, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
