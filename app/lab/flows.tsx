"use client"
import React, { useMemo, useState } from "react"
import Link from "next/link"
import {
  FACES, FACE_LABELS, TAGS, LIBRARY, SIDE_EFFECTS, SIDE_BY_ID, knownSides, intakeOn, ROUTE_INFO, SUPP_COLORS, CATEGORIES, GOALS, RHYTHMS, TRAININGS,
  todayIso, addDays, fmtDate, diffDays, makeSupp, autoOrder, parseSuppList, goalRelevance,
  activeDims, defaultCheckinTime, libOf, daySum, STORE_MODE,
  type CheckIn, type Dim, type LabState, type MySupp, type Settings, type LibSupp, type GoalId, type Scores,
} from "@/lib/supplementLab"
import { hasNativeReminders } from "@/lib/labReminders"
import { Btn, Capsule, Card, FaceRow, Label, Segmented, SideChips, Stars } from "./ui"
import { MASCOT_NAME, Mascot } from "./mascot"
import { InstallHint } from "./install"
import type { Mood } from "@/lib/labCoach"

// ── Supplement-Auswahl: antippen oder Liste einfügen ───────────────────────────

export function SuppPicker({ selected, goals, onToggle, onAddCustom, onPasteAdd }: {
  selected: MySupp[]; goals: GoalId[]
  onToggle: (lib: LibSupp) => void; onAddCustom: (name: string) => void
  onPasteAdd: (items: { lib: LibSupp | null; name: string; dose: string }[]) => void
}) {
  const [mode, setMode] = useState<"tap" | "paste">("tap")
  const [q, setQ] = useState("")
  const [paste, setPaste] = useState("")
  const sel = new Set(selected.map(s => s.lib ?? s.id))
  const ql = q.trim().toLowerCase()
  const parsed = useMemo(() => parseSuppList(paste), [paste])
  const suggested = goals.length ? LIBRARY.filter(l => goalRelevance(l.id, goals) > 0).sort((a, b) => goalRelevance(b.id, goals) - goalRelevance(a.id, goals)) : []

  const chip = (l: LibSupp) => {
    const on = sel.has(l.id)
    const idx = selected.findIndex(s => s.lib === l.id)
    const c = on ? SUPP_COLORS[selected[idx].color % SUPP_COLORS.length] : undefined
    return (
      <button key={l.id} className="lab-press" onClick={() => onToggle(l)} style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 12px", borderRadius: 999,
        border: on ? `2px solid ${c}` : "1px solid var(--border)",
        background: on ? `color-mix(in srgb, ${c} 16%, var(--surface))` : "var(--surface)",
        color: "var(--text)", fontWeight: on ? 800 : 600, fontSize: "0.85rem",
      }}>
        <span>{l.emoji}</span>{l.name}
        {l.route && l.route !== "oral" && <span style={{ fontSize: "0.75rem" }}>{ROUTE_INFO[l.route].emoji}</span>}
        {on && <span>✓</span>}
      </button>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Segmented value={mode} onChange={setMode} options={[{ id: "tap", label: "👆 Antippen" }, { id: "paste", label: "📋 Liste einfügen" }]} />
      </div>

      {mode === "paste" ? (
        <div className="lab-rise">
          <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={5} autoFocus
            placeholder={"Einfach reinkopieren, z. B.:\nMagnesium 400mg, Vitamin D3, Omega 3\nBPC-157, Kreatin 5g, Ashwagandha"}
            style={{ width: "100%", padding: 14, borderRadius: 16, fontSize: "0.95rem", resize: "vertical" }} />
          {parsed.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Label style={{ marginBottom: 8 }}>Erkannt · {parsed.length}</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {parsed.map((p, i) => (
                  <span key={i} style={{
                    padding: "7px 11px", borderRadius: 999, fontSize: "0.82rem", fontWeight: 700,
                    background: p.lib ? "var(--accent-dim)" : "var(--surface-2)", border: p.lib ? "1px solid var(--accent)" : "1px dashed var(--border)",
                  }}>{p.lib?.emoji ?? "💊"} {p.name}{p.dose && <span style={{ color: "var(--text-dim)", fontWeight: 600 }}> · {p.dose}</span>}{!p.lib && <span style={{ color: "var(--text-dim)", fontWeight: 600 }}> · eigenes</span>}</span>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <Btn full onClick={() => { onPasteAdd(parsed); setPaste(""); setMode("tap") }}>✓ Alle {parsed.length} übernehmen</Btn>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="lab-rise">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Suchen … (z. B. Magnesium, BPC)"
            style={{ width: "100%", padding: "12px 14px", borderRadius: 14, fontSize: "0.95rem", marginBottom: 14 }} />
          {!ql && suggested.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Label style={{ marginBottom: 8, color: "var(--accent)" }}>⭐ Passt zu deinen Zielen</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{suggested.slice(0, 12).map(chip)}</div>
            </div>
          )}
          {CATEGORIES.map(cat => {
            const items = LIBRARY.filter(l => l.category === cat && (!ql || l.name.toLowerCase().includes(ql) || l.aliases.some(a => a.includes(ql))))
            if (!items.length) return null
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <Label style={{ marginBottom: 8 }}>{cat === "Peptide" ? "🧬 Peptide" : cat}</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{items.map(chip)}</div>
              </div>
            )
          })}
          {ql && !LIBRARY.some(l => l.name.toLowerCase().includes(ql)) && (
            <Btn variant="soft" full onClick={() => { onAddCustom(q.trim()); setQ("") }}>+ „{q.trim()}“ als eigenes hinzufügen</Btn>
          )}
          {selected.filter(s => !s.lib).length > 0 && (
            <div style={{ marginTop: 6 }}>
              <Label style={{ marginBottom: 8 }}>Eigene</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selected.filter(s => !s.lib).map(s => <Capsule key={s.id} supp={s} size="sm" />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Onboarding: eine Frage pro Bildschirm, Kolbi führt ─────────────────────────

export interface OnboardResult { state: Partial<LabState>; wantsCalendar: boolean }

const RESET_OPTIONS = [
  { days: 3, label: "3 Tage", sub: "schnell" },
  { days: 5, label: "5 Tage", sub: "empfohlen" },
  { days: 7, label: "7 Tage", sub: "am genauesten" },
]

export function Onboarding({ onStart, onDemo }: { onStart: (r: OnboardResult) => void; onDemo: () => void }) {
  const [step, setStep] = useState(0)
  const [goals, setGoals] = useState<GoalId[]>([])
  const [supps, setSupps] = useState<MySupp[]>([])
  const [rhythm, setRhythm] = useState("normal")
  const [settings, setSettings] = useState<Settings>({ wake: "07:00", bed: "23:00", training: null, washoutDays: 1 })
  const [trainingSet, setTrainingSet] = useState(false)
  const [baseline, setBaseline] = useState(5)
  const [remind, setRemind] = useState<boolean | null>(null)

  const toggleSupp = (lib: LibSupp) => setSupps(prev => prev.some(s => s.lib === lib.id) ? prev.filter(s => s.lib !== lib.id) : [...prev, makeSupp(lib, lib.name, prev)])
  const addCustom = (name: string) => setSupps(prev => [...prev, makeSupp(null, name, prev)])
  const pasteAdd = (items: { lib: LibSupp | null; name: string; dose: string }[]) => setSupps(prev => {
    const next = [...prev]
    for (const it of items) {
      if (it.lib && next.some(s => s.lib === it.lib!.id)) continue
      next.push(makeSupp(it.lib, it.name, next, it.dose))
    }
    return next
  })

  const testOrder = autoOrder(supps.filter(s => s.mode === "test"), goals)
  const rx = supps.filter(s => libOf(s)?.rx)
  const special = supps.filter(s => (libOf(s)?.category === "Peptide" && !libOf(s)?.rx) || (STORE_MODE && !s.lib))

  const start = (inDays: number) => {
    const startDate = addDays(todayIso(), inDays)
    onStart({
      wantsCalendar: !!remind,
      state: {
        startDate, goals, supps, settings,
        reminders: { enabled: !!remind, checkin: defaultCheckinTime(settings), intake: true },
        phases: [{ id: "baseline", kind: "baseline", start: startDate, days: baseline }],
      },
    })
    if (remind && "Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {})
  }

  const STEPS = 7
  const next = () => setStep(s => s + 1)

  // Kolbi + Sprechblase oben auf jeder Seite
  const kolbi = (mood: Mood, text: React.ReactNode) => (
    <div key={step} className="lab-rise" style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 20 }}>
      <div className="lab-float" style={{ flexShrink: 0 }}><Mascot mood={mood} size={64} /></div>
      <div style={{
        position: "relative", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px 20px 20px 6px",
        padding: "12px 14px", fontSize: "0.92rem", lineHeight: 1.45, boxShadow: "var(--shadow)",
      }}>{text}</div>
    </div>
  )
  const question = (t: string) => <div style={{ fontSize: "1.55rem", fontWeight: 900, lineHeight: 1.15, marginBottom: 16, textWrap: "balance" }}>{t}</div>
  const footer = (children: React.ReactNode) => (
    <div style={{ position: "sticky", bottom: 0, paddingTop: 16, paddingBottom: 4, marginTop: "auto", background: "linear-gradient(transparent, var(--background) 35%)" }}>{children}</div>
  )
  const tile = (on: boolean, onClick: () => void, emoji: string, label: string, sub?: string) => (
    <button key={label} className="lab-press" onClick={onClick} style={{
      padding: "14px 6px", borderRadius: 18, textAlign: "center", color: "var(--text)", minWidth: 0,
      border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative",
    }}>
      <span style={{ fontSize: "1.7rem" }}>{emoji}</span>
      <span style={{ fontWeight: 800, fontSize: "0.8rem", lineHeight: 1.2, overflowWrap: "anywhere" }}>{label}</span>
      {sub && <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{sub}</span>}
      {on && <span style={{ position: "absolute", top: 6, right: 8, color: "var(--accent)", fontWeight: 900 }}>✓</span>}
    </button>
  )

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", maxWidth: 560, margin: "0 auto", padding: "18px 18px 24px" }}>
      {step > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button className="lab-press" onClick={() => setStep(s => s - 1)} aria-label="Zurück" style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text)", flexShrink: 0 }}>←</button>
          <div style={{ flex: 1, display: "flex", gap: 5 }}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < step ? "var(--accent)" : "var(--border)", transition: "background .3s" }} />
            ))}
          </div>
          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>{step}/{STEPS}</span>
        </div>
      )}

      {step === 0 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {!STORE_MODE && <Link href="/home" style={{ color: "var(--text-dim)", textDecoration: "none", fontWeight: 700, fontSize: "0.85rem", alignSelf: "flex-start" }}>← TRUE</Link>}
          <div style={{ display: "flex", justifyContent: "center", margin: "28px 0 8px" }}>
            <div className="lab-float"><Mascot mood="happy" size={150} /></div>
          </div>
          <div style={{ textAlign: "center", fontSize: "2rem", fontWeight: 900, lineHeight: 1.1, margin: "8px 0 10px" }}>Hi, ich bin {MASCOT_NAME}!</div>
          <div style={{ textAlign: "center", fontSize: "1.02rem", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: 22, textWrap: "balance" }}>
            Ich finde mit dir heraus, welche Supplements bei dir wirklich wirken. Du tippst nur, ich plane und werte aus.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {[["🧘", "Ein paar Tage nichts nehmen", "So lerne ich dein Normal kennen."], ["🔬", "Dann eins nach dem anderen testen", "Immer nur ein Supplement für ein paar Tage."], ["🏆", "Am Ende: dein Stack", "Was wirkt, bleibt. Ich passe auf, dass es so bleibt."]].map(([e, t, d]) => (
              <div key={t} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "1.5rem" }}>{e}</span>
                <div><div style={{ fontWeight: 800, fontSize: "0.92rem" }}>{t}</div><div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{d}</div></div>
              </div>
            ))}
          </div>
          {STORE_MODE && <div style={{ marginBottom: 14 }}><InstallHint compact /></div>}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn full onClick={next}>Los geht&apos;s · 1 Minute</Btn>
            <Btn full variant="ghost" onClick={onDemo}>Erst mal mit Beispiel-Daten umschauen</Btn>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("happy", <>Damit ich weiß, worauf ich achten soll: <b>Was möchtest du verbessern?</b> Mehrere sind okay.</>)}
          {question("Deine Ziele")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {GOALS.map(g => tile(goals.includes(g.id), () => setGoals(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id]), g.emoji, g.label))}
          </div>
          {footer(<Btn full onClick={next}>{goals.length ? "Weiter" : "Überspringen"}</Btn>)}
        </div>
      )}

      {step === 2 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("happy", <>Tipp an, <b>was du gerade nimmst</b>. Oder kopier deine Liste rein, ich erkenne sie. Später ergänzen geht jederzeit.</>)}
          {question("Was nimmst du gerade?")}
          {supps.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {supps.map(s => <Capsule key={s.id} supp={s} size="sm" onClick={() => setSupps(p => p.filter(x => x.id !== s.id))} right={<span style={{ color: "var(--text-dim)" }}>✕</span>} />)}
            </div>
          )}
          <SuppPicker selected={supps} goals={goals} onToggle={toggleSupp} onAddCustom={addCustom} onPasteAdd={pasteAdd} />
          {footer(<Btn full disabled={!supps.length} onClick={next}>{supps.length ? `Weiter mit ${supps.length}` : "Wähle mindestens eins"}</Btn>)}
        </div>
      )}

      {step === 3 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("sleepy", <>Damit ich dich <b>zur richtigen Uhrzeit</b> erinnere: Wie sieht dein Tag aus?</>)}
          {question("Wann stehst du auf?")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 10 }}>
            {RHYTHMS.map(r => tile(rhythm === r.id, () => { setRhythm(r.id); setSettings(s => ({ ...s, wake: r.wake, bed: r.bed })) }, r.emoji, r.label, `${r.wake}–${r.bed}`))}
          </div>
          <button onClick={() => setRhythm("custom")} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.85rem", fontWeight: 700, textAlign: "left", padding: "6px 0", cursor: "pointer" }}>
            {rhythm === "custom" ? "Deine Zeiten:" : "✏️ Andere Zeiten eingeben"}
          </button>
          {rhythm === "custom" && (
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {([["wake", "🌅 Aufstehen"], ["bed", "🛌 Schlafen"]] as const).map(([k, l]) => (
                <label key={k} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, fontWeight: 800, fontSize: "0.8rem" }}>{l}
                  <input type="time" value={settings[k]} onChange={ev => setSettings(s => ({ ...s, [k]: ev.target.value }))} style={{ padding: "10px", borderRadius: 12, fontWeight: 700, fontSize: "1rem" }} />
                </label>
              ))}
            </div>
          )}
          {footer(<Btn full onClick={next}>Weiter</Btn>)}
        </div>
      )}

      {step === 4 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("happy", <>Manche Supplements wirken am besten <b>vor dem Training</b>. Deshalb frage ich.</>)}
          {question("Wann trainierst du meistens?")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {TRAININGS.map(t => tile(trainingSet && settings.training === t.time, () => { setSettings(s => ({ ...s, training: t.time })); setTrainingSet(true); setTimeout(next, 250) }, t.emoji, t.label))}
          </div>
          {footer(<Btn full variant="ghost" onClick={next}>Überspringen</Btn>)}
        </div>
      )}

      {step === 5 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("think", <>Zuerst nimmst du <b>ein paar Tage gar nichts</b>. So weiß ich, wie du dich ohne Supplements fühlst.{rx.length > 0 && <> Ausnahme: <b>{rx.map(x => x.name).join(", ")}</b> ist ärztlich verordnet und läuft einfach weiter.</>}</>)}
          {question("Wie lange willst du pausieren?")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {RESET_OPTIONS.map(o => tile(baseline === o.days, () => setBaseline(o.days), o.days === 3 ? "⚡" : o.days === 5 ? "⭐" : "🎯", o.label, o.sub))}
          </div>
          {supps.some(x => x.lib === "koffein") && (
            <div style={{ marginTop: 14, fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.45 }}>☕ Ohne Kaffee sind Kopfschmerzen in den ersten Tagen normal. Wenn du Kaffee nicht testen willst, entferne ihn einfach aus deiner Liste.</div>
          )}
          {footer(<Btn full onClick={next}>Weiter</Btn>)}
        </div>
      )}

      {step === 6 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("happy", <>Ich melde mich <b>zur Einnahme-Zeit</b> und <b>abends um {defaultCheckinTime(settings)} Uhr</b> für den Check-in. Aus der Nachricht heraus reicht ein Tipp.</>)}
          {question("Soll ich dich erinnern?")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {tile(remind === true, () => { setRemind(true); setTimeout(next, 250) }, "🔔", "Ja, gerne", "empfohlen")}
            {tile(remind === false, () => { setRemind(false); setTimeout(next, 250) }, "🔕", "Nein, danke")}
          </div>
          {remind && !hasNativeReminders() && <div style={{ marginTop: 12, fontSize: "0.78rem", color: "var(--text-dim)" }}>📅 Beim Start trage ich die Termine in deinen Kalender ein, damit es auch klappt, wenn die App zu ist.</div>}
        </div>
      )}

      {step === 7 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("party", <>Alles klar, <b>ich hab deinen Plan</b>. Ab jetzt sage ich dir jeden Tag, was dran ist.</>)}
          {question("Wann legst du los?")}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {[
              ["🧘", `${baseline} Tage Reset`, "nichts nehmen, jeden Abend 1 Tipp"],
              ["🔬", `Dann ${testOrder.length} Test${testOrder.length === 1 ? "" : "s"}, einzeln`, testOrder.slice(0, 4).map(x => x.name).join(" → ") + (testOrder.length > 4 ? " …" : "")],
              ["🏆", "Dein Stack", "alles, was wirkt, zusammen"],
            ].map(([e, t, d]) => (
              <div key={t} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "1.5rem" }}>{e}</span>
                <div style={{ minWidth: 0 }}><div style={{ fontWeight: 800 }}>{t}</div><div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{d}</div></div>
              </div>
            ))}
          </div>
          {special.length > 0 && (
            <div style={{ fontSize: "0.78rem", lineHeight: 1.5, padding: "10px 12px", borderRadius: 14, background: "var(--danger-dim)", marginBottom: 10 }}>
              {STORE_MODE
                ? <>⚕️ <b>Eigene Substanzen:</b> Ich protokolliere nur, was du einträgst, und empfehle keine Substanzen oder Dosierungen. Alles über normale Nahrungsergänzung hinaus bitte ärztlich abklären.</>
                : <>🧬 <b>Peptide:</b> Die meisten sind nicht als Arzneimittel zugelassen und kaum am Menschen untersucht. Nur mit ärztlicher Begleitung und geprüfter Quelle.</>}
            </div>
          )}
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
            ⚕️ Kein medizinischer Rat. Verschriebene Medikamente nie eigenmächtig absetzen.
          </div>
          {footer(
            <div style={{ display: "flex", gap: 8 }}>
              <Btn full onClick={() => start(0)}>Heute starten 🚀</Btn>
              <Btn variant="soft" onClick={() => start(1)} style={{ whiteSpace: "nowrap" }}>Morgen</Btn>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Check-in: 1 Screen, Gesichter + Sterne ────────────────────────────────────

export function CheckInSheet({ s, date, phaseLabel, onDone, onClose }: {
  s: LabState; date: string; phaseLabel: string; onDone: (c: CheckIn) => void; onClose: () => void
}) {
  const existing = s.checkins[date]
  const yesterday = s.checkins[addDays(date, -1)]
  const dims = activeDims(s)
  const [scores, setScores] = useState<Scores>(existing?.scores ?? {})
  const [touched, setTouched] = useState<Set<Dim>>(new Set(existing && !existing.quick ? (Object.keys(existing.scores) as Dim[]) : []))
  const [overall, setOverall] = useState<number | undefined>(existing ? Math.round(daySum(existing)) : undefined)
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [note, setNote] = useState(existing?.note ?? "")
  const [sides, setSides] = useState<Record<string, number>>(existing?.sides ?? {})
  const suggestedSides = knownSides(s, intakeOn(s, date)).map(id => SIDE_BY_ID[id]).filter(Boolean)
  const [showTags, setShowTags] = useState(!!existing?.tags.length)
  const dayLabel = date === todayIso() ? "Heute" : diffDays(date, todayIso()) === 1 ? "Gestern" : fmtDate(date)

  const pickOverall = (v: number) => {
    setOverall(v)
    setScores(prev => { const n = { ...prev }; dims.forEach(d => { if (!touched.has(d.id)) n[d.id] = v }); return n })
  }
  const setDim = (d: Dim, v: number) => { setScores(p => ({ ...p, [d]: v })); setTouched(t => new Set(t).add(d)) }
  const filled = dims.filter(d => scores[d.id] != null)
  const avg = filled.length ? filled.reduce((a, d) => a + scores[d.id]!, 0) / filled.length : null

  const save = () => {
    const full: Scores = {}
    dims.forEach(d => { full[d.id] = scores[d.id] ?? overall ?? 3 })
    onDone({ date, scores: full, tags, sides, note: note.trim(), quick: touched.size === 0 })
  }

  return (
    <div className="lab-fade" style={{ position: "fixed", inset: 0, zIndex: 450, background: "var(--background)", overflowY: "auto" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 18px calc(24px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900 }}>Check-in · {dayLabel}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 700 }}>{phaseLabel}</div>
          </div>
          <button className="lab-press" onClick={onClose} aria-label="Schließen" style={{ width: 38, height: 38, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text)" }}>✕</button>
        </div>

        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Wie war {dayLabel === "Heute" ? "dein Tag" : "der Tag"} insgesamt?</div>
          <FaceRow value={overall} onPick={pickOverall} faces={FACES} labels={FACE_LABELS} />
          {yesterday && !existing && (
            <button className="lab-press" onClick={() => { setScores({ ...yesterday.scores }); setOverall(Math.round(daySum(yesterday))); setTouched(new Set(Object.keys(yesterday.scores) as Dim[])) }}
              style={{ marginTop: 10, background: "none", border: "1px dashed var(--border)", borderRadius: 12, padding: "8px 12px", color: "var(--text-dim)", fontWeight: 700, fontSize: "0.8rem", width: "100%" }}>
              ↺ Wie gestern übernehmen
            </button>
          )}
        </Card>

        <Card style={{ marginBottom: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <Label>Einzeln bewerten (optional)</Label>
            {avg != null && <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#f5b400" }}>Ø ★ {avg.toFixed(1).replace(".", ",")}</span>}
          </div>
          {dims.map(d => (
            <div key={d.id} title={d.question} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 0", borderTop: "1px solid var(--border)" }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap" }}>{d.emoji} {d.label}</span>
                <span style={{ display: "block", fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: 1.25 }}>{d.hint}</span>
              </span>
              <Stars value={scores[d.id]} onChange={v => setDim(d.id, v)} size={22} />
            </div>
          ))}
        </Card>

        <Card style={{ marginBottom: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <Label>Nebenwirkungen?</Label>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>1× leicht · 2× stark</span>
          </div>
          <SideChips value={sides} onChange={setSides} suggested={suggestedSides.length ? suggestedSides : SIDE_EFFECTS.slice(0, 6)} all={SIDE_EFFECTS} />
        </Card>

        <button onClick={() => setShowTags(v => !v)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.85rem", padding: "4px 0 10px", cursor: "pointer" }}>
          {showTags ? "▾" : "▸"} Störfaktoren & Notiz {tags.length ? `(${tags.length})` : "(Alkohol, Stress, krank …)"}
        </button>
        {showTags && (
          <div className="lab-rise" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
              {TAGS.map(t => {
                const on = tags.includes(t)
                return (
                  <button key={t} className="lab-press" onClick={() => setTags(p => on ? p.filter(x => x !== t) : [...p, t])} style={{
                    padding: "8px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: on ? 800 : 600,
                    border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)", color: "var(--text)",
                  }}>{t}</button>
                )
              })}
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Notiz (optional)"
              style={{ width: "100%", padding: 12, borderRadius: 14, fontSize: "0.92rem", resize: "none" }} />
          </div>
        )}

        <Btn full disabled={overall == null && !filled.length} onClick={save}>{existing ? "Speichern" : "Check-in abschließen ✨"}</Btn>
      </div>
    </div>
  )
}

