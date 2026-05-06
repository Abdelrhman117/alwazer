import { SidebarNav } from "@/components/sidebar-nav"
import { AuthGuard } from "@/components/auth-guard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen" style={{ background: "var(--background)" }} dir="rtl">
        <SidebarNav />
        <main className="flex-1 w-full pt-16 lg:pt-0 overflow-x-hidden transition-all duration-300">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}
