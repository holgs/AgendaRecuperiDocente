"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Download } from "lucide-react"
import { teacherSummary, type ReportData, type TeacherSummaryRow } from "@/lib/reports/compute"
import { useSortableTable, type SortAccessors } from "@/hooks/use-sortable-table"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { formatHoursMinutes } from "@/lib/time"
import { downloadCsv } from "@/lib/reports/csv-download"

const accessors: SortAccessors<TeacherSummaryRow> = {
  teacher_name: (r) => r.teacher_name,
  monteOre: (r) => r.monteOre,
  recuperato: (r) => r.recuperato,
  pianificato: (r) => r.pianificato,
  daFare: (r) => r.daFare,
  pctCompletamento: (r) => r.pctCompletamento,
}

function pctVariant(pct: number): "default" | "secondary" | "destructive" {
  if (pct >= 80) return "default"
  if (pct >= 40) return "secondary"
  return "destructive"
}

export function TeachersSummaryReport({ data }: { data: ReportData }) {
  const rows = useMemo(() => teacherSummary(data), [data])
  const { sorted, sortKey, sortDirection, requestSort } = useSortableTable(rows, accessors, {
    key: "pctCompletamento",
    direction: "asc",
  })

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          monteOre: acc.monteOre + r.monteOre,
          recuperato: acc.recuperato + r.recuperato,
          pianificato: acc.pianificato + r.pianificato,
          daFare: acc.daFare + r.daFare,
        }),
        { monteOre: 0, recuperato: 0, pianificato: 0, daFare: 0 }
      ),
    [rows]
  )

  function handleExport() {
    downloadCsv(
      `riepilogo_docenti_${data.schoolYear.name}.csv`,
      sorted.map((r) => ({
        Docente: r.teacher_name,
        "Monte ore (min)": r.monteOre,
        "Recuperato (min)": r.recuperato,
        "Pianificato (min)": r.pianificato,
        "Da fare (min)": r.daFare,
        "% completamento": r.pctCompletamento,
      }))
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Riepilogo docenti — {data.schoolYear.name}</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label="Docente" sortKey="teacher_name" activeKey={sortKey} direction={sortDirection} onSort={requestSort} />
                <SortableTableHead label="Monte ore" sortKey="monteOre" activeKey={sortKey} direction={sortDirection} onSort={requestSort} className="text-right" />
                <SortableTableHead label="Recuperato" sortKey="recuperato" activeKey={sortKey} direction={sortDirection} onSort={requestSort} className="text-right" />
                <SortableTableHead label="Pianificato" sortKey="pianificato" activeKey={sortKey} direction={sortDirection} onSort={requestSort} className="text-right" />
                <SortableTableHead label="Da fare" sortKey="daFare" activeKey={sortKey} direction={sortDirection} onSort={requestSort} className="text-right" />
                <SortableTableHead label="% compl." sortKey="pctCompletamento" activeKey={sortKey} direction={sortDirection} onSort={requestSort} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nessun docente con tesoretto per questo anno.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((r) => (
                  <TableRow key={r.teacher_id}>
                    <TableCell className="font-medium">{r.teacher_name}</TableCell>
                    <TableCell className="text-right">{formatHoursMinutes(r.monteOre)}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">{formatHoursMinutes(r.recuperato)}</TableCell>
                    <TableCell className="text-right text-yellow-600 dark:text-yellow-400">{formatHoursMinutes(r.pianificato)}</TableCell>
                    <TableCell className="text-right">{formatHoursMinutes(r.daFare)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={pctVariant(r.pctCompletamento)}>{r.pctCompletamento}%</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {sorted.length > 0 && (
              <tfoot>
                <TableRow className="font-semibold">
                  <TableCell>Totale ({sorted.length})</TableCell>
                  <TableCell className="text-right">{formatHoursMinutes(totals.monteOre)}</TableCell>
                  <TableCell className="text-right">{formatHoursMinutes(totals.recuperato)}</TableCell>
                  <TableCell className="text-right">{formatHoursMinutes(totals.pianificato)}</TableCell>
                  <TableCell className="text-right">{formatHoursMinutes(totals.daFare)}</TableCell>
                  <TableCell className="text-right">
                    {totals.monteOre > 0 ? Math.round((totals.recuperato / totals.monteOre) * 100) : 0}%
                  </TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
