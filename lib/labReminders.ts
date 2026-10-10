// ── Supplement Lab: Erinnerungen ──────────────────────────────────────────────
// 1) Kalender-Datei (.ics): zuverlässige Erinnerungen auch bei geschlossener App.
// 2) App-Benachrichtigungen: wenn TRUE geöffnet/als PWA aktiv ist, inkl. 1-Klick-Bewertung.

import {
  LIB_BY_ID, SLOTS, phaseWindows, intakeOn, slotFor, slotMinutes, suppMinutes, fromMin, toMin, todayIso, addDays, diffDays, libOf, streak,
  STORAGE_KEY, hydrate, saveState, STORE_MODE, LAB_BASE, isHere, morningMin, doneOn, skippedOn, setSkipped, type LabState, type SlotId,
} from "./supplementLab"
import { morningAnswered } from "./labDay"
import { partnerTips } from "./labKnowledge"
import { LOW_DAYS, buyInfo, inUse, stockInfo } from "./labStock"
import { recordDefaultAmount } from "./labDose"
import { t, clock } from "./labI18n"

const APP_URL = STORE_MODE ? "" : "https://get-true.de/lab"

function icsDate(iso: string, time: string) {
  const m = toMin(time)
  const dayOffset = Math.floor(m / 1440)
  const d = addDays(iso, dayOffset).replace(/-/g, "")
  const hm = fromMin(m).replace(":", "")
  return `${d}T${hm}00`
}
function esc(s: string) { return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n") }
function stamp() { return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "") }

function event(uid: string, start: string, title: string, desc: string, until?: string, freq: "DAILY" | "WEEKLY" = "DAILY") {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}@supplement-lab.get-true.de`,
    `DTSTAMP:${stamp()}`,
    `DTSTART:${start}`,
    "DURATION:PT5M",
    ...(until ? [`RRULE:FREQ=${freq};UNTIL=${until}`] : []),
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(APP_URL ? desc + "\n" + APP_URL : desc)}`,
    ...(APP_URL ? [`URL:${APP_URL}`] : []),
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT",
  ].join("\r\n")
}

/** Kalender mit Check-in, Einnahmen und Urteil-Terminen für das ganze Experiment. */
export function buildIcs(s: LabState): string {
  const wins = phaseWindows(s)
  if (!wins.length) return ""
  const today = todayIso()
  const from = wins[0].start > today ? wins[0].start : today
  // Schritte werden nach und nach gestartet → Erinnerungen für die nächsten 60 Tage
  const horizon = addDays(from, 60)
  const lastEnd = wins.map(w => w.end).sort().pop()!
  const last = { end: lastEnd < horizon ? lastEnd : horizon }
  const checkinUntil = horizon
  const ev: string[] = []

  // Morgen-Frage: Wie hast du geschlafen? (Aufstehzeit + morningDelay)
  ev.push(event("morning", icsDate(from, fromMin(morningMin(s.settings))), t("🌙 Wie hast du geschlafen? (1 Tipp)"),
    t("Einmal tippen – so sehe ich, was bei dir nachts einen Unterschied macht."), icsDate(checkinUntil, "23:59")))

  // Täglicher Check-in
  ev.push(event("checkin", icsDate(from, s.reminders.checkin), t("🧪 Supplement-Check-in (1 Klick)"),
    t("Wie war dein Tag? Einmal tippen, fertig."), icsDate(checkinUntil, "23:59")))

  // Einnahmen pro Test-Phase
  if (s.reminders.intake) {
    for (const w of wins) {
      if (w.kind === "test" && w.suppId && w.end >= from) {
        const supp = s.supps.find(x => x.id === w.suppId)
        if (!supp) continue
        const start = w.start > from ? w.start : from
        if (start > horizon) continue
        const time = fromMin(suppMinutes(supp.id, s))
        const lib = supp.lib ? LIB_BY_ID[supp.lib] : undefined
        ev.push(event(`take-${w.id}`, icsDate(start, time), t("{emoji} {name} nehmen", { emoji: supp.emoji, name: supp.name }),
          `${supp.dose ? supp.dose + " · " : ""}${lib?.timing ?? ""}`, icsDate(w.end, "23:59")))
      }
      if ((w.kind === "baseline" || w.kind === "washout") && w.start >= from) {
        ev.push(event(`phase-${w.id}`, icsDate(w.start, s.settings.wake),
          w.kind === "baseline" ? t("🧘 Reset startet: heute nichts nehmen") : t("💧 Auswaschpause: heute nichts testen"),
          t("Einfach wie gewohnt einchecken.")))
      }
      if (w.kind === "test" && w.suppId && w.end >= from) {
        const supp = s.supps.find(x => x.id === w.suppId)
        ev.push(event(`verdict-${w.id}`, icsDate(addDays(w.end, 1), "10:00"), t("⚖️ Urteil fällig: {name}", { name: supp?.name ?? t("Test") }),
          t("Die App hat schon einen Vorschlag für dich — 1 Klick zum Bestätigen.")))
      }
    }
    // Stack-Phase: alle behaltenen täglich
    const stack = wins.find(w => w.kind === "stack" && w.end >= from)
    if (stack) {
      for (const supp of s.supps.filter(x => s.verdicts[x.id]?.decision === "keep" && x.mode !== "konstant" && isHere(x))) {
        const time = fromMin(suppMinutes(supp.id, s))
        ev.push(event(`stack-${supp.id}`, icsDate(stack.start > from ? stack.start : from, time), t("{emoji} {name} nehmen", { emoji: supp.emoji, name: supp.name }), supp.dose || "", icsDate(last.end, "23:59")))
      }
    }
    // Durchgehende Supplements
    for (const supp of s.supps.filter(x => x.mode === "konstant" && isHere(x))) {
      const lib = supp.lib ? LIB_BY_ID[supp.lib] : undefined
      const time = fromMin(suppMinutes(supp.id, s))
      // wöchentliche am Wochentag des Experiment-Starts
      const first = lib?.weekly ? addDays(wins[0].start, Math.ceil(Math.max(0, diffDays(wins[0].start, from)) / 7) * 7) : from
      ev.push(event(`const-${supp.id}`, icsDate(first, time), lib?.weekly ? t("{emoji} {name} (wöchentlich) nehmen", { emoji: supp.emoji, name: supp.name }) : t("{emoji} {name} nehmen", { emoji: supp.emoji, name: supp.name }),
        supp.dose || "", icsDate(last.end, "23:59"), lib?.weekly ? "WEEKLY" : "DAILY"))
    }
  }

  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TRUE//Supplement Lab//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Supplement Lab",
    ...ev,
    "END:VCALENDAR",
  ].join("\r\n")
}

export function downloadIcs(s: LabState) {
  if (hasNativeReminders()) return // native App: echte Push-Erinnerungen statt Kalender-Datei
  const ics = buildIcs(s)
  if (!ics) return
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "supplement-lab.ics"
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ── Benachrichtigungs-Plan (Push, native App und App-offen-Fallback nutzen denselben) ──
// Max. ~3–4 am Tag: pro Tageszeit gebündelt, abends die Tagesrunde, Serien-Retter,
// „Ergebnis ist da“ und sonntags ein Praxis-Tipp. Jede Nachricht führt direkt in die App.

export type NotifKind = "morning" | "take" | "checkin" | "streak" | "result" | "tip" | "stock"

export interface PlannedNotification {
  id: number
  key: string
  kind: NotifKind
  title: string
  body: string
  at: Date
  url: string
  suppIds?: string[]
  /** Lab-Tag, zu dem die Nachricht gehört (YYYY-MM-DD) – „✓ Genommen“ trägt die Einnahme für diesen Tag ein. */
  date?: string
  /** Neutrale Fassung ohne Supplement-Namen/Gesundheitsdaten — nur die geht an den Push-Server. */
  generic: { title: string; body: string }
}

function atDate(iso: string, minutes: number) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d, 0, minutes)
}
function hashId(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h) % 2_000_000_000
}
function shorten(str: string, n: number) { return str.length > n ? str.slice(0, n - 1).trimEnd() + "…" : str }
function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("")
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`
}

export function notificationPlan(s: LabState, days = 7, now = new Date()): PlannedNotification[] {
  if (!s.reminders.enabled || !s.startDate) return []
  const wins = phaseWindows(s)
  if (!wins.length) return []
  const round = `${LAB_BASE}?round=1`
  const today = todayIso()
  const wake = toMin(s.settings.wake)
  let bed = toMin(s.settings.bed)
  if (bed <= wake) bed += 1440
  const st = streak(s)
  const out: Omit<PlannedNotification, "id">[] = []

  for (let i = 0; i < days; i++) {
    const date = addDays(today, i)
    if (date < wins[0].start) continue

    // Einnahmen, gebündelt pro Tageszeit
    if (s.reminders.intake) {
      const took = date === today ? doneOn(s, date) : skippedOn(s, date) // genommen oder „Heute nicht“ → keine Erinnerung
      // gebündelt nach Uhrzeit (persönliche Zeit oder Kolbis Tageszeit)
      const groups = new Map<number, string[]>()
      for (const id of intakeOn(s, date)) {
        if (took.includes(id)) continue
        const m = suppMinutes(id, s)
        groups.set(m, [...(groups.get(m) ?? []), id])
      }
      for (const [m, ids] of groups) {
        const supps = ids.map(id => s.supps.find(x => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x)
        if (!supps.length) continue
        const slot: SlotId = slotFor(supps[0].id, s)
        const custom = supps.some(x => x.time)
        const info = custom ? { emoji: "⏰", label: clock(fromMin(m)) } : SLOTS.find(x => x.id === slot)!
        const lib = libOf(supps[0])
        out.push({
          key: `take-${date}-${m}`, kind: "take", suppIds: supps.map(x => x.id), url: round, date,
          at: atDate(date, m),
          title: `${info.emoji} ${info.label}: ${joinNames(supps.map(x => x.name))}`,
          body: supps.length === 1 && lib ? shorten(`💡 ${lib.timing}`, 150) : `${supps.map(x => x.emoji).join(" ")} ${t("Tippe „Genommen“ oder öffne deine Runde.")}`,
          generic: { title: t("{emoji} {label}: Zeit für deine Supplements", { emoji: info.emoji, label: info.label }), body: t("Tippe, um abzuhaken.") },
        })
      }
    }

    // Morgens EINE Nachricht (Aufstehzeit + morningDelay, Standard + 45 Min): „Wie hast du geschlafen?“ –
    // fehlt der Check-in von gestern, wird das Nachtragen mit angeboten (früher eigene Nachricht um Aufstehzeit + 45).
    // Einnahmen ±30 Min. davon werden mitgenommen (inkl. „✓ Genommen“). Wird beim nächsten Öffnen neu geplant –
    // wer morgens schon geantwortet hat, bekommt sie heute nicht.
    const prevDay = addDays(date, -1)
    const missedYesterday = prevDay >= wins[0].start && !s.checkins[prevDay]
    if (!(date === today && (morningAnswered(s, date) || s.checkins[date]?.scores.schlaf != null))) {
      const mm = morningMin(s.settings)
      const at = atDate(date, mm)
      // nur zusammenführen, wenn die Sammel-Nachricht noch kommt – sonst gingen die Einnahme-Erinnerungen mit ihr verloren
      const near = +at > +now ? out.filter(n => n.kind === "take" && n.key.startsWith(`take-${date}-`) && Math.abs(+n.at - +at) <= 30 * 60_000) : []
      const ids = near.flatMap(n => n.suppIds ?? [])
      for (const n of near) out.splice(out.indexOf(n), 1)
      const names = ids.map(id => s.supps.find(x => x.id === id)?.name).filter(Boolean) as string[]
      const title = missedYesterday ? t("🌅 Guten Morgen! Wie hast du geschlafen?") : t("🌙 Wie hast du geschlafen?")
      const body = names.length
        ? t("1 Tipp für die Nacht – und jetzt {names}. Tippe „Genommen“ oder öffne deine Runde.", { names: joinNames(names) })
        : missedYesterday ? t("1 Tipp für die Nacht – und gestern fehlt noch der Check-in (10 Sekunden).")
        : t("1 Tipp genügt – so sehe ich, was bei dir nachts einen Unterschied macht.")
      out.push({
        key: `morning-${date}`, kind: "morning", url: `${round}&morning=1`, at, title, body, date, ...(ids.length ? { suppIds: ids } : {}),
        generic: { title, body: names.length ? t("1 Tipp für die Nacht + deine Morgen-Einnahme.") : missedYesterday ? t("1 Tipp für die Nacht – und gestern nachtragen.") : t("1 Tipp genügt.") },
      })
    }

    // Starttag: Start-Check-in war eine Momentaufnahme vom Tag → abends einmal sanft fragen, ob er noch passt
    const startCi = date === today && s.startDate === today ? s.checkins[date] : undefined
    if (startCi?.at && toMin(startCi.at) < toMin(s.reminders.checkin) - 60) {
      const at = atDate(date, toMin(s.reminders.checkin))
      const text = { title: t("🌙 Tag 1 geschafft"), body: t("Passt dein Start-Check-in von heute noch? Kurz anpassen – es zählt ein Wert pro Tag.") }
      out.push({ key: `checkin-${date}`, kind: "checkin", url: round, at, date, ...text, generic: text })
    }
    // Abends: Tagesrunde (+ Serien-Retter heute). Einnahmen ±60 Min. davon werden mitgenommen → weniger Pings.
    if (!(date === today && s.checkins[date])) {
      let m = toMin(s.reminders.checkin)
      if (m < wake) m += 1440
      const at = atDate(date, m)
      const near = +at > +now ? out.filter(n => n.kind === "take" && n.key.startsWith(`take-${date}-`) && Math.abs(+n.at - +at) <= 60 * 60_000) : []
      const ids = near.flatMap(n => n.suppIds ?? [])
      for (const n of near) out.splice(out.indexOf(n), 1)
      const names = ids.map(id => s.supps.find(x => x.id === id)?.name).filter(Boolean) as string[]
      const text = names.length
        ? { title: t("🧪 Deine Abendrunde"), body: t("{names} nehmen + 1 Minute Check-in. So sehe ich, was bei dir wirklich wirkt.", { names: joinNames(names) }) }
        : { title: t("🧪 Kolbi wartet auf dich"), body: t("1 Minute: Wie war dein Tag? So sehe ich, was bei dir wirklich wirkt.") }
      out.push({
        key: `checkin-${date}`, kind: "checkin", url: round, at, date, ...text, ...(ids.length ? { suppIds: ids } : {}),
        generic: names.length ? { title: t("🧪 Deine Abendrunde wartet"), body: t("Einnahme + 1 Minute Check-in.") } : text,
      })
      if (i === 0 && st >= 3) {
        const sm = Math.min(m + 90, bed - 15)
        if (sm > m + 20) out.push({
          key: `streak-${date}`, kind: "streak", url: round, at: atDate(date, sm),
          title: t("🔥 Deine {n}-Tage-Serie reißt heute", { n: st }), body: t("Noch schnell einchecken – dauert keine Minute."),
          generic: { title: t("🔥 Deine Serie wartet"), body: t("Noch schnell einchecken – dauert keine Minute.") },
        })
      }
    }

    // Test fertig → Ergebnis aufdecken
    for (const w of wins) {
      if (w.kind !== "test" || !w.suppId || s.verdicts[w.suppId] || addDays(w.end, 1) !== date) continue
      const supp = s.supps.find(x => x.id === w.suppId)
      out.push({
        key: `result-${w.id}`, kind: "result", url: round, at: atDate(date, wake + 60),
        title: supp ? t("🎁 Dein Ergebnis zu {name} ist da", { name: supp.name }) : t("🎁 Dein Ergebnis zu deinem Test ist da"), body: t("Tippe, um aufzudecken, ob es bei dir wirkt."),
        generic: { title: t("🎁 Ein Test-Ergebnis ist da"), body: t("Tippe, um aufzudecken, ob es bei dir wirkt.") },
      })
    }

    // Sonntagabend: Wochenrückblick als Story
    if (new Date(`${date}T12:00:00`).getDay() === 0 && diffDays(s.startDate, date) >= 3) {
      out.push({
        key: `recap-${date}`, kind: "tip", url: `${LAB_BASE}?recap=1`, at: atDate(date, 18 * 60 + 30),
        title: t("📊 Dein Wochenrückblick ist da"), body: t("Wie war deine Woche? Kolbi hat alles zusammengestellt – 30 Sekunden zum Durchwischen."),
        generic: { title: t("📊 Dein Wochenrückblick ist da"), body: t("30 Sekunden zum Durchwischen.") },
      })
    }

    // Sonntag: ein Praxis-Tipp zu etwas, das du nimmst
    if (new Date(`${date}T12:00:00`).getDay() === 0) {
      const mine = intakeOn(s, date).map(id => s.supps.find(x => x.id === id)).filter(x => libOf(x))
      if (mine.length) {
        const week = Math.floor(Date.parse(`${date}T12:00:00`) / (7 * 86400_000))
        const supp = mine[week % mine.length]!
        const partner = partnerTips(s, supp.id)[0]
        out.push({
          key: `tip-${date}`, kind: "tip", url: LAB_BASE, at: atDate(date, 11 * 60),
          title: t("💡 {emoji} {name}: so holst du mehr raus", { emoji: supp.emoji, name: supp.name }),
          body: shorten(partner ? `${partner.title}. ${partner.text}` : libOf(supp)!.timing, 170),
          generic: { title: t("💡 Kolbis Praxis-Tipp der Woche"), body: t("Ein kurzer Tipp für deinen Alltag.") },
        })
      }
    }
  }
  // Vorrat geht aus: einmal pro Packung, vormittags an dem Tag, an dem es knapp wird
  for (const x of s.supps) {
    const info = stockInfo(s, x)
    if (!info || !x.stock || x.stock.ordered || info.empty || !inUse(s, x, today)) continue
    const date = addDays(today, Math.max(0, info.days - LOW_DAYS))
    if (date > addDays(today, days - 1)) continue
    const left = Math.min(info.days, LOW_DAYS)
    const alt = buyInfo(x).alt
    out.push({
      key: `stock-${x.id}-${x.stock.at}`, kind: "stock", url: LAB_BASE, at: atDate(date, wake + 150),
      title: left === 1 ? t("🛒 {name} reicht noch 1 Tag", { name: x.name }) : t("🛒 {name} reicht noch {n} Tage", { name: x.name, n: left }),
      body: shorten(alt ? t("Zeit nachzubestellen. 💡 {tip}", { tip: alt }) : t("Zeit nachzubestellen, damit keine Lücke entsteht."), 170),
      generic: { title: t("🛒 Dein Vorrat geht bald aus"), body: t("Zeit nachzubestellen, damit keine Lücke entsteht.") },
    })
  }
  return out.filter(n => n.at > now).sort((a, b) => +a.at - +b.at).slice(0, 60).map(n => ({ ...n, id: hashId(n.key) }))
}

/** Für die native App (Store): Alias auf den gemeinsamen Plan. */
export function upcomingNotifications(s: LabState, days = 10, now = new Date()) { return notificationPlan(s, days, now) }

// ── „✓ Genommen“ aus der Benachrichtigung (native App) ────────────────────────
// native.ts meldet die Aktion hier; die laufende App (LabApp) übernimmt sie per onNotifTaken in ihren Zustand.
// Ist (noch) keine App angemeldet, wird direkt in den Speicher geschrieben und die Aktion vorgemerkt –
// sobald sich die App anmeldet, bekommt sie alle Aktionen seit dem Start (applyTaken ist idempotent).

export interface NotifTaken { date: string; ids: string[]; at?: string }

/**
 * Einnahmen als genommen markieren (wie Antippen in der App): took + tookAt (nur wenn noch keine Uhrzeit da ist).
 * Nur IDs, die es im Plan noch gibt. Der Vorrat sinkt automatisch (labStock zählt abgehakte Tage). Gibt die neu markierten IDs zurück.
 */
export function applyTaken(s: LabState, a: NotifTaken): string[] {
  const ids = a.ids.filter(id => s.supps.some(x => x.id === id) && !(s.took[a.date] ?? []).includes(id))
  if (!ids.length) return []
  s.took[a.date] = [...new Set([...(s.took[a.date] ?? []), ...ids])]
  ids.forEach(id => setSkipped(s, a.date, id, false))
  if (a.at) s.tookAt[a.date] = { ...Object.fromEntries(ids.map(id => [id, a.at!])), ...(s.tookAt[a.date] ?? {}) }
  ids.forEach(id => recordDefaultAmount(s, a.date, id)) // Standard-Menge mitspeichern (wie Abhaken in der App)
  return ids
}

type TakenListener = (a: NotifTaken) => void
let takenListener: TakenListener | null = null
const takenSinceStart: NotifTaken[] = []

/** LabApp: einmal anmelden, z. B. useEffect(() => onNotifTaken(a => update(p => { applyTaken(p, a); return p }, …)), []). */
export function onNotifTaken(cb: TakenListener): () => void {
  takenListener = cb
  for (const a of takenSinceStart) cb(a)
  return () => { if (takenListener === cb) takenListener = null }
}

/** Von native.ts aufgerufen. */
export function emitNotifTaken(a: NotifTaken) {
  takenSinceStart.push(a)
  if (takenListener) { takenListener(a); return }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = hydrate(JSON.parse(raw))
    if (applyTaken(s, a).length) saveState(s)
  } catch {}
}

// ── App-offen-Fallback (nur wenn kein Push aktiv ist) ─────────────────────────

export const PUSH_ON_KEY = "lab-push-on"

/** Zeigt fällige Erinnerungen als System-Benachrichtigung, solange die App offen ist (je 1×). */
export function checkLabReminders() {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return
    if (localStorage.getItem(PUSH_ON_KEY)) return // Push übernimmt das, auch bei geschlossener App
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = hydrate(JSON.parse(raw))
    const now = Date.now()
    const due = notificationPlan(s, 1, new Date(now - 3 * 3600_000)).filter(n => +n.at <= now)
    for (const n of due) {
      const k = `true-lab-notif-${n.key}`
      if (localStorage.getItem(k)) continue
      localStorage.setItem(k, "1")
      navigator.serviceWorker?.ready.then(reg => reg.showNotification(n.title, {
        body: n.body, icon: "./icon-192.png", badge: "./icon-192.png", tag: `true-lab-${n.kind}`,
        data: { url: n.url, taken: n.suppIds?.join(",") },
        ...(n.suppIds ? { actions: [{ action: "lab-taken", title: t("✓ Genommen") }] } : {}),
      } as NotificationOptions))
    }
  } catch {}
}

// ── Native Erinnerungen (Store-App via Capacitor) ─────────────────────────────
// Die App registriert hier einen Scheduler; im Web (TRUE) bleibt das ein No-op.

type Scheduler = (s: LabState) => void
let nativeScheduler: Scheduler | null = null
export function setNativeScheduler(fn: Scheduler | null) { nativeScheduler = fn }
export function syncNativeReminders(s: LabState) { try { nativeScheduler?.(s) } catch {} }
export function hasNativeReminders() { return nativeScheduler != null }
