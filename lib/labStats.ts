// ── Anonyme Nutzungsstatistik (nur eigenständige App, abschaltbar) ─────────────
// Zählt nur, DASS etwas passiert (z. B. „erster Check-in“), mit Sprache und Herkunftskanal (?src=reddit).
// Keine Geräte-ID, keine Inhalte, keine Gesundheitswerte. Server: Supabase-Funktion lab-stats.
import { LANG, canSwitchLang } from "./labI18n"

const URL_ = "https://mkdfohmshuuiroeruyyz.supabase.co/functions/v1/lab-stats"
export type StatEvent =
  | "onboarding_view" | "demo" | "onboarded" | "onboarded_pwa" | "first_checkin" | "checkin" | "checkins_3" | "checkins_7" | "checkins_14" | "checkins_30"
  | "verdict" | "experiment" | "push_on" | "invite" | "share_card" | "recap" | "review_love" | "review_ok" | "review_meh" | "feedback"
  | "paywall_view" | "purchase" | "restore"
  // Neu (Morgen-Frage / Extra-Einnahme): reine Zähler ohne Inhalte. Server-Allow-Liste (supabase/functions/lab-stats) muss
  // noch ergänzt + deployt werden – bis dahin antwortet der Server mit 400 und es wird nichts gezählt (harmlos).
  | "morning_checkin" | "extra_intake"

let cfg = { off: false, src: "" }
/** Feste Quelle für Test-Builds (z. B. VITE_STATS_SRC=playtest beim Build) – gilt nur, wenn kein Start-Link-Kanal da ist. */
const BUILD_SRC = /^[a-z]{1,20}$/.test(process.env.NEXT_PUBLIC_LAB_STATS_SRC ?? "") ? process.env.NEXT_PUBLIC_LAB_STATS_SRC! : ""
/** Von der App bei jeder Änderung gesetzt (Einstellung „Statistik“ + Herkunftskanal aus dem Start-Link). */
export function configureStats(off: boolean, src?: string) { cfg = { off, src: src ?? "" } }

const once = new Set<StatEvent>()
/** Ereignis, das pro Seitenaufruf nur einmal zählen soll (z. B. Onboarding-Ansicht) */
export function trackOnce(e: StatEvent) { if (once.has(e)) return; once.add(e); track(e) }

export function track(e: StatEvent) {
  if (cfg.off || !canSwitchLang()) return // nur die eigenständige App, nicht get-true.de
  try {
    void fetch(URL_, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ e, lang: LANG, src: cfg.src || BUILD_SRC }) }).catch(() => {})
  } catch {}
}

/** Herkunftskanal aus dem Start-Link (?src=reddit), nur Kleinbuchstaben */
export function srcFromUrl(): string | undefined {
  try { const v = new URLSearchParams(location.search).get("src") ?? ""; return /^[a-z]{1,20}$/.test(v) ? v : undefined } catch { return undefined }
}

const MILESTONES: Record<number, StatEvent> = { 1: "first_checkin", 3: "checkins_3", 7: "checkins_7", 14: "checkins_14", 30: "checkins_30" }
/** Nach einem neuen Check-in: Zähler + ggf. Meilenstein (1., 3., 7., 14., 30. Check-in) */
export function trackCheckin(total: number) { track("checkin"); const m = MILESTONES[total]; if (m) track(m) }
