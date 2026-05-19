"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PRODUCTS as MOCK_PRODUCTS, rowToProduct, type ProductRow, type Product, type FormatOption, type RoastLevel } from "@/lib/products"
import { supabase } from "@/lib/supabase"
import { useCart } from "@/context/CartContext"

// ─── Data layer ───────────────────────────────────────────────────────────────

interface LiveBatch {
  id: string
  productId: number
  roastDate: string
  totalBags: number
  bagsRemaining: number
}

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true })
  if (error || !data || data.length === 0) return []
  return (data as ProductRow[]).map(rowToProduct)
}

async function fetchOpenBatches(): Promise<LiveBatch[]> {
  const { data } = await supabase
    .from("batches")
    .select("id, product_id, roast_date, total_bags, bags_remaining")
    .eq("status", "open")
    .order("roast_date", { ascending: true })
  return (data ?? []).map(r => ({
    id: r.id,
    productId: r.product_id,
    roastDate: r.roast_date,
    totalBags: r.total_bags,
    bagsRemaining: r.bags_remaining,
  }))
}

// ─── Constants ────────────────────────────────────────────────────────────────

type Lang = "EN" | "JP"

const REGIONS = ["All", "Tokyo", "Kyoto", "Osaka", "Fukuoka"]
const ROASTS = ["All", "Light", "Medium", "Dark"]
const TYPES = ["All", "Roastery", "Café Roaster"]

// ─── Translations ─────────────────────────────────────────────────────────────

const copy = {
  EN: {
    tagline: "Specialty Coffee Marketplace",
    headlineTop: "Japan's Finest",
    headlineBottom: "Specialty Coffee",
    sub: "Sourced directly from independent roasters across Japan.",
    placeholder: "Search roasters or origins…",
    regionLabel: "Region",
    roastLabel: "Roast",
    typeLabel: "Type",
    addToCart: "Add to cart",
    preorder: "Pre-order",
    origin: "Origin",
    process: "Process",
    noResults: "No coffees match your filters.",
    formatLabels: { "Whole Bean": "Whole Bean", "Drip Bag": "Drip Bag" } as Record<string, string>,
    footerSub: "Specialty Coffee Marketplace",
  },
  JP: {
    tagline: "スペシャルティコーヒーマーケット",
    headlineTop: "日本最高の",
    headlineBottom: "スペシャルティコーヒー",
    sub: "全国の独立ロースターから直接入手。",
    placeholder: "ロースターや産地を検索…",
    regionLabel: "地域",
    roastLabel: "焙煎",
    typeLabel: "種別",
    addToCart: "カートに追加",
    preorder: "先行予約",
    origin: "産地",
    process: "精製",
    noResults: "条件に合うコーヒーがありません。",
    formatLabels: { "Whole Bean": "ホールビーン", "Drip Bag": "ドリップバッグ" } as Record<string, string>,
    footerSub: "スペシャルティコーヒーマーケット",
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roastBadge: Record<RoastLevel, string> = {
  Light: "bg-amber-100 text-amber-700",
  Medium: "bg-orange-100 text-orange-700",
  Dark: "bg-stone-800 text-stone-100",
}

function formatShortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 animate-pulse">
      <div className="h-0.5 bg-stone-100" />
      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <div className="h-3 bg-stone-100 rounded w-1/3" />
          <div className="h-3 bg-stone-100 rounded w-1/4" />
        </div>
        <div className="h-5 bg-stone-100 rounded w-3/4" />
        <div className="flex gap-1.5">
          <div className="h-5 bg-stone-100 rounded-full w-24" />
          <div className="h-5 bg-stone-100 rounded-full w-20" />
          <div className="h-5 bg-stone-100 rounded-full w-14" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 bg-stone-100 rounded-full w-16" />
          <div className="h-5 bg-stone-100 rounded-full w-20" />
          <div className="h-5 bg-stone-100 rounded-full w-14" />
        </div>
        <div className="flex justify-between items-center pt-1">
          <div className="h-6 bg-stone-100 rounded w-16" />
          <div className="h-8 bg-stone-100 rounded-full w-24" />
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
      className={`px-4 py-2 rounded-full text-xs tracking-wide border transition-all whitespace-nowrap ${
        active
          ? "bg-[#34150F] text-white border-[#34150F]"
          : "bg-white text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700"
      }`}
    >
      {label}
    </button>
  )
}

// ─── ProductCard ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  lang,
  batch,
  onAddToCart,
}: {
  product: Product
  lang: Lang
  batch: LiveBatch | null
  onAddToCart: (product: Product, format: FormatOption, batchId?: string) => void
}) {
  const router = useRouter()
  const c = copy[lang]
  const [selectedFormat, setSelectedFormat] = useState(product.formats[0])
  const [justAdded, setJustAdded] = useState(false)
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistDone, setWaitlistDone] = useState(false)
  const basePrice = product.formats[0].price

  const isCafe = product.type === "Café Roaster"
  const soldOut = isCafe && batch !== null && batch.bagsRemaining === 0
  const noBatch = isCafe && batch === null

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation()
    onAddToCart(product, selectedFormat)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1500)
  }

  function handlePreorder(e: React.MouseEvent) {
    e.stopPropagation()
    if (!batch) return
    onAddToCart(product, selectedFormat, batch.id)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1500)
  }

  function handleWaitlist(e: React.MouseEvent) {
    e.stopPropagation()
    setShowWaitlist(true)
  }

  function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    // TODO: persist waitlist email to a waitlist table
    setWaitlistDone(true)
  }

  return (
    <div
      onClick={() => router.push(`/product/${product.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 flex flex-col hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className={`h-0.5 ${product.type === "Roastery" ? "bg-[#C8965A]" : "bg-stone-400"}`} />

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-[#34150F]">{product.roaster}</p>
            <p className="text-xs text-stone-400 mt-0.5">{product.region}</p>
          </div>
          <span
            className={`text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full border shrink-0 ${
              product.type === "Roastery"
                ? "border-[#C8965A] text-[#C8965A]"
                : "border-stone-300 text-stone-400"
            }`}
          >
            {product.type}
          </span>
        </div>

        {/* Product name */}
        <h3 className="font-serif text-[1.1rem] leading-snug text-[#34150F]">{product.name}</h3>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
            {c.origin}: {product.origin}
          </span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
            {c.process}: {product.process}
          </span>
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${roastBadge[product.roast]}`}>
            {product.roast}
          </span>
        </div>

        {/* Flavour notes */}
        <div className="flex flex-wrap gap-1">
          {product.notes.map((note) => (
            <span key={note} className="text-[11px] px-2.5 py-0.5 border border-stone-200 rounded-full text-stone-400">
              {note}
            </span>
          ))}
        </div>

        {/* Batch info strip — Café Roasters only */}
        {isCafe && batch && (
          <div className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2 text-[11px]">
            <span className="text-stone-500">
              Roasts {formatShortDate(batch.roastDate)}
            </span>
            {batch.bagsRemaining > 0 ? (
              <span className={`font-medium ${batch.bagsRemaining <= 5 ? "text-red-500" : "text-emerald-600"}`}>
                {batch.bagsRemaining} bag{batch.bagsRemaining !== 1 ? "s" : ""} left
              </span>
            ) : (
              <span className="font-medium text-stone-400">Sold out</span>
            )}
          </div>
        )}
        {isCafe && !batch && (
          <div className="bg-stone-50 rounded-lg px-3 py-2 text-[11px] text-stone-400">
            No batches scheduled
          </div>
        )}

        <div className="flex-1" />

        {/* Format toggle */}
        {product.formats.length > 1 && (
          <div className="flex gap-1.5">
            {product.formats.map((fmt) => (
              <button
                key={fmt.name}
                onClick={(e) => { e.stopPropagation(); setSelectedFormat(fmt); setJustAdded(false) }}
                className={`flex-1 text-[11px] py-2 rounded-lg border transition-all ${
                  selectedFormat.name === fmt.name
                    ? "bg-[#34150F] text-white border-[#34150F]"
                    : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                }`}
              >
                {c.formatLabels[fmt.name] ?? fmt.name}
              </button>
            ))}
          </div>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-lg font-medium text-[#34150F] tracking-tight">
            {product.formats.length > 1 ? "From " : ""}¥{basePrice.toLocaleString()}
          </p>

          {/* Roastery: Add to cart */}
          {!isCafe && (
            <button
              onClick={handleAddToCart}
              className={`text-xs px-4 py-2.5 rounded-full tracking-wide transition-colors ${
                justAdded
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-[#C8965A] hover:bg-[#B8854C] text-white"
              }`}
            >
              {justAdded ? "Added ✓" : c.addToCart}
            </button>
          )}

          {/* Café Roaster: Pre-order */}
          {isCafe && !soldOut && !noBatch && (
            <button
              onClick={handlePreorder}
              className={`text-xs px-4 py-2.5 rounded-full tracking-wide transition-colors ${
                justAdded
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-[#34150F] hover:bg-[#4a1e12] text-[#F5ECD7]"
              }`}
            >
              {justAdded ? "Added ✓" : c.preorder}
            </button>
          )}

          {/* Café Roaster: Sold out */}
          {isCafe && soldOut && (
            <span className="text-xs px-4 py-2 rounded-full bg-stone-100 text-stone-400">
              Sold out
            </span>
          )}

          {/* Café Roaster: No batch */}
          {isCafe && noBatch && (
            <span className="text-xs px-4 py-2 rounded-full bg-stone-100 text-stone-400">
              Coming soon
            </span>
          )}
        </div>

        {/* Waitlist — sold out only */}
        {isCafe && soldOut && (
          <div onClick={e => e.stopPropagation()}>
            {waitlistDone ? (
              <p className="text-[11px] text-emerald-600 text-center">You're on the list ✓</p>
            ) : showWaitlist ? (
              <form onSubmit={handleWaitlistSubmit} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  className="flex-1 text-[11px] px-3 py-1.5 rounded-full border border-stone-200 focus:outline-none focus:border-[#C8965A] min-w-0"
                />
                <button
                  type="submit"
                  className="text-[11px] px-3 py-1.5 rounded-full bg-[#34150F] text-[#F5ECD7] whitespace-nowrap"
                >
                  Notify me
                </button>
              </form>
            ) : (
              <button
                onClick={handleWaitlist}
                className="w-full text-[11px] text-[#C8965A] hover:text-[#B8854C] transition-colors text-center"
              >
                Join waitlist →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
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
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<"live" | "mock">("mock")

  useEffect(() => {
    Promise.all([fetchProducts(), fetchOpenBatches()]).then(([prods, batches]) => {
      if (prods.length > 0) {
        setProducts(prods)
        setSource("live")
      } else {
        setProducts(MOCK_PRODUCTS)
        setSource("mock")
      }
      // First open batch per product (batches already sorted by roast_date asc)
      const map: Record<number, LiveBatch> = {}
      for (const b of batches) {
        if (!(b.productId in map)) map[b.productId] = b
      }
      setBatchMap(map)
      setIsLoading(false)
    })
  }, [])

  const c = copy[lang]

  const q = search.trim().toLowerCase()
  const filtered = products.filter((p) => {
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

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f2]">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#34150F] px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-2xl text-[#C8965A] tracking-wide">KOHĪ</span>
          <span className="text-xs text-stone-600 tracking-wider hidden sm:block">珈琲市</span>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center rounded-full border border-stone-700 overflow-hidden text-xs">
            {(["EN", "JP"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 transition-colors ${
                  lang === l ? "bg-[#C8965A] text-white" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <Link href="/cart" className="relative text-stone-400 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.847-7.148a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {cart.totalCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#C8965A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium leading-none">
                {cart.totalCount > 9 ? "9+" : cart.totalCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-[#34150F] px-6 md:px-10 pt-16 pb-20">
        <p className="text-xs tracking-[0.3em] uppercase text-stone-500 mb-6">{c.tagline}</p>
        <h1 className="font-serif text-5xl md:text-7xl text-[#F5ECD7] leading-[1.1] mb-4">
          {c.headlineTop}
          <br />
          <span className="text-[#C8965A]">{c.headlineBottom}</span>
        </h1>
        <p className="text-stone-400 text-sm mb-10 max-w-sm leading-relaxed">{c.sub}</p>

        <div className="relative max-w-xl">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={c.placeholder}
            className="w-full bg-white/10 text-white placeholder-stone-500 text-sm pl-11 pr-4 py-3.5 rounded-full border border-stone-700 focus:outline-none focus:border-[#C8965A] transition-colors"
          />
        </div>
      </section>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <section className="bg-[#f7f5f2] border-b border-stone-200 px-6 md:px-10 py-4 overflow-x-auto">
        <div className="flex items-center gap-8 min-w-max">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400 tracking-widest uppercase">{c.regionLabel}</span>
            {REGIONS.map((r) => <FilterPill key={r} label={r} active={region === r} onClick={() => setRegion(r)} />)}
          </div>
          <div className="w-px h-5 bg-stone-200 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400 tracking-widests uppercase">{c.roastLabel}</span>
            {ROASTS.map((r) => <FilterPill key={r} label={r} active={roast === r} onClick={() => setRoast(r)} />)}
          </div>
          <div className="w-px h-5 bg-stone-200 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400 tracking-widests uppercase">{c.typeLabel}</span>
            {TYPES.map((t) => <FilterPill key={t} label={t} active={sellerType === t} onClick={() => setSellerType(t)} />)}
          </div>
        </div>
      </section>

      {/* ── Results count ───────────────────────────────────────────────────── */}
      <div className="px-6 md:px-10 pt-6 pb-2 flex items-center justify-between">
        <p className="text-xs text-stone-400">
          {isLoading ? (
            "Loading…"
          ) : (
            <>
              Showing <span className="font-medium text-[#34150F]">{filtered.length}</span> of {products.length} coffees
              {source === "mock" && <span className="ml-2 text-[#C8965A]">(demo data)</span>}
            </>
          )}
        </p>
        {!isLoading && hasActiveFilters && (
          <button onClick={resetFilters} className="text-xs text-[#C8965A] hover:text-[#B8854C] transition-colors">
            Reset filters
          </button>
        )}
      </div>

      {/* ── Product grid ────────────────────────────────────────────────────── */}
      <section className="flex-1 px-6 md:px-10 py-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-24">{c.noResults}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                lang={lang}
                batch={batchMap[product.id] ?? null}
                onAddToCart={(p, fmt, batchId) => {
                  cart.addItem({
                    cartItemId: `${p.id}-${fmt.name}`,
                    productId: p.id,
                    productName: p.name,
                    roasterName: p.roaster,
                    format: fmt,
                    price: fmt.price,
                    batchId,
                  })
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#34150F] px-6 md:px-10 py-10 text-center">
        <span className="font-serif text-xl text-[#C8965A]">KOHĪ</span>
        <p className="text-stone-600 text-xs mt-2 tracking-widest">珈琲市 · {c.footerSub}</p>
      </footer>

    </div>
  )
}
