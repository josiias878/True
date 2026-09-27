"use client"
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  DIMS, FACES, addDays, diffDays, fmtDate, todayIso, phaseWindows, daySum, suppColor,
  type Dim, type LabState, type Scores,
} from "@/lib/supplementLab"

const POS = "#1baf7a"
const NEG = "#e34948"
const fmt = (n: number, sign = false) => `${sign && n > 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")}`

function phaseName(s: LabState, kind: string, suppId?: string) {
  if (kind === "baseline") return "Reset"
  if (kind === "washout") return "Pause"
  return s.supps.find(x => x.id === suppId)?.name ?? "Test"
}

// ── Verlauf einer Dimension über das Experiment ────────────────────────────────

export function DimLineChart({ s, dim }: { s: LabState; dim: Dim | "gesamt" }) {
  const wins = phaseWindows(s)
  const wrap = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [width, setWidth] = useState(340)
  const today = todayIso()

  // In echten Pixeln zeichnen, damit Schrift auf dem Handy lesbar bleibt
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const data = useMemo(() => {
    if (!s.startDate || !wins.length) return null
    const lastEnd = wins[wins.length - 1].end
    const endShown = today < lastEnd ? today : lastEnd
    const n = Math.max(1, diffDays(s.startDate, endShown) + 1)
    const points = Array.from({ length: n }, (_, i) => {
      const date = addDays(s.startDate!, i)
      const c = s.checkins[date]
      const v = c ? (dim === "gesamt" ? daySum(c) : (c.scores[dim] ?? null)) : null
      return { i, date, v }
    })
    const base = wins.find(w => w.kind === "baseline")
    const baseVals = base ? points.filter(p => p.date >= base.start && p.date <= base.end && p.v != null).map(p => p.v!) : []
    const baseAvg = baseVals.length ? baseVals.reduce((a, b) => a + b, 0) / baseVals.length : null
    return { n, points, baseAvg }
  }, [s, dim, wins, today])

  if (!data) return null
  const W = width, H = 220, L = 30, R = 8, T = 30, B = 24
  const iw = W - L - R, ih = H - T - B
  const step = data.n > 1 ? iw / (data.n - 1) : iw
  const x = (i: number) => L + (data.n > 1 ? i * step : iw / 2)
  const y = (v: number) => T + ih - ((v - 1) / 4) * ih
  const bandX = (i: number) => Math.max(L, x(i) - step / 2)

  // Linien-Segmente (Lücken bei fehlenden Check-ins)
  const segs: string[] = []
  let cur = ""
  data.points.forEach(p => {
    if (p.v == null) { if (cur) segs.push(cur); cur = ""; return }
    cur += `${cur ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`
  })
  if (cur) segs.push(cur)

  const onMove = (e: React.PointerEvent) => {
    const r = wrap.current?.getBoundingClientRect()
    if (!r) return
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round((px - L) / (step || 1))
    setHover(Math.max(0, Math.min(data.n - 1, i)))
  }
  const hp = hover != null ? data.points[hover] : null
  const hw = hp ? wins.find(w => hp.date >= w.start && hp.date <= w.end) : null

  return (
    <div ref={wrap} style={{ position: "relative", touchAction: "pan-y" }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", overflow: "visible" }} role="img"
        aria-label={`Verlauf ${dim === "gesamt" ? "Gesamtgefühl" : DIMS.find(d => d.id === dim)?.label} über ${data.n} Tage`}>
        {/* Phasen-Bänder */}
        {wins.map(w => {
          const i0 = diffDays(s.startDate!, w.start)
          const i1 = Math.min(diffDays(s.startDate!, w.end), data.n - 1)
          if (i0 > data.n - 1) return null
          const x0 = bandX(i0), x1 = Math.min(W - R, x(i1) + step / 2)
          const col = w.kind === "test" ? suppColor(s.supps.find(q => q.id === w.suppId)) : "var(--text-dim)"
          const emoji = w.kind === "baseline" ? "🧘" : w.kind === "washout" ? "💧" : s.supps.find(q => q.id === w.suppId)?.emoji
          return (
            <g key={w.id}>
              <rect x={x0} y={T} width={Math.max(0, x1 - x0 - 2)} height={ih} rx={6}
                fill={col} opacity={w.kind === "test" ? 0.12 : 0.05} />
              <rect x={x0} y={T - 6} width={Math.max(0, x1 - x0 - 2)} height={3} rx={1.5} fill={col} opacity={w.kind === "test" ? 0.9 : 0.35} />
              {x1 - x0 > 22 && <text x={(x0 + x1) / 2} y={T - 12} textAnchor="middle" fontSize="13">{emoji}</text>}
            </g>
          )
        })}
        {/* Gitter */}
        {[1, 2, 3, 4, 5].map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="13">{FACES[v - 1]}</text>
          </g>
        ))}
        {/* Baseline-Durchschnitt */}
        {data.baseAvg != null && (
          <g>
            <line x1={L} x2={W - R} y1={y(data.baseAvg)} y2={y(data.baseAvg)} stroke="var(--text-dim)" strokeWidth={1.5} opacity={0.7} />
            <rect x={W - R - 76} y={y(data.baseAvg) - 9} width={76} height={18} rx={9} fill="var(--surface-2)" stroke="var(--border)" />
            <text x={W - R - 38} y={y(data.baseAvg) + 4} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--text-dim)">Ø Reset {fmt(data.baseAvg)}</text>
          </g>
        )}
        {/* Linie + Punkte */}
        {segs.map((d, k) => <path key={k} d={d} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />)}
        {data.points.map(p => p.v != null && (
          <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={hover === p.i ? 6 : 4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
        ))}
        {/* X-Achse: Starttag + heute */}
        <text x={L} y={H - 6} fontSize="11" fill="var(--text-dim)">Tag 1</text>
        <text x={W - R} y={H - 6} fontSize="11" fill="var(--text-dim)" textAnchor="end">Tag {data.n}</text>
        {/* Crosshair */}
        {hp && <line x1={x(hp.i)} x2={x(hp.i)} y1={T} y2={T + ih} stroke="var(--text-dim)" strokeWidth={1} opacity={0.6} />}
      </svg>
      {hp && (
        <div style={{
          position: "absolute", top: 0, pointerEvents: "none",
          left: `${(x(hp.i) / W) * 100}%`, transform: `translateX(${hp.i > data.n / 2 ? "-105%" : "5%"})`,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 10px",
          boxShadow: "var(--shadow)", fontSize: "0.78rem", whiteSpace: "nowrap", zIndex: 2,
        }}>
          <div style={{ fontWeight: 800 }}>Tag {hp.i + 1} · {fmtDate(hp.date)}</div>
          <div style={{ color: "var(--text-dim)" }}>{hw ? phaseName(s, hw.kind, hw.suppId) : "—"}</div>
          <div style={{ fontWeight: 800, marginTop: 2 }}>{hp.v != null ? `${FACES[Math.round(hp.v) - 1]} ${fmt(hp.v)} / 5` : "kein Check-in"}</div>
        </div>
      )}
    </div>
  )
}

// ── Vergleich Test vs. Reset (divergierende Balken) ─────────────────────────────

export function DeltaBars({ delta, avg, base, dims }: { delta: Scores; avg: Scores; base: Scores; dims: Dim[] }) {
  const [open, setOpen] = useState<Dim | null>(null)
  const MAX = 2
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {DIMS.filter(d => dims.includes(d.id)).map(d => {
        const v = delta[d.id] ?? 0
        const w = Math.min(1, Math.abs(v) / MAX) * 50
        const tiny = Math.abs(v) < 0.25
        return (
          <div key={d.id} onPointerEnter={() => setOpen(d.id)} onPointerLeave={() => setOpen(null)} onClick={() => setOpen(o => o === d.id ? null : d.id)}
            style={{ cursor: "default" }}>
            <div style={{ display: "grid", gridTemplateColumns: "104px 1fr 54px", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap" }}>{d.emoji} {d.label}</div>
              <div style={{ position: "relative", height: 18, background: "var(--surface-2)", borderRadius: 6 }}>
                <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: "var(--text-dim)", opacity: 0.5 }} />
                <div style={{
                  position: "absolute", top: 3, bottom: 3,
                  left: v >= 0 ? "50%" : `${50 - w}%`, width: `${Math.max(w, 0.8)}%`,
                  background: tiny ? "var(--text-dim)" : v >= 0 ? POS : NEG, opacity: tiny ? 0.4 : 1,
                  borderRadius: v >= 0 ? "0 4px 4px 0" : "4px 0 0 4px",
                  transition: "width .6s cubic-bezier(.2,.9,.3,1), left .6s cubic-bezier(.2,.9,.3,1)",
                }} />
              </div>
              <div style={{ fontSize: "0.8rem", fontWeight: 800, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {v > 0.05 ? "↑" : v < -0.05 ? "↓" : "·"} {fmt(v, true)}
              </div>
            </div>
            {open === d.id && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", margin: "2px 0 2px 112px" }}>
                Reset Ø {fmt(base[d.id] ?? 0)} → Test Ø {fmt(avg[d.id] ?? 0)}
              </div>
            )}
          </div>
        )
      })}
      <div style={{ display: "grid", gridTemplateColumns: "104px 1fr 54px", gap: 8, fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 2 }}>
        <span />
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>← schlechter</span><span>besser →</span></div>
        <span style={{ textAlign: "right" }}>vs. Reset</span>
      </div>
    </div>
  )
}

// ── Stimmungs-Kalender: jeder Tag ein Gesicht ──────────────────────────────────

export function MoodCalendar({ s, onPick }: { s: LabState; onPick?: (date: string) => void }) {
  const wins = phaseWindows(s)
  if (!s.startDate || !wins.length) return null
  const lastEnd = wins[wins.length - 1].end
  const n = diffDays(s.startDate, lastEnd) + 1
  const today = todayIso()
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
      {Array.from({ length: n }, (_, i) => {
        const date = addDays(s.startDate!, i)
        const c = s.checkins[date]
        const w = wins.find(x => date >= x.start && date <= x.end)
        const col = w?.kind === "test" ? suppColor(s.supps.find(q => q.id === w.suppId)) : w?.kind === "baseline" ? "var(--text-dim)" : "var(--border)"
        const future = date > today
        const avg = c ? daySum(c) : null
        return (
          <button key={date} onClick={() => !future && onPick?.(date)} title={`${fmtDate(date)} · ${w ? phaseName(s, w.kind, w.suppId) : ""}${avg ? ` · Ø ${fmt(avg)}` : ""}`}
            className={!future ? "lab-press" : undefined}
            style={{
              aspectRatio: "1", borderRadius: 12, border: date === today ? "2px solid var(--accent)" : "1px solid var(--border)",
              background: w?.kind === "test" ? `color-mix(in srgb, ${col} 14%, var(--surface))` : "var(--surface)",
              opacity: future ? 0.4 : 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.15rem", padding: 0, color: "var(--text-dim)",
            }}>
            <span style={{ position: "absolute", top: 3, left: 6, right: 6, height: 3, borderRadius: 2, background: col, opacity: w?.kind === "washout" ? 0.4 : 0.9 }} />
            {avg != null ? FACES[Math.round(avg) - 1] : <span style={{ fontSize: "0.7rem", fontWeight: 700 }}>{i + 1}</span>}
          </button>
        )
      })}
    </div>
  )
}
