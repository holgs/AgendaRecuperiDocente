"use client"

import { useState } from "react"
import { format, addDays } from "date-fns"
import { it } from "date-fns/locale"
import { CheckCircle2, Clock, X, Calendar, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

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
  onToggleComplete?: (activityId: string, currentStatus: string) => void
  variant?: "default" | "minimal" | "compact" | "cards" | "modern"
}

// Container variants
const containerVariants = cva(
  "rounded-lg overflow-hidden",
  {
    variants: {
      variant: {
        default: "border",
        minimal: "border border-border/50 shadow-sm",
        compact: "border-2 border-border",
        cards: "border-0",
        modern: "border-0 bg-gradient-to-br from-muted/30 to-muted/10 p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Header variants
const headerVariants = cva(
  "grid grid-cols-[80px_repeat(5,1fr)]",
  {
    variants: {
      variant: {
        default: "bg-muted",
        minimal: "bg-background border-b",
        compact: "bg-muted/50",
        cards: "bg-muted/30 border-b-2",
        modern: "bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Cell variants
const cellVariants = cva(
  "p-2 border-r last:border-r-0 cursor-pointer transition-all duration-200",
  {
    variants: {
      variant: {
        default: "min-h-[80px] hover:bg-muted/50",
        minimal: "min-h-[100px] hover:bg-muted/30",
        compact: "min-h-[60px] hover:bg-accent/50",
        cards: "min-h-[110px] hover:scale-[1.02] hover:shadow-md",
        modern: "min-h-[95px] hover:bg-primary/5 hover:backdrop-blur-sm",
      },
      hasActivity: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        hasActivity: true,
        className: "hover:opacity-80",
      },
      {
        variant: "minimal",
        hasActivity: true,
        className: "hover:opacity-90",
      },
      {
        variant: "compact",
        hasActivity: true,
        className: "hover:brightness-95",
      },
      {
        variant: "cards",
        hasActivity: true,
        className: "hover:scale-100",
      },
      {
        variant: "modern",
        hasActivity: true,
        className: "hover:brightness-95",
      },
    ],
    defaultVariants: {
      variant: "default",
      hasActivity: false,
    },
  }
)

// Activity card variants
const activityCardVariants = cva(
  "relative h-full rounded-md transition-all duration-200",
  {
    variants: {
      variant: {
        default: "p-2",
        minimal: "p-3 border border-border/40",
        compact: "p-1.5",
        cards: "p-3 shadow-sm hover:shadow-md",
        modern: "p-2.5 backdrop-blur-sm border border-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export function CalendarGrid({
  weekStart,
  activities,
  onCellClick,
  onActivityClick,
  onDeleteActivity,
  onToggleComplete,
  variant = "default"
}: CalendarGridProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  // Get activities map by date and module
  const activitiesMap = new Map<string, Activity>()
  activities.forEach((activity) => {
    const activityDate = new Date(activity.date)
    const formattedDate = format(activityDate, "yyyy-MM-dd")
    const key = `${formattedDate}-${activity.module_number}`
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
      return <CheckCircle2 className={cn(
        "text-green-600",
        variant === "minimal" && "h-4 w-4",
        variant === "compact" && "h-3 w-3",
        variant === "cards" && "h-4 w-4",
        variant === "modern" && "h-3.5 w-3.5",
        variant === "default" && "h-3 w-3"
      )} />
    }
    return <Clock className={cn(
      "text-yellow-600",
      variant === "minimal" && "h-4 w-4",
      variant === "compact" && "h-3 w-3",
      variant === "cards" && "h-4 w-4",
      variant === "modern" && "h-3.5 w-3.5",
      variant === "default" && "h-3 w-3"
    )} />
  }

  const renderEmptyCell = () => {
    switch (variant) {
      case "minimal":
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground/10">
            <Calendar className="h-8 w-8" />
          </div>
        )
      case "compact":
        return null
      case "cards":
        return (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20 gap-2">
            <div className="rounded-full bg-muted/40 p-2">
              <span className="text-xl">+</span>
            </div>
            <span className="text-xs">Aggiungi</span>
          </div>
        )
      case "modern":
        return (
          <div className="h-full flex items-center justify-center">
            <div className="rounded-lg bg-primary/5 border border-dashed border-primary/20 p-3 hover:bg-primary/10 transition-colors">
              <span className="text-xl text-primary/40">+</span>
            </div>
          </div>
        )
      default:
        return (
          <div className="h-full flex items-center justify-center text-muted-foreground/20">
            <span className="text-2xl">+</span>
          </div>
        )
    }
  }

  const renderActivity = (activity: Activity, key: string) => {
    const isHovered = hoveredCell === key
    const isCompleted = activity.status === "completed"

    return (
      <div
        className={cn(
          activityCardVariants({ variant }),
          isCompleted && "opacity-60"
        )}
        style={{
          backgroundColor: variant === "modern"
            ? `linear-gradient(135deg, ${activity.recovery_type.color}15, ${activity.recovery_type.color}05)`
            : `${activity.recovery_type.color}20`,
          borderLeft: variant === "cards" || variant === "modern"
            ? `4px solid ${activity.recovery_type.color}`
            : `3px solid ${activity.recovery_type.color}`
        }}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-start gap-1 flex-1 min-w-0">
            {onToggleComplete && (
              <input
                type="checkbox"
                checked={activity.status === "completed"}
                onChange={(e) => {
                  e.stopPropagation()
                  onToggleComplete(activity.id, activity.status)
                }}
                className={cn(
                  "cursor-pointer",
                  variant === "minimal" && "mt-1 h-4 w-4",
                  variant === "compact" && "mt-0 h-3 w-3",
                  variant === "cards" && "mt-1 h-4 w-4 accent-primary",
                  variant === "modern" && "mt-0.5 h-3.5 w-3.5 accent-primary",
                  variant === "default" && "mt-0.5"
                )}
                title={activity.status === "completed" ? "Segna come non completata" : "Segna come completata"}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className={cn(
                "font-medium truncate",
                variant === "minimal" && "text-base mb-1",
                variant === "compact" && "text-xs",
                variant === "cards" && "text-sm mb-1",
                variant === "modern" && "text-sm",
                variant === "default" && "text-sm"
              )}>
                {activity.class_name}
              </div>

              {variant === "cards" && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  <span className="truncate">{activity.recovery_type.name}</span>
                </div>
              )}

              {variant === "modern" && (
                <div className="text-xs text-muted-foreground mt-0.5 truncate font-medium" style={{ color: activity.recovery_type.color }}>
                  {activity.recovery_type.name}
                </div>
              )}

              {!onToggleComplete && variant !== "compact" && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {getStatusIcon(activity.status)}
                </div>
              )}
            </div>
          </div>
          {!isCompleted && isHovered && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hover:bg-destructive hover:text-destructive-foreground",
                variant === "minimal" && "h-6 w-6",
                variant === "compact" && "h-4 w-4",
                variant === "cards" && "h-6 w-6",
                variant === "modern" && "h-5 w-5",
                variant === "default" && "h-5 w-5"
              )}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteActivity(activity.id)
              }}
            >
              <X className={cn(
                variant === "minimal" && "h-4 w-4",
                variant === "compact" && "h-3 w-3",
                variant === "cards" && "h-4 w-4",
                variant === "modern" && "h-3 w-3",
                variant === "default" && "h-3 w-3"
              )} />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={containerVariants({ variant })}>
      {/* Header with days */}
      <div className={headerVariants({ variant })}>
        <div className={cn(
          "p-3 border-r font-semibold",
          variant === "minimal" && "text-base py-4",
          variant === "compact" && "text-xs py-2",
          variant === "cards" && "text-sm py-4",
          variant === "modern" && "text-sm py-3.5",
          variant === "default" && "text-sm"
        )}>
          Modulo
        </div>
        {days.map((day) => (
          <div key={day.toISOString()} className={cn(
            "p-3 border-r last:border-r-0 text-center",
            variant === "minimal" && "py-4",
            variant === "compact" && "py-2",
            variant === "cards" && "py-4",
            variant === "modern" && "py-3.5"
          )}>
            <div className={cn(
              "font-semibold",
              variant === "minimal" && "text-base mb-1",
              variant === "compact" && "text-xs",
              variant === "cards" && "text-sm mb-1",
              variant === "modern" && "text-sm",
              variant === "default" && "text-sm"
            )}>
              {format(day, "EEE", { locale: it })}
            </div>
            <div className={cn(
              "text-muted-foreground",
              variant === "minimal" && "text-sm",
              variant === "compact" && "text-[10px]",
              variant === "cards" && "text-xs",
              variant === "modern" && "text-xs",
              variant === "default" && "text-xs"
            )}>
              {format(day, "d MMM", { locale: it })}
            </div>
          </div>
        ))}
      </div>

      {/* Grid with modules */}
      {modules.map((module) => (
        <div key={module} className={cn(
          "grid grid-cols-[80px_repeat(5,1fr)] border-t",
          variant === "cards" && "border-t-0 gap-px bg-muted/20",
          variant === "modern" && "border-t border-border/50"
        )}>
          <div className={cn(
            "p-3 border-r font-medium flex items-center justify-center",
            variant === "minimal" && "text-base bg-background",
            variant === "compact" && "text-xs py-2 bg-muted/50",
            variant === "cards" && "text-sm bg-muted/40 border-r-0",
            variant === "modern" && "text-sm bg-muted/30",
            variant === "default" && "text-sm bg-muted/30"
          )}>
            {module}
          </div>
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd")
            const key = `${dateStr}-${module}`
            const activity = activitiesMap.get(key)
            const isCompleted = activity?.status === "completed"

            return (
              <div
                key={key}
                className={cn(
                  cellVariants({
                    variant,
                    hasActivity: !!activity
                  }),
                  isCompleted && variant === "default" && "bg-gray-100",
                  variant === "cards" && "bg-background m-px rounded-lg",
                  variant === "modern" && "backdrop-blur-sm"
                )}
                onClick={() => handleCellClick(day, module)}
                onMouseEnter={() => setHoveredCell(key)}
                onMouseLeave={() => setHoveredCell(null)}
              >
                {activity ? renderActivity(activity, key) : renderEmptyCell()}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
