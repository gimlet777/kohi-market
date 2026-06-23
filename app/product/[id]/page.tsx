"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { rowToProduct, type ProductRow, type FormatOption, type Product } from "@/lib/products"
import { supabase } from "@/lib/supabase"
import { useCart } from "@/context/CartContext"
import { slugify } from "@/lib/slugify"
import { BrewGuide } from "@/components/BrewGuide"
import { UserNav } from "@/components/UserNav"
import type { BrewMethodKey } from "@/lib/brewGuide"
import { NavLogo } from "@/components/NavLogo"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveBatch {
  id: string
  roastDate: string | null
  availableNow: boolean
  totalBags: number
  bagsRemaining: number
  status: "open" | "closed" | "complete"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roastBadge: Record<string, string> = {
  Light: "bg-transparent text-[#6A5040] border border-[rgba(42,21,8,0.07)]",
  Medium: "bg-transparent text-[#6A5040] border border-[rgba(42,21,8,0.07)]",
  Dark: "bg-transparent text-[#6A5040] border border-[rgba(42,21,8,0.07)]",
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-3 border-b border-stone-100 last:border-0">
      <span className="text-xs tracking-widest uppercase text-stone-400">{label}</span>
      <span className="text-sm text-[#2A1508] font-medium">{value}</span>
    </div>
  )
}

function FormatCard({
  option,
  selected,
  onClick,
}: {
  option: FormatOption
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-[2px] border transition-all ${
        selected
          ? "border-[#C4622D] bg-[#C4622D]/5"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <p className={`text-sm font-medium ${selected ? "text-[#2A1508]" : "text-stone-600"}`}>
        {option.name}
      </p>
      <p className="text-xs text-stone-400 mt-0.5">{option.grams}g</p>
      <p className={`text-base font-semibold mt-2 ${selected ? "text-[#C4622D]" : "text-[#2A1508]"}`}>
        ¥{option.price.toLocaleString()}
      </p>
    </button>
  )
}

function BatchPanel({
  batch,
  onPreorder,
  preordered,
}: {
  batch: LiveBatch
  onPreorder: () => void
  preordered: boolean
}) {
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistDone, setWaitlistDone] = useState(false)

  const soldOut = batch.bagsRemaining === 0
  const fillPct = batch.totalBags > 0
    ? Math.round(((batch.totalBags - batch.bagsRemaining) / batch.totalBags) * 100)
    : 0

  function barColor() {
    if (fillPct >= 90) return "bg-red-400"
    if (fillPct >= 70) return "bg-amber-400"
    return "bg-emerald-500"
  }

  function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: persist waitlist email to a waitlist table
    setWaitlistDone(true)
  }

  return (
    <div className="rounded-[2px] border border-[rgba(42,21,8,0.07)] bg-[#F8F5F2] p-5 space-y-4">
      <p className="text-xs tracking-widest uppercase text-stone-400">Batch Info</p>

      <div className="space-y-3">
        {/* Roast date */}
        {batch.roastDate && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[2px] bg-white border border-[rgba(42,21,8,0.07)] flex items-center justify-center shrink-0">
              <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] text-stone-400 uppercase tracking-wider">Next roast date</p>
              <p className="text-sm font-medium text-[#2A1508]">{formatDate(batch.roastDate)}</p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-stone-400 uppercase tracking-wider">Batch fill</p>
            <p className="text-[11px] font-medium text-[#2A1508]">
              {batch.totalBags - batch.bagsRemaining} / {batch.totalBags} reserved
            </p>
          </div>
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor()}`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[11px] text-stone-400">
              {soldOut ? (
                <span className="text-red-500 font-medium">Sold out</span>
              ) : (
                <span className={batch.bagsRemaining <= 5 ? "text-red-500 font-medium" : "text-stone-400"}>
                  {batch.bagsRemaining} bag{batch.bagsRemaining !== 1 ? "s" : ""} remaining
                </span>
              )}
            </p>
            <p className="text-[11px] text-stone-400">{fillPct}% full</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      {soldOut ? (
        <div className="space-y-2">
          <button
            disabled
            className="w-full py-3 rounded-[2px] text-sm font-medium bg-stone-100 text-stone-400 cursor-not-allowed"
          >
            Sold out
          </button>
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
                className="flex-1 text-xs px-4 py-2 rounded-[2px] border border-stone-200 focus:outline-none focus:border-[#C4622D] min-w-0"
              />
              <button
                type="submit"
                className="text-xs px-4 py-2 rounded-[2px] bg-[#2A1508] text-white whitespace-nowrap"
              >
                Notify me
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowWaitlist(true)}
              className="w-full text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors text-center"
            >
              Join waitlist →
            </button>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={onPreorder}
            disabled={preordered}
            className={`w-full py-3 rounded-[2px] text-sm font-medium tracking-wide transition-all ${
              preordered
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                : "bg-[#2A1508] hover:bg-[#3c1e0a] text-[#F8F5F2]"
            }`}
          >
            {preordered ? "Pre-order placed ✓" : "Pre-order this batch"}
          </button>
          <p className="text-[11px] text-stone-400 text-center leading-relaxed">
            You'll be charged when your order ships after roasting.
          </p>
        </>
      )}
    </div>
  )
}

function WaitlistPanel() {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)
  return (
    <div className="rounded-[2px] border border-[rgba(42,21,8,0.07)] bg-[#F8F5F2] p-5 space-y-3">
      <p className="text-xs tracking-widest uppercase text-stone-400">Currently unavailable</p>
      <p className="text-sm text-stone-500 leading-relaxed">
        No batches are scheduled yet. Join the waitlist and we'll let you know when pre-orders open.
      </p>
      {done ? (
        <p className="text-sm text-emerald-600 font-light">You're on the list ✓</p>
      ) : (
        <form onSubmit={e => { e.preventDefault(); setDone(true) }} className="flex gap-2">
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="flex-1 text-xs px-4 py-2 rounded-[2px] border border-stone-200 focus:outline-none focus:border-[#C4622D] min-w-0"
          />
          <button
            type="submit"
            className="text-xs px-4 py-2 rounded-[2px] bg-[#2A1508] text-white whitespace-nowrap"
          >
            Notify me
          </button>
        </form>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const cart = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [batch, setBatch] = useState<LiveBatch | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>(null)
  const [cartAdded, setCartAdded] = useState(false)
  const [preordered, setPreordered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [consumerId, setConsumerId] = useState<string | null>(null)
  const [savedBrewMethod, setSavedBrewMethod] = useState<BrewMethodKey | null>(null)
  const [isSavingMethod, setIsSavingMethod] = useState(false)

  useEffect(() => {
    const productId = Number(params.id)
    async function load() {
      // Check consumer auth session in parallel with product/batch fetch
      const [
        [{ data: productData, error: productError }, { data: batchData }],
        { data: { session } },
      ] = await Promise.all([
        Promise.all([
          supabase.from("products").select("*").eq("id", productId).single(),
          supabase
            .from("batches")
            .select("id, roast_date, available_now, total_bags, bags_remaining, status")
            .eq("product_id", productId)
            .eq("status", "open")
            .or(`available_now.eq.true,roast_date.gte.${new Date().toISOString().split("T")[0]}`)
            .order("available_now", { ascending: false })
            .order("roast_date", { ascending: true, nullsFirst: false })
            .limit(1)
            .maybeSingle(),
        ]),
        supabase.auth.getSession(),
      ])

      if (!productError && productData) {
        const p = rowToProduct(productData as ProductRow)
        setProduct(p)
        setSelectedFormat(p.formats[0])
      }
      if (batchData) {
        setBatch({
          id: batchData.id,
          roastDate: batchData.roast_date,
          availableNow: batchData.available_now ?? false,
          totalBags: batchData.total_bags,
          bagsRemaining: batchData.bags_remaining,
          status: batchData.status,
        })
      }

      // Load consumer's saved brew method if logged in and not a roaster
      if (session?.user) {
        const isRoaster = !!(await supabase.from("roasters").select("id").eq("id", session.user.id).maybeSingle()).data
        if (!isRoaster) {
          setConsumerId(session.user.id)
          const { data: profile } = await supabase
            .from("consumer_profiles")
            .select("preferred_brew_method")
            .eq("id", session.user.id)
            .maybeSingle()
          if (profile?.preferred_brew_method) {
            setSavedBrewMethod(profile.preferred_brew_method as BrewMethodKey)
          }
        }
      }

      setIsLoading(false)
    }
    load()
  }, [params.id])

  useEffect(() => {
    setCartAdded(false)
    setPreordered(false)
  }, [selectedFormat])

  function handleAddToCart() {
    if (!selectedFormat || cartAdded) return
    cart.addItem({
      cartItemId: `${product!.id}-${selectedFormat.name}`,
      productId: product!.id,
      productName: product!.name,
      roasterId: product!.roasterId ?? null,
      roasterName: product!.roaster,
      format: selectedFormat,
      price: selectedFormat.price,
    })
    setCartAdded(true)
  }

  async function handleSaveBrewMethod(method: BrewMethodKey) {
    if (!consumerId) return
    setIsSavingMethod(true)
    await supabase
      .from("consumer_profiles")
      .upsert({ id: consumerId, preferred_brew_method: method, updated_at: new Date().toISOString() })
    setSavedBrewMethod(method)
    setIsSavingMethod(false)
  }

  function handlePreorder() {
    if (!selectedFormat || !batch || preordered) return
    cart.addItem({
      cartItemId: `${product!.id}-${selectedFormat.name}`,
      productId: product!.id,
      productName: product!.name,
      roasterId: product!.roasterId ?? null,
      roasterName: product!.roaster,
      format: selectedFormat,
      price: selectedFormat.price,
      batchId: batch.id,
    })
    setPreordered(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <nav className="sticky top-0 z-50 bg-white border-b border-[rgba(42,21,8,0.07)] px-6 md:px-10 py-3.5 flex items-center justify-between">
          <Link href="/" className="text-[#8C7B6E] hover:text-[#2A1508] text-xs tracking-wide transition-colors">
            ← Marketplace
          </Link>
          <Link href="/" className="flex items-center gap-3">
            <NavLogo />
          </Link>
          <Link href="/cart" className="relative text-[#8C7B6E] hover:text-[#2A1508] transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.847-7.148a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </Link>
        </nav>
        <div className="px-6 md:px-10 pt-12 pb-14 animate-pulse bg-[#F0EBE3]">
          <div className="h-3 bg-stone-200 rounded w-32 mb-6" />
          <div className="h-12 bg-stone-200 rounded w-2/3 mb-3" />
          <div className="h-3 bg-stone-200 rounded w-24" />
        </div>
        <div className="flex-1 px-6 md:px-10 py-10 max-w-5xl w-full mx-auto animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-3 bg-stone-100 rounded" />)}
              <div className="h-32 bg-stone-100 rounded mt-6" />
            </div>
            <div className="space-y-4">
              <div className="h-28 bg-stone-100 rounded" />
              <div className="h-12 bg-stone-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8C7B6E] text-sm mb-4">Product not found.</p>
          <button onClick={() => router.push("/")} className="text-[#C4622D] text-sm hover:underline">
            ← Back to marketplace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-[rgba(42,21,8,0.07)] px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link
          href="/"
          className="text-[#8C7B6E] hover:text-[#2A1508] transition-colors text-xs tracking-wide"
        >
          ← Marketplace
        </Link>

        <Link href="/" className="flex items-center gap-3">
          <NavLogo />
        </Link>

        <div className="flex items-center gap-4">
          <UserNav />
          <Link href="/cart" className="relative text-[#8C7B6E] hover:text-[#2A1508] transition-colors">
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
      <section className="bg-white px-6 md:px-10 pt-10 pb-8 border-b border-[rgba(42,21,8,0.07)]">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-[10px] tracking-widest uppercase text-[#C4622D] font-normal">
              {product.roaster}
            </span>
            <span className="text-[10px] text-[#8B9EA5] font-light leading-none">·</span>
            <span className="text-[10px] tracking-widest uppercase text-[#8C7B6E] font-light">{product.region}</span>
          </div>
          <hr className="border-[rgba(42,21,8,0.07)] mb-6" />
          <h1 className="font-serif text-[2.5rem] leading-tight text-[#2A1508] mb-2">
            {product.name}
          </h1>
          <p className="text-sm text-[#8C7B6E] font-light">{product.origin}</p>
        </div>
      </section>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 md:px-10 py-10 max-w-5xl w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">

          {/* Left: photo + details */}
          <div className="space-y-8">
            {/* Product photo container */}
            <div className="rounded-[2px] bg-[#F0EBE3] aspect-[4/3] w-full flex items-center justify-center">
              <svg className="w-16 h-16 text-[#8C7B6E]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>

            <p className="text-[#5A4A3A] text-sm leading-relaxed font-light">{product.description}</p>

            <div>
              <p className="text-[11px] tracking-widest uppercase text-[#8C7B6E] mb-2">Details</p>
              <div className="rounded-[2px] bg-white border border-[rgba(42,21,8,0.07)] px-4">
                <DetailRow label="Origin" value={product.origin} />
                <DetailRow label="Process" value={product.process} />
                <DetailRow label="Roast" value={product.roast} />
                {product.altitude && <DetailRow label="Altitude" value={product.altitude} />}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-[2px] font-medium ${roastBadge[product.roast]}`}>
                  {product.roast} roast
                </span>
              </div>
            </div>

            <div>
              <p className="text-[11px] tracking-widest uppercase text-[#8C7B6E] mb-3">Flavour notes</p>
              <div className="flex flex-wrap gap-2">
                {product.notes.map((note) => (
                  <span
                    key={note}
                    className="font-editorial italic text-sm px-4 py-1.5 border border-[rgba(42,21,8,0.07)] rounded-[2px] text-[#5A4A3A] bg-white"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: purchase */}
          <div className="space-y-6">

            {/* Format selector */}
            {product.formats.length > 1 ? (
              <div>
                <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-3">Format</p>
                <div className="grid grid-cols-2 gap-3">
                  {product.formats.map((fmt) => (
                    <FormatCard
                      key={fmt.name}
                      option={fmt}
                      selected={selectedFormat?.name === fmt.name}
                      onClick={() => setSelectedFormat(fmt)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-1">Format</p>
                <p className="text-sm text-stone-600">{product.formats[0].name} · {product.formats[0].grams}g</p>
                <p className="text-2xl font-semibold text-[#2A1508] mt-1">
                  ¥{product.formats[0].price.toLocaleString()}
                </p>
              </div>
            )}

            {/* Roastery: Add to Cart */}
            {product.type === "Roastery" && (
              <div className="space-y-3">
                {product.formats.length > 1 && selectedFormat && (
                  <p className="text-2xl font-semibold text-[#2A1508]">
                    ¥{selectedFormat.price.toLocaleString()}
                  </p>
                )}
                <button
                  onClick={handleAddToCart}
                  disabled={cartAdded}
                  className={`w-full py-3.5 rounded-[2px] text-sm font-medium tracking-wide transition-all ${
                    cartAdded
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                      : "bg-[#2A1508] hover:bg-[#3c1e0a] text-[#F8F5F2]"
                  }`}
                >
                  {cartAdded ? "Added to cart ✓" : "Add to cart"}
                </button>
              </div>
            )}

            {/* Café Roaster: three states */}
            {product.type === "Café Roaster" && (
              <div className="space-y-3">
                {product.formats.length > 1 && selectedFormat && (
                  <p className="text-2xl font-semibold text-[#2A1508]">
                    ¥{selectedFormat.price.toLocaleString()}
                  </p>
                )}
                {batch?.availableNow ? (
                  // In stock — same Add to Cart as roastery
                  <button
                    onClick={handleAddToCart}
                    disabled={cartAdded}
                    className={`w-full py-3.5 rounded-[2px] text-sm font-medium tracking-wide transition-all ${
                      cartAdded
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                        : "bg-[#2A1508] hover:bg-[#3c1e0a] text-[#F8F5F2]"
                    }`}
                  >
                    {cartAdded ? "Added to cart ✓" : "Add to cart"}
                  </button>
                ) : batch ? (
                  // Scheduled batch
                  <BatchPanel
                    batch={batch}
                    onPreorder={handlePreorder}
                    preordered={preordered}
                  />
                ) : (
                  // No batch — waitlist
                  <WaitlistPanel />
                )}
              </div>
            )}

            {/* Roaster attribution */}
            <div className="pt-4 mt-2 border-t border-[rgba(42,21,8,0.07)] flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#8C7B6E] mb-0.5">By</p>
                <p className="text-sm text-[#2A1508] font-light">{product.roaster}</p>
              </div>
              <Link
                href={`/roaster/${slugify(product.roaster)}`}
                className="text-[11px] text-[#C4622D] hover:text-[#B0561A] transition-colors tracking-wide flex items-center gap-1"
              >
                Visit roaster →
              </Link>
            </div>

          </div>
        </div>
      </div>

      {/* ── Brew Guide ──────────────────────────────────────────────────────── */}
      <BrewGuide
        roast={product.roast}
        process={product.process}
        brewNotes={product.brewNotes}
        savedMethod={savedBrewMethod}
        isLoggedIn={!!consumerId}
        onSaveMethod={handleSaveBrewMethod}
        isSavingMethod={isSavingMethod}
      />

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#2A1508] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="text-xl font-medium text-[#C4622D] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">Mame Mart · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
