"use client"
import Link from "next/link"

interface Props {
  onClose: () => void
  trigger?: "scan" | "list" | "coach" | "family"
}

function activatePremium() {
  localStorage.setItem("true-premium", "1")
  window.location.reload()
}

const FEATURES = [
  { emoji: "📷", label: "Unbegrenzte Scans",            sub: "Statt 5/Tag" },
  { emoji: "👨‍👩‍👧", label: "Familien-Sicherheits-Score", sub: "Pro Kind personalisiert" },
  { emoji: "🥗", label: "Ernährungscoach",           sub: "Analysiert dein Einkaufsverhalten" },
  { emoji: "🎯", label: "Ziel-Modus",                   sub: "Abnehmen · Muskel · Vegan · Allergiefrei" },
  { emoji: "📊", label: "Wochenrückblick in der App",   sub: "Dein persönlicher Bericht" },
  { emoji: "🛒", label: "Einkaufsliste pro Person",      sub: "Kind · Papa · Mama · Freund" },
]

export default function PremiumGate({ onClose, trigger = "scan" }: Props) {
  const TITLES: Record<string, string> = {
    scan:   "Du hast deine 5 kostenlosen Scans verbraucht 📷",
    list:   "Dein persönlicher Ernährungshelfer wartet auf dich 🥗",
    coach:  "Der Ernährungscoach ist Premium 🥗",
    family: "Familien-Details sind ein Premium-Feature 👨‍👩‍👧",
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(16px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "var(--surface)", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: "520px", maxHeight: "90dvh", overflowY: "auto", animation: "slideUp 0.3s cubic-bezier(.22,1,.36,1)", border: "1px solid rgba(255,215,0,0.2)", borderBottom: "none" }}>

        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "14px auto 0" }} />

        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem 0" }}>
          <div style={{ textAlign: "center", marginBottom: "0.85rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.4rem" }}>👑</div>
            <h2 style={{ fontWeight: 900, fontSize: "1.2rem", margin: "0 0 0.35rem", background: "linear-gradient(135deg, #ffd700, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              TRUE Premium
            </h2>
            <p style={{ color: "var(--text-dim)", fontSize: "0.82rem", margin: 0, lineHeight: 1.5 }}>
              {TITLES[trigger]}
            </p>
          </div>

          {/* Price pill */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
            <div style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,170,0,0.1))", border: "1px solid rgba(255,215,0,0.3)", borderRadius: "30px", padding: "0.5rem 1.5rem", textAlign: "center" }}>
              <span style={{ fontWeight: 900, fontSize: "1.4rem", color: "#ffd700" }}>14 Tage gratis</span>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "2px" }}>dann 2,99€ / Monat · jederzeit kündbar</div>
            </div>
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "1.25rem" }}>
            {FEATURES.map(f => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.85rem", background: "var(--surface-2)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{f.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{f.label}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{f.sub}</div>
                </div>
                <span style={{ marginLeft: "auto", color: "#ffd700", fontSize: "0.85rem" }}>✓</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "0 1.5rem 1.5rem", paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 16px))" }}>
          {/* Personal message */}
          <div style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.07), rgba(255,170,0,0.04))", border: "1px solid rgba(255,215,0,0.15)", borderRadius: "16px", padding: "1rem 1.1rem", marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.7, margin: 0 }}>
              Dein Körper ist dein größter Schatz.{" "}
              <span style={{ color: "var(--text-dim)" }}>
                TRUE bleibt unabhängig und werbefrei — für weniger als einen Kaffee im Monat.
              </span>
            </p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", margin: "0.5rem 0 0", lineHeight: 1.6 }}>
              — Josias, Gründer TRUE
            </p>
          </div>

          {/* Main CTA */}
          <button
            onClick={activatePremium}
            style={{ width: "100%", background: "linear-gradient(135deg, #ffd700, #ffaa00)", color: "#000", border: "none", borderRadius: "14px", padding: "1rem", fontWeight: 900, cursor: "pointer", fontSize: "1rem", marginBottom: "0.6rem", boxShadow: "0 4px 20px rgba(255,215,0,0.3)" }}>
            👑 14 Tage kostenlos starten
          </button>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", textAlign: "center", marginBottom: "0.85rem" }}>
            Danach 2,99€ / Monat · jederzeit kündbar
          </div>

          {/* Vergleich Kostenlos vs Premium */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", marginBottom: "0.85rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", fontSize: "0.68rem", fontWeight: 700, color: "var(--text-dim)", padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span></span>
              <span style={{ textAlign: "center" }}>Kostenlos</span>
              <span style={{ textAlign: "center", color: "#ffd700" }}>Premium</span>
            </div>
            {[
              { label: "Scans pro Tag",        free: "5",      premium: "∞"    },
              { label: "Konzern-Hintergründe", free: "Basis",  premium: "Voll" },
              { label: "Ernährungscoach",      free: "—",      premium: "✓"    },
              { label: "Familien-Score",       free: "—",      premium: "✓"    },
              { label: "Wochenrückblick",      free: "—",      premium: "✓"    },
            ].map((row, i) => (
              <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", padding: "7px 12px", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text)" }}>{row.label}</span>
                <span style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-dim)" }}>{row.free}</span>
                <span style={{ textAlign: "center", fontSize: "0.75rem", color: "#ffd700", fontWeight: 700 }}>{row.premium}</span>
              </div>
            ))}
          </div>

          <button onClick={onClose} style={{ width: "100%", background: "transparent", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.7rem", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem" }}>
            Später
          </button>
        </div>
      </div>
    </div>
  )
}
