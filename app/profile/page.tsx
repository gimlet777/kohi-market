"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { UserNav } from "@/components/UserNav"
import { BREW_METHODS, type BrewMethodKey } from "@/lib/brewGuide"

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
}

interface ConsumerProfile {
  preferred_brew_method: BrewMethodKey | null
  grinder_type: string | null
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ConsumerProfile | null>(null)
  const [quiz, setQuiz] = useState<QuizSnapshot | null>(null)

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

      // Load in parallel: orders + equipment profile
      const [{ data: ordersData, error: ordersErr }, { data: profileData }] = await Promise.all([
        supabase
          .from("orders")
          .select("id, buyer_name, items, total_amount, status, created_at")
          .eq("buyer_email", session.user.email!)
          .order("created_at", { ascending: false }),
        supabase
          .from("consumer_profiles")
          .select("preferred_brew_method, grinder_type")
          .eq("id", session.user.id)
          .maybeSingle(),
      ])

      if (ordersErr) {
        setOrdersError("Could not load orders. Make sure the orders RLS policy is in place.")
      } else {
        setOrders((ordersData ?? []) as Order[])
      }

      if (profileData) setProfile(profileData as ConsumerProfile)

      // Read quiz snapshot from sessionStorage (client-only)
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
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
        <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-serif text-xl text-[#2A1A0E] leading-none">珈琲市</span>
            <span className="text-[11px] text-stone-300 tracking-[0.18em] font-light leading-none mt-0.5">KOHĪ</span>
          </Link>
          <UserNav />
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#C4714A] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const preferredMethodDef = BREW_METHODS.find(m => m.key === profile?.preferred_brew_method)

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-serif text-xl text-[#2A1A0E] leading-none">珈琲市</span>
          <span className="text-[11px] text-stone-300 tracking-[0.18em] font-light leading-none mt-0.5">KOHĪ</span>
        </Link>
        <UserNav />
      </nav>

      <div className="flex-1 px-6 md:px-10 py-10 max-w-3xl mx-auto w-full space-y-10">

        {/* Header */}
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-1">My Account</p>
          <h1 className="font-serif text-3xl text-[#2A1A0E]">Profile</h1>
          {userEmail && (
            <p className="text-xs text-stone-400 font-light mt-1">{userEmail}</p>
          )}
        </div>

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
            <div className="bg-white border border-[#E8E2D8] rounded-[2px] p-8 text-center">
              <p className="text-sm text-stone-400 mb-1">No orders yet</p>
              <p className="text-xs text-stone-300">
                Your order history will appear here after your first purchase.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 text-xs text-[#C4714A] hover:text-[#B05E3C] transition-colors"
              >
                Browse the marketplace →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="bg-white border border-[#E8E2D8] rounded-[2px] px-5 py-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-xs text-stone-400 font-light">{formatDate(order.created_at)}</p>
                      {order.buyer_name && (
                        <p className="text-sm font-medium text-[#2A1A0E] mt-0.5">{order.buyer_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] px-2.5 py-1 rounded-[2px] border font-medium capitalize ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                      <p className="text-sm font-medium text-[#2A1A0E]">
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
            <div className="bg-white border border-[#E8E2D8] rounded-[2px] px-5 py-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-widest uppercase text-[#C4714A] mb-1">Quiz results</p>
                  <p className="text-sm text-[#2A1A0E] font-medium">
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
                  className="text-xs text-[#C4714A] hover:text-[#B05E3C] transition-colors font-light"
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
            <div className="bg-white border border-[#E8E2D8] rounded-[2px] p-8 text-center">
              <p className="text-sm text-stone-400 mb-1">You haven&apos;t taken the taste quiz yet</p>
              <p className="text-xs text-stone-300 mb-4">
                Answer 6 quick questions and we&apos;ll find your perfect coffee match.
              </p>
              <Link
                href="/"
                className="inline-block text-xs text-[#C4714A] hover:text-[#B05E3C] transition-colors"
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
              className="text-xs text-[#C4714A] hover:text-[#B05E3C] transition-colors font-light"
            >
              Edit →
            </Link>
          </div>

          <div className="bg-white border border-[#E8E2D8] rounded-[2px] px-5 py-4">
            {profile?.preferred_brew_method || profile?.grinder_type ? (
              <dl className="space-y-3">
                {preferredMethodDef && (
                  <div className="flex items-baseline gap-4">
                    <dt className="text-xs text-stone-400 w-28 shrink-0">Brew method</dt>
                    <dd className="text-sm text-[#2A1A0E]">
                      {preferredMethodDef.label}
                      <span className="text-stone-400 text-xs font-light ml-1.5">{preferredMethodDef.devices}</span>
                    </dd>
                  </div>
                )}
                {profile?.grinder_type && (
                  <div className="flex items-baseline gap-4">
                    <dt className="text-xs text-stone-400 w-28 shrink-0">Grinder</dt>
                    <dd className="text-sm text-[#2A1A0E]">
                      {GRINDER_LABELS[profile.grinder_type] ?? profile.grinder_type}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-stone-400 text-center py-2">
                No equipment saved yet.{" "}
                <Link href="/account" className="text-[#C4714A] hover:text-[#B05E3C]">
                  Add your setup →
                </Link>
              </p>
            )}
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-[#2A1A0E] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="font-serif text-xl text-[#C4714A]">珈琲市</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">KOHĪ · Specialty Coffee Marketplace</p>
      </footer>
    </div>
  )
}
