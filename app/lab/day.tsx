"use client"
// ── Tagesablauf: Morgen-Frage, Extra-Einnahmen, Beschwerden + Vermutung ──
// Logik in lib/labDay.ts – hier nur die Anzeige.
import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  FACES, FACE_LABELS, LIBRARY, SIDE_BY_ID, SIDE_EFFECTS, knownSides, intakeOn, todayIso, addDays, fmtDate, diffDays, extrasOn, extraLabel, extraEmoji,
  type LabState, type MorningEntry,
} from "@/lib/supplementLab"
import { SUSPECT_UNKNOWN, recentExtras, sidesOf, suspectOptions, suspectSummary, type ExtraInput } from "@/lib/labDay"
import { Btn, Card, FaceRow, Label, Segmented, Sheet, SideChips } from "./ui"
import { t, clock } from "@/lib/labI18n"

// ── Morgen-Frage ─────────────────────────────────────────────────────────────

/**
 * 5 große Gesichter: 1 Tipp speichert den Schlaf. Darunter dezent „Genauer“ → „Wie fit bist du gerade?“.
 * onDone kommt nach einer kurzen Bestätigung (bzw. nach der Fit-Antwort).
 */
export function MorningPanel({ entry, onSave, onDone, delay = 2500, size = 56 }: {
  entry?: MorningEntry; onSave: (v: { sleep?: number; fit?: number }) => void; onDone?: () => void; delay?: number; size?: number
}) {
  const [sleep, setSleep] = useState(entry?.schlaf)
  const [fit, setFit] = useState(entry?.fit)
  const [more, setMore] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const later = (ms: number) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => doneRef.current?.(), ms)
  }
  const pickSleep = (v: number) => {
    setSleep(v)
    onSave({ sleep: v })
    if (!more) later(delay)
  }
  const openMore = () => {
    if (timer.current) clearTimeout(timer.current)
    setMore(true)
  }
  const pickFit = (v: number) => {
    setFit(v)
    onSave({ fit: v })
    if (sleep != null) later(900)
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <FaceRow value={sleep} onPick={pickSleep} faces={FACES} labels={FACE_LABELS} size={size} />
      <div style={{ minHeight: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: "0.82rem", fontWeight: 800 }}>
        {sleep != null && <span className="lab-pop" style={{ color: "var(--accent)" }}>{t("✓ Gespeichert")}</span>}
        {!more && <button onClick={openMore} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", padding: "2px 4px" }}>{t("Genauer")} ›</button>}
      </div>
      {more && (
        <div className="lab-rise" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: "0.92rem", textAlign: "center" }}>{t("Wie fit bist du gerade?")}</div>
          <FaceRow value={fit} onPick={pickFit} faces={FACES} labels={FACE_LABELS} size={size - 8} />
          {sleep != null && fit == null && (
            <button onClick={() => doneRef.current?.()} style={{ alignSelf: "center", background: "none", border: "none", color: "var(--text-dim)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>{t("Überspringen")}</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tag wählen (heute / gestern / Datum) ────────────────────────────────────

function dayName(date: string, today: string) {
  return date === today ? t("Heute") : diffDays(date, today) === 1 ? t("Gestern") : fmtDate(date)
}

function DayPicker({ date, today, min, onChange }: { date: string; today: string; min?: string; onChange: (d: string) => void }) {
  const y = addDays(today, -1)
  const other = date !== today && date !== y
  const chip = (on: boolean): React.CSSProperties => ({
    padding: "7px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 800, color: "var(--text)", whiteSpace: "nowrap",
    border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)",
  })
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7 }}>
      <button className="lab-press" onClick={() => onChange(today)} style={chip(date === today)}>{t("Heute")}</button>
      <button className="lab-press" onClick={() => onChange(y)} style={chip(date === y)}>{t("Gestern")}</button>
      <label className="lab-press" style={{ ...chip(other), position: "relative", display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
        📅 {other ? fmtDate(date) : t("Anderer Tag")}
        <input type="date" value={date} max={today} min={min} aria-label={t("Anderer Tag")}
          onChange={e => { const v = e.target.value; if (v && v <= today) onChange(v) }}
          style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
      </label>
    </div>
  )
}

// ── Beschwerden + „Ich vermute: …“ ──────────────────────────────────────────

/** Beschwerde-Chips (1× leicht, 2× stark) und je Beschwerde optional „Ich vermute: …“. */
export function SidesWithSuspect({ s, date, value, suspect, onChange, onSuspect, compact }: {
  s: LabState; date: string; value: Record<string, number>; suspect: Record<string, string>
  onChange: (v: Record<string, number>) => void; onSuspect: (v: Record<string, string>) => void; compact?: boolean
}) {
  const known = knownSides(s, intakeOn(s, date)).map(id => SIDE_BY_ID[id]).filter(Boolean)
  const suggested = known.length ? known : SIDE_EFFECTS.slice(0, 6)
  const opts = useMemo(() => suspectOptions(s, date), [s, date])
  const picked = Object.keys(value).filter(id => value[id])
  const chip = (on: boolean): React.CSSProperties => ({
    padding: "6px 10px", borderRadius: 999, fontSize: "0.76rem", fontWeight: on ? 800 : 600, color: "var(--text)", whiteSpace: "nowrap",
    border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)",
  })
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SideChips value={value} onChange={onChange} suggested={suggested} all={SIDE_EFFECTS} compact={compact} />
      {picked.map(id => {
        const info = SIDE_BY_ID[id]
        const cur = suspect[id] ?? SUSPECT_UNKNOWN
        return (
          <div key={id} className="lab-rise" style={{ padding: "10px 12px", borderRadius: 16, background: "var(--surface-2)" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, marginBottom: 7 }}>{info?.emoji} {info?.label ?? id} · <span style={{ color: "var(--text-dim)" }}>{t("Ich vermute:")}</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {opts.map(o => (
                <button key={o.key} className="lab-press" onClick={() => onSuspect({ ...suspect, [id]: o.key })} style={chip(cur === o.key)}>{o.emoji} {o.name}</button>
              ))}
              <button className="lab-press" onClick={() => { const n = { ...suspect }; delete n[id]; onSuspect(n) }} style={chip(cur === SUSPECT_UNKNOWN)}>🤷 {t("weiß nicht")}</button>
            </div>
            {!opts.length && <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 6 }}>{t("An dem Tag ist noch keine Einnahme eingetragen.")}</div>}
          </div>
        )
      })}
    </div>
  )
}

// ── „➕ Zusätzlich genommen“ / „🤕 Beschwerde“ ────────────────────────────────

export type DayTab = "take" | "sides"

/** Kleine Liste der Extra-Einnahmen eines Tages (mit ✕ zum Entfernen). */
export function ExtraList({ s, date, onRemove }: { s: LabState; date: string; onRemove: (id: string) => void }) {
  const list = extrasOn(s, date)
  if (!list.length) return null
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {list.map(x => (
        <span key={x.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 6px 6px 11px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 800, background: "var(--accent-dim)", maxWidth: "100%" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{extraEmoji(x)} {extraLabel(x)}{x.dose ? ` · ${x.dose}` : ""}{x.at ? <span style={{ color: "var(--text-dim)", fontWeight: 600 }}> · {clock(x.at)}</span> : null}</span>
          <button onClick={() => onRemove(x.id)} aria-label={t("Entfernen")} className="lab-press" style={{ width: 22, height: 22, borderRadius: 999, border: "none", background: "var(--surface)", color: "var(--text-dim)", fontSize: "0.7rem", flexShrink: 0 }}>✕</button>
        </span>
      ))}
    </div>
  )
}

/**
 * Sheet für alles, was tagsüber passiert: spontane Einnahme oder Beschwerde – für heute, gestern oder einen anderen Tag.
 * fixedDate: Tag steht fest (z. B. aus dem Check-in eines vergangenen Tages).
 */
export function DaySheet({ s, tab: tab0 = "take", date: date0, fixedDate, onlyTake, z, onAdd, onRemove, onSides, onClose }: {
  s: LabState; tab?: DayTab; date?: string; fixedDate?: boolean; onlyTake?: boolean; z?: number
  onAdd: (date: string, item: ExtraInput, label: string) => void; onRemove: (date: string, id: string) => void
  onSides: (date: string, sides: Record<string, number>, suspect: Record<string, string>) => void; onClose: () => void
}) {
  const today = todayIso()
  const [tab, setTab] = useState<DayTab>(onlyTake ? "take" : tab0)
  const [date, setDate] = useState(date0 ?? today)
  const [q, setQ] = useState("")
  const init = useMemo(() => sidesOf(s, date), [date]) // eslint-disable-line react-hooks/exhaustive-deps
  const [sides, setSides] = useState(init.sides)
  const [suspect, setSuspect] = useState(init.suspect)
  useEffect(() => { setSides(init.sides); setSuspect(init.suspect) }, [init])

  // Schnellauswahl: zuletzt genutzt + eigene Supplements (ohne Doppelte). Was an dem Tag im Plan fällig ist (auch der Test),
  // fehlt hier – das wird in der Runde abgehakt, sonst zählte die Plan-Einnahme als „Extra“ und der Tag als gestört.
  const planned = useMemo(() => new Set(intakeOn(s, date)), [s, date])
  const quick = useMemo(() => {
    const out: { key: string; item: ExtraInput; label: string; emoji: string }[] = []
    const seen = new Set<string>()
    for (const x of s.supps) if (planned.has(x.id)) { seen.add(x.id); if (x.lib) seen.add(x.lib) }
    for (const r of recentExtras(s, 8)) {
      const k = r.lib ?? r.supp ?? r.key
      if (seen.has(k) || (r.supp && seen.has(r.supp))) continue
      seen.add(k)
      out.push({ key: r.key, item: { ...(r.lib ? { lib: r.lib } : {}), ...(r.supp ? { supp: r.supp } : {}), name: r.name }, label: r.name, emoji: r.emoji })
    }
    for (const x of s.supps) {
      if (seen.has(x.lib ?? x.id) || seen.has(x.id)) continue
      seen.add(x.lib ?? x.id)
      out.push({ key: x.id, item: { supp: x.id }, label: x.name, emoji: x.emoji })
    }
    return out.slice(0, 14)
  }, [s, planned])
  const ql = q.trim().toLowerCase()
  const hits = ql ? LIBRARY.filter(l => l.name.toLowerCase().includes(ql) || l.aliases.some(a => a.includes(ql))).slice(0, 10) : []
  const exact = !!ql && LIBRARY.some(l => l.name.toLowerCase() === ql)
  const add = (item: ExtraInput, label: string) => { onAdd(date, item, label); setQ("") }
  const chip: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999, border: "1px solid var(--border)",
    background: "var(--surface)", color: "var(--text)", fontWeight: 700, fontSize: "0.84rem", maxWidth: "100%",
  }
  const firstDay = s.startDate ? addDays(s.startDate, -30) : undefined

  return (
    <Sheet open onClose={onClose} z={z} title={tab === "take" ? t("➕ Zusätzlich genommen") : t("🤕 Beschwerde")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!onlyTake && <Segmented value={tab} onChange={setTab} options={[{ id: "take", label: t("➕ Eingenommen") }, { id: "sides", label: t("🤕 Beschwerde") }]} />}
        {fixedDate
          ? <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-dim)" }}>📅 {dayName(date, today)}</div>
          : <DayPicker date={date} today={today} min={firstDay} onChange={setDate} />}

        {tab === "take" ? <>
          <ExtraList s={s} date={date} onRemove={id => onRemove(date, id)} />
          {quick.length > 0 && (
            <div>
              <Label style={{ marginBottom: 8 }}>{t("Schnell eintragen")}</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {quick.map(x => (
                  <button key={x.key} className="lab-press" onClick={() => add(x.item, x.label)} style={chip}>
                    <span>{x.emoji}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.label}</span><span style={{ color: "var(--accent)", fontWeight: 900 }}>+</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("🔍 Suchen oder Namen eingeben …")} maxLength={60}
              onKeyDown={e => { if (e.key === "Enter" && ql) { if (hits[0] && hits[0].name.toLowerCase() === ql) add({ lib: hits[0].id }, hits[0].name); else add({ name: q.trim() }, q.trim()) } }}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 14, fontSize: "0.95rem" }} />
            {ql && (
              <div className="lab-rise" style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                {hits.map(l => (
                  <button key={l.id} className="lab-press" onClick={() => add({ lib: l.id }, l.name)} style={chip}><span>{l.emoji}</span>{l.name}<span style={{ color: "var(--accent)", fontWeight: 900 }}>+</span></button>
                ))}
                {!exact && <button className="lab-press" onClick={() => add({ name: q.trim() }, q.trim())} style={{ ...chip, border: "1px dashed var(--border)" }}>{t("+ „{name}“ eintragen", { name: q.trim() })}</button>}
              </div>
            )}
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.45 }}>{t("Auch außerhalb deines Plans – z. B. Vitamin D am Wochenende. Ich markiere solche Tage, damit der Vergleich fair bleibt.")}{planned.size > 0 && <> {t("Geplantes hakst du wie gewohnt ab – hier nur, was zusätzlich dazukam.")}</>}</div>
        </> : <>
          <SidesWithSuspect s={s} date={date} value={sides} suspect={suspect} onChange={setSides} onSuspect={setSuspect} />
          <Btn full onClick={() => { onSides(date, sides, suspect); onClose() }}>{Object.keys(sides).length ? t("Speichern") : t("✓ Keine Beschwerden")}</Btn>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.45 }}>{t("Bei anhaltenden Beschwerden ärztlich abklären.")}</div>
        </>}
      </div>
    </Sheet>
  )
}

// ── „Deine Vermutungen“ (Ergebnisse) ────────────────────────────────────────

export function SuspectCard({ s }: { s: LabState }) {
  const list = useMemo(() => suspectSummary(s), [s])
  if (!list.length) return null
  return (
    <Card className="lab-rise">
      <Label style={{ marginBottom: 4 }}>{t("🤔 Deine Vermutungen")}</Label>
      <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", marginBottom: 12 }}>{t("Was du bei Beschwerden vermutet hast – so siehst du, ob es sich wiederholt.")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.slice(0, 5).map(st => (
          <div key={st.key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ width: 36, height: 36, borderRadius: 12, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{st.emoji}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 900, fontSize: "0.92rem" }}>{st.name}</span>
              {st.sides.slice(0, 3).map(x => (
                <span key={x.id} style={{ display: "block", fontSize: "0.8rem", lineHeight: 1.4, marginTop: 2 }}>
                  <b>{x.n}×</b> {SIDE_BY_ID[x.id]?.emoji} {SIDE_BY_ID[x.id]?.label ?? x.id} <span style={{ color: "var(--text-dim)" }}>{t("an Tagen mit {name} – deine Vermutung", { name: st.name })}{x.strong ? t(" · {n}× stark", { n: x.strong }) : ""}</span>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.45, marginTop: 12 }}>
        {t("Nur deine Notizen, kein Beweis – bleibt auf deinem Gerät.")} {t("Bei anhaltenden Beschwerden ärztlich abklären.")}
      </div>
    </Card>
  )
}
