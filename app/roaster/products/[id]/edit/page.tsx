"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { BREW_METHODS, type BrewMethodKey } from "@/lib/brewGuide"

const ROAST_LEVELS = ["Light", "Medium", "Dark"] as const
const PROCESSES = ["Washed", "Natural", "Honey", "Anaerobic", "Other"]

const FORMAT_PRESETS: Array<{ name: string; grams: number }> = [
  { name: "Whole Bean 100g", grams: 100 },
  { name: "Whole Bean 200g", grams: 200 },
  { name: "Whole Bean 500g", grams: 500 },
  { name: "Ground — Espresso", grams: 200 },
  { name: "Ground — Pour-over", grams: 200 },
  { name: "Ground — French Press", grams: 200 },
  { name: "Ground — Moka", grams: 200 },
  { name: "Drip Bag (single)", grams: 0 },
  { name: "Drip Bag ×10", grams: 0 },
]

const inputClass =
  "w-full px-4 py-3 border border-stone-200 rounded-[2px] text-sm text-[#2A1A0E] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C4714A] transition-colors"

const GRIND_OPTIONS = ["Extra Fine", "Fine", "Medium Fine", "Medium", "Coarse", "Extra Coarse"]

interface Format {
  name: string
  grams: string
  price: string
}

interface Profile {
  roaster_name: string
  region: string
  seller_type: string
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E8E2D8] rounded-[2px] p-6">
      <h2 className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-5">{title}</h2>
      {children}
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs tracking-widest uppercase text-stone-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-stone-300 mt-1.5">{hint}</p>}
    </div>
  )
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = Number(params.id)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [productName, setProductName] = useState("")
  const [productNameJp, setProductNameJp] = useState("")
  const [origin, setOrigin] = useState("")
  const [process, setProcess] = useState("")
  const [roastLevel, setRoastLevel] = useState<"Light" | "Medium" | "Dark" | "">("")
  const [altitude, setAltitude] = useState("")
  const [description, setDescription] = useState("")
  const [formats, setFormats] = useState<Format[]>([{ name: "", grams: "", price: "" }])
  const [notes, setNotes] = useState<string[]>([])
  const [noteInput, setNoteInput] = useState("")
  const [brewNotes, setBrewNotes] = useState<Partial<Record<BrewMethodKey, { grind: string; ratio: string; temp: string; time: string; tips: string }>>>({})
  const [brewNotesOpen, setBrewNotesOpen] = useState<BrewMethodKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [savedName, setSavedName] = useState("")

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/roaster/login"); return }

      const [{ data: profileData }, { data: product }] = await Promise.all([
        supabase.from("roasters").select("roaster_name, region, seller_type").eq("id", session.user.id).single(),
        supabase.from("products").select("*").eq("id", productId).eq("roaster_id", session.user.id).single(),
      ])

      if (!product) {
        setNotFound(true)
        setIsLoading(false)
        return
      }

      setProfile(profileData)
      setProductName(product.product_name ?? "")
      setProductNameJp(product.product_name_jp ?? "")
      setOrigin(product.origin ?? "")
      setProcess(product.process ?? "")
      setRoastLevel(product.roast_level as "Light" | "Medium" | "Dark" ?? "")
      setAltitude(product.altitude ?? "")
      setDescription(product.description ?? "")
      setNotes(product.flavour_notes ?? [])
      // Load existing brew notes, converting tips array → newline-separated string for textarea
      if (product.brew_notes && typeof product.brew_notes === "object") {
        const loaded: typeof brewNotes = {}
        for (const [key, val] of Object.entries(product.brew_notes as Record<string, Record<string, unknown>>)) {
          loaded[key as BrewMethodKey] = {
            grind: String(val?.grind ?? ""),
            ratio: String(val?.ratio ?? ""),
            temp: String(val?.temp ?? "").replace(/°C$/i, ""),
            time: String(val?.time ?? ""),
            tips: Array.isArray(val?.tips) ? val.tips.join("\n") : String(val?.tips ?? ""),
          }
        }
        setBrewNotes(loaded)
      }
      setFormats(
        product.formats?.length
          ? product.formats.map((f: { name: string; grams: number; price: number }) => ({
              name: f.name,
              grams: String(f.grams ?? ""),
              price: String(f.price),
            }))
          : [{ name: "", grams: "", price: "" }]
      )
      setIsLoading(false)
    }
    load()
  }, [router, productId])

  function commitNote() {
    const trimmed = noteInput.trim().replace(/,$/, "")
    if (trimmed && !notes.includes(trimmed)) {
      setNotes(prev => [...prev, trimmed])
    }
    setNoteInput("")
  }

  function handleNoteKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      commitNote()
    }
    if (e.key === "Backspace" && noteInput === "" && notes.length > 0) {
      setNotes(prev => prev.slice(0, -1))
    }
  }

  function updateBrewNote(method: BrewMethodKey, field: string, value: string) {
    setBrewNotes(prev => ({ ...prev, [method]: { ...prev[method], [field]: value } }))
  }

  function addFormat() {
    setFormats(prev => [...prev, { name: "", grams: "", price: "" }])
  }

  function removeFormat(i: number) {
    if (formats.length > 1) setFormats(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateFormat(i: number, field: keyof Format, value: string) {
    setFormats(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f))
  }

  function addPreset(preset: { name: string; grams: number }) {
    setFormats(prev => {
      // Replace the initial empty row; otherwise always append
      if (prev.length === 1 && !prev[0].name && !prev[0].price) {
        return [{ name: preset.name, grams: preset.grams ? String(preset.grams) : "", price: "" }]
      }
      return [...prev, { name: preset.name, grams: preset.grams ? String(preset.grams) : "", price: "" }]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roastLevel) { setError("Please select a roast level."); return }
    if (notes.length === 0) { setError("Please add at least one flavour note."); return }
    if (formats.some(f => !f.name.trim() || !f.price)) {
      setError("Please fill in the name and price for every format.")
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !profile) { router.replace("/roaster/login"); return }

    setLoading(true)
    setError(null)

    const parsedFormats = formats.map(f => ({
      name: f.name.trim(),
      grams: Number(f.grams) || 0,
      price: Number(f.price),
    }))

    const parsedBrewNotes = Object.fromEntries(
      Object.entries(brewNotes)
        .filter(([, v]) => v && Object.values(v).some(s => s.trim()))
        .map(([k, v]) => [k, {
          ...(v?.grind?.trim() ? { grind: v.grind.trim() } : {}),
          ...(v?.ratio?.trim() ? { ratio: v.ratio.trim() } : {}),
          ...(v?.temp?.trim()  ? { temp:  `${v.temp.trim()}°C`  } : {}),
          ...(v?.time?.trim()  ? { time:  v.time.trim()  } : {}),
          ...(v?.tips?.trim()  ? { tips:  v.tips.trim().split("\n").map(s => s.trim()).filter(Boolean) } : {}),
        }])
    )

    const { error: updateError } = await supabase
      .from("products")
      .update({
        product_name: productName.trim(),
        product_name_jp: productNameJp.trim() || null,
        origin: origin.trim(),
        process,
        roast_level: roastLevel,
        altitude: altitude.trim() || null,
        flavour_notes: notes,
        description: description.trim(),
        price: Math.min(...parsedFormats.map(f => f.price)),
        formats: parsedFormats,
        brew_notes: Object.keys(parsedBrewNotes).length ? parsedBrewNotes : null,
      })
      .eq("id", productId)
      .eq("roaster_id", session.user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    if (profile.seller_type === "Café Roaster") {
      setSavedName(productName.trim())
      setSaved(true)
      setLoading(false)
    } else {
      router.push("/roaster/dashboard")
    }
  }

  if (saved) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
        <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-serif text-xl text-[#2A1A0E] leading-none">珈琲市</span>
            <span className="text-[11px] text-stone-300 tracking-[0.18em] font-light leading-none mt-0.5">KOHĪ</span>
          </Link>
          <span className="text-xs text-stone-400 tracking-widest uppercase hidden sm:block">Roaster Portal</span>
        </nav>
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-[2px] bg-emerald-100 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-serif text-2xl text-[#2A1A0E] mb-2">Changes saved!</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                <span className="font-medium text-[#2A1A0E]">{savedName}</span> has been updated.
                Remember to update your <span className="font-medium text-[#2A1A0E]">Batch Schedule</span> in
                the dashboard if needed.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/roaster/dashboard?tab=batches"
                className="bg-[#C4714A] hover:bg-[#B05E3C] text-white text-sm px-6 py-3 rounded-[2px] font-medium tracking-wide transition-colors"
              >
                Go to Batch Schedule →
              </Link>
              <Link
                href="/roaster/dashboard"
                className="border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 text-sm px-6 py-3 rounded-[2px] transition-colors"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C4714A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center gap-4">
        <p className="text-stone-500 text-sm">Product not found or you don't have permission to edit it.</p>
        <Link href="/roaster/dashboard" className="text-xs text-[#C4714A] hover:text-[#B05E3C] transition-colors">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8] border-b border-stone-200 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="font-serif text-xl text-[#2A1A0E] leading-none">珈琲市</span>
          <span className="text-[11px] text-stone-300 tracking-[0.18em] font-light leading-none mt-0.5">KOHĪ</span>
        </Link>
        <span className="text-xs text-stone-400 tracking-widest uppercase">Roaster Portal</span>
      </nav>

      {/* Header */}
      <div className="bg-[#FAFAF8] border-b border-[#E8E2D8] px-6 md:px-10 pt-10 pb-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/roaster/dashboard" className="text-xs text-stone-400 hover:text-[#C4714A] transition-colors mb-4 inline-block">← Back to dashboard</Link>
          <h1 className="font-serif text-3xl text-[#2A1A0E]">Edit Product</h1>
          <p className="text-sm text-stone-400 font-light mt-1">Changes will update your live marketplace listing.</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 md:px-10 py-10 max-w-2xl mx-auto w-full">
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return
            const t = e.target as HTMLElement
            if (t.tagName === "TEXTAREA") return
            if (t.tagName === "BUTTON" && (t as HTMLButtonElement).type === "submit") return
            e.preventDefault()
          }}
          className="space-y-6"
        >

          {/* Basic info */}
          <SectionCard title="Basic Information">
            <div className="space-y-4">
              <Field label="Product Name (EN)" required>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="e.g. Ethiopia Yirgacheffe"
                  className={inputClass}
                />
              </Field>

              <Field label="Product Name (JP)">
                <input
                  type="text"
                  value={productNameJp}
                  onChange={e => setProductNameJp(e.target.value)}
                  placeholder="e.g. エチオピア イルガチェフェ"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Origin" required>
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={e => setOrigin(e.target.value)}
                    placeholder="e.g. Ethiopia"
                    className={inputClass}
                  />
                </Field>

                <Field label="Process" required>
                  <div className="relative">
                    <select
                      required
                      value={process}
                      onChange={e => setProcess(e.target.value)}
                      className={`${inputClass} appearance-none pr-10`}
                    >
                      <option value="" disabled>Select…</option>
                      {PROCESSES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Roast Level" required>
                  <div className="flex gap-2">
                    {ROAST_LEVELS.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setRoastLevel(level)}
                        className={`flex-1 py-2.5 rounded-[2px] border text-sm transition-all ${
                          roastLevel === level
                            ? "border-[#C4714A] bg-amber-50 text-[#2A1A0E] font-medium"
                            : "border-stone-200 text-stone-500 hover:border-stone-300 bg-white"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Altitude">
                  <input
                    type="text"
                    value={altitude}
                    onChange={e => setAltitude(e.target.value)}
                    placeholder="e.g. 1,800–2,200m"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* Flavour notes */}
          <SectionCard title="Flavour Notes">
            <Field
              label="Notes"
              required
              hint="Press Enter or comma to add each note — e.g. Blueberry, Jasmine, Citrus"
            >
              <div
                className="flex flex-wrap gap-2 px-3 py-2 border border-stone-200 rounded-[2px] bg-white focus-within:border-[#C4714A] transition-colors min-h-[52px] cursor-text"
                onClick={() => document.getElementById("note-input")?.focus()}
              >
                {notes.map(note => (
                  <span
                    key={note}
                    className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-[2px]"
                  >
                    {note}
                    <button
                      type="button"
                      onClick={() => setNotes(prev => prev.filter(n => n !== note))}
                      className="hover:text-amber-600 leading-none ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  id="note-input"
                  type="text"
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={handleNoteKeyDown}
                  onBlur={commitNote}
                  placeholder={notes.length === 0 ? "Type a note and press Enter…" : ""}
                  className="flex-1 min-w-[140px] text-sm text-[#2A1A0E] placeholder-stone-300 outline-none bg-transparent py-1"
                />
              </div>
            </Field>
          </SectionCard>

          {/* Description */}
          <SectionCard title="Description">
            <Field label="About this coffee" required>
              <textarea
                required
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the flavour profile, farm, and what makes this coffee special…"
                className={`${inputClass} resize-none`}
              />
            </Field>
          </SectionCard>

          {/* Formats */}
          <SectionCard title="Formats & Pricing">
            <div className="space-y-5">

              {/* Quick-add presets */}
              <div>
                <p className="text-[11px] text-stone-400 mb-2.5">Quick-add common formats:</p>
                <div className="flex flex-wrap gap-2">
                  {FORMAT_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => addPreset(preset)}
                      className="text-[11px] px-3 py-1.5 rounded-[2px] border border-stone-200 text-stone-500 hover:border-[#C4714A] hover:text-[#C4714A] transition-colors bg-white"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format rows */}
              {formats.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_80px_90px_24px] gap-3">
                    <p className="text-[11px] text-stone-400 uppercase tracking-widest">Format name *</p>
                    <p className="text-[11px] text-stone-400 uppercase tracking-widest">Grams</p>
                    <p className="text-[11px] text-stone-400 uppercase tracking-widest">Price ¥ *</p>
                    <span />
                  </div>
                  {formats.map((fmt, i) => {
                    const drip = fmt.name.toLowerCase().includes("drip")
                    const priceVal = parseInt(fmt.price, 10)
                    const hasPrice = !isNaN(priceVal) && priceVal > 0
                    const commissionRate = profile?.seller_type === "Café Roaster" ? 0.10 : 0.12
                    const commissionPct = Math.round(commissionRate * 100)
                    const payout = hasPrice ? priceVal - Math.round(priceVal * commissionRate) : null
                    return (
                      <div key={i} className="space-y-1">
                        <div className="grid grid-cols-[1fr_80px_90px_24px] gap-3 items-center">
                          <input
                            type="text"
                            required
                            value={fmt.name}
                            onChange={e => updateFormat(i, "name", e.target.value)}
                            placeholder="e.g. Whole Bean"
                            className={inputClass}
                          />
                          {drip ? (
                            <span className="text-stone-300 text-xs px-4 py-3 text-center">—</span>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              value={fmt.grams}
                              onChange={e => updateFormat(i, "grams", e.target.value)}
                              placeholder="200"
                              className={inputClass}
                            />
                          )}
                          <input
                            type="number"
                            min="0"
                            required
                            value={fmt.price}
                            onChange={e => updateFormat(i, "price", e.target.value)}
                            placeholder="1800"
                            className={inputClass}
                          />
                          <button
                            type="button"
                            onClick={() => removeFormat(i)}
                            disabled={formats.length === 1}
                            className="text-stone-300 hover:text-red-400 transition-colors text-xl leading-none disabled:opacity-30"
                          >
                            ×
                          </button>
                        </div>
                        {payout !== null && (
                          <p className="text-[10px] text-[#C4714A] font-light text-right pr-9">
                            You receive ¥{payout.toLocaleString()} after {commissionPct}% commission
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={addFormat}
                className="text-xs text-[#C4714A] hover:text-[#B05E3C] transition-colors"
              >
                + Add custom format
              </button>
            </div>
          </SectionCard>

          {/* Brew Guide Notes */}
          <SectionCard title="Brew Guide Notes (optional)">
            <div className="space-y-3">
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Add specific brewing instructions for this coffee. Leave blank and sensible defaults based on roast and process will be shown to customers.
              </p>
              {BREW_METHODS.map(method => {
                const isOpen = brewNotesOpen === method.key
                const entry = brewNotes[method.key]
                const hasSomething = entry && Object.values(entry).some(s => s.trim())
                return (
                  <div key={method.key} className="border border-stone-200 rounded-[2px] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setBrewNotesOpen(isOpen ? null : method.key)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm text-[#2A1A0E] font-medium">{method.label}</span>
                        <span className="text-[11px] text-stone-400 font-light">{method.devices}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasSomething && <span className="text-[10px] text-[#C4714A] font-medium">Notes added</span>}
                        <svg className={`h-4 w-4 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 bg-stone-50 border-t border-stone-100 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Grind size">
                            <div className="relative">
                              <select
                                value={entry?.grind ?? ""}
                                onChange={e => updateBrewNote(method.key, "grind", e.target.value)}
                                className={`${inputClass} appearance-none pr-10`}
                              >
                                <option value="">Select…</option>
                                {GRIND_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                              <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </Field>
                          <Field label="Ratio">
                            <input
                              type="text"
                              value={entry?.ratio ?? ""}
                              onChange={e => updateBrewNote(method.key, "ratio", e.target.value)}
                              placeholder="e.g. 1 : 15"
                              className={inputClass}
                            />
                          </Field>
                          <Field label="Water temperature (°C)">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={entry?.temp ?? ""}
                              onChange={e => updateBrewNote(method.key, "temp", e.target.value)}
                              placeholder="93"
                              className={inputClass}
                            />
                          </Field>
                          <Field label="Brew time">
                            <input
                              type="text"
                              value={entry?.time ?? ""}
                              onChange={e => updateBrewNote(method.key, "time", e.target.value)}
                              placeholder="e.g. 3–4 min"
                              className={inputClass}
                            />
                          </Field>
                        </div>
                        <Field label="Tips" hint="One tip per line — shown as bullet points on the product page">
                          <textarea
                            rows={3}
                            value={entry?.tips ?? ""}
                            onChange={e => updateBrewNote(method.key, "tips", e.target.value)}
                            placeholder={"Bloom 30s before pouring\nAim for a flat coffee bed at draw-down"}
                            className={`${inputClass} resize-none`}
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </SectionCard>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-[2px] px-4 py-3">
              <p className="text-red-600 text-xs leading-relaxed">{error}</p>
            </div>
          )}

          <div className="flex gap-4 pb-6">
            <Link
              href="/roaster/dashboard"
              className="flex-1 text-center py-3.5 rounded-[2px] text-sm text-stone-400 border border-stone-200 hover:border-stone-300 hover:text-stone-600 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#C4714A] hover:bg-[#B05E3C] disabled:opacity-60 text-white py-3.5 rounded-[2px] text-sm font-medium tracking-wide transition-colors"
            >
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>

        </form>
      </div>

      {/* Footer */}
      <footer className="bg-[#2A1A0E] px-6 md:px-10 py-8 text-center mt-auto">
        <span className="font-serif text-lg text-[#C4714A]">珈琲市</span>
        <p className="text-stone-600 text-xs mt-1 tracking-widest font-light">KOHĪ · Roaster Portal</p>
      </footer>
    </div>
  )
}
