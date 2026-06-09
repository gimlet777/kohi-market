"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { PRODUCTS as MOCK_PRODUCTS, rowToProduct, type ProductRow, type Product } from "@/lib/products"
import { supabase } from "@/lib/supabase"
import { useCart } from "@/context/CartContext"
import { ProductCard, type LiveBatch } from "@/components/ProductCard"
import { TasteQuiz, type QuizResults, type FormatPreference } from "@/components/TasteQuiz"
import { UserNav } from "@/components/UserNav"
import { Logo } from "@/components/Logo"
import { slugify } from "@/lib/slugify"

// ─── Data layer ───────────────────────────────────────────────────────────────

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true })
  if (error || !data || data.length === 0) return []
  return (data as ProductRow[]).map(rowToProduct)
}

async function fetchOpenBatches(): Promise<LiveBatch[]> {
  const today = new Date().toISOString().split("T")[0]
  await supabase
    .from("batches")
    .update({ status: "complete" })
    .eq("status", "open")
    .eq("available_now", false)
    .lt("roast_date", today)
  const { data } = await supabase
    .from("batches")
    .select("id, product_id, roast_date, available_now, total_bags, bags_remaining")
    .eq("status", "open")
    .or(`available_now.eq.true,roast_date.gte.${today}`)
    .order("available_now", { ascending: false })
    .order("roast_date", { ascending: true, nullsFirst: false })
  return (data ?? []).map(r => ({
    id: r.id,
    productId: r.product_id,
    roastDate: r.roast_date,
    availableNow: r.available_now ?? false,
    totalBags: r.total_bags,
    bagsRemaining: r.bags_remaining,
  }))
}

async function fetchAccentColors(): Promise<Record<string, string>> {
  const { data } = await supabase.from("roasters").select("roaster_name, accent_color")
  const map: Record<string, string> = {}
  for (const r of data ?? []) {
    if (r.roaster_name && r.accent_color) map[r.roaster_name] = r.accent_color
  }
  return map
}

// ─── Constants ────────────────────────────────────────────────────────────────

type Lang = "EN" | "JP"

const REGIONS = ["All", "Tokyo", "Kyoto", "Osaka", "Fukuoka", "Hokkaido"]
const ROASTS = ["All", "Light", "Medium", "Dark"]
const TYPES = ["All", "Roastery", "Café Roaster"]

const FOUNDING_ROASTERS = [
  "Glitch Coffee & Roasters",
  "Fuglen Tokyo",
  "Takamura Wine & Coffee Roasters",
  "Leaves Coffee Roasters",
  "Heart's Light Coffee",
  "LiLo Coffee Roasters",
]

// ─── Translations ─────────────────────────────────────────────────────────────

const copy = {
  EN: {
    tagline: "Specialty Coffee Marketplace",
    heroSub: "Japan's finest specialty coffee, from independent roasters.",
    placeholder: "Search roasters or origins…",
    regionLabel: "Region",
    roastLabel: "Roast",
    typeLabel: "Type",
    noResults: "No coffees match your filters.",
    footerSub: "Specialty Coffee Marketplace",
  },
  JP: {
    tagline: "スペシャルティコーヒーマーケット",
    heroSub: "全国の独立ロースターから、日本最高のスペシャルティコーヒーを。",
    placeholder: "ロースターや産地を検索…",
    regionLabel: "地域",
    roastLabel: "焙煎",
    typeLabel: "種別",
    noResults: "条件に合うコーヒーがありません。",
    footerSub: "スペシャルティコーヒーマーケット",
  },
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-stone-100 animate-pulse rounded">
      <div className="h-0.5 bg-stone-100" />
      <div className="px-5 pt-4 pb-3 border-b border-stone-100">
        <div className="h-2.5 bg-stone-100 rounded w-1/3" />
      </div>
      <div className="p-5 space-y-4">
        <div className="h-5 bg-stone-100 rounded w-3/4" />
        <div className="flex gap-1.5">
          <div className="h-5 bg-stone-100 rounded w-24" />
          <div className="h-5 bg-stone-100 rounded w-16" />
        </div>
        <div className="h-4 bg-stone-100 rounded w-2/3" />
        <div className="flex gap-1.5">
          <div className="h-5 bg-stone-100 rounded w-20" />
          <div className="h-5 bg-stone-100 rounded w-20" />
        </div>
        <div className="flex justify-between items-center pt-1">
          <div className="h-6 bg-stone-100 rounded w-20" />
        </div>
      </div>
    </div>
  )
}

// ─── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-[2px] text-xs tracking-wide border transition-all whitespace-nowrap ${
        active
          ? "bg-[#2A1508] text-white border-[#2A1508]"
          : "bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700"
      }`}
    >
      {label}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const cart = useCart()
  const [lang, setLang] = useState<Lang>("EN")
  const [region, setRegion] = useState("All")
  const [roast, setRoast] = useState("All")
  const [sellerType, setSellerType] = useState("All")
  const [search, setSearch] = useState("")
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS)
  const [batchMap, setBatchMap] = useState<Record<number, LiveBatch>>({})
  const [accentMap, setAccentMap] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<"live" | "mock">("mock")
  const [quizOpen, setQuizOpen] = useState(false)
  const [quizResultIds, setQuizResultIds] = useState<number[] | null>(null)
  const [quizBroadened, setQuizBroadened] = useState(false)
  const [quizMatchReasons, setQuizMatchReasons] = useState<Record<number, string[]>>({})
  const [quizMatchSummary, setQuizMatchSummary] = useState("")
  const [quizFormatPref, setQuizFormatPref] = useState<FormatPreference | null>(null)

  // Restore quiz state after back-navigation
  useEffect(() => {
    const saved = sessionStorage.getItem("kohi_quiz_results")
    if (!saved) return
    try {
      const { ids, broadened, reasons, summary, formatPref } = JSON.parse(saved)
      setQuizResultIds(ids)
      setQuizBroadened(broadened)
      setQuizMatchReasons(reasons)
      setQuizMatchSummary(summary)
      setQuizFormatPref(formatPref ?? null)
    } catch {
      sessionStorage.removeItem("kohi_quiz_results")
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchProducts(), fetchOpenBatches(), fetchAccentColors()]).then(([prods, batches, colors]) => {
      if (prods.length > 0) {
        setProducts(prods)
        setSource("live")
      } else {
        setProducts(MOCK_PRODUCTS)
        setSource("mock")
      }
      const map: Record<number, LiveBatch> = {}
      for (const b of batches) {
        if (!(b.productId in map)) map[b.productId] = b
      }
      setBatchMap(map)
      setAccentMap(colors)
      setIsLoading(false)
    })
  }, [])

  const c = copy[lang]

  const q = search.trim().toLowerCase()
  const filtered = products.filter((p) => {
    if (quizResultIds !== null && !quizResultIds.includes(p.id)) return false
    if (region !== "All" && p.region !== region) return false
    if (roast !== "All" && p.roast !== roast) return false
    if (sellerType !== "All" && p.type !== sellerType) return false
    if (q && !p.roaster.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q) && !p.origin.toLowerCase().includes(q)) return false
    return true
  })

  const hasActiveFilters = region !== "All" || roast !== "All" || sellerType !== "All" || q !== ""

  function resetFilters() {
    setRegion("All")
    setRoast("All")
    setSellerType("All")
    setSearch("")
  }

  function handleQuizResults({ ids, broadened, reasons, summary, formatPreference }: QuizResults) {
    setQuizResultIds(ids)
    setQuizBroadened(broadened)
    setQuizMatchReasons(reasons)
    setQuizMatchSummary(summary)
    setQuizFormatPref(formatPreference)
    setQuizOpen(false)
    sessionStorage.setItem("kohi_quiz_results", JSON.stringify({
      ids, broadened, reasons, summary, formatPref: formatPreference,
    }))
  }

  function clearQuizResults() {
    setQuizResultIds(null)
    setQuizBroadened(false)
    setQuizMatchReasons({})
    setQuizMatchSummary("")
    setQuizFormatPref(null)
    sessionStorage.removeItem("kohi_quiz_results")
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F5F2]">

      {/* ── Quiz modal ──────────────────────────────────────────────────────── */}
      <TasteQuiz
        products={products}
        isOpen={quizOpen}
        onClose={() => setQuizOpen(false)}
        onResults={(r) => handleQuizResults(r)}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/">
          <Logo height={36} />
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setLang("EN")}
              className={`transition-colors ${lang === "EN" ? "text-[#2A1508] font-semibold" : "text-[#8C7B6E] font-normal hover:text-[#2A1508]"}`}
            >
              EN
            </button>
            <span className="text-[#8C7B6E] select-none">·</span>
            <button
              onClick={() => setLang("JP")}
              className={`transition-colors ${lang === "JP" ? "text-[#2A1508] font-semibold" : "text-[#8C7B6E] font-normal hover:text-[#2A1508]"}`}
            >
              JP
            </button>
          </div>

          <UserNav />

          <Link href="/cart" className="relative text-stone-500 hover:text-[#2A1508] transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.847-7.148a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {cart.totalCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#C4622D] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium leading-none">
                {cart.totalCount > 9 ? "9+" : cart.totalCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-[#F8F5F2] px-6 md:px-10 pt-14 pb-16 border-b border-stone-100">
        <div className="max-w-3xl">
          <div className="border-l-[3px] border-[#C4622D] pl-7">
            <p className="text-[10px] tracking-[0.35em] uppercase text-stone-400 mb-5 font-light">
              {c.tagline}
            </p>
            <div className="mb-6">
              <Logo height={80} />
            </div>
            <p className="font-editorial italic text-xl md:text-2xl text-stone-400 leading-snug mb-10">
              {c.heroSub}
            </p>

            <div className="relative max-w-lg">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={c.placeholder}
                className="w-full bg-white text-[#2A1508] placeholder-stone-300 text-sm pl-10 pr-4 py-3 rounded-[2px] border border-stone-200 focus:outline-none focus:border-[#C4622D] transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Quiz entry point ────────────────────────────────────────────────── */}
      <button
        onClick={() => setQuizOpen(true)}
        className="w-full bg-[#F2D9D4] hover:bg-[#EDD0C9] transition-colors duration-200 px-6 py-7 flex flex-col items-center justify-center gap-1.5 group"
      >
        <span className="font-serif text-xl text-[#5C2D2D] leading-tight">
          Not sure where to start?
        </span>
        <span className="text-[13px] text-[#5C2D2D]/70 font-light tracking-wide flex items-center gap-1.5">
          Answer 6 quick questions and we&apos;ll find your perfect match
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </button>

      {/* ── Founding roasters strip ─────────────────────────────────────────── */}
      <section className="bg-white border-b border-stone-100 py-5 px-6 md:px-10">
        <p className="text-[9px] tracking-[0.3em] uppercase text-stone-300 text-center mb-4 select-none">
          Founding Roasters
        </p>
        <div className="overflow-x-auto">
          <ul className="flex items-center gap-8 md:gap-12 w-fit mx-auto list-none">
            {FOUNDING_ROASTERS.map(name => (
              <li key={name}>
                <Link
                  href={`/roaster/${slugify(name)}`}
                  className="font-serif text-sm text-stone-400 tracking-wide whitespace-nowrap hover:text-[#2A1508] transition-colors duration-200 select-none"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <section className="bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 overflow-x-auto">
        <div className="flex items-center gap-6 min-w-max">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-400 tracking-widest uppercase font-light">{c.regionLabel}</span>
            {REGIONS.map((r) => <FilterPill key={r} label={r} active={region === r} onClick={() => setRegion(r)} />)}
          </div>
          <div className="w-px h-4 bg-stone-200 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-400 tracking-widest uppercase font-light">{c.roastLabel}</span>
            {ROASTS.map((r) => <FilterPill key={r} label={r} active={roast === r} onClick={() => setRoast(r)} />)}
          </div>
          <div className="w-px h-4 bg-stone-200 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-stone-400 tracking-widest uppercase font-light">{c.typeLabel}</span>
            {TYPES.map((t) => <FilterPill key={t} label={t} active={sellerType === t} onClick={() => setSellerType(t)} />)}
          </div>
        </div>
      </section>

      {/* ── Quiz results banner ─────────────────────────────────────────────── */}
      {quizResultIds !== null && (
        <div className="px-6 md:px-10 pt-5 pb-1 flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] tracking-widest uppercase text-[#C4622D]">Quiz matches</span>
            {quizMatchSummary && !quizBroadened && (
              <p className="text-xs text-stone-500 font-light">
                Matched on: {quizMatchSummary}
              </p>
            )}
            {quizBroadened && (
              <p className="text-xs text-stone-400 font-light italic">
                We relaxed the filters to show our closest picks.
              </p>
            )}
          </div>
          <button
            onClick={clearQuizResults}
            className="text-xs text-[#C4622D] hover:text-[#A84F22] transition-colors font-light shrink-0 mt-0.5 border border-[#C4622D]/30 hover:border-[#A84F22]/50 px-2.5 py-1 rounded-[2px]"
          >
            Show all coffees →
          </button>
        </div>
      )}

      {/* ── Results count ───────────────────────────────────────────────────── */}
      <div className="px-6 md:px-10 pt-5 pb-2 flex items-center justify-between">
        <p className="text-xs text-stone-400 font-light">
          {isLoading ? (
            "Loading…"
          ) : quizResultIds !== null ? null : (
            <>
              Showing <span className="font-normal text-[#2A1508]">{filtered.length}</span> of {products.length} coffees
              {source === "mock" && <span className="ml-2 text-[#C4622D]">(demo data)</span>}
            </>
          )}
        </p>
        {!isLoading && (hasActiveFilters || quizResultIds !== null) && (
          <button
            onClick={() => { resetFilters(); clearQuizResults() }}
            className="text-xs text-[#C4622D] hover:text-[#A84F22] transition-colors font-light"
          >
            Reset all
          </button>
        )}
      </div>

      {/* ── Product grid ────────────────────────────────────────────────────── */}
      <section className="flex-1 px-6 md:px-10 py-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-24 font-light">{c.noResults}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((product) => {
              const matchReasons = quizResultIds !== null ? (quizMatchReasons[product.id] ?? []) : []
              return (
                <div key={product.id} className="flex flex-col">
                  <ProductCard
                    product={product}
                    batch={batchMap[product.id] ?? null}
                    accentColor={accentMap[product.roaster]}
                  />
                  {quizResultIds !== null && (
                    <p className="mt-1 px-0.5 text-[10px] text-[#C4622D] font-light">
                      ✓ Matches your taste
                      {matchReasons.length > 0 && (
                        <span className="text-stone-400"> · {matchReasons.slice(0, 2).join(", ")}</span>
                      )}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#2A1508] px-6 md:px-10 py-10 text-center mt-auto">
        <Logo height={32} inverted />
        <p className="text-stone-500 text-xs mt-2 tracking-widest font-light">Mame Mart · {c.footerSub}</p>
      </footer>

    </div>
  )
}
