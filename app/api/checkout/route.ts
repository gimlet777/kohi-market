import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import type { ShippingAddress, ShippingSelection } from "@/app/checkout/address/page"
import type { FormatOption } from "@/lib/products"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const MAX_QTY = 50

interface LineItemRequest {
  productId: number
  formatName: string
  quantity: number
  batchId?: string
}

function validateAddress(addr: ShippingAddress): string | null {
  if (!addr.postalCode || !/^\d{3}-?\d{4}$/.test(addr.postalCode.trim())) {
    return "Invalid postal code — must be 7 digits (e.g. 1500001 or 150-0001)"
  }
  if (!addr.prefecture?.trim()) return "Prefecture is required"
  if (!addr.city?.trim())       return "City is required"
  if (!addr.district?.trim())   return "District / street number is required"
  if (!addr.name?.trim())       return "Recipient name is required"
  if (!addr.phone?.trim())      return "Phone number is required"
  return null
}

export async function POST(req: NextRequest) {
  let items: LineItemRequest[]
  let address: ShippingAddress | undefined
  let userId: string | undefined
  let shippingSelections: ShippingSelection[] | undefined

  try {
    const body = await req.json()
    items = body.items
    address = body.address
    userId = body.userId || undefined
    shippingSelections = body.shippingSelections || undefined
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
  }

  // ── 1. Validate every item field before touching the DB ─────────────────────
  for (const item of items) {
    if (typeof item.productId !== "number" || !Number.isInteger(item.productId) || item.productId <= 0) {
      return NextResponse.json({ error: `Invalid productId: ${item.productId}` }, { status: 400 })
    }
    if (typeof item.formatName !== "string" || !item.formatName.trim()) {
      return NextResponse.json({ error: "formatName must be a non-empty string" }, { status: 400 })
    }
    if (
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QTY
    ) {
      return NextResponse.json(
        { error: `Quantity must be a whole number between 1 and ${MAX_QTY}` },
        { status: 400 }
      )
    }
    if (item.batchId !== undefined && (typeof item.batchId !== "string" || !item.batchId.trim())) {
      return NextResponse.json({ error: "batchId must be a non-empty string" }, { status: 400 })
    }
  }

  // ── 2. Validate shipping address ─────────────────────────────────────────────
  if (address) {
    const addrErr = validateAddress(address)
    if (addrErr) return NextResponse.json({ error: addrErr }, { status: 400 })
  }

  // ── 3. Bound-check shipping costs ────────────────────────────────────────────
  // Full re-verification against Ship&co would add latency; bound-checking
  // prevents the worst case (¥0 shipping or an absurd amount).
  if (shippingSelections) {
    for (const sel of shippingSelections) {
      if (
        typeof sel.cost !== "number" ||
        !Number.isInteger(sel.cost) ||
        sel.cost < 0 ||
        sel.cost > 10_000
      ) {
        return NextResponse.json(
          { error: `Shipping cost for "${sel.roasterName}" must be 0–¥10,000` },
          { status: 400 }
        )
      }
      if (!sel.carrier?.trim() || !sel.service?.trim()) {
        return NextResponse.json(
          { error: `Shipping selection for "${sel.roasterName}" is missing carrier or service` },
          { status: 400 }
        )
      }
    }
  }

  // ── 4. Fetch all referenced products from DB by ID ──────────────────────────
  const productIds = [...new Set(items.map(i => i.productId))]
  const { data: productRows, error: productFetchError } = await supabaseAdmin
    .from("products")
    .select("id, product_name, roaster_id, roaster_name, origin, formats")
    .in("id", productIds)

  if (productFetchError) {
    console.error("[checkout] product fetch error:", productFetchError.message)
    return NextResponse.json({ error: "Failed to look up products" }, { status: 500 })
  }

  const productMap = new Map((productRows ?? []).map(p => [p.id as number, p]))

  // ── 5. Resolve each line item — verify format and batch ─────────────────────
  interface ResolvedItem {
    productId: number
    productName: string
    roasterName: string
    origin: string
    formatName: string
    formatGrams: number
    unitPrice: number
    quantity: number
    batchId?: string
  }

  const resolvedItems: ResolvedItem[] = []

  for (const item of items) {
    const product = productMap.get(item.productId)
    if (!product) {
      return NextResponse.json(
        { error: `Product ${item.productId} not found` },
        { status: 400 }
      )
    }

    const formats = (Array.isArray(product.formats) ? product.formats : []) as FormatOption[]
    const format = formats.find(f => f.name === item.formatName.trim())
    if (!format) {
      return NextResponse.json(
        { error: `Format "${item.formatName}" not found for "${product.product_name}"` },
        { status: 400 }
      )
    }

    if (item.batchId) {
      const { data: batch, error: batchErr } = await supabaseAdmin
        .from("batches")
        .select("id, product_id, status, bags_remaining")
        .eq("id", item.batchId)
        .maybeSingle()

      if (batchErr || !batch) {
        return NextResponse.json(
          { error: `Batch not found for "${product.product_name}"` },
          { status: 400 }
        )
      }
      if (Number(batch.product_id) !== item.productId) {
        return NextResponse.json(
          { error: `Batch does not belong to "${product.product_name}"` },
          { status: 400 }
        )
      }
      if (batch.status !== "open") {
        return NextResponse.json(
          { error: `The "${product.product_name}" batch is no longer open for pre-orders` },
          { status: 400 }
        )
      }
      if (batch.bags_remaining < item.quantity) {
        return NextResponse.json(
          {
            error: `Not enough stock for "${product.product_name}" — ` +
              `${batch.bags_remaining} bag${batch.bags_remaining !== 1 ? "s" : ""} remaining`,
          },
          { status: 400 }
        )
      }
    }

    resolvedItems.push({
      productId: item.productId,
      productName: product.product_name as string,
      roasterName: product.roaster_name as string,
      origin: (product.origin as string) ?? "",
      formatName: format.name,
      formatGrams: format.grams,
      unitPrice: format.price,
      quantity: item.quantity,
      batchId: item.batchId,
    })
  }

  // ── 6. Look up roaster emails + regions ──────────────────────────────────────
  const roasterNames = [...new Set(resolvedItems.map(i => i.roasterName))]
  const roasterEmailMap: Record<string, string> = {}
  const roasterRegionMap: Record<string, string> = {}

  for (const name of roasterNames) {
    const { data } = await supabaseAdmin
      .from("roasters")
      .select("roaster_name, email, region")
      .ilike("roaster_name", name.trim())
      .maybeSingle()
    if (data) {
      if (data.email)  roasterEmailMap[name] = data.email as string
      if (data.region) roasterRegionMap[name] = data.region as string
    }
  }

  // ── 7. Compute server-authoritative expected total ───────────────────────────
  const itemsTotal    = resolvedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
  const shippingTotal = (shippingSelections ?? []).reduce((sum, s) => sum + s.cost, 0)
  const expectedTotal = itemsTotal + shippingTotal

  const origin = req.nextUrl.origin

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

  // ── 8. Create Stripe session with DB prices ──────────────────────────────────
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(address
        ? {}
        : { shipping_address_collection: { allowed_countries: ["JP"] } }),
      line_items: [
        ...resolvedItems.map(item => ({
          price_data: {
            currency: "jpy",
            product_data: {
              name: item.productName,
              description: [
                item.roasterName,
                item.formatName,
                item.formatGrams > 0 ? `${item.formatGrams}g` : null,
              ]
                .filter(Boolean)
                .join(" · "),
              metadata: {
                product_id:     String(item.productId),
                roaster_name:   item.roasterName,
                roaster_email:  roasterEmailMap[item.roasterName] ?? "",
                roaster_region: roasterRegionMap[item.roasterName] ?? "",
                product_origin: item.origin,
                format_name:    item.formatName,
                grams:          String(item.formatGrams),
                batch_id:       item.batchId ?? "",
              },
            },
            unit_amount: item.unitPrice,
          },
          quantity: item.quantity,
        })),
        ...(shippingTotal > 0
          ? [{
              price_data: {
                currency: "jpy",
                product_data: { name: "Shipping" },
                unit_amount: shippingTotal,
              },
              quantity: 1,
            }]
          : []),
      ],
      metadata: {
        ...(address             ? { shipping_address:    JSON.stringify(address) }          : {}),
        ...(userId              ? { user_id:             userId }                            : {}),
        ...(shippingSelections?.length
          ? { shipping_selections: JSON.stringify(shippingSelections) }
          : {}),
        expected_total_jpy: String(expectedTotal),
      },
      payment_intent_data: stripeShipping,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/checkout/cancel`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error"
    console.error("Stripe checkout error:", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
