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
import { Plus, Loader2, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { TeacherEditDialog } from "@/components/teachers/teacher-edit-dialog"
import { useSortableTable, type SortAccessors } from "@/hooks/use-sortable-table"
import { SortableTableHead } from "@/components/ui/sortable-table-head"

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

const teacherSortAccessors: SortAccessors<TeacherWithBudget> = {
  cognome: (t) => t.cognome,
  nome: (t) => t.nome,
  email: (t) => t.email,
  modulesAnnual: (t) => t.budget?.modulesAnnual,
  modulesUsed: (t) => t.budget?.modulesUsed,
  modulesAvailable: (t) => t.budget?.modulesAvailable,
  percentageUsed: (t) => t.budget?.percentageUsed,
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

  const { sorted: sortedTeachers, sortKey, sortDirection, requestSort } =
    useSortableTable(filteredTeachers, teacherSortAccessors)

  function getBudgetStatusVariant(percentage: number): "default" | "secondary" | "destructive" {
    if (percentage >= 80) return "destructive"
    if (percentage >= 50) return "secondary"
    return "default"
  }

  function handleRowClick(teacherId: string) {
    router.push(`/dashboard/teachers/${teacherId}`)
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Docente
        </Button>
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
              <SortableTableHead label="Cognome" sortKey="cognome" activeKey={sortKey} direction={sortDirection} onSort={requestSort} />
              <SortableTableHead label="Nome" sortKey="nome" activeKey={sortKey} direction={sortDirection} onSort={requestSort} />
              <SortableTableHead label="Email" sortKey="email" activeKey={sortKey} direction={sortDirection} onSort={requestSort} />
              <SortableTableHead label="Moduli Annuali" sortKey="modulesAnnual" activeKey={sortKey} direction={sortDirection} onSort={requestSort} className="text-right" />
              <SortableTableHead label="Moduli Usati" sortKey="modulesUsed" activeKey={sortKey} direction={sortDirection} onSort={requestSort} className="text-right" />
              <SortableTableHead label="Moduli Disponibili" sortKey="modulesAvailable" activeKey={sortKey} direction={sortDirection} onSort={requestSort} className="text-right" />
              <SortableTableHead label="Utilizzo" sortKey="percentageUsed" activeKey={sortKey} direction={sortDirection} onSort={requestSort} className="text-right" />
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  {searchQuery ? 'Nessun docente trovato' : 'Nessun docente registrato'}
                </TableCell>
              </TableRow>
            ) : (
              sortedTeachers.map((teacher) => (
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
