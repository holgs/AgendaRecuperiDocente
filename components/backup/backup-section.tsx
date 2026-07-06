"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  Archive,
  Download,
  Save,
  Trash2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react"

type YearInfo = {
  id: string
  name: string
  is_active: boolean | null
  counts: { teacher_budgets: number; recovery_activities: number }
  backup: { exists: boolean; verified: boolean; latestAt: string | null }
}

export function BackupSection() {
  const { toast } = useToast()
  const [years, setYears] = useState<YearInfo[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Delete confirmation state (double-step)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [ack, setAck] = useState(false)
  const [typedName, setTypedName] = useState("")

  const selected = years.find((y) => y.id === selectedId)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/backup")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Errore nel caricamento")
      const list: YearInfo[] = data.years ?? []
      setYears(list)
      setSelectedId((prev) => prev || list.find((y) => y.is_active)?.id || list[0]?.id || "")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile caricare i dati",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  function download(format: "json" | "csv-activities" | "csv-budgets") {
    if (!selectedId) return
    const url = `/api/backup/download?schoolYearId=${selectedId}&format=${format}`
    window.open(url, "_blank")
  }

  async function handleCreateBackup() {
    if (!selectedId) return
    setCreating(true)
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolYearId: selectedId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Errore nella creazione del backup")
      toast({
        title: "Backup creato",
        description: "Una copia verificata è stata salvata su Supabase.",
      })
      await loadData()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile creare il backup",
      })
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    try {
      const res = await fetch("/api/backup/delete-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolYearId: selected.id, confirmName: typedName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Errore durante l'eliminazione")
      toast({
        title: "Dati eliminati",
        description: data.message || "I dati dell'anno sono stati eliminati.",
      })
      setDeleteOpen(false)
      setAck(false)
      setTypedName("")
      await loadData()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile eliminare i dati",
      })
    } finally {
      setDeleting(false)
    }
  }

  const canDelete =
    !!selected &&
    selected.backup.verified &&
    ack &&
    typedName.trim() === selected.name

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Archive className="h-6 w-6" />
          <div>
            <CardTitle>Backup e archiviazione</CardTitle>
            <CardDescription>
              Esporta, archivia ed elimina i dati di un anno scolastico
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Year selector */}
        <div className="space-y-2">
          <Label>Anno scolastico</Label>
          <Select value={selectedId} onValueChange={setSelectedId} disabled={loading}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder={loading ? "Caricamento…" : "Seleziona un anno"} />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                  {y.is_active ? " (attivo)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <>
            {/* Counts + backup status */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Tesoretti</p>
                <p className="text-2xl font-bold">{selected.counts.teacher_budgets}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Attività</p>
                <p className="text-2xl font-bold">{selected.counts.recovery_activities}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Backup</p>
                {selected.backup.verified ? (
                  <p className="flex items-center gap-1 text-sm font-medium text-green-600">
                    <ShieldCheck className="h-4 w-4" /> Aggiornato
                  </p>
                ) : selected.backup.exists ? (
                  <p className="flex items-center gap-1 text-sm font-medium text-amber-600">
                    <ShieldAlert className="h-4 w-4" /> Non aggiornato
                  </p>
                ) : (
                  <p className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <ShieldAlert className="h-4 w-4" /> Nessuno
                  </p>
                )}
              </div>
            </div>

            {/* Downloads */}
            <div className="space-y-2">
              <Label>Scarica export</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => download("json")}>
                  <Download className="mr-2 h-4 w-4" /> JSON (backup completo)
                </Button>
                <Button variant="outline" onClick={() => download("csv-activities")}>
                  <Download className="mr-2 h-4 w-4" /> CSV attività
                </Button>
                <Button variant="outline" onClick={() => download("csv-budgets")}>
                  <Download className="mr-2 h-4 w-4" /> CSV tesoretti
                </Button>
              </div>
            </div>

            {/* Create backup copy */}
            <div className="space-y-2">
              <Label>Copia su Supabase</Label>
              <p className="text-sm text-muted-foreground">
                Salva una copia verificata dei dati di questo anno nell&apos;archivio. Necessaria
                prima di poter eliminare i dati.
              </p>
              <Button onClick={handleCreateBackup} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creazione…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Crea copia di backup
                  </>
                )}
              </Button>
            </div>

            {/* Danger zone: delete year */}
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-destructive">Elimina dati dell&apos;anno</h4>
                  <p className="text-sm text-muted-foreground">
                    Elimina definitivamente <strong>attività e tesoretti</strong> dell&apos;anno{" "}
                    <strong>{selected.name}</strong>. L&apos;anno scolastico e i docenti restano.
                    Possibile solo con un backup aggiornato.
                  </p>
                  {!selected.backup.verified && (
                    <p className="text-sm font-medium text-amber-600">
                      Crea prima una copia di backup aggiornata per abilitare l&apos;eliminazione.
                    </p>
                  )}
                  <Button
                    variant="destructive"
                    className="mt-2"
                    disabled={!selected.backup.verified}
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Elimina dati anno
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Double-step confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare definitivamente i dati dell&apos;anno{" "}
              <strong>{selected?.name}</strong>. Questa operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Switch id="ack" checked={ack} onCheckedChange={setAck} />
              <Label htmlFor="ack" className="text-sm">
                Confermo di aver scaricato/verificato il backup
              </Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="typedName" className="text-sm">
                Digita il nome dell&apos;anno (<strong>{selected?.name}</strong>) per confermare
              </Label>
              <Input
                id="typedName"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={selected?.name}
                autoComplete="off"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteOpen(false)
                setAck(false)
                setTypedName("")
              }}
              disabled={deleting}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminazione…
                </>
              ) : (
                "Elimina definitivamente"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
