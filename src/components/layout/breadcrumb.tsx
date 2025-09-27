'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  className?: string
  items?: BreadcrumbItem[]
}

const pathLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  teachers: 'Docenti',
  budgets: 'Saldi Budget',
  import: 'Import CSV',
  activities: 'Attività',
  new: 'Nuova Attività',
  pending: 'In Approvazione',
  'recovery-types': 'Tipologie Recupero',
  reports: 'Report',
  custom: 'Personalizzati',
  export: 'Export',
  settings: 'Impostazioni',
}

export function Breadcrumb({ className, items }: BreadcrumbProps) {
  const pathname = usePathname()
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (items) return items
    
    const pathSegments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []
    
    let currentPath = ''
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const label = pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      const isLast = index === pathSegments.length - 1
      
      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
      })
    })
    
    return breadcrumbs
  }
  
  const breadcrumbs = generateBreadcrumbs()
  
  if (pathname === '/dashboard' || pathname === '/') {
    return null
  }
  
  return (
    <nav className={cn('flex items-center space-x-1 text-sm text-muted-foreground', className)}>
      <Link 
        href="/dashboard" 
        className="flex items-center space-x-1 hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        <span>Dashboard</span>
      </Link>
      
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link 
              href={item.href} 
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}