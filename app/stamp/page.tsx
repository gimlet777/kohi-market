"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { NavLogo } from "@/components/NavLogo"

// ─── Types ────────────────────────────────────────────────────────────────────

type StampPhase =
  | { phase: "loading" }
  | { phase: "success";      roasterName: string; logoUrl: string | null; stampCount: number }
  | { phase: "duplicate";    roasterName: string; logoUrl: string | null; stampCount: number }
  | { phase: "expired_code"; roasterName: string }
  | { phase: "invalid_code" }
  | { phase: "server_error"; message: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

// ─── Shell (shared nav + layout) ─────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F5F2] flex flex-col">
      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-[rgba(42,21,8,0.07)] px-6 py-3.5 flex items-center">
        <Link href="/">
          <NavLogo />
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center space-y-6">
          {children}
        </div>
      </div>
      <footer className="bg-[#2A1508] px-6 py-8 text-center">
        <span className="text-lg font-medium text-[#C4622D] leading-none tracking-tight">
          <span className="font-serif">豆</span>MART
        </span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">Mame Mart · Loyalty Stamps</p>
      </footer>
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function StampBadge({
  roasterName,
  logoUrl,
  earned,
}: {
  roasterName: string
  logoUrl: string | null
  earned: boolean
}) {
  return (
    <div className="animate-stamp-pop relative w-44 h-44 mx-auto">
      {/* Outer dashed ring */}
      <div className="w-full h-full rounded-full border-[3px] border-dashed border-[#2A1508] flex flex-col items-center justify-center gap-2 bg-[#F8F5F2]">
        {/* Logo or fallback */}
        <div className="w-16 h-16 rounded-full overflow-hidden border border-[rgba(42,21,8,0.10)] bg-stone-100 flex items-center justify-center shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-[#C4622D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 00.75-1.7v-1.386c0-.62-.282-1.2-.76-1.591L15 6.5m4.8 8.5H4.2m15.6 0a2.25 2.25 0 01-.75 1.7M4.2 15a2.25 2.25 0 01-.75-1.7V11.914c0-.62.282-1.2.76-1.591L9 6.5M4.2 15h15.6" />
            </svg>
          )}
        </div>
        {/* Roaster name */}
        <p className="text-[9px] tracking-[0.18em] uppercase text-[#2A1508] font-medium px-6 leading-tight">
          {roasterName}
        </p>
      </div>
      {/* Status indicator */}
      {earned ? (
        <div className="absolute -top-1 -right-1 w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center ring-[3px] ring-[#F8F5F2]">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : (
        <div className="absolute -top-1 -right-1 w-9 h-9 bg-stone-200 rounded-full flex items-center justify-center ring-[3px] ring-[#F8F5F2]">
          <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── Content component (uses useSearchParams) ─────────────────────────────────

function StampContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roasterId = searchParams.get("roaster") ?? ""
  const v         = searchParams.get("v")       ?? ""
  const sig       = searchParams.get("sig")     ?? ""

  const [state, setState] = useState<StampPhase>({ phase: "loading" })

  useEffect(() => {
    if (!roasterId || !v || !sig) {
      setState({ phase: "invalid_code" })
      return
    }

    async function claim() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        const returnTo = `/stamp?roaster=${encodeURIComponent(roasterId)}&v=${encodeURIComponent(v)}&sig=${encodeURIComponent(sig)}`
        router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`)
        return
      }

      try {
        const res = await fetch("/api/stamp/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ roaster: roasterId, v, sig }),
        })

        const data = await res.json()

        if (!res.ok) {
          setState({ phase: "server_error", message: data.error ?? "Something went wrong" })
          return
        }

        switch (data.status) {
          case "success":
            setState({ phase: "success", roasterName: data.roasterName, logoUrl: data.logoUrl, stampCount: data.stampCount })
            break
          case "duplicate":
            setState({ phase: "duplicate", roasterName: data.roasterName, logoUrl: data.logoUrl, stampCount: data.stampCount })
            break
          case "invalid_code":
            setState({ phase: "invalid_code" })
            break
          case "expired_code":
            setState({ phase: "expired_code", roasterName: data.roasterName })
            break
          default:
            setState({ phase: "server_error", message: "Unexpected response from server" })
        }
      } catch {
        setState({ phase: "server_error", message: "Network error — please try again" })
      }
    }

    claim()
  }, [roasterId, v, sig, router])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state.phase === "loading") {
    return (
      <Shell>
        <div className="w-8 h-8 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-stone-400 font-light">Verifying stamp…</p>
      </Shell>
    )
  }

  // ── Invalid code ─────────────────────────────────────────────────────────
  if (state.phase === "invalid_code") {
    return (
      <Shell>
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h1 className="font-serif text-2xl text-[#2A1508] mb-2">Invalid stamp code</h1>
          <p className="text-sm text-stone-400 font-light leading-relaxed">
            This QR code is not valid. Please ask the roaster to show you their current stamp QR code.
          </p>
        </div>
        <Link href="/" className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors tracking-wide">
          ← Back to marketplace
        </Link>
      </Shell>
    )
  }

  // ── Expired code ─────────────────────────────────────────────────────────
  if (state.phase === "expired_code") {
    return (
      <Shell>
        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="font-serif text-2xl text-[#2A1508] mb-2">Stamp code expired</h1>
          <p className="text-sm text-stone-400 font-light leading-relaxed">
            <span className="text-[#2A1508] font-normal">{state.roasterName}</span> has updated their QR code.
            Please scan the latest version displayed at the roastery.
          </p>
        </div>
        <Link href="/" className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors tracking-wide">
          ← Back to marketplace
        </Link>
      </Shell>
    )
  }

  // ── Server error ─────────────────────────────────────────────────────────
  if (state.phase === "server_error") {
    return (
      <Shell>
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h1 className="font-serif text-2xl text-[#2A1508] mb-2">Something went wrong</h1>
          <p className="text-sm text-stone-400 font-light leading-relaxed">{state.message}</p>
        </div>
        <Link href="/" className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors tracking-wide">
          ← Back to marketplace
        </Link>
      </Shell>
    )
  }

  // ── Already collected today ───────────────────────────────────────────────
  if (state.phase === "duplicate") {
    return (
      <Shell>
        <StampBadge roasterName={state.roasterName} logoUrl={state.logoUrl} earned={false} />
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">Already collected</p>
          <h1 className="font-serif text-2xl text-[#2A1508] leading-snug mb-2">
            Today&apos;s stamp already earned
          </h1>
          <p className="text-sm text-stone-400 font-light leading-relaxed">
            You&apos;ve already collected a stamp from{" "}
            <span className="text-[#2A1508] font-normal">{state.roasterName}</span>{" "}
            today. Come back tomorrow!
          </p>
        </div>
        <p className="text-xs text-stone-400 font-light">
          {ordinal(state.stampCount)} stamp from this roastery
        </p>
        <Link href="/" className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors tracking-wide">
          ← Back to marketplace
        </Link>
      </Shell>
    )
  }

  // ── Success ───────────────────────────────────────────────────────────────
  return (
    <Shell>
      <StampBadge roasterName={state.roasterName} logoUrl={state.logoUrl} earned={true} />
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#C4622D] mb-2">Stamp earned</p>
        <h1 className="font-serif text-2xl text-[#2A1508] leading-snug mb-2">
          You earned a stamp from{" "}
          <span className="text-[#C4622D]">{state.roasterName}</span>!
        </h1>
        <p className="text-sm text-stone-400 font-light">
          {ordinal(state.stampCount)} stamp from this roastery
        </p>
      </div>
      <Link href="/" className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors tracking-wide">
        ← Back to marketplace
      </Link>
    </Shell>
  )
}

// ─── Page export (Suspense boundary for useSearchParams) ──────────────────────

export default function StampPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <StampContent />
    </Suspense>
  )
}
