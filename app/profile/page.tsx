"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { UserNav } from "@/components/UserNav"
import { BREW_METHODS, type BrewMethodKey } from "@/lib/brewGuide"
import { REGIONS } from "@/lib/gamification-constants"
import { NavLogo } from "@/components/NavLogo"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  productName: string
  formatName: string
  grams: number
  unitPrice: number
  quantity: number
}

interface Order {
  id: string
  buyer_name: string
  items: OrderItem[]
  total_amount: number
  status: "pending" | "shipped" | "delivered"
  created_at: string
  buyer_user_id: string | null
}

interface ConsumerProfile {
  display_name: string | null
  preferred_brew_method: BrewMethodKey | null
  grinder_type: string | null
}

interface MameLogPreview {
  totalStamps: number
  totalRoasters: number
  topBadges: Array<{ name: string; accentColor: string | null; tier: "bronze" | "silver" | "gold" }>
}

interface Badge {
  badge_type: string
  badge_data: Record<string, string>
  earned_at: string
}

interface QuizSnapshot {
  summary: string
  ids: number[]
  broadened: boolean
  formatPref: { type: string; label: string } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function statusBadge(status: Order["status"]) {
  const map: Record<Order["status"], string> = {
    pending:   "bg-amber-50 text-amber-700 border-amber-100",
    shipped:   "bg-blue-50 text-blue-700 border-blue-100",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }
  return map[status]
}

const GRINDER_LABELS: Record<string, string> = {
  none:          "No grinder",
  hand:          "Hand grinder",
  "electric-burr": "Electric burr grinder",
}

// ─── Gamification sub-components ─────────────────────────────────────────────

function PointsCard({ points }: { points: number }) {
  return (
    <div className="bg-[#2A1508] rounded-[2px] px-5 py-4 flex items-center justify-between">
      <div>
        <p className="text-[10px] tracking-[0.25em] uppercase text-[#8B9EA5] mb-1">豆ポイント</p>
        <p className="text-2xl font-medium text-white tabular-nums">
          {points.toLocaleString()} <span className="text-sm font-light text-[#C8965A]">pt</span>
        </p>
        <p className="text-[10px] text-stone-500 font-light mt-1">1 pt per ¥10 spent · redemption coming soon</p>
      </div>
      <span className="text-3xl select-none">豆</span>
    </div>
  )
}

function RegionalBadges({ badges }: { badges: Badge[] }) {
  const earnedTypes = new Set(badges.map(b => b.badge_type))
  const hasTraveller = earnedTypes.has("coffee_traveller")
  const earnedCount = REGIONS.filter(r => earnedTypes.has(`region_${r.toLowerCase()}`)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Regional Badges</p>
        <p className="text-[10px] text-stone-400 font-light">{earnedCount} of {REGIONS.length} regions visited</p>
      </div>
      <div className="grid grid-cols-5 gap-2 mb-3">
        {REGIONS.map(region => {
          const earned = earnedTypes.has(`region_${region.toLowerCase()}`)
          return (
            <div
              key={region}
              className={`rounded-[2px] border py-3 px-1 text-center transition-all ${
                earned
                  ? "bg-[#C4622D]/8 border-[#C4622D]/30"
                  : "bg-stone-50 border-stone-100"
              }`}
            >
              <p className={`text-[10px] font-medium leading-tight ${earned ? "text-[#C4622D]" : "text-stone-300"}`}>
                {region}
              </p>
              <p className={`text-base mt-1 ${earned ? "opacity-100" : "opacity-20"}`}>
                {earned ? "✦" : "○"}
              </p>
            </div>
          )
        })}
      </div>
      {hasTraveller && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-[2px] px-4 py-2.5">
          <span className="text-base">🗾</span>
          <div>
            <p className="text-xs font-medium text-amber-800">Coffee Traveller</p>
            <p className="text-[10px] text-amber-600 font-light">All 5 regions collected</p>
          </div>
        </div>
      )}
    </div>
  )
}

function OriginPassport({ badges }: { badges: Badge[] }) {
  const originBadges = badges
    .filter(b => b.badge_type.startsWith("origin_"))
    .sort((a, b) => a.earned_at.localeCompare(b.earned_at))

  if (originBadges.length === 0) {
    return (
      <div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-3">Origin Passport</p>
        <div className="bg-stone-50 border border-stone-100 rounded-[2px] px-4 py-4 text-center">
          <p className="text-xs text-stone-400 font-light">No stamps yet — your first purchase adds a passport stamp</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Origin Passport</p>
        <p className="text-[10px] text-stone-400 font-light">{originBadges.length} origin{originBadges.length !== 1 ? "s" : ""} visited</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {originBadges.map(b => (
          <div
            key={b.badge_type}
            className="flex items-center gap-1.5 bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] px-3 py-1.5"
          >
            <span className="text-[10px] text-stone-400">✦</span>
            <span className="text-xs text-[#2A1508] font-medium">{b.badge_data.origin}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ConsumerProfile | null>(null)
  const [quiz, setQuiz] = useState<QuizSnapshot | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [mameLog, setMameLog] = useState<MameLogPreview | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/account")
        return
      }

      // Redirect roasters to their dashboard
      const { data: roasterRow } = await supabase
        .from("roasters")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle()
      if (roasterRow) {
        router.replace("/roaster/dashboard")
        return
      }

      setUserEmail(session.user.email ?? null)

      const accessToken = session.access_token

      const [
        ordersResult,
        { data: profileData },
        { data: badgesData },
        { data: pointsData },
        { data: stampsRaw },
      ] = await Promise.all([
        fetch("/api/orders", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then(r => r.json() as Promise<{ orders?: Order[]; error?: string }>),
        supabase
          .from("consumer_profiles")
          .select("display_name, preferred_brew_method, grinder_type")
          .eq("id", session.user.id)
          .maybeSingle(),
        supabase
          .from("badges")
          .select("badge_type, badge_data, earned_at")
          .eq("user_id", session.user.id)
          .order("earned_at", { ascending: true }),
        supabase
          .from("user_points")
          .select("total_points")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        supabase
          .from("stamps")
          .select("roaster_id")
          .eq("user_id", session.user.id),
      ])

      if (ordersResult.error) {
        setOrdersError("Could not load orders.")
      } else {
        setOrders(ordersResult.orders ?? [])
      }

      if (profileData) setProfile(profileData as ConsumerProfile)
      if (badgesData) setBadges(badgesData as Badge[])
      if (pointsData) setTotalPoints(pointsData.total_points ?? 0)

      // Mame Log preview
      const countMap: Record<string, number> = {}
      for (const s of stampsRaw ?? []) {
        countMap[s.roaster_id] = (countMap[s.roaster_id] ?? 0) + 1
      }
      const roasterIds = Object.keys(countMap)
      if (roasterIds.length > 0) {
        const { data: roastersRaw } = await supabase
          .from("roasters")
          .select("id, roaster_name, accent_color")
          .in("id", roasterIds)
        const tierOf = (n: number): "bronze" | "silver" | "gold" =>
          n >= 10 ? "gold" : n >= 3 ? "silver" : "bronze"
        const tierOrder = { gold: 0, silver: 1, bronze: 2 }
        const topBadges = (roastersRaw ?? [])
          .map(r => ({
            name: r.roaster_name as string,
            accentColor: (r.accent_color as string | null) ?? null,
            tier: tierOf(countMap[r.id as string] ?? 0),
          }))
          .sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier])
          .slice(0, 3)
        setMameLog({
          totalStamps: Object.values(countMap).reduce((s, c) => s + c, 0),
          totalRoasters: roasterIds.length,
          topBadges,
        })
      }

      try {
        const saved = sessionStorage.getItem("kohi_quiz_results")
        if (saved) {
          const parsed = JSON.parse(saved)
          setQuiz({
            summary: parsed.summary ?? "",
            ids: parsed.ids ?? [],
            broadened: parsed.broadened ?? false,
            formatPref: parsed.formatPref ?? null,
          })
        }
      } catch {
        // sessionStorage unavailable or corrupt — ignore
      }

      setIsLoading(false)
    }
    load()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F5F2] flex flex-col">
        <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <NavLogo />
          </Link>
          <UserNav />
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const preferredMethodDef = BREW_METHODS.find(m => m.key === profile?.preferred_brew_method)
  const hasAnyAchievements = badges.length > 0 || totalPoints > 0

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5F2]">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <NavLogo />
        </Link>
        <UserNav />
      </nav>

      <div className="flex-1 px-6 md:px-10 py-10 max-w-3xl mx-auto w-full space-y-10">

        {/* Header */}
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-1">My Account</p>
          <h1 className="font-serif text-3xl text-[#2A1508]">
            {profile?.display_name ?? "Profile"}
          </h1>
          {userEmail && (
            <p className="text-xs text-stone-400 font-light mt-1">{userEmail}</p>
          )}
        </div>

        {/* ── Mame Log teaser ─────────────────────────────────────────────────── */}
        {mameLog && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400">
                <span className="font-serif">豆</span> Log
              </h2>
              <Link href="/mame-log" className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors font-light">
                View full log →
              </Link>
            </div>
            <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] px-5 py-4">
              <p className="text-xs text-stone-400 font-light mb-4">
                {mameLog.totalStamps} stamp{mameLog.totalStamps !== 1 ? "s" : ""} · {mameLog.totalRoasters} roaster{mameLog.totalRoasters !== 1 ? "s" : ""} visited
              </p>
              <div className="flex items-center gap-4">
                {mameLog.topBadges.map((badge, i) => {
                  const ringColor = badge.tier === "gold" ? "#F59E0B" : badge.tier === "silver" ? "#94A3B8" : "#CD7F32"
                  const accent = badge.accentColor ?? "#C4622D"
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ border: `2px solid ${ringColor}` }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: `${accent}18` }}
                        >
                          <span className="font-serif text-base" style={{ color: accent }}>
                            {badge.name[0]?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className="text-[8px] tracking-wide uppercase text-stone-400 text-center w-12 leading-tight line-clamp-1">
                        {badge.name}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Achievements ────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-4">Achievements</h2>

          {hasAnyAchievements ? (
            <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-5 space-y-6">
              <PointsCard points={totalPoints} />
              <RegionalBadges badges={badges} />
              <OriginPassport badges={badges} />
            </div>
          ) : (
            <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-8 text-center">
              <p className="text-sm text-stone-400 mb-1">No achievements yet</p>
              <p className="text-xs text-stone-300 mb-4 leading-relaxed">
                Make your first purchase to earn 豆ポイント, regional badges, and origin passport stamps.
              </p>
              <Link
                href="/"
                className="inline-block text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors"
              >
                Browse the marketplace →
              </Link>
            </div>
          )}
        </section>

        {/* ── Order History ────────────────────────────────────────────────── */}
        <section id="orders">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Order History</h2>
            {orders.length > 0 && (
              <span className="text-xs text-stone-400 font-light">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {ordersError ? (
            <div className="bg-amber-50 border border-amber-100 rounded-[2px] px-4 py-3">
              <p className="text-xs text-amber-700 leading-relaxed">{ordersError}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-8 text-center">
              <p className="text-sm text-stone-400 mb-1">No orders yet</p>
              <p className="text-xs text-stone-300">
                Your order history will appear here after your first purchase.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors"
              >
                Browse the marketplace →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] px-5 py-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-xs text-stone-400 font-light">{formatDate(order.created_at)}</p>
                      {order.buyer_name && (
                        <p className="text-sm font-medium text-[#2A1508] mt-0.5">{order.buyer_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] px-2.5 py-1 rounded-[2px] border font-medium capitalize ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                      <p className="text-sm font-medium text-[#2A1508]">
                        ¥{order.total_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 border-t border-stone-100 pt-3">
                    {(order.items ?? []).map((item, i) => (
                      <p key={i} className="text-xs text-stone-500 font-light leading-relaxed">
                        {item.productName}
                        {item.formatName && (
                          <span className="text-stone-400"> · {item.formatName}{item.grams > 0 ? ` ${item.grams}g` : ""}</span>
                        )}
                        <span className="text-stone-400"> × {item.quantity}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Taste Quiz ──────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-4">Taste Preferences</h2>

          {quiz && quiz.summary ? (
            <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] px-5 py-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-[#C4622D] mb-1">Quiz results</p>
                  <p className="text-sm text-[#2A1508] font-medium">
                    {quiz.summary}
                  </p>
                  {quiz.formatPref && (
                    <p className="text-xs text-stone-400 font-light mt-0.5">
                      Format: {quiz.formatPref.label}
                    </p>
                  )}
                  {quiz.broadened ? (
                    <p className="text-xs text-stone-400 italic font-light mt-1">
                      Filters were relaxed to find your closest matches.
                    </p>
                  ) : (
                    <p className="text-xs text-stone-400 font-light mt-1">
                      {quiz.ids.length} coffee{quiz.ids.length !== 1 ? "s" : ""} matched your taste profile.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 pt-1 border-t border-stone-100">
                <Link
                  href="/"
                  className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors font-light"
                >
                  Browse matches →
                </Link>
                <button
                  onClick={() => {
                    sessionStorage.removeItem("kohi_quiz_results")
                    setQuiz(null)
                  }}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-light"
                >
                  Clear results
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-8 text-center">
              <p className="text-sm text-stone-400 mb-1">You haven&apos;t taken the taste quiz yet</p>
              <p className="text-xs text-stone-300 mb-4">
                Answer 6 quick questions and we&apos;ll find your perfect coffee match.
              </p>
              <Link
                href="/"
                className="inline-block text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors"
              >
                Find my coffee →
              </Link>
            </div>
          )}
        </section>

        {/* ── Equipment ───────────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Saved Equipment</h2>
            <Link
              href="/account"
              className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors font-light"
            >
              Edit →
            </Link>
          </div>

          <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] px-5 py-4">
            {profile?.preferred_brew_method || profile?.grinder_type ? (
              <dl className="space-y-3">
                {preferredMethodDef && (
                  <div className="flex items-baseline gap-4">
                    <dt className="text-xs text-stone-400 w-28 shrink-0">Brew method</dt>
                    <dd className="text-sm text-[#2A1508]">
                      {preferredMethodDef.label}
                      <span className="text-stone-400 text-xs font-light ml-1.5">{preferredMethodDef.devices}</span>
                    </dd>
                  </div>
                )}
                {profile?.grinder_type && (
                  <div className="flex items-baseline gap-4">
                    <dt className="text-xs text-stone-400 w-28 shrink-0">Grinder</dt>
                    <dd className="text-sm text-[#2A1508]">
                      {GRINDER_LABELS[profile.grinder_type] ?? profile.grinder_type}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-stone-400 text-center py-2">
                No equipment saved yet.{" "}
                <Link href="/account" className="text-[#C4622D] hover:text-[#B0561A]">
                  Add your setup →
                </Link>
              </p>
            )}
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-[#2A1508] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="text-xl font-medium text-[#C4622D] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">Mame Mart · Specialty Coffee Marketplace</p>
      </footer>
    </div>
  )
}
