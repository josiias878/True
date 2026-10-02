"use client"
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  DIMS, FACES, SIDE_BY_ID, addDays, diffDays, fmtDate, todayIso, phaseWindows, daySum, suppColor, testResult, signal,
  type Dim, type LabState, type Scores,
} from "@/lib/supplementLab"
import { t, dec } from "@/lib/labI18n"

const POS = "#1baf7a"
const NEG = "#e34948"
const fmt = (n: number, sign = false) => `${sign && n > 0 ? "+" : ""}${dec(n, 1)}`

function phaseName(s: LabState, kind: string, suppId?: string) {
  if (kind === "baseline") return t("Reset")
  if (kind === "washout") return t("Pause")
  if (kind === "stack") return t("Stack")
  if (kind === "check") return t("Ohne {name}", { name: s.supps.find(x => x.id === suppId)?.name ?? "?" })
  return s.supps.find(x => x.id === suppId)?.name ?? t("Test")
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
        aria-label={t("Verlauf {what} über {n} Tage", { what: dim === "gesamt" ? t("Gesamtgefühl") : String(DIMS.find(d => d.id === dim)?.label), n: data.n })}>
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
            <text x={W - R - 38} y={y(data.baseAvg) + 4} textAnchor="middle" fontSize="11" fontWeight={700} fill="var(--text-dim)">{t("Ø Reset {v}", { v: fmt(data.baseAvg) })}</text>
          </g>
        )}
        {/* Linie + Punkte */}
        {segs.map((d, k) => <path key={k} d={d} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />)}
        {data.points.map(p => p.v != null && (
          <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={hover === p.i ? 6 : 4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
        ))}
        {/* X-Achse: Starttag + heute */}
        <text x={L} y={H - 6} fontSize="11" fill="var(--text-dim)">{t("Tag {n}", { n: 1 })}</text>
        <text x={W - R} y={H - 6} fontSize="11" fill="var(--text-dim)" textAnchor="end">{t("Tag {n}", { n: data.n })}</text>
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
          <div style={{ fontWeight: 800 }}>{t("Tag {n}", { n: hp.i + 1 })} · {fmtDate(hp.date)}</div>
          <div style={{ color: "var(--text-dim)" }}>{hw ? phaseName(s, hw.kind, hw.suppId) : "—"}</div>
          <div style={{ fontWeight: 800, marginTop: 2 }}>{hp.v != null ? `${FACES[Math.round(hp.v) - 1]} ${fmt(hp.v)} / 5` : t("kein Check-in")}</div>
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
                {t("Reset Ø {a} → Test Ø {b}", { a: fmt(base[d.id] ?? 0), b: fmt(avg[d.id] ?? 0) })}
              </div>
            )}
          </div>
        )
      })}
      <div style={{ display: "grid", gridTemplateColumns: "104px 1fr 54px", gap: 8, fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 2 }}>
        <span />
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>{t("← schlechter")}</span><span>{t("besser →")}</span></div>
        <span style={{ textAlign: "right" }}>{t("vs. Reset")}</span>
      </div>
    </div>
  )
}

// ── Nutzen ↔ Nebenwirkungen: Waage + Pro/Contra ────────────────────────────────

export function ProCon({ s, suppId }: { s: LabState; suppId: string }) {
  const r = testResult(s, suppId)
  const sig = signal(s, suppId)
  if (!r) return null
  const tilt = Math.max(-12, Math.min(12, sig.net * 14)) // + = Nutzen-Seite sinkt
  const W = 340, cx = 170, beamY = 30, half = 105
  const rad = (tilt * Math.PI) / 180
  const lx = cx - half * Math.cos(rad), ly = beamY + half * Math.sin(rad)
  const rx = cx + half * Math.cos(rad), ry = beamY - half * Math.sin(rad)
  const pan = (x: number, y: number, col: string, label: string, value: string) => (
    <g>
      <line x1={x} y1={y} x2={x - 26} y2={y + 30} stroke="var(--text-dim)" strokeWidth={1} opacity={0.6} />
      <line x1={x} y1={y} x2={x + 26} y2={y + 30} stroke="var(--text-dim)" strokeWidth={1} opacity={0.6} />
      <path d={`M${x - 32},${y + 30} Q${x},${y + 48} ${x + 32},${y + 30} Z`} fill={col} opacity={0.9} />
      <text x={x} y={y + 60} textAnchor="middle" fontSize="12" fontWeight={800} fill="var(--text)">{label}</text>
      <text x={x} y={y + 75} textAnchor="middle" fontSize="12" fill="var(--text-dim)">{value}</text>
    </g>
  )
  const n = Math.max(1, r.n)
  return (
    <div>
      <svg viewBox={`0 0 ${W} 136`} width="100%" style={{ display: "block", maxWidth: 360, margin: "0 auto" }} role="img"
        aria-label={t("Nutzen {a} Sterne gegen Nebenwirkungen {b} pro Tag", { a: fmt(sig.benefit, true), b: fmt(sig.cost) })}>
        <path d={`M${cx - 18},100 L${cx + 18},100 L${cx + 4},${beamY} L${cx - 4},${beamY} Z`} fill="var(--surface-2)" stroke="var(--border)" />
        <line x1={lx} y1={ly} x2={rx} y2={ry} stroke="var(--text-dim)" strokeWidth={3} strokeLinecap="round" style={{ transition: "all .8s" }} />
        <circle cx={cx} cy={beamY} r={5} fill="var(--text-dim)" />
        {pan(lx, ly, POS, t("Nutzen"), `${fmt(sig.benefit, true)} ★`)}
        {pan(rx, ry, NEG, t("Nebenwirk."), sig.cost > 0.05 ? t("+{v} / Tag", { v: fmt(sig.cost) }) : t("keine extra"))}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 900, color: POS, marginBottom: 4 }}>{t("✅ PRO")}</div>
          {sig.pros.length ? sig.pros.map(d => (
            <div key={d} style={{ fontSize: "0.8rem", padding: "2px 0" }}>{DIMS.find(x => x.id === d)?.emoji} {DIMS.find(x => x.id === d)?.label} <b>{fmt(r.delta![d]!, true)}</b></div>
          )) : <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{t("kein spürbarer Vorteil")}</div>}
        </div>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 900, color: NEG, marginBottom: 4 }}>{t("❌ CONTRA")}</div>
          {sig.cons.map(d => (
            <div key={d} style={{ fontSize: "0.8rem", padding: "2px 0" }}>{DIMS.find(x => x.id === d)?.emoji} {DIMS.find(x => x.id === d)?.label} <b>{fmt(r.delta![d]!, true)}</b></div>
          ))}
          {r.sides.list.map(x => (
            <div key={x.id} style={{ fontSize: "0.8rem", padding: "2px 0" }}>
              {SIDE_BY_ID[x.id]?.emoji} {SIDE_BY_ID[x.id]?.label} <b>{t("{a}/{b} T", { a: x.days, b: n })}</b>{x.strong ? <span style={{ color: NEG, fontWeight: 800 }}> · {t("{n}× stark", { n: x.strong })}</span> : ""}
            </div>
          ))}
          {!sig.cons.length && !r.sides.list.length && <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{t("keine Nachteile bemerkt 🎉")}</div>}
        </div>
      </div>
    </div>
  )
}

// ── Wohlfühl-Kurve fürs Dashboard: letzte 14 Tage ─────────────────────────────

export function MoodCurve({ s, days = 14 }: { s: LabState; days?: number }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const today = todayIso()
  const wins = phaseWindows(s)
  if (!s.startDate) return null
  const firstDay = s.startDate > addDays(today, -(days - 1)) ? s.startDate : addDays(today, -(days - 1))
  const n = Math.max(1, diffDays(firstDay, today) + 1)
  const pts = Array.from({ length: n }, (_, i) => {
    const date = addDays(firstDay, i)
    const c = s.checkins[date]
    return { i, date, v: c ? daySum(c) : null, w: wins.find(x => date >= x.start && date <= x.end) }
  })
  const base = wins.find(w => w.kind === "baseline")
  const baseVals = base ? Object.values(s.checkins).filter(c => c.date >= base.start && c.date <= base.end).map(daySum) : []
  const baseAvg = baseVals.length ? baseVals.reduce((a, b) => a + b, 0) / baseVals.length : null

  const W = width, H = 150, L = 8, R = 8, T = 14, B = 26
  const iw = W - L - R, ih = H - T - B
  const x = (i: number) => L + (n > 1 ? (i / (n - 1)) * iw : iw / 2)
  const y = (v: number) => T + ih - ((v - 1) / 4) * ih
  const valid = pts.filter(p => p.v != null) as { i: number; date: string; v: number }[]
  // weiche Kurve durch die vorhandenen Punkte
  const path = valid.map((p, k) => {
    if (k === 0) return `M${x(p.i)},${y(p.v)}`
    const prev = valid[k - 1]
    const cx = (x(prev.i) + x(p.i)) / 2
    return `C${cx},${y(prev.v)} ${cx},${y(p.v)} ${x(p.i)},${y(p.v)}`
  }).join(" ")
  const area = valid.length > 1 ? `${path} L${x(valid[valid.length - 1].i)},${T + ih} L${x(valid[0].i)},${T + ih} Z` : ""
  const lastPt = valid[valid.length - 1]
  const hp = hover != null ? pts[hover] : null

  const onMove = (e: React.PointerEvent) => {
    const r = wrap.current?.getBoundingClientRect()
    if (!r) return
    const i = Math.round(((e.clientX - r.left - L) / iw) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }
  const phaseCol = (w?: PhaseWindowLike) => !w ? "var(--border)" : w.kind === "test" || w.kind === "check" ? suppColor(s.supps.find(q => q.id === w.suppId)) : w.kind === "stack" ? "#f5b400" : w.kind === "baseline" ? "var(--text-dim)" : "var(--border)"

  return (
    <div ref={wrap} style={{ position: "relative", touchAction: "pan-y" }} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", overflow: "visible" }} role="img" aria-label={t("Wohlfühl-Kurve der letzten {n} Tage", { n })}>
        <defs>
          <linearGradient id="moodArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2ECC8A" stopOpacity="0.35" />
            <stop offset="1" stopColor="#2ECC8A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="moodLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2ECC8A" />
            <stop offset="1" stopColor="#3987e5" />
          </linearGradient>
        </defs>
        {[1, 3, 5].map(v => <line key={v} x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} opacity={0.7} />)}
        {baseAvg != null && (
          <g>
            <line x1={L} x2={W - R} y1={y(baseAvg)} y2={y(baseAvg)} stroke="var(--text-dim)" strokeWidth={1.5} opacity={0.6} />
            <text x={L + 2} y={y(baseAvg) - 5} fontSize="10" fontWeight={700} fill="var(--text-dim)">{t("Ø Reset {v}", { v: fmt(baseAvg) })}★</text>
          </g>
        )}
        {area && <path d={area} fill="url(#moodArea)" />}
        {path && <path d={path} fill="none" stroke="url(#moodLine)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
        {valid.map(p => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={hover === p.i ? 5.5 : p === lastPt ? 5 : 2.5} fill={p === lastPt ? "#3987e5" : "#2ECC8A"} stroke="var(--surface)" strokeWidth={2} />)}
        {/* Phasen-Streifen */}
        {pts.map(p => <rect key={p.i} x={x(p.i) - iw / (2 * Math.max(1, n - 1))} y={H - 12} width={Math.max(2, iw / Math.max(1, n - 1) - 2)} height={5} rx={2.5} fill={phaseCol(p.w)} opacity={p.w?.kind === "washout" ? 0.4 : 0.9} />)}
        {hp && <line x1={x(hp.i)} x2={x(hp.i)} y1={T} y2={T + ih} stroke="var(--text-dim)" strokeWidth={1} opacity={0.5} />}
      </svg>
      {!valid.length && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", color: "var(--text-dim)" }}>{t("Nach deinem ersten Check-in erscheint hier deine Kurve.")}</div>}
      {hp && (
        <div style={{
          position: "absolute", top: -6, pointerEvents: "none", left: `${(x(hp.i) / W) * 100}%`, transform: `translateX(${hp.i > n / 2 ? "-105%" : "5%"})`,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "6px 9px", boxShadow: "var(--shadow)", fontSize: "0.75rem", whiteSpace: "nowrap",
        }}>
          <div style={{ fontWeight: 800 }}>{fmtDate(hp.date)}</div>
          <div style={{ color: "var(--text-dim)" }}>{hp.w ? phaseName(s, hp.w.kind, hp.w.suppId) : "—"}</div>
          <div style={{ fontWeight: 800 }}>{hp.v != null ? `${FACES[Math.round(hp.v) - 1]} ${fmt(hp.v)}★` : t("kein Check-in")}</div>
        </div>
      )}
    </div>
  )
}
type PhaseWindowLike = { kind: string; suppId?: string }
