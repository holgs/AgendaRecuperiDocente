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

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, role: true, email: true }
        },
        teacherBudgets: {
          include: {
            schoolYear: true
          },
          orderBy: { createdAt: 'desc' }
        },
        recoveryActivities: {
          include: {
            recoveryType: true,
            schoolYear: true
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

    if (!teacher) {
      return NextResponse.json(
        { error: 'Docente non trovato' },
        { status: 404 }
      );
    }

    return NextResponse.json(teacher);

  } catch (error) {
    console.error('Error fetching teacher:', error);
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
    const { nome, cognome, email, userId } = body;

    if (!nome || !cognome) {
      return NextResponse.json(
        { error: 'Nome e cognome sono obbligatori' },
        { status: 400 }
      );
    }

    // Verifica se il docente esiste
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id }
    });

    if (!existingTeacher) {
      return NextResponse.json(
        { error: 'Docente non trovato' },
        { status: 404 }
      );
    }

    // Verifica se email esiste già (escluso il docente corrente)
    if (email && email !== existingTeacher.email) {
      const duplicateEmail = await prisma.teacher.findFirst({
        where: {
          email,
          id: { not: id }
        }
      });
      if (duplicateEmail) {
        return NextResponse.json(
          { error: 'Email già utilizzata da un altro docente' },
          { status: 400 }
        );
      }
    }

    // Verifica se userId esiste già (escluso il docente corrente)
    if (userId && userId !== existingTeacher.userId) {
      const duplicateUser = await prisma.teacher.findFirst({
        where: {
          userId,
          id: { not: id }
        }
      });
      if (duplicateUser) {
        return NextResponse.json(
          { error: 'Utente già associato ad un altro docente' },
          { status: 400 }
        );
      }
    }

    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        nome,
        cognome,
        email: email || null,
        userId: userId || null
      },
      include: {
        user: {
          select: { id: true, role: true, email: true }
        },
        _count: {
          select: {
            recoveryActivities: true
          }
        }
      }
    });

    return NextResponse.json(teacher);

  } catch (error) {
    console.error('Error updating teacher:', error);
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

    // Verifica se il docente esiste
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teacherBudgets: true,
            recoveryActivities: true
          }
        }
      }
    });

    if (!existingTeacher) {
      return NextResponse.json(
        { error: 'Docente non trovato' },
        { status: 404 }
      );
    }

    // Verifica se ci sono dati collegati
    if (existingTeacher._count.teacherBudgets > 0 || existingTeacher._count.recoveryActivities > 0) {
      return NextResponse.json(
        { error: 'Impossibile eliminare: il docente ha dati collegati (tesoretti o attività)' },
        { status: 400 }
      );
    }

    await prisma.teacher.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Docente eliminato con successo' });

  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}