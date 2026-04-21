"use client"

import { useState, useEffect } from "react"
import { useSettings } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Building2, Database, Save } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

export default function SettingsPage() {
  const { user } = useAuth()
  const { settings, save: saveSettings, loading } = useSettings()
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  const [companyName, setCompanyName] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [taxRate, setTaxRate] = useState("")

  useEffect(() => {
    if (!loading) {
      setCompanyName(settings.companyName)
      setCompanyPhone(settings.companyPhone)
      setCompanyAddress(settings.companyAddress)
      setTaxRate(settings.taxRate.toString())
    }
  }, [loading, settings])

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveSettings({
        ...settings,
        companyName: companyName.trim(),
        companyPhone: companyPhone.trim(),
        companyAddress: companyAddress.trim(),
        taxRate: parseFloat(taxRate) || 0,
      })
      toast.success("تم حفظ بيانات الشركة")
    } catch {
      toast.error("فشل في حفظ الإعدادات")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="flex flex-col gap-6 p-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">الاعدادات</h1>
        <p className="text-sm text-muted-foreground">ادارة اعدادات النظام وبيانات الشركة</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5" /> بيانات الشركة</CardTitle>
            <CardDescription>معلومات الشركة التي تظهر في الفواتير</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveCompany} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2"><Label>اسم الشركة</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
              <div className="flex flex-col gap-2"><Label>رقم الهاتف</Label><Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} dir="ltr" className="text-right" /></div>
              <div className="flex flex-col gap-2"><Label>العنوان</Label><Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} /></div>
              <div className="flex flex-col gap-2"><Label>نسبة ضريبة القيمة المضافة (%)</Label><Input type="number" min={0} max={100} step={0.5} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
              <Button type="submit" disabled={saving} className="gap-1.5"><Save className="h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ التعديلات"}</Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Database className="h-5 w-5" /> معلومات الحساب</CardTitle>
            <CardDescription>بيانات حسابك في النظام</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg bg-muted p-4">
              <div>
                <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                <p className="font-mono text-sm font-semibold" dir="ltr">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted p-4">
              <div>
                <p className="text-xs text-muted-foreground">مزود التخزين</p>
                <p className="text-sm font-semibold text-green-700">🔥 Firebase Firestore (سحابي)</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              جميع البيانات مخزنة بشكل آمن في السحابة وتتزامن تلقائياً عبر جميع أجهزتك.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
