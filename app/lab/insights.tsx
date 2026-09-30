"use client"
// ── Kosten, Muster, Wechselwirkungen, Wochenrückblick — visuell statt Text ─────
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  FACES, addDays, daySum, fmtDate, intakeOn, relMin, streak, suppColor, suppMinutes, toMin,
  type LabState, type MySupp,
} from "@/lib/supplementLab"
import { costSummary, fmtEuro } from "@/lib/labStock"
import { dimLabel, findPatterns, type Pattern } from "@/lib/labPatterns"
import { fmtGap, interactionChecks, type PairCheck } from "@/lib/labInteractions"
import { pathStops } from "@/lib/labPath"
import { learnedFacts } from "@/lib/labKnowledge"
import { Btn, Label } from "./ui"
import { Mascot } from "./mascot"

const fmt1 = (n: number) => n.toFixed(1).replace(".", ",")

function CountUp({ to, ms = 1000, format = (v: number) => String(Math.round(v)) }: { to: number; ms?: number; format?: (v: number) => string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      setV(to * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return <>{format(v)}</>
}

// ═══ 💶 Kosten & Sparen ════════════════════════════════════════════════════════

function Donut({ parts, size = 132, stroke = 16, children }: { parts: { value: number; color: string }[]; size?: number; stroke?: number; children?: React.ReactNode }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t) }, [])
  const r = (size - stroke) / 2, C = 2 * Math.PI * r
  const total = parts.reduce((a, b) => a + b.value, 0) || 1
  let acc = 0
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        {parts.map((p, i) => {
          const len = (p.value / total) * C
          const gap = parts.length > 1 ? Math.min(4, len * 0.3) : 0
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke} strokeLinecap="butt"
              strokeDasharray={`${on ? Math.max(0, len - gap) : 0} ${C}`} strokeDashoffset={-acc}
              style={{ transition: `stroke-dasharray .9s cubic-bezier(.3,.9,.3,1) ${i * 0.08}s` }} />
          )
          acc += len
          return el
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>{children}</div>
    </div>
  )
}

export function CostCard({ s, today, onStock }: { s: LabState; today: string; onStock: (id: string) => void }) {
  const c = useMemo(() => costSummary(s, today), [s, today])
  if (!c.items.length && !c.saved.length) {
    if (!c.missing.length) return null
    return (
      <button className="lab-card lab-press lab-rise" onClick={() => onStock(c.missing[0].id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, width: "100%", textAlign: "left", color: "var(--text)" }}>
        <Donut parts={c.missing.slice(0, 5).map(x => ({ value: 1, color: `color-mix(in srgb, ${suppColor(x)} 35%, var(--surface-2))` }))} size={70} stroke={10}><span style={{ fontSize: "1.3rem" }}>💶</span></Donut>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontWeight: 900 }}>Was kostet dein Stack?</span>
          <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.4 }}>Trag beim Vorrat den Preis ein – ich rechne dir €/Monat aus und zeige, wo du sparen kannst.</span>
        </span>
        <span style={{ color: "var(--text-dim)" }}>›</span>
      </button>
    )
  }
  return (
    <div className="lab-card lab-rise" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Donut parts={c.items.map(i => ({ value: i.cost, color: suppColor(i.x) }))}>
          <div style={{ fontSize: "1.45rem", fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}><CountUp to={c.total} format={v => fmtEuro(v)} /></div>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-dim)", marginTop: 3 }}>pro Monat</div>
        </Donut>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
          <Label>💶 Dein Stack kostet</Label>
          {c.items.slice(0, 5).map(i => (
            <div key={i.x.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: suppColor(i.x), flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>{i.x.emoji} {i.x.name}</span>
              <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{fmtEuro(i.cost)}</span>
            </div>
          ))}
          {c.items.length > 5 && <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>+ {c.items.length - 5} weitere</div>}
        </div>
      </div>
      {c.savedMonthly > 0 && (
        <div className="lab-pop" style={{ marginTop: 14, padding: "12px 14px", borderRadius: 18, background: "linear-gradient(135deg, #1baf7a, #2ECC8A)", color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.7rem" }}>✂️</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontWeight: 900, fontSize: "1.05rem" }}>Du sparst {fmtEuro(c.savedMonthly)} im Monat</span>
            <span style={{ display: "block", fontSize: "0.76rem", opacity: 0.9 }}>{c.saved.map(x => x.x.name).join(", ")} flog{c.saved.length > 1 ? "en" : ""} raus · schon <b><CountUp to={c.savedSoFar} format={v => fmtEuro(v)} /></b> gespart</span>
          </span>
        </div>
      )}
      {c.missing.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-dim)" }}>Preis fehlt:</span>
          {c.missing.slice(0, 4).map(x => (
            <button key={x.id} className="lab-press" onClick={() => onStock(x.id)} style={{ padding: "5px 10px", borderRadius: 999, border: "1px dashed var(--border)", background: "none", color: "var(--text)", fontSize: "0.76rem", fontWeight: 800 }}>{x.emoji} {x.name} +</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══ 🔎 Muster-Detektor ════════════════════════════════════════════════════════

function Bar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), 80 + delay); return () => clearTimeout(t) }, [delay])
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 72, fontSize: "0.72rem", fontWeight: 800, color: "var(--text-dim)", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <span style={{ flex: 1, height: 14, borderRadius: 7, background: "var(--surface-2)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: on ? `${(value / 5) * 100}%` : 0, background: color, borderRadius: 7, transition: "width .9s cubic-bezier(.3,.9,.3,1)" }} />
      </span>
      <span style={{ width: 34, fontSize: "0.8rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{fmt1(value)}★</span>
    </div>
  )
}

export function PatternCard({ p, i = 0 }: { p: Pattern; i?: number }) {
  const good = p.delta > 0
  const col = good ? "#1baf7a" : "#e34948"
  return (
    <div className="lab-card lab-pop" style={{ animationDelay: `${i * 70}ms`, flexShrink: 0, width: 250, padding: 14, scrollSnapAlign: "start", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 42, height: 42, borderRadius: 14, background: `color-mix(in srgb, ${col} 14%, var(--surface))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>{p.emoji}</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 900, fontSize: "0.92rem", lineHeight: 1.2 }}>{p.title}</span>
          <span style={{ display: "block", fontSize: "0.74rem", color: "var(--text-dim)" }}>{dimLabel(p.dim)}</span>
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Bar label={p.labelWith} value={p.with} color={col} delay={i * 70} />
        <Bar label={p.labelWithout} value={p.without} color="var(--text-dim)" delay={i * 70 + 120} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "1.2rem", fontWeight: 900, color: col }}>{good ? "+" : "−"}{fmt1(Math.abs(p.delta))}★</span>
        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{p.n} Tage · nur ein Hinweis</span>
      </div>
    </div>
  )
}

export function PatternStrip({ s }: { s: LabState }) {
  const ps = useMemo(() => findPatterns(s), [s])
  const n = Object.keys(s.checkins).length
  return (
    <div className="lab-rise">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>🔎 Kolbi hat entdeckt</div>
        {ps.length > 0 && <span style={{ fontSize: "0.74rem", color: "var(--text-dim)", fontWeight: 700 }}>{ps.length} Muster</span>}
      </div>
      {ps.length ? (
        <div className="lab-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 4, margin: "0 -16px", padding: "0 16px 4px" }}>
          {ps.map((p, i) => <PatternCard key={p.id} p={p} i={i} />)}
        </div>
      ) : (
        <div className="lab-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span className="lab-wiggle" style={{ fontSize: "1.8rem", display: "inline-block" }}>🔍</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontWeight: 900, fontSize: "0.9rem" }}>Ich suche noch …</span>
            <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--surface-2)", marginTop: 6, overflow: "hidden" }}>
              <span className="lab-shine" style={{ display: "block", height: "100%", width: `${Math.min(100, (n / 10) * 100)}%`, borderRadius: 3, background: "linear-gradient(90deg, var(--accent), #3987e5, var(--accent))" }} />
            </span>
            <span style={{ display: "block", fontSize: "0.74rem", color: "var(--text-dim)", marginTop: 4 }}>Tipp „Störfaktoren“ beim Check-in an (Alkohol, Stress …) – dann finde ich schneller etwas.</span>
          </span>
        </div>
      )}
    </div>
  )
}

// ═══ 🔗 Wechselwirkungen ══════════════════════════════════════════════════════

function DayLine({ s, p }: { s: LabState; p: PairCheck }) {
  const wake = toMin(s.settings.wake)
  let bed = relMin(toMin(s.settings.bed), s.settings)
  if (bed <= wake) bed += 1440
  const pos = (m: number) => `${Math.max(2, Math.min(98, ((m - wake) / (bed - wake)) * 100))}%`
  const ma = suppMinutes(p.a.id, s), mb = suppMinutes(p.b.id, s)
  const bad = !p.ok && p.rule.kind === "trennen"
  const combo = p.rule.kind === "combo"
  const col = bad ? "#e34948" : combo ? "#1baf7a" : "var(--accent)"
  return (
    <div style={{ position: "relative", height: 64, margin: "6px 4px 2px" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 22, height: 4, borderRadius: 2, background: "var(--surface-2)" }} />
      <div style={{ position: "absolute", top: 20, height: 8, borderRadius: 4, left: pos(ma), width: `calc(${pos(mb)} - ${pos(ma)})`, background: col, opacity: bad ? 0.9 : 0.5,
        backgroundImage: bad ? "repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,.35) 4px 8px)" : undefined }} />
      {[{ x: p.a, m: ma }, { x: p.b, m: mb }].map(({ x, m }, k) => (
        <span key={x.id} className="lab-pop" style={{ animationDelay: `${k * 90}ms`, position: "absolute", left: pos(m), top: 24, transform: "translate(-50%, -50%)", width: 30, height: 30, borderRadius: 999,
          background: suppColor(x), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", border: "2px solid var(--surface)", boxShadow: "0 2px 6px rgba(0,0,0,.15)" }}>{x.emoji}</span>
      ))}
      <span style={{ position: "absolute", left: 0, top: 48, fontSize: "0.66rem", color: "var(--text-dim)" }}>☀️ {s.settings.wake}</span>
      <span style={{ position: "absolute", right: 0, top: 48, fontSize: "0.66rem", color: "var(--text-dim)" }}>{s.settings.bed} 🌙</span>
    </div>
  )
}

export function InteractionCard({ s, today, onFix }: { s: LabState; today: string; onFix: (suppId: string, time: string) => void }) {
  const checks = useMemo(() => interactionChecks(s, today), [s, today])
  if (!checks.length) return null
  const bad = checks.filter(p => !p.ok && p.rule.kind === "trennen").length
  return (
    <div className="lab-card lab-rise" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 900, fontSize: "1.02rem", flex: 1 }}>🔗 Passt das zusammen?</span>
        <span style={{ fontSize: "0.72rem", fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: bad ? "var(--danger-dim)" : "var(--accent-dim)", color: bad ? "var(--danger)" : "var(--accent)" }}>{bad ? `${bad} Konflikt${bad > 1 ? "e" : ""}` : "Alles ok ✓"}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
        {checks.map(p => {
          const conflict = !p.ok && p.rule.kind === "trennen"
          const moved = p.fix ? s.supps.find(x => x.id === p.fix!.suppId) : undefined
          return (
            <div key={`${p.a.id}-${p.b.id}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.86rem", fontWeight: 800 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.a.name}</span>
                <span style={{ color: conflict ? "var(--danger)" : p.rule.kind === "combo" ? "#1baf7a" : "var(--text-dim)", flexShrink: 0 }}>{p.rule.kind === "combo" ? "✨" : conflict ? "⚡" : "↔"}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.b.name}</span>
                <span style={{ fontSize: "0.7rem", fontWeight: 900, flexShrink: 0, color: conflict ? "var(--danger)" : "var(--text-dim)" }}>
                  {p.rule.kind === "combo" ? (p.ok ? "zusammen ✓" : `${fmtGap(p.gap)} getrennt`) : conflict ? `nur ${fmtGap(p.gap)}` : `${fmtGap(p.gap)} ✓`}
                </span>
              </div>
              <DayLine s={s} p={p} />
              <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", marginTop: 2, lineHeight: 1.4 }}>{p.rule.text}</div>
              {p.fix && moved && (
                <Btn variant={conflict ? "primary" : "soft"} onClick={() => onFix(p.fix!.suppId, p.fix!.time)} style={{ marginTop: 8, padding: "8px 12px", fontSize: "0.8rem", borderRadius: 12 }}>
                  ⏰ {moved.name} → {p.fix.time} Uhr
                </Btn>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══ 📊 Wochenrückblick (Story) ═══════════════════════════════════════════════

/** Sonntag der Woche, die gerade „abgeschlossen“ ist: So ab 17 Uhr die laufende, sonst die letzte. */
export function recapWeekEnd(now: Date, today: string) {
  const dow = now.getDay()
  if (dow === 0) return now.getHours() >= 17 ? today : addDays(today, -7)
  return addDays(today, -dow)
}

export function recapAvailable(s: LabState, now: Date, today: string) {
  const end = recapWeekEnd(now, today)
  const n = Array.from({ length: 7 }, (_, k) => addDays(end, -k)).filter(d => s.checkins[d]).length
  return { end, ready: n >= 3 && s.recapSeen !== end && (s.startDate ?? "9") <= addDays(end, -3) && addDays(end, 3) >= today }
}

export function RecapTeaser({ end, onOpen }: { end: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="lab-press lab-rise" style={{
      display: "flex", alignItems: "center", gap: 14, padding: 16, borderRadius: 24, border: "none", width: "100%", textAlign: "left", color: "#fff",
      background: "linear-gradient(135deg, #9085e9 0%, #3987e5 55%, #2ECC8A 100%)", boxShadow: "0 12px 30px rgba(57,135,229,.35)",
    }}>
      <span style={{ position: "relative", width: 58, height: 70, flexShrink: 0 }}>
        {[0, 1, 2].map(k => (
          <span key={k} style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(255,255,255,.22)", border: "2px solid rgba(255,255,255,.5)", transform: `rotate(${(k - 1) * 9}deg) translateX(${(k - 1) * 5}px)` }} />
        ))}
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem" }}>📊</span>
      </span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 900, letterSpacing: ".1em", opacity: 0.9 }}>NEU · {fmtDate(addDays(end, -6)).replace(/^\w+\.,\s*/, "")} – {fmtDate(end).replace(/^\w+\.,\s*/, "")}</span>
        <span style={{ display: "block", fontWeight: 900, fontSize: "1.15rem" }}>Dein Wochenrückblick</span>
        <span style={{ display: "block", fontSize: "0.8rem", opacity: 0.9 }}>Tippen zum Ansehen ▶</span>
      </span>
    </button>
  )
}

const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
const DAYNAME = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]

export function WeekRecap({ s, end, today, onClose }: { s: LabState; end: string; today: string; onClose: () => void }) {
  const days = Array.from({ length: 7 }, (_, k) => addDays(end, k - 6))
  const cs = days.map(d => s.checkins[d])
  const got = cs.filter(Boolean)
  const avg = got.length ? got.reduce((a, c) => a + daySum(c!), 0) / got.length : null
  const prev = Array.from({ length: 7 }, (_, k) => s.checkins[addDays(end, k - 13)]).filter(Boolean)
  const prevAvg = prev.length ? prev.reduce((a, c) => a + daySum(c!), 0) / prev.length : null
  const bestIdx = cs.reduce((bi, c, i) => (c && (bi < 0 || daySum(c) > daySum(cs[bi]!)) ? i : bi), -1)
  let planned = 0, taken = 0
  for (const d of days) { const p = intakeOn(s, d); planned += p.length; taken += p.filter(id => (s.took[d] ?? []).includes(id)).length }
  const pattern = findPatterns(s)[0]
  const facts = learnedFacts(s).length
  const upcoming = pathStops(s, today, new Date(), false).stops.filter(x => x.date > today).slice(0, 3)
  const st = streak(s)

  const slides: { bg: string; body: React.ReactNode }[] = [
    { bg: "linear-gradient(160deg, #2ECC8A, #1baf9a 50%, #3987e5)", body: (
      <>
        <div className="lab-float"><Mascot mood="party" size={150} fill={0.8} glow /></div>
        <div className="lab-pop" style={{ fontSize: "2.2rem", fontWeight: 900, marginTop: 10 }}>Deine Woche</div>
        <div style={{ opacity: 0.9, fontWeight: 700 }}>{fmtDate(days[0])} – {fmtDate(end)}</div>
        <div className="lab-late" style={{ marginTop: 18, fontWeight: 800, opacity: 0.95 }}>Ich hab dir was zusammengestellt 👉</div>
      </>
    ) },
    { bg: "linear-gradient(160deg, #eb6834, #eda100)", body: (
      <>
        <div style={{ fontSize: "0.8rem", fontWeight: 900, letterSpacing: ".12em", opacity: 0.9 }}>DRANGEBLIEBEN</div>
        <div className="lab-pop" style={{ fontSize: "5rem", fontWeight: 900, lineHeight: 1 }}><CountUp to={got.length} />/7</div>
        <div style={{ fontWeight: 800 }}>Tage eingecheckt</div>
        <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
          {days.map((d, i) => (
            <div key={d} className="lab-pop" style={{ animationDelay: `${0.3 + i * 0.08}s`, textAlign: "center" }}>
              <div style={{ width: 38, height: 38, borderRadius: 999, background: cs[i] ? "#fff" : "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>{cs[i] ? FACES[Math.round(daySum(cs[i]!)) - 1] : ""}</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, marginTop: 4 }}>{WD[new Date(`${d}T12:00:00`).getDay()]}</div>
            </div>
          ))}
        </div>
        {st >= 2 && <div className="lab-late" style={{ marginTop: 20, padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,.2)", fontWeight: 900 }}>🔥 {st} Tage Serie</div>}
      </>
    ) },
    { bg: "linear-gradient(160deg, #3987e5, #9085e9)", body: (
      <>
        <div style={{ fontSize: "0.8rem", fontWeight: 900, letterSpacing: ".12em", opacity: 0.9 }}>SO HAST DU DICH GEFÜHLT</div>
        <div className="lab-pop" style={{ fontSize: "4.5rem", fontWeight: 900, lineHeight: 1 }}>{avg != null ? <><CountUp to={avg} format={v => fmt1(v)} />★</> : "–"}</div>
        {avg != null && prevAvg != null && (
          <div className="lab-late" style={{ fontWeight: 900, fontSize: "1.1rem" }}>{avg >= prevAvg ? "▲" : "▼"} {fmt1(Math.abs(avg - prevAvg))} zur Vorwoche</div>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, marginTop: 22 }}>
          {days.map((d, i) => {
            const v = cs[i] ? daySum(cs[i]!) : 0
            return (
              <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: "0.9rem", opacity: i === bestIdx ? 1 : 0 }}>👑</div>
                <div style={{ width: 26, height: `${(v / 5) * 100}px`, borderRadius: 8, background: i === bestIdx ? "#fff" : "rgba(255,255,255,.45)", transformOrigin: "bottom", animation: `labGrow .8s cubic-bezier(.3,.9,.3,1) ${0.2 + i * 0.07}s both` }} />
                <div style={{ fontSize: "0.7rem", fontWeight: 800 }}>{WD[new Date(`${d}T12:00:00`).getDay()]}</div>
              </div>
            )
          })}
        </div>
        {bestIdx >= 0 && <div className="lab-late" style={{ marginTop: 16, fontWeight: 800 }}>Bester Tag: {DAYNAME[new Date(`${days[bestIdx]}T12:00:00`).getDay()]} {FACES[Math.round(daySum(cs[bestIdx]!)) - 1]}</div>}
      </>
    ) },
    ...(planned ? [{ bg: "linear-gradient(160deg, #1baf7a, #2ECC8A)", body: (
      <>
        <div style={{ fontSize: "0.8rem", fontWeight: 900, letterSpacing: ".12em", opacity: 0.9 }}>EINGENOMMEN</div>
        <RecapRing value={taken / planned} />
        <div style={{ fontWeight: 900, fontSize: "1.3rem", marginTop: 14 }}>{taken} von {planned}</div>
        <div style={{ opacity: 0.9, fontWeight: 700 }}>{taken / planned >= 0.9 ? "Top – so werden die Ergebnisse genau!" : taken / planned >= 0.6 ? "Gut! Noch ein bisschen regelmäßiger?" : "Die Erinnerungen helfen dir dranzubleiben."}</div>
      </>
    ) }] : []),
    { bg: "linear-gradient(160deg, #9085e9, #e87ba4)", body: pattern ? (
      <>
        <div style={{ fontSize: "0.8rem", fontWeight: 900, letterSpacing: ".12em", opacity: 0.9 }}>KOLBI HAT ENTDECKT</div>
        <div className="lab-pop" style={{ fontSize: "4rem", marginTop: 6 }}>{pattern.emoji}</div>
        <div style={{ fontWeight: 900, fontSize: "1.5rem" }}>{pattern.title}</div>
        <div style={{ fontWeight: 700, opacity: 0.9 }}>{dimLabel(pattern.dim)}</div>
        <div className="lab-late" style={{ fontSize: "3rem", fontWeight: 900, marginTop: 10 }}>{pattern.delta > 0 ? "+" : "−"}{fmt1(Math.abs(pattern.delta))}★</div>
        <div style={{ opacity: 0.9, fontWeight: 700 }}>{fmt1(pattern.with)}★ {pattern.labelWith} · {fmt1(pattern.without)}★ {pattern.labelWithout}</div>
      </>
    ) : (
      <>
        <div style={{ fontSize: "0.8rem", fontWeight: 900, letterSpacing: ".12em", opacity: 0.9 }}>DEIN WISSEN</div>
        <div className="lab-pop" style={{ fontSize: "4.5rem", fontWeight: 900 }}>📚 {facts}</div>
        <div style={{ fontWeight: 800 }}>Fakten gesammelt</div>
        <div className="lab-late" style={{ marginTop: 14, opacity: 0.9, fontWeight: 700 }}>Muster finde ich, sobald ein paar mehr Tage da sind 🔍</div>
      </>
    ) },
    { bg: "linear-gradient(160deg, #0b0b1a, #2b2b55)", body: (
      <>
        <div style={{ fontSize: "0.8rem", fontWeight: 900, letterSpacing: ".12em", opacity: 0.9 }}>NÄCHSTE WOCHE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18, width: "100%", maxWidth: 300 }}>
          {upcoming.length ? upcoming.map((u, i) => (
            <div key={u.key} className="lab-pop" style={{ animationDelay: `${0.15 + i * 0.12}s`, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "rgba(255,255,255,.1)", textAlign: "left" }}>
              <span style={{ fontSize: "1.6rem" }}>{u.emoji}</span>
              <span>
                <span style={{ display: "block", fontWeight: 900 }}>{u.title}</span>
                <span style={{ display: "block", fontSize: "0.76rem", opacity: 0.8 }}>{fmtDate(u.date)}</span>
              </span>
            </div>
          )) : <div style={{ opacity: 0.8 }}>Weiter so – ich melde mich, wenn etwas ansteht.</div>}
        </div>
        <div className="lab-late" style={{ marginTop: 24 }}><Mascot mood="happy" size={70} /></div>
        <button onClick={e => { e.stopPropagation(); onClose() }} className="lab-press" style={{ marginTop: 14, padding: "14px 28px", borderRadius: 999, border: "none", background: "#fff", color: "#0b0b1a", fontWeight: 900, fontSize: "1rem" }}>Auf geht's 🚀</button>
      </>
    ) },
  ]

  const [i, setI] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const DUR = 6500
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (i < slides.length - 1) timer.current = setTimeout(() => setI(x => x + 1), DUR)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [i, slides.length])
  const tap = (e: React.MouseEvent) => {
    const x = e.clientX / window.innerWidth
    if (x < 0.3) setI(v => Math.max(0, v - 1))
    else if (i < slides.length - 1) setI(v => v + 1)
  }
  return (
    <div className="lab-fade" onClick={tap} style={{ position: "fixed", inset: 0, zIndex: 480, background: slides[i].bg, color: "#fff", transition: "background .5s", display: "flex", flexDirection: "column", userSelect: "none" }}>
      <div style={{ display: "flex", gap: 4, padding: "calc(12px + env(safe-area-inset-top)) 14px 0" }}>
        {slides.map((_, k) => (
          <span key={k} style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,.3)", overflow: "hidden" }}>
            <span key={`${k}-${i}`} style={{ display: "block", height: "100%", background: "#fff", width: k < i ? "100%" : k > i ? 0 : undefined,
              animation: k === i ? (i < slides.length - 1 ? `labFill ${DUR}ms linear both` : "none") : undefined, ...(k === i && i === slides.length - 1 ? { width: "100%" } : {}) }} />
          </span>
        ))}
      </div>
      <button onClick={e => { e.stopPropagation(); onClose() }} aria-label="Schließen" style={{ position: "absolute", top: "calc(22px + env(safe-area-inset-top))", right: 14, width: 36, height: 36, borderRadius: 999, border: "none", background: "rgba(0,0,0,.2)", color: "#fff", fontSize: "1rem" }}>✕</button>
      <div key={i} className="lab-tabin" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px 24px 40px" }}>
        {slides[i].body}
      </div>
      <div style={{ textAlign: "center", fontSize: "0.72rem", opacity: 0.7, paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>Tippen für weiter · links tippen für zurück</div>
    </div>
  )
}

function RecapRing({ value }: { value: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), 100); return () => clearTimeout(t) }, [])
  const size = 170, stroke = 16, r = (size - stroke) / 2, C = 2 * Math.PI * r
  return (
    <div style={{ position: "relative", width: size, height: size, marginTop: 14 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={on ? C * (1 - value) : C} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.3,.9,.3,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.4rem", fontWeight: 900 }}><CountUp to={Math.round(value * 100)} />%</div>
    </div>
  )
}

