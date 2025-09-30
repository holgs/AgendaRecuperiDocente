import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const budget = await prisma.teacherBudget.findUnique({
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
        recoveryActivities: {
          include: {
            recoveryType: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          },
          orderBy: { date: 'desc' },
          take: 10
        },
        _count: {
          select: {
            recoveryActivities: true
          }
        }
      }
    });

    if (!budget) {
      return NextResponse.json(
        { error: 'Budget non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json(budget);

  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      minutesWeekly,
      minutesAnnual,
      modulesAnnual,
      minutesUsed,
      modulesUsed,
      notes
    } = body;

    // Validazione
    if (minutesAnnual !== undefined && minutesAnnual < 0) {
      return NextResponse.json(
        { error: 'I minuti annuali non possono essere negativi' },
        { status: 400 }
      );
    }

    if (modulesAnnual !== undefined && modulesAnnual < 0) {
      return NextResponse.json(
        { error: 'I moduli annuali non possono essere negativi' },
        { status: 400 }
      );
    }

    // Verifica se il budget esiste
    const existingBudget = await prisma.teacherBudget.findUnique({
      where: { id },
      include: {
        teacher: true,
        schoolYear: true
      }
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Budget non trovato' },
        { status: 404 }
      );
    }

    // Verifica consistenza dati
    const usedMinutes = minutesUsed !== undefined ? minutesUsed : existingBudget.minutesUsed;
    const annualMinutes = minutesAnnual !== undefined ? minutesAnnual : existingBudget.minutesAnnual;

    if (usedMinutes > annualMinutes) {
      return NextResponse.json(
        { error: 'I minuti utilizzati non possono superare i minuti annuali' },
        { status: 400 }
      );
    }

    const budget = await prisma.teacherBudget.update({
      where: { id },
      data: {
        minutesWeekly: minutesWeekly !== undefined ? minutesWeekly : existingBudget.minutesWeekly,
        minutesAnnual: minutesAnnual !== undefined ? minutesAnnual : existingBudget.minutesAnnual,
        modulesAnnual: modulesAnnual !== undefined ? modulesAnnual : existingBudget.modulesAnnual,
        minutesUsed: minutesUsed !== undefined ? minutesUsed : existingBudget.minutesUsed,
        modulesUsed: modulesUsed !== undefined ? modulesUsed : existingBudget.modulesUsed,
        notes: notes !== undefined ? notes : existingBudget.notes
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
        _count: {
          select: {
            recoveryActivities: true
          }
        }
      }
    });

    return NextResponse.json(budget);

  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verifica se il budget esiste
    const existingBudget = await prisma.teacherBudget.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            recoveryActivities: true
          }
        }
      }
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Budget non trovato' },
        { status: 404 }
      );
    }

    // Verifica se ci sono attività collegate
    if (existingBudget._count.recoveryActivities > 0) {
      return NextResponse.json(
        { error: 'Impossibile eliminare: esistono attività di recupero collegate a questo budget' },
        { status: 400 }
      );
    }

    await prisma.teacherBudget.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Budget eliminato con successo' });

  } catch (error) {
    console.error('Error deleting budget:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
