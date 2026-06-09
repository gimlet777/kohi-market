"use client"

import { useState, useEffect } from "react"
import type { Product } from "@/lib/products"

// ─── Questions ────────────────────────────────────────────────────────────────
// Index 5 (Q5b) is conditional — only shown when Q5 answer is index 1 (Pre-ground).
// The answers array always has 7 slots; slot 5 stays null when Q5b is skipped.

const QUESTIONS = [
  {
    q: "How do you take your coffee?",
    opts: [
      "Black",
      "With milk",
      "With oat or plant milk",
      "With milk and sugar",
      "With sugar only",
      "It depends on my mood",
    ],
  },
  {
    q: "On a cold afternoon, which sounds most appealing?",
    opts: [
      "A rich hot chocolate",
      "A floral jasmine tea",
      "A tangy yuzu drink",
      "A spiced chai",
    ],
  },
  {
    q: "You're choosing a dessert. You pick:",
    opts: [
      "Fresh strawberries with cream",
      "Dark chocolate fondant",
      "A honey and almond tart",
      "Lemon tart",
    ],
  },
  {
    q: "How do you feel about trying something unfamiliar?",
    opts: [
      "I like knowing what I'm getting",
      "I'm open to surprises",
      "The weirder the better",
    ],
  },
  // Q5 — index 4
  {
    q: "Do you prefer whole bean or pre-ground?",
    opts: [
      "Whole bean (I have a grinder)",
      "Pre-ground (I don't have a grinder)",
      "Drip bags (no equipment needed)",
      "Not sure yet",
    ],
  },
  // Q5b — index 5, only shown when Q5 === 1 (Pre-ground)
  {
    q: "What brewing method do you use?",
    opts: [
      "Espresso machine",
      "Pour-over or drip filter",
      "French press or Aeropress",
      "Moka pot",
    ],
  },
  // Q6 — index 6
  {
    q: "What roast do you usually enjoy?",
    opts: ["Light", "Medium", "Dark", "I don't know yet"],
  },
]

const TOTAL_QUESTIONS = QUESTIONS.length

// ─── Flavour note matchers ────────────────────────────────────────────────────
// Each array contains substrings to test against lowercased product note names.
// Pulled from the actual seed data notes so matches are reliable.

const Q2_MATCHERS: Record<number, string[]> = {
  0: ["chocolate", "brown sugar", "caramel", "hazelnut"],           // hot chocolate
  1: ["jasmine", "bergamot", "peach", "honey", "earl grey", "magnolia", "rose"],  // jasmine tea
  2: ["lemon", "grapefruit", "blackcurrant", "redcurrant", "tamarind", "rosehip", "pomelo"],  // yuzu
  3: ["black tea"],                                                   // spiced chai
}

const Q3_MATCHERS: Record<number, string[]> = {
  0: ["blueberry", "hibiscus", "strawberry", "passion fruit", "lychee", "mango", "tropical", "orange blossom"],  // strawberries
  1: ["chocolate", "dark chocolate"],                                 // fondant
  2: ["honey", "brown sugar", "peach", "hazelnut", "caramel", "white peach", "magnolia"],  // honey-almond tart
  3: ["lemon", "grapefruit", "redcurrant", "pomelo", "blackcurrant", "tamarind", "rosehip"],  // lemon tart
}

const ROASTS = ["Light", "Medium", "Dark"] as const

// ─── Scoring ──────────────────────────────────────────────────────────────────

function notesMatch(p: Product, matchers: string[]): boolean {
  return matchers.length > 0 &&
    p.notes.some(note => matchers.some(m => note.toLowerCase().includes(m)))
}

function scoreProduct(p: Product, answers: (number | null)[]): number {
  let score = 0

  // Q2 flavour affinity (+3 if any note matches)
  if (notesMatch(p, Q2_MATCHERS[answers[1] ?? -1] ?? [])) score += 3

  // Q3 flavour affinity (+3 if any note matches)
  if (notesMatch(p, Q3_MATCHERS[answers[2] ?? -1] ?? [])) score += 3

  // Q6 roast preference (+3 for exact match)
  const q6 = answers[6]
  if (q6 !== null && q6 < 3 && ROASTS[q6] === p.roast) score += 3

  // Q1 milk preference → roast affinity (+1)
  const q1 = answers[0]
  if (q1 === 0 && (p.roast === "Light" || p.roast === "Medium")) score += 1
  if ((q1 === 1 || q1 === 3) && (p.roast === "Medium" || p.roast === "Dark")) score += 1

  // Q5 format preference
  const q5 = answers[4]
  if (q5 === 2 && p.formats.some(f => f.name === "Drip Bag")) score += 2    // drip bags
  if (q5 === 0 && p.formats.some(f => f.name === "Whole Bean")) score += 1  // whole bean

  // Q5b brew method → roast affinity (+1)
  const q5b = answers[5]
  if (q5b === 0 && (p.roast === "Medium" || p.roast === "Dark")) score += 1  // espresso
  if (q5b === 1 && (p.roast === "Light" || p.roast === "Medium")) score += 1 // pour-over
  if (q5b === 2 && p.roast === "Medium") score += 1                          // french press
  if (q5b === 3 && (p.roast === "Medium" || p.roast === "Dark")) score += 1  // moka pot

  // Q3/Q4 bonus for natural/anaerobic process
  if (answers[2] === 0 && p.process.toLowerCase().includes("natural")) score += 1
  if (answers[3] === 2 && p.process.toLowerCase().includes("anaerobic")) score += 1

  return score
}

// ─── Match reasons ────────────────────────────────────────────────────────────

function buildReasons(p: Product, answers: (number | null)[]): string[] {
  const reasons: string[] = []

  // Which product notes matched the taste questions?
  const allMatchers = [
    ...(Q2_MATCHERS[answers[1] ?? -1] ?? []),
    ...(Q3_MATCHERS[answers[2] ?? -1] ?? []),
  ]
  const matchedNotes = p.notes.filter(note =>
    allMatchers.some(m => note.toLowerCase().includes(m))
  )
  if (matchedNotes.length > 0) {
    reasons.push(matchedNotes.slice(0, 2).join(", "))
  }

  // Roast
  const q6 = answers[6]
  if (q6 !== null && q6 < 3 && ROASTS[q6] === p.roast) {
    reasons.push(`${p.roast} roast`)
  }

  // Format
  const q5 = answers[4]
  if (q5 === 2 && p.formats.some(f => f.name === "Drip Bag")) reasons.push("Drip bags")

  return reasons
}

// ─── Summary line ─────────────────────────────────────────────────────────────

const Q2_LABELS: Record<number, string> = {
  0: "Chocolatey notes",
  1: "Floral, delicate notes",
  2: "Bright citrus notes",
  3: "Bold character",
}
const Q3_LABELS: Record<number, string> = {
  0: "Fruity, berry notes",
  1: "Dark chocolate notes",
  2: "Honey & nutty notes",
  3: "Citrus brightness",
}

function buildSummary(answers: (number | null)[]): string {
  const parts: string[] = []
  const q2 = answers[1]; const q3 = answers[2]; const q6 = answers[6]
  if (q2 !== null && Q2_LABELS[q2]) parts.push(Q2_LABELS[q2])
  if (q3 !== null && Q3_LABELS[q3]) parts.push(Q3_LABELS[q3])
  if (q6 === 0) parts.push("Light roast")
  else if (q6 === 1) parts.push("Medium roast")
  else if (q6 === 2) parts.push("Dark roast")
  return parts.slice(0, 2).join(", ")
}

// ─── Result computation with progressive relaxation ───────────────────────────

export interface FormatPreference {
  type: "whole-bean" | "drip-bag" | "pre-ground"
  label: string  // e.g. "Whole bean", "Drip bags", "Filter ground"
}

export interface QuizResults {
  ids: number[]
  broadened: boolean
  reasons: Record<number, string[]>
  summary: string
  formatPreference: FormatPreference | null
}

const Q5B_LABELS: Record<number, string> = {
  0: "Espresso ground",
  1: "Filter ground",
  2: "French press ground",
  3: "Moka ground",
}

function deriveFormatPreference(answers: (number | null)[]): FormatPreference | null {
  const q5 = answers[4]
  if (q5 === 0) return { type: "whole-bean", label: "Whole bean" }
  if (q5 === 2) return { type: "drip-bag", label: "Drip bags" }
  if (q5 === 1) {
    const q5b = answers[5]
    return { type: "pre-ground", label: q5b !== null ? (Q5B_LABELS[q5b] ?? "Pre-ground") : "Pre-ground" }
  }
  return null  // "Not sure yet"
}

function computeResults(products: Product[], answers: (number | null)[]): QuizResults {
  const scored = products
    .map(p => ({ p, score: scoreProduct(p, answers) }))
    .sort((a, b) => b.score - a.score)

  const reasons = (subset: Product[]) =>
    Object.fromEntries(subset.map(p => [p.id, buildReasons(p, answers)]))
  const formatPreference = deriveFormatPreference(answers)
  const base = { summary: buildSummary(answers), formatPreference }

  // Tier 1: both Q2 + Q3 flavour dims match (score ≥ 6, up to 6 products)
  const tier1 = scored.filter(s => s.score >= 6).map(s => s.p)
  if (tier1.length >= 3) {
    const top = tier1.slice(0, 6)
    return { ...base, ids: top.map(p => p.id), broadened: false, reasons: reasons(top) }
  }

  // Tier 2: at least one flavour dim matches (score ≥ 3)
  const tier2 = scored.filter(s => s.score >= 3).map(s => s.p)
  if (tier2.length >= 3) {
    const top = tier2.slice(0, 6)
    return { ...base, ids: top.map(p => p.id), broadened: false, reasons: reasons(top) }
  }

  // Tier 3: broaden — top 3 by score regardless
  const top = scored.slice(0, 3).map(s => s.p)
  return { ...base, ids: top.map(p => p.id), broadened: true, reasons: reasons(top) }
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

function isQ5bPath(answers: (number | null)[]): boolean { return answers[4] === 1 }
function totalDisplayed(answers: (number | null)[]): number { return isQ5bPath(answers) ? 7 : 6 }
function pathPos(step: number, answers: (number | null)[]): number {
  if (step <= 4) return step
  if (step === 5) return 5
  return isQ5bPath(answers) ? 6 : 5
}

// ─── Modal component ──────────────────────────────────────────────────────────

interface Props {
  products: Product[]
  isOpen: boolean
  onClose: () => void
  onResults: (results: QuizResults) => void
}

export function TasteQuiz({ products, isOpen, onClose, onResults }: Props) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(TOTAL_QUESTIONS).fill(null))
  const [selected, setSelected] = useState<number | null>(null)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep(0)
      setAnswers(Array(TOTAL_QUESTIONS).fill(null))
      setSelected(null)
      setFading(false)
    }
  }, [isOpen])

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  if (!isOpen) return null

  function pick(optIdx: number) {
    if (fading) return
    setSelected(optIdx)
    setFading(true)

    setTimeout(() => {
      const next = [...answers]
      next[step] = optIdx

      if (step === 6) {
        // Final question answered — compute and return results
        onResults(computeResults(products, next))
      } else if (step === 4 && optIdx !== 1) {
        // Q5 answered, not pre-ground — skip Q5b
        setAnswers(next)
        setStep(6)
        setSelected(null)
        setFading(false)
      } else {
        setAnswers(next)
        setStep(s => s + 1)
        setSelected(null)
        setFading(false)
      }
    }, 280)
  }

  const current = QUESTIONS[step]
  const pos = pathPos(step, answers)
  const total = totalDisplayed(answers)
  const progress = (pos / total) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-[#2A1508]/40" onClick={onClose} />

      <div className="relative w-full max-w-[500px] bg-white rounded-[2px] shadow-2xl">

        <button
          onClick={onClose}
          aria-label="Close quiz"
          className="absolute top-4 right-4 text-stone-400 hover:text-[#2A1508] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-8 pt-8 pb-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-2">Find Your Coffee</p>

          <div className="h-px bg-stone-100 mb-6 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#C4622D] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 mb-5">
            Question {pos + 1} of {total}
          </p>

          <div className={`transition-opacity duration-[280ms] ${fading ? "opacity-0" : "opacity-100"}`}>
            <h3 className="font-serif text-2xl text-[#2A1508] leading-snug mb-6">
              {current.q}
            </h3>

            <div className="space-y-2.5">
              {current.opts.map((opt, i) => {
                const isSelected = selected === i
                return (
                  <button
                    key={opt}
                    onClick={() => pick(i)}
                    disabled={fading}
                    className={`w-full text-left px-4 py-3.5 rounded-[2px] border transition-all text-sm font-light leading-snug ${
                      isSelected
                        ? "border-[#C4622D] bg-[#C4622D]/5 text-[#2A1508]"
                        : "border-stone-200 bg-white text-[#2A1508] hover:border-[#C4622D]/40 hover:bg-stone-50"
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
