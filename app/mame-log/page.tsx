"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { NavLogo } from "@/components/NavLogo"
import { UserNav } from "@/components/UserNav"

// ─── Constants ────────────────────────────────────────────────────────────────

const COFFEE_ORIGINS = [
  "Ethiopia", "Kenya", "Colombia", "Guatemala", "Panama",
  "Brazil", "Costa Rica", "Peru", "Honduras", "Nicaragua",
  "Yemen", "Rwanda", "Burundi", "Tanzania", "Indonesia",
  "India", "Bolivia", "El Salvador",
]

const FLAG: Record<string, string> = {
  "Ethiopia": "🇪🇹", "Kenya": "🇰🇪", "Colombia": "🇨🇴",
  "Guatemala": "🇬🇹", "Panama": "🇵🇦", "Brazil": "🇧🇷",
  "Costa Rica": "🇨🇷", "Peru": "🇵🇪", "Honduras": "🇭🇳",
  "Nicaragua": "🇳🇮", "Yemen": "🇾🇪", "Rwanda": "🇷🇼",
  "Burundi": "🇧🇮", "Tanzania": "🇹🇿", "Indonesia": "🇮🇩",
  "India": "🇮🇳", "Bolivia": "🇧🇴", "El Salvador": "🇸🇻",
}

type Tier = "bronze" | "silver" | "gold"

const TIER_COLOR: Record<Tier, string> = {
  bronze: "#CD7F32",
  silver: "#94A3B8",
  gold: "#F59E0B",
}

const TIER_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoasterStamp {
  roasterId: string
  roasterName: string
  logoUrl: string | null
  accentColor: string | null
  stampCount: number
  tier: Tier
}

interface AchievementDef {
  id: string
  title: string
  subtitle: string
  milestones: number[]
  current: number
  unit: string
  icon: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stampTier(count: number): Tier {
  if (count >= 10) return "gold"
  if (count >= 3) return "silver"
  return "bronze"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoasterBadge({ roasterName, logoUrl, accentColor, stampCount, tier }: RoasterStamp) {
  const ringColor = TIER_COLOR[tier]
  const accent = accentColor ?? "#C4622D"

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ border: `3px solid ${ringColor}` }}
        >
          <div
            className="w-[52px] h-[52px] rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: `${accent}18` }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-serif text-xl" style={{ color: accent }}>
                {roasterName[0]?.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white ring-2 ring-[#F8F5F2]"
          style={{ background: ringColor }}
        >
          {stampCount > 99 ? "99+" : stampCount}
        </div>
      </div>
      <p className="text-[9px] tracking-wide uppercase text-[#2A1508] text-center leading-tight w-16 line-clamp-2">
        {roasterName}
      </p>
    </div>
  )
}

function OriginBadge({ origin, collected }: { origin: string; collected: boolean }) {
  const flag = FLAG[origin]

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
          collected ? "border-[#2A1508] bg-[#2A1508]/5" : "border-stone-200 bg-transparent"
        }`}
      >
        <span className={`text-2xl leading-none select-none ${!collected ? "opacity-20" : ""}`}>
          {flag ?? origin.slice(0, 2)}
        </span>
      </div>
      <p className={`text-[9px] text-center leading-tight w-14 ${collected ? "text-[#2A1508]" : "text-stone-300"}`}>
        {origin}
      </p>
    </div>
  )
}

function AchievementCard({ achievement }: { achievement: AchievementDef }) {
  const { title, subtitle, milestones, current, unit, icon } = achievement
  const maxMilestone = milestones[milestones.length - 1]
  const nextMilestone = milestones.find(m => current < m)
  const prevMilestone = [...milestones].reverse().find(m => m <= current) ?? 0
  const completed = current >= maxMilestone
  const pct = nextMilestone === undefined
    ? 100
    : Math.round(((current - prevMilestone) / (nextMilestone - prevMilestone)) * 100)

  return (
    <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-[#C4622D]/10 flex items-center justify-center shrink-0">
          <span className="text-base">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-[#2A1508]">{title}</p>
            {completed && (
              <span className="text-[10px] tracking-widest uppercase text-emerald-600 font-medium shrink-0">
                Complete
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400 font-light">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {milestones.map(m => (
          <div
            key={m}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium border-2 shrink-0 ${
              current >= m
                ? "bg-[#C4622D] border-[#C4622D] text-white"
                : "bg-white border-stone-200 text-stone-300"
            }`}
          >
            {m}
          </div>
        ))}
        <div className="flex-1 ml-1">
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C4622D] rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-[10px] text-stone-400 font-light">
        {completed
          ? `All ${maxMilestone} ${unit}s visited`
          : `${current} of ${nextMilestone} ${unit}${nextMilestone !== 1 ? "s" : ""} visited`}
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MameLogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [roasterStamps, setRoasterStamps] = useState<RoasterStamp[]>([])
  const [collectedOrigins, setCollectedOrigins] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace(`/login?returnTo=${encodeURIComponent("/mame-log")}`)
        return
      }
      const userId = session.user.id

      const [{ data: stampsData }, { data: originBadgesData }] = await Promise.all([
        supabase.from("stamps").select("roaster_id").eq("user_id", userId),
        supabase
          .from("badges")
          .select("badge_data")
          .eq("user_id", userId)
          .like("badge_type", "origin_%"),
      ])

      const countMap: Record<string, number> = {}
      for (const s of stampsData ?? []) {
        countMap[s.roaster_id] = (countMap[s.roaster_id] ?? 0) + 1
      }
      const roasterIds = Object.keys(countMap)

      if (roasterIds.length > 0) {
        const { data: roastersData } = await supabase
          .from("roasters")
          .select("id, roaster_name, logo_url, accent_color")
          .in("id", roasterIds)

        const stamps: RoasterStamp[] = (roastersData ?? []).map(r => ({
          roasterId: r.id as string,
          roasterName: r.roaster_name as string,
          logoUrl: (r.logo_url as string | null) ?? null,
          accentColor: (r.accent_color as string | null) ?? null,
          stampCount: countMap[r.id as string] ?? 0,
          tier: stampTier(countMap[r.id as string] ?? 0),
        }))

        const tierOrder: Record<Tier, number> = { gold: 0, silver: 1, bronze: 2 }
        stamps.sort((a, b) =>
          tierOrder[a.tier] !== tierOrder[b.tier]
            ? tierOrder[a.tier] - tierOrder[b.tier]
            : b.stampCount - a.stampCount
        )
        setRoasterStamps(stamps)
      }

      const origins = new Set<string>()
      for (const b of originBadgesData ?? []) {
        if ((b.badge_data as Record<string, string>)?.origin) {
          origins.add((b.badge_data as Record<string, string>).origin)
        }
      }
      setCollectedOrigins(origins)
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F2] flex flex-col">
        <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-[rgba(42,21,8,0.07)] px-6 md:px-10 py-3.5 flex items-center justify-between">
          <Link href="/"><NavLogo /></Link>
          <UserNav />
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const totalStamps = roasterStamps.reduce((s, r) => s + r.stampCount, 0)
  const totalRoasters = roasterStamps.length

  const achievements: AchievementDef[] = [
    {
      id: "cafe_explorer",
      title: "Café Explorer",
      subtitle: "Visit different roasters in person",
      milestones: [3, 5, 10],
      current: totalRoasters,
      unit: "roaster",
      icon: "☕",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5F2]">
      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-[rgba(42,21,8,0.07)] px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/"><NavLogo /></Link>
        <UserNav />
      </nav>

      <div className="flex-1 px-6 md:px-10 py-10 max-w-3xl mx-auto w-full space-y-12">

        {/* Header */}
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-1">My Collection</p>
          <h1 className="font-serif text-3xl text-[#2A1508]">
            <span className="font-serif">豆</span> Log
          </h1>
        </div>

        {/* ── Roaster Stamps ───────────────────────────────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Roaster Stamps</h2>
            {totalRoasters > 0 && (
              <p className="text-[10px] text-stone-400 font-light">
                {totalStamps} stamp{totalStamps !== 1 ? "s" : ""} · {totalRoasters} roaster{totalRoasters !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {roasterStamps.length === 0 ? (
            <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-8 text-center">
              <p className="text-sm text-stone-400 mb-1">No stamps yet</p>
              <p className="text-xs text-stone-300 mb-4 leading-relaxed">
                Scan a roaster&apos;s QR code in person to collect your first stamp.
              </p>
              <Link href="/" className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors">
                Browse roasters →
              </Link>
            </div>
          ) : (
            <>
              {/* Tier legend — only show tiers that are present */}
              <div className="flex items-center gap-5 mb-5">
                {(["gold", "silver", "bronze"] as Tier[])
                  .filter(t => roasterStamps.some(r => r.tier === t))
                  .map(tier => (
                    <div key={tier} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: TIER_COLOR[tier] }} />
                      <span className="text-[10px] text-stone-400">{TIER_LABEL[tier]}</span>
                    </div>
                  ))}
              </div>
              <div className="flex flex-wrap gap-6">
                {roasterStamps.map(rs => (
                  <RoasterBadge key={rs.roasterId} {...rs} />
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── Origin Passport ──────────────────────────────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Origin Passport</h2>
            <p className="text-[10px] text-stone-400 font-light">
              {collectedOrigins.size} of {COFFEE_ORIGINS.length} origins
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {COFFEE_ORIGINS.map(origin => (
              <OriginBadge key={origin} origin={origin} collected={collectedOrigins.has(origin)} />
            ))}
          </div>
        </section>

        {/* ── Achievements ─────────────────────────────────────── */}
        <section>
          <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-5">Achievements</h2>
          <div className="space-y-3">
            {achievements.map(a => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </section>

      </div>

      <footer className="bg-[#2A1508] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="text-xl font-medium text-[#C4622D] leading-none tracking-tight">
          <span className="font-serif">豆</span>MART
        </span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">Mame Mart · Loyalty Stamps</p>
      </footer>
    </div>
  )
}
