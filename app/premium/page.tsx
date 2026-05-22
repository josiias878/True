"use client"
import AuthGuard from "@/components/AuthGuard"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"

const STRIPE_LINK = process.env.NEXT_PUBLIC_STRIPE_LINK ?? ""

// ─── Vergleichstabelle ─────────────────────────────────────────────────────────
const ROWS = [
  { label: "Scans pro Tag",         free: "5 Scans",    premium: "Unbegrenzt"           },
  { label: "Konzern-Infos",         free: "Basis",      premium: "Vollständig + Quellen" },
  { label: "Ernährungscoach",       free: false,        premium: true                    },
  { label: "Inhaltsstoffe",         free: false,        premium: "Ziel-angepasst"        },
  { label: "Einkaufslisten",        free: "1 Liste",    premium: "Familie & Haustier"    },
  { label: "Community-Badge",       free: false,        premium: "👑 Premium-Mitglied"  },
]

// ─── Konfetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#ffd700","#ffaa00","#2ECC8A","#ffffff","#ff6b9d","#44ddff"]
function ConfettiOverlay() {
  const pieces = useMemo(() => Array.from({ length: 48 }, (_, i) => ({
    id: i, left: Math.random() * 100,
    size: 6 + Math.random() * 9,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    duration: 1.8 + Math.random() * 1.4,
    delay: Math.random() * 0.7,
    shape: Math.random() > 0.5 ? "50%" : "2px",
  })), [])
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", overflow: "hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{ position: "absolute", top: -20, left: `${p.left}%`, width: p.size, height: p.size, borderRadius: p.shape, background: p.color, animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards` }} />
      ))}
      <style>{`@keyframes confettiFall{to{transform:translateY(110vh) rotate(360deg);opacity:0}}`}</style>
    </div>
  )
}

// ─── Preis-Slider ─────────────────────────────────────────────────────────────
const PRICE_STEPS  = [0.99, 1.99, 2.99, 4.99, 9.99]
const PRICE_EMOJIS = ["🌱", "💚", "🔥", "⭐", "👑"]
const PRICE_LABELS = ["Starter", "Supporter", "Champion", "Hero", "Founder"]
const PRICE_SUBS   = [
  "Minimalbeitrag — schon dabei!",
  "Hilft uns täglich weiterzumachen",
  "Hält TRUE unabhängig & werbefrei",
  "Du bist ein echter TRUE-Held",
  "Gründer-Level — danke von Herzen 🙏",
]

function PriceSlider({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  const pct  = (value / (PRICE_STEPS.length - 1)) * 100
  const step = PRICE_STEPS[value]
  return (
    <div style={{ width: "100%" }}>
      {/* Preis groß */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
          <span style={{ fontSize: "3.8rem", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text)", transition: "all 0.2s" }}>
            {step.toFixed(2).replace(".", ",")}€
          </span>
          <span style={{ color: "var(--text-dim)", fontSize: "0.88rem" }}>/Monat</span>
        </div>
        <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: "1.6rem" }}>{PRICE_EMOJIS[value]}</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--accent)" }}>{PRICE_LABELS[value]}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{PRICE_SUBS[value]}</div>
          </div>
        </div>
      </div>

      {/* Slider — echter HTML range input, visuell gestylt */}
      <div style={{ padding: "0.5rem 0.5rem 0.25rem", marginBottom: "0.5rem" }}>
        <input
          type="range"
          min={0} max={PRICE_STEPS.length - 1} step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="true-price-slider"
          style={{ width: "100%", display: "block" }}
        />
        {/* Preisbeschriftungen */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem" }}>
          {PRICE_STEPS.map((p, i) => (
            <span key={i} style={{ fontSize: "0.62rem", color: i === value ? "var(--accent)" : "var(--text-dim)", fontWeight: i === value ? 800 : 400, transition: "all 0.2s", textAlign: "center", flex: 1 }}>
              {p.toFixed(2).replace(".", ",")}€
            </span>
          ))}
        </div>
      </div>

      {/* Emotionale Botschaft */}
      <div style={{ background: "rgba(46,204,138,0.07)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 12, padding: "0.8rem 1rem", fontSize: "0.8rem", color: "var(--text)", lineHeight: 1.6, textAlign: "center" }}>
        {value === 0 && "Danke — jeder Cent zählt. TRUE bleibt für alle kostenlos nutzbar."}
        {value === 1 && "Du hilfst uns täglich neue Aufdeckungen zu recherchieren. Danke! 💚"}
        {value === 2 && "Mit dir bleibt TRUE unabhängig — kein Konzern, keine Werbung. 🔥"}
        {value === 3 && "Du bist ein echter Held dieser Bewegung. Das bedeutet uns alles. ⭐"}
        {value === 4 && <>Du bist jetzt ein TRUE-Gründer. Wir nennen dich in unseren Credits. <strong style={{ color: "var(--accent)" }}>Danke!</strong> 👑</>}
      </div>

      <style>{`
        .true-price-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 8px;
          border-radius: 4px;
          outline: none;
          cursor: grab;
          background: linear-gradient(
            to right,
            #2ECC8A 0%,
            #2ECC8A ${pct}%,
            rgba(46,204,138,0.18) ${pct}%,
            rgba(46,204,138,0.18) 100%
          );
          transition: background 0.15s;
        }
        .true-price-slider:active { cursor: grabbing; }
        .true-price-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: var(--accent);
          border: 3px solid var(--background);
          box-shadow: 0 2px 10px rgba(46,204,138,0.45);
          cursor: grab;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .true-price-slider:active::-webkit-slider-thumb {
          transform: scale(1.15);
          box-shadow: 0 4px 16px rgba(46,204,138,0.6);
          cursor: grabbing;
        }
        .true-price-slider::-moz-range-thumb {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: #2ECC8A;
          border: 3px solid var(--background);
          box-shadow: 0 2px 10px rgba(46,204,138,0.45);
          cursor: grab;
        }
      `}</style>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PremiumPage() {
  const [isPremium, setIsPremium]           = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [priceStep, setPriceStep]           = useState(0)

  useEffect(() => {
    setIsPremium(localStorage.getItem("true-premium") === "1")
  }, [])

  function activateFreeTrial() {
    localStorage.setItem("true-premium", "1")
    setIsPremium(true)
    setShowCelebration(true)
    setTimeout(() => { window.location.href = "/home" }, 2600)
  }

  const priceLabel = PRICE_STEPS[priceStep].toFixed(2).replace(".", ",")

  return (
    <AuthGuard>
      {showCelebration && (
        <>
          <ConfettiOverlay />
          <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
            <div style={{ textAlign: "center", animation: "celebPop 0.5s cubic-bezier(.16,1,.3,1) both" }}>
              <div style={{ fontSize: "4.5rem", marginBottom: "0.5rem" }}>👑</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--accent)", marginBottom: "0.35rem" }}>Du bist Premium!</div>
              <div style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>Alle Features freigeschaltet ✨</div>
            </div>
          </div>
          <style>{`@keyframes celebPop{0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}`}</style>
        </>
      )}

      <div style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 60 }}>

        {/* NAV */}
        <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--nav-bg)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", padding: "0 1.25rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/home" style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.05em", color: "var(--accent)", textDecoration: "none" }}>TRUE</Link>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Premium</span>
          <Link href="/home" style={{ fontSize: "0.82rem", color: "var(--text-dim)", textDecoration: "none" }}>← Zurück</Link>
        </nav>

        <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 1.25rem" }}>

          {/* HERO */}
          <section style={{ textAlign: "center", padding: "2rem 0 1.5rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.6rem" }}>👑</div>
            <h1 style={{ fontSize: "1.9rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.4rem", color: "var(--text)" }}>
              TRUE Premium
            </h1>
            <p style={{ color: "var(--text-dim)", fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>
              Kein Konzern. Keine Werbung. Nur die Wahrheit.
            </p>
          </section>

          {/* COMPARISON TABLE */}
          <section style={{ marginBottom: "1.75rem" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.75rem" }}>Kostenlos vs. Premium</div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", background: "var(--surface)" }}>
                <div />
                <div style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-dim)", padding: "7px 0" }}>Kostenlos</div>
                <div style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 800, color: "var(--accent)", padding: "7px 0" }}>👑 Premium</div>
              </div>
              {ROWS.map((row, i) => (
                <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "var(--background)" : "var(--surface)" }}>
                  <div style={{ padding: "9px 10px", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center" }}>{row.label}</div>
                  <div style={{ padding: "9px 6px", textAlign: "center", fontSize: "0.7rem", color: "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {row.free === false ? <span style={{ color: "rgba(255,68,85,0.55)", fontSize: "0.85rem" }}>✕</span> : row.free}
                  </div>
                  <div style={{ padding: "9px 6px", textAlign: "center", fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {row.premium === true ? <span style={{ color: "var(--accent)", fontWeight: 800, fontSize: "0.85rem" }}>✓</span> : <span style={{ color: "var(--accent)", fontWeight: 700 }}>{row.premium}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FOUNDER NOTE — kurz */}
          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "1rem 1.1rem", marginBottom: "1.75rem" }}>
            <p style={{ fontSize: "0.82rem", lineHeight: 1.8, margin: "0 0 0.5rem", color: "var(--text)" }}>
              TRUE ist <strong style={{ color: "var(--accent)" }}>unabhängig</strong>, <strong style={{ color: "var(--accent)" }}>werbefrei</strong> und gehört <strong>keinem Konzern</strong>.{" "}
              <span style={{ color: "var(--text-dim)" }}>
                <strong style={{ color: "var(--text)" }}>Deine Unterstützung</strong> ist das einzige, was uns am Laufen hält.
              </span>
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", margin: 0 }}>— Marvin, Gründer TRUE</p>
          </section>

          {/* PRICE SLIDER CARD */}
          <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "1.5rem 1.25rem", marginBottom: "1.25rem" }}>

            {/* Social proof — nur 2 Punkte */}
            <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "1.25rem" }}>
              {[
                { icon: "⭐", label: "4,8 / 5", sub: "Nutzerbewertung" },
                { icon: "🔒", label: "Werbefrei", sub: "Immer & für alle" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.1rem", marginBottom: 2 }}>{s.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: "0.82rem" }}>{s.label}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: "var(--border)", marginBottom: "1.25rem" }} />

            {/* Slider */}
            <PriceSlider value={priceStep} onChange={setPriceStep} />

            <div style={{ height: 1, background: "var(--border)", margin: "1.25rem 0" }} />

            {/* Premium aktiv oder CTA */}
            {isPremium ? (
              <div style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: 12, padding: "0.85rem", color: "var(--accent)", fontWeight: 700, fontSize: "0.88rem", textAlign: "center" }}>
                ✅ Premium aktiv — Danke für deine Unterstützung!
              </div>
            ) : (
              <>
                {/* Hauptbutton */}
                {STRIPE_LINK ? (
                  <a
                    href={STRIPE_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "block", width: "100%", background: "var(--accent)", color: "#000", borderRadius: 14, padding: "1rem", fontWeight: 900, fontSize: "1.05rem", textDecoration: "none", textAlign: "center", boxShadow: "0 4px 24px rgba(46,204,138,0.3)", boxSizing: "border-box", marginBottom: "0.75rem" }}
                  >
                    {priceLabel}€ / Monat — Jetzt unterstützen →
                  </a>
                ) : (
                  <button
                    onClick={activateFreeTrial}
                    style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", borderRadius: 14, padding: "1rem", fontWeight: 900, fontSize: "1.05rem", cursor: "pointer", boxShadow: "0 4px 24px rgba(46,204,138,0.3)", marginBottom: "0.75rem" }}
                  >
                    🧪 Kostenlos testen (Founder-Zugang)
                  </button>
                )}
                <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem" }}>
                  {["🔒 Sicher", "💳 Kreditkarte & PayPal", "🔄 Kündbar"].map(t => (
                    <span key={t} style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>{t}</span>
                  ))}
                </div>
              </>
            )}
          </section>

          <Link href="/home" style={{ display: "block", textAlign: "center", color: "var(--text-dim)", fontSize: "0.82rem", textDecoration: "none", padding: "0.5rem" }}>
            ← Zurück zur App
          </Link>

        </div>
      </div>
    </AuthGuard>
  )
}
