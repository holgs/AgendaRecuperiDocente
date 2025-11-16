import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Get active school year
    const { data: schoolYear, error: schoolYearError } = await supabase
      .from('school_years')
      .select('*')
      .eq('is_active', true)
      .single()

    if (schoolYearError || !schoolYear) {
      return NextResponse.json(
        { error: 'Anno scolastico attivo non trovato' },
        { status: 404 }
      )
    }

    // Get all teachers with budgets for active school year
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select(
        `
        id,
        first_name,
        last_name,
        teacher_budgets!inner (
          id,
          minutes_annual,
          minutes_used,
          modules_annual,
          modules_used,
          school_year_id
        )
      `
      )
      .eq('teacher_budgets.school_year_id', schoolYear.id)
      .order('last_name', { ascending: true })

    if (teachersError) {
      console.error('Error fetching teachers:', teachersError)
      return NextResponse.json(
        { error: 'Errore nel recupero dei docenti' },
        { status: 500 }
      )
    }

    // Get all activities for active school year
    const { data: activities, error: activitiesError } = await supabase
      .from('recovery_activities')
      .select('teacher_id, status, module_duration')
      .eq('school_year_id', schoolYear.id)

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError)
      return NextResponse.json(
        { error: 'Errore nel recupero delle attività' },
        { status: 500 }
      )
    }

    // Build CSV data
    const csvRows: string[] = []

    // CSV Header
    csvRows.push(
      'Docente;Tesoretto (moduli);Attività Pianificate;Attività Completate;% Pianificate sul Totale;% Completate sul Totale'
    )

    // Process each teacher
    for (const teacher of teachers || []) {
      const budget = teacher.teacher_budgets[0]
      if (!budget) continue

      const teacherActivities = (activities || []).filter(
        (a) => a.teacher_id === teacher.id
      )

      // Count activities by status
      const plannedActivities = teacherActivities.filter(
        (a) => a.status === 'planned'
      )
      const completedActivities = teacherActivities.filter(
        (a) => a.status === 'completed'
      )

      // Calculate percentages based on modules_annual
      const totalModules = budget.modules_annual || 0
      const plannedCount = plannedActivities.length
      const completedCount = completedActivities.length

      const percentagePlanned =
        totalModules > 0 ? ((plannedCount / totalModules) * 100).toFixed(2) : '0.00'
      const percentageCompleted =
        totalModules > 0 ? ((completedCount / totalModules) * 100).toFixed(2) : '0.00'

      // Build teacher full name
      const fullName = `${teacher.last_name} ${teacher.first_name}`

      // Add CSV row
      csvRows.push(
        `${fullName};${totalModules};${plannedCount};${completedCount};${percentagePlanned};${percentageCompleted}`
      )
    }

    // Join all rows with newline
    const csvContent = csvRows.join('\n')

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0]
    const filename = `report_docenti_${date}.csv`

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating CSV:', error)
    return NextResponse.json(
      { error: 'Errore nella generazione del CSV' },
      { status: 500 }
    )
  }
}
