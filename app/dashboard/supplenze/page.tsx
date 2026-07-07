import { SupplenzeView } from "@/components/supplenze/supplenze-view"
import { UserCog } from "lucide-react"

export const dynamic = "force-dynamic"

export default function SupplenzePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserCog className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplenze</h1>
          <p className="text-muted-foreground">
            Registra le supplenze e applica l&apos;impatto sui monte ore di recupero
          </p>
        </div>
      </div>

      <SupplenzeView />
    </div>
  )
}
