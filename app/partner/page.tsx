"use client"
import Link from "next/link"
import { useState } from "react"

// ─── Rain drops — sporadic product drops falling through hero ─────────────────
// Placed only at left (<28%) and right (>72%) so center content stays readable

// Left side = good products, Right side = bad products
const RAIN_DROPS = [
  // ── Links: gute Produkte ──
  { emoji: "💚", name: "Nocciolata ✓", positive: true,  x: "5%",  delay: "0s",   dur: "28s", op: 0.85 },
  { emoji: "🥤", name: "Bionade ✓",    positive: true,  x: "16%", delay: "11s",  dur: "32s", op: 0.75 },
  { emoji: "🥛", name: "Andechser ✓",  positive: true,  x: "23%", delay: "21s",  dur: "26s", op: 0.7  },
  // ── Rechts: schlechte Produkte ──
  { emoji: "🍫", name: "Nutella ⚠",   positive: false, x: "75%", delay: "5s",   dur: "30s", op: 0.8  },
  { emoji: "🥤", name: "Coca-Cola ⚠", positive: false, x: "86%", delay: "16s",  dur: "25s", op: 0.75 },
  { emoji: "🧴", name: "Ariel ⚠",     positive: false, x: "93%", delay: "26s",  dur: "29s", op: 0.7  },
]

// ─── Tiers ────────────────────────────────────────────────────────────────────

const TIERS = [
  {
    id: "basic", name: "Starter", price: "29€", sub: "/ Monat",
    color: "#2ECC8A", emoji: "🧪", highlight: false,
    badge: "14 Tage gratis testen",
    tagline: "Zum Reinschnuppern & Testen",
    features: [
      "1 Produkt einreichen & verifizieren lassen",
      "Als Alternative bei passenden Scans erscheinen",
      "Verifiziertes ✓ Label in der App",
      "Basis-Statistiken (Impressionen, Klicks)",
      "14 Tage kostenlos testen — jederzeit kündbar",
    ],
    missing: [
      "Priorisierte Platzierung bei Scans",
      "Bis zu 5 Produkte listen",
      "CSV-Export der Auswertungen",
      "Erwähnung im TRUE-Kanal",
    ],
    cta: "14 Tage kostenlos starten",
  },
  {
    id: "growth", name: "Wachstum", price: "79€", sub: "/ Monat",
    color: "#4488ff", emoji: "🚀", highlight: true,
    badge: "BELIEBT",
    tagline: "Für aktive Marken die wachsen",
    features: [
      "Alles aus Starter",
      "Bis zu 5 Produkte listen & verwalten",
      "Vollständiges Insights-Dashboard",
      "Priorisierte Platzierung bei Scan-Ergebnissen",
      "CSV-Export aller Statistiken",
      "14 Tage kostenlos testen",
    ],
    missing: [
      "Top-Platzierung (immer erste Alternative)",
      "Unbegrenzte Produkte",
      "Erwähnung im TRUE-Kanal",
    ],
    cta: "Jetzt wachsen",
  },
  {
    id: "enterprise", name: "Premium", price: "149€", sub: "/ Monat",
    color: "#ffd700", emoji: "👑", highlight: false,
    badge: "All-Inclusive",
    tagline: "Für ernsthafte Marken mit Reichweite",
    features: [
      "Alles aus Wachstum",
      "Unbegrenzte Produkte",
      "Top-Platzierung bei Scans (immer erste Alternative)",
      "Erwähnung im TRUE-Kanal (Posts & Stories)",
      "Eigene Kampagnenseite in der App",
      "Direktes Nutzer-Feedback & Beratung",
      "14 Tage kostenlos testen",
    ],
    missing: [],
    cta: "Premium starten",
  },
]

const HOW_IT_WORKS = [
  {
    step: "01", emoji: "✍️", title: "Registrieren & Produkt einreichen",
    desc: "Erstelle deinen Partner-Account, gib dein Produkt ein (Barcode, Foto, Beschreibung) und lade deinen Qualitätsnachweis hoch — z.B. Bio-Zertifikat, Rainforest Alliance oder Fairtrade-ID.",
  },
  {
    step: "02", emoji: "🔍", title: "TRUE prüft & verifiziert",
    desc: "Wir gleichen deinen Barcode automatisch mit Open Food Facts ab und prüfen deine Nachweise. Nach Freigabe (i.d.R. 3–5 Werktage) erscheint dein Produkt mit dem ✓ Verifiziert-Label.",
  },
  {
    step: "03", emoji: "🎯", title: "Als Alternative erscheinen",
    desc: "Nutzer scannt ein Konkurrenzprodukt in deiner Kategorie — dein Produkt erscheint sofort als empfohlene Alternative mit Foto, Preis und direktem Link.",
  },
  {
    step: "04", emoji: "📈", title: "Wachsen & messen",
    desc: "Dein Dashboard zeigt Impressionen, Klicks und Einkaufslisten-Adds in Echtzeit — transparent, ohne versteckte Kosten.",
  },
]

const WHY_TRUE = [
  { emoji: "🎯", title: "Perfektes Timing", desc: "Du erscheinst exakt wenn ein Nutzer ein Problem-Produkt scannt — höchste Kaufabsicht, kein Cold-Traffic." },
  { emoji: "🔍", title: "Unabhängige Verifikation", desc: "Jedes Produkt wird gegen Open Food Facts geprüft. Nur verifizierte Produkte erscheinen als Alternative — das schafft echtes Vertrauen bei Nutzern." },
  { emoji: "📊", title: "Messbare Wirkung", desc: "Transparente Dashboards: Impressionen, Klicks, Einkaufslisten-Adds. Keine versteckten Kosten — nur echte Zahlen." },
  { emoji: "🌱", title: "Gemeinsam wachsen", desc: "TRUE-Nutzer suchen aktiv nach ethischen Alternativen. Du erreichst Menschen mit echter Kaufabsicht — keine zufälligen Impressionen." },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function PartnerPage() {
  const [contactEmail, setContactEmail]     = useState("")
  const [contactCompany, setContactCompany] = useState("")
  const [contactSent, setContactSent]       = useState(false)
  const [contactSending, setContactSending] = useState(false)
  const [selectedTier, setSelectedTier]     = useState("")

  async function submitContact() {
    if (!contactEmail.trim()) return
    setContactSending(true)
    try {
      await fetch("/api/partner-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: contactEmail.trim(), companyName: contactCompany.trim(), tier: selectedTier }),
      })
    } catch {}
    setContactSending(false)
    setContactSent(true)
  }

  return (
    <div style={{ minHeight: "100dvh", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif", overflowX: "hidden",
      /* Full-page green-to-neutral gradient */
      background: "linear-gradient(180deg, #061410 0%, #091c13 12%, #0b2016 24%, var(--background) 48%)" }}>

      <style>{`
        @keyframes raindrop {
          0%   { transform: translateY(-130px); opacity: 0; }
          4%   { opacity: var(--op, 0.8); }
          78%  { opacity: var(--op, 0.8); }
          88%  { opacity: 0; transform: translateY(620px); }
          100% { opacity: 0; transform: translateY(620px); }
        }
        @keyframes glow {
          0%,100% { box-shadow: 0 0 24px rgba(68,136,255,0.28), 0 4px 20px rgba(0,0,0,0.2); }
          50%      { box-shadow: 0 0 44px rgba(68,136,255,0.52), 0 4px 20px rgba(0,0,0,0.2); }
        }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulseBadge { 0%,100% { opacity:1 } 50% { opacity:0.7 } }

        /* Explainer video scenes — 20s total, 5s per scene */
        @keyframes scene1 {
          0%   { opacity:0 }  2%  { opacity:1 }
          23%  { opacity:1 }  25% { opacity:0 }  100% { opacity:0 }
        }
        @keyframes scene2 {
          0%,25% { opacity:0 }  27% { opacity:1 }
          48%    { opacity:1 }  50% { opacity:0 }  100% { opacity:0 }
        }
        @keyframes scene3 {
          0%,50% { opacity:0 }  52% { opacity:1 }
          73%    { opacity:1 }  75% { opacity:0 }  100% { opacity:0 }
        }
        @keyframes scene4 {
          0%,75% { opacity:0 }  77% { opacity:1 }
          98%    { opacity:1 }  100% { opacity:0 }
        }
        @keyframes explainerProgress { 0% { width:0% } 100% { width:100% } }
        @keyframes dot1 { 0%,24%{opacity:1} 25%,100%{opacity:0.2} }
        @keyframes dot2 { 0%,25%{opacity:0.2} 26%,49%{opacity:1} 50%,100%{opacity:0.2} }
        @keyframes dot3 { 0%,50%{opacity:0.2} 51%,74%{opacity:1} 75%,100%{opacity:0.2} }
        @keyframes dot4 { 0%,75%{opacity:0.2} 76%,100%{opacity:1} }

        .tier-card { transition: transform 0.22s ease, box-shadow 0.22s ease; }
        .tier-card:hover { transform: translateY(-7px) !important; }
        .tier-basic:hover    { box-shadow: 0 20px 44px rgba(46,204,138,0.22), 0 4px 16px rgba(0,0,0,0.18) !important; }
        .tier-growth:hover   { box-shadow: 0 20px 52px rgba(68,136,255,0.42), 0 4px 16px rgba(0,0,0,0.18) !important; }
        .tier-enterprise:hover { box-shadow: 0 20px 44px rgba(255,215,0,0.22), 0 4px 16px rgba(0,0,0,0.18) !important; }
        .tier-cta { transition: filter 0.15s, transform 0.15s; }
        .tier-cta:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .how-step { transition: transform 0.18s; }
        .how-step:hover { transform: translateX(5px); }
        .hero-cta { transition: transform 0.15s, box-shadow 0.15s; }
        .hero-cta:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(46,204,138,0.5) !important; }
        .contact-btn { transition: transform 0.15s, box-shadow 0.15s; }
        .contact-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(46,204,138,0.4); }
        .why-row { transition: transform 0.15s; }
        .why-row:hover { transform: translateX(4px); }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,20,16,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(46,204,138,0.12)", padding: "0 1.25rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/home" style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.05em", color: "#2ECC8A", textDecoration: "none" }}>TRUE</Link>
        <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.01em" }}>Für Marken & Hersteller</span>
        <a href="#contact" style={{ background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000", borderRadius: "10px", padding: "6px 16px", fontWeight: 800, fontSize: "0.82rem", textDecoration: "none" }}>Kontakt →</a>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", overflow: "hidden", minHeight: "540px", display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 1.5rem 5rem" }}>

        {/* Ambient glow behind content */}
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 340, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(46,204,138,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* ── Rain drops ── */}
        {RAIN_DROPS.map((d, i) => (
          <div key={i} style={{
            position: "absolute",
            left: d.x,
            top: 0,
            animationName: "raindrop",
            animationDuration: d.dur,
            animationDelay: d.delay,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationFillMode: "both",
            ["--op" as string]: d.op,
            zIndex: 1,
          }}>
            <div style={{
              background: d.positive ? "rgba(46,204,138,0.12)" : "rgba(255,85,51,0.1)",
              border: `1px solid ${d.positive ? "rgba(46,204,138,0.3)" : "rgba(255,100,68,0.28)"}`,
              borderRadius: 12, padding: "7px 11px",
              display: "flex", alignItems: "center", gap: 7,
              backdropFilter: "blur(4px)",
              whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: "1.1rem" }}>{d.emoji}</span>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: d.positive ? "rgba(46,204,138,0.9)" : "rgba(255,130,100,0.9)" }}>
                {d.name}
              </span>
            </div>
          </div>
        ))}

        {/* ── Center content ── */}
        <div style={{ textAlign: "center", position: "relative", zIndex: 2, maxWidth: 520, animation: "fadeUp 0.7s ease" }}>
          <div style={{ display: "inline-block", background: "rgba(46,204,138,0.14)", border: "1px solid rgba(46,204,138,0.35)", borderRadius: "99px", padding: "5px 18px", fontSize: "0.7rem", fontWeight: 800, color: "#2ECC8A", marginBottom: "1.5rem", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            🌱 Für transparente Marken
          </div>

          <h1 style={{ fontSize: "clamp(1.75rem, 5vw, 2.6rem)", fontWeight: 900, lineHeight: 1.12, letterSpacing: "-0.035em", marginBottom: "1rem", color: "#fff" }}>
            Werde die Alternative<br />
            <span style={{ background: "linear-gradient(135deg, #2ECC8A 30%, #7fffd4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              die bewusste Käufer wählen
            </span>
          </h1>

          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.92rem", lineHeight: 1.8, marginBottom: "2.25rem" }}>
            TRUE Nutzer scannen Produkte, erstellen bewusste Einkaufslisten und recherchieren gezielt welche Marken wirklich transparent sind —
            um die beste Alternative für sich und ihre Familie zu finden.<br />
            <strong style={{ color: "rgba(255,255,255,0.8)" }}>Du erscheinst genau in diesem Moment.</strong>
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/partner-register" className="hero-cta" style={{ display: "inline-block", background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000", borderRadius: "14px", padding: "1rem 2.2rem", fontWeight: 900, fontSize: "1rem", textDecoration: "none", boxShadow: "0 0 28px rgba(46,204,138,0.35)" }}>
              Partnerschaft starten →
            </a>
            <a href="#how" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "1rem 1.5rem", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontSize: "0.88rem", fontWeight: 600, textDecoration: "none" }}>
              So funktioniert es ↓
            </a>
          </div>
        </div>

        {/* Bottom fade into page */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90, background: "linear-gradient(to bottom, transparent, #091c13)", pointerEvents: "none" }} />
      </section>

      {/* ── Page content (max-width container) ──────────────────────────────── */}
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "0 1.25rem" }}>

        {/* EXPLAINER VIDEO */}
        <section style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.85rem" }}>
            ▶ So läuft es ab — in 4 Schritten
          </div>
          <div style={{ background: "#080f08", border: "1px solid rgba(46,204,138,0.15)", borderRadius: "20px", padding: "1.25rem" }}>

            {/* Progress dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: "1.25rem" }}>
              {[
                { anim: "dot1", label: "Problem" },
                { anim: "dot2", label: "Analyse" },
                { anim: "dot3", label: "Alternative" },
                { anim: "dot4", label: "Gewinn" },
              ].map(d => (
                <div key={d.anim} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 32, height: 3, borderRadius: 2, background: "#2ECC8A", animation: `${d.anim} 20s linear infinite` }} />
                  <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.25)", animation: `${d.anim} 20s linear infinite` }}>{d.label}</div>
                </div>
              ))}
            </div>

            {/* Phone + animated scenes */}
            <div style={{ position: "relative", width: "100%", maxWidth: 260, margin: "0 auto", height: 300 }}>

              {/* Phone frame */}
              <div style={{ position: "absolute", inset: 0, background: "#111", border: "2px solid #2a2a2a", borderRadius: 36, boxShadow: "0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)" }}>
                <div style={{ width: 56, height: 4, background: "#1e1e1e", borderRadius: 2, margin: "10px auto 8px", border: "1px solid #2a2a2a" }} />
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0 14px", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>9:41</span>
                  <span style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.2)" }}>●●●</span>
                </div>
                <div style={{ background: "#161616", borderBottom: "1px solid #1e1e1e", padding: "5px 14px" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 900, color: "#2ECC8A" }}>TRUE</div>
                </div>
              </div>

              {/* Scene 1 — Nutzer scannt */}
              <div style={{ position: "absolute", top: 74, left: 12, right: 12, animation: "scene1 20s linear infinite", opacity: 0 }}>
                <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.3)", marginBottom: 8, textAlign: "center" }}>🛒 Einkauf · Supermarkt</div>
                <div style={{ background: "#1a1a1a", border: "1px solid #252525", borderRadius: 12, padding: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>🫙</div>
                    <div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#fff" }}>Nutella</div>
                      <div style={{ fontSize: "0.56rem", color: "rgba(255,255,255,0.3)" }}>Ferrero · 450g</div>
                    </div>
                    <div style={{ marginLeft: "auto", background: "rgba(46,204,138,0.12)", border: "1px solid rgba(46,204,138,0.28)", borderRadius: 7, padding: "3px 7px", fontSize: "0.58rem", fontWeight: 800, color: "#2ECC8A" }}>Scan ▶</div>
                  </div>
                  <div style={{ background: "rgba(46,204,138,0.05)", border: "1px solid rgba(46,204,138,0.12)", borderRadius: 8, padding: "7px", fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
                    📷 Barcode wird analysiert…
                  </div>
                </div>
              </div>

              {/* Scene 2 — TRUE deckt auf */}
              <div style={{ position: "absolute", top: 74, left: 12, right: 12, animation: "scene2 20s linear infinite", opacity: 0 }}>
                <div style={{ fontSize: "0.58rem", color: "#ff7755", marginBottom: 8, textAlign: "center", fontWeight: 700 }}>⚠ Scan-Ergebnis</div>
                <div style={{ background: "#1a0d0a", border: "1px solid rgba(255,85,51,0.28)", borderRadius: 12, padding: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,85,51,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem" }}>🫙</div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#fff" }}>Nutella</div>
                  </div>
                  {[
                    { i: "Palmöl",          s: "⚠ Kritisch",  red: true  },
                    { i: "Zucker 52g/100g", s: "⚠ Hoch",      red: true  },
                    { i: "Kakao 7%",        s: "ℹ Gering",    red: false },
                  ].map(w => (
                    <div key={w.i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)" }}>{w.i}</span>
                      <span style={{ fontSize: "0.56rem", fontWeight: 700, color: w.red ? "#ff7755" : "rgba(255,255,255,0.25)" }}>{w.s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scene 3 — Alternative */}
              <div style={{ position: "absolute", top: 74, left: 12, right: 12, animation: "scene3 20s linear infinite", opacity: 0 }}>
                <div style={{ fontSize: "0.58rem", color: "#2ECC8A", marginBottom: 8, textAlign: "center", fontWeight: 700 }}>💚 TRUE empfiehlt</div>
                <div style={{ background: "#0d1a0d", border: "1.5px solid rgba(46,204,138,0.32)", borderRadius: 12, padding: "10px" }}>
                  <div style={{ fontSize: "0.52rem", fontWeight: 900, color: "#2ECC8A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}>Bessere Alternative</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>💚</div>
                    <div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff" }}>Nocciolata</div>
                      <div style={{ fontSize: "0.56rem", color: "rgba(255,255,255,0.35)" }}>Bio · Palmölfrei · dm</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {["🌿 Bio", "✓ Palmölfrei", "♻ Fair"].map(t => (
                      <div key={t} style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.18)", borderRadius: 6, padding: "2px 6px", fontSize: "0.5rem", color: "#2ECC8A", fontWeight: 700 }}>{t}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scene 4 — Gewechselt */}
              <div style={{ position: "absolute", top: 74, left: 12, right: 12, animation: "scene4 20s linear infinite", opacity: 0 }}>
                <div style={{ fontSize: "0.58rem", color: "#2ECC8A", marginBottom: 8, textAlign: "center", fontWeight: 700 }}>✅ Gewechselt</div>
                <div style={{ background: "#0d1a0d", border: "1px solid rgba(46,204,138,0.22)", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 6 }}>🎉</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff", marginBottom: 3 }}>Nocciolata</div>
                  <div style={{ fontSize: "0.6rem", color: "#2ECC8A", fontWeight: 700, marginBottom: 10 }}>zur Einkaufsliste hinzugefügt</div>
                  <div style={{ background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", borderRadius: 8, padding: "7px 12px", fontSize: "0.62rem", fontWeight: 900, color: "#000", display: "inline-block" }}>
                    Du hast einen neuen Kunden 🎯
                  </div>
                </div>
              </div>

            </div>

            {/* Scene caption */}
            <div style={{ position: "relative", height: 36, marginTop: 14 }}>
              {[
                { text: "Nutzer scannt Nutella beim Einkauf",            anim: "scene1" },
                { text: "TRUE deckt bedenkliche Inhaltsstoffe auf",      anim: "scene2" },
                { text: "Deine Marke erscheint als die bessere Wahl",    anim: "scene3" },
                { text: "Nutzer wechselt — du gewinnst einen Kunden",    anim: "scene4" },
              ].map((s, i) => (
                <div key={i} style={{ position: "absolute", inset: 0, opacity: 0, animation: `${s.anim} 20s linear infinite`, textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{s.text}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 10, background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,#2ECC8A,#1aaa6e)", animation: "explainerProgress 20s linear infinite" }} />
            </div>

          </div>
        </section>

        {/* STATS — honest */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "2.5rem" }}>
          {[
            { emoji: "📷", value: "Täglich",  label: "neue Scans" },
            { emoji: "💚", value: "94%",      label: "wählen Alternativen" },
            { emoji: "🌱", value: "Wächst",   label: "jeden Monat" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>{s.emoji}</div>
              <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "var(--accent)", letterSpacing: "-0.02em" }}>{s.value}</div>
              <div style={{ fontSize: "0.67rem", color: "var(--text-dim)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </section>

        {/* HOW IT WORKS */}
        <section id="how" style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.85rem" }}>So funktioniert es</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {HOW_IT_WORKS.map(h => (
              <div key={h.step} className="how-step" style={{ display: "flex", gap: "1rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.72rem" }}>{h.step}</div>
                  <span style={{ fontSize: "1.1rem" }}>{h.emoji}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: 4 }}>{h.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.6 }}>{h.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* APP IN ACTION — phone mockup */}
        <section style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.85rem" }}>
            ⚡ So sieht der Kunde dich in der App
          </div>

          <div style={{ background: "linear-gradient(135deg, rgba(46,204,138,0.07), rgba(46,204,138,0.02))", border: "1px solid rgba(46,204,138,0.15)", borderRadius: "20px", padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", position: "relative", overflow: "hidden" }}>
            {/* Background blob */}
            <div style={{ position: "absolute", top: -50, right: -50, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(46,204,138,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />

            {/* Phone frame */}
            <div style={{ background: "#111", border: "2px solid #2a2a2a", borderRadius: 38, padding: "14px 8px 10px", width: "100%", maxWidth: 280, boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)", position: "relative", zIndex: 1 }}>
              {/* Notch */}
              <div style={{ width: 72, height: 5, background: "#1e1e1e", borderRadius: 3, margin: "0 auto 12px", border: "1px solid #2a2a2a" }} />

              {/* Status bar */}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px", marginBottom: 10 }}>
                <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>9:41</span>
                <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)" }}>●●●</span>
              </div>

              {/* App header */}
              <div style={{ background: "#1a1a1a", borderBottom: "1px solid #222", padding: "8px 10px 8px", marginBottom: 8 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#2ECC8A", letterSpacing: "-0.03em" }}>TRUE</div>
              </div>

              {/* Scan result: problem product */}
              <div style={{ padding: "0 8px", marginBottom: 8 }}>
                <div style={{ background: "#1a0e0a", border: "1px solid rgba(255,85,51,0.25)", borderRadius: 12, padding: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,85,51,0.12)", border: "1px solid rgba(255,85,51,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>🫙</div>
                    <div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#fff" }}>Nutella</div>
                      <div style={{ fontSize: "0.58rem", color: "#ff7755", fontWeight: 700 }}>⚠ Palmöl · Hohe Priorität</div>
                    </div>
                  </div>
                  {/* Recommendation: YOUR brand */}
                  <div style={{ background: "linear-gradient(135deg, rgba(46,204,138,0.14), rgba(46,204,138,0.05))", border: "1.5px solid rgba(46,204,138,0.38)", borderRadius: 10, padding: "9px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(46,204,138,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>💚</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.52rem", fontWeight: 900, color: "#2ECC8A", textTransform: "uppercase", letterSpacing: "0.05em" }}>TRUE empfiehlt</div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff" }}>Dein Produkt hier</div>
                      <div style={{ fontSize: "0.56rem", color: "rgba(255,255,255,0.4)" }}>Rewe · dm · ~4,50€</div>
                    </div>
                    <div style={{ background: "#2ECC8A", color: "#000", borderRadius: 7, padding: "5px 9px", fontSize: "0.58rem", fontWeight: 900, flexShrink: 0 }}>Tauschen</div>
                  </div>
                </div>
              </div>

              {/* Home indicator */}
              <div style={{ width: 56, height: 4, background: "#2a2a2a", borderRadius: 2, margin: "8px auto 2px" }} />
            </div>

            <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", textAlign: "center", margin: 0, lineHeight: 1.65, maxWidth: 400 }}>
              Genau in dem Moment wo ein Nutzer ein Problem-Produkt scannt —<br />erscheinst du als Lösung. <strong style={{ color: "var(--text)" }}>Höchste Kaufabsicht. Kein Streuverlust.</strong>
            </p>
          </div>
        </section>

        {/* PRICING TIERS */}
        <section id="tiers" style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.5rem" }}>Partnerprogramm</div>
          <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>Wähle das Modell das zu deiner Wachstumsphase passt</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {TIERS.map(tier => (
              <div key={tier.id}
                className={`tier-card tier-${tier.id}`}
                style={{
                  background: tier.highlight ? `linear-gradient(135deg, ${tier.color}0d, ${tier.color}05)` : "var(--surface)",
                  border: `1.5px solid ${tier.highlight ? tier.color + "50" : "var(--border)"}`,
                  borderRadius: "20px", padding: "1.5rem", position: "relative", overflow: "hidden",
                  animation: tier.highlight ? "glow 3.5s ease-in-out infinite" : "none",
                }}>

                {tier.id === "basic" && (
                  <div style={{ position: "absolute", top: "13px", right: "13px", background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000", borderRadius: "8px", padding: "3px 12px", fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.05em", boxShadow: "0 2px 14px rgba(46,204,138,0.4)" }}>
                    🎁 30 Tage gratis
                  </div>
                )}

                {tier.highlight && (
                  <>
                    <div style={{ position: "absolute", top: -20, right: -20, width: 90, height: 90, borderRadius: "50%", background: `${tier.color}12`, pointerEvents: "none" }} />
                    <div style={{ position: "absolute", top: "13px", right: "13px", background: `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)`, color: "#fff", borderRadius: "8px", padding: "3px 12px", fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.05em", animation: "pulseBadge 2.5s ease-in-out infinite", boxShadow: `0 2px 14px ${tier.color}55` }}>
                      ⭐ BELIEBT
                    </div>
                  </>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1rem" }}>
                  <div style={{ width: 46, height: 46, borderRadius: "13px", background: `${tier.color}18`, border: `1px solid ${tier.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                    {tier.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: "1rem" }}>{tier.name}</div>
                    <div>
                      <span style={{ fontWeight: 900, fontSize: "1.2rem", color: tier.color }}>{tier.price}</span>
                      {tier.sub && <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginLeft: 4 }}>{tier.sub}</span>}
                    </div>
                  </div>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.25rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ display: "flex", gap: "0.5rem", fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.5, padding: "3px 0" }}>
                      <span style={{ color: tier.color, flexShrink: 0, fontWeight: 700 }}>✓</span>{f}
                    </li>
                  ))}
                  {(tier.missing ?? []).map(f => (
                    <li key={f} style={{ display: "flex", gap: "0.5rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.2)", lineHeight: 1.5, padding: "3px 0" }}>
                      <span style={{ color: "#ff4455", flexShrink: 0, fontWeight: 700 }}>✗</span>
                      <span style={{ textDecoration: "line-through" }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <a href={tier.id === "enterprise" ? "#contact" : `/partner-register?tier=${tier.id}`}
                  onClick={() => { if (tier.id === "enterprise") setSelectedTier(tier.name) }}
                  className="tier-cta"
                  style={{ display: "block", textAlign: "center", background: tier.highlight ? `linear-gradient(135deg, ${tier.color}, ${tier.color}cc)` : "transparent", color: tier.highlight ? "#fff" : tier.color, border: `1.5px solid ${tier.color}`, borderRadius: "12px", padding: "0.9rem", fontWeight: 800, fontSize: "0.9rem", textDecoration: "none", cursor: "pointer" }}>
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* WHY TRUE */}
        <section style={{ background: "linear-gradient(135deg, rgba(46,204,138,0.07), rgba(46,204,138,0.02))", border: "1px solid rgba(46,204,138,0.16)", borderRadius: "20px", padding: "1.75rem", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--accent)", textTransform: "uppercase", marginBottom: "1rem" }}>💡 Warum TRUE-Partner werden?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {WHY_TRUE.map(r => (
              <div key={r.title} className="why-row" style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{r.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.15rem" }}>{r.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.6 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" style={{ marginBottom: "4rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "0.5rem" }}>Kontakt aufnehmen</div>
          <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>Schreib uns — wir melden uns innerhalb von 24 Stunden.</p>

          {!contactSent ? (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600, marginBottom: "0.5rem" }}>Interesse an</div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {TIERS.map(t => (
                    <button key={t.id} onClick={() => setSelectedTier(selectedTier === t.name ? "" : t.name)}
                      style={{ padding: "6px 14px", borderRadius: "999px", border: `1.5px solid ${selectedTier === t.name ? t.color : "var(--border)"}`, background: selectedTier === t.name ? t.color + "18" : "transparent", color: selectedTier === t.name ? t.color : "var(--text-dim)", fontSize: "0.78rem", fontWeight: selectedTier === t.name ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                      {t.emoji} {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={contactCompany} onChange={e => setContactCompany(e.target.value)}
                placeholder="Firmenname (optional)"
                style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.85rem 1rem", color: "var(--text)", fontSize: "0.9rem", outline: "none" }}
              />
              <input
                value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitContact()}
                placeholder="deine@email.de" type="email"
                style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.85rem 1rem", color: "var(--text)", fontSize: "0.9rem", outline: "none" }}
              />
              <button onClick={submitContact} disabled={contactSending} className="contact-btn"
                style={{ background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000", border: "none", borderRadius: "12px", padding: "1rem", fontWeight: 800, cursor: "pointer", fontSize: "0.95rem", opacity: contactSending ? 0.7 : 1 }}>
                {contactSending ? "Wird gesendet…" : "Anfrage senden →"}
              </button>
              <p style={{ fontSize: "0.68rem", color: "var(--text-dim)", textAlign: "center", lineHeight: 1.5, margin: 0 }}>Keine Weitergabe deiner Daten. Kein Spam.</p>
            </div>
          ) : (
            <div style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.25)", borderRadius: "20px", padding: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎉</div>
              <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.4rem" }}>Anfrage erhalten!</div>
              <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Wir melden uns innerhalb von 24h bei <strong>{contactEmail}</strong>.</div>
            </div>
          )}
        </section>

        <footer style={{ borderTop: "1px solid var(--border)", padding: "2rem 1rem", textAlign: "center", fontSize: "0.82rem" }}>
          <div style={{ marginBottom: "0.75rem", color: "var(--text-dim)" }}>
            <Link href="/home" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}>TRUE App</Link>
            {" · "}
            <a href="mailto:partner@get-true.de" style={{ color: "var(--text-dim)", textDecoration: "none" }}>partner@get-true.de</a>
            {" · "}
            <span>get-true.de</span>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/impressum" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none", fontWeight: 500 }}>Impressum</Link>
            <Link href="/datenschutz" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none", fontWeight: 500 }}>Datenschutz</Link>
            <a href="mailto:info@get-true.de" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "none", fontWeight: 500 }}>Kontakt</a>
          </div>
        </footer>
      </div>
    </div>
  )
}
