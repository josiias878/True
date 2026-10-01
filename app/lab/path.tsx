"use client"
// ── „Dein Weg“: Stationen von heute und den nächsten Tagen als kurvige Strecke ──
import React, { useEffect, useRef, useState } from "react"
import { addDays, fmtDate } from "@/lib/supplementLab"
import type { Stop } from "@/lib/labPath"
import { t } from "@/lib/labI18n"

type Point = { kind: "day"; label: string; key: string } | { kind: "stop"; stop: Stop; key: string }

const NODE = 50
const ROW = 74
const DAY_ROW = 42

function dayLabel(date: string, today: string) {
  if (date === today) return t("Heute")
  if (date === addDays(today, 1)) return t("Morgen")
  return fmtDate(date)
}

export function RoadPath({ stops, goal, today, onStop }: { stops: Stop[]; goal: Stop | null; today: string; onStop: (s: Stop) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(340)
  const [popped, setPopped] = useState<string | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth || 340))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Punkte: Tages-Schilder + Stationen + Ziel
  const pts: Point[] = []
  let lastDate = ""
  for (const st of stops) {
    if (st.date !== lastDate) { pts.push({ kind: "day", label: dayLabel(st.date, today), key: `d-${st.date}` }); lastDate = st.date }
    pts.push({ kind: "stop", stop: st, key: st.key })
  }
  if (goal) pts.push({ kind: "stop", stop: goal, key: "goal" })

  const A = Math.min(64, W * 0.17)
  let y = 0
  let si = 0
  const pos = pts.map(p => {
    const h = p.kind === "day" ? DAY_ROW : ROW
    const cy = y + h / 2
    y += h
    const off = p.kind === "day" ? 0 : A * Math.sin(si++ * 1.05 + 0.6)
    return { x: W / 2 + off, y: cy, off }
  })
  const H = y + 8
  // Fortschritt: bis zur letzten erledigten/aktuellen Station durchgezogen
  let reach = 0
  pts.forEach((p, i) => { if (p.kind === "stop" && p.stop.state !== "future") reach = i })

  return (
    <div ref={ref} style={{ position: "relative", height: H, margin: "4px 0 0" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }} aria-hidden>
        {pos.slice(1).map((b, i) => {
          const a = pos[i]
          const dy = b.y - a.y
          const d = `M${a.x},${a.y} C${a.x},${a.y + dy * 0.55} ${b.x},${b.y - dy * 0.55} ${b.x},${b.y}`
          const solid = i + 1 <= reach
          return (
            <g key={i}>
              <path d={d} fill="none" stroke="var(--surface-2)" strokeWidth={14} strokeLinecap="round" />
              <path d={d} fill="none" stroke={solid ? "var(--accent)" : "var(--border)"} strokeWidth={solid ? 5 : 3} strokeLinecap="round"
                strokeDasharray={solid ? undefined : "1 9"} opacity={solid ? 0.9 : 1} />
            </g>
          )
        })}
      </svg>
      {pts.map((p, i) => {
        const { x, y: cy, off } = pos[i]
        if (p.kind === "day") {
          return (
            <div key={p.key} className="lab-fade" style={{ position: "absolute", left: x, top: cy, transform: "translate(-50%, -50%)", animationDelay: `${i * 40}ms`,
              padding: "4px 12px", borderRadius: 999, background: p.label === t("Heute") ? "var(--accent)" : "var(--surface)", color: p.label === t("Heute") ? "#fff" : "var(--text-dim)",
              border: p.label === t("Heute") ? "none" : "1px solid var(--border)", fontSize: "0.74rem", fontWeight: 900, letterSpacing: ".02em", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}>
              {p.label}
            </div>
          )
        }
        const st = p.stop
        const goalNode = p.key === "goal"
        const size = goalNode ? 58 : NODE
        const labelLeft = off <= 0
        const labelW = labelLeft ? W - (x + size / 2 + 12) - 2 : x - size / 2 - 12 - 2
        const bg = st.state === "future" ? "var(--surface)" : st.color ?? "var(--accent)"
        return (
          <React.Fragment key={p.key}>
            <button className={`lab-press lab-pop ${st.state === "now" ? "lab-pulse" : ""}`} onClick={() => { setPopped(p.key); setTimeout(() => setPopped(null), 400); onStop(st) }}
              aria-label={`${st.title}${st.sub ? `, ${st.sub}` : ""}`} style={{
                position: "absolute", left: x - size / 2, top: cy - size / 2, width: size, height: size, borderRadius: goalNode ? 20 : 999,
                animationDelay: `${i * 45}ms`, padding: 0, fontSize: goalNode ? "1.8rem" : "1.35rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: bg, border: st.state === "future" ? `2.5px dashed ${st.color ? `color-mix(in srgb, ${st.color} 55%, var(--border))` : "var(--border)"}` : "none",
                boxShadow: st.state === "future" ? "none" : `inset 0 -4px 0 rgba(0,0,0,.16), 0 6px 16px color-mix(in srgb, ${bg} 35%, transparent)`,
                filter: st.state === "future" && st.est ? "grayscale(.5)" : undefined,
                transform: popped === p.key ? "scale(1.12)" : undefined, transition: "transform .2s",
              }}>
              <span style={{ opacity: st.state === "future" ? 0.85 : 1 }}>{st.emoji}</span>
              {st.state === "done" && (
                <span style={{ position: "absolute", right: -4, bottom: -4, width: 22, height: 22, borderRadius: 999, background: "var(--accent)", color: "#fff", fontSize: "0.72rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--background)", animation: "labCheck .35s ease" }}>✓</span>
              )}
            </button>
            <div className="lab-fade" onClick={() => onStop(st)} style={{
              position: "absolute", top: cy, transform: "translateY(-50%)", width: Math.max(90, labelW), cursor: "pointer",
              ...(labelLeft ? { left: x + size / 2 + 12, textAlign: "left" as const } : { left: x - size / 2 - 12 - Math.max(90, labelW), textAlign: "right" as const }),
              animationDelay: `${i * 45 + 80}ms`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: labelLeft ? "flex-start" : "flex-end" }}>
                {st.state === "now" && <span style={{ fontSize: "0.62rem", fontWeight: 900, color: "#fff", background: "var(--accent)", padding: "2px 6px", borderRadius: 6, flexShrink: 0 }}>{t("JETZT")}</span>}
                <span style={{ fontWeight: 900, fontSize: "0.88rem", lineHeight: 1.2, color: st.state === "done" ? "var(--text-dim)" : "var(--text)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textDecoration: st.state === "done" && st.kind === "take" ? "line-through" : undefined }}>{st.title}</span>
              </div>
              {st.sub && <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: st.est ? "italic" : undefined }}>{st.sub}</div>}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
