'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Clock,
  BookOpen,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
} from 'lucide-react'

interface BudgetData {
  minutesAnnual: number
  minutesUsed: number
  modulesAnnual: number
  modulesUsed: number
  lastActivityDate?: Date
  averageWeeklyUsage?: number
  projectedCompletionWeek?: number
}

interface BudgetDisplayProps {
  budget: BudgetData
  teacherName: string
  schoolYearWeeks?: number
  currentWeek?: number
  className?: string
  showForecast?: boolean
  showTrends?: boolean
}

export function BudgetDisplay({
  budget,
  teacherName,
  schoolYearWeeks = 33,
  currentWeek = 1,
  className,
  showForecast = true,
  showTrends = true,
}: BudgetDisplayProps) {
  const minutesProgress = (budget.minutesUsed / budget.minutesAnnual) * 100
  const modulesProgress = (budget.modulesUsed / budget.modulesAnnual) * 100
  const remainingMinutes = budget.minutesAnnual - budget.minutesUsed
  const remainingModules = budget.modulesAnnual - budget.modulesUsed
  const remainingWeeks = schoolYearWeeks - currentWeek

  // Calcolo forecast
  const weeklyAverage = budget.averageWeeklyUsage || (budget.minutesUsed / currentWeek)
  const projectedTotal = budget.minutesUsed + (weeklyAverage * remainingWeeks)
  const projectedOverage = Math.max(0, projectedTotal - budget.minutesAnnual)
  const isOnTrack = projectedTotal <= budget.minutesAnnual
  const completionWeek = budget.projectedCompletionWeek || 
    (weeklyAverage > 0 ? Math.ceil(remainingMinutes / weeklyAverage) + currentWeek : null)

  // Dati per grafici
  const pieData = [
    { name: 'Utilizzato', value: budget.minutesUsed, color: '#3b82f6' },
    { name: 'Rimanente', value: remainingMinutes, color: '#e5e7eb' },
  ]

  const trendData = Array.from({ length: Math.min(currentWeek, 10) }, (_, i) => {
    const week = currentWeek - i
    const cumulative = (weeklyAverage * week)
    return {
      week: `S${week}`,
      actual: Math.max(0, cumulative + (Math.random() * 50 - 25)), // Simulazione dati
      projected: cumulative,
    }
  }).reverse()

  const getStatusInfo = () => {
    if (minutesProgress >= 100) {
      return {
        status: 'Esaurito',
        color: 'destructive',
        icon: AlertTriangle,
        description: 'Budget completamente utilizzato',
      }
    }
    if (minutesProgress >= 90) {
      return {
        status: 'Critico',
        color: 'destructive',
        icon: AlertTriangle,
        description: 'Budget quasi esaurito',
      }
    }
    if (!isOnTrack) {
      return {
        status: 'Fuori target',
        color: 'default',
        icon: TrendingUp,
        description: 'Utilizzo superiore al previsto',
      }
    }
    return {
      status: 'In linea',
      color: 'secondary',
      icon: TrendingDown,
      description: 'Utilizzo conforme alle previsioni',
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">
              Budget - {teacherName}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={statusInfo.color as any} className="flex items-center space-x-1">
                <StatusIcon className="h-3 w-3" />
                <span>{statusInfo.status}</span>
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
        </CardHeader>
      </Card>

      {/* Progress overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Minuti</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Utilizzato</span>
                <span>{budget.minutesUsed} / {budget.minutesAnnual}</span>
              </div>
              <Progress value={minutesProgress} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{minutesProgress.toFixed(1)}% utilizzato</span>
                <span>{remainingMinutes} rimanenti</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Moduli</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Utilizzato</span>
                <span>{budget.modulesUsed} / {budget.modulesAnnual}</span>
              </div>
              <Progress value={modulesProgress} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{modulesProgress.toFixed(1)}% utilizzato</span>
                <span>{remainingModules} rimanenti</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuzione Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} min`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        {showTrends && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Andamento Utilizzo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="actual" fill="#3b82f6" name="Effettivo" />
                    <Bar dataKey="projected" fill="#e5e7eb" name="Previsto" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Forecast */}
      {showForecast && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">Previsioni</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Utilizzo Settimanale Medio</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {weeklyAverage.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">min/sett</span>
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Proiezione Fine Anno</h4>
                <p className={`text-2xl font-bold ${
                  isOnTrack ? 'text-green-600' : 'text-red-600'
                }`}>
                  {projectedTotal.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">min</span>
                </p>
                {projectedOverage > 0 && (
                  <p className="text-xs text-red-600">+{projectedOverage.toFixed(0)} min oltre budget</p>
                )}
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Completamento Previsto</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {completionWeek ? (
                    <>
                      S{completionWeek} <span className="text-sm font-normal text-muted-foreground">({schoolYearWeeks})</span>
                    </>
                  ) : (
                    <span className="text-sm font-normal text-muted-foreground">Non calcolabile</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}