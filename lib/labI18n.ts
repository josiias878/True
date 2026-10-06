// ── Sprache: Deutsch (Quelle) / Englisch ───────────────────────────────────────
// Der deutsche Text ist der Schlüssel: t("Deutscher Text") → in Englisch die Übersetzung, sonst unverändert.
// Platzhalter: t("Noch {n} Tage", { n: 3 }). Die Sprache steht beim Laden fest (Wechsel = Neuladen),
// damit auch Konstanten (Bibliothek, Abzeichen …) übersetzt sind.
// Nur die eigenständige App (supplement-lab) setzt window.__LAB_STANDALONE__ → get-true.de/lab bleibt Deutsch.
import { EN_A } from "./i18n/en-a"
import { EN_B } from "./i18n/en-b"
import { EN_C } from "./i18n/en-c"
import { EN_D } from "./i18n/en-d"
import { EN_E } from "./i18n/en-e"
import { EN_F } from "./i18n/en-f"
import { EN_H } from "./i18n/en-h"

export type Lang = "de" | "en"
const KEY = "lab-lang"

function detect(): Lang {
  if (typeof window === "undefined" || !(window as { __LAB_STANDALONE__?: boolean }).__LAB_STANDALONE__) return "de"
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === "de" || saved === "en") return saved
  } catch {}
  const nav = (navigator.languages?.[0] ?? navigator.language ?? "de").toLowerCase()
  return nav.startsWith("de") ? "de" : "en"
}

export const LANG: Lang = detect()
export const isEn = LANG === "en"
/** Für Datums- und Zahlenformate */
export const LOCALE = isEn ? "en-US" : "de-DE"

const ALL: Record<string, string> = { ...EN_A, ...EN_B, ...EN_C, ...EN_D, ...EN_E, ...EN_F, ...EN_H }
const DICT: Record<string, string> = isEn ? ALL : {}
let REV: Record<string, string> | null = null
/** Englischen Text auf den deutschen Originaltext zurückführen (z. B. gespeicherte Namen nach Sprachwechsel). */
export function toDe(s: string): string {
  if (!REV) { REV = {}; for (const [de, en] of Object.entries(ALL)) if (!(en in REV)) REV[en] = de }
  return REV[s] ?? s
}
const missing = new Set<string>()

export function t(de: string, vars?: Record<string, string | number>): string {
  let s = de
  if (isEn) {
    const en = DICT[de]
    if (en != null) s = en
    else if (typeof window !== "undefined" && (window as { __LAB_I18N_DEBUG__?: boolean }).__LAB_I18N_DEBUG__ && !missing.has(de)) { missing.add(de); console.warn("[i18n] fehlt:", de) }
  }
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

/** Sprache umschalten (nur eigenständige App) – lädt neu, damit alles in der neuen Sprache aufgebaut wird. */
export function setLang(l: Lang) {
  try { localStorage.setItem(KEY, l) } catch {}
  location.reload()
}
export const canSwitchLang = () => typeof window !== "undefined" && !!(window as { __LAB_STANDALONE__?: boolean }).__LAB_STANDALONE__

// ── Formate ───────────────────────────────────────────────────────────────────
/** Zahl mit fester Nachkommastelle im richtigen Dezimaltrennzeichen: 3,6 bzw. 3.6 */
export const dec = (n: number, digits = 1) => { const s = n.toFixed(digits); return isEn ? s : s.replace(".", ",") }
/** Euro-Betrag: „16,90 €“ bzw. „€16.90“ */
export const euro = (v: number, exact = false) => {
  const num = v < 10 || (exact && !Number.isInteger(v)) ? v.toFixed(2) : Math.round(v).toLocaleString(LOCALE)
  return isEn ? `€${num}` : `${num.includes(".") && /\.\d\d$/.test(num) ? num.replace(/\.(\d\d)$/, ",$1") : num} €`
}
/** Uhrzeit-Anzeige: „08:30 Uhr“ bzw. „8:30 AM“ wäre verwirrend neben Eingabefeldern → „08:30“ */
export const clock = (hhmm: string) => (isEn ? hhmm : `${hhmm} Uhr`)
