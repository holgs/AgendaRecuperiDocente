"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Download } from "lucide-react"
import {
  filterActivities,
  type ActivityFilters,
  type ReportActivity,
  type ReportData,
} from "@/lib/reports/compute"
import { useSortableTable, type SortAccessors } from "@/hooks/use-sortable-table"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { formatHoursMinutes } from "@/lib/time"
import { downloadCsv } from "@/lib/reports/csv-download"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const ALL = "__all__"

const accessors: SortAccessors<ReportActivity> = {
  date: (a) => a.date,
  teacher_name: (a) => a.teacher_name,
  module_number: (a) => a.module_number,
  class_name: (a) => a.class_name,
  recovery_type_name: (a) => a.recovery_type_name,
  duration_minutes: (a) => a.duration_minutes,
  status: (a) => a.status,
}

const statusLabel: Record<string, string> = { planned: "Pianificato", completed: "Recuperato" }

export function ActivitiesReport({ data }: { data: ReportData }) {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [teacherId, setTeacherId] = useState(ALL)
  const [typeId, setTypeId] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [className, setClassName] = useState(ALL)

  const teachers = useMemo(
    () => [...data.budgets].map((b) => ({ id: b.teacher_id, name: b.teacher_name })).sort((a, b) => a.name.localeCompare(b.name, "it")),
    [data.budgets]
  )
  const types = useMemo(() => {
    const m = new Map<string, string>()
    data.activities.forEach((a) => {
      if (a.recovery_type_id) m.set(a.recovery_type_id, a.recovery_type_name || "—")
    })
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "it"))
  }, [data.activities])
  const classes = useMemo(
    () => Array.from(new Set(data.activities.map((a) => a.class_name).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "it")),
    [data.activities]
  )

  const filters: ActivityFilters = {
    from: from || undefined,
    to: to || undefined,
    teacherId: teacherId === ALL ? undefined : teacherId,
    recoveryTypeId: typeId === ALL ? undefined : typeId,
    status: status === ALL ? undefined : status,
    className: className === ALL ? undefined : className,
  }
  const filtered = useMemo(() => filterActivities(data.activities, filters), [data.activities, from, to, teacherId, typeId, status, className])
  const { sorted, sortKey, sortDirection, requestSort } = useSortableTable(filtered, accessors, { key: "date", direction: "asc" })

  const totalMinutes = useMemo(() => filtered.reduce((s, a) => s + (a.duration_minutes || 0), 0), [filtered])

  function handleExport() {
    downloadCsv(
      `attivita_${data.schoolYear.name}.csv`,
      sorted.map((a) => ({
        Data: a.date ? new Date(a.date).toISOString().split("T")[0] : "",
        Docente: a.teacher_name,
        Modulo: a.module_number ?? "",
        Classe: a.class_name ?? "",
        Tipo: a.recovery_type_name ?? "",
        "Durata (min)": a.duration_minutes,
        Stato: statusLabel[a.status] ?? a.status,
      }))
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-center justify-between">
          <CardTitle>Attività per periodo — {data.schoolYear.name}</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Dal</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Al</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Docente</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutti</SelectItem>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutti</SelectItem>
                {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Stato</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutti</SelectItem>
                <SelectItem value="planned">Pianificato</SelectItem>
                <SelectItem value="completed">Recuperato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Classe</Label>
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutte</SelectItem>
                {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          {filtered.length} attività • totale {formatHoursMinutes(totalMinutes)}
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label="Data" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={requestSort} />
                <SortableTableHead label="Docente" sortKey="teacher_name" activeKey={sortKey} direction={sortDirection} onSort={requestSort} />
                <SortableTableHead label="Modulo" sortKey="module_number" activeKey={sortKey} direction={sortDirection} onSort={requestSort} />
                <SortableTableHead label="Classe" sortKey="class_name" activeKey={sortKey} direction={sortDirection} onSort={requestSort} />
                <SortableTableHead label="Tipo" sortKey="recovery_type_name" activeKey={sortKey} direction={sortDirection} onSort={requestSort} />
                <SortableTableHead label="Durata" sortKey="duration_minutes" activeKey={sortKey} direction={sortDirection} onSort={requestSort} className="text-right" />
                <SortableTableHead label="Stato" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={requestSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nessuna attività con i filtri selezionati.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.date ? format(new Date(a.date), "dd MMM yyyy", { locale: it }) : "-"}
                    </TableCell>
                    <TableCell>{a.teacher_name}</TableCell>
                    <TableCell>{a.module_number ? `${a.module_number}°` : "-"}</TableCell>
                    <TableCell>{a.class_name || "-"}</TableCell>
                    <TableCell>{a.recovery_type_name || "-"}</TableCell>
                    <TableCell className="text-right">{a.duration_minutes} min</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "completed" ? "default" : "secondary"}>
                        {statusLabel[a.status] ?? a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
