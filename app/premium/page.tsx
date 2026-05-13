"use client"
import AuthGuard from "@/components/AuthGuard"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"

// ─── Stripe Payment Link (set in .env.local) ──────────────────────────────────
// Erstelle einen Stripe-Account → Produkte → Zahlungslink → URL hier einfügen
const STRIPE_LINK = process.env.NEXT_PUBLIC_STRIPE_LINK ?? ""

// ─── Free vs Premium features ─────────────────────────────────────────────────

const ROWS = [
  { label: "Scans pro Tag",              free: "5 Scans",           premium: "Unbegrenzt",         key: "scan"    },
  { label: "Konzern-Infos",              free: "Basis",             premium: "Vollständig + Quellen", key: "info" },
  { label: "Ernährungscoach",          free: false,               premium: true,                 key: "coach"   },
  { label: "Inhaltsstoffe",           free: false,               premium: "Ziel-angepasste Analyse", key: "ingredients" },
  { label: "Einkaufsliste pro Person",   free: "Nur 1 Liste",       premium: "Kind · Papa · Mama", key: "list"    },
  { label: "Familien-Sicherheits-Score", free: false,               premium: true,                 key: "family"  },
  { label: "Ziel-Modus",                free: false,               premium: "Abnehmen · Vegan · Allergiefrei", key: "goals" },
  { label: "Deine Posts: Reichweite",   free: "Standard",          premium: "🚀 Mehr Leute sehen deinen Post", key: "reach" },
  { label: "Wochenrückblick",           free: false,               premium: "Persönlicher Bericht in der App", key: "report" },
  { label: "Community-Badge",           free: false,               premium: "👑 Premium-Mitglied", key: "badge"  },
]

const UPDATES = [
  { label: "Inhaltsstoffe", badge: "NEU", desc: "Beim Scan siehst du sofort, welche Zusatzstoffe, Palmöl oder Allergene im Produkt stecken — passend zu deinen persönlichen Zielen." },
  { label: "Ziel-Modus", badge: "NEU", desc: "Passe deinen Feed & Scans an: Abnehmen, Vegan, Allergiefrei oder Muskelaufbau." },
  { label: "Post-Boost", badge: "NEU", desc: "Premium-Posts werden automatisch mehr Nutzern im Feed angezeigt." },
  { label: "Familien-Score", badge: "BALD", desc: "Ein Score der zeigt wie sicher deine Einkäufe für Kinder geeignet sind." },
]

// ─── Konfetti-Partikel (einmalig generieren) ──────────────────────────────────
const CONFETTI_COLORS = ["#ffd700","#ffaa00","#2ECC8A","#ffffff","#ff6b9d","#44ddff","#ff8844"]
const CONFETTI_COUNT  = 52

function ConfettiOverlay() {
  const pieces = useMemo(() => Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    left:     Math.random() * 100,
    size:     6 + Math.random() * 10,
    color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    duration: 1.8 + Math.random() * 1.6,
    delay:    Math.random() * 0.8,
    shape:    Math.random() > 0.5 ? "50%" : "2px",
  })), [])

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", overflow: "hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          top: -20,
          left: `${p.left}%`,
          width:  p.size,
          height: p.size,
          borderRadius: p.shape,
          background: p.color,
          animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  )
}

export default function PremiumPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent]   = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    setIsPremium(localStorage.getItem("true-premium") === "1")
  }, [])

  function activateFreeTrial() {
    localStorage.setItem("true-premium", "1")
    setIsPremium(true)
    setShowCelebration(true)
    setTimeout(() => { window.location.href = "/home" }, 2800)
  }

  async function joinWaitlist() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return
    try {
      const prev = JSON.parse(localStorage.getItem("true-premium-waitlist") ?? "[]")
      if (!prev.includes(email.trim())) {
        localStorage.setItem("true-premium-waitlist", JSON.stringify([...prev, email.trim()]))
      }
    } catch {}
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "premium-page" }),
      })
    } catch {}
    setSent(true)
  }

  return (
    <AuthGuard>
    {/* ── Celebration Overlay ── */}
    {showCelebration && (
      <>
        <ConfettiOverlay />
        <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}>
          <div style={{ textAlign: "center", animation: "celebPop 0.5s cubic-bezier(.16,1,.3,1) both" }}>
            <div style={{ fontSize: "4.5rem", marginBottom: "0.5rem", filter: "drop-shadow(0 0 30px rgba(255,215,0,0.6))" }}>👑</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.02em", background: "linear-gradient(135deg,#ffd700,#ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "0.4rem" }}>
              Du bist Premium!
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", fontWeight: 500 }}>
              Alle Features freigeschaltet ✨
            </div>
          </div>
        </div>
      </>
    )}
    <div style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 60 }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--nav-bg)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", padding: "0 1.25rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/home" style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.05em", color: "var(--accent)", textDecoration: "none" }}>TRUE</Link>
        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Premium</span>
        <Link href="/home" style={{ fontSize: "0.82rem", color: "var(--text-dim)", textDecoration: "none" }}>← Zurück</Link>
      </nav>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 1.1rem" }}>

        {/* HERO */}
        <section style={{ textAlign: "center", padding: "2.5rem 0 2rem", position: "relative" }}>
          {/* Background glow */}
          <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem", filter: "drop-shadow(0 0 20px rgba(255,215,0,0.4))" }}>👑</div>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.5rem", background: "linear-gradient(135deg, #ffd700, #ffaa00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            TRUE Premium
          </h1>
          <p style={{ color: "var(--text-dim)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            Mehr für deinen Körper. Mehr für deine Familie.<br />Für weniger als ein Kaffee im Monat.
          </p>

        </section>

        {/* WHAT'S NEW */}
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.85rem" }}>🆕 Neue Premium-Features</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {UPDATES.map(u => (
              <div key={u.label} style={{ display: "flex", gap: "0.85rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "0.85rem 1rem", alignItems: "flex-start" }}>
                <div style={{ background: u.badge === "NEU" ? "rgba(46,204,138,0.15)" : "rgba(255,170,0,0.1)", border: `1px solid ${u.badge === "NEU" ? "rgba(46,204,138,0.4)" : "rgba(255,170,0,0.3)"}`, color: u.badge === "NEU" ? "var(--accent)" : "#ffaa00", borderRadius: 6, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.06em", flexShrink: 0, marginTop: 2 }}>
                  {u.badge}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 2 }}>{u.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", lineHeight: 1.55 }}>{u.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.85rem" }}>Kostenlos vs. Premium</div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginBottom: 4 }}>
            <div />
            <div style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-dim)", padding: "6px 0" }}>Kostenlos</div>
            <div style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 800, color: "#ffd700", padding: "6px 0", background: "rgba(255,215,0,0.06)", borderRadius: "10px 10px 0 0", border: "1px solid rgba(255,215,0,0.2)", borderBottom: "none" }}>👑 Premium</div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
            {ROWS.map((row, i) => (
              <div key={row.key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: i < ROWS.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "var(--surface)" : "var(--background)" }}>
                {/* Label */}
                <div style={{ padding: "10px 12px", fontSize: "0.78rem", fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center" }}>
                  {row.label}
                </div>
                {/* Free */}
                <div style={{ padding: "10px 8px", fontSize: "0.72rem", textAlign: "center", color: "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {row.free === false ? (
                    <span style={{ color: "rgba(255,68,85,0.5)", fontSize: "0.9rem" }}>✕</span>
                  ) : (
                    <span style={{ lineHeight: 1.3 }}>{row.free}</span>
                  )}
                </div>
                {/* Premium */}
                <div style={{ padding: "10px 8px", fontSize: "0.72rem", textAlign: "center", background: "rgba(255,215,0,0.04)", borderLeft: "1px solid rgba(255,215,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {row.premium === true ? (
                    <span style={{ color: "#ffd700", fontWeight: 800, fontSize: "0.9rem" }}>✓</span>
                  ) : (
                    <span style={{ color: "#ffd700", fontWeight: 700, lineHeight: 1.3, fontSize: "0.7rem" }}>{row.premium}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PERSONAL MESSAGE */}
        <section style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.07), rgba(255,170,0,0.03))", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 16, padding: "1.25rem", marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.85rem", lineHeight: 1.75, margin: 0, color: "var(--text)" }}>
            Dein Körper ist dein größter Schatz.{" "}
            <span style={{ color: "var(--text-dim)" }}>
              Damit du weißt, was wirklich in deinen Produkten steckt, arbeiten wir täglich daran TRUE noch besser für dich zu machen. TRUE bleibt unabhängig und werbefrei — um dir den bestmöglichen Service zu bieten, brauchen wir deine Unterstützung.
            </span>
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", margin: "0.75rem 0 0" }}>— Marvin, Gründer TRUE</p>
        </section>

        {/* PRICE + CTA */}
        <section style={{ marginBottom: "2rem" }}>
          {/* Social proof strip */}
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginBottom: "1.25rem" }}>
            {[
              { icon: "👥", label: "1.200+", sub: "auf der Warteliste" },
              { icon: "⭐", label: "4,8 / 5", sub: "Nutzerbewertung" },
              { icon: "🔒", label: "Keine Werbung", sub: "Immer werbefrei" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1rem", marginBottom: 2 }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "var(--text)" }}>{s.label}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,170,0,0.05))", border: "1px solid rgba(255,215,0,0.25)", borderRadius: 20, padding: "1.5rem", textAlign: "center", marginBottom: "1rem" }}>

            {/* Price */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.3rem", marginBottom: 2 }}>
              <span style={{ fontWeight: 900, fontSize: "3rem", color: "#ffd700", letterSpacing: "-0.04em", lineHeight: 1 }}>2,99€</span>
              <span style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>/Monat</span>
            </div>
            <div style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginBottom: "1.5rem" }}>
              Jederzeit kündbar · Keine versteckten Kosten · 14 Tage gratis
            </div>

            {/* Founder Test Button */}
            {!isPremium ? (
              <button
                onClick={activateFreeTrial}
                style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,215,0,0.35)", borderRadius: 12, padding: "0.75rem", color: "#ffd700", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", marginBottom: "0.75rem" }}
              >
                🧪 Kostenlos testen (Founder-Zugang)
              </button>
            ) : (
              <div style={{ background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: 12, padding: "0.75rem", color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem", textAlign: "center" }}>
                ✅ Premium ist aktiv — bereits freigeschaltet
              </div>
            )}

            {/* Primary CTA */}
            {STRIPE_LINK ? (
              <a
                href={STRIPE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", width: "100%",
                  background: "linear-gradient(135deg, #ffd700, #ffaa00)",
                  color: "#000", border: "none", borderRadius: 14,
                  padding: "1rem", fontWeight: 900, fontSize: "1.1rem",
                  cursor: "pointer", boxShadow: "0 4px 28px rgba(255,215,0,0.35)",
                  textDecoration: "none", marginBottom: "0.6rem",
                  boxSizing: "border-box",
                }}
              >
                👑 Jetzt Premium kaufen
              </a>
            ) : (
              <>
                {!sent ? (
                  <>
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && joinWaitlist()}
                      type="email"
                      placeholder="Deine E-Mail-Adresse"
                      style={{
                        width: "100%", background: "var(--surface)", border: "1px solid rgba(255,215,0,0.3)",
                        borderRadius: 12, padding: "0.85rem 1rem", color: "var(--text)",
                        fontSize: "0.9rem", outline: "none", marginBottom: "0.75rem",
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      onClick={joinWaitlist}
                      disabled={!email.trim()}
                      style={{
                        width: "100%",
                        background: email.trim() ? "linear-gradient(135deg, #ffd700, #ffaa00)" : "rgba(255,215,0,0.2)",
                        color: email.trim() ? "#000" : "rgba(255,215,0,0.5)", border: "none", borderRadius: 14,
                        padding: "1rem", fontWeight: 900, fontSize: "1.05rem",
                        cursor: email.trim() ? "pointer" : "not-allowed",
                        boxShadow: email.trim() ? "0 4px 24px rgba(255,215,0,0.3)" : "none",
                        transition: "all 0.2s", marginBottom: "0.6rem",
                      }}
                    >
                      👑 Früh-Zugang sichern
                    </button>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                      Du erhältst eine E-Mail, sobald Premium verfügbar ist — zum Einführungspreis.
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "0.75rem 0" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎉</div>
                    <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#ffd700", marginBottom: "0.4rem" }}>Du bist dabei!</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
                      Wir melden uns bei <strong style={{ color: "var(--text)" }}>{email}</strong>.<br />
                      Als Early-Access-Mitglied bekommst du den besten Preis.
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "center", gap: "1rem" }}>
              {["🔒 Sicheres Checkout", "💳 Kreditkarte & PayPal", "🔄 Kündbar"].map(t => (
                <span key={t} style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>{t}</span>
              ))}
            </div>
          </div>
        </section>

        <Link href="/home" style={{ display: "block", textAlign: "center", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.85rem", fontWeight: 600, fontSize: "0.9rem", color: "var(--text-dim)", textDecoration: "none" }}>
          ← Zurück zur App
        </Link>
      </div>
    </div>
    </AuthGuard>
  )
}
