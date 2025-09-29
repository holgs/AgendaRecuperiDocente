'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Home,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  FileText,
  Calendar,
  Bell,
  X,
  ChevronDown,
} from 'lucide-react'
import { UserRole } from '@/lib/auth'

interface MenuItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  children?: MenuItem[]
  requiredRoles?: UserRole[]
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Docenti',
    href: '/teachers',
    icon: Users,
    children: [
      { title: 'Elenco Docenti', href: '/teachers', icon: Users },
      { title: 'Saldi Budget', href: '/teachers/budgets', icon: BarChart3 },
      { title: 'Import Tesoretti', href: '/import', icon: FileText, requiredRoles: ['admin'] },
    ],
  },
  {
    title: 'Attività',
    href: '/activities',
    icon: BookOpen,
    children: [
      { title: 'Tutte le Attività', href: '/activities', icon: BookOpen },
      { title: 'Nuova Attività', href: '/activities/new', icon: Calendar },
      { title: 'In Approvazione', href: '/activities/pending', icon: Bell, badge: '3' },
    ],
  },
  {
    title: 'Tipologie Recupero',
    href: '/recovery-types',
    icon: Settings,
    requiredRoles: ['admin'],
  },
  {
    title: 'Report',
    href: '/reports',
    icon: BarChart3,
    children: [
      { title: 'Overview', href: '/reports', icon: BarChart3 },
      { title: 'Report Personalizzati', href: '/reports/custom', icon: FileText },
      { title: 'Export Dati', href: '/reports/export', icon: FileText },
    ],
  },
  {
    title: 'Impostazioni',
    href: '/settings',
    icon: Settings,
    requiredRoles: ['admin'],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  className?: string
}

export function Sidebar({ open, onClose, className }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [expandedItems, setExpandedItems] = React.useState<string[]>([''])

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      if (item.requiredRoles) {
        return user?.role && item.requiredRoles.includes(user.role)
      }
      return true
    }).map(item => ({
      ...item,
      children: item.children ? filterMenuItems(item.children) : undefined
    }))
  }

  const filteredMenuItems = filterMenuItems(menuItems)

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const isExpanded = (title: string) => expandedItems.includes(title)

  return (
    <aside className={cn(
      "flex h-full w-64 flex-col border-r bg-card transition-transform duration-200 ease-in-out",
      !open && "lg:translate-x-0 -translate-x-full",
      className
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Sistema Tracking</span>
            <span className="text-xs text-muted-foreground">Recuperi Docenti</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="lg:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => {
            const isItemActive = isActive(item.href)
            const hasChildren = item.children && item.children.length > 0
            const expanded = isExpanded(item.title)
            
            return (
              <li key={item.title}>
                {hasChildren ? (
                  <div>
                    <Button
                      variant={isItemActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-between font-normal",
                        isItemActive && "bg-secondary text-secondary-foreground"
                      )}
                      onClick={() => toggleExpanded(item.title)}
                    >
                      <div className="flex items-center space-x-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        expanded && "rotate-180"
                      )} />
                    </Button>
                    {expanded && (
                      <ul className="mt-2 ml-4 space-y-1">
                        {item.children?.map((child) => (
                          <li key={child.href}>
                            <Link href={child.href} onClick={onClose}>
                              <Button
                                variant={isActive(child.href) ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                  "w-full justify-start font-normal pl-6",
                                  isActive(child.href) && "bg-secondary text-secondary-foreground"
                                )}
                              >
                                <child.icon className="h-3 w-3 mr-2" />
                                <span>{child.title}</span>
                                {child.badge && (
                                  <Badge variant="secondary" className="ml-auto text-xs">
                                    {child.badge}
                                  </Badge>
                                )}
                              </Button>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link href={item.href} onClick={onClose}>
                    <Button
                      variant={isItemActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start font-normal",
                        isItemActive && "bg-secondary text-secondary-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User info footer */}
      <div className="border-t p-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user?.name?.charAt(0) || user?.email.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'Utente'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {user?.role}
          </Badge>
        </div>
      </div>
    </aside>
  )
}