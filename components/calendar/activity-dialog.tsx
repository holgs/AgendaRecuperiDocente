"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

interface ActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherId: string
  schoolYearId: string
  recoveryTypes: Array<{ id: string; name: string; color: string }>
  defaultDate?: Date
  defaultModule?: number
  activity?: any  // Activity to edit (if in edit mode)
  onSuccess: (incrementCounter?: boolean) => void
}

export function ActivityDialog({
  open,
  onOpenChange,
  teacherId,
  schoolYearId,
  recoveryTypes,
  defaultDate,
  defaultModule,
  activity,
  onSuccess
}: ActivityDialogProps) {
  const isEditMode = !!activity
  const [date, setDate] = useState<Date | undefined>(defaultDate)
  const [moduleNumber, setModuleNumber] = useState<string>(defaultModule?.toString() || "")
  const [className, setClassName] = useState("")
  const [recoveryTypeId, setRecoveryTypeId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")

  // Persist className and recoveryTypeId across insertions
  const [persistedClassName, setPersistedClassName] = useState("")
  const [persistedRecoveryTypeId, setPersistedRecoveryTypeId] = useState("")

  // Update date and module when defaults change (new cell clicked)
  useEffect(() => {
    if (activity) {
      // Edit mode: load activity data
      setDate(new Date(activity.date))
      setModuleNumber(activity.module_number.toString())
      setClassName(activity.class_name)
      setRecoveryTypeId(activity.recovery_type_id)
    } else {
      // Create mode: use defaults
      setDate(defaultDate)
      setModuleNumber(defaultModule?.toString() || "")
    }
  }, [activity, defaultDate, defaultModule])

  // Restore persisted values when dialog opens (only in create mode)
  useEffect(() => {
    if (open && !activity) {
      setClassName(persistedClassName)
      setRecoveryTypeId(persistedRecoveryTypeId)
    }
  }, [open, activity, persistedClassName, persistedRecoveryTypeId])

  const handleSubmit = async () => {
    if (!date || !moduleNumber || !className || !recoveryTypeId) {
      setError("Tutti i campi sono obbligatori")
      return
    }

    // Debug: Check if schoolYearId is present
    if (!schoolYearId && !isEditMode) {
      setError("Anno scolastico non disponibile. Ricarica la pagina.")
      return
    }

    setLoading(true)
    setError("")
    setWarning("")

    const payload = isEditMode ? {
      date: format(date, "yyyy-MM-dd"),
      module_number: parseInt(moduleNumber),
      class_name: className,
      recovery_type_id: recoveryTypeId
    } : {
      teacher_id: teacherId,
      school_year_id: schoolYearId,
      date: format(date, "yyyy-MM-dd"),
      module_number: parseInt(moduleNumber),
      class_name: className,
      recovery_type_id: recoveryTypeId
    }

    try {
      const url = isEditMode ? `/api/activities/${activity.id}` : "/api/activities"
      const method = isEditMode ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || `Errore durante ${isEditMode ? 'la modifica' : 'la creazione'} dell'attività`)
        return
      }

      if (data.warning) {
        setWarning(data.warning)
      }

      if (!isEditMode) {
        // Only persist in create mode
        setPersistedClassName(className)
        setPersistedRecoveryTypeId(recoveryTypeId)

        // Reset only date and module (classe and tipo restano)
        setDate(undefined)
        setModuleNumber("")
      }

      // Increment session counter only when creating (not editing)
      onSuccess(!isEditMode)
      onOpenChange(false)
    } catch (err) {
      setError("Errore di connessione")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Modifica Attività" : "Nuova Attività di Recupero"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: it }) : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={it}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Module Number */}
          <div className="space-y-2">
            <Label>Modulo</Label>
            <Select value={moduleNumber} onValueChange={setModuleNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona modulo" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    Modulo {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class Name */}
          <div className="space-y-2">
            <Label>Classe</Label>
            <Input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="es. 3A"
            />
          </div>

          {/* Recovery Type */}
          <div className="space-y-2">
            <Label>Tipo Recupero</Label>
            <Select value={recoveryTypeId} onValueChange={setRecoveryTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                {recoveryTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Warning Message */}
          {warning && (
            <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
              {warning}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
