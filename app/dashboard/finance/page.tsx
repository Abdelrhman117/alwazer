"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { useSuppliers, useSupplierTransactions } from "@/lib/store"
import { addSupplier, deleteSupplier, addSupplierTransaction, deleteSupplierTransaction } from "@/lib/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Eye, Trash2, Banknote, Building2, X, Plus,
  Scissors, Layers, Sparkles, MoveRight, Box, Printer, FileText, Wallet
} from "lucide-react"
import { toast } from "sonner"
import type { Supplier, SupplierTransaction } from "@/lib/types"
import { SUPPLIER_CATEGORIES } from "@/lib/types"
import { cn } from "@/lib/utils"

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  printing: <Printer className="w-5 h-5 text-blue-500" />,
  paper: <FileText className="w-5 h-5 text-amber-600" />,
  zincs: <Sparkles className="w-5 h-5 text-cyan-500" />,
  emboss: <Sparkles className="w-5 h-5 text-yellow-500" />,
  lamination: <Layers className="w-5 h-5 text-cyan-500" />,
  spot: <Box className="w-5 h-5 text-purple-500" />,
  riga: <MoveRight className="w-5 h-5 text-green-500" />,
  cutting: <Scissors className="w-5 h-5 text-red-500" />,
  dies: <Building2 className="w-5 h-5 text-slate-500" />,
}

export default function SuppliersPage() {
  const { user } = useAuth()
  const { suppliers, loading: supLoading } = useSuppliers()
  const { transactions: allTransactions, loading: txLoading } = useSupplierTransactions()

  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false)

  const [newSupplierName, setNewSupplierName] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("نقدي (كاش)")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [transactionType, setTransactionType] = useState<"تنزيل" | "إضافة_مديونية">("تنزيل")

  // ─── Computed balances ────────────────────────────────────────────────────

  const suppliersWithBalances = useMemo(() => {
    return suppliers.map((s) => {
      const txs = allTransactions.filter((t) => t.supplierId === s.id)
      const totalDebts = txs.filter((t) => t.type === "تكلفة_فاتورة" || t.type === "إضافة_مديونية").reduce((sum, t) => sum + t.amount, 0)
      const totalPaid = txs.filter((t) => t.type === "تنزيل").reduce((sum, t) => sum + t.amount, 0)
      return { ...s, totalDebts, totalPaid, balance: totalDebts - totalPaid }
    })
  }, [suppliers, allTransactions])

  const supplierTxs = selectedSupplier
    ? allTransactions.filter((t) => t.supplierId === selectedSupplier.id)
    : []

  const selectedBalance = selectedSupplier
    ? suppliersWithBalances.find((s) => s.id === selectedSupplier.id)
    : null

  const filteredByCategory = activeCategory
    ? suppliersWithBalances.filter((s) => s.categoryId === activeCategory)
    : suppliersWithBalances

  const totalDebtsByCategory = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const s of suppliersWithBalances) {
      totals[s.categoryId] = (totals[s.categoryId] || 0) + Math.max(0, s.balance)
    }
    return totals
  }, [suppliersWithBalances])

  const formatMoney = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async function handleAddSupplier() {
    if (!newSupplierName.trim() || !activeCategory) return toast.error("أدخل اسم المورد واختر القسم")
    if (!user) return
    const cat = SUPPLIER_CATEGORIES.find((c) => c.id === activeCategory)
    try {
      await addSupplier(user.uid, {
        name: newSupplierName.trim(),
        categoryId: activeCategory,
        categoryName: cat?.name || "",
        createdAt: new Date().toISOString(),
      })
      toast.success("تم إضافة المورد")
      setIsAddSupplierOpen(false)
      setNewSupplierName("")
    } catch {
      toast.error("فشل في إضافة المورد")
    }
  }

  async function handleDeleteSupplier(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المورد؟")) return
    if (!user) return
    try {
      await deleteSupplier(user.uid, id)
      toast.success("تم حذف المورد")
    } catch {
      toast.error("فشل في حذف المورد")
    }
  }

  async function handleAddPayment() {
    if (!paymentAmount || isNaN(Number(paymentAmount))) return toast.error("أدخل مبلغاً صحيحاً")
    if (!user || !selectedSupplier) return
    try {
      await addSupplierTransaction(user.uid, {
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        supplierCategoryId: selectedSupplier.categoryId,
        supplierCategoryName: selectedSupplier.categoryName,
        amount: parseFloat(paymentAmount),
        date: new Date().toLocaleDateString("en-GB"),
        type: transactionType,
        method: paymentMethod,
        notes: paymentNotes || (transactionType === "تنزيل" ? "دفعة للمورد" : "إضافة مديونية"),
      })
      toast.success(transactionType === "تنزيل" ? "تم تسجيل الدفعة" : "تم إضافة المديونية")
      setIsAddPaymentOpen(false)
      setPaymentAmount(""); setPaymentNotes(""); setPaymentMethod("نقدي (كاش)")
      setTransactionType("تنزيل")
    } catch {
      toast.error("فشل في تسجيل المعاملة")
    }
  }

  async function handleDeleteTransaction(txId: string) {
    if (!confirm("هل أنت متأكد من حذف هذه المعاملة؟")) return
    if (!user) return
    try {
      await deleteSupplierTransaction(user.uid, txId)
      toast.success("تم حذف المعاملة")
    } catch {
      toast.error("فشل في حذف المعاملة")
    }
  }

  if (supLoading || txLoading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-xl md:text-2xl font-black flex items-center gap-3 text-slate-800">
          <Wallet className="text-blue-600 w-7 h-7" /> الحسابات والديون
        </h1>
        {activeCategory && (
          <Button onClick={() => { setIsAddSupplierOpen(true) }}
            className="bg-blue-600 hover:bg-blue-700 h-12 w-full md:w-auto px-6 font-bold rounded-xl shadow-lg flex items-center gap-2">
            <Plus className="w-5 h-5" /> إضافة مورد
          </Button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn("px-4 py-2 rounded-xl font-bold text-sm transition-all border", !activeCategory ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400")}
        >الكل</button>
        {SUPPLIER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn("px-4 py-2 rounded-xl font-bold text-sm transition-all border flex items-center gap-2", activeCategory === cat.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300")}
          >
            {CATEGORY_ICONS[cat.id]}
            {cat.name}
            {totalDebtsByCategory[cat.id] > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-black">{formatMoney(totalDebtsByCategory[cat.id])}</span>
            )}
          </button>
        ))}
      </div>

      {/* Suppliers Grid */}
      {filteredByCategory.length === 0 ? (
        <div className="text-center py-16 opacity-30"><Building2 className="w-16 h-16 mx-auto mb-3" /><p className="text-lg font-black">{activeCategory ? "لا يوجد موردين في هذا القسم" : "لا يوجد موردين"}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredByCategory.map((s) => (
            <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {CATEGORY_ICONS[s.categoryId]}
                    <h3 className="font-black text-lg text-slate-800">{s.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">{s.categoryName}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedSupplier(s); setIsDetailsOpen(true) }} className="rounded-lg h-9 px-3 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white"><Eye className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteSupplier(s.id)} className="rounded-lg h-9 px-3 text-red-500 border-red-200 bg-red-50 hover:bg-red-600 hover:text-white"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-black ${s.balance > 0 ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                    {s.balance > 0 ? `دين: ${formatMoney(s.balance)}` : `مسدد`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Dialog */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-6 bg-white text-right" dir="rtl">
          <DialogHeader className="border-b-2 pb-3 mb-4"><DialogTitle className="text-xl font-black flex items-center gap-2"><Building2 className="text-blue-600 w-5 h-5" /> إضافة مورد جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 text-sm">القسم</Label>
              <Select value={activeCategory || ""} onValueChange={setActiveCategory}>
                <SelectTrigger className="h-12 font-bold text-base rounded-xl border-2"><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                <SelectContent dir="rtl">
                  {SUPPLIER_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">اسم المورد</Label><Input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} placeholder="مثال: مطبعة الأهرام" className="h-12 font-bold text-base rounded-xl border-2" /></div>
            <Button onClick={handleAddSupplier} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">حفظ المورد</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-6 bg-white text-right" dir="rtl">
          <DialogHeader className="border-b-2 pb-3 mb-4">
            <DialogTitle className="text-xl font-black text-blue-700 flex items-center gap-2"><Banknote className="w-5 h-5" /> تسجيل معاملة مالية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 text-sm">نوع المعاملة</Label>
              <Select value={transactionType} onValueChange={(v) => setTransactionType(v as any)}>
                <SelectTrigger className="h-12 font-bold rounded-xl border-2"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="تنزيل">💵 دفعة للمورد (تنزيل دين)</SelectItem>
                  <SelectItem value="إضافة_مديونية">📋 إضافة مديونية جديدة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">المبلغ (ج.م)</Label><Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" className="h-14 font-black text-2xl text-center rounded-xl border-2 border-blue-200" onFocus={(e) => e.target.select()} /></div>
            {transactionType === "تنزيل" && (
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700 text-sm">طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-12 font-bold rounded-xl border-2"><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="نقدي (كاش)">💵 نقدي (كاش)</SelectItem>
                    <SelectItem value="انستاباي (InstaPay)">📱 انستاباي</SelectItem>
                    <SelectItem value="فودافون كاش">🔴 فودافون كاش</SelectItem>
                    <SelectItem value="تحويل بنكي">🏦 تحويل بنكي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">ملاحظات (اختياري)</Label><Input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="ملاحظات..." className="h-11 font-medium rounded-xl border-2 text-sm" /></div>
            <Button onClick={handleAddPayment} className={`w-full h-12 font-bold text-lg rounded-xl ${transactionType === "تنزيل" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"} text-white`}>
              {transactionType === "تنزيل" ? "تأكيد الدفعة ✅" : "إضافة المديونية"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl p-0 bg-white flex flex-col" dir="rtl">
          <div className="bg-slate-900 p-5 text-white relative">
            <Button variant="ghost" size="icon" onClick={() => setIsDetailsOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"><X className="w-5 h-5" /></Button>
            <DialogTitle className="text-2xl font-black">{selectedSupplier?.name}</DialogTitle>
            <p className="text-blue-300 font-medium text-sm mt-1">{selectedSupplier?.categoryName}</p>
          </div>

          {selectedBalance && (
            <div className="bg-slate-800 px-5 py-4 grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xs text-slate-400 mb-1">إجمالي الديون</p><p className="text-lg font-black text-red-400">{formatMoney(selectedBalance.totalDebts)}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">المدفوع</p><p className="text-lg font-black text-green-400">{formatMoney(selectedBalance.totalPaid)}</p></div>
              <div><p className="text-xs text-slate-400 mb-1">المتبقي</p><p className={`text-lg font-black ${selectedBalance.balance > 0 ? "text-red-400" : "text-green-400"}`}>{formatMoney(selectedBalance.balance)}</p></div>
            </div>
          )}

          <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100">
            <h4 className="font-black text-slate-800">سجل المعاملات</h4>
            <Button onClick={() => setIsAddPaymentOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-9 px-4 text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> معاملة جديدة</Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {supplierTxs.length === 0 ? (
              <div className="text-center py-10 opacity-40"><Banknote className="w-12 h-12 mx-auto mb-3" /><p className="font-bold">لا توجد معاملات</p></div>
            ) : [...supplierTxs].reverse().map((tx) => (
              <div key={tx.id} className={`p-4 rounded-xl border flex flex-col gap-2 relative ${tx.type === "تنزيل" ? "bg-green-50/50 border-green-100" : "bg-red-50/50 border-red-100"}`}>
                <Button onClick={() => handleDeleteTransaction(tx.id)} variant="ghost" size="icon" className="absolute top-2 left-2 text-red-300 hover:text-red-600 hover:bg-red-50 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                <div className="flex justify-between items-center pr-8">
                  <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border">{tx.date}</span>
                  <span className={`font-black text-lg ${tx.type === "تنزيل" ? "text-green-700" : "text-red-700"}`}>
                    {tx.type === "تنزيل" ? "-" : "+"}{formatMoney(tx.amount)} ج.م
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-bold px-2 py-0.5 rounded ${tx.type === "تنزيل" ? "bg-green-200/50 text-green-800" : "bg-red-200/50 text-red-800"}`}>
                    {tx.type === "تنزيل" ? "دفعة" : tx.type === "إضافة_مديونية" ? "مديونية" : "تكلفة فاتورة"}
                  </span>
                  {tx.notes && <span className="text-slate-500 truncate max-w-[200px]">{tx.notes}</span>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
