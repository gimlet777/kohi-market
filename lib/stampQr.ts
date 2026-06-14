import crypto from "crypto"

// Server-only — STAMP_SECRET must not be exposed to the client bundle.

export function computeStampSig(roasterId: string, qrVersion: number): string {
  const secret = process.env.STAMP_SECRET
  if (!secret) throw new Error("STAMP_SECRET is not configured")
  return crypto
    .createHmac("sha256", secret)
    .update(`${roasterId}:${qrVersion}`)
    .digest("hex")
}

export function buildStampUrl(roasterId: string, qrVersion: number, baseUrl: string): string {
  const sig = computeStampSig(roasterId, qrVersion)
  return `${baseUrl}/stamp?roaster=${encodeURIComponent(roasterId)}&v=${qrVersion}&sig=${sig}`
}
