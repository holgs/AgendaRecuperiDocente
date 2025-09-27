'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { Footer } from './footer'
import { Breadcrumb } from './breadcrumb'

interface MainLayoutProps {
  children: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  title?: string
  actions?: React.ReactNode
}

export function MainLayout({ 
  children, 
  breadcrumbs = [], 
  title, 
  actions 
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar 
        open={sidebarOpen} 
        onOpenChange={setSidebarOpen}
        className="hidden lg:flex"
      />
      
      {/* Mobile sidebar overlay */}
      <Sidebar 
        open={sidebarOpen} 
        onOpenChange={setSidebarOpen}
        className="lg:hidden"
        mobile
      />

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          actions={actions}
        />

        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <div className="border-b bg-muted/40 px-6 py-3">
            <Breadcrumb items={breadcrumbs} />
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}