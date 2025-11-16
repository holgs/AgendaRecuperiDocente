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
import { Input } from "@/components/ui/input"
import { Plus, Loader2, Search, Download } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { TeacherEditDialog } from "@/components/teachers/teacher-edit-dialog"

type TeacherWithBudget = {
  id: string
  nome: string
  cognome: string
  email: string | null
  budget: {
    id: string
    modulesAnnual: number
    modulesUsed: number
    modulesAvailable: number
    minutesAnnual: number
    minutesUsed: number
    minutesAvailable: number
    percentageUsed: number
  } | null
}

type TeachersData = {
  teachers: TeacherWithBudget[]
  activeYear: {
    id: string
    name: string
  }
}

export default function TeachersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<TeachersData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchTeachers()
  }, [])

  async function fetchTeachers() {
    try {
      const response = await fetch('/api/teachers/list-with-budgets')

      if (!response.ok) {
        throw new Error('Failed to fetch teachers')
      }

      const teachersData = await response.json()
      setData(teachersData)
    } catch (error) {
      console.error('Error fetching teachers:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile caricare la lista docenti'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTeachers = data?.teachers.filter(teacher => {
    const searchLower = searchQuery.toLowerCase()
    return (
      teacher.cognome.toLowerCase().includes(searchLower) ||
      teacher.nome.toLowerCase().includes(searchLower) ||
      teacher.email?.toLowerCase().includes(searchLower)
    )
  }) || []

  function getBudgetStatusVariant(percentage: number): "default" | "secondary" | "destructive" {
    if (percentage >= 80) return "destructive"
    if (percentage >= 50) return "secondary"
    return "default"
  }

  function handleRowClick(teacherId: string) {
    router.push(`/dashboard/teachers/${teacherId}`)
  }

  async function handleExportCSV() {
    setIsExporting(true)
    try {
      const response = await fetch('/api/reports/export-csv')

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : 'report_docenti.csv'

      // Download file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Export completato',
        description: 'Il file CSV è stato scaricato con successo'
      })
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Impossibile esportare i dati in CSV'
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Docenti</h1>
          <p className="text-muted-foreground">
            Gestisci i docenti e visualizza i loro tesoretti
            {data?.activeYear && ` - Anno ${data.activeYear.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isExporting || !data?.teachers.length}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Esporta CSV
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Docente
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per cognome, nome o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Teachers Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cognome</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Moduli Annuali</TableHead>
              <TableHead className="text-right">Moduli Usati</TableHead>
              <TableHead className="text-right">Moduli Disponibili</TableHead>
              <TableHead className="text-right">Utilizzo</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  {searchQuery ? 'Nessun docente trovato' : 'Nessun docente registrato'}
                </TableCell>
              </TableRow>
            ) : (
              filteredTeachers.map((teacher) => (
                <TableRow
                  key={teacher.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(teacher.id)}
                >
                  <TableCell className="font-medium">{teacher.cognome}</TableCell>
                  <TableCell>{teacher.nome}</TableCell>
                  <TableCell>{teacher.email || '-'}</TableCell>
                  <TableCell className="text-right">
                    {teacher.budget ? teacher.budget.modulesAnnual.toFixed(1) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {teacher.budget ? teacher.budget.modulesUsed.toFixed(1) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {teacher.budget ? teacher.budget.modulesAvailable.toFixed(1) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {teacher.budget ? (
                      <Badge variant={getBudgetStatusVariant(teacher.budget.percentageUsed)}>
                        {teacher.budget.percentageUsed}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary">N/A</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <TeacherEditDialog
                      teacher={{
                        id: teacher.id,
                        cognome: teacher.cognome,
                        nome: teacher.nome,
                        email: teacher.email,
                      }}
                      onSuccess={fetchTeachers}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Totale docenti: {data?.teachers.length || 0}
        {searchQuery && ` (${filteredTeachers.length} trovati)`}
      </div>
    </div>
  )
}
