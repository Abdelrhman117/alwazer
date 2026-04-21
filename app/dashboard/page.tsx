"use client"

import { useInvoices, useExpenses, useClients, useSuppliers, useSupplierTransactions, useClientTransactions } from "@/lib/store"
import Link from "next/link"
import { useMemo } from "react"
import { TrendingUp, TrendingDown, Wallet, Building2, FileText, Users, Plus, Receipt, ArrowLeft, AlertCircle } from "lucide-react"

export default function DashboardPage() {
  const { invoices, loading: invLoading } = useInvoices()
  const { expenses, loading: expLoading } = useExpenses()
  const { clients } = useClients()
  const { suppliers } = useSuppliers()
  const { transactions: supTxs } = useSupplierTransactions()
  const { transactions: cliTxs } = useClientTransactions()

  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((s, inv) => s + (inv.totalPrice || 0), 0)
    const totalCosts   = invoices.reduce((s, inv) => s + (inv.totalCost  || 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const netProfit = totalRevenue - totalCosts - totalExpenses

    const clientDebts = clients.reduce((sum, c) => {
      const owed = invoices.filter(inv => inv.customerId === c.id).reduce((s, inv) => s + inv.totalPrice, 0)
      const paid = cliTxs.filter(t => t.clientId === c.id && t.type === "تنزيل").reduce((s, t) => s + t.amount, 0)
      return sum + Math.max(0, owed - paid)
    }, 0)

    const supplierDebts = suppliers.reduce((sum, s) => {
      const owed = supTxs.filter(t => t.supplierId === s.id && (t.type === "تكلفة_فاتورة" || t.type === "إضافة_مديونية")).reduce((a, t) => a + t.amount, 0)
      const paid = supTxs.filter(t => t.supplierId === s.id && t.type === "تنزيل").reduce((a, t) => a + t.amount, 0)
      return sum + Math.max(0, owed - paid)
    }, 0)

    // Invoices needing attention (pending or in-progress)
    const pendingInvoices = invoices.filter(inv =>
      (inv as any).status === "confirmed" || (inv as any).status === "inprogress"
    ).length

    return { totalRevenue, totalExpenses, netProfit, clientDebts, supplierDebts, pendingInvoices }
  }, [invoices, expenses, clients, suppliers, supTxs, cliTxs])

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  if (invLoading || expLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ background: "var(--wazer-yellow)" }}>
            <span className="text-2xl font-black" style={{ color: "var(--wazer-navy)" }}>و</span>
          </div>
          <p className="text-sm font-bold" style={{ color: "var(--wazer-navy-muted)" }}>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  const recentInvoices = invoices.slice(0, 6)

  const statCards = [
    { label: "إجمالي المبيعات",  value: fmt(stats.totalRevenue),  sub: "ج.م",   icon: TrendingUp,   bg: "var(--wazer-navy)",   fg: "white",  accent: "var(--wazer-yellow)" },
    { label: "صافي الربح",       value: fmt(stats.netProfit),      sub: "ج.م",   icon: TrendingUp,   bg: "var(--wazer-yellow)", fg: "var(--wazer-navy)", accent: "var(--wazer-navy)" },
    { label: "إجمالي المصروفات", value: fmt(stats.totalExpenses),  sub: "ج.م",   icon: TrendingDown, bg: "#DC2626",             fg: "white",  accent: "#FCA5A5" },
    { label: "ديون العملاء",     value: fmt(stats.clientDebts),    sub: `${clients.length} عميل`,   icon: Building2, bg: "white", fg: "var(--wazer-navy)", accent: "#DC2626" },
    { label: "ديون الموردين",    value: fmt(stats.supplierDebts),  sub: `${suppliers.length} مورد`, icon: Wallet,    bg: "white", fg: "var(--wazer-navy)", accent: "#D97706" },
    { label: "الفواتير المحفوظة",value: invoices.length.toString(),sub: "فاتورة", icon: FileText,     bg: "white", fg: "var(--wazer-navy)", accent: "var(--wazer-navy)" },
  ]

  const STATUS_LABELS: Record<string, string> = {
    quote: "عرض سعر", confirmed: "مؤكدة", inprogress: "قيد التنفيذ",
    delivered: "مسلمة", closed: "مغلقة",
  }
  const STATUS_CLASS: Record<string, string> = {
    quote: "status-pending", confirmed: "status-confirmed", inprogress: "status-inprogress",
    delivered: "status-delivered", closed: "status-closed",
  }

  return (
    <div className="p-5 md:p-7 space-y-6 fade-up" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--wazer-navy)" }}>لوحة التحكم</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--wazer-navy-muted)" }}>نظرة عامة على أداء الشركة</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/invoices">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 shadow-sm"
              style={{ background: "var(--wazer-navy)", color: "white" }}>
              <Plus className="w-4 h-4" /> فاتورة جديدة
            </button>
          </Link>
          <Link href="/dashboard/clients">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 hover:opacity-80"
              style={{ borderColor: "var(--wazer-navy)", color: "var(--wazer-navy)", background: "white" }}>
              <Users className="w-4 h-4" /> عميل جديد
            </button>
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md"
            style={{ background: s.bg, borderColor: s.bg === "white" ? "var(--border)" : "transparent" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: s.bg === "white" ? "#EEF1FA" : "rgba(255,255,255,0.15)" }}>
                <s.icon className="w-4.5 h-4.5" style={{ color: s.bg === "white" ? s.accent : s.accent }} />
              </div>
            </div>
            <p className="text-xs font-bold mb-1 opacity-70" style={{ color: s.fg }}>{s.label}</p>
            <p className="text-2xl font-black leading-none" style={{ color: s.fg }}>{s.value}</p>
            <p className="text-xs mt-1 font-medium opacity-60" style={{ color: s.fg }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Recent Invoices ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-black text-base" style={{ color: "var(--wazer-navy)" }}>آخر الفواتير</h2>
          <Link href="/dashboard/invoices" className="flex items-center gap-1 text-xs font-bold hover:opacity-70"
            style={{ color: "var(--wazer-navy-muted)" }}>
            عرض الكل <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="py-14 text-center">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" style={{ color: "var(--wazer-navy)" }} />
            <p className="text-sm font-bold opacity-40" style={{ color: "var(--wazer-navy)" }}>لا توجد فواتير بعد</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {recentInvoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F4F6FB] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--wazer-yellow)" }}>
                    <span className="text-xs font-black" style={{ color: "var(--wazer-navy)" }}>
                      {inv.clientName?.[0] || "؟"}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: "var(--wazer-navy)" }}>{inv.clientName}</p>
                    <p className="text-xs opacity-50" style={{ color: "var(--wazer-navy)" }}>{inv.date} · {inv.invoiceNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {inv.status && (
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-bold ${STATUS_CLASS[inv.status] || "status-pending"}`}>
                      {STATUS_LABELS[inv.status] || "عرض سعر"}
                    </span>
                  )}
                  <span className="font-black text-sm" style={{ color: "var(--wazer-navy)" }}>{fmt(inv.totalPrice)} ج</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/dashboard/clients",  label: "إدارة العملاء",  icon: Users,     color: "var(--wazer-navy)"   },
          { href: "/dashboard/finance",  label: "الموردين",        icon: Wallet,    color: "#D97706"             },
          { href: "/dashboard/expenses", label: "المصروفات",       icon: Receipt,   color: "#DC2626"             },
          { href: "/dashboard/reports",  label: "التقارير",        icon: TrendingUp,color: "#16A34A"             },
        ].map(q => (
          <Link key={q.href} href={q.href}>
            <div className="bg-white rounded-2xl border p-4 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer"
              style={{ borderColor: "var(--border)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: q.color + "18" }}>
                <q.icon className="w-4.5 h-4.5" style={{ color: q.color }} />
              </div>
              <span className="font-bold text-sm" style={{ color: "var(--wazer-navy)" }}>{q.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
