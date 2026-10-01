// ── Wachstum: Lab Pro (Beta = alles frei), Freunde einladen, Bewertungs-Moment, Feedback ──
import { addDays, streak, type LabState } from "./supplementLab"

/** Solange true, ist alles freigeschaltet und jeder Nutzer wird „Gründer“ (Pro bleibt dauerhaft). */
export const BETA = true
export const PRO_PRICE = "1,99 €"
export const SITE_URL = "https://kolbi-smoky.vercel.app"
const FEEDBACK_URL = "https://mkdfohmshuuiroeruyyz.supabase.co/functions/v1/lab-feedback"
export const APP_VERSION = "0.9-beta"

export const PRO_FEATURES = [
  { emoji: "🔎", title: "Muster-Detektor", text: "Was deinen Schlaf & deine Energie beeinflusst" },
  { emoji: "💸", title: "Kosten & Sparen", text: "Was dein Stack kostet – und was du sparst" },
  { emoji: "🧭", title: "Alle Experimente", text: "Schlaf, Fokus, Ruhe, Training und mehr" },
  { emoji: "📅", title: "Kalender-Abo", text: "Ergebnisse automatisch im Kalender" },
  { emoji: "📊", title: "Wochen-Story teilen", text: "Deine Woche als schönes Bild" },
  { emoji: "👥", title: "Community-Vergleich", text: "Was andere mit demselben Supplement erlebt haben" },
]

export function isPro(s: LabState): boolean { return BETA || !!s.pro?.founder || !!s.pro?.purchased }

/** In der Beta einmalig den Gründer-Status vergeben (bleibt auch nach der Beta erhalten). */
export function claimFounder(p: LabState, today: string): LabState {
  if (BETA && !p.pro?.founder) p.pro = { ...p.pro, founder: today }
  return p
}

// ── Freunde einladen ──────────────────────────────────────────────────────────
export async function inviteFriends(): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url = `${SITE_URL}/?ref=invite`
  const text = "Ich teste gerade mit Kolbi, welche Supplements bei mir wirklich was bringen 🧪 Probier's aus:"
  try {
    if (navigator.share) { await navigator.share({ title: "Kolbi · Supplement Lab", text, url }); return "shared" }
  } catch (e) { if ((e as Error)?.name === "AbortError") return "cancelled" }
  try { await navigator.clipboard.writeText(`${text} ${url}`); return "copied" } catch { return "failed" }
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
    return res.ok
  } catch { return false }
}
