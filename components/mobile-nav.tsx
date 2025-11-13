"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Users,
  Activity,
  FileText,
  Upload,
  Settings,
  BookOpen,
  Menu,
  GraduationCap,
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

type MobileNavProps = {
  userRole?: 'admin' | 'teacher'
}

export function MobileNav({ userRole = 'admin' }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const navItems = userRole === 'teacher' ? teacherNavItems : adminNavItems

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 lg:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-background">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>Tracking Recuperi</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-8 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center rounded-md px-3 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Version 1.0.0
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
