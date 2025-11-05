import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/dashboard-nav"
import { MobileNav } from "@/components/mobile-nav"
import { UserNav } from "@/components/user-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { GraduationCap } from "lucide-react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already handles redirects, this is just for TypeScript safety
  if (!user) {
    redirect("/login")
  }

  // Get user role from public.users table
  const { data: publicUser } = await supabase
    .from('users')
    .select('role')
    .eq('email', user.email)
    .single()

  const userRole = (publicUser?.role as 'admin' | 'teacher') || 'admin'

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r bg-card lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-semibold">Tracking Recuperi</span>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-auto p-4">
            <DashboardNav userRole={userRole} />
          </div>

          {/* Footer */}
          <div className="border-t p-4">
            <p className="text-xs text-muted-foreground">
              Version 1.0.0
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mobile menu */}
              <MobileNav userRole={userRole} />
              <h1 className="text-lg font-semibold lg:hidden">
                Tracking Recuperi
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Separator orientation="vertical" className="h-6" />
              <UserNav user={{ email: user.email }} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-muted/10 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
