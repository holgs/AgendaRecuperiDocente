"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, LayoutGrid, List, CheckCircle2 } from "lucide-react"
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from "date-fns"
import { it } from "date-fns/locale"
import { CalendarGrid } from "@/components/calendar/calendar-grid"
import { CalendarList } from "@/components/calendar/calendar-list"
import { ActivityDialog } from "@/components/calendar/activity-dialog"
import { useToast } from "@/hooks/use-toast"

export default function TeacherCalendarPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<"week" | "month">("week")
  const [displayMode, setDisplayMode] = useState<"grid" | "list">("grid")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedModule, setSelectedModule] = useState<number | undefined>()
  const [selectedActivity, setSelectedActivity] = useState<any>(undefined)

  const [activities, setActivities] = useState<any[]>([])
  const [recoveryTypes, setRecoveryTypes] = useState<any[]>([])
  const [teacher, setTeacher] = useState<any>(null)
  const [schoolYear, setSchoolYear] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sessionCounter, setSessionCounter] = useState(0)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

  // Fetch data
  useEffect(() => {
    fetchData()
  }, [params.id, currentDate])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch teacher details
      const teacherRes = await fetch(`/api/teachers/${params.id}`)
      const teacherData = await teacherRes.json()
      setTeacher(teacherData.teacher)
      setSchoolYear(teacherData.activeYear)

      // Fetch activities for current week
      const activitiesRes = await fetch(
        `/api/activities?teacherId=${params.id}&schoolYearId=${teacherData.activeYear.id}`
      )
      const activitiesData = await activitiesRes.json()

      // Filter activities for current week
      const weekActivities = activitiesData.filter((activity: any) => {
        const activityDate = new Date(activity.date)
        // Normalize to start of day for comparison
        activityDate.setHours(0, 0, 0, 0)

        const normalizedWeekStart = new Date(weekStart)
        normalizedWeekStart.setHours(0, 0, 0, 0)

        const normalizedWeekEnd = new Date(weekEnd)
        normalizedWeekEnd.setHours(23, 59, 59, 999)

        return activityDate >= normalizedWeekStart && activityDate <= normalizedWeekEnd
      })

      setActivities(weekActivities)

      // Fetch recovery types
      const typesRes = await fetch("/api/recovery-types")
      const typesData = await typesRes.json()
      setRecoveryTypes(typesData || [])

    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCellClick = (date: Date, module: number) => {
    setSelectedDate(date)
    setSelectedModule(module)
    setSelectedActivity(undefined)
    setDialogOpen(true)
  }

  const handleNewActivity = () => {
    setSelectedDate(undefined)
    setSelectedModule(undefined)
    setSelectedActivity(undefined)
    setDialogOpen(true)
  }

  const handleActivityClick = (activity: any) => {
    // Open dialog in edit mode
    setSelectedActivity(activity)
    setSelectedDate(undefined)
    setSelectedModule(undefined)
    setDialogOpen(true)
  }

  const handleDeleteActivity = async (activityId: string) => {
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

      fetchData()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare l'attività",
        variant: "destructive"
      })
    }
  }

  const handleToggleComplete = async (activityId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "planned" : "completed"

    try {
      const res = await fetch(`/api/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) {
        throw new Error("Errore durante l'aggiornamento")
      }

      toast({
        title: "Successo",
        description: newStatus === "completed" ? "Attività completata" : "Attività riaperta"
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare l'attività",
        variant: "destructive"
      })
    }
  }

  const previousWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
  const today = () => setCurrentDate(new Date())

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/teachers/${params.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendario Pianificazione</h1>
            <p className="text-muted-foreground">
              {teacher?.cognome} {teacher?.nome} - {schoolYear?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {sessionCounter > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{sessionCounter} attività inserite</span>
            </div>
          )}
          <Button onClick={handleNewActivity}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova Attività
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={previousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={today}>
            Oggi
          </Button>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-4 font-semibold">
            {format(weekStart, "d MMM", { locale: it })} -{" "}
            {format(weekEnd, "d MMM yyyy", { locale: it })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={displayMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setDisplayMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={displayMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setDisplayMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <Tabs value={viewType} onValueChange={(v) => setViewType(v as "week" | "month")}>
        <TabsList>
          <TabsTrigger value="week">Settimana</TabsTrigger>
          <TabsTrigger value="month">Mese</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-6">
          {displayMode === "grid" ? (
            <CalendarGrid
              weekStart={weekStart}
              activities={activities}
              onCellClick={handleCellClick}
              onActivityClick={handleActivityClick}
              onDeleteActivity={handleDeleteActivity}
              onToggleComplete={handleToggleComplete}
            />
          ) : (
            <CalendarList
              activities={activities}
              onActivityClick={handleActivityClick}
              onDeleteActivity={handleDeleteActivity}
            />
          )}
        </TabsContent>

        <TabsContent value="month" className="mt-6">
          <div className="border rounded-lg p-12 text-center text-muted-foreground">
            Vista mensile in sviluppo
          </div>
        </TabsContent>
      </Tabs>

      {/* Activity Dialog */}
      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        teacherId={params.id}
        schoolYearId={schoolYear?.id}
        recoveryTypes={recoveryTypes}
        defaultDate={selectedDate}
        defaultModule={selectedModule}
        activity={selectedActivity}
        onSuccess={(incrementCounter) => {
          if (incrementCounter) {
            setSessionCounter(prev => prev + 1)
          }
          fetchData()
        }}
      />
    </div>
  )
}
