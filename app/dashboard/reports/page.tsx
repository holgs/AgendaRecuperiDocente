import { ReportsView } from "@/components/reports/reports-view"
import { BarChart3 } from "lucide-react"

export const dynamic = "force-dynamic"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report</h1>
          <p className="text-muted-foreground">
            Analisi dei recuperi per docente, andamento, periodo e distribuzione
          </p>
        </div>
      </div>

      <ReportsView />
    </div>
  )
}
