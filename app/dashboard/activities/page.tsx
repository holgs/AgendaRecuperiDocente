"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Filter } from "lucide-react"
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

      console.log("🔍 GLOBAL CALENDAR - Fetching from:", url)
      const activitiesRes = await fetch(url)
      const activitiesData = await activitiesRes.json()
      console.log("📦 GLOBAL CALENDAR - Fetched activities:", activitiesData.length, activitiesData)

      // Week range for debugging
      console.log("📅 GLOBAL CALENDAR - Week range:", {
        weekStart: format(weekStart, "yyyy-MM-dd"),
        weekEnd: format(weekEnd, "yyyy-MM-dd")
      })

      // Filter by week and recovery type
      let filteredActivities = activitiesData.filter((activity: any) => {
        const activityDate = new Date(activity.date)
        // Normalize to start of day for comparison
        activityDate.setHours(0, 0, 0, 0)

        const normalizedWeekStart = new Date(weekStart)
        normalizedWeekStart.setHours(0, 0, 0, 0)

        const normalizedWeekEnd = new Date(weekEnd)
        normalizedWeekEnd.setHours(23, 59, 59, 999)

        const inRange = activityDate >= normalizedWeekStart && activityDate <= normalizedWeekEnd

        console.log(`📅 Activity ${activity.id}:`, {
          date: activity.date,
          formatted: format(activityDate, "yyyy-MM-dd"),
          inRange,
          activityDate: activityDate.getTime(),
          weekStart: normalizedWeekStart.getTime(),
          weekEnd: normalizedWeekEnd.getTime()
        })

        return inRange
      })

      console.log("✅ GLOBAL CALENDAR - After week filter:", filteredActivities.length, filteredActivities)

      if (selectedType !== "all") {
        filteredActivities = filteredActivities.filter((activity: any) =>
          activity.recovery_type_id === selectedType
        )
        console.log("✅ GLOBAL CALENDAR - After type filter:", filteredActivities.length)
      }

      setActivities(filteredActivities)
      console.log("💾 GLOBAL CALENDAR - Final activities set:", filteredActivities.length)

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
    const result = activities.filter(activity => {
      const activityDate = new Date(activity.date)
      const activityDateStr = format(activityDate, "yyyy-MM-dd")
      const match = activityDateStr === cellDateStr && activity.module_number === module

      if (match) {
        console.log(`🎯 CELL MATCH - Date: ${cellDateStr}, Module: ${module}`, activity)
      }

      return match
    })

    return result
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

      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <div className="font-medium text-blue-900 mb-1">🔍 Debug Info:</div>
        <div className="text-blue-700">
          Attività caricate: <strong>{activities.length}</strong> |
          Settimana: <strong>{format(weekStart, "d MMM", { locale: it })} - {format(weekEnd, "d MMM yyyy", { locale: it })}</strong>
        </div>
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
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-6 divide-x bg-muted/50">
          <div className="p-3 text-center font-medium text-sm">Modulo</div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-3 text-center">
              <div className="font-medium">{format(day, "EEE", { locale: it })}</div>
              <div className="text-sm text-muted-foreground">{format(day, "d MMM", { locale: it })}</div>
            </div>
          ))}
        </div>

        <div className="divide-y">
          {modules.map((module) => (
            <div key={module} className="grid grid-cols-6 divide-x">
              <div className="p-3 text-center bg-muted/30 font-medium text-sm">
                {module}
              </div>
              {weekDays.map((day) => {
                const cellActivities = getActivitiesForCell(day, module)
                return (
                  <div key={`${day.toISOString()}-${module}`} className="p-2 min-h-[80px]">
                    <div className="space-y-1">
                      {cellActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="text-xs p-2 rounded cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: activity.recovery_type?.color + '20',
                            borderLeft: `3px solid ${activity.recovery_type?.color}`
                          }}
                          title={`${activity.teacher?.cognome} ${activity.teacher?.nome} - ${activity.class_name}`}
                        >
                          <div className="font-medium truncate">
                            {activity.teacher?.cognome} {activity.teacher?.nome?.charAt(0)}.
                          </div>
                          <div className="text-muted-foreground truncate">
                            {activity.class_name}
                          </div>
                          <div className="text-xs opacity-75 truncate">
                            {activity.recovery_type?.name}
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
