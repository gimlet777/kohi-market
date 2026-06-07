import { supabaseAdmin } from "@/lib/supabase-admin"
import { REGIONS } from "@/lib/gamification-constants"

export type { Region } from "@/lib/gamification-constants"
export { REGIONS }

export async function awardOrderRewards({
  userId,
  totalAmount,
  stripeSessionId,
  roasterRegions,
  productOrigins,
}: {
  userId: string
  totalAmount: number
  stripeSessionId: string
  roasterRegions: string[]
  productOrigins: string[]
}) {
  console.log(`[gamification] start userId=${userId} session=${stripeSessionId} totalAmount=${totalAmount}`)

  // ── 1. 豆ポイント — 1 pt per ¥10 spent ────────────────────────────────────────
  const points = Math.floor(totalAmount / 10)
  if (points > 0) {
    const { error } = await supabaseAdmin.from("points_transactions").insert({
      user_id: userId,
      points,
      reason: "purchase",
      reference_id: stripeSessionId,
    })
    if (error?.code === "23505") {
      console.log(`[gamification] points already awarded (idempotent) userId=${userId}`)
    } else if (error) {
      console.error("[gamification] points insert error:", error.code, error.message, error.details)
    } else {
      console.log(`[gamification] awarded ${points}pt to userId=${userId}`)
    }
  } else {
    console.log(`[gamification] no points to award (totalAmount=${totalAmount})`)
  }

  // ── 2. Regional badges ────────────────────────────────────────────────────────
  for (const region of roasterRegions) {
    if (!region) continue
    const matched = REGIONS.find(r => r.toLowerCase() === region.toLowerCase())
    if (!matched) {
      console.log(`[gamification] region "${region}" not in REGIONS list — skipping`)
      continue
    }
    const badgeType = `region_${matched.toLowerCase()}`
    const { error } = await supabaseAdmin.from("badges").insert({
      user_id: userId,
      badge_type: badgeType,
      badge_data: { region: matched },
    })
    if (error?.code === "23505") {
      console.log(`[gamification] badge ${badgeType} already exists (idempotent)`)
    } else if (error) {
      console.error(`[gamification] region badge error (${badgeType}):`, error.code, error.message, error.details)
    } else {
      console.log(`[gamification] awarded badge ${badgeType} to userId=${userId}`)
    }
  }

  // ── 3. Coffee Traveller master badge — all 5 regions ─────────────────────────
  const { data: regionBadges, error: regionCheckErr } = await supabaseAdmin
    .from("badges")
    .select("badge_type")
    .eq("user_id", userId)
    .in("badge_type", REGIONS.map(r => `region_${r.toLowerCase()}`))

  if (regionCheckErr) {
    console.error("[gamification] coffee_traveller check error:", regionCheckErr.message)
  } else {
    console.log(`[gamification] user has ${regionBadges?.length ?? 0}/${REGIONS.length} region badges`)
    if (regionBadges && regionBadges.length >= REGIONS.length) {
      const { error } = await supabaseAdmin.from("badges").insert({
        user_id: userId,
        badge_type: "coffee_traveller",
        badge_data: {},
      })
      if (error?.code === "23505") {
        console.log("[gamification] coffee_traveller already awarded (idempotent)")
      } else if (error) {
        console.error("[gamification] coffee_traveller badge error:", error.code, error.message, error.details)
      } else {
        console.log(`[gamification] awarded coffee_traveller master badge to userId=${userId}`)
      }
    }
  }

  // ── 4. Origin passport stamps ─────────────────────────────────────────────────
  for (const origin of productOrigins) {
    if (!origin) continue
    const badgeType = `origin_${origin.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`
    const { error } = await supabaseAdmin.from("badges").insert({
      user_id: userId,
      badge_type: badgeType,
      badge_data: { origin },
    })
    if (error?.code === "23505") {
      console.log(`[gamification] origin stamp ${badgeType} already exists (idempotent)`)
    } else if (error) {
      console.error(`[gamification] origin stamp error (${badgeType}):`, error.code, error.message, error.details)
    } else {
      console.log(`[gamification] awarded origin stamp ${badgeType} to userId=${userId}`)
    }
  }

  console.log(`[gamification] done userId=${userId} pts=${points} regions=[${roasterRegions.join(",")}] origins=[${productOrigins.join(",")}]`)
}
