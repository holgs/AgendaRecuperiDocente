import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

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

    const where: any = {}
    if (teacherId) where.teacher_id = teacherId
    if (schoolYearId) where.school_year_id = schoolYearId

    const budgets = await prisma.teacher_budgets.findMany({
      where,
      include: {
        teacher: true,
        school_year: true
      },
      orderBy: {
        import_date: 'desc'
      }
    })

    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}