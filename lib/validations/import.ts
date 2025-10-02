import { z } from 'zod'

// Schema per validazione singola riga CSV import tesoretti
export const csvTesorettoRowSchema = z.object({
  docente: z.string().min(1, 'Nome docente obbligatorio'),
  minutiSettimanali: z.number().int().nonnegative('Minuti settimanali non possono essere negativi'),
  tesorettoAnnuale: z.number().int().nonnegative('Tesoretto annuale non può essere negativo'),
  moduliAnnui: z.number().int().nonnegative('Moduli annui non possono essere negativi'),
  saldo: z.number().int().nonnegative('Saldo non può essere negativo'),
})

export type CsvTesorettoRow = z.infer<typeof csvTesorettoRowSchema>

// Schema per risultato import
export const importResultSchema = z.object({
  success: z.boolean(),
  imported: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    row: z.number(),
    docente: z.string().optional(),
    error: z.string(),
  })),
  warnings: z.array(z.object({
    row: z.number(),
    docente: z.string().optional(),
    message: z.string(),
  })),
})

export type ImportResult = z.infer<typeof importResultSchema>

// Schema per validazione singola riga CSV import attività
export const csvActivityRowSchema = z.object({
  cognome: z.string().min(1, 'Cognome docente obbligatorio'),
  nome: z.string().min(1, 'Nome docente obbligatorio'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve essere in formato YYYY-MM-DD'),
  tipologia: z.string().min(1, 'Tipologia obbligatoria'),
  durata: z.number().int().positive('Durata deve essere positiva'),
  titolo: z.string().min(1, 'Titolo obbligatorio'),
  descrizione: z.string().optional(),
})

export type CsvActivityRow = z.infer<typeof csvActivityRowSchema>
