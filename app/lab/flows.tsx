"use client"
import React, { useMemo, useState } from "react"
import Link from "next/link"
import {
  DIMS, FACES, TAGS, LIBRARY, LIB_BY_ID, ONSET_INFO, SUPP_COLORS,
  buildPhases, todayIso, addDays, fmtDate, diffDays,
  type CheckIn, type Dim, type LabState, type MySupp, type Settings, type LibSupp,
} from "@/lib/supplementLab"
import { Btn, Capsule, Card, Label, Stepper } from "./ui"

// ── Supplement-Auswahl (auch später aus „Reise“ nutzbar) ────────────────────────

const CATS = ["Schlaf & Ruhe", "Energie & Fokus", "Stress & Adaptogene", "Vitamine & Mineralien", "Training", "Darm & Immun"] as const

export function SuppPicker({ selected, onToggle, onAddCustom }: {
  selected: MySupp[]; onToggle: (lib: LibSupp) => void; onAddCustom: (name: string) => void
}) {
  const [custom, setCustom] = useState("")
  const [q, setQ] = useState("")
  const sel = new Set(selected.map(s => s.lib ?? s.id))
  const ql = q.trim().toLowerCase()
  return (
    <div>
      <input
        value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Suchen … (z. B. Magnesium)"
        style={{ width: "100%", padding: "12px 14px", borderRadius: 14, fontSize: "0.95rem", marginBottom: 14 }}
      />
      {CATS.map(cat => {
        const items = LIBRARY.filter(l => l.category === cat && (!ql || l.name.toLowerCase().includes(ql)))
        if (!items.length) return null
        return (
          <div key={cat} style={{ marginBottom: 16 }}>
            <Label style={{ marginBottom: 8 }}>{cat}</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {items.map(l => {
                const on = sel.has(l.id)
                const idx = selected.findIndex(s => s.lib === l.id)
                const c = on ? SUPP_COLORS[selected[idx].color % SUPP_COLORS.length] : undefined
                return (
                  <button key={l.id} className="lab-press" onClick={() => onToggle(l)} style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999,
                    border: on ? `2px solid ${c}` : "1px solid var(--border)",
                    background: on ? `color-mix(in srgb, ${c} 16%, var(--surface))` : "var(--surface)",
                    color: "var(--text)", fontWeight: on ? 800 : 600, fontSize: "0.85rem",
                  }}>
                    <span>{l.emoji}</span>{l.name}{on && <span style={{ marginLeft: 2 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <Label style={{ marginBottom: 8 }}>Nicht dabei?</Label>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Eigenes Supplement"
          onKeyDown={e => { if (e.key === "Enter" && custom.trim()) { onAddCustom(custom.trim()); setCustom("") } }}
          style={{ flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: 14, fontSize: "0.95rem" }} />
        <Btn variant="soft" onClick={() => { if (custom.trim()) { onAddCustom(custom.trim()); setCustom("") } }}>+ Hinzufügen</Btn>
      </div>
      {selected.filter(s => !s.lib).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {selected.filter(s => !s.lib).map(s => <Capsule key={s.id} supp={s} size="sm" />)}
        </div>
      )}
    </div>
  )
}

export function makeSupp(lib: LibSupp | null, name: string, existing: MySupp[]): MySupp {
  const used = new Set(existing.map(s => s.color))
  let color = 0
  while (used.has(color) && color < SUPP_COLORS.length) color++
  if (color >= SUPP_COLORS.length) color = existing.length % SUPP_COLORS.length
  if (lib) return { id: lib.id, name: lib.name, emoji: lib.emoji, dose: lib.dose, lib: lib.id, color }
  return { id: `custom-${Date.now().toString(36)}`, name, emoji: "💊", dose: "", color }
}

export function defaultDays(s: MySupp) {
  const lib = s.lib ? LIB_BY_ID[s.lib] : undefined
  return lib ? { schnell: 4, mittel: 7, langsam: 10 }[lib.onset] : 5
}

const ONSET_RANK = { schnell: 0, mittel: 1, langsam: 2 }
export function sortForTesting(supps: MySupp[]) {
  return [...supps].sort((a, b) => {
    const oa = a.lib ? ONSET_RANK[LIB_BY_ID[a.lib].onset] : 1
    const ob = b.lib ? ONSET_RANK[LIB_BY_ID[b.lib].onset] : 1
    return oa - ob
  })
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
        const lib = s.lib ? LIB_BY_ID[s.lib] : undefined
        return (
          <div key={id} className="lab-card lab-rise" style={{ padding: 12, display: "flex", gap: 10, alignItems: "center", animationDelay: `${i * 40}ms` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button className="lab-press" onClick={() => move(i, -1)} aria-label="nach oben" style={arrowBtn}>▲</button>
              <button className="lab-press" onClick={() => move(i, 1)} aria-label="nach unten" style={arrowBtn}>▼</button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "var(--text-dim)" }}>#{i + 1}</span>
                <Capsule supp={s} size="sm" />
              </div>
              {lib && (
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  {lib.onset === "schnell" ? "⚡" : lib.onset === "mittel" ? "⏳" : "🐢"} {ONSET_INFO[lib.onset].label}
                </div>
              )}
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

// ── Onboarding-Wizard ─────────────────────────────────────────────────────────

export function Onboarding({ onStart, onDemo }: { onStart: (s: Partial<LabState>) => void; onDemo: () => void }) {
  const [step, setStep] = useState(0)
  const [supps, setSupps] = useState<MySupp[]>([])
  const [order, setOrder] = useState<string[]>([])
  const [days, setDays] = useState<Record<string, number>>({})
  const [settings, setSettings] = useState<Settings>({ wake: "07:00", bed: "23:00", training: null, washoutDays: 2 })
  const [baseline, setBaseline] = useState(7)
  const [startIn, setStartIn] = useState(0)

  const toggle = (lib: LibSupp) => setSupps(prev => prev.some(s => s.lib === lib.id) ? prev.filter(s => s.lib !== lib.id) : [...prev, makeSupp(lib, lib.name, prev)])
  const addCustom = (name: string) => setSupps(prev => [...prev, makeSupp(null, name, prev)])

  const goOrder = () => {
    const sorted = sortForTesting(supps)
    setOrder(sorted.map(s => s.id))
    setDays(Object.fromEntries(supps.map(s => [s.id, days[s.id] ?? defaultDays(s)])))
    setStep(2)
  }

  const totalDays = baseline + order.reduce((a, id) => a + (days[id] ?? 5), 0) + Math.max(0, order.length - 1) * settings.washoutDays
  const start = addDays(todayIso(), startIn)
  const end = addDays(start, totalDays - 1)
  const slow = order.filter(id => { const s = supps.find(x => x.id === id); return s?.lib && LIB_BY_ID[s.lib].onset === "langsam" })

  const finish = () => onStart({
    startDate: start, supps, settings,
    phases: buildPhases(order, days, settings.washoutDays, baseline),
  })

  const steps = 5
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", maxWidth: 560, margin: "0 auto", padding: "18px 18px 28px" }}>
      {step > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {Array.from({ length: steps - 1 }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < step ? "var(--accent)" : "var(--border)", transition: "background .3s" }} />
          ))}
        </div>
      )}

      {step === 0 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Link href="/home" style={{ color: "var(--text-dim)", textDecoration: "none", fontWeight: 700, fontSize: "0.85rem", alignSelf: "flex-start" }}>← TRUE</Link>
          <div style={{ position: "relative", height: 230, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="lab-float" style={{
              width: 150, height: 150, borderRadius: 48, background: "var(--lab-grad)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "4.4rem", boxShadow: "0 20px 60px rgba(46,204,138,.45)",
            }}>🧪</div>
            {["💊", "🌙", "⚡", "🌿", "🐟"].map((e, i) => (
              <span key={i} className="lab-float" style={{
                position: "absolute", fontSize: "1.6rem", animationDelay: `${i * 0.5}s`,
                left: `${[12, 78, 20, 82, 50][i]}%`, top: `${[18, 14, 72, 70, 2][i]}%`,
              }}>{e}</span>
            ))}
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1.1, marginBottom: 10 }}>
            Supplement Lab
          </div>
          <div style={{ fontSize: "1.05rem", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: 22 }}>
            Du nimmst viel und weißt nicht mehr, was wirkt? Wir finden es raus — ein Supplement nach dem anderen.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
            {[
              ["🧘", "Reset-Woche", "7 Tage nichts nehmen. So lernst du dein echtes Normal kennen."],
              ["🔬", "Einzeln testen", "Je ein Supplement für ein paar Tage. Jeden Tag 1 Minute einchecken."],
              ["🏆", "Dein Stack", "Was wirkt, bleibt. Dazu bekommst du den perfekten Tagesplan."],
            ].map(([e, t, d], i) => (
              <div key={t} className="lab-card lab-rise" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", animationDelay: `${120 + i * 90}ms` }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>{e}</div>
                <div><div style={{ fontWeight: 800 }}>{t}</div><div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>{d}</div></div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn full onClick={() => setStep(1)}>Experiment starten 🚀</Btn>
            <Btn full variant="ghost" onClick={onDemo}>Erst mal mit Demo-Daten reinschnuppern</Btn>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: 6 }}>Was nimmst du aktuell? 💊</div>
          <div style={{ color: "var(--text-dim)", marginBottom: 18 }}>Tippe alles an, was du gerade nimmst oder zuletzt genommen hast.</div>
          <SuppPicker selected={supps} onToggle={toggle} onAddCustom={addCustom} />
          <div style={{ position: "sticky", bottom: 0, paddingTop: 16, marginTop: "auto", background: "linear-gradient(transparent, var(--background) 30%)" }}>
            <Btn full disabled={!supps.length} onClick={goOrder}>{supps.length ? `Weiter mit ${supps.length} Supplement${supps.length > 1 ? "s" : ""}` : "Wähle mind. 1 aus"}</Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: 6 }}>Deine Testreihenfolge 🧬</div>
          <div style={{ color: "var(--text-dim)", marginBottom: 14, lineHeight: 1.5 }}>
            Schnell wirkende Supplements stehen vorne. Mit ▲▼ änderst du die Reihenfolge, rechts stellst du die Testtage ein.
          </div>
          <OrderEditor order={order} supps={supps} days={days} onOrder={setOrder} onDays={(id, d) => setDays(p => ({ ...p, [id]: d }))}
            onRemove={id => setOrder(o => o.filter(x => x !== id))} />
          {slow.length > 0 && (
            <Card style={{ marginTop: 14, background: "var(--warning-dim)", border: "none", boxShadow: "none" }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>🐢 Die Langsamen</div>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                {slow.map(id => supps.find(s => s.id === id)?.name).join(", ")} wirken über Wochen. In 3–5 Tagen merkst du davon meist nichts.
                Teste sie länger oder lass lieber ein Blutbild machen (z. B. Vitamin D, B12, Ferritin).
              </div>
            </Card>
          )}
          <Card style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div><div style={{ fontWeight: 800 }}>💧 Auswaschpause</div><div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Pause zwischen zwei Tests, damit nichts nachwirkt</div></div>
              <Stepper value={settings.washoutDays} min={0} max={7} onChange={v => setSettings(s => ({ ...s, washoutDays: v }))} suffix=" T" />
            </div>
          </Card>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setStep(1)}>←</Btn>
            <Btn full disabled={!order.length} onClick={() => setStep(3)}>Weiter</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: 6 }}>Wie sieht dein Tag aus? ⏰</div>
          <div style={{ color: "var(--text-dim)", marginBottom: 18 }}>Daraus berechne ich später die besten Einnahmezeiten.</div>
          {([["wake", "🌅", "Aufstehen"], ["bed", "🛌", "Schlafen gehen"]] as const).map(([k, e, l]) => (
            <Card key={k} style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800 }}>{e} {l}</div>
              <input type="time" value={settings[k]} onChange={ev => setSettings(s => ({ ...s, [k]: ev.target.value }))}
                style={{ padding: "8px 10px", borderRadius: 12, fontSize: "1rem", fontWeight: 700 }} />
            </Card>
          ))}
          <Card style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800 }}>🏋️ Training</div>
              <button className="lab-press" onClick={() => setSettings(s => ({ ...s, training: s.training ? null : "18:00" }))} style={{
                width: 52, height: 30, borderRadius: 999, border: "none", position: "relative",
                background: settings.training ? "var(--accent)" : "var(--surface-2)",
              }} aria-label="Training an/aus">
                <span style={{ position: "absolute", top: 3, left: settings.training ? 25 : 3, width: 24, height: 24, borderRadius: 999, background: "#fff", transition: "left .2s" }} />
              </button>
            </div>
            {settings.training && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>Meistens um</div>
                <input type="time" value={settings.training} onChange={ev => setSettings(s => ({ ...s, training: ev.target.value }))}
                  style={{ padding: "8px 10px", borderRadius: 12, fontSize: "1rem", fontWeight: 700 }} />
              </div>
            )}
          </Card>
          <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 20 }}>
            <Btn variant="ghost" onClick={() => setStep(2)}>←</Btn>
            <Btn full onClick={() => setStep(4)}>Weiter</Btn>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: 6 }}>Bereit für den Reset? 🧘</div>
          <div style={{ color: "var(--text-dim)", marginBottom: 18, lineHeight: 1.5 }}>
            In der Reset-Phase nimmst du <b>gar nichts</b>. Das ist deine Vergleichsbasis. Alles danach wird daran gemessen.
          </div>
          <Card style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div><div style={{ fontWeight: 800 }}>Dauer der Reset-Phase</div><div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Empfohlen: 7 Tage</div></div>
            <Stepper value={baseline} min={3} max={14} onChange={setBaseline} suffix=" T" />
          </Card>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["Heute", 0], ["Morgen", 1]].map(([l, v]) => (
              <button key={l} className="lab-press" onClick={() => setStartIn(v as number)} style={{
                flex: 1, padding: 14, borderRadius: 16, fontWeight: 800, fontSize: "0.95rem",
                border: startIn === v ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: startIn === v ? "var(--accent-dim)" : "var(--surface)", color: "var(--text)",
              }}>Start {l}</button>
            ))}
          </div>
          <Card style={{ background: "var(--lab-grad)", border: "none", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.85, textTransform: "uppercase", letterSpacing: ".08em" }}>Dein Experiment</div>
                <div style={{ fontSize: "2.4rem", fontWeight: 900, lineHeight: 1 }}>{totalDays} Tage</div>
              </div>
              <div style={{ textAlign: "right", fontSize: "0.85rem", fontWeight: 700 }}>{fmtDate(start)}<br />→ {fmtDate(end)}</div>
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 14, height: 10 }}>
              <div style={{ flex: baseline, background: "rgba(255,255,255,.9)", borderRadius: 4 }} />
              {order.map((id, i) => (
                <React.Fragment key={id}>
                  <div style={{ flex: days[id] ?? 5, background: SUPP_COLORS[(supps.find(s => s.id === id)?.color ?? 0) % SUPP_COLORS.length], borderRadius: 4, boxShadow: "0 0 0 1.5px rgba(255,255,255,.7)" }} />
                  {settings.washoutDays > 0 && i < order.length - 1 && <div style={{ flex: settings.washoutDays, background: "rgba(255,255,255,.3)", borderRadius: 4 }} />}
                </React.Fragment>
              ))}
            </div>
          </Card>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 14, lineHeight: 1.5 }}>
            ⚕️ Kein medizinischer Rat. Verschreibungspflichtige Medikamente nie eigenmächtig absetzen. Bei Vorerkrankungen, Schwangerschaft oder Medikamenten vorher ärztlich abklären.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: "auto", paddingTop: 20 }}>
            <Btn variant="ghost" onClick={() => setStep(3)}>←</Btn>
            <Btn full onClick={finish}>Los geht&apos;s 🚀</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Täglicher Check-in (Karte für Karte) ──────────────────────────────────────

export function CheckInFlow({ date, existing, phaseLabel, onDone, onClose }: {
  date: string; existing?: CheckIn; phaseLabel: string; onDone: (c: CheckIn) => void; onClose: () => void
}) {
  const [i, setI] = useState(0)
  const [scores, setScores] = useState<Partial<Record<Dim, number>>>(existing?.scores ?? {})
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [note, setNote] = useState(existing?.note ?? "")
  const total = DIMS.length + 1
  const dim = DIMS[i]
  const isToday = date === todayIso()
  const dayLabel = isToday ? "Heute" : diffDays(date, todayIso()) === 1 ? "Gestern" : fmtDate(date)

  const pick = (v: number) => {
    setScores(s => ({ ...s, [dim.id]: v }))
    setTimeout(() => setI(x => x + 1), 220)
  }
  const done = () => {
    const full = {} as Record<Dim, number>
    DIMS.forEach(d => { full[d.id] = scores[d.id] ?? 3 })
    onDone({ date, scores: full, tags, note: note.trim() })
  }

  const hue = useMemo(() => ["#e34948", "#eb6834", "#eda100", "#1baf7a", "#2ECC8A"], [])

  return (
    <div className="lab-fade" style={{ position: "fixed", inset: 0, zIndex: 450, background: "var(--background)", display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 560, width: "100%", margin: "0 auto", padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button className="lab-press" onClick={() => (i === 0 ? onClose() : setI(x => x - 1))} aria-label="Zurück" style={{
            width: 38, height: 38, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text)", fontSize: "1rem",
          }}>{i === 0 ? "✕" : "←"}</button>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden" }}>
            <div style={{ width: `${(i / total) * 100}%`, height: "100%", background: "var(--lab-grad)", borderRadius: 4, transition: "width .35s cubic-bezier(.2,.9,.3,1)" }} />
          </div>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>{Math.min(i + 1, total)}/{total}</div>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 700, marginBottom: 20 }}>{dayLabel} · {phaseLabel}</div>

        {dim && (
          <div key={dim.id} className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 60 }}>
            <div className="lab-pop" style={{ fontSize: "4rem", textAlign: "center", marginBottom: 12 }}>{dim.emoji}</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase", textAlign: "center", color: "var(--accent)" }}>{dim.label}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, textAlign: "center", margin: "6px 0 30px", lineHeight: 1.25 }}>{dim.question}</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              {FACES.map((f, v) => {
                const val = v + 1
                const on = scores[dim.id] === val
                return (
                  <button key={v} className="lab-press" onClick={() => pick(val)} aria-label={`${val} von 5`} style={{
                    flex: 1, aspectRatio: "1", maxWidth: 76, borderRadius: 22, fontSize: "2rem",
                    border: on ? `3px solid ${hue[v]}` : "1px solid var(--border)",
                    background: on ? `color-mix(in srgb, ${hue[v]} 18%, var(--surface))` : "var(--surface)",
                    transform: on ? "scale(1.12)" : undefined, boxShadow: on ? `0 8px 24px color-mix(in srgb, ${hue[v]} 40%, transparent)` : "var(--shadow)",
                  }}>{f}</button>
                )
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: "0.78rem", color: "var(--text-dim)", fontWeight: 700 }}>
              <span>{dim.low}</span><span>{dim.high}</span>
            </div>
          </div>
        )}

        {!dim && (
          <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: 6 }}>Ist dir was aufgefallen? 🔎</div>
            <div style={{ color: "var(--text-dim)", marginBottom: 16, fontSize: "0.9rem" }}>Tippe an, was passt. Auch Störfaktoren wie Alkohol oder Stress, damit die Auswertung fair bleibt.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {TAGS.map(t => {
                const on = tags.includes(t)
                return (
                  <button key={t} className="lab-press" onClick={() => setTags(p => on ? p.filter(x => x !== t) : [...p, t])} style={{
                    padding: "9px 13px", borderRadius: 999, fontSize: "0.85rem", fontWeight: on ? 800 : 600,
                    border: on ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: on ? "var(--accent-dim)" : "var(--surface)", color: "var(--text)",
                  }}>{t}</button>
                )
              })}
            </div>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Notiz (optional): Wie war der Tag? Was war anders?"
              style={{ width: "100%", padding: 14, borderRadius: 16, fontSize: "0.95rem", resize: "none" }} />
            <div style={{ marginTop: "auto", paddingTop: 20 }}>
              <Btn full onClick={done}>Check-in abschließen ✨</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
