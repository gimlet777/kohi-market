"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Logo } from "@/components/Logo"

const inputClass =
  "w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1508] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4622D] transition-colors"

// ─── Inner form (needs useSearchParams, wrapped in Suspense below) ────────────

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") ?? "/"

  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

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
    <div className="min-h-screen bg-[#F8F5F2] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/">
          <Logo height={36} />
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">My Account</p>
            <h1 className="font-serif text-3xl text-[#2A1508]">Sign in</h1>
            <p className="text-sm text-stone-400 font-light mt-1">Welcome back to Mame Mart.</p>
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
              className="w-full py-3 bg-[#2A1508] hover:bg-[#3d2010] disabled:opacity-60 text-white text-sm font-medium rounded-[2px] tracking-wide transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-xs text-stone-400 text-center mt-6">
            New to Mame Mart?{" "}
            <Link href={signupHref} className="text-[#C4622D] hover:text-[#A84F22] transition-colors">
              Create an account →
            </Link>
          </p>

          <p className="text-xs text-stone-300 text-center mt-3">
            Are you a roaster?{" "}
            <Link href="/roaster/login" className="text-stone-400 hover:text-[#2A1508] transition-colors">
              Roaster sign in →
            </Link>
          </p>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#2A1508] px-6 md:px-10 py-10 text-center mt-auto">
        <Logo height={32} inverted />
        <p className="text-stone-500 text-xs mt-2 tracking-widest font-light">Mame Mart · Specialty Coffee Marketplace</p>
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
