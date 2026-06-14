import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { buildStampUrl } from "@/lib/stampQr"

export async function GET(req: NextRequest) {
  // Verify bearer token from roaster session
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim()
  if (!token) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
  }

  // Fetch the roaster row (verifies the user is actually a roaster)
  const { data: roaster, error: roasterError } = await supabaseAdmin
    .from("roasters")
    .select("id, qr_version")
    .eq("id", user.id)
    .single()

  if (roasterError || !roaster) {
    return NextResponse.json({ error: "Roaster account not found" }, { status: 404 })
  }

  if (!process.env.STAMP_SECRET) {
    return NextResponse.json({ error: "STAMP_SECRET is not configured" }, { status: 500 })
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    return NextResponse.json({ error: "NEXT_PUBLIC_SITE_URL is not configured" }, { status: 500 })
  }

  const version: number = roaster.qr_version ?? 1

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL

  const stampUrl = buildStampUrl(roaster.id, version, baseUrl)

  const pngBuffer = await QRCode.toBuffer(stampUrl, {
    type: "png",
    width: 800,
    margin: 2,
    color: {
      dark: "#2A1508",
      light: "#FFFFFF",
    },
  })

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="stamp-qr-v${version}.png"`,
      "Cache-Control": "no-store",
      "X-Debug-Base-Url": baseUrl,
    },
  })
}
