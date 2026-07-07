"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  distributionByClass,
  distributionByType,
  filterActivities,
  type DistributionRow,
  type ReportData,
} from "@/lib/reports/compute"
import { formatHoursMinutes } from "@/lib/time"

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"]

function DistributionBlock({ title, rows }: { title: string; rows: DistributionRow[] }) {
  const chartData = rows.slice(0, 12).map((r) => ({ ...r, hours: Math.round(r.minutes / 60) }))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Nessun dato.</p>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}h`} />
                  <Tooltip formatter={(_value, _name, item: any) => formatHoursMinutes(item?.payload?.minutes ?? 0)} />
                  <Bar dataKey="hours" name="Ore">
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voce</TableHead>
                    <TableHead className="text-right">Attività</TableHead>
                    <TableHead className="text-right">Minuti</TableHead>
                    <TableHead className="text-right">Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.label}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right">{r.minutes}</TableCell>
                      <TableCell className="text-right">{formatHoursMinutes(r.minutes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function DistributionReport({ data }: { data: ReportData }) {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const activities = useMemo(
    () => filterActivities(data.activities, { from: from || undefined, to: to || undefined }),
    [data.activities, from, to]
  )
  const byType = useMemo(() => distributionByType(activities), [activities])
  const byClass = useMemo(() => distributionByClass(activities), [activities])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Distribuzione — {data.schoolYear.name}</CardTitle>
          <div className="grid gap-3 pt-2 sm:grid-cols-2 sm:max-w-md">
            <div className="space-y-1">
              <Label className="text-xs">Dal</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Al</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </CardHeader>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <DistributionBlock title="Per tipo di recupero" rows={byType} />
        <DistributionBlock title="Per classe" rows={byClass} />
      </div>
    </div>
  )
}
