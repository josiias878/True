"use client"
// ── Lab Pro: Handy-Vorschau (wechselnde Beispiel-Ansichten) + Funktions-Felder ───────────
// Alles aus HTML/CSS – keine Bilder. Inhalte sind sichtbar als „Beispiel“ gekennzeichnet (BRAND.md 5).
import React, { useEffect, useRef, useState } from "react"
import { PRO_FEATURES, type ProFeature } from "@/lib/labGrow"
import { DIMS } from "@/lib/supplementLab"
import { t, dec, euro, clock } from "@/lib/labI18n"
import { NewBadge } from "./newbadge"
import { haptic } from "./ui"

const VIOLET = "#9085e9"
const UP = "#1baf7a", DOWN = "#e34948"
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${dec(Math.abs(n))}`
/** Farbe nur als Punkt – Text bleibt var(--text) (Kontrast) */
const Dot = ({ c }: { c: string }) => <span aria-hidden style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: c, marginRight: 4, verticalAlign: "middle", flexShrink: 0 }} />

// ── Bausteine der Mini-Ansichten ──────────────────────────────────────────────
const mini: React.CSSProperties = { background: "var(--surface)", borderRadius: 14, padding: "9px 10px", border: "1px solid var(--glass-line, var(--border))", boxShadow: "0 1px 2px rgba(0,0,0,.04)" }
const dim: React.CSSProperties = { fontSize: "0.6rem", color: "var(--text-dim)", fontWeight: 700 }

function TopBar({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0 8px" }}>
      <span style={{ flex: 1, fontWeight: 900, fontSize: "0.86rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      <span style={{ fontSize: "0.54rem", fontWeight: 900, letterSpacing: ".05em", padding: "3px 6px", borderRadius: 999, background: "var(--surface-2)", color: "var(--text-dim)", textTransform: "uppercase" }}>{t("Beispiel")}</span>
    </div>
  )
}

/** Vergleichsbalken (Sterne 1–5) */
function Bar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.62rem", fontWeight: 800 }}>
      <span style={{ minWidth: 40, flexShrink: 0, whiteSpace: "nowrap", color: "var(--text-dim)" }}>{label}</span>
      <span style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${(v / 5) * 100}%`, borderRadius: 4, background: color }} />
      </span>
      <span style={{ width: 30, textAlign: "right" }}>{dec(v)}★</span>
    </div>
  )
}

/** Wert ±1,5 als Balken von der Mitte aus (wie CommunityCard) */
function Diverge({ v }: { v: number }) {
  const len = Math.min(1, Math.abs(v) / 1.5) * 50
  return (
    <span style={{ flex: 1, position: "relative", height: 8, borderRadius: 4, background: "var(--surface-2)" }}>
      <span style={{ position: "absolute", top: 0, bottom: 0, borderRadius: 4, background: v >= 0 ? UP : DOWN, ...(v >= 0 ? { left: "50%", width: `${len}%` } : { right: "50%", width: `${len}%` }) }} />
      <span style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1.5, background: "var(--text-dim)", opacity: 0.4 }} />
    </span>
  )
}

// ── Die vier Beispiel-Ansichten ───────────────────────────────────────────────
function PatternsView() {
  // echte Störfaktor-Tags aus der Tagesrunde (TAGS), Werte nur Beispiel
  const rows = [
    { e: "🏃", l: t("Training"), d: t("Schlaf"), v: 0.4 },
    { e: "😤", l: t("Viel Stress"), d: t("Ruhe"), v: -0.6 },
    { e: "🍽️", l: t("Spät gegessen"), d: t("Schlaf"), v: -0.3 },
  ]
  return (
    <>
      <TopBar title={t("🔎 Muster")} />
      <div style={mini}>
        <div style={{ fontWeight: 900, fontSize: "0.74rem" }}>🍷 {t("Am Tag nach Alkohol")}</div>
        <div style={{ ...dim, margin: "1px 0 7px" }}>{t("Energie · 6× beobachtet")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <Bar label={t("sonst")} v={3.8} color="color-mix(in srgb, var(--text-dim) 55%, transparent)" />
          <Bar label={t("danach")} v={2.9} color={DOWN} />
        </div>
        <div style={{ marginTop: 7, fontSize: "0.66rem", fontWeight: 900 }}><Dot c={DOWN} />{signed(-0.9)}★ {t("bei dir")}</div>
      </div>
      <div style={{ ...mini, marginTop: 7, display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.map(r => (
          <div key={r.l} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 24, height: 24, borderRadius: 8, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 }}>{r.e}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: "0.66rem", fontWeight: 800, lineHeight: 1.2 }}>{r.l}</span>
              <span style={{ ...dim, display: "block" }}>{r.d}</span>
            </span>
            <span style={{ fontSize: "0.68rem", fontWeight: 900, whiteSpace: "nowrap" }}><Dot c={r.v >= 0 ? UP : DOWN} />{signed(r.v)}★</span>
          </div>
        ))}
      </div>
    </>
  )
}

function CostsView() {
  const items = [
    { l: t("Supplement A"), v: 16, c: "#6c7cff" },
    { l: t("Supplement B"), v: 11, c: "#2bb3a3" },
    { l: t("Supplement C"), v: 12, c: "#e9a23b" },
  ]
  const sum = items.reduce((a, x) => a + x.v, 0)
  return (
    <>
      <TopBar title={t("💸 Kosten")} />
      <div style={mini}>
        <div style={dim}>{t("Dein Stack im Monat")}</div>
        <div style={{ fontSize: "1.55rem", fontWeight: 900, lineHeight: 1.1, margin: "1px 0 7px" }}>{euro(sum)}</div>
        <div style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", gap: 2 }}>
          {items.map(x => <span key={x.l} style={{ flex: x.v, background: x.c }} />)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {items.map(x => (
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.64rem", fontWeight: 800 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: x.c, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{x.l}</span>
              <span>{euro(x.v)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...mini, marginTop: 7, background: "var(--accent-dim)", border: "none", boxShadow: "none" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 900 }}>{t("Spar-Chance: {p} im Monat", { p: euro(12) })}</div>
        <div style={{ ...dim, marginTop: 2, lineHeight: 1.35 }}>{t("Supplement C: bei dir kein Unterschied zu deinem Normal")}</div>
      </div>
    </>
  )
}

function CommunityView() {
  // Verteilung der Bewertungs-Änderung (−1,5 … +1,5), „du“ in Säule 5
  const hist = [2, 4, 7, 11, 9, 6, 3]
  const max = Math.max(...hist)
  const dims = (["schlaf", "energie", "ruhe"] as const).map((id, i) => ({ d: DIMS.find(x => x.id === id)!, v: [0.6, 0.2, 0.3][i] }))
  return (
    <>
      <TopBar title={t("👥 Community")} />
      <div style={mini}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 900, whiteSpace: "nowrap" }}>{t("Verteilung")}</span>
          <span style={{ ...dim, whiteSpace: "nowrap" }}>{t("{n} Tests", { n: 48 })}</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 54, marginTop: 6 }}>
          {hist.map((h, i) => (
            <span key={i} style={{ flex: 1, height: `${(h / max) * 100}%`, borderRadius: "4px 4px 2px 2px", position: "relative", background: i === 4 ? VIOLET : i < 3 ? "color-mix(in srgb, #e34948 45%, var(--surface-2))" : "color-mix(in srgb, #1baf7a 45%, var(--surface-2))" }}>
              {i === 4 && <span style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", fontSize: "0.52rem", fontWeight: 900, color: "var(--text)", whiteSpace: "nowrap" }}>{t("du")}</span>}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", ...dim, fontSize: "0.54rem", marginTop: 3 }}><span>{t("weniger")}</span><span>{t("mehr")}</span></div>
      </div>
      <div style={{ ...mini, marginTop: 7, display: "flex", flexDirection: "column", gap: 5 }}>
        {dims.map(({ d, v }) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.62rem", fontWeight: 800 }}>
            <span style={{ width: 62, flexShrink: 0, whiteSpace: "nowrap" }}>{d.emoji} {d.label}</span>
            <Diverge v={v} />
            <span style={{ width: 26, textAlign: "right" }}>{signed(v)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function Pair({ a, b, ok }: { a: string; b: string; ok: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.64rem", fontWeight: 800, whiteSpace: "nowrap" }}>
      <span>{a}</span><span style={{ color: ok ? UP : DOWN }}>{ok ? "✨" : "⚡"}</span><span>{b}</span>
    </div>
  )
}

function TimingView() {
  const hours = [6, 10, 14, 18, 22]
  const pos = (h: number) => `${((h - 6) / 16) * 100}%`
  return (
    <>
      <TopBar title={t("⏱️ Timing")} />
      <div style={mini}>
        <Pair a={t("Supplement A")} b={t("Supplement B")} ok={false} />
        <div style={{ position: "relative", height: 26, marginTop: 8 }}>
          <span style={{ position: "absolute", left: 0, right: 0, top: 8, height: 4, borderRadius: 2, background: "var(--surface-2)" }} />
          {[{ h: 8, c: "#6c7cff" }, { h: 9, c: "#2bb3a3" }].map(p => (
            <span key={p.h} style={{ position: "absolute", left: pos(p.h), top: 4, width: 12, height: 12, marginLeft: -6, borderRadius: 999, background: p.c, boxShadow: "0 0 0 2px var(--surface)" }} />
          ))}
          <span style={{ position: "absolute", left: pos(20), top: 4, width: 12, height: 12, marginLeft: -6, borderRadius: 999, border: "2px dashed #2bb3a3", boxSizing: "border-box" }} />
          {hours.map(h => <span key={h} style={{ position: "absolute", left: pos(h), top: 17, transform: "translateX(-50%)", fontSize: "0.5rem", color: "var(--text-dim)", fontWeight: 700 }}>{h}</span>)}
        </div>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, lineHeight: 1.35, marginTop: 3 }}>
          <span style={{ fontWeight: 900 }}><Dot c={DOWN} />{t("nur {gap}", { gap: t("1 Std") })}</span><span style={{ color: "var(--text-dim)" }}> · {t("Lieber mit Abstand nehmen.")}</span>
        </div>
        <div style={{ marginTop: 7, padding: "6px 8px", borderRadius: 10, background: "#0f7a52", color: "#fff", fontSize: "0.62rem", fontWeight: 900, textAlign: "center", whiteSpace: "nowrap" }}>⏰ {t("Supplement B")} → {clock("20:00")}</div>
      </div>
      <div style={{ ...mini, marginTop: 7 }}>
        <Pair a={t("Supplement C")} b={t("Supplement D")} ok />
        <div style={{ fontSize: "0.6rem", fontWeight: 900, marginTop: 3 }}><Dot c={UP} />{t("zusammen ✓")}</div>
      </div>
    </>
  )
}

const SLIDES: { id: ProFeature; View: () => React.ReactElement }[] = [
  { id: "patterns", View: PatternsView },
  { id: "costs", View: CostsView },
  { id: "community", View: CommunityView },
  { id: "timing", View: TimingView },
]

function useReducedMotion() {
  const [r, setR] = useState(false)
  useEffect(() => {
    try {
      const mq = matchMedia("(prefers-reduced-motion: reduce)")
      setR(mq.matches)
      const on = (e: MediaQueryListEvent) => setR(e.matches)
      mq.addEventListener("change", on)
      return () => mq.removeEventListener("change", on)
    } catch {}
  }, [])
  return r
}

/** Telefonrahmen; unten vom Kopf abgeschnitten (`visible` = sichtbare Höhe) */
function PhoneFrame({ children, visible = 304, onPointerDown, onPointerUp }: {
  children: React.ReactNode; visible?: number; onPointerDown: (e: React.PointerEvent) => void; onPointerUp: (e: React.PointerEvent) => void
}) {
  const W = 226
  return (
    <div style={{ height: visible, overflow: "hidden", display: "flex", justifyContent: "center" }}>
      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp} style={{
        width: W, height: visible + 60, flexShrink: 0, borderRadius: 40, padding: 7, background: "#16141f", touchAction: "pan-y", cursor: "pointer", userSelect: "none",
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.14), 0 18px 44px rgba(40,20,90,.35)",
      }}>
        <div style={{ position: "relative", height: "100%", borderRadius: 33, overflow: "hidden", background: "var(--background)", color: "var(--text)", textAlign: "left" }}>
          {/* Status-Leiste + Dynamic Island */}
          <div aria-hidden style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 18px 0", fontSize: "0.58rem", fontWeight: 900 }}>
            <span>9:41</span>
            <span style={{ width: 62, height: 17, borderRadius: 999, background: "#000" }} />
            <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
              <span style={{ width: 11, height: 7, borderRadius: 2, border: "1.2px solid currentColor", boxSizing: "border-box", position: "relative" }}>
                <span style={{ position: "absolute", inset: 1, right: 2, background: "currentColor", borderRadius: 1 }} />
              </span>
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Zustand des Handy-Karussells: 4 Beispiel-Ansichten, die sanft wechseln (alle 4,2 s; jeder Wechsel – auch von
 * Hand – startet die Zeit neu). Bei „Bewegung reduzieren“: kein Auto-Wechsel, keine Animation.
 */
export function useProCarousel(from?: ProFeature) {
  const n = SLIDES.length
  const [idx, setIdx] = useState(() => Math.max(0, SLIDES.findIndex(x => x.id === from)))
  const reduced = useReducedMotion()
  // Vorlesen nur nach Nutzer-Aktion – der Auto-Wechsel bleibt für Screenreader still (aria-live „off“)
  const [manual, setManual] = useState(false)
  useEffect(() => {
    if (reduced) return
    const tm = setTimeout(() => { setManual(false); setIdx(i => (i + 1) % n) }, 4200)
    return () => clearTimeout(tm)
  }, [idx, reduced, n])
  const go = (i: number) => { setManual(true); setIdx(((i % n) + n) % n) }
  const live: "off" | "polite" = manual ? "polite" : "off"
  return { idx, go, reduced, live, feature: PRO_FEATURES.find(x => x.id === SLIDES[idx].id)! }
}
type Carousel = ReturnType<typeof useProCarousel>

/** Handy oben auf der Pro-Seite. Wischen = vor/zurück, Antippen = weiter. */
export function ProPhone({ c, visible }: { c: Carousel; visible?: number }) {
  const { idx, go, reduced } = c
  const down = useRef<number | null>(null)
  const n = SLIDES.length
  const onPointerDown = (e: React.PointerEvent) => { down.current = e.clientX }
  const onPointerUp = (e: React.PointerEvent) => {
    if (down.current == null) return
    const dx = e.clientX - down.current
    down.current = null
    if (dx < -30) go(idx + 1)
    else if (dx > 30) go(idx - 1)
    else if (Math.abs(dx) < 8) go(idx + 1)
    else return
    haptic(6)
  }
  const ease = reduced ? "none" : "opacity .5s ease, transform .55s cubic-bezier(.2,.9,.3,1)"
  return (
    <div role="group" aria-roledescription={t("Vorschau")} aria-label={t("Beispiel-Ansichten aus Lab Pro")}>
      <PhoneFrame visible={visible} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <div style={{ position: "relative", height: "100%" }}>
          {SLIDES.map(({ id, View }, i) => {
            const off = i === idx ? 0 : (i - idx + n) % n === 1 ? 1 : -1
            return (
              <div key={id} aria-hidden={i !== idx} style={{
                position: "absolute", inset: 0, padding: "10px 10px 0",
                opacity: off === 0 ? 1 : 0, transform: `translateX(${off * 28}px)`, transition: ease, pointerEvents: off === 0 ? "auto" : "none",
              }}>
                <View />
              </div>
            )
          })}
        </div>
      </PhoneFrame>
    </div>
  )
}

/** Punkte unter dem Handy (Antippen springt zur Ansicht) */
export function ProDots({ c }: { c: Carousel }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 0 }}>
      {SLIDES.map(({ id }, i) => {
        const on = i === c.idx
        const f = PRO_FEATURES.find(x => x.id === id)
        return (
          <button key={id} onClick={() => { haptic(6); c.go(i) }} aria-label={t("Ansicht {n}: {f}", { n: i + 1, f: f?.title ?? "" })} aria-current={on || undefined} style={{
            border: "none", background: "transparent", padding: 0, minWidth: 44, minHeight: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ display: "block", height: 8, width: on ? 22 : 8, borderRadius: 999, background: on ? VIOLET : "var(--border)", transition: c.reduced ? "none" : "width .3s ease, background-color .3s" }} />
          </button>
        )
      })}
    </div>
  )
}

/** Die Pro-Funktionen als große, gut lesbare Felder (2 Spalten) – mit „Neu“ und Häkchen, wenn Pro aktiv ist. */
export function ProFeatureGrid({ pro, highlight }: { pro: boolean; highlight?: ProFeature }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {PRO_FEATURES.map(f => {
        const hl = f.id === highlight
        return (
          <div key={f.id} style={{
            display: "flex", flexDirection: "column", padding: "14px 13px 15px", borderRadius: 20, minHeight: 132, minWidth: 0,
            background: hl ? `color-mix(in srgb, ${VIOLET} 9%, var(--surface))` : "var(--surface)",
            border: hl ? `2px solid ${VIOLET}` : "1px solid var(--glass-line, var(--border))",
            boxShadow: "0 1px 2px rgba(0,0,0,.04), 0 6px 18px rgba(20,30,60,.05)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span aria-hidden style={{ width: 42, height: 42, borderRadius: 14, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.35rem", flexShrink: 0 }}>{f.emoji}</span>
              <span style={{ flex: 1 }} />
              <NewBadge id={f.id} />
              {pro && <span aria-label={t("aktiv")} style={{ width: 22, height: 22, borderRadius: 999, background: "var(--accent-dim)", color: "var(--accent)", fontSize: "0.72rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✓</span>}
            </div>
            <div style={{ fontWeight: 900, fontSize: "0.94rem", lineHeight: 1.2, marginTop: 10 }}>{f.title}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.38, marginTop: 3 }}>{f.text}</div>
          </div>
        )
      })}
    </div>
  )
}
