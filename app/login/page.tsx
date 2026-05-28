"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

const inputClass =
  "w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1A0E] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4714A] transition-colors"

// ─── Inner form (needs useSearchParams, wrapped in Suspense below) ────────────

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") ?? "/"

  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Redirect away if a session already exists
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      const { data: roaster } = await supabase
        .from("roasters").select("id").eq("id", session.user.id).maybeSingle()
      router.replace(roaster ? "/roaster/dashboard" : returnTo)
    })
  }, [router, returnTo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError || !data.session) {
      setError(authError?.message ?? "Sign in failed.")
      setLoading(false)
      return
    }

    const { data: roaster } = await supabase
      .from("roasters").select("id").eq("id", data.session.user.id).maybeSingle()
    router.replace(roaster ? "/roaster/dashboard" : returnTo)
  }

  const signupHref = returnTo !== "/"
    ? `/signup?returnTo=${encodeURIComponent(returnTo)}`
    : "/signup"

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-serif text-xl text-[#2A1A0E] leading-none">珈琲市</span>
          <span className="text-[11px] text-stone-300 tracking-[0.18em] font-light leading-none mt-0.5">KOHĪ</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">My Account</p>
            <h1 className="font-serif text-3xl text-[#2A1A0E]">Sign in</h1>
            <p className="text-sm text-stone-400 font-light mt-1">Welcome back to KOHĪ.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 leading-relaxed">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2A1A0E] hover:bg-[#3a2010] disabled:opacity-60 text-white text-sm font-medium rounded-[2px] tracking-wide transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-xs text-stone-400 text-center mt-6">
            New to KOHĪ?{" "}
            <Link href={signupHref} className="text-[#C4714A] hover:text-[#B05E3C] transition-colors">
              Create an account →
            </Link>
          </p>

          <p className="text-xs text-stone-300 text-center mt-3">
            Are you a roaster?{" "}
            <Link href="/roaster/login" className="text-stone-400 hover:text-[#2A1A0E] transition-colors">
              Roaster sign in →
            </Link>
          </p>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#2A1A0E] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="font-serif text-xl text-[#C4714A]">珈琲市</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">KOHĪ · Specialty Coffee Marketplace</p>
      </footer>
    </div>
  )
}

// ─── Page (Suspense boundary for useSearchParams) ────────────────────────────

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
