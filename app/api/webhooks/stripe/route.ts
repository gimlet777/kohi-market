import Stripe from "stripe"
import { NextRequest, NextResponse } from "next/server"
import { sendBuyerConfirmation, sendRoasterNotification, OrderEmailItem } from "@/lib/email"
import { supabaseAdmin } from "@/lib/supabase-admin"

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
  const buyerName = session.customer_details?.name ?? "Customer"
  const rawAddr = session.collected_information?.shipping_details?.address ?? null

  const shippingAddressString = rawAddr
    ? [rawAddr.line1, rawAddr.line2, rawAddr.city, rawAddr.state, rawAddr.postal_code, rawAddr.country]
        .filter(Boolean)
        .join(", ")
    : "No address provided"

  // Build items grouped by roaster
  const roasterItems: Record<string, {
    email: string
    name: string
    items: (OrderEmailItem & { batchId?: string })[]
  }> = {}

  for (const li of session.line_items?.data ?? []) {
    const product = li.price?.product as Stripe.Product | null
    if (!product || product.deleted) continue

    const meta = product.metadata ?? {}
    const roasterName = meta.roaster_name ?? "Unknown Roaster"
    const roasterEmail = meta.roaster_email ?? ""
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
    }

    if (!roasterItems[roasterName]) {
      roasterItems[roasterName] = { email: roasterEmail, name: roasterName, items: [] }
    }
    roasterItems[roasterName].items.push(item)
  }

  // Look up roaster user IDs by name
  const roasterNames = Object.keys(roasterItems)
  const { data: roasterRows } = await supabaseAdmin
    .from("roasters")
    .select("id, roaster_name")
    .in("roaster_name", roasterNames)

  const roasterIdMap: Record<string, string> = {}
  for (const r of roasterRows ?? []) {
    if (r.roaster_name) roasterIdMap[r.roaster_name] = r.id
  }

  // Save one order row per roaster (stripe_session_id is UNIQUE — duplicate webhook = conflict)
  for (const [roasterName, roaster] of Object.entries(roasterItems)) {
    const roasterId = roasterIdMap[roasterName]
    if (!roasterId) {
      console.warn(`Could not find roaster_id for: ${roasterName}`)
      continue
    }
    const roasterTotal = roaster.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

    const { error: insertError } = await supabaseAdmin.from("orders").insert({
      roaster_id: roasterId,
      buyer_email: buyerEmail ?? "unknown",
      buyer_name: buyerName,
      shipping_address: rawAddr,
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
    })

    // 23505 = unique_violation — already processed this session (idempotency guard)
    if (insertError?.code === "23505") {
      console.log("Duplicate webhook for session:", session.id)
      return NextResponse.json({ received: true })
    }
    if (insertError) console.error(`Order insert error (${roasterName}):`, insertError)
  }

  // Decrement bags_remaining for any batch pre-orders
  for (const roaster of Object.values(roasterItems)) {
    for (const item of roaster.items) {
      if (!item.batchId) continue

      const { data: batch, error: fetchErr } = await supabaseAdmin
        .from("batches")
        .select("bags_remaining")
        .eq("id", item.batchId)
        .single()

      if (fetchErr || !batch) {
        console.warn(`Batch not found: ${item.batchId}`)
        continue
      }

      const newRemaining = Math.max(0, batch.bags_remaining - item.quantity)
      const { error: updateErr } = await supabaseAdmin
        .from("batches")
        .update({
          bags_remaining: newRemaining,
          ...(newRemaining === 0 ? { status: "complete" } : {}),
        })
        .eq("id", item.batchId)

      if (updateErr) console.error(`Batch update error (${item.batchId}):`, updateErr)
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

  return NextResponse.json({ received: true })
}
