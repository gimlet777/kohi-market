import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

interface LineItem {
  productName: string
  roasterName: string
  format: { name: string; grams: number; price: number }
  price: number
  quantity: number
}

export async function POST(req: NextRequest) {
  let items: LineItem[]
  try {
    const body = await req.json()
    items = body.items
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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: ["JP", "US", "GB", "AU", "CA", "DE", "FR", "NL", "SG", "HK"],
      },
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
            },
          },
          unit_amount: item.price, // JPY is zero-decimal — ¥1800 = 1800
        },
        quantity: item.quantity,
      })),
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
