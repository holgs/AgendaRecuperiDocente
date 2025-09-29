import { CSVRow, ParsedImportRecord, ImportPreview, ColumnMapping, ValidationError, CSV_HEADERS } from '@/types/import';

export class CSVParser {
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  public static parseCSV(content: string): CSVRow[] {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]);
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: CSVRow = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    }

    return rows;
  }

  public static detectColumnMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {
      docente: -1,
      minutiSettimana: -1,
      tesorettoAnnuale: -1,
      moduliAnnui: -1,
      saldo: -1
    };

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();

      if (normalizedHeader.includes('docente')) {
        mapping.docente = index;
      } else if (normalizedHeader.includes('minuti') && normalizedHeader.includes('settimana')) {
        mapping.minutiSettimana = index;
      } else if (normalizedHeader.includes('tesoretto') && normalizedHeader.includes('annuale')) {
        mapping.tesorettoAnnuale = index;
      } else if (normalizedHeader.includes('moduli') && normalizedHeader.includes('annui')) {
        mapping.moduliAnnui = index;
      } else if (normalizedHeader.includes('saldo')) {
        mapping.saldo = index;
      }
    });

    return mapping;
  }

  public static validateRecord(row: CSVRow, mapping: ColumnMapping, rowIndex: number): ParsedImportRecord {
    const errors: string[] = [];
    const headers = Object.keys(row);

    // Estrai nome docente
    let cognome = '';
    let nome = '';
    if (mapping.docente >= 0) {
      const docenteValue = row[headers[mapping.docente]];
      if (!docenteValue) {
        errors.push('Nome docente mancante');
      } else {
        const parts = docenteValue.split(' ');
        if (parts.length >= 2) {
          cognome = parts[0];
          nome = parts.slice(1).join(' ');
        } else {
          cognome = docenteValue;
          errors.push('Formato nome non valido (atteso: Cognome Nome)');
        }
      }
    } else {
      errors.push('Colonna docente non trovata');
    }

    // Valida minuti settimana
    let minutesWeekly = 0;
    if (mapping.minutiSettimana >= 0) {
      const value = row[headers[mapping.minutiSettimana]];
      const parsed = parseInt(value);
      if (isNaN(parsed) || parsed < 0) {
        errors.push('Minuti/settimana non validi');
      } else {
        minutesWeekly = parsed;
      }
    } else {
      errors.push('Colonna minuti/settimana non trovata');
    }

    // Valida tesoretto annuale
    let minutesAnnual = 0;
    if (mapping.tesorettoAnnuale >= 0) {
      const value = row[headers[mapping.tesorettoAnnuale]];
      const parsed = parseInt(value);
      if (isNaN(parsed) || parsed < 0) {
        errors.push('Tesoretto annuale non valido');
      } else {
        minutesAnnual = parsed;
      }
    } else {
      errors.push('Colonna tesoretto annuale non trovata');
    }

    // Valida moduli annui
    let modulesAnnual = 0;
    if (mapping.moduliAnnui >= 0) {
      const value = row[headers[mapping.moduliAnnui]];
      // Gestisce formato "6, 1200" prendendo solo il primo numero
      const cleanValue = value.split(',')[0].trim();
      const parsed = parseInt(cleanValue);
      if (isNaN(parsed) || parsed < 0) {
        errors.push('Moduli annui non validi');
      } else {
        modulesAnnual = parsed;
      }
    } else {
      errors.push('Colonna moduli annui non trovata');
    }

    // Valida saldo
    let saldo = 0;
    if (mapping.saldo >= 0) {
      const value = row[headers[mapping.saldo]];
      const parsed = parseInt(value);
      if (isNaN(parsed)) {
        errors.push('Saldo non valido');
      } else if (parsed < 0) {
        errors.push('Saldo non può essere negativo');
      } else {
        saldo = parsed;
      }
    } else {
      errors.push('Colonna saldo non trovata');
    }

    // Validazioni business logic
    if (minutesAnnual > 0 && modulesAnnual > 0) {
      const expectedModules = Math.floor(minutesAnnual / 50);
      if (Math.abs(expectedModules - modulesAnnual) > 1) {
        errors.push(`Moduli annui non coerenti con minuti (attesi ~${expectedModules})`);
      }
    }

    return {
      cognome,
      nome,
      minutesWeekly,
      minutesAnnual,
      modulesAnnual,
      saldo,
      rowIndex,
      errors
    };
  }

  public static previewImport(content: string): ImportPreview {
    try {
      const rows = this.parseCSV(content);
      if (rows.length === 0) {
        return {
          records: [],
          stats: { totalRows: 0, validRows: 0, errorRows: 0, duplicates: 0 },
          errors: ['File CSV vuoto o formato non valido'],
          columnMapping: { docente: -1, minutiSettimana: -1, tesorettoAnnuale: -1, moduliAnnui: -1, saldo: -1 }
        };
      }

      const headers = Object.keys(rows[0]);
      const columnMapping = this.detectColumnMapping(headers);

      // Verifica che tutte le colonne essenziali siano mappate
      const missingColumns: string[] = [];
      if (columnMapping.docente === -1) missingColumns.push('Docente');
      if (columnMapping.minutiSettimana === -1) missingColumns.push('Minuti/Settimana');
      if (columnMapping.tesorettoAnnuale === -1) missingColumns.push('Tesoretto Annuale');
      if (columnMapping.moduliAnnui === -1) missingColumns.push('Moduli Annui');

      if (missingColumns.length > 0) {
        return {
          records: [],
          stats: { totalRows: rows.length, validRows: 0, errorRows: rows.length, duplicates: 0 },
          errors: [`Colonne mancanti: ${missingColumns.join(', ')}`],
          columnMapping
        };
      }

      const records: ParsedImportRecord[] = [];
      const docenteSet = new Set<string>();
      let duplicates = 0;

      rows.forEach((row, index) => {
        const record = this.validateRecord(row, columnMapping, index + 1);

        // Controlla duplicati
        const docenteKey = `${record.cognome}-${record.nome}`;
        if (docenteSet.has(docenteKey)) {
          record.errors.push('Docente duplicato nel file');
          duplicates++;
        } else {
          docenteSet.add(docenteKey);
        }

        records.push(record);
      });

      const validRows = records.filter(r => r.errors.length === 0).length;
      const errorRows = records.length - validRows;

      return {
        records,
        stats: {
          totalRows: rows.length,
          validRows,
          errorRows,
          duplicates
        },
        errors: [],
        columnMapping
      };

    } catch (error) {
      return {
        records: [],
        stats: { totalRows: 0, validRows: 0, errorRows: 0, duplicates: 0 },
        errors: [`Errore nel parsing del CSV: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`],
        columnMapping: { docente: -1, minutiSettimana: -1, tesorettoAnnuale: -1, moduliAnnui: -1, saldo: -1 }
      };
    }
  }
}