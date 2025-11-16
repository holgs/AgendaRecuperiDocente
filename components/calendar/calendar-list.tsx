"use client"

import { format, isSameDay } from "date-fns"
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

interface CalendarListProps {
  activities: Activity[]
  onActivityClick: (activity: Activity) => void
  onDeleteActivity: (activityId: string) => void
}

export function CalendarList({
  activities,
  onActivityClick,
  onDeleteActivity
}: CalendarListProps) {
  // Group activities by date
  const groupedActivities = activities.reduce((acc, activity) => {
    const date = activity.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(activity)
    return acc
  }, {} as Record<string, Activity[]>)

  // Sort dates
  const sortedDates = Object.keys(groupedActivities).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        Nessuna attività pianificata per questa settimana
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((dateStr) => {
        const date = new Date(dateStr)
        const dayActivities = groupedActivities[dateStr].sort(
          (a, b) => a.module_number - b.module_number
        )

        return (
          <div key={dateStr} className="space-y-3">
            {/* Date Header */}
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground rounded-md p-2 text-center min-w-[60px]">
                <div className="text-2xl font-bold">
                  {format(date, "d")}
                </div>
                <div className="text-xs uppercase">
                  {format(date, "MMM", { locale: it })}
                </div>
              </div>
              <div>
                <div className="font-semibold">
                  {format(date, "EEEE", { locale: it })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {dayActivities.length} {dayActivities.length === 1 ? "attività" : "attività"}
                </div>
              </div>
            </div>

            {/* Activities */}
            <div className="space-y-2 ml-[72px]">
              {dayActivities.map((activity) => {
                const isCompleted = activity.status === "completed"

                return (
                  <div
                    key={activity.id}
                    className={`
                      group border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer
                      ${isCompleted ? "bg-gray-50" : ""}
                    `}
                    onClick={() => onActivityClick(activity)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className="w-1 h-full rounded-full"
                          style={{ backgroundColor: activity.recovery_type.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              Unità Oraria {activity.module_number}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-semibold">
                              {activity.class_name}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {activity.recovery_type.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Completata</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">Pianificata</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteActivity(activity.id)
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
