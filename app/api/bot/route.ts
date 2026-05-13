import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import {
  addIngestion, addCategory, addCorporation, addEvidence,
  updateIngestion, getCategories, getCorporations,
  type BotIngestion, type Category, type Corporation, type Evidence
} from "@/lib/db"

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { text, source } = await req.json()
  if (!text || !source) {
    return NextResponse.json({ error: "text und source erforderlich" }, { status: 400 })
  }

  const ingestion: BotIngestion = {
    id: `ing_${Date.now()}`,
    rawText: text,
    source,
    extractedCorporations: [],
    extractedCategories: [],
    status: "processing",
  }
  addIngestion(ingestion)

  const existingCategories = getCategories().map(c => `${c.id}: ${c.name}`).join(", ")
  const existingCorps = getCorporations().map(c => c.name).join(", ")

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `Du bist ein Analyst für den TRUE-Bot. Du analysierst Berichte über Konzerne die Umwelt oder Menschen schädigen.

Bestehende Kategorien: ${existingCategories}
Bekannte Konzerne: ${existingCorps}

Antworte NUR mit validem JSON in dieser Struktur:
{
  "corporations": [{ "name": string, "severity": "low"|"medium"|"high"|"critical", "aliases": string[] }],
  "newCategories": [{ "name": string, "description": string, "icon": string }],
  "evidence": [{ "title": string, "source": string, "date": string }],
  "categoryLinks": { "corporationName": ["categoryId_or_newCategoryName"] }
}`,
      messages: [{
        role: "user",
        content: `Analysiere diesen Bericht und extrahiere strukturierte Daten:\n\n${text}`
      }],
    })

    const content = response.content[0]
    if (content.type !== "text") throw new Error("Unerwarteter Response-Typ")

    const extracted = JSON.parse(content.text)
    const newCatIds: string[] = []
    const newCorpNames: string[] = []

    for (const cat of extracted.newCategories ?? []) {
      const newCat: Category = {
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: cat.name,
        description: cat.description,
        icon: cat.icon ?? "⚠️",
        createdBy: "auto",
        createdAt: new Date().toISOString().split("T")[0],
      }
      addCategory(newCat)
      newCatIds.push(newCat.id)
    }

    for (const corp of extracted.corporations ?? []) {
      const ev: Evidence = {
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: extracted.evidence?.[0]?.title ?? `Aus: ${source}`,
        source,
        date: extracted.evidence?.[0]?.date ?? new Date().toISOString().split("T")[0],
        level: "pending",
      }
      addEvidence(ev)

      const newCorp: Corporation = {
        id: `corp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: corp.name,
        aliases: corp.aliases ?? [],
        categoryIds: newCatIds,
        evidenceIds: [ev.id],
        severity: corp.severity ?? "medium",
        lastUpdated: new Date().toISOString().split("T")[0],
      }
      addCorporation(newCorp)
      newCorpNames.push(corp.name)
    }

    updateIngestion(ingestion.id, {
      status: "done",
      processedAt: new Date().toISOString(),
      extractedCorporations: newCorpNames,
      extractedCategories: newCatIds,
    })

    return NextResponse.json({
      success: true,
      ingestionId: ingestion.id,
      extracted: { corporations: newCorpNames, categories: newCatIds.length },
    })
  } catch (err) {
    updateIngestion(ingestion.id, { status: "error" })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const { getIngestions } = await import("@/lib/db")
  return NextResponse.json(getIngestions())
}
