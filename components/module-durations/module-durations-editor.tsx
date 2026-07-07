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
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Clock, Loader2, Save } from "lucide-react"

const DAYS = [
  { iso: 1, label: "Lunedì" },
  { iso: 2, label: "Martedì" },
  { iso: 3, label: "Mercoledì" },
  { iso: 4, label: "Giovedì" },
  { iso: 5, label: "Venerdì" },
]
const MODULES = Array.from({ length: 10 }, (_, i) => i + 1)

type SchoolYear = { id: string; name: string; is_active: boolean | null }
type Cell = { day_of_week: number; module_number: number; duration_minutes: number }

function cellKey(day: number, mod: number): string {
  return `${day}-${mod}`
}

export function ModuleDurationsEditor() {
  const { toast } = useToast()
  const [years, setYears] = useState<SchoolYear[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [grid, setGrid] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load school years once
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/school-years")
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Errore")
        const list: SchoolYear[] = Array.isArray(data) ? data : data.schoolYears ?? []
        setYears(list)
        setSelectedId(list.find((y) => y.is_active)?.id || list[0]?.id || "")
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Errore",
          description: error instanceof Error ? error.message : "Impossibile caricare gli anni",
        })
      }
    })()
  }, [toast])

  const loadGrid = useCallback(
    async (yearId: string) => {
      if (!yearId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/module-durations?schoolYearId=${yearId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Errore")
        const next: Record<string, string> = {}
        for (const c of (data.cells ?? []) as Cell[]) {
          next[cellKey(c.day_of_week, c.module_number)] = String(c.duration_minutes)
        }
        setGrid(next)
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Errore",
          description: error instanceof Error ? error.message : "Impossibile caricare la griglia",
        })
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    if (selectedId) loadGrid(selectedId)
  }, [selectedId, loadGrid])

  function setCell(day: number, mod: number, value: string) {
    // digits only, keep empty allowed
    const clean = value.replace(/[^0-9]/g, "")
    setGrid((prev) => ({ ...prev, [cellKey(day, mod)]: clean }))
  }

  async function handleSave() {
    if (!selectedId) return
    setSaving(true)
    try {
      const cells: Cell[] = []
      for (const day of DAYS) {
        for (const mod of MODULES) {
          const raw = grid[cellKey(day.iso, mod)]
          const n = raw ? parseInt(raw, 10) : 0
          if (n > 0) {
            cells.push({ day_of_week: day.iso, module_number: mod, duration_minutes: n })
          }
        }
      }
      const res = await fetch("/api/module-durations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolYearId: selectedId, cells }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Errore nel salvataggio")
      toast({ title: "Salvato", description: `${data.count} moduli configurati.` })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error instanceof Error ? error.message : "Impossibile salvare",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6" />
          <div>
            <CardTitle>Durate dei moduli</CardTitle>
            <CardDescription>
              Imposta la durata (in minuti) di ogni modulo per giorno della settimana. La durata
              scelta viene scalata dal monte minuti del docente quando registra un recupero in quel
              modulo. Lascia vuote le celle non utilizzate.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Anno scolastico</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Seleziona un anno" />
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

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento griglia…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b p-2 text-left font-medium">Giorno</th>
                  {MODULES.map((m) => (
                    <th key={m} className="border-b p-2 text-center font-medium">
                      {m}°
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day.iso}>
                    <td className="border-b p-2 font-medium">{day.label}</td>
                    {MODULES.map((m) => (
                      <td key={m} className="border-b p-1 text-center">
                        <Input
                          inputMode="numeric"
                          value={grid[cellKey(day.iso, m)] ?? ""}
                          onChange={(e) => setCell(day.iso, m, e.target.value)}
                          className="h-9 w-16 text-center"
                          placeholder="—"
                          aria-label={`${day.label} modulo ${m} minuti`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving || !selectedId}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Salva durate
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
