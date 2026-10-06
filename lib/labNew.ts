// ── „Neu“-Kennzeichnung: frisch hinzugekommene Funktionen ─────────────────────────
// Eine Funktion gilt NEW_DAYS Tage ab `since` als neu – oder bis der Nutzer sie einmal geöffnet hat
// (markSeen → localStorage „lab-new-seen“). Reine Anzeige-Hilfe, ohne Abhängigkeiten (läuft auch in Next/SSR).

export type NewFeature = {
  /** Frei wählbare Kennung (für Pro-Funktionen = ProFeature-id aus lib/labGrow.ts) */
  id: string
  /** Erster Tag als „neu“ (YYYY-MM-DD) */
  since: string
  /** Gehört zu einer übergeordneten Funktion (z. B. Alkohol-Muster → Muster-Detektor „patterns“):
   *  Die übergeordnete gilt als neu, solange eins ihrer Kinder neu ist. */
  parent?: string
}

/** Wie lange „Neu“ höchstens angezeigt wird */
export const NEW_DAYS = 21

export const NEW_FEATURES: NewFeature[] = [
  // Tagesrunde / Heute (Feedback-Runde Okt 2026)
  { id: "morning-question", since: "2026-10-06" }, // Morgen-Frage (Nacht auf …)
  { id: "extra-taken", since: "2026-10-06" }, // „Zusätzlich genommen“
  { id: "complaints", since: "2026-10-06" }, // Beschwerden + Vermutungen
  { id: "taken-check", since: "2026-10-06" }, // „✓ Genommen“
  { id: "alcohol-pattern", since: "2026-10-06", parent: "patterns" }, // Muster „Am Tag nach Alkohol“
  // Lab Pro
  { id: "community", since: "2026-10-06" }, // Community-Details (Verteilung und einzelne Bereiche)
]

const KEY = "lab-new-seen"
const EVENT = "lab-new-seen"

/** Bereits geöffnete „neue“ Funktionen (leer, wenn kein Speicher verfügbar ist) */
export function seenNew(): string[] {
  try {
    if (typeof window === "undefined") return []
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch { return [] }
}

/** Funktion als „gesehen“ merken – das Abzeichen verschwindet (überall, sofort). */
export function markSeen(id: string) {
  try {
    const seen = seenNew()
    if (seen.includes(id)) return
    localStorage.setItem(KEY, JSON.stringify([...seen, id].slice(-100)))
  } catch {}
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: id })) } catch {}
}

/** Auf Änderungen an „gesehen“ hören (für Abzeichen, die sich live ausblenden). Gibt das Abmelden zurück. */
export function onSeenChange(fn: () => void): () => void {
  try {
    window.addEventListener(EVENT, fn)
    return () => window.removeEventListener(EVENT, fn)
  } catch { return () => {} }
}

/** Tage zwischen zwei ISO-Daten (b − a), Zeitzonen-sicher über die Tagesmitte */
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000)

function fresh(f: NewFeature, today: string, seen: string[]): boolean {
  if (seen.includes(f.id)) return false
  const d = dayDiff(f.since, today)
  return Number.isFinite(d) && d >= 0 && d < NEW_DAYS
}

/**
 * Ist die Funktion gerade „neu“? true ab `since` für NEW_DAYS Tage, solange sie nicht geöffnet wurde.
 * Eine übergeordnete Funktion (parent) ist neu, wenn sie selbst oder eins ihrer Kinder neu ist.
 * `seen` weglassen → aus localStorage gelesen.
 */
export function isNew(id: string, today: string, seen: string[] = seenNew()): boolean {
  return NEW_FEATURES.some(f => (f.id === id || (f.parent === id && !seen.includes(id))) && fresh(f, today, seen))
}
