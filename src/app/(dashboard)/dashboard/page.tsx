'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, BookOpen, Clock, TrendingUp, Plus, FileText } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Panoramica del sistema di tracking recuperi - Anno Scolastico 2025/2026
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Docenti Totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Nessun docente ancora registrato
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attività Totali</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Nessuna attività registrata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ore Utilizzate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              di 0 ore disponibili
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilizzo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">
              del budget totale
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
            <CardDescription>
              Operazioni più comuni del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/teachers"
                className="flex items-center p-3 text-sm rounded-lg border hover:bg-accent transition-colors"
              >
                <Users className="mr-3 h-4 w-4" />
                Gestisci Docenti
              </Link>
              <Link
                href="/activities"
                className="flex items-center p-3 text-sm rounded-lg border hover:bg-accent transition-colors"
              >
                <BookOpen className="mr-3 h-4 w-4" />
                Visualizza Attività
              </Link>
              <Link
                href="/import"
                className="flex items-center p-3 text-sm rounded-lg border hover:bg-accent transition-colors"
              >
                <FileText className="mr-3 h-4 w-4" />
                Import Tesoretti
              </Link>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-2 border-t">
              <Link href="/activities/new">
                <Button className="w-full" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Registra Nuova Attività
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stato Sistema</CardTitle>
            <CardDescription>
              Informazioni sullo stato attuale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <span className="text-sm text-green-600 font-medium">✓ Connesso</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Anno Scolastico</span>
              <span className="text-sm font-medium">2025/2026</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tipologie Recupero</span>
              <span className="text-sm font-medium">5 configurate</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}