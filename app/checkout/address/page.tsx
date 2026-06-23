"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/context/CartContext"
import { supabase } from "@/lib/supabase"
import { NavLogo } from "@/components/NavLogo"
import type { ShipcoRate, RoasterRates } from "@/app/api/shipping-rates/route"

export interface ShippingAddress {
  postalCode: string
  prefecture: string
  city: string
  district: string
  building: string
  name: string
  phone: string
}

export interface ShippingSelection {
  roasterName: string
  carrier: string
  service: string
  cost: number
}

type LookupStatus = "idle" | "loading" | "not_found" | "error"
type Phase = "address" | "rates"

const EMPTY: ShippingAddress = {
  postalCode: "",
  prefecture: "",
  city: "",
  district: "",
  building: "",
  name: "",
  phone: "",
}

function carrierLabel(carrier: string) {
  const map: Record<string, string> = {
    yamato: "Yamato Transport",
    japanpost: "Japan Post",
    sagawa: "Sagawa Express",
    fukuyama: "Fukuyama Transporting",
    seino: "Seino Transportation",
    nittsu: "Nippon Express",
  }
  return map[carrier.toLowerCase()] ?? carrier
}

export default function AddressPage() {
  const router = useRouter()
  const cart = useCart()
  const [form, setForm] = useState<ShippingAddress>(EMPTY)
  const [lookup, setLookup] = useState<LookupStatus>("idle")
  const [autoFilled, setAutoFilled] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Rates phase state
  const [phase, setPhase] = useState<Phase>("address")
  const [ratesLoading, setRatesLoading] = useState(false)
  const [ratesError, setRatesError] = useState<string | null>(null)
  const [roasterRates, setRoasterRates] = useState<RoasterRates[]>([])
  const [selectedRates, setSelectedRates] = useState<Record<string, ShipcoRate>>({})

  const [proceedError, setProceedError] = useState<string | null>(null)
  const [proceedSubmitting, setProceedSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id)
    })
  }, [])

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("kohi-address")
      if (saved) setForm(JSON.parse(saved))
    } catch {}
  }, [])

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

  function setAutoFilledField(key: "prefecture" | "city" | "district") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (autoFilled) setAutoFilled(false)
      setForm(f => ({ ...f, [key]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setRatesError(null)
    setRatesLoading(true)

    try {
      sessionStorage.setItem("kohi-address", JSON.stringify(form))

      const res = await fetch("/api/shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form,
          items: cart.items.map(i => ({
            productName: i.productName,
            roasterId: i.roasterId,
            roasterName: i.roasterName,
            quantity: i.quantity,
            price: i.price,
            grams: i.format.grams,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Non-fatal: fall through to the rates phase showing all-fallback
        console.error("[checkout/address] rates error:", data.error)
        setRoasterRates(
          [...new Set(cart.items.map(i => i.roasterName))].map(n => ({
            roasterName: n,
            rates: [],
            fallback: true,
          }))
        )
      } else {
        setRoasterRates(data.rates ?? [])
        // Auto-select cheapest rate per roaster
        const auto: Record<string, ShipcoRate> = {}
        for (const r of data.rates ?? []) {
          if (r.rates.length > 0) {
            auto[r.roasterName] = [...r.rates].sort((a: ShipcoRate, b: ShipcoRate) => a.price - b.price)[0]
          }
        }
        setSelectedRates(auto)
      }

      setPhase("rates")
    } catch (err) {
      console.error("[checkout/address] shipping-rates fetch threw:", err)
      // Fallback — still proceed to rate-selection phase
      setRoasterRates(
        [...new Set(cart.items.map(i => i.roasterName))].map(n => ({
          roasterName: n,
          rates: [],
          fallback: true,
        }))
      )
      setPhase("rates")
    } finally {
      setRatesLoading(false)
    }
  }

  // True when every roaster either has a selected rate or is a fallback
  const allRatesSelected = roasterRates.every(
    r => r.fallback || !!selectedRates[r.roasterName]
  )

  const totalShipping = Object.values(selectedRates).reduce((s, r) => s + r.price, 0)

  async function handleProceed() {
    setProceedError(null)
    setProceedSubmitting(true)
    try {
      const shippingSelections: ShippingSelection[] = roasterRates
        .filter(r => !r.fallback && selectedRates[r.roasterName])
        .map(r => ({
          roasterName: r.roasterName,
          carrier: selectedRates[r.roasterName].carrier,
          service: selectedRates[r.roasterName].service,
          cost: selectedRates[r.roasterName].price,
        }))

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items,
          address: form,
          userId: userId ?? undefined,
          shippingSelections,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to create checkout session")
      window.location.href = data.url
    } catch (err) {
      setProceedError(err instanceof Error ? err.message : "Something went wrong")
      setProceedSubmitting(false)
    }
  }

  const inputCls =
    "w-full text-sm border border-stone-200 rounded-[2px] px-4 py-3 focus:outline-none focus:border-[#C4622D] bg-white"
  const autoFilledInputCls =
    "w-full text-sm border border-emerald-200 rounded-[2px] px-4 py-3 focus:outline-none focus:border-[#C4622D] bg-emerald-50/60 transition-colors"

  return (
    <div className="min-h-screen bg-[#F8F5F2] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F8F5F2] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link
          href="/cart"
          className="flex items-center gap-2 text-[#2A1508] hover:text-[#C4622D] transition-colors text-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Cart
        </Link>
        <Link href="/" className="flex items-center gap-3">
          <NavLogo />
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${phase === "address" ? "bg-[#C4622D] text-white" : "bg-stone-200 text-stone-400"}`}>1</span>
          <span className="w-8 h-px bg-stone-200" />
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${phase === "rates" ? "bg-[#C4622D] text-white" : "bg-stone-200 text-stone-400"}`}>2</span>
          <span className="w-8 h-px bg-stone-200" />
          <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-400 flex items-center justify-center text-[10px] font-medium">3</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#F8F5F2] border-b border-[rgba(42,21,8,0.07)] px-6 md:px-10 pt-12 pb-10">
        <div className="max-w-xl mx-auto">
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-3">
            {phase === "address" ? "Step 1 of 3" : "Step 2 of 3"}
          </p>
          <h1 className="font-serif text-3xl text-[#2A1508] mb-2">
            {phase === "address" ? "Shipping address" : "Select shipping"}
          </h1>
          <p className="text-stone-400 text-xs mt-2 leading-relaxed">
            {phase === "address"
              ? "Enter your delivery address. You'll choose a shipping option on the next screen."
              : "Choose a shipping service for each roaster. You'll confirm payment on the final screen."}
          </p>
        </div>
      </section>

      {/* Body */}
      <div className="flex-1 px-6 md:px-10 py-10 max-w-xl mx-auto w-full">

        {phase === "address" && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Postcode */}
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
                    className="w-full text-sm border border-stone-200 rounded-[2px] pl-9 pr-4 py-3 focus:outline-none focus:border-[#C4622D] bg-white"
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

            {/* Auto-filled address fields */}
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

            {/* Auto-fill note */}
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

            {/* Building */}
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
                className="w-full text-sm border border-amber-200 rounded-[2px] px-4 py-3 focus:outline-none focus:border-[#C4622D] bg-white"
              />
              <p className="text-[11px] text-amber-700 mt-2 leading-relaxed">
                For apartments and buildings, include the building name and room number.
                Leave blank if delivering to a house.
              </p>
            </div>

            {/* Name & phone */}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={ratesLoading || lookup === "loading"}
              className="w-full mt-2 bg-[#2A1508] hover:bg-[#3a2010] disabled:opacity-60 text-white py-4 rounded-[2px] text-sm font-medium tracking-wide transition-colors flex items-center justify-center gap-2"
            >
              {ratesLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Getting shipping rates…
                </>
              ) : (
                "Get Shipping Rates →"
              )}
            </button>

            <p className="text-center text-[11px] text-stone-400 pb-2">
              We'll show you available shipping options before payment.
            </p>

          </form>
        )}

        {phase === "rates" && (
          <div className="space-y-6">

            {/* Address summary + edit link */}
            <div className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-2">Delivering to</p>
                  <p className="text-sm font-medium text-[#2A1508]">{form.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    〒{form.postalCode} {form.prefecture} {form.city} {form.district}
                    {form.building ? ` ${form.building}` : ""}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">{form.phone}</p>
                </div>
                <button
                  onClick={() => setPhase("address")}
                  className="text-xs text-[#C4622D] hover:text-[#B0561A] transition-colors shrink-0"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Rates per roaster */}
            {ratesError && (
              <div className="bg-amber-50 border border-amber-100 rounded-[2px] px-4 py-3">
                <p className="text-xs text-amber-700">{ratesError}</p>
              </div>
            )}

            {roasterRates.map(roaster => (
              <div key={roaster.roasterName} className="bg-white border border-[rgba(42,21,8,0.07)] rounded-[2px] overflow-hidden">
                <div className="px-5 pt-5 pb-3 border-b border-stone-100">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">
                    Shipping from
                  </p>
                  <p className="text-sm font-medium text-[#2A1508] mt-0.5">{roaster.roasterName}</p>
                </div>

                {roaster.fallback ? (
                  <div className="px-5 py-4">
                    <p className="text-xs text-stone-500 italic">
                      {roaster.message ?? "Shipping calculated at dispatch — the roaster will contact you with shipping details."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {roaster.rates.map(rate => {
                      const isSelected =
                        selectedRates[roaster.roasterName]?.carrier === rate.carrier &&
                        selectedRates[roaster.roasterName]?.service === rate.service
                      return (
                        <label
                          key={`${rate.carrier}-${rate.service}`}
                          className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${
                            isSelected ? "bg-[#FDF4EE]" : "hover:bg-stone-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`rate-${roaster.roasterName}`}
                            checked={isSelected}
                            onChange={() =>
                              setSelectedRates(prev => ({ ...prev, [roaster.roasterName]: rate }))
                            }
                            className="accent-[#C4622D]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#2A1508]">{carrierLabel(rate.carrier)}</p>
                            <p className="text-xs text-stone-400 mt-0.5">{rate.service}</p>
                          </div>
                          <p className="text-sm font-medium text-[#2A1508] shrink-0">
                            ¥{rate.price.toLocaleString()}
                          </p>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Shipping total (only when any rates selected) */}
            {totalShipping > 0 && (
              <div className="flex items-baseline justify-between px-1">
                <span className="text-xs text-stone-500">Shipping total</span>
                <span className="text-sm font-medium text-[#2A1508]">
                  ¥{totalShipping.toLocaleString()}
                </span>
              </div>
            )}

            {/* Error */}
            {proceedError && (
              <div className="bg-red-50 border border-red-100 rounded-[2px] px-4 py-3">
                <p className="text-red-600 text-xs leading-relaxed">{proceedError}</p>
              </div>
            )}

            {/* Proceed button */}
            <button
              onClick={handleProceed}
              disabled={!allRatesSelected || proceedSubmitting}
              className="w-full bg-[#2A1508] hover:bg-[#3a2010] disabled:opacity-60 text-white py-4 rounded-[2px] text-sm font-medium tracking-wide transition-colors flex items-center justify-center gap-2"
            >
              {proceedSubmitting ? (
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

          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="bg-[#2A1508] px-6 md:px-10 py-10 text-center mt-auto">
        <span className="text-xl font-medium text-[#C4622D] leading-none tracking-tight"><span className="font-serif">豆</span>MART</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">Mame Mart · Specialty Coffee Marketplace</p>
      </footer>

    </div>
  )
}
