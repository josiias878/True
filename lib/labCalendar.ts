// ── Supplement Lab: Kalender-Abo ──────────────────────────────────────────────
// Ein Kalender, den man einmal abonniert und der sich danach selbst aktualisiert –
// nur die großen Termine (Push übernimmt den Alltag). Standard: neutrale Titel ohne Namen.

import { addDays, fromMin, toMin, todayIso, type LabState } from "./supplementLab"
import { pathStops, type Stop } from "./labPath"

const FEED_URL = "https://mkdfohmshuuiroeruyyz.supabase.co/functions/v1/lab-cal"
const TOKEN_KEY = "lab-cal-token", ON_KEY = "lab-cal-on", NAMES_KEY = "lab-cal-names", HASH_KEY = "lab-cal-hash"

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} },
  del: (k: string) => { try { localStorage.removeItem(k) } catch {} },
}

function token() {
  let t = ls.get(TOKEN_KEY)
  if (!t || !/^[a-f0-9]{48}$/.test(t)) {
    const b = new Uint8Array(24)
    crypto.getRandomValues(b)
    t = Array.from(b, x => x.toString(16).padStart(2, "0")).join("")
    ls.set(TOKEN_KEY, t)
  }
  return t
}

export function calendarOn() { return ls.get(ON_KEY) === "1" }
export function calendarNames() { return ls.get(NAMES_KEY) === "1" }
export function setCalendarNames(v: boolean) { if (v) ls.set(NAMES_KEY, "1"); else ls.del(NAMES_KEY); ls.del(HASH_KEY) }
export function calendarUrls() {
  const https = `${FEED_URL}?t=${token()}`
  return { https, webcal: https.replace(/^https:/, "webcal:") }
}

// ── ICS ────────────────────────────────────────────────────────────────────────

const NEUTRAL: Record<Stop["kind"], string> = {
  take: "💊 Einnahme", checkin: "⭐ Check-in", result: "🎁 Ein Test-Ergebnis ist da", lastDay: "🏁 Letzter Testtag",
  nextTest: "🔬 Nächster Test (Vorschlag)", startTest: "🔬 Test starten", stock: "🛒 Vorrat nachkaufen", streak: "🔥 Serien-Meilenstein",
  stack: "🏆 Stack starten", check: "🤔 Entscheidung fällig", reset: "🧘 Reset startet",
}
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")
function dt(iso: string, min: number) {
  const day = addDays(iso, Math.floor(min / 1440))
  return `${day.replace(/-/g, "")}T${fromMin(min).replace(":", "")}00`
}

export function buildMilestoneIcs(s: LabState, opts: { names: boolean; origin: string }) {
  const today = todayIso()
  const wake = toMin(s.settings.wake)
  const ev: string[] = []
  const add = (uid: string, date: string, min: number, dur: number, title: string, desc: string, url: string, alarm = true) => ev.push([
    "BEGIN:VEVENT", `UID:${uid}@supplement-lab`, `DTSTAMP:${stamp()}`, `DTSTART:${dt(date, min)}`, `DURATION:PT${dur}M`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(`${desc}\n${url}`)}`, `URL:${url}`,
    ...(alarm ? ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "TRIGGER:PT0M", "END:VALARM"] : []),
    "END:VEVENT",
  ].join("\r\n"))

  const app = opts.origin.replace(/\/$/, "")
  if (s.startDate) {
    const { stops } = pathStops(s, today, new Date(), false, 60)
    for (const st of stops) {
      if (st.date <= today || st.kind === "take" || st.kind === "checkin") continue
      const title = opts.names ? `${st.emoji} ${st.title}` : NEUTRAL[st.kind]
      const desc = opts.names && st.sub ? st.sub : st.est ? "Kolbis Vorschlag – du entscheidest in der App." : "Tippe auf den Link, um die App zu öffnen."
      const min = st.kind === "result" ? wake + 60 : st.kind === "stock" ? wake + 150 : wake + 90
      add(`${st.key}-${st.date}`, st.date, min, 15, title, desc, `${app}/?round=1`, st.kind !== "streak")
    }
    // Wochenrückblick: die nächsten 8 Sonntage
    let d = today
    for (let k = 0; k < 7 && new Date(`${d}T12:00:00`).getDay() !== 0; k++) d = addDays(d, 1)
    for (let w = 0; w < 8; w++) {
      const sun = addDays(d, w * 7)
      add(`recap-${sun}`, sun, 18 * 60 + 30, 15, "📊 Dein Wochenrückblick", "30 Sekunden zum Durchwischen.", `${app}/?recap=1`, false)
    }
  }
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Supplement Lab//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Supplement Lab 🧪", "X-WR-CALDESC:Deine großen Lab-Termine – aktualisiert sich automatisch.",
    "REFRESH-INTERVAL;VALUE=DURATION:PT4H", "X-PUBLISHED-TTL:PT4H",
    ...ev, "END:VCALENDAR",
  ].join("\r\n")
}

function hash(str: string) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return String(h) }

/** Aktuellen Kalender hochladen (nur wenn abonniert und sich etwas geändert hat). */
export async function syncCalendar(s: LabState, force = false): Promise<boolean> {
  if (!force && !calendarOn()) return false
  const ics = buildMilestoneIcs(s, { names: calendarNames(), origin: location.origin + location.pathname.replace(/[^/]*$/, "") })
  const h = hash(ics.replace(/DTSTAMP:\d+T\d+Z?/g, ""))
  if (!force && ls.get(HASH_KEY) === h) return true
  try {
    const res = await fetch(FEED_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token(), ics }) })
    if (!res.ok) return false
    ls.set(HASH_KEY, h)
    return true
  } catch { return false }
}

export async function enableCalendar(s: LabState) {
  ls.set(ON_KEY, "1")
  ls.del(HASH_KEY)
  return syncCalendar(s, true)
}

export async function disableCalendar() {
  ls.del(ON_KEY); ls.del(HASH_KEY)
  try { await fetch(FEED_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token(), remove: true }) }) } catch {}
  ls.del(TOKEN_KEY) // neues Token beim nächsten Abo – der alte Link ist dann tot
}
