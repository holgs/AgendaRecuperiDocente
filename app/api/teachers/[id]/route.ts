import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { fetchBudgetActivities, summarizeBudget } from '@/lib/budgets/usage'

export const dynamic = 'force-dynamic'

const updateTeacherSchema = z.object({
  cognome: z.string().min(1, 'Cognome obbligatorio').optional(),
  nome: z.string().min(1, 'Nome obbligatorio').optional(),
  email: z.string().email('Email non valida').optional(),
  contract_type: z.enum(['ruolo', 'tempo_determinato']).nullable().optional(),
  is_archived: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teacherId = params.id

    // Get teacher details
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', teacherId)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    // Get active school year
    const { data: activeYear, error: yearError } = await supabase
      .from('school_years')
      .select('*')
      .eq('is_active', true)
      .single()

    if (yearError || !activeYear) {
      return NextResponse.json(
        { error: 'No active school year found' },
        { status: 404 }
      )
    }

    // Get teacher budget for active year
    const { data: budget, error: budgetError } = await supabase
      .from('teacher_budgets')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('school_year_id', activeYear.id)
      .single()

    if (budgetError && budgetError.code !== 'PGRST116') throw budgetError
    const budgetActivities = await fetchBudgetActivities(supabase, activeYear.id, teacherId)
    const usage = summarizeBudget(budget?.minutes_annual || 0, budgetActivities)
    const budgetStats = budget ? {
      id: budget.id,
      ...usage,
      modulesAnnual: budget.modules_annual || 0,
      modulesAvailable: Math.max(0, (budget.modules_annual || 0) - usage.modulesUsed),
    } : null

    // Get activities for this teacher in active year
    const { data: activities, error: activitiesError } = await supabase
      .from('recovery_activities')
      .select(`
        id,
        date,
        duration_minutes,
        modules_equivalent,
        title,
        description,
        status,
        module_number,
        class_name,
        recovery_type_id,
        recovery_type:recovery_types(name, color)
      `)
      .eq('teacher_id', teacherId)
      .eq('school_year_id', activeYear.id)
      .order('date', { ascending: false })

    if (activitiesError) throw activitiesError
    const activityStats = {
      toPlan: usage.minutesAvailable,
      planned: usage.minutesPlanned,
      completed: usage.minutesCompleted,
    }

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        nome: teacher.nome,
        cognome: teacher.cognome,
        email: teacher.email,
      },
      budget: budgetStats,
      activityStats,
      activities: activities || [],
      activeYear: {
        id: activeYear.id,
        name: activeYear.name,
      },
    })
  } catch (error) {
    console.error('Error fetching teacher details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teacherId = params.id
    const body = await request.json()
    const validatedData = updateTeacherSchema.parse(body)

    // Build update object with only provided fields
    const updateData: any = {}
    if (validatedData.cognome !== undefined) updateData.cognome = validatedData.cognome
    if (validatedData.nome !== undefined) updateData.nome = validatedData.nome
    if (validatedData.email !== undefined) updateData.email = validatedData.email
    if (validatedData.contract_type !== undefined) updateData.contract_type = validatedData.contract_type
    if (validatedData.is_archived !== undefined) updateData.is_archived = validatedData.is_archived

    // Update teacher
    const { data: updatedTeacher, error: updateError } = await supabase
      .from('teachers')
      .update(updateData)
      .eq('id', teacherId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    if (!updatedTeacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedTeacher)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating teacher:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
