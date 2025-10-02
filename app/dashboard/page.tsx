"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Users, BookOpen, Activity, TrendingUp, Loader2 } from "lucide-react"
import { calculatePercentageUsed } from "@/lib/utils"

type DashboardData = {
  teachersCount: number
  totalModules: number
  usedModules: number
  avgPercentage: number
  activitiesCount: number
  budgets: any[]
  currentSchoolYear: any
}

export default function DashboardPage() {
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const [teachersRes, schoolYearsRes, budgetsRes, activitiesRes] = await Promise.all([
        fetch('/api/teachers'),
        fetch('/api/school-years'),
        fetch('/api/budgets'),
        fetch('/api/activities').catch(() => ({ ok: false }))
      ])

      const teachers = teachersRes.ok ? await teachersRes.json() : []
      const schoolYears = schoolYearsRes.ok ? await schoolYearsRes.json() : []
      const budgets = budgetsRes.ok ? await budgetsRes.json() : []
      const activities = activitiesRes.ok ? await activitiesRes.json() : []

      const currentYear = schoolYears.find((y: any) => y.is_active)
      const totalModules = budgets.reduce((sum: number, b: any) => sum + (b.modules_annual || 0), 0)
      const usedModules = budgets.reduce((sum: number, b: any) => sum + (b.modules_used || 0), 0)
      const avgPercentage = budgets.length
        ? budgets.reduce((sum: number, b: any) => {
            const used = calculatePercentageUsed(b.minutes_used || 0, b.minutes_annual || 0)
            return sum + used
          }, 0) / budgets.length
        : 0

      setData({
        teachersCount: teachers.length,
        totalModules,
        usedModules,
        avgPercentage: Number(avgPercentage.toFixed(1)),
        activitiesCount: activities.length,
        budgets: budgets.slice(0, 10),
        currentSchoolYear: currentYear
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare i dati della dashboard'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica generale del sistema tracking recuperi
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totale Docenti
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.teachersCount}</div>
            <p className="text-xs text-muted-foreground">
              Docenti registrati nel sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Moduli Disponibili
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalModules.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Totale moduli annuali assegnati
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilizzo Medio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgPercentage}%</div>
            <p className="text-xs text-muted-foreground">
              Percentuale media di utilizzo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Attività Registrate
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activitiesCount}</div>
            <p className="text-xs text-muted-foreground">
              Attività di recupero totali
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Teachers Budget */}
      <Card>
        <CardHeader>
          <CardTitle>Tesoretti Docenti</CardTitle>
          <CardDescription>
            Ultimi tesoretti importati o aggiornati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.budgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Nessun tesoretto trovato. Inizia importando i dati dei docenti.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Docente</TableHead>
                  <TableHead>Moduli Annuali</TableHead>
                  <TableHead>Moduli Utilizzati</TableHead>
                  <TableHead>Moduli Disponibili</TableHead>
                  <TableHead>Utilizzo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.budgets.map((budget) => {
                  const teacher = budget.teachers as any
                  const modulesRemaining = (budget.modules_annual || 0) - (budget.modules_used || 0)
                  const percentageUsed = calculatePercentageUsed(
                    budget.minutes_used || 0,
                    budget.minutes_annual || 0
                  )

                  let statusVariant: "success" | "warning" | "critical" = "success"
                  if (percentageUsed >= 80) statusVariant = "critical"
                  else if (percentageUsed >= 50) statusVariant = "warning"

                  return (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">
                        {teacher?.cognome} {teacher?.nome}
                      </TableCell>
                      <TableCell>{budget.modules_annual?.toFixed(1)}</TableCell>
                      <TableCell>{budget.modules_used?.toFixed(1) || "0.0"}</TableCell>
                      <TableCell>{modulesRemaining.toFixed(1)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant}>
                          {percentageUsed}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
