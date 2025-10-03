"use client"

import { useState } from "react"
import { format, addDays, startOfWeek } from "date-fns"
import { it } from "date-fns/locale"
import { CheckCircle2, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Activity {
  id: string
  date: string
  module_number: number
  class_name: string
  status: string
  recovery_type: {
    name: string
    color: string
  }
}

interface CalendarGridProps {
  weekStart: Date
  activities: Activity[]
  onCellClick: (date: Date, module: number) => void
  onActivityClick: (activity: Activity) => void
  onDeleteActivity: (activityId: string) => void
}

export function CalendarGrid({
  weekStart,
  activities,
  onCellClick,
  onActivityClick,
  onDeleteActivity
}: CalendarGridProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  // Get activities map by date and module
  const activitiesMap = new Map<string, Activity>()
  activities.forEach((activity) => {
    const key = `${activity.date}-${activity.module_number}`
    activitiesMap.set(key, activity)
  })

  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  const modules = Array.from({ length: 10 }, (_, i) => i + 1)

  const handleCellClick = (date: Date, module: number) => {
    const key = `${format(date, "yyyy-MM-dd")}-${module}`
    const activity = activitiesMap.get(key)

    if (activity) {
      onActivityClick(activity)
    } else {
      onCellClick(date, module)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === "completed") {
      return <CheckCircle2 className="h-3 w-3 text-green-600" />
    }
    return <Clock className="h-3 w-3 text-yellow-600" />
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-[80px_repeat(5,1fr)] bg-muted">
        <div className="p-3 border-r font-semibold text-sm">Modulo</div>
        {days.map((day) => (
          <div key={day.toISOString()} className="p-3 border-r last:border-r-0 text-center">
            <div className="font-semibold text-sm">
              {format(day, "EEE", { locale: it })}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(day, "d MMM", { locale: it })}
            </div>
          </div>
        ))}
      </div>

      {/* Grid with modules */}
      {modules.map((module) => (
        <div key={module} className="grid grid-cols-[80px_repeat(5,1fr)] border-t">
          <div className="p-3 border-r font-medium text-sm bg-muted/30 flex items-center justify-center">
            {module}
          </div>
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd")
            const key = `${dateStr}-${module}`
            const activity = activitiesMap.get(key)
            const isHovered = hoveredCell === key
            const isCompleted = activity?.status === "completed"

            return (
              <div
                key={key}
                className={`
                  p-2 border-r last:border-r-0 min-h-[80px] cursor-pointer transition-colors
                  ${activity ? "hover:opacity-80" : "hover:bg-muted/50"}
                  ${isCompleted ? "bg-gray-100" : ""}
                `}
                onClick={() => handleCellClick(day, module)}
                onMouseEnter={() => setHoveredCell(key)}
                onMouseLeave={() => setHoveredCell(null)}
              >
                {activity ? (
                  <div
                    className={`relative h-full rounded-md p-2 ${isCompleted ? "opacity-60" : ""}`}
                    style={{
                      backgroundColor: `${activity.recovery_type.color}20`,
                      borderLeft: `3px solid ${activity.recovery_type.color}`
                    }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {activity.class_name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          {getStatusIcon(activity.status)}
                        </div>
                      </div>
                      {!isCompleted && isHovered && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteActivity(activity.id)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground/20">
                    <span className="text-2xl">+</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
