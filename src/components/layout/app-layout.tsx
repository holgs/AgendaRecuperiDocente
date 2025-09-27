'use client'

import React from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { Breadcrumb } from './breadcrumb'
import { Footer } from './footer'
import { useAuth } from '@/components/auth/auth-provider'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  className?: string
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const { user, loading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          className="hidden lg:flex"
        />
        
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <Sidebar 
              open={sidebarOpen} 
              onClose={() => setSidebarOpen(false)}
              className="absolute left-0 top-0 h-full"
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header onMenuClick={() => setSidebarOpen(true)} />
          
          {/* Breadcrumb */}
          <Breadcrumb className="border-b px-6 py-3" />
          
          {/* Page content */}
          <main className={cn(
            "flex-1 overflow-y-auto p-6",
            className
          )}>
            {children}
          </main>
          
          {/* Footer */}
          <Footer />
        </div>
      </div>
    </div>
  )
}