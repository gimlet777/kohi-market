import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user?.email) {
    console.error("[api/orders] auth error:", authError?.message ?? "no user email")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log(`[api/orders] fetching orders for user.id="${user.id}" email="${user.email}"`)

  // Try matching by auth user ID OR email. buyer_user_id column may not exist yet
  // (pending migration), in which case we fall back to email-only.
  let { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, buyer_name, items, total_amount, status, created_at, buyer_email, buyer_user_id")
    .or(`buyer_user_id.eq.${user.id},buyer_email.eq.${user.email}`)
    .order("created_at", { ascending: false })

  // 42703 = column does not exist — buyer_user_id migration not yet applied
  if (error?.code === "42703") {
    console.log("[api/orders] buyer_user_id column not found, falling back to email-only query")
    const fallback = await supabaseAdmin
      .from("orders")
      .select("id, buyer_name, items, total_amount, status, created_at, buyer_email")
      .eq("buyer_email", user.email)
      .order("created_at", { ascending: false })
    data = fallback.data
    error = fallback.error
  }

  if (error) {
    console.error("[api/orders] fetch error:", error.code, error.message, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[api/orders] found ${data?.length ?? 0} order(s) for user_id=${user.id} / email="${user.email}"`)
  if (data?.length) {
    console.log(`[api/orders] buyer_emails in results: [${data.map(o => o.buyer_email).join(", ")}]`)
  }

  const orders = (data ?? []).map(({ buyer_email: _be, buyer_user_id: _uid, ...rest }) => rest)
  return NextResponse.json({ orders })
}
