"use client"
import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  FACES, FACE_LABELS, LIBRARY, ROUTE_INFO, SUPP_COLORS, CATEGORIES, GOALS, RHYTHMS, TRAININGS,
  todayIso, addDays, dayRef, makeSupp, autoOrder, parseSuppList, goalRelevance, extrasOn,
  defaultCheckinTime, libOf, daySum, libTimeTip, STORE_MODE,
  type CheckIn, type Dim, type LabState, type MySupp, type Settings, type LibSupp, type GoalId, type Scores,
} from "@/lib/supplementLab"
import { hasNativeReminders } from "@/lib/labReminders"
import { eveningDims, morningAnswered, sidesOf, type ExtraInput } from "@/lib/labDay"
import { DaySheet, ExtraList, SidesWithSuspect } from "./day"
import { pairsWith } from "@/lib/labInteractions"
import { fetchOverview } from "@/lib/labCommunity"
import { Btn, Capsule, Card, FaceRow, Label, Segmented, Stars, TagChips } from "./ui"
import { KolbiTip, MASCOT_NAME, Mascot } from "./mascot"
import { InstallHint } from "./install"
import type { Mood } from "@/lib/labCoach"
import { t, dec, clock } from "@/lib/labI18n"

// ── Supplement-Auswahl: antippen oder Liste einfügen ───────────────────────────

export function SuppPicker({ selected, goals, onToggle, onAddCustom, onPasteAdd, onAway, initialMode = "tap" }: {
  selected: MySupp[]; goals: GoalId[]; initialMode?: "tap" | "paste"
  onToggle: (lib: LibSupp) => void; onAddCustom: (name: string) => void
  onPasteAdd: (items: { lib: LibSupp | null; name: string; dose: string }[]) => void
  /** „Schon zu Hause?“ – nicht da = Einkaufsliste, zählt noch nicht mit */
  onAway?: (libId: string, away: boolean) => void
}) {
  const [mode, setMode] = useState<"tap" | "paste">(initialMode)
  const [q, setQ] = useState("")
  const [lastAdded, setLastAdded] = useState<LibSupp | null>(null)
  // Social Proof: wie viele andere haben es nach dem Test behalten? (ab genug Beiträgen)
  const [crowd, setCrowd] = useState<Record<string, { n: number; keepPct: number | null }>>({})
  useEffect(() => { let on = true; fetchOverview().then(v => { if (on && v?.libs) setCrowd(v.libs) }); return () => { on = false } }, [])
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
      <button key={l.id} className="lab-press" onClick={() => { setLastAdded(on ? null : l); onToggle(l) }} style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 12px", borderRadius: 999,
        border: on ? `2px solid ${c}` : "1px solid var(--border)",
        background: on ? `color-mix(in srgb, ${c} 16%, var(--surface))` : "var(--surface)",
        color: "var(--text)", fontWeight: on ? 800 : 600, fontSize: "0.85rem",
      }}>
        <span>{l.emoji}</span>{l.name}
        {l.route && l.route !== "oral" && <span style={{ fontSize: "0.75rem" }}>{ROUTE_INFO[l.route].emoji}</span>}
        {crowd[l.id]?.keepPct != null && <span title={t("{n} Tests in der Community", { n: crowd[l.id].n })} style={{ fontSize: "0.68rem", fontWeight: 800, padding: "1px 6px", borderRadius: 999, background: "color-mix(in srgb, #1baf7a 15%, transparent)", color: "#1baf7a" }}>👥 {crowd[l.id].keepPct} %</span>}
        {on && <span>✓</span>}
      </button>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <Segmented value={mode} onChange={setMode} options={[{ id: "tap", label: t("👆 Antippen") }, { id: "paste", label: t("📋 Liste einfügen") }]} />
      </div>

      {mode === "paste" ? (
        <div className="lab-rise">
          <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={5} autoFocus
            placeholder={t("Einfach reinkopieren, z. B.:\nMagnesium 400mg, Vitamin D3, Omega 3\nBPC-157, Kreatin 5g, Ashwagandha")}
            style={{ width: "100%", padding: 14, borderRadius: 16, fontSize: "0.95rem", resize: "vertical" }} />
          {parsed.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Label style={{ marginBottom: 8 }}>{t("Erkannt · {n}", { n: parsed.length })}</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {parsed.map((p, i) => (
                  <span key={i} style={{
                    padding: "7px 11px", borderRadius: 999, fontSize: "0.82rem", fontWeight: 700,
                    background: p.lib ? "var(--accent-dim)" : "var(--surface-2)", border: p.lib ? "1px solid var(--accent)" : "1px dashed var(--border)",
                  }}>{p.lib?.emoji ?? "💊"} {p.name}{p.dose && <span style={{ color: "var(--text-dim)", fontWeight: 600 }}> · {p.dose}</span>}{!p.lib && <span style={{ color: "var(--text-dim)", fontWeight: 600 }}> · {t("eigenes")}</span>}</span>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <Btn full onClick={() => { onPasteAdd(parsed); setPaste(""); setMode("tap") }}>{t("✓ Alle {n} übernehmen", { n: parsed.length })}</Btn>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="lab-rise">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("🔍 Suchen … (z. B. Magnesium, BPC)")}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 14, fontSize: "0.95rem", marginBottom: 14 }} />
          {lastAdded && sel.has(lastAdded.id) && (() => {
            const tip = libTimeTip(lastAdded)
            return (
              <div key={lastAdded.id} className="lab-rise" style={{ position: "sticky", top: 8, zIndex: 2, marginBottom: 14 }}>
                <KolbiTip title={`${lastAdded.emoji} ${t("{name}: am besten {when}", { name: lastAdded.name, when: `${tip.emoji} ${tip.label.charAt(0).toLowerCase()}${tip.label.slice(1)}` })}`}>{tip.why}</KolbiTip>
                {(() => {
                  const pairs = pairsWith({ supps: selected }, lastAdded.id)
                  if (!pairs.length) return null
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                      {pairs.slice(0, 3).map(p => {
                        const bad = p.rule.kind === "trennen"
                        return (
                          <div key={p.other.id} className="lab-pop" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 14,
                            background: bad ? "var(--warning-dim)" : "var(--accent-dim)", fontSize: "0.78rem", lineHeight: 1.35 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, fontSize: "1rem" }}>{lastAdded.emoji}<span style={{ fontSize: "0.8rem" }}>{bad ? "⚡" : "✨"}</span>{p.other.emoji}</span>
                            <span><b>{bad ? t("Mit {name} trennen", { name: p.other.name }) : t("Passt zu {name}", { name: p.other.name })}</b> · {bad ? t("ich achte auf 2 h Abstand") : p.rule.text}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
                {onAway && (() => {
                  const away = !!selected.find(s => s.lib === lastAdded.id)?.away
                  const opt = (v: boolean, l: string) => (
                    <button className="lab-press" onClick={() => onAway(lastAdded.id, v)} aria-pressed={away === v} style={{
                      flex: 1, padding: "9px 10px", borderRadius: 14, fontWeight: 800, fontSize: "0.8rem", color: "var(--text)",
                      border: away === v ? "2px solid var(--accent)" : "1px solid var(--border)", background: away === v ? "var(--accent-dim)" : "var(--surface)",
                    }}>{l}</button>
                  )
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-dim)", flexShrink: 0 }}>{t("Schon zu Hause?")}</span>
                      {opt(false, t("✓ Ja"))}{opt(true, t("🛒 Noch nicht"))}
                    </div>
                  )
                })()}
              </div>
            )
          })()}
          {!ql && suggested.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Label style={{ marginBottom: 8, color: "var(--accent)" }}>{t("⭐ Passt zu deinen Zielen")}</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{suggested.slice(0, 12).map(chip)}</div>
            </div>
          )}
          {CATEGORIES.map(cat => {
            const items = LIBRARY.filter(l => l.category === cat && (!ql || l.name.toLowerCase().includes(ql) || l.aliases.some(a => a.includes(ql))))
            if (!items.length) return null
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <Label style={{ marginBottom: 8 }}>{cat === "Peptide" ? t("🧬 Peptide") : t(cat)}</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{items.map(chip)}</div>
              </div>
            )
          })}
          {ql && !LIBRARY.some(l => l.name.toLowerCase().includes(ql)) && (
            <Btn variant="soft" full onClick={() => { onAddCustom(q.trim()); setQ("") }}>{t("+ „{name}“ als eigenes hinzufügen", { name: q.trim() })}</Btn>
          )}
          {selected.filter(s => !s.lib).length > 0 && (
            <div style={{ marginTop: 6 }}>
              <Label style={{ marginBottom: 8 }}>{t("Eigene")}</Label>
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
  { days: 3, label: t("3 Tage"), sub: t("schnell") },
  { days: 5, label: t("5 Tage"), sub: t("empfohlen") },
  { days: 7, label: t("7 Tage"), sub: t("am genauesten") },
]

/** Einstieg von der Website: ?s=magnesium,vitd (Kosten-Rechner) oder src=testmagnesium (Selbsttest-Seite) → schon ausgewählt */
function prefillSupps(): MySupp[] {
  try {
    const q = new URLSearchParams(window.location.search)
    const ids = (q.get("s") ?? "").split(",")
    const src = q.get("src") ?? ""
    // Wer von einer Selbsttest-Seite kommt, will genau dieses Supplement testen – auch wenn es langsam ist
    const testKey = src.toLowerCase().startsWith("test") ? src.slice(4).toLowerCase().replace(/[^a-z]/g, "") : ""
    if (testKey) ids.push(testKey)
    const out: MySupp[] = []
    for (const raw of ids) {
      const key = raw.toLowerCase().replace(/[^a-z]/g, "")
      const lib = key ? LIBRARY.find(l => l.id.replace(/[^a-z]/g, "") === key) : undefined
      if (lib && lib.category !== "Peptide" && !lib.rx && !out.some(x => x.lib === lib.id))
        out.push({ ...makeSupp(lib, lib.name, out), ...(key === testKey ? { mode: "test" as const, keepTesting: true } : {}) })
    }
    return out.slice(0, 12)
  } catch { return [] }
}

export function Onboarding({ onStart, onDemo }: { onStart: (r: OnboardResult) => void; onDemo: () => void }) {
  const [step, setStep] = useState(0)
  const [goals, setGoals] = useState<GoalId[]>([])
  const [supps, setSupps] = useState<MySupp[]>(prefillSupps)
  const [rhythm, setRhythm] = useState("normal")
  const [settings, setSettings] = useState<Settings>({ wake: "07:00", bed: "23:00", training: null, washoutDays: 1 })
  const [trainingSet, setTrainingSet] = useState(false)
  const [baseline, setBaseline] = useState(5)
  const [remind, setRemind] = useState<boolean>(true)

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

  const STEPS = 4
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
  const question = (text: string) => <div style={{ fontSize: "1.55rem", fontWeight: 900, lineHeight: 1.15, marginBottom: 16, textWrap: "balance" }}>{text}</div>
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
          <button className="lab-press" onClick={() => setStep(s => s - 1)} aria-label={t("Zurück")} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text)", flexShrink: 0 }}>←</button>
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
          <div style={{ textAlign: "center", fontSize: "2rem", fontWeight: 900, lineHeight: 1.1, margin: "8px 0 10px" }}>{t("Hi, ich bin {name}!", { name: MASCOT_NAME })}</div>
          <div style={{ textAlign: "center", fontSize: "1.02rem", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: 22, textWrap: "balance" }}>
            {t("Ich finde mit dir heraus, welche Supplements bei dir wirklich wirken. Du tippst nur, ich plane und werte aus.")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {[["🧘", t("Ein paar Tage nichts nehmen"), t("So lerne ich dein Normal kennen.")], ["🔬", t("Dann eins nach dem anderen testen"), t("Immer nur ein Supplement für ein paar Tage.")], ["🏆", t("Am Ende: dein Stack"), t("Was du behältst, nimmst du zusammen – ich behalte es im Blick.")]].map(([e, ti, d]) => (
              <div key={ti} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "1.5rem" }}>{e}</span>
                <div><div style={{ fontWeight: 800, fontSize: "0.92rem" }}>{ti}</div><div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{d}</div></div>
              </div>
            ))}
          </div>
          {STORE_MODE && <div style={{ marginBottom: 14 }}><InstallHint compact /></div>}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn full onClick={next}>{t("Los geht's · 1 Minute")}</Btn>
            <Btn full variant="ghost" onClick={onDemo}>{t("Erst mal mit Beispiel-Daten umschauen")}</Btn>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("happy", <>{t("Damit ich weiß, worauf ich achten soll:")} <b>{t("Was ist dir wichtig?")}</b> {t("Mehrere sind okay.")}</>)}
          {question(t("Deine Ziele"))}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {GOALS.map(g => tile(goals.includes(g.id), () => setGoals(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id]), g.emoji, g.label))}
          </div>
          {footer(<Btn full onClick={next}>{goals.length ? t("Weiter") : t("Überspringen")}</Btn>)}
        </div>
      )}

      {step === 2 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("happy", <>{t("Tipp an,")} <b>{t("was du gerade nimmst")}</b>{t(". Oder kopier deine Liste rein, ich erkenne sie. Später ergänzen geht jederzeit.")}</>)}
          {question(t("Was nimmst du gerade?"))}
          {supps.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {supps.map(s => <Capsule key={s.id} supp={s} size="sm" onClick={() => setSupps(p => p.filter(x => x.id !== s.id))} right={<span style={{ color: "var(--text-dim)" }}>✕</span>} />)}
            </div>
          )}
          <SuppPicker selected={supps} goals={goals} onToggle={toggleSupp} onAddCustom={addCustom} onPasteAdd={pasteAdd}
            onAway={(libId, v) => setSupps(prev => prev.map(x => x.lib === libId ? { ...x, away: v ? todayIso() : undefined } : x))} />
          {footer(<Btn full disabled={!supps.length} onClick={next}>{supps.length ? t("Weiter mit {n}", { n: supps.length }) : t("Wähle mindestens eins")}</Btn>)}
        </div>
      )}

      {step === 3 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("sleepy", <>{t("Damit ich dich")} <b>{t("zur richtigen Uhrzeit")}</b> {t("erinnere: Wie sieht dein Tag aus?")}</>)}
          {question(t("Wann stehst du auf?"))}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginBottom: 10 }}>
            {RHYTHMS.map(r => tile(rhythm === r.id, () => { setRhythm(r.id); setSettings(s => ({ ...s, wake: r.wake, bed: r.bed })) }, r.emoji, r.label, `${r.wake}–${r.bed}`))}
          </div>
          <button onClick={() => setRhythm("custom")} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.85rem", fontWeight: 700, textAlign: "left", padding: "6px 0", cursor: "pointer" }}>
            {rhythm === "custom" ? t("Deine Zeiten:") : t("✏️ Andere Zeiten eingeben")}
          </button>
          {rhythm === "custom" && (
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {([["wake", t("🌅 Aufstehen")], ["bed", t("🛌 Schlafen")]] as const).map(([k, l]) => (
                <label key={k} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, fontWeight: 800, fontSize: "0.8rem" }}>{l}
                  <input type="time" value={settings[k]} onChange={ev => setSettings(s => ({ ...s, [k]: ev.target.value }))} style={{ padding: "10px", borderRadius: 12, fontWeight: 700, fontSize: "1rem" }} />
                </label>
              ))}
            </div>
          )}
          <div style={{ fontWeight: 900, fontSize: "1.05rem", margin: "18px 0 10px" }}>{t("Und wann trainierst du meistens?")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
            {TRAININGS.map(tr => tile(trainingSet && settings.training === tr.time, () => { setSettings(s => ({ ...s, training: tr.time })); setTrainingSet(true) }, tr.emoji, tr.label))}
          </div>
          {footer(<Btn full onClick={next}>{t("Weiter")}</Btn>)}
        </div>
      )}

      {step === 4 && (
        <div className="lab-rise" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {kolbi("party", <>{t("Alles klar,")} <b>{t("ich hab deinen Plan")}</b>{t(". Ab jetzt sage ich dir jeden Tag, was dran ist.")}</>)}
          {question(t("Wann legst du los?"))}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {[
              ["🧘", t("{n} Tage Reset", { n: baseline }), t("nichts nehmen, jeden Abend 1 Tipp")],
              ["🔬", testOrder.length === 1 ? t("Dann 1 Test, einzeln") : t("Dann {n} Tests, einzeln", { n: testOrder.length }), testOrder.slice(0, 4).map(x => x.name).join(" → ") + (testOrder.length > 4 ? " …" : "")],
              ["🏆", t("Dein Stack"), t("alles Behaltene zusammen")],
            ].map(([e, ti, d]) => (
              <div key={ti} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "1.5rem" }}>{e}</span>
                <div style={{ minWidth: 0 }}><div style={{ fontWeight: 800 }}>{ti}</div><div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{d}</div></div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-dim)", marginBottom: 6 }}>{t("Wie lange willst du pausieren?")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginBottom: 10 }}>
            {RESET_OPTIONS.map(o => (
              <button key={o.days} className="lab-press" onClick={() => setBaseline(o.days)} style={{
                padding: "8px 4px", borderRadius: 14, color: "var(--text)", fontSize: "0.8rem", fontWeight: 800, lineHeight: 1.25,
                border: baseline === o.days ? "2px solid var(--accent)" : "1px solid var(--border)", background: baseline === o.days ? "var(--accent-dim)" : "var(--surface)",
              }}>{o.label}<br /><span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-dim)" }}>{o.sub}</span></button>
            ))}
          </div>
          {rx.length > 0 && <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.45, marginBottom: 10 }}>💊 {t("Ausnahme:")} <b>{rx.map(x => x.name).join(", ")}</b> {t("ist ärztlich verordnet und läuft einfach weiter.")}</div>}
          {supps.some(x => x.lib === "koffein") && (
            <div style={{ marginBottom: 10, fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.45 }}>{t("☕ Ohne Kaffee sind Kopfschmerzen in den ersten Tagen normal. Wenn du Kaffee nicht testen willst, entferne ihn einfach aus deiner Liste.")}</div>
          )}
          <button className="lab-press" onClick={() => setRemind(r => !r)} aria-pressed={!!remind} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 16, marginBottom: 12,
            border: remind ? "2px solid var(--accent)" : "1px solid var(--border)", background: remind ? "var(--accent-dim)" : "var(--surface)", color: "var(--text)",
          }}>
            <span style={{ fontSize: "1.4rem" }}>{remind ? "🔔" : "🔕"}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 800, fontSize: "0.9rem" }}>{t("Soll ich dich erinnern?")}</span>
              <span style={{ display: "block", fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.4 }}>{t("Ich melde mich")} {t("zur Einnahme-Zeit")} {t("und")} {t("abends um {time}", { time: clock(defaultCheckinTime(settings)) })}{remind && !hasNativeReminders() ? ` · ${t("📅 Beim Start trage ich die Termine in deinen Kalender ein, damit es auch klappt, wenn die App zu ist.")}` : ""}</span>
            </span>
            <span style={{ fontWeight: 900, fontSize: "0.8rem", color: remind ? "var(--accent)" : "var(--text-dim)" }}>{remind ? t("An") : t("Aus")}</span>
          </button>
          {special.length > 0 && (
            <div style={{ fontSize: "0.78rem", lineHeight: 1.5, padding: "10px 12px", borderRadius: 14, background: "var(--danger-dim)", marginBottom: 10 }}>
              {STORE_MODE
                ? <>⚕️ <b>{t("Eigene Substanzen:")}</b> {t("Ich protokolliere nur, was du einträgst, und empfehle keine Substanzen oder Dosierungen. Alles über normale Nahrungsergänzung hinaus bitte ärztlich abklären.")}</>
                : <>🧬 <b>{t("Peptide:")}</b> {t("Die meisten sind nicht als Arzneimittel zugelassen und kaum am Menschen untersucht. Nur mit ärztlicher Begleitung und geprüfter Quelle.")}</>}
            </div>
          )}
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
            {t("⚕️ Kein medizinischer Rat. Verschriebene Medikamente nie eigenmächtig absetzen.")}
          </div>
          {footer(
            <div style={{ display: "flex", gap: 8 }}>
              <Btn full onClick={() => start(0)}>{t("Heute starten 🚀")}</Btn>
              <Btn variant="soft" onClick={() => start(1)} style={{ whiteSpace: "nowrap" }}>{t("Morgen")}</Btn>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Check-in: 1 Screen, Gesichter + Sterne ────────────────────────────────────

export function CheckInSheet({ s, date, phaseLabel, onDone, onClose, onAddExtra, onRemoveExtra }: {
  s: LabState; date: string; phaseLabel: string; onDone: (c: CheckIn) => void; onClose: () => void
  onAddExtra: (date: string, item: ExtraInput, label: string) => void; onRemoveExtra: (date: string, id: string) => void
}) {
  const existing = s.checkins[date]
  const yesterday = s.checkins[addDays(date, -1)]
  const dims = eveningDims(s, date)
  const sleptMorning = morningAnswered(s, date)
  const [extraOpen, setExtraOpen] = useState(false)
  const [scores, setScores] = useState<Scores>(existing?.scores ?? {})
  const [touched, setTouched] = useState<Set<Dim>>(new Set(existing && !existing.quick ? (Object.keys(existing.scores) as Dim[]) : []))
  const [overall, setOverall] = useState<number | undefined>(existing ? Math.round(daySum(existing)) : undefined)
  const [tags, setTags] = useState<string[]>(existing?.tags ?? [])
  const [note, setNote] = useState(existing?.note ?? "")
  // Beschwerden vorbelegen – auch die, die tagsüber schon eingetragen wurden
  const [sides, setSides] = useState<Record<string, number>>(() => sidesOf(s, date).sides)
  const [suspect, setSuspect] = useState<Record<string, string>>(() => sidesOf(s, date).suspect)
  const [showNote, setShowNote] = useState(!!existing?.note)
  const isToday = date === todayIso()

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
    onDone({ date, scores: full, tags, sides, ...(Object.keys(suspect).length ? { suspect } : {}), note: note.trim(), quick: touched.size === 0 })
  }

  return (
    <div className="lab-fade" style={{ position: "fixed", inset: 0, zIndex: 450, background: "var(--background)", overflowY: "auto" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 18px calc(24px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 900 }}>📅 {dayRef(date)}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 700 }}>Check-in{phaseLabel ? <> · {phaseLabel}</> : null}</div>
          </div>
          <button className="lab-press" onClick={onClose} aria-label={t("Schließen")} style={{ width: 38, height: 38, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text)" }}>✕</button>
        </div>

        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>{isToday ? t("Wie war dein Tag insgesamt?") : t("Wie war der Tag insgesamt?")}</div>
          <FaceRow value={overall} onPick={pickOverall} faces={FACES} labels={FACE_LABELS} />
          {yesterday && !existing && (
            <button className="lab-press" onClick={() => { setScores({ ...yesterday.scores }); setOverall(Math.round(daySum(yesterday))); setTouched(new Set(Object.keys(yesterday.scores) as Dim[])) }}
              style={{ marginTop: 10, background: "none", border: "1px dashed var(--border)", borderRadius: 12, padding: "8px 12px", color: "var(--text-dim)", fontWeight: 700, fontSize: "0.8rem", width: "100%" }}>
              {t("↺ Wie gestern übernehmen")}
            </button>
          )}
        </Card>

        <Card style={{ marginBottom: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <Label>{t("Einzeln bewerten (optional)")}</Label>
            {avg != null && <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "#f5b400" }}>Ø ★ {dec(avg, 1)}</span>}
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
          {sleptMorning && <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", paddingTop: 6, borderTop: "1px solid var(--border)" }}>{t("🌙 Schlaf hast du schon morgens eingetragen.")}</div>}
        </Card>

        {/* Störfaktoren direkt sichtbar (auch beim Nachtragen vergangener Tage, z. B. Alkohol am Wochenende) */}
        <Card style={{ marginBottom: 12, padding: "12px 14px" }}>
          <div style={{ marginBottom: 8 }}>
            <Label>{isToday ? t("War heute was anders?") : t("War an dem Tag was anders?")}</Label>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{t("Optional – damit der Vergleich fair bleibt.")}</div>
          </div>
          <TagChips value={tags} onChange={setTags} />
        </Card>

        {/* Extra-Einnahmen (außerhalb des Plans) – werden sofort gespeichert */}
        <Card style={{ marginBottom: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: extrasOn(s, date).length ? 8 : 0 }}>
            <span style={{ minWidth: 0 }}>
              <Label>{t("Zusätzlich genommen?")}</Label>
              <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-dim)" }}>{t("Auch außerhalb deines Plans.")}</span>
            </span>
            <button className="lab-press" onClick={() => setExtraOpen(true)} style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 999, border: "1px dashed var(--border)", background: "var(--surface)", color: "var(--text)", fontWeight: 800, fontSize: "0.8rem" }}>{t("➕ Extra")}</button>
          </div>
          <ExtraList s={s} date={date} onRemove={id => onRemoveExtra(date, id)} />
        </Card>
        {extraOpen && <DaySheet s={s} date={date} fixedDate onlyTake z={470} onAdd={onAddExtra} onRemove={onRemoveExtra} onSides={() => {}} onClose={() => setExtraOpen(false)} />}

        <Card style={{ marginBottom: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <Label>{t("Beschwerden?")}</Label>
            <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{t("1× leicht · 2× stark")}</span>
          </div>
          <SidesWithSuspect s={s} date={date} value={sides} suspect={suspect} onChange={setSides} onSuspect={setSuspect} />
        </Card>

        <button onClick={() => setShowNote(v => !v)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.85rem", padding: "4px 0 10px", cursor: "pointer" }}>
          {showNote ? "▾" : "▸"} {t("Notiz (optional)")}
        </button>
        {showNote && (
          <div className="lab-rise" style={{ marginBottom: 12 }}>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder={t("Notiz (optional)")}
              style={{ width: "100%", padding: 12, borderRadius: 14, fontSize: "0.92rem", resize: "none" }} />
          </div>
        )}

        <Btn full disabled={overall == null && !filled.length} onClick={save}>{existing ? t("Speichern") : t("Check-in abschließen ✨")}</Btn>
      </div>
    </div>
  )
}

