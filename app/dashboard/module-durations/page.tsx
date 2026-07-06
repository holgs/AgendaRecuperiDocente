import { ModuleDurationsEditor } from "@/components/module-durations/module-durations-editor"
import { Clock } from "lucide-react"

export const dynamic = "force-dynamic"

export default function ModuleDurationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Durate moduli</h1>
          <p className="text-muted-foreground">
            Configura i minuti di ogni modulo per giorno della settimana
          </p>
        </div>
      </div>

      <ModuleDurationsEditor />
    </div>
  )
}
