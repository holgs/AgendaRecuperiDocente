import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params;

    const activity = await prisma.recoveryActivity.findUnique({
      where: { id },
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
            isActive: true,
            startDate: true,
            endDate: true
          }
        },
        recoveryType: {
          select: {
            id: true,
            name: true,
            color: true,
            requiresApproval: true,
            defaultDuration: true
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
      }
    });

    if (!activity) {
      return NextResponse.json(
        { error: 'Attività non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json(activity);

  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      date,
      durationMinutes,
      title,
      description,
      status,
      approvedBy
    } = body;

    // Verifica se l'attività esiste
    const existingActivity = await prisma.recoveryActivity.findUnique({
      where: { id },
      include: {
        recoveryType: true
      }
    });

    if (!existingActivity) {
      return NextResponse.json(
        { error: 'Attività non trovata' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    
    if (date) updateData.date = new Date(date);
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description || null;

    // Gestione cambio durata
    if (durationMinutes && durationMinutes !== existingActivity.durationMinutes) {
      const newModulesEquivalent = Math.ceil(durationMinutes / 50);
      updateData.durationMinutes = durationMinutes;
      updateData.modulesEquivalent = newModulesEquivalent;

      // Se l'attività è già completata, aggiorna il budget
      if (existingActivity.status === 'completed') {
        const budget = await prisma.teacherBudget.findFirst({
          where: {
            teacherId: existingActivity.teacherId,
            schoolYearId: existingActivity.schoolYearId
          }
        });

        if (budget) {
          const minutesDiff = durationMinutes - existingActivity.durationMinutes;
          const modulesDiff = newModulesEquivalent - existingActivity.modulesEquivalent;
          
          const newMinutesUsed = (budget.minutesUsed || 0) + minutesDiff;
          const newModulesUsed = (budget.modulesUsed || 0) + modulesDiff;

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

          await prisma.teacherBudget.update({
            where: { id: budget.id },
            data: {
              minutesUsed: newMinutesUsed,
              modulesUsed: newModulesUsed
            }
          });
        }
      }
    }

    // Gestione cambio status (approvazione/rifiuto)
    if (status && status !== existingActivity.status) {
      updateData.status = status;

      if (status === 'approved' && approvedBy) {
        updateData.approvedBy = approvedBy;
        updateData.approvedAt = new Date();
        updateData.status = 'completed';

        // Aggiorna il budget quando viene approvata
        const budget = await prisma.teacherBudget.findFirst({
          where: {
            teacherId: existingActivity.teacherId,
            schoolYearId: existingActivity.schoolYearId
          }
        });

        if (budget) {
          const finalDuration = updateData.durationMinutes || existingActivity.durationMinutes;
          const finalModules = updateData.modulesEquivalent || existingActivity.modulesEquivalent;

          await prisma.teacherBudget.update({
            where: { id: budget.id },
            data: {
              minutesUsed: (budget.minutesUsed || 0) + finalDuration,
              modulesUsed: (budget.modulesUsed || 0) + finalModules
            }
          });
        }
      } else if (status === 'rejected' && approvedBy) {
        updateData.approvedBy = approvedBy;
        updateData.approvedAt = new Date();
      }
    }

    const activity = await prisma.recoveryActivity.update({
      where: { id },
      data: updateData,
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
      }
    });

    return NextResponse.json(activity);

  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = params;

    // Verifica se l'attività esiste
    const existingActivity = await prisma.recoveryActivity.findUnique({
      where: { id }
    });

    if (!existingActivity) {
      return NextResponse.json(
        { error: 'Attività non trovata' },
        { status: 404 }
      );
    }

    // Se l'attività è completata, aggiorna il budget sottraendo i valori
    if (existingActivity.status === 'completed') {
      const budget = await prisma.teacherBudget.findFirst({
        where: {
          teacherId: existingActivity.teacherId,
          schoolYearId: existingActivity.schoolYearId
        }
      });

      if (budget) {
        await prisma.teacherBudget.update({
          where: { id: budget.id },
          data: {
            minutesUsed: Math.max(0, (budget.minutesUsed || 0) - existingActivity.durationMinutes),
            modulesUsed: Math.max(0, (budget.modulesUsed || 0) - existingActivity.modulesEquivalent)
          }
        });
      }
    }

    await prisma.recoveryActivity.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Attività eliminata con successo' });

  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}