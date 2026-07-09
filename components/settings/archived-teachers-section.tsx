"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, RotateCcw } from "lucide-react"

type Teacher = { id: string; cognome: string; nome: string; email: string | null; is_archived?: boolean }

export function ArchivedTeachersSection() {
  const { toast } = useToast()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/teachers")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore")
      const archived = (json.teachers ?? []).filter((t: Teacher) => t.is_archived)
      setTeachers(archived)
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function reactivate(id: string) {
    setReactivatingId(id)
    try {
      const res = await fetch(`/api/teachers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: false }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore")
      toast({ title: "Docente riattivato", description: "Comparirà di nuovo dopo l'import del tesoretto." })
      load()
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setReactivatingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Docenti archiviati</CardTitle>
        <CardDescription>
          Docenti a tempo determinato archiviati al passaggio d&apos;anno. Riattivali quando rientrano in servizio
          (riprenderanno con l&apos;import del tesoretto).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento…
          </div>
        ) : teachers.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Nessun docente archiviato.</p>
        ) : (
          <div className="space-y-1">
            {teachers.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{t.cognome} {t.nome}</span>
                  {t.email && <span className="ml-2 text-xs text-muted-foreground">{t.email}</span>}
                  <Badge variant="secondary" className="ml-2">archiviato</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => reactivate(t.id)} disabled={reactivatingId === t.id}>
                  {reactivatingId === t.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                  Riattiva
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
