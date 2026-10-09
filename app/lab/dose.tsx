"use client"
// ── Menge pro Einnahme: 1-Tipp-Chips (Logik in lib/labDose.ts) ──
import React from "react"
import type { MySupp, Portion } from "@/lib/supplementLab"
import { defaultPortion, portionChoices, portionLabel, samePortion, scalePortion } from "@/lib/labDose"
import { t } from "@/lib/labI18n"
import { haptic } from "./ui"

const chip = (on: boolean): React.CSSProperties => ({
  minHeight: 44, minWidth: 44, padding: "0 12px", borderRadius: 999, fontWeight: 800, fontSize: "0.84rem", whiteSpace: "nowrap", flexShrink: 0,
  border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)",
  color: on ? "var(--accent-ink)" : "var(--text)", fontVariantNumeric: "tabular-nums",
})
const dimText: React.CSSProperties = { fontSize: "0.76rem", fontWeight: 700, color: "var(--text-dim)", lineHeight: 1.35 }
const link: React.CSSProperties = { minHeight: 44, padding: "0 4px", border: "none", background: "none", color: "var(--accent-ink)", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }

/** Erste Wahl der Standard-Menge: 3–4 neutrale Chips, 1 Tipp. */
export function PortionPick({ x, value, onPick, label }: { x: MySupp; value?: Portion | null; onPick: (p: Portion) => void; label?: string }) {
  const opts = portionChoices(x)
  const all = value && !opts.some(o => samePortion(o, value)) ? [value, ...opts.slice(0, 3)] : opts
  return (
    <div>
      <div style={dimText}>{label ?? t("Wie viel nimmst du meist? (1 Tipp, optional)")}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {all.map(p => (
          <button key={`${p.n}${p.u}`} className="lab-press" aria-pressed={samePortion(p, value)} onClick={() => { haptic(8); onPick(p) }} style={chip(samePortion(p, value))}>
            {portionLabel(p)}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Nach dem Abhaken: tatsächliche Menge mit 1 Tipp (½ · 1× · 2× · +1 Kapsel). Ohne Standard-Menge zuerst die 1-Tipp-Auswahl.
 * amt = heute gespeicherte Menge (sonst Standard).
 */
export function AmountChips({ x, amt, onAmount, onPortion }: {
  x: MySupp; amt: Portion | null; onAmount: (p: Portion) => void; onPortion: (p: Portion) => void
}) {
  const std = defaultPortion(x)
  if (!std) return <PortionPick x={x} onPick={onPortion} />
  const cur = amt ?? std
  const step = std.u === "stk" || std.u === "tropfen" ? { n: 1, u: std.u } as Portion : null
  const facs: [string, number][] = [["½", 0.5], ["1×", 1], ["2×", 2]]
  const differs = !samePortion(cur, std)
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0 8px" }}>
        <span style={{ ...dimText, color: "var(--text)" }}>{t("Heute: {amount}", { amount: portionLabel(cur) })}</span>
        {differs
          ? <button className="lab-press" onClick={() => { haptic(8); onPortion(cur) }} style={link}>{t("Als Standard merken")}</button>
          : <span style={dimText}>{t("· Standard")}</span>}
      </div>
      <div role="group" aria-label={t("Menge heute")} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        {facs.map(([label, f]) => {
          const p = scalePortion(std, f)
          return (
            <button key={label} className="lab-press" aria-pressed={samePortion(p, cur)} aria-label={portionLabel(p)} onClick={() => { haptic(8); onAmount(p) }} style={chip(samePortion(p, cur))}>{label}</button>
          )
        })}
        {step && cur.u === step.u && (
          <button className="lab-press" onClick={() => { haptic(8); onAmount({ n: Math.round((cur.n + 1) * 100) / 100, u: cur.u }) }} style={chip(false)}>
            +{portionLabel(step)}
          </button>
        )}
      </div>
    </div>
  )
}
