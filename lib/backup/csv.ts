import Papa from 'papaparse'
import type { YearExport } from './export'

// Italian Excel expects ';' as the field delimiter by default.
const CSV_DELIMITER = ';'

function teacherName(row: Record<string, unknown>): string {
  const t = row.teacher as { cognome?: string; nome?: string } | null | undefined
  if (!t) return ''
  return `${t.cognome ?? ''} ${t.nome ?? ''}`.trim()
}

function teacherEmail(row: Record<string, unknown>): string {
  const t = row.teacher as { email?: string | null } | null | undefined
  return t?.email ?? ''
}

/**
 * CSV of the teacher budgets (tesoretti) for the year.
 */
export function budgetsToCsv(exp: YearExport): string {
  const rows = exp.teacher_budgets.map((b) => ({
    Docente: teacherName(b),
    Email: teacherEmail(b),
    'Minuti/settimana': b.minutes_weekly ?? '',
    'Minuti annui': b.minutes_annual ?? '',
    'Moduli annui': b.modules_annual ?? '',
    'Minuti usati': b.minutes_used ?? 0,
    'Moduli usati': b.modules_used ?? 0,
    'Fonte import': b.import_source ?? '',
  }))

  return Papa.unparse(rows, { delimiter: CSV_DELIMITER })
}

/**
 * CSV of the recovery activities for the year.
 */
export function activitiesToCsv(exp: YearExport): string {
  const rows = exp.recovery_activities.map((a) => {
    const type = a.recovery_type as { name?: string } | null | undefined
    const dateVal = a.date ? new Date(a.date as string) : null
    return {
      Data: dateVal ? dateVal.toISOString().split('T')[0] : '',
      Docente: teacherName(a),
      Classe: a.class_name ?? '',
      Modulo: a.module_number ?? '',
      Titolo: a.title ?? '',
      Tipo: type?.name ?? '',
      'Durata (min)': a.duration_minutes ?? '',
      Stato: a.status ?? '',
      'Co-docente': a.co_teacher_name ?? '',
    }
  })

  return Papa.unparse(rows, { delimiter: CSV_DELIMITER })
}
