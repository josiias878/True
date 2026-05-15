// ─────────────────────────────────────────────────────────────────────────────
// TRUE – Produktbewertungs-Engine
//
// Berechnet einen Sicherheits-Score (0–100) und eine Schulnote (A–F) auf
// Basis der bekannten Probleme eines Produkts (issues[]).
//
// Verwendet: scan/page.tsx, components/ProductScore.tsx, home/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

export type ScoreGrade = "A" | "B" | "C" | "D" | "F"

export interface ScoreBreakdown {
  base: number
  evidenceDeduction: number
  categoryDeduction: number
  goalAdjustment: number   // extra deduction from goal boosting (negative = more deduction)
  goalLabel: string        // e.g. "Umwelt schützen"
  total: number
  evidenceCount: number
  categoryCount: number
  boostedCategories: string[]  // category names that were boosted by goal
}

export interface ProductScoreResult {
  score: number          // 0–100
  grade: ScoreGrade      // A B C D F
  label: string          // "Gut", "Okay", "Bedenklich", "Kritisch", "Gefährlich"
  color: string          // CSS hex
  tip: string            // Frequenz-Tipp für den Nutzer
  tipFree: string        // Kurzer Tipp für Free-Nutzer (kompakter)
  reasons: { text: string; severity: "high" | "medium" | "low" }[]
  breakdown?: ScoreBreakdown
}

// ── Severity tiers ────────────────────────────────────────────────────────────
// Jeder Eintrag: [keyword (lowercase), Punktabzug, Schwere]
const ISSUE_WEIGHTS: [string, number, "high" | "medium" | "low"][] = [
  // Kritisch (-25 bis -35)
  ["glyphosat",        32, "high"],
  ["pfas",             32, "high"],
  ["krebsrisiko",      30, "high"],
  ["krebserregend",    30, "high"],
  ["kinderarbeit",     25, "high"],
  ["ausbeutung",       22, "high"],

  // Hoch (-15 bis -22)
  ["nova 4",           20, "high"],
  ["nova gruppe 4",    20, "high"],
  ["ultraprozessiert", 20, "high"],
  ["hochverarbeitet",  18, "high"],
  ["palmöl",           18, "high"],
  ["glutamat",         15, "high"],

  // Mittel (-8 bis -14)
  ["übersalzung",      13, "medium"],
  ["zucker",           11, "medium"],
  ["mikroplastik",     12, "medium"],
  ["grundwasser",      10, "medium"],
  ["wasserrecht",       9, "medium"],
  ["wasserverbrauch",   8, "medium"],
  ["plastik",           8, "medium"],

  // Niedrig (-3 bis -7)
  ["monokulturen",      6, "low"],
  ["alu",               5, "low"],
  ["recycelbar",        4, "low"],
  ["tenside",           6, "low"],
]

// ── Frequenz-Tipps ────────────────────────────────────────────────────────────
const TIPS: Record<ScoreGrade, { full: string; short: string }> = {
  A: {
    full:  "Täglich okay — achte auf eine insgesamt ausgewogene Ernährung.",
    short: "In Maßen täglich okay",
  },
  B: {
    full:  "2–3× pro Woche unbedenklich — als Teil einer ausgewogenen Ernährung.",
    short: "2–3× pro Woche okay",
  },
  C: {
    full:  "Maximal 1× pro Woche empfohlen — nicht als Grundnahrungsmittel.",
    short: "Max. 1× pro Woche",
  },
  D: {
    full:  "Selten genießen — max. 1–2× im Monat empfohlen.",
    short: "Max. 1–2× im Monat",
  },
  F: {
    full:  "Besser meiden — regelmäßiger Konsum ist gesundheitlich bedenklich.",
    short: "Besser meiden",
  },
}

// ── Grad-Metadaten ─────────────────────────────────────────────────────────────
const GRADE_META: Record<ScoreGrade, { label: string; color: string }> = {
  A: { label: "Gut",        color: "#2ECC8A" },
  B: { label: "Okay",       color: "#88cc44" },
  C: { label: "Bedenklich", color: "#ffcc00" },
  D: { label: "Kritisch",   color: "#ff8800" },
  F: { label: "Gefährlich", color: "#ff3355" },
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────────
export function calcProductScore(issues: string[]): ProductScoreResult {
  let score = 100
  const reasons: ProductScoreResult["reasons"] = []
  const matched = new Set<string>()

  for (const issue of issues) {
    const lower = issue.toLowerCase()
    for (const [keyword, deduction, severity] of ISSUE_WEIGHTS) {
      if (!matched.has(keyword) && lower.includes(keyword)) {
        score -= deduction
        matched.add(keyword)
        // Clean up the reason text (strip emoji prefix for display)
        const cleanText = issue.replace(/^[\p{Emoji}\s]+/u, "").trim()
        reasons.push({ text: cleanText || issue, severity })
        break
      }
    }
  }

  score = Math.max(0, Math.min(100, score))

  // Thresholds match calcScoreFromSeverity for consistency
  const grade: ScoreGrade =
    score >= 80 ? "A" :
    score >= 65 ? "B" :
    score >= 45 ? "C" :
    score >= 25 ? "D" : "F"

  const meta = GRADE_META[grade]
  const tips = TIPS[grade]

  return {
    score,
    grade,
    label: meta.label,
    color: meta.color,
    tip: tips.full,
    tipFree: tips.short,
    reasons,
  }
}

// ── Hilfsfunktion: Score-Ring CSS (SVG) ──────────────────────────────────────
export function scoreRingDashOffset(score: number, circumference: number): number {
  return circumference * (1 - score / 100)
}

// ── Konzern-Score aus Severity + Beweislage + Kategorien ─────────────────────
//
// Methodik (3 Faktoren):
//
// 1) Severity-Basiswert  →  Ausgangspunkt je nach Schweregrad des Konzerns
//    critical = 25 | high = 50 | medium = 70 | low = 88
//
// 2) Beweislage-Abzug  →  Wie gut dokumentiert sind die Missstände?
//    "verified": -4 pro Beleg | "alleged"/sonstige: -2 pro Beleg
//    Kumulativer Maximal-Abzug: 20 Punkte
//
// 3) Kategorien-Abzug  →  Wie viele verschiedene Problemfelder gibt es?
//    Schwer (pfas, glyphosat, kinderarbeit):           -5 pro Kategorie
//    Mittel (palmoel, abholzung, wasser, tierwohl):    -4 pro Kategorie
//    Leicht (plastik, arbeit, mikroplastik):           -3 pro Kategorie
//    Gering (steuern, zucker, co2, greenwashing, …):  -2 pro Kategorie
//    Kumulativer Maximal-Abzug: 15 Punkte
//
// Score-Interpretation:
//    80–95  Keine bekannten Probleme        → Grade A (Gut)
//    65–79  Vereinzelte Auffälligkeiten     → Grade B (Okay)
//    45–64  Mehrere dokumentierte Probleme  → Grade C (Bedenklich)
//    25–44  Erhebliche Missstände           → Grade D (Kritisch)
//    5–24   Schwerwiegende Verstöße         → Grade F (Gefährlich)

const SEVERITY_BASE: Record<string, number> = {
  critical: 25,
  high:     50,
  medium:   70,
  low:      88,
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  pfas:        5, glyphosat:   5, kinderarbeit:5,
  palmoel:     4, abholzung:   4, wasser:      4, tierwohl:    4,
  plastik:     3, arbeit:      3, mikroplastik:3,
  steuern:     2, zucker:      2, co2:         2, greenwashing:2, nova4: 2,
}

// Welche Kategorien jedes Ziel besonders gewichtet (Multiplikator)
const GOAL_BOOSTS: Record<string, Record<string, number>> = {
  env:    { palmoel:2, abholzung:2, wasser:2, plastik:1.5, co2:1.5, mikroplastik:1.5 },
  health: { pfas:2, glyphosat:2, zucker:1.5, nova4:1.5, mikroplastik:1.5 },
  family: { kinderarbeit:2.5, zucker:1.5, nova4:1.5, tierwohl:1.5 },
  truth:  {},  // balanced — alle gleich
  action: {},  // evidence-basiert (gleiche Kategorie-Gewichte, mehr Beweislage-Abzug)
  budget: {},  // keine Kategorie-Boost — Fokus auf Alternativen, nicht Ethik
}

const GOAL_LABELS_SCORE: Record<string, string> = {
  env: "Umwelt schützen", health: "Gesünder leben", family: "Familie schützen",
  truth: "Wahrheit kennen", action: "Etwas bewegen", budget: "Clever sparen",
}

export function calcScoreFromSeverity(
  severity: string,
  aliases: string[] = [],
  categories: { id: string; name?: string }[] = [],
  evidence: { level?: string }[] = [],
  goals: string[] = [],
): ProductScoreResult {
  let base = SEVERITY_BASE[severity] ?? 70

  // NOVA-Bonus: NOVA 1 (minimal verarbeitet) +12, NOVA 2 +6
  // NOVA 4 (ultra-verarbeitet) wird bereits über severity/categories abgezogen
  const hasNova1 = categories.some(c => c.id === "nova-1")
  const hasNova2 = categories.some(c => c.id === "nova-2")
  if (hasNova1) base = Math.min(95, base + 12)
  else if (hasNova2) base = Math.min(95, base + 6)

  // Beweislage-Abzug (max 20)
  // "action"-Ziel: extra Gewicht auf bestätigte Belege
  const evidenceMultiplier = goals[0] === "action" ? 1.4 : 1
  const evidenceDeduction = Math.min(20,
    evidence.reduce((sum, e) => sum + (e.level === "verified" ? 4 : 2) * evidenceMultiplier, 0)
  )

  // Kategorien-Abzug ohne Ziel-Boost (max 15) — Basis
  const baseCategoryDeduction = Math.min(15,
    categories.reduce((sum, c) => sum + (CATEGORY_WEIGHTS[c.id] ?? 2), 0)
  )

  // Ziel-Boost: extra Abzug für zielrelevante Kategorien
  const boosts = goals[0] ? (GOAL_BOOSTS[goals[0]] ?? {}) : {}
  const boostedCategories: string[] = []
  const goalAdjustment = Math.min(10,
    categories.reduce((sum, c) => {
      const boost = boosts[c.id]
      if (boost && boost > 1) {
        boostedCategories.push(c.name ?? c.id)
        // extra deduction = base × (boost - 1), capped per category
        return sum + Math.min(4, (CATEGORY_WEIGHTS[c.id] ?? 2) * (boost - 1))
      }
      return sum
    }, 0)
  )

  const total = Math.max(5, Math.min(95,
    base - evidenceDeduction - baseCategoryDeduction - goalAdjustment
  ))

  const grade: ScoreGrade =
    total >= 80 ? "A" :
    total >= 65 ? "B" :
    total >= 45 ? "C" :
    total >= 25 ? "D" : "F"

  const meta = GRADE_META[grade]
  const tips = TIPS[grade]

  const reasons: ProductScoreResult["reasons"] = []
  if (evidence.length > 0) reasons.push({
    text: `${evidence.length} dokumentierte${evidence.length > 1 ? " Belege" : "r Beleg"}`,
    severity: evidence.length >= 4 ? "high" : evidence.length >= 2 ? "medium" : "low",
  })
  if (categories.length > 0) reasons.push({
    text: `${categories.length} Problemfeld${categories.length > 1 ? "er" : ""}`,
    severity: categories.length >= 4 ? "high" : categories.length >= 2 ? "medium" : "low",
  })

  const breakdown: ScoreBreakdown = {
    base,
    evidenceDeduction: Math.round(evidenceDeduction),
    categoryDeduction: Math.round(baseCategoryDeduction),
    goalAdjustment:    Math.round(goalAdjustment),
    goalLabel:         goals[0] ? (GOAL_LABELS_SCORE[goals[0]] ?? "") : "",
    total:             Math.round(total),
    evidenceCount:     evidence.length,
    categoryCount:     categories.length,
    boostedCategories,
  }

  return {
    score: Math.round(total),
    grade,
    label: meta.label,
    color: meta.color,
    tip:     tips.full,
    tipFree: tips.short,
    reasons,
    breakdown,
  }
}
