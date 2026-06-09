import Link from "next/link"
import { slugify } from "@/lib/slugify"
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
  const rawFormats = product.formats?.length ? product.formats : []
  const allFormats = rawFormats.filter((f, i) => rawFormats.findIndex(x => x.name === f.name) === i)

  const isCafe = product.type === "Café Roaster"
  const noBatch = isCafe && batch === null

  const minPrice = allFormats.length > 0 ? Math.min(...allFormats.map(f => f.price)) : 0
  const priceDisplay = allFormats.length > 1
    ? `FROM ¥${minPrice.toLocaleString()}`
    : `¥${minPrice.toLocaleString()}`

  return (
    <div className="flex flex-col bg-white rounded border border-[rgba(42,21,8,0.10)] hover:border-[rgba(42,21,8,0.20)] transition-all overflow-hidden">

      {/* Zone 1: Roaster header → navigates to roaster profile */}
      <Link
        href={`/roaster/${slugify(product.roaster)}`}
        className="block px-5 pt-4 pb-3.5 hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] tracking-widest uppercase text-[#C4622D] font-normal leading-none">
            {product.roaster}
          </p>
          <span className="text-[10px] text-[#C4622D] font-light leading-none">→</span>
        </div>
        <p className="text-[11px] text-[#8C7B6E] font-light mt-1">{product.region}</p>
      </Link>

      {/* 2px accent bar */}
      <div style={{ height: 2, backgroundColor: accentColor ?? "#C4622D" }} />

      {/* Zone 2: Product body → navigates to PDP */}
      <Link
        href={`/product/${product.id}`}
        className="flex flex-col flex-1 p-5 gap-3"
      >
        <h3 className="font-serif text-[1.05rem] leading-snug text-[#2A1508]">{product.name}</h3>

        {/* Meta tags + format tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-[2px] bg-stone-50 text-[#8C7B6E] border border-[rgba(42,21,8,0.07)] font-light">
            {product.origin}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-[2px] bg-stone-50 text-[#8C7B6E] border border-[rgba(42,21,8,0.07)] font-light">
            {product.process}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-[2px] font-light ${roastBadge[product.roast]}`}>
            {product.roast}
          </span>
          {allFormats.map((fmt) => (
            <span
              key={`${fmt.name}-${fmt.price}`}
              className="text-[10px] px-2 py-0.5 rounded-[2px] bg-stone-50 text-[#8C7B6E] border border-[rgba(42,21,8,0.07)] font-light"
            >
              {fmt.name}
            </span>
          ))}
        </div>

        {/* Flavour notes */}
        <p className="font-editorial italic text-[13px] text-[#8C7B6E] leading-snug">
          {product.notes.join(" · ")}
        </p>

        {/* Batch info strip — scheduled batches only */}
        {isCafe && batch && !batch.availableNow && (
          <div className="flex items-center justify-between bg-stone-50 border border-[rgba(42,21,8,0.07)] rounded-[2px] px-3 py-2 text-[11px]">
            <span className="text-[#8C7B6E] font-light">
              Roasts {batch.roastDate ? formatShortDate(batch.roastDate) : "—"}
            </span>
            {batch.bagsRemaining > 0 ? (
              <span className={`font-normal ${batch.bagsRemaining <= 5 ? "text-red-500" : "text-emerald-600"}`}>
                {batch.bagsRemaining} bag{batch.bagsRemaining !== 1 ? "s" : ""} left
              </span>
            ) : (
              <span className="font-light text-[#8C7B6E]">Sold out</span>
            )}
          </div>
        )}
        {isCafe && noBatch && (
          <div className="bg-stone-50 border border-[rgba(42,21,8,0.07)] rounded-[2px] px-3 py-2 text-[11px] text-[#8C7B6E] font-light">
            Currently unavailable
          </div>
        )}

        {/* Price */}
        <p className="text-base font-normal text-[#2A1508] tracking-tight mt-auto pt-1">
          {priceDisplay}
        </p>
      </Link>
    </div>
  )
}
