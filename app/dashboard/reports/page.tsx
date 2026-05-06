"use client"

import { useMemo, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { BarChart3, TrendingUp, TrendingDown, Wallet, Building2, Users, ChevronDown } from "lucide-react"
import { useInvoices, useExpenses, useClients, useSuppliers, useSupplierTransactions, useClientTransactions } from "@/lib/store"
import { EXPENSE_CATEGORIES } from "@/lib/types"

const MONTHS_AR = ["يناير","فبراير","مارس","إبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]

// DD/MM/YYYY → Date (local time, no timezone shift)
function parseDMY(s: string): Date {
  if (!s) return new Date(0)
  const p = s.split("/")
  if (p.length === 3) return new Date(+p[2], +p[1] - 1, +p[0])
  return new Date(s)
}

export default function ReportsPage() {
  const { invoices } = useInvoices()
  const { expenses } = useExpenses()
  const { clients } = useClients()
  const { suppliers } = useSuppliers()
  const { transactions: supTxs } = useSupplierTransactions()
  const { transactions: cliTxs } = useClientTransactions()

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    invoices.forEach((inv) => { const y = parseDMY(inv.date).getFullYear(); if (!isNaN(y)) years.add(y) })
    expenses.forEach((exp) => { const y = new Date(exp.date).getFullYear(); if (!isNaN(y)) years.add(y) })
    years.add(currentYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [invoices, expenses, currentYear])

  const stats = useMemo(() => {
    const yearInvoices = invoices.filter((inv) => parseDMY(inv.date).getFullYear() === selectedYear)
    const yearExpenses = expenses.filter((exp) => new Date(exp.date).getFullYear() === selectedYear)

    const totalRevenue = yearInvoices.reduce((s, inv) => s + inv.totalPrice, 0)
    const totalCosts   = yearInvoices.reduce((s, inv) => s + (inv.totalCost || 0), 0)
    const totalExpenses = yearExpenses.reduce((s, e) => s + e.amount, 0)
    const netProfit = totalRevenue - totalCosts - totalExpenses

    const clientDebts = clients.reduce((sum, c) => {
      const invTotal = invoices.filter((inv) => inv.customerId === c.id).reduce((s, inv) => s + inv.totalPrice, 0)
      const paid = cliTxs.filter((t) => t.clientId === c.id && t.type === "تنزيل").reduce((s, t) => s + t.amount, 0)
      return sum + Math.max(0, invTotal - paid)
    }, 0)

    const supplierDebts = suppliers.reduce((sum, s) => {
      const owed = supTxs.filter((t) => t.supplierId === s.id && (t.type === "تكلفة_فاتورة" || t.type === "إضافة_مديونية")).reduce((a, t) => a + t.amount, 0)
      const paid = supTxs.filter((t) => t.supplierId === s.id && t.type === "تنزيل").reduce((a, t) => a + t.amount, 0)
      return sum + Math.max(0, owed - paid)
    }, 0)

    return { totalRevenue, totalCosts, totalExpenses, netProfit, clientDebts, supplierDebts }
  }, [invoices, expenses, clients, suppliers, supTxs, cliTxs, selectedYear])

  // monthly chart data
  const monthlyData = useMemo(() => {
    return MONTHS_AR.map((name, monthIndex) => {
      const monthInvoices = invoices.filter((inv) => {
        const d = parseDMY(inv.date)
        return d.getFullYear() === selectedYear && d.getMonth() === monthIndex
      })
      const monthExpenses = expenses.filter((exp) => {
        const d = new Date(exp.date)
        return d.getFullYear() === selectedYear && d.getMonth() === monthIndex
      })
      const revenue = monthInvoices.reduce((s, inv) => s + inv.totalPrice, 0)
      const costs   = monthInvoices.reduce((s, inv) => s + (inv.totalCost || 0), 0)
      const expTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
      return { name, مبيعات: Math.round(revenue), تكاليف: Math.round(costs + expTotal), ربح: Math.round(revenue - costs - expTotal) }
    })
  }, [invoices, expenses, selectedYear])

  // expenses by category
  const expensesByCategory = useMemo(() => {
    const yearExpenses = expenses.filter((exp) => new Date(exp.date).getFullYear() === selectedYear)
    const totals: Record<string, number> = {}
    yearExpenses.forEach((e) => { totals[e.category] = (totals[e.category] || 0) + e.amount })
    return Object.entries(totals)
      .map(([cat, amount]) => ({ name: EXPENSE_CATEGORIES[cat as keyof typeof EXPENSE_CATEGORIES] || cat, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses, selectedYear])

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const statCards = [
    { label: "إجمالي المبيعات",     value: fmt(stats.totalRevenue),   color: "#0F1F3D", icon: TrendingUp  },
    { label: "صافي الربح",          value: fmt(stats.netProfit),       color: stats.netProfit >= 0 ? "#16A34A" : "#DC2626", icon: TrendingUp  },
    { label: "إجمالي التكاليف",     value: fmt(stats.totalCosts),      color: "#D97706", icon: TrendingDown },
    { label: "إجمالي المصروفات",    value: fmt(stats.totalExpenses),   color: "#DC2626", icon: TrendingDown },
    { label: "ديون الموردين",       value: fmt(stats.supplierDebts),   color: "#7C3AED", icon: Wallet      },
    { label: "ديون العملاء عليهم",  value: fmt(stats.clientDebts),     color: "#0284C7", icon: Building2   },
    { label: "عدد العملاء",         value: clients.length.toString(),  color: "#0F1F3D", icon: Users       },
    { label: "عدد الموردين",        value: suppliers.length.toString(),color: "#0F1F3D", icon: Building2   },
  ]

  return (
    <div className="p-5 md:p-7 space-y-6 fade-up" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: "var(--wazer-navy)" }}>
            <BarChart3 className="w-6 h-6" /> تقارير الأداء والأرباح
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--wazer-navy-muted)" }}>عرض البيانات حسب السنة</p>
        </div>
        {/* Year selector */}
        <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-10 pl-9 pr-4 rounded-xl border-2 font-bold text-sm outline-none appearance-none cursor-pointer"
            style={{ borderColor: "var(--wazer-navy)", color: "var(--wazer-navy)", background: "white" }}
          >
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--wazer-navy)" }} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all"
            style={{ borderColor: "var(--border)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
              style={{ background: s.color + "18" }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-xs font-bold mb-1" style={{ color: "var(--wazer-navy-muted)" }}>{s.label}</p>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--wazer-navy-muted)" }}>ج.م</p>
          </div>
        ))}
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white rounded-2xl border shadow-sm p-5" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-black text-base mb-5" style={{ color: "var(--wazer-navy)" }}>
          الأداء الشهري — {selectedYear}
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF1FA" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
            <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip
              formatter={(value: number) => [`${value.toLocaleString()} ج.م`, ""]}
              contentStyle={{ direction: "rtl", borderRadius: 12, border: "1px solid #EEF1FA", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="مبيعات" fill="#0F1F3D" radius={[4, 4, 0, 0]} />
            <Bar dataKey="تكاليف" fill="#F5C518" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ربح"    fill="#16A34A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expenses by category */}
      {expensesByCategory.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-5" style={{ borderColor: "var(--border)" }}>
          <h2 className="font-black text-base mb-4" style={{ color: "var(--wazer-navy)" }}>
            المصروفات حسب الفئة — {selectedYear}
          </h2>
          <div className="space-y-3">
            {expensesByCategory.map((item) => {
              const max = expensesByCategory[0].amount
              const pct = max > 0 ? (item.amount / max) * 100 : 0
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-sm font-bold mb-1" style={{ color: "var(--wazer-navy)" }}>
                    <span>{item.name}</span>
                    <span>{item.amount.toLocaleString()} ج.م</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#DC2626" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top Clients by debt */}
      {(() => {
        const clientsWithDebt = clients
          .map((c) => {
            const owed = invoices.filter((inv) => inv.customerId === c.id).reduce((s, inv) => s + inv.totalPrice, 0)
            const paid = cliTxs.filter((t) => t.clientId === c.id && t.type === "تنزيل").reduce((s, t) => s + t.amount, 0)
            return { ...c, debt: Math.max(0, owed - paid) }
          })
          .filter((c) => c.debt > 0)
          .sort((a, b) => b.debt - a.debt)
          .slice(0, 5)
        if (clientsWithDebt.length === 0) return null
        return (
          <div className="bg-white rounded-2xl border shadow-sm p-5" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-black text-base mb-4" style={{ color: "var(--wazer-navy)" }}>أعلى العملاء مديونية</h2>
            <div className="space-y-2">
              {clientsWithDebt.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: "var(--border)", background: "#FFF5F5" }}>
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-sm"
                      style={{ background: "var(--wazer-navy)", color: "white" }}>{i + 1}</span>
                    <div>
                      <p className="font-black text-sm" style={{ color: "var(--wazer-navy)" }}>{c.company}</p>
                      <p className="text-xs" style={{ color: "var(--wazer-navy-muted)" }}>{c.name}</p>
                    </div>
                  </div>
                  <span className="font-black text-sm text-red-600">{c.debt.toLocaleString()} ج.م</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
