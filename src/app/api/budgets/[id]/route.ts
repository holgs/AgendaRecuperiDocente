import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  id: string;
}

type RouteContext = {
  params: Promise<Params>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

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
        }
      }
    });

    if (!budget) {
      return NextResponse.json(
        { error: 'Tesoretto non trovato' },
        { status: 404 }
      );
    }

    const budgetWithStats = {
      ...budget,
      minutesRemaining: budget.minutesAnnual - (budget.minutesUsed || 0),
      modulesRemaining: budget.modulesAnnual - (budget.modulesUsed || 0),
      percentageUsed: Math.round(((budget.minutesUsed || 0) / budget.minutesAnnual) * 100)
    };

    return NextResponse.json(budgetWithStats);

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
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      minutesWeekly,
      minutesAnnual,
      modulesAnnual,
      importSource
    } = body;

    if (!minutesWeekly || !minutesAnnual || !modulesAnnual) {
      return NextResponse.json(
        { error: 'Tutti i campi obbligatori devono essere specificati' },
        { status: 400 }
      );
    }

    // Verifica se il budget esiste
    const existingBudget = await prisma.teacherBudget.findUnique({
      where: { id }
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Tesoretto non trovato' },
        { status: 404 }
      );
    }

    // Verifica che i nuovi valori siano coerenti con l'utilizzo
    if (minutesAnnual < (existingBudget.minutesUsed || 0)) {
      return NextResponse.json(
        { error: 'I minuti annuali non possono essere inferiori a quelli già utilizzati' },
        { status: 400 }
      );
    }

    if (modulesAnnual < (existingBudget.modulesUsed || 0)) {
      return NextResponse.json(
        { error: 'I moduli annuali non possono essere inferiori a quelli già utilizzati' },
        { status: 400 }
      );
    }

    const budget = await prisma.teacherBudget.update({
      where: { id },
      data: {
        minutesWeekly,
        minutesAnnual,
        modulesAnnual,
        importSource: importSource || existingBudget.importSource
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

    return NextResponse.json(budgetWithStats);

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
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Verifica se il budget esiste
    const existingBudget = await prisma.teacherBudget.findUnique({
      where: { id }
    });

    if (!existingBudget) {
      return NextResponse.json(
        { error: 'Tesoretto non trovato' },
        { status: 404 }
      );
    }

    // Verifica se ci sono attività collegate
    const activitiesCount = await prisma.recoveryActivity.count({
      where: {
        teacherId: existingBudget.teacherId,
        schoolYearId: existingBudget.schoolYearId
      }
    });

    if (activitiesCount > 0) {
      return NextResponse.json(
        { error: 'Impossibile eliminare: esistono attività di recupero collegate a questo tesoretto' },
        { status: 400 }
      );
    }

    await prisma.teacherBudget.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Tesoretto eliminato con successo' });

  } catch (error) {
    console.error('Error deleting budget:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}