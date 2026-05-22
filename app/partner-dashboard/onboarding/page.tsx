"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const STEPS = [
  { id: "welcome" },
  { id: "how-it-works" },
  { id: "first-product" },
  { id: "pakete" },
  { id: "ready" },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]           = useState(0)
  const [animating, setAnimating] = useState(false)
  const [name, setName]           = useState("")

  useEffect(() => {
    async function getProfile() {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/partner-login"); return }
      const { data } = await supabase
        .from("partner_profiles").select("company_name")
        .eq("user_id", session.user.id).single()
      if (data) setName(data.company_name ?? "")
      // If already done onboarding, skip
      try {
        if (localStorage.getItem("true-onboarding-done") === "1") {
          router.replace("/partner-dashboard")
        }
      } catch {}
    }
    getProfile()
  }, [])

  function next() {
    if (animating) return
    if (step === STEPS.length - 1) {
      try { localStorage.setItem("true-onboarding-done", "1") } catch {}
      router.push("/partner-dashboard")
      return
    }
    setAnimating(true)
    setTimeout(() => { setStep(s => s + 1); setAnimating(false) }, 280)
  }

  function skip() {
    try { localStorage.setItem("true-onboarding-done", "1") } catch {}
    router.push("/partner-dashboard")
  }

  const progress = ((step) / (STEPS.length - 1)) * 100

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #061410 0%, #081a11 40%, #0a1c13 100%)",
      fontFamily: "system-ui,-apple-system,sans-serif",
      color: "#fff",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes scanLine {
          0%   { top: 10%; }
          50%  { top: 80%; }
          100% { top: 10%; }
        }
        .ob-step { animation: fadeUp 0.35s ease forwards; }
        .ob-fade { animation: fadeIn 0.35s ease forwards; }
        .ob-float { animation: float 3s ease-in-out infinite; }
        .ob-pulse { animation: pulse 2s ease-in-out infinite; }
        .next-btn:hover { filter: brightness(1.08); transform: translateY(-2px); }
        .next-btn:active { transform: translateY(0); }
        .skip-btn:hover { color: rgba(255,255,255,0.5) !important; }
        .feature-row { transition: background 0.15s; }
        .feature-row:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>

      {/* Progress bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.06)", zIndex: 100 }}>
        <div style={{
          height: "100%", background: "linear-gradient(90deg, #2ECC8A, #1aaa6e)",
          width: `${progress}%`, transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
          boxShadow: "0 0 12px rgba(46,204,138,0.6)",
        }} />
      </div>

      {/* Skip */}
      {step < STEPS.length - 1 && (
        <button onClick={skip} className="skip-btn"
          style={{ position: "fixed", top: 18, right: 20, background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", transition: "color 0.15s", zIndex: 100 }}>
          Überspringen
        </button>
      )}

      {/* Step counter */}
      <div style={{ position: "fixed", top: 16, left: 20, display: "flex", gap: "6px", alignItems: "center", zIndex: 100 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6, height: 6, borderRadius: 3,
            background: i <= step ? "#2ECC8A" : "rgba(255,255,255,0.12)",
            transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
          }} />
        ))}
      </div>

      {/* Content area */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "5rem 1.5rem 2rem",
        opacity: animating ? 0 : 1,
        transform: animating ? "translateY(16px)" : "translateY(0)",
        transition: "opacity 0.28s, transform 0.28s",
      }}>

        {/* ─── STEP 0: Welcome ─── */}
        {step === 0 && (
          <div className="ob-step" style={{ textAlign: "center", maxWidth: 520 }}>
            {/* Visual */}
            <div style={{ position: "relative", marginBottom: "2.5rem", height: 160 }}>
              <div className="ob-float" style={{
                position: "absolute", left: "50%", top: "50%",
                transform: "translate(-50%,-50%)",
                width: 100, height: 100, borderRadius: "28px",
                background: "linear-gradient(135deg, #0f3320, #1a4d2e)",
                border: "1.5px solid rgba(46,204,138,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "3rem", boxShadow: "0 20px 60px rgba(46,204,138,0.15)",
              }}>
                🌿
              </div>
              {/* orbiting dots */}
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  position: "absolute",
                  left: `calc(50% + ${Math.cos(i * Math.PI / 2) * 65}px - 5px)`,
                  top: `calc(50% + ${Math.sin(i * Math.PI / 2) * 65}px - 5px)`,
                  width: 10, height: 10, borderRadius: "50%",
                  background: i === 0 ? "#2ECC8A" : i === 1 ? "#4488ff" : i === 2 ? "#ffd700" : "#ff8844",
                  opacity: 0.7,
                }} />
              ))}
            </div>

            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2ECC8A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Willkommen bei TRUE
            </div>
            <h1 style={{ fontWeight: 900, fontSize: "clamp(1.6rem, 5vw, 2.2rem)", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "1rem" }}>
              {name && name.length < 30 ? `Hi, ${name} — ` : ""}schön, dass du dabei bist.
            </h1>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.75, marginBottom: "2rem" }}>
              In den nächsten 2 Minuten zeigen wir dir, wie du deine Produkte
              auf TRUE sichtbar machst — und warum das für dein Unternehmen wichtig ist.
            </p>
            <button onClick={next} className="next-btn"
              style={btnStyle("#2ECC8A")}>
              Los geht's →
            </button>
          </div>
        )}

        {/* ─── STEP 1: How TRUE works ─── */}
        {step === 1 && (
          <div className="ob-step" style={{ textAlign: "center", maxWidth: 600 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4488ff", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Wie TRUE funktioniert
            </div>
            <h2 style={{ fontWeight: 900, fontSize: "clamp(1.4rem, 4vw, 1.9rem)", letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: "0.75rem" }}>
              Verbraucher scannen — dein Produkt erscheint
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", marginBottom: "2.5rem", lineHeight: 1.6 }}>
              TRUE-Nutzer scannen täglich Produkte im Supermarkt und suchen nach echten Alternativen.
              Genau dort tauchst du auf.
            </p>

            {/* Flow diagram */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
              {[
                { emoji: "📱", label: "Nutzer scannt\nein Produkt", color: "#4488ff" },
                { emoji: "⚡", label: "", color: "transparent", small: true },
                { emoji: "🔍", label: "TRUE findet\nAlternativen", color: "#2ECC8A" },
                { emoji: "⚡", label: "", color: "transparent", small: true },
                { emoji: "🏷️", label: "Dein Produkt\nwird angezeigt", color: "#ffd700" },
              ].map((item, i) => (
                item.small ? (
                  <div key={i} style={{ color: "rgba(255,255,255,0.2)", fontSize: "1.1rem" }}>→</div>
                ) : (
                  <div key={i} className="ob-fade" style={{
                    animationDelay: `${i * 0.1}s`,
                    background: `${item.color}12`,
                    border: `1.5px solid ${item.color}35`,
                    borderRadius: "18px", padding: "1.1rem 1rem",
                    minWidth: 110, textAlign: "center",
                  }}>
                    <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>{item.emoji}</div>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4, whiteSpace: "pre-line" }}>{item.label}</div>
                  </div>
                )
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginBottom: "2.5rem", flexWrap: "wrap" }}>
              {[
                { value: "50.000+", label: "aktive Nutzer", color: "#2ECC8A" },
                { value: "∞", label: "potenzielle Impressionen", color: "#4488ff" },
                { value: "0€", label: "Startkosten", color: "#ffd700" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "1rem 1.4rem", textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: "1.5rem", color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: "0.2rem" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <button onClick={next} className="next-btn" style={btnStyle("#4488ff")}>
              Verstanden →
            </button>
          </div>
        )}

        {/* ─── STEP 2: First product ─── */}
        {step === 2 && (
          <div className="ob-step" style={{ maxWidth: 560, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2ECC8A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                Dein erstes Produkt
              </div>
              <h2 style={{ fontWeight: 900, fontSize: "clamp(1.4rem, 4vw, 1.9rem)", letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: "0.6rem" }}>
                Das brauchst du — mehr nicht
              </h2>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                Ein Produkt einreichen dauert unter 3 Minuten. Hier siehst du genau was du brauchst.
              </p>
            </div>

            {/* Checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "2rem" }}>
              {[
                {
                  emoji: "🔢", title: "Barcode (EAN)", required: true,
                  desc: "Die 13-stellige Nummer auf der Verpackung. Damit können wir dein Produkt automatisch verifizieren.",
                  tip: "Kamera deines Handys → einfach abscannen",
                },
                {
                  emoji: "📝", title: "Produktname", required: true,
                  desc: "Der offizielle Name deines Produkts, wie er auch auf der Verpackung steht.",
                  tip: null,
                },
                {
                  emoji: "📂", title: "Kategorie", required: true,
                  desc: "z.B. Lebensmittel, Körperpflege, Haushalt — damit landen Nutzer beim richtigen Suchergebnis.",
                  tip: null,
                },
                {
                  emoji: "🏅", title: "Zertifizierungen", required: false,
                  desc: "Bio, Fair Trade, vegan, plastikfrei? Das macht dein Produkt sichtbarer.",
                  tip: "Optional — aber sehr empfohlen",
                },
                {
                  emoji: "🖼️", title: "Produktbild", required: false,
                  desc: "Ein gutes Foto erhöht die Klickrate erheblich.",
                  tip: "Optional",
                },
              ].map((item, i) => (
                <div key={i} className="feature-row"
                  style={{
                    display: "flex", gap: "1rem", alignItems: "flex-start",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "14px", padding: "0.9rem 1rem",
                  }}>
                  <div style={{
                    width: 42, height: 42, flexShrink: 0,
                    background: item.required ? "rgba(46,204,138,0.1)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${item.required ? "rgba(46,204,138,0.3)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.2rem",
                  }}>
                    {item.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                      <span style={{ fontWeight: 800, fontSize: "0.88rem" }}>{item.title}</span>
                      <span style={{
                        fontSize: "0.6rem", fontWeight: 800, borderRadius: "6px", padding: "1px 7px",
                        background: item.required ? "rgba(46,204,138,0.15)" : "rgba(255,255,255,0.06)",
                        color: item.required ? "#2ECC8A" : "rgba(255,255,255,0.3)",
                        border: `1px solid ${item.required ? "rgba(46,204,138,0.3)" : "rgba(255,255,255,0.08)"}`,
                      }}>
                        {item.required ? "Pflicht" : "Optional"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{item.desc}</div>
                    {item.tip && (
                      <div style={{ fontSize: "0.68rem", color: "rgba(46,204,138,0.7)", marginTop: "0.25rem" }}>💡 {item.tip}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={next} className="next-btn" style={btnStyle("#2ECC8A")}>
              Alles klar →
            </button>
          </div>
        )}

        {/* ─── STEP 3: Pakete ─── */}
        {step === 3 && (
          <div className="ob-step" style={{ textAlign: "center", maxWidth: 620 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ffd700", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Deine Möglichkeiten
            </div>
            <h2 style={{ fontWeight: 900, fontSize: "clamp(1.4rem, 4vw, 1.9rem)", letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: "0.75rem" }}>
              Fang kostenlos an — wachse wenn du bereit bist
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.88rem", lineHeight: 1.6, marginBottom: "2rem" }}>
              Keine Kreditkarte nötig, keine Mindestlaufzeit. Alle Pakete starten mit 14 Tagen gratis.
            </p>

            {/* Tier overview */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
              {[
                { emoji: "🧪", name: "Starter", price: "29€", highlight: "1 Produkt", color: "#2ECC8A" },
                { emoji: "🚀", name: "Wachstum", price: "79€", highlight: "5 Produkte + Insights", color: "#4488ff", popular: true },
                { emoji: "👑", name: "Premium", price: "149€", highlight: "Unbegrenzt + Top-Platz", color: "#ffd700" },
              ].map(t => (
                <div key={t.name} style={{
                  background: t.popular ? `${t.color}10` : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${t.popular ? t.color + "40" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "16px", padding: "1.1rem 0.85rem",
                  position: "relative",
                }}>
                  {t.popular && (
                    <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: t.color, color: "#fff", borderRadius: "20px", padding: "2px 10px", fontSize: "0.58rem", fontWeight: 900, whiteSpace: "nowrap" }}>
                      BELIEBT
                    </div>
                  )}
                  <div style={{ fontSize: "1.4rem", marginBottom: "0.4rem" }}>{t.emoji}</div>
                  <div style={{ fontWeight: 900, fontSize: "0.85rem", marginBottom: "0.2rem" }}>{t.name}</div>
                  <div style={{ fontWeight: 900, fontSize: "1.2rem", color: t.color, marginBottom: "0.3rem" }}>{t.price}<span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>/Monat</span></div>
                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{t.highlight}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(46,204,138,0.06)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: "14px", padding: "0.9rem 1.25rem", marginBottom: "2rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
              ✅ Du kannst alles erkunden und Produkte vorbereiten — das Paket wählst du erst wenn du live gehst.
            </div>

            <button onClick={next} className="next-btn" style={btnStyle("#ffd700", "#000")}>
              Verstanden →
            </button>
          </div>
        )}

        {/* ─── STEP 4: Ready ─── */}
        {step === 4 && (
          <div className="ob-step" style={{ textAlign: "center", maxWidth: 520 }}>
            {/* Checkmark animation */}
            <div className="ob-pulse" style={{
              width: 90, height: 90, borderRadius: "50%",
              background: "linear-gradient(135deg, #2ECC8A, #1aaa6e)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 2rem",
              boxShadow: "0 0 50px rgba(46,204,138,0.3)",
              fontSize: "2.5rem",
            }}>
              ✓
            </div>

            <h2 style={{ fontWeight: 900, fontSize: "clamp(1.6rem, 5vw, 2.2rem)", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "1rem" }}>
              Du bist bereit!
            </h2>
            <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.75, marginBottom: "2.5rem" }}>
              Dein Dashboard wartet auf dich. Als nächstes kannst du direkt
              dein erstes Produkt einreichen — oder dich erstmal in Ruhe umsehen.
            </p>

            {/* Next steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "2.5rem", textAlign: "left" }}>
              {[
                { step: "1", label: "Erstes Produkt einreichen", href: "/partner-dashboard/products", cta: "Produkte →", primary: true },
                { step: "2", label: "Pakete in Ruhe ansehen", href: "/partner-dashboard/pakete", cta: "Pakete →", primary: false },
                { step: "3", label: "Firmeninformationen ergänzen", href: "/partner-dashboard", cta: "Dashboard →", primary: false },
              ].map(item => (
                <div key={item.step} style={{
                  display: "flex", alignItems: "center", gap: "1rem",
                  background: item.primary ? "rgba(46,204,138,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${item.primary ? "rgba(46,204,138,0.25)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: "14px", padding: "0.9rem 1rem",
                }}>
                  <div style={{
                    width: 32, height: 32, flexShrink: 0, borderRadius: "50%",
                    background: item.primary ? "rgba(46,204,138,0.2)" : "rgba(255,255,255,0.06)",
                    border: `1.5px solid ${item.primary ? "rgba(46,204,138,0.5)" : "rgba(255,255,255,0.1)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 900, color: item.primary ? "#2ECC8A" : "rgba(255,255,255,0.4)",
                  }}>
                    {item.step}
                  </div>
                  <span style={{ flex: 1, fontSize: "0.88rem", fontWeight: item.primary ? 700 : 500, color: item.primary ? "#fff" : "rgba(255,255,255,0.55)" }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: item.primary ? "#2ECC8A" : "rgba(255,255,255,0.25)", fontWeight: 700 }}>
                    {item.cta}
                  </span>
                </div>
              ))}
            </div>

            <button onClick={() => { try { localStorage.setItem("true-onboarding-done","1") } catch {} router.push("/partner-dashboard/products") }}
              className="next-btn" style={btnStyle("#2ECC8A")}>
              Erstes Produkt einreichen →
            </button>
            <button onClick={() => { try { localStorage.setItem("true-onboarding-done","1") } catch {} router.push("/partner-dashboard") }}
              className="skip-btn"
              style={{ display: "block", margin: "0.85rem auto 0", background: "none", border: "none", color: "rgba(255,255,255,0.28)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", transition: "color 0.15s" }}>
              Erstmal Dashboard ansehen
            </button>
          </div>
        )}

      </div>

      {/* Bottom nav */}
      {step < STEPS.length - 1 && step > 0 && (
        <div style={{ textAlign: "center", paddingBottom: "1.5rem" }}>
          <button onClick={next} className="next-btn"
            style={{ display: "none" }} /* handled inline per step */ />
        </div>
      )}
    </div>
  )
}

function btnStyle(bg: string, color = "#000"): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${bg}, ${bg}cc)`,
    color,
    border: "none",
    borderRadius: "14px",
    padding: "1rem 2.5rem",
    fontWeight: 900,
    fontSize: "1rem",
    cursor: "pointer",
    fontFamily: "system-ui,-apple-system,sans-serif",
    boxShadow: `0 8px 30px ${bg}30`,
    transition: "filter 0.15s, transform 0.15s",
    letterSpacing: "-0.01em",
  }
}
