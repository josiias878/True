import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Kein API-Key" }, { status: 500 })

  const { product, goals, allergies } = await req.json()

  const goalsText = goals?.length ? goals.join(", ") : "keine"
  const allergyText = allergies?.length ? allergies.join(", ") : "keine"

  const flagsText = product.flags?.length
    ? product.flags.map((f: { icon: string; label: string; detail: string }) => `- ${f.icon} ${f.label}: ${f.detail}`).join("\n")
    : "Keine Inhaltsstoff-Details verfügbar"

  const systemPrompt = `Du bist der TRUE Ernährungscoach — ehrlich, direkt, ohne Werbesprache. Du analysierst ein einzelnes gescanntes Produkt und gibst dem Nutzer eine klare persönliche Einschätzung.

Regeln:
- Antworte IMMER auf Deutsch
- Maximal 4–5 kurze Sätze — präzise, kein Fülltext
- Gib eine klare Empfehlung: kaufen ✅, selten 🟡, oder meiden 🔴
- Beziehe die Ziele und Allergien des Nutzers direkt ein
- Nenne bei Problemen (Zucker, Palmöl, Konzern) kurz den Grund
- Wenn du keine Daten zum Produkt hast, sag es ehrlich und gib trotzdem einen hilfreichen allgemeinen Tipp basierend auf den Zielen
- Keine leeren Phrasen wie "Das liegt bei dir" oder "Es kommt darauf an"
- Empfehle NIEMALS andere Apps, Dienste oder Websites (keine Konkurrenz-Apps, kein "schau in Yuka", kein "nutze andere Tools")
- Du bist TRUE — alles was du sagst kommt von TRUE, nicht von Drittanbieter-Tools
- Beziehe dich immer auf das konkrete Produkt und die Ziele des Nutzers

Nutzer-Profil:
Ziele: ${goalsText}
Allergien/Unverträglichkeiten: ${allergyText}`

  const userMessage = `Analysiere dieses Produkt für mich:

Produkt: ${product.name ?? "unbekannt"}
Konzern: ${product.corporation ?? "unbekannt"} (Risikostufe: ${product.severity ?? "unbekannt"})
Nutri-Score: ${product.nutriScore ?? "nicht verfügbar"}
Inhaltsstoff-Hinweise:
${flagsText}
Kategorien: ${product.categories ?? "nicht bekannt"}

Kurze, ehrliche Einschätzung: Passt das zu meinen Zielen und soll ich es kaufen?`

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 350,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? "Keine Antwort generiert."
    return NextResponse.json({ reply: text })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unbekannter Fehler" }, { status: 500 })
  }
}
