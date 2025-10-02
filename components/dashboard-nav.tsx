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
} from "lucide-react"

const navItems = [
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

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <nav className="grid items-start gap-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

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
