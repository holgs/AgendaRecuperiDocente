import { ClearDataSection } from "@/components/settings/clear-data-section"
import { AdminUsersSection } from "@/components/settings/admin-users-section"
import { ArchivedTeachersSection } from "@/components/settings/archived-teachers-section"
import { SchoolYearsSection } from "@/components/settings/school-years-section"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
          <p className="text-muted-foreground">
            Configurazione e gestione del sistema
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* School years: set active / delete */}
        <SchoolYearsSection />

        {/* Admin Users Management */}
        <AdminUsersSection />

        {/* Archived (fixed-term) teachers — reactivation */}
        <ArchivedTeachersSection />

        {/* Clear Data Operations */}
        <ClearDataSection />
      </div>
    </div>
  )
}
