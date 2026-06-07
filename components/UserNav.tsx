"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserState {
  type: "consumer" | "roaster"
  initial: string
  displayName: string
  slug?: string
  totalPoints?: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserState | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true

    async function detect() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session?.user) { setReady(true); return }

      const { data: roasterRow } = await supabase
        .from("roasters")
        .select("roaster_name, slug")
        .eq("id", session.user.id)
        .maybeSingle()

      if (!mounted) return
      if (roasterRow) {
        setUser({
          type: "roaster",
          initial: roasterRow.roaster_name?.[0]?.toUpperCase() ?? "R",
          displayName: roasterRow.roaster_name ?? "Roaster",
          slug: roasterRow.slug ?? undefined,
        })
      } else {
        // Read display_name from consumer_profiles if available
        const [{ data: profileRow }, { data: pointsRow }] = await Promise.all([
          supabase
            .from("consumer_profiles")
            .select("display_name")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase
            .from("user_points")
            .select("total_points")
            .eq("user_id", session.user.id)
            .maybeSingle(),
        ])
        if (!mounted) return
        const name = profileRow?.display_name?.trim() || session.user.email || ""
        setUser({
          type: "consumer",
          initial: name[0]?.toUpperCase() ?? "U",
          displayName: name,
          totalPoints: pointsRow?.total_points ?? 0,
        })
      }
      setReady(true)
    }

    detect()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        if (mounted) { setUser(null); setOpen(false) }
      } else if (event === "SIGNED_IN") {
        detect()
      }
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onOutside)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    const wasRoaster = user?.type === "roaster"
    await supabase.auth.signOut()
    setUser(null)
    router.push(wasRoaster ? "/roaster/login" : "/")
  }

  // Render a fixed-width placeholder while auth is resolving to avoid nav shift
  if (!ready) return <div className="w-14 h-5" />

  if (!user) {
    const loginHref = pathname && pathname !== "/login" && pathname !== "/signup"
      ? `/login?returnTo=${encodeURIComponent(pathname)}`
      : "/login"
    return (
      <Link
        href={loginHref}
        className="text-xs text-stone-400 hover:text-[#2A1A0E] transition-colors tracking-wide"
      >
        Sign in
      </Link>
    )
  }

  const isRoaster = user.type === "roaster"

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <div className="flex items-center gap-2">
        {!isRoaster && (user.totalPoints ?? 0) > 0 && (
          <span className="text-[10px] text-[#C4714A] font-medium tracking-wide select-none">
            <span className="font-serif">豆</span>{user.totalPoints?.toLocaleString()}pt
          </span>
        )}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label={`Account menu for ${user.displayName}`}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors select-none ${
            isRoaster
              ? "bg-[#C4714A]/10 text-[#C4714A] hover:bg-[#C4714A]/20"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          {user.initial}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-stone-200 rounded-[2px] py-1 z-50">
          {/* Identity line */}
          <div className="px-4 py-2.5 border-b border-stone-100">
            <p className="text-[10px] tracking-widest uppercase text-stone-400">
              {isRoaster ? "Roaster account" : "My account"}
            </p>
            <p className="text-xs text-[#2A1A0E] font-medium truncate mt-0.5">
              {isRoaster ? user.displayName : user.displayName}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {isRoaster ? (
              <>
                <MenuItem href="/roaster/dashboard" onClose={() => setOpen(false)}>
                  Dashboard
                </MenuItem>
                {user.slug && (
                  <MenuItem href={`/roaster/${user.slug}`} onClose={() => setOpen(false)}>
                    Public profile
                  </MenuItem>
                )}
                <MenuItem href="/roaster/dashboard?tab=settings" onClose={() => setOpen(false)}>
                  Settings
                </MenuItem>
              </>
            ) : (
              <>
                <MenuItem href="/profile" onClose={() => setOpen(false)}>
                  My profile
                </MenuItem>
                <MenuItem href="/profile#orders" onClose={() => setOpen(false)}>
                  My orders
                </MenuItem>
                <MenuItem href="/account" onClose={() => setOpen(false)}>
                  Saved equipment
                </MenuItem>
              </>
            )}
          </div>

          {/* Sign out */}
          <div className="border-t border-stone-100">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2.5 text-xs text-stone-400 hover:bg-stone-50 hover:text-[#2A1A0E] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({ href, children, onClose }: { href: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="block px-4 py-2.5 text-xs text-stone-600 hover:bg-stone-50 hover:text-[#2A1A0E] transition-colors"
    >
      {children}
    </Link>
  )
}
