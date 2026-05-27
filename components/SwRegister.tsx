"use client"
import { useEffect } from "react"

// ─── Geburtstags-Benachrichtigung ─────────────────────────────────────────────
function checkBirthdayNotification() {
  try {
    const profile = JSON.parse(localStorage.getItem("true-profile") || "{}")
    const { birthDay, birthMonth, vorname } = profile
    if (!birthDay || !birthMonth) return
    const today = new Date()
    const d = parseInt(birthDay), m = parseInt(birthMonth)
    if (today.getDate() !== d || today.getMonth() + 1 !== m) return
    const yearKey = `true-bday-notified-${today.getFullYear()}`
    if (localStorage.getItem(yearKey)) return
    localStorage.setItem(yearKey, "1")
    if (!("Notification" in window) || Notification.permission !== "granted") return
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(`Alles Gute, ${vorname || "du"}! 🎂`, {
        body: "TRUE wünscht dir einen wunderschönen Geburtstag 🥳",
        icon: "/icon-192.png",
        tag: "true-birthday",
        data: { url: "/home" },
      })
    })
  } catch {}
}

// ─── Geburtstage von Familienmitgliedern (Eingeladene) ────────────────────────
function checkFamilyBirthdays() {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return
    const today = new Date()
    const todayDay = today.getDate(), todayMonth = today.getMonth() + 1
    const yearStr = String(today.getFullYear())
    const members: Array<{ id: string; name: string; birthDay?: string; birthMonth?: string }> =
      JSON.parse(localStorage.getItem("true-family-members") || "[]")
    members.forEach(m => {
      if (!m.birthDay || !m.birthMonth) return
      if (parseInt(m.birthDay) !== todayDay || parseInt(m.birthMonth) !== todayMonth) return
      const key = `true-bday-family-${m.id}-${yearStr}`
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, "1")
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(`🎂 ${m.name} hat heute Geburtstag!`, {
          body: `Vergiss nicht, ${m.name} zu gratulieren 🥳`,
          icon: "/icon-192.png",
          tag: `true-bday-${m.id}`,
          data: { url: "/home" },
        })
      })
    })
  } catch {}
}

// ─── Tägliche TRUE-Update Benachrichtigung (8–10 Uhr) ────────────────────────
const DAILY_MESSAGES = [
  { title: "🌿 TRUE Daily Update", body: "Neues zu Palmöl, Wasserrechten und besseren Alternativen — direkt auf der Startseite." },
  { title: "📰 TRUE News heute", body: "Aktuelle Konzern-News und Einkaufstipps warten auf dich." },
  { title: "🔍 Was steckt drin?", body: "Scanne heute ein Produkt — TRUE zeigt dir sofort die Kaufempfehlung." },
  { title: "✅ Positive News", body: "Es gibt gute Nachrichten: Neue Erfolge für Verbraucher und Umwelt." },
  { title: "💡 Tipp des Tages", body: "Kleiner Wechsel, große Wirkung: Entdecke eine faire Alternative beim nächsten Einkauf." },
  { title: "🌍 TRUE – Dein Einkaufshelfer", body: "Barcode scannen dauert 3 Sekunden — und du weißt sofort Bescheid." },
  { title: "🛒 Bewusst einkaufen heute", body: "Deine Einkaufsliste wartet — schau welche Alternativen du schon gespeichert hast." },
]

function checkDailyNotification() {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return
    const today = new Date()
    const hour = today.getHours()
    if (hour < 8 || hour >= 10) return
    const dateKey = `true-daily-notif-${today.toISOString().slice(0, 10)}`
    if (localStorage.getItem(dateKey)) return
    localStorage.setItem(dateKey, "1")
    const dayIdx = Math.floor(Date.now() / 86_400_000)
    const msg = DAILY_MESSAGES[dayIdx % DAILY_MESSAGES.length]
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(msg.title, {
        body: msg.body,
        icon: "/icon-192.png",
        tag: "true-daily",
        data: { url: "/home" },
      })
    })
  } catch {}
}

// ─── Einkaufslisten-Erinnerung (17–19 Uhr, wenn Produkte offen) ──────────────
const LIST_REMINDERS = [
  { title: "🛒 Du hast offene Artikel", body: "Einkaufen heute? Deine TRUE-Liste hat noch unerledigte Produkte." },
  { title: "📋 Einkaufsliste nicht vergessen", body: "TRUE erinnert dich: Einige Artikel auf deiner Liste fehlen noch." },
  { title: "🛍️ Noch was auf der Liste?", body: "Deine Einkaufsliste hat offene Einträge — schau kurz rein." },
  { title: "✅ Liste abhaken?", body: "Du hast Produkte auf deiner TRUE-Liste — jetzt einkaufen gehen?" },
]

function checkShoppingListReminder() {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return
    const today = new Date()
    const hour = today.getHours()
    if (hour < 17 || hour >= 19) return
    const dateKey = `true-list-notif-${today.toISOString().slice(0, 10)}`
    if (localStorage.getItem(dateKey)) return

    // Check if there are unchecked items in the list
    const raw = localStorage.getItem("shopping-list-items-v1")
    if (!raw) return
    const items = JSON.parse(raw)
    const unchecked = items.filter((i: { checked?: boolean }) => !i.checked)
    if (unchecked.length === 0) return

    localStorage.setItem(dateKey, "1")
    const dayIdx = Math.floor(Date.now() / 86_400_000)
    const msg = LIST_REMINDERS[dayIdx % LIST_REMINDERS.length]
    const count = unchecked.length

    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(msg.title, {
        body: count > 1 ? `${count} Artikel noch offen — ${msg.body}` : msg.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "true-list-reminder",
        data: { url: "/home" },
      })
    })
  } catch {}
}

// ─── Community-Update (Di + Do 12–13 Uhr) ────────────────────────────────────
const COMMUNITY_UPDATES = [
  { title: "👥 Neu in der Community", body: "Mitglieder teilen gerade Erfahrungen zu Produkten und Alternativen — schau rein." },
  { title: "💬 Community aktiv", body: "Neue Diskussionen und Tipps von der TRUE Community warten auf dich." },
  { title: "👥 Was die Community sagt", body: "Mitglieder haben neue Produkt-Alternativen geteilt — jetzt entdecken." },
]

function checkCommunityNotification() {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return
    const today = new Date()
    const day = today.getDay() // 2 = Dienstag, 4 = Donnerstag
    if (day !== 2 && day !== 4) return
    const hour = today.getHours()
    if (hour < 12 || hour >= 13) return
    const weekKey = `true-community-notif-${today.toISOString().slice(0, 10)}`
    if (localStorage.getItem(weekKey)) return
    localStorage.setItem(weekKey, "1")
    const dayIdx = Math.floor(Date.now() / 86_400_000)
    const msg = COMMUNITY_UPDATES[dayIdx % COMMUNITY_UPDATES.length]
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(msg.title, {
        body: msg.body,
        icon: "/icon-192.png",
        tag: "true-community",
        data: { url: "/community" },
      })
    })
  } catch {}
}

// ─── Wöchentlicher Rückblick (Montag 9–11 Uhr) ───────────────────────────────
const WEEKLY_DIGESTS = [
  { title: "📊 TRUE Wochenrückblick", body: "Was bewegt die Konzernwelt diese Woche? Alle Updates auf der Startseite." },
  { title: "🏆 Die Woche in TRUE", body: "Top-Stories, neue Alternativen und Community-Highlights dieser Woche." },
  { title: "🌱 Wöchentlicher TRUE Report", body: "Neue Erkenntnisse zu Palmöl, Plastik & Co. — alles auf einen Blick." },
]

function checkWeeklyDigest() {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return
    const today = new Date()
    if (today.getDay() !== 1) return
    const hour = today.getHours()
    if (hour < 9 || hour >= 11) return
    const weekKey = `true-weekly-notif-${today.getFullYear()}-W${getWeekNumber(today)}`
    if (localStorage.getItem(weekKey)) return
    localStorage.setItem(weekKey, "1")
    const weekIdx = getWeekNumber(today)
    const msg = WEEKLY_DIGESTS[weekIdx % WEEKLY_DIGESTS.length]
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(msg.title, {
        body: msg.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "true-weekly",
        data: { url: "/home" },
      })
    })
  } catch {}
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    // Auto-reload when new SW takes over — no manual cache clear needed
    navigator.serviceWorker.addEventListener("message", e => {
      if (e.data?.type === "SW_UPDATED") {
        window.location.reload()
      }
    })

    navigator.serviceWorker.register("/sw.js")
      .then(reg => {
        // If a new SW is waiting, tell it to skip waiting immediately
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" })
        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing
          if (!newSW) return
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              newSW.postMessage({ type: "SKIP_WAITING" })
            }
          })
        })
        checkBirthdayNotification()
        checkFamilyBirthdays()
        checkDailyNotification()
        checkShoppingListReminder()
        checkCommunityNotification()
        checkWeeklyDigest()
      })
      .catch(() => {})
  }, [])
  return null
}
