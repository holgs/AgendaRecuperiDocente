import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/roles"
import { computeWeeks } from "@/lib/supplenze/weeks"
import { z } from "zod"

export const dynamic = "force-dynamic"

function authErrorStatus(message: string): number {
  if (message.includes("Accesso negato")) return 403
  if (message.includes("non autenticato")) return 401
  return 500
}

/**
 * GET /api/supplenze?schoolYearId=...
 * Admin only. Lists substitutions for a school year with teacher names.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const schoolYearId = request.nextUrl.searchParams.get("schoolYearId")
    let query = supabase
      .from("supplenze")
      .select(
        `id, school_year_id, start_date, end_date, weeks, weekly_minutes, total_minutes, note, created_at,
         sostituito:teachers!supplenze_sostituito_id_fkey ( id, cognome, nome ),
         supplente:teachers!supplenze_supplente_id_fkey ( id, cognome, nome, is_external )`
      )
      .order("start_date", { ascending: false })

    if (schoolYearId) query = query.eq("school_year_id", schoolYearId)

    const { data, error } = await query
    if (error) throw new Error("Errore nel recupero delle supplenze")

    return NextResponse.json({ supplenze: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore interno"
    console.error("GET /api/supplenze failed:", message)
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) })
  }
}

const createSchema = z
  .object({
    sostituito_id: z.string().uuid("Docente sostituito non valido"),
    supplente_id: z.string().uuid().optional(),
    new_supplente: z
      .object({
        cognome: z.string().min(1),
        nome: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")),
      })
      .optional(),
    start_date: z.string().min(1),
    end_date: z.string().min(1),
    weeks: z.number().int().positive().optional(),
    note: z.string().optional(),
  })
  .refine((d) => d.supplente_id || d.new_supplente, {
    message: "Indicare un supplente esistente o nuovo",
  })

/**
 * POST /api/supplenze
 * Admin only. Creates a substitution and applies its impact to both budgets:
 *   supplente budget minutes_annual += total; sostituito minutes_annual -= total.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const supabase = await createClient()

    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dati non validi", details: parsed.error.errors },
        { status: 400 }
      )
    }
    const body = parsed.data

    if (body.end_date < body.start_date) {
      return NextResponse.json(
        { error: "La data fine non può precedere la data inizio" },
        { status: 400 }
      )
    }

    // Active school year
    const { data: year, error: yearErr } = await supabase
      .from("school_years")
      .select("id")
      .eq("is_active", true)
      .single()
    if (yearErr || !year) {
      return NextResponse.json({ error: "Nessun anno scolastico attivo" }, { status: 404 })
    }

    // Absent teacher's weekly minutes (basis of the calculation)
    const { data: sostBudget, error: sbErr } = await supabase
      .from("teacher_budgets")
      .select("id, minutes_weekly, minutes_annual")
      .eq("teacher_id", body.sostituito_id)
      .eq("school_year_id", year.id)
      .single()
    if (sbErr || !sostBudget) {
      return NextResponse.json(
        { error: "Il docente sostituito non ha un tesoretto per l'anno attivo" },
        { status: 400 }
      )
    }

    const weeklyMinutes = sostBudget.minutes_weekly || 0
    const weeks = body.weeks ?? computeWeeks(body.start_date, body.end_date)
    const totalMinutes = weeks * weeklyMinutes

    // Resolve the substitute teacher (existing or new external)
    let supplenteId = body.supplente_id ?? null
    if (!supplenteId && body.new_supplente) {
      const { data: newTeacher, error: ntErr } = await supabase
        .from("teachers")
        .insert({
          cognome: body.new_supplente.cognome,
          nome: body.new_supplente.nome,
          email: body.new_supplente.email || null,
          is_external: true,
        })
        .select("id")
        .single()
      if (ntErr || !newTeacher) throw new Error("Errore nella creazione del supplente")
      supplenteId = newTeacher.id
    }
    if (!supplenteId) {
      return NextResponse.json({ error: "Supplente non valido" }, { status: 400 })
    }
    if (supplenteId === body.sostituito_id) {
      return NextResponse.json(
        { error: "Supplente e sostituito non possono coincidere" },
        { status: 400 }
      )
    }

    // Ensure the substitute has a budget for the year, then add the accrued minutes.
    const { data: supBudget } = await supabase
      .from("teacher_budgets")
      .select("id, minutes_annual")
      .eq("teacher_id", supplenteId)
      .eq("school_year_id", year.id)
      .maybeSingle()

    if (supBudget) {
      const { error: upErr } = await supabase
        .from("teacher_budgets")
        .update({ minutes_annual: (supBudget.minutes_annual || 0) + totalMinutes })
        .eq("id", supBudget.id)
      if (upErr) throw new Error("Errore nell'aggiornamento del tesoretto del supplente")
    } else {
      const { error: insErr } = await supabase.from("teacher_budgets").insert({
        teacher_id: supplenteId,
        school_year_id: year.id,
        minutes_weekly: weeklyMinutes,
        minutes_annual: totalMinutes,
        modules_annual: 0,
        minutes_used: 0,
        modules_used: 0,
        import_date: new Date().toISOString(),
        import_source: "supplenza",
      })
      if (insErr) throw new Error("Errore nella creazione del tesoretto del supplente")
    }

    // Discount the absent teacher's monte ore (floored at 0).
    const { error: sostUpErr } = await supabase
      .from("teacher_budgets")
      .update({ minutes_annual: Math.max(0, (sostBudget.minutes_annual || 0) - totalMinutes) })
      .eq("id", sostBudget.id)
    if (sostUpErr) throw new Error("Errore nell'aggiornamento del tesoretto del sostituito")

    // Record the substitution (for history + reversal on delete).
    const { data: supplenza, error: insSuppErr } = await supabase
      .from("supplenze")
      .insert({
        school_year_id: year.id,
        sostituito_id: body.sostituito_id,
        supplente_id: supplenteId,
        start_date: body.start_date,
        end_date: body.end_date,
        weeks,
        weekly_minutes: weeklyMinutes,
        total_minutes: totalMinutes,
        note: body.note || null,
        created_by: admin.id,
      })
      .select("id, total_minutes, weeks, weekly_minutes")
      .single()
    if (insSuppErr) throw new Error("Errore nel salvataggio della supplenza")

    await supabase.from("activity_logs").insert({
      user_id: admin.id,
      action: "create_supplenza",
      table_name: "supplenze",
      record_id: supplenza.id,
      new_values: { sostituito_id: body.sostituito_id, supplente_id: supplenteId, total_minutes: totalMinutes },
    })

    return NextResponse.json({ supplenza }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore interno"
    console.error("POST /api/supplenze failed:", message)
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) })
  }
}
