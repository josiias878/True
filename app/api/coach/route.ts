import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Kein API-Key" }, { status: 500 })

  const { question, items, goals, allergies } = await req.json()

  // Build context from the shopping list
  const itemsText = items?.length
    ? items.map((i: any) => `- ${i.emoji ?? ""} ${i.name}${i.brand ? ` (${i.brand})` : ""}${i.severity && i.severity !== "none" ? ` [${i.severity}]` : ""}${i.issue && i.issue !== "—" ? `: ${i.issue}` : ""}`).join("\n")
    : "Keine Produkte in der Liste."

  const goalsText = goals?.length ? goals.join(", ") : "keine"
  const allergyText = allergies?.length ? allergies.join(", ") : "keine"

  const systemPrompt = `Du bist der TRUE Ernährungscoach — ein freundlicher, ehrlicher Einkaufsberater. Du analysierst Einkaufslisten und gibst konkrete, persönliche Tipps.

Regeln:
- Antworte IMMER auf Deutsch
- Sei direkt und konkret — keine leeren Floskeln
- Halte Antworten kurz: max. 3–4 Sätze oder eine kurze Liste
- Nenne konkrete Produkte/Alternativen wenn möglich
- Bei ethischen Problemen (Palmöl, Wasserraub, etc.) erkläre kurz warum
- Passe Tipps an Ziele und Allergien an
- Wenn du keine Daten zum Produkt hast, sag es ehrlich

Kontext:
Ziele: ${goalsText}
Allergien/Unverträglichkeiten: ${allergyText}`

  const userMessage = `Meine aktuelle Einkaufsliste:\n${itemsText}\n\nMeine Frage: ${question}`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? "Ich konnte keine Antwort generieren."
    return NextResponse.json({ reply: text })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
