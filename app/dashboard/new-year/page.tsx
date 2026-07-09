import { NewYearWizard } from "@/components/new-year/new-year-wizard"
import { CalendarPlus } from "lucide-react"

export const dynamic = "force-dynamic"

export default function NewYearPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarPlus className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuovo anno scolastico</h1>
          <p className="text-muted-foreground">
            Procedura guidata: crea l&apos;anno, migra i docenti, archivia il precedente, imposta gli orari
          </p>
        </div>
      </div>

      <NewYearWizard />
    </div>
  )
}
