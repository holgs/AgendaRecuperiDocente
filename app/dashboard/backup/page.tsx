import { BackupSection } from "@/components/backup/backup-section"
import { Archive } from "lucide-react"

export const dynamic = "force-dynamic"

export default function BackupPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Archive className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup e archiviazione</h1>
          <p className="text-muted-foreground">
            Esporta, archivia ed elimina i dati per anno scolastico
          </p>
        </div>
      </div>

      <BackupSection />
    </div>
  )
}
