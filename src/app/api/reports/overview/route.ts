import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolYearId = searchParams.get('schoolYearId');

    const where: any = {};
    if (schoolYearId) {
      where.schoolYearId = schoolYearId;
    }

    // Statistiche generali
    const [
      totalTeachers,
      totalBudgets,
      totalActivities,
      activeSchoolYear,
      budgetStats,
      activityStats,
      topTeachers
    ] = await Promise.all([
      // Totale docenti
      prisma.teacher.count(),
      
      // Totale tesoretti
      prisma.teacherBudget.count({ where }),
      
      // Totale attività
      prisma.recoveryActivity.count({ where }),
      
      // Anno scolastico attivo
      prisma.schoolYear.findFirst({
        where: { isActive: true }
      }),
      
      // Statistiche budget
      prisma.teacherBudget.aggregate({
        where,
        _sum: {
          minutesAnnual: true,
          minutesUsed: true,
          modulesAnnual: true,
          modulesUsed: true
        },
        _avg: {
          minutesAnnual: true,
          minutesUsed: true
        }
      }),
      
      // Statistiche attività per tipologia
      prisma.recoveryActivity.groupBy({
        by: ['recoveryTypeId'],
        where,
        _count: {
          id: true
        },
        _sum: {
          durationMinutes: true,
          modulesEquivalent: true
        }
      }),
      
      // Top 10 docenti per utilizzo
      prisma.teacherBudget.findMany({
        where,
        include: {
          teacher: {
            select: {
              nome: true,
              cognome: true
            }
          }
        },
        orderBy: {
          minutesUsed: 'desc'
        },
        take: 10
      })
    ]);

    // Arricchisci statistiche attività con nomi tipologie
    const enrichedActivityStats = await Promise.all(
      activityStats.map(async (stat) => {
        const recoveryType = await prisma.recoveryType.findUnique({
          where: { id: stat.recoveryTypeId },
          select: { name: true, color: true }
        });
        return {
          ...stat,
          recoveryType
        };
      })
    );

    // Calcola percentuali utilizzo
    const totalMinutesAnnual = budgetStats._sum.minutesAnnual || 0;
    const totalMinutesUsed = budgetStats._sum.minutesUsed || 0;
    const totalModulesAnnual = budgetStats._sum.modulesAnnual || 0;
    const totalModulesUsed = budgetStats._sum.modulesUsed || 0;

    const utilizationPercentage = totalMinutesAnnual > 0 
      ? Math.round((totalMinutesUsed / totalMinutesAnnual) * 100)
      : 0;

    // Statistiche per status attività
    const activityByStatus = await prisma.recoveryActivity.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true
      }
    });

    const overview = {
      summary: {
        totalTeachers,
        totalBudgets,
        totalActivities,
        utilizationPercentage,
        activeSchoolYear: activeSchoolYear ? {
          id: activeSchoolYear.id,
          name: activeSchoolYear.name,
          startDate: activeSchoolYear.startDate,
          endDate: activeSchoolYear.endDate
        } : null
      },
      budgets: {
        totalMinutesAnnual,
        totalMinutesUsed,
        totalMinutesRemaining: totalMinutesAnnual - totalMinutesUsed,
        totalModulesAnnual,
        totalModulesUsed,
        totalModulesRemaining: totalModulesAnnual - totalModulesUsed,
        averageMinutesAnnual: Math.round(budgetStats._avg.minutesAnnual || 0),
        averageMinutesUsed: Math.round(budgetStats._avg.minutesUsed || 0)
      },
      activities: {
        byType: enrichedActivityStats,
        byStatus: activityByStatus,
        totalDuration: activityStats.reduce((sum, stat) => sum + (stat._sum.durationMinutes || 0), 0),
        totalModules: activityStats.reduce((sum, stat) => sum + (stat._sum.modulesEquivalent || 0), 0)
      },
      topTeachers: topTeachers.map(budget => ({
        teacher: `${budget.teacher.cognome} ${budget.teacher.nome}`,
        minutesUsed: budget.minutesUsed || 0,
        minutesAnnual: budget.minutesAnnual,
        utilizationPercentage: Math.round(((budget.minutesUsed || 0) / budget.minutesAnnual) * 100)
      }))
    };

    return NextResponse.json(overview);

  } catch (error) {
    console.error('Error generating overview report:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}