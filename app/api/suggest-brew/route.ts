import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { brewMethod, roastLevel, coffeeProcess, origin } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 500 })
  }

  const prompt = `You are a specialty coffee expert. Suggest precise brewing parameters for a ${roastLevel || "medium"} roast, ${coffeeProcess || "washed"} process coffee from ${origin || "unknown origin"} using the ${brewMethod} method.

Return ONLY valid JSON with these exact keys (no markdown, no explanation):
{
  "grind": one of ["Extra Fine", "Fine", "Medium Fine", "Medium", "Coarse", "Extra Coarse"],
  "ratio": coffee-to-water ratio string like "1 : 15",
  "temp": water temperature as a number only (no units), e.g. 93,
  "time": brew time as a short string like "3–4 min" or "25–30 sec",
  "tips": array of 2–3 short tip strings
}`

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: "Upstream error" }, { status: 502 })
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ""

  try {
    const suggestion = JSON.parse(text)
    return NextResponse.json(suggestion)
  } catch {
    return NextResponse.json({ error: "Invalid response from model", raw: text }, { status: 502 })
  }
}
