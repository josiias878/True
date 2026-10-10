// ── Supplement Lab: echte Push-Nachrichten (Web/PWA) ─────────────────────────
// Der Server (Supabase) bekommt nur die Push-Adresse + neutrale Termine.
// Die persönlichen Texte (mit Supplement-Namen) liegen im Cache des Geräts;
// der Service Worker setzt sie beim Empfang ein.

import { notificationPlan, PUSH_ON_KEY } from "./labReminders"
import type { LabState } from "./supplementLab"
import { t } from "./labI18n"

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
  localStorage.removeItem(COMMUNITY_KEY) // Push-Adresse gelöscht → Verknüpfung entfällt serverseitig mit
}

function hash(str: string) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return String(h >>> 0)
}

// ── Community-Zusammenfassung (freiwillig, max. 1×/Tag; Server: push-register social + Cron social_push_digest) ──
const COMMUNITY_KEY = "lab-push-community"
const COMMUNITY_OFF_PENDING = "lab-push-community-off" // Abschalten schlug fehl (offline) → beim nächsten Start nachholen
const COMMUNITY_LANG = "lab-push-community-lang" // Sprache, mit der der Server die Zusammenfassung schickt
export function communityPushOn(): boolean { try { return localStorage.getItem(COMMUNITY_KEY) === "1" && localStorage.getItem(COMMUNITY_OFF_PENDING) !== "1" } catch { return false } }
/** Nur lokal vergessen (z. B. Social-Konto gelöscht: serverseitig ist die Verknüpfung per Cascade weg) */
export function clearCommunityPush() { try { localStorage.removeItem(COMMUNITY_KEY); localStorage.removeItem(COMMUNITY_OFF_PENDING); localStorage.removeItem(COMMUNITY_LANG) } catch {} }
/** App-Sprache gewechselt, seit der Server die Sprache kennt? (dann neu verknüpfen) */
export const communityLangStale = (lang: string) => { try { return communityPushOn() && localStorage.getItem(COMMUNITY_LANG) !== lang } catch { return false } }
export const communityOffPending = () => { try { return localStorage.getItem(COMMUNITY_OFF_PENDING) === "1" } catch { return false } }
/** Social-Profil mit dieser Push-Adresse verknüpfen bzw. trennen. Ohne Push (Erlaubnis/Adresse) → false. */
export async function setCommunityPush(on: boolean, social: { secret: string; lang: string }): Promise<boolean> {
  try {
    if (on && (!pushAvailable() || Notification.permission !== "granted")) return false
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) { if (!on) clearCommunityPush(); return !on }
    const res = await fetch(REGISTER_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), social: { secret: social.secret, on, lang: social.lang } }),
    })
    // Profil schon weg (401) → Verknüpfung per Cascade gelöscht, nichts mehr nachzuholen
    if (res.status === 401) { clearCommunityPush(); return !on }
    // Server bestätigt den tatsächlichen Zustand (gesperrtes Profil → social:false)
    const body = res.ok ? await res.json().catch(() => null) as { social?: boolean } | null : null
    // Server lehnt Einschalten ab (z. B. gesperrtes Profil) → lokal aus, sonst fragt jeder Start erneut
    if (on && body?.social === false) { clearCommunityPush(); return false }
    if (!body || body.social !== on) { if (!on) localStorage.setItem(COMMUNITY_OFF_PENDING, "1"); return false }
    if (on) { localStorage.setItem(COMMUNITY_KEY, "1"); localStorage.setItem(COMMUNITY_LANG, social.lang); localStorage.removeItem(COMMUNITY_OFF_PENDING) } else clearCommunityPush()
    return true
  } catch { if (!on) try { localStorage.setItem(COMMUNITY_OFF_PENDING, "1") } catch {} ; return false }
}

/** Plan an den Push-Server schicken, wenn sich etwas geändert hat. */
export async function syncPush(s: LabState): Promise<boolean> {
  try {
    if (!pushAvailable() || Notification.permission !== "granted") return false
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return false
    const plan = notificationPlan(s, 7)

    const personal = plan.map(n => ({ id: n.key, title: n.title, body: n.body, url: n.url, taken: n.suppIds?.join(","), ...(n.suppIds ? { takenLabel: t("✓ Genommen") } : {}) }))
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
