import Papa from 'papaparse'
import { CsvTesorettoRow, csvTesorettoRowSchema, CsvActivityRow, csvActivityRowSchema, ImportResult } from './validations/import'

export interface ParsedCsvData {
  data: CsvTesorettoRow[]
  errors: ImportResult['errors']
  warnings: ImportResult['warnings']
}

/**
 * Parse CSV file content and validate each row
 * CSV Format: "Docente; Minuti/settimana;Tesoretto annuale (min); Moduli Annui (50min); Saldo (min)"
 */
export function parseTesorettiCSV(csvContent: string): ParsedCsvData {
  const result: ParsedCsvData = {
    data: [],
    errors: [],
    warnings: []
  }

  // Parse CSV with papaparse
  const parsed = Papa.parse(csvContent, {
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim()
  })

  if (parsed.errors.length > 0) {
    parsed.errors.forEach((error) => {
      result.errors.push({
        row: error.row || 0,
        error: `CSV Parse Error: ${error.message}`
      })
    })
  }

  // Process each row (skip header)
  const rows = parsed.data as string[][]

  rows.forEach((row, index) => {
    // Skip header row
    if (index === 0) return

    const rowNumber = index + 1

    try {
      // Check if row has correct number of columns
      if (row.length !== 5) {
        result.errors.push({
          row: rowNumber,
          error: `Invalid number of columns. Expected 5, got ${row.length}`
        })
        return
      }

      // Extract and parse values
      const [docenteRaw, minutiSettimanaliRaw, tesorettoRaw, moduliRaw, saldoRaw] = row

      const docente = docenteRaw?.trim()

      if (!docente) {
        result.errors.push({
          row: rowNumber,
          error: 'Missing docente name'
        })
        return
      }

      // Parse numeric values
      const minutiSettimanali = parseInt(minutiSettimanaliRaw?.trim() || '0', 10)
      const tesorettoAnnuale = parseInt(tesorettoRaw?.trim() || '0', 10)
      const moduliAnnui = parseInt(moduliRaw?.trim() || '0', 10)
      const saldo = parseInt(saldoRaw?.trim() || '0', 10)

      // Validate with Zod schema
      const validatedData = csvTesorettoRowSchema.parse({
        docente,
        minutiSettimanali,
        tesorettoAnnuale,
        moduliAnnui,
        saldo
      })

      // Business logic validations
      // Check if modules calculation is consistent (tesoretto / 50 = moduli)
      const expectedModuli = Math.floor(tesorettoAnnuale / 50)
      if (Math.abs(expectedModuli - moduliAnnui) > 1) {
        result.warnings.push({
          row: rowNumber,
          docente,
          message: `Moduli annui (${moduliAnnui}) doesn't match expected calculation (${expectedModuli} from ${tesorettoAnnuale} minutes)`
        })
      }

      // Check if saldo equals tesoretto (initially they should be the same)
      if (saldo !== tesorettoAnnuale) {
        result.warnings.push({
          row: rowNumber,
          docente,
          message: `Saldo (${saldo}) differs from tesoretto annuale (${tesorettoAnnuale}). This might indicate previous usage.`
        })
      }

      result.data.push(validatedData)
    } catch (error) {
      if (error instanceof Error) {
        result.errors.push({
          row: rowNumber,
          docente: row[0]?.trim(),
          error: error.message
        })
      } else {
        result.errors.push({
          row: rowNumber,
          docente: row[0]?.trim(),
          error: 'Unknown validation error'
        })
      }
    }
  })

  return result
}

/**
 * Split full name into cognome and nome
 * Assumes format: "COGNOME NOME" or "Cognome Nome"
 */
export function splitDocenteName(fullName: string): { cognome: string; nome: string } {
  const parts = fullName.trim().split(/\s+/)

  if (parts.length < 2) {
    return {
      cognome: fullName.trim(),
      nome: ''
    }
  }

  // Assume first part is cognome, rest is nome
  const cognome = parts[0]
  const nome = parts.slice(1).join(' ')

  return { cognome, nome }
}

export interface ParsedActivitiesCsvData {
  data: CsvActivityRow[]
  errors: ImportResult['errors']
  warnings: ImportResult['warnings']
}

/**
 * Parse activities CSV file content and validate each row
 * CSV Format: "Cognome;Nome;Data;Tipologia;Durata;Titolo;Descrizione"
 */
export function parseActivitiesCSV(csvContent: string): ParsedActivitiesCsvData {
  const result: ParsedActivitiesCsvData = {
    data: [],
    errors: [],
    warnings: []
  }

  // Parse CSV with papaparse
  const parsed = Papa.parse(csvContent, {
    delimiter: ';',
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim()
  })

  if (parsed.errors.length > 0) {
    parsed.errors.forEach((error) => {
      result.errors.push({
        row: error.row || 0,
        error: `CSV Parse Error: ${error.message}`
      })
    })
  }

  // Process each row (skip header)
  const rows = parsed.data as string[][]

  rows.forEach((row, index) => {
    // Skip header row
    if (index === 0) return

    const rowNumber = index + 1

    try {
      // Check if row has correct number of columns (min 6, max 7 with optional description)
      if (row.length < 6 || row.length > 7) {
        result.errors.push({
          row: rowNumber,
          error: `Invalid number of columns. Expected 6-7, got ${row.length}`
        })
        return
      }

      // Extract and parse values
      const [cognomeRaw, nomeRaw, dataRaw, tipologiaRaw, durataRaw, titoloRaw, descrizioneRaw] = row

      const cognome = cognomeRaw?.trim()
      const nome = nomeRaw?.trim()
      const data = dataRaw?.trim()
      const tipologia = tipologiaRaw?.trim()
      const titolo = titoloRaw?.trim()
      const descrizione = descrizioneRaw?.trim() || ''

      if (!cognome || !nome) {
        result.errors.push({
          row: rowNumber,
          docente: `${cognome} ${nome}`.trim(),
          error: 'Missing cognome or nome'
        })
        return
      }

      // Parse duration
      const durata = parseInt(durataRaw?.trim() || '0', 10)

      // Validate with Zod schema
      const validatedData = csvActivityRowSchema.parse({
        cognome,
        nome,
        data,
        tipologia,
        durata,
        titolo,
        descrizione
      })

      // Business logic validations
      // Check if duration is reasonable (between 1 and 300 minutes)
      if (durata > 300) {
        result.warnings.push({
          row: rowNumber,
          docente: `${cognome} ${nome}`,
          message: `Durata molto alta (${durata} minuti). Verificare se è corretta.`
        })
      }

      result.data.push(validatedData)
    } catch (error) {
      if (error instanceof Error) {
        result.errors.push({
          row: rowNumber,
          docente: `${row[0]?.trim()} ${row[1]?.trim()}`.trim(),
          error: error.message
        })
      } else {
        result.errors.push({
          row: rowNumber,
          docente: `${row[0]?.trim()} ${row[1]?.trim()}`.trim(),
          error: 'Unknown validation error'
        })
      }
    }
  })

  return result
}
