"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import {
  Loader2,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Pencil,
  Trash2
} from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

type BudgetData = {
  id: string
  school_year_id: string
  school_year_name: string
  minutes_weekly: number
  minutes_annual: number
  minutes_used: number
  minutes_remaining: number
  modules_annual: number
  modules_used: number
  modules_remaining: number
  percentage_used: number
}

type Activity = {
  id: string
  date: string
  module_number: number
  class_name: string
  title: string
  description: string | null
  duration_minutes: number
  modules_equivalent: number
  status: string
  recovery_type: {
    id: string
    name: string
    color: string
  } | null
  school_year: {
    id: string
    name: string
  } | null
}

type DashboardData = {
  teacher: {
    id: string
    display_name: string
    email: string
  }
  currentBudget: BudgetData | null
  message: string | null
}

export default function TeacherDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    fetchActivities()
  }, [])

  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/teachers/me')

      if (!response.ok) {
        throw new Error('Errore nel caricamento del profilo')
      }

      const profileData = await response.json()
      setData(profileData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare i dati del profilo',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch('/api/teachers/me/activities')

      if (!response.ok) {
        throw new Error('Errore nel caricamento delle attività')
      }

      const activityData = await response.json()
      setActivities(activityData.activities || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare le attività',
      })
    } finally {
      setIsLoadingActivities(false)
    }
  }

  async function handleDeleteActivity(activityId: string) {
    if (!confirm('Sei sicuro di voler eliminare questa attività?')) {
      return
    }

    try {
      const response = await fetch(`/api/teachers/me/activities/${activityId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Errore durante l\'eliminazione')
      }

      toast({
        title: 'Successo',
        description: 'Attività eliminata con successo',
      })

      // Refresh both budget and activities
      fetchDashboardData()
      fetchActivities()
    } catch (error) {
      console.error('Error deleting activity:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile eliminare l\'attività',
      })
    }
  }

  function getBudgetStatusVariant(percentage: number): "default" | "secondary" | "destructive" {
    if (percentage >= 90) return "destructive"
    if (percentage >= 70) return "secondary"
    return "default"
  }

  function getStatusBadgeVariant(status: string): "default" | "secondary" {
    return status === 'completed' ? 'default' : 'secondary'
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return 'Completato'
      case 'planned':
        return 'Pianificato'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  // Show error if no budget available
  if (!data.currentBudget) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Budget Non Disponibile
            </CardTitle>
            <CardDescription>
              {data.message || 'Il budget per l\'anno scolastico corrente non è ancora stato caricato'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Contatta l'amministrazione per verificare lo stato del tuo budget annuale.
            </p>
            <Button onClick={() => router.push('/login')} variant="outline">
              Torna al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const budget = data.currentBudget
  const planned = activities.filter(a => a.status === 'planned').length
  const completed = activities.filter(a => a.status === 'completed').length

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Docente</h1>
        <p className="text-muted-foreground">
          Benvenuto, {data.teacher.display_name} • {budget.school_year_name}
        </p>
      </div>

      {/* Budget Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Il Tuo Tesoretto</CardTitle>
          <CardDescription>
            Stato del budget per l'anno scolastico {budget.school_year_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Utilizzo Complessivo</span>
              <span className="text-muted-foreground">
                {budget.modules_used} / {budget.modules_annual} moduli
              </span>
            </div>
            <Progress value={budget.percentage_used} className="h-3" />
            <div className="flex justify-end">
              <Badge variant={getBudgetStatusVariant(budget.percentage_used)}>
                {budget.percentage_used}% utilizzato
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Moduli Totali</p>
              <p className="text-2xl font-bold">{budget.modules_annual}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Moduli Usati</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {budget.modules_used}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Moduli Disponibili</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {budget.modules_remaining}
              </p>
            </div>
          </div>

          {/* Warning for low budget */}
          {budget.modules_remaining === 0 && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">
                ⚠️ Budget esaurito: non puoi creare nuove attività. Contatta l'amministrazione.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Attività</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pianificate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {planned}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Le Tue Attività di Recupero</CardTitle>
              <CardDescription>
                Visualizza e gestisci le tue attività pianificate e completate
              </CardDescription>
            </div>
            <Button
              disabled={budget.modules_remaining === 0}
              title={budget.modules_remaining === 0 ? 'Budget esaurito' : 'Crea nuova attività'}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crea Attività
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingActivities ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Nessuna attività creata. Clicca "Crea Attività" per iniziare.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Modulo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Titolo</TableHead>
                  <TableHead className="text-right">Durata</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">
                      {format(new Date(activity.date), 'dd MMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>{activity.module_number}°</TableCell>
                    <TableCell>
                      {activity.recovery_type && (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: activity.recovery_type.color }}
                          />
                          <span className="text-sm">{activity.recovery_type.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{activity.class_name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {activity.title}
                    </TableCell>
                    <TableCell className="text-right">
                      {activity.duration_minutes} min
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(activity.status)}>
                        {getStatusLabel(activity.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={activity.status === 'completed'}
                          title={activity.status === 'completed' ? 'Impossibile modificare attività completata' : 'Modifica'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteActivity(activity.id)}
                          disabled={activity.status === 'completed'}
                          title={activity.status === 'completed' ? 'Impossibile eliminare attività completata' : 'Elimina'}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
