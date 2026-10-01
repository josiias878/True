"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Confetti from "@/components/Confetti"
import {
  DIMS, FACES, FACE_LABELS, ONSET_INFO, SIDE_EFFECTS, SIDE_BY_ID, LIB_SIDES, knownSides, ROUTE_INFO, SLOTS, BADGES, GOALS,
  loadState, saveState, emptyState, demoState, computeBadges, levelFor, streak, hydrate,
  phaseWindows, phaseAt, testResult, checkinsIn, buildStack, allowedSlots, slotTime, slotFor, stackMembers, intakeOn,
  STORE_MODE, LAB_BASE, todayIso, setDayBoundary, relMin, toMin, addDays, diffDays, fmtDate, suppColor, daySum, activeDims, signal, libOf, makeSupp, defaultCheckinTime,
  nextCandidates, suppStatus, takingInfo, avgIntakeMinutes, phaseEndsAt, fmtCountdown, nowTime, closeActive, looksPrescribed,
  startTest, startStack, startCheck, applyVerdict, resolveCheck, fromMin, timeTip, LIB_BY_ID, slotMinutes,
  type SlotId, type LabState, type Decision, type Dim, type PhaseWindow, type MySupp, type LibSupp, type Settings, type CheckIn, type Scores, type SuppStatusKey,
} from "@/lib/supplementLab"
import { checkLabReminders, downloadIcs, hasNativeReminders, syncNativeReminders } from "@/lib/labReminders"
import { enablePush, pushAvailable, pushState, syncPush, type PushState } from "@/lib/labPush"
import { fetchHealthSince, hasHealthProvider, healthCompare, mergeHealthDay, requestHealthPermission } from "@/lib/health"
import { coach, type CoachAction, type CoachMsg } from "@/lib/labCoach"
import { LAB_CSS, Btn, Capsule, Card, FaceRow, Icon, IconBtn, Label, Segmented, Sheet, SideChips, Stars, Stepper, XpToast, haptic } from "./ui"
import { CheckInSheet, Onboarding, SuppPicker } from "./flows"
import { DeltaBars, DimLineChart, MoodCalendar, MoodCurve, ProCon } from "./charts"
import { CoachBubble, HelpSheet, KolbiTip, MASCOT_NAME, Mascot } from "./mascot"
import { InstallHint } from "./install"
import { DailyRound, dayProgress, roundSteps, type RoundStep } from "./round"
import { factsFor, partnerTips, recentSides, sideCauses } from "@/lib/labKnowledge"
import { openShop, refillStock, shoppingList, stockInfo } from "@/lib/labStock"
import { ShopButton, ShoppingCard, StockCard, StockSheet } from "./stock"
import { KolbiPage } from "./kolbi"
import { FounderWelcome, PaywallSheet, ProGate, ReviewSheet } from "./grow"
import { ProfileCard } from "./profile"
import { SITE_URL, betaOpen, claimFounder, markPurchased, markReviewAsked, shouldAskReview, type ProFeature } from "@/lib/labGrow"
import { checkEntitlement } from "@/lib/labBilling"
import { configureStats, srcFromUrl, track, trackCheckin, trackOnce } from "@/lib/labStats"
import { RoadPath } from "./path"
import { ShareButton, makeResultCard } from "./share"
import { CommunityCard, CommunityConsent } from "./community"
import { ExperimentSheet, ExperimentsView } from "./experiments"
import { startExperiment, type Experiment } from "@/lib/labExperiments"
import { removeMyResults, shareResult } from "@/lib/labCommunity"
import { calendarNames, calendarOn, calendarUrls, disableCalendar, enableCalendar, setCalendarNames, syncCalendar } from "@/lib/labCalendar"
import { CostCard, InteractionCard, PatternStrip, RecapTeaser, WeekRecap, recapAvailable, recapWeekEnd } from "./insights"
import { pathStops, type Stop } from "@/lib/labPath"
import { t, dec, clock, isEn, LANG, setLang, canSwitchLang } from "@/lib/labI18n"

type Tab = "heute" | "meine" | "ergebnisse" | "kolbi"
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "heute", icon: "home", label: t("Heute") },
  { id: "meine", icon: "pill", label: t("Meine") },
  { id: "ergebnisse", icon: "chart", label: t("Ergebnisse") },
  { id: "kolbi", icon: "flask", label: t("Kolbi") },
]

const fmt = (n: number, sign = false) => `${sign && n > 0 ? "+" : ""}${dec(n, 1)}`
/** Plural nur fürs Englische: Deutsch nutzt immer die bisherige Form (many). */
const pl = (n: number, one: string, many: string) => (isEn && n === 1 ? one : many)

function phaseTitle(s: LabState, w: { kind: string; suppId?: string }) {
  if (w.kind === "baseline") return t("Reset-Phase")
  if (w.kind === "washout") return t("Kurze Pause")
  if (w.kind === "stack") return t("Dein Stack")
  if (w.kind === "check") return t("Ohne {name}", { name: s.supps.find(x => x.id === w.suppId)?.name ?? "?" })
  return t("Test: {name}", { name: s.supps.find(x => x.id === w.suppId)?.name ?? "?" })
}
function phaseEmoji(s: LabState, w: { kind: string; suppId?: string }) {
  if (w.kind === "baseline") return "🧘"
  if (w.kind === "washout") return "💧"
  if (w.kind === "stack") return "🏆"
  if (w.kind === "check") return "👀"
  return s.supps.find(x => x.id === w.suppId)?.emoji ?? "💊"
}

const DECISIONS: { id: Decision; emoji: string; label: string; color: string }[] = [
  { id: "keep",  emoji: "💚", label: t("Behalten"),  color: "#1baf7a" },
  { id: "maybe", emoji: "🤔", label: t("Vielleicht"), color: "#eda100" },
  { id: "drop",  emoji: "✂️", label: t("Fliegt raus"), color: "#e34948" },
]

const STATUS_STYLE: Record<SuppStatusKey, { bg: string; fg: string }> = {
  testing:   { bg: "var(--accent-dim)", fg: "var(--accent)" },
  observing: { bg: "rgba(57,135,229,.14)", fg: "#3987e5" },
  kept:      { bg: "var(--accent-dim)", fg: "var(--accent)" },
  maybe:     { bg: "var(--warning-dim)", fg: "var(--warning)" },
  dropped:   { bg: "var(--danger-dim)", fg: "var(--danger)" },
  constant:  { bg: "var(--surface-2)", fg: "var(--text-dim)" },
  paused:    { bg: "var(--surface-2)", fg: "var(--text-dim)" },
  away:      { bg: "var(--warning-dim)", fg: "var(--warning)" },
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
  try {
    const v = localStorage.getItem("true-lab-tab")
    return TABS.some(x => x.id === v) ? v as Tab : "heute" // alte Tabs (reise/daten/stack) → Heute
  } catch { return "heute" }
}

/** Aktionen aus Benachrichtigungen (?rate=4, ?taken=id, ?checkin=1) direkt beim Öffnen ausführen. */
function initialLoad(): { s: LabState; openCheckin: boolean; openRound: boolean; openRecap: boolean; flash: string | null } {
  const s = loadState()
  let openCheckin = false
  let openRound = false
  let openRecap = false
  let flash: string | null = null
  try {
    const q = new URLSearchParams(window.location.search)
    const today = todayIso()
    const rate = Number(q.get("rate"))
    const taken = q.get("taken")
    if (rate >= 1 && rate <= 5 && s.startDate && !s.checkins[today]) {
      s.checkins[today] = quickCheckin(s, today, rate)
      s.xp += 20
      flash = t("{face} Check-in gespeichert (+20 XP)", { face: FACES[rate - 1] })
    }
    if (taken && s.startDate) {
      const ids = taken.split(",").filter(id => s.supps.some(x => x.id === id))
      ids.forEach(id => markTaken(s, today, id))
      const names = ids.map(id => s.supps.find(x => x.id === id)!.name)
      flash = t("✓ {names} abgehakt", { names: names.length ? names.join(" & ") : t("Einnahme") })
    }
    if (q.get("checkin") === "1" && !s.checkins[today] && s.startDate) openRound = true
    if (q.get("round") === "1" && s.startDate) openRound = true
    if (q.get("recap") === "1" && s.startDate) openRecap = true
    if (rate || taken || q.get("checkin") || q.get("round") || q.get("recap")) {
      saveState(s)
      window.history.replaceState(null, "", window.location.pathname)
    }
  } catch {}
  return { s, openCheckin, openRound, openRecap, flash }
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
  const [reclassifyIds, setReclassifyIds] = useState<string[] | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed)
  const [toast, setToast] = useState<{ amount: number; label: string; k: number } | null>(null)
  const [flash, setFlash] = useState<string | null>(init.flash)
  const [newBadge, setNewBadge] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [round, setRound] = useState<RoundStep[] | null>(null)
  const [unlockedFor, setUnlockedFor] = useState<string | null>(null)
  const [stockFor, setStockFor] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState<false | "ask" | "feedback">(false)
  useEffect(() => { const h = () => setReviewOpen("feedback"); window.addEventListener("lab-feedback", h); return () => window.removeEventListener("lab-feedback", h) }, [])
  const [founderHello, setFounderHello] = useState(false)
  const [paywall, setPaywall] = useState<false | { from?: ProFeature }>(() => {
    try { return new URLSearchParams(location.search).get("paywall") ? {} : false } catch { return false }
  })
  const [reviewCheck, setReviewCheck] = useState(false) // nach Erfolgserlebnis prüfen, ob Kolbi nach einer Bewertung fragt
  const [askCommunity, setAskCommunity] = useState<string | null | false>(false) // false = zu · null = allgemein · id = nach Urteil
  const [pendingShare, setPendingShare] = useState<string | null>(null)
  const [mineView, setMineView] = useState<"liste" | "stack" | "exp">("liste")
  const [expOpen, setExpOpen] = useState<Experiment | null>(null)
  const [resView, setResView] = useState<"auswertung" | "verlauf">("auswertung")
  const [tabDir, setTabDir] = useState(1)
  const [navMini, setNavMini] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    let lastY = window.scrollY
    const on = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      if (Math.abs(y - lastY) < 12) return
      setNavMini(y > lastY && y > 120)
      lastY = y
    }
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  const [recapEnd, setRecapEnd] = useState<string | null>(() => init.openRecap ? recapWeekEnd(new Date(), todayIso()) : null)
  // Tab wechseln (auch alte Namen aus Unteransichten: stack → Meine/Stack, daten → Ergebnisse …)
  const goTab = useCallback((to: string) => {
    let next: Tab = TABS.some(x => x.id === to) ? to as Tab : "heute"
    if (to === "stack") { next = "meine"; setMineView("stack") }
    if (to === "daten") { next = "ergebnisse"; setResView("auswertung") }
    if (to === "reise") { next = "ergebnisse"; setResView("verlauf") }
    setTab(prev => { setTabDir(TABS.findIndex(x => x.id === next) >= TABS.findIndex(x => x.id === prev) ? 1 : -1); return next })
    window.scrollTo({ top: 0 })
  }, [])
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

  // Kalender-Abo: nach Änderungen (verzögert) neu hochladen – nur wenn abonniert
  useEffect(() => {
    const t = setTimeout(() => { syncCalendar(s) }, 4000)
    return () => clearTimeout(t)
  }, [s])

  // Web/PWA: echte Push-Nachrichten — Plan nach jeder Änderung (kurz verzögert) an den Server
  const [pushSt, setPushSt] = useState<PushState>("unsupported")
  useEffect(() => { pushState().then(setPushSt).catch(() => {}) }, [])
  useEffect(() => {
    if (pushSt !== "on") return
    const t = setTimeout(() => { syncPush(s) }, 1500)
    return () => clearTimeout(t)
  }, [s, pushSt])

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

  // Nach einem Urteil: anonym teilen (wenn erlaubt) bzw. einmal freundlich fragen
  const communityRef = useRef(s.community)
  communityRef.current = s.community
  const afterVerdict = useCallback((id: string) => {
    setReviewCheck(true)
    track("verdict")
    if (communityRef.current === true) setPendingShare(id)
    else if (communityRef.current === undefined) setAskCommunity(id)
  }, [])
  useEffect(() => {
    if (!pendingShare || !s.verdicts[pendingShare]) return
    const id = pendingShare
    setPendingShare(null)
    shareResult(s, id).then(ok => { if (ok) setFlash(t("🌍 Danke! Anonym mit der Community geteilt")) })
  }, [pendingShare, s])

  const saveCheckin = useCallback((c: CheckIn) => {
    const isNew = !s.checkins[c.date]
    const refined = !isNew && s.checkins[c.date]?.quick && !c.quick
    const at = c.at ?? s.checkins[c.date]?.at ?? (c.date === todayIso() ? nowTime() : undefined)
    update(p => { p.checkins[c.date] = { ...c, at }; return p },
      isNew ? { amount: 20, label: t("Check-in") } : refined ? { amount: 10, label: t("Genauer bewertet") } : undefined)
    if (isNew) { setConfetti(true); trackCheckin(Object.keys(s.checkins).length + 1) }
  }, [s.checkins, update])

  // Kalender-Download zuerst (braucht die direkte Nutzer-Geste, v. a. auf iOS), dann Berechtigung anfragen
  const turnOnPush = useCallback(async () => {
    const next = { ...s, reminders: { ...s.reminders, enabled: true, checkin: s.reminders.checkin || defaultCheckinTime(s.settings) } }
    if (!s.reminders.enabled) update(p => { p.reminders = next.reminders; return p })
    const ok = await enablePush(next).catch(() => false)
    if (ok) track("push_on")
    const st = await pushState().catch(() => "unsupported" as PushState)
    setPushSt(st)
    setFlash(ok ? t("🔔 Push-Erinnerungen sind an") : st === "denied" ? t("⚠️ Benachrichtigungen sind blockiert (Einstellungen → Mitteilungen)") : t("⚠️ Push hat nicht geklappt"))
  }, [s, update])

  const enableReminders = useCallback((withCalendar: boolean) => {
    // Echte Push-Nachrichten, wo möglich — dann braucht es keinen Kalender (sonst doppelt)
    if (pushAvailable()) { turnOnPush(); return }
    const reminders = { ...s.reminders, enabled: true, checkin: s.reminders.checkin || defaultCheckinTime(s.settings) }
    if (withCalendar) downloadIcs({ ...s, reminders })
    update(p => { p.reminders = reminders; return p })
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {})
  }, [s, update, turnOnPush])

  // Apple Health / Health Connect: bei Bedarf Berechtigung holen, dann regelmäßig synchronisieren (nur Store-App)
  const toggleHealth = useCallback(async () => {
    if (!s.healthEnabled) {
      const granted = await requestHealthPermission().catch(() => false)
      if (!granted) { setFlash(t("⚠️ Zugriff auf Health nicht erlaubt")); return }
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

  setDayBoundary(s.settings) // Lab-Tag beginnt kurz vor deiner Aufstehzeit
  const today = todayIso()

  // Anonyme Statistik: Einstellung + Herkunftskanal; erste Ansicht des Onboardings; Wochenrückblick geöffnet
  useEffect(() => { configureStats(!!s.statsOff, s.src ?? srcFromUrl()) }, [s.statsOff, s.src])
  useEffect(() => { if (!s.startDate) trackOnce("onboarding_view") }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (recapEnd) track("recap") }, [recapEnd])
  // Pro-Seite: kann von überall geöffnet werden (openPaywall in lib/labGrow.ts)
  useEffect(() => {
    const on = (e: Event) => setPaywall({ from: (e as CustomEvent<ProFeature | undefined>).detail })
    window.addEventListener("lab-paywall", on)
    return () => window.removeEventListener("lab-paywall", on)
  }, [])
  useEffect(() => { if (paywall) track("paywall_view") }, [paywall])
  // Store ist die Wahrheit: Kauf übernehmen bzw. abgelaufenes Abo beenden (Gründer bleiben Gründer)
  useEffect(() => {
    checkEntitlement().then(v => {
      if (v === true && !s.pro?.purchased) update(p => markPurchased(p, "restored", today))
      else if (v === false && s.pro?.purchased) update(p => { p.pro = { ...p.pro, purchased: undefined, plan: undefined }; return p })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Beta: jeder wird Gründer (Lab Pro bleibt dauerhaft) – einmalig, still im Hintergrund
  useEffect(() => { if (!s.pro?.founder && s.startDate) update(p => claimFounder(p, today)) }, [s.pro?.founder, s.startDate, today, update])
  // Nach einem Erfolgserlebnis (Urteil, Wochen-Story) evtl. freundlich nach der Meinung fragen
  useEffect(() => {
    if (!reviewCheck) return
    setReviewCheck(false)
    if (shouldAskReview(s, today)) { update(p => markReviewAsked(p, today)); setTimeout(() => setReviewOpen("ask"), 1200) }
  }, [reviewCheck, s, today, update])
  const toggleTook = useCallback((id: string) => {
    const on = (s.took[today] ?? []).includes(id)
    update(p => {
      if (on) { p.took[today] = (p.took[today] ?? []).filter(x => x !== id); if (p.tookAt[today]) delete p.tookAt[today][id] }
      else markTaken(p, today, id)
      return p
    }, on ? undefined : { amount: 5, label: t("Eingenommen") })
  }, [s.took, today, update])

  // Aktionen aus Kolbis Tipps
  const runAction = useCallback((a: CoachAction, msgId: string) => {
    switch (a.kind) {
      case "checkin": setCheckinDate(today); break
      case "startTest": setTestSetup(a.suppId); break
      case "pickNext": setPickOpen(true); break
      case "verdict": update(p => applyVerdict(p, a.suppId, a.decision, "Vorschlag übernommen", today), { amount: 50, label: t("Urteil gefällt") }); afterVerdict(a.suppId); break
      case "openVerdict": setVerdictFor(a.suppId); break
      case "abort": {
        const w = phaseAt(s, today)
        if (w?.kind === "test" && w.suppId) update(p => applyVerdict(p, w.suppId!, "drop", "Wegen Beschwerden abgebrochen", today), { amount: 20, label: t("Auf dich gehört") })
        break
      }
      case "startStack": update(p => startStack(p, today), { amount: 50, label: t("Stack gestartet") }); setConfetti(true); break
      case "check": update(p => startCheck(p, a.suppId, today, 3), { amount: 10, label: t("Beobachtung gestartet") }); break
      case "resolveCheck": update(p => resolveCheck(p, a.suppId, a.keep, today), { amount: 20, label: t("Entschieden") }); break
      case "konstant": update(p => { p.supps = p.supps.map(x => x.id === a.suppId ? { ...x, mode: "konstant" } : x); return p }); break
      case "konstantAll": update(p => { p.supps = p.supps.map(x => a.suppIds.includes(x.id) ? { ...x, mode: "konstant" } : x); return p }); break
      case "reclassifyPick": setReclassifyIds(a.suppIds); break
      case "addSupp": {
        // Aus einem Tipp heraus hat man es meist noch nicht → direkt auf die Einkaufsliste
        const lib = LIB_BY_ID[a.libId]
        if (!lib) break
        update(p => {
          if (!p.supps.some(x => (x.lib ?? x.id) === a.libId)) p.supps.push({ ...makeSupp(lib, lib.name, p.supps), away: today })
          if (a.tipId) p.learned = [...new Set([...p.learned, a.tipId])]
          return p
        }, { amount: 5, label: t("{name} vorgemerkt", { name: lib.name }) })
        setFlash(t("🛒 {name} steht auf deiner Einkaufsliste", { name: lib.name }))
        break
      }
      case "arrived": {
        const x = s.supps.find(q => q.id === a.suppId)
        update(p => {
          p.supps = p.supps.map(q => q.id !== a.suppId ? q : { ...q, away: undefined, ...(q.stock ? { stock: { ...q.stock, left: q.stock.pack, at: today, ordered: undefined } } : {}) })
          return p
        }, { amount: 10, label: t("Ist angekommen") })
        if (x) setFlash(t("📦 {name} ist da – ab heute eingeplant", { name: x.name }))
        break
      }
      case "stillAway": update(p => { p.supps = p.supps.map(q => q.id === a.suppId ? { ...q, away: today } : q); return p }); break
      case "setAway": {
        const x = s.supps.find(q => q.id === a.suppId)
        update(p => { p.supps = p.supps.map(q => q.id === a.suppId ? { ...q, away: today } : q); return p })
        if (x) setFlash(t("🛒 {name} steht auf deiner Einkaufsliste", { name: x.name }))
        break
      }
      case "shop": { const x = s.supps.find(q => q.id === a.suppId); if (x) openShop(x); break }
      case "ordered": {
        update(p => { p.supps = p.supps.map(q => q.id === a.suppId && q.stock ? { ...q, stock: { ...q.stock, ordered: today } } : q); return p })
        setFlash(t("📦 Notiert – ich frag in 2 Tagen nach"))
        break
      }
      case "refill": update(p => { p.supps = p.supps.map(q => q.id === a.suppId ? { ...q, stock: refillStock(p, q, today) } : q); return p }, { amount: 5, label: t("Vorrat aufgefüllt") }); break
      case "stock": setStockFor(a.suppId); break
      case "seePattern": update(p => { p.learned = [...new Set([...p.learned, a.tipId])]; return p }); goTab("daten"); break
      case "recap": setRecapEnd(recapWeekEnd(now, today)); break
      case "experiments": setMineView("exp"); goTab("meine"); break
      case "setTime": {
        update(p => {
          p.supps = p.supps.map(x => x.id === a.suppId ? { ...x, time: a.time } : x)
          p.learned = [...new Set([...p.learned, a.tipId])]
          return p
        })
        setFlash(t("⏰ Gemerkt: ab jetzt um {time}", { time: clock(a.time) }))
        break
      }
      case "gotIt": update(p => { p.learned = [...new Set([...p.learned, a.tipId])]; return p }); break
      case "keepTesting": update(p => { p.supps = p.supps.map(x => a.suppIds.includes(x.id) ? { ...x, mode: "test", keepTesting: true } : x); return p }); break
      case "take": toggleTook(a.suppId); break
      case "reminders": enableReminders(true); break
      case "dismiss": {
        const next = [...dismissed, msgId]
        setDismissed(next)
        try { localStorage.setItem(DISMISS_KEY(), JSON.stringify(next)) } catch {}
        break
      }
    }
  }, [s, today, update, toggleTook, enableReminders, dismissed, afterVerdict])

  const msgs = useMemo(() => coach(s, now, dismissed), [s, now, dismissed])
  // Einnahme & Check-in erledigt man über die Bubbles bzw. die Tagesrunde – nicht nochmal als Tipp
  const kolbiTips = useMemo(() => msgs.filter(m => !m.id.startsWith("take-") && m.id !== "checkin"), [msgs])

  // Check-in erst ab der gewünschten Uhrzeit — früher nur per Long-Press entsperrbar
  const checkinLocked = useMemo(() => {
    if (!s.reminders.enabled || unlockedFor === today) return false
    // relativ zum Lab-Tag: nach Mitternacht ist der Abend-Check-in natürlich offen
    return relMin(now.getHours() * 60 + now.getMinutes(), s.settings) < relMin(toMin(s.reminders.checkin), s.settings)
  }, [s.reminders.enabled, s.reminders.checkin, s.settings, unlockedFor, today, now])
  const pending = useMemo(() => roundSteps(s, today, now, checkinLocked), [s, today, now, checkinLocked])

  // Aus einer Benachrichtigung geöffnet → direkt in die Tagesrunde (Sperrzeit gilt dann nicht)
  useEffect(() => {
    if (!init.openRound) return
    const steps = roundSteps(init.s, todayIso(), new Date(), false)
    if (steps.length) { setUnlockedFor(todayIso()); setRound(steps) }
  }, [init])

  // ── Onboarding ──
  if (!s.startDate) {
    return (
      <div className="lab" style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)" }}>
        <style>{LAB_CSS}</style>
        <Onboarding
          onDemo={() => { track("demo"); const d = demoState(); saveState(d); setS(d); setTab("heute") }}
          onStart={({ state, wantsCalendar }) => {
            const next = hydrate({ ...emptyState(), ...state })
            next.badges = computeBadges(next)
            next.src = srcFromUrl()
            track(typeof matchMedia !== "undefined" && matchMedia("(display-mode: standalone)").matches ? "onboarded_pwa" : "onboarded")
            saveState(next); setS(next); setTab("heute"); setConfetti(true)
            if (betaOpen(todayIso())) setTimeout(() => setFounderHello(true), 1400)
            if (wantsCalendar) {
              if (pushAvailable()) enablePush(next).then(() => pushState()).then(setPushSt).catch(() => {})
              else downloadIcs(next)
            }
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
        position: "sticky", top: 0, zIndex: 100, background: "var(--glass)", backdropFilter: "blur(22px) saturate(1.8)", WebkitBackdropFilter: "blur(22px) saturate(1.8)",
        borderBottom: "1px solid var(--glass-line)", boxShadow: scrolled ? "0 6px 24px rgba(0,0,0,.08)" : "none", transition: "box-shadow .3s",
      }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          {!STORE_MODE && <Link href="/home" aria-label={t("Zurück zu TRUE")} style={{ color: "var(--text-dim)", textDecoration: "none", fontSize: "1.1rem", padding: "4px 6px 4px 0" }}>←</Link>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-.01em", lineHeight: 1.1 }}>{canSwitchLang() ? "Kolbi" : "Supplement Lab"} {s.demo && <span style={{ fontSize: "0.62rem", background: "var(--warning-dim)", color: "var(--warning)", padding: "2px 6px", borderRadius: 6, verticalAlign: "middle" }}>{t("BEISPIEL")}</span>}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-dim)", marginTop: 2 }}>{lvl.emoji} {lvl.name}</div>
          </div>
          <div title={t("{n} Tage am Stück eingecheckt", { n: st })} className="lab-glass" style={{
            display: "flex", alignItems: "center", gap: 4, height: 36, padding: "0 12px", borderRadius: 999,
            background: st ? "color-mix(in srgb, #eb6834 16%, var(--glass))" : undefined, fontWeight: 900, fontSize: "0.85rem",
          }}>
            <span style={{ filter: st ? undefined : "grayscale(1)", display: "inline-block" }}>🔥</span>{st}
          </div>
          <IconBtn label={t("Einstellungen")} onClick={() => setSettingsOpen(true)}><Icon name="settings" /></IconBtn>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "16px 16px calc(120px + env(safe-area-inset-bottom))" }}>
        <div key={tab} className="lab-tabin" style={{ ["--dx" as string]: `${tabDir * 24}px` }}>
          {tab === "heute" && <Dashboard s={s} wins={wins} today={today} now={now} msgs={msgs} onAction={runAction}
            onQuick={(d, v) => saveCheckin(quickCheckin(s, d, v))} onTake={toggleTook} onCheckin={setCheckinDate}
            onPhase={setPhaseSheet} goTab={goTab}
            pending={pending} onRound={() => setRound(pending)} checkinLocked={checkinLocked} pushOff={pushSt === "off"} onPush={turnOnPush}
            onUnlock={() => { setUnlockedFor(today); setRound(roundSteps(s, today, now, false)) }} />}
          {tab === "meine" && <MineView s={s} today={today} view={mineView} setView={setMineView} update={update} onSupp={setSuppSheet}
            onAction={runAction} onVerdict={setVerdictFor} onStartStack={() => runAction({ kind: "startStack" }, "stack")} onExperiment={setExpOpen} />}
          {tab === "ergebnisse" && <ResultsView s={s} wins={wins} today={today} view={resView} setView={setResView}
            onVerdict={setVerdictFor} onCheckin={setCheckinDate} onPhase={setPhaseSheet} goTab={goTab} onRecap={() => setRecapEnd(recapWeekEnd(now, today))} />}
          {tab === "kolbi" && <KolbiPage s={s} mood={msgs[0]?.mood ?? "happy"} fill={dayProgress(s, today)} msgs={kolbiTips} onAction={runAction}
            murky={(() => { const y = addDays(today, -1); return !!wins[0] && y >= wins[0].start && !s.checkins[y] && !s.checkins[today] })()}
            onFlash={setFlash} onFeedback={() => setReviewOpen("feedback")} />}
        </div>
      </main>

      {/* ── Tab-Leiste: Liquid Glass mit gleitender Pille, wird beim Runterscrollen kompakt ── */}
      <nav aria-label={t("Bereiche")} style={{
        position: "fixed", left: 0, right: 0, bottom: "calc(12px + env(safe-area-inset-bottom))", zIndex: 200,
        display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none",
      }}>
        <div className="lab-glass" style={{
          pointerEvents: "auto", position: "relative", display: "flex", padding: 5, borderRadius: 30, width: "100%", maxWidth: navMini ? 300 : 420,
          transition: "max-width .45s cubic-bezier(.34,1.56,.64,1)",
        }}>
          {/* gleitende Glas-Pille hinter dem aktiven Tab */}
          <span aria-hidden style={{
            position: "absolute", top: 5, bottom: 5, left: 5, width: "calc((100% - 10px) / 4)", borderRadius: 24,
            transform: `translateX(${TABS.findIndex(x => x.id === tab) * 100}%)`, transition: "transform .55s cubic-bezier(.34,1.45,.64,1)",
            background: "linear-gradient(160deg, color-mix(in srgb, var(--accent) 92%, #fff), var(--accent))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 0 rgba(0,0,0,.1), 0 6px 18px color-mix(in srgb, var(--accent) 45%, transparent)",
          }} />
          {TABS.map(({ id, icon, label: l }) => {
            const on = tab === id
            const badge = id === "kolbi" ? kolbiTips.length : id === "meine" ? shoppingList(s, today).count : 0
            return (
              <button key={id} onClick={() => { if (!on) haptic(6); goTab(id) }} className="lab-press" aria-current={on ? "page" : undefined} aria-label={l} style={{
                position: "relative", zIndex: 1, flex: 1, height: navMini ? 44 : 56, border: "none", borderRadius: 24, background: "transparent",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                color: on ? "#fff" : "var(--text-dim)", fontWeight: 800, fontSize: "0.66rem", transition: "height .4s cubic-bezier(.34,1.56,.64,1), color .3s",
              }}>
                <span style={{ display: "flex", transform: on ? "scale(1.08)" : "scale(1)", transition: "transform .4s cubic-bezier(.34,1.56,.64,1)" }}><Icon name={icon} size={navMini ? 20 : 22} /></span>
                {!navMini && <span>{l}</span>}
                {!on && badge > 0 && (id === "kolbi"
                  ? <span aria-hidden style={{ position: "absolute", top: navMini ? 8 : 9, left: "calc(50% + 7px)", width: 9, height: 9, borderRadius: 999, background: "var(--accent)", boxShadow: "0 0 0 2px var(--surface)" }} />
                  : <span style={{ position: "absolute", top: navMini ? 4 : 5, left: "calc(50% + 5px)", minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999, background: "#eda100", color: "#fff", fontSize: "0.64rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge}</span>)}
              </button>
            )
          })}
        </div>
      </nav>

      {askCommunity !== false && !round && !newBadge && <CommunityConsent s={s} suppId={askCommunity}
        onYes={() => { const id = askCommunity; setAskCommunity(false); update(p => { p.community = true; return p }, { amount: 10, label: t("Community") }); if (id && s.verdicts[id]) setPendingShare(id) }}
        onNo={() => { setAskCommunity(false); update(p => { p.community = false; return p }) }} />}
      {founderHello && !newBadge && <FounderWelcome onFlash={setFlash} onClose={() => setFounderHello(false)} />}
      {paywall && <PaywallSheet s={s} from={paywall.from} onFlash={setFlash} onClose={() => setPaywall(false)}
        onPurchased={plan => { update(p => markPurchased(p, plan, today)); setPaywall(false); setConfetti(true); track(plan === "restored" ? "restore" : "purchase") }} />}
      {reviewOpen && !round && !newBadge && !recapEnd && askCommunity === false && <ReviewSheet start={reviewOpen} onFlash={setFlash}
        onAnswer={m => update(p => markReviewAsked(p, today, m))} onClose={() => setReviewOpen(false)} />}
      {expOpen && <ExperimentSheet s={s} e={expOpen} onClose={() => setExpOpen(null)} onStart={away => {
        const e = expOpen
        setExpOpen(null)
        update(p => startExperiment(p, e, away), { amount: 20, label: t("Experiment gestartet") })
        track("experiment")
        setConfetti(true)
        setFlash(t("{emoji} Experiment „{title}“ gestartet – Kolbi plant alles", { emoji: e.emoji, title: e.title }))
        goTab("heute")
      }} />}
      {recapEnd && <WeekRecap s={s} end={recapEnd} today={today} onClose={() => { const e = recapEnd; setRecapEnd(null); update(p => { p.recapSeen = e; return p }, s.recapSeen === e ? undefined : { amount: 10, label: t("Woche angeschaut") }); setReviewCheck(true) }} />}
      {round && <DailyRound s={s} today={today} steps={round}
        onTake={id => update(p => { markTaken(p, today, id); return p }, { amount: 5, label: t("Eingenommen") })}
        onCheckin={saveCheckin}
        onVerdict={(id, d) => { update(p => applyVerdict(p, id, d, "In der Tagesrunde entschieden", today), { amount: 50, label: t("Urteil gefällt") }); if (d === "keep") setConfetti(true); afterVerdict(id) }}
        onLearn={fid => update(p => { if (!p.learned.includes(fid)) p.learned = [...p.learned, fid]; return p })}
        onClose={() => setRound(null)} />}

      {/* ── Overlays ── */}
      {checkinDate && (
        <CheckInSheet
          s={s} date={checkinDate}
          phaseLabel={(() => { const w = phaseAt(s, checkinDate); return w ? phaseTitle(s, w) : t("Zwischen zwei Schritten") })()}
          onClose={() => setCheckinDate(null)}
          onDone={c => { saveCheckin(c); setCheckinDate(null) }}
        />
      )}
      {verdictFor && <VerdictSheet key={verdictFor} s={s} suppId={verdictFor} onClose={() => setVerdictFor(null)} onSave={(id, decision, note) => {
        const isNew = !s.verdicts[id]
        update(p => applyVerdict(p, id, decision, note, today), isNew ? { amount: 50, label: t("Urteil gefällt") } : undefined)
        afterVerdict(id)
        setVerdictFor(null)
      }} />}
      <PhaseSheet s={s} w={phaseSheet} today={today} onClose={() => setPhaseSheet(null)} update={update} onVerdict={id => { setPhaseSheet(null); setVerdictFor(id) }} />
      {suppSheet && <SuppSheet s={s} id={suppSheet} today={today} onClose={() => setSuppSheet(null)} update={update} onAction={a => { setSuppSheet(null); runAction(a, "supp") }} onVerdict={id => { setSuppSheet(null); setVerdictFor(id) }} onStock={id => setStockFor(id)} onJoin={() => setAskCommunity(s.verdicts[suppSheet] ? suppSheet : null)} />}
      {stockFor && <StockSheet s={s} suppId={stockFor} onClose={() => setStockFor(null)} onSave={(stock, dose) => {
        const first = !s.supps.find(x => x.id === stockFor)?.stock
        update(p => { p.supps = p.supps.map(x => x.id === stockFor ? { ...x, stock, dose } : x); return p }, first ? { amount: 10, label: t("Vorrat eingetragen") } : undefined)
        setStockFor(null)
      }} />}
      {reclassifyIds && <ReclassifySheet s={s} ids={reclassifyIds} onClose={() => setReclassifyIds(null)} onApply={konstant => {
        update(p => {
          p.supps = p.supps.map(x => !reclassifyIds.includes(x.id) ? x
            : konstant.includes(x.id) ? { ...x, mode: "konstant" } : { ...x, mode: "test", keepTesting: true })
          return p
        })
        setReclassifyIds(null)
      }} />}
      {pickOpen && <PickNextSheet s={s} onClose={() => setPickOpen(false)} update={update} onStart={id => { setPickOpen(false); runAction({ kind: "startTest", suppId: id }, "pick") }} />}
      {testSetup && <TestSetupSheet s={s} suppId={testSetup} onClose={() => setTestSetup(null)}
        onConfirm={days => {
          const id = testSetup; const name = s.supps.find(x => x.id === id)?.name
          setTestSetup(null)
          update(p => startTest(p, id, today, days), { amount: 10, label: t("Test gestartet") })
          setFlash(pl(days, t("🔬 Test gestartet: {name} · 1 Tag", { name: String(name) }), t("🔬 Test gestartet: {name} · {n} Tage", { name: String(name), n: days })))
        }}
        onKonstant={() => {
          const id = testSetup
          setTestSetup(null)
          update(p => { p.supps = p.supps.map(x => x.id === id ? { ...x, mode: "konstant" } : x); return p })
        }} />}
      {helpOpen && <HelpSheet msgs={msgs} onAction={runAction} onClose={() => setHelpOpen(false)} />}
      {settingsOpen && <SettingsSheet s={s} onClose={() => setSettingsOpen(false)} update={update}
        onEnableReminders={enableReminders} pushSt={pushSt}
        onToggleHealth={toggleHealth}
        onImport={next => { saveState(next); setS(next); setSettingsOpen(false); setFlash(t("✓ Daten importiert")) }}
        onReset={() => { const e = s.demo ? restoreBackup() : emptyState(); saveState(e); setS(e); setSettingsOpen(false) }}
        onDemo={() => { backup(s); const d = demoState(); saveState(d); setS(d); setSettingsOpen(false) }} />}

      {newBadge && !round && !recapEnd && (() => {
        const b = BADGES.find(x => x.id === newBadge)!
        return (
          <div className="lab-fade" onClick={() => setNewBadge(null)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(5,5,12,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div className="lab-pop lab-card" style={{ padding: 28, textAlign: "center", maxWidth: 320 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 900, letterSpacing: ".1em", color: "var(--accent)" }}>{t("NEUES ABZEICHEN")}</div>
              <div className="lab-float" style={{ fontSize: "4.5rem", margin: "12px 0" }}>{b.emoji}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{b.name}</div>
              <div style={{ color: "var(--text-dim)", margin: "6px 0 18px" }}>{b.desc}</div>
              <Btn full onClick={() => setNewBadge(null)}>{t("Nice! +30 XP")}</Btn>
            </div>
          </div>
        )
      })()}
      {toast && <XpToast key={toast.k} amount={toast.amount} label={toast.label} />}
      {flash && !toast && (
        <div style={{ position: "fixed", top: "calc(10px + env(safe-area-inset-top))", left: 0, right: 0, zIndex: 600, display: "flex", justifyContent: "center", pointerEvents: "none", padding: "0 16px" }}>
          <div className="lab-island" style={{ background: "#000", color: "#fff", borderRadius: 999, padding: "11px 20px", minHeight: 44, display: "flex", alignItems: "center", fontWeight: 800, fontSize: "0.9rem", boxShadow: "0 12px 34px rgba(0,0,0,.35)", maxWidth: "calc(100vw - 32px)" }}><span>{flash}</span></div>
        </div>
      )}
      {confetti && <Confetti onDone={() => setConfetti(false)} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ÜBERSICHT (Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

/** Sperrt den Check-in bis zur gewünschten Uhrzeit — Countdown, Freischalten nur per Long-Press
 *  (statt eines normalen Buttons), damit niemand aus Versehen vorzeitig etwas eintippt. */
function LockedCheckin({ unlockAt, now, onUnlock, inline }: { unlockAt: string; now: Date; onUnlock: () => void; inline?: boolean }) {
  const HOLD_MS = 900
  const [pressing, setPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = () => {
    setPressing(true)
    timerRef.current = setTimeout(onUnlock, HOLD_MS)
  }
  const cancel = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setPressing(false)
  }
  const [h, m] = unlockAt.split(":").map(Number)
  const target = new Date(now); target.setHours(h, m, 0, 0)
  const remaining = Math.max(0, target.getTime() - now.getTime())
  const R = 30, C = 2 * Math.PI * R
  const ring = (
    <button
      onPointerDown={e => { e.stopPropagation(); start() }} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} onClick={e => e.stopPropagation()}
      aria-label={t("Lange drücken zum vorzeitigen Freischalten")}
      style={{ width: 60, height: 60, borderRadius: "50%", border: "none", background: "none", position: "relative", cursor: "pointer", touchAction: "none", flexShrink: 0 }}
    >
      <svg width={60} height={60} viewBox="0 0 72 72" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={36} cy={36} r={R} fill="none" stroke="var(--border)" strokeWidth={5} />
        <circle cx={36} cy={36} r={R} fill="none" stroke="var(--accent)" strokeWidth={5} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={pressing ? 0 : C}
          style={{ transition: pressing ? `stroke-dashoffset ${HOLD_MS}ms linear` : "none" }} />
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>{pressing ? "🔓" : "🔒"}</span>
    </button>
  )
  if (inline) return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 20, background: "color-mix(in srgb, var(--surface-2) 80%, transparent)", textAlign: "left" }}>
      {ring}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 900, fontSize: "0.9rem" }}>{t("Check-in ab {time}", { time: clock(unlockAt) })}</span>
        <span style={{ display: "block", fontSize: "0.74rem", color: "var(--text-dim)" }}>{t("noch")} <b style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCountdown(remaining)}</b> {t("· früher: Schloss lange drücken")}</span>
      </span>
    </div>
  )
  return (
    <div className="lab-rise lab-card" style={{ padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>🔒 {t("Check-in ab {time}", { time: clock(unlockAt) })}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
        {t("Noch")} <b style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmtCountdown(remaining)}</b>
      </div>
      <button
        onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
        aria-label={t("Lange drücken zum vorzeitigen Freischalten")}
        style={{ width: 72, height: 72, borderRadius: "50%", border: "none", background: "none", position: "relative", cursor: "pointer", marginTop: 6, touchAction: "none" }}
      >
        <svg width={72} height={72} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={36} cy={36} r={R} fill="none" stroke="var(--border)" strokeWidth={5} />
          <circle cx={36} cy={36} r={R} fill="none" stroke="var(--accent)" strokeWidth={5} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={pressing ? 0 : C}
            style={{ transition: pressing ? `stroke-dashoffset ${HOLD_MS}ms linear` : "none" }} />
        </svg>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>🔓</span>
      </button>
      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{t("Lange drücken zum vorzeitigen Freischalten")}</div>
    </div>
  )
}

/** Kolbi oben auf „Heute“: Füllstand = Tagesfortschritt, darunter die heutigen Einnahmen als Bubbles. */
function KolbiHero({ s, today, now, pending, sleepy, lockedUntil, notStarted, startIn, dropKey, onRound, onKolbi, onUnlock, onCheckin }: {
  s: LabState; today: string; now: Date; pending: RoundStep[]; sleepy: boolean; lockedUntil: string | null
  notStarted: boolean; startIn: number | null; dropKey: string | null
  onRound: () => void; onKolbi: () => void; onUnlock: () => void; onCheckin: () => void
}) {
  const [tapped, setTapped] = useState(false)
  const dropAt = dropKey
  // Hüpfer, wenn sich Kolbi füllt (Einnahme abgehakt, Check-in …)
  const prevFill = useRef<number | null>(null)
  const [hop, setHop] = useState(0)
  const fill = dayProgress(s, today)
  const st = streak(s)
  const lvl = levelFor(s.xp)
  const n = pending.length
  const reveal = pending.some(p => p.kind === "reveal")
  const checked = s.checkins[today]
  const mood = notStarted ? "happy" : n ? (reveal ? "think" : sleepy ? "sleepy" : "happy") : fill >= 1 ? "party" : sleepy ? "sleepy" : "happy"
  useEffect(() => {
    if (prevFill.current != null && fill > prevFill.current + 0.001) setHop(h => h + 1)
    prevFill.current = fill
  }, [fill])
  const hour = now.getHours()
  const evening = hour >= 20 || hour < 5
  const accessory = evening && fill >= 1 ? "nightcap" as const : st >= 7 ? "shades" as const : null
  const blobs = sleepy ? ["#8f9a7a", "#6b7280", "#94a3b8"]
    : evening ? ["#6c5ce7", "#3987e5", st >= 3 ? "#ff9f43" : "#e87ba4"]
    : fill >= 1 ? ["#2ECC8A", "#1baf7a", "#f5d76e"]
    : ["#2ECC8A", "#3987e5", st >= 3 ? "#ff9f43" : "#9ee6c5"]
  const go = () => {
    if (!n || tapped) return
    setTapped(true)
    setTimeout(() => { onRound(); setTapped(false) }, 380)
  }
  const catchUp = pending.some(p => p.kind === "checkin" && p.date && p.date !== today)
  const title = notStarted ? t("Bald geht's los")
    : n ? (reveal && n === 1 ? t("Ein Ergebnis wartet") : catchUp && n === 1 ? t("Gestern fehlt noch") : n === 1 ? t("1 Sache für jetzt") : t("{n} Dinge für jetzt", { n }))
    : fill >= 1 ? t("Heute alles erledigt") : t("Gerade nichts zu tun")
  const sub = notStarted ? t("Start in {time} – bis dahin alles wie gewohnt.", { time: startIn != null ? fmtCountdown(startIn) : t("Kürze") })
    : n ? t("Ich führe dich Schritt für Schritt durch.")
    : fill >= 1 ? (st > 1 ? t("{n} Tage am Stück. Stark!", { n: st }) : t("Bis morgen!"))
    : lockedUntil ? t("Bis zum Check-in hast du frei.") : t("Ich melde mich, wenn wieder etwas dran ist.")
  return (
    <div className="lab-rise" style={{
      position: "relative", overflow: "hidden", borderRadius: 34, padding: "18px 18px 20px", textAlign: "center", isolation: "isolate",
      background: "var(--surface)", border: "1px solid var(--glass-line)", boxShadow: "inset 0 1px 0 var(--glass-edge), var(--glass-shadow)",
    }}>
      {/* lebendiger Farbhintergrund (Mesh) – Farbe passt zu deinem Tag */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -1, opacity: 0.42 }}>
        <span className="lab-blob" style={{ width: "70%", height: "75%", left: "-15%", top: "-20%", background: blobs[0] }} />
        <span className="lab-blob" style={{ width: "65%", height: "70%", right: "-18%", top: "5%", background: blobs[1], animationDelay: "-5s", animationDuration: "17s" }} />
        <span className="lab-blob" style={{ width: "55%", height: "55%", left: "20%", bottom: "-25%", background: blobs[2], animationDelay: "-9s", animationDuration: "12s" }} />
      </div>
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -1, background: "linear-gradient(180deg, transparent 35%, color-mix(in srgb, var(--surface) 70%, transparent) 100%)" }} />
      <div style={{ position: "relative", width: 132, height: 132, margin: "0 auto 4px" }}>
        {n > 0 && <span className="lab-pulse" style={{ position: "absolute", inset: 18, borderRadius: 999 }} />}
        <div className={tapped || dropAt ? "lab-squish" : hop ? "lab-hop" : "lab-float"} key={dropAt ?? `k${hop}`} role="button" tabIndex={0} aria-label={t("{name}: Tipps, Profil und Hilfe", { name: MASCOT_NAME })}
          onClick={onKolbi} onKeyDown={e => { if (e.key === "Enter") onKolbi() }} onAnimationEnd={e => { if (e.animationName === "labHop") setHop(0) }} style={{ position: "relative", cursor: "pointer" }}>
          <Mascot mood={mood} size={132} fill={0.12 + fill * 0.88} glow={st >= 3} murky={sleepy} alive accessory={accessory} />
          <span className="lab-glass" style={{ position: "absolute", right: -4, bottom: 6, fontSize: "0.7rem", fontWeight: 900, padding: "3px 9px", borderRadius: 999 }}>
            {lvl.emoji} Lv {lvl.index + 1}
          </span>
        </div>
        {(tapped || dropAt) && [42, 50, 58].map((l, k) => <span key={l} className="lab-drip" style={{ left: `${l}%`, top: dropAt ? "-8%" : "86%", animationDelay: `${k * 0.07}s`, ...(dropAt ? { animationName: "labDropIn" } : {}) }} />)}
      </div>
      <div style={{ fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-.01em" }}>{title}</div>
      <div style={{ fontSize: "0.86rem", color: "var(--text-dim)", marginTop: 3 }}>{sub}</div>

      {n > 0 && (
        <button onClick={() => { haptic(); go() }} className="lab-press lab-drop" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 999, border: "none", background: "var(--lab-grad)", color: "#fff", fontWeight: 900, fontSize: "1.02rem", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45), inset 0 -2px 0 rgba(0,0,0,.12), 0 12px 28px rgba(46,204,138,.4)" }}>
          ▶ {reveal && n === 1 ? t("Ergebnis aufdecken") : t("Los geht's")}
        </button>
      )}
      {!n && !checked && lockedUntil && <div style={{ marginTop: 16 }}><LockedCheckin inline unlockAt={lockedUntil} now={now} onUnlock={onUnlock} /></div>}
      {!n && checked && (
        <button onClick={onCheckin} className="lab-press" style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text)", fontWeight: 800, fontSize: "0.82rem" }}>
          {FACES[Math.round(daySum(checked)) - 1]} {t("Heute")} {fmt(daySum(checked))}★ · <span style={{ color: "var(--accent)" }}>{checked.quick ? t("genauer") : t("ändern")}</span>
        </button>
      )}
    </div>
  )
}

/** Kolbis Sprechblase unter ihm: ein Satz, ein Knopf – der Rest im Kolbi-Tab. */
function KolbiSays({ msg, more, onAction, onMore }: { msg: CoachMsg; more: number; onAction: (a: CoachAction, id: string) => void; onMore: () => void }) {
  const [open, setOpen] = useState(false)
  const main = msg.actions?.find(a => a.primary) ?? msg.actions?.[0]
  const second = msg.actions?.find(a => a !== main)
  return (
    <div className="lab-rise" style={{ position: "relative", marginTop: -2 }}>
      <span aria-hidden style={{ position: "absolute", left: "50%", top: -7, width: 14, height: 14, marginLeft: -7, background: "var(--surface)", borderLeft: "1px solid var(--border)", borderTop: "1px solid var(--border)", transform: "rotate(45deg)" }} />
      <div className="lab-card" style={{ padding: "14px 16px" }}>
        <div style={{ fontWeight: 900, fontSize: "0.98rem" }}>{msg.title}</div>
        <div onClick={() => setOpen(o => !o)} style={{
          fontSize: "0.86rem", lineHeight: 1.45, color: "var(--text-dim)", marginTop: 3, cursor: "pointer",
          ...(open ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }),
        }}>{msg.text}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {main && <Btn onClick={() => onAction(main.action, msg.id)} style={{ padding: "9px 14px", fontSize: "0.84rem", borderRadius: 12 }}>{main.label}</Btn>}
          {open && second && <Btn variant="soft" onClick={() => onAction(second.action, msg.id)} style={{ padding: "9px 12px", fontSize: "0.82rem", borderRadius: 12 }}>{second.label}</Btn>}
          <span style={{ flex: 1 }} />
          {!open && (msg.actions?.length ?? 0) > 1 && <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>{t("Mehr")}</button>}
          {more > 0 && <button onClick={onMore} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>+{more} ›</button>}
        </div>
      </div>
    </div>
  )
}

/** Kleine Überblicks-Zeile (Test, Einkaufsliste …). */
function Row({ emoji, title, sub, right, progress, color, onClick }: {
  emoji: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; progress?: number | null; color?: string; onClick?: () => void
}) {
  return (
    <button onClick={onClick} className="lab-press" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", background: "none", border: "none", color: "var(--text)", textAlign: "left" }}>
      <span style={{ width: 40, height: 40, borderRadius: 13, background: color ?? "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>{emoji}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 800, fontSize: "0.92rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        {sub && <span style={{ display: "block", fontSize: "0.76rem", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
        {progress != null && (
          <span style={{ display: "block", height: 5, borderRadius: 3, background: "var(--surface-2)", marginTop: 6, overflow: "hidden" }}>
            <span style={{ display: "block", width: `${Math.max(4, progress * 100)}%`, height: "100%", borderRadius: 3, background: color ?? "var(--accent)", transition: "width 1s" }} />
          </span>
        )}
      </span>
      {right}
      <span style={{ color: "var(--text-dim)" }}>›</span>
    </button>
  )
}

function Dashboard({ s, wins, today, now, msgs, onAction, onQuick, onTake, onPhase, goTab, pending, onRound, checkinLocked, onUnlock, pushOff, onPush, onCheckin }: {
  s: LabState; wins: PhaseWindow[]; today: string; now: Date; msgs: CoachMsg[]
  onAction: (a: CoachAction, id: string) => void
  onQuick: (d: string, v: number) => void; onTake: (id: string) => void
  onPhase: (w: PhaseWindow) => void; goTab: (t: string) => void
  pending: RoundStep[]; onRound: () => void; checkinLocked: boolean; onUnlock: () => void
  pushOff: boolean; onPush: () => void; onCheckin: (d: string) => void
}) {
  const w = wins.find(x => today >= x.start && today <= x.end) ?? null
  const first = wins[0]
  const notStarted = !!first && today < first.start
  const checked = s.checkins[today]
  const yesterday = addDays(today, -1)
  const missedYesterday = !!first && yesterday >= first.start && !s.checkins[yesterday]
  const color = w?.kind === "test" || w?.kind === "check" ? suppColor(s.supps.find(x => x.id === w.suppId)) : w?.kind === "stack" ? "#eda100" : w?.kind === "washout" ? "#3987e5" : "#2ECC8A"
  // Was die Tagesrunde bzw. die Bubbles abdecken, muss Kolbi nicht zusätzlich sagen
  // Phasen-Info steht schon in der Überblicks-Zeile darunter
  const inRound = (id: string) => id === "checkin" || id.startsWith("take-") || id.startsWith("verdict-") || id.startsWith("low-") || id.startsWith("phase-") || (pushOff && id === "reminders")
  const tips = msgs.filter(m => !inRound(m.id))
  const top = tips[0]
  const shop = shoppingList(s, today)
  const road = pathStops(s, today, now, checkinLocked)
  const recap = recapAvailable(s, now, today)
  const [dropKey, setDropKey] = useState<string | null>(null)
  const onStop = (st: Stop) => {
    switch (st.kind) {
      case "take": {
        if (!st.suppId) break
        if (st.state !== "done") { setDropKey(`${st.suppId}-${Date.now()}`); setTimeout(() => setDropKey(null), 700); try { navigator.vibrate?.(12) } catch {} }
        onTake(st.suppId); break
      }
      case "checkin": if (st.state === "now") onRound(); else if (st.state === "done") onCheckin(today); break
      case "result": if (st.date === today) onRound(); else if (w) onPhase(w); break
      case "startTest": if (st.suppId) onAction({ kind: "startTest", suppId: st.suppId }, "path"); break
      case "stack": if (st.key === "start-stack") onAction({ kind: "startStack" }, "path"); else goTab("stack"); break
      case "stock": goTab("meine"); break
      case "streak": goTab("kolbi"); break
      case "reset": if (first) onPhase(first); break
      default: if (w) onPhase(w)
    }
  }

  const target = notStarted ? new Date(first.start + "T00:00:00").getTime() : w && !w.open ? phaseEndsAt(w) : null
  const remaining = target ? target - now.getTime() : null
  const progress = w && !w.open ? Math.min(1, Math.max(0, (diffDays(w.start, today) + 1) / w.days)) : null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <KolbiHero s={s} today={today} now={now} pending={pending} sleepy={missedYesterday && !checked}
        lockedUntil={!checked && checkinLocked ? s.reminders.checkin : null} notStarted={notStarted} startIn={notStarted ? remaining : null}
        dropKey={dropKey} onRound={onRound} onKolbi={() => goTab("kolbi")} onUnlock={onUnlock} onCheckin={() => onCheckin(today)} />

      {first?.kind === "baseline" && !notStarted && today <= addDays(first.end, 3) && <ProfileCard s={s} first={first} today={today} onCheckin={() => checked ? onCheckin(today) : onRound()} />}
      {recap.ready && <RecapTeaser end={recap.end} onOpen={() => onAction({ kind: "recap" }, "recap")} />}
      {top && <KolbiSays msg={top} more={tips.length - 1} onAction={onAction} onMore={() => goTab("kolbi")} />}

      {road.stops.length > 0 && (
        <div className="lab-card lab-rise" style={{ padding: "16px 12px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 4px" }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>{t("🗺️ Dein Weg")}</div>
            <button onClick={() => goTab("reise")} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>{t("Ganzer Verlauf ›")}</button>
          </div>
          <RoadPath stops={road.stops} goal={road.goal} today={today} onStop={onStop} />
        </div>
      )}

      {pushOff && (
        <div className="lab-card lab-rise" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.5rem" }}>🔔</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: "0.84rem", lineHeight: 1.4 }}><b>{t("Erinnerungen, auch wenn die App zu ist")}</b> <span style={{ color: "var(--text-dim)" }}>{t("· max. 3–4 am Tag")}</span></span>
          <Btn onClick={onPush} style={{ padding: "9px 14px", fontSize: "0.84rem" }}>{t("An")}</Btn>
        </div>
      )}

      {shop.count > 0 && (
        <div className="lab-card lab-rise" style={{ padding: 4 }}>
          <Row emoji="🛒" title={t("Einkaufsliste · {n}", { n: shop.count })}
            sub={[...shop.away.map(x => x.name), ...shop.low.map(x => t("{name} (bald leer)", { name: x.name }))].join(", ")}
            onClick={() => goTab("meine")} />
        </div>
      )}
      {STORE_MODE && !hasNativeReminders() && <InstallHint compact />}
    </div>
  )
}

// ── Meine: Supplements, Einkaufsliste, Stack ───────────────────────────────────

function MineView({ s, today, view, setView, update, onSupp, onAction, onVerdict, onStartStack, onExperiment }: {
  s: LabState; today: string; view: "liste" | "stack" | "exp"; setView: (v: "liste" | "stack" | "exp") => void; update: Update
  onSupp: (id: string) => void; onAction: (a: CoachAction, id: string) => void; onVerdict: (id: string) => void; onStartStack: () => void
  onExperiment: (e: Experiment) => void
}) {
  const fix = (suppId: string, time: string) => onAction({ kind: "setTime", suppId, time, tipId: `fix:${suppId}:${time}` }, "inter")
  const shop = shoppingList(s, today)
  const order: SuppStatusKey[] = ["testing", "observing", "verdict", "kept", "constant", "waiting", "maybe", "away", "paused", "dropped"]
  const supps = [...s.supps].sort((a, b) => order.indexOf(suppStatus(s, a.id, today).key) - order.indexOf(suppStatus(s, b.id, today).key))
  const nextId = nextCandidates(s)[0]?.id
  const groups: { label: string; keys: SuppStatusKey[] }[] = [
    { label: t("Fest im Stack"), keys: ["constant"] },
    { label: t("Im Test"), keys: ["testing", "waiting", "observing", "verdict", "kept", "maybe"] },
    { label: t("Noch nicht da"), keys: ["away"] },
    { label: t("Pausiert"), keys: ["paused", "dropped"] },
  ]
  const row = (x: MySupp) => {
    const st = suppStatus(s, x.id, today)
    const info = takingInfo(s, x.id)
    const stock = stockInfo(s, x)
    const style = STATUS_STYLE[st.key]
    return (
      <button key={x.id} onClick={() => onSupp(x.id)} className="lab-press" style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", background: "none", border: "none", color: "var(--text)", textAlign: "left", width: "100%",
      }}>
        <span style={{ width: 42, height: 42, borderRadius: 14, background: suppColor(x), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0, opacity: x.away ? 0.55 : 1 }}>{x.emoji}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 800, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</span>
          <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: style.bg, color: style.fg, whiteSpace: "nowrap" }}>{st.emoji} {st.label}</span>
            <span style={{ fontSize: "0.74rem", color: stock?.low ? "var(--warning)" : "var(--text-dim)", whiteSpace: "nowrap" }}>
              {stock && !x.away ? `📦 ${stock.empty ? t("leer") : pl(stock.days, t("1 Tag"), t("{n} Tage", { n: stock.days }))}` : info.days ? (info.days === 1 ? t("1 Tag genommen") : t("{n} Tage genommen", { n: info.days })) : x.id === nextId && st.key === "waiting" ? t("als Nächstes dran") : ""}
            </span>
          </span>
        </span>
        <span style={{ color: "var(--text-dim)", fontSize: "1rem" }}>›</span>
      </button>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Segmented value={view} onChange={setView} options={[{ id: "liste", label: t("💊 Meine") }, { id: "exp", label: t("🧪 Experimente") }, { id: "stack", label: t("🏆 Stack") }]} />
      {view === "exp" ? <ProGate s={s} feature="experiments"><ExperimentsView s={s} onPick={onExperiment} /></ProGate>
      : view === "stack" ? <StackView s={s} update={update} onVerdict={onVerdict} onStartStack={onStartStack} /> : <>
        <ShoppingCard s={s} away={shop.away} low={shop.low} onOpen={onSupp} onArrived={id => onAction({ kind: "arrived", suppId: id }, "shop")} />
        <ProGate s={s} feature="costs"><CostCard s={s} today={today} onStock={id => onAction({ kind: "stock", suppId: id }, "cost")} /></ProGate>
        <Card className="lab-rise" style={{ padding: "14px 14px 8px" }}>
          {s.supps.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: "0.9rem", padding: 8 }}>{t("Noch keine Supplements.")}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {groups.map(g => {
              const items = supps.filter(x => g.keys.includes(suppStatus(s, x.id, today).key))
              if (!items.length) return null
              return (
                <div key={g.label}>
                  <Label style={{ marginBottom: 2 }}>{g.label} · {items.length}</Label>
                  <div style={{ display: "flex", flexDirection: "column" }}>{items.map(row)}</div>
                </div>
              )
            })}
          </div>
        </Card>
        <Btn variant="soft" full onClick={() => onAction({ kind: "pickNext" }, "list")}>{t("+ Supplement hinzufügen")}</Btn>
        <ProGate s={s} feature="timing"><InteractionCard s={s} today={today} onFix={fix} /></ProGate>
      </>}
    </div>
  )
}

// ── Ergebnisse: Auswertung & Verlauf ───────────────────────────────────────────

function ResultsView({ s, wins, today, view, setView, onVerdict, onCheckin, onPhase, goTab, onRecap }: {
  s: LabState; wins: PhaseWindow[]; today: string; view: "auswertung" | "verlauf"; setView: (v: "auswertung" | "verlauf") => void
  onVerdict: (id: string) => void; onCheckin: (d: string) => void; onPhase: (w: PhaseWindow) => void; goTab: (t: string) => void; onRecap: () => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Segmented value={view} onChange={setView} options={[{ id: "auswertung", label: t("📊 Auswertung") }, { id: "verlauf", label: t("🧭 Verlauf") }]} />
      {view === "verlauf" ? <JourneyView s={s} wins={wins} today={today} onPhase={onPhase} goTab={goTab} /> : <>
        <ProGate s={s} feature="patterns"><PatternStrip s={s} /></ProGate>
        {Object.keys(s.checkins).length >= 3 && (
          <button onClick={onRecap} className="lab-press" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 20, border: "none", color: "#fff", textAlign: "left",
            background: "linear-gradient(135deg, #9085e9 0%, #3987e5 60%, #2ECC8A 100%)" }}>
            <span style={{ fontSize: "1.5rem" }}>📊</span>
            <span style={{ flex: 1, fontWeight: 900 }}>{t("Wochenrückblick ansehen")}</span>
            <span>▶</span>
          </button>
        )}
        {Object.keys(s.checkins).length > 0 && (
          <Card className="lab-rise" style={{ padding: "16px 14px 10px" }}>
            <Label style={{ marginBottom: 6 }}>{t("Wie du dich fühlst · 14 Tage")}</Label>
            <MoodCurve s={s} />
          </Card>
        )}
        <DataView s={s} wins={wins} onVerdict={onVerdict} onCheckin={onCheckin} />
      </>}
    </div>
  )
}

// ── Detail-Blatt eines Supplements ─────────────────────────────────────────────

function SuppSheet({ s, id, today, onClose, update, onAction, onVerdict, onStock, onJoin }: {
  s: LabState; id: string; today: string; onClose: () => void; update: Update; onAction: (a: CoachAction) => void; onVerdict: (id: string) => void
  onStock: (id: string) => void; onJoin: () => void
}) {
  const x = s.supps.find(q => q.id === id)
  const [confirmRemove, setConfirmRemove] = useState(false)
  // Fakten gelten beim Öffnen als entdeckt; „NEU“ markiert, was vorher noch nicht gesehen war
  const libId = x?.lib
  const [fresh] = useState(() => new Set(libId ? factsFor(libId).map(f => f.id).filter(f => !s.learned.includes(f)) : []))
  useEffect(() => {
    if (fresh.size) update(p => { p.learned = [...new Set([...p.learned, ...fresh])]; return p })
  }, [fresh, update])
  if (!x) return null
  const lib = libOf(x)
  const facts = lib ? factsFor(lib.id) : []
  const partners = partnerTips(s, id)
  const causes = sideCauses(s, id, recentSides(s, 14))
  const st = suppStatus(s, id, today)
  const info = takingInfo(s, id)
  const avg = avgIntakeMinutes(s, id)
  const w = phaseAt(s, today)
  const baseDone = phaseWindows(s).some(p => p.kind === "baseline" && p.end < today) || (w && w.kind !== "baseline")
  return (
    <Sheet open onClose={onClose} title={`${x.emoji} ${x.name}`}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 800, padding: "5px 10px", borderRadius: 999, background: STATUS_STYLE[st.key].bg, color: STATUS_STYLE[st.key].fg }}>{st.emoji} {st.label}</span>
        {info.days > 0 && <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: "var(--surface-2)" }}>{info.days === 1 ? t("⏱️ 1 Tag genommen · seit {date}", { date: fmtDate(info.since!) }) : t("⏱️ {n} Tage genommen · seit {date}", { n: info.days, date: fmtDate(info.since!) })}</span>}
        {avg != null && <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: "var(--surface-2)" }}>{t("🕐 meist um {time}", { time: clock(fromMin(avg)) })}</span>}
      </div>

      {x.away && (
        <div className="lab-card lab-rise" style={{ padding: 14, marginBottom: 14, display: "flex", flexDirection: "column", gap: 10, border: "2px dashed var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="lab-wiggle" style={{ fontSize: "1.6rem", display: "inline-block" }}>🛒</span>
            <span style={{ fontSize: "0.86rem", lineHeight: 1.45 }}><b>{t("Noch nicht da.")}</b> <span style={{ color: "var(--text-dim)" }}>{t("Solange zählt es nirgends mit: keine Erinnerung, kein Test.")}</span></span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => onAction({ kind: "arrived", suppId: id })} style={{ flex: 1, padding: "11px 12px", fontSize: "0.88rem" }}>{t("📦 Ist angekommen")}</Btn>
            <ShopButton x={x} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {st.key === "waiting" && (
          baseDone && w?.kind !== "test"
            ? <Btn full onClick={() => onAction({ kind: "startTest", suppId: id })}>{t("🔬 Jetzt testen")}</Btn>
            : <div style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>{w?.kind === "test" ? t("Kann nach dem aktuellen Test starten.") : t("Kann nach der Reset-Phase getestet werden.")}</div>
        )}
        {st.key === "testing" && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="soft" full onClick={() => { update(p => { p.phases = p.phases.map((q, i) => i === w!.index ? { ...q, days: q.days + 1 } : q); return p }); onClose() }}>{t("+1 Tag")}</Btn>
            <Btn variant="danger" full onClick={() => onAction({ kind: "abort" })}>{t("Test abbrechen")}</Btn>
          </div>
        )}
        {(st.key === "kept" || st.key === "maybe" || st.key === "dropped" || st.key === "verdict") && <Btn variant={st.key === "verdict" ? "primary" : "soft"} full onClick={() => onVerdict(id)}>{st.key === "verdict" ? t("⚖️ Ergebnis ansehen") : t("Ergebnis & Urteil ändern")}</Btn>}
        {(st.key === "kept" || st.key === "maybe" || st.key === "dropped") && testResult(s, id)?.overall.test != null && testResult(s, id)?.overall.base != null &&
          <ShareButton make={() => makeResultCard(s, id)} name={t("mein-{lib}-ergebnis.png", { lib: x.lib ?? "test" })} text={t("Mein {name}-Selbstversuch 🧪", { name: x.name })} label={t("📤 Ergebnis als Bild teilen")} style={{ width: "100%" }} />}
        {st.key === "kept" && w?.kind === "stack" && <Btn variant="soft" full onClick={() => onAction({ kind: "check", suppId: id })}>{t("👀 3 Tage weglassen & beobachten")}</Btn>}
        {(st.key === "waiting" || st.key === "paused") && !lib?.rx && <Btn variant="soft" full onClick={() => { update(p => { p.supps = p.supps.map(q => q.id === id ? { ...q, mode: "konstant" } : q); return p }); onClose() }}>{t("📌 Nicht testen, einfach weiter nehmen")}</Btn>}
        {st.key === "constant" && !lib?.rx && <Btn variant="soft" full onClick={() => { update(p => { p.supps = p.supps.map(q => q.id === id ? { ...q, mode: "test", keepTesting: true } : q); return p }); onClose() }}>{t("🔬 Doch einzeln testen")}</Btn>}
      </div>

      {!x.away && !lib?.rx && lib?.category !== "Peptide" && (
        <div style={{ marginBottom: 12 }}>
          <StockCard s={s} x={x} onEdit={() => onStock(id)}
            onRefill={() => update(p => { p.supps = p.supps.map(q => q.id === id ? { ...q, stock: refillStock(p, q, today) } : q); return p }, { amount: 5, label: t("Vorrat aufgefüllt") })}
            onOrdered={() => update(p => { p.supps = p.supps.map(q => q.id === id && q.stock ? { ...q, stock: { ...q.stock, ordered: today } } : q); return p })} />
        </div>
      )}

      <Card style={{ marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontWeight: 800, fontSize: "0.88rem" }}>
          {t("Deine Dosis")}
          <input value={x.dose} placeholder={t("z. B. 400 mg")} onChange={e => { const v = e.target.value; update(p => { p.supps = p.supps.map(q => q.id === id ? { ...q, dose: v } : q); return p }) }}
            style={{ width: 150, padding: "8px 10px", borderRadius: 10, fontSize: "0.85rem" }} />
        </label>
      </Card>

      {(() => {
        const tip = timeTip(s, id)
        const slots = SLOTS.filter(q => q.id !== "training" || s.settings.training || tip.slot === "training")
        const pick = (slot: SlotId) => update(p => {
          if (slot === tip.recommended) delete p.slotOverrides[id]; else p.slotOverrides[id] = slot
          p.supps = p.supps.map(q => q.id === id ? { ...q, time: undefined } : q)
          return p
        })
        const setTime = (v: string) => update(p => { p.supps = p.supps.map(q => q.id === id ? { ...q, time: v || undefined } : q); return p })
        return (
          <Card style={{ marginBottom: 12 }}>
            <KolbiTip title={t("⏰ Mein Tipp: {emoji} {label} · {time}", { emoji: tip.recEmoji, label: tip.recLabel, time: clock(tip.recTime) })}>{tip.why}</KolbiTip>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 4px", padding: "10px 12px", borderRadius: 16, background: tip.personal ? "var(--accent-dim)" : "var(--surface-2)" }}>
              <span style={{ fontSize: "1.2rem" }}>🕐</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 900, fontSize: "0.9rem" }}>{tip.personal ? t("Deine Uhrzeit") : t("Erinnerung um")}</span>
                <span style={{ display: "block", fontSize: "0.74rem", color: "var(--text-dim)" }}>{tip.personal ? t("Ich erinnere dich genau dann.") : t("Tippe, um eine eigene Zeit zu wählen.")}</span>
              </span>
              <input type="time" value={tip.time} onChange={e => setTime(e.target.value)} aria-label={t("Eigene Uhrzeit")}
                style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontWeight: 800, fontSize: "1rem" }} />
            </div>
            {tip.personal && <button onClick={() => setTime("")} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer", padding: "4px 2px" }}>{t("↺ Zurück zu Kolbis Zeit")}</button>}
            <Label style={{ margin: "12px 0 8px" }}>{t("Oder nach Tageszeit")}</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {slots.map(q => {
                const on = !tip.personal && tip.slot === q.id
                return (
                  <button key={q.id} className="lab-press" onClick={() => pick(q.id)} aria-pressed={on} style={{
                    padding: "8px 11px", borderRadius: 999, fontSize: "0.78rem", fontWeight: on ? 800 : 600, color: "var(--text)", position: "relative",
                    border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)",
                  }}>
                    {q.emoji} {q.label} <span style={{ color: "var(--text-dim)", fontWeight: 700 }}>{slotTime(q.id, s.settings)}</span>
                    {q.id === tip.recommended && <span style={{ position: "absolute", top: -8, right: 8, fontSize: "0.55rem", background: "var(--accent)", color: "#fff", padding: "1px 6px", borderRadius: 6 }}>{t("Tipp")}</span>}
                  </button>
                )
              })}
            </div>
          </Card>
        )
      })()}

      {lib && <ProGate s={s} feature="community"><CommunityCard s={s} suppId={id} onJoin={onJoin} /></ProGate>}

      {lib && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "0.86rem", lineHeight: 1.55 }}>
            <div><b>{t("Was es kann:")}</b> {lib.effect}</div>
            <div style={{ marginTop: 6 }}><b>{t("Wirkt:")}</b> {ONSET_INFO[lib.onset].emoji} {ONSET_INFO[lib.onset].label}</div>
            {LIB_SIDES[lib.id]?.length ? <div style={{ marginTop: 6 }}><b>{t("Mögliche Nebenwirkungen:")}</b> {LIB_SIDES[lib.id].map(sid => SIDE_BY_ID[sid]?.label).join(", ")}</div> : null}
            {lib.caution && <div style={{ marginTop: 6, color: "var(--warning)" }}>⚠️ {lib.caution}</div>}
          </div>
        </Card>
      )}

      {(facts.length > 0 || partners.length > 0 || causes.length > 0) && (
        <Card style={{ marginBottom: 12 }}>
          <Label style={{ marginBottom: 10 }}>{t("💡 {name} weiß", { name: MASCOT_NAME })}</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {causes.map(c => (
              <KolbiTip key={c.matched.join()} mood="think" title={t("{sides} – daran kann's liegen", { sides: c.matched.map(m => SIDE_BY_ID[m]?.label).join(", ") })}>{c.text}</KolbiTip>
            ))}
            {partners.map(p => (
              <div key={p.with} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <KolbiTip title={p.title}>{p.text}</KolbiTip>
                <Btn variant="soft" full onClick={() => onAction({ kind: "addSupp", libId: p.with, tipId: `partner:${lib?.id}:${p.with}` })}>{t("🛒 {name} vormerken", { name: LIB_BY_ID[p.with]?.name ?? "" })}</Btn>
              </div>
            ))}
            {facts.map(f => (
              <div key={f.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.86rem", lineHeight: 1.5 }}>
                <span aria-hidden>📚</span>
                <span style={{ flex: 1 }}>{f.text}</span>
                {fresh.has(f.id) && <span style={{ fontSize: "0.6rem", fontWeight: 900, background: "var(--accent)", color: "#fff", padding: "2px 6px", borderRadius: 6, flexShrink: 0 }}>{t("NEU")}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {!x.away && <Btn variant="ghost" full onClick={() => onAction({ kind: "setAway", suppId: id })} style={{ marginBottom: 8 }}>{t("🛒 Gerade nicht da / leer")}</Btn>}
      {confirmRemove
        ? <Btn variant="danger" full onClick={() => { update(p => { p.supps = p.supps.filter(q => q.id !== id); p.phases = p.phases.filter(q => !(q.suppId === id && q.start && q.start > today)); return p }); onClose() }}>{t("Wirklich aus der Liste entfernen?")}</Btn>
        : <Btn variant="ghost" full onClick={() => setConfirmRemove(true)}>{t("Aus meiner Liste entfernen")}</Btn>}
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
    <Sheet open onClose={onClose} title={t("Was testen wir als Nächstes?")}>
      {cands.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {cands.map((x, i) => {
            const lib = libOf(x)
            return (
              <div key={x.id} className="lab-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 40, height: 40, borderRadius: 13, background: suppColor(x), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>{x.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800 }}>{x.name} {i === 0 && <span style={{ fontSize: "0.65rem", background: "var(--accent-dim)", color: "var(--accent)", padding: "2px 6px", borderRadius: 6 }}>{t("VORSCHLAG")}</span>}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{lib ? `${ONSET_INFO[lib.onset].emoji} ${ONSET_INFO[lib.onset].label} · ${t("Empfehlung {n} Tage", { n: ONSET_INFO[lib.onset].days })}` : t("unbekannt · keine Empfehlung")}</div>
                </div>
                {canStart && <Btn onClick={() => onStart(x.id)} style={{ padding: "9px 12px", fontSize: "0.8rem" }}>{t("Starten")}</Btn>}
              </div>
            )
          })}
          {!canStart && <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{t("Erst nach der Reset-Phase. Ich sage dir Bescheid, wenn es losgeht.")}</div>}
        </div>
      )}
      {adding ? (
        <SuppPicker selected={s.supps} goals={s.goals}
          onAddCustom={name => update(p => { p.supps.push(makeSupp(null, name, p.supps)); return p })}
          onPasteAdd={items => update(p => { items.forEach(it => { if (!it.lib || !p.supps.some(x => x.lib === it.lib!.id)) p.supps.push(makeSupp(it.lib, it.name, p.supps, it.dose)) }); return p })}
          onToggle={(lib: LibSupp) => update(p => { if (!p.supps.some(x => x.lib === lib.id)) p.supps.push(makeSupp(lib, lib.name, p.supps)); return p })}
          onAway={(libId, v) => update(p => { p.supps = p.supps.map(x => x.lib === libId ? { ...x, away: v ? todayIso() : undefined } : x); return p })} />
      ) : <Btn variant="ghost" full onClick={() => setAdding(true)}>{t("+ Neues Supplement hinzufügen")}</Btn>}
    </Sheet>
  )
}

// ── Bevor ein Test startet: Kolbi empfiehlt eine Dauer, du entscheidest ────────

/** Kolbis Vorschlag „durchgehend statt testen“ — pro Supplement selbst entscheiden. */
function ReclassifySheet({ s, ids, onClose, onApply }: { s: LabState; ids: string[]; onClose: () => void; onApply: (konstant: string[]) => void }) {
  const items = ids.map(id => s.supps.find(x => x.id === id)).filter((x): x is MySupp => !!x)
  const [konstant, setKonstant] = useState<string[]>(ids)
  const set = (id: string, on: boolean) => setKonstant(k => on ? [...new Set([...k, id])] : k.filter(x => x !== id))
  const testing = items.length - konstant.length
  return (
    <Sheet open onClose={onClose} title={t("Durchgehend oder testen?")}>
      <div style={{ fontSize: "0.86rem", color: "var(--text-dim)", lineHeight: 1.5, marginBottom: 14 }}>
        {t("Diese wirken erst über Wochen, deshalb empfehle ich „durchgehend“. Willst du eins trotzdem testen, stell es auf 🔬.")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
        {items.map(x => {
          const on = konstant.includes(x.id)
          const lib = libOf(x)
          return (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, background: suppColor(x), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", flexShrink: 0 }}>{x.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</span>
                {lib && <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{ONSET_INFO[lib.onset].emoji} {ONSET_INFO[lib.onset].label}</span>}
              </span>
              <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
                {([[true, "📌"], [false, "🔬"]] as const).map(([v, icon]) => (
                  <button key={icon} className="lab-press" onClick={() => set(x.id, v)} aria-pressed={on === v}
                    aria-label={`${x.name} ${v ? t("durchgehend nehmen") : t("testen")}`} style={{
                      padding: "8px 12px", border: "none", fontSize: "1rem",
                      background: on === v ? "var(--accent)" : "var(--surface)", color: on === v ? "#fff" : "var(--text-dim)",
                    }}>{icon}</button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <Btn full onClick={() => onApply(konstant)}>
        {t("Übernehmen · {n} durchgehend", { n: konstant.length })}{testing ? t(", {n} testen", { n: testing }) : ""}
      </Btn>
    </Sheet>
  )
}

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

  const startBtn = <Btn full onClick={() => onConfirm(days)}>{pl(days, t("🔬 1 Tag testen"), t("🔬 {n} Tage testen", { n: days }))}</Btn>
  const stayBtn = <Btn full variant={prescribed ? "primary" : "soft"} onClick={onKonstant}>📌 {prescribed ? t("Weiter nehmen (empfohlen)") : t("Doch einfach weiter nehmen")}</Btn>

  return (
    <Sheet open onClose={onClose} title={t("🔬 {name} testen", { name: x.name })}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ flexShrink: 0 }}><Mascot mood={prescribed ? "alert" : lib ? "happy" : "think"} size={48} /></div>
        <div style={{
          flex: 1, minWidth: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px 16px 16px 4px",
          padding: "10px 12px", fontSize: "0.86rem", lineHeight: 1.5,
        }}>
          {lib ? (
            <>{ONSET_INFO[lib.onset].text} {t("Ich empfehle")} <b>{t("{n} Tage", { n: recommended ?? "" })}</b> {t("— unten schon ausgewählt, du kannst es ändern.")}</>
          ) : (
            <>
              <b>{x.name}</b> {t("kenne ich nicht — dazu kann ich keine Dauer empfehlen, das wäre Beratung.")}
              {prescribed && <> {t("Klingt nach einem")} <b>{t("Mittel, das man über längere Zeit nimmt")}</b> {t("(z. B. Hormone, Blutdruck, Psychopharmaka). Sowas testet man nicht kurz ab, sondern spricht Änderungen mit der Ärztin/dem Arzt ab.")}</>}
            </>
          )}
        </div>
      </div>

      <Label style={{ marginBottom: 8 }}>{t("Wie lange testen?")}</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {presets.map(d => (
          <button key={d} className="lab-press" onClick={() => setDays(d)} style={{
            padding: "10px 14px", borderRadius: 14, fontWeight: 800, position: "relative", color: "var(--text)",
            border: days === d ? "2px solid var(--accent)" : "1px solid var(--border)",
            background: days === d ? "var(--accent-dim)" : "var(--surface)",
          }}>
            {t("{n} Tage", { n: d })}
            {recommended === d && <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", background: "var(--accent)", color: "#fff", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>{t("Empfehlung")}</span>}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>{t("eigene Anzahl")}</span>
        <Stepper value={days} min={1} max={30} onChange={setDays} suffix={t(" T")} />
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
  s: LabState; wins: PhaseWindow[]; today: string; onPhase: (w: PhaseWindow) => void; goTab: (t: string) => void
}) {
  const offsets = [0, 1, 1.4, 1, 0, -1, -1.4, -1]
  const kept = stackMembers(s, false).length
  const constants = s.supps.filter(x => x.mode === "konstant")
  const cands = nextCandidates(s)
  const hasStack = wins.some(w => w.kind === "stack")
  return (
    <div>
      <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{t("Dein Verlauf")}</div>
      <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{pl(wins.length, t("1 Schritt bisher"), t("{n} Schritte bisher", { n: wins.length }))}{cands.length ? (cands.length > 1 ? t(" · {n} Tests offen", { n: cands.length }) : t(" · 1 Test offen")) : ""}{t(". Tippe auf einen Schritt für Details.")}</div>
      {constants.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 8 }}>
          {t("📌 Läuft durchgehend:")} {constants.map(x => <Capsule key={x.id} supp={x} size="sm" />)}
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
                    {w.kind === "test" ? supp?.name : w.kind === "washout" ? t("Pause · {n} T", { n: w.days }) : phaseTitle(s, w)}
                  </div>
                  {w.kind !== "washout" && (
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                      {state === "active" ? (w.open ? pl(diffDays(w.start, today) + 1, t("seit 1 Tag"), t("seit {n} Tagen", { n: diffDays(w.start, today) + 1 })) : t("läuft · Tag {n}/{total}", { n: diffDays(w.start, today) + 1, total: w.days })) : state === "done" ? pl(nCheck, t("1 Check-in"), t("{n} Check-ins", { n: nCheck })) : `${fmtDate(w.start)} · ${w.days}${t(" T")}`}
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
                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 6, textAlign: "center" }}>{t("Noch zu testen:")}<br /><b style={{ color: "var(--text)" }}>{cands.map(x => x.name).join(", ")}</b></div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 30 }}>
              <button className="lab-press" onClick={() => goTab("stack")} style={{
                width: 96, height: 96, borderRadius: 30, border: "none", fontSize: "2.8rem", background: "var(--surface-2)", filter: "grayscale(.8)",
              }}>🏆</button>
              <div style={{ fontWeight: 900, marginTop: 8 }}>{t("Dein Stack")}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{kept ? (kept > 1 ? t("{n} Supplements dabei", { n: kept }) : t("{n} Supplement dabei", { n: kept })) : t("wartet auf deine Urteile")}</div>
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
      <Label style={{ marginBottom: 6 }}>{t("🍎 Objektive Werte")}</Label>
      {row("😴", t("Schlaf"), cmp.baseSleep, cmp.testSleep, " h", 1)}
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
        {w.open ? t("Seit {date}", { date: fmtDate(w.start) }) : `${fmtDate(w.start)} → ${fmtDate(w.end)} · ${pl(w.days, t("1 Tag"), t("{n} Tage", { n: w.days }))}`} · {state === "done" ? t("abgeschlossen") : state === "active" ? t("läuft gerade") : t("geplant")}
      </div>
      {lib && w.kind === "test" && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "0.88rem", lineHeight: 1.55 }}>
            <div><b>{t("Wirkung:")}</b> {lib.effect}</div>
            <div style={{ marginTop: 6 }}><b>{t("Dosis:")}</b> {supp?.dose || lib.dose}{lib.route ? ` · ${ROUTE_INFO[lib.route].emoji} ${ROUTE_INFO[lib.route].label}` : ""}</div>
            <div style={{ marginTop: 6 }}><b>{t("Einnahme:")}</b> {lib.timing}</div>
            {LIB_SIDES[lib.id]?.length ? <div style={{ marginTop: 6 }}><b>{t("Mögliche Nebenwirkungen:")}</b> {LIB_SIDES[lib.id].map(id => `${SIDE_BY_ID[id]?.emoji} ${SIDE_BY_ID[id]?.label}`).join(" · ")}</div> : null}
            {lib.caution && <div style={{ marginTop: 6, color: "var(--warning)" }}>⚠️ {lib.caution}</div>}
          </div>
        </Card>
      )}
      {r?.delta && r.avg && r.base && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <Label style={{ marginBottom: 6 }}>{t("Nutzen ↔ Nebenwirkungen")}</Label>
            <ProCon s={s} suppId={w.suppId!} />
          </Card>
          <Card style={{ marginBottom: 12 }}>
            <Label style={{ marginBottom: 10 }}>{t("Vergleich mit deinem Reset · {n} Check-ins", { n: r.n })}</Label>
            <DeltaBars delta={r.delta} avg={r.avg} base={r.base} dims={r.dims} />
          </Card>
          <HealthCompareCard s={s} base={phaseWindows(s).find(x => x.kind === "baseline")} test={w} />
        </>
      )}
      {state === "active" && !w.open && (
        <Card style={{ marginBottom: 12 }}>
          <Label style={{ marginBottom: 10 }}>{t("Anpassen")}</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn variant="soft" onClick={() => setDays(w.days + 1)} style={{ fontSize: "0.85rem" }}>{t("+1 Tag verlängern")}</Btn>
            {w.kind !== "test" && elapsed >= 1 && <Btn variant="soft" onClick={() => { update(p => closeActive(p, today, false)); onClose() }} style={{ fontSize: "0.85rem" }}>{t("⏭ Jetzt beenden")}</Btn>}
          </div>
        </Card>
      )}
      {w.kind === "test" && w.suppId && state !== "future" && (
        <Btn full onClick={() => onVerdict(w.suppId!)}>{s.verdicts[w.suppId] ? t("Urteil ändern") : t("⚖️ Ergebnis & Urteil")}</Btn>
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
        <div style={{ fontWeight: 900, fontSize: "1.2rem", marginTop: 10 }}>{t("Noch keine Daten")}</div>
        <div style={{ color: "var(--text-dim)", marginTop: 6 }}>{t("Nach deinem ersten Check-in erscheinen hier deine Kurven.")}</div>
      </Card>
    )
  }

  const tiles: [string, number | null, string][] = [
    [t("Ø Reset"), mean(baseAvg), t("dein Normal")],
    [t("Ø letzte 7 Tage"), mean(last7), last7.length ? pl(last7.length, t("1 Check-in"), t("{n} Check-ins", { n: last7.length })) : "—"],
    [t("Check-ins"), nCheck, t("🔥 {n} am Stück", { n: streak(s) })],
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{t("Deine Daten")}</div>
        <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{t("Automatisch ausgewertet · jede Farbe ist ein Test")}</div>
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
          {([{ id: "gesamt", emoji: "✨", label: t("Gesamt") }, ...activeDims(s)] as { id: Dim | "gesamt"; emoji: string; label: string }[]).map(d => (
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
          <Label style={{ marginBottom: 12 }}>{t("🏅 Bestenliste · Wirkung vs. Reset")}</Label>
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
                      {sig.emoji} {sig.text}{sig.focus && (r!.delta![sig.focus] ?? 0) > 0.2 ? t(" · stärkster Effekt: {dim} {v}", { dim: DIMS.find(d => d.id === sig.focus)?.label ?? "", v: fmt(r!.delta![sig.focus]!, true) }) : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {r!.overall.test != null && <div style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{fmt(r!.overall.test)}<span style={{ color: "#f5b400" }}>★</span></div>}
                    <div style={{ fontSize: "0.68rem", fontWeight: 800, color: sig.net >= 0 ? "#1baf7a" : "#e34948" }}>
                      {fmt(sig.net, true)}{r!.sides.list.length ? ` · ⚠️${r!.sides.list.length}` : ""} · {verdict ? DECISIONS.find(d => d.id === verdict.decision)?.label : t("offen")}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 12 }}>{t("★ = Tagesdurchschnitt im Test · +/− = Netto-Wirkung (Nutzen minus Nebenwirkungen) · ⚠️ = Nebenwirkungen. Tippen für Details.")}</div>
        </Card>
      )}

      <Card>
        <Label style={{ marginBottom: 12 }}>{t("Stimmungs-Kalender · tippen zum Bearbeiten")}</Label>
        <MoodCalendar s={s} onPick={onCheckin} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, fontSize: "0.72rem", color: "var(--text-dim)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 4, borderRadius: 2, background: "var(--text-dim)" }} />{t("Reset")}</span>
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
                {r.overall.base != null && r.overall.test != null ? `${fmt(r.overall.base)}★ → ${fmt(r.overall.test)}★ · ` : ""}{pl(r.n, t("1 Check-in"), t("{n} Check-ins", { n: r.n }))}
              </span>
            </div>
            <ProCon s={s} suppId={w.suppId!} />
            <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />
            <DeltaBars delta={r.delta} avg={r.avg} base={r.base} dims={r.dims} />
            {r.tags.length > 0 && (
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-dim)", marginTop: 12 }}>{t("STÖRFAKTOREN")}</div>
            )}
            {r.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {r.tags.slice(0, 5).map(([tag, n]) => <span key={tag} style={{ fontSize: "0.72rem", padding: "3px 9px", borderRadius: 999, background: "var(--surface-2)", fontWeight: 700 }}>{t(tag)} ×{n}</span>)}
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
  const [note, setNote] = useState(() => { const n = s.verdicts[suppId]?.note; return n ? t(n) : "" }) // gespeicherte Auto-Notizen sind deutsch → nur anzeigen übersetzt
  const supp = s.supps.find(x => x.id === suppId)
  const r = testResult(s, suppId)
  const lib = libOf(supp)
  const testWin = [...phaseWindows(s)].reverse().find(p => p.kind === "test" && p.suppId === suppId)
  const baseWin = phaseWindows(s).find(p => p.kind === "baseline")
  return (
    <Sheet open onClose={onClose} title={t("⚖️ Dein Urteil")}>
      <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 16px" }}><Capsule supp={supp} /></div>
      {r?.delta && r.avg && r.base ? (
        <>
          <Card style={{ marginBottom: 12, textAlign: "center", background: "var(--surface-2)", border: "none", boxShadow: "none" }}>
            <div style={{ fontSize: "2rem" }}>{sig.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>{t("Die Daten sagen:")} {sig.text}</div>
            {r.overall.base != null && r.overall.test != null && (
              <div style={{ fontSize: "0.9rem", marginTop: 4, fontWeight: 800 }}>{t("{a}★ im Reset → {b}★ im Test", { a: fmt(r.overall.base), b: fmt(r.overall.test) })}</div>
            )}
            {sig.focus && (r.delta[sig.focus] ?? 0) > 0.2 && (
              <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginTop: 4 }}>
                {t("Am meisten verändert:")} {DIMS.find(d => d.id === sig.focus)?.emoji} {DIMS.find(d => d.id === sig.focus)?.label} {fmt(r.delta[sig.focus]!, true)}
              </div>
            )}
          </Card>
          <Card style={{ marginBottom: 12 }}>
            <Label style={{ marginBottom: 6 }}>{t("Nutzen ↔ Nebenwirkungen")}</Label>
            <ProCon s={s} suppId={suppId} />
          </Card>
          <Card style={{ marginBottom: 12 }}>
            <Label style={{ marginBottom: 10 }}>{t("Test vs. Reset · {n} Check-ins", { n: r.n })}</Label>
            <DeltaBars delta={r.delta} avg={r.avg} base={r.base} dims={r.dims} />
          </Card>
          {testWin && <HealthCompareCard s={s} base={baseWin} test={testWin} />}
        </>
      ) : (
        <Card style={{ marginBottom: 12, background: "var(--surface-2)", border: "none", boxShadow: "none", fontSize: "0.88rem", lineHeight: 1.5 }}>
          {lib?.onset === "langsam"
            ? t("🐢 {name} wirkt eher über Wochen. Entscheide nach Bauchgefühl, Blutwerten oder ärztlichem Rat.", { name: String(supp?.name) })
            : t("Keine Testdaten für dieses Supplement. Du kannst trotzdem nach Bauchgefühl entscheiden.")}
        </Card>
      )}
      <div style={{ fontWeight: 800, margin: "16px 0 10px" }}>{sig.suggestion ? t("Vorschlag ist markiert — 1 Tipp zum Bestätigen oder ändern:") : t("Was sagt dein Bauchgefühl?")}</div>
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
              {sig.suggestion === d.id && <span style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: "0.6rem", background: "var(--accent)", color: "#fff", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>{t("Vorschlag")}</span>}
              <div style={{ fontSize: "1.7rem", marginBottom: 4 }}>{d.emoji}</div>{d.label}
            </button>
          )
        })}
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder={t("Warum? (optional)")}
        style={{ width: "100%", padding: 12, borderRadius: 14, fontSize: "0.92rem", marginTop: 12, resize: "none" }} />
      <div style={{ marginTop: 14 }}><Btn full disabled={!decision} onClick={() => decision && onSave(suppId, decision, note.trim())}>{t("Urteil speichern")}</Btn></div>
      {r?.overall.base != null && r.overall.test != null && supp && (
        <div style={{ marginTop: 10 }}><ShareButton make={() => makeResultCard(s, suppId)} name={t("mein-{lib}-ergebnis.png", { lib: supp.lib ?? "test" })} text={t("Mein {name}-Selbstversuch 🧪", { name: supp.name })} label={t("📤 Ergebnis als Bild teilen")} style={{ width: "100%" }} /></div>
      )}
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
    const lines = [canSwitchLang() ? t("Mein Supplement-Stack (Kolbi)") : t("Mein Supplement-Stack (TRUE Supplement Lab)"), ""]
    SLOTS.forEach(slot => {
      const items = plan.placements.filter(p => p.slot === slot.id)
      if (!items.length) return
      lines.push(`${slotTime(slot.id, s.settings)} · ${slot.label}`)
      items.forEach(p => { const x = s.supps.find(q => q.id === p.suppId)!; lines.push(`  • ${x.name}${x.dose ? ` (${x.dose})` : ""}`) })
    })
    if (plan.weekly.length) lines.push("", t("Wöchentlich: {list}", { list: plan.weekly.map(id => s.supps.find(x => x.id === id)?.name).join(", ") }))
    if (drop.length) lines.push("", t("Rausgeflogen: {list}", { list: drop.map(x => x.name).join(", ") }))
    try {
      if (navigator.share) await navigator.share({ title: t("Mein Supplement-Stack"), text: lines.join("\n") })
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
        <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{t("Dein Stack 🏆")}</div>
        <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{t("Automatisch gebaut aus deinen Urteilen — mit perfektem Timing.")}</div>
      </div>

      {keep.length > 0 && !phaseWindows(s).some(w => w.kind === "stack") && (
        <Card style={{ display: "flex", alignItems: "center", gap: 12, border: "2px solid #eda100" }}>
          <Mascot mood="party" size={48} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>{t("Bereit für deinen Stack?")}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{t("Alle behaltenen zusammen nehmen. Ich passe auf, ob die Wirkung anhält.")}</div>
          </div>
          <Btn onClick={onStartStack} style={{ padding: "10px 12px", fontSize: "0.82rem", whiteSpace: "nowrap" }}>{t("Starten")}</Btn>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[["💚", keep.length + constant.length, t("im Stack")], ["🤔", maybe.length, t("vielleicht")], ["✂️", drop.length, t("rausgeflogen")]].map(([e, n, l]) => (
          <Card key={l as string} style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: "1.3rem" }}>{e}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, lineHeight: 1.1 }}>{n}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 700 }}>{l}</div>
          </Card>
        ))}
      </div>

      <Card>
        {group(t("Behalten"), keep, "💚")}
        {group(t("Durchgehend"), constant, "📌")}
        {group(t("Vielleicht"), maybe, "🤔")}
        {group(t("Fliegt raus"), drop, "✂️")}
        {group(t("Noch offen · tippen zum Bewerten"), open, "⏳")}
        {drop.length > 0 && <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{drop.length > 1 ? t("💸 {n} Supplements weniger: weniger Geld, weniger Pillen, mehr Klarheit.", { n: drop.length }) : t("💸 {n} Supplement weniger: weniger Geld, weniger Pillen, mehr Klarheit.", { n: drop.length })}</div>}
      </Card>

      <Card style={{ padding: "18px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>{t("☀️ Dein perfekter Tag")}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{t("Tippe ein Supplement an, um es zu verschieben")}</div>
          </div>
          {maybe.length > 0 && (
            <button className="lab-press" onClick={() => setWithMaybe(v => !v)} style={{
              padding: "7px 11px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap",
              border: withMaybe ? "2px solid #eda100" : "1px solid var(--border)", background: withMaybe ? "rgba(237,161,0,.14)" : "var(--surface)", color: "var(--text)",
            }}>🤔 {withMaybe ? t("inkl. Vielleicht") : t("+ Vielleicht")}</button>
          )}
        </div>

        {inStack.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-dim)" }}>
            <div style={{ fontSize: "2.4rem" }}>🫙</div>
            <div style={{ fontWeight: 800, color: "var(--text)", marginTop: 6 }}>{t("Noch leer")}</div>
            <div style={{ fontSize: "0.85rem", marginTop: 4 }}>{t("Sobald du ein Supplement mit 💚 bewertest, landet es hier — direkt im richtigen Zeitfenster.")}</div>
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
                            <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{x.name}{isMaybe && <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{t(" · vielleicht")}</span>}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                              {x.dose || lib?.dose}{lib?.withFat ? t(" · mit fetthaltigem Essen") : ""}{lib?.route && lib.route !== "oral" ? ` · ${ROUTE_INFO[lib.route].emoji} ${ROUTE_INFO[lib.route].label}` : ""}
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
            <Label style={{ marginBottom: 8 }}>{t("📅 1× pro Woche")}</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{plan.weekly.map(id => <Capsule key={id} supp={s.supps.find(x => x.id === id)} size="sm" />)}</div>
          </div>
        )}
        {Object.keys(s.slotOverrides).length > 0 && inStack.length > 0 && (
          <button onClick={() => update(p => { p.slotOverrides = {}; return p })} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.78rem", cursor: "pointer", marginTop: 8 }}>{t("↺ Automatisch planen")}</button>
        )}
      </Card>

      {plan.issues.map((iss, k) => (
        <Card key={`i${k}`} style={{ background: "var(--warning-dim)", border: "none", boxShadow: "none", display: "flex", gap: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>⚠️</span>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.45 }}>
            <b>{s.supps.find(x => x.id === iss.a)?.name} + {s.supps.find(x => x.id === iss.b)?.name}:</b> {iss.text} {t("Verschieb eins davon in ein anderes Zeitfenster.")}
          </div>
        </Card>
      ))}
      {plan.combos.map((c, k) => (
        <Card key={`c${k}`} style={{ background: "var(--accent-dim)", border: "none", boxShadow: "none", display: "flex", gap: 10 }}>
          <span style={{ fontSize: "1.2rem" }}>🤝</span>
          <div style={{ fontSize: "0.85rem", lineHeight: 1.45 }}><b>{t("Combo:")}</b> {c.text}</div>
        </Card>
      ))}

      {inStack.length > 0 && <Btn full variant="soft" onClick={copy}>{copied ? t("✓ Geteilt!") : t("📤 Plan teilen / kopieren")}</Btn>}

      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.5, padding: "0 4px" }}>
        {t("⚕️ Das Lab ersetzt keine ärztliche Beratung. Selbstbeobachtung ist subjektiv; Placebo, Wetter, Stress und Schlaf spielen mit. Mangel-Themen (Vitamin D, B12, Eisen) lieber per Blutbild klären.")}{STORE_MODE ? t(" Die App empfiehlt keine Substanzen oder Dosierungen.") : t(" Peptide nur mit ärztlicher Begleitung.")}
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
      <Label style={{ marginBottom: 10 }}>{t("Dein Tagesrhythmus")}</Label>
      {([["wake", t("🌅 Aufstehen")], ["bed", t("🛌 Schlafen")]] as const).map(([k, l]) => (
        <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{l}</span>
          <input type="time" value={settings[k]} onChange={e => onChange({ ...settings, [k]: e.target.value })} style={{ padding: "6px 10px", borderRadius: 10, fontWeight: 700 }} />
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t("🏋️ Training")}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {settings.training && <input type="time" value={settings.training} onChange={e => onChange({ ...settings, training: e.target.value })} style={{ padding: "6px 10px", borderRadius: 10, fontWeight: 700 }} />}
          <button className="lab-press" onClick={() => onChange({ ...settings, training: settings.training ? null : "18:00" })} style={{
            padding: "6px 10px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontWeight: 700, fontSize: "0.8rem",
          }}>{settings.training ? t("Aus") : t("Hinzufügen")}</button>
        </div>
      </div>
    </Card>
  )
}

/** Kalender-Abo: einmal abonnieren, aktualisiert sich selbst (nur große Termine). */
function CalendarCard({ s }: { s: LabState }) {
  const [on, setOn] = useState(calendarOn)
  const [names, setNames] = useState(calendarNames)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const urls = calendarUrls()
  const subscribe = async () => {
    setBusy(true)
    const ok = await enableCalendar(s)
    setBusy(false)
    if (!ok) { alert(t("Das hat gerade nicht geklappt – bitte mit Internet nochmal versuchen.")); return }
    setOn(true)
    window.location.href = urls.webcal
  }
  const copy = async () => {
    if (!on) { const ok = await enableCalendar(s); if (ok) setOn(true) }
    try { await navigator.clipboard.writeText(urls.https); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { prompt(t("Link kopieren:"), urls.https) }
  }
  const preview = [["🏁", t("Letzter Testtag")], ["🎁", t("Ergebnis ist da")], ["🔬", t("Nächster Test")], ["🛒", t("Nachkaufen")], ["📊", t("Wochenrückblick")]]
  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Label>{t("📅 Kalender-Abo")}</Label>
        {on && <span style={{ fontSize: "0.7rem", fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: "var(--accent-dim)", color: "var(--accent)" }}>{t("✓ aktiv")}</span>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {preview.map(([e, l]) => <span key={l} style={{ fontSize: "0.74rem", fontWeight: 800, padding: "5px 9px", borderRadius: 999, background: "var(--surface-2)" }}>{e} {l}</span>)}
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.45, marginBottom: 12 }}>
        {t("Nur die großen Termine – der Alltag kommt per Push. Einmal abonnieren, danach")} <b>{t("aktualisiert sich der Kalender selbst")}</b>{t(", wenn du einen Test startest oder etwas änderst.")}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn onClick={subscribe} disabled={busy} style={{ flex: 1, padding: "11px 12px", fontSize: "0.86rem" }}>{busy ? "…" : on ? t("📅 Nochmal abonnieren") : t("📅 Kalender abonnieren")}</Btn>
        <Btn variant="soft" onClick={copy} style={{ padding: "11px 12px", fontSize: "0.86rem" }}>{copied ? t("✓ Kopiert") : t("🔗 Link")}</Btn>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}>
        <input type="checkbox" checked={names} onChange={e => { setNames(e.target.checked); setCalendarNames(e.target.checked); syncCalendar(s) }} style={{ width: 18, height: 18, accentColor: "var(--accent)" }} />
        <span>{t("Supplement-Namen im Kalender zeigen")} <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>{t("(sonst neutral)")}</span></span>
      </label>
      {on && <button onClick={async () => { await disableCalendar(); setOn(false) }} style={{ marginTop: 10, background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer", padding: 0 }}>{t("Abo beenden (Link wird ungültig)")}</button>}
      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 8, lineHeight: 1.4 }}>{t("Tipp: Hast du früher die Kalender-Datei geladen, kannst du diese alten Einträge löschen – sonst kommt manches doppelt.")}</div>
    </Card>
  )
}

function SettingsSheet({ s, onClose, update, onReset, onDemo, onImport, onEnableReminders, onToggleHealth, pushSt }: {
  s: LabState; onClose: () => void; update: Update; onReset: () => void; onDemo: () => void
  onImport: (s: LabState) => void; onEnableReminders: (withCalendar: boolean) => void; onToggleHealth: () => void; pushSt: PushState
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
    setMsg(t("✓ Backup gespeichert"))
  }
  const importData = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text())
      if (!parsed || typeof parsed !== "object" || !("supps" in parsed)) throw new Error()
      onImport(hydrate(parsed))
    } catch { setMsg(t("⚠️ Datei konnte nicht gelesen werden")) }
  }
  const testNotif = () => {
    navigator.serviceWorker?.ready.then(reg => reg.showNotification(t("🧪 So sieht deine Erinnerung aus"), {
      body: t("1 Tipp auf die Benachrichtigung öffnet deine Tagesrunde."), icon: "./icon-192.png", tag: "true-lab-test", data: { url: `${LAB_BASE}?round=1` },
    })).catch(() => setMsg(t("⚠️ Benachrichtigungen werden hier nicht unterstützt")))
  }

  return (
    <Sheet open onClose={onClose} title={t("⚙️ Einstellungen")}>
      {/* Erinnerungen */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Label>{t("🔔 Erinnerungen")}</Label>
          <button className="lab-press" aria-label={t("Erinnerungen an/aus")} onClick={() => s.reminders.enabled ? update(p => { p.reminders.enabled = false; return p }) : onEnableReminders(false)} style={{
            width: 48, height: 28, borderRadius: 999, border: "none", position: "relative", background: s.reminders.enabled ? "var(--accent)" : "var(--surface-2)",
          }}>
            <span style={{ position: "absolute", top: 3, left: s.reminders.enabled ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "left .2s" }} />
          </button>
        </div>
        {s.reminders.enabled && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t("📝 Check-in um")}</span>
              <input type="time" value={s.reminders.checkin} onChange={e => { const v = e.target.value; update(p => { p.reminders.checkin = v; return p }) }} style={{ padding: "6px 10px", borderRadius: 10, fontWeight: 700 }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, fontWeight: 700, fontSize: "0.9rem" }}>
              {t("💊 Einnahme-Erinnerungen")}
              <input type="checkbox" checked={s.reminders.intake} onChange={e => { const v = e.target.checked; update(p => { p.reminders.intake = v; return p }) }} style={{ width: 20, height: 20, accentColor: "var(--accent)" }} />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {pushSt === "off" && <Btn onClick={() => onEnableReminders(false)} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>{t("🔔 Push-Nachrichten an")}</Btn>}
              {!hasNativeReminders() && pushSt !== "on" && <Btn variant="soft" onClick={() => downloadIcs(s)} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>{t("📅 In Kalender eintragen")}</Btn>}
              {perm === "granted" ? <Btn variant="ghost" onClick={testNotif} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>{t("Test senden")}</Btn>
                : perm === "default" && pushSt !== "off" ? <Btn variant="ghost" onClick={() => onEnableReminders(false)} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>{t("Benachrichtigungen erlauben")}</Btn> : null}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 8, lineHeight: 1.45 }}>
              {hasNativeReminders() || pushSt === "on"
                ? t("✓ Push ist an: Erinnerungen kommen auch bei geschlossener App – pro Tageszeit gebündelt, abends deine Runde, fertige Ergebnisse. Namen deiner Supplements bleiben auf dem Handy.")
                : pushSt === "needs-install" ? t("Für Push-Nachrichten auf dem iPhone: App über „Teilen → Zum Home-Bildschirm“ hinzufügen und von dort öffnen.")
                : <>{t("Der Kalender erinnert dich zuverlässig, auch wenn die App zu ist.")}{perm === "denied" ? t(" Benachrichtigungen sind blockiert — in den Handy-Einstellungen unter Mitteilungen erlauben oder den Kalender nutzen.") : ""}</>}
            </div>
          </>
        )}
      </Card>

      <ProGate s={s} feature="calendar" gap={12}><CalendarCard s={s} /></ProGate>

      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Label>🌍 Community</Label>
          <button className="lab-press" aria-label={t("Community an/aus")} onClick={() => update(p => { p.community = !p.community; return p })} style={{
            width: 52, height: 30, borderRadius: 999, border: "none", position: "relative", background: s.community ? "var(--accent)" : "var(--surface-2)", transition: "background .25s",
          }}><span style={{ position: "absolute", top: 3, left: s.community ? 25 : 3, width: 24, height: 24, borderRadius: 999, background: "#fff", transition: "left .3s cubic-bezier(.34,1.56,.64,1)", boxShadow: "0 1px 4px rgba(0,0,0,.25)" }} /></button>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.45 }}>{t("Testergebnisse anonym teilen (Supplement, Dauer, ±★, Urteil, Nebenwirkungen – keine Namen, kein Konto). Dafür siehst du bei jedem Supplement, was andere erlebt haben.")}</div>
        <button onClick={async () => { await removeMyResults(); update(p => { p.community = false; return p }); alert(t("Deine geteilten Ergebnisse wurden gelöscht.")) }} style={{ marginTop: 8, background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer", padding: 0 }}>{t("Meine geteilten Ergebnisse löschen")}</button>
      </Card>

      {canSwitchLang() && (
        <Card style={{ marginBottom: 12 }}>
          <Label>{t("📄 Rechtliches")}</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 8, fontSize: "0.84rem", fontWeight: 800 }}>
            {(isEn ? [["Privacy Policy", "/en/privacy"], ["Terms of Use", "/en/terms"], ["Legal notice", "/en/imprint"]] : [["Datenschutz", "/datenschutz"], ["Nutzungsbedingungen", "/nutzungsbedingungen"], ["Impressum", "/impressum"]])
              .map(([l, href]) => <a key={href} href={`${SITE_URL}${href}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{l}</a>)}
          </div>
        </Card>
      )}
      {canSwitchLang() && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Label>{t("📊 Anonyme Statistik")}</Label>
            <button className="lab-press" aria-label={t("Statistik an/aus")} onClick={() => update(p => { p.statsOff = !p.statsOff; return p })} style={{
              width: 52, height: 30, borderRadius: 999, border: "none", position: "relative", background: !s.statsOff ? "var(--accent)" : "var(--surface-2)", transition: "background .25s",
            }}><span style={{ position: "absolute", top: 3, left: !s.statsOff ? 25 : 3, width: 24, height: 24, borderRadius: 999, background: "#fff", transition: "left .3s cubic-bezier(.34,1.56,.64,1)", boxShadow: "0 1px 4px rgba(0,0,0,.25)" }} /></button>
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.45 }}>{t("Hilft Kolbi besser zu werden: zählt nur, dass etwas passiert (z. B. „erster Check-in“) – ohne Geräte-ID, ohne Inhalte, ohne Gesundheitswerte.")}</div>
        </Card>
      )}

      {/* Apple Health / Health Connect — nur in der Store-App verfügbar */}
      {hasHealthProvider() && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Label>🍎 Apple Health / Health Connect</Label>
            <button className="lab-press" aria-label={t("Health an/aus")} onClick={onToggleHealth} style={{
              width: 48, height: 28, borderRadius: 999, border: "none", position: "relative", background: s.healthEnabled ? "var(--accent)" : "var(--surface-2)",
            }}>
              <span style={{ position: "absolute", top: 3, left: s.healthEnabled ? 23 : 3, width: 22, height: 22, borderRadius: 999, background: "#fff", transition: "left .2s" }} />
            </button>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.45 }}>
            {t("Liest nur")} <b>{t("Schlafdauer")}</b> {t("und")} <b>HRV</b> {t("— sonst nichts, kein Training, keine Schritte. Ergänzt deine gefühlte Bewertung um einen objektiven Wert. Bleibt komplett auf deinem Gerät, nie eine Voraussetzung.")}
          </div>
        </Card>
      )}

      {/* Ziele */}
      <Card style={{ marginBottom: 12 }}>
        <Label style={{ marginBottom: 8 }}>{t("🎯 Deine Ziele")}</Label>
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

      {/* Sprache – nur in der eigenständigen App (get-true.de/lab bleibt Deutsch) */}
      {canSwitchLang() && (
        <Card style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Label>{t("🌐 Sprache")}</Label>
            <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 12, padding: 3, gap: 2 }}>
              {([["de", "Deutsch"], ["en", "English"]] as const).map(([id, l]) => (
                <button key={id} className="lab-press" aria-pressed={LANG === id} onClick={() => { if (LANG !== id) setLang(id) }} style={{
                  border: "none", borderRadius: 10, padding: "7px 12px", fontSize: "0.8rem", fontWeight: 800, whiteSpace: "nowrap",
                  background: LANG === id ? "var(--surface)" : "transparent", color: LANG === id ? "var(--text)" : "var(--text-dim)",
                  boxShadow: LANG === id ? "0 1px 4px rgba(0,0,0,.12)" : "none",
                }}>{l}</button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Daten */}
      <Card style={{ marginTop: 12 }}>
        <Label style={{ marginBottom: 8 }}>{t("📦 Daten übertragen")}</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="soft" onClick={exportData} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>{t("📤 Backup teilen")}</Btn>
          <Btn variant="soft" onClick={() => fileRef.current?.click()} style={{ fontSize: "0.82rem", padding: "10px 12px" }}>{t("📥 Backup laden")}</Btn>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = "" }} />
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 8 }}>{t("Daten liegen nur auf diesem Gerät. Mit dem Backup ziehst du sie in Sekunden aufs Handy oder den Laptop um.")}</div>
        {msg && <div style={{ fontSize: "0.8rem", fontWeight: 700, marginTop: 8 }}>{msg}</div>}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {s.demo && <Btn full onClick={onReset}>{t("Demo beenden")}</Btn>}
        {!s.demo && <Btn full variant="ghost" onClick={onDemo}>{t("Demo-Daten ansehen (deine Daten werden gesichert)")}</Btn>}
        {!s.demo && (confirm
          ? <Btn full variant="danger" onClick={onReset}>{t("Wirklich alles löschen?")}</Btn>
          : <Btn full variant="ghost" onClick={() => setConfirm(true)}>{t("Experiment zurücksetzen")}</Btn>)}
      </div>
    </Sheet>
  )
}

