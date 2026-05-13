"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"

interface RingData {
  scans: number       // today
  avoided: number     // this week
  streak: number      // days in a row
  totalScans: number
  totalAvoided: number
  badges: string[]
  lastScanDate: string
}

const RING_GOALS = { scans: 3, avoided: 5, streak: 7 }

const BADGES = [
  { id: "first_scan",    icon: "🔍", label: "Erster Scan",        req: (d: RingData) => d.totalScans >= 1     },
  { id: "scanner_10",   icon: "📷", label: "10 Scans",            req: (d: RingData) => d.totalScans >= 10    },
  { id: "avoider_5",    icon: "🚫", label: "5× gemieden",         req: (d: RingData) => d.totalAvoided >= 5   },
  { id: "streak_3",     icon: "🔥", label: "3 Tage Streak",       req: (d: RingData) => d.streak >= 3         },
  { id: "streak_7",     icon: "⚡", label: "7 Tage Streak",       req: (d: RingData) => d.streak >= 7         },
  { id: "streak_30",    icon: "💎", label: "30 Tage Streak",      req: (d: RingData) => d.streak >= 30        },
  { id: "avoider_50",   icon: "🌍", label: "Weltverbesserer",     req: (d: RingData) => d.totalAvoided >= 50  },
  { id: "scanner_100",  icon: "🏆", label: "TRUE Profi",          req: (d: RingData) => d.totalScans >= 100   },
]

function Ring({
  value, goal, color, icon, label, size = 64
}: {
  value: number; goal: number; color: string; icon: string; label: string; size?: number
}) {
  const [animated, setAnimated] = useState(0)
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / goal, 1)
  const offset = circ * (1 - animated)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 200)
    return () => clearTimeout(t)
  }, [pct])

  const done = value >= goal

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {/* Track */}
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color + "22"} strokeWidth={6} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={6}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)" }}
          />
        </svg>
        {/* Center */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          fontSize: size > 56 ? "1.3rem" : "1rem",
        }}>
          {done ? <span style={{ fontSize: "1.3rem" }}>✓</span> : <span>{icon}</span>}
        </div>
        {/* Glow when done */}
        {done && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            boxShadow: `0 0 18px ${color}66`,
            animation: "pulseRing 2s ease infinite",
          }} />
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: done ? color : "var(--text)" }}>
          {value}<span style={{ color: "var(--text-dim)", fontWeight: 400 }}>/{goal}</span>
        </div>
        <div style={{ fontSize: "0.6rem", color: "var(--text-dim)", marginTop: "0.05rem" }}>{label}</div>
      </div>
    </div>
  )
}

export function loadRings(): RingData {
  try {
    const raw = localStorage.getItem("true-rings")
    if (raw) return JSON.parse(raw)
  } catch {}
  return { scans: 0, avoided: 0, streak: 0, totalScans: 0, totalAvoided: 0, badges: [], lastScanDate: "" }
}

export function saveRings(data: RingData) {
  localStorage.setItem("true-rings", JSON.stringify(data))
}

export function incrementScan() {
  const d = loadRings()
  const today = new Date().toDateString()
  const newStreak = d.lastScanDate === new Date(Date.now() - 86400000).toDateString()
    ? d.streak + 1
    : d.lastScanDate === today ? d.streak : 1
  const updated = {
    ...d,
    scans: d.lastScanDate === today ? d.scans + 1 : 1,
    totalScans: d.totalScans + 1,
    streak: newStreak,
    lastScanDate: today,
  }
  // Check for new badges
  const newBadges = BADGES
    .filter(b => !updated.badges.includes(b.id) && b.req(updated))
    .map(b => b.id)
  updated.badges = [...updated.badges, ...newBadges]
  saveRings(updated)
  return { data: updated, newBadges }
}

export function incrementAvoided() {
  const d = loadRings()
  const updated = { ...d, avoided: d.avoided + 1, totalAvoided: d.totalAvoided + 1 }
  const newBadges = BADGES
    .filter(b => !updated.badges.includes(b.id) && b.req(updated))
    .map(b => b.id)
  updated.badges = [...updated.badges, ...newBadges]
  saveRings(updated)
  return { data: updated, newBadges }
}

export default function Rings() {
  const [data, setData] = useState<RingData | null>(null)
  const [showBadges, setShowBadges] = useState(false)

  useEffect(() => { setData(loadRings()) }, [])

  if (!data) return null

  const earnedBadges = BADGES.filter(b => data.badges.includes(b.id))
  const nextBadge = BADGES.find(b => !data.badges.includes(b.id))

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "18px", padding: "1.25rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.1rem" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>Meine Ringe</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Heute · Diese Woche · Streak</div>
        </div>
        <button onClick={() => setShowBadges(s => !s)} style={{
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderRadius: "8px", padding: "0.3rem 0.75rem",
          fontSize: "0.72rem", color: "var(--text-dim)", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.35rem",
        }}>
          🏅 {earnedBadges.length} Badges
        </button>
      </div>

      {/* Rings row */}
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "1rem" }}>
        <Ring value={data.scans}   goal={RING_GOALS.scans}   color="#2ECC8A" icon="📷" label="Scans heute" />
        <Ring value={data.avoided} goal={RING_GOALS.avoided} color="#ff4455" icon="🚫" label="Gemieden" />
        <Ring value={data.streak}  goal={RING_GOALS.streak}  color="#ffaa00" icon="🔥" label="Streak" />
      </div>

      {/* Next badge hint */}
      {nextBadge && (
        <div style={{
          background: "var(--surface-2)", borderRadius: "10px",
          padding: "0.6rem 0.85rem", fontSize: "0.75rem",
          color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <span style={{ fontSize: "1rem" }}>{nextBadge.icon}</span>
          <span>Nächstes Badge: <strong style={{ color: "var(--text)" }}>{nextBadge.label}</strong></span>
        </div>
      )}

      {/* Badges panel */}
      {showBadges && (
        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
            FREIGESCHALTET
          </div>
          {earnedBadges.length === 0 ? (
            <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", textAlign: "center", padding: "0.75rem" }}>
              Noch keine Badges — scanne dein erstes Produkt! 📷
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {earnedBadges.map(b => (
                <div key={b.id} style={{
                  background: "var(--accent-dim)", border: "1px solid var(--accent)",
                  borderRadius: "20px", padding: "0.3rem 0.75rem",
                  fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem",
                  color: "var(--accent)", fontWeight: 600,
                }}>
                  {b.icon} {b.label}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
              NOCH ZU VERDIENEN
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {BADGES.filter(b => !data.badges.includes(b.id)).map(b => (
                <div key={b.id} style={{
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: "20px", padding: "0.3rem 0.75rem",
                  fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem",
                  color: "var(--text-dim)", opacity: 0.6,
                }}>
                  {b.icon} {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseRing { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
      `}</style>
    </div>
  )
}
