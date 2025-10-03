import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSchoolYearSchema = z.object({
  name: z.string().min(1).optional(),
  start_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date').optional(),
  end_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date').optional(),
  is_active: z.boolean().optional(),
  weeks_count: z.number().int().min(1).max(52).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: schoolYear, error } = await supabase
      .from('school_years')
      .select(`
        *,
        teacher_budgets (
          id,
          teacher_id,
          minutes_annual,
          modules_annual,
          minutes_used,
          modules_used
        )
      `)
      .eq('id', id)
      .single()

    if (error || !schoolYear) {
      return NextResponse.json({ error: 'School year not found' }, { status: 404 })
    }

    return NextResponse.json(schoolYear)
  } catch (error) {
    console.error('Error fetching school year:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateSchoolYearSchema.parse(body)

    // If setting as active, deactivate all other school years
    if (validatedData.is_active) {
      await supabase
        .from('school_years')
        .update({ is_active: false })
        .eq('is_active', true)
        .neq('id', id)
    }

    const updateData: any = {}

    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.start_date !== undefined) updateData.start_date = validatedData.start_date
    if (validatedData.end_date !== undefined) updateData.end_date = validatedData.end_date
    if (validatedData.is_active !== undefined) updateData.is_active = validatedData.is_active
    if (validatedData.weeks_count !== undefined) updateData.weeks_count = validatedData.weeks_count

    const { data: schoolYear, error } = await supabase
      .from('school_years')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(schoolYear)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating school year:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if school year has budgets
    const { count, error: countError } = await supabase
      .from('teacher_budgets')
      .select('*', { count: 'exact', head: true })
      .eq('school_year_id', id)

    if (countError) {
      throw countError
    }

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete school year with existing budgets' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('school_years')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting school year:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
