import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import type { ShippingAddress } from "@/app/checkout/address/page"

export interface ShipcoRate {
  carrier: string   // e.g. "yamato"
  service: string   // e.g. "TA-Q-BIN"
  currency: string
  price: number
}

export interface RoasterRates {
  roasterName: string
  rates: ShipcoRate[]
  fallback: boolean
}

interface CartItemForRates {
  productName: string
  roasterName: string
  quantity: number
  price: number
  grams: number
}

interface ShipcoCarrier {
  id: string
  carrier: string  // carrier slug, e.g. "yamato"
  [key: string]: unknown
}

type RoasterShippingAddress = {
  postal_code?: string
  prefecture?: string
  city?: string
  district?: string
  building?: string
  phone?: string
}

const SHIPCO_BASE = "https://api.shipandco.com/v1"

async function shipcoGet(path: string, token: string) {
  const res = await fetch(`${SHIPCO_BASE}${path}`, {
    headers: { "x-access-token": token },
  })
  const text = await res.text()
  return { status: res.status, ok: res.ok, text }
}

async function shipcoPost(path: string, token: string, body: unknown) {
  const res = await fetch(`${SHIPCO_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": token,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, ok: res.ok, text }
}

export async function POST(req: NextRequest) {
  let address: ShippingAddress & { country?: string }
  let items: CartItemForRates[]

  try {
    const body = await req.json()
    address = body.address
    items = body.items
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const token = process.env.SHIPCO_API_TOKEN
  console.log(`[shipping-rates] SHIPCO_API_TOKEN=${token ? `set (${token.length} chars)` : "UNDEFINED"}`)
  if (!token) {
    return NextResponse.json({ rates: [], fallback: true })
  }

  // ── 1. Fetch registered carriers ────────────────────────────────────────────
  const carriersResp = await shipcoGet("/carriers", token).catch(err => {
    console.error("[shipping-rates] carriers fetch threw:", err)
    return null
  })

  console.log(`[shipping-rates] GET /carriers status=${carriersResp?.status ?? "error"} body=${carriersResp?.text ?? "(fetch failed)"}`)

  let carriers: ShipcoCarrier[] = []
  if (carriersResp?.ok && carriersResp.text) {
    try {
      const parsed = JSON.parse(carriersResp.text)
      // Response may be an array directly, or { carriers: [...] }
      carriers = Array.isArray(parsed) ? parsed : (parsed.carriers ?? [])
    } catch {
      console.error("[shipping-rates] failed to parse carriers response")
    }
  }

  if (carriers.length === 0) {
    console.warn("[shipping-rates] no carriers registered in Ship&co account — all requests will return empty rates. Register a carrier (e.g. Yamato) in the Ship&co dashboard first.")
    // Still proceed: the rates loop below will return empty arrays and the UI will show fallback.
  } else {
    console.log(`[shipping-rates] ${carriers.length} carrier(s): ${carriers.map(c => `${c.carrier}(id=${c.id})`).join(", ")}`)
  }

  // ── 2. Group cart items by roaster ──────────────────────────────────────────
  const byRoaster = new Map<string, CartItemForRates[]>()
  for (const item of items) {
    const list = byRoaster.get(item.roasterName) ?? []
    list.push(item)
    byRoaster.set(item.roasterName, list)
  }

  console.log(`[shipping-rates] roasters in cart: [${[...byRoaster.keys()].join(", ")}]`)

  const isDomestic = !address.country || address.country === "JP"
  const today = new Date().toISOString().slice(0, 10)
  console.log(`[shipping-rates] isDomestic=${isDomestic} shipment_date=${today}`)

  const results: RoasterRates[] = []

  for (const [roasterName, roasterItems] of byRoaster) {
    // ── 3. Resolve roaster shipping address ───────────────────────────────────
    const { data: roaster, error: dbError } = await supabaseAdmin
      .from("roasters")
      .select("roaster_name, shipping_address")
      .ilike("roaster_name", roasterName.trim())
      .maybeSingle()

    if (dbError) console.error(`[shipping-rates] DB error for "${roasterName}":`, dbError.message)

    let fromAddr = (roaster?.shipping_address ?? null) as RoasterShippingAddress | null
    let resolvedName = (roaster?.roaster_name as string | null) ?? roasterName

    if (!roaster || !fromAddr?.postal_code) {
      console.log(`[shipping-rates] "${roasterName}" not in roasters table — checking overrides`)
      const { data: override, error: overrideErr } = await supabaseAdmin
        .from("roaster_shipping_overrides")
        .select("roaster_name, shipping_address")
        .ilike("roaster_name", roasterName.trim())
        .maybeSingle()

      if (overrideErr) console.error(`[shipping-rates] overrides error for "${roasterName}":`, overrideErr.message)

      if (override) {
        fromAddr = override.shipping_address as RoasterShippingAddress
        resolvedName = override.roaster_name as string
        console.log(`[shipping-rates] override found for "${roasterName}": ${JSON.stringify(fromAddr)}`)
      } else {
        console.warn(`[shipping-rates] no address found anywhere for "${roasterName}"`)
        results.push({ roasterName, rates: [], fallback: true })
        continue
      }
    }

    if (!fromAddr?.postal_code || !fromAddr?.prefecture || !fromAddr?.city) {
      console.warn(`[shipping-rates] "${roasterName}" missing required fields: postal_code=${fromAddr?.postal_code ?? "MISSING"} prefecture=${fromAddr?.prefecture ?? "MISSING"} city=${fromAddr?.city ?? "MISSING"}`)
      results.push({ roasterName, rates: [], fallback: true })
      continue
    }

    const totalGrams = roasterItems.reduce((sum, i) => sum + (i.grams || 100) * i.quantity, 0)
    const totalQuantity = roasterItems.reduce((sum, i) => sum + i.quantity, 0)

    // country: "JP" required by Ship&co for both addresses
    const fromAddress = {
      full_name: resolvedName,
      country: "JP",
      province: fromAddr.prefecture,
      city: fromAddr.city,
      address1: [fromAddr.district, fromAddr.building].filter(Boolean).join(" ") || fromAddr.city,
      zip: fromAddr.postal_code.replace(/\D/g, ""),
      phone: fromAddr.phone ?? "",
    }

    const toAddress = {
      full_name: address.name,
      country: "JP",   // address form is JP-only; always explicit
      province: address.prefecture,
      city: address.city,
      address1: [address.district, address.building].filter(Boolean).join(" ") || address.city,
      zip: address.postalCode.replace(/\D/g, ""),
      phone: address.phone,
    }

    console.log(`[shipping-rates] from: ${fromAddress.zip} ${fromAddress.province} ${fromAddress.city} ${fromAddress.address1}`)
    console.log(`[shipping-rates] to:   ${toAddress.zip} ${toAddress.province} ${toAddress.city} ${toAddress.address1}`)
    console.log(`[shipping-rates] totalGrams=${totalGrams} totalQuantity=${totalQuantity}`)

    // ── 4. Request rates per carrier ─────────────────────────────────────────
    const roasterRates: ShipcoRate[] = []

    if (carriers.length === 0) {
      console.warn(`[shipping-rates] skipping rates call for "${roasterName}" — no carriers registered`)
      results.push({ roasterName, rates: [], fallback: true })
      continue
    }

    for (const carrier of carriers) {
      let requestBody: Record<string, unknown>

      if (isDomestic) {
        requestBody = {
          setup: {
            carrier_id: carrier.id,
            shipment_date: today,
            pack_size: 60,
            pack_amount: 1,
            test: true,
          },
          from_address: fromAddress,
          to_address: toAddress,
        }
      } else {
        requestBody = {
          setup: {
            carrier_id: carrier.id,
            shipment_date: today,
            test: true,
          },
          from_address: fromAddress,
          to_address: toAddress,
          parcels: [
            {
              weight: Math.max(totalGrams, 100),
              width: 20,
              height: 15,
              depth: 10,
            },
          ],
          products: roasterItems.map(i => ({
            name: i.productName,
            hs_code: "090121",
            origin_country: "JP",
            quantity: i.quantity,
            unit_price: i.price,
            currency: "JPY",
          })),
          customs: { content_type: "MERCHANDISE" },
        }
      }

      console.log(`[shipping-rates] POST /rates carrier=${carrier.carrier}(${carrier.id}) for "${roasterName}": ${JSON.stringify(requestBody)}`)

      const ratesResp = await shipcoPost("/rates", token, requestBody).catch(err => {
        console.error(`[shipping-rates] network error (${carrier.carrier} / "${roasterName}"):`, err)
        return null
      })

      console.log(`[shipping-rates] /rates response carrier=${carrier.carrier} status=${ratesResp?.status ?? "error"} body=${ratesResp?.text ?? "(fetch failed)"}`)

      if (!ratesResp?.ok || !ratesResp.text) continue

      let parsed: { rates?: Array<{ service: string; currency: string; price: number }> }
      try {
        parsed = JSON.parse(ratesResp.text)
      } catch {
        console.error(`[shipping-rates] failed to parse rates JSON (${carrier.carrier}): ${ratesResp.text}`)
        continue
      }

      for (const r of parsed.rates ?? []) {
        roasterRates.push({
          carrier: carrier.carrier,
          service: r.service,
          currency: r.currency,
          price: r.price,
        })
      }
    }

    console.log(`[shipping-rates] total rates for "${roasterName}": ${roasterRates.length} — ${roasterRates.map(r => `${r.carrier}/${r.service}=¥${r.price}`).join(", ") || "(none)"}`)
    results.push({ roasterName, rates: roasterRates, fallback: roasterRates.length === 0 })
  }

  const anyFallback = results.some(r => r.fallback)
  return NextResponse.json({ rates: results, fallback: anyFallback })
}
