"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calculator, Trash2, TrendingUp } from "lucide-react"
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

  const [pService, setPService] = useState("")
  const [pPrice, setPPrice] = useState("")
  const [selectedPaperId, setSelectedPaperId] = useState("")
  const [paperPriceType, setPaperPriceType] = useState<"priceSalim" | "priceJayir">("priceSalim")
  const [sheetPrice, setSheetPrice] = useState("0")
  const [sheetCount, setSheetCount] = useState("0")
  const [printPricePer250, setPrintPricePer250] = useState("300")
  const [targetQty, setTargetQty] = useState("0")
  const [profitMargin, setProfitMargin] = useState("40")
  const [miscellaneous, setMiscellaneous] = useState("50")
  const [sallofanEnabled, setSallofanEnabled] = useState(false)
  const [zinkatEnabled, setZinkatEnabled] = useState(false)
  const [basmaLength, setBasmaLength] = useState("0")
  const [basmaWidth, setBasmaWidth] = useState("0")
  const [basmaAclashie, setBasmaAclashie] = useState("0")
  const [takserCost, setTakserCost] = useState("0")

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

  // auto sheet price from selected paper
  useEffect(() => {
    if (!selectedPaperId) return
    const paper = paperList.find((p) => p.id === selectedPaperId)
    if (paper) setSheetPrice(String(paper[paperPriceType] ?? 0))
  }, [selectedPaperId, paperPriceType, paperList])

  const calculate = () => {
    const qty    = Math.max(parseFloat(targetQty) || 0, 1)
    const sCount = parseFloat(sheetCount) || 0
    const profit = (parseFloat(profitMargin) || 0) / 100
    // الهالك 3% على الورق فقط
    const paperRaw  = (parseFloat(sheetPrice) || 0) * sCount
    const paper     = paperRaw * 1.03
    const print     = sCount > 0 ? (sCount / 250) * (parseFloat(printPricePer250) || 300) : 0
    const sallofan  = sallofanEnabled ? sCount * 3 : 0
    const zinkat    = zinkatEnabled ? 300 : 0
    const basma     = (parseFloat(basmaLength) || 0) * (parseFloat(basmaWidth) || 0) * 4 + (parseFloat(basmaAclashie) || 0)
    const takser    = parseFloat(takserCost) || 0
    const totalCost = paper + print + sallofan + zinkat + basma + takser + (parseFloat(miscellaneous) || 0)
    const sellingTotal   = totalCost * (1 + profit)
    const per1000        = (sellingTotal / qty) * 1000
    return {
      myTotalCost:       totalCost.toFixed(2),
      myUnitCost:        (totalCost / qty).toFixed(2),
      customerPrice1000: per1000.toFixed(2),
      customerTotal:     sellingTotal.toFixed(2),
      profitAmount:      (sellingTotal - totalCost).toFixed(2),
      breakdown: { paper: paperRaw, print, sallofan, zinkat, basma, takser },
    }
  }

  const res = calculate()

  const [savingEntry, setSavingEntry] = useState(false)

  async function saveEntry() {
    if (!pService) return toast.error("اكتب اسم المنتج")
    setSavingEntry(true)
    try {
      const newEntry = { id: crypto.randomUUID(), service: pService, price: pPrice || res.customerPrice1000, myCost: res.myUnitCost, unit: "1000 قطعة" }
      const newList = [...pricingList, newEntry]
      setPricingList(newList)
      await persist(newList, paperList)
      setPrintFormOpen(false)
      setPService(""); setPPrice("")
      toast.success("تم حفظ السعر في القائمة")
    } catch { toast.error("فشل في الحفظ") }
    finally { setSavingEntry(false) }
  }

  async function deletePricing(id: string) {
    const newList = pricingList.filter((i) => i.id !== id)
    setPricingList(newList)
    await persist(newList, paperList)
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


      {/* Calculator Dialog */}
      <Dialog open={printFormOpen} onOpenChange={setPrintFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl" dir="rtl">
          <DialogHeader className="border-b pb-4"><DialogTitle className="text-2xl font-black text-blue-800">حاسبة التكاليف</DialogTitle></DialogHeader>
          <div className="space-y-5 pt-4">
            <div><Label className="font-bold">اسم المنتج</Label><Input value={pService} onChange={(e) => setPService(e.target.value)} className="h-12 text-lg mt-1" /></div>
            <div className="space-y-3">
              {/* الورق والطباعة */}
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-3">
                <h3 className="font-black text-blue-900 text-sm border-b pb-2">الورق والطباعة</h3>

                {/* اختيار الورق من الخامات */}
                <div>
                  <Label className="text-xs font-bold text-blue-700 mb-1 block">نوع الورق (من قائمة الخامات)</Label>
                  <Select value={selectedPaperId} onValueChange={setSelectedPaperId} dir="rtl">
                    <SelectTrigger className="h-10 text-sm font-bold border-2 border-blue-200">
                      <SelectValue placeholder="اختر نوع الورق..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {paperList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.type} {p.weight}جم — سليم: {p.priceSalim} | جايير: {p.priceJayir}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* سليم / جايير */}
                {selectedPaperId && (
                  <div className="flex gap-2">
                    {(["priceSalim", "priceJayir"] as const).map((type) => (
                      <button key={type} type="button"
                        onClick={() => setPaperPriceType(type)}
                        className={`flex-1 py-2 rounded-xl text-sm font-black border-2 transition-all ${paperPriceType === type ? "bg-blue-700 text-white border-blue-700" : "bg-white text-blue-700 border-blue-200"}`}>
                        {type === "priceSalim" ? "سليم" : "جايير"}
                        <span className="mr-1 text-xs opacity-70">
                          ({paperList.find(p => p.id === selectedPaperId)?.[type]} ج.م)
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500">سعر الفرخ (ج.م)</Label>
                    <Input type="number" value={sheetPrice}
                      onChange={(e) => { setSelectedPaperId(""); setSheetPrice(e.target.value) }}
                      className="text-center font-black border-slate-300"
                      placeholder="أو أدخل يدوياً" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-blue-600">عدد الأفرخ</Label>
                    <Input type="number" value={sheetCount} onChange={(e) => setSheetCount(e.target.value)} className="border-blue-300 text-center font-black" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">سعر الطباعة لكل 250 فرخ (ج.م)</Label>
                    <Input type="number" value={printPricePer250} onChange={(e) => setPrintPricePer250(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* خدمات ما بعد الطباعة */}
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 space-y-3">
                <h3 className="font-black text-orange-900 text-sm border-b pb-2">خدمات ما بعد الطباعة</h3>

                {/* ثوابت */}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button"
                    onClick={() => setSallofanEnabled(!sallofanEnabled)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all ${sallofanEnabled ? "bg-orange-200 border-orange-400 text-orange-900" : "bg-white border-gray-200 text-gray-400"}`}>
                    <span>سلوفان</span>
                    <span className="text-xs">{sallofanEnabled ? `${(parseFloat(sheetCount)||0)*3} ج.م` : "3 ج.م/فرخ"}</span>
                  </button>
                  <button type="button"
                    onClick={() => setZinkatEnabled(!zinkatEnabled)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all ${zinkatEnabled ? "bg-orange-200 border-orange-400 text-orange-900" : "bg-white border-gray-200 text-gray-400"}`}>
                    <span>زنكات</span>
                    <span className="text-xs">300 ج.م</span>
                  </button>
                </div>

                {/* متغيرات */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-orange-200">
                  <div>
                    <Label className="text-xs">طول البصمة</Label>
                    <Input type="number" value={basmaLength} onChange={(e) => setBasmaLength(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">عرض البصمة</Label>
                    <Input type="number" value={basmaWidth} onChange={(e) => setBasmaWidth(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">أكلاشيه</Label>
                    <Input type="number" value={basmaAclashie} onChange={(e) => setBasmaAclashie(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">تكسير (ج.م)</Label>
                    <Input type="number" value={takserCost} onChange={(e) => setTakserCost(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 bg-slate-900 p-4 rounded-2xl text-white">
              <div><Label className="text-slate-400 text-xs">الكمية (فرخ×4)</Label><Input className="bg-white/10 text-white font-black h-11" type="number" value={targetQty} readOnly /></div>
              <div><Label className="text-slate-400 text-xs">نثريات</Label><Input className="bg-white/10 text-white h-11" type="number" value={miscellaneous} onChange={(e) => setMiscellaneous(e.target.value)} /></div>
              <div><Label className="text-slate-400 text-xs font-bold">الربح %</Label><Input className="bg-white/10 text-green-400 font-black h-11" type="number" value={profitMargin} onChange={(e) => setProfitMargin(e.target.value)} /></div>
            </div>
            <div className="p-5 bg-green-50 border-2 border-green-200 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-green-800 font-black text-xl">سعر الألف للزبون:</span>
                <span className="font-black text-3xl text-green-600">{res.customerPrice1000} ج.م</span>
              </div>
              {/* تفصيل التكلفة */}
              <div className="grid grid-cols-3 gap-2 text-xs border-t border-green-200 pt-3">
                {[
                  { label: "ورق", val: res.breakdown.paper },
                  { label: "طباعة", val: res.breakdown.print },
                  { label: "سلوفان", val: res.breakdown.sallofan },
                  { label: "زنكات", val: res.breakdown.zinkat },
                  { label: "بصمة", val: res.breakdown.basma },
                  { label: "تكسير", val: res.breakdown.takser },
                ].filter(i => i.val > 0).map(i => (
                  <div key={i.label} className="bg-white rounded-lg p-2 text-center border border-green-100">
                    <div className="text-green-600 font-bold">{i.label}</div>
                    <div className="font-black text-green-900">{i.val.toFixed(0)} ج.م</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-green-700 border-t border-green-200 pt-3 font-bold">
                <span>تكلفتي الإجمالية: {res.myTotalCost} ج.م</span>
                <span>تكلفة القطعة: {res.myUnitCost} ج.م</span>
                <span className="col-span-2 text-center text-sm text-green-900 font-black">صافي الربح: {res.profitAmount} ج.م</span>
              </div>
              <Button onClick={() => setPPrice(res.customerPrice1000)} className="w-full bg-green-600 font-black h-11">اعتماد هذا السعر</Button>
            </div>
            <div><Label className="font-black text-blue-700">السعر النهائي في القائمة (ج.م)</Label><Input type="number" value={pPrice} onChange={(e) => setPPrice(e.target.value)} className="text-3xl h-16 border-4 border-blue-600 text-center font-black rounded-2xl mt-1" /></div>
            <Button onClick={saveEntry} disabled={savingEntry} className="w-full h-14 bg-slate-900 text-xl font-black rounded-2xl">{savingEntry ? "جاري الحفظ..." : "حفظ في القائمة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
