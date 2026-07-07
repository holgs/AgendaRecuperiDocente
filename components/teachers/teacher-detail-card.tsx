import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { formatHoursMinutes } from "@/lib/time"

type BudgetStats = {
  minutesAnnual: number
  minutesUsed: number
  minutesAvailable: number
  percentageUsed: number
}

// All figures are in MINUTES (Punto 3)
type ActivityStats = {
  toPlan: number
  planned: number
  completed: number
}

type TeacherDetailCardProps = {
  budget: BudgetStats | null
  activityStats: ActivityStats
}

export function TeacherDetailCard({ budget, activityStats }: TeacherDetailCardProps) {
  if (!budget) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo Tesoretto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nessun tesoretto configurato per questo docente nell'anno scolastico attivo.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getUsageVariant = (percentage: number): "default" | "secondary" | "destructive" => {
    if (percentage >= 80) return "destructive"
    if (percentage >= 50) return "secondary"
    return "default"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riepilogo Tesoretto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Utilizzo Complessivo</span>
            <span className="text-muted-foreground">
              {formatHoursMinutes(budget.minutesUsed)} / {formatHoursMinutes(budget.minutesAnnual)}
            </span>
          </div>
          <Progress value={budget.percentageUsed} className="h-2" />
          <div className="flex justify-end">
            <Badge variant={getUsageVariant(budget.percentageUsed)}>
              {budget.percentageUsed}% utilizzato
            </Badge>
          </div>
        </div>

        {/* Statistics Grid (minutes) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Monte ore annuo</p>
            <p className="text-2xl font-bold">{formatHoursMinutes(budget.minutesAnnual)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Da Pianificare</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatHoursMinutes(activityStats.toPlan)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Pianificati</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatHoursMinutes(activityStats.planned)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Recuperati</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatHoursMinutes(activityStats.completed)}
            </p>
          </div>
        </div>

        {/* Available Highlight */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Minuti Disponibili</p>
              <p className="text-xs text-muted-foreground">
                Ancora da utilizzare o pianificare
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{formatHoursMinutes(budget.minutesAvailable)}</p>
              <p className="text-xs text-muted-foreground">
                {budget.minutesAvailable} minuti
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
