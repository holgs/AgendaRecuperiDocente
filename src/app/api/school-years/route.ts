import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const schoolYears = await prisma.schoolYear.findMany({
      orderBy: {
        startDate: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: schoolYears
    });

  } catch (error) {
    console.error('Error fetching school years:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero degli anni scolastici' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, startDate, endDate, weeksCount = 30 } = body;

    // Validazione
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Nome, data inizio e data fine sono obbligatori' },
        { status: 400 }
      );
    }

    // Verifica che non esista già un anno con lo stesso nome
    const existingYear = await prisma.schoolYear.findUnique({
      where: { name }
    });

    if (existingYear) {
      return NextResponse.json(
        { error: 'Esiste già un anno scolastico con questo nome' },
        { status: 409 }
      );
    }

    const schoolYear = await prisma.schoolYear.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        weeksCount,
        isActive: false // Di default non attivo, sarà attivato manualmente
      }
    });

    return NextResponse.json({
      success: true,
      data: schoolYear,
      message: 'Anno scolastico creato con successo'
    });

  } catch (error) {
    console.error('Error creating school year:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}