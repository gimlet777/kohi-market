export type RoastLevel = "Light" | "Medium" | "Dark"
export type SellerType = "Roastery" | "Café Roaster"

export interface FormatOption {
  name: string
  grams: number
  price: number
}

export interface BatchInfo {
  nextRoastDate: string  // ISO date string
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
  roaster_name: string
  region: string
  product_name: string
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

export const PRODUCTS: Product[] = [
  {
    id: 1,
    roaster: "Fuglen Tokyo",
    region: "Tokyo",
    name: "Ethiopia Yirgacheffe",
    origin: "Ethiopia",
    process: "Natural",
    roast: "Light",
    altitude: "1,800–2,200m",
    notes: ["Blueberry", "Jasmine", "Bright citrus"],
    description:
      "A natural-processed Yirgacheffe from the Gedeo zone, brought to life through Fuglen's precise light roast. Expect a delicate, tea-like body with an intense berry sweetness and a sparkling citrus finish.",
    formats: [
      { name: "Whole Bean", grams: 200, price: 1800 },
      { name: "Drip Bag", grams: 120, price: 2200 },
    ],
    type: "Roastery",
  },
  {
    id: 2,
    roaster: "Bear Pond Espresso",
    region: "Tokyo",
    name: "Colombia El Paraíso",
    origin: "Colombia",
    process: "Washed",
    roast: "Medium",
    altitude: "1,750m",
    notes: ["Brown sugar", "Stone fruit", "Chocolate"],
    description:
      "From Diego Bermúdez's El Paraíso farm in Huila, this washed lot is a study in balance — sweet and clean, with a lingering milk-chocolate finish. Bear Pond roasts it weekly in small batches.",
    formats: [
      { name: "Whole Bean", grams: 200, price: 2200 },
    ],
    type: "Café Roaster",
    batchInfo: {
      nextRoastDate: "2026-05-24",
      bagsRemaining: 12,
    },
  },
  {
    id: 3,
    roaster: "% Arabica",
    region: "Kyoto",
    name: "Guatemala Huehuetenango",
    origin: "Guatemala",
    process: "Washed",
    roast: "Light",
    altitude: "1,500–1,900m",
    notes: ["Floral", "Peach", "Honey"],
    description:
      "Grown in one of Guatemala's highest and most isolated regions, this lot reflects % Arabica's meticulous green selection. The high altitude and volcanic soil produce a naturally honey-sweet cup.",
    formats: [
      { name: "Whole Bean", grams: 200, price: 2400 },
      { name: "Drip Bag", grams: 120, price: 2800 },
    ],
    type: "Roastery",
  },
  {
    id: 4,
    roaster: "Kurasu",
    region: "Kyoto",
    name: "Ethiopia Guji",
    origin: "Ethiopia",
    process: "Natural",
    roast: "Light",
    altitude: "2,000–2,200m",
    notes: ["Strawberry", "Peach", "Cream"],
    description:
      "A wildly fruity natural from the Guji zone in southern Ethiopia. Kurasu sources direct from smallholder producers and roasts in micro-batches to preserve every layer of the vivid berry character.",
    formats: [
      { name: "Whole Bean", grams: 200, price: 1950 },
      { name: "Drip Bag", grams: 120, price: 2400 },
    ],
    type: "Café Roaster",
    batchInfo: {
      nextRoastDate: "2026-05-22",
      bagsRemaining: 8,
    },
  },
  {
    id: 5,
    roaster: "Mameya Kakeru",
    region: "Tokyo",
    name: "Kenya Gicherori",
    origin: "Kenya",
    process: "Washed",
    roast: "Medium",
    altitude: "1,700–1,800m",
    notes: ["Blackcurrant", "Grapefruit", "Walnut"],
    description:
      "The Gicherori washing station in Kirinyaga county processes SL28 and SL34 cherries from surrounding smallholders. Bright, winey, and intensely structured — a benchmark for Kenyan filter coffee.",
    formats: [
      { name: "Whole Bean", grams: 200, price: 3200 },
    ],
    type: "Roastery",
  },
  {
    id: 6,
    roaster: "Nishiya Coffee",
    region: "Osaka",
    name: "Brazil Cerrado Mineiro",
    origin: "Brazil",
    process: "Natural",
    roast: "Dark",
    altitude: "900–1,100m",
    notes: ["Dark chocolate", "Caramel", "Hazelnut"],
    description:
      "A bold, comforting cup from the Cerrado plateau in Minas Gerais. Nishiya's extended development roast brings out a deep, roasty sweetness ideal for espresso and milk-based drinks.",
    formats: [
      { name: "Whole Bean", grams: 200, price: 1600 },
      { name: "Drip Bag", grams: 120, price: 1900 },
    ],
    type: "Café Roaster",
    batchInfo: {
      nextRoastDate: "2026-05-26",
      bagsRemaining: 20,
    },
  },
]
