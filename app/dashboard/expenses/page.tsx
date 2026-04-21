"use client"

import { useState, useMemo } from "react"
import { useExpenses } from "@/lib/store"
import { useAuth } from "@/lib/auth-context"
import { addExpense, updateExpense, deleteExpense } from "@/lib/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Receipt, Trash2, Pencil, Filter } from "lucide-react"
import type { Expense, ExpenseCategory } from "@/lib/types"
import { EXPENSE_CATEGORIES } from "@/lib/types"
import { toast } from "sonner"

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  rent: "bg-blue-100 text-blue-800",
  salaries: "bg-green-100 text-green-800",
  materials: "bg-amber-100 text-amber-800",
  ads: "bg-purple-100 text-purple-800",
  other: "bg-slate-100 text-slate-800",
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const { expenses, loading } = useExpenses()

  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const [formCategory, setFormCategory] = useState<ExpenseCategory>("other")
  const [formDescription, setFormDescription] = useState("")
  const [formAmount, setFormAmount] = useState("")
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0])

  const filtered = useMemo(() => {
    let result = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (categoryFilter !== "all") result = result.filter((e) => e.category === categoryFilter)
    if (dateFrom) result = result.filter((e) => e.date >= dateFrom)
    if (dateTo) result = result.filter((e) => e.date <= dateTo)
    return result
  }, [expenses, categoryFilter, dateFrom, dateTo])

  const totalFiltered = filtered.reduce((sum, e) => sum + e.amount, 0)

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const exp of filtered) {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount
    }
    return totals
  }, [filtered])

  function openAdd() {
    setEditingExpense(null)
    setFormCategory("other")
    setFormDescription("")
    setFormAmount("")
    setFormDate(new Date().toISOString().split("T")[0])
    setFormOpen(true)
  }

  function openEdit(exp: Expense) {
    setEditingExpense(exp)
    setFormCategory(exp.category)
    setFormDescription(exp.description)
    setFormAmount(String(exp.amount))
    setFormDate(exp.date)
    setFormOpen(true)
  }

  async function handleSave() {
    if (!formDescription.trim()) return toast.error("يرجى إدخال وصف المصروف")
    const amount = parseFloat(formAmount)
    if (!formAmount || isNaN(amount) || amount <= 0) return toast.error("يرجى إدخال مبلغ صحيح")
    if (!user) return
    setSaving(true)
    try {
      if (editingExpense) {
        await updateExpense(user.uid, editingExpense.id, {
          category: formCategory,
          description: formDescription.trim(),
          amount,
          date: formDate,
        })
        toast.success("تم تحديث المصروف")
      } else {
        await addExpense(user.uid, {
          category: formCategory,
          description: formDescription.trim(),
          amount,
          date: formDate,
          createdAt: new Date().toISOString(),
        })
        toast.success("تم إضافة المصروف")
      }
      setFormOpen(false)
    } catch {
      toast.error("فشل في حفظ المصروف")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId || !user) return
    try {
      await deleteExpense(user.uid, deleteId)
      toast.success("تم حذف المصروف")
    } catch {
      toast.error("فشل في حذف المصروف")
    } finally {
      setDeleteId(null)
    }
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="flex flex-col gap-6 p-6" dir="rtl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">المصروفات</h1>
          <p className="text-sm text-muted-foreground">تتبع مصروفات الشركة</p>
        </div>
        <Button onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" /> إضافة مصروف</Button>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).map((cat) => (
          <Card key={cat} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCategoryFilter(cat === categoryFilter ? "all" : cat)}>
            <CardContent className="p-4">
              <Badge className={`mb-2 text-xs ${CATEGORY_COLORS[cat]}`}>{EXPENSE_CATEGORIES[cat]}</Badge>
              <p className="text-lg font-bold">{(categoryTotals[cat] || 0).toLocaleString()} ج</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <Filter className="h-4 w-4 text-muted-foreground mt-auto mb-1" />
            <div className="flex flex-col gap-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">الفئة</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 w-40 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {(Object.entries(EXPENSE_CATEGORIES) as [ExpenseCategory, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(dateFrom || dateTo || categoryFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setCategoryFilter("all") }} className="h-9 text-xs">مسح الفلاتر</Button>
            )}
            <div className="mr-auto flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{filtered.length} مصروف</span>
              <span className="text-sm font-bold">{totalFiltered.toLocaleString()} ج.م</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Receipt className="h-12 w-12 opacity-20" />
              <p className="font-medium">لا توجد مصروفات</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((exp) => (
                <div key={exp.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs ${CATEGORY_COLORS[exp.category]}`}>{EXPENSE_CATEGORIES[exp.category]}</Badge>
                      <span className="text-sm font-medium truncate">{exp.description}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{exp.date}</p>
                  </div>
                  <span className="font-bold text-base shrink-0">{exp.amount.toLocaleString()} ج</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(exp)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(exp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editingExpense ? "تعديل المصروف" : "إضافة مصروف جديد"}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>الفئة</Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as ExpenseCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(EXPENSE_CATEGORIES) as [ExpenseCategory, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>الوصف</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="وصف المصروف..." className="resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>المبلغ (ج.م)</Label>
                <Input type="number" min="0" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>التاريخ</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "جاري الحفظ..." : editingExpense ? "حفظ التعديلات" : "إضافة المصروف"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>حذف المصروف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
