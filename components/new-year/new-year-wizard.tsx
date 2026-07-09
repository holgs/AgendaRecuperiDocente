"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { computeWeeks } from "@/lib/supplenze/weeks"
import { Check, Loader2, ArrowRight, ArrowLeft, Save, ShieldCheck } from "lucide-react"

const DAYS = [
  { iso: 1, label: "Lun" },
  { iso: 2, label: "Mar" },
  { iso: 3, label: "Mer" },
  { iso: 4, label: "Gio" },
  { iso: 5, label: "Ven" },
]
const MODULES = Array.from({ length: 10 }, (_, i) => i + 1)
const cellKey = (d: number, m: number) => `${d}-${m}`

type Year = { id: string; name: string; weeks_count?: number }
type TeacherRow = { id: string; name: string; decision: "continue" | "archive" }

const STEPS = ["Nuovo anno", "Docenti", "Archivio", "Orari", "Attiva"]

export function NewYearWizard() {
  const { toast } = useToast()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  const [closingYear, setClosingYear] = useState<Year | null>(null)

  // Step 1
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [weeks, setWeeks] = useState("")
  const [newYearId, setNewYearId] = useState<string | null>(null)

  // Step 2
  const [teachers, setTeachers] = useState<TeacherRow[]>([])

  // Step 3
  const [backupDone, setBackupDone] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [prevDeleted, setPrevDeleted] = useState(false)

  // Step 4
  const [grid, setGrid] = useState<Record<string, string>>({})
  const [gridSaved, setGridSaved] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [yRes, tRes] = await Promise.all([
          fetch("/api/school-years/active"),
          fetch("/api/teachers/list-with-budgets"),
        ])
        const yJson = await yRes.json()
        const tJson = await tRes.json()
        const active = Array.isArray(yJson) ? yJson[0] : yJson
        if (active?.id) setClosingYear({ id: active.id, name: active.name, weeks_count: active.weeks_count })
        const list = (tJson.teachers ?? []).map((t: any) => ({
          id: t.id,
          name: `${t.cognome} ${t.nome}`,
          decision: "continue" as const,
        }))
        setTeachers(list)
      } catch {
        toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i dati iniziali" })
      }
    })()
  }, [toast])

  useEffect(() => {
    if (startDate && endDate && endDate >= startDate) setWeeks(String(computeWeeks(startDate, endDate)))
  }, [startDate, endDate])

  // ---- step actions -------------------------------------------------------

  async function createYear() {
    setBusy(true)
    try {
      const res = await fetch("/api/school-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
          weeks_count: parseInt(weeks || "30", 10) || 30,
          is_active: false,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore nella creazione dell'anno")
      setNewYearId(json.id)
      // Pre-fill the new grid from the closing year's grid.
      if (closingYear) {
        const gRes = await fetch(`/api/module-durations?schoolYearId=${closingYear.id}`)
        const gJson = await gRes.json()
        const next: Record<string, string> = {}
        for (const c of gJson.cells ?? []) next[cellKey(c.day_of_week, c.module_number)] = String(c.duration_minutes)
        setGrid(next)
      }
      setStep(1)
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setBusy(false)
    }
  }

  async function migrateTeachers() {
    setBusy(true)
    try {
      const updates = teachers.map((t) => ({
        id: t.id,
        contract_type: t.decision === "continue" ? "ruolo" : "tempo_determinato",
        is_archived: t.decision === "archive",
      }))
      if (updates.length > 0) {
        const res = await fetch("/api/teachers/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Errore nella migrazione docenti")
      }
      setStep(2)
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setBusy(false)
    }
  }

  async function createBackup() {
    if (!closingYear) return
    setBusy(true)
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolYearId: closingYear.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore nel backup")
      setBackupDone(true)
      toast({ title: "Backup creato", description: "Copia verificata dell'anno precedente salvata." })
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setBusy(false)
    }
  }

  async function deletePrevYear() {
    if (!closingYear) return
    setBusy(true)
    try {
      const res = await fetch("/api/backup/delete-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolYearId: closingYear.id, confirmName: deleteConfirm }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore nell'eliminazione")
      setPrevDeleted(true)
      toast({ title: "Dati eliminati", description: json.message || "Dati dell'anno precedente eliminati." })
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setBusy(false)
    }
  }

  async function saveGrid() {
    if (!newYearId) return
    setBusy(true)
    try {
      const cells: { day_of_week: number; module_number: number; duration_minutes: number }[] = []
      for (const d of DAYS)
        for (const m of MODULES) {
          const n = parseInt(grid[cellKey(d.iso, m)] || "0", 10) || 0
          if (n > 0) cells.push({ day_of_week: d.iso, module_number: m, duration_minutes: n })
        }
      const res = await fetch("/api/module-durations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolYearId: newYearId, cells }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore nel salvataggio griglia")
      setGridSaved(true)
      toast({ title: "Griglia salvata", description: `${json.count} moduli configurati.` })
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setBusy(false)
    }
  }

  async function activate() {
    if (!newYearId) return
    setBusy(true)
    try {
      const res = await fetch(`/api/school-years/${newYearId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore nell'attivazione")
      toast({ title: "Nuovo anno attivato", description: `${name} è ora l'anno attivo.` })
      router.push("/dashboard")
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setBusy(false)
    }
  }

  const continueCount = teachers.filter((t) => t.decision === "continue").length
  const archiveCount = teachers.length - continueCount

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                i < step ? "bg-primary text-primary-foreground" : i === step ? "border-2 border-primary" : "border text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-sm", i === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
            {i < STEPS.length - 1 && <div className="mx-1 h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 0: create year */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nuovo anno scolastico</CardTitle>
            <CardDescription>
              {closingYear ? `Anno in chiusura: ${closingYear.name}. ` : ""}Le settimane si calcolano dalle date e restano modificabili.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome (es. 2026-27)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="2026-27" />
            </div>
            <div className="space-y-1">
              <Label>Settimane di recupero</Label>
              <Input type="number" min="1" value={weeks} onChange={(e) => setWeeks(e.target.value.replace(/[^0-9]/g, ""))} />
            </div>
            <div className="space-y-1">
              <Label>Data inizio</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data fine</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: migrate teachers */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Migrazione docenti</CardTitle>
            <CardDescription>
              Chi <strong>continua</strong> viene marcato di ruolo; chi <strong>non continua</strong> viene archiviato
              come tempo determinato (recuperabile in seguito). Continuano {continueCount}, archiviati {archiveCount}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setTeachers((ts) => ts.map((t) => ({ ...t, decision: "continue" })))}>
                Tutti continuano
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTeachers((ts) => ts.map((t) => ({ ...t, decision: "archive" })))}>
                Tutti archiviati
              </Button>
            </div>
            <div className="max-h-96 space-y-1 overflow-y-auto rounded-md border p-2">
              {teachers.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50">
                  <span className="text-sm">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs", t.decision === "continue" ? "text-green-600" : "text-muted-foreground")}>
                      {t.decision === "continue" ? "Continua (ruolo)" : "Archivia (TD)"}
                    </span>
                    <Switch
                      checked={t.decision === "continue"}
                      onCheckedChange={(c) =>
                        setTeachers((ts) => ts.map((x) => (x.id === t.id ? { ...x, decision: c ? "continue" : "archive" } : x)))
                      }
                    />
                  </div>
                </div>
              ))}
              {teachers.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Nessun docente nell'anno in chiusura.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: archive previous year */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Archivia l&apos;anno precedente</CardTitle>
            <CardDescription>
              Crea una copia di backup verificata di {closingYear?.name}. L&apos;eliminazione dei dati è facoltativa e
              possibile solo dopo il backup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={createBackup} disabled={busy || backupDone}>
              {backupDone ? <><ShieldCheck className="mr-2 h-4 w-4" /> Backup creato</> : busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creazione…</> : <><Save className="mr-2 h-4 w-4" /> Crea backup</>}
            </Button>

            {backupDone && !prevDeleted && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">Eliminazione dati anno precedente (facoltativa)</p>
                <p className="text-sm text-muted-foreground">
                  Per eliminare attività e tesoretti di {closingYear?.name}, digita il nome dell&apos;anno.
                </p>
                <div className="flex gap-2">
                  <Input placeholder={closingYear?.name} value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="max-w-xs" />
                  <Button variant="destructive" disabled={busy || deleteConfirm.trim() !== closingYear?.name} onClick={deletePrevYear}>
                    Elimina dati
                  </Button>
                </div>
              </div>
            )}
            {prevDeleted && <Badge variant="secondary">Dati dell&apos;anno precedente eliminati</Badge>}
          </CardContent>
        </Card>
      )}

      {/* Step 3: grid */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Schema orario (durate moduli)</CardTitle>
            <CardDescription>
              Precompilato dall&apos;anno precedente. Minuti per modulo/giorno; base per il calcolo dei recuperi. Modificabile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b p-2 text-left">Giorno</th>
                    {MODULES.map((m) => (
                      <th key={m} className="border-b p-2 text-center">{m}°</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((d) => (
                    <tr key={d.iso}>
                      <td className="border-b p-2 font-medium">{d.label}</td>
                      {MODULES.map((m) => (
                        <td key={m} className="border-b p-1 text-center">
                          <Input
                            inputMode="numeric"
                            value={grid[cellKey(d.iso, m)] ?? ""}
                            onChange={(e) => setGrid((g) => ({ ...g, [cellKey(d.iso, m)]: e.target.value.replace(/[^0-9]/g, "") }))}
                            className="h-8 w-14 text-center"
                            placeholder="—"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={saveGrid} disabled={busy}>
              {gridSaved ? <><Check className="mr-2 h-4 w-4" /> Salvata</> : busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio…</> : <><Save className="mr-2 h-4 w-4" /> Salva griglia</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: activate */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Attiva il nuovo anno</CardTitle>
            <CardDescription>Riepilogo prima di rendere attivo {name}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-sm">
              <li>• Nuovo anno: <strong>{name}</strong> ({weeks} settimane)</li>
              <li>• Docenti che continuano: <strong>{continueCount}</strong> · archiviati: <strong>{archiveCount}</strong></li>
              <li>• Backup anno precedente: <strong>{backupDone ? "sì" : "no"}</strong>{prevDeleted ? " · dati eliminati" : ""}</li>
              <li>• Griglia orari: <strong>{gridSaved ? "salvata" : "non salvata"}</strong></li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Attivando il nuovo anno, {closingYear?.name} diventa inattivo. L&apos;import dei tesoretti si fa dopo, dalla sezione Import.
            </p>
            <Button onClick={activate} disabled={busy}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Attivazione…</> : "Attiva nuovo anno"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Nav buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
        </Button>
        {step === 0 && (
          <Button onClick={createYear} disabled={busy || !name.trim() || !startDate || !endDate}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Crea e continua <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {step === 1 && (
          <Button onClick={migrateTeachers} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Avanti <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {step === 2 && (
          <Button onClick={() => setStep(3)} disabled={!backupDone}>
            Avanti <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {step === 3 && (
          <Button onClick={() => setStep(4)} disabled={!gridSaved}>
            Avanti <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
