"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart3, TrendingUp, TrendingDown, Wallet, Building2, Users } from "lucide-react"
import { useInvoices, useExpenses, useClients, useSuppliers, useSupplierTransactions, useClientTransactions } from "@/lib/store"

export default function ReportsPage() {
  const { invoices } = useInvoices()
  const { expenses } = useExpenses()
  const { clients } = useClients()
  const { suppliers } = useSuppliers()
  const { transactions: supTxs } = useSupplierTransactions()
  const { transactions: cliTxs } = useClientTransactions()

  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((s, inv) => s + inv.totalPrice, 0)
    const totalCosts = invoices.reduce((s, inv) => s + (inv.totalCost || 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
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
  }, [invoices, expenses, clients, suppliers, supTxs, cliTxs])

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <h1 className="text-2xl font-black flex items-center gap-2"><BarChart3 className="text-blue-600" /> تقارير الأداء والأرباح</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-600 text-white rounded-[2rem] shadow-xl"><CardContent className="pt-8"><TrendingUp className="mb-2 opacity-50" /><p className="text-sm font-bold opacity-80">إجمالي المبيعات</p><h2 className="text-4xl font-black">{fmt(stats.totalRevenue)} ج.م</h2></CardContent></Card>
        <Card className="bg-green-600 text-white rounded-[2rem] shadow-xl"><CardContent className="pt-8"><TrendingUp className="mb-2 opacity-50" /><p className="text-sm font-bold opacity-80">صافي الربح</p><h2 className="text-4xl font-black">{fmt(stats.netProfit)} ج.م</h2></CardContent></Card>
        <Card className="bg-red-500 text-white rounded-[2rem] shadow-xl"><CardContent className="pt-8"><TrendingDown className="mb-2 opacity-50" /><p className="text-sm font-bold opacity-80">إجمالي المصروفات</p><h2 className="text-4xl font-black">{fmt(stats.totalExpenses)} ج.م</h2></CardContent></Card>
        <Card className="bg-orange-500 text-white rounded-[2rem] shadow-xl"><CardContent className="pt-8"><Wallet className="mb-2 opacity-50" /><p className="text-sm font-bold opacity-80">ديون الموردين</p><h2 className="text-4xl font-black">{fmt(stats.supplierDebts)} ج.م</h2></CardContent></Card>
        <Card className="bg-slate-700 text-white rounded-[2rem] shadow-xl"><CardContent className="pt-8"><Building2 className="mb-2 opacity-50" /><p className="text-sm font-bold opacity-80">ديون العملاء عليهم</p><h2 className="text-4xl font-black">{fmt(stats.clientDebts)} ج.م</h2></CardContent></Card>
        <Card className="bg-purple-600 text-white rounded-[2rem] shadow-xl"><CardContent className="pt-8"><Users className="mb-2 opacity-50" /><p className="text-sm font-bold opacity-80">عدد العملاء | الموردين</p><h2 className="text-4xl font-black">{clients.length} | {suppliers.length}</h2></CardContent></Card>
      </div>
    </div>
  )
}
