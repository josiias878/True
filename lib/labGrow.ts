// ── Wachstum: Lab Pro (Beta = alles frei), Freunde einladen, Bewertungs-Moment, Feedback ──
import { addDays, streak, todayIso, type LabState } from "./supplementLab"
import { track } from "./labStats"
import { t, euro, LOCALE, isEn } from "./labI18n"

/** Beta-Ende: Wer bis einschließlich zu diesem Tag startet, wird „Gründer“ – Pro bleibt für immer gratis. */
export const BETA_END = "2026-11-30"
/** Erst wenn man wirklich bezahlen kann (App Store / Web), wird für Nicht-Gründer etwas gesperrt. */
export const PAYMENTS_READY = false
/** Solange true, ist alles für alle freigeschaltet. */
export const BETA = !PAYMENTS_READY
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
export const APP_VERSION = "0.9-beta"

export const PRO_FEATURES = [
  { emoji: "🔎", title: t("Muster-Detektor"), text: t("Was deinen Schlaf & deine Energie beeinflusst") },
  { emoji: "💸", title: t("Kosten & Sparen"), text: t("Was dein Stack kostet – und was du sparst") },
  { emoji: "🧭", title: t("Alle Experimente"), text: t("Schlaf, Fokus, Ruhe, Training und mehr") },
  { emoji: "📅", title: t("Kalender-Abo"), text: t("Ergebnisse automatisch im Kalender") },
  { emoji: "📊", title: t("Wochen-Story teilen"), text: t("Deine Woche als schönes Bild") },
  { emoji: "👥", title: t("Community-Vergleich"), text: t("Was andere mit demselben Supplement erlebt haben") },
]

export function isPro(s: LabState): boolean { return BETA || !!s.pro?.founder || !!s.pro?.purchased }

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

/** In der Store-App: natives Bewertungs-Fenster (Capacitor-Plugin, sobald eingebaut). Im Web: false. */
export async function nativeReview(): Promise<boolean> {
  const plugin = (globalThis as { Capacitor?: { Plugins?: Record<string, { requestReview?: () => Promise<void> }> } }).Capacitor?.Plugins?.InAppReview
  if (!plugin?.requestReview) return false
  try { await plugin.requestReview(); return true } catch { return false }
}

export async function sendFeedback(mood: "love" | "ok" | "meh", text: string, where: string): Promise<boolean> {
  try {
    const res = await fetch(FEEDBACK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mood, text, where, v: APP_VERSION }) })
    if (res.ok) track("feedback")
    return res.ok
  } catch { return false }
}
