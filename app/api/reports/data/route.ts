import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/roles"
import type { ReportActivity, ReportBudget } from "@/lib/reports/compute"
import type { SupabaseClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 1000

function authErrorStatus(message: string): number {
  if (message.includes("Accesso negato")) return 403
  if (message.includes("non autenticato")) return 401
  return 500
}

function teacherName(row: { cognome?: string; nome?: string } | null | undefined): string {
  if (!row) return ""
  return `${row.cognome ?? ""} ${row.nome ?? ""}`.trim()
}

/** Fetch every activity of a school year, following PostgREST pagination. */
async function fetchAllActivities(
  supabase: SupabaseClient,
  schoolYearId: string
): Promise<ReportActivity[]> {
  const all: ReportActivity[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from("recovery_activities")
      .select(
        `id, teacher_id, date, duration_minutes, status, recovery_type_id, class_name, module_number,
         teacher:teachers ( cognome, nome ),
         recovery_type:recovery_types ( name )`
      )
      .eq("school_year_id", schoolYearId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error("Errore nel recupero delle attività")

    const rows = (data ?? []) as any[]
    for (const r of rows) {
      const t = Array.isArray(r.teacher) ? r.teacher[0] : r.teacher
      const rt = Array.isArray(r.recovery_type) ? r.recovery_type[0] : r.recovery_type
      all.push({
        id: r.id,
        teacher_id: r.teacher_id,
        teacher_name: teacherName(t),
        date: r.date,
        duration_minutes: r.duration_minutes ?? 0,
        status: r.status ?? "planned",
        recovery_type_id: r.recovery_type_id ?? null,
        recovery_type_name: rt?.name ?? null,
        class_name: r.class_name ?? null,
        module_number: r.module_number ?? null,
      })
    }
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}

/**
 * GET /api/reports/data?schoolYearId=...
 * Admin only. Returns the full dataset for a school year (budgets + all
 * activities); the report views aggregate/filter it client-side.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const schoolYearId = request.nextUrl.searchParams.get("schoolYearId")
    if (!schoolYearId) {
      return NextResponse.json({ error: "schoolYearId richiesto" }, { status: 400 })
    }

    const { data: schoolYear, error: syError } = await supabase
      .from("school_years")
      .select("id, name")
      .eq("id", schoolYearId)
      .single()
    if (syError || !schoolYear) {
      return NextResponse.json({ error: "Anno scolastico non trovato" }, { status: 404 })
    }

    const { data: budgetRows, error: bError } = await supabase
      .from("teacher_budgets")
      .select(`teacher_id, minutes_annual, minutes_used, teacher:teachers ( cognome, nome )`)
      .eq("school_year_id", schoolYearId)
    if (bError) throw new Error("Errore nel recupero dei tesoretti")

    const budgets: ReportBudget[] = (budgetRows ?? []).map((b: any) => {
      const t = Array.isArray(b.teacher) ? b.teacher[0] : b.teacher
      return {
        teacher_id: b.teacher_id,
        teacher_name: teacherName(t),
        minutes_annual: b.minutes_annual ?? 0,
        minutes_used: b.minutes_used ?? 0,
      }
    })

    const activities = await fetchAllActivities(supabase, schoolYearId)

    return NextResponse.json({ schoolYear, budgets, activities })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore interno"
    console.error("GET /api/reports/data failed:", message)
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) })
  }
}
