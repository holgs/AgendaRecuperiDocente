import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { date, module_number, class_name, recovery_type_id, co_teacher_name } = body

    // Get current activity
    const { data: currentActivity, error: fetchError } = await supabase
      .from('recovery_activities')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentActivity) {
      return NextResponse.json(
        { error: 'Attività non trovata' },
        { status: 404 }
      )
    }

    // Check if activity is completed (not editable)
    if (currentActivity.status === 'completed') {
      return NextResponse.json(
        { error: 'Impossibile modificare un\'attività completata' },
        { status: 400 }
      )
    }

    // Validation: Check teacher overlap if date or module changed
    if (date !== currentActivity.date || module_number !== currentActivity.module_number) {
      const { data: teacherOverlap } = await supabase
        .from('recovery_activities')
        .select('id')
        .eq('teacher_id', currentActivity.teacher_id)
        .eq('date', date)
        .eq('module_number', module_number)
        .neq('id', id)
        .limit(1)

      if (teacherOverlap && teacherOverlap.length > 0) {
        return NextResponse.json(
          { error: 'Sovrapposizione docente: il modulo è già occupato' },
          { status: 400 }
        )
      }
    }

    // Warning: Check class overlap if changed
    let classWarning = null
    if (class_name !== currentActivity.class_name || date !== currentActivity.date || module_number !== currentActivity.module_number) {
      const { data: classOverlap } = await supabase
        .from('recovery_activities')
        .select('id')
        .eq('class_name', class_name)
        .eq('date', date)
        .eq('module_number', module_number)
        .neq('id', id)
        .limit(1)

      if (classOverlap && classOverlap.length > 0) {
        classWarning = `Attenzione: la classe ${class_name} ha già un'attività in questo modulo`
      }
    }

    // Update activity
    const { data: activity, error: updateError } = await supabase
      .from('recovery_activities')
      .update({
        date,
        module_number,
        class_name,
        recovery_type_id,
        co_teacher_name: co_teacher_name || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        teacher:teachers (cognome, nome),
        recovery_type:recovery_types (name, color)
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      activity,
      warning: classWarning
    })

  } catch (error) {
    console.error('Error updating activity:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { status } = body

    // Update only status (for marking as complete)
    const { data: activity, error: updateError } = await supabase
      .from('recovery_activities')
      .update({ status })
      .eq('id', id)
      .select(`
        *,
        teacher:teachers (cognome, nome),
        recovery_type:recovery_types (name, color)
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error patching activity:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Get activity first
    const { data: activity, error: fetchError } = await supabase
      .from('recovery_activities')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !activity) {
      return NextResponse.json(
        { error: 'Attività non trovata' },
        { status: 404 }
      )
    }

    // Cannot delete completed activities
    if (activity.status === 'completed') {
      return NextResponse.json(
        { error: 'Impossibile eliminare un\'attività completata' },
        { status: 400 }
      )
    }

    // Delete activity
    const { error: deleteError } = await supabase
      .from('recovery_activities')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    // Fetch the budget separately to restore it
    const { data: budget, error: budgetError } = await supabase
      .from('teacher_budgets')
      .select('*')
      .eq('teacher_id', activity.teacher_id)
      .eq('school_year_id', activity.school_year_id)
      .single()

    if (budgetError || !budget) {
      console.error('Budget not found for restoration:', budgetError)
      // Don't fail the delete, just log the error
      return NextResponse.json({
        success: true,
        warning: 'Attività eliminata ma budget non aggiornato'
      })
    }

    // Restore budget
    const { error: updateError } = await supabase
      .from('teacher_budgets')
      .update({
        modules_used: Math.max(0, (budget.modules_used || 0) - 1),
        minutes_used: Math.max(0, (budget.minutes_used || 0) - 50)
      })
      .eq('id', budget.id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting activity:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
