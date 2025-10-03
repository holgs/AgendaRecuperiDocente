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

    const { data: teachers, error } = await supabase
      .from('teachers')
      .select(`
        *,
        teacher_budgets (
          *,
          school_year:school_years (*)
        )
      `)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ teachers })
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { cognome, nome, email } = body

    if (!cognome || !nome) {
      return NextResponse.json(
        { error: 'Cognome and nome are required' },
        { status: 400 }
      )
    }

    const { data: teacher, error } = await supabase
      .from('teachers')
      .insert({
        cognome,
        nome,
        email: email || null
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ teacher }, { status: 201 })
  } catch (error) {
    console.error('Error creating teacher:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
