"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Confetti from "@/components/Confetti"
import {
  DIMS, FACES, FACE_LABELS, ONSET_INFO, SIDE_EFFECTS, SIDE_BY_ID, LIB_SIDES, knownSides, ROUTE_INFO, SLOTS, BADGES, GOALS,
  loadState, saveState, emptyState, demoState, computeBadges, levelFor, streak, hydrate,
  phaseWindows, phaseAt, testResult, checkinsIn, buildStack, allowedSlots, slotTime, slotFor, stackMembers, intakeOn,
  STORE_MODE, LAB_BASE, todayIso, addDays, diffDays, fmtDate, suppColor, daySum, activeDims, signal, libOf, makeSupp, defaultCheckinTime,
  nextCandidates, suppStatus, takingInfo, avgIntakeMinutes, phaseEndsAt, fmtCountdown, nowTime, closeActive, looksPrescribed,
  startTest, startStack, startCheck, applyVerdict, resolveCheck, fromMin,
  type LabState, type Decision, type Dim, type PhaseWindow, type MySupp, type LibSupp, type Settings, type CheckIn, type Scores, type SuppStatusKey,
} from "@/lib/supplementLab"
import { checkLabReminders, downloadIcs, hasNativeReminders, syncNativeReminders } from "@/lib/labReminders"
import { fetchHealthSince, hasHealthProvider, healthCompare, mergeHealthDay, requestHealthPermission } from "@/lib/health"
import { coach, type CoachAction, type CoachMsg } from "@/lib/labCoach"
import { LAB_CSS, Btn, Capsule, Card, FaceRow, Label, Sheet, SideChips, Stars, Stepper, XpToast } from "./ui"
import { CheckInSheet, Onboarding, SuppPicker } from "./flows"
import { DeltaBars, DimLineChart, MoodCalendar, MoodCurve, ProCon } from "./charts"
import { CoachBubble, FloatingMascot, HelpSheet, Mascot } from "./mascot"
import { InstallHint } from "./install"

type Tab = "heute" | "reise" | "daten" | "stack"

const fmt = (n: number, sign = false) => `${sign && n > 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")}`

function phaseTitle(s: LabState, w: { kind: string; suppId?: string }) {
  if (w.kind === "baseline") return "Reset-Phase"
  if (w.kind === "washout") return "Kurze Pause"
  if (w.kind === "stack") return "Dein Stack"
  if (w.kind === "check") return `Ohne ${s.supps.find(x => x.id === w.suppId)?.name ?? "?"}`
  return `Test: ${s.supps.find(x => x.id === w.suppId)?.name ?? "?"}`
}
function phaseEmoji(s: LabState, w: { kind: string; suppId?: string }) {
  if (w.kind === "baseline") return "🧘"
  if (w.kind === "washout") return "💧"
  if (w.kind === "stack") return "🏆"
  if (w.kind === "check") return "👀"
  return s.supps.find(x => x.id === w.suppId)?.emoji ?? "💊"
}

const DECISIONS: { id: Decision; emoji: string; label: string; color: string }[] = [
  { id: "keep",  emoji: "💚", label: "Behalten",  color: "#1baf7a" },
  { id: "maybe", emoji: "🤔", label: "Vielleicht", color: "#eda100" },
  { id: "drop",  emoji: "✂️", label: "Fliegt raus", color: "#e34948" },
]

const STATUS_STYLE: Record<SuppStatusKey, { bg: string; fg: string }> = {
  testing:   { bg: "var(--accent-dim)", fg: "var(--accent)" },
  observing: { bg: "rgba(57,135,229,.14)", fg: "#3987e5" },
  kept:      { bg: "var(--accent-dim)", fg: "var(--accent)" },
  maybe:     { bg: "var(--warning-dim)", fg: "var(--warning)" },
  dropped:   { bg: "var(--danger-dim)", fg: "var(--danger)" },
  constant:  { bg: "var(--surface-2)", fg: "var(--text-dim)" },
  paused:    { bg: "var(--surface-2)", fg: "var(--text-dim)" },
  verdict:   { bg: "var(--warning-dim)", fg: "var(--warning)" },
  waiting:   { bg: "var(--surface-2)", fg: "var(--text-dim)" },
}

function quickCheckin(s: LabState, date: string, v: number): CheckIn {
  const scores: Scores = {}
  activeDims(s).forEach(d => { scores[d.id] = v })
  return { date, scores, tags: [], note: "", quick: true, at: date === todayIso() ? nowTime() : undefined }
}

function markTaken(p: LabState, date: string, id: string) {
  p.took[date] = [...new Set([...(p.took[date] ?? []), id])]
  if (date === todayIso()) p.tookAt[date] = { ...(p.tookAt[date] ?? {}), [id]: nowTime() }
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
      markTaken(s, today, taken)
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

// Ausgeblendete Coach-Tipps (pro Tag)
const DISMISS_KEY = () => `lab-dismissed-${todayIso()}`
function loadDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY()) ?? "[]") } catch { return [] }
}

/** Tickt jede halbe Minute — für Countdown und Coach-Uhrzeiten. */
function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id) }, [ms])
  return now
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
  const [suppSheet, setSuppSheet] = useState<string | null>(null)
  const [pickOpen, setPickOpen] = useState(false)
  const [testSetup, setTestSetup] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed)
  const [toast, setToast] = useState<{ amount: number; label: string; k: number } | null>(null)
  const [flash, setFlash] = useState<string | null>(init.flash)
  const [newBadge, setNewBadge] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const now = useNow()

  useEffect(() => { try { localStorage.setItem("true-lab-tab", tab) } catch {} }, [tab])
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 2600); return () => clearTimeout(t) }, [flash])

  // Erinnerungen prüfen, solange die App offen ist (System-Benachrichtigung, je 1× pro Tag)
  useEffect(() => {
    checkLabReminders()
    const id = setInterval(checkLabReminders, 60_000)
    return () => clearInterval(id)
  }, [])

  // Store-App: native Erinnerungen bei jeder Änderung neu planen (im Web ein No-op)
  useEffect(() => { syncNativeReminders(s) }, [s])

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
    const at = c.at ?? s.checkins[c.date]?.at ?? (c.date === todayIso() ? nowTime() : undefined)
    update(p => { p.checkins[c.date] = { ...c, at }; return p },
      isNew ? { amount: 20, label: "Check-in" } : refined ? { amount: 10, label: "Genauer bewertet" } : undefined)
    if (isNew) setConfetti(true)
  }, [s.checkins, update])

  // Kalender-Download zuerst (braucht die direkte Nutzer-Geste, v. a. auf iOS), dann Berechtigung anfragen
  const enableReminders = useCallback((withCalendar: boolean) => {
    const reminders = { ...s.reminders, enabled: true, checkin: s.reminders.checkin || defaultCheckinTime(s.settings) }
    if (withCalendar) downloadIcs({ ...s, reminders })
    update(p => { p.reminders = reminders; return p })
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {})
  }, [s, update])

  // Apple Health / Health Connect: bei Bedarf Berechtigung holen, dann regelmäßig synchronisieren (nur Store-App)
  const toggleHealth = useCallback(async () => {
    if (!s.healthEnabled) {
      const granted = await requestHealthPermission().catch(() => false)
      if (!granted) { setFlash("⚠️ Zugriff auf Health nicht erlaubt"); return }
    }
    update(p => { p.healthEnabled = !p.healthEnabled; return p })
  }, [s.healthEnabled, update])

  useEffect(() => {
    if (!s.healthEnabled || !s.startDate) return
    let cancelled = false
    const run = async () => {
      const data = await fetchHealthSince(s.startDate!, todayIso())
      if (cancelled || !Object.keys(data).length) return
      update(p => { for (const [date, d] of Object.entries(data)) mergeHealthDay(p, date, d); return p })
    }
    run()
    const id = setInterval(run, 60 * 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [s.healthEnabled, s.startDate, update])

  const today = todayIso()
  const toggleTook = useCallback((id: string) => {
    const on = (s.took[today] ?? []).includes(id)
    update(p => {
      if (on) { p.took[today] = (p.took[today] ?? []).filter(x => x !== id); if (p.tookAt[today]) delete p.tookAt[today][id] }
      else markTaken(p, today, id)
      return p
    }, on ? undefined : { amount: 5, label: "Eingenommen" })
  }, [s.took, today, update])

  // Aktionen aus Kolbis Tipps
  const runAction = useCallback((a: CoachAction, msgId: string) => {
    switch (a.kind) {
      case "checkin": setCheckinDate(today); break
      case "startTest": setTestSetup(a.suppId); break
      case "pickNext": setPickOpen(true); break
      case "verdict": update(p => applyVerdict(p, a.suppId, a.decision, "Vorschlag übernommen", today), { amount: 50, label: "Urteil gefällt" }); break
      case "openVerdict": setVerdictFor(a.suppId); break
      case "abort": {
        const w = phaseAt(s, today)
        if (w?.kind === "test" && w.suppId) update(p => applyVerdict(p, w.suppId!, "drop", "Wegen Beschwerden abgebrochen", today), { amount: 20, label: "Auf dich gehört" })
        break
      }
      case "startStack": update(p => startStack(p, today), { amount: 50, label: "Stack gestartet" }); setConfetti(true); break
      case "check": update(p => startCheck(p, a.suppId, today, 3), { amount: 10, label: "Beobachtung gestartet" }); break
      case "resolveCheck": update(p => resolveCheck(p, a.suppId, a.keep, today), { amount: 20, label: "Entschieden" }); break
      case "konstant": update(p => { p.supps = p.supps.map(x => x.id === a.suppId ? { ...x, mode: "konstant" } : x); return p }); break
      case "take": toggleTook(a.suppId); break
      case "reminders": enableReminders(true); break
      case "dismiss": {
        const next = [...dismissed, msgId]
        setDismissed(next)
        try { localStorage.setItem(DISMISS_KEY(), JSON.stringify(next)) } catch {}
        break
      }
    }
  }, [s, today, update, toggleTook, enableReminders, dismissed])

  const msgs = useMemo(() => coach(s, now, dismissed), [s, now, dismissed])

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
          {!STORE_MODE && <Link href="/home" aria-label="Zurück zu TRUE" style={{ color: "var(--text-dim)", textDecoration: "none", fontSize: "1.1rem", padding: "4px 6px 4px 0" }}>←</Link>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", lineHeight: 1.1 }}>Supplement Lab {s.demo && <span style={{ fontSize: "0.65rem", background: "var(--warning-dim)", color: "var(--warning)", padding: "2px 6px", borderRadius: 6, verticalAlign: "middle" }}>BEISPIEL</span>}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{lvl.emoji} {lvl.name}</span>
              <div style={{ flex: 1, maxWidth: 120, height: 5, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ width: `${lvl.progress * 100}%`, height: "100%", background: "var(--lab-grad)", transition: "width .8s" }} />
              </div>
              <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>{s.xp} XP</span>
            </div>
          </div>
          <div title={`${st} Tage am Stück eingecheckt`} style={{
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

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "16px 16px calc(150px + env(safe-area-inset-bottom))" }}>
        {tab === "heute" && <Dashboard s={s} wins={wins} today={today} now={now} msgs={msgs} onAction={runAction} onHelp={() => setHelpOpen(true)}
          onCheckin={setCheckinDate} onQuick={(d, v) => saveCheckin(quickCheckin(s, d, v))} onTake={toggleTook} onSupp={setSuppSheet}
          onPhase={setPhaseSheet} update={update} goTab={setTab} />}
        {tab === "reise" && <JourneyView s={s} wins={wins} today={today} onPhase={setPhaseSheet} goTab={setTab} />}
        {tab === "daten" && <DataView s={s} wins={wins} onVerdict={setVerdictFor} onCheckin={setCheckinDate} />}
        {tab === "stack" && <StackView s={s} update={update} onVerdict={setVerdictFor} onStartStack={() => runAction({ kind: "startStack" }, "stack")} />}
      </main>

      <FloatingMascot mood={msgs[0]?.mood ?? "happy"} badge={msgs.filter(m => m.mood === "alert" || m.id.startsWith("verdict-") || m.id.startsWith("resolve-")).length} onClick={() => setHelpOpen(true)} />

      {/* ── Tab-Leiste ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "var(--nav-bg)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid var(--border)", paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", height: 66 }}>
          {([["heute", "🏠", "Übersicht"], ["reise", "🗺️", "Verlauf"], ["daten", "📈", "Auswertung"], ["stack", "🏆", "Stack"]] as const).map(([id, e, l]) => {
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
          phaseLabel={(() => { const w = phaseAt(s, checkinDate); return w ? phaseTitle(s, w) : "Zwischen zwei Schritten" })()}
          onClose={() => setCheckinDate(null)}
          onDone={c => { saveCheckin(c); setCheckinDate(null) }}
        />
      )}
      {verdictFor && <VerdictSheet key={verdictFor} s={s} suppId={verdictFor} onClose={() => setVerdictFor(null)} onSave={(id, decision, note) => {
        const isNew = !s.verdicts[id]
        update(p => applyVerdict(p, id, decision, note, today), isNew ? { amount: 50, label: "Urteil gefällt" } : undefined)
        setVerdictFor(null)
      }} />}
      <PhaseSheet s={s} w={phaseSheet} today={today} onClose={() => setPhaseSheet(null)} update={update} onVerdict={id => { setPhaseSheet(null); setVerdictFor(id) }} />
      {suppSheet && <SuppSheet s={s} id={suppSheet} today={today} onClose={() => setSuppSheet(null)} update={update} onAction={a => { setSuppSheet(null); runAction(a, "supp") }} onVerdict={id => { setSuppSheet(null); setVerdictFor(id) }} />}
      {pickOpen && <PickNextSheet s={s} onClose={() => setPickOpen(false)} update={update} onStart={id => { setPickOpen(false); runAction({ kind: "startTest", suppId: id }, "pick") }} />}
      {testSetup && <TestSetupSheet s={s} suppId={testSetup} onClose={() => setTestSetup(null)}
        onConfirm={days => {
          const id = testSetup; const name = s.supps.find(x => x.id === id)?.name
          setTestSetup(null)
          update(p => startTest(p, id, today, days), { amount: 10, label: "Test gestartet" })
          setFlash(`🔬 Test gestartet: ${name} · ${days} Tage`)
        }}
        onKonstant={() => {
          const id = testSetup
          setTestSetup(null)
          update(p => { p.supps = p.supps.map(x => x.id === id ? { ...x, mode: "konstant" } : x); return p })
        }} />}
      {helpOpen && <HelpSheet msgs={msgs} onAction={runAction} onClose={() => setHelpOpen(false)} />}
      {settingsOpen && <SettingsSheet s={s} onClose={() => setSettingsOpen(false)} update={update}
        onEnableReminders={enableReminders}
        onToggleHealth={toggleHealth}
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
// ÜBERSICHT (Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

function Dashboard({ s, wins, today, now, msgs, onAction, onHelp, onCheckin, onQuick, onTake, onSupp, onPhase, update, goTab }: {
  s: LabState; wins: PhaseWindow[]; today: string; now: Date; msgs: CoachMsg[]
  onAction: (a: CoachAction, id: string) => void; onHelp: () => void
  onCheckin: (d: string) => void; onQuick: (d: string, v: number) => void; onTake: (id: string) => void; onSupp: (id: string) => void
  onPhase: (w: PhaseWindow) => void; update: Update; goTab: (t: Tab) => void
}) {
  const w = wins.find(x => today >= x.start && today <= x.end) ?? null
  const first = wins[0]
  const notStarted = first && today < first.start
  const checked = s.checkins[today]
  const yesterday = addDays(today, -1)
  const missedYesterday = first && yesterday >= first.start && !s.checkins[yesterday]
  const intake = intakeOn(s, today)
  const took = s.took[today] ?? []
  const tookAt = s.tookAt[today] ?? {}
  const color = w?.kind === "test" || w?.kind === "check" ? suppColor(s.supps.find(x => x.id === w.suppId)) : w?.kind === "stack" ? "#eda100" : w?.kind === "washout" ? "#3987e5" : "#2ECC8A"
  const top = msgs[0]

  // Countdown bis zum Ende der aktuellen Phase bzw. bis zum Start
  const target = notStarted ? new Date(first.start + "T00:00:00").getTime() : w && !w.open ? phaseEndsAt(w) : null
  const remaining = target ? target - now.getTime() : null
  const totalMs = w && !w.open ? w.days * 86400000 : null
  const progress = remaining != null && totalMs ? Math.min(1, Math.max(0, 1 - remaining / totalMs)) : null

  // Supplements sortiert: im Test / aktiv zuerst
  const order: SuppStatusKey[] = ["testing", "observing", "verdict", "kept", "constant", "waiting", "maybe", "paused", "dropped"]
  const supps = [...s.supps].sort((a, b) => order.indexOf(suppStatus(s, a.id, today).key) - order.indexOf(suppStatus(s, b.id, today).key))
  const nextId = nextCandidates(s)[0]?.id

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Kolbi sagt, was dran ist */}
      {top && <CoachBubble msg={top} onAction={onAction} more={msgs.length - 1} onMore={onHelp} />}
      {STORE_MODE && !hasNativeReminders() && <InstallHint compact />}

      {/* Status + Countdown */}
      <div className="lab-rise lab-press" onClick={() => w && onPhase(w)} style={{
        borderRadius: 24, padding: 18, color: "#fff", position: "relative", overflow: "hidden",
        background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 55%, #0b0b1a) 100%)`,
        boxShadow: `0 14px 36px color-mix(in srgb, ${color} 35%, transparent)`,
      }}>
        <div style={{ position: "absolute", right: -30, top: -30, width: 150, height: 150, borderRadius: 999, background: "rgba(255,255,255,.1)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: "2.6rem", lineHeight: 1 }}>{notStarted ? "⏳" : w ? phaseEmoji(s, w) : "🧭"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 900, letterSpacing: ".1em", opacity: 0.85 }}>
              {notStarted ? "STARTET BALD" : w ? (w.open ? `SEIT ${diffDays(w.start, today) + 1} TAGEN` : `TAG ${diffDays(w.start, today) + 1} VON ${w.days}`) : "NÄCHSTER SCHRITT"}
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, lineHeight: 1.15 }}>{notStarted ? "Reset-Phase" : w ? phaseTitle(s, w) : "Wartet auf dich"}</div>
          </div>
          {remaining != null && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, opacity: 0.85 }}>{notStarted ? "START IN" : "NOCH"}</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{fmtCountdown(remaining)}</div>
            </div>
          )}
        </div>
        {progress != null && (
          <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(255,255,255,.25)", marginTop: 14, overflow: "hidden" }}>
            <div style={{ width: `${progress * 100}%`, height: "100%", background: "#fff", borderRadius: 4, transition: "width 1s" }} />
          </div>
        )}
      </div>

      {/* 1-Tipp-Check-in */}
      {!notStarted && (checked ? (
        <Card className="lab-rise">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: "2.2rem" }}>{FACES[Math.round(daySum(checked)) - 1]}</div>
              <div>
                <Label>Heute eingecheckt{checked.at ? ` · ${checked.at} Uhr` : ""}</Label>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <Stars value={Math.round(daySum(checked))} size={17} />
                  <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{fmt(daySum(checked))}</span>
                </div>
              </div>
            </div>
            <Btn variant="soft" onClick={() => onCheckin(today)} style={{ padding: "8px 12px", fontSize: "0.78rem" }}>{checked.quick ? "Genauer ★" : "Ändern"}</Btn>
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
        <div className="lab-rise lab-card" style={{ padding: 18, outline: "2px solid var(--accent)", boxShadow: "0 10px 30px rgba(46,204,138,.18)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: "1.15rem" }}>Wie war dein Tag?</div>
            <div style={{ fontWeight: 900, color: "var(--accent)", fontSize: "0.8rem" }}>1 Tipp · +20 XP</div>
          </div>
          <FaceRow onPick={v => onQuick(today, v)} faces={FACES} labels={FACE_LABELS} />
          <button onClick={() => onCheckin(today)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 700, fontSize: "0.8rem", marginTop: 10, cursor: "pointer" }}>
            oder einzeln bewerten: Schlaf, Energie, Stimmung … →
          </button>
        </div>
      ))}
      {missedYesterday && (
        <div className="lab-card" style={{ padding: 14 }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: 8 }}>🕐 Gestern vergessen? 1 Tipp zum Nachtragen</div>
          <FaceRow onPick={v => onQuick(yesterday, v)} faces={FACES} size={44} />
        </div>
      )}

      {/* Heute einnehmen */}
      {!notStarted && (
        <Card className="lab-rise">
          <Label style={{ marginBottom: 10 }}>Heute einnehmen</Label>
          {intake.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: "2rem" }}>🙅</div>
              <div style={{ fontSize: "0.88rem", lineHeight: 1.45 }}><b>Heute nichts.</b> <span style={{ color: "var(--text-dim)" }}>{w?.kind === "baseline" ? "Reset-Phase: So lerne ich dein Normal kennen." : "Zwischen zwei Tests: kurz durchatmen."}</span></div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {intake.map(id => {
                const x = s.supps.find(q => q.id === id)
                if (!x) return null
                const done = took.includes(id)
                const slot = slotFor(id, s)
                const info = takingInfo(s, id)
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={() => onSupp(id)} className="lab-press" style={{ width: 46, height: 46, borderRadius: 15, border: "none", background: suppColor(x), fontSize: "1.4rem", flexShrink: 0 }}>{x.emoji}</button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                        {done ? `✓ genommen um ${tookAt[id] ?? "—"}` : `${SLOTS.find(q => q.id === slot)?.emoji} geplant ${slotTime(slot, s.settings)} Uhr`}{x.dose ? ` · ${x.dose}` : ""}{info.days ? ` · ${info.days}. Tag` : ""}
                      </div>
                    </div>
                    <button className="lab-press" onClick={() => onTake(id)} aria-label={`${x.name} abhaken`} style={{
                      width: 46, height: 46, borderRadius: 15, border: done ? "none" : "2px dashed var(--border)", flexShrink: 0,
                      background: done ? "var(--accent)" : "transparent", color: done ? "#fff" : "var(--text-dim)", fontSize: "1.3rem", fontWeight: 900,
                    }}>{done ? "✓" : "○"}</button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* Wohlfühl-Kurve */}
      {Object.keys(s.checkins).length > 0 && (
        <Card className="lab-rise" style={{ padding: "16px 14px 10px" }} onClick={() => goTab("daten")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <Label>Wie du dich fühlst · 14 Tage</Label>
            <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 800 }}>Auswertung →</span>
          </div>
          <MoodCurve s={s} />
        </Card>
      )}

      {/* Deine Supplements */}
      <Card className="lab-rise">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <Label>Deine Supplements · {s.supps.length}</Label>
          <button onClick={() => onAction({ kind: "pickNext" }, "list")} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>+ Hinzufügen</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {supps.map(x => {
            const st = suppStatus(s, x.id, today)
            const info = takingInfo(s, x.id)
            const style = STATUS_STYLE[st.key]
            return (
              <button key={x.id} onClick={() => onSupp(x.id)} className="lab-press" style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", background: "none", border: "none", color: "var(--text)", textAlign: "left", width: "100%",
              }}>
                <span style={{ width: 36, height: 36, borderRadius: 12, background: suppColor(x), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{x.emoji}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 800, fontSize: "0.92rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</span>
                  <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: style.bg, color: style.fg, whiteSpace: "nowrap" }}>{st.emoji} {st.label}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {info.days ? `${info.days} ${info.days === 1 ? "Tag" : "Tage"} genommen` : x.id === nextId && st.key === "waiting" ? "als Nächstes dran" : ""}
                    </span>
                  </span>
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: "1rem" }}>›</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Abzeichen */}
      <Card className="lab-rise">
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

// ── Detail-Blatt eines Supplements ─────────────────────────────────────────────

function SuppSheet({ s, id, today, onClose, update, onAction, onVerdict }: {
  s: LabState; id: string; today: string; onClose: () => void; update: Update; onAction: (a: CoachAction) => void; onVerdict: (id: string) => void
}) {
  const x = s.supps.find(q => q.id === id)
  const [confirmRemove, setConfirmRemove] = useState(false)
  if (!x) return null
  const lib = libOf(x)
  const st = suppStatus(s, id, today)
  const info = takingInfo(s, id)
  const avg = avgIntakeMinutes(s, id)
  const w = phaseAt(s, today)
  const baseDone = phaseWindows(s).some(p => p.kind === "baseline" && p.end < today) || (w && w.kind !== "baseline")
  return (
    <Sheet open onClose={onClose} title={`${x.emoji} ${x.name}`}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 800, padding: "5px 10px", borderRadius: 999, background: STATUS_STYLE[st.key].bg, color: STATUS_STYLE[st.key].fg }}>{st.emoji} {st.label}</span>
        {info.days > 0 && <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: "var(--surface-2)" }}>⏱️ {info.days} {info.days === 1 ? "Tag" : "Tage"} genommen · seit {fmtDate(info.since!)}</span>}
        {avg != null && <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: "var(--surface-2)" }}>🕐 meist um {fromMin(avg)} Uhr</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {st.key === "waiting" && (
          baseDone && w?.kind !== "test"
            ? <Btn full onClick={() => onAction({ kind: "startTest", suppId: id })}>🔬 Jetzt testen</Btn>
            : <div style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>{w?.kind === "test" ? "Kann nach dem aktuellen Test starten." : "Kann nach der Reset-Phase getestet werden."}</div>
        )}
        {st.key === "testing" && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="soft" full onClick={() => { update(p => { p.phases = p.phases.map((q, i) => i === w!.index ? { ...q, days: q.days + 1 } : q); return p }); onClose() }}>+1 Tag</Btn>
            <Btn variant="danger" full onClick={() => onAction({ kind: "abort" })}>Test abbrechen</Btn>
          </div>
        )}
        {(st.key === "kept" || st.key === "maybe" || st.key === "dropped" || st.key === "verdict") && <Btn variant={st.key === "verdict" ? "primary" : "soft"} full onClick={() => onVerdict(id)}>{st.key === "verdict" ? "⚖️ Ergebnis ansehen" : "Ergebnis & Urteil ändern"}</Btn>}
        {st.key === "kept" && w?.kind === "stack" && <Btn variant="soft" full onClick={() => onAction({ kind: "check", suppId: id })}>👀 3 Tage weglassen & beobachten</Btn>}
        {(st.key === "waiting" || st.key === "paused") && !lib?.rx && <Btn variant="soft" full onClick={() => { update(p => { p.supps = p.supps.map(q => q.id === id ? { ...q, mode: "konstant" } : q); return p }); onClose() }}>📌 Nicht testen, einfach weiter nehmen</Btn>}
        {st.key === "constant" && !lib?.rx && <Btn variant="soft" full onClick={() => { update(p => { p.supps = p.supps.map(q => q.id === id ? { ...q, mode: "test" } : q); return p }); onClose() }}>🔬 Doch einzeln testen</Btn>}
      </div>

      <Card style={{ marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontWeight: 800, fontSize: "0.88rem" }}>
          Deine Dosis
          <input value={x.dose} placeholder="z. B. 400 mg" onChange={e => { const v = e.target.value; update(p => { p.supps = p.supps.map(q => q.id === id ? { ...q, dose: v } : q); return p }) }}
            style={{ width: 150, padding: "8px 10px", borderRadius: 10, fontSize: "0.85rem" }} />
        </label>
        <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 8 }}>⏰ Beste Zeit: {SLOTS.find(q => q.id === slotFor(id, s))?.label} · {slotTime(slotFor(id, s), s.settings)} Uhr</div>
      </Card>

      {lib && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "0.86rem", lineHeight: 1.55 }}>
            <div><b>Was es kann:</b> {lib.effect}</div>
            <div style={{ marginTop: 6 }}><b>Einnahme:</b> {lib.timing}</div>
            <div style={{ marginTop: 6 }}><b>Wirkt:</b> {ONSET_INFO[lib.onset].emoji} {ONSET_INFO[lib.onset].label}</div>
            {LIB_SIDES[lib.id]?.length ? <div style={{ marginTop: 6 }}><b>Mögliche Nebenwirkungen:</b> {LIB_SIDES[lib.id].map(sid => SIDE_BY_ID[sid]?.label).join(", ")}</div> : null}
            {lib.caution && <div style={{ marginTop: 6, color: "var(--warning)" }}>⚠️ {lib.caution}</div>}
          </div>
        </Card>
      )}

      {confirmRemove
        ? <Btn variant="danger" full onClick={() => { update(p => { p.supps = p.supps.filter(q => q.id !== id); p.phases = p.phases.filter(q => !(q.suppId === id && q.start && q.start > today)); return p }); onClose() }}>Wirklich aus der Liste entfernen?</Btn>
        : <Btn variant="ghost" full onClick={() => setConfirmRemove(true)}>Aus meiner Liste entfernen</Btn>}
    </Sheet>
  )
}

// ── Nächsten Test wählen / Supplement hinzufügen ────────────────────────────────

function PickNextSheet({ s, onClose, update, onStart }: { s: LabState; onClose: () => void; update: Update; onStart: (id: string) => void }) {
  const cands = nextCandidates(s)
  const today = todayIso()
  const w = phaseAt(s, today)
  const canStart = w?.kind !== "baseline" || phaseWindows(s).length > 1
  const [adding, setAdding] = useState(cands.length === 0)
  return (
    <Sheet open onClose={onClose} title="Was testen wir als Nächstes?">
      {cands.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {cands.map((x, i) => {
            const lib = libOf(x)
            return (
              <div key={x.id} className="lab-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 40, height: 40, borderRadius: 13, background: suppColor(x), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>{x.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>{x.name} {i === 0 && <span style={{ fontSize: "0.65rem", background: "var(--accent-dim)", color: "var(--accent)", padding: "2px 6px", borderRadius: 6 }}>VORSCHLAG</span>}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{lib ? `${ONSET_INFO[lib.onset].emoji} ${ONSET_INFO[lib.onset].label} · Empfehlung ${ONSET_INFO[lib.onset].days} Tage` : "unbekannt · keine Empfehlung"}</div>
                </div>
                {canStart && <Btn onClick={() => onStart(x.id)} style={{ padding: "9px 12px", fontSize: "0.8rem" }}>Starten</Btn>}
              </div>
            )
          })}
          {!canStart && <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Erst nach der Reset-Phase. Ich sage dir Bescheid, wenn es losgeht.</div>}
        </div>
      )}
      {adding ? (
        <SuppPicker selected={s.supps} goals={s.goals}
          onAddCustom={name => update(p => { p.supps.push(makeSupp(null, name, p.supps)); return p })}
          onPasteAdd={items => update(p => { items.forEach(it => { if (!it.lib || !p.supps.some(x => x.lib === it.lib!.id)) p.supps.push(makeSupp(it.lib, it.name, p.supps, it.dose)) }); return p })}
          onToggle={(lib: LibSupp) => update(p => { if (!p.supps.some(x => x.lib === lib.id)) p.supps.push(makeSupp(lib, lib.name, p.supps)); return p })} />
      ) : <Btn variant="ghost" full onClick={() => setAdding(true)}>+ Neues Supplement hinzufügen</Btn>}
    </Sheet>
  )
}

// ── Bevor ein Test startet: Kolbi empfiehlt eine Dauer, du entscheidest ────────

function TestSetupSheet({ s, suppId, onClose, onConfirm, onKonstant }: {
  s: LabState; suppId: string; onClose: () => void; onConfirm: (days: number) => void; onKonstant: () => void
}) {
  const x = s.supps.find(q => q.id === suppId)
  const lib = libOf(x)
  const recommended = lib ? ONSET_INFO[lib.onset].days : null
  const [days, setDays] = useState(recommended ?? 5)
  const prescribed = !lib && !!x && looksPrescribed(x.name)
  if (!x) return null
  const presets = [3, 5, 7, 10, 14]

  const startBtn = <Btn full onClick={() => onConfirm(days)}>🔬 {days} Tage testen</Btn>
  const stayBtn = <Btn full variant={prescribed ? "primary" : "soft"} onClick={onKonstant}>📌 {prescribed ? "Weiter nehmen (empfohlen)" : "Doch einfach weiter nehmen"}</Btn>

  return (
    <Sheet open onClose={onClose} title={`🔬 ${x.name} testen`}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ flexShrink: 0 }}><Mascot mood={prescribed ? "alert" : lib ? "happy" : "think"} size={48} /></div>
        <div style={{
          flex: 1, minWidth: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px 16px 16px 4px",
          padding: "10px 12px", fontSize: "0.86rem", lineHeight: 1.5,
        }}>
          {lib ? (
            <>{ONSET_INFO[lib.onset].text} Ich empfehle <b>{recommended} Tage</b> — unten schon ausgewählt, du kannst es ändern.</>
          ) : (
            <>
              <b>{x.name}</b> kenne ich nicht — dazu kann ich keine Dauer empfehlen, das wäre Beratung.
              {prescribed && <> Klingt nach einem <b>Mittel, das man über längere Zeit nimmt</b> (z. B. Hormone, Blutdruck, Psychopharmaka). Sowas testet man nicht kurz ab, sondern spricht Änderungen mit der Ärztin/dem Arzt ab.</>}
            </>
          )}
        </div>
      </div>

      <Label style={{ marginBottom: 8 }}>Wie lange testen?</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {presets.map(d => (
          <button key={d} className="lab-press" onClick={() => setDays(d)} style={{
            padding: "10px 14px", borderRadius: 14, fontWeight: 800, position: "relative", color: "var(--text)",
            border: days === d ? "2px solid var(--accent)" : "1px solid var(--border)",
            background: days === d ? "var(--accent-dim)" : "var(--surface)",
          }}>
            {d} Tage
            {recommended === d && <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", background: "var(--accent)", color: "#fff", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>Empfehlung</span>}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>eigene Anzahl</span>
        <Stepper value={days} min={1} max={30} onChange={setDays} suffix=" T" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {prescribed ? <>{stayBtn}{startBtn}</> : <>{startBtn}{stayBtn}</>}
      </div>
    </Sheet>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERLAUF (Phasen-Pfad)
// ═══════════════════════════════════════════════════════════════════════════════

function JourneyView({ s, wins, today, onPhase, goTab }: {
  s: LabState; wins: PhaseWindow[]; today: string; onPhase: (w: PhaseWindow) => void; goTab: (t: Tab) => void
}) {
  const offsets = [0, 1, 1.4, 1, 0, -1, -1.4, -1]
  const kept = stackMembers(s, false).length
  const constants = s.supps.filter(x => x.mode === "konstant")
  const cands = nextCandidates(s)
  const hasStack = wins.some(w => w.kind === "stack")
  return (
    <div>
      <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>Dein Verlauf</div>
      <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{wins.length} Schritte bisher{cands.length ? ` · ${cands.length} Test${cands.length > 1 ? "s" : ""} offen` : ""}. Tippe auf einen Schritt für Details.</div>
      {constants.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 8 }}>
          📌 Läuft durchgehend: {constants.map(x => <Capsule key={x.id} supp={x} size="sm" />)}
        </div>
      )}

      <div style={{ position: "relative", width: 300, maxWidth: "100%", margin: "0 auto", padding: "20px 0 10px" }}>
        {wins.map((w, i) => {
          const state = today > w.end ? "done" : today >= w.start ? "active" : "future"
          const supp = s.supps.find(x => x.id === w.suppId)
          const col = w.kind === "test" || w.kind === "check" ? suppColor(supp) : w.kind === "baseline" ? "#2ECC8A" : w.kind === "stack" ? "#eda100" : "#3987e5"
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
                      {state === "active" ? (w.open ? `seit ${diffDays(w.start, today) + 1} Tagen` : `läuft · Tag ${diffDays(w.start, today) + 1}/${w.days}`) : state === "done" ? `${nCheck} Check-ins` : `${fmtDate(w.start)} · ${w.days} T`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {!hasStack && (
          <>
            {cands.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 30 }}>
                <div style={{ width: 64, height: 64, borderRadius: 999, border: "3px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", color: "var(--text-dim)" }}>?</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 6, textAlign: "center" }}>Noch zu testen:<br /><b style={{ color: "var(--text)" }}>{cands.map(x => x.name).join(", ")}</b></div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 30 }}>
              <button className="lab-press" onClick={() => goTab("stack")} style={{
                width: 96, height: 96, borderRadius: 30, border: "none", fontSize: "2.8rem", background: "var(--surface-2)", filter: "grayscale(.8)",
              }}>🏆</button>
              <div style={{ fontWeight: 900, marginTop: 8 }}>Dein Stack</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{kept ? `${kept} Supplement${kept > 1 ? "s" : ""} dabei` : "wartet auf deine Urteile"}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Ø Schlaf/HRV aus Apple Health/Health Connect, Reset vs. Test — nur sichtbar, wenn Health-Daten vorliegen. */
function HealthCompareCard({ s, base, test }: { s: LabState; base?: { start: string; end: string }; test: { start: string; end: string } }) {
  const cmp = healthCompare(s, base, test)
  if (!cmp || (cmp.testSleep == null && cmp.testHrv == null)) return null
  const row = (emoji: string, label: string, baseV: number | null, testV: number | null, unit: string, decimals: number) => testV == null ? null : (
    <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{emoji} {label}</span>
      <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
        {baseV != null ? `${baseV.toFixed(decimals)}${unit} → ` : ""}{testV.toFixed(decimals)}{unit}
      </span>
    </div>
  )
  return (
    <Card style={{ marginBottom: 12 }}>
      <Label style={{ marginBottom: 6 }}>🍎 Objektive Werte</Label>
      {row("😴", "Schlaf", cmp.baseSleep, cmp.testSleep, " h", 1)}
      {row("❤️", "HRV", cmp.baseHrv, cmp.testHrv, " ms", 0)}
    </Card>
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
  const setDays = (days: number) => update(p => { p.phases = p.phases.map((x, i) => i === w.index ? { ...x, start: w.start, days } : x); return p })
  return (
    <Sheet open onClose={onClose} title={`${phaseEmoji(s, w)} ${w.kind === "test" ? supp?.name : phaseTitle(s, w)}`}>
      <div style={{ color: "var(--text-dim)", fontSize: "0.88rem", marginBottom: 14 }}>
        {w.open ? `Seit ${fmtDate(w.start)}` : `${fmtDate(w.start)} → ${fmtDate(w.end)} · ${w.days} Tage`} · {state === "done" ? "abgeschlossen" : state === "active" ? "läuft gerade" : "geplant"}
      </div>
      {lib && w.kind === "test" && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "0.88rem", lineHeight: 1.55 }}>
            <div><b>Wirkung:</b> {lib.effect}</div>
            <div style={{ marginTop: 6 }}><b>Dosis:</b> {supp?.dose || lib.dose}{lib.route ? ` · ${ROUTE_INFO[lib.route].emoji} ${ROUTE_INFO[lib.route].label}` : ""}</div>
            <div style={{ marginTop: 6 }}><b>Einnahme:</b> {lib.timing}</div>
            {LIB_SIDES[lib.id]?.length ? <div style={{ marginTop: 6 }}><b>Mögliche Nebenwirkungen:</b> {LIB_SIDES[lib.id].map(id => `${SIDE_BY_ID[id]?.emoji} ${SIDE_BY_ID[id]?.label}`).join(" · ")}</div> : null}
            {lib.caution && <div style={{ marginTop: 6, color: "var(--warning)" }}>⚠️ {lib.caution}</div>}
          </div>
        </Card>
      )}
      {r?.delta && r.avg && r.base && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <Label style={{ marginBottom: 6 }}>Nutzen ↔ Nebenwirkungen</Label>
            <ProCon s={s} suppId={w.suppId!} />
          </Card>
          <Card style={{ marginBottom: 12 }}>
            <Label style={{ marginBottom: 10 }}>Vergleich mit deinem Reset · {r.n} Check-ins</Label>
            <DeltaBars delta={r.delta} avg={r.avg} base={r.base} dims={r.dims} />
          </Card>
          <HealthCompareCard s={s} base={phaseWindows(s).find(x => x.kind === "baseline")} test={w} />
        </>
      )}
      {state === "active" && !w.open && (
        <Card style={{ marginBottom: 12 }}>
          <Label style={{ marginBottom: 10 }}>Anpassen</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn variant="soft" onClick={() => setDays(w.days + 1)} style={{ fontSize: "0.85rem" }}>+1 Tag verlängern</Btn>
            {w.kind !== "test" && elapsed >= 1 && <Btn variant="soft" onClick={() => { update(p => closeActive(p, today, false)); onClose() }} style={{ fontSize: "0.85rem" }}>⏭ Jetzt beenden</Btn>}
          </div>
        </Card>
      )}
      {w.kind === "test" && w.suppId && state !== "future" && (
        <Btn full onClick={() => onVerdict(w.suppId!)}>{s.verdicts[w.suppId] ? "Urteil ändern" : "⚖️ Ergebnis & Urteil"}</Btn>
      )}
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
  const testWin = [...phaseWindows(s)].reverse().find(p => p.kind === "test" && p.suppId === suppId)
  const baseWin = phaseWindows(s).find(p => p.kind === "baseline")
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
          {testWin && <HealthCompareCard s={s} base={baseWin} test={testWin} />}
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

function StackView({ s, update, onVerdict, onStartStack }: { s: LabState; update: Update; onVerdict: (id: string) => void; onStartStack: () => void }) {
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

      {keep.length > 0 && !phaseWindows(s).some(w => w.kind === "stack") && (
        <Card style={{ display: "flex", alignItems: "center", gap: 12, border: "2px solid #eda100" }}>
          <Mascot mood="party" size={48} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>Bereit für deinen Stack?</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Alle behaltenen zusammen nehmen. Ich passe auf, ob die Wirkung anhält.</div>
          </div>
          <Btn onClick={onStartStack} style={{ padding: "10px 12px", fontSize: "0.82rem", whiteSpace: "nowrap" }}>Starten</Btn>
        </Card>
      )}

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
        ⚕️ Das Lab ersetzt keine ärztliche Beratung. Selbstbeobachtung ist subjektiv; Placebo, Wetter, Stress und Schlaf spielen mit. Mangel-Themen (Vitamin D, B12, Eisen) lieber per Blutbild klären.{STORE_MODE ? " Die App empfiehlt keine Substanzen oder Dosierungen." : " Peptide nur mit ärztlicher Begleitung."}
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

function SettingsSheet({ s, onClose, update, onReset, onDemo, onImport, onEnableReminders, onToggleHealth }: {
  s: LabState; onClose: () => void; update: Update; onReset: () => void; onDemo: () => void
  onImport: (s: LabState) => void; onEnableReminders: (withCalendar: boolean) => void; onToggleHealth: () => void
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
      body: "1 Tipp auf die Benachrichtigung öffnet den Check-in.", icon: "/icon-192.png", tag: "true-lab-test", data: { url: `${LAB_BASE}?checkin=1` },
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
              {!hasNativeReminders() && <Btn variant="soft" onClick={() => downloadIcs(s)} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>📅 In Kalender eintragen</Btn>}
              {perm === "granted" ? <Btn variant="ghost" onClick={testNotif} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>Test senden</Btn>
                : perm === "default" ? <Btn variant="ghost" onClick={() => onEnableReminders(false)} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>Benachrichtigungen erlauben</Btn> : null}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 8, lineHeight: 1.45 }}>
              {hasNativeReminders() ? "Erinnerungen kommen als Push-Nachricht — auch wenn die App geschlossen ist. Direkt aus der Nachricht bewerten oder abhaken." : <>Der Kalender erinnert dich zuverlässig, auch wenn die App zu ist. App-Benachrichtigungen kommen, sobald TRUE offen oder als App installiert ist.{perm === "denied" ? " Benachrichtigungen sind im Browser blockiert — nutze den Kalender." : ""}</>}
            </div>
          </>
        )}
      </Card>

      {/* Apple Health / Health Connect — nur in der Store-App verfügbar */}
      {hasHealthProvider() && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Label>🍎 Apple Health / Health Connect</Label>
            <button className="lab-press" aria-label="Health an/aus" onClick={onToggleHealth} style={{
              width: 48, height: 28, borderRadius: 999, border: "none", position: "relative", background: s.healthEnabled ? "var(--accent)" : "var(--surface-2)",
            }}>
              <span style={{ position: "absolute", top: 3, left: s.healthEnabled ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "left .2s" }} />
            </button>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.45 }}>
            Liest nur <b>Schlafdauer</b> und <b>HRV</b> — sonst nichts, kein Training, keine Schritte. Ergänzt deine gefühlte Bewertung um einen objektiven Wert. Bleibt komplett auf deinem Gerät, nie eine Voraussetzung.
          </div>
        </Card>
      )}

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

