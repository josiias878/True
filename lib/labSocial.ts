// ── Kolbi Social S1: reine Anzeige-Helfer (Pseudonym, Lab-Farben, Schwellen, Zeugnis, Feed-Reihenfolge) ──
// Keine Server-Aufrufe, keine Statistik. Pseudonym/Avatar werden lokal aus einer zufälligen ID erzeugt (kein Freitext).
import { GOALS, LIB_BY_ID, diffDays, phaseAt, suppStatus, type Category, type LabState, type LibSupp, type MySupp } from "./supplementLab"
import { COMMUNITY_MIN } from "./labCommunity"
import { t } from "./labI18n"

// ── Schwellen (PLAN.md, Entscheidung 6. Okt 2026) ────────────────────────────
/** ab hier grobe Worte („die meisten …“) */
export const WORDS_MIN = COMMUNITY_MIN
/** ab hier Prozente, Verteilung, Bereiche */
export const PCT_MIN = 20
/** Beschwerden erst ab so vielen Nennungen */
export const SIDE_MIN = 3

export type Tier = "none" | "words" | "pct"
export const tierOf = (n: number): Tier => (n >= PCT_MIN ? "pct" : n >= WORDS_MIN ? "words" : "none")

/** Grober Anteil „behalten“ in Worten (für n 5–19): großes Wort + Rest des Satzes. */
export function keepWords(pct: number): { big: string; rest: string } {
  if (pct >= 85) return { big: t("Fast alle"), rest: t("haben es behalten") }
  if (pct >= 60) return { big: t("Die meisten"), rest: t("haben es behalten") }
  if (pct >= 40) return { big: t("Etwa die Hälfte"), rest: t("hat es behalten") }
  if (pct >= 15) return { big: t("Einige"), rest: t("haben es behalten") }
  if (pct > 0) return { big: t("Wenige"), rest: t("haben es behalten") }
  return { big: t("Niemand"), rest: t("hat es bisher behalten") }
}

/** Beschwerden mit genug Nennungen (Anteil in % → Anzahl). */
export function sidesShown(sides: Record<string, number> | undefined, n: number): [string, number][] {
  return Object.entries(sides ?? {}).filter(([, p]) => Math.round((p / 100) * n) >= SIDE_MIN).sort((a, b) => b[1] - a[1])
}

// ── Lab-Farben (ruhige Akzente je Gruppe; nie als Textfarbe auf Grau) ────────
export type LabGroup = "schlaf" | "fokus" | "ruhe" | "training" | "energie" | "darm" | "haut" | "sonstiges"

export const LAB_GROUPS: Record<LabGroup, { color: string; label: string }> = {
  schlaf:    { color: "#6c7cff", label: t("Schlaf") },
  fokus:     { color: "#e9a23b", label: t("Fokus") },
  ruhe:      { color: "#2bb3a3", label: t("Ruhe") },
  training:  { color: "#f06a5a", label: t("Training") },
  energie:   { color: "#e3c341", label: t("Energie") },
  darm:      { color: "#8fb84a", label: t("Verdauung") },
  haut:      { color: "#e27fb0", label: t("Haut & Haare") },
  sonstiges: { color: "#8c8c99", label: t("Sonstiges") },
}

const BY_CATEGORY: Partial<Record<Category, LabGroup>> = {
  "Schlaf & Ruhe": "schlaf", "Energie & Fokus": "fokus", "Stress & Adaptogene": "ruhe", "Training": "training", "Darm & Immun": "darm",
}
const BY_GOAL: Record<string, LabGroup> = {
  schlaf: "schlaf", fokus: "fokus", stress: "ruhe", muskel: "training", regeneration: "training", energie: "energie", darm: "darm", haut: "haut",
}

/** Gruppe eines Supplements: zuerst die Kategorie, sonst das erste passende Ziel, sonst „Sonstiges“. */
export function labGroup(lib: LibSupp | undefined): LabGroup {
  if (!lib) return "sonstiges"
  const c = BY_CATEGORY[lib.category]
  if (c) return c
  for (const g of GOALS) if (g.suggest.includes(lib.id) && BY_GOAL[g.id]) return BY_GOAL[g.id]
  return "sonstiges"
}
export const labColor = (lib: LibSupp | undefined) => LAB_GROUPS[labGroup(lib)].color

// ── Pseudonym + Avatar (generiert, kein Freitext) ─────────────────────────────
const SEED_KEY = "lab-pseudo"

/** Zufälliger, lokal gespeicherter Startwert – übernimmt einmalig die anonyme Geräte-ID, falls vorhanden. */
export function socialSeed(): string {
  try {
    let v = localStorage.getItem(SEED_KEY)
    if (!v || !/^[a-f0-9]{8,32}$/.test(v)) {
      const d = localStorage.getItem("lab-device")
      if (d && /^[a-f0-9]{32}$/.test(d)) v = d
      else { const b = new Uint8Array(16); crypto.getRandomValues(b); v = Array.from(b, x => x.toString(16).padStart(2, "0")).join("") }
      localStorage.setItem(SEED_KEY, v)
    }
    return v
  } catch { return "5eed5eed" }
}

function hash(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}

const WORDS_DE = {
  a: ["Früh", "Mond", "Nacht", "Sonnen", "Wald", "Nebel", "Funken", "Stern", "Regen", "Wolken", "Berg", "See", "Wind", "Moos", "Tau", "Blitz"],
  n: ["Kolben", "Fuchs", "Becher", "Glas", "Tropfen", "Pipette", "Spatz", "Igel", "Otter", "Eule", "Biber", "Dachs", "Falke", "Luchs", "Kauz", "Hase"],
}
const WORDS_EN = {
  a: ["Early", "Moon", "Night", "Sun", "Forest", "Mist", "Spark", "Star", "Rain", "Cloud", "Peak", "Lake", "Wind", "Moss", "Dew", "Bolt"],
  n: ["Flask", "Fox", "Beaker", "Glass", "Drop", "Pipette", "Sparrow", "Hedgehog", "Otter", "Owl", "Beaver", "Badger", "Falcon", "Lynx", "Owlet", "Hare"],
}

/** „FrühKolben-04“ – deterministisch aus dem Startwert (gleiche Wörter-Position in DE und EN). */
export function pseudonym(seed: string, en: boolean): string {
  const h = hash(seed)
  const w = en ? WORDS_EN : WORDS_DE
  return `${w.a[h % 16]}${w.n[(h >>> 4) % 16]}-${String((h >>> 8) % 100).padStart(2, "0")}`
}

const AVATAR_BG: [string, string][] = [
  ["#2ECC8A", "#3987e5"], ["#3987e5", "#2ECC8A"], ["#1baf9a", "#3987e5"], ["#2ECC8A", "#1baf9a"],
]
/** Hintergrund für Kolbis Avatar-Kreis (Marken-Verlauf, Richtung je Startwert leicht anders). */
export function avatarBg(seed: string): string {
  const [a, b] = AVATAR_BG[(hash(seed) >>> 12) % AVATAR_BG.length]
  return `linear-gradient(135deg, ${a}, ${b})`
}

// ── Supplement-Zeugnis ────────────────────────────────────────────────────────
export type GradeKind = "keep" | "maybe" | "drop" | "running" | "constant" | "open" | "away" | "paused"
export interface Grade { supp: MySupp; kind: GradeKind; day?: number; days?: number }

export function reportCard(s: LabState, today: string): Grade[] {
  const w = phaseAt(s, today)
  const order: GradeKind[] = ["running", "keep", "maybe", "constant", "open", "drop", "away", "paused"]
  return s.supps.map(x => {
    const v = s.verdicts[x.id]?.decision
    const st = suppStatus(s, x.id, today).key
    if (st === "testing" && w) return { supp: x, kind: "running" as const, day: diffDays(w.start, today) + 1, days: w.days }
    if (v === "keep") return { supp: x, kind: "keep" as const }
    if (v === "maybe") return { supp: x, kind: "maybe" as const }
    if (v === "drop") return { supp: x, kind: "drop" as const }
    if (x.away) return { supp: x, kind: "away" as const }
    if (st === "constant") return { supp: x, kind: "constant" as const }
    if (st === "paused") return { supp: x, kind: "paused" as const }
    return { supp: x, kind: "open" as const }
  }).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
}

// ── Feed-Reihenfolge: eigene Labs, dann eigene Ziele, dann nach Datenmenge – nie nach Wirkung ──
export interface FeedEntry { lib: LibSupp; n: number; keepPct: number | null; mine: boolean }

export function feedOrder(s: LabState, libs: Record<string, { n: number; keepPct: number | null }>): FeedEntry[] {
  const mine = new Set(s.supps.map(x => x.lib).filter(Boolean) as string[])
  const goal = new Set(GOALS.filter(g => s.goals.includes(g.id)).flatMap(g => g.suggest))
  return Object.entries(libs)
    .filter(([id, v]) => LIB_BY_ID[id] && typeof v?.n === "number" && v.n >= WORDS_MIN)
    .map(([id, v]) => ({ lib: LIB_BY_ID[id], n: v.n, keepPct: typeof v.keepPct === "number" ? v.keepPct : null, mine: mine.has(id) }))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || Number(goal.has(b.lib.id)) - Number(goal.has(a.lib.id)) || b.n - a.n || a.lib.name.localeCompare(b.lib.name))
}
