"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

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
  "w-full px-4 py-3 border border-stone-200 rounded-xl text-sm text-[#34150F] placeholder-stone-300 bg-white focus:outline-none focus:border-[#C8965A] transition-colors"

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
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <h2 className="text-xs tracking-widest uppercase text-stone-400 mb-5">{title}</h2>
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

export default function NewProductPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [savedName, setSavedName] = useState("")

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/roaster/login"); return }
      const { data } = await supabase
        .from("roasters")
        .select("roaster_name, region, seller_type")
        .eq("id", session.user.id)
        .single()
      setProfile(data)
      setIsLoadingProfile(false)
    }
    load()
  }, [router])

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

  function resetForm() {
    setProductName("")
    setProductNameJp("")
    setOrigin("")
    setProcess("")
    setRoastLevel("")
    setAltitude("")
    setDescription("")
    setFormats([{ name: "", grams: "", price: "" }])
    setNotes([])
    setNoteInput("")
    setError(null)
    setSaved(false)
    setSavedName("")
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

    const payload = {
      roaster_id: session.user.id,
      roaster_name: profile.roaster_name,
      region: profile.region,
      seller_type: profile.seller_type,
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
      batch_info: null,
    }

    console.log("Inserting product:", payload)
    const { error: insertError } = await supabase.from("products").insert(payload)

    if (insertError) {
      console.error("Insert error:", insertError)
      setError(insertError.message)
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
      <div className="min-h-screen bg-[#f7f5f2] flex flex-col">
        <nav className="bg-[#34150F] px-6 md:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl text-[#C8965A] tracking-wide">KOHĪ</Link>
          <span className="text-xs text-stone-500 tracking-widest uppercase hidden sm:block">Roaster Portal</span>
        </nav>
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-serif text-2xl text-[#34150F] mb-2">Product listed!</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                <span className="font-medium text-[#34150F]">{savedName}</span> is now on the marketplace.
                Go to <span className="font-medium text-[#34150F]">Batch Schedule</span> in your dashboard
                to schedule your first roast date and open pre-orders.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/roaster/dashboard?tab=batches"
                className="bg-[#C8965A] hover:bg-[#B8854C] text-white text-sm px-6 py-3 rounded-full font-medium tracking-wide transition-colors"
              >
                Go to Batch Schedule →
              </Link>
              <button
                onClick={resetForm}
                className="border border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 text-sm px-6 py-3 rounded-full transition-colors"
              >
                Add another product
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C8965A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f5f2] flex flex-col">

      {/* Nav */}
      <nav className="bg-[#34150F] px-6 md:px-10 py-4 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-[#C8965A] tracking-wide">
          KOHĪ
        </Link>
        <span className="text-xs text-stone-500 tracking-widest uppercase">Roaster Portal</span>
      </nav>

      {/* Header */}
      <div className="bg-[#34150F] px-6 md:px-10 py-10">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/roaster/dashboard"
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors mb-4 inline-block"
          >
            ← Back to dashboard
          </Link>
          <h1 className="font-serif text-3xl text-white">Add a Product</h1>
          <p className="text-sm text-stone-400 mt-1">
            Your listing will appear on the public marketplace once saved.
          </p>
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
                        className={`flex-1 py-2.5 rounded-xl border text-sm transition-all ${
                          roastLevel === level
                            ? "border-[#C8965A] bg-amber-50 text-[#34150F] font-medium"
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
                className="flex flex-wrap gap-2 px-3 py-2 border border-stone-200 rounded-xl bg-white focus-within:border-[#C8965A] transition-colors min-h-[52px] cursor-text"
                onClick={() => document.getElementById("note-input")?.focus()}
              >
                {notes.map(note => (
                  <span
                    key={note}
                    className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full"
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
                  className="flex-1 min-w-[140px] text-sm text-[#34150F] placeholder-stone-300 outline-none bg-transparent py-1"
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
                      className="text-[11px] px-3 py-1.5 rounded-full border border-stone-200 text-stone-500 hover:border-[#C8965A] hover:text-[#C8965A] transition-colors bg-white"
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
                    return (
                      <div key={i} className="grid grid-cols-[1fr_80px_90px_24px] gap-3 items-center">
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
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={addFormat}
                className="text-xs text-[#C8965A] hover:text-[#B8854C] transition-colors"
              >
                + Add custom format
              </button>
            </div>
          </SectionCard>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-red-600 text-xs leading-relaxed">{error}</p>
            </div>
          )}

          <div className="flex gap-4 pb-6">
            <Link
              href="/roaster/dashboard"
              className="flex-1 text-center py-3.5 rounded-full text-sm text-stone-400 border border-stone-200 hover:border-stone-300 hover:text-stone-600 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#C8965A] hover:bg-[#B8854C] disabled:opacity-60 text-white py-3.5 rounded-full text-sm font-medium tracking-wide transition-colors"
            >
              {loading ? "Saving…" : "Save product"}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
