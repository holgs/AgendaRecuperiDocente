"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function TeacherCalendarPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/dashboard/teachers/${params.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario Pianificazione</h1>
          <p className="text-muted-foreground">
            Pianifica le attività di recupero nel calendario
          </p>
        </div>
      </div>

      {/* Calendar placeholder */}
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Calendario di pianificazione in fase di sviluppo.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Questa funzionalità sarà implementata nel prossimo step.
        </p>
      </div>
    </div>
  )
}
