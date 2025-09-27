'use client'

import React from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '../ui/theme-toggle'
import { Badge } from '@/components/ui/badge'
import {
  Menu,
  Bell,
  User,
  Settings,
  LogOut,
  Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface HeaderProps {
  onMenuClick: () => void
  title?: string
  actions?: React.ReactNode
}

export function Header({ onMenuClick, title, actions }: HeaderProps) {
  const { user, logout } = useAuth()
  const [notifications] = React.useState(3) // Mock notifications

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Page title */}
        {title && (
          <h1 className="text-lg font-semibold text-foreground hidden sm:block">
            {title}
          </h1>
        )}
        
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca docenti, attività..."
            className="w-64 pl-10"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">
        {/* Page actions */}
        {actions && (
          <div className="hidden sm:flex items-center space-x-2">
            {actions}
          </div>
        )}

        {/* Quick search mobile */}
        <Button variant="ghost" size="sm" className="md:hidden">
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                >
                  {notifications}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifiche</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-1">
              <DropdownMenuItem className="flex-col items-start space-y-1">
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium">Nuova attività registrata</span>
                  <span className="text-xs text-muted-foreground">2 min fa</span>
                </div>
                <span className="text-xs text-muted-foreground">Mario Rossi ha registrato un recupero di 50 minuti</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex-col items-start space-y-1">
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium">Budget quasi esaurito</span>
                  <span className="text-xs text-muted-foreground">1 ora fa</span>
                </div>
                <span className="text-xs text-muted-foreground">Giulia Bianchi ha utilizzato il 90% del budget</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex-col items-start space-y-1">
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-medium">Richiesta approvazione</span>
                  <span className="text-xs text-muted-foreground">3 ore fa</span>
                </div>
                <span className="text-xs text-muted-foreground">Attività di recupero in attesa di approvazione</span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-sm">
              Visualizza tutte le notifiche
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.name?.charAt(0) || user?.email.charAt(0)}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'Utente'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                <Badge variant="outline" className="w-fit text-xs mt-1">
                  {user?.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profilo</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Impostazioni</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Esci</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}