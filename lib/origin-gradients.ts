export function getOriginGradient(origin: string): string {
  const o = origin.toLowerCase()
  if (o.includes("ethiopia"))
    return "linear-gradient(145deg, #E8A030 0%, #C05A20 38%, #4A1208 72%, #1E0604 100%)"
  if (o.includes("colombia"))
    return "linear-gradient(145deg, #D4A030 0%, #9A4E22 38%, #4A2010 72%, #1E0C06 100%)"
  if (o.includes("guatemala"))
    return "linear-gradient(145deg, #D09028 0%, #7A3C18 38%, #2E0E06 72%, #120402 100%)"
  if (o.includes("kenya"))
    return "linear-gradient(145deg, #9C2618 0%, #5A1410 38%, #200806 72%, #080202 100%)"
  if (o.includes("brazil"))
    return "linear-gradient(145deg, #C87020 0%, #784018 38%, #301508 72%, #100402 100%)"
  if (o.includes("panama"))
    return "linear-gradient(145deg, #ECD478 0%, #C8A040 38%, #8A6028 72%, #4A3010 100%)"
  if (o.includes("peru") || o.includes("bolivia"))
    return "linear-gradient(145deg, #C89040 0%, #7A4820 38%, #2E1208 72%, #100402 100%)"
  if (o.includes("yemen") || o.includes("java"))
    return "linear-gradient(145deg, #A06828 0%, #603820 38%, #281408 72%, #0E0604 100%)"
  // Fallback — warm generic coffee tones
  return "linear-gradient(145deg, #C8965A 0%, #7A4028 45%, #2C1008 100%)"
}
