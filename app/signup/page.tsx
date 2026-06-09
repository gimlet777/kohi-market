"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

const inputClass =
  "w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1A0E] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4714A] transition-colors"

// ─── Inner form (needs useSearchParams, wrapped in Suspense below) ────────────

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") ?? "/"

  const [displayName, setDisplayName] = useState("")
  const [email, setEmail]             = useState("")
  const [password, setPassword]       = useState("")
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Redirect away if already signed in
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

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setError("Check your email to confirm your account, then sign in.")
      setLoading(false)
      return
    }

    // Create consumer profile row with display name
    await supabase.from("consumer_profiles").upsert({
      id: data.user!.id,
      display_name: displayName.trim() || null,
      updated_at: new Date().toISOString(),
    })

    router.replace(returnTo)
  }

  const loginHref = returnTo !== "/"
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/login"

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-xl font-medium text-[#2A1A0E] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">My Account</p>
            <h1 className="font-serif text-3xl text-[#2A1A0E]">Create account</h1>
            <p className="text-sm text-stone-400 font-light mt-1">
              Join Mame Mart to save preferences and track your orders.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">Display name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </div>

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
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-stone-400 text-center mt-6">
            Already have an account?{" "}
            <Link href={loginHref} className="text-[#C4714A] hover:text-[#B05E3C] transition-colors">
              Sign in →
            </Link>
          </p>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#2A1A0E] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="text-xl font-medium text-[#C4714A] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">Mame Mart · Specialty Coffee Marketplace</p>
      </footer>
    </div>
  )
}

// ─── Page (Suspense boundary for useSearchParams) ────────────────────────────

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
