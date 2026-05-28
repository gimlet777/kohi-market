import type { RoastLevel } from "@/lib/products"

// ─── Types ────────────────────────────────────────────────────────────────────

export type BrewMethodKey = "immersion" | "pourover" | "pressure" | "coldbrew" | "boiling"

export interface BrewMethodDef {
  key: BrewMethodKey
  label: string
  devices: string
}

export interface BrewInstructions {
  grind: string
  ratio: string
  temp: string
  time: string
  tips: string[]
}

// Per-method, per-product roaster notes stored as JSONB in products.brew_notes
export type BrewNotesMap = Partial<Record<BrewMethodKey, Partial<BrewInstructions>>>

// ─── Method catalogue ─────────────────────────────────────────────────────────

export const BREW_METHODS: BrewMethodDef[] = [
  { key: "immersion", label: "Immersion",  devices: "French press · Aeropress · Clever" },
  { key: "pourover",  label: "Pour-over",  devices: "V60 · Chemex · Kalita · drip" },
  { key: "pressure",  label: "Pressure",   devices: "Espresso · Moka pot" },
  { key: "coldbrew",  label: "Cold Brew",  devices: "Cold brew vessel · mason jar" },
  { key: "boiling",   label: "Boiling",    devices: "Ibrik · Turkish" },
]

// ─── Default instructions matrix ─────────────────────────────────────────────

const DEFAULTS: Record<BrewMethodKey, Record<RoastLevel, BrewInstructions>> = {
  immersion: {
    Light: {
      grind: "Coarse",
      ratio: "1 : 15",
      temp: "94–96°C",
      time: "4 min",
      tips: [
        "Steep 4 minutes, then plunge slowly",
        "Light roasts respond well to higher water temperatures",
        "A short 30-second bloom before full immersion improves clarity",
      ],
    },
    Medium: {
      grind: "Medium-coarse",
      ratio: "1 : 15",
      temp: "93°C",
      time: "4 min",
      tips: [
        "Classic French press territory — plunge gently to avoid sediment",
        "Skim the crust before plunging for a cleaner cup",
      ],
    },
    Dark: {
      grind: "Medium-coarse",
      ratio: "1 : 14",
      temp: "91°C",
      time: "3–4 min",
      tips: [
        "Dark roasts extract quickly — a shorter steep avoids bitterness",
        "Lower temperature preserves sweetness and body",
      ],
    },
  },
  pourover: {
    Light: {
      grind: "Medium-fine",
      ratio: "1 : 16",
      temp: "94–96°C",
      time: "3½–4 min",
      tips: [
        "Bloom 30s with twice the coffee weight in water, then pour in slow steady circles",
        "High temperature helps extract the brighter, more delicate flavours",
        "Aim for a flat coffee bed at the end of the draw-down",
      ],
    },
    Medium: {
      grind: "Medium",
      ratio: "1 : 15",
      temp: "92–94°C",
      time: "3–3½ min",
      tips: [
        "Bloom 30s, then pour in 3–4 stages",
        "Keep the flow rate steady to ensure even extraction",
      ],
    },
    Dark: {
      grind: "Medium",
      ratio: "1 : 14",
      temp: "90–92°C",
      time: "2½–3 min",
      tips: [
        "Lower temperature avoids extracting bitter compounds",
        "Faster pours work well — dark roasts flow through the bed more easily",
      ],
    },
  },
  pressure: {
    Light: {
      grind: "Fine-medium",
      ratio: "1 : 2 yield",
      temp: "93–94°C",
      time: "28–35s",
      tips: [
        "Light roasts often need a finer grind or higher temperature than you'd expect",
        "Dial in with a longer extraction time to find sweetness",
        "Expect a lighter body and vibrant acidity — perfect as a long black",
      ],
    },
    Medium: {
      grind: "Fine",
      ratio: "1 : 2 yield",
      temp: "91–93°C",
      time: "28–32s",
      tips: [
        "Classic espresso range — aim for a golden crema and balanced extraction",
        "A 9-bar pre-infusion of 5–8s gives more even extraction",
      ],
    },
    Dark: {
      grind: "Fine",
      ratio: "1 : 2 yield",
      temp: "88–91°C",
      time: "25–30s",
      tips: [
        "Pull shorter to preserve sweetness and body",
        "Lower temperature prevents over-extraction of bitter compounds",
        "Watch for channelling with very dark, oily beans — dose tight and tamp level",
      ],
    },
  },
  coldbrew: {
    Light: {
      grind: "Extra coarse",
      ratio: "1 : 8",
      temp: "Cold (fridge)",
      time: "18–24h",
      tips: [
        "Light roasts take longer — go the full 24h for best extraction",
        "Filter through a paper filter after steeping for a cleaner cup",
        "Room-temperature brew is faster but fridge brew tastes cleaner and brighter",
      ],
    },
    Medium: {
      grind: "Coarse",
      ratio: "1 : 8",
      temp: "Cold (fridge)",
      time: "14–18h",
      tips: [
        "Strain through a fine mesh, then a paper filter for best clarity",
        "Dilute 1:1 with cold water or milk to serve",
      ],
    },
    Dark: {
      grind: "Coarse",
      ratio: "1 : 8",
      temp: "Cold (fridge)",
      time: "12–14h",
      tips: [
        "Dark roasts extract faster in cold water — don't over-steep or it can taste bitter",
        "Great served over ice with tonic water or oat milk",
      ],
    },
  },
  boiling: {
    Light: {
      grind: "Very fine (Turkish grind)",
      ratio: "1 : 7",
      temp: "75–80°C",
      time: "2–3 min",
      tips: [
        "Light roasts are less traditional for Ibrik but can be delicate and floral",
        "Try a slightly coarser grind than usual for better clarity",
        "Pull off heat the moment the foam rises — don't let it fully boil",
      ],
    },
    Medium: {
      grind: "Very fine (Turkish grind)",
      ratio: "1 : 7",
      temp: "75–80°C",
      time: "2–3 min",
      tips: [
        "Add coffee to cold water and heat slowly — do not stir once it starts to foam",
        "Pull off heat as the foam rises; repeat 2–3 times for a richer cup",
        "Let grounds settle 1 minute before pouring",
      ],
    },
    Dark: {
      grind: "Extra fine (Turkish grind)",
      ratio: "1 : 7",
      temp: "75–80°C",
      time: "2–3 min",
      tips: [
        "Dark roasts are the classic choice for Ibrik — expect a thick, rich, intensely flavoured cup",
        "Never fully boil — pull before the foam reaches the rim of the pot",
        "Serve unfiltered; the grounds sink naturally within a minute",
      ],
    },
  },
}

// Process-specific addendum tips
const PROCESS_TIPS: Partial<Record<string, Partial<Record<BrewMethodKey, string>>>> = {
  Natural: {
    immersion: "Natural process adds fruit sweetness — try 93°C and a slightly shorter steep to keep clarity.",
    pourover: "Natural process amplifies fruit notes. A slight temperature reduction can prevent muddiness.",
    pressure: "Expect rich, syrupy body. A short pre-infusion helps balance the sweetness.",
    coldbrew: "Cold brew loves natural process — the fruit notes come through beautifully with minimal bitterness.",
    boiling: "Natural process in Ibrik gives a very rich, fruit-forward cup. A classic pairing.",
  },
  Honey: {
    immersion: "Honey process balances brightness and body — standard parameters work well.",
    pourover: "Honey process gives a clean yet sweet cup. Medium temperatures suit it well.",
    pressure: "Honey process produces great caramel sweetness in espresso.",
    coldbrew: "Honey process cold brew has a silky, sweet quality — 16h in the fridge is a good starting point.",
  },
  Anaerobic: {
    immersion: "Anaerobic coffees have intense, wine-like character — use slightly cooler water to keep it in check.",
    pourover: "Anaerobic coffees are complex. A finer grind and slower pour can help express clarity.",
    pressure: "Expect big, unusual flavours. Dial temperature down 1–2°C from your usual starting point.",
    coldbrew: "Cold brew mellows anaerobic intensity beautifully — the fruit and wine notes become silky.",
  },
  Washed: {
    pourover: "Washed coffees shine in pour-over — clean, bright, and terroir-driven.",
  },
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getBrewInstructions(
  method: BrewMethodKey,
  roast: RoastLevel,
  process: string,
  roasterNotes?: Partial<BrewInstructions> | null,
): BrewInstructions {
  const base = DEFAULTS[method][roast]
  const processTip = PROCESS_TIPS[process]?.[method]

  return {
    grind: roasterNotes?.grind || base.grind,
    ratio: roasterNotes?.ratio || base.ratio,
    temp: roasterNotes?.temp || base.temp,
    time: roasterNotes?.time || base.time,
    tips: [
      ...(roasterNotes?.tips?.length ? roasterNotes.tips : base.tips),
      ...(processTip ? [processTip] : []),
    ],
  }
}
