import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/roles"

export const dynamic = "force-dynamic"

function authErrorStatus(message: string): number {
  if (message.includes("Accesso negato")) return 403
  if (message.includes("non autenticato")) return 401
  return 500
}

async function adjustBudget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: string,
  schoolYearId: string,
  deltaMinutes: number
) {
  const { data: budget } = await supabase
    .from("teacher_budgets")
    .select("id, minutes_annual")
    .eq("teacher_id", teacherId)
    .eq("school_year_id", schoolYearId)
    .maybeSingle()
  if (!budget) return
  await supabase
    .from("teacher_budgets")
    .update({ minutes_annual: Math.max(0, (budget.minutes_annual || 0) + deltaMinutes) })
    .eq("id", budget.id)
}

/**
 * DELETE /api/supplenze/[id]
 * Admin only. Reverses the substitution's budget impact and removes the record:
 *   sostituito += total_minutes; supplente -= total_minutes.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    const supabase = await createClient()

    const { data: supplenza, error: fetchErr } = await supabase
      .from("supplenze")
      .select("id, school_year_id, sostituito_id, supplente_id, total_minutes")
      .eq("id", params.id)
      .single()
    if (fetchErr || !supplenza) {
      return NextResponse.json({ error: "Supplenza non trovata" }, { status: 404 })
    }

    // Reverse the impact.
    await adjustBudget(supabase, supplenza.sostituito_id, supplenza.school_year_id, supplenza.total_minutes)
    await adjustBudget(supabase, supplenza.supplente_id, supplenza.school_year_id, -supplenza.total_minutes)

    const { error: delErr } = await supabase.from("supplenze").delete().eq("id", params.id)
    if (delErr) throw new Error("Errore nell'eliminazione della supplenza")

    await supabase.from("activity_logs").insert({
      user_id: admin.id,
      action: "delete_supplenza",
      table_name: "supplenze",
      record_id: params.id,
      old_values: { total_minutes: supplenza.total_minutes },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore interno"
    console.error("DELETE /api/supplenze/[id] failed:", message)
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) })
  }
}
