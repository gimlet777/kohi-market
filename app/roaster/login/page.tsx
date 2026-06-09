"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

const inputClass =
  "w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1A0E] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4714A] transition-colors"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push("/roaster/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-xl font-medium text-[#2A1A0E] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        </Link>
        <span className="text-xs text-stone-400">Roaster Portal</span>
      </nav>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <div className="mb-8">
            <h1 className="font-serif text-3xl text-[#2A1A0E] mb-2">Welcome back</h1>
            <p className="text-sm text-stone-400">Sign in to your roaster account.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded border border-[#E8E2D8] p-8 space-y-5"
          >
            <div>
              <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@roastery.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-[2px] px-4 py-3">
                <p className="text-red-600 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C4714A] hover:bg-[#B05E3C] disabled:opacity-60 text-white py-3.5 rounded-[2px] text-sm font-medium tracking-wide transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-stone-400 mt-6">
            New roaster?{" "}
            <Link href="/roaster/signup" className="text-[#C4714A] hover:text-[#B05E3C] transition-colors">
              Create an account
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
