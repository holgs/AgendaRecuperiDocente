"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { formatHoursMinutes } from "@/lib/time"
import { computeWeeks } from "@/lib/supplenze/weeks"

type Teacher = {
  id: string
  nome: string
  cognome: string
  budget: { minutesWeekly: number } | null
}
type Supplenza = {
  id: string
  start_date: string
  end_date: string
  weeks: number
  weekly_minutes: number
  total_minutes: number
  note: string | null
  sostituito: { id: string; cognome: string; nome: string } | null
  supplente: { id: string; cognome: string; nome: string; is_external: boolean } | null
}

const NONE = ""

export function SupplenzeView() {
  const { toast } = useToast()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [activeYear, setActiveYear] = useState<{ id: string; name: string } | null>(null)
  const [supplenze, setSupplenze] = useState<Supplenza[]>([])
  const [submitting, setSubmitting] = useState(false)

  // form state
  const [sostituitoId, setSostituitoId] = useState(NONE)
  const [newExternal, setNewExternal] = useState(true)
  const [supplenteId, setSupplenteId] = useState(NONE)
  const [cognome, setCognome] = useState("")
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [weeks, setWeeks] = useState("")
  const [note, setNote] = useState("")

  const loadSupplenze = useCallback(
    async (yearId: string) => {
      try {
        const res = await fetch(`/api/supplenze?schoolYearId=${yearId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Errore")
        setSupplenze(json.supplenze ?? [])
      } catch (error) {
        toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
      }
    },
    [toast]
  )

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/teachers/list-with-budgets")
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Errore")
        setTeachers(json.teachers ?? [])
        setActiveYear(json.activeYear ?? null)
        if (json.activeYear?.id) loadSupplenze(json.activeYear.id)
      } catch (error) {
        toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
      }
    })()
  }, [toast, loadSupplenze])

  // Auto-fill weeks from the date range (editable).
  useEffect(() => {
    if (startDate && endDate && endDate >= startDate) {
      setWeeks(String(computeWeeks(startDate, endDate)))
    }
  }, [startDate, endDate])

  const sostituito = useMemo(() => teachers.find((t) => t.id === sostituitoId), [teachers, sostituitoId])
  const weeklyMinutes = sostituito?.budget?.minutesWeekly ?? 0
  const previewMinutes = (parseInt(weeks || "0", 10) || 0) * weeklyMinutes

  function resetForm() {
    setSostituitoId(NONE)
    setSupplenteId(NONE)
    setCognome("")
    setNome("")
    setEmail("")
    setStartDate("")
    setEndDate("")
    setWeeks("")
    setNote("")
  }

  const canSubmit =
    sostituitoId &&
    startDate &&
    endDate &&
    endDate >= startDate &&
    (parseInt(weeks || "0", 10) || 0) > 0 &&
    (newExternal ? cognome.trim() && nome.trim() : supplenteId)

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        sostituito_id: sostituitoId,
        start_date: startDate,
        end_date: endDate,
        weeks: parseInt(weeks, 10),
        note: note || undefined,
      }
      if (newExternal) {
        payload.new_supplente = { cognome: cognome.trim(), nome: nome.trim(), email: email.trim() || undefined }
      } else {
        payload.supplente_id = supplenteId
      }
      const res = await fetch("/api/supplenze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore nella creazione")
      toast({ title: "Supplenza registrata", description: `Impatto: ${formatHoursMinutes(json.supplenza.total_minutes)}` })
      resetForm()
      // Reload teachers (budgets changed) and list
      const tRes = await fetch("/api/teachers/list-with-budgets")
      const tJson = await tRes.json()
      setTeachers(tJson.teachers ?? [])
      if (activeYear?.id) loadSupplenze(activeYear.id)
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/supplenze/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore")
      toast({ title: "Supplenza eliminata", description: "Impatto sui tesoretti annullato." })
      if (activeYear?.id) loadSupplenze(activeYear.id)
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    }
  }

  const sortedTeachers = useMemo(
    () => [...teachers].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, "it")),
    [teachers]
  )

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Nuova supplenza</CardTitle>
          <CardDescription>
            Il supplente matura minuti da recuperare pari a settimane × minuti settimanali del sostituito;
            al sostituito gli stessi minuti vengono scontati.{activeYear ? ` Anno ${activeYear.name}.` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Docente sostituito (assente)</Label>
              <Select value={sostituitoId} onValueChange={setSostituitoId}>
                <SelectTrigger><SelectValue placeholder="Seleziona docente" /></SelectTrigger>
                <SelectContent>
                  {sortedTeachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.cognome} {t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sostituito && (
                <p className="text-xs text-muted-foreground">Minuti settimanali: {weeklyMinutes}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch id="new-external" checked={newExternal} onCheckedChange={setNewExternal} />
                <Label htmlFor="new-external" className="text-sm">Supplente esterno nuovo</Label>
              </div>
              {newExternal ? (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} />
                  <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                  <Input className="col-span-2" placeholder="Email (opzionale)" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              ) : (
                <Select value={supplenteId} onValueChange={setSupplenteId}>
                  <SelectTrigger><SelectValue placeholder="Seleziona supplente esistente" /></SelectTrigger>
                  <SelectContent>
                    {sortedTeachers.filter((t) => t.id !== sostituitoId).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.cognome} {t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <Label>Data inizio</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data fine</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Settimane</Label>
              <Input type="number" min="1" value={weeks} onChange={(e) => setWeeks(e.target.value.replace(/[^0-9]/g, ""))} />
              <p className="text-xs text-muted-foreground">Calcolate dalle date, modificabili.</p>
            </div>
            <div className="space-y-1">
              <Label>Note (opzionale)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            Impatto calcolato: <strong>{formatHoursMinutes(previewMinutes)}</strong>{" "}
            ({weeks || 0} settimane × {weeklyMinutes} min) — <span className="text-green-600 dark:text-green-400">+ al supplente</span>,{" "}
            <span className="text-amber-600 dark:text-amber-400">− al sostituito</span>.
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio…</> : <><Plus className="mr-2 h-4 w-4" /> Registra supplenza</>}
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Supplenze registrate</CardTitle>
          <CardDescription>{supplenze.length} supplenze</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sostituito</TableHead>
                  <TableHead>Supplente</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Settimane</TableHead>
                  <TableHead className="text-right">Impatto</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplenze.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Nessuna supplenza registrata.
                    </TableCell>
                  </TableRow>
                ) : (
                  supplenze.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.sostituito ? `${s.sostituito.cognome} ${s.sostituito.nome}` : "—"}
                      </TableCell>
                      <TableCell>
                        {s.supplente ? `${s.supplente.cognome} ${s.supplente.nome}` : "—"}{" "}
                        {s.supplente?.is_external && <Badge variant="secondary" className="ml-1">esterno</Badge>}
                      </TableCell>
                      <TableCell>{s.start_date} → {s.end_date}</TableCell>
                      <TableCell className="text-right">{s.weeks}</TableCell>
                      <TableCell className="text-right">{formatHoursMinutes(s.total_minutes)}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare la supplenza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                L&apos;impatto sui tesoretti verrà annullato: il sostituito riavrà {formatHoursMinutes(s.total_minutes)}, al supplente verranno tolti.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
