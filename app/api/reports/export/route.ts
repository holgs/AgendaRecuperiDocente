import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

export const dynamic = 'force-dynamic'

/**
 * Export teachers activity report as CSV
 * Columns: NOME | COGNOME | Moduli da recuperare | Moduli recuperati | Percentuale
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Get all teachers with their budgets for active year
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select(`
        id,
        nome,
        cognome,
        email,
        teacher_budgets!inner (
          id,
          school_year_id,
          modules_annual,
          modules_used,
          minutes_annual,
          minutes_used
        )
      `)
      .eq('teacher_budgets.school_year_id', activeYear.id)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })

    if (teachersError) {
      console.error('Error fetching teachers:', teachersError)
      return NextResponse.json(
        { error: 'Failed to fetch teachers' },
        { status: 500 }
      )
    }

    // Transform data for CSV export
    const csvData = (teachers || []).map(teacher => {
      const budget = Array.isArray(teacher.teacher_budgets)
        ? teacher.teacher_budgets[0]
        : teacher.teacher_budgets

      const modulesAnnual = budget?.modules_annual || 0
      const modulesUsed = budget?.modules_used || 0
      const modulesAvailable = modulesAnnual - modulesUsed
      const percentageUsed = modulesAnnual > 0
        ? ((modulesUsed / modulesAnnual) * 100).toFixed(1)
        : '0.0'

      return {
        NOME: teacher.nome || '',
        COGNOME: teacher.cognome || '',
        'Moduli da recuperare': modulesAnnual.toString(),
        'Moduli recuperati': modulesUsed.toString(),
        'Percentuale': `${percentageUsed}%`
      }
    })

    // Generate CSV using papaparse
    const csv = Papa.unparse(csvData, {
      delimiter: ';',
      header: true,
      quotes: true
    })

    // Add BOM for proper Excel UTF-8 encoding
    const csvWithBOM = '\uFEFF' + csv

    // Create filename with current date
    const today = new Date().toISOString().split('T')[0]
    const filename = `report_attivita_${activeYear.name.replace(/\//g, '-')}_${today}.csv`

    // Return CSV file
    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
