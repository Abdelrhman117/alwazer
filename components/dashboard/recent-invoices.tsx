"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Invoice } from "@/lib/types"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface RecentInvoicesProps {
  invoices: Invoice[]
}

export function RecentInvoices({ invoices }: RecentInvoicesProps) {
  const recent = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">اخر الفواتير</CardTitle>
        <Link href="/dashboard/invoices">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            عرض الكل
            <ArrowLeft className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">لا توجد فواتير بعد</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recent.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{invoice.clientName}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{invoice.invoiceNumber}</p>
                </div>
                <p className="text-sm font-bold tabular-nums">
                  {invoice.totalPrice.toLocaleString("ar-EG")} ج.م
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
