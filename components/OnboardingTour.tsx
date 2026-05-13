"use client"
import { useState, useEffect } from "react"

export interface TourStep {
  emoji: string
  title: string
  desc: string
}

interface Props {
  tourKey: string   // unique per page, stored in localStorage as "true-tour-{key}"
  steps: TourStep[]
}

export default function OnboardingTour({ tourKey, steps }: Props) {
  const [step, setStep]       = useState(0)
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    try {
      const done = localStorage.getItem(`true-tour-${tourKey}`)
      if (!done) setVisible(true)
    } catch {}
  }, [tourKey])

  function finish() {
    try { localStorage.setItem(`true-tour-${tourKey}`, "1") } catch {}
    setVisible(false)
  }

  function next() {
    if (step >= steps.length - 1) { finish(); return }
    setAnimating(true)
    setTimeout(() => { setStep(s => s + 1); setAnimating(false) }, 160)
  }

  if (!visible) return null

  const current = steps[step]
  const isLast  = step === steps.length - 1

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, pointerEvents: "none" }}>

      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(3px)", pointerEvents: "auto" }}
        onClick={finish}
      />

      {/* Tour card */}
      <div
        style={{
          position: "absolute", bottom: "88px", left: "50%",
          width: "calc(100% - 32px)", maxWidth: 440,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "22px",
          padding: "22px 22px 18px",
          boxShadow: "0 12px 48px rgba(0,0,0,0.45)",
          pointerEvents: "auto",
          opacity: animating ? 0 : 1,
          transform: animating ? "translateX(-50%) translateY(8px)" : "translateX(-50%) translateY(0)",
          transition: "opacity 0.16s ease, transform 0.16s ease",
        }}
      >
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 16 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                height: 5, borderRadius: 3,
                width: i === step ? 22 : 5,
                background: i === step ? "var(--accent)" : "var(--border)",
                transition: "width 0.25s, background 0.25s",
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: 10, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.2))" }}>
            {current.emoji}
          </div>
          <h3 style={{ margin: "0 0 8px", fontWeight: 900, fontSize: "1.1rem", color: "var(--text)" }}>
            {current.title}
          </h3>
          <p style={{ margin: "0 0 20px", fontSize: "0.88rem", color: "var(--text-dim)", lineHeight: 1.65 }}>
            {current.desc}
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={finish}
            style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--text-dim)", fontSize: "0.8rem", cursor: "pointer", flexShrink: 0 }}
          >
            Überspringen
          </button>
          <button
            onClick={next}
            style={{ flex: 1, background: "var(--accent)", color: "#000", border: "none", borderRadius: 12, padding: "11px", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" }}
          >
            {isLast ? "Los geht's! 🚀" : "Weiter →"}
          </button>
        </div>

        {/* Step counter */}
        <div style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 10 }}>
          {step + 1} von {steps.length}
        </div>
      </div>
    </div>
  )
}
