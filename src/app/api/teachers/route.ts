import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { nome: { contains: search, mode: 'insensitive' as const } },
        { cognome: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
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
          _count: {
            select: {
              recoveryActivities: true
            }
          }
        },
        orderBy: [
          { cognome: 'asc' },
          { nome: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.teacher.count({ where })
    ]);

    return NextResponse.json({
      data: teachers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, cognome, email, userId } = body;

    if (!nome || !cognome) {
      return NextResponse.json(
        { error: 'Nome e cognome sono obbligatori' },
        { status: 400 }
      );
    }

    // Verifica se email esiste già
    if (email) {
      const existingTeacher = await prisma.teacher.findUnique({
        where: { email }
      });
      if (existingTeacher) {
        return NextResponse.json(
          { error: 'Email già utilizzata da un altro docente' },
          { status: 400 }
        );
      }
    }

    // Verifica se userId esiste già
    if (userId) {
      const existingUser = await prisma.teacher.findUnique({
        where: { userId }
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Utente già associato ad un altro docente' },
          { status: 400 }
        );
      }
    }

    const teacher = await prisma.teacher.create({
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

    return NextResponse.json(teacher, { status: 201 });

  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}