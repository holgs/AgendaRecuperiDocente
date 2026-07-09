"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2, Loader2, Trash2, Star } from "lucide-react"

type SchoolYear = {
  id: string
  name: string
  start_date: string
  end_date: string
  weeks_count: number
  is_active: boolean | null
}

export function SchoolYearsSection() {
  const { toast } = useToast()
  const [years, setYears] = useState<SchoolYear[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/school-years")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore")
      const list: SchoolYear[] = Array.isArray(json) ? json : json.schoolYears ?? []
      setYears(list)
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function makeActive(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/school-years/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Errore")
      toast({ title: "Anno attivo aggiornato", description: "L'app ora opera sull'anno selezionato." })
      load()
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/school-years/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) {
        const msg = /existing budgets/i.test(json.error || "")
          ? "Impossibile eliminare un anno con dati/tesoretti. Svuota prima i dati (Backup → elimina dati anno)."
          : json.error || "Errore"
        throw new Error(msg)
      }
      toast({ title: "Anno eliminato", description: "L'anno scolastico è stato rimosso." })
      load()
    } catch (error) {
      toast({ variant: "destructive", title: "Errore", description: error instanceof Error ? error.message : "Errore" })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anni scolastici</CardTitle>
        <CardDescription>
          Imposta quale anno è attivo (su cui opera tutta l&apos;app) ed elimina gli anni non più necessari.
          Un anno con tesoretti/dati non è eliminabile finché non lo svuoti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento…
          </div>
        ) : years.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Nessun anno scolastico.</p>
        ) : (
          <div className="space-y-1">
            {years.map((y) => (
              <div key={y.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{y.name}</span>
                  <span className="text-xs text-muted-foreground">{y.weeks_count} sett.</span>
                  {y.is_active && (
                    <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> attivo</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!y.is_active && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={busyId === y.id}>
                          <Star className="mr-2 h-4 w-4" /> Rendi attivo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rendere attivo {y.name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tutta l&apos;app (docenti, attività, report) passerà a operare su {y.name}. L&apos;anno
                            attivo attuale diventerà inattivo.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => makeActive(y.id)}>Rendi attivo</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={busyId === y.id || !!y.is_active} title={y.is_active ? "Non puoi eliminare l'anno attivo" : "Elimina"}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare {y.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Operazione non annullabile. Consentita solo se l&apos;anno non ha tesoretti/dati.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(y.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Elimina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
