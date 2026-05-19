"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

const ROAST_LEVELS = ["Light", "Medium", "Dark"] as const
const PROCESSES = ["Washed", "Natural", "Honey", "Anaerobic", "Other"]

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
  const [nextRoastDate, setNextRoastDate] = useState("")
  const [bagsRemaining, setBagsRemaining] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setFormats(
        product.formats?.length
          ? product.formats.map((f: { name: string; grams: number; price: number }) => ({
              name: f.name,
              grams: String(f.grams ?? ""),
              price: String(f.price),
            }))
          : [{ name: "", grams: "", price: "" }]
      )
      if (product.batch_info) {
        setNextRoastDate(product.batch_info.nextRoastDate ?? "")
        setBagsRemaining(String(product.batch_info.bagsRemaining ?? ""))
      }
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

  function addFormat() {
    setFormats(prev => [...prev, { name: "", grams: "", price: "" }])
  }

  function removeFormat(i: number) {
    if (formats.length > 1) setFormats(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateFormat(i: number, field: keyof Format, value: string) {
    setFormats(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f))
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
        batch_info:
          profile.seller_type === "Café Roaster" && nextRoastDate
            ? { nextRoastDate, bagsRemaining: Number(bagsRemaining) || 0 }
            : null,
      })
      .eq("id", productId)
      .eq("roaster_id", session.user.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push("/roaster/dashboard")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C8965A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex flex-col items-center justify-center gap-4">
        <p className="text-stone-500 text-sm">Product not found or you don't have permission to edit it.</p>
        <Link href="/roaster/dashboard" className="text-xs text-[#C8965A] hover:text-[#B8854C]">
          ← Back to dashboard
        </Link>
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
          <h1 className="font-serif text-3xl text-white">Edit Product</h1>
          <p className="text-sm text-stone-400 mt-1">Changes will update your live marketplace listing.</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 md:px-10 py-10 max-w-2xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6">

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
            <div className="space-y-3">
              {formats.map((fmt, i) => (
                <div key={i} className="flex gap-3 items-end">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <Field label={i === 0 ? "Format name *" : ""}>
                      <input
                        type="text"
                        required
                        value={fmt.name}
                        onChange={e => updateFormat(i, "name", e.target.value)}
                        placeholder="Whole Bean"
                        className={inputClass}
                      />
                    </Field>
                    <Field label={i === 0 ? "Weight (g)" : ""}>
                      <input
                        type="number"
                        min="0"
                        value={fmt.grams}
                        onChange={e => updateFormat(i, "grams", e.target.value)}
                        placeholder="200"
                        className={inputClass}
                      />
                    </Field>
                    <Field label={i === 0 ? "Price (¥) *" : ""}>
                      <input
                        type="number"
                        min="0"
                        required
                        value={fmt.price}
                        onChange={e => updateFormat(i, "price", e.target.value)}
                        placeholder="1800"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  {formats.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFormat(i)}
                      className="text-stone-300 hover:text-red-400 transition-colors text-xl leading-none pb-3"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addFormat}
                className="text-xs text-[#C8965A] hover:text-[#B8854C] transition-colors"
              >
                + Add another format
              </button>
            </div>
          </SectionCard>

          {/* Batch info — Café Roasters only */}
          {profile?.seller_type === "Café Roaster" && (
            <SectionCard title="Batch Information">
              <p className="text-xs text-stone-400 mb-4 -mt-2">
                Customers will see these details and can pre-order before you roast.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Next Roast Date">
                  <input
                    type="date"
                    value={nextRoastDate}
                    onChange={e => setNextRoastDate(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Bags Available">
                  <input
                    type="number"
                    min="0"
                    value={bagsRemaining}
                    onChange={e => setBagsRemaining(e.target.value)}
                    placeholder="e.g. 12"
                    className={inputClass}
                  />
                </Field>
              </div>
            </SectionCard>
          )}

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
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
