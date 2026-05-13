"use client"
import { useEffect, useState } from "react"

// ✅ Sobald TRUE im App Store ist, hier die ID eintragen (nur die Zahl):
// Beispiel: const APP_STORE_ID = "123456789"
const APP_STORE_ID = "" //← hier eintragen
const APP_STORE_URL = APP_STORE_ID
  ? `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`
  : null

const KEYWORDS: Record<number, string[]> = {
  5: ["Einfach bedienbar", "Sehr informativ", "Täglich nützlich", "Tolle Alternativen", "Übersichtlich", "Lebensverändernd"],
  4: ["Sehr hilfreich", "Gut durchdacht", "Praktisch", "Übersichtlich", "Informativ"],
  3: ["Okay", "Solide", "Verbesserungspotenzial", "Guter Ansatz"],
  2: ["Zu wenig Produkte", "Braucht Updates", "Manchmal fehlerhaft"],
  1: ["Hat nicht funktioniert", "Zu viele Bugs", "Nicht wie erwartet"],
}

export default function RatingBlock() {
  const [show, setShow]               = useState(false)
  const [stars, setStars]             = useState(0)
  const [hover, setHover]             = useState(0)
  const [selected, setSelected]       = useState<string[]>([])
  const [customKw, setCustomKw]       = useState("")
  const [text, setText]               = useState("")
  const [generating, setGenerating]   = useState(false)
  const [copied, setCopied]           = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("true_first_open")) {
      localStorage.setItem("true_first_open", String(Date.now()))
    }
    if (localStorage.getItem("true_rated") || localStorage.getItem("true_rating_dismissed")) return
    const first = parseInt(localStorage.getItem("true_first_open") ?? "0")
    if (Date.now() - first >= 7 * 24 * 60 * 60 * 1000) setShow(true)
  }, [])

  async function generate(s: number, kws: string[]) {
    setGenerating(true)
    setText("")
    try {
      const res = await fetch("/api/review-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: s, keywords: kws }),
      })
      const data = await res.json()
      setText(data.text ?? "")
    } catch { setText("") }
    setGenerating(false)
  }

  function handleStar(s: number) {
    setStars(s)
    setSelected([])
    setText("")
  }

  function toggleKeyword(kw: string) {
    const next = selected.includes(kw) ? selected.filter(k => k !== kw) : [...selected, kw]
    setSelected(next)
  }

  function addCustom() {
    const kw = customKw.trim()
    if (!kw || selected.includes(kw)) { setCustomKw(""); return }
    setSelected(p => [...p, kw])
    setCustomKw("")
  }

  function handleGenerate() { generate(stars, selected) }

  function copyText() {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    localStorage.setItem("true_rated", "1")
    setTimeout(() => {
      setCopied(false)
      if (APP_STORE_URL) window.open(APP_STORE_URL, "_blank")
    }, 800)
  }

  function dismiss() {
    localStorage.setItem("true_rating_dismissed", "1")
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "20px",
      padding: "1.25rem",
      marginBottom: "1.75rem",
      position: "relative",
    }}>
      {/* Dismiss */}
      <button onClick={dismiss} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "var(--text-dim)", fontSize: "1rem", cursor: "pointer", lineHeight: 1 }}>✕</button>

      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
        ⭐ Kurze Frage
      </div>
      <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.25rem" }}>
        Wie findest du TRUE bisher?
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "1rem" }}>
        Hilf uns zu wachsen — dauert 30 Sekunden.
      </div>

      {/* Stars */}
      <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s}
            onClick={() => handleStar(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            style={{
              fontSize: "1.8rem", background: "none", border: "none",
              cursor: "pointer", padding: 0, lineHeight: 1,
              transition: "transform 0.12s",
              transform: hover >= s || stars >= s ? "scale(1.15)" : "scale(1)",
              filter: hover >= s || stars >= s ? "none" : "grayscale(1) opacity(0.35)",
            }}>⭐</button>
        ))}
      </div>

      {/* Keywords */}
      {stars > 0 && (
        <>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "0.6rem" }}>
            Was hat dich überzeugt? (optional)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
            {(KEYWORDS[stars] ?? []).map(kw => (
              <button key={kw} onClick={() => toggleKeyword(kw)} style={{
                background: selected.includes(kw) ? "rgba(46,204,138,0.15)" : "var(--background)",
                border: `1px solid ${selected.includes(kw) ? "rgba(46,204,138,0.5)" : "var(--border)"}`,
                color: selected.includes(kw) ? "var(--accent)" : "var(--text-dim)",
                borderRadius: "99px", padding: "4px 12px", fontSize: "0.72rem",
                fontWeight: selected.includes(kw) ? 700 : 500, cursor: "pointer",
              }}>{kw}</button>
            ))}
          </div>

          {/* Custom keyword input */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.9rem" }}>
            <input
              value={customKw}
              onChange={e => setCustomKw(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustom()}
              placeholder="Eigenes Stichwort..."
              style={{
                flex: 1, background: "var(--background)", border: "1px solid var(--border)",
                borderRadius: "10px", padding: "6px 12px", fontSize: "0.78rem",
                color: "var(--text)", outline: "none",
              }}
            />
            <button onClick={addCustom} style={{
              background: "var(--accent)", color: "#000", border: "none",
              borderRadius: "10px", padding: "6px 14px", fontWeight: 800,
              fontSize: "0.75rem", cursor: "pointer",
            }}>+</button>
          </div>

          {/* Generate button */}
          {!text && (
            <button onClick={handleGenerate} disabled={generating} style={{
              width: "100%", background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)",
              color: "#000", border: "none", borderRadius: "12px",
              padding: "0.75rem", fontWeight: 900, fontSize: "0.88rem",
              cursor: generating ? "wait" : "pointer", opacity: generating ? 0.7 : 1,
            }}>
              {generating ? "✨ Wird generiert…" : "✨ Bewertungstext generieren"}
            </button>
          )}

          {/* Generated text */}
          {text && (
            <div style={{ marginTop: "0.25rem" }}>
              <div style={{
                background: "var(--background)", border: "1px solid var(--border)",
                borderRadius: "12px", padding: "0.9rem", fontSize: "0.83rem",
                lineHeight: 1.65, color: "var(--text)", marginBottom: "0.65rem",
              }}>
                {text}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={handleGenerate} disabled={generating} style={{
                  flex: 1, background: "var(--background)", border: "1px solid var(--border)",
                  color: "var(--text-dim)", borderRadius: "10px", padding: "0.6rem",
                  fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                }}>
                  🔄 Neu generieren
                </button>
                <button onClick={copyText} style={{
                  flex: 2, background: copied ? "rgba(46,204,138,0.15)" : "linear-gradient(135deg,#2ECC8A,#1aaa6e)",
                  color: copied ? "var(--accent)" : "#000", border: copied ? "1px solid rgba(46,204,138,0.4)" : "none",
                  borderRadius: "10px", padding: "0.6rem",
                  fontSize: "0.8rem", fontWeight: 900, cursor: "pointer",
                }}>
                  {copied ? "✓ Kopiert!" : APP_STORE_URL ? "📋 Kopieren & App Store öffnen" : "📋 Text kopieren"}
                </button>
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", textAlign: "center", marginTop: "0.5rem" }}>
                {APP_STORE_URL
                  ? "Text wird kopiert → App Store öffnet sich → einfügen & absenden"
                  : "Text kopieren → App Store öffnen → einfügen"}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
