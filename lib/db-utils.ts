import { createClient } from '@/lib/supabase/server'

/**
 * Calculate remaining budget for a teacher in a specific school year
 */
export async function getTeacherRemainingBudget(teacherId: string, schoolYearId: string) {
  const supabase = await createClient()

  const { data: budget, error } = await supabase
    .from('teacher_budgets')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('school_year_id', schoolYearId)
    .single()

  if (error || !budget) {
    return null
  }

  return {
    minutesRemaining: budget.minutes_annual - (budget.minutes_used || 0),
    modulesRemaining: budget.modules_annual - (budget.modules_used || 0),
    minutesTotal: budget.minutes_annual,
    modulesTotal: budget.modules_annual,
    minutesUsed: budget.minutes_used || 0,
    modulesUsed: budget.modules_used || 0,
    percentageUsed: ((budget.minutes_used || 0) / budget.minutes_annual) * 100
  }
}

/**
 * Update teacher budget after activity registration
 */
export async function updateTeacherBudgetUsage(
  teacherId: string,
  schoolYearId: string,
  minutesUsed: number,
  modulesUsed: number
) {
  const supabase = await createClient()

  const { data: budget, error } = await supabase
    .from('teacher_budgets')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('school_year_id', schoolYearId)
    .single()

  if (error || !budget) {
    throw new Error('Budget not found for this teacher and school year')
  }

  // Check if there's enough budget
  const newMinutesUsed = (budget.minutes_used || 0) + minutesUsed
  const newModulesUsed = (budget.modules_used || 0) + modulesUsed

  if (newMinutesUsed > budget.minutes_annual) {
    throw new Error('Insufficient budget: would exceed annual minutes allocation')
  }

  if (newModulesUsed > budget.modules_annual) {
    throw new Error('Insufficient budget: would exceed annual modules allocation')
  }

  // Update budget
  const { data, error: updateError } = await supabase
    .from('teacher_budgets')
    .update({
      minutes_used: newMinutesUsed,
      modules_used: newModulesUsed
    })
    .eq('id', budget.id)
    .select()
    .single()

  if (updateError) {
    throw updateError
  }

  return data
}

/**
 * Get active school year
 */
export async function getActiveSchoolYear() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('school_years')
    .select('*')
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Log activity for audit trail
 */
export async function logActivity(
  userId: string,
  action: string,
  tableName: string,
  recordId: string | null,
  oldValues: any,
  newValues: any,
  ipAddress?: string,
  userAgent?: string
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
