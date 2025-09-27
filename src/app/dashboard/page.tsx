'use client'

import React from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
} from 'lucide-react'

export default function DashboardPage() {
  // Mock data - in real app this would come from API
  const stats = {
    totalTeachers: 45,
    totalActivities: 128,
    totalMinutesUsed: 3420,
    totalMinutesAvailable: 5400,
    teachersNearLimit: 8,
    pendingApprovals: 3,
  }
  
  const utilizationPercentage = (stats.totalMinutesUsed / stats.totalMinutesAvailable) * 100
  
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Panoramica del sistema di tracking recuperi docenti
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuova Attività
          </Button>
        </div>
        
        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Docenti Totali</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTeachers}</div>
              <p className="text-xs text-muted-foreground">
                +2 rispetto al mese scorso
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attività Registrate</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActivities}</div>
              <p className="text-xs text-muted-foreground">
                +12% rispetto al mese scorso
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilizzo Budget</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{utilizationPercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalMinutesUsed} di {stats.totalMinutesAvailable} minuti
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Approvazione</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Attività da approvare
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Alert section */}
        {stats.teachersNearLimit > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-900 dark:text-orange-100">
                  Attenzione: Docenti vicini al limite
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-orange-800 dark:text-orange-200">
                {stats.teachersNearLimit} docenti hanno utilizzato oltre il 90% del loro budget. 
                È consigliabile monitorare la situazione.
              </p>
              <Button variant="outline" className="mt-2" size="sm">
                Visualizza Elenco
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Gestione Docenti</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Visualizza e gestisci i saldi budget dei docenti
              </p>
              <Button variant="outline" className="w-full">
                Vai ai Docenti
              </Button>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Attività Recenti</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Consulta le ultime attività di recupero registrate
              </p>
              <Button variant="outline" className="w-full">
                Visualizza Attività
              </Button>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Report</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Genera report dettagliati sull'utilizzo del sistema
              </p>
              <Button variant="outline" className="w-full">
                Crea Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}