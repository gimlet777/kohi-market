import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendOrderReminderEmail } from "@/lib/email"

// Called by a Vercel cron or external scheduler once daily.
// Authorization: x-cron-secret header must match CRON_SECRET env var.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret")
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id, roaster_id, buyer_name, buyer_email, items, total_amount, stripe_session_id")
    .eq("status", "pending")
    .eq("reminder_sent", false)
    .lt("created_at", threeDaysAgo)

  if (error) {
    console.error("[order-reminders] fetch error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const dashboardUrl = `${siteUrl}/roaster/dashboard?tab=orders`
  let sent = 0

  for (const order of orders ?? []) {
    if (!order.roaster_id) continue

    const { data: roaster } = await supabaseAdmin
      .from("roasters")
      .select("email, roaster_name")
      .eq("id", order.roaster_id)
      .single()

    if (!roaster?.email) continue

    const { data: prefs } = await supabaseAdmin
      .from("roaster_notification_preferences")
      .select("order_reminder")
      .eq("roaster_id", order.roaster_id)
      .maybeSingle()

    if (!(prefs?.order_reminder ?? true)) continue

    await sendOrderReminderEmail({
      to: roaster.email,
      roasterName: roaster.roaster_name,
      orderRef: order.stripe_session_id ?? order.id,
      buyerName: order.buyer_name,
      buyerEmail: order.buyer_email,
      items: order.items ?? [],
      totalAmount: order.total_amount,
      dashboardUrl,
    }).catch(err => console.error(`[order-reminders] email error for order ${order.id}:`, err))

    await supabaseAdmin
      .from("orders")
      .update({ reminder_sent: true })
      .eq("id", order.id)

    sent++
  }

  console.log(`[order-reminders] processed=${orders?.length ?? 0} sent=${sent}`)
  return NextResponse.json({ processed: orders?.length ?? 0, sent })
}
