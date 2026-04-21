"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { Invoice, Expense } from "@/lib/types"

interface MonthlyChartProps {
  invoices: Invoice[]
  expenses: Expense[]
}

const MONTH_NAMES = [
  "يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو",
  "يوليو", "اغسطس", "سبتمبر", "اكتوبر", "نوفمبر", "ديسمبر",
]

export function MonthlyChart({ invoices, expenses }: MonthlyChartProps) {
  const now = new Date()
  const data = []

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    const monthRevenue = invoices
      .filter((inv) => inv.createdAt.startsWith(monthKey))
      .reduce((sum, inv) => sum + inv.totalPrice, 0)

    const monthExpenses = expenses
      .filter((exp) => exp.date.startsWith(monthKey))
      .reduce((sum, exp) => sum + exp.amount, 0)

    data.push({
      month: MONTH_NAMES[date.getMonth()],
      ايرادات: monthRevenue,
      مصروفات: monthExpenses,
      ربح: monthRevenue - monthExpenses,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">الايرادات والمصروفات - اخر 6 اشهر</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                className="text-xs"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  direction: "rtl",
                }}
                labelStyle={{ color: "var(--color-foreground)" }}
                formatter={(value: number) => [`${value.toLocaleString("ar-EG")} ج.م`]}
              />
              <Legend
                wrapperStyle={{ direction: "rtl", fontSize: 12 }}
              />
              <Bar dataKey="ايرادات" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="مصروفات" fill="var(--color-chart-5)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
