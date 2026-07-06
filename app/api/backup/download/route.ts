import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/roles'
import { buildYearExport } from '@/lib/backup/export'
import { budgetsToCsv, activitiesToCsv } from '@/lib/backup/csv'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  schoolYearId: z.string().uuid('ID anno scolastico non valido'),
  format: z.enum(['json', 'csv-activities', 'csv-budgets']),
})

function safeFileStem(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_')
}

/**
 * GET /api/backup/download?schoolYearId=...&format=json|csv-activities|csv-budgets
 * Admin only. Streams the requested export file for one school year.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const parsed = querySchema.safeParse({
      schoolYearId: request.nextUrl.searchParams.get('schoolYearId'),
      format: request.nextUrl.searchParams.get('format'),
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parametri non validi', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const { schoolYearId, format } = parsed.data
    const exportData = await buildYearExport(supabase, schoolYearId)
    const stem = safeFileStem(exportData.meta.schoolYearName)

    let body: string
    let contentType: string
    let filename: string

    if (format === 'json') {
      body = JSON.stringify(exportData, null, 2)
      contentType = 'application/json; charset=utf-8'
      filename = `backup_${stem}.json`
    } else if (format === 'csv-activities') {
      body = activitiesToCsv(exportData)
      contentType = 'text/csv; charset=utf-8'
      filename = `attivita_${stem}.csv`
    } else {
      body = budgetsToCsv(exportData)
      contentType = 'text/csv; charset=utf-8'
      filename = `tesoretti_${stem}.csv`
    }

    // Prepend UTF-8 BOM to CSV so Excel opens accented characters correctly.
    const payload = contentType.startsWith('text/csv') ? '﻿' + body : body

    return new NextResponse(payload, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore interno'
    console.error('GET /api/backup/download failed:', message)
    const status = message.includes('Accesso negato')
      ? 403
      : message.includes('non autenticato')
        ? 401
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
