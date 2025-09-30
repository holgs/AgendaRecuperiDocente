import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const recoveryType = await prisma.recoveryType.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        recoveryActivities: {
          include: {
            teacher: {
              select: {
                id: true,
                nome: true,
                cognome: true
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

    if (!recoveryType) {
      return NextResponse.json(
        { error: 'Tipologia di recupero non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json(recoveryType);

  } catch (error) {
    console.error('Error fetching recovery type:', error);
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
      name,
      description,
      color,
      isActive,
      requiresApproval,
      defaultDuration
    } = body;

    if (!name || !defaultDuration) {
      return NextResponse.json(
        { error: 'Nome e durata predefinita sono obbligatori' },
        { status: 400 }
      );
    }

    // Verifica se la tipologia esiste
    const existingType = await prisma.recoveryType.findUnique({
      where: { id }
    });

    if (!existingType) {
      return NextResponse.json(
        { error: 'Tipologia di recupero non trovata' },
        { status: 404 }
      );
    }

    // Verifica se il nome esiste già (esclusa la tipologia corrente)
    if (name !== existingType.name) {
      const duplicateName = await prisma.recoveryType.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: 'Esiste già una tipologia di recupero con questo nome' },
          { status: 400 }
        );
      }
    }

    const recoveryType = await prisma.recoveryType.update({
      where: { id },
      data: {
        name,
        description: description || null,
        color: color || existingType.color,
        isActive: isActive !== undefined ? isActive : existingType.isActive,
        requiresApproval: requiresApproval !== undefined ? requiresApproval : existingType.requiresApproval,
        defaultDuration
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            recoveryActivities: true
          }
        }
      }
    });

    return NextResponse.json(recoveryType);

  } catch (error) {
    console.error('Error updating recovery type:', error);
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

    // Verifica se la tipologia esiste
    const existingType = await prisma.recoveryType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            recoveryActivities: true
          }
        }
      }
    });

    if (!existingType) {
      return NextResponse.json(
        { error: 'Tipologia di recupero non trovata' },
        { status: 404 }
      );
    }

    // Verifica se ci sono attività collegate
    if (existingType._count.recoveryActivities > 0) {
      return NextResponse.json(
        { error: 'Impossibile eliminare: esistono attività di recupero che utilizzano questa tipologia' },
        { status: 400 }
      );
    }

    await prisma.recoveryType.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Tipologia di recupero eliminata con successo' });

  } catch (error) {
    console.error('Error deleting recovery type:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
