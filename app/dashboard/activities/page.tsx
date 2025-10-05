"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Filter, Palette } from "lucide-react"
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, addDays } from "date-fns"
import { it } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

export default function ActivitiesPage() {
  const { toast } = useToast()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activities, setActivities] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [recoveryTypes, setRecoveryTypes] = useState<any[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [calendarStyle, setCalendarStyle] = useState<"default" | "minimal" | "compact" | "cards" | "modern">("compact")
  const [schoolYear, setSchoolYear] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  const modules = Array.from({ length: 10 }, (_, i) => i + 1)

  useEffect(() => {
    fetchData()
  }, [currentDate, selectedTeacher, selectedType])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch active school year
      const yearRes = await fetch("/api/school-years/active")
      const yearData = await yearRes.json()
      setSchoolYear(yearData)

      // Fetch all teachers
      const teachersRes = await fetch("/api/teachers")
      const teachersData = await teachersRes.json()
      setTeachers(teachersData.teachers || [])

      // Fetch recovery types
      const typesRes = await fetch("/api/recovery-types")
      const typesData = await typesRes.json()
      setRecoveryTypes(typesData || [])

      // Fetch activities with filters
      let url = `/api/activities?schoolYearId=${yearData.id}`
      if (selectedTeacher !== "all") {
        url += `&teacherId=${selectedTeacher}`
      }

      const activitiesRes = await fetch(url)
      const activitiesData = await activitiesRes.json()

      // Filter by week and recovery type
      let filteredActivities = activitiesData.filter((activity: any) => {
        const activityDate = new Date(activity.date)
        // Normalize to start of day for comparison
        activityDate.setHours(0, 0, 0, 0)

        const normalizedWeekStart = new Date(weekStart)
        normalizedWeekStart.setHours(0, 0, 0, 0)

        const normalizedWeekEnd = new Date(weekEnd)
        normalizedWeekEnd.setHours(23, 59, 59, 999)

        return activityDate >= normalizedWeekStart && activityDate <= normalizedWeekEnd
      })

      if (selectedType !== "all") {
        filteredActivities = filteredActivities.filter((activity: any) =>
          activity.recovery_type_id === selectedType
        )
      }

      setActivities(filteredActivities)

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

  const getActivitiesForCell = (date: Date, module: number) => {
    const cellDateStr = format(date, "yyyy-MM-dd")
    return activities.filter(activity => {
      const activityDate = new Date(activity.date)
      const activityDateStr = format(activityDate, "yyyy-MM-dd")
      return activityDateStr === cellDateStr && activity.module_number === module
    })
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attività Recupero</h1>
        <p className="text-muted-foreground">
          Vista calendario completa di tutte le attività - {schoolYear?.name}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtri:</span>
        </div>

        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tutti i docenti" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i docenti</SelectItem>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.cognome} {teacher.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tutti i tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            {recoveryTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={calendarStyle} onValueChange={(v: any) => setCalendarStyle(v)}>
          <SelectTrigger className="w-[160px]">
            <Palette className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="minimal">Minimal</SelectItem>
            <SelectItem value="compact">Compact</SelectItem>
            <SelectItem value="cards">Cards</SelectItem>
            <SelectItem value="modern">Modern</SelectItem>
          </SelectContent>
        </Select>
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
      </div>

      {/* Calendar Grid */}
      <div className={
        calendarStyle === "modern"
          ? "border-0 bg-gradient-to-br from-muted/30 to-muted/10 p-1 rounded-lg overflow-hidden"
          : calendarStyle === "minimal"
          ? "border border-border/50 shadow-sm rounded-lg overflow-hidden"
          : calendarStyle === "compact"
          ? "border-2 border-border rounded-lg overflow-hidden"
          : calendarStyle === "cards"
          ? "border-0 rounded-lg overflow-hidden"
          : "border rounded-lg overflow-hidden"
      }>
        <div className={
          calendarStyle === "modern"
            ? "grid grid-cols-6 divide-x bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm"
            : calendarStyle === "minimal"
            ? "grid grid-cols-6 divide-x bg-background border-b"
            : calendarStyle === "compact"
            ? "grid grid-cols-6 divide-x bg-muted/50"
            : calendarStyle === "cards"
            ? "grid grid-cols-6 divide-x bg-muted/30 border-b-2"
            : "grid grid-cols-6 divide-x bg-muted/50"
        }>
          <div className={
            calendarStyle === "minimal"
              ? "p-4 text-center font-semibold text-base"
              : calendarStyle === "compact"
              ? "p-2 text-center font-medium text-xs"
              : calendarStyle === "cards"
              ? "p-4 text-center font-medium text-sm"
              : calendarStyle === "modern"
              ? "p-3.5 text-center font-semibold text-sm"
              : "p-3 text-center font-medium text-sm"
          }>Modulo</div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className={
              calendarStyle === "minimal"
                ? "p-4 text-center"
                : calendarStyle === "compact"
                ? "p-2 text-center"
                : calendarStyle === "cards"
                ? "p-4 text-center"
                : calendarStyle === "modern"
                ? "p-3.5 text-center"
                : "p-3 text-center"
            }>
              <div className={
                calendarStyle === "minimal"
                  ? "font-semibold text-base mb-1"
                  : calendarStyle === "compact"
                  ? "font-semibold text-xs"
                  : calendarStyle === "cards"
                  ? "font-semibold text-sm mb-1"
                  : calendarStyle === "modern"
                  ? "font-semibold text-sm"
                  : "font-medium"
              }>{format(day, "EEE", { locale: it })}</div>
              <div className={
                calendarStyle === "minimal"
                  ? "text-sm text-muted-foreground"
                  : calendarStyle === "compact"
                  ? "text-[10px] text-muted-foreground"
                  : calendarStyle === "cards"
                  ? "text-xs text-muted-foreground"
                  : calendarStyle === "modern"
                  ? "text-xs text-muted-foreground"
                  : "text-sm text-muted-foreground"
              }>{format(day, "d MMM", { locale: it })}</div>
            </div>
          ))}
        </div>

        <div className="divide-y">
          {modules.map((module) => (
            <div key={module} className={
              calendarStyle === "modern"
                ? "grid grid-cols-6 divide-x border-t border-border/50"
                : calendarStyle === "cards"
                ? "grid grid-cols-6 divide-x border-t-0 gap-px bg-muted/20"
                : "grid grid-cols-6 divide-x border-t"
            }>
              <div className={
                calendarStyle === "minimal"
                  ? "p-3 text-center bg-background font-medium text-base"
                  : calendarStyle === "compact"
                  ? "p-2 text-center bg-muted/50 font-medium text-xs"
                  : calendarStyle === "cards"
                  ? "p-3 text-center bg-muted/40 font-medium text-sm border-r-0"
                  : calendarStyle === "modern"
                  ? "p-3 text-center bg-muted/30 font-medium text-sm"
                  : "p-3 text-center bg-muted/30 font-medium text-sm"
              }>
                {module}
              </div>
              {weekDays.map((day) => {
                const cellActivities = getActivitiesForCell(day, module)
                return (
                  <div key={`${day.toISOString()}-${module}`} className={
                    calendarStyle === "minimal"
                      ? "p-2 min-h-[100px]"
                      : calendarStyle === "compact"
                      ? "p-1.5 min-h-[60px]"
                      : calendarStyle === "cards"
                      ? "p-2 min-h-[110px] bg-background m-px rounded-lg"
                      : calendarStyle === "modern"
                      ? "p-2 min-h-[95px] backdrop-blur-sm"
                      : "p-2 min-h-[80px]"
                  }>
                    <div className="space-y-1">
                      {cellActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className={
                            calendarStyle === "minimal"
                              ? `text-xs p-3 rounded border border-border/40 transition-opacity ${activity.status === 'completed' ? 'opacity-60' : ''}`
                              : calendarStyle === "compact"
                              ? `text-xs p-1.5 rounded transition-opacity ${activity.status === 'completed' ? 'opacity-60' : ''}`
                              : calendarStyle === "cards"
                              ? `text-xs p-3 rounded shadow-sm hover:shadow-md transition-all ${activity.status === 'completed' ? 'opacity-60' : ''}`
                              : calendarStyle === "modern"
                              ? `text-xs p-2.5 rounded backdrop-blur-sm border border-white/20 transition-opacity ${activity.status === 'completed' ? 'opacity-60' : ''}`
                              : `text-xs p-2 rounded transition-opacity ${activity.status === 'completed' ? 'opacity-60' : ''}`
                          }
                          style={{
                            backgroundColor: calendarStyle === "modern"
                              ? `linear-gradient(135deg, ${activity.recovery_type?.color}15, ${activity.recovery_type?.color}05)`
                              : activity.recovery_type?.color + '20',
                            borderLeft: calendarStyle === "cards" || calendarStyle === "modern"
                              ? `4px solid ${activity.recovery_type?.color}`
                              : `3px solid ${activity.recovery_type?.color}`
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={activity.status === "completed"}
                              onChange={() => handleToggleComplete(activity.id, activity.status)}
                              className="mt-0.5 cursor-pointer"
                              title={activity.status === "completed" ? "Segna come non completata" : "Segna come completata"}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate" title={`${activity.teacher?.cognome} ${activity.teacher?.nome} - ${activity.class_name}`}>
                                {activity.teacher?.cognome} {activity.teacher?.nome?.charAt(0)}.
                              </div>
                              <div className="text-muted-foreground truncate">
                                {activity.class_name}
                              </div>
                              <div className="text-xs opacity-75 truncate">
                                {activity.recovery_type?.name}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="font-medium">Legenda tipi:</div>
        {recoveryTypes.map((type) => (
          <div key={type.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: type.color }}
            />
            <span>{type.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
