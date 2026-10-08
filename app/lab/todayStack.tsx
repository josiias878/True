"use client"
// ── Heute 2.0: feste, ruhige Bereiche unter der einen Hauptsache ──
// Reihenfolge: Mein Stack (+ spontan) · Kosten & Kolbi-Coach · Mein Zustand · Mein Weg · Community.
// Je eine schlanke Karte mit Überschrift und „›“ zur Detailebene. Logik steckt in lib/* – hier nur Anzeige.
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  FACES, LIB_BY_ID, LIB_SIDES, SIDE_BY_ID, addDays, checkinsIn, daySum, diffDays, extraKey, extrasOn, fmtDate, intakeOn, isHere, libOf,
  meanScore, phaseWindows, streak, suppColor,
  type LabState, type LibSupp, type MySupp,
} from "@/lib/supplementLab"
import { caffeineToday, recentExtras, type ExtraInput } from "@/lib/labDay"
import { costSummary, fmtEuro, monthlyCost } from "@/lib/labStock"
import { costCoach, type CoachAction } from "@/lib/labCoach"
import type { Stop } from "@/lib/labPath"
import { COMMUNITY_MIN, fetchOverview } from "@/lib/labCommunity"
import { labColor } from "@/lib/labSocial"
import * as socialApi from "@/lib/labSocialApi"
import type { SocialPost } from "@/lib/labSocialApi"
import { markSeen } from "@/lib/labNew"
import { t, dec, clock, isEn, LOCALE } from "@/lib/labI18n"
import { Btn, Sheet, haptic } from "./ui"
import { ExtraList } from "./day"
import { NewBadge } from "./newbadge"
import { Mascot } from "./mascot"
import { PublicAvatar, ago, decisionInfo, signed, useSocialOn } from "./social"

const NEW_ID = "today-stack"
const seen = () => markSeen(NEW_ID)

/** Kurzes „wofür“: zugelassener Claim, sonst der erste Satz des vorsichtigen Bibliothekstexts. */
export function purposeShort(lib: LibSupp | undefined): string {
  if (!lib) return t("Eigenes Mittel")
  if (lib.claim) return lib.claim
  return lib.effect.split(/[.!?]\s+|\s+[—–]\s+/)[0].replace(/[.;,]\s*$/, "")
}

// ── Gemeinsame Karte ──────────────────────────────────────────────────────────

function Section({ title, badge, onMore, moreLabel, children }: {
  title: React.ReactNode; badge?: React.ReactNode; onMore?: () => void; moreLabel?: string; children: React.ReactNode
}) {
  return (
    <section className="lab-card" style={{ padding: "4px 14px 14px", borderRadius: 22, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 46 }}>
        <h2 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: "1rem", fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>{title}{badge}</h2>
        {onMore && (
          <button onClick={() => { haptic(); seen(); onMore() }} aria-label={moreLabel} className="lab-press" style={{
            minWidth: 44, minHeight: 44, marginRight: -10, border: "none", background: "none", color: "var(--text-dim)", fontSize: "1.45rem", fontWeight: 700, lineHeight: 1,
          }}>›</button>
        )}
      </div>
      {children}
    </section>
  )
}

const dim: React.CSSProperties = { fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.4 }
const ellipsis: React.CSSProperties = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
const linkBtn: React.CSSProperties = {
  minHeight: 44, padding: "0 4px", border: "none", background: "none", color: "var(--accent)", fontWeight: 800, fontSize: "0.84rem", cursor: "pointer", textAlign: "left",
}

/** Stundenangabe für die Koffein-Faustregel: „14“ (+ „Uhr“ im Satz) bzw. „2 pm“. */
const hourLabel = (h: number) => isEn ? `${h % 12 || 12} ${h < 12 ? "am" : "pm"}` : String(h)

// ── 1 · Mein Stack heute ─────────────────────────────────────────────────────

export function StackSection({ s, today, onTake, onExtra, onExtraRemove, onOpenSupp, onVorrat, onAddMany, goTab }: {
  s: LabState; today: string
  onTake: (id: string) => void
  onExtra: (date: string, item: ExtraInput, label: string) => void; onExtraRemove: (date: string, id: string) => void
  onOpenSupp: (id: string) => void; onVorrat: () => void; onAddMany: () => void; goTab: (t: string) => void
}) {
  const [info, setInfo] = useState<string | null>(null)
  const wins = phaseWindows(s)
  const w = wins.find(x => today >= x.start && today <= x.end) ?? null
  const intake = intakeOn(s, today)
  const took = s.took[today] ?? []
  // Alles, was du gerade nimmst: heutiger Plan + Durchgehendes + Behaltenes (auch außerhalb von Stack-Phasen).
  // Bewusst pausiert (Auswasch/Beobachtung eines Tests, „noch nicht da“, Status Pause) → dezente Zeile; „Raus“ fehlt ganz.
  const pausedNow = (x: MySupp) => !isHere(x) || x.mode === "pause" || ((w?.kind === "washout" || w?.kind === "check") && w.suppId === x.id)
  const current = (x: MySupp) => s.verdicts[x.id]?.decision !== "drop" && (intake.includes(x.id) || x.mode === "konstant" || s.verdicts[x.id]?.decision === "keep")
  const inReset = w?.kind === "baseline"
  const rows = [
    ...intake.map(id => s.supps.find(x => x.id === id)).filter((x): x is MySupp => !!x),
    ...(inReset ? [] : s.supps.filter(x => !intake.includes(x.id) && current(x) && !pausedNow(x) && !libOf(x)?.weekly)),
  ]
  const paused = s.supps.filter(x => !rows.includes(x) && s.verdicts[x.id]?.decision !== "drop" && pausedNow(x)
    && (x.mode === "konstant" || s.verdicts[x.id]?.decision === "keep" || !isHere(x) || ((w?.kind === "washout" || w?.kind === "check") && w.suppId === x.id)))
  const rowIds = new Set(rows.map(x => x.id))
  const plannedLibs = new Set(rows.map(x => x.lib ?? x.id))
  const extras = extrasOn(s, today)
  const caf = caffeineToday(s, today)
  // Wartet noch auf seinen Test (nicht im heutigen Plan)
  const later = s.supps.filter(x => isHere(x) && x.mode === "test" && !rowIds.has(x.id) && !paused.includes(x) && !s.verdicts[x.id]
    && !wins.some(p => p.kind === "test" && p.suppId === x.id && p.end < today))

  // ＋ spontan: Kaffee, Alkohol und die 3 häufigsten Extras bzw. eigenen Mittel
  const coffee = s.supps.find(x => (x.lib ?? x.id) === "koffein")
  type Chip = { key: string; emoji: string; label: string; item: ExtraInput }
  // Ein Mittel nie zugleich im Stack und in „＋ spontan“: Steht Kaffee im Stack, wird er dort abgehakt
  const chips: Chip[] = [
    ...(coffee && rowIds.has(coffee.id) ? [] : [{ key: "koffein", emoji: "☕", label: t("Kaffee"), item: coffee ? { supp: coffee.id } : { lib: "koffein" } } as Chip]),
    { key: "n:alkohol", emoji: "🍷", label: t("Alkohol"), item: { name: "Alkohol", emoji: "🍷" } },
  ]
  const taken = new Set(chips.map(c => c.key))
  for (const r of recentExtras(s, 12)) {
    if (chips.length >= 5) break
    const k = r.lib ?? r.key
    if (taken.has(k) || taken.has(r.key) || (r.lib && plannedLibs.has(r.lib)) || (r.supp && rowIds.has(r.supp))) continue
    taken.add(k); taken.add(r.key)
    chips.push({ key: r.key, emoji: r.emoji, label: r.name, item: { ...(r.lib ? { lib: r.lib } : {}), ...(r.supp ? { supp: r.supp } : {}), name: r.name } })
  }
  for (const x of s.supps) {
    if (chips.length >= 5) break
    const k = x.lib ?? x.id
    if (taken.has(k) || rowIds.has(x.id) || plannedLibs.has(k) || !isHere(x) || libOf(x)?.rx || libOf(x)?.weekly) continue
    taken.add(k)
    chips.push({ key: k, emoji: x.emoji, label: x.name, item: { supp: x.id } })
  }
  const countOf = (c: Chip) => extras.filter(e => extraKey(e) === c.key || (c.key === "koffein" && !!coffee && e.supp === coffee.id)).length

  const pill: React.CSSProperties = { minHeight: 44, borderRadius: 999, fontWeight: 800, fontSize: "0.84rem", whiteSpace: "nowrap", flexShrink: 0 }
  const open = info ? s.supps.find(x => x.id === info) : undefined

  return (
    <Section title={t("Mein Stack heute")} badge={<NewBadge id={NEW_ID} />} onMore={() => goTab("meine")} moreLabel={t("Alle Supplements")}>
      {rows.length === 0 && (
        <div style={{ ...dim, padding: "2px 0 6px" }}>
          {!s.supps.length ? t("Noch nichts eingetragen – tipp unten mehrere Namen auf einmal ein.")
            : w?.kind === "baseline" ? t("Reset-Phase: heute bewusst nichts nehmen – so lerne ich dein Normal.")
            : t("Heute steht nichts auf dem Plan.")}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((x, i) => {
          const on = took.includes(x.id)
          const at = s.tookAt[today]?.[x.id]
          return (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, borderTop: i ? "1px solid var(--border)" : undefined, padding: "4px 0" }}>
              <button className="lab-press" onClick={() => { haptic(); seen(); setInfo(x.id) }} aria-label={t("{name}: wofür, Timing, Nebenwirkungen", { name: x.name })} style={{
                flex: 1, minWidth: 0, minHeight: 52, display: "flex", alignItems: "center", gap: 10, padding: "4px 0", border: "none", background: "none", color: "var(--text)", textAlign: "left",
              }}>
                <span aria-hidden style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem",
                  background: `color-mix(in srgb, ${suppColor(x)} 20%, var(--surface-2))` }}>{x.emoji}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ ...ellipsis, fontWeight: 800, fontSize: "0.94rem" }}>{x.name}</span>
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: "0.76rem", lineHeight: 1.35, color: "var(--text-dim)", fontWeight: 600 }}>{purposeShort(libOf(x))}</span>
                </span>
              </button>
              {on ? (
                <button className="lab-press" aria-pressed onClick={() => { haptic(8); onTake(x.id) }} aria-label={t("{name} genommen – rückgängig", { name: x.name })} style={{
                  ...pill, minWidth: 76, padding: "0 12px", border: "none", background: "var(--accent-dim)", color: "var(--accent)", fontVariantNumeric: "tabular-nums",
                }}>✓{at ? ` ${at}` : ""}</button>
              ) : (
                <button className="lab-press" aria-pressed={false} onClick={() => { haptic(12); seen(); onTake(x.id) }} style={{
                  ...pill, minWidth: 76, padding: "0 14px", border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text)",
                }}>{t("Genommen")}</button>
              )}
            </div>
          )
        })}
      </div>
      {later.length > 0 && (
        <button className="lab-press" onClick={() => goTab("meine")} style={{ ...linkBtn, color: "var(--text-dim)", fontWeight: 700, fontSize: "0.78rem", width: "100%", display: "block" }}>
          <span style={ellipsis}>🔬 {t("Später im Test: {names}", { names: later.map(x => x.name).join(", ") })} ›</span>
        </button>
      )}

      {paused.length > 0 && (
        <div style={{ ...dim, fontSize: "0.76rem", padding: "6px 0 2px" }}>
          <span style={ellipsis}>⏸️ {t("Pausiert: {names}", { names: paused.map(x => !isHere(x) ? t("{name} (noch nicht da)", { name: x.name }) : x.name).join(", ") })}</span>
        </div>
      )}
      {/* ＋ spontan */}
      <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <div style={{ fontSize: "0.74rem", fontWeight: 900, letterSpacing: ".04em", color: "var(--text-dim)", marginBottom: 8 }}>{t("＋ SPONTAN")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {chips.map(c => {
            const n = countOf(c)
            return (
              <button key={c.key} className="lab-press" onClick={() => {
                haptic(10); seen()
                onExtra(today, c.item, c.label)
              }} style={{
                ...pill, maxWidth: "100%", display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px",
                border: n ? "1.5px solid var(--accent)" : "1px solid var(--border)", background: n ? "var(--accent-dim)" : "var(--surface)", color: "var(--text)",
              }}>
                <span aria-hidden>{c.emoji}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{c.label}</span>
                {n > 0 ? <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--accent)" }}>✓{n > 1 ? ` ${n}` : ""}</span> : <span aria-hidden style={{ color: "var(--accent)", fontWeight: 900 }}>+</span>}
              </button>
            )
          })}
        </div>
        {caf && (
          <div role="status" style={{ marginTop: 10, padding: "10px 12px", borderRadius: 14, background: "var(--surface-2)" }}>
            <div style={{ fontWeight: 800, fontSize: "0.86rem", lineHeight: 1.35 }}>
              {t("☕ {time} · wirkt grob noch bis ca. {from}–{to} Uhr", { time: caf.at, from: hourLabel(caf.fromH), to: hourLabel(caf.toH) })}
            </div>
            <div style={{ ...dim, fontSize: "0.72rem", marginTop: 2 }}>
              {caf.late ? t("Später am Tag kann Koffein bei manchen den Schlaf stören.") + " " : ""}{t("Faustregel: Halbwertszeit bei vielen ca. 5 h, je nach Mensch 3–7 h.")}
            </div>
          </div>
        )}
        {extras.length > 0 && <div style={{ marginTop: 10 }}><ExtraList s={s} date={today} onRemove={id => onExtraRemove(today, id)} /></div>}
        <button className="lab-press" onClick={() => { seen(); onAddMany() }} style={{ ...linkBtn, marginTop: 4 }}>{t("＋ Mehrere auf einmal eintragen")}</button>
      </div>

      {open && <SuppInfoSheet s={s} x={open} onClose={() => setInfo(null)} onVorrat={() => { setInfo(null); onVorrat() }} onOpen={() => { setInfo(null); onOpenSupp(open.id) }} />}
    </Section>
  )
}

/** Sagt der Bibliothekstext im Kern dasselbe wie der Claim? (Dann nicht doppelt zeigen.) */
function sameText(claim: string | undefined, effect: string) {
  if (!claim) return false
  const words = claim.toLowerCase().match(/[\p{L}]{5,}/gu) ?? []
  const low = effect.toLowerCase()
  return words.length > 0 && words.filter(w => low.includes(w)).length / words.length >= 0.7
}

/** Detail-Ebene je Supplement: wofür (lang), Timing, Vorsicht, mögliche Nebenwirkungen, Kosten. */
function SuppInfoSheet({ s, x, onClose, onVorrat, onOpen }: { s: LabState; x: MySupp; onClose: () => void; onVorrat: () => void; onOpen: () => void }) {
  const lib = libOf(x)
  const sides = (lib ? LIB_SIDES[lib.id] ?? [] : []).map(id => SIDE_BY_ID[id]).filter(Boolean)
  const cost = monthlyCost(x)
  const head = (txt: string) => <div style={{ fontSize: "0.72rem", fontWeight: 900, letterSpacing: ".05em", color: "var(--text-dim)", margin: "14px 0 5px" }}>{txt}</div>
  const body: React.CSSProperties = { fontSize: "0.9rem", lineHeight: 1.5 }
  return (
    <Sheet open onClose={onClose} title={`${x.emoji} ${x.name}`}>
      {head(t("WOFÜR"))}
      {lib ? <>
        {lib.claim && <div style={{ ...body, fontWeight: 800 }}>{lib.claim}</div>}
        {!sameText(lib.claim, lib.effect) && <div style={{ ...body, color: lib.claim ? "var(--text-dim)" : undefined, marginTop: lib.claim ? 4 : 0 }}>{lib.effect}</div>}
      </> : <div style={body}>{t("Eigenes Mittel – dazu habe ich keine Infos. Teste es, dann siehst du, was es bei dir macht.")}</div>}

      {(x.time || lib?.timing) && <>
        {head(t("TIMING"))}
        {x.time && <div style={{ ...body, fontWeight: 800 }}>{t("Deine Zeit: {time}", { time: clock(x.time) })}</div>}
        {lib?.timing && <div style={body}>{lib.timing}</div>}
      </>}

      {lib?.caution && <>
        {head(t("VORSICHT"))}
        <div style={{ ...body, padding: "10px 12px", borderRadius: 14, background: "var(--warning-dim, var(--surface-2))" }}>⚠️ {lib.caution}</div>
      </>}

      {sides.length > 0 && <>
        {head(t("MÖGLICHE NEBENWIRKUNGEN"))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {sides.map(sd => <span key={sd.id} style={{ padding: "6px 10px", borderRadius: 999, background: "var(--surface-2)", fontSize: "0.8rem", fontWeight: 700 }}>{sd.emoji} {sd.label}</span>)}
        </div>
        <div style={{ ...dim, fontSize: "0.72rem", marginTop: 6 }}>{t("Bei manchen möglich – keine vollständige Liste. Bei anhaltenden Beschwerden ärztlich abklären.")}</div>
      </>}

      {head(t("KOSTEN"))}
      {cost != null
        ? <div style={{ ...body, fontWeight: 800 }}>{t("ca. {price} pro Monat", { price: fmtEuro(cost) })} <span style={{ ...dim, fontWeight: 600 }}>{t("· aus deinem Vorrat")}</span></div>
        : lib?.rx ? <div style={dim}>{t("Verschrieben – Kosten rechne ich hier nicht mit.")}</div>
        : <button className="lab-press" onClick={onVorrat} style={linkBtn}>{t("Preis im Vorrat eintragen ›")}</button>}

      <Btn variant="soft" full onClick={onOpen} style={{ marginTop: 18 }}>{t("Im Lab ansehen ›")}</Btn>
      <div style={{ ...dim, fontSize: "0.7rem", marginTop: 12 }}>{t("Kein Medizinprodukt, keine Diagnose. Bei Beschwerden, Schwangerschaft oder Medikamenten vorher mit Ärztin, Arzt oder Apotheke sprechen.")}</div>
    </Sheet>
  )
}

// ── 2 · Kosten & Kolbi-Coach ────────────────────────────────────────────────

export function CostSection({ s, today, onVorrat, onAction }: { s: LabState; today: string; onVorrat: () => void; onAction: (a: CoachAction, id: string) => void }) {
  const cs = useMemo(() => costSummary(s, today), [s, today])
  const cc = useMemo(() => costCoach(s, today), [s, today])
  if (!s.supps.length) return null
  return (
    <Section title={t("Kosten & Kolbi-Coach")} onMore={onVorrat} moreLabel={t("Vorrat & Preise")}>
      {cs.items.length > 0 ? (
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "2px 8px" }}>
          <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-dim)" }}>{t("Dein Stack:")}</span>
          <span style={{ fontSize: "1.35rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{t("ca. {price}/Monat", { price: fmtEuro(cs.total) })}</span>
          {cs.missing.length > 0 && <span style={{ ...dim, fontSize: "0.74rem" }}>{cs.missing.length === 1 ? t("· 1 ohne Preis") : t("· {n} ohne Preis", { n: cs.missing.length })}</span>}
        </div>
      ) : (
        <button className="lab-press" onClick={onVorrat} style={{ ...linkBtn, color: "var(--text)", fontWeight: 700, width: "100%" }}>
          💶 {t("Preise eintragen, dann rechne ich mit.")} <span style={{ color: "var(--accent)", fontWeight: 800 }}>{t("Zum Vorrat ›")}</span>
        </button>
      )}
      {cs.savedMonthly > 0 && <div style={{ ...dim, marginTop: 2 }}>{t("✂️ Gespart: {price}/Monat durch Aussortiertes", { price: fmtEuro(cs.savedMonthly) })}</div>}
      {cc && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 10, padding: "10px 12px", borderRadius: 16, background: "var(--surface-2)" }}>
          <span aria-hidden style={{ flexShrink: 0, marginTop: 2 }}><Mascot mood="think" size={30} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.45 }}>{cc.text}</div>
            {cc.action && <Btn variant="soft" onClick={() => onAction(cc.action!.action, "cost-coach")} style={{ marginTop: 8, minHeight: 44, padding: "8px 14px", fontSize: "0.82rem", borderRadius: 12 }}>{cc.action.label}</Btn>}
          </div>
        </div>
      )}
    </Section>
  )
}

// ── 3 · Mein Zustand ───────────────────────────────────────────────────────────

export function StateSection({ s, today, onOpen }: { s: LabState; today: string; onOpen: () => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const vals = days.map(d => s.checkins[d] ? daySum(s.checkins[d]) : null)
  const have = vals.filter((v): v is number => v != null)
  const avg = have.length ? have.reduce((a, b) => a + b, 0) / have.length : null
  const base = phaseWindows(s).find(p => p.kind === "baseline" && p.end < today)
  const norm = base ? meanScore(checkinsIn(s, base)) : null
  const c = s.checkins[today]
  const sleep = s.morning?.[today]?.schlaf
  const H = 44
  return (
    <Section title={t("Mein Zustand")} onMore={onOpen} moreLabel={t("Verlauf ansehen")}>
      <button className="lab-press" onClick={() => { seen(); onOpen() }} aria-label={t("Verlauf ansehen")} style={{
        width: "100%", display: "flex", alignItems: "flex-end", gap: 14, padding: 0, border: "none", background: "none", color: "var(--text)", textAlign: "left",
      }}>
        <span style={{ flexShrink: 0, minWidth: 92 }}>
          <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 800, color: "var(--text-dim)" }}>{t("Heute")}</span>
          {c ? (
            <span style={{ display: "block", fontSize: "1.35rem", fontWeight: 900, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{FACES[Math.round(daySum(c)) - 1]} {dec(daySum(c), 1)}★</span>
          ) : sleep != null ? (
            <span style={{ display: "block", fontSize: "1.05rem", fontWeight: 900, whiteSpace: "nowrap" }}>🌙 {FACES[sleep - 1]}</span>
          ) : (
            <span style={{ display: "block", fontSize: "0.84rem", fontWeight: 700, color: "var(--text-dim)", lineHeight: 1.3 }}>{t("noch kein Check-in")}</span>
          )}
          {avg != null && <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-dim)", marginTop: 2, whiteSpace: "nowrap" }}>{t("Ø 7 Tage {v}★", { v: dec(avg, 1) })}{norm != null ? ` · ${t("Normal {v}★", { v: dec(norm, 1) })}` : ""}</span>}
        </span>
        <span aria-hidden style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, alignItems: "end" }}>
          {days.map((d, i) => {
            const v = vals[i]
            const isToday = d === today
            const [y, m, dd] = d.split("-").map(Number)
            return (
              <span key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ width: "100%", maxWidth: 18, height: H, display: "flex", alignItems: "flex-end" }}>
                  <span style={{
                    width: "100%", borderRadius: 6, height: v != null ? 6 + ((v - 1) / 4) * (H - 6) : 4,
                    background: v == null ? "var(--border)" : isToday ? "var(--accent)" : "color-mix(in srgb, var(--accent) 42%, var(--surface-2))",
                  }} />
                </span>
                <span style={{ fontSize: "0.64rem", fontWeight: isToday ? 900 : 700, color: isToday ? "var(--text)" : "var(--text-dim)" }}>
                  {new Date(y, m - 1, dd).toLocaleDateString(LOCALE, { weekday: "narrow" })}
                </span>
              </span>
            )
          })}
        </span>
      </button>
    </Section>
  )
}

// ── 4 · Mein Weg ─────────────────────────────────────────────────────────────

export function WaySection({ s, today, stops, onOpen }: { s: LabState; today: string; stops: Stop[]; onOpen: () => void }) {
  const wins = phaseWindows(s)
  const w = wins.find(x => today >= x.start && today <= x.end) ?? null
  const first = wins[0]
  const st = streak(s)
  const day = w ? diffDays(w.start, today) + 1 : 0
  const name = w?.suppId ? s.supps.find(x => x.id === w.suppId)?.name : undefined
  const label = !w ? (first && today < first.start ? t("Startet am {date}", { date: fmtDate(first.start) }) : t("Gerade kein Test"))
    : w.kind === "baseline" ? (w.open ? t("Reset · Tag {n}", { n: day }) : t("Reset · Tag {n} von {total}", { n: day, total: w.days }))
    : w.kind === "test" ? (w.open ? t("{name}-Test · Tag {n}", { name: name ?? "", n: day }) : t("{name}-Test · Tag {n} von {total}", { name: name ?? "", n: day, total: w.days }))
    : w.kind === "stack" ? t("Dein Stack · Tag {n}", { n: day })
    : w.kind === "check" ? t("Beobachtung · Tag {n}", { n: day })
    : t("Pause · Tag {n}", { n: day })
  const progress = w && !w.open && (w.kind === "test" || w.kind === "baseline") ? Math.min(1, day / w.days) : null
  const result = stops.find(x => x.kind === "result")
  const next = result ? (result.date === today ? t("🎁 Ergebnis heute") : t("🎁 Ergebnis am {date}", { date: fmtDate(result.date) })) : null
  return (
    <Section title={t("Mein Weg")} onMore={onOpen} moreLabel={t("Deinen Weg ansehen")}>
      <button className="lab-press" onClick={() => { seen(); onOpen() }} style={{ width: "100%", padding: 0, border: "none", background: "none", color: "var(--text)", textAlign: "left" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: "0.88rem", fontWeight: 800 }}>
          <span style={{ whiteSpace: "nowrap" }}><span style={{ filter: st ? undefined : "grayscale(1)" }}>🔥</span> {st === 1 ? t("1 Tag Serie") : t("{n} Tage Serie", { n: st })}</span>
          <span aria-hidden style={{ color: "var(--text-dim)" }}>·</span>
          <span style={{ minWidth: 0 }}>{label}</span>
        </span>
        {progress != null && (
          <span style={{ display: "block", height: 8, borderRadius: 4, background: "var(--surface-2)", marginTop: 8, overflow: "hidden" }}>
            <span style={{ display: "block", width: `${Math.max(6, progress * 100)}%`, height: "100%", background: "var(--lab-grad)", borderRadius: 4 }} />
          </span>
        )}
        {next && <span style={{ display: "block", ...dim, fontWeight: 700, marginTop: 6 }}>{next}</span>}
      </button>
    </Section>
  )
}

// ── 5 · Community ────────────────────────────────────────────────────────────

type Overview = { total: number; libs: Record<string, { n: number; keepPct: number | null }> }

/** Erst laden, wenn der Bereich in die Nähe des Bildschirms kommt. */
function useNear<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    if (near) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setNear(true); io.disconnect() } }, { rootMargin: "300px" })
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  return [ref, near]
}

export function CommunitySection({ s, onDiscover, onOpenLab }: { s: LabState; onDiscover: () => void; onOpenLab: (libId: string) => void }) {
  const social = useSocialOn()
  const [ref, near] = useNear<HTMLDivElement>()
  const [posts, setPosts] = useState<SocialPost[] | null | "loading">("loading")
  const [ov, setOv] = useState<Overview | null | "loading">("loading")
  const myLibs = useMemo(() => new Set(s.supps.map(x => x.lib).filter((v): v is string => !!v)), [s.supps])

  // Beiträge NUR mit Social-Einwilligung – sonst kein Server-Aufruf
  useEffect(() => {
    if (!near || !social) return
    let on = true
    ;(async () => {
      try {
        const a = await socialApi.feed("following")
        let list = a?.posts ?? []
        if (list.length < 3) {
          const b = await socialApi.feed("discover")
          list = [...list, ...(b?.posts ?? []).filter(p => myLibs.has(p.lib))]
        }
        if (!a && list.length === 0) { if (on) setPosts(null); return }
        const uniq = [...new Map(list.map(p => [p.id, p])).values()].filter(p => LIB_BY_ID[p.lib])
          .sort((x, y) => Date.parse(y.createdAt) - Date.parse(x.createdAt)).slice(0, 3)
        if (on) setPosts(uniq)
      } catch { if (on) setPosts(null) }
    })()
    return () => { on = false }
  }, [near, social, myLibs])
  // „Das testen gerade viele“ aus den anonymen Statistiken
  useEffect(() => {
    if (!near) return
    let on = true
    fetchOverview().then(v => { if (on) setOv(v) }).catch(() => { if (on) setOv(null) })
    return () => { on = false }
  }, [near])

  const pick = ov && ov !== "loading" ? Object.entries(ov.libs ?? {})
    .filter(([id, v]) => { const l = LIB_BY_ID[id]; return !!l && !l.rx && l.category !== "Peptide" && !myLibs.has(id) && typeof v?.n === "number" && v.n >= COMMUNITY_MIN })
    .sort((a, b) => b[1].n - a[1].n)[0] : undefined
  const pickLib = pick ? LIB_BY_ID[pick[0]] : undefined

  const postsOk = social && Array.isArray(posts)
  // Fehler still: ohne Beiträge (Einwilligung an, aber Fehler) und ohne Vorschlag → Bereich ausblenden
  const hidden = near && social && posts === null && ov !== "loading" && !pickLib
  if (hidden) return <div ref={ref} />

  return (
    <div ref={ref}>
      <Section title={t("Community")} onMore={onDiscover} moreLabel={t("Entdecken öffnen")}>
        {!social ? (
          <button className="lab-press" onClick={() => { seen(); onDiscover() }} style={{
            width: "100%", minHeight: 52, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 16, border: "none",
            background: "var(--surface-2)", color: "var(--text)", textAlign: "left",
          }}>
            <span aria-hidden style={{ fontSize: "1.3rem" }}>👥</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: "0.88rem", fontWeight: 800, lineHeight: 1.35 }}>{t("Sieh, was andere mit deinem Stack erleben")}</span>
            <span aria-hidden style={{ color: "var(--text-dim)", fontWeight: 800 }}>›</span>
          </button>
        ) : posts === "loading" && near ? (
          <div className="lab-shine" style={{ height: 56, borderRadius: 14, background: "linear-gradient(90deg, var(--surface-2), var(--surface), var(--surface-2))" }} />
        ) : postsOk && (posts as SocialPost[]).length === 0 ? (
          <div style={{ ...dim, padding: "2px 0 4px" }}>{t("Noch keine neuen Beiträge aus deinen Labs.")}</div>
        ) : postsOk ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {(posts as SocialPost[]).map((p, i) => {
              const lib = LIB_BY_ID[p.lib]
              const d = decisionInfo(p.decision)
              return (
                <button key={p.id} className="lab-press" onClick={() => { seen(); onDiscover() }} style={{
                  minHeight: 56, display: "flex", alignItems: "center", gap: 10, padding: "6px 0", border: "none", borderTop: i ? "1px solid var(--border)" : "none",
                  background: "none", color: "var(--text)", textAlign: "left", width: "100%",
                }}>
                  <PublicAvatar avatar={p.author?.avatar} size={34} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...ellipsis, fontWeight: 800, fontSize: "0.86rem" }}>{p.author?.name}</span>
                    <span style={{ ...ellipsis, fontSize: "0.76rem", color: "var(--text-dim)", fontWeight: 700 }}>
                      <span aria-hidden style={{ display: "inline-block", width: 7, height: 7, borderRadius: 99, background: labColor(lib), marginRight: 5, verticalAlign: "middle" }} />
                      {lib?.name} · {d.emoji} {d.label} · {signed(p.delta)}★
                    </span>
                  </span>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-dim)", flexShrink: 0 }}>{ago(p.createdAt)}</span>
                </button>
              )
            })}
          </div>
        ) : null}
        {pickLib && pick && (
          <button className="lab-press" onClick={() => { seen(); onOpenLab(pickLib.id) }} style={{
            width: "100%", minHeight: 48, marginTop: 8, display: "flex", alignItems: "center", gap: 8, padding: "6px 0 0", border: "none",
            borderTop: "1px solid var(--border)", background: "none", color: "var(--text)", textAlign: "left",
          }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: "0.82rem", fontWeight: 700, lineHeight: 1.35 }}>
              <span style={{ color: "var(--text-dim)" }}>{t("Das testen gerade viele:")}</span> {pickLib.emoji} <b>{pickLib.name}</b> <span style={{ color: "var(--text-dim)" }}>{t("· {n} Tests", { n: pick[1].n })}</span>
            </span>
            <span aria-hidden style={{ color: "var(--text-dim)", fontWeight: 800 }}>›</span>
          </button>
        )}
      </Section>
    </div>
  )
}
