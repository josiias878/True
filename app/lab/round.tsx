"use client"
// ── Tagesrunde: Kolbi führt Schritt für Schritt durch alles, was gerade dran ist ──
import React, { useEffect, useRef, useState } from "react"
import {
  FACES, SIDE_BY_ID, DIM_BY_ID,
  intakeOn, phaseWindows, addDays, signal, testResult, suppColor, streak, timeTip, relMin, suppMinutes, extrasOn,
  type LabState, type CheckIn, type Scores, type Decision, type Dim,
} from "@/lib/supplementLab"
import { eveningDims, morningDue, morningAnswered, sidesOf, type ExtraInput } from "@/lib/labDay"
import { Btn, Stars, TagChips } from "./ui"
import { DaySheet, ExtraList, MorningPanel, SidesWithSuspect } from "./day"
import { KolbiTip, Mascot } from "./mascot"
import { FACT_COUNT, nextFact, type Fact } from "@/lib/labKnowledge"
import { t, dec, clock } from "@/lib/labI18n"

export type RoundStep =
  | { kind: "morning" }
  | { kind: "take"; id: string }
  | { kind: "checkin"; date?: string }
  | { kind: "sides" }
  | { kind: "reveal"; suppId: string }

/** Einnahmen, die bis ca. 90 Min. von jetzt fällig sind (Tagesrhythmus ab Aufstehzeit). */
function dueIntakes(s: LabState, today: string, now: Date) {
  const took = s.took[today] ?? []
  const nowRel = relMin(now.getHours() * 60 + now.getMinutes(), s.settings)
  return intakeOn(s, today).filter(id => !took.includes(id) && suppMinutes(id, s) <= nowRel + 90)
}

export function roundSteps(s: LabState, today: string, now: Date, checkinLocked: boolean): RoundStep[] {
  if (!s.startDate || today < (phaseWindows(s)[0]?.start ?? today)) return []
  // Gestern vergessen? Dann zuerst nachtragen (zählt sonst in der Auswertung als Lücke)
  const y = addDays(today, -1)
  const catchUp: RoundStep[] = !s.checkins[y] && y >= (phaseWindows(s)[0]?.start ?? today) ? [{ kind: "checkin", date: y }] : []
  // Morgen-Frage (Schlaf) zuerst – nur im Morgen-Fenster, danach fragt der Abend-Check-in den Schlaf mit
  const morning: RoundStep[] = morningDue(s, today, now) ? [{ kind: "morning" }] : []
  const steps: RoundStep[] = [...morning, ...catchUp, ...dueIntakes(s, today, now).map(id => ({ kind: "take" as const, id }))]
  if (!s.checkins[today] && !checkinLocked) {
    steps.push({ kind: "checkin" })
    // Beschwerden an jedem Tag anbieten – „Keine Beschwerden“ ist 1 Tipp
    steps.push({ kind: "sides" })
  }
  for (const w of phaseWindows(s)) {
    if (w.kind === "test" && w.suppId && w.end < today && !s.verdicts[w.suppId]) steps.push({ kind: "reveal", suppId: w.suppId })
  }
  return steps
}

/** Morgen-Schritt erzwingen (Benachrichtigung ?morning=1), solange der Schlaf für heute noch fehlt. */
export function withMorning(s: LabState, today: string, steps: RoundStep[]): RoundStep[] {
  if (steps.some(x => x.kind === "morning") || morningAnswered(s, today) || s.checkins[today]?.scores.schlaf != null) return steps
  return [{ kind: "morning" }, ...steps]
}

/** Tages-Fortschritt für Kolbis Füllstand: erledigte Einnahmen + Check-in. */
export function dayProgress(s: LabState, today: string) {
  const intake = intakeOn(s, today)
  const took = (s.took[today] ?? []).filter(id => intake.includes(id)).length
  const total = intake.length + 1
  return (took + (s.checkins[today] ? 1 : 0)) / total
}

const DECISIONS: { id: Decision; emoji: string; label: string }[] = [
  { id: "keep", emoji: "💚", label: t("Behalten") },
  { id: "maybe", emoji: "🤔", label: t("Vielleicht") },
  { id: "drop", emoji: "✂️", label: t("Raus") },
]
const fmt = (n: number) => dec(n, 1)

export function DailyRound({ s, today, steps, onTake, onCheckin, onVerdict, onLearn, onClose, onMorning, onExtra, onExtraRemove }: {
  s: LabState; today: string; steps: RoundStep[]
  onTake: (id: string) => void; onCheckin: (c: CheckIn) => void; onVerdict: (id: string, d: Decision) => void
  onLearn: (factId: string) => void; onClose: () => void
  onMorning: (v: { sleep?: number; fit?: number }) => void
  onExtra: (date: string, item: ExtraInput, label: string) => void; onExtraRemove: (date: string, id: string) => void
}) {
  // Nur die Morgen-Frage (z. B. aus der Morgen-Benachrichtigung)? Dann ohne „Alles erledigt“-Bildschirm schließen.
  const onlyMorning = steps.every(x => x.kind === "morning")
  const [fact] = useState<Fact | null>(() => onlyMorning ? null : nextFact(s))
  const [i, setI] = useState(0)
  const [scores, setScores] = useState<Scores>({})
  const [sides, setSides] = useState<Record<string, number>>(() => sidesOf(s, today).sides)
  const [suspect, setSuspect] = useState<Record<string, string>>(() => sidesOf(s, today).suspect)
  // Störfaktoren („War heute was anders?“) – optional, gespeichert als deutsche Werte
  const [tags, setTags] = useState<string[]>([])
  const [flood, setFlood] = useState(true)
  const step = steps[i]
  const done = i >= steps.length

  useEffect(() => { const t = setTimeout(() => setFlood(false), 1200); return () => clearTimeout(t) }, [])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => { if (!done || fact) return; const t = setTimeout(() => closeRef.current(), onlyMorning ? 0 : 2600); return () => clearTimeout(t) }, [done, fact, onlyMorning])
  const learnRef = useRef(onLearn)
  learnRef.current = onLearn
  useEffect(() => { if (done && fact) learnRef.current(fact.id) }, [done, fact])

  const next = () => setI(n => n + 1)
  // sides = undefined: tagsüber eingetragene Beschwerden übernehmen (putCheckin); sonst gilt genau diese Auswahl
  const saveCheckin = (withSides: Record<string, number> | undefined, sc: Scores = scores, date = today, tg: string[] = tags, sus?: Record<string, string>) => {
    const dims = eveningDims(s, date)
    const full: Scores = {}
    dims.forEach(d => { full[d.id] = sc[d.id] ?? 3 })
    onCheckin({ date, scores: full, tags: tg, ...(withSides ? { sides: withSides } : {}), ...(sus && Object.keys(sus).length ? { suspect: sus } : {}), note: "", quick: false })
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 460, background: "var(--background)", color: "var(--text)", overflowY: "auto" }}>
      {flood && <div className="lab-flood" aria-hidden />}
      <div className="lab-late" style={{ maxWidth: 520, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "calc(14px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom))" }}>
        {/* Kopf: Fortschritt + Schließen */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, display: "flex", gap: 5 }}>
            {steps.map((_, k) => (
              <div key={k} style={{ flex: 1, height: 5, borderRadius: 3, background: k < i ? "var(--accent)" : k === i ? "color-mix(in srgb, var(--accent) 45%, var(--surface-2))" : "var(--surface-2)", transition: "background .3s" }} />
            ))}
          </div>
          <button onClick={onClose} className="lab-press" aria-label={t("Runde schließen")} style={{ width: 36, height: 36, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text-dim)", fontSize: "0.95rem" }}>✕</button>
        </div>

        <div key={done ? "done" : i} className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, padding: "12px 0" }}>
          {done ? (onlyMorning ? null : <DoneStep s={s} fact={fact} onClose={onClose} />)
            : step.kind === "morning" ? <MorningStep s={s} today={today} onSave={onMorning} onDone={next} />
            : step.kind === "take" ? <TakeStep s={s} id={step.id} onDone={() => { onTake(step.id); setTimeout(next, 450) }} onSkip={next} />
            : step.kind === "checkin" ? <CheckinStep key={step.date ?? today} s={s} date={step.date ?? today} scores={scores} setScores={setScores} tags={tags} setTags={setTags} yesterday={!!step.date && step.date !== today}
                onExtra={onExtra} onExtraRemove={onExtraRemove} onDone={(sc, tg) => {
                if (step.date && step.date !== today) { saveCheckin(undefined, sc, step.date, tg); setScores({}); setTags([]); next(); return }
                if (steps[i + 1]?.kind === "sides") next(); else { saveCheckin(undefined, sc, today, tg); next() }
              }} />
            : step.kind === "sides" ? <SidesStep s={s} today={today} value={sides} suspect={suspect} onChange={setSides} onSuspect={setSuspect}
                onDone={(v, sus) => { saveCheckin(v, scores, today, tags, sus); next() }} />
            : <RevealStep s={s} suppId={step.suppId} onDecide={d => { onVerdict(step.suppId, d); setTimeout(next, 500) }} />}
        </div>
      </div>
    </div>
  )
}

// ── Einzelne Schritte ──────────────────────────────────────────────────────────

function Title({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "1.55rem", fontWeight: 900, letterSpacing: "-.01em", lineHeight: 1.15 }}>{children}</div>
      {sub && <div style={{ fontSize: "0.9rem", color: "var(--text-dim)", marginTop: 6, lineHeight: 1.45 }}>{sub}</div>}
    </div>
  )
}

function TakeStep({ s, id, onDone, onSkip }: { s: LabState; id: string; onDone: () => void; onSkip: () => void }) {
  const x = s.supps.find(q => q.id === id)
  const [ok, setOk] = useState(false)
  if (!x) return null
  const tip = timeTip(s, id)
  const c = suppColor(x)
  return (
    <>
      <Title sub={`${tip.emoji} ${tip.label} · ${clock(tip.time)}${x.dose ? ` · ${x.dose}` : ""}`}>{t("Zeit für {name}", { name: x.name })}</Title>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, marginTop: 8 }}>
        <div style={{ width: 112, height: 112, borderRadius: 34, background: `linear-gradient(145deg, ${c}, color-mix(in srgb, ${c} 60%, #0b0b1a))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.4rem", boxShadow: `0 18px 40px color-mix(in srgb, ${c} 40%, transparent)` }}>{x.emoji}</div>
        <button className="lab-press" aria-label={t("{name} genommen", { name: x.name })} onClick={() => { if (ok) return; setOk(true); onDone() }} style={{
          width: 96, height: 96, borderRadius: 999, fontSize: "2.2rem", fontWeight: 900,
          border: ok ? "none" : "3px dashed var(--border)", background: ok ? "var(--accent)" : "transparent", color: ok ? "#fff" : "var(--text-dim)",
          animation: ok ? "labCheck .45s ease" : undefined, boxShadow: ok ? "0 12px 30px rgba(46,204,138,.45)" : undefined,
        }}>{ok ? "✓" : ""}</button>
        <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", fontWeight: 700 }}>{t("Tippen, wenn genommen")}</div>
      </div>
      <KolbiTip title={tip.own ? t("⏰ Deine Zeit: {label}", { label: tip.label }) : t("⏰ Warum jetzt?")}>{tip.why}</KolbiTip>
      <button onClick={onSkip} style={{ alignSelf: "center", background: "none", border: "none", color: "var(--text-dim)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", marginTop: 8 }}>{t("Später")}</button>
    </>
  )
}

/** Nach der letzten Bewertung geht es von selbst weiter – lang genug, um noch einen Störfaktor anzutippen. */
const AUTO_NEXT_MS = 2000

function MorningStep({ s, today, onSave, onDone }: { s: LabState; today: string; onSave: (v: { sleep?: number; fit?: number }) => void; onDone: () => void }) {
  return (
    <>
      <Title sub={t("1 Tipp genügt – so sehe ich, was dir nachts hilft.")}>{t("🌙 Wie hast du geschlafen?")}</Title>
      <div className="lab-card" style={{ padding: 16 }}>
        <MorningPanel entry={s.morning?.[today]} onSave={onSave} onDone={onDone} delay={900} size={60} />
      </div>
    </>
  )
}

function CheckinStep({ s, date, scores, setScores, tags, setTags, onDone, yesterday, onExtra, onExtraRemove }: {
  s: LabState; date: string; scores: Scores; setScores: React.Dispatch<React.SetStateAction<Scores>>
  tags: string[]; setTags: (v: string[]) => void; onDone: (sc: Scores, tags: string[]) => void; yesterday?: boolean
  onExtra: (date: string, item: ExtraInput, label: string) => void; onExtraRemove: (date: string, id: string) => void
}) {
  const dims = eveningDims(s, date)
  const [extraOpen, setExtraOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [armed, setArmed] = useState(0) // > 0: alles bewertet, Auto-Weiter läuft (Zähler startet die Füll-Animation neu)
  const sent = useRef(false)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const finish = (sc: Scores, tg: string[]) => {
    if (timer.current) clearTimeout(timer.current)
    if (sent.current) return
    sent.current = true
    onDone(sc, tg)
  }
  const arm = (sc: Scores, tg: string[]) => {
    if (timer.current) clearTimeout(timer.current)
    if (!dims.every(x => sc[x.id] != null)) return
    setArmed(a => a + 1)
    timer.current = setTimeout(() => finish(sc, tg), AUTO_NEXT_MS)
  }
  const set = (d: Dim, v: number) => {
    const n = { ...scores, [d]: v }
    setScores(n)
    arm(n, tags)
  }
  const toggleTags = (v: string[]) => {
    setTags(v)
    arm(scores, v)
  }
  const filled = dims.filter(d => scores[d.id] != null)
  const avg = filled.length ? filled.reduce((a, d) => a + scores[d.id]!, 0) / filled.length : null
  return (
    <>
      {yesterday
        ? <Title sub={t("Gestern ist der Check-in durchgerutscht – kurz nachtragen, dann fehlt nichts in deiner Auswertung.")}>{t("🌅 Wie war gestern?")}</Title>
        : <Title sub={t("Tippe die Sterne pro Bereich — alles auf einem Blick.")}>{t("Wie war dein Tag?")}</Title>}
      <div className="lab-card" style={{ padding: "4px 16px" }}>
        {dims.map((d, k) => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 0", borderTop: k ? "1px solid var(--border)" : "none" }}>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 800, fontSize: "0.92rem", whiteSpace: "nowrap" }}>{d.emoji} {d.label}</span>
              <span style={{ display: "block", fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: 1.25 }}>{DIM_BY_ID[d.id].hint}</span>
            </span>
            <Stars value={scores[d.id]} onChange={v => set(d.id, v)} size={24} />
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: "0.85rem", fontWeight: 800, color: avg != null ? "#f5b400" : "var(--text-dim)", minHeight: 20 }}>
        {avg != null ? `${FACES[Math.round(avg) - 1]} Ø ★ ${fmt(avg)} · ${filled.length}/${dims.length}` : t("0/{n} bewertet", { n: dims.length })}
      </div>
      {/* Störfaktoren: optional, ein Tipp – damit Kolbi solche Tage im Vergleich fair einordnet */}
      <div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ display: "block", fontWeight: 800, fontSize: "0.92rem" }}>{yesterday ? t("War gestern was anders?") : t("War heute was anders?")}</span>
          <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-dim)" }}>{t("Optional – damit der Vergleich fair bleibt.")}</span>
        </div>
        <TagChips value={tags} onChange={toggleTags} />
        {/* Extra-Einnahme (außerhalb des Plans) – optional, gleich neben den Störfaktoren */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 7, marginTop: 8 }}>
          <button className="lab-press" onClick={() => { if (timer.current) clearTimeout(timer.current); setArmed(0); setExtraOpen(true) }} style={{
            padding: "8px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 700, color: "var(--text)", border: "1px dashed var(--border)", background: "var(--surface)",
          }}>{t("➕ Extra")}</button>
          <ExtraList s={s} date={date} onRemove={id => onExtraRemove(date, id)} />
        </div>
      </div>
      {extraOpen && <DaySheet s={s} date={date} fixedDate onlyTake z={480} onAdd={onExtra} onRemove={onExtraRemove} onSides={() => {}}
        onClose={() => { setExtraOpen(false); arm(scores, tags) }} />}
      {armed > 0 ? (
        <button className="lab-press" onClick={() => finish(scores, tags)} style={{
          position: "relative", overflow: "hidden", alignSelf: "stretch", border: "none", borderRadius: 16, padding: "14px 20px",
          background: "var(--surface-2)", color: "var(--text)", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer",
        }}>
          <span key={armed} aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, background: "var(--accent-dim)", animation: `labFill ${AUTO_NEXT_MS}ms linear forwards` }} />
          <span style={{ position: "relative" }}>{tags.length ? t("Weiter · {n} markiert", { n: tags.length }) : t("Weiter")} →</span>
        </button>
      ) : filled.length > 0 && filled.length < dims.length && (
        <button onClick={() => finish(scores, tags)} style={{ alignSelf: "center", background: "none", border: "none", color: "var(--text-dim)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>{t("Rest überspringen →")}</button>
      )}
    </>
  )
}

function SidesStep({ s, today, value, suspect, onChange, onSuspect, onDone }: {
  s: LabState; today: string; value: Record<string, number>; suspect: Record<string, string>
  onChange: (v: Record<string, number>) => void; onSuspect: (v: Record<string, string>) => void; onDone: (v: Record<string, number>, sus: Record<string, string>) => void
}) {
  const any = Object.values(value).some(Boolean)
  const plan = intakeOn(s, today).length > 0 || extrasOn(s, today).length > 0
  return (
    <>
      <Title sub={t("Einmal tippen = leicht, zweimal = stark.")}>{plan ? t("Nebenwirkungen heute?") : t("Beschwerden heute?")}</Title>
      {any
        ? <Btn full onClick={() => onDone(value, suspect)} style={{ padding: "18px 20px", fontSize: "1.05rem" }}>{t("Weiter")}</Btn>
        : <Btn full onClick={() => onDone({}, {})} style={{ padding: "18px 20px", fontSize: "1.05rem" }}>{t("✓ Nein, alles gut")}</Btn>}
      <SidesWithSuspect s={s} date={today} value={value} suspect={suspect} onChange={onChange} onSuspect={onSuspect} />
    </>
  )
}

function RevealStep({ s, suppId, onDecide }: { s: LabState; suppId: string; onDecide: (d: Decision) => void }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Decision | null>(null)
  const x = s.supps.find(q => q.id === suppId)
  const r = testResult(s, suppId)
  const sig = signal(s, suppId)
  if (!x) return null
  const c = suppColor(x)
  const top = [...sig.pros.slice(0, 2), ...sig.cons.slice(0, 1)]
  return (
    <>
      <Title sub={open ? undefined : t("Dein Test ist fertig. Tipp auf die Karte.")}>{open ? `${x.emoji} ${x.name}` : t("Ergebnis ist da!")}</Title>
      <div className="lab-flip" style={{ width: "100%" }}>
        <div className={`lab-flip-inner ${open ? "on" : ""}`}>
          {/* Rückseite (verdeckt) */}
          <button className="lab-flip-face lab-press" onClick={() => setOpen(true)} aria-label={t("Ergebnis aufdecken")} style={{
            width: "100%", minHeight: 260, borderRadius: 28, border: "none", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
            background: `radial-gradient(circle at 30% 20%, rgba(255,255,255,.25), transparent 40%), linear-gradient(145deg, ${c}, #1b1b33)`, boxShadow: `0 24px 50px color-mix(in srgb, ${c} 35%, transparent)`,
          }}>
            <span className="lab-float"><Mascot mood="think" size={96} /></span>
            <span style={{ fontSize: "2.6rem", fontWeight: 900, lineHeight: 1 }}>?</span>
            <span style={{ fontWeight: 800, opacity: 0.9 }}>{t("{name} · {n} Tage Daten", { name: x.name, n: r?.n ?? 0 })}</span>
          </button>
          {/* Vorderseite (Ergebnis) */}
          <div className="lab-flip-face lab-flip-back lab-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "2.4rem" }}>{sig.emoji}</span>
              <span style={{ fontWeight: 900, fontSize: "1.15rem", lineHeight: 1.2 }}>{sig.text}</span>
            </div>
            {r?.overall.base != null && r.overall.test != null && (
              <div style={{ display: "flex", gap: 10 }}>
                {([[t("Reset"), r.overall.base], [t("Mit {name}", { name: x.name }), r.overall.test]] as const).map(([l, v], k) => (
                  <div key={l} style={{ flex: 1, borderRadius: 16, padding: "10px 12px", background: k ? "var(--accent-dim)" : "var(--surface-2)" }}>
                    <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{fmt(v)} <span style={{ color: "#f5b400", fontSize: "1rem" }}>★</span></div>
                  </div>
                ))}
              </div>
            )}
            {top.length > 0 && r?.delta && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {top.map(d => {
                  const v = r.delta![d]!
                  return (
                    <div key={d} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 700 }}>
                      <span>{DIM_BY_ID[d].emoji} {DIM_BY_ID[d].label}</span>
                      <span style={{ color: v >= 0 ? "var(--accent)" : "var(--danger)", fontVariantNumeric: "tabular-nums" }}>{v > 0 ? "+" : ""}{fmt(v)} ★</span>
                    </div>
                  )
                })}
              </div>
            )}
            {r && r.sides.list.length > 0 && (
              <div style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>
                {t("Nebenwirkungen:")} {r.sides.list.slice(0, 3).map(x => `${SIDE_BY_ID[x.id]?.emoji ?? ""} ${SIDE_BY_ID[x.id]?.label ?? x.id}`).join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>
      {open && (
        <div className="lab-rise" style={{ display: "flex", gap: 8 }}>
          {DECISIONS.map(d => {
            const sug = sig.suggestion === d.id
            return (
              <button key={d.id} className="lab-press" onClick={() => { if (picked) return; setPicked(d.id); onDecide(d.id) }} style={{
                flex: 1, padding: "14px 6px", borderRadius: 18, position: "relative", color: "var(--text)", fontWeight: 800, fontSize: "0.85rem",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                border: sug ? "2px solid var(--accent)" : "1px solid var(--border)", background: picked === d.id ? "var(--accent-dim)" : "var(--surface)",
                opacity: picked && picked !== d.id ? 0.4 : 1,
              }}>
                {sug && <span style={{ position: "absolute", top: -9, fontSize: "0.58rem", background: "var(--accent)", color: "#fff", padding: "2px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>{t("Kolbis Tipp")}</span>}
                <span style={{ fontSize: "1.5rem" }}>{d.emoji}</span>{d.label}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

function DoneStep({ s, fact, onClose }: { s: LabState; fact: Fact | null; onClose: () => void }) {
  const st = streak(s)
  const known = new Set(s.learned.filter(x => !x.startsWith("cause:") && !x.startsWith("partner:")))
  if (fact) known.add(fact.id)
  const lib = fact?.libId ? s.supps.find(x => x.lib === fact.libId) : undefined
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
      <span className="lab-pop"><Mascot mood="party" size={fact ? 120 : 150} fill={1} glow /></span>
      <div style={{ fontSize: "1.7rem", fontWeight: 900 }}>{t("Alles erledigt! 🎉")}</div>
      {st > 0 && <div style={{ padding: "8px 16px", borderRadius: 999, background: "rgba(235,104,52,.14)", fontWeight: 900 }}>{st === 1 ? t("🔥 1 Tag am Stück") : t("🔥 {n} Tage am Stück", { n: st })}</div>}
      {fact ? (
        <div className="lab-card lab-rise" style={{ padding: 16, width: "100%", textAlign: "left", animationDelay: ".25s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 900, letterSpacing: ".08em", color: "var(--accent)" }}>{t("📚 NEU ENTDECKT")}{lib ? ` · ${lib.emoji} ${lib.name.toUpperCase()}` : ""}</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>{known.size}/{FACT_COUNT}</span>
          </div>
          <div style={{ fontSize: "0.95rem", lineHeight: 1.5, fontWeight: 600 }}>{fact.text}</div>
        </div>
      ) : (
        <div style={{ color: "var(--text-dim)" }}>{t("Ich melde mich, wenn wieder etwas dran ist.")}</div>
      )}
      <Btn variant={fact ? "primary" : "soft"} onClick={onClose} style={{ marginTop: 6 }}>{t("Zur Übersicht")}</Btn>
    </div>
  )
}
