import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schoolYearSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
  is_active: z.boolean().default(false),
  weeks_count: z.number().int().min(1).max(52).default(30)
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('activeOnly') === 'true'

    let query = supabase
      .from('school_years')
      .select('*')
      .order('start_date', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: schoolYears, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json(schoolYears)
  } catch (error) {
    console.error('Error fetching school years:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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
    const validatedData = schoolYearSchema.parse(body)

    // If setting as active, deactivate all other school years
    if (validatedData.is_active) {
      await supabase
        .from('school_years')
        .update({ is_active: false })
        .eq('is_active', true)
    }

    const { data: schoolYear, error } = await supabase
      .from('school_years')
      .insert({
        name: validatedData.name,
        start_date: validatedData.start_date,
        end_date: validatedData.end_date,
        is_active: validatedData.is_active,
        weeks_count: validatedData.weeks_count
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(schoolYear, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating school year:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
