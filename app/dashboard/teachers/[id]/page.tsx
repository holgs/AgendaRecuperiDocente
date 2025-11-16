"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TeacherDetailCard } from "@/components/teachers/teacher-detail-card"
import { ActivityDialog } from "@/components/calendar/activity-dialog"
import { ArrowLeft, Calendar, Loader2, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { it } from "date-fns/locale"

type Teacher = {
  id: string
  nome: string
  cognome: string
  email: string | null
}

type BudgetStats = {
  id: string
  modulesAnnual: number
  modulesUsed: number
  modulesAvailable: number
  minutesAnnual: number
  minutesUsed: number
  minutesAvailable: number
  percentageUsed: number
}

type ActivityStats = {
  toPlan: number
  planned: number
  completed: number
}

type Activity = {
  id: string
  date: string
  duration_minutes: number
  modules_equivalent: number
  title: string | null
  description: string | null
  status: string
  module_number: number | null
  class_name: string | null
  recovery_type_id: string
  recovery_type: {
    name: string
    color: string
  } | null
}

type TeacherDetailData = {
  teacher: Teacher
  budget: BudgetStats | null
  activityStats: ActivityStats
  activities: Activity[]
  activeYear: {
    id: string
    name: string
  }
}

export default function TeacherDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<TeacherDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | undefined>()
  const [recoveryTypes, setRecoveryTypes] = useState<any[]>([])

  useEffect(() => {
    fetchTeacherDetail()
  }, [params.id])

  async function fetchTeacherDetail() {
    try {
      const response = await fetch(`/api/teachers/${params.id}`)

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            variant: 'destructive',
            title: 'Docente non trovato',
            description: 'Il docente richiesto non esiste',
          })
          router.push('/dashboard/teachers')
          return
        }
        throw new Error('Failed to fetch teacher details')
      }

      const teacherData = await response.json()
      setData(teacherData)

      // Fetch recovery types for dialog
      const typesRes = await fetch("/api/recovery-types")
      const typesData = await typesRes.json()
      setRecoveryTypes(typesData || [])
    } catch (error) {
      console.error('Error fetching teacher details:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare i dettagli del docente',
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handlePlanClick() {
    router.push(`/dashboard/teachers/${params.id}/calendar`)
  }

  function handleEditActivity(activity: Activity) {
    setSelectedActivity(activity)
    setDialogOpen(true)
  }

  async function handleDeleteActivity(activityId: string) {
    if (!confirm("Sei sicuro di voler eliminare questa attività?")) {
      return
    }

    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "DELETE"
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      toast({
        title: "Successo",
        description: "Attività eliminata"
      })

      fetchTeacherDetail()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare l'attività",
        variant: "destructive"
      })
    }
  }

  function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" {
    switch (status) {
      case 'completed':
        return 'default'
      case 'planned':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'completed':
        return 'Recuperato'
      case 'planned':
        return 'Pianificato'
      case 'cancelled':
        return 'Annullato'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/teachers')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {data.teacher.cognome} {data.teacher.nome}
              </h1>
              <p className="text-muted-foreground">
                {data.teacher.email || 'Nessuna email'}
                {data.activeYear && ` • Anno ${data.activeYear.name}`}
              </p>
            </div>
          </div>
        </div>
        <Button onClick={handlePlanClick}>
          <Calendar className="mr-2 h-4 w-4" />
          Pianifica Recuperi
        </Button>
      </div>

      {/* Budget Summary Card */}
      <TeacherDetailCard budget={data.budget} activityStats={data.activityStats} />

      {/* Activities Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Attività di Recupero</h2>
          <p className="text-sm text-muted-foreground">
            Totale: {data.activities.length} attività
          </p>
        </div>

        {data.activities.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              Nessuna attività registrata per questo docente.
            </p>
            <Button className="mt-4" onClick={handlePlanClick}>
              <Calendar className="mr-2 h-4 w-4" />
              Inizia a Pianificare
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Unità Oraria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Titolo</TableHead>
                  <TableHead className="text-right">Durata</TableHead>
                  <TableHead className="text-right">Unità Orarie</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">
                      {format(new Date(activity.date), 'dd MMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      {activity.module_number ? `${activity.module_number}°` : '-'}
                    </TableCell>
                    <TableCell>
                      {activity.recovery_type ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: activity.recovery_type.color }}
                          />
                          {activity.recovery_type.name}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{activity.class_name || '-'}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {activity.title || activity.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {activity.duration_minutes} min
                    </TableCell>
                    <TableCell className="text-right">
                      {activity.modules_equivalent?.toFixed(1) || '0.0'}
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
                          onClick={() => handleEditActivity(activity)}
                          disabled={activity.status === 'completed'}
                          title={activity.status === 'completed' ? 'Impossibile modificare attività completata' : 'Modifica attività'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteActivity(activity.id)}
                          disabled={activity.status === 'completed'}
                          title={activity.status === 'completed' ? 'Impossibile eliminare attività completata' : 'Elimina attività'}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Activity Dialog */}
      {data && (
        <ActivityDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          teacherId={params.id}
          schoolYearId={data.activeYear.id}
          recoveryTypes={recoveryTypes}
          activity={selectedActivity}
          onSuccess={() => {
            fetchTeacherDetail()
            setSelectedActivity(undefined)
          }}
        />
      )}
    </div>
  )
}
