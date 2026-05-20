export type RoastLevel = "Light" | "Medium" | "Dark"
export type SellerType = "Roastery" | "Café Roaster"

export interface FormatOption {
  name: string
  grams: number
  price: number
}

export interface BatchInfo {
  batchId?: string       // UUID from batches table (absent for mock data)
  nextRoastDate: string  // ISO date string
  totalBags?: number
  bagsRemaining: number
}

export interface Product {
  id: number
  roaster: string
  region: string
  name: string
  origin: string
  process: string
  roast: RoastLevel
  altitude?: string
  notes: string[]
  description: string
  formats: FormatOption[]
  type: SellerType
  batchInfo?: BatchInfo
}

// ─── Supabase row shape & mapper ─────────────────────────────────────────────

export interface ProductRow {
  id: number
  roaster_id: string | null
  roaster_name: string
  region: string
  product_name: string
  product_name_jp: string | null
  origin: string
  process: string
  roast_level: string
  altitude: string | null
  flavour_notes: string[]
  description: string
  price: number
  formats: FormatOption[]
  seller_type: string
  batch_info: { nextRoastDate: string; bagsRemaining: number } | null
  created_at: string
}

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    roaster: row.roaster_name,
    region: row.region,
    name: row.product_name,
    origin: row.origin,
    process: row.process,
    roast: row.roast_level as RoastLevel,
    altitude: row.altitude ?? undefined,
    notes: row.flavour_notes,
    description: row.description,
    formats: row.formats,
    type: row.seller_type as SellerType,
    batchInfo: row.batch_info ?? undefined,
  }
}

// ─── Mock / fallback data ─────────────────────────────────────────────────────
// Mirrors supabase/seed.sql — update both if adding or changing products.

export const PRODUCTS: Product[] = [
  {
    id: 1,
    roaster: "Glitch Coffee & Roasters",
    region: "Tokyo",
    name: "Beriti Natural",
    origin: "Ethiopia",
    process: "Natural",
    roast: "Light",
    altitude: "1,900–2,200m",
    notes: ["Blueberry", "Hibiscus", "Dark chocolate"],
    description:
      "From the Beriti washing station deep in Yirgacheffe's Gedeo zone, this natural lot spends 21 days drying on raised beds, concentrating a vivid fruit character. Glitch roasts to just above first crack to hold every layer of berry intensity and keep the floral aromatics intact.",
    formats: [{ name: "Whole Bean", grams: 100, price: 1800 }],
    type: "Roastery",
  },
  {
    id: 2,
    roaster: "Glitch Coffee & Roasters",
    region: "Tokyo",
    name: "Kenya Karimikui AA",
    origin: "Kenya",
    process: "Washed",
    roast: "Light",
    altitude: "1,700–1,900m",
    notes: ["Blackcurrant", "Grapefruit", "Black tea"],
    description:
      "Karimikui factory in Kirinyaga county collects SL28 and SL34 cherry from smallholders on the slopes of Mount Kenya. Double fermentation and a slow, shaded dry produce the transparent, highly structured cup that defines Kenyan filter at its finest. Glitch sources a single 60 kg lot per season.",
    formats: [{ name: "Whole Bean", grams: 100, price: 2400 }],
    type: "Roastery",
  },
  {
    id: 3,
    roaster: "Fuglen Tokyo",
    region: "Tokyo",
    name: "Ethiopia Nano Challa",
    origin: "Ethiopia",
    process: "Washed",
    roast: "Light",
    altitude: "2,000–2,100m",
    notes: ["Peach", "Bergamot", "Honey"],
    description:
      "Nano Challa cooperative sits in Agaro district in Jimma zone, where smallholder farmers deliver ripe cherry daily to a meticulously run washing station. Fuglen's Scandinavian-influenced roast highlights the station's characteristically clean, floral profile — delicate, tea-like, and endlessly nuanced in the cup.",
    formats: [
      { name: "Whole Bean", grams: 200, price: 2400 },
      { name: "Drip Bag", grams: 120, price: 2800 },
    ],
    type: "Roastery",
  },
  {
    id: 4,
    roaster: "Fuglen Tokyo",
    region: "Tokyo",
    name: "Colombia Finca El Paraíso",
    origin: "Colombia",
    process: "Double Anaerobic Washed",
    roast: "Light",
    altitude: "1,750m",
    notes: ["Passion fruit", "Rose", "Pomelo"],
    description:
      "Diego Bermúdez's Finca El Paraíso in Huila has become one of Colombia's most celebrated experimental farms. This double anaerobic washed lot undergoes 72-hour inoculated fermentation before washing, producing an intensely aromatic, fruit-forward cup that blurs the boundary between coffee and natural wine.",
    formats: [{ name: "Whole Bean", grams: 200, price: 3200 }],
    type: "Roastery",
  },
  {
    id: 5,
    roaster: "Takamura Wine & Coffee Roasters",
    region: "Osaka",
    name: "Ethiopia Shakiso Natural",
    origin: "Ethiopia",
    process: "Natural",
    roast: "Light",
    altitude: "1,900–2,100m",
    notes: ["Strawberry jam", "Peach tea", "Magnolia"],
    description:
      "From Guji zone's Shakiso district — an area producing some of Ethiopia's most expressive naturals. Takamura's approach mirrors their fine-wine curation: sourcing sub-10 kg parcels where drying conditions are controlled day-by-day. The result is a perfumed, layered cup with a silk-textured body.",
    formats: [
      { name: "Whole Bean", grams: 100, price: 2200 },
      { name: "Drip Bag", grams: 140, price: 2600 },
    ],
    type: "Roastery",
  },
  {
    id: 6,
    roaster: "Takamura Wine & Coffee Roasters",
    region: "Osaka",
    name: "Panama Elida Estate Natural",
    origin: "Panama",
    process: "Natural",
    roast: "Light",
    altitude: "1,600–1,900m",
    notes: ["Tropical fruit", "Jasmine", "White grape"],
    description:
      "The Lamastus family's Elida Estate on the slopes of Barú volcano is one of the world's most decorated farms. This natural lot is solar-dried for 30 days under precise humidity controls. The result is a layered, perfumed cup of extraordinary clarity — the coffee equivalent of a grand cru.",
    formats: [{ name: "Whole Bean", grams: 100, price: 4200 }],
    type: "Roastery",
  },
  {
    id: 7,
    roaster: "Leaves Coffee Roasters",
    region: "Tokyo",
    name: "Ethiopia Yirgacheffe G1",
    origin: "Ethiopia",
    process: "Washed",
    roast: "Light",
    altitude: "1,800–2,100m",
    notes: ["Jasmine", "Lemon", "Earl Grey"],
    description:
      "A benchmark washed Yirgacheffe sourced from a cooperative in the Gedeo zone, where the microclimate and altitude combine to produce naturally occurring floral and citrus aromatics. Leaves roasts lightly to keep the cup bright, transparent, and unmistakably Ethiopian — an ideal introduction to specialty filter coffee.",
    formats: [
      { name: "Whole Bean", grams: 200, price: 1900 },
      { name: "Drip Bag", grams: 120, price: 2300 },
    ],
    type: "Roastery",
  },
  {
    id: 8,
    roaster: "Leaves Coffee Roasters",
    region: "Tokyo",
    name: "Guatemala Vista Hermosa Honey",
    origin: "Guatemala",
    process: "Honey",
    roast: "Medium",
    altitude: "1,500–1,800m",
    notes: ["Brown sugar", "Peach", "Hazelnut"],
    description:
      "Grown above the cloud line in Huehuetenango's high plateau, Vista Hermosa's honey-processed lots are dried with 50% of the mucilage intact, giving a structured sweetness and smooth body. Leaves roasts to a gentle medium that amplifies the caramel character while keeping stone-fruit notes vivid and clean.",
    formats: [
      { name: "Whole Bean", grams: 200, price: 1700 },
      { name: "Drip Bag", grams: 120, price: 2000 },
    ],
    type: "Roastery",
  },
  {
    id: 9,
    roaster: "Heart's Light Coffee",
    region: "Tokyo",
    name: "Colombia Geisha Washed",
    origin: "Colombia",
    process: "Washed",
    roast: "Light",
    altitude: "1,900–2,000m",
    notes: ["Jasmine", "White peach", "Bergamot"],
    description:
      "Heart's Light sources this Geisha from a single-family farm in Antioquia, roasting in weekly batches of 15 kg or fewer. The washed process lets the variety's celebrated floral and stone-fruit character emerge with exceptional purity. Every bag is roasted to order and dispatched within 48 hours.",
    formats: [{ name: "Whole Bean", grams: 100, price: 3600 }],
    type: "Café Roaster",
  },
  {
    id: 10,
    roaster: "Heart's Light Coffee",
    region: "Tokyo",
    name: "Ethiopia Hambela Natural",
    origin: "Ethiopia",
    process: "Natural",
    roast: "Light",
    altitude: "2,100–2,300m",
    notes: ["Blueberry", "Lemon curd", "Brown sugar"],
    description:
      "Hambela Wamena in Guji zone sits above 2,100 m — among the highest growing elevations in Ethiopia. The slow ripening produces a dense cherry with concentrated sugars; the 25-day natural dry locks them in. Heart's Light roasts this at the lightest end of the dial to preserve the wild, vivid fruit.",
    formats: [{ name: "Whole Bean", grams: 100, price: 2800 }],
    type: "Café Roaster",
  },
  {
    id: 11,
    roaster: "LiLo Coffee Roasters",
    region: "Osaka",
    name: "Panama Hartmann Geisha Natural",
    origin: "Panama",
    process: "Natural",
    roast: "Light",
    altitude: "1,600–1,800m",
    notes: ["Lychee", "Mango", "Orange blossom"],
    description:
      "The Hartmann family has farmed on the slopes of Volcán Barú for four generations. This natural Geisha is shade-grown under native oak and dried on raised beds for 25 days. LiLo secures this as an exclusive annual allocation — 30 kg per season. When this batch is gone, it's gone until next harvest.",
    formats: [{ name: "Whole Bean", grams: 100, price: 5200 }],
    type: "Café Roaster",
  },
  {
    id: 12,
    roaster: "LiLo Coffee Roasters",
    region: "Osaka",
    name: "Kenya Kiangoi AA",
    origin: "Kenya",
    process: "Washed",
    roast: "Light",
    altitude: "1,700–1,900m",
    notes: ["Redcurrant", "Tamarind", "Rosehip"],
    description:
      "Kiangoi factory in Nyeri county sits at the foot of the Aberdare Range, one of Kenya's most revered growing districts. SL28 and Batian varietals undergo a 72-hour cold fermentation before washing, producing the intensely winey, bright-acid cup that defines Nyeri's reputation. A seasonal allocation roasted in 10 kg batches.",
    formats: [{ name: "Whole Bean", grams: 100, price: 2800 }],
    type: "Café Roaster",
  },
]
