"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Trash2, Loader2, AlertTriangle } from "lucide-react"

export function ClearDataSection() {
  const { toast } = useToast()
  const [isClearing, setIsClearing] = useState(false)

  async function handleClearActivities() {
    setIsClearing(true)

    try {
      const response = await fetch('/api/settings/clear-activities', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'eliminazione')
      }

      toast({
        title: 'Successo',
        description: data.message || 'Tutte le pianificazioni sono state eliminate',
      })

      // Refresh page to update any cached data
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Error clearing activities:', error)
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile eliminare le pianificazioni',
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Dati</CardTitle>
        <CardDescription>
          Operazioni di manutenzione sul database delle attività
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-destructive">
                Svuota Tutte le Pianificazioni
              </h4>
              <p className="text-sm text-muted-foreground">
                Questa operazione eliminerà <strong>tutte le attività di recupero</strong> (pianificate e completate)
                e resetterà i contatori dei budget dei docenti. I budget annuali rimarranno intatti.
              </p>
              <p className="text-sm text-muted-foreground font-semibold">
                ⚠️ Questa azione è irreversibile!
              </p>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="mt-2"
                    disabled={isClearing}
                  >
                    {isClearing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Eliminazione in corso...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Svuota Pianificazioni
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Questa azione eliminerà <strong>TUTTE</strong> le attività di recupero dal sistema
                        e resetterà i contatori di utilizzo dei budget.
                      </p>
                      <p className="font-semibold text-destructive">
                        Questa operazione non può essere annullata.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearActivities}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sì, elimina tutto
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
