import { Capacitor } from "@capacitor/core"
import { LocalNotifications } from "@capacitor/local-notifications"
import { setNativeScheduler, upcomingNotifications } from "@/lib/labReminders"
import type { LabState } from "@/lib/supplementLab"

/**
 * Native App (iOS/Android): echte Erinnerungen über lokale Benachrichtigungen —
 * kommen auch bei geschlossener App, inkl. 1-Tipp-Bewertung direkt aus der Nachricht.
 */
export async function initNative(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false

  // Tipp auf die Nachricht öffnet die Tagesrunde; Einnahmen lassen sich direkt abhaken
  await LocalNotifications.registerActionTypes({
    types: [{ id: "TAKE", actions: [{ id: "taken", title: "✓ Genommen" }] }],
  }).catch(() => {})

  LocalNotifications.addListener("localNotificationActionPerformed", ev => {
    const extra = (ev.notification.extra ?? {}) as { url?: string; suppIds?: string }
    let url = extra.url ?? "/"
    if (ev.actionId === "taken" && extra.suppIds) url = `/?taken=${encodeURIComponent(extra.suppIds)}`
    // Neu laden: die App wertet ?rate / ?taken / ?checkin beim Start aus
    window.location.href = url
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  let lastKey = ""
  setNativeScheduler((s: LabState) => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      try {
        const list = upcomingNotifications(s)
        const key = JSON.stringify(list.map(n => [n.id, +n.at]))
        if (key === lastKey) return
        let perm = await LocalNotifications.checkPermissions()
        if (perm.display !== "granted" && s.reminders.enabled) perm = await LocalNotifications.requestPermissions()
        const pending = await LocalNotifications.getPending()
        if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) })
        if (perm.display !== "granted" || !list.length) { lastKey = key; return }
        await LocalNotifications.schedule({
          notifications: list.map(n => ({
            id: n.id, title: n.title, body: n.body,
            schedule: { at: n.at, allowWhileIdle: true },
            ...(n.kind === "take" ? { actionTypeId: "TAKE" } : {}),
            extra: { url: n.url, suppIds: n.suppIds?.join(",") },
          })),
        })
        lastKey = key
      } catch (e) {
        console.warn("Erinnerungen konnten nicht geplant werden", e)
      }
    }, 800)
  })
  return true
}
