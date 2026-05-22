"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useCart } from "@/context/CartContext"
import { rowToProduct, type ProductRow, type Product } from "@/lib/products"
import { slugify } from "@/lib/slugify"
import { ProductCard, type LiveBatch } from "@/components/ProductCard"

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoasterProfile {
  id: string
  roaster_name: string
  region: string
  seller_type: string
  bio: string | null
  slug: string | null
}

interface UpcomingBatch {
  id: string
  product_id: number
  roast_date: string
  total_bags: number
  bags_remaining: number
  productName: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoasterProfilePage() {
  const params = useParams()
  const slug = params.slug as string
  const cart = useCart()

  const [roaster, setRoaster] = useState<RoasterProfile | null>(null)
  const [roasterName, setRoasterName] = useState("")
  const [sellerType, setSellerType] = useState("Roastery")
  const [region, setRegion] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [batchMap, setBatchMap] = useState<Record<number, LiveBatch>>({})
  const [upcomingBatches, setUpcomingBatches] = useState<UpcomingBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      // 1. Try claimed roaster account by slug column
      const { data: roasterData } = await supabase
        .from("roasters")
        .select("id, roaster_name, region, seller_type, bio, slug")
        .eq("slug", slug)
        .maybeSingle()

      let resolvedName: string | null = null
      let resolvedType = "Roastery"
      let resolvedRegion = ""
      let productsData: ProductRow[] = []

      if (roasterData) {
        setRoaster(roasterData)
        resolvedName = roasterData.roaster_name
        resolvedType = roasterData.seller_type
        resolvedRegion = roasterData.region
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("roaster_id", roasterData.id)
          .order("created_at", { ascending: true })
        productsData = (data ?? []) as ProductRow[]
      } else {
        // 2. Fallback: fetch all products and match by slugified roaster_name.
        //    Handles seed/unclaimed roasters with no roasters-table row.
        const { data: allRows } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: true })

        const matching = (allRows ?? [] as ProductRow[]).filter(
          (r: ProductRow) => slugify(r.roaster_name) === slug
        ) as ProductRow[]

        if (matching.length > 0) {
          resolvedName = matching[0].roaster_name
          resolvedType = matching[0].seller_type
          resolvedRegion = matching[0].region
          productsData = matching
        }
      }

      if (!resolvedName) {
        setNotFound(true)
        setIsLoading(false)
        return
      }

      setRoasterName(resolvedName)
      setSellerType(resolvedType)
      setRegion(resolvedRegion)

      const prods = productsData.map(rowToProduct)
      setProducts(prods)

      // 3. Fetch open batches for this roaster's products
      if (prods.length > 0) {
        const productIds = prods.map(p => p.id)
        const { data: batchRows } = await supabase
          .from("batches")
          .select("id, product_id, roast_date, total_bags, bags_remaining, products(product_name)")
          .in("product_id", productIds)
          .eq("status", "open")
          .order("roast_date", { ascending: true })

        const map: Record<number, LiveBatch> = {}
        const upcoming: UpcomingBatch[] = []

        for (const b of (batchRows ?? [])) {
          const lb: LiveBatch = {
            id: b.id,
            productId: b.product_id,
            roastDate: b.roast_date,
            totalBags: b.total_bags,
            bagsRemaining: b.bags_remaining,
          }
          if (!(b.product_id in map)) map[b.product_id] = lb
          upcoming.push({
            id: b.id,
            product_id: b.product_id,
            roast_date: b.roast_date,
            total_bags: b.total_bags,
            bags_remaining: b.bags_remaining,
            productName:
              (b.products as unknown as { product_name: string } | null)?.product_name ?? "Unknown",
          })
        }
        setBatchMap(map)
        setUpcomingBatches(upcoming)
      }

      setIsLoading(false)
    }
    load()
  }, [slug])

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex flex-col">
        <nav className="sticky top-0 z-50 bg-[#34150F] px-6 md:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl text-[#C8965A] tracking-wide">KOHĪ</Link>
          <span className="text-xs text-stone-600 tracking-wider hidden sm:block">珈琲市</span>
        </nav>
        <div className="bg-[#f7f5f2] border-b border-stone-200 px-6 md:px-10 pt-12 pb-10 animate-pulse">
          <div className="max-w-4xl mx-auto flex items-start gap-8 md:gap-12">
            <div className="shrink-0 w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-stone-200" />
            <div className="flex-1 pt-1 space-y-3">
              <div className="h-2.5 w-24 bg-stone-200 rounded" />
              <div className="h-10 w-64 bg-stone-200 rounded" />
              <div className="h-3 w-32 bg-stone-200 rounded" />
            </div>
          </div>
        </div>
        <div className="flex-1 px-6 md:px-10 py-10 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-stone-100 animate-pulse">
                <div className="h-24 bg-stone-100" />
                <div className="p-5 space-y-3">
                  <div className="h-3 bg-stone-100 rounded w-1/2" />
                  <div className="h-5 bg-stone-100 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Not found ───────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex flex-col">
        <nav className="sticky top-0 z-50 bg-[#34150F] px-6 md:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl text-[#C8965A] tracking-wide">KOHĪ</Link>
          <span className="text-xs text-stone-600 tracking-wider hidden sm:block">珈琲市</span>
        </nav>
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="text-center">
            <p className="text-stone-400 text-sm mb-4">Roaster not found.</p>
            <Link href="/" className="text-[#C8965A] text-sm hover:underline">
              ← Back to marketplace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isCafe = sellerType === "Café Roaster"

  return (
    <div className="min-h-screen bg-[#f7f5f2] flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#34150F] px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <Link href="/" className="font-serif text-2xl text-[#C8965A] tracking-wide">KOHĪ</Link>
          <span className="text-xs text-stone-600 tracking-wider hidden sm:block">珈琲市</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/" className="text-xs text-stone-400 hover:text-white transition-colors">
            ← Marketplace
          </Link>
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
      <section className="bg-[#f7f5f2] border-b border-stone-200 px-6 md:px-10 pt-12 pb-10">
        <div className="max-w-4xl mx-auto flex items-start gap-8 md:gap-12">

          {/* Logo placeholder */}
          <div className="shrink-0 w-20 h-20 md:w-28 md:h-28 rounded-2xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-1.5 text-stone-300 bg-white">
            <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            <span className="text-[10px] tracking-wide">Logo</span>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3">
              Roaster Profile
            </p>
            <h1 className="font-serif text-4xl md:text-5xl text-[#34150F] leading-tight mb-3">
              {roasterName}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              {region && <span className="text-sm text-stone-500">{region}</span>}
              {region && <span className="text-stone-300">·</span>}
              <span className="text-sm text-stone-500">{sellerType}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="max-w-4xl mx-auto mt-8 pl-0 md:pl-[calc(7rem+3rem)]">
          {roaster?.bio ? (
            <p className="text-stone-600 text-sm leading-relaxed max-w-xl">{roaster.bio}</p>
          ) : (
            <p className="text-stone-400 text-sm italic">This roaster hasn't added a bio yet.</p>
          )}
        </div>

        {/* Claim notice — only for unclaimed (no roaster row) */}
        {!roaster && (
          <div className="max-w-4xl mx-auto mt-5 pl-0 md:pl-[calc(7rem+3rem)]">
            <Link href="/roaster/signup" className="text-[11px] text-stone-400 hover:text-[#C8965A] transition-colors">
              Are you this roaster? Claim your page →
            </Link>
          </div>
        )}
      </section>

      {/* ── Products grid ───────────────────────────────────────────────────── */}
      <section className="flex-1 px-6 md:px-10 py-10">
        <div className="max-w-6xl mx-auto">
          <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-6">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
          {products.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-16">No products listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  batch={batchMap[product.id] ?? null}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Batch schedule — Café Roasters only ─────────────────────────────── */}
      {isCafe && upcomingBatches.length > 0 && (
        <section className="bg-white border-t border-stone-100 px-6 md:px-10 py-10">
          <div className="max-w-4xl mx-auto">
            <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-6">
              Upcoming Batch Schedule
            </p>
            <div className="space-y-3">
              {upcomingBatches.map(b => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-6 rounded-xl border border-stone-100 bg-stone-50 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#34150F] truncate">{b.productName}</p>
                    <p className="text-xs text-stone-400 mt-0.5">Roasting {formatDate(b.roast_date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {b.bags_remaining > 0 ? (
                      <>
                        <p className={`text-sm font-medium ${b.bags_remaining <= 5 ? "text-red-500" : "text-emerald-600"}`}>
                          {b.bags_remaining} bag{b.bags_remaining !== 1 ? "s" : ""} left
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          {b.total_bags - b.bags_remaining} / {b.total_bags} reserved
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-stone-400">Sold out</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-[#34150F] px-6 md:px-10 py-8 text-center mt-auto">
        <span className="font-serif text-lg text-[#C8965A]">KOHĪ</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest">珈琲市 · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
