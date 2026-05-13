"use client"
import { useState, useEffect } from "react"

export interface CoachProduct {
  id: string
  name: string
  emoji: string
  severity?: string
  issue?: string
  issueDetail?: string
  alternative?: { name: string; stores?: string[] }
  category?: string
  brand?: string
}

interface Props {
  product: CoachProduct | null
  goals: string[]
  allergies?: string[]
  onClose: () => void
}

const GOAL_META: Record<string, { label: string; emoji: string }> = {
  abnehmen:   { label: "Abnehmen",          emoji: "🏃" },
  muskel:     { label: "Mehr Protein",       emoji: "💪" },
  familie:    { label: "Familie & Kinder",   emoji: "👨‍👩‍👧" },
  vegan:      { label: "Vegan/Vegetarisch",  emoji: "🌱" },
  nachhaltig: { label: "Nachhaltigkeit",     emoji: "🌍" },
  konzerne:   { label: "Konzerne meiden",    emoji: "🚫" },
  // legacy compatibility
  muskelaufbau: { label: "Muskelaufbau",     emoji: "💪" },
  kind:         { label: "Familie & Kinder", emoji: "👨‍👩‍👧" },
}

// Per-product + per-goal intelligence
function buildAdvice(product: CoachProduct, goals: string[]): { goal: string; emoji: string; text: string }[] {
  const tips: { goal: string; emoji: string; text: string }[] = []
  const name  = product.name.toLowerCase()
  const issue = (product.issue ?? "").toLowerCase()
  const sev   = product.severity ?? "none"

  for (const g of goals) {
    const meta = GOAL_META[g]
    if (!meta) continue

    if (g === "abnehmen" || g === "abnehmen") {
      if (issue.includes("zucker") || issue.includes("sugar") || name.includes("cola") || name.includes("schokolade")) {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Hoher Zuckergehalt passt nicht gut zu deinem Ziel "${meta.label}". Besser: Wasser, ungesüßter Tee oder Alternativen mit < 5g Zucker/100ml.` })
      } else if (issue.includes("fett") || issue.includes("fat") || sev === "high") {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Dieses Produkt kann deinen Kalorienhaushalt belasten. Für "${meta.label}" lieber auf magere Alternativen achten.` })
      } else {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Für "${meta.label}" ist wenig Zucker und wenig gesättigte Fette wichtig — prüfe die Nährwertangaben auf der Packung.` })
      }
    }

    if (g === "muskel" || g === "muskelaufbau") {
      if (product.category === "meat" || name.includes("hähnchen") || name.includes("thunfisch") || name.includes("quark")) {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `✅ Gute Proteinquelle für "${meta.label}"! Ziel: 1.6–2g Protein pro kg Körpergewicht täglich.` })
      } else if (product.category === "snacks" || issue.includes("zucker")) {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Für "${meta.label}" ist Protein wichtiger als Zucker. Dieses Produkt liefert wenig Protein — ergänze mit Quark, Hülsenfrüchten oder magerem Fleisch.` })
      } else {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Für "${meta.label}" zählt der Gesamtüberblick: Ausreichend Protein in der ganzen Liste? Eier, Hülsenfrüchte und mageres Fleisch sind gute Quellen.` })
      }
    }

    if (g === "familie" || g === "kind") {
      if (issue.includes("zucker") || name.includes("cola") || name.includes("energy")) {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `⚠️ Für Kinder ungeeignet: hoher Zuckergehalt kann die Entwicklung belasten. Empfehlung: max. 25g Zucker täglich (WHO) — für Kinder deutlich weniger.` })
      } else if (issue.includes("palmöl") || issue.includes("palm")) {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Palmöl gilt als diskutierter Inhaltsstoff. Für eine familienbewusste Ernährung gibt es palmölfreie Alternativen — oft auch günstiger.` })
      } else {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Für "${meta.label}": Achte auf Zucker- und Salzgehalt — Kinder haben niedrigere Tageshöchstmengen als Erwachsene.` })
      }
    }

    if (g === "vegan") {
      if (product.category === "meat" || product.category === "dairy") {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Tierisches Produkt — nicht "${meta.label}"-kompatibel. Pflanzliche Alternativen: Hafermilch, Tofu, Tempeh, Hülsenfrüchte.` })
      } else if (issue.includes("tier") || issue.includes("fleisch") || issue.includes("milch")) {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Dieses Produkt enthält tierische Bestandteile. Für "${meta.label}" gibt es meist gute pflanzliche Alternativen.` })
      } else {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Prüfe die Zutatenliste auf versteckte tierische Inhaltsstoffe (Laktose, Gelatine, Kasein, E471).` })
      }
    }

    if (g === "nachhaltig") {
      if (issue.includes("palmöl") || issue.includes("palm")) {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `⚠️ Palmöl ist mit Regenwaldabholzung verbunden. Für "${meta.label}": Achte auf RSPO-Siegel oder wähle palmölfreie Produkte.` })
      } else if (issue.includes("plastik") || sev === "high") {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Hoher ökologischer Fußabdruck. Für "${meta.label}": Bevorzuge Produkte mit recycelbarer Verpackung und kürzeren Lieferketten.` })
      } else {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Für "${meta.label}": Regionale und saisonale Produkte haben den kleinsten CO₂-Fußabdruck. Bio-Siegel = weniger Pestizide.` })
      }
    }

    if (g === "konzerne") {
      if (sev === "high" || sev === "critical") {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `⛔ Dieses Produkt stammt von einem Konzern mit dokumentierten Verstößen. Für dein Ziel "${meta.label}" solltest du eine Alternative wählen.` })
      } else if (sev === "medium") {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `⚠️ Mittlere Konzernproblematik. Es gibt oft bessere Alternativen von kleineren, unabhängigen Herstellern.` })
      } else {
        tips.push({ goal: meta.label, emoji: meta.emoji, text: `Für "${meta.label}": Bevorzuge regionale Hersteller, Genossenschaften und Marken ohne Großkonzern-Hintergrund.` })
      }
    }
  }

  return tips
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ff2244",
  high:     "#ff4455",
  medium:   "#ffaa00",
  low:      "#44aaff",
  none:     "#2ECC8A",
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Kritisch",
  high:     "Problematisch",
  medium:   "Eingeschränkt",
  low:      "Gering",
  none:     "Unbedenklich",
}

export default function ProductCoachPanel({ product, goals, allergies = [], onClose }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (product) setTimeout(() => setVisible(true), 10)
    else setVisible(false)
  }, [product])

  if (!product) return null

  const sevColor = SEVERITY_COLOR[product.severity ?? "none"]
  const sevLabel = SEVERITY_LABEL[product.severity ?? "none"]
  const advice   = buildAdvice(product, goals)
  const hasIssue = product.severity && product.severity !== "none"

  function close() { setVisible(false); setTimeout(onClose, 300) }

  return (
    <div onClick={close} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: visible ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0)",
      backdropFilter: visible ? "blur(8px)" : "none",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      transition: "all 0.3s",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--surface)",
        borderRadius: "28px 28px 0 0",
        padding: "0 0 calc(env(safe-area-inset-bottom,20px) + 24px)",
        width: "100%", maxWidth: 520,
        boxShadow: "var(--shadow)",
        transform: visible ? "translateY(0)" : "translateY(110%)",
        transition: "transform 0.36s cubic-bezier(.16,1,.3,1)",
        maxHeight: "85dvh", overflowY: "auto",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        <div style={{ padding: "0 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: `${sevColor}18`,
              border: `1.5px solid ${sevColor}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem", flexShrink: 0,
            }}>
              {product.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "var(--text)", marginBottom: 4 }}>{product.name}</div>
              {hasIssue && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: `${sevColor}15`, border: `1px solid ${sevColor}30`,
                  borderRadius: 8, padding: "3px 10px", fontSize: "0.75rem",
                  fontWeight: 700, color: sevColor,
                }}>
                  ⚠️ {sevLabel}
                </div>
              )}
            </div>
            <button onClick={close} style={{ background: "var(--surface-2)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "var(--text-dim)", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Issue */}
          {product.issue && (
            <div style={{ background: `${sevColor}10`, border: `1px solid ${sevColor}25`, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: sevColor, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Problem</div>
              <div style={{ fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.5 }}>{product.issue}</div>
              {product.issueDetail && (
                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 6, lineHeight: 1.5 }}>{product.issueDetail}</div>
              )}
            </div>
          )}

          {/* Alternative */}
          {product.alternative?.name && (
            <div style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.22)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#2ECC8A", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>✅ Bessere Alternative</div>
              <div style={{ fontSize: "0.92rem", color: "var(--text)", fontWeight: 700 }}>{product.alternative.name}</div>
              {product.alternative.stores && product.alternative.stores.length > 0 && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 4 }}>
                  Erhältlich bei: {product.alternative.stores.join(", ")}
                </div>
              )}
            </div>
          )}

          {/* Goal-based advice */}
          {advice.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                💡 Deine Ziele
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {advice.map((a, i) => (
                  <div key={i} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-dim)", marginBottom: 4 }}>
                      {a.emoji} {a.goal}
                    </div>
                    <div style={{ fontSize: "0.83rem", color: "var(--text)", lineHeight: 1.55 }}>{a.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No goals set yet */}
          {advice.length === 0 && (
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
                Lege deine Ziele im Profil fest — dann bekommst du hier personalisierte Tipps zu jedem Produkt.
              </div>
            </div>
          )}

          {/* Close button */}
          <button onClick={close} style={{
            display: "block", width: "100%", padding: "14px",
            background: "var(--surface-2)", border: "1px solid var(--border)",
            borderRadius: 16, color: "var(--text)", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
          }}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Warning Triangle Button (to be used inline in list items) ─────────────────
export function WarnTriangle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        background: "rgba(255,170,0,0.12)",
        border: "1px solid rgba(255,170,0,0.35)",
        borderRadius: 8,
        width: 30, height: 30,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        fontSize: "0.9rem",
        transition: "all 0.18s",
      }}
      title="Produktinfos anzeigen"
    >
      ⚠️
    </button>
  )
}
