"use client"

import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, TrendingDown, TrendingUp, FileText } from "lucide-react"
import type { Invoice, Expense } from "@/lib/types"

interface StatsCardsProps {
  invoices: Invoice[]
  expenses: Expense[]
}

export function StatsCards({ invoices, expenses }: StatsCardsProps) {
  const today = new Date().toISOString().split("T")[0]

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalPrice, 0)
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const netProfit = totalRevenue - totalExpenses

  const todayRevenue = invoices
    .filter((inv) => inv.createdAt.startsWith(today))
    .reduce((sum, inv) => sum + inv.totalPrice, 0)

  const todayExpenses = expenses
    .filter((exp) => exp.date === today)
    .reduce((sum, exp) => sum + exp.amount, 0)

  const stats = [
    { label: "اجمالي الايرادات", value: totalRevenue.toLocaleString("ar-EG"), today: todayRevenue.toLocaleString("ar-EG"), icon: DollarSign, color: "text-green-600 bg-green-50" },
    { label: "اجمالي المصروفات", value: totalExpenses.toLocaleString("ar-EG"), today: todayExpenses.toLocaleString("ar-EG"), icon: TrendingDown, color: "text-red-600 bg-red-50" },
    { label: "صافي الربح", value: netProfit.toLocaleString("ar-EG"), today: (todayRevenue - todayExpenses).toLocaleString("ar-EG"), icon: TrendingUp, color: netProfit >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50" },
    { label: "إجمالي الفواتير", value: invoices.length.toString(), today: null, icon: FileText, color: "text-blue-600 bg-blue-50" },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-start gap-4 p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold tabular-nums">
                {stat.value}
                {stat.today !== null && <span className="text-xs text-muted-foreground font-normal mr-1">ج.م</span>}
              </p>
              {stat.today !== null && (
                <p className="text-xs text-muted-foreground">اليوم: {stat.today} ج.م</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
