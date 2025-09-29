export interface CSVRow {
  [key: string]: string;
}

export interface TesorettoImportData {
  docente: string;
  minutiSettimana: number;
  tesorettoAnnuale: number;
  moduliAnnui: number;
  saldo: number;
}

export interface ParsedImportRecord {
  cognome: string;
  nome: string;
  email?: string;
  minutesWeekly: number;
  minutesAnnual: number;
  modulesAnnual: number;
  saldo: number;
  rowIndex: number;
  errors: string[];
}

export interface ImportPreview {
  records: ParsedImportRecord[];
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    duplicates: number;
  };
  errors: string[];
  columnMapping: ColumnMapping;
}

export interface ColumnMapping {
  docente: number;
  minutiSettimana: number;
  tesorettoAnnuale: number;
  moduliAnnui: number;
  saldo: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  results: {
    created: number;
    updated: number;
    errors: string[];
  };
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export const CSV_HEADERS = {
  docente: 'Docente',
  minutiSettimana: 'Minuti/Settimana',
  tesorettoAnnuale: 'Tesoretto Annuale (min)',
  moduliAnnui: 'Moduli Annui (50 min)',
  saldo: 'Saldo (min)'
};