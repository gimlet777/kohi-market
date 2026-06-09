"use client"

import { useState } from "react"
import { BREW_METHODS, getBrewInstructions, type BrewMethodKey, type BrewInstructions } from "@/lib/brewGuide"
import type { BrewNotesMap } from "@/lib/brewGuide"
import type { RoastLevel } from "@/lib/products"

// ─── Method icons ─────────────────────────────────────────────────────────────

function ImmersionIcon({ active }: { active: boolean }) {
  const c = active ? "#C4622D" : "#8B9EA5"
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="4" width="14" height="18" rx="2" />
      <line x1="14" y1="4" x2="14" y2="1" />
      <line x1="11" y1="1" x2="17" y2="1" />
      <line x1="10" y1="15" x2="18" y2="15" />
    </svg>
  )
}

function PouroverIcon({ active }: { active: boolean }) {
  const c = active ? "#C4622D" : "#8B9EA5"
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 5h14l-5 11H12L7 5z" />
      <line x1="14" y1="16" x2="14" y2="21" />
      <ellipse cx="14" cy="23" rx="5" ry="2" />
      <line x1="10" y1="8" x2="18" y2="8" />
    </svg>
  )
}

function PressureIcon({ active }: { active: boolean }) {
  const c = active ? "#C4622D" : "#8B9EA5"
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="8" width="10" height="14" rx="2" />
      <path d="M11 8V6a3 3 0 016 0v2" />
      <line x1="14" y1="13" x2="14" y2="17" />
      <line x1="12" y1="15" x2="16" y2="15" />
    </svg>
  )
}

function ColdBrewIcon({ active }: { active: boolean }) {
  const c = active ? "#C4622D" : "#8B9EA5"
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="5" width="12" height="18" rx="2" />
      <path d="M11 12 l3-4 l3 4" />
      <line x1="14" y1="8" x2="14" y2="14" />
      <path d="M11 17 c1-1.5 4-1.5 5 0" />
    </svg>
  )
}

function BoilingIcon({ active }: { active: boolean }) {
  const c = active ? "#C4622D" : "#8B9EA5"
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 18 Q7 14 10 11 Q13 8 12 5" />
      <path d="M14 18 Q13 14 16 11 Q19 8 18 5" />
      <path d="M6 20 Q10 23 14 23 Q18 23 22 20" />
      <line x1="6" y1="20" x2="22" y2="20" />
    </svg>
  )
}

const METHOD_ICONS: Record<BrewMethodKey, (active: boolean) => React.ReactNode> = {
  immersion: (a) => <ImmersionIcon active={a} />,
  pourover:  (a) => <PouroverIcon  active={a} />,
  pressure:  (a) => <PressureIcon  active={a} />,
  coldbrew:  (a) => <ColdBrewIcon  active={a} />,
  boiling:   (a) => <BoilingIcon   active={a} />,
}

// ─── Instruction display ──────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] tracking-[0.25em] uppercase text-stone-400">{label}</p>
      <p className="text-sm font-medium text-[#2A1508]">{value}</p>
    </div>
  )
}

function InstructionPanel({
  instructions,
  isRoasterNote,
}: {
  instructions: BrewInstructions
  isRoasterNote: boolean
}) {
  return (
    <div className="space-y-5">
      {isRoasterNote ? (
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#C4622D] flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-[#C4622D]" />
          Roaster&apos;s recommendation
        </p>
      ) : (
        <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400 flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-stone-300" />
          General brewing guide
        </p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white rounded-[2px] border border-[rgba(42,21,8,0.07)] px-5 py-4">
        <Stat label="Grind" value={instructions.grind} />
        <Stat label="Ratio" value={instructions.ratio} />
        <Stat label="Water temp" value={instructions.temp} />
        <Stat label="Brew time" value={instructions.time} />
      </div>

      {/* Tips */}
      {instructions.tips.length > 0 && (
        <ul className="space-y-2">
          {instructions.tips.map((tip, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-stone-500 font-light leading-snug">
              <span className="text-[#C4622D] shrink-0 mt-0.5">—</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  roast: RoastLevel
  process: string
  brewNotes?: Record<string, Partial<BrewInstructions>>
  savedMethod?: BrewMethodKey | null
  isLoggedIn: boolean
  onSaveMethod?: (method: BrewMethodKey) => void
  isSavingMethod?: boolean
}

export function BrewGuide({
  roast,
  process,
  brewNotes,
  savedMethod,
  isLoggedIn,
  onSaveMethod,
  isSavingMethod,
}: Props) {
  const [activeMethod, setActiveMethod] = useState<BrewMethodKey>(savedMethod ?? "pourover")

  const methodDef = BREW_METHODS.find(m => m.key === activeMethod)!
  const roasterNotes = brewNotes?.[activeMethod] ?? null
  const instructions = getBrewInstructions(activeMethod, roast, process, roasterNotes)
  const hasRoasterNote = !!(
    roasterNotes?.grind || roasterNotes?.ratio || roasterNotes?.temp || roasterNotes?.time || roasterNotes?.tips?.length
  )
  const isCurrentSaved = savedMethod === activeMethod

  return (
    <section className="border-t border-[rgba(42,21,8,0.07)] pt-10">
      <div className="max-w-5xl mx-auto px-6 md:px-10 pb-12 space-y-6">

        {/* Header */}
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-400 mb-1">How to brew this</p>
            <h2 className="font-serif text-xl text-[#2A1508]">Brewing Guide</h2>
          </div>
          {isLoggedIn && onSaveMethod && (
            <button
              onClick={() => onSaveMethod(activeMethod)}
              disabled={isCurrentSaved || isSavingMethod}
              className={`text-xs px-3 py-1.5 rounded-[2px] border transition-colors font-light ${
                isCurrentSaved
                  ? "border-emerald-200 text-emerald-600 bg-emerald-50 cursor-default"
                  : "border-[#C4622D]/40 text-[#C4622D] hover:border-[#C4622D] hover:bg-[#C4622D]/5"
              }`}
            >
              {isCurrentSaved ? "Saved as default ✓" : isSavingMethod ? "Saving…" : "Save as my default method"}
            </button>
          )}
          {!isLoggedIn && (
            <a
              href="/account"
              className="text-xs text-stone-400 hover:text-[#C4622D] transition-colors font-light"
            >
              Sign in to save your equipment →
            </a>
          )}
        </div>

        {/* Method selector */}
        <div className="grid grid-cols-5 gap-2">
          {BREW_METHODS.map((method) => {
            const active = activeMethod === method.key
            return (
              <button
                key={method.key}
                onClick={() => setActiveMethod(method.key)}
                className={`flex flex-col items-center gap-2 px-2 pt-4 pb-3.5 rounded-[2px] border transition-all text-center ${
                  active
                    ? "border-[#C4622D] bg-[#C4622D]/5"
                    : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                {METHOD_ICONS[method.key](active)}
                <span className={`text-[10px] tracking-wide font-medium leading-none ${active ? "text-[#C4622D]" : "text-stone-500"}`}>
                  {method.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Method subtitle */}
        <p className="text-[11px] text-stone-400 font-light -mt-2">{methodDef.devices}</p>

        {/* Instructions */}
        <InstructionPanel instructions={instructions} isRoasterNote={hasRoasterNote} />

      </div>
    </section>
  )
}
