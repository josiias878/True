import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// Wirklich bedenkliche Zusatzstoffe — immer anzeigen
const BAD_ADDITIVES: Record<string, { label: string; reason: string; severity: "red" | "yellow" }> = {
  "en:e102": { label: "Tartrazin (E102)", reason: "Künstlicher Farbstoff, ADHS-Verdacht", severity: "red" },
  "en:e104": { label: "Chinolingelb (E104)", reason: "Künstlicher Farbstoff, ADHS-Verdacht", severity: "red" },
  "en:e110": { label: "Gelborange (E110)", reason: "Künstlicher Farbstoff, ADHS-Verdacht", severity: "red" },
  "en:e122": { label: "Azorubin (E122)", reason: "Künstlicher Farbstoff, ADHS-Verdacht", severity: "red" },
  "en:e124": { label: "Cochenillerot (E124)", reason: "Künstlicher Farbstoff, ADHS-Verdacht", severity: "red" },
  "en:e129": { label: "Allurarot (E129)", reason: "Künstlicher Farbstoff, ADHS-Verdacht", severity: "red" },
  "en:e211": { label: "Natriumbenzoat (E211)", reason: "Konservierungsmittel, Krebsverdacht", severity: "red" },
  "en:e220": { label: "Schwefeldioxid (E220)", reason: "Sulfit — Allergieauslöser", severity: "yellow" },
  "en:e250": { label: "Natriumnitrit (E250)", reason: "Pökelstoff, krebserregend bei hoher Zufuhr", severity: "red" },
  "en:e320": { label: "BHA (E320)", reason: "Antioxidans, Krebsverdacht", severity: "red" },
  "en:e321": { label: "BHT (E321)", reason: "Antioxidans, Krebsverdacht", severity: "red" },
  "en:e951": { label: "Aspartam (E951)", reason: "Süßungsmittel, umstritten", severity: "yellow" },
  "en:e621": { label: "Glutamat (E621)", reason: "Geschmacksverstärker", severity: "yellow" },
}

// Ziel → welche Inhaltsstoffe prüfen
const GOAL_FLAGS: Record<string, { patterns: RegExp[]; label: string; icon: string }> = {
  vegan:    { patterns: [/milch|milk|cream|butter|käse|cheese|ei\b|eggs?|gelatine|gelatin|honig|honey|lanolin|casein|molke|whey|lactose|laktose/i], label: "Tierische Zutaten", icon: "🐄" },
  health:   { patterns: [/palmöl|palm oil|palm fat|palmfett/i], label: "Palmöl", icon: "🌴" },
  palmfree: { patterns: [/palmöl|palm oil|palm fat|palmfett/i], label: "Palmöl", icon: "🌴" },
  gluten:   { patterns: [/weizen|wheat|roggen|rye|gerste|barley|dinkel|spelt|hafer|oats/i], label: "Gluten", icon: "🌾" },
  lactose:  { patterns: [/milch|milk|lactose|laktose|molke|whey|butter|sahne|cream|käse|cheese|joghurt|yogurt/i], label: "Laktose", icon: "🥛" },
  sugar:    { patterns: [/zucker|sugar|sirup|syrup|fruktose|fructose|glukose|glucose|dextrose/i], label: "Zucker/Süßungsmittel", icon: "🍬" },
}

// Palmöl immer prüfen (unabhängig von Zielen)
const ALWAYS_CHECK = [
  { pattern: /palmöl|palm oil|palm fat|palmfett|huile de palme/i, label: "Palmöl", icon: "🌴", severity: "red" as const },
  { pattern: /teilgehärtete.{0,20}fette?|partially hydrogenated|transfett|trans fat/i, label: "Transfette", icon: "⚠️", severity: "red" as const },
  { pattern: /fruktose.{0,10}glukose.{0,10}sirup|high.fructose corn syrup|isoglukose/i, label: "Fruktose-Glukose-Sirup", icon: "🍬", severity: "red" as const },
]

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? ""
  const goals = (req.nextUrl.searchParams.get("goals") ?? "").split(",").filter(Boolean)

  if (!q) return NextResponse.json({ found: false })

  try {
    let productData: any = null

    // Barcode (rein numerisch)?
    if (/^\d{8,14}$/.test(q)) {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${q}.json?fields=product_name,nutriscore_grade,ingredients_text,additives_tags,nutriments,labels_tags`,
        { headers: { "User-Agent": "TRUEApp/1.0 (support@get-true.de)" } }
      )
      const data = await res.json()
      if (data.status === 1) productData = data.product
    } else {
      // Textsuche
      const res = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=1&fields=product_name,nutriscore_grade,ingredients_text,additives_tags,nutriments,labels_tags`,
        { headers: { "User-Agent": "TRUEApp/1.0 (support@get-true.de)" } }
      )
      const data = await res.json()
      if (data.products?.length > 0) productData = data.products[0]
    }

    if (!productData) return NextResponse.json({ found: false })

    const ingredientsText: string = productData.ingredients_text ?? ""
    const additiveTags: string[]  = productData.additives_tags ?? []
    const nutriments: any         = productData.nutriments ?? {}
    const nutriScore: string      = (productData.nutriscore_grade ?? "").toUpperCase()

    // ── Flags sammeln ─────────────────────────────────────────────────────────
    const flags: { icon: string; label: string; detail: string; severity: "red" | "yellow" | "green" }[] = []

    // 1. Immer prüfen (Palmöl, Transfette, etc.)
    for (const check of ALWAYS_CHECK) {
      if (check.pattern.test(ingredientsText)) {
        flags.push({ icon: check.icon, label: check.label, detail: "Enthalten laut Zutatenliste", severity: check.severity })
      }
    }

    // 2. Schlechte E-Nummern
    for (const tag of additiveTags) {
      const bad = BAD_ADDITIVES[tag]
      if (bad && !flags.find(f => f.label === bad.label)) {
        flags.push({ icon: "🔬", label: bad.label, detail: bad.reason, severity: bad.severity })
      }
    }

    // 3. Ziel-spezifische Flags
    for (const goal of goals) {
      const gf = GOAL_FLAGS[goal]
      if (!gf) continue
      for (const pattern of gf.patterns) {
        if (pattern.test(ingredientsText) && !flags.find(f => f.label === gf.label)) {
          flags.push({ icon: gf.icon, label: gf.label, detail: `Relevant für dein Ziel`, severity: "yellow" })
        }
      }
    }

    // 4. Nährwert-Highlights (Zucker/Salz wenn hoch)
    const sugar100g = nutriments["sugars_100g"] ?? 0
    const salt100g  = nutriments["salt_100g"]   ?? 0
    if (sugar100g > 15 && !flags.find(f => f.label === "Viel Zucker")) {
      flags.push({ icon: "🍬", label: "Viel Zucker", detail: `${sugar100g.toFixed(1)} g pro 100 g`, severity: "yellow" })
    }
    if (salt100g > 1.5 && !flags.find(f => f.label === "Viel Salz")) {
      flags.push({ icon: "🧂", label: "Viel Salz", detail: `${salt100g.toFixed(1)} g pro 100 g`, severity: "yellow" })
    }

    // Max. 4 Flags (wichtigste zuerst: red vor yellow)
    const sorted = [...flags.filter(f => f.severity === "red"), ...flags.filter(f => f.severity !== "red")].slice(0, 4)

    return NextResponse.json({
      found: true,
      productName: productData.product_name ?? q,
      nutriScore: nutriScore || null,
      flags: sorted,
      clean: sorted.length === 0,
    })
  } catch {
    return NextResponse.json({ found: false })
  }
}
