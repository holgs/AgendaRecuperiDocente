"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Users, BookOpen, Activity, TrendingUp, Upload, Loader2 } from "lucide-react"
import { formatDate, calculateModules, calculatePercentageUsed } from "@/lib/utils"

type DashboardData = {
  teachersCount: number
  totalModules: number
  usedModules: number
  avgPercentage: number
  activitiesCount: number
  budgets: any[]
  currentSchoolYear: any
}

export default function DashboardPage() {
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // Fetch all data in parallel
      const [teachersRes, schoolYearsRes, budgetsRes, activitiesRes] = await Promise.all([
        fetch('/api/teachers'),
        fetch('/api/school-years'),
        fetch('/api/budgets'),
        fetch('/api/activities')
      ])

      const teachers = teachersRes.ok ? await teachersRes.json() : []
      const schoolYears = schoolYearsRes.ok ? await schoolYearsRes.json() : []
      const budgets = budgetsRes.ok ? await budgetsRes.json() : []
      const activities = activitiesRes.ok ? await activitiesRes.json() : []

      const currentYear = schoolYears.find((y: any) => y.is_active)
      const totalModules = budgets.reduce((sum: number, b: any) => sum + (b.modules_annual || 0), 0)
      const usedModules = budgets.reduce((sum: number, b: any) => sum + (b.modules_used || 0), 0)
      const avgPercentage = budgets.length
        ? budgets.reduce((sum: number, b: any) => {
            const used = calculatePercentageUsed(b.minutes_used || 0, b.minutes_annual || 0)
            return sum + used
          }, 0) / budgets.length
        : 0

      setData({
        teachersCount: teachers.length,
        totalModules,
        usedModules,
        avgPercentage: Number(avgPercentage.toFixed(1)),
        activitiesCount: activities.length,
        budgets: budgets.slice(0, 10),
        currentSchoolYear: currentYear
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare i dati della dashboard'
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          variant: 'destructive',
          title: 'File non valido',
          description: 'Seleziona un file CSV'
        })
        return
      }
      setSelectedFile(file)
      setShowImportDialog(true)
    }
  }

  async function handleImport() {
    if (!selectedFile || !data?.currentSchoolYear) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Nessun file selezionato o anno scolastico non attivo'
      })
      return
    }

    setIsImporting(true)
    setShowImportDialog(false)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('schoolYearId', data.currentSchoolYear.id)

      const response = await fetch('/api/activities/import', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: 'Import completato',
          description: `${result.imported} attività importate. ${result.message || ''}`
        })
        fetchDashboardData()
      } else {
        toast({
          variant: 'destructive',
          title: 'Errore import',
          description: result.error || `${result.failed} righe fallite`
        })
      }
    } catch (error) {
      console.error('Error importing activities:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile importare le attività'
      })
    } finally {
      setIsImporting(false)
      setSelectedFile(null)
    }
  }

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Panoramica generale del sistema tracking recuperi
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="activity-import"
          />
          <Button
            onClick={() => document.getElementById('activity-import')?.click()}
            disabled={isImporting || !data.currentSchoolYear}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importazione...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importa Attività CSV
              </>
            )}
          </Button>
        </div>
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

      {/* Import Confirmation Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Import Attività</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold text-destructive">
                ⚠️ ATTENZIONE: Questa operazione eliminerà TUTTE le attività esistenti!
              </p>
              <p>
                Stai per importare le attività dal file <strong>{selectedFile?.name}</strong>.
              </p>
              <p>
                Tutte le attività registrate per l'anno scolastico corrente verranno eliminate e
                sostituite con quelle presenti nel file CSV.
              </p>
              <p className="text-sm">
                I saldi dei tesoretti docenti verranno ricalcolati automaticamente in base alle nuove attività.
              </p>
              <p className="font-medium mt-4">
                Formato CSV richiesto:
              </p>
              <code className="block text-xs bg-muted p-2 rounded">
                Cognome;Nome;Data;Tipologia;Durata;Titolo;Descrizione
              </code>
              <p className="text-xs text-muted-foreground">
                Esempio: Rossi;Mario;2024-10-15;Sportello Didattico;50;Recupero Matematica;Equazioni
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFile(null)}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImport}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Conferma Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
