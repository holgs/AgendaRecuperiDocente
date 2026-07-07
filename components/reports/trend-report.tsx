"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { trend, type Granularity, type ReportData } from "@/lib/reports/compute"
import { formatHoursMinutes } from "@/lib/time"

const ALL = "__all__"

export function TrendReport({ data }: { data: ReportData }) {
  const [granularity, setGranularity] = useState<Granularity>("week")
  const [teacherId, setTeacherId] = useState<string>(ALL)

  const teachers = useMemo(
    () =>
      [...data.budgets]
        .map((b) => ({ id: b.teacher_id, name: b.teacher_name }))
        .sort((a, b) => a.name.localeCompare(b.name, "it")),
    [data.budgets]
  )

  const points = useMemo(
    () => trend(data.activities, granularity, teacherId === ALL ? undefined : teacherId),
    [data.activities, granularity, teacherId]
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Andamento recuperi — {data.schoolYear.name}</CardTitle>
        <div className="flex flex-wrap gap-4 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">Granularità</Label>
            <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Settimana</SelectItem>
                <SelectItem value="month">Mese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Docente</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutti i docenti</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            Nessun recupero completato nel periodo selezionato.
          </p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${Math.round(Number(v) / 60)}h`}
                />
                <Tooltip formatter={(value) => formatHoursMinutes(Number(value))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="recuperato"
                  name="Recuperato nel periodo"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumulato"
                  name="Totale cumulato"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
