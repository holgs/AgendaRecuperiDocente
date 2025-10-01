import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Users, BookOpen, Activity, TrendingUp } from "lucide-react"
import { formatDate, calculateModules, calculatePercentageUsed } from "@/lib/utils"

async function getDashboardData() {
  const supabase = await createClient()

  // Get all teachers count
  const { count: teachersCount } = await supabase
    .from("teachers")
    .select("*", { count: "exact", head: true })

  // Get current school year
  const { data: currentYear } = await supabase
    .from("school_years")
    .select("*")
    .eq("is_active", true)
    .single()

  // Get budgets for current year
  const { data: budgets } = await supabase
    .from("teacher_budgets")
    .select(`
      *,
      teachers (
        cognome,
        nome
      )
    `)
    .eq("school_year_id", currentYear?.id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Calculate total modules and usage
  const totalModules = budgets?.reduce((sum, b) => sum + (b.modules_annual || 0), 0) || 0
  const usedModules = budgets?.reduce((sum, b) => sum + (b.modules_used || 0), 0) || 0
  const avgPercentage = budgets?.length
    ? budgets.reduce((sum, b) => {
        const used = calculatePercentageUsed(b.minutes_used || 0, b.minutes_annual || 0)
        return sum + used
      }, 0) / budgets.length
    : 0

  // Get recent activities count
  const { count: activitiesCount } = await supabase
    .from("recovery_activities")
    .select("*", { count: "exact", head: true })
    .eq("school_year_id", currentYear?.id)

  return {
    teachersCount: teachersCount || 0,
    totalModules,
    usedModules,
    avgPercentage: Number(avgPercentage.toFixed(1)),
    activitiesCount: activitiesCount || 0,
    budgets: budgets || [],
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica generale del sistema tracking recuperi
        </p>
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
            <div className="text-2xl font-bold">{data.teachersCount}</div>
            <p className="text-xs text-muted-foreground">
              Docenti registrati nel sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Moduli Disponibili
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalModules.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Totale moduli annuali assegnati
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilizzo Medio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgPercentage}%</div>
            <p className="text-xs text-muted-foreground">
              Percentuale media di utilizzo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Attività Registrate
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activitiesCount}</div>
            <p className="text-xs text-muted-foreground">
              Attività di recupero totali
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Teachers Budget */}
      <Card>
        <CardHeader>
          <CardTitle>Tesoretti Docenti</CardTitle>
          <CardDescription>
            Ultimi tesoretti importati o aggiornati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.budgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Nessun tesoretto trovato. Inizia importando i dati dei docenti.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Docente</TableHead>
                  <TableHead>Moduli Annuali</TableHead>
                  <TableHead>Moduli Utilizzati</TableHead>
                  <TableHead>Moduli Disponibili</TableHead>
                  <TableHead>Utilizzo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.budgets.map((budget) => {
                  const teacher = budget.teachers as any
                  const modulesRemaining = (budget.modules_annual || 0) - (budget.modules_used || 0)
                  const percentageUsed = calculatePercentageUsed(
                    budget.minutes_used || 0,
                    budget.minutes_annual || 0
                  )

                  let statusVariant: "success" | "warning" | "critical" = "success"
                  if (percentageUsed >= 80) statusVariant = "critical"
                  else if (percentageUsed >= 50) statusVariant = "warning"

                  return (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">
                        {teacher?.cognome} {teacher?.nome}
                      </TableCell>
                      <TableCell>{budget.modules_annual?.toFixed(1)}</TableCell>
                      <TableCell>{budget.modules_used?.toFixed(1) || "0.0"}</TableCell>
                      <TableCell>{modulesRemaining.toFixed(1)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant}>
                          {percentageUsed}%
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
