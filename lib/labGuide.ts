// ── „Kolbi führt dich“: der eine nächste Schritt ──────────────────────────────────
// Aus dem Zustand eine feste, geordnete Liste von Einstiegs-/Ausbau-Schritten mit Status. Heute zeigt davon genau
// EINEN (den ersten offenen) mit Fortschritt „3 von 9“. „Später“ (bis morgen) und „Nicht für mich“ (nie wieder)
// werden lokal gemerkt (localStorage „lab-guide“) – nach 3× „Später“ fragt Kolbi nicht mehr (keine Endlosschleife).
// Reine Berechnung + kleiner Speicher, ohne Netz; läuft auch in Next/SSR (alle Zugriffe abgesichert).
// Texte: konkreter Nutzen der Funktion, keine Wirkversprechen (EU 432/2012). Keine Supplement-Namen in Titeln.

import {
  addDays, diffDays, nextCandidates, phaseWindows, isHere, defaultDays, libOf,
  type LabState, type PhaseWindow,
} from "./supplementLab"
import { morningAnswered, morningDue } from "./labDay"
import { defaultPortion } from "./labDose"
import { t } from "./labI18n"

export type GuideStepId = "checkin" | "push" | "scan" | "portion" | "stock" | "price" | "morning" | "test" | "recap" | "group"

/** done = erledigt · open = jetzt machbar · waiting = kommt später von selbst (z. B. morgen früh) · later = „Später“ · never = „Nicht für mich“ */
export type GuideStatus = "done" | "open" | "waiting" | "later" | "never"

export type GuideAction =
  | { kind: "checkin" }
  | { kind: "push" }
  | { kind: "scan" }
  | { kind: "portion"; suppId: string }
  | { kind: "stock"; suppId: string }
  | { kind: "price"; suppId: string }
  | { kind: "morning" }
  | { kind: "test"; suppId: string }
  | { kind: "recap" }
  | { kind: "groups" }

export interface GuideStep {
  id: GuideStepId
  emoji: string
  title: string
  /** EIN Satz: was du davon hast (kein Wirkversprechen) */
  why: string
  /** Text auf dem großen Knopf */
  cta: string
  status: GuideStatus
  action: GuideAction | null
  /** Bei „waiting“: wann es weitergeht (z. B. „morgen früh“, „Reset · Tag 2 von 3“) */
  wait?: string
  /** Einstieg (darf 1×/Tag sanft erinnern) – sonst Ausbau */
  core: boolean
}

export interface GuidePrefs {
  /** „Später“: Schritt → ausgeblendet bis einschließlich Tag davor (YYYY-MM-DD = ab diesem Tag wieder) */
  later?: Partial<Record<GuideStepId, string>>
  /** Wie oft „Später“ gedrückt wurde – ab LATER_MAX gilt „Nicht für mich“ */
  laterN?: Partial<Record<GuideStepId, number>>
  never?: GuideStepId[]
  /** Erledigt-Merker für Dinge, die nicht im LabState stehen (Scan benutzt, Gruppe beigetreten) */
  flags?: Partial<Record<"scan" | "group", string>>
}

export interface GuideCtx {
  /** Benachrichtigungen: an · einschaltbar · nicht möglich/gesperrt (dann kein Schritt) */
  push: "on" | "off" | "na"
  /** Gruppen sinnvoll/verfügbar (nicht in der Demo) */
  social: boolean
  /** Wochenrückblick gerade bereit (app/lab/insights.tsx → recapAvailable) */
  recapReady: boolean
  checkinLocked: boolean
  /** Ab wann der Check-in offen ist (HH:MM, Anzeige) */
  checkinAt?: string
  now: Date
  prefs: GuidePrefs
}

export const LATER_MAX = 3
/** Erinnerungen an offene Einstiegs-Schritte nur in den ersten Tagen nach dem Start */
export const NUDGE_DAYS = 7
/** Diese Schritte dürfen per Benachrichtigung erinnert werden (Check-in/Morgen-Frage haben eigene Erinnerungen) */
const NUDGE_IDS: GuideStepId[] = ["scan", "portion", "stock", "price", "test"]

/** Supplements, die gerade im Haus und im Einsatz sind */
const inStack = (s: LabState) => s.supps.filter(x => isHere(x) && !libOf(x)?.rx)

/**
 * Alle Schritte in fester Reihenfolge (nicht anwendbare fehlen). `today` = Lab-Tag.
 * Reihenfolge: erst das, was sofort Nutzen bringt (Check-in, Erinnerungen, Scan), dann Mengen/Vorrat/Preis,
 * dann was von selbst kommt (Morgen-Frage, Test, Rückblick), zuletzt die Gruppe.
 */
export function guideSteps(s: LabState, today: string, ctx: GuideCtx): GuideStep[] {
  if (!s.startDate) return []
  const wins = phaseWindows(s)
  const first = wins[0]
  const notStarted = !!first && today < first.start
  const prefs = ctx.prefs
  const here = inStack(s)
  const out: GuideStep[] = []
  const add = (x: Omit<GuideStep, "status"> & { done: boolean; waiting?: boolean }) => {
    const { done, waiting, ...rest } = x
    const never = !done && (prefs.never ?? []).includes(x.id)
    const later = !done && !never && !!prefs.later?.[x.id] && prefs.later[x.id]! > today
    out.push({ ...rest, status: done ? "done" : never ? "never" : waiting ? "waiting" : later ? "later" : "open" })
  }

  // 1 · Erster Check-in
  const nCheck = Object.keys(s.checkins).length
  const ciWait = notStarted ? t("ab dem Starttag") : ctx.checkinLocked ? (ctx.checkinAt ? t("heute ab {time}", { time: ctx.checkinAt }) : t("heute Abend")) : undefined
  add({ id: "checkin", emoji: "⭐", core: true, done: nCheck > 0, waiting: !!ciWait, wait: ciWait,
    title: t("Ersten Check-in machen"), why: t("1 Minute: ab da vergleicht Kolbi jeden Tag mit deinem Normal."), cta: t("Check-in starten"), action: { kind: "checkin" } })

  // 2 · Erinnerungen (nur wo möglich; gesperrt → kein Schritt, sonst Endlosschleife)
  if (ctx.push !== "na" && !s.demo)
    add({ id: "push", emoji: "🔔", core: true, done: ctx.push === "on" && s.reminders.enabled,
      title: t("Erinnerungen einschalten"), why: t("Kolbi meldet sich zur richtigen Zeit – auch wenn die App zu ist."), cta: t("Einschalten"), action: { kind: "push" } })

  // 3 · Packung scannen (Produkt erkennen → eintragen samt Menge)
  add({ id: "scan", emoji: "📷", core: true, done: !!prefs.flags?.scan,
    title: s.supps.length ? t("Packung scannen") : t("Deine Supplements eintragen"),
    why: t("Strichcode in die Kamera – Kolbi erkennt das Produkt und trägt es für dich ein."), cta: t("Kamera öffnen"), action: { kind: "scan" } })

  // 4 · Menge pro Einnahme
  const noPortion = here.find(x => !defaultPortion(x))
  if (here.length)
    add({ id: "portion", emoji: "🥄", core: true, done: !noPortion,
      title: t("Menge pro Einnahme festlegen"), why: t("Dann hakst du mit einem Tipp ab – und Vorrat und Kosten stimmen."), cta: t("Menge wählen"),
      action: noPortion ? { kind: "portion", suppId: noPortion.id } : null })

  // 5 · Vorrat · 6 · Preis
  const noStock = here.find(x => !x.stock)
  if (here.length)
    add({ id: "stock", emoji: "📦", core: true, done: here.some(x => x.stock),
      title: t("Vorrat eintragen"), why: t("Kolbi sagt dir rechtzeitig, bevor eine Packung leer ist."), cta: t("Vorrat eintragen"),
      action: noStock ? { kind: "stock", suppId: noStock.id } : null })
  const noPrice = here.find(x => x.stock && !x.stock.price) ?? here.find(x => !x.stock?.price)
  if (here.length)
    add({ id: "price", emoji: "💶", core: true, done: s.supps.some(x => (x.stock?.price ?? 0) > 0),
      title: t("Preis eintragen"), why: t("Du siehst, was dein Stack im Monat kostet – und was Aussortieren spart."), cta: t("Preis eintragen"),
      action: noPrice ? { kind: noPrice.stock ? "price" : "stock", suppId: noPrice.id } as GuideAction : null })

  // 7 · Morgen-Frage (kommt morgens von selbst)
  const morningDone = Object.keys(s.morning ?? {}).some(d => morningAnswered(s, d))
  const mDue = !notStarted && morningDue(s, today, ctx.now)
  add({ id: "morning", emoji: "🌙", core: false, done: morningDone, waiting: !mDue, wait: t("morgen früh"),
    title: t("Morgen-Frage beantworten"), why: t("1 Tipp nach dem Aufstehen – so siehst du später, wie deine Nächte waren."), cta: t("Jetzt beantworten"), action: { kind: "morning" } })

  // 8 · Erster Test (nach dem Reset)
  const tested = wins.some(w => w.kind === "test")
  const cand = nextCandidates(s)[0]
  const base = wins.find(w => w.kind === "baseline")
  if (tested || cand) {
    const inReset = !!base && today <= base.end && !base.open
    const day = base ? Math.max(1, diffDays(base.start, today) + 1) : 1
    add({ id: "test", emoji: "🔬", core: true, done: tested, waiting: inReset || notStarted,
      wait: base ? t("Reset · Tag {n} von {total}", { n: Math.min(day, base.days), total: base.days }) : undefined,
      title: t("Ersten Test starten"), why: t("Ein Supplement allein – nach ein paar Tagen siehst du, ob sich bei dir etwas verändert."), cta: t("Test einrichten"),
      action: cand ? { kind: "test", suppId: cand.id } : null })
  }

  // 9 · Wochenrückblick
  add({ id: "recap", emoji: "📊", core: false, done: !!s.recapSeen, waiting: !ctx.recapReady, wait: t("ab Sonntag, nach 3 Check-ins"),
    title: t("Wochenrückblick ansehen"), why: t("Deine Woche in 30 Sekunden – Check-ins, Schlaf und Einnahmen auf einen Blick."), cta: t("Ansehen"), action: { kind: "recap" } })

  // 10 · Gruppe (nur wenn verfügbar)
  if (ctx.social && !s.demo)
    add({ id: "group", emoji: "👥", core: false, done: !!prefs.flags?.group,
      title: t("Einer Gruppe beitreten"), why: t("Sieh anonym, was andere mit denselben Supplements erleben."), cta: t("Gruppen ansehen"), action: { kind: "groups" } })

  // Kein Ziel mehr (z. B. alles Nötige da) → Schritt gilt nicht als offen
  return out.map(x => x.status === "open" && !x.action ? { ...x, status: "done" } : x)
}

/** Fortschritt „3 von 9“ – „Nicht für mich“ zählt nicht mit. */
export function guideProgress(steps: GuideStep[]): { done: number; total: number } {
  const rel = steps.filter(x => x.status !== "never")
  return { done: rel.filter(x => x.status === "done").length, total: rel.length }
}

/** Der eine nächste Schritt: erster offener; `skip` = gerade groß oben auf Heute (z. B. Check-in) → überspringen. */
export function nextGuideStep(steps: GuideStep[], skip: GuideStepId[] = []): GuideStep | null {
  return steps.find(x => x.status === "open" && !skip.includes(x.id)) ?? null
}

/** Als Nächstes, wenn gerade nichts machbar ist (wartet auf morgen/Reset) – für die schlanke Zeile. */
export function waitingGuideStep(steps: GuideStep[]): GuideStep | null {
  return steps.find(x => x.status === "waiting") ?? null
}

// ── „So geht es weiter“: Zeitleiste aus echten Plan-Daten ─────────────────────────

export interface GuideMilestone {
  key: string
  date: string
  /** Tag seit dem Start (1 = Starttag) */
  day: number
  emoji: string
  title: string
  sub?: string
  state: "done" | "now" | "future"
  /** Schätzung (z. B. Test noch nicht gestartet) */
  est?: boolean
}

export function guideTimeline(s: LabState, today: string): GuideMilestone[] {
  if (!s.startDate) return []
  const wins = phaseWindows(s)
  if (!wins.length) return []
  const start = wins[0].start
  const dayOf = (d: string) => diffDays(start, d) + 1
  const name = (id?: string) => s.supps.find(x => x.id === id)?.name ?? "?"
  const st = (d: string): GuideMilestone["state"] => d < today ? "done" : d === today ? "now" : "future"
  const out: GuideMilestone[] = []
  const add = (m: Omit<GuideMilestone, "day" | "state"> & { state?: GuideMilestone["state"] }) => out.push({ day: dayOf(m.date), state: m.state ?? st(m.date), ...m })

  add({ key: "start", date: start, emoji: "🚀", title: t("Start"), sub: t("Reset beginnt – täglich kurz einchecken"), state: st(start) })
  const base = wins.find(w => w.kind === "baseline")
  if (base && !base.open) add({ key: "normal", date: base.end, emoji: "🧘", title: t("Kolbi kennt dein Normal"), sub: t("Ausgangswert aus deinen Check-ins"), state: base.end < today ? "done" : base.end === today ? "now" : "future" })

  const tests = wins.filter((w): w is PhaseWindow & { suppId: string } => w.kind === "test" && !!w.suppId)
  for (const w of tests) {
    add({ key: `t-${w.id}`, date: w.start, emoji: "🔬", title: t("Test startet"), sub: name(w.suppId), state: w.start <= today ? "done" : "future" })
    const res = addDays(w.end, 1)
    add({ key: `r-${w.id}`, date: res, emoji: "🎁", title: t("Ergebnis"), sub: name(w.suppId), state: s.verdicts[w.suppId] ? "done" : res <= today ? "now" : "future" })
  }
  // Noch kein laufender/geplanter Test → nächsten aus dem Vorschlag schätzen
  const last = wins[wins.length - 1]
  const running = wins.some(w => (w.kind === "test" || w.kind === "check") && w.end >= today)
  const next = nextCandidates(s)[0]
  if (!running && next && !wins.some(w => w.kind === "stack")) {
    const afterLast = last.open ? today : addDays(last.end, 1 + (last.kind === "test" ? s.settings.washoutDays : 0))
    const from = afterLast > today ? afterLast : today
    const days = defaultDays(next)
    add({ key: "t-next", date: from, emoji: "🔬", title: t("Test startet"), sub: t("{name} · Vorschlag, {n} Tage", { name: next.name, n: days }), state: "future", est: true })
    add({ key: "r-next", date: addDays(from, days), emoji: "🎁", title: tests.length ? t("Nächstes Ergebnis") : t("Erstes Ergebnis"), sub: next.name, state: "future", est: true })
  }
  out.sort((a, b) => a.date.localeCompare(b.date) || (a.state === "done" ? -1 : 0))

  // „Heute“ einsortieren (falls kein Meilenstein genau heute ist)
  if (!out.some(m => m.date === today) && today >= start) {
    const i = out.findIndex(m => m.date > today)
    const today0: GuideMilestone = { key: "today", date: today, day: dayOf(today), emoji: "📍", title: t("Heute"), sub: t("Du bist hier"), state: "now" }
    if (i < 0) out.push(today0); else out.splice(i, 0, today0)
  }
  // Erledigtes nur kurz: den Start + den letzten erledigten Schritt, dann alles Kommende (max. 7)
  const firstOpen = out.findIndex(m => m.state !== "done")
  const keep = firstOpen < 0 ? out.slice(-3) : [...out.slice(0, firstOpen).filter((m, i, a) => m.key === "start" || i === a.length - 1), ...out.slice(firstOpen)]
  return keep.slice(0, 7)
}

// ── Lokaler Speicher (Später / Nicht für mich / Merker) ───────────────────────────

const KEY = "lab-guide"
const EVENT = "lab-guide"
const TIMELINE_EVENT = "lab-guide-timeline"

export function loadGuide(): GuidePrefs {
  try {
    if (typeof localStorage === "undefined") return {}
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}")
    return v && typeof v === "object" && !Array.isArray(v) ? v as GuidePrefs : {}
  } catch { return {} }
}
function saveGuide(p: GuidePrefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch {}
  try { window.dispatchEvent(new CustomEvent(EVENT)) } catch {}
}

/** „Später“: bis morgen ausblenden. Nach LATER_MAX-mal gilt „Nicht für mich“ (keine Endlosschleife). Gibt die neuen Prefs zurück. */
export function snoozeStep(p: GuidePrefs, id: GuideStepId, today: string): GuidePrefs {
  const n = (p.laterN?.[id] ?? 0) + 1
  if (n >= LATER_MAX) return neverStep({ ...p, laterN: { ...p.laterN, [id]: n } }, id)
  return { ...p, later: { ...p.later, [id]: addDays(today, 1) }, laterN: { ...p.laterN, [id]: n } }
}
export function neverStep(p: GuidePrefs, id: GuideStepId): GuidePrefs {
  return { ...p, never: [...new Set([...(p.never ?? []), id])] }
}
export function laterGuide(id: GuideStepId, today: string) { saveGuide(snoozeStep(loadGuide(), id, today)) }
export function neverGuide(id: GuideStepId) { saveGuide(neverStep(loadGuide(), id)) }
/** Merker setzen (Scan benutzt, Gruppe beigetreten) – nur beim ersten Mal */
export function markGuide(flag: "scan" | "group", today: string) {
  const p = loadGuide()
  if (p.flags?.[flag]) return
  saveGuide({ ...p, flags: { ...p.flags, [flag]: today } })
}
/** „Nicht für mich“ zurücknehmen (Einstellungen / Zeitleiste) */
export function resetGuide() { saveGuide({ flags: loadGuide().flags }) }

export function onGuideChange(fn: () => void): () => void {
  try {
    window.addEventListener(EVENT, fn)
    window.addEventListener("storage", fn)
    return () => { window.removeEventListener(EVENT, fn); window.removeEventListener("storage", fn) }
  } catch { return () => {} }
}

/** „So geht es weiter“ von überall öffnen (LabApp hört zu) */
export function openTimeline() { try { window.dispatchEvent(new CustomEvent(TIMELINE_EVENT)) } catch {} }
export function onOpenTimeline(fn: () => void): () => void {
  try { window.addEventListener(TIMELINE_EVENT, fn); return () => window.removeEventListener(TIMELINE_EVENT, fn) } catch { return () => {} }
}

// ── Sanfte Erinnerung (lib/labReminders.ts) ──────────────────────────────────────

/**
 * Höchstens EINE Erinnerung pro Tag an einen offenen Einstiegs-Schritt – nur in den ersten NUDGE_DAYS Tagen nach dem
 * Start, nie in der Demo, nie für „Nicht für mich“/„Später“ (bis zum Tag danach). Liefert den Schritt für `date` oder null.
 * Benachrichtigungen erlaubt (s.reminders.enabled) prüft notificationPlan selbst.
 */
export function nudgeStep(s: LabState, date: string, prefs: GuidePrefs, now: Date): GuideStep | null {
  if (s.demo || !s.startDate) return null
  const d = diffDays(s.startDate, date)
  if (d < 1 || d > NUDGE_DAYS) return null
  // Status für diesen Tag (Später gilt bis zum gemerkten Datum); Check-in-Sperre spielt hier keine Rolle
  const steps = guideSteps(s, date, { push: "on", social: false, recapReady: false, checkinLocked: false, now, prefs })
  return steps.find(x => x.status === "open" && x.core && NUDGE_IDS.includes(x.id)) ?? null
}
