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
      // Warn about zero values
      if (tesorettoAnnuale === 0 || moduliAnnui === 0) {
        result.warnings.push({
          row: rowNumber,
          docente,
          message: `Tesoretto o moduli annui pari a zero. Verificare se corretto.`
        })
      }

      // Check if modules calculation is consistent (tesoretto / 50 = moduli)
      if (tesorettoAnnuale > 0 && moduliAnnui > 0) {
        const expectedModuli = Math.floor(tesorettoAnnuale / 50)
        if (Math.abs(expectedModuli - moduliAnnui) > 1) {
          result.warnings.push({
            row: rowNumber,
            docente,
            message: `Moduli annui (${moduliAnnui}) non corrisponde al calcolo atteso (${expectedModuli} da ${tesorettoAnnuale} minuti)`
          })
        }
      }

      // Check if saldo equals tesoretto (initially they should be the same)
      if (saldo !== tesorettoAnnuale) {
        result.warnings.push({
          row: rowNumber,
          docente,
          message: `Saldo (${saldo}) differente da tesoretto annuale (${tesorettoAnnuale}). Potrebbe indicare utilizzo precedente.`
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
 * Handles compound surnames like "Lo Rito", "De Fusco", "La Rosa", etc.
 * Format: "COGNOME NOME" or "Cognome Nome"
 */
export function splitDocenteName(fullName: string): { cognome: string; nome: string; email: string } {
  const parts = fullName.trim().split(/\s+/)

  if (parts.length < 2) {
    const cognome = fullName.trim()
    const nome = ''
    const email = generateEmail(nome, cognome)
    return { cognome, nome, email }
  }

  // Prefissi cognomi composti (case insensitive)
  const compoundPrefixes = ['lo', 'la', 'le', 'de', 'del', 'della', 'di', 'da', 'degli', 'von', 'van', 'mc', 'mac']

  let cognome: string
  let nome: string

  // Check if first word is a 2-letter prefix or known compound prefix
  if (parts.length >= 3 &&
      (parts[0].length === 2 || compoundPrefixes.includes(parts[0].toLowerCase()))) {
    // Compound surname: take first 2 words as cognome
    cognome = `${parts[0]} ${parts[1]}`
    nome = parts.slice(2).join(' ')
  } else {
    // Simple surname: first word is cognome, rest is nome
    cognome = parts[0]
    nome = parts.slice(1).join(' ')
  }

  const email = generateEmail(nome, cognome)

  return { cognome, nome, email }
}

/**
 * Generate email address in format: nome.cognome@piaggia.it
 * Handles special characters and compound names
 */
export function generateEmail(nome: string, cognome: string): string {
  // Convert to lowercase
  const nomeLower = nome.toLowerCase().trim()
  const cognomeLower = cognome.toLowerCase().trim()

  // Remove accents and special characters
  const cleanName = removeAccents(nomeLower)
  const cleanSurname = removeAccents(cognomeLower)

  // Replace spaces with nothing (for compound surnames)
  const namePart = cleanName.replace(/\s+/g, '')
  const surnamePart = cleanSurname.replace(/\s+/g, '')

  // Generate email
  if (namePart && surnamePart) {
    return `${namePart}.${surnamePart}@piaggia.it`
  } else if (surnamePart) {
    return `${surnamePart}@piaggia.it`
  } else {
    return 'noemail@piaggia.it'
  }
}

/**
 * Remove accents from string
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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
