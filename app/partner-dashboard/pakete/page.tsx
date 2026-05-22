"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

interface Profile { id: string; tier: string; company_name: string }

const TIERS = [
  {
    id: "basic", name: "Starter", price: 29, emoji: "🧪", color: "#2ECC8A",
    tagline: "Perfekt zum Ausprobieren",
    trial: "14 Tage kostenlos testen",
    features: [
      { text: "1 Produkt einreichen", included: true },
      { text: "Als Alternative erscheinen", included: true },
      { text: "Basis-Statistiken", included: true },
      { text: "Partner-Badge auf deinem Profil", included: true },
      { text: "Insights-Dashboard", included: false },
      { text: "CSV-Export", included: false },
      { text: "Priorisierte Platzierung", included: false },
    ],
  },
  {
    id: "growth", name: "Wachstum", price: 79, emoji: "🚀", color: "#4488ff",
    tagline: "Für aktive Marken",
    trial: "14 Tage kostenlos testen",
    popular: true,
    features: [
      { text: "Bis zu 5 Produkte einreichen", included: true },
      { text: "Als Alternative erscheinen", included: true },
      { text: "Insights-Dashboard", included: true },
      { text: "Priorisierte Platzierung", included: true },
      { text: "CSV-Export", included: true },
      { text: "Partner-Badge auf deinem Profil", included: true },
      { text: "TRUE-Kanal Erwähnung", included: false },
    ],
  },
  {
    id: "enterprise", name: "Premium", price: 149, emoji: "👑", color: "#ffd700",
    tagline: "Für etablierte Marken",
    trial: "14 Tage kostenlos testen",
    features: [
      { text: "Unbegrenzte Produkte", included: true },
      { text: "Top-Platzierung in den Ergebnissen", included: true },
      { text: "Insights-Dashboard", included: true },
      { text: "CSV-Export", included: true },
      { text: "Erwähnung im TRUE-Kanal", included: true },
      { text: "Eigene Kampagnenseite", included: true },
      { text: "Direkter Support", included: true },
    ],
  },
]

const FAQ = [
  {
    q: "Muss ich sofort bezahlen?",
    a: "Nein. Jedes Paket startet mit 14 Tagen kostenlos. Du gibst deine Zahlungsdaten erst an, wenn du weitermachen möchtest.",
  },
  {
    q: "Kann ich jederzeit kündigen?",
    a: "Ja, jederzeit. Keine Mindestlaufzeit, kein Kleingedrucktes. Du kannst auch innerhalb der 14-tägigen Testphase kündigen — es fallen keine Kosten an.",
  },
  {
    q: "Was passiert mit meinen Produkten wenn ich kündige?",
    a: "Deine Produkte werden aus dem TRUE-Katalog entfernt, aber dein Account und alle Daten bleiben erhalten. Du kannst jederzeit wieder ein Paket wählen.",
  },
  {
    q: "Wie funktioniert die Verifizierung?",
    a: "Wir prüfen deine Produkte automatisch über Barcode-Datenbanken. Zertifizierungen (z.B. Bio, Fair Trade) werden manuell von unserem Team bestätigt.",
  },
  {
    q: "Kann ich das Paket wechseln?",
    a: "Ja, jederzeit. Ein Upgrade ist sofort aktiv. Bei einem Downgrade gilt das neue Paket ab dem nächsten Abrechnungszyklus.",
  },
]

export default function PaketePage() {
  const router = useRouter()
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const [saved, setSaved]       = useState<string | null>(null)
  const [openFaq, setOpenFaq]   = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/partner-login"); return }
      const { data } = await supabase
        .from("partner_profiles").select("id,tier,company_name")
        .eq("user_id", session.user.id).single()
      if (data) setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  async function chooseTier(tierId: string) {
    if (!supabase || !profile) return
    setSaving(tierId)
    try {
      const { error } = await supabase
        .from("partner_profiles").update({ tier: tierId }).eq("id", profile.id)
      if (error) throw error
      setProfile({ ...profile, tier: tierId })
      setSaved(tierId)
      setTimeout(() => setSaved(null), 3000)
    } catch (err: any) {
      alert("Fehler: " + (err?.message ?? "Unbekannt"))
    }
    setSaving(null)
  }

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "#0b1a10", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontFamily: "system-ui" }}>
      Laden…
    </div>
  )

  const currentTier = profile?.tier ?? "trial"

  return (
    <div style={{ color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        .tier-card { transition: transform 0.15s, box-shadow 0.15s; }
        .tier-card:hover { transform: translateY(-4px); }
        .faq-item:hover { background: rgba(255,255,255,0.04) !important; }
        .choose-btn:hover { filter: brightness(1.08); }
      `}</style>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontWeight: 900, fontSize: "2rem", letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>
            Wähle dein Paket — <span style={{ color: "#2ECC8A" }}>wenn du bereit bist</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem", lineHeight: 1.7, maxWidth: "540px", margin: "0 auto" }}>
            Kein Druck, kein Verstecktes. Hier stehen alle Infos — lies in Ruhe durch und
            entscheide selbst, wann der richtige Moment ist.
          </p>
        </div>

        {/* Current tier badge */}
        {currentTier !== "trial" && (
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <span style={{ background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.3)", color: "#2ECC8A", borderRadius: "20px", padding: "5px 16px", fontSize: "0.78rem", fontWeight: 700 }}>
              Aktuelles Paket: {TIERS.find(t => t.id === currentTier)?.name ?? currentTier}
            </span>
          </div>
        )}

        {/* Tier cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "3rem" }}>
          {TIERS.map(t => {
            const isCurrent = currentTier === t.id
            const isSaving  = saving === t.id
            const isSaved   = saved === t.id

            return (
              <div key={t.id} className="tier-card"
                style={{
                  background: t.popular ? `linear-gradient(180deg, ${t.color}0a 0%, rgba(255,255,255,0.03) 100%)` : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${t.popular ? t.color + "40" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "20px", padding: "1.75rem",
                  position: "relative",
                }}>
                {t.popular && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: t.color, color: "#fff", borderRadius: "20px", padding: "3px 16px", fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                    BELIEBTESTE WAHL
                  </div>
                )}

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={{ width: 46, height: 46, borderRadius: "14px", background: `${t.color}18`, border: `1px solid ${t.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>
                    {t.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: "1rem" }}>{t.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>{t.tagline}</div>
                  </div>
                </div>

                {/* Price */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
                    <span style={{ fontWeight: 900, fontSize: "2.2rem", color: t.color, letterSpacing: "-0.03em" }}>{t.price}€</span>
                    <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>/ Monat</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#2ECC8A", fontWeight: 700, marginTop: "0.25rem" }}>
                    ✓ {t.trial}
                  </div>
                </div>

                {/* Features */}
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {t.features.map(f => (
                    <li key={f.text} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", fontSize: "0.82rem", color: f.included ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.2)" }}>
                      <span style={{ color: f.included ? t.color : "rgba(255,255,255,0.15)", fontWeight: 700, flexShrink: 0, marginTop: "1px" }}>
                        {f.included ? "✓" : "–"}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div style={{ textAlign: "center", padding: "0.75rem", background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: "12px", fontSize: "0.8rem", color: "#2ECC8A", fontWeight: 700 }}>
                    ✓ Dein aktuelles Paket
                  </div>
                ) : isSaved ? (
                  <div style={{ textAlign: "center", padding: "0.75rem", background: "rgba(46,204,138,0.1)", borderRadius: "12px", fontSize: "0.8rem", color: "#2ECC8A", fontWeight: 700 }}>
                    ✅ Gespeichert!
                  </div>
                ) : (
                  <button onClick={() => chooseTier(t.id)} disabled={!!saving} className="choose-btn"
                    style={{
                      width: "100%",
                      background: t.popular ? `linear-gradient(135deg, ${t.color}, ${t.color}bb)` : `${t.color}18`,
                      color: t.popular ? "#000" : t.color,
                      border: `1.5px solid ${t.color}50`,
                      borderRadius: "12px", padding: "0.85rem",
                      fontWeight: 800, fontSize: "0.88rem",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.6 : 1,
                      transition: "filter 0.15s",
                    }}>
                    {isSaving ? "Wird aktiviert…" : `${t.name} starten →`}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Trust bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", justifyContent: "center", marginBottom: "3.5rem" }}>
          {[
            { emoji: "🔒", text: "Keine Kreditkarte nötig zum Start" },
            { emoji: "↩️", text: "Jederzeit kündbar" },
            { emoji: "📬", text: "Kein Spam, kein Kleingedrucktes" },
            { emoji: "✅", text: "14 Tage komplett kostenlos" },
          ].map(item => (
            <div key={item.text} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>
              <span>{item.emoji}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontWeight: 900, fontSize: "1.25rem", marginBottom: "1.25rem", textAlign: "center" }}>
            Häufige Fragen
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {FAQ.map((item, i) => (
              <div key={i} className="faq-item"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "14px", padding: "1rem 1.25rem",
                  cursor: "pointer", transition: "background 0.15s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{item.q}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0, transition: "transform 0.2s", transform: openFaq === i ? "rotate(180deg)" : "none" }}>▾</span>
                </div>
                {openFaq === i && (
                  <div style={{ marginTop: "0.75rem", fontSize: "0.83rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.65, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem" }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA — soft */}
        <div style={{ textAlign: "center", padding: "2rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px" }}>
          <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem" }}>
            Noch unsicher?
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: "1.25rem", color: "rgba(255,255,255,0.75)" }}>
            Schau dir erstmal die Produkte-Seite an — du siehst was möglich ist, bevor du dich festlegst.
          </div>
          <Link href="/partner-dashboard/products"
            style={{ display: "inline-block", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: "12px", padding: "0.75rem 1.5rem", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}>
            Produkte ansehen →
          </Link>
        </div>

      </div>
    </div>
  )
}
