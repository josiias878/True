"use client"
// ── Ich: Avatar (Kolbi) + generiertes Pseudonym + Supplement-Zeugnis, darunter wenige Knöpfe ──
import React, { useMemo } from "react"
import { diffDays, levelFor, streak, type LabState } from "@/lib/supplementLab"
import { FACT_COUNT, learnedFacts } from "@/lib/labKnowledge"
import { avatarBg, pseudonym, reportCard, socialSeed, type GradeKind } from "@/lib/labSocial"
import { DemoBadge, haptic } from "./ui"
import { Mascot } from "./mascot"
import { NewBadge } from "./newbadge"
import { t, isEn } from "@/lib/labI18n"

export type MeView = "auswertung" | "album" | "kolbi"

/** Kolbi im Marken-Kreis – Variante je nach Serie (leuchtet ab 3, Sonnenbrille ab 7). */
export function Avatar({ s, size = 96 }: { s: LabState; size?: number }) {
  const seed = useMemo(socialSeed, [])
  const st = streak(s)
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: avatarBg(seed), display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden", flexShrink: 0, boxShadow: "0 10px 30px rgba(46,204,138,.25)" }}>
      <div style={{ marginBottom: -size * 0.06 }}><Mascot mood="happy" size={size * 0.86} glow={st >= 3} accessory={st >= 7 ? "shades" : null} /></div>
    </div>
  )
}

export function usePseudonym() {
  return useMemo(() => pseudonym(socialSeed(), isEn), [])
}

// Text immer gut lesbar (var(--text)/--text-dim); Farbe nur als Punkt + Rahmen
const GRADE: Record<GradeKind, { label: string; bg: string; fg: string; dot?: string }> = {
  keep:     { label: t("Behalten"),    bg: "var(--accent-dim)",  fg: "var(--text)", dot: "var(--accent)" },
  maybe:    { label: t("Vielleicht"),  bg: "var(--warning-dim)", fg: "var(--text)", dot: "var(--warning)" },
  drop:     { label: t("Weggelassen"), bg: "var(--surface-2)",   fg: "var(--text-dim)" },
  running:  { label: t("Läuft"),       bg: "var(--surface-2)",   fg: "var(--text)" },
  constant: { label: t("Durchgehend"), bg: "var(--surface-2)",   fg: "var(--text-dim)" },
  open:     { label: t("Noch offen"),  bg: "var(--surface-2)",   fg: "var(--text-dim)" },
  away:     { label: t("Nicht da"),    bg: "var(--surface-2)",   fg: "var(--text-dim)" },
  paused:   { label: t("Pausiert"),    bg: "var(--surface-2)",   fg: "var(--text-dim)" },
}

export function MeHome({ s, today, tipCount, onView, onSettings, onOpenLab, onAllLabs, footer }: {
  s: LabState; today: string; tipCount: number
  onView: (v: MeView) => void; onSettings: () => void; onOpenLab: (suppId: string) => void; onAllLabs: () => void; footer?: React.ReactNode
}) {
  const name = usePseudonym()
  const lvl = levelFor(s.xp)
  const st = streak(s)
  const grades = reportCard(s, today)
  const tests = Object.keys(s.verdicts).length
  const labDays = s.startDate ? Math.max(0, diffDays(s.startDate, today) + 1) : 0
  const facts = learnedFacts(s).length
  const stat = (v: React.ReactNode, l: string) => (
    <div className="lab-card" style={{ padding: "12px 6px", textAlign: "center", borderRadius: 18 }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>{v}</div>
      <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-dim)" }}>{l}</div>
    </div>
  )
  const btn = (emoji: string, label: string, sub: string, onClick: () => void, dot?: boolean, badge?: React.ReactNode) => (
    <button onClick={() => { haptic(); onClick() }} className="lab-press lab-card" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "14px 14px 13px", textAlign: "left", color: "var(--text)", borderRadius: 18, minWidth: 0 }}>
      <span style={{ fontSize: "1.4rem", lineHeight: 1.1 }}>{emoji}</span>
      <span style={{ fontWeight: 900, fontSize: "0.95rem", marginTop: 6, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)", lineHeight: 1.3, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>
      {dot && <span aria-hidden style={{ position: "absolute", top: 12, right: 12, width: 9, height: 9, borderRadius: 999, background: "var(--accent)" }} />}
      {badge && <span style={{ position: "absolute", top: 12, right: 12 }}>{badge}</span>}
    </button>
  )
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {s.demo && <div style={{ display: "flex", justifyContent: "flex-end" }}><DemoBadge /></div>}
      <div className="lab-rise" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingTop: s.demo ? 0 : 12 }}>
        <Avatar s={s} />
        <div style={{ fontSize: "1.5rem", fontWeight: 900, marginTop: 6 }}>{name}</div>
        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-dim)" }}>{t("Pseudonym · niemand sieht deinen Namen")}</div>
        <div style={{ fontSize: "0.76rem", fontWeight: 800, padding: "4px 10px", borderRadius: 999, background: "var(--surface-2)", marginTop: 2 }}>{lvl.emoji} {lvl.name} · {s.xp} XP</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {stat(tests, tests === 1 ? t("Test fertig") : t("Tests fertig"))}
        {stat(labDays, t("Lab-Tage"))}
        {stat(<>🔥 {st}</>, t("Serie"))}
      </div>

      <div className="lab-card lab-rise" style={{ padding: "14px 16px", borderRadius: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "var(--text-dim)" }}>{t("Mein Supplement-Zeugnis")}</span>
          {grades.length > 6 && <button onClick={onAllLabs} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>{t("Alle {n} ›", { n: grades.length })}</button>}
        </div>
        {grades.length === 0 && <div style={{ fontSize: "0.86rem", color: "var(--text-dim)", padding: "6px 0" }}>{t("Noch keine Supplements.")}</div>}
        {grades.slice(0, 6).map(g => {
          const c = GRADE[g.kind]
          return (
            <button key={g.supp.id} onClick={() => onOpenLab(g.supp.id)} className="lab-press" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, padding: "9px 0", background: "none", border: "none", color: "var(--text)", textAlign: "left" }}>
              <span style={{ fontSize: "1.1rem" }}>{g.supp.emoji}</span>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.supp.name}</span>
              <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.74rem", fontWeight: 900, padding: "4px 10px", borderRadius: 999, background: c.bg, color: c.fg, border: c.dot ? `1px solid ${c.dot}` : "1px solid transparent" }}>
                {c.dot && <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: c.dot }} />}
                {g.kind === "running" && g.day ? t("Läuft · Tag {n}", { n: g.day }) : c.label}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {btn("📊", t("Meine Auswertung"), t("Kurven, Muster, Verlauf"), () => onView("auswertung"), false, <NewBadge id="alcohol-pattern" />)}
        {btn("📚", t("Wissens-Album"), t("{n} von {total} entdeckt", { n: facts, total: FACT_COUNT }), () => onView("album"))}
        {btn("🧪", t("Kolbi & Hilfe"), tipCount ? (tipCount === 1 ? t("1 Tipp für dich") : t("{n} Tipps für dich", { n: tipCount })) : t("Tipps, Abzeichen, Fragen"), () => onView("kolbi"), tipCount > 0)}
        {btn("⚙️", t("Einstellungen"), t("Erinnerungen, Daten, Sprache"), onSettings)}
      </div>
      {footer}
    </div>
  )
}
