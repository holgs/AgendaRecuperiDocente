import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const teacherId = searchParams.get('teacherId');
    const schoolYearId = searchParams.get('schoolYearId');
    const recoveryTypeId = searchParams.get('recoveryTypeId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const skip = (page - 1) * limit;

    const where: any = {};
    if (teacherId) where.teacherId = teacherId;
    if (schoolYearId) where.schoolYearId = schoolYearId;
    if (recoveryTypeId) where.recoveryTypeId = recoveryTypeId;
    if (status) where.status = status;
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const [activities, total] = await Promise.all([
      prisma.recoveryActivity.findMany({
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
          },
          recoveryType: {
            select: {
              id: true,
              name: true,
              color: true,
              requiresApproval: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.recoveryActivity.count({ where })
    ]);

    return NextResponse.json({
      data: activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching activities:', error);
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
      recoveryTypeId,
      date,
      durationMinutes,
      title,
      description,
      createdBy
    } = body;

    if (!teacherId || !schoolYearId || !recoveryTypeId || !date || !durationMinutes || !title || !createdBy) {
      return NextResponse.json(
        { error: 'Tutti i campi obbligatori devono essere specificati' },
        { status: 400 }
      );
    }

    // Verifica che le entità esistano
    const [teacher, schoolYear, recoveryType, creator] = await Promise.all([
      prisma.teacher.findUnique({ where: { id: teacherId } }),
      prisma.schoolYear.findUnique({ where: { id: schoolYearId } }),
      prisma.recoveryType.findUnique({ where: { id: recoveryTypeId } }),
      prisma.user.findUnique({ where: { id: createdBy } })
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

    if (!recoveryType) {
      return NextResponse.json(
        { error: 'Tipologia di recupero non trovata' },
        { status: 404 }
      );
    }

    if (!creator) {
      return NextResponse.json(
        { error: 'Utente creatore non trovato' },
        { status: 404 }
      );
    }

    // Calcola moduli equivalenti (minuti / 50)
    const modulesEquivalent = Math.ceil(durationMinutes / 50);

    // Verifica disponibilità budget
    const budget = await prisma.teacherBudget.findFirst({
      where: {
        teacherId,
        schoolYearId
      }
    });

    if (budget) {
      const newMinutesUsed = (budget.minutesUsed || 0) + durationMinutes;
      const newModulesUsed = (budget.modulesUsed || 0) + modulesEquivalent;

      if (newMinutesUsed > budget.minutesAnnual) {
        return NextResponse.json(
          { error: 'Minuti insufficienti nel tesoretto del docente' },
          { status: 400 }
        );
      }

      if (newModulesUsed > budget.modulesAnnual) {
        return NextResponse.json(
          { error: 'Moduli insufficienti nel tesoretto del docente' },
          { status: 400 }
        );
      }
    }

    // Crea l'attività
    const activity = await prisma.recoveryActivity.create({
      data: {
        teacherId,
        schoolYearId,
        recoveryTypeId,
        date: new Date(date),
        durationMinutes,
        modulesEquivalent,
        title,
        description: description || null,
        status: recoveryType.requiresApproval ? 'pending' : 'completed',
        createdBy
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
        },
        recoveryType: {
          select: {
            id: true,
            name: true,
            color: true,
            requiresApproval: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Se non richiede approvazione, aggiorna subito il budget
    if (!recoveryType.requiresApproval && budget) {
      await prisma.teacherBudget.update({
        where: { id: budget.id },
        data: {
          minutesUsed: (budget.minutesUsed || 0) + durationMinutes,
          modulesUsed: (budget.modulesUsed || 0) + modulesEquivalent
        }
      });
    }

    return NextResponse.json(activity, { status: 201 });

  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}