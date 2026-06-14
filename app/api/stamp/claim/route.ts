import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { computeStampSig } from "@/lib/stampQr"

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { roaster?: string; v?: string; sig?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { roaster: roasterId, v, sig } = body
  if (!roasterId || !v || !sig) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const version = parseInt(v, 10)
  if (isNaN(version) || version < 1) {
    return NextResponse.json({ status: "invalid_code" })
  }

  // ── Validate signature ────────────────────────────────────────────────────
  // Reject anything that isn't a 64-char lowercase hex string (SHA256 output)
  if (!/^[0-9a-f]{64}$/i.test(sig)) {
    return NextResponse.json({ status: "invalid_code" })
  }

  let expectedSig: string
  try {
    expectedSig = computeStampSig(roasterId, version)
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  const sigsMatch = crypto.timingSafeEqual(
    Buffer.from(sig.toLowerCase(), "hex"),
    Buffer.from(expectedSig, "hex"),
  )

  if (!sigsMatch) {
    return NextResponse.json({ status: "invalid_code" })
  }

  // ── Fetch roaster + check current qr_version ──────────────────────────────
  const { data: roaster, error: roasterError } = await supabaseAdmin
    .from("roasters")
    .select("id, roaster_name, qr_version, logo_url")
    .eq("id", roasterId)
    .single()

  if (roasterError || !roaster) {
    return NextResponse.json({ status: "invalid_code" })
  }

  if ((roaster.qr_version ?? 1) !== version) {
    return NextResponse.json({
      status: "expired_code",
      roasterName: roaster.roaster_name,
    })
  }

  // ── Duplicate check: one stamp per calendar day (UTC) ─────────────────────
  const todayUTC = new Date()
  todayUTC.setUTCHours(0, 0, 0, 0)

  const { data: existingToday } = await supabaseAdmin
    .from("stamps")
    .select("id")
    .eq("user_id", user.id)
    .eq("roaster_id", roasterId)
    .gte("scanned_at", todayUTC.toISOString())
    .limit(1)
    .maybeSingle()

  if (existingToday) {
    const { count } = await supabaseAdmin
      .from("stamps")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("roaster_id", roasterId)

    return NextResponse.json({
      status: "duplicate",
      roasterName: roaster.roaster_name,
      logoUrl: roaster.logo_url ?? null,
      stampCount: count ?? 1,
    })
  }

  // ── Insert stamp ──────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const { error: insertError } = await supabaseAdmin
    .from("stamps")
    .insert({ user_id: user.id, roaster_id: roasterId, scanned_at: now, created_at: now })

  if (insertError) {
    console.error("Stamp insert error:", insertError)
    return NextResponse.json({ error: "Failed to record stamp" }, { status: 500 })
  }

  // ── Return success with total lifetime count ──────────────────────────────
  const { count } = await supabaseAdmin
    .from("stamps")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("roaster_id", roasterId)

  return NextResponse.json({
    status: "success",
    roasterName: roaster.roaster_name,
    logoUrl: roaster.logo_url ?? null,
    stampCount: count ?? 1,
  })
}
