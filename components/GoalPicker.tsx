"use client"
import { useState, useMemo } from "react"

// ── Master Goals — einheitliche IDs für den gesamten App ──────────────────────
// Diese IDs werden in Scanner, Home, Profil und Onboarding konsistent verwendet
export const MASTER_GOALS: Array<{
  id: string
  emoji: string
  label: string
  color: string
  effect: string        // Was sich für den Nutzer ändert
  keywords: string[]   // Für die Suche / Vorschläge
}> = [
  {
    id: "env",
    emoji: "🌱",
    label: "Umwelt & Klima",
    color: "#2ECC8A",
    effect: "Palmöl, Plastik & CO₂-Warnungen im Scanner",
    keywords: ["palmöl","palme","plastik","klima","natur","nachhaltig","regenwald","co2","umwelt","ökologie","grün","vegan","recycling","abholzung"],
  },
  {
    id: "health",
    emoji: "🥦",
    label: "Gesund leben",
    color: "#ff7700",
    effect: "Ampel für Zucker, Zusatzstoffe & PFAS",
    keywords: ["gesund","zucker","bio","vegan","vegetarisch","abnehmen","diät","protein","ernährung","allergie","inhaltsstoff","kalorien","pfas","fitness","muskel","sport"],
  },
  {
    id: "family",
    emoji: "👨‍👩‍👧",
    label: "Familie & Kinder",
    color: "#ffaa00",
    effect: "Kindgerechte Bewertungen & sichere Produkte",
    keywords: ["familie","kind","kinder","baby","eltern","schule","sicher","mama","papa","mutter","vater","haushalt","schwangerschaft"],
  },
  {
    id: "truth",
    emoji: "🔍",
    label: "Konzern-Wahrheit",
    color: "#44aaff",
    effect: "Dokumentierte Verstöße & Konzern-Hintergründe",
    keywords: ["konzern","nestlé","nestle","wahrheit","lobbying","greenwashing","aufdecken","transparenz","menschenrechte","betrug","skandal","boykott"],
  },
  {
    id: "action",
    emoji: "✊",
    label: "Etwas bewegen",
    color: "#cc66ff",
    effect: "Boykott-Tipps & Community-Aktionen",
    keywords: ["boykott","verändern","fair","aktion","wirkung","bewegen","protest","solidarität","gerechtigkeit","sozial","engagement"],
  },
  {
    id: "budget",
    emoji: "💶",
    label: "Günstig & fair",
    color: "#ffcc00",
    effect: "Preisvergleiche & günstige Alternativen",
    keywords: ["sparen","preis","günstig","budget","fair","eigenmarke","billig","geld","kosten","wirtschaftlich","haushalt"],
  },
  {
    id: "weightloss",
    emoji: "⚖️",
    label: "Abnehmen",
    color: "#38BDF8",
    effect: "Kalorien & Zucker-Ampel im Scanner",
    keywords: ["abnehmen","gewicht","diät","kalorien","kalorienarm","zucker","schlank","fett","bmi","light","figur","abspecken","sport","ernährung"],
  },
  {
    id: "protein",
    emoji: "💪",
    label: "Mehr Protein / Muskeln",
    color: "#fb923c",
    effect: "Proteingehalt & Muskelaufbau-Bewertung",
    keywords: ["protein","muskel","fitness","sport","muskeln","krafttraining","eiweiß","aufbau","trainieren","gym","stärke","körper","fleisch","milch","hülsenfrüchte"],
  },
  {
    id: "vegan",
    emoji: "🌿",
    label: "Vegan / Vegetarisch",
    color: "#4ade80",
    effect: "Tierische Zutaten & Vegan-Check im Scanner",
    keywords: ["vegan","vegetarisch","pflanzlich","tierfrei","milchfrei","laktosefrei","palmöl","gelatine","ei","honig","fleischfrei","plant","bio","nachhaltig"],
  },
]

// ── Keyword-Matching ───────────────────────────────────────────────────────────
function scoreGoal(goal: typeof MASTER_GOALS[0], query: string): number {
  if (!query.trim()) return 0
  const q = query.toLowerCase().trim()
  let score = 0
  // Label-Match (höchste Priorität)
  if (goal.label.toLowerCase().includes(q)) score += 10
  // Keyword-Matches
  for (const kw of goal.keywords) {
    if (kw.startsWith(q))     score += 3
    if (kw.includes(q))       score += 1
  }
  return score
}

// ── GoalPicker-Komponente ──────────────────────────────────────────────────────
interface GoalPickerProps {
  selected: string[]
  onChange: (ids: string[]) => void
  dark?: boolean   // true = dunkler Hintergrund (Onboarding), false = heller
}

export default function GoalPicker({ selected, onChange, dark = true }: GoalPickerProps) {
  const [query, setQuery] = useState("")

  const bg        = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"
  const bgActive  = dark ? "rgba(46,204,138,0.15)"  : "rgba(46,204,138,0.1)"
  const border    = dark ? "rgba(255,255,255,0.1)"  : "rgba(0,0,0,0.12)"
  const text      = dark ? "#fff"                    : "#0f172a"
  const textDim   = dark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.4)"
  const inputBg   = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"
  const inputBorder = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)"

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(g => g !== id) : [...selected, id])

  // Sort goals: if query → by match score (desc), else selected first
  const sorted = useMemo(() => {
    if (!query.trim()) {
      return [...MASTER_GOALS].sort((a, b) => {
        const aS = selected.includes(a.id) ? 1 : 0
        const bS = selected.includes(b.id) ? 1 : 0
        return bS - aS
      })
    }
    return [...MASTER_GOALS]
      .map(g => ({ g, score: scoreGoal(g, query) }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.g)
  }, [query, selected])

  // Which goals match (highlight)
  const hasQuery = query.trim().length > 0
  const matched = new Set(
    hasQuery ? sorted.filter(g => scoreGoal(g, query) > 0).map(g => g.id) : []
  )

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Search bar */}
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "1rem", pointerEvents: "none" }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="z.B. palmöl, kinder, sparen…"
          style={{
            width: "100%", boxSizing: "border-box",
            background: inputBg,
            border: `1.5px solid ${query ? "#2ECC8A55" : inputBorder}`,
            borderRadius: 12, padding: "10px 12px 10px 36px",
            color: text, fontSize: "0.88rem", outline: "none",
            transition: "border-color 0.2s",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textDim, fontSize: "1rem", lineHeight: 1 }}
          >✕</button>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {selected.map(id => {
            const g = MASTER_GOALS.find(x => x.id === id)
            if (!g) return null
            return (
              <button key={id} onClick={() => toggle(id)}
                style={{ display: "flex", alignItems: "center", gap: 5, background: `${g.color}22`, border: `1.5px solid ${g.color}55`, borderRadius: 99, padding: "4px 10px 4px 8px", cursor: "pointer", transition: "all 0.15s" }}>
                <span style={{ fontSize: "0.85rem" }}>{g.emoji}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: g.color }}>{g.label}</span>
                <span style={{ fontSize: "0.65rem", color: g.color, marginLeft: 2 }}>✕</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Suggestions hint when query has no match */}
      {hasQuery && matched.size === 0 && (
        <div style={{ textAlign: "center", fontSize: "0.78rem", color: textDim, padding: "4px 0" }}>
          Kein Ziel gefunden — wähle eines unten
        </div>
      )}

      {/* Goal cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map(g => {
          const active  = selected.includes(g.id)
          const dimmed  = hasQuery && !matched.has(g.id)
          const highlighted = hasQuery && matched.has(g.id)
          return (
            <button key={g.id} onClick={() => toggle(g.id)} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: active ? bgActive : bg,
              border: `1.5px solid ${active ? g.color : highlighted ? g.color + "55" : border}`,
              borderRadius: 14, padding: "11px 14px", cursor: "pointer",
              textAlign: "left", transition: "all 0.2s",
              opacity: dimmed ? 0.35 : 1,
              boxShadow: highlighted && !active ? `0 0 12px ${g.color}22` : "none",
            }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0, filter: active ? "none" : dimmed ? "grayscale(1)" : "none" }}>
                {g.emoji}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: active ? g.color : text }}>
                  {g.label}
                </div>
                <div style={{ fontSize: "0.7rem", color: active ? g.color + "aa" : textDim, marginTop: 2, lineHeight: 1.3 }}>
                  {g.effect}
                </div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${active ? g.color : border}`,
                background: active ? g.color : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", color: "#000", fontWeight: 900,
                transition: "all 0.2s",
              }}>
                {active ? "✓" : ""}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
