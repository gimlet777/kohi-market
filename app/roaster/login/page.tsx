"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

const inputClass =
  "w-full px-4 py-3 border border-stone-200 rounded-xl text-sm text-[#34150F] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C8965A] transition-colors"

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
    <div className="min-h-screen bg-[#f7f5f2] flex flex-col">

      {/* Nav */}
      <nav className="bg-[#34150F] px-6 md:px-10 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-[#C8965A] tracking-wide">
          KOHĪ
        </Link>
        <span className="text-xs text-stone-500 tracking-widest uppercase">Roaster Portal</span>
      </nav>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <div className="mb-8">
            <h1 className="font-serif text-3xl text-[#34150F] mb-2">Welcome back</h1>
            <p className="text-sm text-stone-400">Sign in to your roaster account.</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm space-y-5"
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
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-red-600 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C8965A] hover:bg-[#B8854C] disabled:opacity-60 text-white py-3.5 rounded-full text-sm font-medium tracking-wide transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-stone-400 mt-6">
            New roaster?{" "}
            <Link href="/roaster/signup" className="text-[#C8965A] hover:text-[#B8854C] transition-colors">
              Create an account
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
