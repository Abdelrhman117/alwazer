"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { toast.error("يرجى إدخال الإيميل وكلمة المرور"); return }
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      router.replace("/dashboard")
    } catch (err: any) {
      toast.error(firebaseError(err.code))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0F1F3D 0%, #1A3260 50%, #243B6E 100%)" }}>

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: "var(--wazer-yellow)", filter: "blur(80px)" }} />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full opacity-5"
          style={{ background: "var(--wazer-yellow)", filter: "blur(60px)" }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl pulse-yellow"
            style={{ background: "var(--wazer-yellow)" }}>
            <span className="text-4xl font-black" style={{ color: "var(--wazer-navy)" }}>و</span>
          </div>
          <h1 className="text-2xl font-black text-white">الوزير</h1>
          <p className="text-sm mt-1 font-bold" style={{ color: "rgba(245,197,24,0.7)" }}>للدعاية والإعلان</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-6 shadow-2xl border"
          style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(245,197,24,0.2)", backdropFilter: "blur(20px)" }}>
          <h2 className="text-base font-black text-white mb-5 text-center">تسجيل الدخول</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(245,197,24,0.6)" }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com" dir="ltr" autoComplete="email"
                  className="w-full h-11 pr-10 pl-4 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.08)", borderWidth: 1,
                    borderColor: "rgba(245,197,24,0.2)", color: "white",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(245,197,24,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(245,197,24,0.2)"}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(245,197,24,0.6)" }} />
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" dir="ltr" autoComplete="current-password"
                  className="w-full h-11 pr-10 pl-10 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(245,197,24,0.2)", color: "white" }}
                  onFocus={e => e.target.style.borderColor = "rgba(245,197,24,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(245,197,24,0.2)"}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl font-black text-base transition-all hover:opacity-90 disabled:opacity-50 mt-2 shadow-lg"
              style={{ background: "var(--wazer-yellow)", color: "var(--wazer-navy)" }}>
              {loading ? "جاري التحقق..." : "دخول →"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4 font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
          شركة الوزير للدعاية والإعلان © 2025
        </p>
      </div>
    </div>
  )
}

function firebaseError(code: string): string {
  const e: Record<string,string> = {
    "auth/user-not-found":      "لا يوجد حساب بهذا الإيميل",
    "auth/wrong-password":      "كلمة المرور غير صحيحة",
    "auth/invalid-credential":  "الإيميل أو كلمة المرور غير صحيحة",
    "auth/invalid-email":       "صيغة الإيميل غير صحيحة",
    "auth/too-many-requests":   "محاولات كثيرة، حاول لاحقاً",
    "auth/network-request-failed": "تحقق من الاتصال بالإنترنت",
  }
  return e[code] || "حدث خطأ، حاول مرة أخرى"
}
