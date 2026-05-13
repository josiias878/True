"use client"
import React, { useEffect, useState, useCallback } from "react"

// ─── Tour steps ─────────────────────────────────────────────────────────────
// Each step corresponds to a section the user scrolls through.
// scrollY = approximate scroll position that triggers this step (0 = on load)
const TOUR_STEPS = [
  {
    emoji: "📷",
    title: "Produkt scannen",
    text: "Tippe auf den grünen Button — richte deine Kamera auf jeden Barcode.",
    accent: "#2ECC8A",
    arrow: "↓",        // visual hint to look down
    scrollY: 0,
  },
  {
    emoji: "⚠️",
    title: "Problemprodukte",
    text: "Tippe auf ein Produkt im Karussell, um alle Fakten und gesundheitliche Risiken zu sehen.",
    accent: "#ff7700",
    arrow: "↓",
    scrollY: 320,
  },
  {
    emoji: "📰",
    title: "Aktuelle Fakten",
    text: "Die zwei Ticker oben zeigen live Konzern-Skandale. Tippe für Details.",
    accent: "#44aaff",
    arrow: "↑",
    scrollY: 600,
  },
  {
    emoji: "🌍",
    title: "Weltkarte",
    text: "Scrolle weiter — die interaktive Karte zeigt dokumentierte Umweltschäden weltweit.",
    accent: "#ff6633",
    arrow: "↓",
    scrollY: 900,
  },
]

export default function DashboardTour() {
  const [step, setStep]         = useState(0)
  const [visible, setVisible]   = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [animOut, setAnimOut]   = useState(false)

  useEffect(() => {
    if (localStorage.getItem("true-tour-v2-done")) return
    // Show first bubble after 1.2 seconds
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [])

  // Scroll listener — advance step automatically when user scrolls past thresholds
  useEffect(() => {
    if (!visible || dismissed) return
    const handleScroll = () => {
      const y = window.scrollY
      // Find the highest step whose scrollY threshold has been passed
      for (let i = TOUR_STEPS.length - 1; i >= 0; i--) {
        if (y >= TOUR_STEPS[i].scrollY) {
          if (i !== step) {
            setAnimOut(true)
            setTimeout(() => { setStep(i); setAnimOut(false) }, 200)
          }
          break
        }
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [visible, dismissed, step])

  const finish = useCallback(() => {
    setAnimOut(true)
    setTimeout(() => {
      setDismissed(true)
      setVisible(false)
      localStorage.setItem("true-tour-v2-done", "1")
    }, 220)
  }, [])

  const next = useCallback(() => {
    if (step >= TOUR_STEPS.length - 1) {
      finish()
    } else {
      setAnimOut(true)
      setTimeout(() => { setStep(s => s + 1); setAnimOut(false) }, 200)
    }
  }, [step, finish])

  if (!visible || dismissed) return null

  const s = TOUR_STEPS[step]

  return (
    <>
      {/* ── Floating speech bubble — NO dark overlay ── */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 400,
          width: "calc(100% - 2rem)",
          maxWidth: "400px",
          opacity: animOut ? 0 : 1,
          transition: "opacity 0.2s ease, transform 0.2s ease",
          pointerEvents: "auto",
        }}
      >
        {/* Tail / speech pointer */}
        <div style={{
          position: "absolute",
          bottom: "-8px",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: `10px solid ${s.accent}`,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
        }} />

        {/* Card */}
        <div style={{
          background: "var(--surface)",
          borderRadius: "18px",
          border: `1.5px solid ${s.accent}`,
          boxShadow: `0 8px 40px rgba(0,0,0,0.35), 0 0 0 1px ${s.accent}22`,
          padding: "1rem 1.1rem 0.85rem",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Accent top bar */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
            background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)`,
          }} />

          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.5rem" }}>
            <div style={{
              width: 38, height: 38, borderRadius: "12px", flexShrink: 0,
              background: s.accent + "20", border: `1px solid ${s.accent}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.2rem",
            }}>
              {s.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: s.accent, lineHeight: 1.2 }}>
                {s.title}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.45, marginTop: "0.2rem" }}>
                {s.text}
              </div>
            </div>
          </div>

          {/* Footer: dots + buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Step dots */}
            <div style={{ display: "flex", gap: "0.3rem", flex: 1 }}>
              {TOUR_STEPS.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? "16px" : "5px",
                  height: "4px",
                  borderRadius: "2px",
                  background: i <= step ? s.accent : "var(--border)",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>
            <button
              onClick={finish}
              style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.72rem", padding: "0.3rem 0.4rem", whiteSpace: "nowrap" }}
            >
              Überspringen
            </button>
            <button
              onClick={next}
              style={{
                background: s.accent, color: "#000",
                border: "none", borderRadius: "10px",
                padding: "0.45rem 1rem",
                fontWeight: 800, cursor: "pointer", fontSize: "0.8rem",
                whiteSpace: "nowrap",
              }}
            >
              {step < TOUR_STEPS.length - 1 ? "Weiter →" : "Los! ✓"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
