"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Activity,
  FileText,
  Upload,
  Settings,
  BookOpen,
} from "lucide-react"

// Admin navigation items
const adminNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Docenti",
    href: "/dashboard/teachers",
    icon: Users,
  },
  {
    title: "Attività Recupero",
    href: "/dashboard/activities",
    icon: Activity,
  },
  {
    title: "Tipi Recupero",
    href: "/dashboard/recovery-types",
    icon: FileText,
  },
  {
    title: "Import Tesoretti",
    href: "/dashboard/import",
    icon: Upload,
  },
  {
    title: "Impostazioni",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

// Teacher navigation items
const teacherNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard/teacher",
    icon: LayoutDashboard,
  },
  {
    title: "Le Mie Attività",
    href: "/dashboard/teacher",
    icon: BookOpen,
  },
]

type DashboardNavProps = {
  userRole?: 'admin' | 'teacher'
}

export function DashboardNav({ userRole = 'admin' }: DashboardNavProps) {
  const pathname = usePathname()
  const navItems = userRole === 'teacher' ? teacherNavItems : adminNavItems

  return (
    <nav className="grid items-start gap-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <Icon className="mr-2 h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
