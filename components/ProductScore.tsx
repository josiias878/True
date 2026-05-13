"use client"
import { calcProductScore, type ProductScoreResult } from "@/lib/productScore"

interface Props {
  issues?: string[]
  size?: "sm" | "md" | "lg"   // sm = kompakt (Karte), md = modal, lg = scan-Vollbild
  showTip?: boolean            // Frequenz-Tipp anzeigen
  isPremium?: boolean          // Premium: volles Feedback; Free: kompakter Tipp
  scoreOverride?: ProductScoreResult  // Pre-calculated score (e.g. from severity)
}

export default function ProductScore({ issues = [], size = "md", showTip = true, isPremium = false, scoreOverride }: Props) {
  const s = scoreOverride ?? calcProductScore(issues)

  // Ring-Parameter
  const radius  = size === "lg" ? 44 : size === "md" ? 34 : 22
  const stroke  = size === "lg" ? 7  : size === "md" ? 5.5 : 4
  const circ    = 2 * Math.PI * radius
  const offset  = circ * (1 - s.score / 100)
  const svgSize = (radius + stroke) * 2

  const fontSize = size === "lg" ? "1.5rem" : size === "md" ? "1.15rem" : "0.7rem"
  const labelSz  = size === "lg" ? "0.65rem" : size === "md" ? "0.55rem" : "0.45rem"

  return (
    <div>
      {/* ── Score Ring + Grade ── */}
      <div style={{ display: "flex", alignItems: "center", gap: size === "sm" ? 8 : 14 }}>
        {/* SVG ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg width={svgSize} height={svgSize} style={{ transform: "rotate(-90deg)" }}>
            {/* Track */}
            <circle
              cx={svgSize / 2} cy={svgSize / 2} r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={stroke}
            />
            {/* Progress */}
            <circle
              cx={svgSize / 2} cy={svgSize / 2} r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.22,1,.36,1)" }}
            />
          </svg>
          {/* Grade label inside ring */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", pointerEvents: "none",
          }}>
            <span style={{ fontWeight: 900, fontSize, color: s.color, lineHeight: 1 }}>{s.grade}</span>
            <span style={{ fontWeight: 700, fontSize: labelSz, color: s.color, letterSpacing: "0.03em", lineHeight: 1.2, marginTop: 1 }}>
              {s.score}
            </span>
          </div>
        </div>

        {/* Text info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: size === "sm" ? 2 : 3 }}>
            <span style={{
              fontWeight: 800,
              fontSize: size === "lg" ? "1rem" : size === "md" ? "0.88rem" : "0.72rem",
              color: s.color,
            }}>
              {s.label}
            </span>
            <span style={{
              background: s.color + "18",
              border: `1px solid ${s.color}44`,
              color: s.color,
              borderRadius: 20,
              padding: size === "sm" ? "1px 6px" : "2px 8px",
              fontSize: size === "sm" ? "0.58rem" : "0.62rem",
              fontWeight: 700,
            }}>
              {s.score}/100
            </span>
          </div>

          {showTip && size !== "sm" && (
            <div style={{
              fontSize: size === "md" ? "0.75rem" : "0.82rem",
              color: "var(--text-dim)",
              lineHeight: 1.45,
            }}>
              {isPremium ? s.tip : s.tipFree}
            </div>
          )}
          {showTip && size === "sm" && (
            <div style={{ fontSize: "0.62rem", color: "var(--text-dim)", lineHeight: 1.3 }}>
              {s.tipFree}
            </div>
          )}
        </div>
      </div>

      {/* ── Premium detail: reason breakdown ── */}
      {isPremium && size !== "sm" && s.reasons.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {s.reasons.map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 10px",
              background: r.severity === "high"
                ? "rgba(255,51,85,0.07)"
                : r.severity === "medium"
                ? "rgba(255,180,0,0.06)"
                : "rgba(255,255,255,0.04)",
              borderLeft: `3px solid ${
                r.severity === "high" ? "#ff3355" :
                r.severity === "medium" ? "#ffcc00" : "rgba(255,255,255,0.2)"
              }`,
              borderRadius: "0 8px 8px 0",
              fontSize: "0.75rem",
              color: "var(--text)",
            }}>
              <span style={{
                color: r.severity === "high" ? "#ff3355" : r.severity === "medium" ? "#ffcc00" : "var(--text-dim)",
                fontWeight: 700,
                flexShrink: 0,
                fontSize: "0.68rem",
              }}>
                {r.severity === "high" ? "HOCH" : r.severity === "medium" ? "MITTEL" : "GERING"}
              </span>
              <span style={{ color: "var(--text-dim)" }}>{r.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
