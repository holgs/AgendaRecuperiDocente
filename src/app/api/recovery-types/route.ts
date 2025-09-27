import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = {};
    if (!includeInactive) {
      where.isActive = true;
    } else if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const recoveryTypes = await prisma.recoveryType.findMany({
      where,
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
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(recoveryTypes);

  } catch (error) {
    console.error('Error fetching recovery types:', error);
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
      name,
      description,
      color,
      isActive,
      requiresApproval,
      defaultDuration,
      createdBy
    } = body;

    if (!name || !defaultDuration || !createdBy) {
      return NextResponse.json(
        { error: 'Nome, durata predefinita e creatore sono obbligatori' },
        { status: 400 }
      );
    }

    // Verifica se il nome esiste già
    const existingType = await prisma.recoveryType.findUnique({
      where: { name }
    });

    if (existingType) {
      return NextResponse.json(
        { error: 'Esiste già una tipologia di recupero con questo nome' },
        { status: 400 }
      );
    }

    // Verifica che il creatore esista
    const creator = await prisma.user.findUnique({
      where: { id: createdBy }
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Utente creatore non trovato' },
        { status: 404 }
      );
    }

    const recoveryType = await prisma.recoveryType.create({
      data: {
        name,
        description: description || null,
        color: color || '#3B82F6',
        isActive: isActive !== undefined ? isActive : true,
        requiresApproval: requiresApproval !== undefined ? requiresApproval : false,
        defaultDuration,
        createdBy
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

    return NextResponse.json(recoveryType, { status: 201 });

  } catch (error) {
    console.error('Error creating recovery type:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}