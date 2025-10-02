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

    // Get all teachers with their budgets for active year
    const teachers = await prisma.teachers.findMany({
      include: {
        teacher_budgets: {
          where: {
            school_year_id: activeYear.id
          },
          include: {
            school_year: true
          }
        }
      },
      orderBy: [
        { cognome: 'asc' },
        { nome: 'asc' }
      ]
    })

    // Transform data to include computed fields
    const teachersWithStats = teachers.map(teacher => {
      const budget = teacher.teacher_budgets[0] // Get budget for active year

      return {
        id: teacher.id,
        nome: teacher.nome,
        cognome: teacher.cognome,
        email: teacher.email,
        budget: budget ? {
          id: budget.id,
          modulesAnnual: budget.modules_annual,
          modulesUsed: budget.modules_used || 0,
          modulesAvailable: budget.modules_annual - (budget.modules_used || 0),
          minutesAnnual: budget.minutes_annual,
          minutesUsed: budget.minutes_used || 0,
          minutesAvailable: budget.minutes_annual - (budget.minutes_used || 0),
          percentageUsed: budget.minutes_annual > 0
            ? Math.round((budget.minutes_used || 0) / budget.minutes_annual * 100)
            : 0
        } : null
      }
    })

    return NextResponse.json({
      teachers: teachersWithStats,
      activeYear: {
        id: activeYear.id,
        name: activeYear.name
      }
    })
  } catch (error) {
    console.error('Error fetching teachers with budgets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
