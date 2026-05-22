"use client"
import React, { useEffect, useState } from "react"

interface AppTipProps {
  id: string          // unique key — used for localStorage "dismissed" tracking
  icon: string
  text: string
  color?: string      // accent color for the left border, default green
}

export default function AppTip({ id, icon, text, color = "var(--accent)" }: AppTipProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissed = JSON.parse(localStorage.getItem("true-tips-dismissed") || "[]")
      if (!dismissed.includes(id)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [id])

  function dismiss() {
    setVisible(false)
    try {
      const dismissed = JSON.parse(localStorage.getItem("true-tips-dismissed") || "[]")
      if (!dismissed.includes(id)) {
        localStorage.setItem("true-tips-dismissed", JSON.stringify([...dismissed, id]))
      }
    } catch {}
  }

  if (!visible) return null

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${color}`,
      borderRadius: 12,
      padding: "10px 12px",
      animation: "fadeIn 0.25s ease",
    }}>
      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.5 }}>{text}</span>
      <button
        onClick={dismiss}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-dim)",
          cursor: "pointer",
          fontSize: "1rem",
          lineHeight: 1,
          padding: "2px 4px",
          flexShrink: 0,
          borderRadius: 6,
          opacity: 0.6,
        }}
        aria-label="Tipp schließen"
      >
        ✕
      </button>
    </div>
  )
}
