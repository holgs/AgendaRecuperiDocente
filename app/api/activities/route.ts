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
    const schoolYearId = searchParams.get('schoolYearId')
    const teacherId = searchParams.get('teacherId')

    const where: any = {}

    if (schoolYearId) {
      where.school_year_id = schoolYearId
    }

    if (teacherId) {
      where.teacher_id = teacherId
    }

    const activities = await prisma.recovery_activities.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        teacher: {
          select: {
            cognome: true,
            nome: true
          }
        },
        recovery_type: {
          select: {
            name: true,
            color: true
          }
        }
      }
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
