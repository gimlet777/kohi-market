import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { brewMethod, productName, roastLevel, coffeeProcess, origin } = body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 })
  }

  const prompt = `You are a specialty coffee brewing expert. Suggest precise brewing parameters for this specific coffee:

Product: ${productName || "specialty coffee"}
Origin: ${origin || "unknown"}
Process: ${coffeeProcess || "washed"}
Roast level: ${roastLevel || "medium"}
Brewing method: ${brewMethod}

Return ONLY a valid JSON object — no markdown, no code fences, no explanation. Use exactly these keys:
{
  "grind": one of exactly ["Extra Fine", "Fine", "Medium Fine", "Medium", "Coarse", "Extra Coarse"],
  "ratio": coffee-to-water ratio string e.g. "1 : 15",
  "temp": water temperature as a plain integer (no units, no string), e.g. 93,
  "time": brew time as a short string e.g. "3–4 min" or "25–30 sec",
  "tips": array of exactly 2–3 short, actionable tip strings specific to this bean's characteristics
}`

  const requestBody = {
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  }

  console.log("[suggest-brew] sending request to Anthropic, model:", requestBody.model)

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error("[suggest-brew] Anthropic error", response.status, errText)
    return NextResponse.json(
      { error: "Anthropic API error", status: response.status, detail: errText },
      { status: 502 }
    )
  }

  const data = await response.json()
  console.log("[suggest-brew] Anthropic response received, stop_reason:", data.stop_reason)

  const rawText: string = data.content?.[0]?.text ?? ""

  // Strip markdown code fences if the model wrapped the JSON
  const stripped = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()

  try {
    const suggestion = JSON.parse(stripped)
    return NextResponse.json(suggestion)
  } catch {
    console.error("[suggest-brew] JSON parse failed, raw text:", rawText)
    return NextResponse.json({ error: "Could not parse model response", raw: rawText }, { status: 502 })
  }
}
