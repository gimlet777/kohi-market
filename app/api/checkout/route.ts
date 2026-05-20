import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import type { ShippingAddress } from "@/app/checkout/address/page"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

interface LineItem {
  productName: string
  roasterName: string
  format: { name: string; grams: number; price: number }
  price: number
  quantity: number
  batchId?: string
}

export async function POST(req: NextRequest) {
  let items: LineItem[]
  let address: ShippingAddress | undefined

  try {
    const body = await req.json()
    items = body.items
    address = body.address
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
  }

  // Look up roaster emails keyed by roaster name
  const roasterNames = [...new Set(items.map(i => i.roasterName))]
  const { data: profiles } = await supabaseAdmin
    .from("roasters")
    .select("roaster_name, email")
    .in("roaster_name", roasterNames)

  const roasterEmailMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    if (p.roaster_name && p.email) roasterEmailMap[p.roaster_name] = p.email
  }

  const origin = req.nextUrl.origin

  // Build the shipping object for Stripe PaymentIntent if address was provided
  const stripeShipping: Stripe.Checkout.SessionCreateParams["payment_intent_data"] =
    address
      ? {
          shipping: {
            name: address.name,
            phone: address.phone,
            address: {
              line1: [address.district, address.building]
                .map(s => s.trim())
                .filter(Boolean)
                .join(" "),
              city: address.city,
              state: address.prefecture,
              postal_code: address.postalCode.replace(/\D/g, ""),
              country: "JP",
            },
          },
        }
      : undefined

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Shipping was collected on our address page — don't show Stripe's form
      ...(address
        ? {}
        : {
            shipping_address_collection: {
              allowed_countries: ["JP"],
            },
          }),
      line_items: items.map(item => ({
        price_data: {
          currency: "jpy",
          product_data: {
            name: item.productName,
            description: [
              item.roasterName,
              item.format.name,
              item.format.grams > 0 ? `${item.format.grams}g` : null,
            ]
              .filter(Boolean)
              .join(" · "),
            metadata: {
              roaster_name: item.roasterName,
              roaster_email: roasterEmailMap[item.roasterName] ?? "",
              format_name: item.format.name,
              grams: String(item.format.grams),
              batch_id: item.batchId ?? "",
            },
          },
          unit_amount: item.price, // JPY is zero-decimal — ¥1800 = 1800
        },
        quantity: item.quantity,
      })),
      // Store the collected address in session metadata so the webhook can read it
      metadata: address
        ? { shipping_address: JSON.stringify(address) }
        : {},
      payment_intent_data: stripeShipping,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error"
    console.error("Stripe checkout error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
