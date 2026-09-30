// ── Supplement Lab: echte Push-Nachrichten (Web/PWA) ─────────────────────────
// Der Server (Supabase) bekommt nur die Push-Adresse + neutrale Termine.
// Die persönlichen Texte (mit Supplement-Namen) liegen im Cache des Geräts;
// der Service Worker setzt sie beim Empfang ein.

import { notificationPlan, PUSH_ON_KEY } from "./labReminders"
import type { LabState } from "./supplementLab"

const REGISTER_URL = "https://mkdfohmshuuiroeruyyz.supabase.co/functions/v1/push-register"
const VAPID_PUBLIC = "BDcNj1aTIToVgJ2mgcEiaaaPPQssZUeveuj12LT4eGnK7rtGE_ppoY8jUlSBUtc8yIRumi8erDzIv9Z-tix-5Ns"
const CACHE = "lab-push"
const PLAN_URL = "/__lab_push_plan.json"
const HASH_KEY = "lab-push-hash"

// Nur die eigenständige App schaltet Push frei (dort kennt der Service Worker die Push-Nachrichten)
let allowed = false
export function allowPush(on: boolean) { allowed = on }

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on"

function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent) }
function isStandalone() {
  return matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}
function apiAvailable() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window }

export async function pushState(): Promise<PushState> {
  if (!allowed) return "unsupported"
  if (!apiAvailable()) return isIos() && !isStandalone() ? "needs-install" : "unsupported"
  if (Notification.permission === "denied") return "denied"
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === "granted" ? "on" : "off"
}

export function pushAvailable() { return allowed && typeof window !== "undefined" && apiAvailable() }

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

/** Muss aus einem Tipp heraus aufgerufen werden (iOS verlangt eine Nutzer-Geste). */
export async function enablePush(s: LabState): Promise<boolean> {
  if (!pushAvailable()) return false
  const perm = await Notification.requestPermission()
  if (perm !== "granted") return false
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) })
  localStorage.setItem(PUSH_ON_KEY, "1")
  localStorage.removeItem(HASH_KEY)
  return syncPush(s)
}

export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
      await fetch(REGISTER_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), unsubscribe: true }) }).catch(() => {})
      await sub.unsubscribe()
    }
  } catch {}
  localStorage.removeItem(PUSH_ON_KEY)
  localStorage.removeItem(HASH_KEY)
}

function hash(str: string) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return String(h >>> 0)
}

/** Plan an den Push-Server schicken, wenn sich etwas geändert hat. */
export async function syncPush(s: LabState): Promise<boolean> {
  try {
    if (!pushAvailable() || Notification.permission !== "granted") return false
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return false
    const plan = notificationPlan(s, 7)

    const personal = plan.map(n => ({ id: n.key, title: n.title, body: n.body, url: n.url, taken: n.suppIds?.join(",") }))
    const cache = await caches.open(CACHE)
    await cache.put(PLAN_URL, new Response(JSON.stringify(personal), { headers: { "Content-Type": "application/json" } }))

    const neutral = plan.map(n => ({ at: n.at.toISOString(), payload: { id: n.key, title: n.generic.title, body: n.generic.body, url: n.url, tag: n.kind } }))
    const h = hash(JSON.stringify([sub.endpoint, neutral]))
    if (localStorage.getItem(HASH_KEY) === h) return true
    const res = await fetch(REGISTER_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), plan: neutral }),
    })
    if (!res.ok) return false
    localStorage.setItem(HASH_KEY, h)
    localStorage.setItem(PUSH_ON_KEY, "1")
    return true
  } catch {
    return false
  }
}
