"use client"
// ── „Dein Profil“: macht die Reset-Tage sofort wertvoll ─────────────────────────
// Ab dem 1. Check-in eigene Werte je Bereich, ab 3 Check-ins erste Aussagen – nur aus den eigenen Daten.
import React from "react"
import { activeDims, daySum, tagLabel, type LabState, type PhaseWindow } from "@/lib/supplementLab"
import { t, dec } from "@/lib/labI18n"
import { Mascot } from "./mascot"

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
const sd = (xs: number[]) => { const m = avg(xs); return Math.sqrt(avg(xs.map(x => (x - m) ** 2))) }

export function profileOf(s: LabState, upTo: string) {
  const days = Object.values(s.checkins).filter(c => c.date <= upTo).sort((a, b) => a.date.localeCompare(b.date))
  const dims = activeDims(s).map(d => {
    const vals = days.map(c => c.scores[d.id]).filter((v): v is number => typeof v === "number")
    return { ...d, n: vals.length, avg: vals.length ? avg(vals) : null, sd: vals.length >= 3 ? sd(vals) : 0 }
  }).filter(d => d.avg != null) as (ReturnType<typeof activeDims>[number] & { n: number; avg: number; sd: number })[]
  // Störfaktor mit dem größten Unterschied im Gesamtgefühl (mind. 1 Tag mit, 2 ohne)
  const tags = [...new Set(days.flatMap(c => c.tags))]
  let tag: { tag: string; delta: number } | null = null
  for (const tg of tags) {
    const w = days.filter(c => c.tags.includes(tg)).map(daySum), wo = days.filter(c => !c.tags.includes(tg)).map(daySum)
    if (w.length >= 1 && wo.length >= 2) { const d = avg(w) - avg(wo); if (Math.abs(d) >= 0.5 && (!tag || Math.abs(d) > Math.abs(tag.delta))) tag = { tag: tg, delta: d } }
  }
  return { n: days.length, dims, tag }
}

export function ProfileCard({ s, first, today, onCheckin }: { s: LabState; first: PhaseWindow; today: string; onCheckin: () => void }) {
  const p = profileOf(s, today)
  const goal = first.days
  const done = p.n >= goal
  const sorted = [...p.dims].sort((a, b) => b.avg - a.avg)
  const best = sorted[0], low = sorted[sorted.length - 1]
  const shaky = [...p.dims].filter(d => d.n >= 3 && d.sd >= 1).sort((a, b) => b.sd - a.sd)[0]
  return (
    <div className="lab-card lab-rise" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Mascot mood={p.n === 0 ? "think" : done ? "party" : "happy"} size={40} alive />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>{p.n >= 3 ? t("🧬 Dein Profil") : t("🧬 Dein Profil entsteht")}</div>
          <div style={{ fontSize: "0.76rem", color: "var(--text-dim)" }}>
            {done ? t("✓ Dein Normal steht – jetzt wird getestet.") : t("{n} von {g} Abenden · danach steht dein Normal", { n: Math.min(p.n, goal), g: goal })}
          </div>
        </div>
      </div>
      {/* Fortschritt */}
      <div style={{ display: "flex", gap: 4, margin: "12px 0 4px" }}>
        {Array.from({ length: goal }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < p.n ? "var(--accent)" : "var(--surface-2)", transition: "background .4s" }} />
        ))}
      </div>

      {p.n === 0 ? (
        <button className="lab-press" onClick={onCheckin} style={{ marginTop: 10, width: "100%", border: "1px dashed var(--border)", background: "var(--surface-2)", borderRadius: 16, padding: "12px 14px", color: "var(--text)", textAlign: "left", fontSize: "0.86rem", lineHeight: 1.45 }}>
          {t("Heute Abend zeige ich dir zum ersten Mal, wo du stehst – eine Minute, ein paar Taps.")}
        </button>
      ) : <>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>
          {sorted.map(d => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem" }}>
              <span style={{ width: 92, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.emoji} {d.label}</span>
              <span style={{ flex: 1, height: 10, borderRadius: 5, background: "var(--surface-2)", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", width: `${(d.avg / 5) * 100}%`, borderRadius: 5, transition: "width .8s",
                  background: p.n >= 3 && d === best ? "#1baf7a" : p.n >= 3 && d === low && sorted.length > 1 ? "#eda100" : "color-mix(in srgb, var(--accent) 70%, transparent)" }} />
              </span>
              <span style={{ width: 34, textAlign: "right", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{dec(d.avg)}</span>
            </div>
          ))}
        </div>
        {p.n < 3 ? (
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 10, lineHeight: 1.45 }}>
            {3 - p.n === 1 ? t("Noch 1 Abend, dann sage ich dir, was mir an dir auffällt.") : t("Noch {n} Abende, dann sage ich dir, was mir an dir auffällt.", { n: 3 - p.n })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            {best && <Insight emoji="💚" text={t("Am stärksten: {d} (⌀ {v}★)", { d: best.label, v: dec(best.avg) })} />}
            {low && low !== best && <Insight emoji="🎯" text={t("Am meisten Luft nach oben: {d} (⌀ {v}★) – darauf achte ich bei deinen Tests besonders.", { d: low.label, v: dec(low.avg) })} />}
            {shaky && <Insight emoji="🎢" text={t("{d} schwankt bei dir stark – genau da hilft ein sauberer Vergleich.", { d: shaky.label })} />}
            {p.tag && <Insight emoji="🔎" text={p.tag.delta < 0
              ? t("An Tagen mit „{tag}“ warst du ⌀ {v}★ schlechter drauf.", { tag: tagLabel(p.tag.tag), v: dec(Math.abs(p.tag.delta)) })
              : t("An Tagen mit „{tag}“ warst du ⌀ {v}★ besser drauf.", { tag: tagLabel(p.tag.tag), v: dec(p.tag.delta) })} />}
          </div>
        )}
      </>}
    </div>
  )
}

function Insight({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="lab-pop" style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", borderRadius: 12, background: "var(--surface-2)", fontSize: "0.8rem", lineHeight: 1.4 }}>
      <span>{emoji}</span><span>{text}</span>
    </div>
  )
}
