import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"
import { sendBuyerConfirmation, sendRoasterNotification, OrderEmailItem } from "@/lib/email"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { awardOrderRewards } from "@/lib/gamification"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed"
    console.error("Stripe webhook error:", message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true })
  }

  const session = await stripe.checkout.sessions.retrieve(event.data.object.id, {
    expand: ["line_items.data.price.product"],
  })

  const buyerEmail = session.customer_details?.email
  console.log(`[webhook] checkout.session.completed session=${session.id} buyerEmail=${buyerEmail ?? "(none)"}`)

  // Address preference: our pre-collected form (in metadata) > Stripe-collected fallback
  let shippingAddressForDb: Record<string, string> | null = null
  let shippingAddressString = "No address provided"
  let buyerName = "Customer"

  const metaAddr = session.metadata?.shipping_address
  if (metaAddr) {
    // Address came from our /checkout/address page
    const a = JSON.parse(metaAddr) as {
      postalCode: string; prefecture: string; city: string
      district: string; building: string; name: string; phone: string
    }
    buyerName = a.name || session.customer_details?.name || "Customer"
    shippingAddressForDb = {
      postal_code: a.postalCode,
      prefecture: a.prefecture,
      city: a.city,
      district: a.district,
      building: a.building,
      name: a.name,
      phone: a.phone,
    }
    shippingAddressString = [
      `〒${a.postalCode}`,
      a.prefecture,
      a.city,
      a.district,
      a.building,
    ].filter(Boolean).join(" ")
  } else {
    // Fallback: Stripe collected the address via shipping_address_collection
    buyerName = session.customer_details?.name ?? "Customer"
    const rawAddr = session.collected_information?.shipping_details?.address ?? null
    if (rawAddr) {
      shippingAddressForDb = {
        line1: rawAddr.line1 ?? "",
        line2: rawAddr.line2 ?? "",
        city: rawAddr.city ?? "",
        state: rawAddr.state ?? "",
        postal_code: rawAddr.postal_code ?? "",
        country: rawAddr.country ?? "",
      }
      shippingAddressString = [
        rawAddr.line1, rawAddr.line2, rawAddr.city,
        rawAddr.state, rawAddr.postal_code, rawAddr.country,
      ].filter(Boolean).join(", ")
    }
  }

  // Build items grouped by roaster
  const roasterItems: Record<string, {
    email: string
    name: string
    items: (OrderEmailItem & { batchId?: string; roasterRegion: string; productOrigin: string })[]
  }> = {}

  for (const li of session.line_items?.data ?? []) {
    const product = li.price?.product as Stripe.Product | null
    if (!product || product.deleted) continue

    const meta = product.metadata ?? {}
    const roasterName = meta.roaster_name ?? "Unknown Roaster"
    const roasterEmail = meta.roaster_email ?? ""
    const roasterRegion = meta.roaster_region ?? ""
    const productOrigin = meta.product_origin ?? ""
    const formatName = meta.format_name ?? ""
    const grams = parseInt(meta.grams ?? "0", 10)
    const batchId = meta.batch_id || undefined
    const unitAmount = li.price?.unit_amount ?? 0
    const quantity = li.quantity ?? 1

    const item = {
      productName: product.name,
      roasterName,
      formatName,
      grams,
      unitPrice: unitAmount,
      quantity,
      batchId,
      roasterRegion,
      productOrigin,
    }

    if (!roasterItems[roasterName]) {
      roasterItems[roasterName] = { email: roasterEmail, name: roasterName, items: [] }
    }
    roasterItems[roasterName].items.push(item)
  }

  // Look up roaster IDs — case-insensitive to tolerate metadata/DB casing differences
  const roasterNames = Object.keys(roasterItems)
  console.log(`[webhook] roasters in cart: [${roasterNames.join(", ")}]`)

  const roasterIdMap: Record<string, string | null> = {}
  for (const name of roasterNames) {
    const { data, error } = await supabaseAdmin
      .from("roasters")
      .select("id, roaster_name")
      .ilike("roaster_name", name.trim())
      .maybeSingle()
    if (error) {
      console.error(`[webhook] roaster lookup error for "${name}":`, error.message)
      roasterIdMap[name] = null
    } else if (data) {
      console.log(`[webhook] matched roaster "${name}" → id=${data.id} (db name: "${data.roaster_name}")`)
      roasterIdMap[name] = data.id
    } else {
      console.warn(`[webhook] no roaster found for name="${name}" (case-insensitive) — will save order with roaster_id=null`)
      roasterIdMap[name] = null
    }
  }

  // Buyer's auth user ID (set by /api/checkout when the user was logged in)
  const buyerUserId = session.metadata?.user_id ?? null

  // Fetch region from DB by roaster ID — don't trust Stripe metadata which may be empty
  // if the checkout route's case-sensitive name lookup missed the roaster.
  const resolvedRoasterIds = Object.values(roasterIdMap).filter((id): id is string => id !== null)
  const roasterRegionById: Record<string, string> = {}
  if (resolvedRoasterIds.length > 0) {
    const { data: regionRows } = await supabaseAdmin
      .from("roasters")
      .select("id, region")
      .in("id", resolvedRoasterIds)
    for (const r of regionRows ?? []) {
      if (r.id && r.region) roasterRegionById[r.id] = r.region
    }
    console.log(`[webhook] regions from DB: ${JSON.stringify(roasterRegionById)}`)
  }

  // Per-roaster idempotency: find which roasters already have an order for this session.
  // Checking per-roaster (not just "any order exists") means multi-roaster carts are handled
  // correctly — if the first roaster saved but the second didn't, a re-delivery saves the second.
  const { data: existingOrderRows } = await supabaseAdmin
    .from("orders")
    .select("roaster_id")
    .eq("stripe_session_id", session.id)

  const alreadySavedRoasterIds = new Set(
    (existingOrderRows ?? []).map(r => r.roaster_id).filter(Boolean)
  )
  if (alreadySavedRoasterIds.size > 0) {
    console.log(`[webhook] session ${session.id}: ${alreadySavedRoasterIds.size} roaster order(s) already saved, will skip those`)
  }

  // Save one order row per roaster (roaster_id may be null if lookup failed)
  for (const [roasterName, roaster] of Object.entries(roasterItems)) {
    const roasterId = roasterIdMap[roasterName] ?? null

    // Skip only if THIS roaster's order is already saved
    if (roasterId && alreadySavedRoasterIds.has(roasterId)) {
      console.log(`[webhook] order for roaster "${roasterName}" already saved — skipping (idempotent)`)
      continue
    }

    const roasterTotal = roaster.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)
    console.log(`[webhook] inserting order roaster="${roasterName}" roaster_id=${roasterId ?? "null"} total=${roasterTotal} buyer_email="${buyerEmail ?? "unknown"}" buyer_user_id=${buyerUserId ?? "null"}`)

    const { data: inserted, error: insertError } = await supabaseAdmin.from("orders").insert({
      roaster_id: roasterId,
      buyer_user_id: buyerUserId,
      buyer_email: buyerEmail ?? "unknown",
      buyer_name: buyerName,
      shipping_address: shippingAddressForDb,
      items: roaster.items.map(i => ({
        productName: i.productName,
        formatName: i.formatName,
        grams: i.grams,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
      total_amount: roasterTotal,
      status: "pending",
      stripe_session_id: session.id,
    }).select("id")

    if (insertError) {
      console.error(`[webhook] order insert FAILED (${roasterName}): code=${insertError.code} msg=${insertError.message} details=${insertError.details}`)
    } else {
      console.log(`[webhook] order inserted OK id=${inserted?.[0]?.id} roaster="${roasterName}"`)
    }
  }

  // Decrement bags_remaining for pre-order items — runs regardless of order save success
  for (const roaster of Object.values(roasterItems)) {
    for (const item of roaster.items) {
      if (!item.batchId) continue

      const { data: batch, error: fetchErr } = await supabaseAdmin
        .from("batches")
        .select("bags_remaining")
        .eq("id", item.batchId)
        .single()

      if (fetchErr || !batch) {
        console.warn(`[webhook] batch not found for id=${item.batchId}`)
        continue
      }

      const newRemaining = Math.max(0, batch.bags_remaining - item.quantity)
      console.log(`[webhook] decrementing batch ${item.batchId}: ${batch.bags_remaining} → ${newRemaining}`)

      const { error: updateErr } = await supabaseAdmin
        .from("batches")
        .update({
          bags_remaining: newRemaining,
          ...(newRemaining === 0 ? { status: "complete" } : {}),
        })
        .eq("id", item.batchId)

      if (updateErr) {
        console.error(`[webhook] batch update error (${item.batchId}):`, updateErr.message)
      } else {
        console.log(`[webhook] batch ${item.batchId} updated OK${newRemaining === 0 ? " — marked complete" : ""}`)
      }
    }
  }

  const allItems = Object.values(roasterItems).flatMap(r => r.items)
  const totalAmount = allItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  // Send buyer confirmation
  if (buyerEmail) {
    await sendBuyerConfirmation({
      to: buyerEmail,
      buyerName,
      items: allItems,
      totalAmount,
      orderRef: session.id,
    }).catch(err => console.error("Buyer email error:", err))
  }

  // Send one notification per roaster
  for (const roaster of Object.values(roasterItems)) {
    if (!roaster.email) {
      console.warn(`No email found for roaster: ${roaster.name}`)
      continue
    }
    await sendRoasterNotification({
      to: roaster.email,
      roasterName: roaster.name,
      items: roaster.items,
      buyerName,
      buyerEmail: buyerEmail ?? "unknown",
      shippingAddress: shippingAddressString,
      orderRef: session.id,
    }).catch(err => console.error(`Roaster email error (${roaster.name}):`, err))
  }

  // Award gamification rewards if the buyer was logged in (buyerUserId declared above)
  console.log(`[webhook] session=${session.id} buyerUserId=${buyerUserId ?? "(guest — no rewards)"} totalAmount=${totalAmount}`)
  console.log(`[webhook] session.metadata keys: ${Object.keys(session.metadata ?? {}).join(", ") || "(none)"}`)

  if (buyerUserId) {
    // Use regions fetched from DB (reliable); fall back to metadata only if no ID was resolved
    const roasterRegions = [...new Set(
      Object.entries(roasterIdMap).flatMap(([name, id]) => {
        const fromDb = id ? roasterRegionById[id] : null
        const fromMeta = roasterItems[name]?.items[0]?.roasterRegion ?? ""
        const region = fromDb || fromMeta
        return region ? [region] : []
      })
    )]
    const productOrigins = [...new Set(
      allItems.map(i => i.productOrigin).filter(Boolean)
    )]
    console.log(`[webhook] awarding rewards: regions=[${roasterRegions.join(", ")}] origins=[${productOrigins.join(", ")}]`)
    await awardOrderRewards({
      userId: buyerUserId,
      totalAmount,
      stripeSessionId: session.id,
      roasterRegions,
      productOrigins,
    }).catch(err => console.error("[webhook] awardOrderRewards threw:", err))
  } else {
    console.log("[webhook] skipping gamification — user_id not in session metadata (guest checkout or not passed)")
  }

  return NextResponse.json({ received: true })
}
