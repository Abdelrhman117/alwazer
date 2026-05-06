"use client"

import { useState, useMemo, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useClients, useInvoices, useSettings, generateInvoiceNumber } from "@/lib/store"
import {
  addInvoice, deleteInvoice, updateInvoice,
  addClientTransaction,
  deleteSupplierTransaction, deleteClientTransaction,
  getSupplierTransactions, getClientTransactions,
} from "@/lib/firestore"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  FileText, Trash2, Plus, Printer, MessageCircle,
  CheckCircle2, Clock, PlayCircle, XCircle, X,
  Building2, Search, Copy, CreditCard, AlertCircle,
  ChevronDown, Filter
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Invoice, InvoiceStatus } from "@/lib/types"
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from "@/lib/types"

const SERVICE_CATEGORIES = [
  { id: "printing", label: "طباعة أوفست",      unit: "كرتونة" },
  { id: "cups",     label: "أكواب تيك أواي",   unit: "كرتونة" },
  { id: "sticker",  label: "لزق (ستيكر)",       unit: "رول"    },
  { id: "raw",      label: "خام (مواد خام)",    unit: "كيلو"   },
  { id: "paper",    label: "ورق",               unit: "رزمة"   },
  { id: "social",   label: "سوشيال ميديا",      unit: "شهر"    },
  { id: "other",    label: "خدمة أخرى",         unit: "قطعة"   },
]

const UNITS = ["كرتونة","قطعة","رول","شنطة","رزمة","كيلو","متر","باله","شهر","سنة","1000 قطعة"]
const PAY_METHODS = ["نقدي (كاش)","انستاباي","فودافون كاش","تحويل بنكي"]

const STATUS_LIST: InvoiceStatus[] = ["quote","confirmed","inprogress","delivered","closed"]

interface LineItem {
  id: string
  category: string
  categoryLabel: string
  description: string
  qty: number
  unit: string
  price: number
  printingCost: number
  total: number
}

interface SuspendedDraft {
  id: string
  clientId: string
  clientName: string
  lineItems: LineItem[]
  discount: number
  grandTotal: number
  notes: string
  deliveryDate: string
  savedAt: string
}

const SUSPENDED_KEY = "alwazer_suspended_drafts"

// ─────────────────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { user } = useAuth()
  const { clients } = useClients()
  const { invoices: savedInvoices, loading } = useInvoices()
  const { settings } = useSettings()

  // ── Builder ──────────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId]   = useState("")
  const [manualClientName, setManualClientName]   = useState("")
  const [lineItems, setLineItems]                 = useState<LineItem[]>([])
  const [discount, setDiscount]                   = useState("0")
  const [notes, setNotes]                         = useState("")
  const [deliveryDate, setDeliveryDate]           = useState("")
  const [saving, setSaving]                       = useState(false)
  const [suspended, setSuspended]                 = useState<SuspendedDraft[]>([])

  // ── Load suspended drafts from localStorage on mount ─────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SUSPENDED_KEY)
      if (saved) setSuspended(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  function persistSuspended(drafts: SuspendedDraft[]) {
    setSuspended(drafts)
    try { localStorage.setItem(SUSPENDED_KEY, JSON.stringify(drafts)) } catch { /* ignore */ }
  }

  // ── Add Item dialog ───────────────────────────────────────────────────────
  const [addOpen, setAddOpen]           = useState(false)
  const [editItemId, setEditItemId]     = useState<string | null>(null)
  const [iCat, setICat]                 = useState("printing")
  const [iDesc, setIDesc]               = useState("")
  const [iQty, setIQty]                 = useState("")
  const [iUnit, setIUnit]               = useState("كرتونة")
  const [iPrice, setIPrice]             = useState("")
  const [iPrintCost, setIPrintCost]     = useState("")

  // ── Invoice detail dialog ─────────────────────────────────────────────────
  const [detailInv, setDetailInv]       = useState<Invoice | null>(null)
  const [payAmount, setPayAmount]       = useState("")
  const [payMethod, setPayMethod]       = useState("نقدي (كاش)")
  const [payNotes, setPayNotes]         = useState("")
  const [addingPay, setAddingPay]       = useState(false)

  // ── Print ─────────────────────────────────────────────────────────────────
  const [printInv, setPrintInv]         = useState<Invoice | null>(null)

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  // ── Computed ──────────────────────────────────────────────────────────────
  const subtotal      = lineItems.reduce((s, i) => s + i.total, 0)
  const discountAmt   = parseFloat(discount) || 0
  const grandTotal    = subtotal - discountAmt
  const totalCost     = lineItems.reduce((s, i) => s + i.printingCost, 0)
  const selectedClient = clients.find(c => c.id === selectedClientId)
  const clientName    = selectedClient?.company || manualClientName || ""

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtInt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const filteredInvoices = useMemo(() => {
    return savedInvoices.filter(inv => {
      const matchSearch = !search ||
        inv.clientName.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = filterStatus === "all" || inv.status === filterStatus
      return matchSearch && matchStatus
    })
  }, [savedInvoices, search, filterStatus])

  // ── Add / Edit item ───────────────────────────────────────────────────────
  function openAddItem() {
    setEditItemId(null); setICat("printing"); setIDesc(""); setIQty(""); setIUnit("كرتونة"); setIPrice(""); setIPrintCost("")
    setAddOpen(true)
  }

  function openEditItem(item: LineItem) {
    setEditItemId(item.id); setICat(item.category); setIDesc(item.description)
    setIQty(String(item.qty)); setIUnit(item.unit); setIPrice(String(item.price)); setIPrintCost(String(item.printingCost || ""))
    setAddOpen(true)
  }

  function commitItem() {
    if (!iDesc.trim()) return toast.error("أدخل وصف الصنف")
    const qty = parseFloat(iQty) || 0; const price = parseFloat(iPrice) || 0
    if (qty <= 0 || price <= 0) return toast.error("أدخل الكمية والسعر")
    const cat = SERVICE_CATEGORIES.find(c => c.id === iCat)!
    const item: LineItem = {
      id: editItemId || crypto.randomUUID(), category: iCat,
      categoryLabel: cat.label, description: iDesc.trim(),
      qty, unit: iUnit, price, printingCost: parseFloat(iPrintCost) || 0, total: qty * price,
    }
    if (editItemId) setLineItems(lineItems.map(i => i.id === editItemId ? item : i))
    else setLineItems([...lineItems, item])
    setAddOpen(false)
    toast.success(editItemId ? "تم تحديث الصنف" : "تم إضافة الصنف")
  }

  // ── Save Invoice ──────────────────────────────────────────────────────────
  async function saveInvoice() {
    if (lineItems.length === 0) return toast.error("الفاتورة فارغة")
    if (!clientName.trim()) return toast.error("اختر أو اكتب اسم العميل")
    if (!user) return
    setSaving(true)
    try {
      const date   = new Date().toLocaleDateString("en-GB")
      const invNum = generateInvoiceNumber(savedInvoices)
      const invoiceId = await addInvoice(user.uid, {
        invoiceNumber: invNum, customerId: selectedClientId || "manual",
        clientName, date,
        deliveryDate: deliveryDate || undefined,
        items: lineItems.map(i => ({ name: i.description, qty: i.qty, unitPrice: i.price, cost: i.printingCost, total: i.total, unit: i.unit, category: i.categoryLabel })),
        totalPrice: grandTotal, totalCost,
        discount: discountAmt || undefined,
        paidAmount: 0, status: "quote",
        createdAt: new Date().toISOString(), notes: notes || undefined,
      })
      if (selectedClientId) {
        await addClientTransaction(user.uid, {
          clientId: selectedClientId, clientName, amount: grandTotal, date,
          type: "فاتورة", notes: `فاتورة - ${invNum}`, invoiceId,
        })
      }
      setLineItems([]); setSelectedClientId(""); setManualClientName("")
      setNotes(""); setDiscount("0"); setDeliveryDate("")
      toast.success("✅ تم حفظ الفاتورة")
    } catch (e) { console.error(e); toast.error("فشل في الحفظ") }
    finally { setSaving(false) }
  }

  // ── Delete Invoice ────────────────────────────────────────────────────────
  async function handleDelete(invoiceId: string) {
    if (!confirm("هل أنت متأكد من حذف الفاتورة؟")) return
    if (!user) return
    try {
      await deleteInvoice(user.uid, invoiceId)
      const sTxs = await getSupplierTransactions(user.uid)
      for (const t of sTxs.filter(t => t.invoiceId === invoiceId)) await deleteSupplierTransaction(user.uid, t.id)
      const cTxs = await getClientTransactions(user.uid)
      for (const t of cTxs.filter(t => t.invoiceId === invoiceId)) await deleteClientTransaction(user.uid, t.id)
      if (detailInv?.id === invoiceId) setDetailInv(null)
      toast.success("تم الحذف")
    } catch { toast.error("فشل في الحذف") }
  }

  // ── Update status ─────────────────────────────────────────────────────────
  async function updateStatus(inv: Invoice, status: InvoiceStatus) {
    if (!user) return
    try {
      await updateInvoice(user.uid, inv.id, { status })
      if (detailInv?.id === inv.id) setDetailInv({ ...detailInv, status })
      toast.success(`تم التحديث إلى: ${INVOICE_STATUS_LABELS[status]}`)
    } catch { toast.error("فشل في التحديث") }
  }

  // ── Add Payment ───────────────────────────────────────────────────────────
  async function addPayment() {
    if (!payAmount || isNaN(Number(payAmount))) return toast.error("أدخل مبلغاً صحيحاً")
    if (!user || !detailInv) return
    const amount = parseFloat(payAmount)
    const newPaid = (detailInv.paidAmount || 0) + amount
    try {
      await updateInvoice(user.uid, detailInv.id, { paidAmount: newPaid })
      if (detailInv.customerId !== "manual") {
        await addClientTransaction(user.uid, {
          clientId: detailInv.customerId, clientName: detailInv.clientName,
          amount, date: new Date().toLocaleDateString("en-GB"),
          type: "تنزيل", method: payMethod, notes: payNotes || `دفعة على ${detailInv.invoiceNumber}`,
          invoiceId: detailInv.id,
        })
      }
      setDetailInv({ ...detailInv, paidAmount: newPaid })
      setPayAmount(""); setPayNotes(""); setAddingPay(false)
      toast.success("✅ تم تسجيل الدفعة")
    } catch { toast.error("فشل في تسجيل الدفعة") }
  }

  // ── Copy Invoice ──────────────────────────────────────────────────────────
  function copyInvoice(inv: Invoice) {
    setSelectedClientId(inv.customerId !== "manual" ? inv.customerId : "")
    setManualClientName(inv.customerId === "manual" ? inv.clientName : "")
    setLineItems(inv.items.map((it) => {
      // it.category stores the label (e.g. "طباعة أوفست") — find the matching id
      const matched = SERVICE_CATEGORIES.find((c) => c.label === it.category)
      const catId    = matched?.id    || "other"
      const catLabel = matched?.label || it.category || "خدمة أخرى"
      return {
        id: crypto.randomUUID(), category: catId, categoryLabel: catLabel,
        description: it.name, qty: it.qty, unit: it.unit || "كرتونة",
        price: it.unitPrice, printingCost: it.cost || 0, total: it.total,
      }
    }))
    setNotes(inv.notes || ""); setDiscount(String(inv.discount || 0))
    toast.success("تم نسخ الفاتورة — راجع البيانات وعدّل قبل الحفظ")
  }

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  function sendWhatsApp(inv: Invoice) {
    const client = clients.find(c => c.id === inv.customerId)
    if (!client?.phone || client.phone === "لا يوجد") return toast.error("العميل ليس لديه رقم هاتف")
    let phone = client.phone.trim(); if (phone.startsWith("0")) phone = "2" + phone
    let text = `🧾 *عرض سعر – مطبعة الوزير*\nالتاريخ: ${inv.date}\nالشركة: ${inv.clientName}\n────────────────────\n`
    inv.items.forEach((it, i) => {
      text += `${i + 1}. ${it.name}\n   ${it.qty} ${it.unit || ""} × ${fmt(it.unitPrice)} = *${fmt(it.total)} ج.م*\n`
    })
    text += `────────────────────\n💰 *الإجمالي: ${fmt(inv.totalPrice)} ج.م*`
    if (inv.deliveryDate) text += `\n📅 موعد التسليم: ${inv.deliveryDate}`
    text += `\n\nتسليم الأوردر خلال 14 يوم عمل رسمي\nيتم دفع 50% عند الاتفاق و50% عند الاستلام 🌷`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank")
  }

  // ── Suspend ───────────────────────────────────────────────────────────────
  function suspendInvoice() {
    if (lineItems.length === 0) return toast.error("الفاتورة فارغة")
    const newDraft: SuspendedDraft = {
      id: crypto.randomUUID(), clientId: selectedClientId, clientName, lineItems,
      discount: discountAmt, grandTotal, notes, deliveryDate,
      savedAt: new Date().toLocaleString("en-GB"),
    }
    persistSuspended([...suspended, newDraft])
    setLineItems([]); setSelectedClientId(""); setManualClientName("")
    setNotes(""); setDiscount("0"); setDeliveryDate("")
    toast.success("تم تعليق الفاتورة")
  }

  function resumeDraft(d: SuspendedDraft) {
    setLineItems(d.lineItems); setSelectedClientId(d.clientId)
    setManualClientName(d.clientName); setNotes(d.notes)
    setDiscount(String(d.discount)); setDeliveryDate(d.deliveryDate || "")
    persistSuspended(suspended.filter(x => x.id !== d.id))
    toast.success("تم استرجاع المسودة")
  }

  // ─────────────────────────────────────────────────── PRINT VIEW ──────────
  if (printInv) {
    const items      = printInv.items || []
    const total      = printInv.totalPrice || 0
    const disc       = printInv.discount   || 0
    const paid       = printInv.paidAmount || 0
    const remaining  = total - paid
    const subT       = total + disc
    const clientPhone = clients.find(c => c.id === printInv.customerId)?.phone || ""
    const statusLabel = INVOICE_STATUS_LABELS[printInv.status || "quote"]
    const companyName  = settings.companyName    || "مطبعة الوزير"
    const companyPhone = settings.companyPhone   || ""
    const companyAddr  = settings.companyAddress || ""
    const MIN_ROWS = 10

    return (
      <div className="bg-white min-h-screen" dir="rtl">
        <style>{`
          @media print {
            body { margin: 0; }
            @page { margin: 8mm; size: A4 landscape; }
            .no-print { display: none !important; }
          }
        `}</style>

        {/* ── Back button (hidden on print) ── */}
        <div className="no-print flex gap-3 p-3 bg-gray-100 border-b">
          <button
            onClick={() => setPrintInv(null)}
            className="px-4 py-2 rounded-xl text-sm font-bold border-2 hover:bg-white transition-all"
            style={{ borderColor: "#0F1F3D", color: "#0F1F3D" }}
          >
            ← رجوع
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#0F1F3D" }}
          >
            🖨️ طباعة
          </button>
        </div>

        {/* ── Header ── */}
        <div className="flex justify-between items-start p-5 border-b-4" style={{ borderColor: "#0F1F3D" }}>
          {/* Company info */}
          <div>
            <h2 className="text-base font-black" style={{ color: "#0F1F3D" }}>{companyName}</h2>
            {companyAddr  && <p className="text-xs text-gray-500 mt-0.5">{companyAddr}</p>}
            {companyPhone && <p className="text-xs font-bold text-gray-600" dir="ltr">{companyPhone}</p>}
          </div>
          {/* Logo */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#0F1F3D" }}>
            <span className="text-2xl font-black" style={{ color: "#F5C518" }}>و</span>
          </div>
          {/* Invoice meta */}
          <div className="border rounded-lg p-2.5 text-xs space-y-1.5" style={{ borderColor: "#DCE3F5", minWidth: 200 }}>
            <div className="flex justify-between gap-4">
              <span className="font-bold text-gray-400">اسم العميل:</span>
              <span className="font-black">{printInv.clientName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-bold text-gray-400">رقم الفاتورة:</span>
              <span className="font-black" dir="ltr">{printInv.invoiceNumber}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-bold text-gray-400">التاريخ:</span>
              <span className="font-bold" dir="ltr">{printInv.date}</span>
            </div>
            {printInv.deliveryDate && (
              <div className="flex justify-between gap-4">
                <span className="font-bold text-gray-400">موعد التسليم:</span>
                <span className="font-bold" dir="ltr">{printInv.deliveryDate}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="font-bold text-gray-400">الحالة:</span>
              <span className="font-black" style={{ color: "#0F1F3D" }}>{statusLabel}</span>
            </div>
            {clientPhone && clientPhone !== "لا يوجد" && (
              <div className="flex justify-between gap-4">
                <span className="font-bold text-gray-400">رقم الموبايل:</span>
                <span dir="ltr">{clientPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="p-4">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ background: "#0F1F3D", color: "white" }}>
                {["الصنف","المواصفات ونوع الورق","الكمية","الوحدة","السعر","تجهيزات الطباعة","الإجمالي","تنزيل"].map(h => (
                  <th key={h} className="border p-2 text-right" style={{ borderColor: "#243B6E" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#F4F6FB" }}>
                  <td className="border p-2 font-bold" style={{ borderColor: "#DCE3F5" }}>{it.category || "طباعة"}</td>
                  <td className="border p-2"            style={{ borderColor: "#DCE3F5" }}>{it.name}</td>
                  <td className="border p-2 text-center" style={{ borderColor: "#DCE3F5" }}>{it.qty}</td>
                  <td className="border p-2 text-center" style={{ borderColor: "#DCE3F5" }}>{it.unit || "كرتونة"}</td>
                  <td className="border p-2 text-center font-mono" style={{ borderColor: "#DCE3F5" }}>{fmt(it.unitPrice)}</td>
                  <td className="border p-2 text-center font-mono" style={{ borderColor: "#DCE3F5" }}>{it.cost > 0 ? fmt(it.cost) : ""}</td>
                  <td className="border p-2 text-center font-black" style={{ borderColor: "#DCE3F5" }}>{fmt(it.total)}</td>
                  <td className="border p-2" style={{ borderColor: "#DCE3F5" }}></td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, MIN_ROWS - items.length) }).map((_, i) => (
                <tr key={`e-${i}`} style={{ background: (items.length + i) % 2 === 0 ? "white" : "#F4F6FB" }}>
                  {Array(8).fill(null).map((_, j) => <td key={j} className="border p-2 h-7" style={{ borderColor: "#DCE3F5" }} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="px-4 pb-3 flex justify-between items-end gap-6">
          <div className="flex-1">
            {printInv.notes && <p className="text-xs text-gray-500 italic border rounded p-2" style={{ borderColor: "#DCE3F5" }}>{printInv.notes}</p>}
          </div>
          <div className="text-xs space-y-1.5" style={{ minWidth: 260 }}>
            {disc > 0 && (
              <div className="flex justify-between gap-6">
                <span className="font-bold">المجموع قبل الخصم:</span>
                <span className="font-black">{fmt(subT)} ج.م</span>
              </div>
            )}
            {disc > 0 && (
              <div className="flex justify-between gap-6 text-red-600">
                <span className="font-bold">الخصم:</span>
                <span className="font-black">- {fmt(disc)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between gap-6">
              <span className="font-bold">إجمالي الفاتورة:</span>
              <span className="font-black text-sm">{fmt(total)} ج.م</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="font-bold">إجمالي التنزيل:</span>
              <span className="font-black text-green-700">{fmt(paid)} ج.م</span>
            </div>
            <div className="flex justify-between gap-6 pt-1.5 border-t-2" style={{ borderColor: "#0F1F3D" }}>
              <span className="font-bold text-sm">الباقي:</span>
              <span className="font-black text-base" style={{ color: remaining > 0 ? "#D97706" : "#16A34A" }}>
                {fmt(remaining)} ج.م
              </span>
            </div>
          </div>
        </div>

        {/* ── Banners ── */}
        <div className="px-4 pb-4 space-y-1.5">
          <div className="py-2 text-center font-black text-sm text-white rounded" style={{ background: "#DC2626" }}>
            تسليم الأوردر خلال 14 يوم عمل رسمي
          </div>
          <div className="py-2 text-center font-black text-sm rounded" style={{ background: "#F5C518", color: "#0F1F3D" }}>
            يتم دفع 50% عند الاتفاق و50% عند الاستلام
          </div>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <div className="w-10 h-10 rounded-xl animate-pulse flex items-center justify-center" style={{ background: "var(--wazer-yellow)" }}>
        <span className="font-black" style={{ color: "var(--wazer-navy)" }}>و</span>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────── MAIN UI ──────────────
  return (
    <div className="p-4 md:p-6 space-y-5 fade-up" dir="rtl">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--wazer-navy)" }}>الفواتير وعروض الأسعار</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--wazer-navy-muted)" }}>{savedInvoices.length} فاتورة محفوظة</p>
        </div>
        {suspended.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold"
            style={{ background: "#FEF9C3", color: "#854D0E", border: "1px solid #FDE047" }}>
            <Clock className="w-4 h-4" /> {suspended.length} مسودة معلقة
          </div>
        )}
      </div>

      {/* ── Builder card ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: "var(--border)" }}>
        {/* Builder header */}
        <div className="px-5 py-4 border-b flex flex-col md:flex-row gap-4" style={{ borderColor: "var(--border)", background: "#F4F6FB" }}>
          <div className="flex-1 space-y-1">
            <Label className="text-xs font-black" style={{ color: "var(--wazer-navy-muted)" }}>العميل</Label>
            <Select value={selectedClientId} onValueChange={v => { setSelectedClientId(v); setManualClientName("") }}>
              <SelectTrigger className="h-10 rounded-xl border-2 font-bold text-sm" style={{ borderColor: "var(--border)" }}>
                <SelectValue placeholder="اختر عميل مسجل..." />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company} — {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {!selectedClientId && (
              <Input value={manualClientName} onChange={e => setManualClientName(e.target.value)}
                placeholder="أو اكتب اسم العميل مباشرة..."
                className="h-10 rounded-xl border-2 text-sm" style={{ borderColor: "var(--border)" }} />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs font-black" style={{ color: "var(--wazer-navy-muted)" }}>موعد التسليم (اختياري)</Label>
            <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
              className="h-10 rounded-xl border-2 text-sm" style={{ borderColor: "var(--border)" }} />
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <button onClick={openAddItem}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "var(--wazer-navy)" }}>
              <Plus className="w-4 h-4" /> إضافة صنف
            </button>
            <button onClick={suspendInvoice}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
              style={{ borderColor: "#D97706", color: "#D97706", background: "white" }}>
              <Clock className="w-4 h-4" /> تعليق
            </button>
            <button onClick={saveInvoice} disabled={saving || lineItems.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: "var(--wazer-yellow)", color: "var(--wazer-navy)" }}>
              <CheckCircle2 className="w-4 h-4" /> {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>

        {/* Line items */}
        <div className="p-4">
          {lineItems.length === 0 ? (
            <div className="text-center py-10 opacity-30">
              <FileText className="w-12 h-12 mx-auto mb-2" style={{ color: "var(--wazer-navy)" }} />
              <p className="text-sm font-bold" style={{ color: "var(--wazer-navy)" }}>اضغط &quot;إضافة صنف&quot; للبدء</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
                <table className="w-full text-sm">
                  <thead style={{ background: "var(--wazer-navy)", color: "white" }}>
                    <tr>
                      <th className="p-3 text-right">الوصف / الصنف</th>
                      <th className="p-3 text-center w-20">الكمية</th>
                      <th className="p-3 text-center w-20">الوحدة</th>
                      <th className="p-3 text-center w-28">السعر</th>
                      <th className="p-3 text-center w-28">تجهيزات</th>
                      <th className="p-3 text-center w-28">الإجمالي</th>
                      <th className="p-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={item.id} style={{ background: i % 2 === 0 ? "white" : "#F4F6FB" }}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => openEditItem(item)}>
                        <td className="p-3">
                          <p className="font-black text-sm" style={{ color: "var(--wazer-navy)" }}>{item.description}</p>
                          <p className="text-xs font-bold" style={{ color: "var(--wazer-yellow-dark)" }}>{item.categoryLabel}</p>
                        </td>
                        <td className="p-3 text-center font-bold" style={{ color: "var(--wazer-navy)" }}>{item.qty}</td>
                        <td className="p-3 text-center text-xs" style={{ color: "var(--wazer-navy-muted)" }}>{item.unit}</td>
                        <td className="p-3 text-center font-mono text-sm" style={{ color: "var(--wazer-navy)" }}>{fmt(item.price)}</td>
                        <td className="p-3 text-center font-mono text-xs" style={{ color: "var(--wazer-navy-muted)" }}>{item.printingCost > 0 ? fmt(item.printingCost) : "—"}</td>
                        <td className="p-3 text-center font-black" style={{ color: "var(--wazer-navy)" }}>{fmt(item.total)}</td>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setLineItems(lineItems.filter(x => x.id !== item.id))}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mt-4 items-start">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs font-bold" style={{ color: "var(--wazer-navy-muted)" }}>ملاحظات</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    placeholder="ملاحظات على الفاتورة..."
                    className="resize-none text-sm rounded-xl border-2" style={{ borderColor: "var(--border)" }} />
                </div>
                <div className="rounded-2xl p-4 min-w-[220px] space-y-2 border"
                  style={{ background: "var(--wazer-navy)", borderColor: "var(--wazer-navy)" }}>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">المجموع</span>
                    <span className="font-bold text-white">{fmt(subtotal)} ج</span>
                  </div>
                  <div className="flex justify-between items-center text-sm gap-2">
                    <span className="text-white/60">خصم</span>
                    <input type="number" value={discount} onChange={e => setDiscount(e.target.value)}
                      className="w-24 h-7 text-center text-sm rounded-lg px-2 border"
                      style={{ background: "var(--wazer-navy-light)", borderColor: "var(--wazer-navy-muted)", color: "white" }} />
                  </div>
                  <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--wazer-navy-light)" }}>
                    <span className="font-black text-white">الإجمالي</span>
                    <span className="font-black text-lg" style={{ color: "var(--wazer-yellow)" }}>{fmt(grandTotal)} ج</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Suspended drafts ── */}
      {suspended.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)", background: "#FFFBEB" }}>
            <Clock className="w-4 h-4" style={{ color: "#D97706" }} />
            <h3 className="font-black text-sm" style={{ color: "#92400E" }}>المسودات المعلقة</h3>
          </div>
          <div className="p-3 space-y-2">
            {suspended.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl border"
                style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
                <div>
                  <p className="font-black text-sm" style={{ color: "var(--wazer-navy)" }}>{d.clientName || "عميل"}</p>
                  <p className="text-xs" style={{ color: "#92400E" }}>{d.savedAt} · {d.lineItems.length} صنف · {fmt(d.grandTotal)} ج</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resumeDraft(d)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: "#16A34A" }}><PlayCircle className="w-3.5 h-3.5" /> استرجاع</button>
                  <button onClick={() => persistSuspended(suspended.filter(x => x.id !== d.id))}
                    className="p-1.5 rounded-xl text-red-400 hover:bg-red-50"><XCircle className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Saved Invoices ── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: "var(--border)" }}>
        {/* Filters */}
        <div className="px-5 py-4 border-b flex flex-col md:flex-row gap-3" style={{ borderColor: "var(--border)", background: "#F4F6FB" }}>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--wazer-navy-muted)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو رقم الفاتورة..."
              className="w-full h-9 pr-9 pl-3 rounded-xl border-2 text-sm outline-none"
              style={{ borderColor: "var(--border)", background: "white", color: "var(--wazer-navy)" }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", ...STATUS_LIST].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all",
                  filterStatus === s ? "text-white border-transparent" : "border-transparent bg-white")}
                style={filterStatus === s ? { background: "var(--wazer-navy)", color: "white" } : { color: "var(--wazer-navy-muted)" }}>
                {s === "all" ? "الكل" : INVOICE_STATUS_LABELS[s as InvoiceStatus]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 opacity-30">
              <FileText className="w-12 h-12 mx-auto mb-2" style={{ color: "var(--wazer-navy)" }} />
              <p className="font-bold text-sm">لا توجد فواتير</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map((inv) => {
                const paidAmt = inv.paidAmount || 0
                const remaining = inv.totalPrice - paidAmt
                const paidPct = inv.totalPrice > 0 ? Math.min(100, (paidAmt / inv.totalPrice) * 100) : 0
                const isLate = inv.deliveryDate && new Date(inv.deliveryDate.split("/").reverse().join("-")) < new Date() && inv.status !== "closed" && inv.status !== "delivered"
                return (
                  <div key={inv.id}
                    className="rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all"
                    style={{ borderColor: isLate ? "#FCA5A5" : "var(--border)", background: isLate ? "#FFF5F5" : "white" }}
                    onClick={() => setDetailInv(inv)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm"
                          style={{ background: "var(--wazer-yellow)", color: "var(--wazer-navy)" }}>
                          {inv.clientName?.[0] || "؟"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm" style={{ color: "var(--wazer-navy)" }}>{inv.clientName}</span>
                            <span className="text-xs px-2 py-0.5 rounded-lg font-bold border" style={{ background: "#EEF1FA", color: "var(--wazer-navy-muted)", borderColor: "var(--border)" }}>{inv.invoiceNumber}</span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold ${INVOICE_STATUS_COLORS[(inv.status || "quote") as InvoiceStatus]}`}>
                              {INVOICE_STATUS_LABELS[(inv.status || "quote") as InvoiceStatus]}
                            </span>
                            {isLate && <span className="text-xs px-2 py-0.5 rounded-lg font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> متأخر</span>}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "var(--wazer-navy-muted)" }}>
                            {inv.date}
                            {inv.deliveryDate && <> · تسليم: {inv.deliveryDate}</>}
                          </p>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="font-black text-base" style={{ color: "var(--wazer-navy)" }}>{fmt(inv.totalPrice)} ج</p>
                        {paidAmt > 0 && <p className="text-xs text-green-600 font-bold">دُفع: {fmt(paidAmt)} ج</p>}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {inv.totalPrice > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${paidPct}%`, background: paidPct >= 100 ? "#16A34A" : "var(--wazer-yellow)" }} />
                        </div>
                        <span className="text-xs font-bold shrink-0" style={{ color: "var(--wazer-navy-muted)" }}>{Math.round(paidPct)}%</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Add/Edit Item Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden" dir="rtl">
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: "var(--wazer-navy)" }}>
            <DialogTitle className="text-base font-black text-white flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color: "var(--wazer-yellow)" }} />
              {editItemId ? "تعديل الصنف" : "إضافة صنف"}
            </DialogTitle>
            <button onClick={() => setAddOpen(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5 space-y-4">
            {/* Category chips */}
            <div>
              <Label className="text-xs font-black mb-2 block" style={{ color: "var(--wazer-navy-muted)" }}>نوع الصنف</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => { setICat(cat.id); setIUnit(cat.unit) }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all"
                    style={iCat === cat.id
                      ? { background: "var(--wazer-navy)", color: "white",        borderColor: "var(--wazer-navy)"    }
                      : { background: "white",            color: "var(--wazer-navy-muted)", borderColor: "var(--border)" }}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Description */}
            <div>
              <Label className="text-xs font-black mb-1 block" style={{ color: "var(--wazer-navy-muted)" }}>المواصفات والوصف</Label>
              <Textarea value={iDesc} onChange={e => setIDesc(e.target.value)}
                placeholder="مثال: كوب ديل مقاس 4 اونز - طباعة 4 لون..."
                className="resize-none text-sm rounded-xl border-2" rows={2}
                style={{ borderColor: "var(--border)" }} />
            </div>
            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "الكمية", val: iQty, set: setIQty, type: "number", placeholder: "0" },
                { label: "السعر (ج.م)", val: iPrice, set: setIPrice, type: "number", placeholder: "0.00" },
              ].map(f => (
                <div key={f.label}>
                  <Label className="text-xs font-black mb-1 block" style={{ color: "var(--wazer-navy-muted)" }}>{f.label}</Label>
                  <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="w-full h-11 text-center text-lg font-black rounded-xl border-2 outline-none"
                    style={{ borderColor: "var(--wazer-navy)", color: "var(--wazer-navy)", background: "#F4F6FB" }} />
                </div>
              ))}
              <div>
                <Label className="text-xs font-black mb-1 block" style={{ color: "var(--wazer-navy-muted)" }}>الوحدة</Label>
                <Select value={iUnit} onValueChange={setIUnit}>
                  <SelectTrigger className="h-11 rounded-xl border-2" style={{ borderColor: "var(--border)" }}><SelectValue /></SelectTrigger>
                  <SelectContent dir="rtl">{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-black mb-1 block" style={{ color: "var(--wazer-navy-muted)" }}>تجهيزات (اختياري)</Label>
                <input type="number" value={iPrintCost} onChange={e => setIPrintCost(e.target.value)} placeholder="0"
                  className="w-full h-11 text-center text-sm font-bold rounded-xl border-2 outline-none"
                  style={{ borderColor: "var(--border)", color: "var(--wazer-navy-muted)", background: "#F4F6FB" }} />
              </div>
            </div>
            {/* Preview */}
            {iQty && iPrice && (
              <div className="flex justify-between items-center px-4 py-3 rounded-xl"
                style={{ background: "var(--wazer-yellow)", color: "var(--wazer-navy)" }}>
                <span className="text-sm font-bold">الإجمالي:</span>
                <span className="text-xl font-black">{fmt((parseFloat(iQty)||0)*(parseFloat(iPrice)||0))} ج.م</span>
              </div>
            )}
            <button onClick={commitItem}
              className="w-full py-3 rounded-xl font-black text-base transition-all hover:opacity-90"
              style={{ background: "var(--wazer-navy)", color: "white" }}>
              {editItemId ? "حفظ التعديل ✅" : "إضافة للفاتورة ✅"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Invoice Detail Dialog ── */}
      {detailInv && (
        <Dialog open={!!detailInv} onOpenChange={v => !v && setDetailInv(null)}>
          <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden flex flex-col rounded-2xl p-0" dir="rtl">
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ background: "var(--wazer-navy)" }}>
              <div>
                <DialogTitle className="text-base font-black text-white">{detailInv.clientName}</DialogTitle>
                <p className="text-xs mt-0.5" style={{ color: "var(--wazer-yellow)" }}>{detailInv.invoiceNumber} · {detailInv.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(detailInv.id)} className="p-2 rounded-xl text-red-400 hover:bg-red-400/10 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => { copyInvoice(detailInv); setDetailInv(null) }} className="p-2 rounded-xl text-white/50 hover:bg-white/10 hover:text-white" title="نسخ الفاتورة"><Copy className="w-4 h-4" /></button>
                <button onClick={() => setPrintInv(detailInv)} className="p-2 rounded-xl text-white/50 hover:bg-white/10 hover:text-white"><Printer className="w-4 h-4" /></button>
                <button onClick={() => sendWhatsApp(detailInv)} className="p-2 rounded-xl text-green-400 hover:bg-green-400/10"><MessageCircle className="w-4 h-4" /></button>
                <button onClick={() => setDetailInv(null)} className="p-2 rounded-xl text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Status Bar */}
            <div className="px-5 py-3 border-b flex gap-2 overflow-x-auto shrink-0" style={{ background: "#F4F6FB", borderColor: "var(--border)" }}>
              {STATUS_LIST.map(s => (
                <button key={s} onClick={() => updateStatus(detailInv, s)}
                  className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all whitespace-nowrap",
                    (detailInv.status || "quote") === s ? "border-transparent" : "bg-white")}
                  style={(detailInv.status || "quote") === s
                    ? { background: "var(--wazer-navy)", color: "white", borderColor: "var(--wazer-navy)" }
                    : { borderColor: "var(--border)", color: "var(--wazer-navy-muted)" }}>
                  {INVOICE_STATUS_LABELS[s]}
                </button>
              ))}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "إجمالي الفاتورة",  value: fmt(detailInv.totalPrice), color: "var(--wazer-navy)"  },
                  { label: "المدفوع",           value: fmt(detailInv.paidAmount || 0), color: "#16A34A"       },
                  { label: "المتبقي",           value: fmt(detailInv.totalPrice - (detailInv.paidAmount || 0)), color: detailInv.totalPrice - (detailInv.paidAmount||0) > 0 ? "#DC2626" : "#16A34A" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center border" style={{ borderColor: "var(--border)", background: "white" }}>
                    <p className="text-xs font-bold mb-1" style={{ color: "var(--wazer-navy-muted)" }}>{s.label}</p>
                    <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs" style={{ color: "var(--wazer-navy-muted)" }}>ج.م</p>
                  </div>
                ))}
              </div>

              {/* Payment progress */}
              {detailInv.totalPrice > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5" style={{ color: "var(--wazer-navy-muted)" }}>
                    <span>نسبة السداد</span>
                    <span>{Math.round(Math.min(100, ((detailInv.paidAmount||0)/detailInv.totalPrice)*100))}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100,((detailInv.paidAmount||0)/detailInv.totalPrice)*100)}%`, background: "var(--wazer-yellow)" }} />
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <table className="w-full text-xs">
                  <thead style={{ background: "var(--wazer-navy)", color: "white" }}>
                    <tr>
                      <th className="p-2.5 text-right">الصنف</th>
                      <th className="p-2.5 text-center w-14">الكمية</th>
                      <th className="p-2.5 text-center w-20">السعر</th>
                      <th className="p-2.5 text-center w-24">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailInv.items?.map((it, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#F4F6FB" }}>
                        <td className="p-2.5 font-bold" style={{ color: "var(--wazer-navy)" }}>{it.name}</td>
                        <td className="p-2.5 text-center" style={{ color: "var(--wazer-navy-muted)" }}>{it.qty} {it.unit || ""}</td>
                        <td className="p-2.5 text-center font-mono" style={{ color: "var(--wazer-navy)" }}>{fmt(it.unitPrice)}</td>
                        <td className="p-2.5 text-center font-black" style={{ color: "var(--wazer-navy)" }}>{fmt(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detailInv.notes && (
                <p className="text-xs px-3 py-2 rounded-xl border italic" style={{ borderColor: "var(--border)", color: "var(--wazer-navy-muted)", background: "#F4F6FB" }}>
                  {detailInv.notes}
                </p>
              )}

              {/* Add Payment */}
              {!addingPay ? (
                <button onClick={() => setAddingPay(true)}
                  className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all hover:opacity-80"
                  style={{ borderColor: "var(--wazer-yellow)", color: "var(--wazer-navy)", background: "#FFFBEB" }}>
                  <CreditCard className="w-4 h-4" /> تسجيل دفعة
                </button>
              ) : (
                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--wazer-yellow)", background: "#FFFBEB" }}>
                  <h4 className="font-black text-sm" style={{ color: "var(--wazer-navy)" }}>تسجيل دفعة جديدة</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold mb-1 block">المبلغ (ج.م)</Label>
                      <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                        placeholder="0.00" className="w-full h-11 text-center text-lg font-black rounded-xl border-2 outline-none"
                        style={{ borderColor: "var(--wazer-navy)", background: "white" }} autoFocus />
                    </div>
                    <div>
                      <Label className="text-xs font-bold mb-1 block">طريقة الدفع</Label>
                      <Select value={payMethod} onValueChange={setPayMethod}>
                        <SelectTrigger className="h-11 rounded-xl border-2" style={{ borderColor: "var(--border)" }}><SelectValue /></SelectTrigger>
                        <SelectContent dir="rtl">{PAY_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="ملاحظات (اختياري)"
                    className="h-9 text-sm rounded-xl" />
                  <div className="flex gap-2">
                    <button onClick={addPayment}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90"
                      style={{ background: "var(--wazer-navy)" }}>تأكيد الدفعة ✅</button>
                    <button onClick={() => setAddingPay(false)}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm border-2 hover:bg-gray-50"
                      style={{ borderColor: "var(--border)", color: "var(--wazer-navy-muted)" }}>إلغاء</button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
