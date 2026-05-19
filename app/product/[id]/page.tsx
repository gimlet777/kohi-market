"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { PRODUCTS, type FormatOption, type Product } from "@/lib/products"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roastBadge: Record<string, string> = {
  Light: "bg-amber-100 text-amber-700",
  Medium: "bg-orange-100 text-orange-700",
  Dark: "bg-stone-800 text-stone-100",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function urgencyColor(bags: number) {
  if (bags <= 5) return "bg-red-400"
  if (bags <= 10) return "bg-amber-400"
  return "bg-emerald-400"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-3 border-b border-stone-100 last:border-0">
      <span className="text-xs tracking-widest uppercase text-stone-400">{label}</span>
      <span className="text-sm text-[#1a1a1a] font-medium">{value}</span>
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
      className={`flex-1 text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? "border-[#c8a96e] bg-[#c8a96e]/5"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <p className={`text-sm font-medium ${selected ? "text-[#1a1a1a]" : "text-stone-600"}`}>
        {option.name}
      </p>
      <p className="text-xs text-stone-400 mt-0.5">{option.grams}g</p>
      <p className={`text-base font-semibold mt-2 ${selected ? "text-[#c8a96e]" : "text-[#1a1a1a]"}`}>
        ¥{option.price.toLocaleString()}
      </p>
    </button>
  )
}

function BatchPanel({ product }: { product: Product }) {
  const [ordered, setOrdered] = useState(false)
  if (!product.batchInfo) return null
  const { nextRoastDate, bagsRemaining } = product.batchInfo

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 space-y-4">
      <p className="text-xs tracking-widest uppercase text-stone-400">Batch Info</p>

      <div className="space-y-3">
        {/* Next roast date */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center shrink-0">
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-stone-400 uppercase tracking-wider">Next roast date</p>
            <p className="text-sm font-medium text-[#1a1a1a]">{formatDate(nextRoastDate)}</p>
          </div>
        </div>

        {/* Bags remaining */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center shrink-0">
            <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <div>
              <p className="text-[11px] text-stone-400 uppercase tracking-wider">Bags remaining</p>
              <p className="text-sm font-medium text-[#1a1a1a]">{bagsRemaining} bags</p>
            </div>
            <span className={`ml-auto w-2 h-2 rounded-full ${urgencyColor(bagsRemaining)}`} />
          </div>
        </div>
      </div>

      <button
        onClick={() => setOrdered(true)}
        disabled={ordered}
        className={`w-full py-3 rounded-full text-sm font-medium tracking-wide transition-all ${
          ordered
            ? "bg-emerald-100 text-emerald-700 cursor-default"
            : "bg-[#c8a96e] hover:bg-[#b89860] text-white"
        }`}
      >
        {ordered ? "Pre-order placed ✓" : "Pre-order this batch"}
      </button>
      <p className="text-[11px] text-stone-400 text-center leading-relaxed">
        You'll be charged when the batch ships after roasting.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const product = PRODUCTS.find((p) => p.id === Number(params.id))

  const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>(
    product?.formats[0] ?? null
  )
  const [cartAdded, setCartAdded] = useState(false)

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-400 text-sm mb-4">Product not found.</p>
          <button onClick={() => router.push("/")} className="text-[#c8a96e] text-sm hover:underline">
            ← Back to marketplace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f2]">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#1a1a1a] px-6 md:px-10 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors text-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Marketplace
        </button>

        <span className="font-serif text-xl text-[#c8a96e] tracking-wide">KOHĪ</span>

        <div className="w-20" />
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-[#1a1a1a] px-6 md:px-10 pt-12 pb-14">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <p className="text-xs text-stone-500 tracking-wide">{product.roaster} · {product.region}</p>
            <span
              className={`text-[10px] tracking-widest uppercase px-2.5 py-0.5 rounded-full border ${
                product.type === "Roastery"
                  ? "border-[#c8a96e] text-[#c8a96e]"
                  : "border-stone-600 text-stone-500"
              }`}
            >
              {product.type}
            </span>
          </div>

          <h1 className="font-serif text-4xl md:text-6xl text-white leading-tight mb-3">
            {product.name}
          </h1>
          <p className="text-stone-500 text-sm">{product.origin}</p>
        </div>
      </section>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 md:px-10 py-10 max-w-5xl w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">

          {/* Left: details ─────────────────────────────────────────────────── */}
          <div className="space-y-8">

            {/* Description */}
            <p className="text-stone-600 text-sm leading-relaxed">{product.description}</p>

            {/* Coffee details */}
            <div>
              <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-2">Details</p>
              <div className="rounded-xl bg-white border border-stone-100 px-4">
                <DetailRow label="Origin" value={product.origin} />
                <DetailRow label="Process" value={product.process} />
                <DetailRow
                  label="Roast"
                  value={product.roast}
                />
                {product.altitude && <DetailRow label="Altitude" value={product.altitude} />}
              </div>
              {/* Roast badge inline */}
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${roastBadge[product.roast]}`}>
                  {product.roast} roast
                </span>
              </div>
            </div>

            {/* Flavour notes */}
            <div>
              <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-3">Flavour notes</p>
              <div className="flex flex-wrap gap-2">
                {product.notes.map((note) => (
                  <span
                    key={note}
                    className="text-sm px-4 py-1.5 border border-stone-200 rounded-full text-stone-600 bg-white"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: purchase ────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Format selector */}
            {product.formats.length > 1 ? (
              <div>
                <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-3">Format</p>
                <div className="flex gap-3">
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
                <p className="text-2xl font-semibold text-[#1a1a1a] mt-1">
                  ¥{product.formats[0].price.toLocaleString()}
                </p>
              </div>
            )}

            {/* CTA ── Roastery: Add to Cart */}
            {product.type === "Roastery" && (
              <div className="space-y-3">
                {product.formats.length > 1 && selectedFormat && (
                  <p className="text-2xl font-semibold text-[#1a1a1a]">
                    ¥{selectedFormat.price.toLocaleString()}
                  </p>
                )}
                <button
                  onClick={() => setCartAdded(true)}
                  disabled={cartAdded}
                  className={`w-full py-3.5 rounded-full text-sm font-medium tracking-wide transition-all ${
                    cartAdded
                      ? "bg-emerald-100 text-emerald-700 cursor-default"
                      : "bg-[#c8a96e] hover:bg-[#b89860] text-white"
                  }`}
                >
                  {cartAdded ? "Added to cart ✓" : "Add to cart"}
                </button>
              </div>
            )}

            {/* CTA ── Café Roaster: Batch panel */}
            {product.type === "Café Roaster" && (
              <>
                {product.formats.length > 1 && selectedFormat && (
                  <p className="text-2xl font-semibold text-[#1a1a1a]">
                    ¥{selectedFormat.price.toLocaleString()}
                  </p>
                )}
                <BatchPanel product={product} />
              </>
            )}

          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#1a1a1a] px-6 md:px-10 py-8 text-center mt-10">
        <span className="font-serif text-lg text-[#c8a96e]">KOHĪ</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest">珈琲市 · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
