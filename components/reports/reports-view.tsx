"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import type { ReportData } from "@/lib/reports/compute"
import { TeachersSummaryReport } from "@/components/reports/teachers-summary-report"
import { TrendReport } from "@/components/reports/trend-report"
import { ActivitiesReport } from "@/components/reports/activities-report"
import { DistributionReport } from "@/components/reports/distribution-report"

type SchoolYear = { id: string; name: string; is_active: boolean | null }

export function ReportsView() {
  const { toast } = useToast()
  const [years, setYears] = useState<SchoolYear[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/school-years")
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Errore")
        const list: SchoolYear[] = Array.isArray(json) ? json : json.schoolYears ?? []
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

  const loadData = useCallback(
    async (yearId: string) => {
      if (!yearId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/reports/data?schoolYearId=${yearId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Errore nel caricamento dei dati")
        setData(json)
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Errore",
          description: error instanceof Error ? error.message : "Impossibile caricare i report",
        })
        setData(null)
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    if (selectedId) loadData(selectedId)
  }, [selectedId, loadData])

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Caricamento dati…
        </div>
      ) : !data ? (
        <p className="py-12 text-muted-foreground">Seleziona un anno scolastico per vedere i report.</p>
      ) : (
        <Tabs defaultValue="teachers" className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="teachers">Riepilogo docenti</TabsTrigger>
            <TabsTrigger value="trend">Andamento nel tempo</TabsTrigger>
            <TabsTrigger value="activities">Attività per periodo</TabsTrigger>
            <TabsTrigger value="distribution">Distribuzione</TabsTrigger>
          </TabsList>
          <TabsContent value="teachers" className="mt-4">
            <TeachersSummaryReport data={data} />
          </TabsContent>
          <TabsContent value="trend" className="mt-4">
            <TrendReport data={data} />
          </TabsContent>
          <TabsContent value="activities" className="mt-4">
            <ActivitiesReport data={data} />
          </TabsContent>
          <TabsContent value="distribution" className="mt-4">
            <DistributionReport data={data} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
