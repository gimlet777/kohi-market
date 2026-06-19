"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { NavLogo } from "@/components/NavLogo"
import type { ProductRow } from "@/lib/products"

const inputClass =
  "w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1508] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4622D] transition-colors"

function ListBatchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const isEditing = !!editId

  const [userId, setUserId] = useState<string | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [mode, setMode] = useState<"now" | "schedule">("schedule")
  const [productId, setProductId] = useState("")
  const [roastDate, setRoastDate] = useState("")
  const [totalBags, setTotalBags] = useState("")

  const [originalTotal, setOriginalTotal] = useState(0)
  const [originalRemaining, setOriginalRemaining] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/roaster/login"); return }
      setUserId(session.user.id)

      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("roaster_id", session.user.id)
        .order("product_name")

      setProducts(productsData ?? [])

      if (editId) {
        const { data: batchData } = await supabase
          .from("batches")
          .select("*")
          .eq("id", editId)
          .eq("roaster_id", session.user.id)
          .single()

        if (batchData) {
          setProductId(String(batchData.product_id))
          setMode(batchData.available_now ? "now" : "schedule")
          setRoastDate(batchData.roast_date ?? "")
          setTotalBags(String(batchData.total_bags))
          setOriginalTotal(batchData.total_bags)
          setOriginalRemaining(batchData.bags_remaining)
        }
      }

      setIsLoading(false)
    }
    load()
  }, [router, editId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !productId || !totalBags) {
      setError("Please fill in all required fields.")
      return
    }
    if (mode === "schedule" && !roastDate) {
      setError("Please select a roast date.")
      return
    }

    const total = parseInt(totalBags, 10)
    if (isNaN(total) || total <= 0) {
      setError("Total bags must be a positive number.")
      return
    }

    setSubmitting(true)
    setError(null)

    if (isEditing && editId) {
      const delta = total - originalTotal
      const newRemaining = Math.max(0, originalRemaining + delta)

      const { error: updateError } = await supabase
        .from("batches")
        .update({
          product_id: parseInt(productId, 10),
          roast_date: mode === "schedule" ? roastDate : null,
          available_now: mode === "now",
          total_bags: total,
          bags_remaining: newRemaining,
        })
        .eq("id", editId)
        .eq("roaster_id", userId)

      if (updateError) {
        setError(updateError.message)
        setSubmitting(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from("batches")
        .insert({
          roaster_id: userId,
          product_id: parseInt(productId, 10),
          roast_date: mode === "schedule" ? roastDate : null,
          available_now: mode === "now",
          total_bags: total,
          bags_remaining: total,
          status: "open",
        })

      if (insertError) {
        setError(insertError.message)
        setSubmitting(false)
        return
      }
    }

    router.push("/roaster/dashboard?tab=batches")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C4622D] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F5F2] flex flex-col">

      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <NavLogo />
        </Link>
        <span className="text-xs text-stone-400 tracking-widest uppercase">Roaster Portal</span>
      </nav>

      <div className="bg-[#F8F5F2] border-b border-[rgba(42,21,8,0.07)] px-6 md:px-10 pt-10 pb-8">
        <div className="max-w-lg mx-auto">
          <Link href="/roaster/dashboard?tab=batches" className="text-xs text-stone-400 hover:text-[#C4622D] transition-colors mb-4 inline-block">
            ← Back to dashboard
          </Link>
          <h1 className="font-serif text-3xl text-[#2A1508]">
            {isEditing ? "Edit Batch" : "List a Batch"}
          </h1>
          <p className="text-sm text-stone-400 font-light mt-1">
            {isEditing
              ? "Update the roast date, quantity, or product for this batch."
              : "Select a product and fill in the roast details to open pre-orders."}
          </p>
        </div>
      </div>

      <div className="flex-1 px-6 md:px-10 py-10 max-w-lg mx-auto w-full">
        {products.length === 0 ? (
          <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-10 text-center">
            <p className="text-sm text-stone-400 mb-1">No products in your catalog yet</p>
            <p className="text-xs text-stone-300 mb-6">Add a product before listing a batch.</p>
            <Link
              href="/roaster/products/new"
              className="bg-[#C4622D] hover:bg-[#B0561A] text-white text-sm px-6 py-3 rounded-[2px] font-medium transition-colors"
            >
              Add a Product →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Active-orders warning when editing a batch with sales */}
            {isEditing && originalTotal > originalRemaining && (
              <div className="bg-amber-50 border border-amber-200 rounded-[2px] px-4 py-3 flex gap-3 items-start">
                <span className="text-amber-500 text-base leading-none mt-0.5">⚠</span>
                <p className="text-xs text-amber-700">
                  <span className="font-medium">{originalTotal - originalRemaining} bag{originalTotal - originalRemaining !== 1 ? "s" : ""} from this batch have already been ordered.</span>{" "}
                  Changes to quantity or price may affect pending orders. Reducing total bags below what's been sold is not recommended.
                </p>
              </div>
            )}

            {/* Product */}
            <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-6">
              <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-5">Product</h2>
              <div>
                <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">
                  Select product <span className="text-red-400 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={productId}
                    onChange={e => setProductId(e.target.value)}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="">Select a product…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_name}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-6 space-y-5">
              <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Availability</h2>

              <div className="grid grid-cols-2 gap-2">
                {(["now", "schedule"] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setError(null) }}
                    className={`py-2.5 px-3 rounded-[2px] text-sm border transition-colors text-left ${
                      mode === m
                        ? "bg-[#2A1508] text-white border-[#2A1508]"
                        : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {m === "now" ? "In stock now" : "Schedule a roast"}
                  </button>
                ))}
              </div>

              {mode === "schedule" && (
                <div>
                  <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">
                    Roast date <span className="text-red-400 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={roastDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setRoastDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">
                  {mode === "now" ? "Bags available" : "Total bags"} <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 20"
                  value={totalBags}
                  onChange={e => setTotalBags(e.target.value)}
                  className={inputClass}
                />
                {isEditing && originalTotal > 0 && (
                  <p className="text-[11px] text-stone-400 mt-1.5">
                    Currently {originalTotal} total · {originalRemaining} remaining. Adjusting quantity updates bags remaining proportionally.
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-[2px] px-4 py-3">
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            <div className="flex gap-4 pb-6">
              <Link
                href="/roaster/dashboard?tab=batches"
                className="flex-1 text-center py-3.5 rounded-[2px] text-sm text-stone-400 border border-stone-200 hover:border-stone-300 hover:text-stone-600 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#C4622D] hover:bg-[#B0561A] disabled:opacity-60 text-white py-3.5 rounded-[2px] text-sm font-medium tracking-wide transition-colors"
              >
                {submitting
                  ? (isEditing ? "Saving…" : "Listing…")
                  : isEditing
                    ? "Save changes"
                    : mode === "now" ? "Add in-stock batch" : "Schedule batch"}
              </button>
            </div>

          </form>
        )}
      </div>

      <footer className="bg-[#2A1508] px-6 md:px-10 py-8 text-center mt-auto">
        <span className="text-lg font-medium text-[#C4622D] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">Mame Mart · Roaster Portal</p>
      </footer>
    </div>
  )
}

export default function ListBatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F5F2]" />}>
      <ListBatchContent />
    </Suspense>
  )
}
