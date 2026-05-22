"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/context/CartContext"
import { getOriginGradient } from "@/lib/origin-gradients"
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
  Light: "bg-amber-100 text-amber-700",
  Medium: "bg-orange-100 text-orange-700",
  Dark: "bg-stone-800 text-stone-100",
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
  const [selectedFormat, setSelectedFormat] = useState(product.formats[0])
  const [formatPicked, setFormatPicked] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistDone, setWaitlistDone] = useState(false)

  const isCafe = product.type === "Café Roaster"
  const soldOut = isCafe && batch !== null && batch.bagsRemaining === 0
  const noBatch = isCafe && batch === null

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
    // TODO: persist waitlist email to a waitlist table
    setWaitlistDone(true)
  }

  const prices = product.formats.map(f => f.price)
  const minPrice = Math.min(...prices)
  const allSamePrice = prices.every(p => p === prices[0])
  const showFrom = product.formats.length > 1 && !allSamePrice && !formatPicked

  return (
    <div
      onClick={() => router.push(`/product/${product.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 flex flex-col hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Gradient header */}
      <div
        className="h-24 w-full relative shrink-0"
        style={{ background: getOriginGradient(product.origin) }}
      >
        <span className="absolute bottom-3 left-4 text-[10px] tracking-widest uppercase text-white/60 font-medium">
          {product.origin}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Header row */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-[#34150F]">{product.roaster}</p>
            <Link
              href={`/roaster/${slugify(product.roaster)}`}
              onClick={e => e.stopPropagation()}
              className="text-[10px] text-[#C8965A] hover:text-[#B8854C] transition-colors whitespace-nowrap shrink-0"
            >
              Visit →
            </Link>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">{product.region}</p>
        </div>

        {/* Product name */}
        <h3 className="font-serif text-[1.1rem] leading-snug text-[#34150F]">{product.name}</h3>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-1.5">
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
            <span className="text-stone-500">Roasts {formatShortDate(batch.roastDate)}</span>
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
          product.formats.length <= 3 ? (
            <div className="flex gap-1.5">
              {product.formats.map((fmt) => (
                <button
                  key={fmt.name}
                  onClick={(e) => { e.stopPropagation(); setSelectedFormat(fmt); setFormatPicked(true); setJustAdded(false) }}
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
          ) : (
            <div className="relative">
              <select
                value={selectedFormat.name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation()
                  const fmt = product.formats.find(f => f.name === e.target.value)
                  if (fmt) { setSelectedFormat(fmt); setFormatPicked(true); setJustAdded(false) }
                }}
                className="w-full text-[11px] py-2 pl-3 pr-8 rounded-lg border border-stone-200 bg-white text-stone-600 focus:outline-none focus:border-[#C8965A] appearance-none"
              >
                {product.formats.map((fmt) => (
                  <option key={fmt.name} value={fmt.name}>
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

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-lg font-medium text-[#34150F] tracking-tight">
            {showFrom && <span className="text-sm font-normal text-stone-400 mr-0.5">From </span>}
            ¥{(showFrom ? minPrice : selectedFormat.price).toLocaleString()}
          </p>

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

          {isCafe && soldOut && (
            <span className="text-xs px-4 py-2 rounded-full bg-stone-100 text-stone-400">Sold out</span>
          )}

          {isCafe && noBatch && (
            <span className="text-xs px-4 py-2 rounded-full bg-stone-100 text-stone-400">Coming soon</span>
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
                onClick={() => setShowWaitlist(true)}
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
