import { Capacitor } from "@capacitor/core"
import { LocalNotifications } from "@capacitor/local-notifications"
import { InAppReview } from "@capacitor-community/in-app-review"
import { setAppPlatform, setNativeReview } from "@/lib/labGrow"
import { emitNotifTaken, setNativeScheduler, upcomingNotifications } from "@/lib/labReminders"
import { nowTime, todayIso, type LabState } from "@/lib/supplementLab"
import { t } from "@/lib/labI18n"

/** „Später“ = in so vielen Minuten noch einmal erinnern. */
export const SNOOZE_MIN = 30
const SNOOZE_KEY = "lab-snoozed"
interface Snoozed { id: number; at: number; title: string; body: string; extra: NotifExtra }
interface NotifExtra { url?: string; suppIds?: string; date?: string; time?: string }

function readSnoozed(): Snoozed[] {
  try { const v = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? "[]"); return Array.isArray(v) ? v : [] } catch { return [] }
}
function writeSnoozed(list: Snoozed[]) { try { localStorage.setItem(SNOOZE_KEY, JSON.stringify(list.slice(-10))) } catch {} }

let lastState: LabState | null = null
let reschedule: (() => void) | null = null

/**
 * Native App (iOS/Android): echte Erinnerungen über lokale Benachrichtigungen —
 * kommen auch bei geschlossener App, inkl. 1-Tipp-Bewertung direkt aus der Nachricht.
 */
export async function initNative(): Promise<boolean> {
  // Feedback-Version mit Plattform („1.0.0-ios“ / „1.0.0-android“ / „1.0.0-web“), damit Tester-Feedback trennbar ist
  setAppPlatform(Capacitor.getPlatform())
  if (!Capacitor.isNativePlatform()) return false

  // Natives Bewertungs-Fenster (SKStoreReview / Play In-App Review) für lib/labGrow.ts → nativeReview()
  setNativeReview(() => InAppReview.requestReview())

  // Tipp auf die Nachricht öffnet die Tagesrunde; Einnahmen lassen sich direkt abhaken oder um 30 Min. verschieben.
  // „✓ Genommen“ öffnet die App (iOS: foreground). Ohne Öffnen ginge es nur, wenn iOS die App im Hintergrund startet –
  // bei der Szenen-App (SceneDelegate) lädt dann aber keine WebView, die Aktion ginge still verloren. Android öffnet
  // bei Aktions-Knöpfen des Plugins ohnehin immer die App (PendingIntent.getActivity).
  // „Später“: iOS ohne Öffnen (läuft, solange die App im Hintergrund lebt; ist sie beendet, wirkt der Knopf wie „Wegwischen“).
  await LocalNotifications.registerActionTypes({
    types: [{ id: "TAKE", actions: [
      { id: "taken", title: t("✓ Genommen"), foreground: true },
      { id: "later", title: t("⏰ Später"), foreground: false },
    ] }],
  }).catch(() => {})

  LocalNotifications.addListener("localNotificationActionPerformed", ev => {
    const extra = (ev.notification.extra ?? {}) as NotifExtra
    if (ev.actionId === "taken" && extra.suppIds) {
      // Direkt eintragen (kein Neuladen): die App übernimmt es per onNotifTaken, sonst landet es im Speicher
      const date = extra.date ?? todayIso()
      emitNotifTaken({ date, ids: extra.suppIds.split(",").filter(Boolean), at: date === todayIso() ? nowTime() : extra.time })
      clearSnoozed(extra)
      return
    }
    if (ev.actionId === "later") {
      const list = readSnoozed().filter(x => x.at > Date.now() && x.id !== snoozeId(ev.notification.id))
      list.push({ id: snoozeId(ev.notification.id), at: Date.now() + SNOOZE_MIN * 60_000, title: ev.notification.title ?? "", body: ev.notification.body ?? "", extra })
      writeSnoozed(list)
      reschedule?.()
      return
    }
    if (ev.actionId === "dismiss") return
    // Tipp auf die Nachricht: neu laden – die App wertet ?round / ?morning / ?checkin beim Start aus
    window.location.href = extra.url ?? "/"
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  let lastKey = ""
  reschedule = () => { lastKey = ""; if (lastState) schedule(lastState) }
  const schedule = (s: LabState) => {
    lastState = s
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        const list = upcomingNotifications(s)
        // Verschobene Erinnerungen („Später“) bleiben beim Neu-Planen erhalten – außer alles ist schon abgehakt
        const snoozed = readSnoozed().filter(x => x.at > Date.now() && !(x.extra.suppIds && x.extra.date &&
          x.extra.suppIds.split(",").every(id => (s.took[x.extra.date!] ?? []).includes(id))))
        writeSnoozed(snoozed)
        const key = JSON.stringify([list.map(n => [n.id, +n.at]), snoozed.map(x => [x.id, x.at])])
        if (key === lastKey) return
        let perm = await LocalNotifications.checkPermissions()
        if (perm.display !== "granted" && s.reminders.enabled) perm = await LocalNotifications.requestPermissions()
        const pending = await LocalNotifications.getPending()
        if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) })
        if (perm.display !== "granted" || (!list.length && !snoozed.length)) { lastKey = key; return }
        await LocalNotifications.schedule({
          notifications: [...snoozed.map(x => ({
            id: x.id, title: x.title, body: x.body, schedule: { at: new Date(x.at), allowWhileIdle: true }, isExactNotification: false,
            ...(x.extra.suppIds ? { actionTypeId: "TAKE" } : {}), extra: x.extra,
          })), ...list.map(n => ({
            id: n.id, title: n.title, body: n.body,
            schedule: { at: n.at, allowWhileIdle: true },
            // Android: bewusst ungenau (setAndAllowWhileIdle, kann sich um Minuten verschieben). Sonst
            // öffnet das Plugin ab Android 14 bei jedem Planen die System-Seite „Wecker & Erinnerungen“,
            // und SCHEDULE_EXACT_ALARM ist im Manifest entfernt (Play-Richtlinie). iOS ignoriert das Feld.
            isExactNotification: false,
            // Knöpfe „✓ Genommen“ / „Später“ an jeder Nachricht mit fälligen Einnahmen (Einnahme, Morgen- und Abendrunde)
            ...(n.suppIds?.length ? { actionTypeId: "TAKE" } : {}),
            extra: { url: n.url, suppIds: n.suppIds?.join(","), date: n.date, time: nowTime(n.at) } satisfies NotifExtra,
          }))],
        })
        lastKey = key
      } catch (e) {
        console.warn("Erinnerungen konnten nicht geplant werden", e)
      }
    }, 800)
  }
  setNativeScheduler(schedule)
  return true
}

/** Verschobene Kopie derselben Erinnerung (eigene ID, damit das Neu-Planen sie nicht überschreibt). */
function snoozeId(id: number) { return 2_000_000_000 + (Math.abs(id) % 100_000_000) }
function clearSnoozed(extra: NotifExtra) {
  writeSnoozed(readSnoozed().filter(x => !(x.extra.date === extra.date && x.extra.suppIds === extra.suppIds)))
}
