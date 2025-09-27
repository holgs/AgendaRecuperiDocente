'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { User, Clock, BookOpen, Plus, Eye, Edit } from 'lucide-react'

interface Teacher {
  id: string
  nome: string
  cognome: string
  email?: string
  minutesAnnual: number
  minutesUsed: number
  modulesAnnual: number
  modulesUsed: number
}

interface TeacherCardProps {
  teacher: Teacher
  onView?: (teacherId: string) => void
  onEdit?: (teacherId: string) => void
  onAddActivity?: (teacherId: string) => void
  className?: string
}

export function TeacherCard({
  teacher,
  onView,
  onEdit,
  onAddActivity,
  className,
}: TeacherCardProps) {
  const minutesProgress = (teacher.minutesUsed / teacher.minutesAnnual) * 100
  const modulesProgress = (teacher.modulesUsed / teacher.modulesAnnual) * 100
  const remainingMinutes = teacher.minutesAnnual - teacher.minutesUsed
  const remainingModules = teacher.modulesAnnual - teacher.modulesUsed

  const getStatusColor = (progress: number) => {
    if (progress >= 90) return 'destructive'
    if (progress >= 70) return 'default'
    return 'secondary'
  }

  const getStatusText = (progress: number) => {
    if (progress >= 100) return 'Esaurito'
    if (progress >= 90) return 'Quasi esaurito'
    if (progress >= 70) return 'In uso'
    return 'Disponibile'
  }

  return (
    <Card className={`relative transition-all hover:shadow-md ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {teacher.nome} {teacher.cognome}
              </CardTitle>
              {teacher.email && (
                <p className="text-sm text-muted-foreground">{teacher.email}</p>
              )}
            </div>
          </div>
          <Badge variant={getStatusColor(Math.max(minutesProgress, modulesProgress))}>
            {getStatusText(Math.max(minutesProgress, modulesProgress))}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Minuti */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Minuti</span>
            </div>
            <span className="font-medium">
              {teacher.minutesUsed} / {teacher.minutesAnnual}
            </span>
          </div>
          <Progress value={minutesProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Rimangono {remainingMinutes} minuti
          </p>
        </div>

        {/* Progress Moduli */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>Moduli</span>
            </div>
            <span className="font-medium">
              {teacher.modulesUsed} / {teacher.modulesAnnual}
            </span>
          </div>
          <Progress value={modulesProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Rimangono {remainingModules} moduli
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex space-x-2">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(teacher.id)}
                className="flex items-center space-x-1"
              >
                <Eye className="h-4 w-4" />
                <span>Visualizza</span>
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(teacher.id)}
                className="flex items-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span>Modifica</span>
              </Button>
            )}
          </div>
          {onAddActivity && (
            <Button
              size="sm"
              onClick={() => onAddActivity(teacher.id)}
              disabled={remainingMinutes <= 0}
              className="flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Aggiungi Attività</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}