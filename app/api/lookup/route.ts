import { NextRequest, NextResponse } from "next/server"
import { lookupByName, getCorporations, getCategories, getEvidence } from "@/lib/db"

function mapEcoscoreToSeverity(grade?: string): string {
  if (!grade) return "medium"
  switch (grade.toLowerCase()) {
    case "a":
    case "b": return "low"
    case "c": return "medium"
    case "d": return "high"
    case "e": return "critical"
    default:  return "medium"
  }
}

async function lookupOpenFoodFacts(barcode: string) {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name_de,product_name,brands,nova_group,ecoscore_grade,ingredients_text,additives_tags,image_front_small_url,image_front_url,nutriments,labels_tags`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  const data = await res.json()
  if (data.status !== 1 || !data.product) return null
  return data.product
}

function extractNutriments(product: Record<string, unknown>): {
  kcal?: number; protein?: number; carbs?: number; sugar?: number; fat?: number; fiber?: number
} | null {
  const n = product.nutriments as Record<string, number> | undefined
  if (!n) return null
  const r: { kcal?: number; protein?: number; carbs?: number; sugar?: number; fat?: number; fiber?: number } = {}
  if (typeof n["energy-kcal_100g"] === "number") r.kcal    = Math.round(n["energy-kcal_100g"])
  if (typeof n["proteins_100g"]    === "number") r.protein  = +n["proteins_100g"].toFixed(1)
  if (typeof n["carbohydrates_100g"] === "number") r.carbs  = +n["carbohydrates_100g"].toFixed(1)
  if (typeof n["sugars_100g"]      === "number") r.sugar    = +n["sugars_100g"].toFixed(1)
  if (typeof n["fat_100g"]         === "number") r.fat      = +n["fat_100g"].toFixed(1)
  if (typeof n["fiber_100g"]       === "number") r.fiber    = +n["fiber_100g"].toFixed(1)
  return Object.keys(r).length > 0 ? r : null
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? ""
  if (!q) return NextResponse.json({ found: false })

  // Try internal DB first
  const corp = lookupByName(q)
  if (corp) {
    const categories = getCategories().filter(c => corp.categoryIds.includes(c.id))
    const evidence = getEvidence().filter(e => corp.evidenceIds.includes(e.id))
    return NextResponse.json({ found: true, corporation: corp, categories, evidence })
  }

  // If not found and query looks like a barcode (8-13 digits), try Open Food Facts
  const isBarcode = /^\d{8,13}$/.test(q)
  if (!isBarcode) {
    return NextResponse.json({ found: false, query: q })
  }

  try {
    const product = await lookupOpenFoodFacts(q)
    if (!product) return NextResponse.json({ found: false, query: q })

    const name: string =
      product.product_name_de ||
      product.product_name ||
      product.brands ||
      q

    const brands: string = product.brands ?? ""
    const aliases: string[] = brands
      ? brands.split(",").map((b: string) => b.trim()).filter(Boolean)
      : []

    const severity = mapEcoscoreToSeverity(product.ecoscore_grade)

    // Build categories
    const categories: { id: string; name: string; icon: string; description: string }[] = []

    // NOVA group check
    const novaInfo: Record<number, { name: string; icon: string; description: string }> = {
      1: { name: "Minimal verarbeitet ✓", icon: "🌿", description: "NOVA 1 – natürliches, kaum verarbeitetes Lebensmittel. Wasser, Obst, Gemüse, Fleisch ohne Zusätze. Bestmögliche Kategorie." },
      2: { name: "Verarbeitete Zutaten", icon: "🧂", description: "NOVA 2 – Küchengrundlagen wie Öl, Mehl, Zucker. Kein direkter Konsum, aber unbedenklich als Zutat." },
      3: { name: "Verarbeitetes Lebensmittel", icon: "🥫", description: "NOVA 3 – Enthält Zusatzstoffe zur Haltbarmachung (Salz, Zucker, Essig). Mäßiger Konsum empfohlen." },
      4: { name: "Ultra-verarbeitet ⚠️", icon: "🚨", description: "NOVA 4 – Industriell stark verarbeitet. Enthält Zusatzstoffe, Aromen, Farbstoffe. Laut WHO mit Gesundheitsrisiken verbunden." },
    }
    if (product.nova_group && novaInfo[product.nova_group]) {
      const n = novaInfo[product.nova_group]
      categories.push({ id: `nova-${product.nova_group}`, name: n.name, icon: n.icon, description: n.description })
    }

    // Ecoscore — skip unknown/not-applicable grades
    const validGrades = ["a", "b", "c", "d", "e"]
    if (product.ecoscore_grade && validGrades.includes(product.ecoscore_grade.toLowerCase())) {
      const g = product.ecoscore_grade.toLowerCase()
      const ecoDesc: Record<string,{icon:string;desc:string}> = {
        a: { icon: "🌿", desc: "Sehr gute Ökobilanz. Geringer CO₂-Fußabdruck, nachhaltige Produktion." },
        b: { icon: "🌱", desc: "Gute Ökobilanz. Leicht erhöhter Umwelteinfluss, insgesamt empfehlenswert." },
        c: { icon: "🌍", desc: "Mittlere Ökobilanz. Durchschnittlicher CO₂-Fußabdruck." },
        d: { icon: "⚠️", desc: "Schlechte Ökobilanz. Hoher CO₂-Fußabdruck oder problematische Lieferkette." },
        e: { icon: "🚨", desc: "Sehr schlechte Ökobilanz. Starke Umweltbelastung — Alternative empfohlen." },
      }
      const info = ecoDesc[g] ?? { icon: "🌍", desc: "Ökologische Bewertung nicht vollständig verfügbar." }
      categories.push({
        id: `ecoscore-${g}`,
        name: `Eco-Score ${g.toUpperCase()}`,
        icon: info.icon,
        description: info.desc,
      })
    }

    // Build evidence
    const evidence: { id: string; title: string; source: string; date: string; level: string }[] = []

    // Palm oil check
    const ingredients: string = (product.ingredients_text ?? "").toLowerCase()
    if (ingredients.includes("palm")) {
      evidence.push({
        id: "off-palm",
        title: "Palmöl enthalten",
        source: "Open Food Facts",
        date: new Date().toISOString().slice(0, 10),
        level: "verified",
      })
      if (!categories.find(c => c.id === "palmoel")) {
        categories.push({
          id: "palmoel",
          name: "Palmöl",
          icon: "🌴",
          description: "Produkt enthält Palmöl",
        })
      }
    }

    // Vegan / vegetarian label check
    const labels: string[] = product.labels_tags ?? []
    const isVegan = labels.some((l: string) => l.includes("vegan"))
    const isVegetarian = labels.some((l: string) => l.includes("vegetarian"))
    const animalIngredients = ["gelatine","gelatin","schwein","schmalz","lard","fleisch","meat","rindfleisch","hühnerfleisch","milch","milk","ei","egg","honig","honey"]
    const hasAnimalIngredient = animalIngredients.some(a => ingredients.includes(a))
    if (isVegan) {
      categories.push({ id: "vegan-label", name: "Vegan ✓", icon: "🌱", description: "Produkt ist als vegan zertifiziert (laut Herstellerangabe)." })
    } else if (isVegetarian) {
      categories.push({ id: "vegetarian-label", name: "Vegetarisch ✓", icon: "🥕", description: "Produkt ist als vegetarisch zertifiziert." })
    } else if (hasAnimalIngredient) {
      categories.push({ id: "animal-ingredient", name: "Tierische Zutaten", icon: "🐄", description: "Enthält tierische Zutaten (Fleisch, Milch, Ei, Gelatine o.ä.)." })
    }

    // MSG check
    const additives: string[] = product.additives_tags ?? []
    if (additives.includes("en:e621")) {
      evidence.push({
        id: "off-msg",
        title: "Glutamat (E621) enthalten",
        source: "Open Food Facts",
        date: new Date().toISOString().slice(0, 10),
        level: "verified",
      })
      categories.push({
        id: "additives-msg",
        name: "Geschmacksverstärker",
        icon: "🧪",
        description: "Enthält Mononatriumglutamat (E621)",
      })
    }

    // Try to match the brand against our internal corporation DB
    // Check each brand alias from OpenFoodFacts
    const allBrandTokens = [name, ...aliases].filter(Boolean)
    let matchedCorp = null
    for (const token of allBrandTokens) {
      const found = lookupByName(token)
      if (found) { matchedCorp = found; break }
    }

    if (matchedCorp) {
      // We have richer data — use internal DB corporation info
      const internalCategories = getCategories().filter(c => matchedCorp!.categoryIds.includes(c.id))
      const internalEvidence   = getEvidence().filter(e => matchedCorp!.evidenceIds.includes(e.id))
      // Merge categories (add OpenFoodFacts ones not already present)
      const mergedCategories = [
        ...internalCategories,
        ...categories.filter(c => !internalCategories.find(ic => ic.id === c.id)),
      ]
      return NextResponse.json({
        found: true,
        corporation: matchedCorp,
        categories: mergedCategories,
        evidence: [...internalEvidence, ...evidence],
        imageUrl: product.image_front_small_url || product.image_front_url || null,
        nutriments: extractNutriments(product),
      })
    }

    // For products where severity comes purely from ecoscore (no internal DB match),
    // cap "medium" at 70 but never downgrade water-like products artificially.
    // Detect water: NOVA 1 + no palm oil + no additives → normalize to "low" if currently "medium"
    const hasNova1 = categories.some(c => c.id === "nova-1")
    const hasPalmOil = categories.some(c => c.id === "palmoel")
    const hasAdditives = categories.some(c => c.id === "additives-msg")
    let finalSeverity = severity
    if (hasNova1 && !hasPalmOil && !hasAdditives && severity === "medium") {
      // NOVA 1 product with no bad ingredients but medium ecoscore → boost to low
      finalSeverity = "low"
    }

    return NextResponse.json({
      found: true,
      corporation: { name, severity: finalSeverity, aliases },
      categories,
      evidence,
      source: "openfoodfacts",
      imageUrl: product.image_front_small_url || product.image_front_url || null,
      nutriments: extractNutriments(product),
    })
  } catch {
    return NextResponse.json({ found: false, query: q })
  }
}

export async function POST() {
  return NextResponse.json({
    corporations: getCorporations(),
    categories: getCategories(),
    evidence: getEvidence(),
  })
}
