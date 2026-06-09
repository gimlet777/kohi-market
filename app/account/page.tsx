"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { BREW_METHODS, type BrewMethodKey } from "@/lib/brewGuide"
import { UserNav } from "@/components/UserNav"

// ─── Types ────────────────────────────────────────────────────────────────────

type GrinderType = "none" | "hand" | "electric-burr"

interface ConsumerProfile {
  preferred_brew_method: BrewMethodKey | null
  grinder_type: GrinderType | null
  brew_notes: string | null
}

const GRINDER_OPTIONS: { value: GrinderType; label: string; desc: string }[] = [
  { value: "none",          label: "No grinder",           desc: "I buy pre-ground or drip bags" },
  { value: "hand",          label: "Hand grinder",          desc: "Manual burr grinder" },
  { value: "electric-burr", label: "Electric burr grinder", desc: "Flat or conical burr grinder" },
]

const inputClass =
  "w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1A0E] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4714A] transition-colors"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const router = useRouter()
  const [userId, setUserId]       = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  // Equipment profile state
  const [preferredMethod, setPreferredMethod] = useState<BrewMethodKey | null>(null)
  const [grinderType, setGrinderType]         = useState<GrinderType | null>(null)
  const [setupNotes, setSetupNotes]           = useState("")
  const [profileSaving, setProfileSaving]     = useState(false)
  const [profileSaved, setProfileSaved]       = useState(false)
  const [profileError, setProfileError]       = useState<string | null>(null)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/login?returnTo=/account")
        return
      }

      // Roasters don't use this page
      const { data: roaster } = await supabase
        .from("roasters").select("id").eq("id", session.user.id).maybeSingle()
      if (roaster) {
        router.replace("/roaster/dashboard")
        return
      }

      setUserId(session.user.id)
      setUserEmail(session.user.email ?? null)
      await loadProfile(session.user.id)
      setIsChecking(false)
    }
    checkSession()
  }, [router])

  async function loadProfile(id: string) {
    const { data } = await supabase
      .from("consumer_profiles")
      .select("preferred_brew_method, grinder_type, brew_notes")
      .eq("id", id)
      .maybeSingle()
    if (data) {
      const p = data as ConsumerProfile
      setPreferredMethod(p.preferred_brew_method)
      setGrinderType(p.grinder_type)
      setSetupNotes(p.brew_notes ?? "")
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setProfileSaving(true)
    setProfileError(null)
    setProfileSaved(false)

    const { error } = await supabase.from("consumer_profiles").upsert({
      id: userId,
      preferred_brew_method: preferredMethod,
      grinder_type: grinderType,
      brew_notes: setupNotes.trim() || null,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setProfileError(error.message)
    } else {
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    }
    setProfileSaving(false)
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
        <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-xl font-medium text-[#2A1A0E] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
          </Link>
          <UserNav />
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#C4714A] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-xl font-medium text-[#2A1A0E] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        </Link>
        <UserNav />
      </nav>

      <div className="flex-1 px-6 md:px-10 py-12 max-w-lg mx-auto w-full">
        <div className="space-y-8">

          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">My Account</p>
            <h1 className="font-serif text-3xl text-[#2A1A0E]">Equipment Profile</h1>
            {userEmail && <p className="text-xs text-stone-400 font-light mt-1">{userEmail}</p>}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-7">

            {/* Preferred brew method */}
            <div>
              <p className="text-xs tracking-widest uppercase text-stone-400 mb-3">Preferred brewing method</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BREW_METHODS.map(method => {
                  const active = preferredMethod === method.key
                  return (
                    <button
                      key={method.key}
                      type="button"
                      onClick={() => setPreferredMethod(active ? null : method.key)}
                      className={`text-left px-4 py-3 rounded-[2px] border transition-all ${
                        active
                          ? "border-[#C4714A] bg-[#C4714A]/5"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <p className={`text-sm font-medium ${active ? "text-[#C4714A]" : "text-stone-600"}`}>
                        {method.label}
                      </p>
                      <p className="text-[10px] text-stone-400 font-light mt-0.5 leading-snug">
                        {method.devices}
                      </p>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-stone-300 mt-2 font-light">
                This method will be pre-selected on every product page.
              </p>
            </div>

            {/* Grinder type */}
            <div>
              <p className="text-xs tracking-widest uppercase text-stone-400 mb-3">Grinder</p>
              <div className="space-y-2">
                {GRINDER_OPTIONS.map(opt => {
                  const active = grinderType === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGrinderType(active ? null : opt.value)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-[2px] border text-left transition-all ${
                        active
                          ? "border-[#C4714A] bg-[#C4714A]/5"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-medium ${active ? "text-[#C4714A]" : "text-stone-600"}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-stone-400 font-light mt-0.5">{opt.desc}</p>
                      </div>
                      {active && (
                        <svg className="h-4 w-4 text-[#C4714A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Setup notes */}
            <div>
              <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">
                Setup notes
              </label>
              <textarea
                rows={3}
                value={setupNotes}
                onChange={e => setSetupNotes(e.target.value)}
                placeholder="e.g. Timemore C2 grinder, Hario V60 02, Bonavita kettle…"
                className={`${inputClass} resize-none`}
              />
              <p className="text-[11px] text-stone-300 mt-1.5 font-light">
                Notes about your specific equipment — just for your own reference.
              </p>
            </div>

            {profileError && <p className="text-xs text-red-500">{profileError}</p>}

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={profileSaving}
                className="bg-[#2A1A0E] hover:bg-[#3a2010] disabled:opacity-60 text-white text-sm px-6 py-2.5 rounded-[2px] font-light transition-colors"
              >
                {profileSaving ? "Saving…" : "Save preferences"}
              </button>
              {profileSaved && (
                <span className="text-sm text-[#C4714A] font-light">Saved ✓</span>
              )}
            </div>

          </form>

          <div className="border-t border-stone-100 pt-6 flex items-center gap-6">
            <Link href="/profile" className="text-xs text-stone-400 hover:text-[#C4714A] transition-colors">
              ← My profile
            </Link>
            <Link href="/" className="text-xs text-stone-400 hover:text-[#C4714A] transition-colors">
              ← Back to marketplace
            </Link>
          </div>

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
