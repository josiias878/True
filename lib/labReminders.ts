// ── Supplement Lab: Erinnerungen ──────────────────────────────────────────────
// 1) Kalender-Datei (.ics): zuverlässige Erinnerungen auch bei geschlossener App.
// 2) App-Benachrichtigungen: wenn TRUE geöffnet/als PWA aktiv ist, inkl. 1-Klick-Bewertung.

import {
  LIB_BY_ID, SLOTS, phaseWindows, intakeOn, slotFor, slotMinutes, suppMinutes, fromMin, toMin, todayIso, addDays, diffDays, libOf, streak,
  STORAGE_KEY, hydrate, STORE_MODE, LAB_BASE, isHere, type LabState, type SlotId,
} from "./supplementLab"
import { partnerTips } from "./labKnowledge"
import { LOW_DAYS, buyInfo, inUse, stockInfo } from "./labStock"

const APP_URL = STORE_MODE ? "" : "https://get-true.de/lab"

function icsDate(iso: string, time: string) {
  const m = toMin(time)
  const dayOffset = Math.floor(m / 1440)
  const d = addDays(iso, dayOffset).replace(/-/g, "")
  const t = fromMin(m).replace(":", "")
  return `${d}T${t}00`
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

  // Täglicher Check-in
  ev.push(event("checkin", icsDate(from, s.reminders.checkin), "🧪 Supplement-Check-in (1 Klick)",
    "Wie war dein Tag? Einmal tippen, fertig.", icsDate(checkinUntil, "23:59")))

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
        ev.push(event(`take-${w.id}`, icsDate(start, time), `${supp.emoji} ${supp.name} nehmen`,
          `${supp.dose ? supp.dose + " · " : ""}${lib?.timing ?? ""}`, icsDate(w.end, "23:59")))
      }
      if ((w.kind === "baseline" || w.kind === "washout") && w.start >= from) {
        ev.push(event(`phase-${w.id}`, icsDate(w.start, s.settings.wake),
          w.kind === "baseline" ? "🧘 Reset startet: heute nichts nehmen" : "💧 Auswaschpause: heute nichts testen",
          "Einfach wie gewohnt einchecken."))
      }
      if (w.kind === "test" && w.suppId && w.end >= from) {
        const supp = s.supps.find(x => x.id === w.suppId)
        ev.push(event(`verdict-${w.id}`, icsDate(addDays(w.end, 1), "10:00"), `⚖️ Urteil fällig: ${supp?.name ?? "Test"}`,
          "Die App hat schon einen Vorschlag für dich — 1 Klick zum Bestätigen."))
      }
    }
    // Stack-Phase: alle behaltenen täglich
    const stack = wins.find(w => w.kind === "stack" && w.end >= from)
    if (stack) {
      for (const supp of s.supps.filter(x => s.verdicts[x.id]?.decision === "keep" && x.mode !== "konstant" && isHere(x))) {
        const time = fromMin(suppMinutes(supp.id, s))
        ev.push(event(`stack-${supp.id}`, icsDate(stack.start > from ? stack.start : from, time), `${supp.emoji} ${supp.name} nehmen`, supp.dose || "", icsDate(last.end, "23:59")))
      }
    }
    // Durchgehende Supplements
    for (const supp of s.supps.filter(x => x.mode === "konstant" && isHere(x))) {
      const lib = supp.lib ? LIB_BY_ID[supp.lib] : undefined
      const time = fromMin(suppMinutes(supp.id, s))
      // wöchentliche am Wochentag des Experiment-Starts
      const first = lib?.weekly ? addDays(wins[0].start, Math.ceil(Math.max(0, diffDays(wins[0].start, from)) / 7) * 7) : from
      ev.push(event(`const-${supp.id}`, icsDate(first, time), `${supp.emoji} ${supp.name}${lib?.weekly ? " (wöchentlich)" : ""} nehmen`,
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

export type NotifKind = "take" | "checkin" | "streak" | "result" | "tip" | "stock"

export interface PlannedNotification {
  id: number
  key: string
  kind: NotifKind
  title: string
  body: string
  at: Date
  url: string
  suppIds?: string[]
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
function shorten(t: string, n: number) { return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t }
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
      const took = date === today ? (s.took[date] ?? []) : []
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
        const info = custom ? { emoji: "⏰", label: `${fromMin(m)} Uhr` } : SLOTS.find(x => x.id === slot)!
        const lib = libOf(supps[0])
        out.push({
          key: `take-${date}-${m}`, kind: "take", suppIds: supps.map(x => x.id), url: round,
          at: atDate(date, m),
          title: `${info.emoji} ${info.label}: ${joinNames(supps.map(x => x.name))}`,
          body: supps.length === 1 && lib ? shorten(`💡 ${lib.timing}`, 150) : `${supps.map(x => x.emoji).join(" ")} Tippe „Genommen“ oder öffne deine Runde.`,
          generic: { title: `${info.emoji} ${info.label}: Zeit für deine Supplements`, body: "Tippe, um abzuhaken." },
        })
      }
    }

    // Abends: Tagesrunde (+ Serien-Retter heute). Einnahmen ±60 Min. davon werden mitgenommen → weniger Pings.
    if (!(date === today && s.checkins[date])) {
      let m = toMin(s.reminders.checkin)
      if (m < wake) m += 1440
      const at = atDate(date, m)
      const near = out.filter(n => n.kind === "take" && n.key.startsWith(`take-${date}-`) && Math.abs(+n.at - +at) <= 60 * 60_000)
      const ids = near.flatMap(n => n.suppIds ?? [])
      for (const n of near) out.splice(out.indexOf(n), 1)
      const names = ids.map(id => s.supps.find(x => x.id === id)?.name).filter(Boolean) as string[]
      const text = names.length
        ? { title: "🧪 Deine Abendrunde", body: `${joinNames(names)} nehmen + 1 Minute Check-in. So sehe ich, was bei dir wirklich wirkt.` }
        : { title: "🧪 Kolbi wartet auf dich", body: "1 Minute: Wie war dein Tag? So sehe ich, was bei dir wirklich wirkt." }
      out.push({
        key: `checkin-${date}`, kind: "checkin", url: round, at, ...text, ...(ids.length ? { suppIds: ids } : {}),
        generic: names.length ? { title: "🧪 Deine Abendrunde wartet", body: "Einnahme + 1 Minute Check-in." } : text,
      })
      if (i === 0 && st >= 3) {
        const sm = Math.min(m + 90, bed - 15)
        if (sm > m + 20) out.push({
          key: `streak-${date}`, kind: "streak", url: round, at: atDate(date, sm),
          title: `🔥 Deine ${st}-Tage-Serie reißt heute`, body: "Noch schnell einchecken – dauert keine Minute.",
          generic: { title: "🔥 Deine Serie wartet", body: "Noch schnell einchecken – dauert keine Minute." },
        })
      }
    }

    // Test fertig → Ergebnis aufdecken
    for (const w of wins) {
      if (w.kind !== "test" || !w.suppId || s.verdicts[w.suppId] || addDays(w.end, 1) !== date) continue
      const supp = s.supps.find(x => x.id === w.suppId)
      out.push({
        key: `result-${w.id}`, kind: "result", url: round, at: atDate(date, wake + 60),
        title: `🎁 Dein Ergebnis zu ${supp?.name ?? "deinem Test"} ist da`, body: "Tippe, um aufzudecken, ob es bei dir wirkt.",
        generic: { title: "🎁 Ein Test-Ergebnis ist da", body: "Tippe, um aufzudecken, ob es bei dir wirkt." },
      })
    }

    // Sonntagabend: Wochenrückblick als Story
    if (new Date(`${date}T12:00:00`).getDay() === 0 && diffDays(s.startDate, date) >= 3) {
      out.push({
        key: `recap-${date}`, kind: "tip", url: `${LAB_BASE}?recap=1`, at: atDate(date, 18 * 60 + 30),
        title: "📊 Dein Wochenrückblick ist da", body: "Wie war deine Woche? Kolbi hat alles zusammengestellt – 30 Sekunden zum Durchwischen.",
        generic: { title: "📊 Dein Wochenrückblick ist da", body: "30 Sekunden zum Durchwischen." },
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
          title: `💡 ${supp.emoji} ${supp.name}: so holst du mehr raus`,
          body: shorten(partner ? `${partner.title}. ${partner.text}` : libOf(supp)!.timing, 170),
          generic: { title: "💡 Kolbis Praxis-Tipp der Woche", body: "Ein kurzer Tipp für deinen Alltag." },
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
      title: `🛒 ${x.name} reicht noch ${left} ${left === 1 ? "Tag" : "Tage"}`,
      body: shorten(alt ? `Zeit nachzubestellen. 💡 ${alt}` : "Zeit nachzubestellen, damit keine Lücke entsteht.", 170),
      generic: { title: "🛒 Dein Vorrat geht bald aus", body: "Zeit nachzubestellen, damit keine Lücke entsteht." },
    })
  }
  return out.filter(n => n.at > now).sort((a, b) => +a.at - +b.at).slice(0, 60).map(n => ({ ...n, id: hashId(n.key) }))
}

/** Für die native App (Store): Alias auf den gemeinsamen Plan. */
export function upcomingNotifications(s: LabState, days = 10, now = new Date()) { return notificationPlan(s, days, now) }

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
        ...(n.suppIds ? { actions: [{ action: "lab-taken", title: "✓ Genommen" }] } : {}),
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
