"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/context/CartContext"

export interface ShippingAddress {
  postalCode: string
  prefecture: string
  city: string
  district: string
  building: string
  name: string
  phone: string
}

type LookupStatus = "idle" | "loading" | "not_found" | "error"

const EMPTY: ShippingAddress = {
  postalCode: "",
  prefecture: "",
  city: "",
  district: "",
  building: "",
  name: "",
  phone: "",
}

export default function AddressPage() {
  const router = useRouter()
  const cart = useCart()
  const [form, setForm] = useState<ShippingAddress>(EMPTY)
  const [lookup, setLookup] = useState<LookupStatus>("idle")
  const [autoFilled, setAutoFilled] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore from sessionStorage (after mount to avoid hydration mismatch)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("kohi-address")
      if (saved) setForm(JSON.parse(saved))
    } catch {}
  }, [])

  // Guard: send empty-cart visitors back
  useEffect(() => {
    if (cart.items.length === 0) router.replace("/cart")
  }, [cart.items.length, router])

  async function lookupPostcode(digits: string) {
    setLookup("loading")
    try {
      const res = await fetch(
        `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`
      )
      const data = await res.json()
      if (data.results?.length > 0) {
        const r = data.results[0]
        setForm(f => ({
          ...f,
          prefecture: r.address1 ?? f.prefecture,
          city: r.address2 ?? f.city,
          district: r.address3 ?? f.district,
        }))
        setLookup("idle")
        setAutoFilled(true)
      } else {
        setLookup("not_found")
      }
    } catch {
      setLookup("error")
    }
  }

  function handlePostcodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setForm(f => ({ ...f, postalCode: raw }))
    const digits = raw.replace(/\D/g, "")
    if (digits.length === 7) {
      setAutoFilled(false)
      lookupPostcode(digits)
    } else {
      if (lookup !== "idle") setLookup("idle")
      if (autoFilled) setAutoFilled(false)
    }
  }

  function set(key: keyof ShippingAddress) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  // Like set(), but also clears the autoFilled highlight when the user edits
  // one of the three zipcloud-populated fields
  function setAutoFilledField(key: "prefecture" | "city" | "district") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (autoFilled) setAutoFilled(false)
      setForm(f => ({ ...f, [key]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      sessionStorage.setItem("kohi-address", JSON.stringify(form))
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.items, address: form }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to create checkout session")
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setSubmitting(false)
    }
  }

  const inputCls =
    "w-full text-sm border border-stone-200 rounded-[2px] px-4 py-3 focus:outline-none focus:border-[#C4714A] bg-white"

  // Applied to the three zipcloud-populated fields while autoFilled is true
  const autoFilledInputCls =
    "w-full text-sm border border-emerald-200 rounded-[2px] px-4 py-3 focus:outline-none focus:border-[#C4714A] bg-emerald-50/60 transition-colors"

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link
          href="/cart"
          className="flex items-center gap-2 text-[#2A1A0E] hover:text-[#C4714A] transition-colors text-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Cart
        </Link>
        <Link href="/" className="flex items-center gap-3">
          <span className="text-xl font-medium text-[#2A1A0E] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        </Link>
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
          <span className="w-5 h-5 rounded-full bg-[#C4714A] text-white flex items-center justify-center text-[10px] font-medium">1</span>
          <span className="w-8 h-px bg-stone-200" />
          <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-400 flex items-center justify-center text-[10px] font-medium">2</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#FAFAF8] border-b border-[#E8E2D8] px-6 md:px-10 pt-12 pb-10">
        <div className="max-w-xl mx-auto">
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3">Step 1 of 2</p>
          <h1 className="font-serif text-3xl text-[#2A1A0E] mb-2">Shipping address</h1>
          <p className="text-stone-400 text-xs mt-2 leading-relaxed">
            Enter your delivery address. You'll confirm payment on the next screen.
          </p>
        </div>
      </section>

      {/* Form */}
      <div className="flex-1 px-6 md:px-10 py-10 max-w-xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Postcode ─────────────────────────────────────────────────── */}
          <div>
            <label htmlFor="postalCode" className="block text-xs text-stone-500 mb-1.5">
              郵便番号 <span className="text-stone-400">(Postal code)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="relative max-w-[176px]">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm select-none pointer-events-none">
                  〒
                </span>
                <input
                  id="postalCode"
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={8}
                  value={form.postalCode}
                  onChange={handlePostcodeChange}
                  placeholder="1500001"
                  className="w-full text-sm border border-stone-200 rounded-[2px] pl-9 pr-4 py-3 focus:outline-none focus:border-[#C4714A] bg-white"
                />
              </div>
              <div className="text-xs min-h-[1rem]">
                {lookup === "loading" && (
                  <span className="text-stone-400 flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 border border-stone-400 border-t-transparent rounded-full animate-spin" />
                    Looking up…
                  </span>
                )}
                {lookup === "not_found" && (
                  <span className="text-amber-600">Postcode not found</span>
                )}
                {lookup === "error" && (
                  <span className="text-red-500">Lookup failed — fill in manually</span>
                )}
                {lookup === "idle" && form.prefecture && (
                  <span className="text-emerald-600">Address filled ✓</span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5">
              Enter 7 digits to auto-fill prefecture, city, and district below
            </p>
          </div>

          {/* ── Auto-filled address fields ────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="prefecture" className="block text-xs text-stone-500 mb-1.5">
                都道府県 <span className="text-stone-400">(Prefecture)</span>
              </label>
              <input
                id="prefecture"
                type="text"
                required
                value={form.prefecture}
                onChange={setAutoFilledField("prefecture")}
                placeholder="東京都"
                className={autoFilled ? autoFilledInputCls : inputCls}
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-xs text-stone-500 mb-1.5">
                市区町村 <span className="text-stone-400">(City / Ward)</span>
              </label>
              <input
                id="city"
                type="text"
                required
                value={form.city}
                onChange={setAutoFilledField("city")}
                placeholder="渋谷区"
                className={autoFilled ? autoFilledInputCls : inputCls}
              />
            </div>
            <div>
              <label htmlFor="district" className="block text-xs text-stone-500 mb-1.5">
                町名・番地 <span className="text-stone-400">(District)</span>
              </label>
              <input
                id="district"
                type="text"
                required
                value={form.district}
                onChange={setAutoFilledField("district")}
                placeholder="神南 1-2-3"
                className={autoFilled ? autoFilledInputCls : inputCls}
              />
            </div>
          </div>

          {/* ── Japanese auto-fill note ───────────────────────────────────── */}
          {autoFilled && (
            <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 rounded-[2px] px-4 py-3">
              <svg className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-stone-600">
                  Address auto-filled in Japanese — this is correct for Japanese delivery.
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Click any field above to edit it if the text looks incorrect.
                </p>
              </div>
            </div>
          )}

          {/* ── Building — highlighted as important ──────────────────────── */}
          <div className="bg-amber-50 border border-amber-100 rounded-[2px] p-5">
            <label htmlFor="building" className="block text-xs font-medium text-amber-800 mb-1.5">
              建物名・部屋番号{" "}
              <span className="font-normal text-amber-700">(Building name & room number)</span>
            </label>
            <input
              id="building"
              type="text"
              value={form.building}
              onChange={set("building")}
              placeholder="e.g. コーヒービル 301 / Kohī Building Apt. 301"
              className="w-full text-sm border border-amber-200 rounded-[2px] px-4 py-3 focus:outline-none focus:border-[#C4714A] bg-white"
            />
            <p className="text-[11px] text-amber-700 mt-2 leading-relaxed">
              For apartments and buildings, include the building name and room number.
              Leave blank if delivering to a house.
            </p>
          </div>

          {/* ── Name & phone ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-xs text-stone-500 mb-1.5">
                お名前 <span className="text-stone-400">(Full name)</span>
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={form.name}
                onChange={set("name")}
                placeholder="山田 太郎 / Taro Yamada"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs text-stone-500 mb-1.5">
                電話番号 <span className="text-stone-400">(Phone number)</span>
              </label>
              <input
                id="phone"
                type="tel"
                required
                inputMode="numeric"
                autoComplete="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="090-1234-5678"
                className={inputCls}
              />
            </div>
          </div>

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-[2px] px-4 py-3">
              <p className="text-red-600 text-xs leading-relaxed">{error}</p>
            </div>
          )}

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting || lookup === "loading"}
            className="w-full mt-2 bg-[#2A1A0E] hover:bg-[#3a2010] disabled:opacity-60 text-white py-4 rounded-[2px] text-sm font-medium tracking-wide transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Redirecting to payment…
              </>
            ) : (
              "Continue to Payment →"
            )}
          </button>

          <p className="text-center text-[11px] text-stone-400 pb-2">
            You'll review your order and pay securely on the next screen via Stripe.
          </p>

        </form>
      </div>

      {/* Footer */}
      <footer className="bg-[#2A1A0E] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="text-xl font-medium text-[#C4714A] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">Mame Mart · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
