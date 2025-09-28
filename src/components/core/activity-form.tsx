'use client'

import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Save, X } from 'lucide-react'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

interface RecoveryType {
  id: string
  name: string
  description?: string
  color: string
  defaultDuration: number
  requiresApproval: boolean
}

interface Teacher {
  id: string
  nome: string
  cognome: string
  remainingMinutes: number
  remainingModules: number
}

const activitySchema = z.object({
  teacherId: z.string().min(1, 'Seleziona un docente'),
  recoveryTypeId: z.string().min(1, 'Seleziona una tipologia'),
  date: z.string().min(1, 'Inserisci una data'),
  durationMinutes: z.number().min(1, 'La durata deve essere maggiore di 0'),
  title: z.string().min(1, 'Inserisci un titolo'),
  description: z.string().optional(),
})

type ActivityFormData = z.infer<typeof activitySchema>

interface ActivityFormProps {
  teachers: Teacher[]
  recoveryTypes: RecoveryType[]
  selectedTeacher?: Teacher
  initialData?: Partial<ActivityFormData>
  onSubmit: (data: ActivityFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  className?: string
}

export function ActivityForm({
  teachers,
  recoveryTypes,
  selectedTeacher,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}: ActivityFormProps) {
  const [draftSaved, setDraftSaved] = React.useState(false)
  const [autoSaveTimeout, setAutoSaveTimeout] = React.useState<NodeJS.Timeout | null>(null)

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      teacherId: selectedTeacher?.id || '',
      recoveryTypeId: '',
      date: new Date().toISOString().split('T')[0],
      durationMinutes: 50,
      title: '',
      description: '',
      ...initialData,
    },
  })

  const watchedValues = form.watch()
  const selectedRecoveryType = recoveryTypes.find(rt => rt.id === watchedValues.recoveryTypeId)
  const currentTeacher = teachers.find(t => t.id === watchedValues.teacherId) || selectedTeacher
  
  // Auto-calcolo moduli equivalenti
  const modulesEquivalent = Math.round(watchedValues.durationMinutes / 50 * 100) / 100

  // Auto-save draft functionality
  React.useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    const timeout = setTimeout(() => {
      const draftData = form.getValues()
      const serializedDraft = {
        ...draftData,
        description: typeof draftData.description === 'string' ? draftData.description : '',
      }
      localStorage.setItem('activity-draft', JSON.stringify(serializedDraft))
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 2000)

    setAutoSaveTimeout(timeout)

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [watchedValues, form])

  // Load draft on mount
  React.useEffect(() => {
    const savedDraft = localStorage.getItem('activity-draft')
    if (savedDraft && !initialData) {
      try {
        const draftData = JSON.parse(savedDraft)
        form.reset({
          ...draftData,
          description: typeof draftData.description === 'string' ? draftData.description : '',
        })
      } catch (error) {
        console.error('Error loading draft:', error)
      }
    }
  }, [form, initialData])

  // Auto-set default duration when recovery type changes
  React.useEffect(() => {
    if (selectedRecoveryType && selectedRecoveryType.defaultDuration > 0) {
      form.setValue('durationMinutes', selectedRecoveryType.defaultDuration)
    }
  }, [selectedRecoveryType, form])

  const handleSubmit = async (data: ActivityFormData) => {
    try {
      await onSubmit(data)
      localStorage.removeItem('activity-draft')
      form.reset()
    } catch (error) {
      console.error('Error submitting activity:', error)
    }
  }

  const clearDraft = () => {
    localStorage.removeItem('activity-draft')
    form.reset()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            {initialData ? 'Modifica Attività' : 'Nuova Attività di Recupero'}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {draftSaved && (
              <Badge variant="secondary" className="text-xs">
                Bozza salvata
              </Badge>
            )}
            {selectedRecoveryType?.requiresApproval && (
              <Badge variant="outline" className="text-xs">
                Richiede approvazione
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Selezione Docente */}
          <div className="space-y-2">
            <Label htmlFor="teacherId">Docente</Label>
            <Select
              value={form.watch('teacherId')}
              onValueChange={(value) => form.setValue('teacherId', value)}
              disabled={!!selectedTeacher}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un docente" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{teacher.nome} {teacher.cognome}</span>
                      <div className="flex space-x-2 text-xs text-muted-foreground">
                        <span>{teacher.remainingMinutes}min</span>
                        <span>{teacher.remainingModules}mod</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.teacherId && (
              <p className="text-sm text-destructive">{form.formState.errors.teacherId.message}</p>
            )}
          </div>

          {/* Tipologia Recupero */}
          <div className="space-y-2">
            <Label htmlFor="recoveryTypeId">Tipologia Recupero</Label>
            <Select
              value={form.watch('recoveryTypeId')}
              onValueChange={(value) => form.setValue('recoveryTypeId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona una tipologia" />
              </SelectTrigger>
              <SelectContent>
                {recoveryTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <span>{type.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRecoveryType?.description && (
              <p className="text-xs text-muted-foreground">
                {selectedRecoveryType.description}
              </p>
            )}
            {form.formState.errors.recoveryTypeId && (
              <p className="text-sm text-destructive">{form.formState.errors.recoveryTypeId.message}</p>
            )}
          </div>

          {/* Data e Durata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  {...form.register('date')}
                  className="pl-10"
                />
              </div>
              {form.formState.errors.date && (
                <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Durata (minuti)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  step="1"
                  {...form.register('durationMinutes', { valueAsNumber: true })}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Equivale a {modulesEquivalent} moduli
              </p>
              {form.formState.errors.durationMinutes && (
                <p className="text-sm text-destructive">{form.formState.errors.durationMinutes.message}</p>
              )}
            </div>
          </div>

          {/* Titolo */}
          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              placeholder="Inserisci il titolo dell'attività"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione (opzionale)</Label>
            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? ''}
                  onChange={(value) => field.onChange(value ?? '')}
                  onBlur={field.onBlur}
                  placeholder="Inserisci una descrizione dell'attività..."
                />
              )}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Validazione saldi */}
          {currentTeacher && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Verifica Saldi</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Minuti disponibili: </span>
                  <span className={currentTeacher.remainingMinutes < watchedValues.durationMinutes ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                    {currentTeacher.remainingMinutes}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Moduli disponibili: </span>
                  <span className={currentTeacher.remainingModules < modulesEquivalent ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                    {currentTeacher.remainingModules}
                  </span>
                </div>
              </div>
              {(currentTeacher.remainingMinutes < watchedValues.durationMinutes || currentTeacher.remainingModules < modulesEquivalent) && (
                <p className="text-sm text-destructive mt-2">
                  Attenzione: L'attività supera i saldi disponibili!
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearDraft}
                size="sm"
              >
                Pulisci Bozza
              </Button>
            </div>
            <div className="flex space-x-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Annulla
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading || !form.formState.isValid}
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Salvataggio...' : initialData ? 'Aggiorna' : 'Salva Attività'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}