"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Logo } from "@/components/Logo"

const REGIONS = ["Tokyo", "Kyoto", "Osaka", "Fukuoka", "Hokkaido"]
const SELLER_TYPES = ["Roastery", "Café Roaster"] as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  "w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1508] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4622D] transition-colors"

export default function SignupPage() {
  const router = useRouter()
  const [roasterName, setRoasterName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [region, setRegion] = useState("")
  const [sellerType, setSellerType] = useState<"Roastery" | "Café Roaster" | "">("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/roaster/dashboard")
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!region) { setError("Please select a region."); return }
    if (!sellerType) { setError("Please select a seller type."); return }

    setLoading(true)
    setError(null)

    // 1. Create auth user
    const { data, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Email confirmation is enabled — session will be null
    if (!data.session) {
      setError("Check your inbox to confirm your email, then sign in.")
      setLoading(false)
      return
    }

    // 2. Insert roaster profile (requires active session for RLS)
    const { error: profileError } = await supabase.from("roasters").insert({
      id: data.user!.id,
      email: data.user!.email,
      roaster_name: roasterName,
      region,
      seller_type: sellerType,
    })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push("/roaster/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#F8F5F2] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/">
          <Logo height={36} />
        </Link>
        <span className="text-xs text-stone-400">Roaster Portal</span>
      </nav>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <div className="mb-8">
            <h1 className="font-serif text-3xl text-[#2A1508] mb-2">Join Mame Mart</h1>
            <p className="text-sm text-stone-400">Create your seller account to list your coffees.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded border border-[#E8E2D8] p-8 space-y-5"
          >
            <Field label="Roaster Name">
              <input
                type="text"
                required
                value={roasterName}
                onChange={(e) => setRoasterName(e.target.value)}
                placeholder="e.g. Fuglen Tokyo"
                className={inputClass}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@roastery.com"
                className={inputClass}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </Field>

            <Field label="Region">
              <div className="relative">
                <select
                  required
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={`${inputClass} appearance-none pr-10`}
                >
                  <option value="" disabled>Select your region</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {/* Chevron */}
                <svg
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </Field>

            <Field label="Seller Type">
              <div className="flex gap-3">
                {SELLER_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSellerType(t)}
                    className={`flex-1 py-2.5 px-4 rounded-[2px] border text-sm transition-all ${
                      sellerType === t
                        ? "border-[#C4622D] bg-amber-50 text-[#2A1508] font-medium"
                        : "border-stone-200 text-stone-500 hover:border-stone-300 bg-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-[2px] px-4 py-3">
                <p className="text-red-600 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C4622D] hover:bg-[#A84F22] disabled:opacity-60 text-white py-3.5 rounded-[2px] text-sm font-medium tracking-wide transition-colors"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-xs text-stone-400 mt-6">
            Already have an account?{" "}
            <Link href="/roaster/login" className="text-[#C4622D] hover:text-[#A84F22] transition-colors">
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
