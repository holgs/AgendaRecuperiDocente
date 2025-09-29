import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ImportRecord {
  cognome: string;
  nome: string;
  email?: string;
  minutesWeekly: number;
  minutesAnnual: number;
  modulesAnnual: number;
}

interface ConflictResolution {
  teacherId: string;
  action: 'update' | 'skip' | 'create_new';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolYearId, records, importSource } = body;

    if (!schoolYearId || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Anno scolastico e dati sono obbligatori' },
        { status: 400 }
      );
    }

    // Verifica che l'anno scolastico esista
    const schoolYear = await prisma.schoolYear.findUnique({
      where: { id: schoolYearId }
    });

    if (!schoolYear) {
      return NextResponse.json(
        { error: 'Anno scolastico non trovato' },
        { status: 404 }
      );
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    // Processa ogni record
    for (let i = 0; i < records.length; i++) {
      const record: ImportRecord = records[i];
      
      try {
        // Validazione record
        if (!record.cognome || !record.nome || !record.minutesWeekly || !record.minutesAnnual || !record.modulesAnnual) {
          results.errors.push(`Riga ${i + 1}: Campi obbligatori mancanti`);
          continue;
        }

        // Cerca o crea il docente
        let teacher = await prisma.teacher.findFirst({
          where: {
            cognome: record.cognome,
            nome: record.nome
          }
        });

        if (!teacher) {
          teacher = await prisma.teacher.create({
            data: {
              cognome: record.cognome,
              nome: record.nome,
              email: record.email || null
            }
          });
        } else if (record.email && !teacher.email) {
          // Aggiorna email se non presente
          teacher = await prisma.teacher.update({
            where: { id: teacher.id },
            data: { email: record.email }
          });
        }

        // Verifica se esiste già un budget per questo docente e anno
        const existingBudget = await prisma.teacherBudget.findFirst({
          where: {
            teacherId: teacher.id,
            schoolYearId
          }
        });

        if (existingBudget) {
          // Aggiorna il budget esistente
          await prisma.teacherBudget.update({
            where: { id: existingBudget.id },
            data: {
              minutesWeekly: record.minutesWeekly,
              minutesAnnual: record.minutesAnnual,
              modulesAnnual: record.modulesAnnual,
              importDate: new Date(),
              importSource: importSource || 'csv'
            }
          });
          results.updated++;
        } else {
          // Crea nuovo budget
          await prisma.teacherBudget.create({
            data: {
              teacherId: teacher.id,
              schoolYearId,
              minutesWeekly: record.minutesWeekly,
              minutesAnnual: record.minutesAnnual,
              modulesAnnual: record.modulesAnnual,
              importDate: new Date(),
              importSource: importSource || 'csv'
            }
          });
          results.created++;
        }

      } catch (recordError) {
        console.error(`Error processing record ${i + 1}:`, recordError);
        results.errors.push(`Riga ${i + 1}: Errore durante l'elaborazione`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completato: ${results.created} creati, ${results.updated} aggiornati`,
      results
    });

  } catch (error) {
    console.error('Error importing budgets:', error);
    return NextResponse.json(
      { error: 'Errore interno del server durante l\'import' },
      { status: 500 }
    );
  }
}