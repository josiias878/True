"use client"
import React, { useEffect, useState } from "react"

interface Toast { id: number; icon: string; label: string }

let listeners: ((t: Toast) => void)[] = []
export function showBadgeToast(icon: string, label: string) {
  const t = { id: Date.now(), icon, label }
  listeners.forEach(l => l(t))
}

export default function BadgeToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const fn = (t: Toast) => {
      setToasts(p => [...p, t])
      setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 3500)
    }
    listeners.push(fn)
    return () => { listeners = listeners.filter(l => l !== fn) }
  }, [])

  if (!toasts.length) return null

  return (
    <div style={{
      position: "fixed", top: "72px", left: "50%", transform: "translateX(-50%)",
      zIndex: 500, display: "flex", flexDirection: "column", gap: "0.5rem",
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: "var(--accent)", color: "#000",
          borderRadius: "20px", padding: "0.6rem 1.25rem",
          display: "flex", alignItems: "center", gap: "0.5rem",
          fontWeight: 700, fontSize: "0.88rem",
          boxShadow: "0 8px 32px rgba(46,204,138,0.4)",
          animation: "slideDown 0.35s ease",
          whiteSpace: "nowrap",
        }}>
          <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>
          Badge freigeschaltet: {t.label} 🎉
        </div>
      ))}
      <style>{`
        @keyframes slideDown { from{transform:translateY(-20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  )
}
