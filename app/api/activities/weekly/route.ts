import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get week parameter or use current week
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('weekStart')

    // Calculate start and end of current week (Monday to Friday)
    const now = new Date()
    const currentDay = now.getDay()
    const diff = currentDay === 0 ? -6 : 1 - currentDay // Adjust to Monday

    const startDate = weekStart
      ? new Date(weekStart)
      : new Date(now.setDate(now.getDate() + diff))

    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6) // Include Sunday
    endDate.setHours(23, 59, 59, 999)

    // Get active school year
    const activeYear = await prisma.school_years.findFirst({
      where: { is_active: true }
    })

    if (!activeYear) {
      return NextResponse.json({
        error: 'No active school year found'
      }, { status: 404 })
    }

    // Get activities for the week
    const activities = await prisma.recovery_activities.findMany({
      where: {
        school_year_id: activeYear.id,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        teacher: true,
        recovery_type: true
      },
      orderBy: [
        { date: 'asc' },
        { module_number: 'asc' }
      ]
    })

    return NextResponse.json({
      activities,
      weekStart: startDate.toISOString(),
      weekEnd: endDate.toISOString()
    })
  } catch (error) {
    console.error('Error fetching weekly activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
