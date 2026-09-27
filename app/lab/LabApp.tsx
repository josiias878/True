"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Confetti from "@/components/Confetti"
import {
  DIMS, FACES, FACE_LABELS, ONSET_INFO, SIDE_EFFECTS, SIDE_BY_ID, LIB_SIDES, knownSides, ROUTE_INFO, SLOTS, BADGES, GOALS,
  loadState, saveState, emptyState, demoState, computeBadges, levelFor, streak, hydrate,
  phaseWindows, phaseAt, testResult, checkinsIn, buildStack, allowedSlots, slotTime, slotFor, stackMembers, intakeOn,
  todayIso, addDays, diffDays, fmtDate, suppColor, daySum, activeDims, signal, libOf, makeSupp, defaultDays, defaultCheckinTime,
  type LabState, type Decision, type Dim, type PhaseWindow, type Phase, type MySupp, type LibSupp, type Settings, type CheckIn, type Scores,
} from "@/lib/supplementLab"
import { checkLabReminders, downloadIcs } from "@/lib/labReminders"
import { LAB_CSS, Btn, Capsule, Card, FaceRow, Label, Segmented, Sheet, SideChips, Stars, Stepper, XpToast } from "./ui"
import { CheckInSheet, MODE_OPTIONS, Onboarding, OrderEditor, SuppPicker } from "./flows"
import { DeltaBars, DimLineChart, MoodCalendar, ProCon } from "./charts"

type Tab = "heute" | "reise" | "daten" | "stack"

const fmt = (n: number, sign = false) => `${sign && n > 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")}`

function phaseTitle(s: LabState, w: { kind: string; suppId?: string }) {
  if (w.kind === "baseline") return "Reset-Woche"
  if (w.kind === "washout") return "Auswaschpause"
  return `Test: ${s.supps.find(x => x.id === w.suppId)?.name ?? "?"}`
}
function phaseEmoji(s: LabState, w: { kind: string; suppId?: string }) {
  if (w.kind === "baseline") return "🧘"
  if (w.kind === "washout") return "💧"
  return s.supps.find(x => x.id === w.suppId)?.emoji ?? "💊"
}

const DECISIONS: { id: Decision; emoji: string; label: string; color: string }[] = [
  { id: "keep",  emoji: "💚", label: "Behalten",  color: "#1baf7a" },
  { id: "maybe", emoji: "🤔", label: "Vielleicht", color: "#eda100" },
  { id: "drop",  emoji: "✂️", label: "Fliegt raus", color: "#e34948" },
]

function quickCheckin(s: LabState, date: string, v: number): CheckIn {
  const scores: Scores = {}
  activeDims(s).forEach(d => { scores[d.id] = v })
  return { date, scores, tags: [], note: "", quick: true }
}

function initialTab(): Tab {
  try { return (localStorage.getItem("true-lab-tab") as Tab | null) ?? "heute" } catch { return "heute" }
}

/** Aktionen aus Benachrichtigungen (?rate=4, ?taken=id, ?checkin=1) direkt beim Öffnen ausführen. */
function initialLoad(): { s: LabState; openCheckin: boolean; flash: string | null } {
  const s = loadState()
  let openCheckin = false
  let flash: string | null = null
  try {
    const q = new URLSearchParams(window.location.search)
    const today = todayIso()
    const rate = Number(q.get("rate"))
    const taken = q.get("taken")
    if (rate >= 1 && rate <= 5 && s.startDate && !s.checkins[today]) {
      s.checkins[today] = quickCheckin(s, today, rate)
      s.xp += 20
      flash = `${FACES[rate - 1]} Check-in gespeichert (+20 XP)`
    }
    if (taken && s.startDate) {
      s.took[today] = [...new Set([...(s.took[today] ?? []), taken])]
      flash = `✓ ${s.supps.find(x => x.id === taken)?.name ?? "Einnahme"} abgehakt`
    }
    if (q.get("checkin") === "1" && !s.checkins[today] && s.startDate) openCheckin = true
    if (rate || taken || q.get("checkin")) {
      saveState(s)
      window.history.replaceState(null, "", window.location.pathname)
    }
  } catch {}
  return { s, openCheckin, flash }
}

// Echte Daten sichern, wenn man zwischendurch die Demo anschaut
const BACKUP_KEY = "true-supplement-lab-v1-backup"
function backup(s: LabState) {
  if (s.demo || !s.startDate) return
  try { localStorage.setItem(BACKUP_KEY, JSON.stringify(s)) } catch {}
}
function restoreBackup(): LabState {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    localStorage.removeItem(BACKUP_KEY)
    if (raw) return hydrate(JSON.parse(raw))
  } catch {}
  return emptyState()
}

type Update = (fn: (prev: LabState) => LabState, xp?: { amount: number; label: string }) => void

// Wird nur im Browser gerendert (siehe page.tsx), daher darf der State direkt aus localStorage kommen.
export default function LabApp() {
  const [init] = useState(initialLoad)
  const [s, setS] = useState<LabState>(init.s)
  const [tab, setTab] = useState<Tab>(initialTab)
  const [checkinDate, setCheckinDate] = useState<string | null>(init.openCheckin ? todayIso() : null)
  const [verdictFor, setVerdictFor] = useState<string | null>(null)
  const [phaseSheet, setPhaseSheet] = useState<PhaseWindow | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState<{ amount: number; label: string; k: number } | null>(null)
  const [flash, setFlash] = useState<string | null>(init.flash)
  const [newBadge, setNewBadge] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)

  useEffect(() => { try { localStorage.setItem("true-lab-tab", tab) } catch {} }, [tab])
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 2600); return () => clearTimeout(t) }, [flash])

  // Erinnerungen prüfen, solange die App offen ist (System-Benachrichtigung, je 1× pro Tag)
  useEffect(() => {
    checkLabReminders()
    const id = setInterval(checkLabReminders, 60_000)
    return () => clearInterval(id)
  }, [])

  const update: Update = useCallback((fn, xp) => {
    setS(prev => {
      let next = fn(structuredClone(prev))
      if (xp) next.xp += xp.amount
      const badges = computeBadges(next)
      const fresh = badges.filter(b => !next.badges.includes(b))
      if (fresh.length) {
        next = { ...next, badges, xp: next.xp + fresh.length * 30 }
        setTimeout(() => { setNewBadge(fresh[0]); setConfetti(true) }, xp ? 900 : 100)
      }
      saveState(next)
      return next
    })
    if (xp) {
      const k = Date.now()
      setToast({ ...xp, k })
      setTimeout(() => setToast(t => (t?.k === k ? null : t)), 1800)
    }
  }, [])

  const saveCheckin = useCallback((c: CheckIn) => {
    const isNew = !s.checkins[c.date]
    const refined = !isNew && s.checkins[c.date]?.quick && !c.quick
    update(p => { p.checkins[c.date] = c; return p },
      isNew ? { amount: 20, label: "Check-in" } : refined ? { amount: 10, label: "Feintuning" } : undefined)
    if (isNew) setConfetti(true)
  }, [s.checkins, update])

  // Kalender-Download zuerst (braucht die direkte Nutzer-Geste, v. a. auf iOS), dann Berechtigung anfragen
  const enableReminders = useCallback((withCalendar: boolean) => {
    const reminders = { ...s.reminders, enabled: true, checkin: s.reminders.checkin || defaultCheckinTime(s.settings) }
    if (withCalendar) downloadIcs({ ...s, reminders })
    update(p => { p.reminders = reminders; return p })
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {})
  }, [s, update])

  // ── Onboarding ──
  if (!s.startDate) {
    return (
      <div className="lab" style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)" }}>
        <style>{LAB_CSS}</style>
        <Onboarding
          onDemo={() => { const d = demoState(); saveState(d); setS(d); setTab("heute") }}
          onStart={({ state, wantsCalendar }) => {
            const next = hydrate({ ...emptyState(), ...state })
            next.badges = computeBadges(next)
            saveState(next); setS(next); setTab("heute"); setConfetti(true)
            if (wantsCalendar) downloadIcs(next)
          }}
        />
        {confetti && <Confetti onDone={() => setConfetti(false)} />}
      </div>
    )
  }

  const wins = phaseWindows(s)
  const today = todayIso()
  const lvl = levelFor(s.xp)
  const st = streak(s)

  return (
    <div className="lab" style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)" }}>
      <style>{LAB_CSS}</style>

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100, background: "var(--nav-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/home" aria-label="Zurück zu TRUE" style={{ color: "var(--text-dim)", textDecoration: "none", fontSize: "1.1rem", padding: "4px 6px 4px 0" }}>←</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", lineHeight: 1.1 }}>Supplement Lab {s.demo && <span style={{ fontSize: "0.65rem", background: "var(--warning-dim)", color: "var(--warning)", padding: "2px 6px", borderRadius: 6, verticalAlign: "middle" }}>DEMO</span>}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{lvl.emoji} {lvl.name}</span>
              <div style={{ flex: 1, maxWidth: 120, height: 5, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ width: `${lvl.progress * 100}%`, height: "100%", background: "var(--lab-grad)", transition: "width .8s" }} />
              </div>
              <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>{s.xp} XP</span>
            </div>
          </div>
          <div title={`${st} Tage Streak`} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 999,
            background: st ? "rgba(235,104,52,.14)" : "var(--surface-2)", fontWeight: 900, fontSize: "0.85rem",
          }}>
            <span className={st ? "lab-wiggle" : undefined} style={{ filter: st ? undefined : "grayscale(1)", display: "inline-block" }}>🔥</span>{st}
          </div>
          <button onClick={() => setSettingsOpen(true)} className="lab-press" aria-label="Einstellungen" style={{
            width: 36, height: 36, borderRadius: 999, border: "none", background: "var(--surface-2)", fontSize: "1rem",
          }}>⚙️</button>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "16px 16px calc(110px + env(safe-area-inset-bottom))" }}>
        {tab === "heute" && <TodayView s={s} wins={wins} today={today} onCheckin={setCheckinDate} onQuick={(d, v) => saveCheckin(quickCheckin(s, d, v))}
          onVerdict={setVerdictFor} update={update} goTab={setTab} onReminders={() => enableReminders(true)} />}
        {tab === "reise" && <JourneyView s={s} wins={wins} today={today} onPhase={setPhaseSheet} onPlan={() => setPlanOpen(true)} goTab={setTab} />}
        {tab === "daten" && <DataView s={s} wins={wins} onVerdict={setVerdictFor} onCheckin={setCheckinDate} />}
        {tab === "stack" && <StackView s={s} update={update} onVerdict={setVerdictFor} />}
      </main>

      {/* ── Tab-Leiste ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "var(--nav-bg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid var(--border)", paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", height: 66 }}>
          {([["heute", "🧪", "Heute"], ["reise", "🗺️", "Reise"], ["daten", "📈", "Daten"], ["stack", "🏆", "Stack"]] as const).map(([id, e, l]) => {
            const on = tab === id
            return (
              <button key={id} onClick={() => setTab(id)} className="lab-press" style={{
                flex: 1, border: "none", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                color: on ? "var(--accent)" : "var(--text-dim)", fontWeight: on ? 800 : 600, fontSize: "0.68rem",
              }}>
                <span style={{
                  fontSize: "1.25rem", width: 50, height: 30, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center",
                  background: on ? "var(--accent-dim)" : "transparent", filter: on ? undefined : "grayscale(.6)", transition: "all .2s",
                }}>{e}</span>
                {l}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Overlays ── */}
      {checkinDate && (
        <CheckInSheet
          s={s} date={checkinDate}
          phaseLabel={(() => { const w = phaseAt(s, checkinDate); return w ? phaseTitle(s, w) : "Außerhalb des Experiments" })()}
          onClose={() => setCheckinDate(null)}
          onDone={c => { saveCheckin(c); setCheckinDate(null) }}
        />
      )}
      {verdictFor && <VerdictSheet key={verdictFor} s={s} suppId={verdictFor} onClose={() => setVerdictFor(null)} onSave={(id, decision, note) => {
        const isNew = !s.verdicts[id]
        update(p => { p.verdicts[id] = { decision, note, date: today }; return p }, isNew ? { amount: 50, label: "Urteil gefällt" } : undefined)
        setVerdictFor(null)
      }} />}
      <PhaseSheet s={s} w={phaseSheet} today={today} onClose={() => setPhaseSheet(null)} update={update} onVerdict={id => { setPhaseSheet(null); setVerdictFor(id) }} />
      {planOpen && <PlanSheet s={s} today={today} onClose={() => setPlanOpen(false)} update={update} />}
      {settingsOpen && <SettingsSheet s={s} onClose={() => setSettingsOpen(false)} update={update}
        onEnableReminders={enableReminders}
        onImport={next => { saveState(next); setS(next); setSettingsOpen(false); setFlash("✓ Daten importiert") }}
        onReset={() => { const e = s.demo ? restoreBackup() : emptyState(); saveState(e); setS(e); setSettingsOpen(false) }}
        onDemo={() => { backup(s); const d = demoState(); saveState(d); setS(d); setSettingsOpen(false) }} />}

      {newBadge && (() => {
        const b = BADGES.find(x => x.id === newBadge)!
        return (
          <div className="lab-fade" onClick={() => setNewBadge(null)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(5,5,12,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div className="lab-pop lab-card" style={{ padding: 28, textAlign: "center", maxWidth: 320 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 900, letterSpacing: ".1em", color: "var(--accent)" }}>NEUES ABZEICHEN</div>
              <div className="lab-float" style={{ fontSize: "4.5rem", margin: "12px 0" }}>{b.emoji}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{b.name}</div>
              <div style={{ color: "var(--text-dim)", margin: "6px 0 18px" }}>{b.desc}</div>
              <Btn full onClick={() => setNewBadge(null)}>Nice! +30 XP</Btn>
            </div>
          </div>
        )
      })()}
      {toast && <XpToast key={toast.k} amount={toast.amount} label={toast.label} />}
      {flash && !toast && (
        <div style={{ position: "fixed", top: 18, left: 0, right: 0, zIndex: 600, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
          <div className="lab-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999, padding: "10px 18px", fontWeight: 800, boxShadow: "var(--shadow)" }}>{flash}</div>
        </div>
      )}
      {confetti && <Confetti onDone={() => setConfetti(false)} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEUTE
// ═══════════════════════════════════════════════════════════════════════════════

function TodayView({ s, wins, today, onCheckin, onQuick, onVerdict, update, goTab, onReminders }: {
  s: LabState; wins: PhaseWindow[]; today: string; onCheckin: (d: string) => void; onQuick: (d: string, v: number) => void
  onVerdict: (id: string) => void; update: Update; goTab: (t: Tab) => void; onReminders: () => void
}) {
  const w = wins.find(x => today >= x.start && today <= x.end) ?? null
  const first = wins[0]
  const last = wins[wins.length - 1]
  const notStarted = first && today < first.start
  const finished = last && today > last.end
  const pending = wins.filter(x => x.kind === "test" && x.suppId && x.end < today && !s.verdicts[x.suppId])
  const checked = s.checkins[today]
  const yesterday = addDays(today, -1)
  const missedYesterday = first && yesterday >= first.start && !s.checkins[yesterday] && (!last || yesterday <= last.end)
  const testId = w?.kind === "test" ? w.suppId : undefined
  const testSupp = s.supps.find(x => x.id === testId)
  const lib = libOf(testSupp)
  const intake = intakeOn(s, today)
  const took = s.took[today] ?? []
  const dayNo = w ? diffDays(w.start, today) + 1 : 0
  const totalDays = first && last ? diffDays(first.start, last.end) + 1 : 0
  const expDay = first ? Math.min(totalDays, Math.max(0, diffDays(first.start, today) + 1)) : 0
  const color = w?.kind === "test" ? suppColor(testSupp) : "#2ECC8A"

  const [dismissed, setDismissed] = useState(false)
  const toggleTook = (id: string) => {
    const on = took.includes(id)
    update(p => { const cur = p.took[today] ?? []; p.took[today] = on ? cur.filter(x => x !== id) : [...cur, id]; return p }, on ? undefined : { amount: 5, label: "Eingenommen" })
  }
  const takeAll = () => update(p => { p.took[today] = [...new Set([...(p.took[today] ?? []), ...intake])]; return p }, { amount: 5 * intake.filter(i => !took.includes(i)).length, label: "Alles genommen" })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Mission-Karte */}
      <div className="lab-rise" style={{
        borderRadius: 28, padding: 20, color: "#fff", position: "relative", overflow: "hidden",
        background: w?.kind === "test"
          ? `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 55%, #0b0b1a) 100%)`
          : w?.kind === "washout" ? "linear-gradient(135deg, #3987e5 0%, #1c3f7a 100%)" : "var(--lab-grad)",
        boxShadow: `0 16px 40px color-mix(in srgb, ${color} 40%, transparent)`,
      }}>
        <div style={{ position: "absolute", right: -20, top: -20, width: 160, height: 160, borderRadius: 999, background: "rgba(255,255,255,.1)" }} />
        <div style={{ position: "absolute", right: 40, bottom: -50, width: 110, height: 110, borderRadius: 999, background: "rgba(255,255,255,.08)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 900, letterSpacing: ".1em", opacity: 0.85 }}>
            {notStarted ? "STARTET BALD" : finished ? "EXPERIMENT ABGESCHLOSSEN" : `TAG ${expDay} VON ${totalDays}`}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
            <div className="lab-float" style={{ fontSize: "3.2rem", lineHeight: 1 }}>{notStarted ? "⏳" : finished ? "🏆" : w ? phaseEmoji(s, w) : "🧪"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.15 }}>
                {notStarted ? `Reset startet ${fmtDate(first.start)}` : finished ? "Du hast es durchgezogen!" : w ? phaseTitle(s, w) : "—"}
              </div>
              {w && !finished && (
                <div style={{ fontSize: "0.88rem", opacity: 0.9, marginTop: 4 }}>
                  Tag {dayNo} von {w.days} · noch {diffDays(today, w.end)} {diffDays(today, w.end) === 1 ? "Tag" : "Tage"}
                </div>
              )}
            </div>
          </div>
          {w && !finished && (
            <div style={{ display: "flex", gap: 4, marginTop: 14 }}>
              {Array.from({ length: w.days }).map((_, i) => {
                const d = addDays(w.start, i)
                const has = !!s.checkins[d]
                return <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: d < today || has ? "rgba(255,255,255,.95)" : d === today ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.2)" }} />
              })}
            </div>
          )}
          {finished && <div style={{ marginTop: 14 }}><Btn variant="soft" onClick={() => goTab("stack")} style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>Zu deinem Stack →</Btn></div>}
        </div>
      </div>

      {/* 1-Klick-Check-in */}
      {!notStarted && (w || (finished && !checked && today <= addDays(last.end, 1))) && (
        checked ? (
          <Card className="lab-rise" style={{ animationDelay: "60ms" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: "2.4rem" }}>{FACES[Math.round(daySum(checked)) - 1]}</div>
                <div>
                  <Label>Heute eingecheckt</Label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Stars value={Math.round(daySum(checked))} size={18} />
                    <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{fmt(daySum(checked))}</span>
                  </div>
                </div>
              </div>
              <Btn variant="soft" onClick={() => onCheckin(today)} style={{ padding: "8px 12px", fontSize: "0.78rem" }}>{checked.quick ? "✨ Verfeinern +10" : "Bearbeiten"}</Btn>
            </div>
            {intake.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 800, marginBottom: 8 }}>Nebenwirkungen heute? <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>1× leicht · 2× stark</span></div>
                <SideChips compact value={checked.sides ?? {}} onChange={v => update(p => { p.checkins[today] = { ...p.checkins[today], sides: v }; return p })}
                  suggested={(knownSides(s, intake).length ? knownSides(s, intake) : SIDE_EFFECTS.slice(0, 5).map(x => x.id)).map(id => SIDE_BY_ID[id])} all={SIDE_EFFECTS} />
              </div>
            )}
          </Card>
        ) : (
          <div className="lab-rise lab-card" style={{ animationDelay: "60ms", padding: 18, outline: "2px solid var(--accent)", boxShadow: "0 10px 30px rgba(46,204,138,.18)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 900, fontSize: "1.15rem" }}>Wie war dein Tag?</div>
              <div style={{ fontWeight: 900, color: "var(--accent)", fontSize: "0.85rem" }}>1 Tipp · +20 XP</div>
            </div>
            <FaceRow onPick={v => onQuick(today, v)} faces={FACES} labels={FACE_LABELS} />
            <button onClick={() => onCheckin(today)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 700, fontSize: "0.8rem", marginTop: 10, cursor: "pointer" }}>
              oder ausführlich mit ★ pro Bereich →
            </button>
          </div>
        )
      )}
      {missedYesterday && (
        <div className="lab-card" style={{ padding: 14 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: 8 }}>🕐 Gestern vergessen? 1 Tipp zum Nachtragen</div>
          <FaceRow onPick={v => onQuick(yesterday, v)} faces={FACES} size={44} />
        </div>
      )}

      {/* Warnung bei starken Nebenwirkungen im laufenden Test */}
      {w?.kind === "test" && testSupp && !dismissed && (() => {
        const strong = checkinsIn(s, w).flatMap(c => Object.entries(c.sides ?? {}).filter(([, v]) => v >= 2).map(([id]) => id))
        if (!strong.length) return null
        const names = [...new Set(strong)].map(id => SIDE_BY_ID[id]?.label).join(", ")
        return (
          <Card className="lab-rise" style={{ background: "var(--danger-dim)", border: "2px solid var(--danger)", boxShadow: "none" }}>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>⚠️ Starke Nebenwirkung unter {testSupp.name}</div>
            <div style={{ fontSize: "0.85rem", lineHeight: 1.45, marginBottom: 12 }}>
              {names}. Wenn es dir damit nicht gut geht: Test abbrechen und bei anhaltenden Beschwerden ärztlich abklären.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="danger" full onClick={() => update(p => {
                p.phases = p.phases.map(x => x.id === w.id ? { ...x, days: dayNo } : x)
                p.verdicts[testSupp.id] = { decision: "drop", note: `Abgebrochen wegen Nebenwirkungen: ${names}`, date: today }
                return p
              }, { amount: 20, label: "Auf dich gehört" })} style={{ fontSize: "0.85rem", padding: "12px", whiteSpace: "nowrap" }}>✋ Abbrechen</Btn>
              <Btn variant="ghost" full onClick={() => setDismissed(true)} style={{ fontSize: "0.85rem", padding: "12px", whiteSpace: "nowrap" }}>Weiter testen</Btn>
            </div>
          </Card>
        )
      })()}

      {/* Urteil fällig — mit automatischem Vorschlag */}
      {pending.map(p => {
        const supp = s.supps.find(x => x.id === p.suppId)
        const sig = signal(s, p.suppId!)
        const sug = DECISIONS.find(d => d.id === sig.suggestion)
        return (
          <Card key={p.id} className="lab-rise" style={{ border: `2px solid ${suppColor(supp)}` }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div className="lab-wiggle" style={{ fontSize: "2rem" }}>⚖️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900 }}>Urteil fällig: {supp?.name}</div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>{sig.emoji} {sig.text}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {sug && (
                <Btn full onClick={() => update(q => { q.verdicts[p.suppId!] = { decision: sug.id, note: "Automatischer Vorschlag übernommen", date: today }; return q }, { amount: 50, label: "Urteil gefällt" })}
                  style={{ padding: "12px 10px", fontSize: "0.88rem" }}>{sug.emoji} {sug.label} bestätigen</Btn>
              )}
              <Btn variant="soft" onClick={() => onVerdict(p.suppId!)} style={{ padding: "12px 12px", fontSize: "0.85rem", whiteSpace: "nowrap" }}>Details</Btn>
            </div>
          </Card>
        )
      })}

      {/* Heute einnehmen */}
      {w && !finished && (
        <Card className="lab-rise" style={{ animationDelay: "120ms" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Label>Heute einnehmen</Label>
            {intake.length > 1 && took.length < intake.length && (
              <button className="lab-press" onClick={takeAll} style={{ border: "none", background: "var(--accent-dim)", color: "var(--accent)", borderRadius: 999, padding: "6px 12px", fontWeight: 800, fontSize: "0.75rem" }}>✓ Alles genommen</button>
            )}
          </div>
          {intake.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: "2.2rem" }}>🙅</div>
              <div>
                <div style={{ fontWeight: 900 }}>Heute: gar nichts</div>
                <div style={{ fontSize: "0.83rem", color: "var(--text-dim)", lineHeight: 1.45 }}>
                  {w.kind === "baseline" ? "Reset-Phase: kein Supplement. So misst du dein echtes Normal." : "Pause, damit das letzte Supplement nicht in den nächsten Test reinwirkt."}
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {intake.map(id => {
              const x = s.supps.find(q => q.id === id)
              if (!x) return null
              const l = libOf(x)
              const done = took.includes(id)
              const slot = slotFor(id, s)
              return (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: suppColor(x), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>{x.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {x.name} {id === testId ? <span style={{ fontSize: "0.65rem", background: "var(--accent-dim)", color: "var(--accent)", padding: "2px 6px", borderRadius: 6, verticalAlign: "middle" }}>TEST</span> : <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>📌</span>}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                      {l?.weekly ? "1× pro Woche" : `${SLOTS.find(q => q.id === slot)?.emoji} ${slotTime(slot, s.settings)} Uhr`}{x.dose ? ` · ${x.dose}` : ""}{l?.route && l.route !== "oral" ? ` · ${ROUTE_INFO[l.route].emoji}` : ""}
                    </div>
                  </div>
                  <button className="lab-press" onClick={() => toggleTook(id)} aria-label={`${x.name} abhaken`} style={{
                    width: 48, height: 48, borderRadius: 16, border: done ? "none" : "2px dashed var(--border)", flexShrink: 0,
                    background: done ? "var(--accent)" : "transparent", color: done ? "#fff" : "var(--text-dim)", fontSize: "1.3rem", fontWeight: 900,
                  }}>{done ? "✓" : "○"}</button>
                </div>
              )
            })}
          </div>
          {lib && w.kind === "test" && (
            <div style={{ marginTop: 12, fontSize: "0.8rem", lineHeight: 1.5, color: "var(--text-dim)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              ⏰ {lib.timing}<br />
              👀 Achte auf: <b style={{ color: "var(--text)" }}>{lib.watch.map(d => DIMS.find(x => x.id === d)?.label).join(", ")}</b>
              {LIB_SIDES[lib.id]?.length ? <><br />⚠️ Mögliche Nebenwirkungen: {LIB_SIDES[lib.id].map(id => SIDE_BY_ID[id]?.label).join(", ")}</> : null}
            </div>
          )}
        </Card>
      )}

      {/* Erinnerungen einrichten */}
      {!s.reminders.enabled && !finished && (
        <Card className="lab-rise" onClick={onReminders} style={{ animationDelay: "160ms", display: "flex", alignItems: "center", gap: 12, background: "var(--surface-2)", border: "none", boxShadow: "none" }}>
          <div className="lab-wiggle" style={{ fontSize: "1.8rem" }}>🔔</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>Erinnerungen einschalten</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>1 Tipp: Benachrichtigungen + alle Termine in deinen Kalender</div>
          </div>
          <span style={{ fontWeight: 900, color: "var(--accent)" }}>+30</span>
        </Card>
      )}

      {/* Phasen-Tipp */}
      {w && !finished && <PhaseTip s={s} w={w} dayNo={dayNo} />}

      {/* Als nächstes */}
      {(() => {
        const next = wins.find(x => x.start > today)
        if (!next || finished) return null
        return (
          <Card className="lab-rise" onClick={() => goTab("reise")} style={{ animationDelay: "200ms", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: "1.6rem" }}>{phaseEmoji(s, next)}</div>
            <div style={{ flex: 1 }}>
              <Label>Als Nächstes · {fmtDate(next.start)}</Label>
              <div style={{ fontWeight: 800 }}>{phaseTitle(s, next)} ({next.days} Tage)</div>
            </div>
            <span style={{ color: "var(--text-dim)" }}>→</span>
          </Card>
        )
      })()}

      {/* Abzeichen */}
      <Card className="lab-rise" style={{ animationDelay: "240ms" }}>
        <Label style={{ marginBottom: 10 }}>Abzeichen · {s.badges.length}/{BADGES.length}</Label>
        <div className="lab-scroll" style={{ display: "flex", gap: 10, overflowX: "auto" }}>
          {BADGES.map(b => {
            const got = s.badges.includes(b.id)
            return (
              <div key={b.id} title={`${b.name}: ${b.desc}`} style={{ flexShrink: 0, width: 70, textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, margin: "0 auto", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem",
                  background: got ? "var(--accent-dim)" : "var(--surface-2)", filter: got ? undefined : "grayscale(1)", opacity: got ? 1 : 0.4,
                }}>{got ? b.emoji : "🔒"}</div>
                <div style={{ fontSize: "0.62rem", fontWeight: 700, marginTop: 4, color: got ? "var(--text)" : "var(--text-dim)", lineHeight: 1.2 }}>{b.name}</div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function PhaseTip({ s, w, dayNo }: { s: LabState; w: PhaseWindow; dayNo: number }) {
  let tip = ""
  if (w.kind === "baseline") {
    const tips = [
      "Tag 1 fühlt sich evtl. komisch an, vor allem ohne Koffein. Kopfschmerzen in den ersten Tagen sind normal.",
      "Check-in möglichst immer zur gleichen Uhrzeit, z. B. abends. Die Erinnerung kommt automatisch.",
      "Ehrlich bewerten, nicht schönreden. 😐 ist ein völlig normaler Tag.",
      "Alkohol, wenig Schlaf oder Stress? Beim Check-in als Besonderheit antippen — so bleibt die Auswertung fair.",
      "Halbzeit! Dein Normal nimmt Form an. Schau mal in „Daten“.",
      "Bleib bei deiner Routine: gleiches Essen, gleicher Sport. Dann siehst du später echte Unterschiede.",
      "Letzter Reset-Tag! Morgen beginnt der erste Test. 🔬",
    ]
    tip = tips[Math.min(dayNo - 1, tips.length - 1)]
  } else if (w.kind === "washout") {
    tip = "Kurze Pause, damit der nächste Test sauber startet. Check-ins trotzdem machen, sie zeigen, ob etwas nachwirkt."
  } else {
    const lib = libOf(s.supps.find(x => x.id === w.suppId))
    tip = lib ? `Was du erwarten kannst: ${lib.effect}${lib.onset !== "schnell" ? ` ${ONSET_INFO[lib.onset].emoji} ${ONSET_INFO[lib.onset].label}.` : ""}${lib.caution ? ` ⚠️ ${lib.caution}` : ""}` : "Achte auf alles, was sich anders anfühlt als in der Reset-Woche."
  }
  return (
    <Card className="lab-rise" style={{ animationDelay: "180ms", display: "flex", gap: 12, background: "var(--accent-dim)", border: "none", boxShadow: "none" }}>
      <div style={{ fontSize: "1.4rem" }}>💡</div>
      <div style={{ fontSize: "0.87rem", lineHeight: 1.5 }}>{tip}</div>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// REISE (Phasen-Pfad)
// ═══════════════════════════════════════════════════════════════════════════════

function JourneyView({ s, wins, today, onPhase, onPlan, goTab }: {
  s: LabState; wins: PhaseWindow[]; today: string; onPhase: (w: PhaseWindow) => void; onPlan: () => void; goTab: (t: Tab) => void
}) {
  const offsets = [0, 1, 1.4, 1, 0, -1, -1.4, -1]
  const last = wins[wins.length - 1]
  const done = last && today > last.end
  const kept = stackMembers(s, false).length
  const constants = s.supps.filter(x => x.mode === "konstant")
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>Deine Reise</div>
          <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{wins.length} Etappen · bis {last ? fmtDate(last.end) : "—"}</div>
        </div>
        <Btn variant="soft" onClick={onPlan} style={{ padding: "9px 14px", fontSize: "0.82rem" }}>✏️ Plan</Btn>
      </div>
      {constants.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 8 }}>
          📌 Läuft durchgehend: {constants.map(x => <Capsule key={x.id} supp={x} size="sm" />)}
        </div>
      )}

      <div style={{ position: "relative", width: 300, maxWidth: "100%", margin: "0 auto", padding: "20px 0 10px" }}>
        {wins.map((w, i) => {
          const state = today > w.end ? "done" : today >= w.start ? "active" : "future"
          const supp = s.supps.find(x => x.id === w.suppId)
          const col = w.kind === "test" ? suppColor(supp) : w.kind === "baseline" ? "#2ECC8A" : "#3987e5"
          const off = offsets[i % offsets.length] * 60
          const prevOff = i > 0 ? offsets[(i - 1) % offsets.length] * 60 : off
          const verdict = w.suppId && w.kind === "test" ? s.verdicts[w.suppId] : undefined
          const nCheck = checkinsIn(s, w).length
          const size = w.kind === "washout" ? 54 : 78
          const GAP = 40
          return (
            <div key={w.id} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: i > 0 ? GAP : 0 }}>
              {i > 0 && (
                <svg width={300} height={GAP - 8} viewBox={`0 0 300 ${GAP - 8}`} style={{ position: "absolute", top: 4, left: "50%", marginLeft: -150, overflow: "visible" }} aria-hidden>
                  <path d={`M${150 + prevOff},0 C${150 + prevOff},${GAP * 0.6} ${150 + off},${GAP * 0.1} ${150 + off},${GAP - 8}`}
                    fill="none" stroke={state === "future" ? "var(--border)" : "var(--accent)"} strokeWidth={4} strokeLinecap="round" strokeDasharray={state === "future" ? "2 8" : undefined} opacity={0.7} />
                </svg>
              )}
              <div style={{ transform: `translateX(${off}px)`, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <button className={`lab-press lab-pop ${state === "active" ? "lab-pulse" : ""}`} onClick={() => onPhase(w)}
                  aria-label={phaseTitle(s, w)}
                  style={{
                    animationDelay: `${i * 60}ms`,
                    width: size, height: size, borderRadius: 999, border: "none", position: "relative",
                    background: state === "future" ? "var(--surface-2)" : col,
                    boxShadow: state === "future" ? "inset 0 -5px 0 rgba(0,0,0,.08)" : `inset 0 -6px 0 rgba(0,0,0,.18), 0 8px 20px color-mix(in srgb, ${col} 40%, transparent)`,
                    fontSize: w.kind === "washout" ? "1.4rem" : "2.1rem", filter: state === "future" ? "grayscale(.7)" : undefined, opacity: state === "future" ? 0.75 : 1,
                  }}>
                  {phaseEmoji(s, w)}
                  {state === "done" && (
                    <span style={{ position: "absolute", right: -4, bottom: -4, width: 26, height: 26, borderRadius: 999, background: "var(--surface)", border: "2px solid var(--accent)", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {verdict ? DECISIONS.find(d => d.id === verdict.decision)?.emoji : "✓"}
                    </span>
                  )}
                </button>
                <div style={{ textAlign: "center", marginTop: 6, whiteSpace: "nowrap" }}>
                  <div style={{ fontWeight: 800, fontSize: w.kind === "washout" ? "0.72rem" : "0.88rem", color: state === "future" ? "var(--text-dim)" : "var(--text)" }}>
                    {w.kind === "test" ? supp?.name : w.kind === "washout" ? `Pause · ${w.days} T` : phaseTitle(s, w)}
                  </div>
                  {w.kind !== "washout" && (
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                      {state === "active" ? `läuft · Tag ${diffDays(w.start, today) + 1}/${w.days}` : state === "done" ? `${nCheck} Check-ins` : `${fmtDate(w.start)} · ${w.days} T`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {/* Ziel */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 34 }}>
          <button className={`lab-press ${done ? "lab-float" : ""}`} onClick={() => goTab("stack")} style={{
            width: 96, height: 96, borderRadius: 30, border: "none", fontSize: "2.8rem",
            background: done ? "linear-gradient(135deg,#ffd76a,#eda100)" : "var(--surface-2)", filter: done ? undefined : "grayscale(.8)",
            boxShadow: done ? "0 12px 30px rgba(237,161,0,.45)" : "none",
          }}>🏆</button>
          <div style={{ fontWeight: 900, marginTop: 8 }}>Dein Stack</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{kept ? `${kept} Supplement${kept > 1 ? "s" : ""} im Stack` : "wartet auf deine Urteile"}</div>
        </div>
      </div>
    </div>
  )
}

function PhaseSheet({ s, w, today, onClose, update, onVerdict }: {
  s: LabState; w: PhaseWindow | null; today: string; onClose: () => void; update: Update; onVerdict: (id: string) => void
}) {
  if (!w) return null
  const state = today > w.end ? "done" : today >= w.start ? "active" : "future"
  const supp = s.supps.find(x => x.id === w.suppId)
  const lib = libOf(supp)
  const r = w.kind === "test" && w.suppId ? testResult(s, w.suppId) : null
  const elapsed = diffDays(w.start, today)
  const setDays = (days: number) => update(p => { p.phases = p.phases.map(x => x.id === w.id ? { ...x, days } : x); return p })
  return (
    <Sheet open onClose={onClose} title={`${phaseEmoji(s, w)} ${w.kind === "test" ? supp?.name : phaseTitle(s, w)}`}>
      <div style={{ color: "var(--text-dim)", fontSize: "0.88rem", marginBottom: 14 }}>
        {fmtDate(w.start)} → {fmtDate(w.end)} · {w.days} Tage · {state === "done" ? "abgeschlossen" : state === "active" ? "läuft gerade" : "geplant"}
      </div>
      {lib && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "0.88rem", lineHeight: 1.55 }}>
            <div><b>Wirkung:</b> {lib.effect}</div>
            <div style={{ marginTop: 6 }}><b>Dosis:</b> {supp?.dose || lib.dose}{lib.route ? ` · ${ROUTE_INFO[lib.route].emoji} ${ROUTE_INFO[lib.route].label}` : ""}</div>
            <div style={{ marginTop: 6 }}><b>Einnahme:</b> {lib.timing}</div>
            <div style={{ marginTop: 6 }}><b>Wirkungseintritt:</b> {ONSET_INFO[lib.onset].label}</div>
            {LIB_SIDES[lib.id]?.length ? <div style={{ marginTop: 6 }}><b>Mögliche Nebenwirkungen:</b> {LIB_SIDES[lib.id].map(id => `${SIDE_BY_ID[id]?.emoji} ${SIDE_BY_ID[id]?.label}`).join(" · ")}</div> : null}
            {lib.caution && <div style={{ marginTop: 6, color: "var(--warning)" }}>⚠️ {lib.caution}</div>}
          </div>
        </Card>
      )}
      {r?.delta && r.avg && r.base && (
        <Card style={{ marginBottom: 12 }}>
          <Label style={{ marginBottom: 6 }}>Nutzen ↔ Nebenwirkungen</Label>
          <ProCon s={s} suppId={w.suppId!} />
        </Card>
      )}
      {r?.delta && r.avg && r.base && (
        <Card style={{ marginBottom: 12 }}>
          <Label style={{ marginBottom: 10 }}>Vergleich mit deinem Reset · {r.n} Check-ins</Label>
          <DeltaBars delta={r.delta} avg={r.avg} base={r.base} dims={r.dims} />
        </Card>
      )}
      {state === "active" && (
        <Card style={{ marginBottom: 12 }}>
          <Label style={{ marginBottom: 10 }}>Phase anpassen</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn variant="soft" onClick={() => setDays(w.days + 1)} style={{ fontSize: "0.85rem" }}>+1 Tag verlängern</Btn>
            {elapsed >= 1 && <Btn variant="soft" onClick={() => { setDays(elapsed); onClose() }} style={{ fontSize: "0.85rem" }}>⏭ Nächste Phase heute starten</Btn>}
          </div>
        </Card>
      )}
      {state === "future" && (
        <Card style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800 }}>Dauer</div>
          <Stepper value={w.days} min={1} max={28} onChange={setDays} suffix=" T" />
        </Card>
      )}
      {w.kind === "test" && w.suppId && state !== "future" && (
        <Btn full onClick={() => onVerdict(w.suppId!)}>{s.verdicts[w.suppId] ? "Urteil ändern" : "⚖️ Urteil fällen"}</Btn>
      )}
    </Sheet>
  )
}

function PlanSheet({ s, today, onClose, update }: { s: LabState; today: string; onClose: () => void; update: Update }) {
  const wins = phaseWindows(s)
  const fixed = wins.filter(w => w.start <= today)
  const fixedTests = new Set(fixed.filter(w => w.kind === "test").map(w => w.suppId))
  const [order, setOrder] = useState<string[]>(() => wins.filter(w => w.start > today && w.kind === "test").map(w => w.suppId!))
  const [days, setDays] = useState<Record<string, number>>(() => Object.fromEntries(wins.filter(w => w.kind === "test").map(w => [w.suppId!, w.days])))
  const [adding, setAdding] = useState(false)
  const [washout, setWashout] = useState(s.settings.washoutDays)

  const unplanned = s.supps.filter(x => !fixedTests.has(x.id) && !order.includes(x.id))

  const save = () => {
    update(p => {
      const kept: Phase[] = fixed.map(({ id, kind, suppId, days }) => ({ id, kind, suppId, days }))
      const lastFixed = kept[kept.length - 1]
      if (lastFixed?.kind === "test" && order.length && washout > 0) kept.push({ id: `wash-${lastFixed.suppId}`, kind: "washout", suppId: lastFixed.suppId, days: washout })
      order.forEach((id, i) => {
        kept.push({ id: `test-${id}`, kind: "test", suppId: id, days: days[id] ?? 5 })
        if (washout > 0 && i < order.length - 1) kept.push({ id: `wash-${id}`, kind: "washout", suppId: id, days: washout })
      })
      p.phases = kept
      p.settings.washoutDays = washout
      p.supps = p.supps.map(x => order.includes(x.id) ? { ...x, mode: "test" } : x)
      return p
    })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="✏️ Plan bearbeiten">
      <div style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginBottom: 14 }}>Laufende und abgeschlossene Phasen bleiben, alles Kommende kannst du umbauen.</div>
      {order.length ? (
        <OrderEditor order={order} supps={s.supps} days={days} onOrder={setOrder} onDays={(id, d) => setDays(p => ({ ...p, [id]: d }))} onRemove={id => setOrder(o => o.filter(x => x !== id))} />
      ) : <div style={{ color: "var(--text-dim)", fontSize: "0.9rem", padding: "10px 0" }}>Keine weiteren Tests geplant.</div>}

      {unplanned.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Label style={{ marginBottom: 8 }}>Noch nicht eingeplant · tippen zum Hinzufügen</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {unplanned.map(x => <Capsule key={x.id} supp={x} size="sm" onClick={() => { setOrder(o => [...o, x.id]); setDays(d => ({ ...d, [x.id]: d[x.id] ?? defaultDays(x) })) }} right={<span style={{ color: "var(--accent)" }}>＋</span>} />)}
          </div>
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        {adding ? (
          <SuppPicker selected={s.supps} goals={s.goals}
            onAddCustom={name => update(p => { p.supps.push({ ...makeSupp(null, name, p.supps), mode: "pause" }); return p })}
            onPasteAdd={items => update(p => { items.forEach(it => { if (!it.lib || !p.supps.some(x => x.lib === it.lib!.id)) p.supps.push({ ...makeSupp(it.lib, it.name, p.supps, it.dose), mode: "pause" }) }); return p })}
            onToggle={(lib: LibSupp) => update(p => { if (!p.supps.some(x => x.lib === lib.id)) p.supps.push({ ...makeSupp(lib, lib.name, p.supps), mode: "pause" }); return p })} />
        ) : <Btn variant="ghost" full onClick={() => setAdding(true)}>+ Neues Supplement hinzufügen</Btn>}
      </div>
      <Card style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800 }}>💧 Auswaschpause</div>
        <Stepper value={washout} min={0} max={7} onChange={setWashout} suffix=" T" />
      </Card>
      <div style={{ marginTop: 16 }}><Btn full onClick={save}>Plan speichern</Btn></div>
    </Sheet>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATEN
// ═══════════════════════════════════════════════════════════════════════════════

function DataView({ s, wins, onVerdict, onCheckin }: { s: LabState; wins: PhaseWindow[]; onVerdict: (id: string) => void; onCheckin: (d: string) => void }) {
  const [dim, setDim] = useState<Dim | "gesamt">("gesamt")
  const nCheck = Object.keys(s.checkins).length
  const tested = wins.filter(w => w.kind === "test" && checkinsIn(s, w).length > 0)
  const ranking = useMemo(() => tested
    .map(w => ({ w, r: testResult(s, w.suppId!) }))
    .filter(x => x.r?.delta)
    .sort((a, b) => signal(s, b.w.suppId!).net - signal(s, a.w.suppId!).net), [s, tested])
  const base = wins.find(w => w.kind === "baseline")
  const baseAvg = base ? checkinsIn(s, base).map(daySum) : []
  const last7 = Object.values(s.checkins).filter(c => c.date > addDays(todayIso(), -7)).map(daySum)
  const mean = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null

  if (!nCheck) {
    return (
      <Card style={{ textAlign: "center", padding: 32 }}>
        <div className="lab-float" style={{ fontSize: "3.5rem" }}>📈</div>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", marginTop: 10 }}>Noch keine Daten</div>
        <div style={{ color: "var(--text-dim)", marginTop: 6 }}>Nach deinem ersten Check-in erscheinen hier deine Kurven.</div>
      </Card>
    )
  }

  const tiles: [string, number | null, string][] = [
    ["Ø Reset", mean(baseAvg), "dein Normal"],
    ["Ø letzte 7 Tage", mean(last7), last7.length ? `${last7.length} Check-ins` : "—"],
    ["Check-ins", nCheck, `🔥 ${streak(s)} am Stück`],
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>Deine Daten</div>
        <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Automatisch ausgewertet · jede Farbe ist ein Test</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {tiles.map(([l, v, sub], i) => (
          <Card key={l} style={{ padding: 12 }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-dim)" }}>{l}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
              {v == null ? "—" : i < 2 ? <>{fmt(v)}<span style={{ color: "#f5b400", fontSize: "1rem" }}> ★</span></> : v}
            </div>
            <div style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>{sub}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: "16px 12px" }}>
        <div className="lab-scroll" style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
          {([{ id: "gesamt", emoji: "✨", label: "Gesamt" }, ...activeDims(s)] as { id: Dim | "gesamt"; emoji: string; label: string }[]).map(d => (
            <button key={d.id} className="lab-press" onClick={() => setDim(d.id)} style={{
              flexShrink: 0, padding: "7px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: dim === d.id ? 800 : 600,
              border: dim === d.id ? "2px solid var(--accent)" : "1px solid var(--border)",
              background: dim === d.id ? "var(--accent-dim)" : "var(--surface)", color: "var(--text)",
            }}>{d.emoji} {d.label}</button>
          ))}
        </div>
        <DimLineChart s={s} dim={dim} />
      </Card>

      {ranking.length > 0 && (
        <Card>
          <Label style={{ marginBottom: 12 }}>🏅 Bestenliste · Wirkung vs. Reset</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ranking.map(({ w, r }, i) => {
              const supp = s.supps.find(x => x.id === w.suppId)
              const sig = signal(s, w.suppId!)
              const verdict = s.verdicts[w.suppId!]
              return (
                <div key={w.id} className="lab-press" onClick={() => onVerdict(w.suppId!)} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 26, textAlign: "center", fontSize: i < 3 ? "1.3rem" : "0.9rem", fontWeight: 900 }}>{["🥇", "🥈", "🥉"][i] ?? i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Capsule supp={supp} size="sm" />
                    <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 3 }}>
                      {sig.emoji} {sig.text}{sig.focus && (r!.delta![sig.focus] ?? 0) > 0.2 ? ` · stärkster Effekt: ${DIMS.find(d => d.id === sig.focus)?.label} ${fmt(r!.delta![sig.focus]!, true)}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {r!.overall.test != null && <div style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{fmt(r!.overall.test)}<span style={{ color: "#f5b400" }}>★</span></div>}
                    <div style={{ fontSize: "0.68rem", fontWeight: 800, color: sig.net >= 0 ? "#1baf7a" : "#e34948" }}>
                      {fmt(sig.net, true)}{r!.sides.list.length ? ` · ⚠️${r!.sides.list.length}` : ""} · {verdict ? DECISIONS.find(d => d.id === verdict.decision)?.label : "offen"}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 12 }}>★ = Tagesdurchschnitt im Test · +/− = Netto-Wirkung (Nutzen minus Nebenwirkungen) · ⚠️ = Nebenwirkungen. Tippen für Details.</div>
        </Card>
      )}

      <Card>
        <Label style={{ marginBottom: 12 }}>Stimmungs-Kalender · tippen zum Bearbeiten</Label>
        <MoodCalendar s={s} onPick={onCheckin} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, fontSize: "0.72rem", color: "var(--text-dim)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 4, borderRadius: 2, background: "var(--text-dim)" }} />Reset</span>
          {s.supps.filter(x => wins.some(w => w.suppId === x.id && w.kind === "test")).map(x => (
            <span key={x.id} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 4, borderRadius: 2, background: suppColor(x) }} />{x.name}</span>
          ))}
        </div>
      </Card>

      {tested.map(w => {
        const r = testResult(s, w.suppId!)
        const supp = s.supps.find(x => x.id === w.suppId)
        if (!r?.delta || !r.avg || !r.base) return null
        return (
          <Card key={w.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
              <Capsule supp={supp} />
              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                {r.overall.base != null && r.overall.test != null ? `${fmt(r.overall.base)}★ → ${fmt(r.overall.test)}★ · ` : ""}{r.n} Check-ins
              </span>
            </div>
            <ProCon s={s} suppId={w.suppId!} />
            <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />
            <DeltaBars delta={r.delta} avg={r.avg} base={r.base} dims={r.dims} />
            {r.tags.length > 0 && (
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-dim)", marginTop: 12 }}>STÖRFAKTOREN</div>
            )}
            {r.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {r.tags.slice(0, 5).map(([t, n]) => <span key={t} style={{ fontSize: "0.72rem", padding: "3px 9px", borderRadius: 999, background: "var(--surface-2)", fontWeight: 700 }}>{t} ×{n}</span>)}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// URTEIL
// ═══════════════════════════════════════════════════════════════════════════════

function VerdictSheet({ s, suppId, onClose, onSave }: { s: LabState; suppId: string; onClose: () => void; onSave: (id: string, d: Decision, note: string) => void }) {
  const sig = signal(s, suppId)
  const [decision, setDecision] = useState<Decision | null>(s.verdicts[suppId]?.decision ?? sig.suggestion)
  const [note, setNote] = useState(s.verdicts[suppId]?.note ?? "")
  const supp = s.supps.find(x => x.id === suppId)
  const r = testResult(s, suppId)
  const lib = libOf(supp)
  return (
    <Sheet open onClose={onClose} title="⚖️ Dein Urteil">
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 16px" }}><Capsule supp={supp} /></div>
      {r?.delta && r.avg && r.base ? (
        <>
          <Card style={{ marginBottom: 12, textAlign: "center", background: "var(--surface-2)", border: "none", boxShadow: "none" }}>
            <div style={{ fontSize: "2rem" }}>{sig.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>Die Daten sagen: {sig.text}</div>
            {r.overall.base != null && r.overall.test != null && (
              <div style={{ fontSize: "0.9rem", marginTop: 4, fontWeight: 800 }}>{fmt(r.overall.base)}★ im Reset → {fmt(r.overall.test)}★ im Test</div>
            )}
            {sig.focus && (r.delta[sig.focus] ?? 0) > 0.2 && (
              <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginTop: 4 }}>
                Am meisten verändert: {DIMS.find(d => d.id === sig.focus)?.emoji} {DIMS.find(d => d.id === sig.focus)?.label} {fmt(r.delta[sig.focus]!, true)}
              </div>
            )}
          </Card>
          <Card style={{ marginBottom: 12 }}>
            <Label style={{ marginBottom: 6 }}>Nutzen ↔ Nebenwirkungen</Label>
            <ProCon s={s} suppId={suppId} />
          </Card>
          <Card style={{ marginBottom: 12 }}>
            <Label style={{ marginBottom: 10 }}>Test vs. Reset · {r.n} Check-ins</Label>
            <DeltaBars delta={r.delta} avg={r.avg} base={r.base} dims={r.dims} />
          </Card>
        </>
      ) : (
        <Card style={{ marginBottom: 12, background: "var(--surface-2)", border: "none", boxShadow: "none", fontSize: "0.88rem", lineHeight: 1.5 }}>
          {lib?.onset === "langsam"
            ? `🐢 ${supp?.name} wirkt eher über Wochen. Entscheide nach Bauchgefühl, Blutwerten oder ärztlichem Rat.`
            : "Keine Testdaten für dieses Supplement. Du kannst trotzdem nach Bauchgefühl entscheiden."}
        </Card>
      )}
      <div style={{ fontWeight: 800, margin: "16px 0 10px" }}>{sig.suggestion ? "Vorschlag ist markiert — 1 Tipp zum Bestätigen oder ändern:" : "Was sagt dein Bauchgefühl?"}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {DECISIONS.map(d => {
          const on = decision === d.id
          return (
            <button key={d.id} className="lab-press" onClick={() => setDecision(d.id)} style={{
              flex: 1, padding: "14px 6px", borderRadius: 18, fontWeight: 800, fontSize: "0.85rem", color: "var(--text)",
              border: on ? `2px solid ${d.color}` : "1px solid var(--border)",
              background: on ? `color-mix(in srgb, ${d.color} 16%, var(--surface))` : "var(--surface)",
              transform: on ? "scale(1.04)" : undefined, position: "relative",
            }}>
              {sig.suggestion === d.id && <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", background: "var(--accent)", color: "#fff", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>Vorschlag</span>}
              <div style={{ fontSize: "1.7rem", marginBottom: 4 }}>{d.emoji}</div>{d.label}
            </button>
          )
        })}
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Warum? (optional)"
        style={{ width: "100%", padding: 12, borderRadius: 14, fontSize: "0.92rem", marginTop: 12, resize: "none" }} />
      <div style={{ marginTop: 14 }}><Btn full disabled={!decision} onClick={() => decision && onSave(suppId, decision, note.trim())}>Urteil speichern</Btn></div>
    </Sheet>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STACK
// ═══════════════════════════════════════════════════════════════════════════════

function StackView({ s, update, onVerdict }: { s: LabState; update: Update; onVerdict: (id: string) => void }) {
  const [withMaybe, setWithMaybe] = useState(false)
  const [copied, setCopied] = useState(false)
  const keep = s.supps.filter(x => s.verdicts[x.id]?.decision === "keep")
  const maybe = s.supps.filter(x => s.verdicts[x.id]?.decision === "maybe")
  const drop = s.supps.filter(x => s.verdicts[x.id]?.decision === "drop")
  const constant = s.supps.filter(x => !s.verdicts[x.id] && x.mode === "konstant")
  const open = s.supps.filter(x => !s.verdicts[x.id] && x.mode !== "konstant")
  const inStack = stackMembers(s, withMaybe)
  const plan = buildStack(inStack.map(x => x.id), s)

  const cycleSlot = (id: string, current: string) => {
    const allowed = allowedSlots(id, s)
    const next = allowed[(allowed.indexOf(current as never) + 1) % allowed.length]
    update(p => { p.slotOverrides[id] = next; return p })
  }

  const copy = async () => {
    const lines = ["Mein Supplement-Stack (TRUE Supplement Lab)", ""]
    SLOTS.forEach(slot => {
      const items = plan.placements.filter(p => p.slot === slot.id)
      if (!items.length) return
      lines.push(`${slotTime(slot.id, s.settings)} · ${slot.label}`)
      items.forEach(p => { const x = s.supps.find(q => q.id === p.suppId)!; lines.push(`  • ${x.name}${x.dose ? ` (${x.dose})` : ""}`) })
    })
    if (plan.weekly.length) lines.push("", `Wöchentlich: ${plan.weekly.map(id => s.supps.find(x => x.id === id)?.name).join(", ")}`)
    if (drop.length) lines.push("", `Rausgeflogen: ${drop.map(x => x.name).join(", ")}`)
    try {
      if (navigator.share) await navigator.share({ title: "Mein Supplement-Stack", text: lines.join("\n") })
      else await navigator.clipboard.writeText(lines.join("\n"))
      setCopied(true); setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  const group = (title: string, items: MySupp[], emoji: string) => items.length ? (
    <div style={{ marginBottom: 12 }}>
      <Label style={{ marginBottom: 8 }}>{emoji} {title} · {items.length}</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map(x => <Capsule key={x.id} supp={x} size="sm" onClick={() => onVerdict(x.id)} />)}
      </div>
    </div>
  ) : null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>Dein Stack 🏆</div>
        <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Automatisch gebaut aus deinen Urteilen — mit perfektem Timing.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[["💚", keep.length + constant.length, "im Stack"], ["🤔", maybe.length, "vielleicht"], ["✂️", drop.length, "rausgeflogen"]].map(([e, n, l]) => (
          <Card key={l as string} style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: "1.3rem" }}>{e}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, lineHeight: 1.1 }}>{n}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 700 }}>{l}</div>
          </Card>
        ))}
      </div>

      <Card>
        {group("Behalten", keep, "💚")}
        {group("Durchgehend", constant, "📌")}
        {group("Vielleicht", maybe, "🤔")}
        {group("Fliegt raus", drop, "✂️")}
        {group("Noch offen · tippen zum Bewerten", open, "⏳")}
        {drop.length > 0 && <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>💸 {drop.length} Supplement{drop.length > 1 ? "s" : ""} weniger: weniger Geld, weniger Pillen, mehr Klarheit.</div>}
      </Card>

      <Card style={{ padding: "18px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>☀️ Dein perfekter Tag</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Tippe ein Supplement an, um es zu verschieben</div>
          </div>
          {maybe.length > 0 && (
            <button className="lab-press" onClick={() => setWithMaybe(v => !v)} style={{
              padding: "7px 11px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap",
              border: withMaybe ? "2px solid #eda100" : "1px solid var(--border)", background: withMaybe ? "rgba(237,161,0,.14)" : "var(--surface)", color: "var(--text)",
            }}>🤔 {withMaybe ? "inkl. Vielleicht" : "+ Vielleicht"}</button>
          )}
        </div>

        {inStack.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-dim)" }}>
            <div style={{ fontSize: "2.4rem" }}>🫙</div>
            <div style={{ fontWeight: 800, color: "var(--text)", marginTop: 6 }}>Noch leer</div>
            <div style={{ fontSize: "0.85rem", marginTop: 4 }}>Sobald du ein Supplement mit 💚 bewertest, landet es hier — direkt im richtigen Zeitfenster.</div>
          </div>
        ) : (
          <div style={{ position: "relative", paddingLeft: 58 }}>
            <div style={{ position: "absolute", left: 22, top: 8, bottom: 8, width: 3, borderRadius: 2, background: "linear-gradient(#ffd76a, #2ECC8A 40%, #3987e5 75%, #4a3aa7)" }} />
            {SLOTS.filter(slot => slot.id !== "training" || s.settings.training).map(slot => {
              const items = plan.placements.filter(p => p.slot === slot.id)
              const empty = !items.length
              if (empty) return null
              return (
                <div key={slot.id} style={{ position: "relative", marginBottom: 16 }}>
                  <div style={{
                    position: "absolute", left: -58, top: 0, width: 46, height: 46, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--surface)", border: "2px solid var(--accent)", fontSize: "1.2rem",
                  }}>{slot.emoji}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, minHeight: 20 }}>
                    <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{slotTime(slot.id, s.settings)}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{slot.label}</span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: 8 }}>{slot.hint}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map(p => {
                      const x = s.supps.find(q => q.id === p.suppId)!
                      const lib = libOf(x)
                      const isMaybe = s.verdicts[x.id]?.decision === "maybe"
                      return (
                        <div key={x.id} className="lab-press lab-pop" onClick={() => cycleSlot(x.id, p.slot)} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 16,
                          background: `color-mix(in srgb, ${suppColor(x)} 12%, var(--surface))`, border: `1px ${isMaybe ? "dashed" : "solid"} color-mix(in srgb, ${suppColor(x)} 45%, transparent)`,
                        }}>
                          <div style={{ width: 34, height: 34, borderRadius: 12, background: suppColor(x), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.05rem", flexShrink: 0 }}>{x.emoji}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{x.name}{isMaybe && <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}> · vielleicht</span>}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                              {x.dose || lib?.dose}{lib?.withFat ? " · mit fetthaltigem Essen" : ""}{lib?.route && lib.route !== "oral" ? ` · ${ROUTE_INFO[lib.route].emoji} ${ROUTE_INFO[lib.route].label}` : ""}
                            </div>
                          </div>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>⇅</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {plan.weekly.length > 0 && (
          <div style={{ marginTop: 6, padding: 12, borderRadius: 16, background: "var(--surface-2)" }}>
            <Label style={{ marginBottom: 8 }}>📅 1× pro Woche</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{plan.weekly.map(id => <Capsule key={id} supp={s.supps.find(x => x.id === id)} size="sm" />)}</div>
          </div>
        )}
        {Object.keys(s.slotOverrides).length > 0 && inStack.length > 0 && (
          <button onClick={() => update(p => { p.slotOverrides = {}; return p })} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.78rem", cursor: "pointer", marginTop: 8 }}>↺ Automatisch planen</button>
        )}
      </Card>

      {plan.issues.map((iss, k) => (
        <Card key={`i${k}`} style={{ background: "var(--warning-dim)", border: "none", boxShadow: "none", display: "flex", gap: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>⚠️</span>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.45 }}>
            <b>{s.supps.find(x => x.id === iss.a)?.name} + {s.supps.find(x => x.id === iss.b)?.name}:</b> {iss.text} Verschieb eins davon in ein anderes Zeitfenster.
          </div>
        </Card>
      ))}
      {plan.combos.map((c, k) => (
        <Card key={`c${k}`} style={{ background: "var(--accent-dim)", border: "none", boxShadow: "none", display: "flex", gap: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>🤝</span>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.45 }}><b>Combo:</b> {c.text}</div>
        </Card>
      ))}

      {inStack.length > 0 && <Btn full variant="soft" onClick={copy}>{copied ? "✓ Geteilt!" : "📤 Plan teilen / kopieren"}</Btn>}

      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.5, padding: "0 4px" }}>
        ⚕️ Das Lab ersetzt keine ärztliche Beratung. Selbstbeobachtung ist subjektiv; Placebo, Wetter, Stress und Schlaf spielen mit. Mangel-Themen (Vitamin D, B12, Eisen) lieber per Blutbild klären. Peptide nur mit ärztlicher Begleitung.
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// EINSTELLUNGEN
// ═══════════════════════════════════════════════════════════════════════════════

function TimeSettings({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  return (
    <Card>
      <Label style={{ marginBottom: 10 }}>Dein Tagesrhythmus</Label>
      {([["wake", "🌅 Aufstehen"], ["bed", "🛌 Schlafen"]] as const).map(([k, l]) => (
        <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{l}</span>
          <input type="time" value={settings[k]} onChange={e => onChange({ ...settings, [k]: e.target.value })} style={{ padding: "6px 10px", borderRadius: 10, fontWeight: 700 }} />
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>🏋️ Training</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {settings.training && <input type="time" value={settings.training} onChange={e => onChange({ ...settings, training: e.target.value })} style={{ padding: "6px 10px", borderRadius: 10, fontWeight: 700 }} />}
          <button className="lab-press" onClick={() => onChange({ ...settings, training: settings.training ? null : "18:00" })} style={{
            padding: "6px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontWeight: 700, fontSize: "0.8rem",
          }}>{settings.training ? "Aus" : "Hinzufügen"}</button>
        </div>
      </div>
    </Card>
  )
}

function SettingsSheet({ s, onClose, update, onReset, onDemo, onImport, onEnableReminders }: {
  s: LabState; onClose: () => void; update: Update; onReset: () => void; onDemo: () => void
  onImport: (s: LabState) => void; onEnableReminders: (withCalendar: boolean) => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const perm = typeof Notification === "undefined" ? "unsupported" : Notification.permission

  const exportData = async () => {
    const json = JSON.stringify(s, null, 1)
    const file = new File([json], `supplement-lab-${todayIso()}.json`, { type: "application/json" })
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Supplement Lab Backup" }); return }
    } catch { /* Abbruch → Download */ }
    const url = URL.createObjectURL(file)
    const a = document.createElement("a"); a.href = url; a.download = file.name; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    setMsg("✓ Backup gespeichert")
  }
  const importData = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text())
      if (!parsed || typeof parsed !== "object" || !("supps" in parsed)) throw new Error()
      onImport(hydrate(parsed))
    } catch { setMsg("⚠️ Datei konnte nicht gelesen werden") }
  }
  const testNotif = () => {
    navigator.serviceWorker?.ready.then(reg => reg.showNotification("🧪 So sieht deine Erinnerung aus", {
      body: "1 Tipp auf die Benachrichtigung öffnet den Check-in.", icon: "/icon-192.png", tag: "true-lab-test", data: { url: "/lab?checkin=1" },
    })).catch(() => setMsg("⚠️ Benachrichtigungen werden hier nicht unterstützt"))
  }

  return (
    <Sheet open onClose={onClose} title="⚙️ Einstellungen">
      {/* Erinnerungen */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Label>🔔 Erinnerungen</Label>
          <button className="lab-press" aria-label="Erinnerungen an/aus" onClick={() => s.reminders.enabled ? update(p => { p.reminders.enabled = false; return p }) : onEnableReminders(false)} style={{
            width: 48, height: 28, borderRadius: 999, border: "none", position: "relative", background: s.reminders.enabled ? "var(--accent)" : "var(--surface-2)",
          }}>
            <span style={{ position: "absolute", top: 3, left: s.reminders.enabled ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "left .2s" }} />
          </button>
        </div>
        {s.reminders.enabled && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>📝 Check-in um</span>
              <input type="time" value={s.reminders.checkin} onChange={e => { const v = e.target.value; update(p => { p.reminders.checkin = v; return p }) }} style={{ padding: "6px 10px", borderRadius: 10, fontWeight: 700 }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, fontWeight: 700, fontSize: "0.9rem" }}>
              💊 Einnahme-Erinnerungen
              <input type="checkbox" checked={s.reminders.intake} onChange={e => { const v = e.target.checked; update(p => { p.reminders.intake = v; return p }) }} style={{ width: 20, height: 20, accentColor: "var(--accent)" }} />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn variant="soft" onClick={() => downloadIcs(s)} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>📅 In Kalender eintragen</Btn>
              {perm === "granted" ? <Btn variant="ghost" onClick={testNotif} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>Test senden</Btn>
                : perm === "default" ? <Btn variant="ghost" onClick={() => onEnableReminders(false)} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>Benachrichtigungen erlauben</Btn> : null}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 8, lineHeight: 1.45 }}>
              Der Kalender erinnert dich zuverlässig, auch wenn die App zu ist. App-Benachrichtigungen kommen, sobald TRUE offen oder als App installiert ist.{perm === "denied" ? " Benachrichtigungen sind im Browser blockiert — nutze den Kalender." : ""}
            </div>
          </>
        )}
      </Card>

      {/* Ziele */}
      <Card style={{ marginBottom: 12 }}>
        <Label style={{ marginBottom: 8 }}>🎯 Deine Ziele</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {GOALS.map(g => {
            const on = s.goals.includes(g.id)
            return (
              <button key={g.id} className="lab-press" onClick={() => update(p => { p.goals = on ? p.goals.filter(x => x !== g.id) : [...p.goals, g.id]; return p })} style={{
                padding: "6px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: on ? 800 : 600, color: "var(--text)",
                border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)",
              }}>{g.emoji} {g.label}</button>
            )
          })}
        </div>
      </Card>

      {/* Supplements */}
      <Card style={{ marginBottom: 12 }}>
        <Label style={{ marginBottom: 8 }}>💊 Deine Supplements</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {s.supps.map(x => (
            <div key={x.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}><Capsule supp={x} size="sm" /></div>
                <input value={x.dose} placeholder="Dosis" onChange={e => { const v = e.target.value; update(p => { p.supps = p.supps.map(q => q.id === x.id ? { ...q, dose: v } : q); return p }) }}
                  style={{ width: 120, padding: "6px 10px", borderRadius: 10, fontSize: "0.8rem" }} />
              </div>
              {x.mode !== "test" || !phaseWindows(s).some(w => w.suppId === x.id && w.kind === "test") ? (
                <Segmented value={x.mode} onChange={m => update(p => { p.supps = p.supps.map(q => q.id === x.id ? { ...q, mode: m } : q); return p })}
                  options={MODE_OPTIONS.filter(o => o.id !== "test")} />
              ) : <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>🔬 Im Testplan (Reihenfolge unter „Reise → Plan“)</div>}
            </div>
          ))}
        </div>
      </Card>

      <TimeSettings settings={s.settings} onChange={st => update(p => { p.settings = st; return p })} />

      {/* Daten */}
      <Card style={{ marginTop: 12 }}>
        <Label style={{ marginBottom: 8 }}>📦 Daten übertragen</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="soft" onClick={exportData} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>📤 Backup teilen</Btn>
          <Btn variant="soft" onClick={() => fileRef.current?.click()} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>📥 Backup laden</Btn>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = "" }} />
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 8 }}>Daten liegen nur auf diesem Gerät. Mit dem Backup ziehst du sie in Sekunden aufs Handy oder den Laptop um.</div>
        {msg && <div style={{ fontSize: "0.8rem", fontWeight: 700, marginTop: 8 }}>{msg}</div>}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {s.demo && <Btn full onClick={onReset}>Demo beenden</Btn>}
        {!s.demo && <Btn full variant="ghost" onClick={onDemo}>Demo-Daten ansehen (deine Daten werden gesichert)</Btn>}
        {!s.demo && (confirm
          ? <Btn full variant="danger" onClick={onReset}>Wirklich alles löschen?</Btn>
          : <Btn full variant="ghost" onClick={() => setConfirm(true)}>Experiment zurücksetzen</Btn>)}
      </div>
    </Sheet>
  )
}

