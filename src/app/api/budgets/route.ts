import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const teacherId = searchParams.get('teacherId');
    const schoolYearId = searchParams.get('schoolYearId');

    const skip = (page - 1) * limit;

    const where: any = {};
    if (teacherId) where.teacherId = teacherId;
    if (schoolYearId) where.schoolYearId = schoolYearId;

    const [budgets, total] = await Promise.all([
      prisma.teacherBudget.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              email: true
            }
          },
          schoolYear: {
            select: {
              id: true,
              name: true,
              isActive: true
            }
          }
        },
        orderBy: [
          { schoolYear: { startDate: 'desc' } },
          { teacher: { cognome: 'asc' } },
          { teacher: { nome: 'asc' } }
        ],
        skip,
        take: limit
      }),
      prisma.teacherBudget.count({ where })
    ]);

    // Calcola statistiche aggiuntive
    const budgetsWithStats = budgets.map(budget => ({
      ...budget,
      minutesRemaining: budget.minutesAnnual - (budget.minutesUsed || 0),
      modulesRemaining: budget.modulesAnnual - (budget.modulesUsed || 0),
      percentageUsed: Math.round(((budget.minutesUsed || 0) / budget.minutesAnnual) * 100)
    }));

    return NextResponse.json({
      data: budgetsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teacherId,
      schoolYearId,
      minutesWeekly,
      minutesAnnual,
      modulesAnnual,
      importSource
    } = body;

    if (!teacherId || !schoolYearId || !minutesWeekly || !minutesAnnual || !modulesAnnual) {
      return NextResponse.json(
        { error: 'Tutti i campi obbligatori devono essere specificati' },
        { status: 400 }
      );
    }

    // Verifica che teacher e school year esistano
    const [teacher, schoolYear] = await Promise.all([
      prisma.teacher.findUnique({ where: { id: teacherId } }),
      prisma.schoolYear.findUnique({ where: { id: schoolYearId } })
    ]);

    if (!teacher) {
      return NextResponse.json(
        { error: 'Docente non trovato' },
        { status: 404 }
      );
    }

    if (!schoolYear) {
      return NextResponse.json(
        { error: 'Anno scolastico non trovato' },
        { status: 404 }
      );
    }

    // Verifica se esiste già un budget per questo docente e anno scolastico
    const existingBudget = await prisma.teacherBudget.findFirst({
      where: {
        teacherId,
        schoolYearId
      }
    });

    if (existingBudget) {
      return NextResponse.json(
        { error: 'Esiste già un tesoretto per questo docente in questo anno scolastico' },
        { status: 400 }
      );
    }

    const budget = await prisma.teacherBudget.create({
      data: {
        teacherId,
        schoolYearId,
        minutesWeekly,
        minutesAnnual,
        modulesAnnual,
        importDate: new Date(),
        importSource: importSource || 'manual'
      },
      include: {
        teacher: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true
          }
        },
        schoolYear: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    const budgetWithStats = {
      ...budget,
      minutesRemaining: budget.minutesAnnual - (budget.minutesUsed || 0),
      modulesRemaining: budget.modulesAnnual - (budget.modulesUsed || 0),
      percentageUsed: Math.round(((budget.minutesUsed || 0) / budget.minutesAnnual) * 100)
    };

    return NextResponse.json(budgetWithStats, { status: 201 });

  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}