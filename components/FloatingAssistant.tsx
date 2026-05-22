"use client"
import React, { useEffect, useState, useRef } from "react"

interface Tip { icon: string; text: string }

interface FloatingAssistantProps {
  page: string
  tips: Tip[]
}

const DISMISSED_KEY = "true-assistant-dismissed"

export default function FloatingAssistant({ page, tips }: FloatingAssistantProps) {
  const [open, setOpen]       = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [tipIndex, setTipIndex]   = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]")
      if (!stored.includes(page)) setDismissed(false)
    } catch { setDismissed(false) }
  }, [page])

  // Close when tapping outside
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handle)
    document.addEventListener("touchstart", handle)
    return () => {
      document.removeEventListener("mousedown", handle)
      document.removeEventListener("touchstart", handle)
    }
  }, [open])

  function dismiss() {
    setDismissed(true)
    setOpen(false)
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]")
      if (!stored.includes(page))
        localStorage.setItem(DISMISSED_KEY, JSON.stringify([...stored, page]))
    } catch {}
  }

  function handleNext() {
    if (tipIndex >= tips.length - 1) {
      // Last tip reached → auto-dismiss
      dismiss()
    } else {
      setTipIndex(i => i + 1)
    }
  }

  if (dismissed || tips.length === 0) return null

  const tip = tips[tipIndex]
  const isLast = tipIndex >= tips.length - 1

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        bottom: 80,
        left: 16,          // ← left side, not right
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      {/* Tip panel */}
      {open && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "14px 14px 12px",
          width: 240,
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
          animation: "fadeIn 0.18s ease",
          position: "relative",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em" }}>
              💡 TIPP {tipIndex + 1}/{tips.length}
            </span>
            <button
              onClick={dismiss}
              title="Ausblenden"
              style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.72rem", padding: "2px 6px", borderRadius: 6, opacity: 0.7 }}
            >
              Nicht mehr anzeigen
            </button>
          </div>

          {/* Tip content */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
            <span style={{ fontSize: "1.3rem", flexShrink: 0, lineHeight: 1 }}>{tip.icon}</span>
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.55, margin: 0 }}>{tip.text}</p>
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", gap: 6 }}>
            {tipIndex > 0 && (
              <button
                onClick={() => setTipIndex(i => i - 1)}
                style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px", fontSize: "0.75rem", color: "var(--text-dim)", cursor: "pointer" }}
              >
                ← Zurück
              </button>
            )}
            <button
              onClick={handleNext}
              style={{ flex: 1, background: isLast ? "rgba(46,204,138,0.15)" : "var(--accent)", border: isLast ? "1px solid var(--accent)" : "none", borderRadius: 8, padding: "6px", fontSize: "0.75rem", color: isLast ? "var(--accent)" : "#000", fontWeight: 700, cursor: "pointer" }}
            >
              {isLast ? "✓ Verstanden" : "Weiter →"}
            </button>
          </div>

          {/* Caret pointing down-left to the bubble */}
          <div style={{ position: "absolute", bottom: -8, left: 18, width: 16, height: 8, overflow: "hidden" }}>
            <div style={{ width: 12, height: 12, background: "var(--surface)", border: "1px solid var(--border)", transform: "rotate(45deg)", marginTop: -6, marginLeft: 2 }} />
          </div>
        </div>
      )}

      {/* Bubble button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: 46, height: 46, borderRadius: "50%",
          background: open ? "var(--accent)" : "var(--surface)",
          border: `2px solid ${open ? "var(--accent)" : "var(--border)"}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.3rem", transition: "all 0.18s", position: "relative",
        }}
        aria-label="Hilfe-Tipps"
      >
        {open ? "✕" : "💬"}
        {!open && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            width: 9, height: 9, background: "var(--accent)",
            borderRadius: "50%", border: "2px solid var(--background)",
          }} />
        )}
      </button>
    </div>
  )
}
