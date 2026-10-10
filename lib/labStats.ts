// ── Anonyme Nutzungsstatistik (nur eigenständige App, abschaltbar) ─────────────
// Zählt nur, DASS etwas passiert (z. B. „erster Check-in“), mit Sprache und Herkunftskanal (?src=reddit).
// Keine Geräte-ID, keine Inhalte, keine Gesundheitswerte. Server: Supabase-Funktion lab-stats.
import { LANG, canSwitchLang } from "./labI18n"
import { diffDays, todayIso } from "./supplementLab"

const URL_ = "https://mkdfohmshuuiroeruyyz.supabase.co/functions/v1/lab-stats"
export type StatEvent =
  | "onboarding_view" | "demo" | "onboarded" | "onboarded_pwa" | "first_checkin" | "checkin" | "checkins_3" | "checkins_7" | "checkins_14" | "checkins_30"
  | "verdict" | "experiment" | "push_on" | "invite" | "share_card" | "recap" | "review_love" | "review_ok" | "review_meh" | "feedback"
  | "paywall_view" | "purchase" | "restore"
  // Morgen-Frage / Extra-Einnahme: reine Zähler ohne Inhalte
  | "morning_checkin" | "extra_intake"
  // Startklar-Trichter: Onboarding-Schritte, Check-in am Starttag, Wiederkommen ab Tag 2 bzw. Tag 7 (je einmal pro Gerät)
  | "onb_0" | "onb_1" | "onb_2" | "onb_3" | "onb_4" | "start_checkin" | "app_open_d2" | "app_open_d7"
// Jede Erweiterung braucht denselben Eintrag in der Allow-Liste von supabase/functions/lab-stats/index.ts (sonst 400, harmlos).

let cfg = { off: false, src: "" }
/** Feste Quelle für Test-Builds (z. B. VITE_STATS_SRC=playtest beim Build) – gilt nur, wenn kein Start-Link-Kanal da ist. */
const BUILD_SRC = /^[a-z]{1,20}$/.test(process.env.NEXT_PUBLIC_LAB_STATS_SRC ?? "") ? process.env.NEXT_PUBLIC_LAB_STATS_SRC! : ""
/** Von der App bei jeder Änderung gesetzt (Einstellung „Statistik“ + Herkunftskanal aus dem Start-Link). */
export function configureStats(off: boolean, src?: string) { cfg = { off, src: src ?? "" } }

const once = new Set<StatEvent>()
/** Ereignis, das pro Seitenaufruf nur einmal zählen soll (z. B. Onboarding-Schritt). Ereignisse aus DEVICE_ONCE zählen
 *  sogar nur einmal pro Gerät (zählt Personen statt Neuladen). */
export function trackOnce(e: StatEvent) {
  if (once.has(e)) return
  once.add(e)
  if (!DEVICE_ONCE.has(e)) { track(e); return }
  const seen = readSent()
  if (seen?.includes(e)) return
  if (track(e) && seen) writeSent([...seen, e]) // Merker nur, wenn wirklich gesendet (Statistik aus → später nachholbar)
}

/** Sendet das Ereignis; true = Anfrage abgeschickt (nicht: angekommen). */
export function track(e: StatEvent): boolean {
  if (cfg.off || !canSwitchLang()) return false // nur die eigenständige App, nicht get-true.de
  try {
    void fetch(URL_, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ e, lang: LANG, src: cfg.src || BUILD_SRC }) }).catch(() => {})
    return true
  } catch { return false }
}

// Lokaler Merker „schon einmal gesendet“ – eigener Schlüssel, getrennt vom Nutzerstand (true-supplement-lab-v1),
// enthält nur Ereignisnamen, wird nie übertragen.
const DEVICE_ONCE = new Set<StatEvent>(["onboarding_view", "app_open_d2", "app_open_d7"])
const SENT_KEY = "true-supplement-lab-stats-sent-v1"
/** null = Speicher nicht nutzbar (privates Fenster o. Ä.) → dann nur pro Seitenaufruf, nichts merken */
function readSent(): StatEvent[] | null {
  let raw: string | null
  try { raw = localStorage.getItem(SENT_KEY) } catch { return null }
  try { const v = JSON.parse(raw ?? "[]"); return Array.isArray(v) ? v.filter((x): x is StatEvent => typeof x === "string") : [] } catch { return [] } // kaputt → neu anfangen
}
function writeSent(v: StatEvent[]) { try { localStorage.setItem(SENT_KEY, JSON.stringify(v)) } catch {} }

/** Beim App-Start: Wiederkommen ab Tag 2 (≥1 Tag nach dem Startdatum) bzw. Tag 7 (≥6 Tage) – je einmal pro Gerät,
 *  nicht im Demo-Modus. Erwartet, dass configureStats vorher lief. */
export function trackAppOpen(startDate: string | null | undefined, demo?: boolean) {
  if (!startDate || demo || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return
  const days = diffDays(startDate, todayIso())
  if (days >= 1) trackOnce("app_open_d2")
  if (days >= 6) trackOnce("app_open_d7")
}

/** Herkunftskanal aus dem Start-Link (?src=reddit), nur Kleinbuchstaben */
export function srcFromUrl(): string | undefined {
  try { const v = new URLSearchParams(location.search).get("src") ?? ""; return /^[a-z]{1,20}$/.test(v) ? v : undefined } catch { return undefined }
}

const MILESTONES: Record<number, StatEvent> = { 1: "first_checkin", 3: "checkins_3", 7: "checkins_7", 14: "checkins_14", 30: "checkins_30" }
/** Nach einem neuen Check-in: Zähler + ggf. Meilenstein (1., 3., 7., 14., 30. Check-in) */
export function trackCheckin(total: number) { track("checkin"); const m = MILESTONES[total]; if (m) track(m) }
