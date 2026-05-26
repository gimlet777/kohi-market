"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { rowToProduct, type ProductRow, type FormatOption, type Product } from "@/lib/products"
import { supabase } from "@/lib/supabase"
import { useCart } from "@/context/CartContext"

import { slugify } from "@/lib/slugify"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveBatch {
  id: string
  roastDate: string
  totalBags: number
  bagsRemaining: number
  status: "open" | "closed" | "complete"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roastBadge: Record<string, string> = {
  Light: "bg-transparent text-[#6A5040] border border-[#E8E2D8]",
  Medium: "bg-transparent text-[#6A5040] border border-[#E8E2D8]",
  Dark: "bg-transparent text-[#6A5040] border border-[#E8E2D8]",
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
      <span className="text-sm text-[#2A1A0E] font-medium">{value}</span>
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
          ? "border-[#C4714A] bg-[#C4714A]/5"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <p className={`text-sm font-medium ${selected ? "text-[#2A1A0E]" : "text-stone-600"}`}>
        {option.name}
      </p>
      <p className="text-xs text-stone-400 mt-0.5">{option.grams}g</p>
      <p className={`text-base font-semibold mt-2 ${selected ? "text-[#C4714A]" : "text-[#2A1A0E]"}`}>
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
    <div className="rounded-[2px] border border-[#E8E2D8] bg-[#FAFAF8] p-5 space-y-4">
      <p className="text-xs tracking-widest uppercase text-stone-400">Batch Info</p>

      <div className="space-y-3">
        {/* Roast date */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[2px] bg-white border border-[#E8E2D8] flex items-center justify-center shrink-0">
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-stone-400 uppercase tracking-wider">Next roast date</p>
            <p className="text-sm font-medium text-[#2A1A0E]">{formatDate(batch.roastDate)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-stone-400 uppercase tracking-wider">Batch fill</p>
            <p className="text-[11px] font-medium text-[#2A1A0E]">
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
                className="flex-1 text-xs px-4 py-2 rounded-[2px] border border-stone-200 focus:outline-none focus:border-[#C4714A] min-w-0"
              />
              <button
                type="submit"
                className="text-xs px-4 py-2 rounded-[2px] bg-[#2A1A0E] text-white whitespace-nowrap"
              >
                Notify me
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowWaitlist(true)}
              className="w-full text-xs text-[#C4714A] hover:text-[#B05E3C] transition-colors text-center"
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
                : "bg-[#C4714A] hover:bg-[#B05E3C] text-white"
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

  useEffect(() => {
    const productId = Number(params.id)
    Promise.all([
      supabase.from("products").select("*").eq("id", productId).single(),
      supabase
        .from("batches")
        .select("id, roast_date, total_bags, bags_remaining, status")
        .eq("product_id", productId)
        .eq("status", "open")
        .gte("roast_date", new Date().toISOString().split("T")[0])
        .order("roast_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]).then(([{ data: productData, error: productError }, { data: batchData }]) => {
      if (!productError && productData) {
        const p = rowToProduct(productData as ProductRow)
        setProduct(p)
        setSelectedFormat(p.formats[0])
      }
      if (batchData) {
        setBatch({
          id: batchData.id,
          roastDate: batchData.roast_date,
          totalBags: batchData.total_bags,
          bagsRemaining: batchData.bags_remaining,
          status: batchData.status,
        })
      }
      setIsLoading(false)
    })
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
      roasterName: product!.roaster,
      format: selectedFormat,
      price: selectedFormat.price,
    })
    setCartAdded(true)
  }

  function handlePreorder() {
    if (!selectedFormat || !batch || preordered) return
    cart.addItem({
      cartItemId: `${product!.id}-${selectedFormat.name}`,
      productId: product!.id,
      productName: product!.name,
      roasterName: product!.roaster,
      format: selectedFormat,
      price: selectedFormat.price,
      batchId: batch.id,
    })
    setPreordered(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAF8]">
        <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
          <Link href="/" className="text-stone-500 hover:text-[#2A1A0E] text-xs tracking-wide transition-colors">
            ← Marketplace
          </Link>
          <Link href="/" className="flex items-center gap-3">
            <span className="font-serif text-xl text-[#2A1A0E] leading-none">珈琲市</span>
            <span className="text-[11px] text-stone-300 tracking-[0.18em] font-light leading-none mt-0.5">KOHĪ</span>
          </Link>
          <Link href="/cart" className="relative text-stone-400 hover:text-[#2A1A0E] transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.847-7.148a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </Link>
        </nav>
        <div className="px-6 md:px-10 pt-12 pb-14 animate-pulse bg-stone-100">
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
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-400 text-sm mb-4">Product not found.</p>
          <button onClick={() => router.push("/")} className="text-[#C4714A] text-sm hover:underline">
            ← Back to marketplace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8]">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link
          href="/"
          className="text-stone-500 hover:text-[#2A1A0E] transition-colors text-xs tracking-wide"
        >
          ← Marketplace
        </Link>

        <Link href="/" className="flex items-center gap-3">
          <span className="font-serif text-xl text-[#2A1A0E] leading-none">珈琲市</span>
          <span className="text-[11px] text-stone-300 tracking-[0.18em] font-light leading-none mt-0.5">KOHĪ</span>
        </Link>

        <Link href="/cart" className="relative text-stone-400 hover:text-[#2A1A0E] transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.847-7.148a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          {cart.totalCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#C4714A] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium leading-none">
              {cart.totalCount > 9 ? "9+" : cart.totalCount}
            </span>
          )}
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-[#FAFAF8] px-6 md:px-10 pt-10 pb-8 border-b border-[#E8E2D8]">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5 mb-4">
            <Link
              href={`/roaster/${slugify(product.roaster)}`}
              className="text-[10px] tracking-widest uppercase text-[#C4714A] font-normal hover:text-[#B05E3C] transition-colors"
            >
              {product.roaster}
            </Link>
            <span className="text-[10px] text-stone-300 font-light leading-none">·</span>
            <span className="text-[10px] tracking-widest uppercase text-stone-400 font-light">{product.region}</span>
          </div>
          <hr className="border-[#E8E2D8] mb-6" />
          <h1 className="font-serif text-[2.5rem] leading-tight text-[#2A1A0E] mb-2">
            {product.name}
          </h1>
          <p className="text-sm text-stone-400 font-light">{product.origin}</p>
        </div>
      </section>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 md:px-10 py-10 max-w-5xl w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">

          {/* Left: details */}
          <div className="space-y-8">
            <p className="text-[#2A1A0E] text-sm leading-relaxed font-light">{product.description}</p>

            <div>
              <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-2">Details</p>
              <div className="rounded-[2px] bg-white border border-[#E8E2D8] px-4">
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
              <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-3">Flavour notes</p>
              <div className="flex flex-wrap gap-2">
                {product.notes.map((note) => (
                  <span
                    key={note}
                    className="font-editorial italic text-sm px-4 py-1.5 border border-[#E8E2D8] rounded-[2px] text-stone-600 bg-white"
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
                <p className="text-2xl font-semibold text-[#2A1A0E] mt-1">
                  ¥{product.formats[0].price.toLocaleString()}
                </p>
              </div>
            )}

            {/* Roastery: Add to Cart */}
            {product.type === "Roastery" && (
              <div className="space-y-3">
                {product.formats.length > 1 && selectedFormat && (
                  <p className="text-2xl font-semibold text-[#2A1A0E]">
                    ¥{selectedFormat.price.toLocaleString()}
                  </p>
                )}
                <button
                  onClick={handleAddToCart}
                  disabled={cartAdded}
                  className={`w-full py-3.5 rounded-[2px] text-sm font-medium tracking-wide transition-all ${
                    cartAdded
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                      : "bg-[#C4714A] hover:bg-[#B05E3C] text-white"
                  }`}
                >
                  {cartAdded ? "Added to cart ✓" : "Add to cart"}
                </button>
              </div>
            )}

            {/* Café Roaster: Batch panel */}
            {product.type === "Café Roaster" && (
              <div className="space-y-3">
                {product.formats.length > 1 && selectedFormat && (
                  <p className="text-2xl font-semibold text-[#2A1A0E]">
                    ¥{selectedFormat.price.toLocaleString()}
                  </p>
                )}
                {batch ? (
                  <BatchPanel
                    batch={batch}
                    onPreorder={handlePreorder}
                    preordered={preordered}
                  />
                ) : (
                  <div className="rounded-[2px] border border-[#E8E2D8] bg-[#FAFAF8] p-5 text-center">
                    <p className="text-sm text-stone-400">No batches scheduled yet.</p>
                    <p className="text-xs text-stone-300 mt-1">Check back soon for pre-orders.</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#2A1A0E] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="font-serif text-xl text-[#C4714A]">珈琲市</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">KOHĪ · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
