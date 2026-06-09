"use client"

import Link from "next/link"
import type { Product, RoastLevel } from "@/lib/products"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveBatch {
  id: string
  productId: number
  roastDate: string | null
  availableNow: boolean
  totalBags: number
  bagsRemaining: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  batch,
  accentColor,
}: {
  product: Product
  batch: LiveBatch | null
  accentColor?: string
}) {
  const allFormats = (product.formats ?? []).filter(
    (f, i, arr) => arr.findIndex(x => x.name === f.name) === i
  )
  const fromPrice = allFormats.length > 0 ? Math.min(...allFormats.map(f => f.price)) : 0
  const accent = accentColor ?? "#C4622D"

  const isCafe = product.type === "Café Roaster"
  const soldOut = isCafe && batch !== null && !batch.availableNow && batch.bagsRemaining === 0
  const noBatch = isCafe && batch === null

  return (
    <Link
      href={`/product/${product.id}`}
      className="flex flex-col bg-white overflow-hidden transition-all hover:shadow-sm"
      style={{ border: "1px solid rgba(42,21,8,0.10)", borderRadius: 2 }}
    >
      {/* ── Accent bar ──────────────────────────────────────────────────────── */}
      <div style={{ height: 2, backgroundColor: accent, flexShrink: 0 }} />

      {/* ── Roaster ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3.5 border-b border-[#E8E2D8]">
        <p className="text-[10px] tracking-widest uppercase text-[#C4622D] font-normal leading-none">
          {product.roaster}
        </p>
        <p className="text-[11px] text-[#8C7B6E] font-light mt-1">{product.region}</p>
      </div>

      {/* ── Product ─────────────────────────────────────────────────────────── */}
      <div className="p-5 flex flex-col flex-1 gap-3">

        <h3 className="font-serif text-[1.05rem] leading-snug text-[#2A1508]">{product.name}</h3>

        {/* Origin · process · roast */}
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

        {/* Flavour notes */}
        <p className="font-editorial italic text-[13px] text-stone-400 leading-snug">
          {product.notes.join(" · ")}
        </p>

        {/* Format tags — passive */}
        {allFormats.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allFormats.map(fmt => (
              <span
                key={`${fmt.name}-${fmt.price}`}
                className="text-[10px] px-2 py-0.5 rounded-[2px] bg-[#F8F5F2] text-[#8C7B6E] border border-stone-200 font-light"
              >
                {fmt.name}{fmt.grams > 0 ? ` · ${fmt.grams}g` : ""}
              </span>
            ))}
          </div>
        )}

        {/* Batch info strip — scheduled batches */}
        {isCafe && batch && !batch.availableNow && (
          <div className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-[2px] px-3 py-2 text-[11px]">
            <span className="text-stone-500 font-light">
              Roasts {batch.roastDate ? formatShortDate(batch.roastDate) : "—"}
            </span>
            {batch.bagsRemaining > 0 ? (
              <span className={`font-normal ${batch.bagsRemaining <= 5 ? "text-red-500" : "text-emerald-600"}`}>
                {batch.bagsRemaining} bag{batch.bagsRemaining !== 1 ? "s" : ""} left
              </span>
            ) : (
              <span className="font-light text-stone-400">Sold out</span>
            )}
          </div>
        )}
        {isCafe && noBatch && (
          <div className="bg-stone-50 border border-stone-100 rounded-[2px] px-3 py-2 text-[11px] text-stone-400 font-light">
            Currently unavailable
          </div>
        )}

        {/* FROM price */}
        <div className="mt-auto pt-1 flex items-center justify-between">
          <p className="text-base font-normal text-[#2A1508] tracking-tight">
            {allFormats.length > 1 ? <span className="text-[11px] text-[#8C7B6E] font-light mr-1">FROM</span> : null}
            ¥{fromPrice.toLocaleString()}
          </p>
          {soldOut && (
            <span className="text-[10px] px-2.5 py-1 rounded-[2px] bg-stone-100 text-stone-400 border border-stone-200 font-light">
              Sold out
            </span>
          )}
        </div>

      </div>
    </Link>
  )
}
