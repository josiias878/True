import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

function fallback(stars: number, keywords: string[]): string {
  const kw = keywords.length > 0 ? ` Besonders ${keywords.slice(0, 2).join(" und ")} haben mich überzeugt.` : ""
  const templates: Record<number, string> = {
    5: `TRUE ist absolut unverzichtbar für meinen Alltag! Die App zeigt mir sofort was wirklich in meinen Produkten steckt.${kw} Wer bewusst einkaufen will, braucht diese App.`,
    4: `Sehr hilfreiche App die mir beim Einkaufen echte Orientierung gibt.${kw} Ich empfehle TRUE jedem der wissen will was er kauft.`,
    3: `Gute App mit nützlichen Funktionen.${kw} Mit ein paar Verbesserungen wäre sie perfekt.`,
    2: `Die App hat interessante Ansätze, aber noch einige Schwächen.${kw} Ich hoffe auf baldige Updates.`,
    1: `Leider hat die App meine Erwartungen nicht erfüllt.${kw}`,
  }
  return templates[stars] ?? ""
}

export async function POST(req: Request) {
  try {
    const { stars, keywords } = await req.json()
    if (!stars || stars < 1 || stars > 5) return NextResponse.json({ error: "Ungültig" }, { status: 400 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ text: fallback(stars, keywords ?? []) })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      messages: [{
        role: "user",
        content: `Schreibe eine App Store Bewertung (2-3 Sätze, natürlich & persönlich) für TRUE — eine App die Produkte per Barcode scannt und auf bedenkliche Inhaltsstoffe, Palmöl, Zucker usw. hinweist.
Bewertung: ${stars}/5 Sterne
Stichworte vom Nutzer: ${keywords?.length > 0 ? keywords.join(", ") : "keine"}
Schreibe auf Deutsch, wie ein echter Nutzer. Kein Emoji, keine Überschrift, nur den Text.`,
      }],
    })

    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : fallback(stars, keywords ?? [])
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: "Fehler" }, { status: 500 })
  }
}
