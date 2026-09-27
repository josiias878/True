// ── Supplement Lab: Erinnerungen ──────────────────────────────────────────────
// 1) Kalender-Datei (.ics): zuverlässige Erinnerungen auch bei geschlossener App.
// 2) App-Benachrichtigungen: wenn TRUE geöffnet/als PWA aktiv ist, inkl. 1-Klick-Bewertung.

import {
  LIB_BY_ID, phaseWindows, intakeOn, slotFor, slotMinutes, fromMin, toMin, todayIso, addDays, diffDays,
  STORAGE_KEY, hydrate, type LabState,
} from "./supplementLab"

const APP_URL = "https://get-true.de/lab"

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
    `DESCRIPTION:${esc(desc + "\n" + APP_URL)}`,
    `URL:${APP_URL}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT",
  ].join("\r\n")
}

/** Kalender mit Check-in, Einnahmen und Urteil-Terminen für das ganze Experiment. */
export function buildIcs(s: LabState): string {
  const wins = phaseWindows(s)
  if (!wins.length) return ""
  const last = wins[wins.length - 1]
  const today = todayIso()
  const from = wins[0].start > today ? wins[0].start : today
  const ev: string[] = []

  // Täglicher Check-in
  ev.push(event("checkin", icsDate(from, s.reminders.checkin), "🧪 Supplement-Check-in (1 Klick)",
    "Wie war dein Tag? Einmal tippen, fertig.", icsDate(last.end, "23:59")))

  // Einnahmen pro Test-Phase
  if (s.reminders.intake) {
    for (const w of wins) {
      if (w.kind === "test" && w.suppId && w.end >= from) {
        const supp = s.supps.find(x => x.id === w.suppId)
        if (!supp) continue
        const start = w.start > from ? w.start : from
        const time = fromMin(slotMinutes(slotFor(supp.id, s), s.settings))
        const lib = supp.lib ? LIB_BY_ID[supp.lib] : undefined
        ev.push(event(`take-${w.id}`, icsDate(start, time), `${supp.emoji} ${supp.name} nehmen`,
          `${supp.dose ? supp.dose + " · " : ""}${lib?.timing ?? ""}`, icsDate(w.end, "23:59")))
      }
      if (w.kind !== "test" && w.start >= from) {
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
    // Durchgehende Supplements
    for (const supp of s.supps.filter(x => x.mode === "konstant")) {
      const lib = supp.lib ? LIB_BY_ID[supp.lib] : undefined
      const time = fromMin(slotMinutes(slotFor(supp.id, s), s.settings))
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

// ── App-Benachrichtigungen ─────────────────────────────────────────────────────

export interface DueReminder { key: string; title: string; body: string; url: string; actions?: { action: string; title: string }[] }

/** Was ist gerade fällig? (Check-in am Abend, Einnahme zur Slot-Zeit) */
export function dueReminders(s: LabState, now = new Date()): DueReminder[] {
  if (!s.reminders.enabled || !s.startDate) return []
  const today = todayIso()
  const wins = phaseWindows(s)
  if (!wins.length || today < wins[0].start || today > wins[wins.length - 1].end) return []
  const minutes = now.getHours() * 60 + now.getMinutes()
  const wakeMin = toMin(s.settings.wake)
  const nowRel = minutes < wakeMin ? minutes + 1440 : minutes
  const out: DueReminder[] = []

  if (s.reminders.intake) {
    const took = s.took[today] ?? []
    for (const id of intakeOn(s, today)) {
      const supp = s.supps.find(x => x.id === id)
      if (!supp || took.includes(id)) continue
      const at = slotMinutes(slotFor(id, s), s.settings)
      if (nowRel >= at && nowRel < at + 180) {
        out.push({ key: `take-${id}`, title: `${supp.emoji} Zeit für ${supp.name}`, body: supp.dose ? `${supp.dose} · Tippe „Genommen“ zum Abhaken.` : "Tippe „Genommen“ zum Abhaken.",
          url: "/lab", actions: [{ action: "lab-taken", title: "✓ Genommen" }] })
      }
    }
  }

  const checkin = toMin(s.reminders.checkin)
  const checkinRel = checkin < wakeMin ? checkin + 1440 : checkin
  if (!s.checkins[today] && nowRel >= checkinRel) {
    out.push({ key: "checkin", title: "🧪 Wie war dein Tag?", body: "1 Klick reicht — deine Streak wartet 🔥",
      url: "/lab?checkin=1", actions: [{ action: "lab-rate-5", title: "🤩 Top" }, { action: "lab-rate-3", title: "😐 Okay" }] })
  }
  return out
}

/** Zeigt fällige Lab-Erinnerungen als System-Benachrichtigung (je 1× pro Tag). */
export function checkLabReminders() {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const s = hydrate(JSON.parse(raw))
    const today = todayIso()
    for (const r of dueReminders(s)) {
      const k = `true-lab-notif-${today}-${r.key}`
      if (localStorage.getItem(k)) continue
      localStorage.setItem(k, "1")
      navigator.serviceWorker?.ready.then(reg => reg.showNotification(r.title, {
        body: r.body, icon: "/icon-192.png", badge: "/icon-192.png", tag: `true-lab-${r.key}`,
        data: { url: r.url, taken: r.key.startsWith("take-") ? r.key.slice(5) : undefined },
        // actions werden nicht von allen Browsern unterstützt — dann öffnet ein Tipp einfach die App
        ...(r.actions ? { actions: r.actions } : {}),
      } as NotificationOptions))
    }
  } catch {}
}
