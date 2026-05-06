"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, FileText, LogOut,
  Wallet, Menu, X, Box, ChevronRight, ChevronLeft,
  BarChart3, Settings, TrendingUp, Calculator
} from "lucide-react"
import { useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

const navItems = [
  { href: "/dashboard",                    label: "لوحة التحكم",       icon: LayoutDashboard },
  { href: "/dashboard/invoices",           label: "الفواتير",           icon: FileText        },
  { href: "/dashboard/clients",            label: "العملاء",            icon: Users           },
  { href: "/dashboard/finance",            label: "الموردين والديون",   icon: Wallet          },
  { href: "/dashboard/expenses",           label: "المصروفات",          icon: TrendingUp      },
  { href: "/dashboard/reports",            label: "التقارير",           icon: BarChart3       },
  { href: "/dashboard/pricing",            label: "أسعار التشغيل",      icon: Calculator      },
  { href: "/dashboard/printing-materials", label: "خامات الطباعة",      icon: Box             },
  { href: "/dashboard/settings",           label: "الإعدادات",          icon: Settings        },
]

export function SidebarNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  async function handleLogout() {
    try { await signOut(auth); router.replace("/login") }
    catch { toast.error("خطأ في تسجيل الخروج") }
  }

  const NavContent = ({ mobile = false }) => (
    <div className="flex h-full flex-col" style={{ background: "var(--wazer-navy)" }} dir="rtl">

      {/* Logo */}
      <div className={cn(
        "flex items-center border-b py-5 transition-all duration-300",
        collapsed && !mobile ? "justify-center px-3" : "px-5 gap-3"
      )} style={{ borderColor: "var(--wazer-navy-light)" }}>
        <div className={cn(
          "flex items-center justify-center rounded-xl font-black text-white shrink-0 transition-all",
          collapsed && !mobile ? "w-9 h-9 text-base" : "w-11 h-11 text-xl"
        )} style={{ background: "var(--wazer-yellow)", color: "var(--wazer-navy)" }}>
          و
        </div>
        {(!collapsed || mobile) && (
          <div className="overflow-hidden">
            <p className="font-black text-white text-base leading-tight">الوزير</p>
            <p className="text-xs font-bold" style={{ color: "var(--wazer-yellow)" }}>للدعاية والإعلان</p>
          </div>
        )}
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="mr-auto text-white/50 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              onClick={() => mobile && setMobileOpen(false)}
              title={collapsed && !mobile ? item.label : ""}
              className={cn(
                "flex items-center rounded-xl py-3 transition-all duration-150 group",
                active
                  ? "text-[var(--wazer-navy)] font-black"
                  : "text-white/60 hover:text-white hover:bg-white/5 font-bold",
                collapsed && !mobile ? "justify-center px-0" : "px-4 gap-3"
              )}
              style={active ? { background: "var(--wazer-yellow)" } : {}}
            >
              <item.icon className={cn("shrink-0", collapsed && !mobile ? "w-5 h-5" : "w-4.5 h-4.5")} />
              {(!collapsed || mobile) && <span className="text-sm">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t space-y-1" style={{ borderColor: "var(--wazer-navy-light)" }}>
        {(!collapsed || mobile) && user?.email && (
          <p className="text-xs text-white/30 truncate text-center px-2 pb-1" dir="ltr">{user.email}</p>
        )}
        <button onClick={handleLogout}
          title={collapsed && !mobile ? "تسجيل الخروج" : ""}
          className={cn(
            "flex w-full items-center rounded-xl py-3 text-sm font-bold text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all",
            collapsed && !mobile ? "justify-center px-0" : "px-4 gap-3"
          )}>
          {(!collapsed || mobile) && <span>تسجيل الخروج</span>}
          <LogOut className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between px-4 py-3 lg:hidden shadow-sm border-b"
        style={{ background: "var(--wazer-navy)", borderColor: "var(--wazer-navy-light)" }}>
        <button onClick={() => setMobileOpen(true)} className="text-white p-1">
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background: "var(--wazer-yellow)", color: "var(--wazer-navy)" }}>و</span>
          <span className="text-white font-black text-sm">الوزير</span>
        </div>
        <div className="w-8" />
      </div>

      {/* Desktop sidebar */}
      <aside className={cn(
        "sticky top-0 h-screen z-30 hidden lg:flex flex-col transition-all duration-300 shrink-0",
        collapsed ? "w-[68px]" : "w-60"
      )}>
        <NavContent />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -left-3 top-8 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-lg z-50 border-2 transition-all"
          style={{ background: "var(--wazer-yellow)", borderColor: "var(--wazer-navy)", color: "var(--wazer-navy)" }}>
          {collapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 right-0 bottom-0 w-64 shadow-2xl">
            <NavContent mobile />
          </aside>
        </div>
      )}
    </>
  )
}
