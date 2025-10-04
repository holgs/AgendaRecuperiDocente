import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active school year
    const { data: activeYear, error } = await supabase
      .from('school_years')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching active school year:', error)
      return NextResponse.json(
        { error: 'Nessun anno scolastico attivo trovato' },
        { status: 404 }
      )
    }

    return NextResponse.json(activeYear)
  } catch (error) {
    console.error('Error in GET /api/school-years/active:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
