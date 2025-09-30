import { prisma } from '@/lib/prisma'

/**
 * Calculate remaining budget for a teacher in a specific school year
 */
export async function getTeacherRemainingBudget(teacherId: string, schoolYearId: string) {
  const budget = await prisma.teacher_budgets.findFirst({
    where: {
      teacher_id: teacherId,
      school_year_id: schoolYearId
    }
  })

  if (!budget) {
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
  const budget = await prisma.teacher_budgets.findFirst({
    where: {
      teacher_id: teacherId,
      school_year_id: schoolYearId
    }
  })

  if (!budget) {
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
  return prisma.teacher_budgets.update({
    where: { id: budget.id },
    data: {
      minutes_used: newMinutesUsed,
      modules_used: newModulesUsed
    }
  })
}

/**
 * Get active school year
 */
export async function getActiveSchoolYear() {
  return prisma.school_years.findFirst({
    where: { is_active: true },
    orderBy: { start_date: 'desc' }
  })
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
  return prisma.activity_logs.create({
    data: {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent
    }
  })
}