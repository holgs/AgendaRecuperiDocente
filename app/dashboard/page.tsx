"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Users, BookOpen, Activity, TrendingUp, Loader2, Upload, Download } from "lucide-react"

type DashboardData = {
  totalTeachers: number
  modulesToPlan: number
  modulesPlanned: number
  modulesCompleted: number
  activitiesPlanned: number
  activitiesCompleted: number
  weeklyActivities: any[]
  activeYear: any
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
      const [overviewRes, weeklyRes] = await Promise.all([
        fetch('/api/reports/overview'),
        fetch('/api/activities/weekly')
      ])

      if (!overviewRes.ok) {
        throw new Error('Failed to fetch overview data')
      }

      const overviewData = await overviewRes.json()
      const weeklyData = weeklyRes.ok ? await weeklyRes.json() : { activities: [] }

      setData({
        totalTeachers: overviewData.overview.totalTeachers,
        modulesToPlan: overviewData.overview.modulesToPlan,
        modulesPlanned: overviewData.overview.modulesPlanned,
        modulesCompleted: overviewData.overview.modulesCompleted,
        activitiesPlanned: overviewData.overview.activitiesPlanned,
        activitiesCompleted: overviewData.overview.activitiesCompleted,
        weeklyActivities: weeklyData.activities || [],
        activeYear: overviewData.activeYear
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

  async function downloadActivityReport() {
    try {
      const response = await fetch('/api/reports/activities-export')

      if (!response.ok) {
        throw new Error('Failed to fetch report data')
      }

      const reportData = await response.json()

      // Convert to CSV
      const headers = ['NOME', 'COGNOME', 'Moduli da Recuperare', 'Moduli Recuperati', 'Percentuale']
      const csvRows = [headers.join(';')]

      reportData.data.forEach((row: any) => {
        const values = [
          row.nome,
          row.cognome,
          row.moduliDaRecuperare,
          row.moduliRecuperati,
          row.percentuale
        ]
        csvRows.push(values.join(';'))
      })

      const csvContent = csvRows.join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `report_attivita_${reportData.schoolYear}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Report scaricato',
        description: 'Il report delle attività è stato scaricato con successo'
      })
    } catch (error) {
      console.error('Error downloading report:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile scaricare il report delle attività'
      })
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Panoramica generale del sistema tracking recuperi
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadActivityReport}>
            <Download className="mr-2 h-4 w-4" />
            Scarica Report
          </Button>
          <Link href="/dashboard/import">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Importa Tesoretti
            </Button>
          </Link>
        </div>
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
            <div className="text-2xl font-bold">{data.totalTeachers}</div>
            <p className="text-xs text-muted-foreground">
              Docenti registrati nel sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Da Pianificare
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.modulesToPlan.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Moduli ancora da pianificare
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pianificati
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.modulesPlanned.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {data.activitiesPlanned} attività pianificate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recuperati
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.modulesCompleted.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {data.activitiesCompleted} attività completate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Attività Questa Settimana</CardTitle>
          <CardDescription>
            Riepilogo attività pianificate e completate per la settimana corrente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.weeklyActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Nessuna attività programmata per questa settimana.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Modulo</TableHead>
                  <TableHead>Docente</TableHead>
                  <TableHead>Attività</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.weeklyActivities.map((activity) => {
                  const activityDate = new Date(activity.date)
                  const teacher = activity.teacher
                  const recoveryType = activity.recovery_type

                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                        {activityDate.toLocaleDateString('it-IT', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>{activity.module_number ? `${activity.module_number}°` : '-'}</TableCell>
                      <TableCell>
                        {teacher?.cognome} {teacher?.nome}
                      </TableCell>
                      <TableCell>{activity.title}</TableCell>
                      <TableCell>
                        <Badge
                          style={{ backgroundColor: recoveryType?.color || '#3B82F6' }}
                          className="text-white"
                        >
                          {recoveryType?.name || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                          {activity.status === 'planned' ? 'Pianificato' : 'Completato'}
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
