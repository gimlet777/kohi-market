import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import type { ShippingAddress } from "@/app/checkout/address/page"

export interface ShipcoRate {
  carrier: string
  service: string
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

type RoasterShippingAddress = {
  postal_code?: string
  prefecture?: string
  city?: string
  district?: string
  building?: string
  phone?: string
}

function estimatePackSize(totalGrams: number): string {
  if (totalGrams <= 300) return "60"
  if (totalGrams <= 600) return "80"
  if (totalGrams <= 1000) return "100"
  return "120"
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
    console.warn("[shipping-rates] SHIPCO_API_TOKEN not set — returning fallback")
    return NextResponse.json({ rates: [], fallback: true })
  }

  // Group items by roaster
  const byRoaster = new Map<string, CartItemForRates[]>()
  for (const item of items) {
    const list = byRoaster.get(item.roasterName) ?? []
    list.push(item)
    byRoaster.set(item.roasterName, list)
  }

  console.log(`[shipping-rates] roasters in request: [${[...byRoaster.keys()].join(", ")}]`)
  // address.country is always undefined for the Japanese address form (no country field).
  // isDomestic defaults to true; to_address.country is explicitly set to "JP" below.
  const isDomestic = !address.country || address.country === "JP"
  const today = new Date().toISOString().slice(0, 10)
  console.log(`[shipping-rates] isDomestic=${isDomestic} shipment_date=${today} to_zip=${address.postalCode.replace(/\D/g, "")} to_prefecture=${address.prefecture}`)

  const results: RoasterRates[] = []

  for (const [roasterName, roasterItems] of byRoaster) {
    // 1. Try authenticated roasters table first
    const { data: roaster, error: dbError } = await supabaseAdmin
      .from("roasters")
      .select("roaster_name, shipping_address")
      .ilike("roaster_name", roasterName.trim())
      .maybeSingle()

    if (dbError) {
      console.error(`[shipping-rates] DB error looking up roaster "${roasterName}":`, dbError.message)
    }

    let fromAddr = (roaster?.shipping_address ?? null) as RoasterShippingAddress | null
    let resolvedName = (roaster?.roaster_name as string | null) ?? roasterName

    // 2. Fall back to override table for seed/demo roasters with no auth account
    if (!roaster || !fromAddr?.postal_code) {
      console.log(`[shipping-rates] roaster "${roasterName}" not found in roasters table (found=${!!roaster}) — checking overrides table`)
      const { data: override, error: overrideErr } = await supabaseAdmin
        .from("roaster_shipping_overrides")
        .select("roaster_name, shipping_address")
        .ilike("roaster_name", roasterName.trim())
        .maybeSingle()

      if (overrideErr) {
        console.error(`[shipping-rates] overrides table error for "${roasterName}":`, overrideErr.message)
      }
      if (override) {
        fromAddr = override.shipping_address as RoasterShippingAddress
        resolvedName = override.roaster_name
        console.log(`[shipping-rates] found override address for "${roasterName}": ${JSON.stringify(fromAddr)}`)
      } else {
        console.log(`[shipping-rates] no override found for "${roasterName}" either`)
      }
    } else {
      console.log(`[shipping-rates] found roasters-table address for "${roasterName}": ${JSON.stringify(fromAddr)}`)
    }

    if (!fromAddr?.postal_code || !fromAddr?.prefecture || !fromAddr?.city) {
      console.warn(`[shipping-rates] "${roasterName}" still missing required address fields — postal_code=${fromAddr?.postal_code ?? "MISSING"} prefecture=${fromAddr?.prefecture ?? "MISSING"} city=${fromAddr?.city ?? "MISSING"}`)
      results.push({ roasterName, rates: [], fallback: true })
      continue
    }

    const totalGrams = roasterItems.reduce((sum, i) => sum + (i.grams || 100) * i.quantity, 0)
    const totalQuantity = roasterItems.reduce((sum, i) => sum + i.quantity, 0)
    console.log(`[shipping-rates] roaster="${roasterName}" totalGrams=${totalGrams} totalQuantity=${totalQuantity}`)

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
      country: address.country ?? "JP",
      province: address.prefecture,
      city: address.city,
      address1: [address.district, address.building].filter(Boolean).join(" ") || address.city,
      zip: address.postalCode.replace(/\D/g, ""),
      phone: address.phone,
    }

    let requestBody: Record<string, unknown>

    if (isDomestic) {
      requestBody = {
        setup: {
          shipment_date: today,
          pack_size: estimatePackSize(totalGrams),
          pack_amount: totalQuantity,
          test: true,
        },
        from_address: fromAddress,
        to_address: toAddress,
      }
    } else {
      requestBody = {
        setup: {
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
        customs: {
          content_type: "MERCHANDISE",
        },
      }
    }

    console.log(`[shipping-rates] Ship&co request body for "${roasterName}":`, JSON.stringify(requestBody))

    try {
      const res = await fetch("https://api.shipandco.com/v1/rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
        body: JSON.stringify(requestBody),
      })

      const rawBody = await res.text()
      console.log(`[shipping-rates] Ship&co response for "${roasterName}": status=${res.status} body=${rawBody}`)

      if (!res.ok) {
        console.error(`[shipping-rates] Ship&co error ${res.status} for roaster="${roasterName}"`)
        results.push({ roasterName, rates: [], fallback: true })
        continue
      }

      let data: { rates?: ShipcoRate[] }
      try {
        data = JSON.parse(rawBody)
      } catch {
        console.error(`[shipping-rates] failed to parse Ship&co JSON for "${roasterName}": ${rawBody}`)
        results.push({ roasterName, rates: [], fallback: true })
        continue
      }

      const rates: ShipcoRate[] = (data.rates ?? []).map((r: ShipcoRate) => ({
        carrier: r.carrier,
        service: r.service,
        currency: r.currency,
        price: r.price,
      }))

      console.log(`[shipping-rates] parsed ${rates.length} rate(s) for "${roasterName}": ${rates.map(r => `${r.carrier}/${r.service}=¥${r.price}`).join(", ") || "(none)"}`)
      results.push({ roasterName, rates, fallback: rates.length === 0 })
    } catch (err) {
      console.error(`[shipping-rates] network error for roaster="${roasterName}":`, err)
      results.push({ roasterName, rates: [], fallback: true })
    }
  }

  const anyFallback = results.some(r => r.fallback)
  return NextResponse.json({ rates: results, fallback: anyFallback })
}
