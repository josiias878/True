// ── Kolbi Social S1: reine Anzeige-Helfer (Pseudonym, Lab-Farben, Schwellen, Zeugnis, Feed-Reihenfolge) ──
// Keine Server-Aufrufe, keine Statistik. Pseudonym/Avatar nur lokal – aus eigener Zufalls-ID bzw. fester Auswahl (kein Freitext).
import { GOALS, LIB_BY_ID, diffDays, phaseAt, suppStatus, type Category, type LabState, type LibSupp, type MySupp } from "./supplementLab"
import { COMMUNITY_MIN } from "./labCommunity"
import { t } from "./labI18n"
import type { Mood } from "./labCoach"

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
// Eigene Zufalls-ID nur fürs Pseudonym – bewusst NICHT aus „lab-device“ (sonst mit geteilten Ergebnissen verknüpfbar).
const PSEUDO_KEY = "lab-pseudo-seed"
const OLD_PSEUDO_KEY = "lab-pseudo"
const ROLL_KEY = "lab-pseudo-rolls"
const AVATAR_KEY = "lab-avatar"
const HEX = /^[a-f0-9]{8,32}$/

const listeners = new Set<() => void>()
/** Für useSyncExternalStore: meldet Änderungen an Pseudonym/Avatar. */
export function subscribeSocial(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
const emit = () => listeners.forEach(l => l())

function randHex(bytes: number): string {
  const b = new Uint8Array(bytes); crypto.getRandomValues(b)
  return Array.from(b, x => x.toString(16).padStart(2, "0")).join("")
}
const nameKey = (seed: string) => { const h = hash(seed); return `${h % 16}.${(h >>> 4) % 16}.${(h >>> 8) % 100}` }

/** Neue Zufalls-ID, die denselben Namen ergibt wie `old` – so bleibt das bisherige Pseudonym, die alte ID verschwindet. */
function sameNameSeed(old: string): string {
  const want = nameKey(old), base = randHex(12)
  for (let i = 0; i < 2_000_000; i++) { const c = base + i.toString(16).padStart(8, "0"); if (nameKey(c) === want) return c }
  return randHex(16)
}

/** Startwert fürs Pseudonym (lokal). Übernimmt beim ersten Start einmalig den bisherigen Namen. */
export function pseudoSeed(): string {
  try {
    let v = localStorage.getItem(PSEUDO_KEY)
    if (v && HEX.test(v)) return v
    const old = localStorage.getItem(OLD_PSEUDO_KEY)
    v = old && HEX.test(old) ? sameNameSeed(old) : randHex(16)
    localStorage.setItem(PSEUDO_KEY, v)
    localStorage.removeItem(OLD_PSEUDO_KEY)
    return v
  } catch { return "5eed5eed" }
}

export const REROLL_MAX = 3
function rollsToday(today: string): number {
  try {
    const r = JSON.parse(localStorage.getItem(ROLL_KEY) || "null")
    return r && r.d === today && typeof r.n === "number" ? Math.max(0, Math.min(REROLL_MAX, r.n)) : 0
  } catch { return 0 }
}
export const rerollsLeft = (today: string) => REROLL_MAX - rollsToday(today)

/** „Anderen Namen“: neue Zufalls-ID (anderer Name), max. 3× pro Tag. false = heute keine mehr übrig. */
export function rerollPseudonym(today: string): boolean {
  const used = rollsToday(today)
  if (used >= REROLL_MAX) return false
  try {
    const cur = nameKey(pseudoSeed())
    let v = randHex(16)
    for (let i = 0; i < 20 && nameKey(v) === cur; i++) v = randHex(16)
    localStorage.setItem(PSEUDO_KEY, v)
    localStorage.setItem(ROLL_KEY, JSON.stringify({ d: today, n: used + 1 }))
  } catch { return false }
  emit()
  return true
}

// ── Avatar-Baukasten (nur Auswahl aus festen Listen) ─────────────────────────
export const AVATAR_COLORS: { id: string; bg: string; label: string }[] = [
  { id: "kolbi",    bg: "linear-gradient(135deg, #2ECC8A, #3987e5)", label: t("Kolbi-Verlauf") },
  { id: "blau",     bg: "linear-gradient(135deg, #3987e5, #6c7cff)", label: t("Labor-Blau") },
  { id: "violett",  bg: "linear-gradient(135deg, #9085e9, #6c7cff)", label: t("Violett") },
  { id: "rosa",     bg: "linear-gradient(135deg, #e87ba4, #e27fb0)", label: t("Rosa") },
  { id: "tuerkis",  bg: "linear-gradient(135deg, #2bb3a3, #2ECC8A)", label: t("Türkis") },
  { id: "bernstein", bg: "linear-gradient(135deg, #e3c341, #e9a23b)", label: t("Bernstein") },
  { id: "koralle",  bg: "linear-gradient(135deg, #f06a5a, #e87ba4)", label: t("Koralle") },
  { id: "oliv",     bg: "linear-gradient(135deg, #8fb84a, #2bb3a3)", label: t("Oliv") },
]
export type AvatarAccessory = "none" | "shades" | "nightcap"
export const AVATAR_ACCESSORIES: { id: AvatarAccessory; label: string }[] = [
  { id: "none", label: t("Keins") }, { id: "shades", label: t("😎 Sonnenbrille") }, { id: "nightcap", label: t("🌙 Schlafmütze") },
]
export const AVATAR_MOODS: { id: Mood; label: string }[] = [
  { id: "happy", label: t("Fröhlich") }, { id: "party", label: t("Feiernd") }, { id: "think", label: t("Grübelnd") },
  { id: "sleepy", label: t("Verschlafen") }, { id: "alert", label: t("Überrascht") },
]
export interface LabAvatar { color: string; accessory: AvatarAccessory; mood: Mood }
export const DEFAULT_AVATAR: LabAvatar = { color: "kolbi", accessory: "none", mood: "happy" }

let avCache: { raw: string | null; v: LabAvatar | null } = { raw: null, v: null }
/** Gespeicherter Avatar oder null (= noch nie gebaut). Unbekannte Werte werden verworfen. */
export function loadAvatar(): LabAvatar | null {
  let raw: string | null = null
  try { raw = localStorage.getItem(AVATAR_KEY) } catch { return null }
  if (raw === avCache.raw) return avCache.v
  let v: LabAvatar | null = null
  try {
    const o = raw ? JSON.parse(raw) : null
    if (o && typeof o === "object") v = {
      color: AVATAR_COLORS.some(c => c.id === o.color) ? o.color : DEFAULT_AVATAR.color,
      accessory: AVATAR_ACCESSORIES.some(a => a.id === o.accessory) ? o.accessory : DEFAULT_AVATAR.accessory,
      mood: AVATAR_MOODS.some(m => m.id === o.mood) ? o.mood : DEFAULT_AVATAR.mood,
    }
  } catch { v = null }
  avCache = { raw, v }
  return v
}
export function saveAvatar(a: LabAvatar) {
  try { localStorage.setItem(AVATAR_KEY, JSON.stringify({ color: a.color, accessory: a.accessory, mood: a.mood })) } catch { /* privat/voll */ }
  emit()
}
export const avatarColorBg = (id: string) => (AVATAR_COLORS.find(c => c.id === id) ?? AVATAR_COLORS[0]).bg

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
