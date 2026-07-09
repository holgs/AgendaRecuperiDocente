import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/roles"
import { z } from "zod"

export const dynamic = "force-dynamic"

function authErrorStatus(message: string): number {
  if (message.includes("Accesso negato")) return 403
  if (message.includes("non autenticato")) return 401
  return 500
}

const migrateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        contract_type: z.enum(["ruolo", "tempo_determinato"]),
        is_archived: z.boolean(),
      })
    )
    .min(1),
})

/**
 * POST /api/teachers/migrate
 * Admin only. Bulk-sets contract type + archive flag during the year rollover:
 * teachers that continue -> ruolo/active; the others -> tempo_determinato/archived.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const supabase = await createClient()

    const parsed = migrateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dati non validi", details: parsed.error.errors },
        { status: 400 }
      )
    }

    // Apply each update (Supabase has no native bulk-different-values update).
    for (const u of parsed.data.updates) {
      const { error } = await supabase
        .from("teachers")
        .update({ contract_type: u.contract_type, is_archived: u.is_archived })
        .eq("id", u.id)
      if (error) throw new Error("Errore nell'aggiornamento dei docenti")
    }

    await supabase.from("activity_logs").insert({
      user_id: admin.id,
      action: "migrate_teachers",
      table_name: "teachers",
      new_values: { count: parsed.data.updates.length },
    })

    return NextResponse.json({ success: true, count: parsed.data.updates.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore interno"
    console.error("POST /api/teachers/migrate failed:", message)
    return NextResponse.json({ error: message }, { status: authErrorStatus(message) })
  }
}
