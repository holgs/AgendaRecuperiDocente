import { z } from 'zod'

// Schema per validazione singola riga CSV import tesoretti
export const csvTesorettoRowSchema = z.object({
  docente: z.string().min(1, 'Nome docente obbligatorio'),
  minutiSettimanali: z.number().int().positive('Minuti settimanali devono essere positivi'),
  tesorettoAnnuale: z.number().int().positive('Tesoretto annuale deve essere positivo'),
  moduliAnnui: z.number().int().positive('Moduli annui devono essere positivi'),
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