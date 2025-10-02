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
    const { data: activeYear, error: yearError } = await supabase
      .from('school_years')
      .select('*')
      .eq('is_active', true)
      .single()

    if (yearError || !activeYear) {
      return NextResponse.json({
        error: 'No active school year found'
      }, { status: 404 })
    }

    // Get activities for the week with teacher and recovery_type
    const { data: activities, error: activitiesError } = await supabase
      .from('recovery_activities')
      .select(`
        *,
        teacher:teachers(id, nome, cognome, email),
        recovery_type:recovery_types(id, name, color)
      `)
      .eq('school_year_id', activeYear.id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: true })
      .order('module_number', { ascending: true })

    return NextResponse.json({
      activities: activities || [],
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
