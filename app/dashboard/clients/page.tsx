"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Building2, Eye, History, Package, User, UserPlus,
  PlusCircle, Banknote, CreditCard, Pencil, Trash2, MessageCircle, X, Printer
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useClients, useInvoices, useClientTransactions } from "@/lib/store"
import {
  addClient, updateClient, deleteClient,
  addClientTransaction, deleteClientTransaction, deleteInvoice,
  getSupplierTransactions, deleteSupplierTransaction, getClientTransactions,
} from "@/lib/firestore"
import type { Client, ClientTransaction, Invoice } from "@/lib/types"

export default function ClientsPage() {
  const { user } = useAuth()
  const { clients, loading: clientsLoading } = useClients()
  const { invoices: allInvoices } = useInvoices()
  const { transactions: allTransactions } = useClientTransactions()

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [isEditClientOpen, setIsEditClientOpen] = useState(false)
  const [isPrintingReport, setIsPrintingReport] = useState(false)

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("نقدي (كاش)")
  const [paymentNotes, setPaymentNotes] = useState("")

  const [newCompany, setNewCompany] = useState("")
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")

  // حسابات العميل المفتوح
  const clientInvoices = selectedClient
    ? allInvoices.filter((inv) =>
        inv.customerId === selectedClient.id ||
        (inv.customerId === "manual" && inv.clientName === selectedClient.company)
      )
    : []
  const clientTransactions = selectedClient
    ? allTransactions.filter((tx) => tx.clientId === selectedClient.id)
    : []

  const totalInvoicesAmount = clientInvoices.reduce((s, inv) => s + (inv.totalPrice || 0), 0)
  const totalPaymentsAmount = clientTransactions
    .filter((t) => t.type === "تنزيل")
    .reduce((s, t) => s + t.amount, 0)
  const currentDebt = totalInvoicesAmount - totalPaymentsAmount

  // حساب الأرصدة لكل العملاء
  const clientsWithBalances = clients.map((c) => {
    const cInvoices = allInvoices.filter((inv) =>
      inv.customerId === c.id ||
      (inv.customerId === "manual" && inv.clientName === c.company)
    )
    const cTrans = allTransactions.filter((t) => t.clientId === c.id && t.type === "تنزيل")
    const owed = cInvoices.reduce((s, inv) => s + (inv.totalPrice || 0), 0)
    const paid = cTrans.reduce((s, t) => s + t.amount, 0)
    return { ...c, balance: owed - paid }
  })

  const formatMoney = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async function handleAddClient() {
    if (!newCompany || !newName) return toast.error("برجاء إدخال اسم الشركة واسم المسؤول")
    if (!user) return
    try {
      await addClient(user.uid, {
        company: newCompany.trim(),
        name: newName.trim(),
        phone: newPhone.trim() || "لا يوجد",
        notes: "",
        createdAt: new Date().toISOString(),
      })
      toast.success("تم تسجيل العميل بنجاح")
      setIsAddClientOpen(false)
      setNewCompany(""); setNewName(""); setNewPhone("")
    } catch {
      toast.error("فشل في إضافة العميل")
    }
  }

  async function handleEditClient() {
    if (!newCompany || !newName) return toast.error("برجاء إدخال البيانات الأساسية")
    if (!user || !selectedClient) return
    try {
      await updateClient(user.uid, selectedClient.id, {
        company: newCompany.trim(),
        name: newName.trim(),
        phone: newPhone.trim() || "لا يوجد",
      })
      toast.success("تم تحديث بيانات العميل")
      setIsEditClientOpen(false)
    } catch {
      toast.error("فشل في تحديث البيانات")
    }
  }

  function openEditClient(client: Client) {
    setSelectedClient(client)
    setNewCompany(client.company)
    setNewName(client.name)
    setNewPhone(client.phone === "لا يوجد" ? "" : client.phone)
    setIsEditClientOpen(true)
  }

  function viewDetails(client: Client) {
    setSelectedClient(client)
    setIsDetailsOpen(true)
  }

  async function handleAddPayment() {
    if (!paymentAmount || isNaN(Number(paymentAmount))) return toast.error("برجاء إدخال مبلغ صحيح")
    if (!user || !selectedClient) return
    try {
      await addClientTransaction(user.uid, {
        clientId: selectedClient.id,
        clientName: selectedClient.company,
        amount: parseFloat(paymentAmount),
        date: new Date().toLocaleDateString("en-GB"),
        type: "تنزيل",
        method: paymentMethod,
        notes: paymentNotes || "تنزيل من الحساب",
      })
      toast.success("تم تسجيل التنزيل بنجاح")
      setIsAddPaymentOpen(false)
      setPaymentAmount(""); setPaymentNotes(""); setPaymentMethod("نقدي (كاش)")
    } catch {
      toast.error("فشل في تسجيل التنزيل")
    }
  }

  async function handleDeleteInvoice(invoiceId: string) {
    if (!confirm("هل أنت متأكد من حذف الفاتورة؟")) return
    if (!user) return
    try {
      await deleteInvoice(user.uid, invoiceId)
      const [sTxs, cTxs] = await Promise.all([
        getSupplierTransactions(user.uid),
        getClientTransactions(user.uid),
      ])
      await Promise.all([
        ...sTxs.filter((t) => t.invoiceId === invoiceId).map((t) => deleteSupplierTransaction(user.uid, t.id)),
        ...cTxs.filter((t) => t.invoiceId === invoiceId).map((t) => deleteClientTransaction(user.uid, t.id)),
      ])
      toast.success("تم حذف الفاتورة")
    } catch {
      toast.error("فشل في حذف الفاتورة")
    }
  }

  async function handleDeletePayment(txId: string) {
    if (!confirm("هل أنت متأكد من إلغاء هذا التنزيل؟")) return
    if (!user) return
    try {
      await deleteClientTransaction(user.uid, txId)
      toast.success("تم إلغاء التنزيل")
    } catch {
      toast.error("فشل في إلغاء التنزيل")
    }
  }

  function sendStatementWhatsApp() {
    if (!selectedClient?.phone || selectedClient.phone === "لا يوجد")
      return toast.error("العميل ليس لديه رقم هاتف مسجل")
    let phone = selectedClient.phone.toString().trim()
    if (phone.startsWith("0")) phone = "2" + phone
    const today = new Date()
    const formattedDate = `${today.getDate()} / ${today.getMonth() + 1} / ${today.getFullYear()}`

    let text = `📄 *كشف حساب تفصيلي – مطبعة الوزير*\n`
    text += `اسم الشركة: ${selectedClient.company}\n`
    text += `التاريخ: ${formattedDate}\n`
    text += `────────────────────\n`
    text += `💰 *الرصيد المستحق:*\n\n`
    text += `*${formatMoney(currentDebt)}* جنيه مصري\n`
    text += `────────────────────\n`

    if (clientInvoices.length > 0) {
      const last = clientInvoices[0]
      text += `🧾 *آخر فاتورة:*\n\nبتاريخ ${last.date}\n\nبقيمة *${formatMoney(last.totalPrice)}* جنيه مصري\n`
      text += `────────────────────\n`
    }

    text += `💳 *طرق الدفع المتاحة:*\n▪ *إنستا باي:*\n\n01092201036\n01115538224\n▪ *فودافون كاش:*\n\n01092201036\n▪ *اتصالات كاش:*\n\n01115538224\n────────────────────\nنرجو التكرم بإتمام السداد في أقرب وقت مناسب.\nشاكرين حسن تعاونكم الدائم 🌷`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank")
  }

  function printReport() {
    setIsPrintingReport(true)
    setTimeout(() => { window.print(); setIsPrintingReport(false) }, 500)
  }

  // ─── Print View ──────────────────────────────────────────────────────────
  if (isPrintingReport) {
    return (
      <div className="p-10 bg-white min-h-screen text-right font-serif" dir="rtl">
        <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8">
          <div><h1 className="text-3xl font-black">كشف حساب تفصيلي</h1><p className="text-lg font-bold mt-2 text-slate-600">التاريخ: {new Date().toLocaleDateString("en-GB")}</p></div>
          <h2 className="text-3xl font-black text-slate-800 italic">مطبعة الوزير</h2>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-2xl border-2">
          <div><p className="text-slate-500 font-bold mb-1">بيانات العميل:</p><h3 className="text-2xl font-black text-blue-900">{selectedClient?.company}</h3><p className="text-xl font-bold mt-2">المسؤول: {selectedClient?.name}</p></div>
          <div className="bg-slate-900 text-white rounded-2xl p-6 text-center"><p className="text-base opacity-80 mb-2 font-bold">الرصيد المتبقي</p><h4 className="text-4xl font-black">{formatMoney(currentDebt)} ج.م</h4></div>
        </div>
        <table className="w-full border-collapse border-2 border-slate-300 text-base mb-8">
          <thead className="bg-slate-100 font-bold"><tr><th className="p-3 border text-right">التاريخ</th><th className="p-3 border text-right">البنود</th><th className="p-3 border text-left">التكلفة</th></tr></thead>
          <tbody>{clientInvoices.map((inv) => (<tr key={inv.id}><td className="p-3 border text-center font-bold text-slate-600">{inv.date}</td><td className="p-3 border">{inv.items.map((it, i) => (<div key={i}>• {it.name} (كمية: {it.qty})</div>))}</td><td className="p-3 border text-left font-black">{formatMoney(inv.totalPrice)} ج.م</td></tr>))}</tbody>
        </table>
        <table className="w-full border-collapse border-2 border-slate-300 text-base">
          <thead className="bg-slate-100 font-bold"><tr><th className="p-3 border text-right">التاريخ</th><th className="p-3 border text-right">طريقة الدفع</th><th className="p-3 border text-right">ملاحظات</th><th className="p-3 border text-left">المبلغ</th></tr></thead>
          <tbody>{clientTransactions.filter(t => t.type === "تنزيل").map((t) => (<tr key={t.id}><td className="p-3 border text-center font-bold">{t.date}</td><td className="p-3 border">{t.method || "نقدي"}</td><td className="p-3 border">{t.notes}</td><td className="p-3 border text-left font-black text-green-700">+{formatMoney(t.amount)} ج.م</td></tr>))}</tbody>
        </table>
      </div>
    )
  }

  if (clientsLoading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="p-4 md:p-6 space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-xl md:text-2xl font-black flex items-center gap-3 text-slate-800">
          <Building2 className="text-blue-600 w-7 h-7" /> أرشيف الشركات والعملاء
        </h1>
        <Button onClick={() => { setNewCompany(""); setNewName(""); setNewPhone(""); setIsAddClientOpen(true) }}
          className="bg-blue-600 hover:bg-blue-700 h-12 w-full md:w-auto px-6 font-bold rounded-xl shadow-lg flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> إضافة عميل جديد
        </Button>
      </div>

      {/* Clients Grid */}
      <Card className="rounded-[1.5rem] border-none shadow-sm bg-white">
        <CardContent className="p-6">
          {clientsWithBalances.length === 0 ? (
            <div className="text-center py-16 opacity-30"><User className="w-16 h-16 mx-auto mb-3" /><p className="text-lg font-black">لا يوجد عملاء مسجلين</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientsWithBalances.map((c) => (
                <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col gap-3 shadow-sm hover:border-blue-200 transition-all">
                  <div className="flex justify-between items-start gap-3">
                    <button onClick={() => viewDetails(c)} className="text-right flex-1">
                      <h3 className="font-black text-lg text-blue-700">{c.company}</h3>
                      <p className="text-xs text-slate-500 font-bold mt-1">{c.name} <span className="block text-slate-400">{c.phone}</span></p>
                    </button>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditClient(c)} className="rounded-lg border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-600 hover:text-white h-9 px-3"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => viewDetails(c)} className="rounded-lg border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white h-9 px-3"><Eye className="w-4 h-4 ml-1.5" /> فتح</Button>
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-xs font-black text-center ${c.balance > 0 ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                        {c.balance > 0 ? `دين: ${formatMoney(c.balance)}` : `رصيد: ${formatMoney(Math.abs(c.balance))}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-[2rem] p-6 bg-white border-none shadow-2xl text-right" dir="rtl">
          <DialogHeader className="border-b-2 pb-3 mb-4"><DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2"><UserPlus className="text-blue-600 w-5 h-5" /> تسجيل عميل جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">اسم الشركة أو المحل</Label><Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="مثال: صيدلية الأمل" className="h-12 font-bold text-base rounded-xl border-2" /></div>
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">اسم المسؤول</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثال: أحمد محمد" className="h-12 font-bold text-base rounded-xl border-2" /></div>
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">رقم الهاتف (للواتساب)</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="01xxxxxxxxx" className="h-12 font-bold text-base rounded-xl border-2 font-mono" dir="ltr" /></div>
            <Button onClick={handleAddClient} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl">حفظ بيانات العميل</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-[2rem] p-6 bg-white border-none shadow-2xl text-right" dir="rtl">
          <DialogHeader className="border-b-2 pb-3 mb-4"><DialogTitle className="text-xl font-black text-orange-600 flex items-center gap-2"><Pencil className="w-5 h-5" /> تعديل بيانات العميل</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">اسم الشركة أو المحل</Label><Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className="h-12 font-bold text-base rounded-xl border-2 border-orange-200" /></div>
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">اسم المسؤول</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-12 font-bold text-base rounded-xl border-2 border-orange-200" /></div>
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">رقم الهاتف</Label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-12 font-bold text-base rounded-xl border-2 border-orange-200 font-mono" dir="ltr" /></div>
            <Button onClick={handleEditClient} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl">حفظ التعديلات</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-[2rem] p-6 bg-white border-none shadow-2xl text-right" dir="rtl">
          <DialogHeader className="border-b-2 pb-3 mb-4"><DialogTitle className="text-xl font-black text-green-700 flex items-center gap-2"><Banknote className="w-5 h-5" /> إضافة تنزيل رصيد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">المبلغ المدفوع (ج.م)</Label><Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" className="h-14 font-black text-2xl text-center rounded-xl border-2 border-green-200 text-green-700" onFocus={(e) => e.target.select()} /></div>
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-12 font-bold text-base rounded-xl border-2"><SelectValue /></SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="نقدي (كاش)">💵 نقدي (كاش)</SelectItem>
                  <SelectItem value="انستاباي (InstaPay)">📱 انستاباي (InstaPay)</SelectItem>
                  <SelectItem value="فودافون كاش">🔴 فودافون كاش</SelectItem>
                  <SelectItem value="تحويل بنكي">🏦 تحويل بنكي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="font-bold text-slate-700 text-sm">ملاحظات (اختياري)</Label><Input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="مثال: دفعة تحت الحساب..." className="h-11 font-medium rounded-xl border-2 text-sm" /></div>
            <Button onClick={handleAddPayment} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl">تأكيد التنزيل ✅</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} className="w-full max-w-screen-xl h-[95vh] overflow-hidden rounded-2xl p-4 md:p-6 border border-gray-200 shadow-lg bg-white text-right flex flex-col gap-4">
          {/* Header */}
          <div className="bg-slate-900 p-4 md:p-6 text-white relative rounded-xl shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setIsDetailsOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10 rounded-full h-10 w-10"><X className="w-6 h-6" /></Button>
            <DialogTitle className="text-2xl md:text-3xl font-black">{selectedClient?.company || "ملف العميل"}</DialogTitle>
            <p className="text-blue-300 font-medium flex items-center gap-2 mt-2 text-sm"><User className="w-4 h-4" /> <span className="font-bold">{selectedClient?.name}</span> <span className="text-slate-400">|</span> <span className="font-mono">{selectedClient?.phone}</span></p>
          </div>

          {/* Balance Card */}
          <div className="flex justify-center shrink-0">
            <div className="bg-slate-800 p-4 md:p-6 rounded-2xl border-2 border-slate-700 w-full max-w-md">
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <p className="text-xs font-bold opacity-80 mb-2 uppercase tracking-widest text-slate-300 text-center">{currentDebt > 0 ? "الرصيد المستحق (الديون)" : "الرصيد الزائد (الائتمان)"}</p>
                <h3 className={`text-2xl md:text-3xl font-black font-mono text-center ${currentDebt > 0 ? "text-red-400" : "text-green-400"}`}>{formatMoney(Math.abs(currentDebt))} <span className="text-sm font-normal">ج.م</span></h3>
                <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400 text-center space-y-1">
                  <p>فواتير: {clientInvoices.length} | مدفوعات: {clientTransactions.filter(t => t.type === "تنزيل").length}</p>
                  <p>إجمالي الفواتير: {formatMoney(totalInvoicesAmount)} ج.م</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tables */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
              {/* Invoices */}
              <Card className="border-2 border-slate-100 rounded-2xl flex flex-col h-full overflow-hidden">
                <CardHeader className="bg-slate-50 border-b p-4 flex flex-row justify-between items-center shrink-0">
                  <h4 className="font-black text-lg flex items-center gap-2"><Package className="w-5 h-5 text-blue-600" /> سجل الطلبات والفواتير</h4>
                </CardHeader>
                <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto">
                  {clientInvoices.length > 0 ? [...clientInvoices].reverse().map((inv) => (
                    <div key={inv.id} className="bg-white p-4 rounded-xl border border-slate-100 flex flex-col gap-3 shadow-sm hover:border-blue-200 relative group">
                      <Button onClick={() => handleDeleteInvoice(inv.id)} variant="ghost" size="icon" className="absolute top-2 left-2 text-red-300 hover:text-red-600 hover:bg-red-50 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2 pr-10">
                        <span className="text-slate-500 text-xs font-bold bg-slate-50 px-3 py-1 rounded-md border">{inv.date}</span>
                        <span className="text-blue-700 font-black text-lg">{formatMoney(inv.totalPrice)} ج.م</span>
                      </div>
                      <div className="space-y-2 px-1">{inv.items.map((it, i) => (<div key={i} className="flex justify-between text-sm font-bold text-slate-700"><span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> {it.name}</span><span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded text-xs">الكمية: {it.qty}</span></div>))}</div>
                    </div>
                  )) : <div className="text-center py-10 opacity-40"><Package className="w-12 h-12 mx-auto mb-3" /><p className="font-bold">لا يوجد طلبيات</p></div>}
                </CardContent>
              </Card>

              {/* Payments */}
              <Card className="border-2 border-slate-100 rounded-2xl flex flex-col h-full overflow-hidden">
                <CardHeader className="bg-slate-50 border-b p-4 flex flex-row justify-between items-center shrink-0">
                  <h4 className="font-black text-lg flex items-center gap-2"><History className="w-5 h-5 text-green-600" /> سجل التنزيلات</h4>
                  <Button onClick={() => setIsAddPaymentOpen(true)} className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold h-9 px-4 text-xs flex items-center gap-1.5"><PlusCircle className="w-4 h-4" /> إضافة تنزيل</Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto">
                  {clientTransactions.filter(t => t.type === "تنزيل").length > 0
                    ? [...clientTransactions].filter(t => t.type === "تنزيل").reverse().map((t) => (
                      <div key={t.id} className="bg-green-50/50 p-4 rounded-xl border border-green-100 flex flex-col gap-3 relative hover:border-green-300">
                        <Button onClick={() => handleDeletePayment(t.id)} variant="ghost" size="icon" className="absolute top-2 left-2 text-red-300 hover:text-red-600 hover:bg-red-50 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                        <div className="flex justify-between items-center border-b border-green-100/50 pb-2 pr-10">
                          <span className="text-slate-500 text-xs font-bold bg-white px-3 py-1 rounded-md border border-green-50">{t.date}</span>
                          <span className="text-green-700 font-black text-lg">+{formatMoney(t.amount)} ج.م</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-green-800 font-bold bg-green-200/50 px-2.5 py-1 rounded flex items-center gap-1.5 text-xs"><CreditCard className="w-3.5 h-3.5" /> {t.method || "نقدي"}</span>
                          <span className="text-slate-500 font-medium text-xs max-w-[150px] truncate">{t.notes}</span>
                        </div>
                      </div>
                    ))
                    : <div className="text-center py-10 opacity-40"><Banknote className="w-12 h-12 mx-auto mb-3 text-green-600" /><p className="font-bold">لم يتم تسجيل أي دفعات</p></div>}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 rounded-b-2xl">
            <div className="flex gap-3 w-full md:w-auto">
              <Button onClick={printReport} className="bg-slate-900 hover:bg-slate-800 font-bold px-6 h-12 rounded-xl text-white flex-1 md:flex-none flex items-center justify-center gap-2"><Printer className="w-5 h-5" /> طباعة التقرير</Button>
              <Button onClick={sendStatementWhatsApp} className="bg-green-600 hover:bg-green-700 font-bold px-6 h-12 rounded-xl text-white flex-1 md:flex-none flex items-center justify-center gap-2"><MessageCircle className="w-5 h-5" /> إرسال واتساب</Button>
            </div>
            <Button onClick={() => setIsDetailsOpen(false)} variant="ghost" className="text-slate-500 font-bold hover:bg-slate-100 rounded-xl px-8 h-12 w-full md:w-auto">إغلاق الملف</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
