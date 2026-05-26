"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/context/CartContext"
import { slugify } from "@/lib/slugify"
import type { Product, RoastLevel } from "@/lib/products"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveBatch {
  id: string
  productId: number
  roastDate: string
  totalBags: number
  bagsRemaining: number
}

type Lang = "EN" | "JP"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const copy = {
  EN: {
    addToCart: "Add to cart",
    preorder: "Pre-order",
    process: "Process",
    formatLabels: { "Whole Bean": "Whole Bean", "Drip Bag": "Drip Bag" } as Record<string, string>,
  },
  JP: {
    addToCart: "カートに追加",
    preorder: "先行予約",
    process: "精製",
    formatLabels: { "Whole Bean": "ホールビーン", "Drip Bag": "ドリップバッグ" } as Record<string, string>,
  },
}

const roastBadge: Record<RoastLevel, string> = {
  Light: "bg-amber-50 text-amber-700 border border-amber-100",
  Medium: "bg-orange-50 text-orange-700 border border-orange-100",
  Dark: "bg-stone-100 text-stone-600 border border-stone-200",
}

function formatShortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductCard({
  product,
  lang = "EN",
  batch,
}: {
  product: Product
  lang?: Lang
  batch: LiveBatch | null
}) {
  const router = useRouter()
  const cart = useCart()
  const c = copy[lang]

  // Guard: formats can be null/empty for legacy rows
  const formats = product.formats?.length ? product.formats : []
  const [selectedFormat, setSelectedFormat] = useState(formats[0] ?? { name: "", grams: 0, price: 0 })
  const [justAdded, setJustAdded] = useState(false)
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistDone, setWaitlistDone] = useState(false)

  const isCafe = product.type === "Café Roaster"
  const soldOut = isCafe && batch !== null && batch.bagsRemaining === 0
  const noBatch = isCafe && batch === null
  const hasFormats = formats.length > 1

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation()
    cart.addItem({
      cartItemId: `${product.id}-${selectedFormat.name}`,
      productId: product.id,
      productName: product.name,
      roasterName: product.roaster,
      format: selectedFormat,
      price: selectedFormat.price,
    })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1500)
  }

  function handlePreorder(e: React.MouseEvent) {
    e.stopPropagation()
    if (!batch) return
    cart.addItem({
      cartItemId: `${product.id}-${selectedFormat.name}`,
      productId: product.id,
      productName: product.name,
      roasterName: product.roaster,
      format: selectedFormat,
      price: selectedFormat.price,
      batchId: batch.id,
    })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1500)
  }

  function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setWaitlistDone(true)
  }

  return (
    <div className="bg-white rounded border border-stone-100 flex flex-col hover:border-stone-200 transition-all overflow-hidden">

      {/* ── Zone 1: Roaster — navigates to roaster profile ─────────────────── */}
      <Link
        href={`/roaster/${slugify(product.roaster)}`}
        className="px-5 pt-4 pb-3.5 border-b border-[#E8E2D8] hover:bg-[#FAFAF6] transition-colors block"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] tracking-widest uppercase text-[#C4714A] font-normal leading-none">
            {product.roaster}
          </p>
          <span className="text-[10px] text-[#C4714A] font-light leading-none">→</span>
        </div>
        <p className="text-[11px] text-stone-400 font-light mt-1">{product.region}</p>
      </Link>

      {/* ── Zone 2: Product — navigates to product detail ──────────────────── */}
      <div
        onClick={() => router.push(`/product/${product.id}`)}
        className="p-5 flex flex-col flex-1 gap-3 cursor-pointer hover:bg-[#FDFCFB] transition-colors"
      >
        {/* Product name */}
        <h3 className="font-serif text-[1.05rem] leading-snug text-[#2A1A0E]">{product.name}</h3>

        {/* Meta tags: origin, process, roast */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-[2px] bg-stone-100 text-stone-500 border border-stone-200 font-light">
            {product.origin}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-[2px] bg-stone-100 text-stone-500 border border-stone-200 font-light">
            {product.process}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-[2px] font-light ${roastBadge[product.roast]}`}>
            {product.roast}
          </span>
        </div>

        {/* Flavour notes — Cormorant Garamond italic */}
        <p className="font-editorial italic text-[13px] text-stone-400 leading-snug">
          {product.notes.join(" · ")}
        </p>

        {/* Batch info strip — Café Roasters only */}
        {isCafe && batch && (
          <div className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-[2px] px-3 py-2 text-[11px]">
            <span className="text-stone-500 font-light">Roasts {formatShortDate(batch.roastDate)}</span>
            {batch.bagsRemaining > 0 ? (
              <span className={`font-normal ${batch.bagsRemaining <= 5 ? "text-red-500" : "text-emerald-600"}`}>
                {batch.bagsRemaining} bag{batch.bagsRemaining !== 1 ? "s" : ""} left
              </span>
            ) : (
              <span className="font-light text-stone-400">Sold out</span>
            )}
          </div>
        )}
        {isCafe && !batch && (
          <div className="bg-stone-50 border border-stone-100 rounded-[2px] px-3 py-2 text-[11px] text-stone-400 font-light">
            No batches scheduled
          </div>
        )}

        {/* Format toggle — always rendered when >1 format */}
        {hasFormats && (
          formats.length <= 3 ? (
            <div className="flex gap-1.5">
              {formats.map((fmt) => (
                <button
                  key={`${fmt.name}-${fmt.price}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedFormat(fmt); setJustAdded(false) }}
                  className={`flex-1 text-[11px] py-1.5 rounded-[2px] border transition-all font-light ${
                    selectedFormat.name === fmt.name && selectedFormat.price === fmt.price
                      ? "bg-[#2A1A0E] text-white border-[#2A1A0E]"
                      : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                  }`}
                >
                  {c.formatLabels[fmt.name] ?? fmt.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="relative">
              <select
                value={`${selectedFormat.name}-${selectedFormat.price}`}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation()
                  const fmt = formats.find(f => `${f.name}-${f.price}` === e.target.value)
                  if (fmt) { setSelectedFormat(fmt); setJustAdded(false) }
                }}
                className="w-full text-[11px] py-2 pl-3 pr-8 rounded-[2px] border border-stone-200 bg-white text-stone-600 focus:outline-none focus:border-[#C4714A] appearance-none font-light"
              >
                {formats.map((fmt) => (
                  <option key={`${fmt.name}-${fmt.price}`} value={`${fmt.name}-${fmt.price}`}>
                    {c.formatLabels[fmt.name] ?? fmt.name}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )
        )}

        {/* Price + CTA — mt-auto keeps it at bottom without mid-card gap */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <p className="text-base font-normal text-[#2A1A0E] tracking-tight">
            ¥{selectedFormat.price.toLocaleString()}
          </p>

          {!isCafe && (
            <button
              onClick={handleAddToCart}
              className={`text-[11px] px-3 py-1.5 rounded-[2px] tracking-wide transition-colors font-light ${
                justAdded
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-[#BD6B44] hover:bg-[#A85C38] text-white"
              }`}
            >
              {justAdded ? "Added ✓" : c.addToCart}
            </button>
          )}

          {isCafe && !soldOut && !noBatch && (
            <button
              onClick={handlePreorder}
              className={`text-[11px] px-3 py-1.5 rounded-[2px] tracking-wide transition-colors font-light ${
                justAdded
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-[#2A1A0E] hover:bg-[#3a2010] text-white"
              }`}
            >
              {justAdded ? "Added ✓" : c.preorder}
            </button>
          )}

          {isCafe && soldOut && (
            <span className="text-[11px] px-3 py-1.5 rounded-[2px] bg-stone-100 text-stone-400 border border-stone-200 font-light">Sold out</span>
          )}

          {isCafe && noBatch && (
            <span className="text-[11px] px-3 py-1.5 rounded-[2px] bg-stone-100 text-stone-400 border border-stone-200 font-light">Coming soon</span>
          )}
        </div>

        {/* Waitlist — sold out only */}
        {isCafe && soldOut && (
          <div onClick={e => e.stopPropagation()}>
            {waitlistDone ? (
              <p className="text-[11px] text-emerald-600 text-center font-light">You're on the list ✓</p>
            ) : showWaitlist ? (
              <form onSubmit={handleWaitlistSubmit} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  className="flex-1 text-[11px] px-3 py-1.5 rounded-[2px] border border-stone-200 focus:outline-none focus:border-[#C4714A] min-w-0 font-light"
                />
                <button
                  type="submit"
                  className="text-[11px] px-3 py-1.5 rounded-[2px] bg-[#2A1A0E] text-white whitespace-nowrap font-light"
                >
                  Notify me
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowWaitlist(true)}
                className="w-full text-[11px] text-[#C4714A] hover:text-[#B05E3C] transition-colors text-center font-light"
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
