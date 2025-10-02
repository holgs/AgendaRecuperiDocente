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

    // Get active school year
    const activeYear = await prisma.school_years.findFirst({
      where: { is_active: true }
    })

    if (!activeYear) {
      return NextResponse.json({
        error: 'No active school year found'
      }, { status: 404 })
    }

    // Total teachers count
    const totalTeachers = await prisma.teachers.count()

    // Get all budgets for active year
    const budgets = await prisma.teacher_budgets.findMany({
      where: { school_year_id: activeYear.id },
      include: {
        teacher: true
      }
    })

    // Get all activities for active year
    const activities = await prisma.recovery_activities.findMany({
      where: { school_year_id: activeYear.id },
      include: {
        teacher: true,
        recovery_type: true
      }
    })

    // Calculate statistics
    const totalModulesAnnual = budgets.reduce((sum, b) => sum + b.modules_annual, 0)

    // Modules used (both planned and completed)
    const modulesUsed = activities.reduce((sum, a) => sum + a.modules_equivalent, 0)

    // Modules planned (status = 'planned')
    const modulesPlanned = activities
      .filter(a => a.status === 'planned')
      .reduce((sum, a) => sum + a.modules_equivalent, 0)

    // Modules completed (status = 'completed')
    const modulesCompleted = activities
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + a.modules_equivalent, 0)

    // Modules to plan (available - not used yet)
    const modulesToPlan = totalModulesAnnual - modulesUsed

    // Activities count by status
    const activitiesPlanned = activities.filter(a => a.status === 'planned').length
    const activitiesCompleted = activities.filter(a => a.status === 'completed').length

    return NextResponse.json({
      overview: {
        totalTeachers,
        totalModulesAnnual,
        modulesToPlan,
        modulesPlanned,
        modulesCompleted,
        modulesUsed,
        activitiesPlanned,
        activitiesCompleted,
        totalActivities: activities.length
      },
      activeYear: {
        id: activeYear.id,
        name: activeYear.name,
        startDate: activeYear.start_date,
        endDate: activeYear.end_date
      }
    })
  } catch (error) {
    console.error('Error fetching overview:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
