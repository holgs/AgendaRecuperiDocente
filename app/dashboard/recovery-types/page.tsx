"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { ColorPicker } from "@/components/ui/color-picker"
import { Plus, Pencil, Trash2, Search, Loader2, CheckCircle2, XCircle } from "lucide-react"

type RecoveryType = {
  id: string
  name: string
  description: string | null
  color: string
  default_duration: number | null
  requires_approval: boolean
  is_active: boolean
  created_at: string
  _count?: {
    recovery_activities: number
  }
}

type FormData = {
  name: string
  description: string
  color: string
  default_duration: string
  requires_approval: boolean
  is_active: boolean
}

const initialFormData: FormData = {
  name: "",
  description: "",
  color: "#3b82f6",
  default_duration: "",
  requires_approval: false,
  is_active: true,
}

export default function RecoveryTypesPage() {
  const { toast } = useToast()
  const [types, setTypes] = useState<RecoveryType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingType, setEditingType] = useState<RecoveryType | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetchTypes()
  }, [])

  async function fetchTypes() {
    try {
      const response = await fetch("/api/recovery-types")
      if (response.ok) {
        const data = await response.json()
        setTypes(data)
      }
    } catch (error) {
      console.error("Error fetching types:", error)
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare le tipologie",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit(type: RecoveryType) {
    setEditingType(type)
    setFormData({
      name: type.name,
      description: type.description || "",
      color: type.color,
      default_duration: type.default_duration?.toString() || "",
      requires_approval: type.requires_approval,
      is_active: type.is_active,
    })
    setIsDialogOpen(true)
  }

  function handleCloseDialog() {
    setIsDialogOpen(false)
    setEditingType(null)
    setFormData(initialFormData)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        ...formData,
        default_duration: formData.default_duration ? parseInt(formData.default_duration) : null,
      }

      const url = editingType
        ? `/api/recovery-types/${editingType.id}`
        : "/api/recovery-types"

      const response = await fetch(url, {
        method: editingType ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: editingType ? "Tipologia aggiornata" : "Tipologia creata",
          description: "Operazione completata con successo",
        })
        handleCloseDialog()
        fetchTypes()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Errore",
          description: error.error || "Operazione fallita",
        })
      }
    } catch (error) {
      console.error("Error saving type:", error)
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile salvare la tipologia",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/recovery-types/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Tipologia eliminata",
          description: "Operazione completata con successo",
        })
        fetchTypes()
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Errore",
          description: error.details || error.error || "Impossibile eliminare",
        })
      }
    } catch (error) {
      console.error("Error deleting type:", error)
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile eliminare la tipologia",
      })
    } finally {
      setDeleteConfirm(null)
    }
  }

  const filteredTypes = types.filter(
    (type) =>
      type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tipologie Recupero</h1>
          <p className="text-muted-foreground">
            Gestisci le tipologie di attività di recupero
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingType(null)
              setFormData(initialFormData)
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nuova Tipologia
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Modifica Tipologia" : "Nuova Tipologia"}
              </DialogTitle>
              <DialogDescription>
                Configura le caratteristiche della tipologia di recupero
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="es. Sportello Didattico"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione della tipologia..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Colore *</Label>
                <ColorPicker
                  value={formData.color}
                  onChange={(color) => setFormData({ ...formData, color })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Durata predefinita (minuti)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="300"
                  value={formData.default_duration}
                  onChange={(e) => setFormData({ ...formData, default_duration: e.target.value })}
                  placeholder="50"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Richiede approvazione</Label>
                  <p className="text-sm text-muted-foreground">
                    Le attività di questo tipo devono essere approvate
                  </p>
                </div>
                <Switch
                  checked={formData.requires_approval}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requires_approval: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Attiva</Label>
                  <p className="text-sm text-muted-foreground">
                    La tipologia è disponibile per nuove attività
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Annulla
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    "Salva"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipologie Configurate</CardTitle>
          <CardDescription>
            {types.length} tipologie totali
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca tipologie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Nessuna tipologia trovata" : "Nessuna tipologia configurata"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Durata</TableHead>
                  <TableHead>Approvazione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Utilizzo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-sm"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="font-medium">{type.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {type.description || "-"}
                    </TableCell>
                    <TableCell>
                      {type.default_duration ? `${type.default_duration} min` : "-"}
                    </TableCell>
                    <TableCell>
                      {type.requires_approval ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Sì
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.is_active ? (
                        <Badge className="bg-green-600">Attiva</Badge>
                      ) : (
                        <Badge variant="secondary">Disattiva</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {type._count?.recovery_activities || 0} attività
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(type.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa tipologia? Questa azione non può essere annullata.
              Se la tipologia è in uso, verrà impedita l&apos;eliminazione.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
