// ── Wachstum: Lab Pro (Beta = alles frei), Freunde einladen, Bewertungs-Moment, Feedback ──
import { addDays, streak, todayIso, type LabState } from "./supplementLab"
import { track } from "./labStats"
import { paymentsReady, type Plan } from "./labBilling"
import { t, euro, LOCALE, isEn } from "./labI18n"

/** Beta-Ende: Wer bis einschließlich zu diesem Tag startet, wird „Gründer“ – Pro bleibt für immer gratis. */
export const BETA_END = "2026-11-30"
/** Erst wenn man wirklich bezahlen kann (Bezahl-Anbieter angeschlossen, lib/labBilling.ts), wird für
 *  Nicht-Gründer etwas gesperrt – vorher ist alles für alle frei. */
export const freeForAll = () => !paymentsReady()
/** Preise Lab Pro (Entscheidung 1. Okt 2026) */
export const PRICES = { monthly: 2.99, yearly: 19.99, lifetime: 39.99 }
export const PRICE_LABEL = {
  monthly: t("{p}/Monat", { p: euro(PRICES.monthly, true) }),
  yearly: t("{p}/Jahr", { p: euro(PRICES.yearly, true) }),
  lifetime: t("{p} einmalig", { p: euro(PRICES.lifetime, true) }),
}
export const betaOpen = (today: string) => today <= BETA_END
export function betaDaysLeft(today: string): number {
  return Math.max(0, Math.round((Date.parse(`${BETA_END}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 86400000))
}
/** „30. Nov.“ bzw. „Nov 30“ */
export const betaEndLabel = () => new Date(`${BETA_END}T12:00:00`).toLocaleDateString(LOCALE, { day: "numeric", month: "short" })
export const SITE_URL = "https://kolbi-smoky.vercel.app"
const FEEDBACK_URL = "https://mkdfohmshuuiroeruyyz.supabase.co/functions/v1/lab-feedback"
/**
 * App-Version fürs Feedback (Backend erlaubt nur /^[0-9a-z.\-]{1,20}$/).
 * Store-/Web-Build (Vite): VITE_APP_VERSION oder die Version aus supplement-lab/package.json; die Store-App hängt
 * beim Start die Plattform an (setAppPlatform → „1.0.0-ios“, „1.0.0-android“, Web: „1.0.0-web“).
 * TRUE-Web (/lab, Next) setzt nichts → bleibt „0.9-beta“ wie bisher.
 */
const cleanVer = (v: string | undefined) => (v ?? "").toLowerCase().replace(/[^0-9a-z.\-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 12)
export const APP_VERSION = cleanVer(process.env.NEXT_PUBLIC_LAB_VERSION) || "0.9-beta"
let appPlatform = ""
/** Von supplement-lab/src/native.ts gesetzt (Capacitor.getPlatform(): "ios" | "android" | "web"). */
export function setAppPlatform(p: string) { appPlatform = /^[a-z]{1,7}$/.test(p) ? p : "" }
export const appVersion = () => (appPlatform && APP_VERSION !== "0.9-beta" ? `${APP_VERSION}-${appPlatform}` : APP_VERSION)

export type ProFeature = "patterns" | "costs" | "experiments" | "timing" | "calendar" | "community"
export const PRO_FEATURES: { id: ProFeature; emoji: string; title: string; text: string }[] = [
  { id: "patterns", emoji: "🔎", title: t("Muster-Detektor"), text: t("Muster in deinen eigenen Daten – z. B. am Tag nach Alkohol") },
  { id: "costs", emoji: "💸", title: t("Kosten & Sparen"), text: t("Was dein Stack kostet – und was du sparst") },
  { id: "experiments", emoji: "🧭", title: t("Alle Experimente"), text: t("Schlaf, Fokus, Ruhe, Training und mehr") },
  { id: "timing", emoji: "⏱️", title: t("Timing-Check"), text: t("Was mit Abstand, was zusammen – auf einen Blick") },
  { id: "calendar", emoji: "📅", title: t("Kalender-Abo"), text: t("Ergebnisse automatisch im Kalender") },
  // Community-Basis („Was andere erlebt haben“ in groben Worten) bleibt gratis – Pro bekommt die Tiefe (CEO, 6. Okt 2026)
  { id: "community", emoji: "👥", title: t("Community-Details"), text: t("Verteilung, einzelne Bereiche, Filter nach Ziel") },
]

/** Pro-Seite von überall öffnen (LabApp hört auf das Ereignis) */
export const openPaywall = (from?: ProFeature) => { try { window.dispatchEvent(new CustomEvent("lab-paywall", { detail: from })) } catch {} }

export function isPro(s: LabState): boolean { return freeForAll() || !!s.pro?.founder || !!s.pro?.purchased }

/** Nach erfolgreichem Kauf/Wiederherstellen lokal merken (Quelle der Wahrheit bleibt der Store) */
export function markPurchased(p: LabState, plan: Plan | "restored", today: string): LabState {
  p.pro = { ...p.pro, purchased: p.pro?.purchased ?? today, plan }
  return p
}

/** In der Beta einmalig den Gründer-Status vergeben (bleibt auch nach der Beta erhalten). */
export function claimFounder(p: LabState, today: string): LabState {
  if (betaOpen(today) && !p.pro?.founder) p.pro = { ...p.pro, founder: p.startDate && p.startDate <= today ? p.startDate : today }
  return p
}

// ── Freunde einladen ──────────────────────────────────────────────────────────
export async function inviteFriends(): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url = `${SITE_URL}${isEn ? "/en" : ""}/invite` // eigener Kanal-Link → Einladungen in der Statistik sichtbar
  const today = todayIso()
  const text = betaOpen(today)
    ? t("Ich teste gerade mit Kolbi, welche Supplements bei mir wirklich was bringen 🧪 Wer bis {date} startet, bekommt Pro für immer gratis:", { date: betaEndLabel() })
    : t("Ich teste gerade mit Kolbi, welche Supplements bei mir wirklich was bringen 🧪 Probier's aus:")
  try {
    if (navigator.share) { await navigator.share({ title: "Kolbi · Supplement Lab", text, url }); track("invite"); return "shared" }
  } catch (e) { if ((e as Error)?.name === "AbortError") return "cancelled" }
  try { await navigator.clipboard.writeText(`${text} ${url}`); track("invite"); return "copied" } catch { return "failed" }
}

// ── Bewertungs-Moment ─────────────────────────────────────────────────────────
/** Nur fragen, wenn es gerade gut läuft: genug Check-ins und ein Erfolgserlebnis; höchstens 3×, mit 30 Tagen Abstand. */
export function shouldAskReview(s: LabState, today: string): boolean {
  const r = s.review
  if (r?.answer === "love" || (r?.asked.length ?? 0) >= 3) return false
  const last = r?.asked[r.asked.length - 1]
  if (last && addDays(last, 30) > today) return false
  const checkins = Object.keys(s.checkins).length
  const kept = Object.values(s.verdicts).some(v => v.decision === "keep")
  return checkins >= 7 && (kept || streak(s) >= 7)
}
export function markReviewAsked(p: LabState, today: string, answer?: "love" | "ok" | "meh"): LabState {
  const asked = p.review?.asked ?? []
  p.review = { asked: asked.includes(today) ? asked : [...asked, today], answer: answer ?? p.review?.answer }
  return p
}

/**
 * In der Store-App: natives Bewertungs-Fenster (App Store / Google Play). Die Store-App registriert es
 * beim Start (supplement-lab/src/native.ts → @capacitor-community/in-app-review); im Web gibt es
 * keins → false (dann zeigt grow.tsx den eigenen „Danke“-Schritt mit Store-Link).
 * true heißt nur „Anfrage an das System gestellt“ – ob Apple/Google das Fenster wirklich zeigen
 * (Kontingent), verraten beide Systeme bewusst nicht.
 */
let reviewRequester: (() => Promise<void>) | null = null
export function setNativeReview(fn: (() => Promise<void>) | null) { reviewRequester = fn }
export async function nativeReview(): Promise<boolean> {
  if (!reviewRequester) return false
  try { await reviewRequester(); return true } catch { return false }
}

export async function sendFeedback(mood: "love" | "ok" | "meh", text: string, where: string): Promise<boolean> {
  try {
    const res = await fetch(FEEDBACK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mood, text, where, v: appVersion() }) })
    if (res.ok) track("feedback")
    return res.ok
  } catch { return false }
}
