"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calculator, Trash2, Box, TrendingUp, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"

export default function PricingPage() {
  const { user } = useAuth()
  const [pricingList, setPricingList] = useState<any[]>([])
  const [paperList, setPaperList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [printFormOpen, setPrintFormOpen] = useState(false)
  const [paperEditOpen, setPaperEditOpen] = useState(false)
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null)
  const [editingPrice, setEditingPrice] = useState("")

  const [pService, setPService] = useState("")
  const [pPrice, setPPrice] = useState("")
  const [sheetPrice, setSheetPrice] = useState("0")
  const [sheetCount, setSheetCount] = useState("0")
  const [printPricePer1000, setPrintPricePer1000] = useState("0")
  const [targetQty, setTargetQty] = useState("0")
  const [profitMargin, setProfitMargin] = useState("40")
  const [miscellaneous, setMiscellaneous] = useState("50")
  const [zinkatFixed] = useState("400")
  const [basmaLength, setBasmaLength] = useState("0")
  const [basmaWidth, setBasmaWidth] = useState("0")
  const [basmaAclashie, setBasmaAclashie] = useState("0")

  const DEFAULT_PAPER = [
    { id: "p1", category: "الطباعة", type: "طباعة سليم", weight: "60", priceSalim: 2.30, priceJayir: 1.65 },
    { id: "p2", category: "الطباعة", type: "طباعة سليم", weight: "80", priceSalim: 3.00, priceJayir: 2.15 },
    { id: "p3", category: "الطباعة", type: "طباعة سليم", weight: "100", priceSalim: 4.20, priceJayir: 2.50 },
    { id: "k1", category: "الكشكول", type: "كوشة جايير", weight: "115", priceSalim: 4.50, priceJayir: 3.70 },
    { id: "k2", category: "الكشكول", type: "كوشة جايير", weight: "130", priceSalim: 5.10, priceJayir: 4.20 },
    { id: "k3", category: "الكشكول", type: "كوشة جايير", weight: "150", priceSalim: 5.80, priceJayir: 4.80 },
    { id: "k4", category: "الكشكول", type: "كوشة جايير", weight: "170", priceSalim: 6.60, priceJayir: 5.50 },
    { id: "k5", category: "الكشكول", type: "كوشة جايير", weight: "200", priceSalim: 7.80, priceJayir: 6.50 },
    { id: "k6", category: "الكشكول", type: "كوشة جايير", weight: "250", priceSalim: 9.70, priceJayir: 8.00 },
    { id: "f1", category: "فستاني", type: "فستاني سليم", weight: "230", priceSalim: 9.40, priceJayir: 7.80 },
    { id: "f2", category: "فستاني", type: "فستاني سليم", weight: "250", priceSalim: 10.20, priceJayir: 9.10 },
    { id: "f3", category: "فستاني", type: "فستاني سليم", weight: "270", priceSalim: 11.00, priceJayir: 10.45 },
    { id: "f4", category: "فستاني", type: "فستاني سليم", weight: "300", priceSalim: 12.60, priceJayir: 12.20 },
    { id: "f5", category: "فستاني", type: "فستاني سليم", weight: "350", priceSalim: 14.75, priceJayir: 14.75 },
  ]

  // ─── Load from Firestore ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    async function load() {
      const ref = doc(db, "users", user!.uid, "meta", "pricing")
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        if (data.pricingList) setPricingList(data.pricingList)
        if (data.paperList) setPaperList(data.paperList)
        else setPaperList(DEFAULT_PAPER)
      } else {
        setPaperList(DEFAULT_PAPER)
      }
      setLoading(false)
    }
    load()
  }, [user])

  async function persist(newPricingList = pricingList, newPaperList = paperList) {
    if (!user) return
    await setDoc(doc(db, "users", user.uid, "meta", "pricing"), {
      pricingList: newPricingList,
      paperList: newPaperList,
    })
  }

  // auto qty
  useEffect(() => {
    const count = parseFloat(sheetCount) || 0
    if (count > 0) setTargetQty((count * 4).toString())
  }, [sheetCount])

  const calculate = () => {
    const qty = parseFloat(targetQty) || 1
    const sCount = parseFloat(sheetCount) || 0
    const profit = (parseFloat(profitMargin) || 0) / 100
    const paper = (parseFloat(sheetPrice) || 0) * sCount
    const print = (parseFloat(printPricePer1000) || 0) * qty
    const basma = (parseFloat(basmaLength) || 0) * (parseFloat(basmaWidth) || 0) * 4 + (parseFloat(basmaAclashie) || 0)
    const zinkat = parseFloat(zinkatFixed) || 0
    const totalRaw = paper + print + basma + zinkat + (parseFloat(miscellaneous) || 0)
    const totalWithWaste = totalRaw * 1.03
    const sellingTotal = totalWithWaste * (1 + profit)
    const per1000 = (sellingTotal / qty) * 1000
    return {
      myTotalCost: totalWithWaste.toFixed(2),
      myUnitCost: (totalWithWaste / qty).toFixed(2),
      customerPrice1000: per1000.toFixed(2),
      customerTotal: sellingTotal.toFixed(2),
      profitAmount: (sellingTotal - totalWithWaste).toFixed(2),
    }
  }

  const res = calculate()

  async function saveEntry() {
    if (!pService) return toast.error("اكتب اسم المنتج")
    const newEntry = { id: crypto.randomUUID(), service: pService, price: pPrice || res.customerPrice1000, myCost: res.myUnitCost, unit: "1000 قطعة" }
    const newList = [...pricingList, newEntry]
    setPricingList(newList)
    await persist(newList, paperList)
    setPrintFormOpen(false)
    setPService(""); setPPrice("")
    toast.success("تم حفظ السعر في القائمة")
  }

  async function deletePricing(id: string) {
    const newList = pricingList.filter((i) => i.id !== id)
    setPricingList(newList)
    await persist(newList, paperList)
  }

  async function updatePaperPrice(paperId: string, field: "priceSalim" | "priceJayir") {
    const updated = paperList.map((p) => p.id === paperId ? { ...p, [field]: parseFloat(editingPrice) || 0 } : p)
    setPaperList(updated)
    await persist(pricingList, updated)
    setPaperEditOpen(false); setEditingPaperId(null)
    toast.success("تم تحديث السعر")
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 text-blue-400"><TrendingUp /> قائمة أسعار التشغيل</h1>
          <p className="text-xs text-slate-400">حساب التكلفة وسعر البيع</p>
        </div>
        <Button onClick={() => setPrintFormOpen(true)} className="bg-blue-600 font-bold px-8 h-12">+ تسعير شغلانة جديدة</Button>
      </div>

      {/* Pricing List */}
      <Card className="border-none shadow-lg overflow-hidden">
        <table className="w-full text-right bg-white">
          <thead className="bg-slate-100 text-slate-600 font-bold border-b">
            <tr><th className="p-4">المنتج</th><th className="p-4 text-center">تكلفتي (قطعة)</th><th className="p-4 text-center">سعر الزبون (1000)</th><th className="p-4 text-center">حذف</th></tr>
          </thead>
          <tbody>
            {pricingList.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold">لا يوجد أسعار محفوظة</td></tr>
            ) : pricingList.map((p) => (
              <tr key={p.id} className="border-b hover:bg-slate-50">
                <td className="p-4 font-black">{p.service}</td>
                <td className="p-4 text-center text-red-500 font-mono">{p.myCost} ج.م</td>
                <td className="p-4 text-center text-blue-600 font-black">{p.price} ج.م</td>
                <td className="p-4 text-center"><Button variant="ghost" onClick={() => deletePricing(p.id)}><Trash2 className="text-red-400 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Paper List */}
      <div className="space-y-4">
        <div className="flex items-center gap-3"><Box className="w-8 h-8 text-amber-600" /><h2 className="text-2xl font-black text-slate-800">قائمة الخامات (الورق)</h2></div>
        {["الطباعة", "الكشكول", "فستاني"].map((category) => {
          const papers = paperList.filter((p) => p.category === category)
          if (!papers.length) return null
          return (
            <Card key={category} className="border-none shadow-lg overflow-hidden">
              <CardHeader className="bg-amber-50 border-b border-amber-200"><CardTitle className="text-lg font-black text-amber-900">{category}</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-right text-sm">
                  <thead className="bg-amber-100 text-amber-900 font-bold border-b"><tr><th className="p-3">النوع</th><th className="p-3 text-center">الوزن</th><th className="p-3 text-center">سعر سليم</th><th className="p-3 text-center">سعر جايير</th></tr></thead>
                  <tbody className="divide-y divide-amber-100">
                    {papers.map((paper) => (
                      <tr key={paper.id} className="hover:bg-amber-50/50">
                        <td className="p-3 font-bold text-slate-700">{paper.type}</td>
                        <td className="p-3 text-center text-slate-600">{paper.weight}</td>
                        <td className="p-3 text-center"><span className="font-black text-blue-600 cursor-pointer hover:underline" onClick={() => { setEditingPaperId(paper.id); setEditingPrice(paper.priceSalim.toString()); setPaperEditOpen(true) }}>{paper.priceSalim.toFixed(2)} ج.م</span></td>
                        <td className="p-3 text-center"><span className="font-black text-orange-600 cursor-pointer hover:underline" onClick={() => { setEditingPaperId(paper.id); setEditingPrice(paper.priceJayir.toString()); setPaperEditOpen(true) }}>{paper.priceJayir.toFixed(2)} ج.م</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Paper Edit Dialog */}
      <Dialog open={paperEditOpen} onOpenChange={setPaperEditOpen}>
        <DialogContent className="max-w-md rounded-2xl" dir="rtl">
          <DialogHeader className="border-b pb-4"><DialogTitle className="text-xl font-black text-amber-800">تعديل سعر الورق</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label className="font-bold text-amber-900 mb-2">السعر الجديد (ج.م)</Label><Input type="number" value={editingPrice} onChange={(e) => setEditingPrice(e.target.value)} className="text-2xl h-14 border-2 border-amber-300 text-center font-black" autoFocus /></div>
            <div className="flex gap-3">
              <Button onClick={() => updatePaperPrice(editingPaperId || "", "priceSalim")} className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold h-12">تحديث سليم</Button>
              <Button onClick={() => updatePaperPrice(editingPaperId || "", "priceJayir")} className="flex-1 bg-orange-600 hover:bg-orange-700 font-bold h-12">تحديث جايير</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calculator Dialog */}
      <Dialog open={printFormOpen} onOpenChange={setPrintFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader className="border-b pb-4"><DialogTitle className="text-2xl font-black text-blue-800">حاسبة التكاليف</DialogTitle></DialogHeader>
          <div className="space-y-5 pt-4">
            <div><Label className="font-bold">اسم المنتج</Label><Input value={pService} onChange={(e) => setPService(e.target.value)} className="h-12 text-lg mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
                <h3 className="font-black text-blue-900 text-sm border-b pb-2">الورق والطباعة</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">سعر الفرخ</Label><Input type="number" value={sheetPrice} onChange={(e) => setSheetPrice(e.target.value)} /></div>
                  <div><Label className="text-xs font-bold text-blue-600">عدد الأفرخ</Label><Input type="number" value={sheetCount} onChange={(e) => setSheetCount(e.target.value)} className="border-blue-300" /></div>
                  <div className="col-span-2"><Label className="text-xs">سعر طباعة الوحدة</Label><Input type="number" value={printPricePer1000} onChange={(e) => setPrintPricePer1000(e.target.value)} /></div>
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 space-y-3">
                <h3 className="font-black text-orange-900 text-sm border-b pb-2">البصمة والتشطيب</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">طول بصمة</Label><Input type="number" value={basmaLength} onChange={(e) => setBasmaLength(e.target.value)} /></div>
                  <div><Label className="text-xs">عرض بصمة</Label><Input type="number" value={basmaWidth} onChange={(e) => setBasmaWidth(e.target.value)} /></div>
                  <div className="col-span-2"><Label className="text-xs">أكلاشيه ثابت</Label><Input type="number" value={basmaAclashie} onChange={(e) => setBasmaAclashie(e.target.value)} /></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 bg-slate-900 p-4 rounded-2xl text-white">
              <div><Label className="text-slate-400 text-xs">الكمية (فرخ×4)</Label><Input className="bg-white/10 text-white font-black h-11" type="number" value={targetQty} readOnly /></div>
              <div><Label className="text-slate-400 text-xs">نثريات</Label><Input className="bg-white/10 text-white h-11" type="number" value={miscellaneous} onChange={(e) => setMiscellaneous(e.target.value)} /></div>
              <div><Label className="text-slate-400 text-xs font-bold">الربح %</Label><Input className="bg-white/10 text-green-400 font-black h-11" type="number" value={profitMargin} onChange={(e) => setProfitMargin(e.target.value)} /></div>
            </div>
            <div className="p-5 bg-green-50 border-2 border-green-200 rounded-2xl space-y-3">
              <div className="flex justify-between items-center"><span className="text-green-800 font-black text-xl">سعر الألف للزبون:</span><span className="font-black text-3xl text-green-600">{res.customerPrice1000} ج.م</span></div>
              <div className="grid grid-cols-2 gap-3 text-xs text-green-700 border-t border-green-200 pt-3 font-bold">
                <span>تكلفتي الإجمالية: {res.myTotalCost} ج.م</span>
                <span>تكلفة القطعة: {res.myUnitCost} ج.م</span>
                <span className="col-span-2 text-center text-sm text-green-900 font-black">صافي الربح: {res.profitAmount} ج.م</span>
              </div>
              <Button onClick={() => setPPrice(res.customerPrice1000)} className="w-full bg-green-600 font-black h-11">اعتماد هذا السعر</Button>
            </div>
            <div><Label className="font-black text-blue-700">السعر النهائي في القائمة (ج.م)</Label><Input type="number" value={pPrice} onChange={(e) => setPPrice(e.target.value)} className="text-3xl h-16 border-4 border-blue-600 text-center font-black rounded-2xl mt-1" /></div>
            <Button onClick={saveEntry} className="w-full h-14 bg-slate-900 text-xl font-black rounded-2xl">حفظ في القائمة</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
