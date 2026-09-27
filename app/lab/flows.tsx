"use client"
import React, { useMemo, useState } from "react"
import Link from "next/link"
import {
  FACES, FACE_LABELS, TAGS, LIBRARY, SIDE_EFFECTS, SIDE_BY_ID, knownSides, intakeOn, ONSET_INFO, ROUTE_INFO, SUPP_COLORS, CATEGORIES, GOALS, RHYTHMS, TRAININGS,
  buildPhases, todayIso, addDays, fmtDate, diffDays, makeSupp, autoOrder, defaultDays, parseSuppList, goalRelevance,
  activeDims, defaultCheckinTime, libOf, daySum, STORE_MODE,
  type CheckIn, type Dim, type LabState, type MySupp, type Settings, type LibSupp, type GoalId, type SuppMode, type Scores,
} from "@/lib/supplementLab"
import { hasNativeReminders } from "@/lib/labReminders"
import { Btn, Capsule, Card, FaceRow, Label, Segmented, SideChips, Stars, Stepper } from "./ui"

export const MODE_OPTIONS: { id: SuppMode; label: string }[] = [
  { id: "test", label: "🔬 Testen" },
  { id: "konstant", label: "📌 Weiter nehmen" },
  { id: "pause", label: "⏸️ Pause" },
]

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

// ── Test-Reihenfolge bearbeiten ────────────────────────────────────────────────

export function OrderEditor({ order, supps, days, onOrder, onDays, onRemove }: {
  order: string[]; supps: MySupp[]; days: Record<string, number>
  onOrder: (o: string[]) => void; onDays: (id: string, d: number) => void; onRemove?: (id: string) => void
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const o = [...order]; [o[i], o[j]] = [o[j], o[i]]; onOrder(o)
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {order.map((id, i) => {
        const s = supps.find(x => x.id === id)
        if (!s) return null
        const lib = libOf(s)
        return (
          <div key={id} className="lab-card" style={{ padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button className="lab-press" onClick={() => move(i, -1)} aria-label="nach oben" style={arrowBtn}>▲</button>
              <button className="lab-press" onClick={() => move(i, 1)} aria-label="nach unten" style={arrowBtn}>▼</button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, minWidth: 0 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "var(--text-dim)" }}>#{i + 1}</span>
                <Capsule supp={s} size="sm" />
              </div>
              {lib && <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{ONSET_INFO[lib.onset].emoji} {ONSET_INFO[lib.onset].label}</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <Stepper value={days[id] ?? 5} min={2} max={28} onChange={v => onDays(id, v)} suffix=" T" />
              {onRemove && <button onClick={() => onRemove(id)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.72rem", cursor: "pointer" }}>entfernen</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
const arrowBtn: React.CSSProperties = { width: 26, height: 22, borderRadius: 7, border: "none", background: "var(--surface-2)", color: "var(--text-dim)", fontSize: "0.6rem" }

// ── Onboarding ────────────────────────────────────────────────────────────────

export interface OnboardResult { state: Partial<LabState>; wantsCalendar: boolean }

export function Onboarding({ onStart, onDemo }: { onStart: (r: OnboardResult) => void; onDemo: () => void }) {
  const [step, setStep] = useState(0)
  const [goals, setGoals] = useState<GoalId[]>([])
  const [supps, setSupps] = useState<MySupp[]>([])
  const [rhythm, setRhythm] = useState("normal")
  const [settings, setSettings] = useState<Settings>({ wake: "07:00", bed: "23:00", training: null, washoutDays: 2 })
  const [remind, setRemind] = useState(true)
  const [calendar, setCalendar] = useState(true)
  const [order, setOrder] = useState<string[]>([])
  const [days, setDays] = useState<Record<string, number>>({})
  const [baseline, setBaseline] = useState(7)
  const [tweak, setTweak] = useState(false)

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

  // Plan automatisch vorbereiten
  const goPlan = () => {
    const tests = autoOrder(supps.filter(s => s.mode === "test"), goals)
    setOrder(tests.map(s => s.id))
    setDays(Object.fromEntries(supps.map(s => [s.id, days[s.id] ?? defaultDays(s)])))
    setStep(4)
  }
  const setMode = (id: string, mode: SuppMode) => {
    setSupps(p => p.map(s => s.id === id ? { ...s, mode } : s))
    setOrder(o => mode === "test" ? (o.includes(id) ? o : [...o, id]) : o.filter(x => x !== id))
    setDays(d => ({ ...d, [id]: d[id] ?? defaultDays(supps.find(s => s.id === id)!) }))
  }

  const totalDays = baseline + order.reduce((a, id) => a + (days[id] ?? 5), 0) + Math.max(0, order.length - 1) * settings.washoutDays
  const peptides = supps.filter(s => libOf(s)?.category === "Peptide" || (STORE_MODE && !s.lib))
  const rx = supps.filter(s => libOf(s)?.rx)
  const slow = order.filter(id => libOf(supps.find(x => x.id === id))?.onset === "langsam")

  const start = (inDays: number) => {
    onStart({
      wantsCalendar: remind && calendar,
      state: {
        startDate: addDays(todayIso(), inDays), goals, supps, settings,
        reminders: { enabled: remind, checkin: defaultCheckinTime(settings), intake: true },
        phases: buildPhases(order, days, settings.washoutDays, baseline),
      },
    })
    if (remind && "Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {})
  }

  const steps = 4
  const bar = step > 0 && (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
      <button className="lab-press" onClick={() => setStep(s => s - 1)} aria-label="Zurück" style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text)", flexShrink: 0 }}>←</button>
      <div style={{ flex: 1, display: "flex", gap: 6 }}>
        {Array.from({ length: steps }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < step ? "var(--accent)" : "var(--border)", transition: "background .3s" }} />
        ))}
      </div>
    </div>
  )
  const title = (t: string, sub: string) => (
    <>
      <div style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: 6, lineHeight: 1.15 }}>{t}</div>
      <div style={{ color: "var(--text-dim)", marginBottom: 18, lineHeight: 1.45 }}>{sub}</div>
    </>
  )
  const footer = (children: React.ReactNode) => (
    <div style={{ position: "sticky", bottom: 0, paddingTop: 16, paddingBottom: 4, marginTop: "auto", background: "linear-gradient(transparent, var(--background) 35%)" }}>{children}</div>
  )
  const tile = (on: boolean, onClick: () => void, emoji: string, label: string, sub?: string) => (
    <button className="lab-press" onClick={onClick} style={{
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
      {bar}

      {step === 0 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {!STORE_MODE && <Link href="/home" style={{ color: "var(--text-dim)", textDecoration: "none", fontWeight: 700, fontSize: "0.85rem", alignSelf: "flex-start" }}>← TRUE</Link>}
          <div style={{ position: "relative", height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="lab-float" style={{
              width: 140, height: 140, borderRadius: 44, background: "var(--lab-grad)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "4.2rem", boxShadow: "0 20px 60px rgba(46,204,138,.45)",
            }}>🧪</div>
            {(STORE_MODE ? ["💊", "🌙", "⚡", "🌿", "📈"] : ["💊", "🌙", "💉", "🌿", "🧬"]).map((e, i) => (
              <span key={i} className="lab-float" style={{
                position: "absolute", fontSize: "1.6rem", animationDelay: `${i * 0.5}s`,
                left: `${[12, 78, 18, 80, 48][i]}%`, top: `${[18, 14, 72, 70, 0][i]}%`,
              }}>{e}</span>
            ))}
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1.1, marginBottom: 10 }}>Supplement Lab</div>
          <div style={{ fontSize: "1.05rem", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: 22 }}>
            Finde raus, was bei dir wirklich wirkt — {STORE_MODE ? "Supplement für Supplement" : "Supplements & Peptide, eins nach dem anderen"}. Du tippst, die App plant.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {[
              ["🎯", "4 Fragen, 1 Minute", "Ziele und Stack antippen oder einfach als Liste reinkopieren."],
              ["👆", "1 Klick pro Tag", "Abends ein Tipp: Wie war dein Tag? Erinnerung kommt automatisch."],
              ["🏆", "Automatisch zum Stack", "Die App wertet aus, schlägt vor und plant deinen perfekten Tag."],
            ].map(([e, t, d], i) => (
              <div key={t} className="lab-card lab-rise" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", animationDelay: `${120 + i * 90}ms` }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>{e}</div>
                <div><div style={{ fontWeight: 800 }}>{t}</div><div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>{d}</div></div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn full onClick={() => setStep(1)}>Los geht&apos;s 🚀</Btn>
            <Btn full variant="ghost" onClick={onDemo}>Erst mal mit Demo-Daten reinschnuppern</Btn>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {title("Was willst du erreichen? 🎯", "Tippe alles an, was dir wichtig ist. Danach sortiert die App Vorschläge und Fragen passend für dich.")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {GOALS.map(g => tile(goals.includes(g.id), () => setGoals(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id]), g.emoji, g.label))}
          </div>
          {footer(<Btn full onClick={() => setStep(2)}>{goals.length ? `Weiter mit ${goals.length} Ziel${goals.length > 1 ? "en" : ""}` : "Überspringen"}</Btn>)}
        </div>
      )}

      {step === 2 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {title("Was nimmst du? 💊", STORE_MODE ? "Antippen oder deine Liste reinkopieren — Dosis wird mit erkannt. Nicht dabei? Einfach eintippen." : "Antippen oder deine Liste reinkopieren — Dosis wird mit erkannt. Peptide findest du ganz oben.")}
          {supps.length > 0 && (
            <div className="lab-card" style={{ padding: 12, marginBottom: 14 }}>
              <Label style={{ marginBottom: 8 }}>Dein Stack · {supps.length}</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {supps.map(s => <Capsule key={s.id} supp={s} size="sm" onClick={() => setSupps(p => p.filter(x => x.id !== s.id))} right={<span style={{ color: "var(--text-dim)" }}>✕</span>} />)}
              </div>
            </div>
          )}
          <SuppPicker selected={supps} goals={goals} onToggle={toggleSupp} onAddCustom={addCustom} onPasteAdd={pasteAdd} />
          {footer(<Btn full disabled={!supps.length} onClick={() => setStep(3)}>{supps.length ? `Weiter mit ${supps.length} Supplement${supps.length > 1 ? "s" : ""}` : "Wähle mind. 1 aus"}</Btn>)}
        </div>
      )}

      {step === 3 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {title("Dein Tag ⏰", "Zwei Tipps — daraus berechnet die App alle Einnahme- und Erinnerungszeiten.")}
          <Label style={{ marginBottom: 8 }}>Rhythmus</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 8 }}>
            {RHYTHMS.map(r => tile(rhythm === r.id, () => { setRhythm(r.id); setSettings(s => ({ ...s, wake: r.wake, bed: r.bed })) }, r.emoji, r.label, `${r.wake}–${r.bed}`))}
          </div>
          <button onClick={() => setRhythm("custom")} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.8rem", fontWeight: 700, textAlign: "left", padding: "4px 0", marginBottom: 6, cursor: "pointer" }}>
            {rhythm === "custom" ? "Eigene Zeiten:" : "✏️ Eigene Zeiten"}
          </button>
          {rhythm === "custom" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {([["wake", "🌅"], ["bed", "🛌"]] as const).map(([k, e]) => (
                <label key={k} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, fontWeight: 800 }}>{e}
                  <input type="time" value={settings[k]} onChange={ev => setSettings(s => ({ ...s, [k]: ev.target.value }))} style={{ flex: 1, padding: "8px", borderRadius: 12, fontWeight: 700 }} />
                </label>
              ))}
            </div>
          )}
          <Label style={{ margin: "10px 0 8px" }}>Training</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, marginBottom: 18 }}>
            {TRAININGS.map(t => tile(settings.training === t.time, () => setSettings(s => ({ ...s, training: t.time })), t.emoji, t.label))}
          </div>
          <button className="lab-press" onClick={() => setRemind(r => !r)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 20, textAlign: "left", color: "var(--text)",
            border: remind ? "2px solid var(--accent)" : "1px solid var(--border)", background: remind ? "var(--accent-dim)" : "var(--surface)",
          }}>
            <span className={remind ? "lab-wiggle" : undefined} style={{ fontSize: "1.8rem", display: "inline-block" }}>🔔</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontWeight: 900 }}>Erinnere mich automatisch</span>
              <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-dim)" }}>Einnahme zur richtigen Zeit + Check-in um {defaultCheckinTime(settings)} Uhr</span>
            </span>
            <span style={{ width: 48, height: 28, borderRadius: 999, background: remind ? "var(--accent)" : "var(--surface-2)", position: "relative", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 3, left: remind ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "left .2s" }} />
            </span>
          </button>
          {footer(<Btn full onClick={goPlan}>Plan erstellen ✨</Btn>)}
        </div>
      )}

      {step === 4 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {title("Dein Plan ist fertig ✨", "Automatisch sortiert: Schnell wirkende zuerst, deine Ziele priorisiert. Pro Supplement 1 Tipp, ob es getestet wird.")}

          <Card style={{ background: "var(--lab-grad)", border: "none", color: "#fff", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, opacity: 0.85, textTransform: "uppercase", letterSpacing: ".08em" }}>Dein Experiment</div>
                <div style={{ fontSize: "2.4rem", fontWeight: 900, lineHeight: 1 }}>{totalDays} Tage</div>
              </div>
              <div style={{ textAlign: "right", fontSize: "0.82rem", fontWeight: 700 }}>🧘 {baseline} T Reset<br />🔬 {order.length} Tests</div>
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 14, height: 12 }}>
              <div style={{ flex: baseline, background: "rgba(255,255,255,.9)", borderRadius: 4 }} />
              {order.map((id, i) => (
                <React.Fragment key={id}>
                  <div style={{ flex: days[id] ?? 5, background: SUPP_COLORS[(supps.find(s => s.id === id)?.color ?? 0) % SUPP_COLORS.length], borderRadius: 4, boxShadow: "0 0 0 1.5px rgba(255,255,255,.7)" }} />
                  {settings.washoutDays > 0 && i < order.length - 1 && <div style={{ flex: settings.washoutDays, background: "rgba(255,255,255,.3)", borderRadius: 4 }} />}
                </React.Fragment>
              ))}
            </div>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {[...supps].sort((a, b) => (order.includes(a.id) ? order.indexOf(a.id) : 99) - (order.includes(b.id) ? order.indexOf(b.id) : 99)).map(s => {
              const lib = libOf(s)
              const pos = order.indexOf(s.id)
              return (
                <div key={s.id} className="lab-card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, minWidth: 0 }}>
                    <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      {pos >= 0 && <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "var(--text-dim)" }}>#{pos + 1}</span>}
                      <Capsule supp={s} size="sm" />
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {s.mode === "test" ? `${days[s.id] ?? defaultDays(s)} Tage · ` : ""}{lib ? `${ONSET_INFO[lib.onset].emoji}` : ""}{lib?.route && lib.route !== "oral" ? ` ${ROUTE_INFO[lib.route].emoji}` : ""}
                    </span>
                  </div>
                  <Segmented value={s.mode} onChange={m => setMode(s.id, m)} options={MODE_OPTIONS} />
                  {lib?.rx && <div style={{ fontSize: "0.72rem", color: "var(--warning)", marginTop: 6 }}>⚕️ Verschreibungspflichtig — läuft automatisch weiter, nie eigenmächtig absetzen.</div>}
                </div>
              )
            })}
          </div>

          {slow.length > 0 && (
            <div style={{ fontSize: "0.8rem", lineHeight: 1.5, padding: "10px 12px", borderRadius: 14, background: "var(--warning-dim)", marginBottom: 10 }}>
              🐢 <b>{slow.map(id => supps.find(s => s.id === id)?.name).join(", ")}</b> wirken langsam — im Kurztest merkt man davon oft wenig.
              <button className="lab-press" onClick={() => slow.forEach(id => setMode(id, "konstant"))} style={{
                display: "block", width: "100%", marginTop: 8, padding: "10px 12px", borderRadius: 12, border: "none",
                background: "var(--surface)", color: "var(--text)", fontWeight: 800, fontSize: "0.82rem",
              }}>⚡ Schnell-Modus: Langsame einfach weiter nehmen (−{slow.reduce((a, id) => a + (days[id] ?? 10) + settings.washoutDays, 0)} Tage)</button>
            </div>
          )}
          {(peptides.length > 0 || rx.length > 0) && (
            <div style={{ fontSize: "0.8rem", lineHeight: 1.5, padding: "10px 12px", borderRadius: 14, background: "var(--danger-dim)", marginBottom: 10 }}>
              {STORE_MODE
                ? <>⚕️ <b>Eigene Substanzen & Medikamente:</b> Die App protokolliert nur, was du einträgst — sie empfiehlt keine Substanzen oder Dosierungen. Alles, was über normale Nahrungsergänzung hinausgeht, bitte ärztlich abklären.</>
                : <>🧬 <b>Peptide:</b> Die meisten sind nicht als Arzneimittel zugelassen und kaum am Menschen untersucht; Reinheit schwankt stark. Nur mit ärztlicher Begleitung, sterilem Material und geprüfter Quelle. Dosis & Protokoll trägst du selbst ein.</>}
            </div>
          )}

          <button onClick={() => setTweak(t => !t)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.85rem", padding: "6px 0", cursor: "pointer", textAlign: "left" }}>
            {tweak ? "▾" : "▸"} Feinjustieren (Reihenfolge, Tage, Pausen)
          </button>
          {tweak && (
            <div className="lab-rise" style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
              <OrderEditor order={order} supps={supps} days={days} onOrder={setOrder} onDays={(id, d) => setDays(p => ({ ...p, [id]: d }))} />
              <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14 }}>
                <div style={{ fontWeight: 800 }}>🧘 Reset-Phase</div>
                <Stepper value={baseline} min={3} max={14} onChange={setBaseline} suffix=" T" />
              </Card>
              <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14 }}>
                <div style={{ fontWeight: 800 }}>💧 Pause zwischen Tests</div>
                <Stepper value={settings.washoutDays} min={0} max={7} onChange={v => setSettings(s => ({ ...s, washoutDays: v }))} suffix=" T" />
              </Card>
            </div>
          )}

          {remind && !hasNativeReminders() && (
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", fontWeight: 700, margin: "8px 0" }}>
              <input type="checkbox" checked={calendar} onChange={e => setCalendar(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--accent)" }} />
              📅 Alle Termine direkt in meinen Kalender (klappt auch bei geschlossener App)
            </label>
          )}
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", lineHeight: 1.5, margin: "4px 0 6px" }}>
            ⚕️ Kein medizinischer Rat. Verschriebene Medikamente nie eigenmächtig absetzen. Bei Vorerkrankungen, Schwangerschaft oder Medikamenten vorher ärztlich abklären.
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
            <Label>Feintuning (optional)</Label>
            {avg != null && <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#f5b400" }}>Ø ★ {avg.toFixed(1).replace(".", ",")}</span>}
          </div>
          {dims.map(d => (
            <div key={d.id} title={d.question} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderTop: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap" }}>{d.emoji} {d.label}</span>
              <Stars value={scores[d.id]} onChange={v => setDim(d.id, v)} size={24} />
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

