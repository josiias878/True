// ── Supplement Lab ────────────────────────────────────────────────────────────
// Selbstexperiment: 1 Woche Reset (nichts nehmen) → Supplements & Peptide einzeln
// testen → Vergleich mit der Baseline → persönlicher Stack mit perfektem Tagesplan.
// Alles lokal im Browser (localStorage), kein Login nötig.

/**
 * Store-Version (eigenständige App für App Store / Google Play):
 * Research-Peptide sind nicht in der Bibliothek — sie können nur neutral als eigene
 * Substanz angelegt werden (keine Beschreibungen, Dosierungen oder Injektionshinweise).
 * Wird im Vite-Build der App gesetzt, im TRUE-Web ist es aus.
 */
export const STORE_MODE = process.env.NEXT_PUBLIC_LAB_STORE === "1"
/** Basis-Pfad der App (TRUE: /lab, Store-App: /) */
export const LAB_BASE = STORE_MODE ? "/" : "/lab"

// ── Dimensionen für den Check-in ────────────────────────────────────────────────

export type Dim =
  | "energie" | "fokus" | "stimmung" | "ruhe" | "schlaf" | "koerper" | "verdauung"
  | "appetit" | "haut" | "gelenke" | "libido"

export interface DimInfo { id: Dim; label: string; emoji: string; question: string; hint: string; core?: boolean }

export const DIMS: DimInfo[] = [
  { id: "energie",   label: "Energie",     emoji: "⚡", question: "Wie viel Energie hattest du?", hint: "Wie wach und leistungsfähig warst du?", core: true },
  { id: "fokus",     label: "Fokus",       emoji: "🎯", question: "Wie klar war dein Kopf?", hint: "Konzentration, klarer Kopf, kein Nebel", core: true },
  { id: "stimmung",  label: "Stimmung",    emoji: "☀️", question: "Wie war deine Stimmung?", hint: "Gut gelaunt oder eher niedergeschlagen?", core: true },
  { id: "ruhe",      label: "Ruhe",        emoji: "🌊", question: "Wie entspannt warst du?", hint: "5 = entspannt, 1 = gestresst oder nervös", core: true },
  { id: "schlaf",    label: "Schlaf",      emoji: "🌙", question: "Wie gut hast du geschlafen?", hint: "Letzte Nacht: Einschlafen, Durchschlafen, Aufwachen", core: true },
  { id: "koerper",   label: "Körper",      emoji: "💪", question: "Wie fit hat sich dein Körper angefühlt?", hint: "Kraft, Fitness, Erholung nach dem Sport", core: true },
  { id: "verdauung", label: "Verdauung",   emoji: "🌿", question: "Wie lief deine Verdauung?", hint: "Bauchgefühl im wörtlichen Sinn: Blähungen, Toilette", core: true },
  { id: "appetit",   label: "Appetit",     emoji: "🍽️", question: "Wie gut hattest du Hunger im Griff?", hint: "5 = kein Heißhunger, gut satt", },
  { id: "haut",      label: "Haut & Haar", emoji: "✨", question: "Wie sahen Haut & Haare aus?", hint: "Hautbild, Pickel, Haare" },
  { id: "gelenke",   label: "Gelenke",     emoji: "🦴", question: "Wie schmerzfrei waren Gelenke & Sehnen?", hint: "5 = keine Schmerzen, 1 = starke Schmerzen" },
  { id: "libido",    label: "Lust",        emoji: "🔥", question: "Wie war deine Lust auf Sex (Libido)?", hint: "Lust auf Sex (Libido)" },
]
export const DIM_BY_ID = Object.fromEntries(DIMS.map(d => [d.id, d])) as Record<Dim, DimInfo>

export const FACES = ["😣", "😕", "😐", "🙂", "🤩"]
export const FACE_LABELS = ["Mies", "Meh", "Okay", "Gut", "Top"]

/** Störfaktoren: machen einen Tag „unfair“ — werden in der Auswertung markiert. */
export const TAGS = ["Wenig geschlafen", "Viel Stress", "Training", "Alkohol", "Krank", "Reise", "Spät gegessen", "Motiviert", "Guter Pump"]

// ── Nebenwirkungen ─────────────────────────────────────────────────────────────

export interface SideInfo { id: string; label: string; emoji: string }
export const SIDE_EFFECTS: SideInfo[] = [
  { id: "kopfschmerz",  label: "Kopfschmerzen",        emoji: "🤕" },
  { id: "uebelkeit",    label: "Übelkeit",             emoji: "🤢" },
  { id: "durchfall",    label: "Durchfall",            emoji: "💩" },
  { id: "verstopfung",  label: "Verstopfung",          emoji: "🧱" },
  { id: "blaehungen",   label: "Blähungen / Magen",    emoji: "🎈" },
  { id: "unruhe",       label: "Unruhe / nervös",      emoji: "😬" },
  { id: "herzrasen",    label: "Herzrasen",            emoji: "💓" },
  { id: "schlafprob",   label: "Schlafprobleme",       emoji: "😵‍💫" },
  { id: "traeume",      label: "Intensive Träume",     emoji: "🌀" },
  { id: "muede",        label: "Müde / benommen",      emoji: "🥱" },
  { id: "schwindel",    label: "Schwindel",            emoji: "💫" },
  { id: "kribbeln",     label: "Kribbeln / Taubheit",  emoji: "✋" },
  { id: "wasser",       label: "Wassereinlagerung",    emoji: "💧" },
  { id: "haut",         label: "Haut / Juckreiz",      emoji: "🔴" },
  { id: "einstich",     label: "Einstichstelle gereizt", emoji: "📍" },
  { id: "hunger",       label: "Heißhunger",           emoji: "🍩" },
  { id: "stimmungstief", label: "Gereizt / Stimmungstief", emoji: "🌧️" },
  { id: "libido_runter", label: "Libido ↓",            emoji: "📉" },
]
export const SIDE_BY_ID = Object.fromEntries(SIDE_EFFECTS.map(x => [x.id, x])) as Record<string, SideInfo>

/** Bekannte mögliche Nebenwirkungen pro Supplement (werden beim Check-in zuerst angeboten). */
export const LIB_SIDES: Record<string, string[]> = {
  bpc157: ["einstich", "uebelkeit", "schwindel", "muede"],
  tb500: ["einstich", "muede", "kopfschmerz"],
  ghkcu: ["einstich", "haut"],
  "cjc-ipa": ["wasser", "kribbeln", "hunger", "einstich", "muede", "kopfschmerz"],
  semax: ["unruhe", "kopfschmerz", "schlafprob"],
  selank: ["muede", "kopfschmerz"],
  motsc: ["einstich", "herzrasen", "schlafprob"],
  epitalon: ["einstich", "muede"],
  ta1: ["einstich", "muede"],
  kpv: ["uebelkeit", "blaehungen"],
  glp1: ["uebelkeit", "verstopfung", "durchfall", "blaehungen", "muede", "stimmungstief"],
  magnesium: ["durchfall", "blaehungen", "traeume", "muede"],
  glycin: ["blaehungen", "muede"],
  melatonin: ["muede", "kopfschmerz", "traeume", "schwindel", "stimmungstief"],
  theanin: ["muede", "kopfschmerz"],
  koffein: ["unruhe", "herzrasen", "schlafprob", "kopfschmerz", "blaehungen"],
  rhodiola: ["unruhe", "schlafprob", "kopfschmerz"],
  ashwagandha: ["muede", "blaehungen", "stimmungstief", "libido_runter"],
  vitd: ["uebelkeit", "kopfschmerz"],
  omega3: ["blaehungen", "uebelkeit", "durchfall"],
  zink: ["uebelkeit", "blaehungen"],
  eisen: ["verstopfung", "uebelkeit", "blaehungen"],
  b12: ["unruhe", "haut", "schlafprob"],
  bkomplex: ["unruhe", "uebelkeit", "schlafprob"],
  vitc: ["durchfall", "blaehungen"],
  probiotika: ["blaehungen", "durchfall"],
  kreatin: ["wasser", "blaehungen", "durchfall"],
  citrullin: ["blaehungen", "durchfall"],
  betaalanin: ["kribbeln"],
  elektrolyte: ["blaehungen", "durchfall"],
  kollagen: ["blaehungen"],
  q10: ["blaehungen", "schlafprob"],
  lionsmane: ["blaehungen", "haut"],
  curcumin: ["blaehungen", "uebelkeit", "durchfall"],
  calcium: ["verstopfung", "blaehungen"],
  gaba: ["muede", "kribbeln"],
  apigenin: ["muede"],
  baldrian: ["muede", "kopfschmerz", "traeume"],
  lavendel: ["blaehungen", "uebelkeit"],
  taurin: ["muede"],
  inositol: ["blaehungen", "uebelkeit"],
  tyrosin: ["unruhe", "kopfschmerz", "schlafprob"],
  citicolin: ["kopfschmerz", "unruhe"],
  alphagpc: ["kopfschmerz", "unruhe"],
  bacopa: ["uebelkeit", "durchfall", "muede"],
  ginkgo: ["kopfschmerz", "blaehungen"],
  cordyceps: ["blaehungen", "schlafprob"],
  alcar: ["unruhe", "uebelkeit", "schlafprob"],
  nac: ["uebelkeit", "blaehungen"],
  nmn: ["uebelkeit", "unruhe"],
  safran: ["uebelkeit", "muede"],
  reishi: ["blaehungen", "schwindel"],
  tongkat: ["unruhe", "schlafprob"],
  maca: ["blaehungen", "unruhe"],
  shilajit: ["blaehungen"],
  multivitamin: ["uebelkeit"],
  selen: ["uebelkeit", "haut"],
  jod: ["unruhe", "haut"],
  folat: ["unruhe", "schlafprob"],
  biotin: ["haut"],
  whey: ["blaehungen", "haut"],
  eaa: ["blaehungen"],
  hmb: ["blaehungen"],
  glutamin: ["blaehungen"],
  betain: ["uebelkeit", "blaehungen"],
  flohsamen: ["blaehungen", "verstopfung"],
  berberin: ["verstopfung", "durchfall", "blaehungen", "uebelkeit"],
  quercetin: ["kopfschmerz", "uebelkeit"],
  ingwer: ["blaehungen"],
  astaxanthin: ["blaehungen"],
  hyaluron: ["blaehungen"],
  kupfer: ["uebelkeit"],
}

// Alte Freitext-Tags (v1) → Nebenwirkungen
const LEGACY_TAG_SIDES: Record<string, string> = {
  "Kopfschmerzen": "kopfschmerz", "Übelkeit": "uebelkeit", "Blähungen": "blaehungen", "Unruhig / nervös": "unruhe",
  "Lebhafte Träume": "traeume", "Kribbeln": "kribbeln", "Wassereinlagerung": "wasser", "Einstichstelle gereizt": "einstich",
  "Heißhunger": "hunger", "Gereizt": "stimmungstief", "Müde am Nachmittag": "muede", "Früh wach": "schlafprob",
}

// ── Ziele ──────────────────────────────────────────────────────────────────────

export type GoalId =
  | "schlaf" | "energie" | "fokus" | "stress" | "muskel" | "regeneration"
  | "abnehmen" | "darm" | "haut" | "longevity" | "immun" | "libido"

export interface Goal { id: GoalId; emoji: string; label: string; dims: Dim[]; suggest: string[] }

export const GOALS: Goal[] = [
  { id: "schlaf",       emoji: "🌙", label: "Besser schlafen",   dims: ["schlaf", "ruhe", "energie"],    suggest: ["magnesium", "glycin", "theanin", "apigenin", "melatonin", "ashwagandha", "gaba", "baldrian", "taurin", "cjc-ipa"] },
  { id: "energie",      emoji: "⚡", label: "Mehr Energie",      dims: ["energie", "stimmung", "fokus"], suggest: ["b12", "bkomplex", "rhodiola", "koffein", "q10", "eisen", "elektrolyte", "cordyceps", "alcar", "motsc"] },
  { id: "fokus",        emoji: "🎯", label: "Fokus & Kopf",      dims: ["fokus", "energie", "stimmung"], suggest: ["theanin", "koffein", "tyrosin", "citicolin", "lionsmane", "bacopa", "alphagpc", "semax", "kreatin", "omega3"] },
  { id: "stress",       emoji: "🧘", label: "Weniger Stress",    dims: ["ruhe", "stimmung", "schlaf"],   suggest: ["ashwagandha", "magnesium", "theanin", "rhodiola", "lavendel", "safran", "inositol", "reishi", "selank"] },
  { id: "muskel",       emoji: "🏋️", label: "Muskeln & Kraft",   dims: ["koerper", "energie"],           suggest: ["kreatin", "whey", "citrullin", "betaalanin", "eaa", "hmb", "betain", "vitd", "zink", "cjc-ipa", "elektrolyte"] },
  { id: "regeneration", emoji: "🩹", label: "Regeneration",      dims: ["gelenke", "koerper", "schlaf"], suggest: ["bpc157", "tb500", "kollagen", "omega3", "curcumin", "magnesium", "glutamin", "astaxanthin", "ingwer"] },
  { id: "abnehmen",     emoji: "🔥", label: "Abnehmen",          dims: ["appetit", "energie", "stimmung"], suggest: ["glp1", "berberin", "flohsamen", "whey", "motsc", "elektrolyte", "koffein", "probiotika"] },
  { id: "darm",         emoji: "🌿", label: "Darm & Verdauung",  dims: ["verdauung", "stimmung"],        suggest: ["probiotika", "flohsamen", "ingwer", "glutamin", "kpv", "bpc157", "curcumin", "magnesium"] },
  { id: "haut",         emoji: "✨", label: "Haut & Haare",      dims: ["haut", "stimmung"],             suggest: ["ghkcu", "kollagen", "zink", "omega3", "vitc", "biotin", "hyaluron", "astaxanthin"] },
  { id: "longevity",    emoji: "🧬", label: "Longevity",         dims: ["energie", "koerper", "schlaf"], suggest: ["omega3", "vitd", "q10", "nmn", "nac", "astaxanthin", "kreatin", "epitalon", "motsc"] },
  { id: "immun",        emoji: "🛡️", label: "Immunsystem",       dims: ["koerper", "energie"],           suggest: ["vitd", "zink", "vitc", "selen", "quercetin", "nac", "ta1", "probiotika"] },
  { id: "libido",       emoji: "❤️‍🔥", label: "Libido & Hormone", dims: ["libido", "energie", "stimmung"], suggest: ["zink", "vitd", "tongkat", "maca", "ashwagandha", "shilajit", "kreatin", "omega3"] },
]
export const GOAL_BY_ID = Object.fromEntries(GOALS.map(g => [g.id, g])) as Record<GoalId, Goal>

/** Welche Bereiche frage ich ab? Kern + zielspezifische, Ziel-Bereiche zuerst. */
export function activeDims(s: { goals: GoalId[] }): DimInfo[] {
  const goalDims = s.goals.flatMap(g => GOAL_BY_ID[g]?.dims ?? [])
  const ids = [...new Set<Dim>([...goalDims, ...DIMS.filter(d => d.core).map(d => d.id)])]
  return ids.map(id => DIM_BY_ID[id])
}

export function goalRelevance(libId: string, goals: GoalId[]) {
  return goals.filter(g => GOAL_BY_ID[g]?.suggest.includes(libId)).length
}

// ── Tagesablauf-Slots ───────────────────────────────────────────────────────────

export type SlotId = "nuechtern" | "fruehstueck" | "mittag" | "training" | "nachmittag" | "abendessen" | "schlaf"

export const SLOTS: { id: SlotId; label: string; emoji: string; hint: string }[] = [
  { id: "nuechtern",   label: "Nach dem Aufstehen", emoji: "🌅", hint: "nüchtern, mit Wasser" },
  { id: "fruehstueck", label: "Zum Frühstück",      emoji: "🍳", hint: "mit Essen" },
  { id: "mittag",      label: "Zum Mittagessen",    emoji: "🥗", hint: "größte / fettreichste Mahlzeit" },
  { id: "training",    label: "Vor dem Training",   emoji: "🏋️", hint: "30–60 Min vorher" },
  { id: "nachmittag",  label: "Nachmittag",         emoji: "☕", hint: "Tief überbrücken" },
  { id: "abendessen",  label: "Zum Abendessen",     emoji: "🍲", hint: "mit Essen" },
  { id: "schlaf",      label: "Vor dem Schlafen",   emoji: "🛌", hint: "30–60 Min vorher, nüchtern" },
]

export interface Settings {
  wake: string      // "07:00"
  bed: string       // "23:00"
  training: string | null
  washoutDays: number
}

export const DEFAULT_SETTINGS: Settings = { wake: "07:00", bed: "23:00", training: null, washoutDays: 2 }

export const RHYTHMS = [
  { id: "frueh",  emoji: "🐓", label: "Frühaufsteher", wake: "06:00", bed: "22:00" },
  { id: "normal", emoji: "☀️", label: "Normal",        wake: "07:00", bed: "23:00" },
  { id: "spaet",  emoji: "🦉", label: "Nachteule",     wake: "09:00", bed: "01:00" },
]
export const TRAININGS = [
  { id: "none",    emoji: "🛋️", label: "Kein Training", time: null },
  { id: "morning", emoji: "🌅", label: "Morgens",       time: "07:30" },
  { id: "noon",    emoji: "🌞", label: "Mittags",       time: "12:30" },
  { id: "evening", emoji: "🌆", label: "Abends",        time: "18:00" },
]

export function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0) }
export function fromMin(m: number) { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}` }

/** Minuten seit Mitternacht des Aufsteh-Tages (kann >1440 sein bei Nachteulen). */
export function slotMinutes(slot: SlotId, s: Settings): number {
  const wake = toMin(s.wake)
  let bed = toMin(s.bed)
  if (bed <= wake) bed += 1440
  const span = bed - wake
  switch (slot) {
    case "nuechtern":   return wake + 10
    case "fruehstueck": return wake + 60
    case "mittag":      return wake + Math.round(span * 0.38)
    case "training": {
      if (!s.training) return wake + Math.round(span * 0.62)
      let t = toMin(s.training) - 45
      if (t < wake) t += 1440
      return t
    }
    case "nachmittag":  return wake + Math.round(span * 0.52)
    case "abendessen":  return wake + Math.round(span * 0.72)
    case "schlaf":      return bed - 45
  }
}
export function slotTime(slot: SlotId, s: Settings) { return fromMin(slotMinutes(slot, s)) }

/**
 * Uhrzeit (Minuten seit Mitternacht) auf den „Aufsteh-Tag“ beziehen: Der Tag beginnt 3 h vor
 * der Aufstehzeit – alles davor (z. B. 00:30) zählt noch zum Vorabend (→ +1440).
 */
export function relMin(m: number, s: Settings) { return m < dayStartMin(s) ? m + 1440 : m }

/** Standard-Zeit für den abendlichen Check-in: 1 h vor dem Schlafen. */
export function defaultCheckinTime(s: Settings) {
  let bed = toMin(s.bed)
  if (bed <= toMin(s.wake)) bed += 1440
  return fromMin(bed - 60)
}

// ── Supplement- & Peptid-Bibliothek ─────────────────────────────────────────────

export type Onset = "schnell" | "mittel" | "langsam"
export type Route = "oral" | "subkutan" | "nasal" | "topisch"

export const ONSET_INFO: Record<Onset, { label: string; days: number; text: string; emoji: string }> = {
  schnell: { label: "Spürbar in Stunden–Tagen", days: 3,  emoji: "⚡", text: "Ideal für den 3–5-Tage-Test." },
  mittel:  { label: "Spürbar nach 1–3 Wochen",  days: 5,  emoji: "⏳", text: "Braucht einen etwas längeren Testblock." },
  langsam: { label: "Wirkt über Wochen–Monate", days: 7, emoji: "🐢", text: "Kaum im Kurztest fühlbar — Blutwerte sagen oft mehr als Gefühl." },
}

export const ROUTE_INFO: Record<Route, { emoji: string; label: string }> = {
  oral:     { emoji: "💊", label: "Oral" },
  subkutan: { emoji: "💉", label: "Subkutan" },
  nasal:    { emoji: "👃", label: "Nasal" },
  topisch:  { emoji: "🧴", label: "Topisch / Creme" },
}

export type Category =
  | "Schlaf & Ruhe" | "Energie & Fokus" | "Stress & Adaptogene" | "Vitamine & Mineralien"
  | "Training" | "Darm & Immun" | "Peptide" | "Verschriebene Medikamente"

export interface LibSupp {
  id: string
  name: string
  emoji: string
  category: Category
  onset: Onset
  slots: SlotId[]          // bevorzugte Reihenfolge
  dose: string
  effect: string
  watch: Dim[]
  timing: string
  caution?: string
  withFat?: boolean
  route?: Route
  rx?: boolean             // verschreibungspflichtig → nie eigenmächtig absetzen
  weekly?: boolean         // 1× pro Woche statt täglich
  aliases: string[]        // für „Liste einfügen“
}

const PEPTIDE_NOTE = "Nicht als Arzneimittel zugelassen, kaum Humanstudien, Reinheit von Research-Peptiden schwankt stark. Nur mit ärztlicher Begleitung und sauberer Injektionshygiene."

const ALL_LIBRARY: LibSupp[] = [
  // ── Peptide ──
  { id: "bpc157", name: "BPC-157", emoji: "🩹", category: "Peptide", onset: "mittel", route: "subkutan",
    slots: ["nuechtern", "schlaf"], dose: "laut Protokoll", watch: ["gelenke", "koerper", "verdauung"],
    effect: "Wird für Heilung von Sehnen, Bändern und Darm genutzt (Daten v. a. aus Tierstudien).",
    timing: "Täglich zur gleichen Zeit, oft nahe der betroffenen Stelle. Oral-Varianten nüchtern.",
    caution: PEPTIDE_NOTE, aliases: ["bpc", "bpc157", "bpc-157", "body protection compound"] },
  { id: "tb500", name: "TB-500", emoji: "🧬", category: "Peptide", onset: "mittel", route: "subkutan",
    slots: ["nuechtern"], dose: "laut Protokoll", watch: ["gelenke", "koerper"],
    effect: "Thymosin-Beta-4-Fragment, wird für Regeneration und Beweglichkeit genutzt.",
    timing: "Meist wenige Male pro Woche, zur gleichen Tageszeit.",
    caution: PEPTIDE_NOTE, aliases: ["tb500", "tb-500", "tb 500", "thymosin beta"] },
  { id: "ghkcu", name: "GHK-Cu", emoji: "💎", category: "Peptide", onset: "langsam", route: "subkutan",
    slots: ["schlaf", "nuechtern"], dose: "laut Protokoll", watch: ["haut"],
    effect: "Kupferpeptid für Haut, Haare und Wundheilung — gut untersucht als Creme, weniger als Injektion.",
    timing: "Abends; als Creme auf die gereinigte Haut. Effekte eher nach Wochen.",
    caution: PEPTIDE_NOTE, aliases: ["ghk", "ghk-cu", "ghkcu", "kupferpeptid", "copper peptide"] },
  { id: "cjc-ipa", name: "CJC-1295 + Ipamorelin", emoji: "🌙", category: "Peptide", onset: "mittel", route: "subkutan",
    slots: ["schlaf"], dose: "laut Protokoll", watch: ["schlaf", "koerper", "haut"],
    effect: "Regt die körpereigene Wachstumshormon-Ausschüttung an: oft tieferer Schlaf und bessere Regeneration.",
    timing: "Abends vor dem Schlafen, nüchtern (≥ 2 h nach der letzten Mahlzeit), damit Insulin nicht bremst.",
    caution: `${PEPTIDE_NOTE} Kann Wassereinlagerung, Kribbeln und Hunger machen; Blutzucker & IGF-1 im Blick behalten.`,
    aliases: ["cjc", "cjc-1295", "cjc1295", "ipamorelin", "ipa", "mod grf", "sermorelin", "tesamorelin"] },
  { id: "semax", name: "Semax", emoji: "🧠", category: "Peptide", onset: "schnell", route: "nasal",
    slots: ["nuechtern", "fruehstueck"], dose: "laut Protokoll", watch: ["fokus", "energie", "stimmung"],
    effect: "Nasenspray, das für Fokus und mentale Energie genutzt wird.",
    timing: "Morgens bzw. vor Kopfarbeit. Nicht abends — kann wach halten.",
    caution: "In Russland zugelassen, in der EU nicht; wenige westliche Studien. Ärztlich abklären.", aliases: ["semax", "n-acetyl semax"] },
  { id: "selank", name: "Selank", emoji: "🕊️", category: "Peptide", onset: "schnell", route: "nasal",
    slots: ["fruehstueck", "nachmittag"], dose: "laut Protokoll", watch: ["ruhe", "stimmung", "fokus"],
    effect: "Nasenspray gegen Anspannung und Grübeln, ohne müde zu machen.",
    timing: "Morgens oder in stressigen Phasen.",
    caution: "In Russland zugelassen, in der EU nicht; wenige westliche Studien. Ärztlich abklären.", aliases: ["selank", "n-acetyl selank"] },
  { id: "motsc", name: "MOTS-c", emoji: "🔋", category: "Peptide", onset: "mittel", route: "subkutan",
    slots: ["nuechtern", "training"], dose: "laut Protokoll", watch: ["energie", "koerper", "appetit"],
    effect: "Mitochondriales Peptid für Stoffwechsel und Ausdauer — Humandaten sind noch dünn.",
    timing: "Morgens nüchtern oder vor dem Training.",
    caution: PEPTIDE_NOTE, aliases: ["mots-c", "motsc", "mots c"] },
  { id: "epitalon", name: "Epitalon", emoji: "⏳", category: "Peptide", onset: "langsam", route: "subkutan",
    slots: ["schlaf"], dose: "laut Protokoll (meist als Kur)", watch: ["schlaf", "energie"],
    effect: "Wird als Longevity-Kur genutzt, teils mit Effekt auf den Schlaf-Rhythmus.",
    timing: "Abends, typischerweise als kurze Kur statt dauerhaft.",
    caution: PEPTIDE_NOTE, aliases: ["epitalon", "epithalon", "epithalone"] },
  { id: "ta1", name: "Thymosin Alpha-1", emoji: "🛡️", category: "Peptide", onset: "langsam", route: "subkutan",
    slots: ["nuechtern"], dose: "laut Protokoll", watch: ["koerper", "energie"],
    effect: "Immunmodulierendes Peptid (in manchen Ländern als Medikament zugelassen).",
    timing: "Morgens, meist wenige Male pro Woche.",
    caution: PEPTIDE_NOTE, aliases: ["thymosin alpha", "ta1", "ta-1", "thymosin a1", "zadaxin"] },
  { id: "kpv", name: "KPV", emoji: "🌱", category: "Peptide", onset: "mittel", route: "oral",
    slots: ["nuechtern", "abendessen"], dose: "laut Protokoll", watch: ["verdauung", "haut"],
    effect: "Entzündungshemmendes Tripeptid, genutzt für Darm und Haut.",
    timing: "Oral meist nüchtern; täglich zur gleichen Zeit.",
    caution: PEPTIDE_NOTE, aliases: ["kpv"] },
  { id: "glp1", name: "GLP-1 (Sema-/Tirzepatid)", emoji: "💉", category: "Peptide", onset: "schnell", route: "subkutan", rx: true, weekly: true,
    slots: ["abendessen"], dose: "ärztlich verordnet", watch: ["appetit", "verdauung", "energie"],
    effect: "Stark appetitzügelnd, Gewichtsverlust. Nebenwirkungen v. a. Übelkeit und Verdauung.",
    timing: "1× pro Woche, immer am gleichen Wochentag.",
    caution: "Verschreibungspflichtig — nur ärztlich verordnet und nie eigenmächtig absetzen oder pausieren.",
    aliases: ["glp", "glp-1", "glp1", "semaglutid", "semaglutide", "ozempic", "wegovy", "tirzepatid", "tirzepatide", "mounjaro", "retatrutid", "retatrutide"] },

  // ── Schlaf & Ruhe ──
  { id: "magnesium", name: "Magnesium (Glycinat)", emoji: "🌙", category: "Schlaf & Ruhe", onset: "schnell",
    slots: ["schlaf", "abendessen"], dose: "200–400 mg", watch: ["schlaf", "ruhe", "koerper"],
    effect: "Kann entspannen, Schlaf vertiefen und Muskelkrämpfe lindern.",
    timing: "Abends, 1 h vor dem Schlafen. Citrat wirkt eher abführend, Glycinat ist sanfter.",
    caution: "Mit Abstand (≈2 h) zu Eisen und Zink einnehmen.", aliases: ["magnesium", "bisglycinat", "glycinat", "magnesiumcitrat", "threonat"] },
  { id: "glycin", name: "Glycin", emoji: "💤", category: "Schlaf & Ruhe", onset: "schnell",
    slots: ["schlaf"], dose: "3 g", watch: ["schlaf", "energie"],
    effect: "Kann Einschlafen erleichtern und Morgenmüdigkeit reduzieren.",
    timing: "30–60 Min vor dem Schlafen, in Wasser gelöst (schmeckt süß).", aliases: ["glycin", "glycine"] },
  { id: "melatonin", name: "Melatonin", emoji: "🦉", category: "Schlaf & Ruhe", onset: "schnell",
    slots: ["schlaf"], dose: "0,5–1 mg", watch: ["schlaf", "energie"],
    effect: "Verschiebt die innere Uhr, hilft beim Einschlafen (Jetlag, Schichtarbeit).",
    timing: "30–60 Min vor dem Schlafen. Niedrig dosiert wirkt oft besser als hoch.",
    caution: "Nicht für Dauereinnahme gedacht. Bei Medikamenten ärztlich abklären.", aliases: ["melatonin"] },
  { id: "theanin", name: "L-Theanin", emoji: "🍵", category: "Energie & Fokus", onset: "schnell",
    slots: ["fruehstueck", "schlaf"], dose: "100–200 mg", watch: ["ruhe", "fokus"],
    effect: "Ruhige Konzentration ohne Müdigkeit, glättet Koffein-Nervosität.",
    timing: "Morgens zusammen mit Kaffee — oder abends zum Runterkommen.", aliases: ["theanin", "theanine", "l-theanin"] },
  { id: "koffein", name: "Koffein / Kaffee", emoji: "☕", category: "Energie & Fokus", onset: "schnell",
    slots: ["fruehstueck", "training"], dose: "100–200 mg", watch: ["energie", "fokus", "schlaf"],
    effect: "Wacher und fokussierter — kann aber Schlaf und Ruhe kosten.",
    timing: "90 Min nach dem Aufstehen, spätestens 8 h vor dem Schlafen.",
    caution: "Im Reset weglassen = Entzugskopfschmerz möglich (2–9 Tage). Eher langsam reduzieren.", aliases: ["koffein", "caffeine", "kaffee", "coffee", "espresso", "pre-workout", "preworkout"] },
  { id: "rhodiola", name: "Rhodiola Rosea", emoji: "🏔️", category: "Stress & Adaptogene", onset: "schnell",
    slots: ["nuechtern", "fruehstueck"], dose: "200–400 mg", watch: ["energie", "fokus", "ruhe"],
    effect: "Kann Stress-Erschöpfung und mentale Müdigkeit senken.",
    timing: "Morgens, möglichst nüchtern. Nicht abends — kann wach machen.", aliases: ["rhodiola", "rosenwurz"] },
  { id: "ashwagandha", name: "Ashwagandha", emoji: "🌿", category: "Stress & Adaptogene", onset: "langsam",
    slots: ["abendessen", "schlaf"], dose: "300–600 mg (KSM-66)", watch: ["ruhe", "schlaf", "stimmung"],
    effect: "Kann Stress und Cortisol senken, Schlaf verbessern.",
    timing: "Abends mit Essen. Wirkung baut sich über 4–8 Wochen auf.",
    caution: "Nicht in der Schwangerschaft; bei Schilddrüsen- oder Lebererkrankungen ärztlich abklären.", aliases: ["ashwagandha", "ksm-66", "ksm66", "withania"] },
  { id: "vitd", name: "Vitamin D3 + K2", emoji: "🌞", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["mittag", "fruehstueck"], dose: "1.000–2.000 IE", watch: ["stimmung", "energie"], withFat: true,
    effect: "Wichtig für Immunsystem, Knochen und Stimmung — v. a. im Winter.",
    timing: "Zur fettreichsten Mahlzeit. Der Blutwert 25(OH)D sagt mehr als Gefühl.",
    caution: "Hohe Dosen nur nach Blutbild.", aliases: ["vitamin d", "vit d", "vitd", "d3", "k2", "d3k2", "d3+k2"] },
  { id: "omega3", name: "Omega-3 (EPA/DHA)", emoji: "🐟", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["mittag", "abendessen"], dose: "1–2 g EPA+DHA", watch: ["stimmung", "fokus", "gelenke"], withFat: true,
    effect: "Entzündungshemmend, gut für Herz, Gehirn und Stimmung.",
    timing: "Zu einer Mahlzeit mit Fett — weniger Fischaufstoßen.",
    caution: "Bei Blutverdünnern ärztlich abklären.", aliases: ["omega", "omega-3", "omega3", "fischöl", "fischoel", "fish oil", "epa", "dha", "algenöl", "krillöl"] },
  { id: "zink", name: "Zink", emoji: "🛡️", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["abendessen", "mittag"], dose: "10–15 mg", watch: ["koerper", "haut", "libido"],
    effect: "Immunsystem, Haut, Testosteron — vor allem bei Mangel spürbar.",
    timing: "Mit Essen (nüchtern oft Übelkeit). Abstand zu Eisen & Calcium.",
    caution: "Langfristig über 25 mg/Tag kann Kupfermangel verursachen.", aliases: ["zink", "zinc", "zinkbisglycinat", "zinkpicolinat"] },
  { id: "eisen", name: "Eisen", emoji: "🩸", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["nuechtern"], dose: "nach Blutbild", watch: ["energie", "koerper"],
    effect: "Gegen Müdigkeit — aber nur bei nachgewiesenem Mangel (Ferritin).",
    timing: "Nüchtern mit Vitamin C, ≥2 h Abstand zu Kaffee, Tee, Calcium, Zink, Magnesium.",
    caution: "Niemals ohne Blutbild supplementieren — zu viel Eisen schadet.", aliases: ["eisen", "iron", "ferro"] },
  { id: "b12", name: "Vitamin B12", emoji: "🔋", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["fruehstueck", "nuechtern"], dose: "250–1.000 µg", watch: ["energie", "fokus"],
    effect: "Nerven & Blutbildung. Spürbar vor allem bei Mangel (vegan!).",
    timing: "Morgens — kann bei manchen leicht aktivierend wirken.", aliases: ["b12", "b 12", "vitamin b12", "cobalamin", "methylcobalamin"] },
  { id: "bkomplex", name: "B-Komplex", emoji: "🅱️", category: "Vitamine & Mineralien", onset: "mittel",
    slots: ["fruehstueck"], dose: "1 Kapsel", watch: ["energie", "stimmung"],
    effect: "Energiestoffwechsel. Färbt den Urin gelb — harmlos.",
    timing: "Morgens zum Frühstück, nicht abends (kann wach halten).", aliases: ["b-komplex", "b komplex", "b complex", "b-complex", "b-vitamine", "vitamin b komplex"] },
  { id: "vitc", name: "Vitamin C", emoji: "🍊", category: "Darm & Immun", onset: "mittel",
    slots: ["fruehstueck", "mittag"], dose: "200–500 mg", watch: ["koerper", "haut"],
    effect: "Immunsystem, Kollagenbildung, verbessert Eisenaufnahme.",
    timing: "Zu einer Mahlzeit. Mit Eisen zusammen = bessere Aufnahme.", aliases: ["vitamin c", "vit c", "vitc", "ascorbin"] },
  { id: "probiotika", name: "Probiotika", emoji: "🦠", category: "Darm & Immun", onset: "mittel",
    slots: ["fruehstueck"], dose: "1 Kapsel", watch: ["verdauung", "stimmung"],
    effect: "Kann Verdauung und Darmflora unterstützen. Anfangs evtl. Blähungen.",
    timing: "Täglich zur gleichen Zeit, kurz vor oder zum Frühstück.", aliases: ["probiotika", "probiotic", "probiotikum", "darmbakterien", "kefir"] },
  { id: "kreatin", name: "Kreatin", emoji: "🏋️", category: "Training", onset: "langsam",
    slots: ["fruehstueck", "training"], dose: "3–5 g", watch: ["koerper", "fokus", "energie"],
    effect: "Mehr Kraft & Leistung, evtl. auch mentale Ausdauer. Leichte Wassereinlagerung.",
    timing: "Timing egal — Hauptsache jeden Tag. Muskel-Sättigung nach ~3–4 Wochen.", aliases: ["kreatin", "creatin", "creatine", "monohydrat"] },
  { id: "citrullin", name: "L-Citrullin", emoji: "🔥", category: "Training", onset: "schnell",
    slots: ["training"], dose: "6–8 g", watch: ["koerper", "energie"],
    effect: "Besserer Pump und Ausdauer im Training.",
    timing: "30–60 Min vor dem Training.", aliases: ["citrullin", "citrulline", "citrullin malat"] },
  { id: "betaalanin", name: "Beta-Alanin", emoji: "⚡", category: "Training", onset: "langsam",
    slots: ["training", "fruehstueck"], dose: "3–5 g", watch: ["koerper"],
    effect: "Mehr Ausdauer bei intensiven Sätzen. Kribbeln ist harmlos.",
    timing: "Täglich, gern aufgeteilt. Effekt nach 2–4 Wochen.", aliases: ["beta-alanin", "beta alanin", "beta-alanine", "betaalanin"] },
  { id: "elektrolyte", name: "Elektrolyte", emoji: "💧", category: "Training", onset: "schnell",
    slots: ["nuechtern", "training"], dose: "1 Portion", watch: ["energie", "koerper", "fokus"],
    effect: "Weniger Kopfweh/Schlappheit bei Hitze, Sport oder Low-Carb.",
    timing: "Morgens in Wasser oder rund ums Training.", aliases: ["elektrolyte", "electrolytes", "lmnt", "salz", "natrium"] },
  { id: "kollagen", name: "Kollagen", emoji: "✨", category: "Training", onset: "langsam",
    slots: ["fruehstueck"], dose: "10 g", watch: ["haut", "gelenke"],
    effect: "Haut, Gelenke, Sehnen — Effekte nach Wochen bis Monaten.",
    timing: "Egal wann, z. B. im Kaffee oder Smoothie.", aliases: ["kollagen", "collagen"] },
  { id: "q10", name: "Coenzym Q10", emoji: "❤️", category: "Energie & Fokus", onset: "langsam",
    slots: ["fruehstueck", "mittag"], dose: "100–200 mg", watch: ["energie"], withFat: true,
    effect: "Zellenergie, v. a. relevant ab 40 oder bei Statin-Einnahme.",
    timing: "Morgens/mittags mit fetthaltigem Essen.", aliases: ["q10", "coenzym", "coq10", "ubiquinol"] },
  { id: "lionsmane", name: "Lion's Mane", emoji: "🍄", category: "Energie & Fokus", onset: "langsam",
    slots: ["fruehstueck"], dose: "500–1.000 mg", watch: ["fokus", "stimmung"],
    effect: "Kann Fokus und Gedächtnis unterstützen — Effekt baut sich langsam auf.",
    timing: "Morgens zum Frühstück.", aliases: ["lion", "lions mane", "lion's mane", "hericium", "igelstachelbart"] },
  { id: "curcumin", name: "Curcumin", emoji: "🟡", category: "Darm & Immun", onset: "langsam",
    slots: ["mittag", "abendessen"], dose: "500 mg", watch: ["gelenke", "verdauung"], withFat: true,
    effect: "Entzündungshemmend, Gelenke & Regeneration.",
    timing: "Mit Fett und Piperin (schwarzer Pfeffer) für bessere Aufnahme.",
    caution: "Bei Blutverdünnern oder Gallenproblemen ärztlich abklären.", aliases: ["curcumin", "kurkuma", "turmeric"] },
  { id: "calcium", name: "Calcium", emoji: "🦴", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["abendessen", "mittag"], dose: "nach Bedarf", watch: ["koerper"],
    effect: "Knochen — meist reicht die Ernährung.",
    timing: "Mit Essen, ≥2 h Abstand zu Eisen und Zink.", aliases: ["calcium", "kalzium"] },

  // ── Schlaf & Ruhe (erweitert) ──
  { id: "gaba", name: "GABA", emoji: "🫧", category: "Schlaf & Ruhe", onset: "schnell",
    slots: ["schlaf"], dose: "250–750 mg", watch: ["ruhe", "schlaf"],
    effect: "Wird zum Entspannen genutzt – ob es das Gehirn direkt erreicht, ist umstritten. Bei manchen spürbar, bei anderen gar nicht: ideal zum Testen.",
    timing: "Abends, 30–60 Min vor dem Schlafen.", aliases: ["gaba", "gamma-aminobuttersäure"] },
  { id: "apigenin", name: "Apigenin", emoji: "🌼", category: "Schlaf & Ruhe", onset: "schnell",
    slots: ["schlaf"], dose: "50 mg", watch: ["schlaf", "ruhe"],
    effect: "Wirkstoff aus Kamille, kann beim Einschlafen und Abschalten helfen.",
    timing: "30–60 Min vor dem Schlafen.", aliases: ["apigenin", "kamille", "chamomile"] },
  { id: "baldrian", name: "Baldrian", emoji: "🌾", category: "Schlaf & Ruhe", onset: "mittel",
    slots: ["schlaf"], dose: "300–600 mg Extrakt", watch: ["schlaf", "ruhe"],
    effect: "Klassisches pflanzliches Schlafmittel, oft kombiniert mit Hopfen oder Melisse.",
    timing: "30–60 Min vor dem Schlafen. Volle Wirkung oft erst nach 1–2 Wochen.",
    caution: "Kann am Morgen noch leicht müde machen – nicht mit Alkohol oder Schlafmitteln kombinieren.", aliases: ["baldrian", "valerian", "hopfen"] },
  { id: "lavendel", name: "Lavendelöl-Kapseln", emoji: "💜", category: "Schlaf & Ruhe", onset: "mittel",
    slots: ["abendessen", "schlaf"], dose: "80 mg (z. B. Silexan)", watch: ["ruhe", "schlaf", "stimmung"],
    effect: "Kann Unruhe und Grübeln lindern, ohne müde zu machen.",
    timing: "Abends zum Essen, täglich zur gleichen Zeit.",
    caution: "Aufstoßen mit Lavendelgeschmack ist häufig und harmlos.", aliases: ["lavendel", "lavender", "silexan", "lasea"] },
  { id: "taurin", name: "Taurin", emoji: "🌊", category: "Schlaf & Ruhe", onset: "mittel",
    slots: ["schlaf", "training"], dose: "1–2 g", watch: ["ruhe", "schlaf", "koerper"],
    effect: "Beruhigt das Nervensystem, unterstützt Herz und Muskeln.",
    timing: "Abends oder rund ums Training.", aliases: ["taurin", "taurine"] },
  { id: "inositol", name: "Inositol (Myo)", emoji: "🍬", category: "Schlaf & Ruhe", onset: "mittel",
    slots: ["schlaf"], dose: "2–4 g", watch: ["ruhe", "schlaf", "stimmung"],
    effect: "Kann Anspannung senken und den Schlaf beruhigen.",
    timing: "Abends in Wasser gelöst (schmeckt leicht süß).",
    caution: "Höhere Dosen können den Magen reizen – langsam steigern.", aliases: ["inositol", "myo-inositol", "myo inositol"] },

  // ── Energie & Fokus (erweitert) ──
  { id: "tyrosin", name: "L-Tyrosin", emoji: "🎯", category: "Energie & Fokus", onset: "schnell",
    slots: ["nuechtern", "fruehstueck"], dose: "500–2.000 mg", watch: ["fokus", "energie", "stimmung"],
    effect: "Baustein für Dopamin – kann Fokus unter Stress und Schlafmangel stützen.",
    timing: "Morgens nüchtern oder vor fordernder Kopfarbeit. Nicht abends – kann wach halten.",
    caution: "Nicht bei Schilddrüsenüberfunktion oder mit MAO-Hemmern.", aliases: ["tyrosin", "tyrosine", "l-tyrosin", "nalt"] },
  { id: "citicolin", name: "Citicolin", emoji: "🧩", category: "Energie & Fokus", onset: "mittel",
    slots: ["fruehstueck"], dose: "250–500 mg", watch: ["fokus", "energie"],
    effect: "Cholin-Quelle für Konzentration und mentale Energie.",
    timing: "Morgens zum Frühstück.", aliases: ["citicolin", "citicoline", "cdp-cholin", "cognizin"] },
  { id: "alphagpc", name: "Alpha-GPC", emoji: "🧪", category: "Energie & Fokus", onset: "schnell",
    slots: ["fruehstueck", "training"], dose: "300–600 mg", watch: ["fokus", "koerper"],
    effect: "Cholin-Quelle, genutzt für Fokus und Kraft im Training.",
    timing: "Morgens oder 30–60 Min vor dem Training.",
    caution: "Kann bei manchen Kopfschmerzen machen.", aliases: ["alpha-gpc", "alpha gpc", "alphagpc", "cholin"] },
  { id: "bacopa", name: "Bacopa monnieri", emoji: "🌱", category: "Energie & Fokus", onset: "langsam",
    slots: ["abendessen"], dose: "300 mg Extrakt", watch: ["fokus", "ruhe"], withFat: true,
    effect: "Kann Gedächtnis und Gelassenheit verbessern – braucht aber 8–12 Wochen.",
    timing: "Mit einer fetthaltigen Mahlzeit, gern abends (kann etwas müde machen).",
    caution: "Anfangs Magen-Darm-Beschwerden möglich.", aliases: ["bacopa", "brahmi"] },
  { id: "ginkgo", name: "Ginkgo biloba", emoji: "🍃", category: "Energie & Fokus", onset: "langsam",
    slots: ["fruehstueck"], dose: "120–240 mg", watch: ["fokus"],
    effect: "Wird für Durchblutung und Konzentration genutzt, v. a. im Alter.",
    timing: "Morgens zum Frühstück.",
    caution: "Bei Blutverdünnern oder vor OPs ärztlich abklären.", aliases: ["ginkgo", "gingko"] },
  { id: "cordyceps", name: "Cordyceps", emoji: "🟠", category: "Energie & Fokus", onset: "mittel",
    slots: ["nuechtern", "training"], dose: "1–3 g", watch: ["energie", "koerper"],
    effect: "Vitalpilz, genutzt für Ausdauer und Energie.",
    timing: "Morgens oder vor dem Training – abends eher nicht.", aliases: ["cordyceps", "cordyceps militaris"] },
  { id: "alcar", name: "Acetyl-L-Carnitin", emoji: "⚙️", category: "Energie & Fokus", onset: "mittel",
    slots: ["nuechtern", "fruehstueck"], dose: "500–1.000 mg", watch: ["energie", "fokus"],
    effect: "Unterstützt den Fettstoffwechsel der Zellen und mentale Energie.",
    timing: "Morgens, gern nüchtern.",
    caution: "Kann bei manchen unruhig machen.", aliases: ["alcar", "carnitin", "l-carnitin", "acetyl-l-carnitin", "carnitine"] },
  { id: "nac", name: "NAC", emoji: "🧫", category: "Energie & Fokus", onset: "mittel",
    slots: ["nuechtern"], dose: "600 mg", watch: ["energie", "stimmung", "koerper"],
    effect: "Glutathion-Vorstufe (Antioxidans), genutzt für Leber und Atemwege.",
    timing: "Morgens nüchtern mit einem Glas Wasser.",
    caution: "Riecht schweflig; bei Asthma vorsichtig. Nicht mit Nitroglycerin.", aliases: [" nac", "n-acetylcystein", "acetylcystein", "n-acetyl-cystein"] },
  { id: "nmn", name: "NMN / NR", emoji: "⏱️", category: "Energie & Fokus", onset: "langsam",
    slots: ["nuechtern", "fruehstueck"], dose: "250–500 mg", watch: ["energie"],
    effect: "NAD⁺-Vorstufe, genutzt für Longevity – Humandaten sind noch begrenzt.",
    timing: "Morgens, weil NAD⁺ dem Tagesrhythmus folgt.", aliases: ["nmn", " nr ", "nad+", "nicotinamid riboside", "niagen"] },

  // ── Stress & Adaptogene (erweitert) ──
  { id: "safran", name: "Safran-Extrakt", emoji: "🌸", category: "Stress & Adaptogene", onset: "mittel",
    slots: ["fruehstueck"], dose: "30 mg (z. B. affron)", watch: ["stimmung", "ruhe"],
    effect: "Kann die Stimmung heben – gute Studienlage bei leichter Niedergeschlagenheit.",
    timing: "Morgens zum Frühstück.",
    caution: "Bei Antidepressiva ärztlich abklären.", aliases: ["safran", "saffron", "affron"] },
  { id: "reishi", name: "Reishi", emoji: "🟤", category: "Stress & Adaptogene", onset: "mittel",
    slots: ["schlaf", "abendessen"], dose: "1–2 g", watch: ["ruhe", "schlaf"],
    effect: "Vitalpilz, wird zum Runterkommen und für den Schlaf genutzt.",
    timing: "Abends.",
    caution: "Bei Blutverdünnern ärztlich abklären.", aliases: ["reishi", "ganoderma", "glänzender lackporling"] },
  { id: "tongkat", name: "Tongkat Ali", emoji: "🌳", category: "Stress & Adaptogene", onset: "mittel",
    slots: ["fruehstueck"], dose: "200–400 mg", watch: ["libido", "energie", "stimmung"],
    effect: "Wird für Libido, Energie und Stressresistenz genutzt.",
    timing: "Morgens. Viele machen Pausen (z. B. 5 Tage an, 2 aus).",
    caution: "Qualität schwankt stark; bei Hormontherapie ärztlich abklären.", aliases: ["tongkat", "tongkat ali", "longjack", "eurycoma"] },
  { id: "maca", name: "Maca", emoji: "🥔", category: "Stress & Adaptogene", onset: "mittel",
    slots: ["fruehstueck"], dose: "1,5–3 g", watch: ["libido", "energie", "stimmung"],
    effect: "Andenwurzel, genutzt für Libido und Energie.",
    timing: "Morgens, z. B. im Smoothie oder Müsli.", aliases: [" maca ", "maca-pulver", "maca pulver"] },
  { id: "shilajit", name: "Shilajit", emoji: "⛰️", category: "Stress & Adaptogene", onset: "mittel",
    slots: ["nuechtern", "fruehstueck"], dose: "250–500 mg", watch: ["energie", "libido"],
    effect: "Mineralstoffreiches Harz, genutzt für Energie und Vitalität.",
    timing: "Morgens, in warmem Wasser gelöst.",
    caution: "Nur geprüfte Qualität kaufen (Schwermetalle).", aliases: ["shilajit", "mumijo"] },

  // ── Vitamine & Mineralien (erweitert) ──
  { id: "kupfer", name: "Kupfer", emoji: "🪙", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["mittag", "abendessen"], dose: "1–2 mg", watch: ["energie", "haut"],
    effect: "Blutbildung, Bindegewebe, Immunsystem – der Gegenspieler von Zink.",
    timing: "Mit Essen, zeitlich getrennt von Zink.",
    caution: "Nur sinnvoll bei länger hoch dosiertem Zink oder nachgewiesenem Mangel – zu viel Kupfer schadet ebenfalls.", aliases: ["kupfer", "copper"] },
  { id: "multivitamin", name: "Multivitamin", emoji: "🌈", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["fruehstueck"], dose: "1 Portion", watch: ["energie", "koerper"], withFat: true,
    effect: "Deckt Lücken ab, ersetzt aber keine gezielte Versorgung bei echtem Mangel.",
    timing: "Zum Frühstück mit Essen.", aliases: ["multivitamin", "multi", "a-z", "multivitamine"] },
  { id: "selen", name: "Selen", emoji: "🌰", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["fruehstueck"], dose: "50–100 µg", watch: ["koerper", "haut"],
    effect: "Schilddrüse und Immunsystem – in Deutschland sind Böden eher selenarm.",
    timing: "Zum Frühstück.",
    caution: "Nicht über 200 µg/Tag – eine Überdosierung ist möglich.", aliases: ["selen", "selenium"] },
  { id: "jod", name: "Jod", emoji: "🧂", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["fruehstueck"], dose: "100–150 µg", watch: ["energie"],
    effect: "Wichtig für die Schilddrüse, v. a. wenn du kein Jodsalz und wenig Fisch isst.",
    timing: "Zum Frühstück.",
    caution: "Bei Schilddrüsenerkrankungen nur nach ärztlicher Absprache.", aliases: ["jod", "iodine", "kelp"] },
  { id: "folat", name: "Folat (5-MTHF)", emoji: "🥬", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["fruehstueck"], dose: "400 µg", watch: ["energie", "stimmung"],
    effect: "Zellteilung und Blutbildung – besonders wichtig bei Kinderwunsch.",
    timing: "Zum Frühstück, gern zusammen mit B12.", aliases: ["folat", "folsäure", "folic acid", "methylfolat", "5-mthf", "b9"] },
  { id: "biotin", name: "Biotin", emoji: "💅", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["fruehstueck"], dose: "2,5–5 mg", watch: ["haut"],
    effect: "Haut, Haare, Nägel – hilft vor allem bei Mangel.",
    timing: "Zum Frühstück.",
    caution: "Verfälscht Laborwerte (z. B. Schilddrüse): 2–3 Tage vor einer Blutabnahme pausieren.", aliases: ["biotin", "b7", "vitamin h"] },

  // ── Training (erweitert) ──
  { id: "whey", name: "Whey Protein", emoji: "🥛", category: "Training", onset: "schnell",
    slots: ["training", "fruehstueck"], dose: "25–30 g", watch: ["koerper", "appetit"],
    effect: "Hilft, genug Eiweiß für Muskelaufbau und Sättigung zu erreichen.",
    timing: "Nach dem Training oder als Eiweiß-Ergänzung zu einer Mahlzeit.", aliases: ["whey", "protein", "eiweiß", "eiweiss", "proteinpulver", "casein"] },
  { id: "eaa", name: "EAA / BCAA", emoji: "🧃", category: "Training", onset: "schnell",
    slots: ["training"], dose: "5–10 g", watch: ["koerper", "energie"],
    effect: "Essenzielle Aminosäuren – sinnvoll, wenn du wenig Eiweiß isst oder nüchtern trainierst.",
    timing: "Rund ums Training.", aliases: ["eaa", "bcaa", "aminosäuren", "amino"] },
  { id: "hmb", name: "HMB", emoji: "🏅", category: "Training", onset: "langsam",
    slots: ["training", "fruehstueck"], dose: "3 g", watch: ["koerper"],
    effect: "Kann Muskelabbau bremsen, v. a. bei Einsteigern, im Alter oder in der Diät.",
    timing: "Täglich, gern vor dem Training.", aliases: ["hmb"] },
  { id: "glutamin", name: "L-Glutamin", emoji: "🧱", category: "Training", onset: "mittel",
    slots: ["schlaf", "training"], dose: "5 g", watch: ["verdauung", "koerper"],
    effect: "Wird für Darmschleimhaut und Regeneration genutzt.",
    timing: "Nach dem Training oder abends.", aliases: ["glutamin", "glutamine", "l-glutamin"] },
  { id: "betain", name: "Betain (TMG)", emoji: "🔷", category: "Training", onset: "langsam",
    slots: ["training", "fruehstueck"], dose: "2,5 g", watch: ["koerper"],
    effect: "Kann Kraft und Leistung leicht steigern, unterstützt den Homocystein-Stoffwechsel.",
    timing: "Täglich, gern vor dem Training.", aliases: ["betain", "betaine", "tmg", "trimethylglycin"] },

  // ── Darm & Immun (erweitert) ──
  { id: "flohsamen", name: "Flohsamenschalen", emoji: "🥣", category: "Darm & Immun", onset: "mittel",
    slots: ["abendessen", "fruehstueck"], dose: "5 g", watch: ["verdauung", "appetit"],
    effect: "Ballaststoff für regelmäßige Verdauung und längere Sättigung.",
    timing: "Mit viel Wasser (mind. 300 ml), ≥ 2 h Abstand zu Medikamenten und anderen Supplements.", aliases: ["flohsamen", "flohsamenschalen", "psyllium", "ballaststoffe"] },
  { id: "berberin", name: "Berberin", emoji: "🟨", category: "Darm & Immun", onset: "mittel",
    slots: ["mittag", "abendessen"], dose: "500 mg zu Mahlzeiten", watch: ["appetit", "verdauung", "energie"],
    effect: "Wird für Blutzucker und Stoffwechsel genutzt.",
    timing: "Direkt zu einer kohlenhydratreichen Mahlzeit.",
    caution: "Viele Wechselwirkungen mit Medikamenten (u. a. Blutzucker-Mittel) – ärztlich abklären. Nicht in Schwangerschaft/Stillzeit.", aliases: ["berberin", "berberine"] },
  { id: "quercetin", name: "Quercetin", emoji: "🍎", category: "Darm & Immun", onset: "mittel",
    slots: ["mittag"], dose: "500 mg", watch: ["koerper", "gelenke"],
    effect: "Pflanzenstoff, genutzt gegen Entzündungen und bei Heuschnupfen.",
    timing: "Mit Essen, gern zusammen mit Vitamin C.", aliases: ["quercetin"] },
  { id: "ingwer", name: "Ingwer", emoji: "🫚", category: "Darm & Immun", onset: "schnell",
    slots: ["fruehstueck", "mittag"], dose: "1 g", watch: ["verdauung", "gelenke"],
    effect: "Hilft gegen Übelkeit und kann Gelenke und Verdauung unterstützen.",
    timing: "Zu einer Mahlzeit.",
    caution: "Bei Blutverdünnern in hoher Dosis ärztlich abklären.", aliases: ["ingwer", "ginger"] },
  { id: "astaxanthin", name: "Astaxanthin", emoji: "🦐", category: "Darm & Immun", onset: "langsam",
    slots: ["mittag", "abendessen"], dose: "4–12 mg", watch: ["haut", "gelenke"], withFat: true,
    effect: "Starkes Antioxidans für Haut (Sonnenschutz von innen) und Regeneration.",
    timing: "Zu einer fetthaltigen Mahlzeit.", aliases: ["astaxanthin"] },
  { id: "hyaluron", name: "Hyaluronsäure", emoji: "💦", category: "Darm & Immun", onset: "langsam",
    slots: ["fruehstueck"], dose: "120–240 mg", watch: ["haut", "gelenke"],
    effect: "Feuchtigkeit für Haut und Gelenke.",
    timing: "Egal wann – täglich zur gleichen Zeit.", aliases: ["hyaluron", "hyaluronsäure", "hyaluronic"] },
]

const RESEARCH_PEPTIDES = new Set(["bpc157", "tb500", "ghkcu", "cjc-ipa", "semax", "selank", "motsc", "epitalon", "ta1", "kpv"])

export const LIBRARY: LibSupp[] = STORE_MODE
  ? ALL_LIBRARY.filter(l => !RESEARCH_PEPTIDES.has(l.id)).map(l => l.id === "glp1"
      ? { ...l, category: "Verschriebene Medikamente" as Category, effect: "Verschriebenes Medikament zur Gewichtsregulation — hier nur zum Mitprotokollieren.", timing: "Wie ärztlich verordnet, meist 1× pro Woche am gleichen Tag." }
      : l)
  : ALL_LIBRARY

export const CATEGORIES: Category[] = STORE_MODE
  ? ["Schlaf & Ruhe", "Energie & Fokus", "Stress & Adaptogene", "Vitamine & Mineralien", "Training", "Darm & Immun", "Verschriebene Medikamente"]
  : ["Peptide", "Schlaf & Ruhe", "Energie & Fokus", "Stress & Adaptogene", "Vitamine & Mineralien", "Training", "Darm & Immun"]

export const LIB_BY_ID: Record<string, LibSupp> = Object.fromEntries(LIBRARY.map(s => [s.id, s]))

// ── „Liste einfügen“: Freitext → Supplements ────────────────────────────────────

export interface ParsedItem { lib: LibSupp | null; name: string; dose: string }

const DOSE_RE = /(\d+(?:[.,]\d+)?\s*(?:mg|g|µg|mcg|ug|ie|iu|i\.e\.|ml|mcg|kapseln?|tabletten?|caps|tabs?|tropfen|sprühstöße?|x)\b)/i

export function parseSuppList(text: string): ParsedItem[] {
  const parts = text
    .split(/[\n,;•·|]+|\s-\s|\s+und\s+/i)
    .map(p => p.replace(/^[\s\-*\d.)]+(?=[a-zäöü])/i, "").trim())
    .filter(p => p.length > 1)
  const out: ParsedItem[] = []
  const seen = new Set<string>()
  for (const raw of parts) {
    const low = ` ${raw.toLowerCase()} `
    const dose = raw.match(DOSE_RE)?.[1]?.trim() ?? ""
    // längster Alias gewinnt (z. B. „vitamin c“ vs. „c“)
    let best: { lib: LibSupp; len: number } | null = null
    for (const lib of LIBRARY) {
      for (const a of lib.aliases) {
        if (low.includes(a.toLowerCase()) && (!best || a.length > best.len)) best = { lib, len: a.length }
      }
    }
    const key = best ? best.lib.id : raw.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const name = best ? best.lib.name : raw.replace(DOSE_RE, "").trim().replace(/^\w/, c => c.toUpperCase())
    if (!name) continue
    out.push({ lib: best?.lib ?? null, name, dose })
  }
  return out
}

// ── Wechselwirkungen / Timing-Regeln ────────────────────────────────────────────

export interface PairRule { a: string; b: string; kind: "trennen" | "combo"; text: string }

export const PAIR_RULES: PairRule[] = [
  { a: "eisen", b: "calcium",   kind: "trennen", text: "Calcium hemmt die Eisenaufnahme — 2 h Abstand." },
  { a: "eisen", b: "zink",      kind: "trennen", text: "Eisen und Zink konkurrieren — 2 h Abstand." },
  { a: "eisen", b: "magnesium", kind: "trennen", text: "Magnesium kann die Eisenaufnahme mindern — trennen." },
  { a: "eisen", b: "koffein",   kind: "trennen", text: "Kaffee/Tee hemmt Eisen — mind. 1–2 h Abstand." },
  { a: "zink",  b: "calcium",   kind: "trennen", text: "Calcium bremst Zink — besser getrennt." },
  { a: "zink",  b: "magnesium", kind: "trennen", text: "Hoch dosiert konkurrieren sie — lieber trennen." },
  { a: "cjc-ipa", b: "glycin",  kind: "combo",   text: "Beides abends — Schlaf-Upgrade für die Regeneration." },
  { a: "cjc-ipa", b: "magnesium", kind: "combo", text: "Abend-Duo für Schlaf und Regeneration." },
  { a: "bpc157", b: "tb500",    kind: "combo",   text: "Werden oft zusammen für Regeneration genutzt — dann aber nicht getrennt bewertbar." },
  { a: "eisen", b: "vitc",      kind: "combo",   text: "Vitamin C verbessert die Eisenaufnahme." },
  { a: "koffein", b: "theanin", kind: "combo",   text: "Fokus-Duo: klar & ruhig statt zittrig." },
  { a: "magnesium", b: "glycin", kind: "combo",  text: "Schlaf-Combo für tiefere Nächte." },
  { a: "vitd",  b: "omega3",    kind: "combo",   text: "Beide fettlöslich — zusammen zur Hauptmahlzeit." },
]

export function pairRule(a: string, b: string) {
  return PAIR_RULES.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a))
}

// ── State ──────────────────────────────────────────────────────────────────────

/** test = wird einzeln getestet · konstant = läuft durchgehend weiter · pause = vorerst weglassen */
export type SuppMode = "test" | "konstant" | "pause"

export interface MySupp {
  id: string          // libId oder "custom-xyz"
  name: string
  emoji: string
  dose: string
  lib?: string
  color: number
  mode: SuppMode
  /** Bewusst zum Testen behalten — Kolbi schlägt „durchgehend nehmen“ dafür nicht mehr vor. */
  keepTesting?: boolean
  /** Persönliche Einnahme-Uhrzeit (HH:MM), von dir bestätigt – gewinnt vor Kolbis Tageszeit. */
  time?: string
  /** 🛒 Noch nicht da (bestellt/auf der Einkaufsliste) seit diesem Datum — zählt dann nirgends mit. */
  away?: string
  /** Vorrat: Packung, Tagesmenge, Reichweite (optional). */
  stock?: Stock
}

/** Form der Packung: Kapseln/Tabletten (Stück), Pulver (g), Tropfen (Flasche in ml, Tagesmenge in Tropfen), Flüssig (ml). */
export type StockForm = "kapseln" | "pulver" | "tropfen" | "fluessig"

export interface Stock {
  form: StockForm
  pack: number      // Inhalt einer Packung (Stück · g · ml)
  perDay: number    // pro Einnahme (Stück · g · Tropfen · ml)
  left: number      // Rest beim Eintragen (gleiche Einheit wie pack)
  at: string        // Datum des Eintragens — Verbrauch zählt ab dem Folgetag
  active?: number   // Wirkstoff pro Stück/Tropfen/ml bzw. pro g (in activeUnit), optional
  activeUnit?: "mg" | "µg" | "IE"
  ordered?: string  // Nachbestellt am …
  price?: number    // € pro Packung (optional) → Kosten pro Monat
}

/** Ist das Supplement gerade im Haus? (Einkaufsliste = nicht da) */
export function isHere(x: MySupp | undefined) { return !!x && !x.away }

/**
 * baseline = nichts nehmen · test = ein Supplement allein · washout = Pause nach einem Test
 * stack = alle behaltenen zusammen (offen) · check = Stack ohne ein Supplement (beobachten)
 */
export type PhaseKind = "baseline" | "test" | "washout" | "stack" | "check"

/** Phasen werden Schritt für Schritt gestartet; `start` = Startdatum (ältere Daten: fortlaufend). */
export interface Phase { id: string; kind: PhaseKind; suppId?: string; days: number; start?: string; open?: boolean }

export interface CheckIn {
  date: string // YYYY-MM-DD
  scores: Partial<Record<Dim, number>> // 1–5
  tags: string[]              // Störfaktoren
  sides?: Record<string, number> // Nebenwirkung → 1 leicht / 2 stark
  note: string
  quick?: boolean // 1-Klick-Check-in (alle Bereiche = Gesamtgefühl)
  at?: string     // Uhrzeit des Check-ins (HH:MM), automatisch
}

export type Decision = "keep" | "maybe" | "drop"
export interface Verdict { decision: Decision; note: string; date: string }

export interface Reminders { enabled: boolean; checkin: string; intake: boolean }

/** Objektive Tageswerte aus Apple Health / Google Health Connect (nur Store-App, optional). */
export interface HealthDay { sleepHours?: number; hrvMs?: number }

export interface LabState {
  v: 2
  startDate: string | null
  goals: GoalId[]
  supps: MySupp[]
  phases: Phase[]
  checkins: Record<string, CheckIn>
  verdicts: Record<string, Verdict>
  slotOverrides: Record<string, SlotId>
  took: Record<string, string[]> // Datum → eingenommene Supplement-IDs
  tookAt: Record<string, Record<string, string>> // Datum → Supplement → Uhrzeit (HH:MM)
  settings: Settings
  reminders: Reminders
  xp: number
  badges: string[]
  demo?: boolean
  health: Record<string, HealthDay> // Datum → Schlaf/HRV aus Apple Health / Health Connect
  healthEnabled: boolean
  learned: string[] // entdeckte Kolbi-Fakten (IDs)
  recapSeen?: string // Sonntag der zuletzt angesehenen Wochen-Story
  community?: boolean // anonym Testergebnisse teilen? (undefined = noch nicht gefragt)
  queue?: string[]     // Test-Reihenfolge aus einem Experiment (Supplement-IDs)
  experiment?: string  // zuletzt gestartetes Experiment
  pro?: { founder?: string; purchased?: string } // Lab Pro: Gründer (Beta) oder gekauft
  review?: { asked: string[]; answer?: "love" | "ok" | "meh" } // Bewertungs-Moment
}

export const STORAGE_KEY = "true-supplement-lab-v1"

export function emptyState(): LabState {
  return {
    v: 2, startDate: null, goals: [], supps: [], phases: [], checkins: {}, verdicts: {},
    slotOverrides: {}, took: {}, tookAt: {}, settings: { ...DEFAULT_SETTINGS },
    reminders: { enabled: false, checkin: "22:00", intake: true }, xp: 0, badges: [],
    health: {}, healthEnabled: false, learned: [],
  }
}

/** Liest & migriert gespeicherte Daten (v1 → v2). */
export function hydrate(raw: unknown): LabState {
  const p = (raw ?? {}) as Partial<LabState> & { taken?: Record<string, boolean> }
  const s: LabState = {
    ...emptyState(), ...p, v: 2,
    goals: p.goals ?? [],
    settings: { ...DEFAULT_SETTINGS, ...p.settings },
    reminders: { ...emptyState().reminders, ...p.reminders },
    supps: (p.supps ?? []).map(x => ({ ...x, mode: x.mode ?? "test" })),
    took: p.took ?? {},
    tookAt: p.tookAt ?? {},
    health: p.health ?? {},
    healthEnabled: p.healthEnabled ?? false,
    learned: p.learned ?? [],
  }
  for (const c of Object.values(s.checkins)) {
    const legacy = c.tags.filter(t => LEGACY_TAG_SIDES[t])
    if (!legacy.length) continue
    c.sides = { ...Object.fromEntries(legacy.map(t => [LEGACY_TAG_SIDES[t], 1])), ...c.sides }
    c.tags = c.tags.filter(t => !LEGACY_TAG_SIDES[t])
  }
  setDayBoundary(s.settings)
  if (p.taken) {
    for (const [date, v] of Object.entries(p.taken)) {
      const id = v ? testSuppOn(s, date) : null
      if (id) s.took[date] = [...new Set([...(s.took[date] ?? []), id])]
    }
    delete (s as Partial<typeof p>).taken
  }
  return s
}

export function loadState(): LabState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? hydrate(JSON.parse(raw)) : emptyState()
  } catch {
    return emptyState()
  }
}

export function saveState(s: LabState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

// Kapsel-Farben (kategoriale Palette, feste Reihenfolge)
export const SUPP_COLORS = ["#3987e5", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#9085e9", "#e34948", "#008300"]
export function suppColor(s: MySupp | undefined) { return s ? SUPP_COLORS[s.color % SUPP_COLORS.length] : "#8a8a99" }

/**
 * Kolbis Standard-Empfehlung: Langsam wirkende Nicht-Peptide (Vitamine, Mineralien, Kreatin …)
 * lassen sich in ein paar Tagen kaum sinnvoll testen — die nimmt man einfach durchgehend.
 * Peptide bleiben immer Testkandidaten, auch bei langsamem Wirkeintritt (bewusste Kur).
 */
export function defaultMode(lib: LibSupp): SuppMode {
  if (lib.rx) return "konstant"
  if (lib.onset === "langsam" && lib.category !== "Peptide") return "konstant"
  return "test"
}

export function makeSupp(lib: LibSupp | null, name: string, existing: MySupp[], dose = ""): MySupp {
  const used = new Set(existing.map(s => s.color))
  let color = 0
  while (used.has(color) && color < SUPP_COLORS.length) color++
  if (color >= SUPP_COLORS.length) color = existing.length % SUPP_COLORS.length
  if (lib) return { id: lib.id, name: lib.name, emoji: lib.emoji, dose: dose || lib.dose, lib: lib.id, color, mode: defaultMode(lib) }
  return { id: `custom-${Date.now().toString(36)}-${existing.length}`, name, emoji: "💊", dose, color, mode: "test" }
}

export function libOf(s: MySupp | undefined) { return s?.lib ? LIB_BY_ID[s.lib] : undefined }

// ── Datum ──────────────────────────────────────────────────────────────────────

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
/**
 * Der „Lab-Tag“ beginnt nicht um Mitternacht, sondern kurz vor dem Aufstehen (Aufstehzeit − 3 h,
 * frühestens 0:00, spätestens 5:00). Ein Check-in um 0:30 gehört so noch zum Vortag.
 */
let DAY_START = 240
export function dayStartMin(st: Pick<Settings, "wake">) { return Math.max(0, Math.min(300, toMin(st.wake) - 180)) }
export function setDayBoundary(st: Pick<Settings, "wake">) { DAY_START = dayStartMin(st) }
export function todayIso() { return isoDate(new Date(Date.now() - DAY_START * 60_000)) }
export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number)
  return isoDate(new Date(y, m - 1, d + n))
}
export function diffDays(a: string, b: string) {
  const [y1, m1, d1] = a.split("-").map(Number)
  const [y2, m2, d2] = b.split("-").map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}
export function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })
}

// ── Phasen-Zeitplan ─────────────────────────────────────────────────────────────

export interface PhaseWindow extends Phase { start: string; end: string /* inklusiv */; index: number }

export function phaseWindows(s: Pick<LabState, "startDate" | "phases">): PhaseWindow[] {
  if (!s.startDate) return []
  let cursor = s.startDate
  return s.phases.map((p, index) => {
    const start = p.start ?? cursor
    const end = addDays(start, Math.max(1, p.days) - 1)
    cursor = addDays(end, 1)
    return { ...p, start, end, index }
  })
}

export function phaseAt(s: Pick<LabState, "startDate" | "phases">, date: string): PhaseWindow | null {
  return phaseWindows(s).find(w => date >= w.start && date <= w.end) ?? null
}

export function buildPhases(testIds: string[], testDays: Record<string, number>, washout: number, baselineDays = 7): Phase[] {
  const phases: Phase[] = [{ id: "baseline", kind: "baseline", days: baselineDays }]
  testIds.forEach((id, i) => {
    phases.push({ id: `test-${id}`, kind: "test", suppId: id, days: testDays[id] ?? 5 })
    if (washout > 0 && i < testIds.length - 1) phases.push({ id: `wash-${id}`, kind: "washout", suppId: id, days: washout })
  })
  return phases
}

/** Automatische Testreihenfolge: schnell wirkende & zielrelevante zuerst. */
const ONSET_RANK: Record<Onset, number> = { schnell: 0, mittel: 1, langsam: 2 }
export function autoOrder(supps: MySupp[], goals: GoalId[]) {
  return [...supps].sort((a, b) => {
    const la = libOf(a), lb = libOf(b)
    const oa = la ? ONSET_RANK[la.onset] : 1, ob = lb ? ONSET_RANK[lb.onset] : 1
    if (oa !== ob) return oa - ob
    return goalRelevance(lb?.id ?? "", goals) - goalRelevance(la?.id ?? "", goals)
  })
}
export function defaultDays(s: MySupp) {
  const lib = libOf(s)
  return lib ? ONSET_INFO[lib.onset].days : 5
}

export function testSuppOn(s: Pick<LabState, "startDate" | "phases">, date: string): string | null {
  const w = phaseAt(s, date)
  return w?.kind === "test" && w.suppId ? w.suppId : null
}

/** Was steht an einem Tag auf dem Einnahmeplan? Test-Supplement + durchgehende. */
export function intakeOn(s: LabState, date: string): string[] {
  const first = phaseWindows(s)[0]
  if (!first || date < first.start) return []
  // Wöchentliche (z. B. GLP-1) nur am Wochentag des Experiment-Starts
  const sameWeekday = diffDays(first.start, date) % 7 === 0
  const ids = s.supps.filter(x => x.mode === "konstant" && isHere(x) && (!libOf(x)?.weekly || sameWeekday)).map(x => x.id)
  const w = phaseAt(s, date)
  if (w?.kind === "test" && w.suppId && !ids.includes(w.suppId)) ids.unshift(w.suppId)
  if (w?.kind === "stack" || w?.kind === "check") {
    const kept = s.supps.filter(x => s.verdicts[x.id]?.decision === "keep" && isHere(x) && !ids.includes(x.id) && !(w.kind === "check" && x.id === w.suppId))
      .filter(x => !libOf(x)?.weekly || sameWeekday)
    ids.unshift(...kept.map(x => x.id))
  }
  return ids
}

// ── Statistik ──────────────────────────────────────────────────────────────────

export type Scores = Partial<Record<Dim, number>>

export function avgScores(checkins: CheckIn[]): Scores | null {
  if (!checkins.length) return null
  const sum: Scores = {}, n: Scores = {}
  for (const c of checkins) for (const [k, v] of Object.entries(c.scores) as [Dim, number][]) {
    if (v == null) continue
    sum[k] = (sum[k] ?? 0) + v
    n[k] = (n[k] ?? 0) + 1
  }
  const out: Scores = {}
  for (const k of Object.keys(sum) as Dim[]) out[k] = sum[k]! / n[k]!
  return out
}

export function checkinsIn(s: LabState, w: { start: string; end: string }): CheckIn[] {
  return Object.values(s.checkins).filter(c => c.date >= w.start && c.date <= w.end).sort((a, b) => a.date.localeCompare(b.date))
}

export function baselineAvg(s: LabState) {
  const w = phaseWindows(s).find(p => p.kind === "baseline")
  return w ? avgScores(checkinsIn(s, w)) : null
}

/** Tages-Score = Durchschnitt aller bewerteten Bereiche (1–5 Sterne). */
export function daySum(c: CheckIn) {
  const vals = Object.values(c.scores).filter((v): v is number => v != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 3
}

export interface SideStat { id: string; days: number; strong: number }

/** Nebenwirkungs-Last: Ø Schwere pro Tag (0 = nichts, 1 = eine leichte …) und Häufigkeit je Symptom. */
export function sideStats(cs: CheckIn[]) {
  const m = new Map<string, SideStat>()
  let load = 0
  for (const c of cs) for (const [id, sev] of Object.entries(c.sides ?? {})) {
    if (!sev) continue
    const x = m.get(id) ?? { id, days: 0, strong: 0 }
    x.days++; if (sev >= 2) x.strong++
    m.set(id, x)
    load += sev
  }
  return { load: cs.length ? load / cs.length : 0, list: [...m.values()].sort((a, b) => b.strong - a.strong || b.days - a.days) }
}

export function knownSides(s: LabState, suppIds: string[]): string[] {
  const ids = suppIds.flatMap(id => LIB_SIDES[libOf(s.supps.find(x => x.id === id))?.id ?? ""] ?? [])
  return [...new Set(ids)]
}

export function testResult(s: LabState, suppId: string) {
  const w = phaseWindows(s).find(p => p.kind === "test" && p.suppId === suppId)
  if (!w) return null
  const cs = checkinsIn(s, w)
  const avg = avgScores(cs)
  const base = baselineAvg(s)
  const baseW = phaseWindows(s).find(p => p.kind === "baseline")
  const baseDay = baseW ? checkinsIn(s, baseW).map(daySum) : []
  const testDay = cs.map(daySum)
  const mean = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null
  const overall = { base: mean(baseDay), test: mean(testDay) }
  const sTest = sideStats(cs)
  const sBase = sideStats(baseW ? checkinsIn(s, baseW) : [])
  const baseRate = new Map(sBase.list.map(x => [x.id, baseW ? x.days / Math.max(1, checkinsIn(s, baseW).length) : 0]))
  // Nebenwirkungen, die im Test häufiger sind als im Reset
  const newSides = sTest.list.filter(x => x.days / Math.max(1, cs.length) > (baseRate.get(x.id) ?? 0) + 0.15 || x.strong > 0)
  const sides = { load: sTest.load, baseLoad: sBase.load, extra: Math.max(0, sTest.load - sBase.load), list: newSides, strongDays: cs.filter(c => Object.values(c.sides ?? {}).some(v => v >= 2)).length }
  if (!avg || !base) return { window: w, n: cs.length, avg, base, delta: null, dims: [] as Dim[], total: 0, overall, sides, tags: tagCounts(cs) }
  const delta: Scores = {}
  const dims: Dim[] = []
  let total = 0
  for (const d of DIMS) {
    if (avg[d.id] == null || base[d.id] == null) continue
    delta[d.id] = avg[d.id]! - base[d.id]!
    dims.push(d.id)
    total += delta[d.id]!
  }
  return { window: w, n: cs.length, avg, base, delta, dims, total, overall, sides, tags: tagCounts(cs) }
}

function tagCounts(cs: CheckIn[]) {
  const m: Record<string, number> = {}
  cs.forEach(c => c.tags.forEach(t => { m[t] = (m[t] ?? 0) + 1 }))
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

export interface Signal {
  key: "none" | "few" | "strong" | "light" | "flat" | "neg" | "tradeoff"
  text: string; emoji: string; focus: Dim | null; suggestion: Decision | null
  benefit: number   // gewichteter Nutzen (Ø Sterne-Veränderung)
  cost: number      // zusätzliche Nebenwirkungs-Last
  net: number
  pros: Dim[]; cons: Dim[]
}

/** Nutzen vs. Nebenwirkungen — gewichtet nach den Bereichen, die für das Supplement & deine Ziele zählen. */
export function signal(s: LabState, suppId: string): Signal {
  const r = testResult(s, suppId)
  const cost = r?.sides.extra ?? 0
  const empty = { benefit: 0, cost, net: -cost, pros: [] as Dim[], cons: [] as Dim[] }
  if (!r || !r.delta || !r.dims.length) return { key: "none", text: "Noch keine Vergleichsdaten", emoji: "⏳", focus: null, suggestion: null, ...empty }
  const lib = libOf(s.supps.find(x => x.id === suppId))
  const goalDims = s.goals.flatMap(g => GOAL_BY_ID[g]?.dims ?? [])
  const weights = new Map<Dim, number>()
  r.dims.forEach(d => weights.set(d, 1))
  lib?.watch.forEach(d => weights.has(d) && weights.set(d, weights.get(d)! + 1))
  goalDims.forEach(d => weights.has(d) && weights.set(d, weights.get(d)! + 1))
  let wsum = 0, acc = 0
  weights.forEach((w, d) => { wsum += w; acc += w * r.delta![d]! })
  const benefit = acc / wsum
  // 1 leichte Nebenwirkung pro Tag kostet etwa so viel wie ½ Stern Nutzen; starke Tage extra
  const net = benefit - 0.5 * cost - 0.15 * r.sides.strongDays
  const pros = r.dims.filter(d => r.delta![d]! >= 0.3).sort((a, b) => r.delta![b]! - r.delta![a]!)
  const cons = r.dims.filter(d => r.delta![d]! <= -0.3).sort((a, b) => r.delta![a]! - r.delta![b]!)
  const best = [...r.dims].sort((a, b) => r.delta![b]! - r.delta![a]!)[0]
  const base = { focus: best, benefit, cost, net, pros, cons }
  const hasSides = r.sides.list.length > 0 && (cost >= 0.4 || r.sides.strongDays > 0)
  if (r.n < 3) return { key: "few", text: `Erst ${r.n} Check-in${r.n === 1 ? "" : "s"} — noch wenig aussagekräftig`, emoji: "🤏", suggestion: "maybe", ...base }
  if (hasSides && benefit >= 0.2) {
    return net >= 0.2
      ? { key: "tradeoff", text: "Wirkt — aber mit Nebenwirkungen", emoji: "⚖️", suggestion: "maybe", ...base }
      : { key: "tradeoff", text: "Nebenwirkungen fressen den Nutzen auf", emoji: "⚠️", suggestion: "drop", ...base }
  }
  if (net >= 0.45) return { key: "strong", text: "Deutliches Plus", emoji: "💚", suggestion: "keep", ...base }
  if (net >= 0.2) return { key: "light", text: "Leichtes Plus", emoji: "🌱", suggestion: "keep", ...base }
  if (net <= -0.25) return { key: "neg", text: hasSides ? "Eher negativ — vor allem Nebenwirkungen" : "Eher negativ", emoji: "⚠️", suggestion: "drop", ...base }
  return { key: "flat", text: lib?.onset === "langsam" ? "Kein klarer Effekt — wirkt aber auch langsam" : "Kein klarer Effekt", emoji: "😶", suggestion: lib?.onset === "langsam" ? "maybe" : "drop", ...base }
}

export function streak(s: LabState): number {
  let n = 0
  let d = todayIso()
  if (!s.checkins[d]) d = addDays(d, -1)
  while (s.checkins[d]) { n++; d = addDays(d, -1) }
  return n
}

// ── Level & Badges ─────────────────────────────────────────────────────────────

export const LEVELS = [
  { xp: 0,    name: "Neugierig",      emoji: "🧪" },
  { xp: 150,  name: "Laborant",       emoji: "🥼" },
  { xp: 400,  name: "Forscher",       emoji: "🔬" },
  { xp: 800,  name: "Selbst-Kenner",  emoji: "🧠" },
  { xp: 1400, name: "Stack-Meister",  emoji: "🏆" },
]

export function levelFor(xp: number) {
  let i = 0
  LEVELS.forEach((l, idx) => { if (xp >= l.xp) i = idx })
  const cur = LEVELS[i]
  const next = LEVELS[i + 1]
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1
  return { ...cur, index: i, next, progress }
}

export const BADGES: { id: string; emoji: string; name: string; desc: string }[] = [
  { id: "first",    emoji: "🌱", name: "Erster Schritt",   desc: "Ersten Check-in gemacht" },
  { id: "streak3",  emoji: "🔥", name: "Dranbleiber",      desc: "3 Tage am Stück eingecheckt" },
  { id: "streak7",  emoji: "☄️", name: "Unaufhaltsam",     desc: "7 Tage am Stück eingecheckt" },
  { id: "reminder", emoji: "🔔", name: "Organisiert",      desc: "Erinnerungen eingerichtet" },
  { id: "reset",    emoji: "🧘", name: "Reset gemeistert", desc: "Baseline-Woche abgeschlossen" },
  { id: "verdict1", emoji: "⚖️", name: "Erstes Urteil",    desc: "Erstes Supplement bewertet" },
  { id: "verdict3", emoji: "🔬", name: "Wissenschaftler",  desc: "3 Supplements bewertet" },
  { id: "drop",     emoji: "✂️", name: "Ausgemistet",      desc: "Ein Supplement rausgeworfen — Geld gespart" },
  { id: "stack",    emoji: "🏆", name: "Stack-Architekt",  desc: "Deinen persönlichen Stack gebaut" },
]

export function computeBadges(s: LabState): string[] {
  const got = new Set(s.badges)
  const nCheck = Object.keys(s.checkins).length
  const st = streak(s)
  if (nCheck >= 1) got.add("first")
  if (st >= 3) got.add("streak3")
  if (st >= 7) got.add("streak7")
  if (s.reminders.enabled) got.add("reminder")
  const base = phaseWindows(s).find(p => p.kind === "baseline")
  if (base && todayIso() > base.end && checkinsIn(s, base).length >= 4) got.add("reset")
  const verdicts = Object.values(s.verdicts)
  if (verdicts.length >= 1) got.add("verdict1")
  if (verdicts.length >= 3) got.add("verdict3")
  if (verdicts.some(v => v.decision === "drop")) got.add("drop")
  if (verdicts.filter(v => v.decision === "keep").length >= 1 && verdicts.length >= 2) got.add("stack")
  return [...got]
}

// ── Stack-Builder: perfekter Tagesplan ──────────────────────────────────────────

export interface StackPlacement { suppId: string; slot: SlotId }
export interface StackIssue { a: string; b: string; text: string }

function slotOf(suppId: string, s: LabState): SlotId[] {
  const lib = libOf(s.supps.find(x => x.id === suppId))
  let slots: SlotId[] = lib?.slots ?? ["fruehstueck"]
  if (!s.settings.training) {
    const noTrain = slots.filter(x => x !== "training")
    slots = noTrain.length ? noTrain : ["fruehstueck"]
  }
  return slots
}

export function allowedSlots(suppId: string, s: LabState): SlotId[] {
  const pref = slotOf(suppId, s)
  const rest = SLOTS.map(x => x.id).filter(x => !pref.includes(x) && (x !== "training" || s.settings.training))
  return [...pref, ...rest]
}

export function slotFor(suppId: string, s: LabState): SlotId {
  return s.slotOverrides[suppId] ?? slotOf(suppId, s)[0]
}

/** Geplante Einnahme in Minuten (Aufsteh-Tag): deine bestätigte Uhrzeit, sonst Kolbis Tageszeit. */
export function suppMinutes(suppId: string, s: LabState): number {
  const t = s.supps.find(x => x.id === suppId)?.time
  return t ? relMin(toMin(t), s.settings) : slotMinutes(slotFor(suppId, s), s.settings)
}
export function suppTime(suppId: string, s: LabState) { return fromMin(suppMinutes(suppId, s)) }

/** Ø der letzten n tatsächlichen Einnahme-Zeiten (Aufsteh-Tag-Minuten). */
export function recentIntake(s: LabState, id: string, n = 3): { avg: number; count: number } | null {
  const times = Object.keys(s.tookAt).sort().reverse().map(d => s.tookAt[d]?.[id]).filter(Boolean).slice(0, n)
    .map(t => relMin(toMin(t as string), s.settings))
  if (!times.length) return null
  return { avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length), count: times.length }
}

const UNKNOWN_TIMING = "Kenne ich nicht genau. Tipp: jeden Tag zur gleichen Zeit, am besten zu einer Mahlzeit – so vergisst du es nicht und verträgst es meist besser."

/** Kolbis Zeit-Empfehlung (nur ein Tipp; eigene Wahl steht in slotOverrides). */
export function timeTip(s: LabState, suppId: string) {
  const lib = libOf(s.supps.find(q => q.id === suppId))
  const recommended = slotOf(suppId, s)[0]
  const slot = slotFor(suppId, s)
  const info = SLOTS.find(q => q.id === slot)!
  const rec = SLOTS.find(q => q.id === recommended)!
  return {
    slot, recommended, own: slot !== recommended, known: !!lib,
    time: suppTime(suppId, s), personal: s.supps.find(q => q.id === suppId)?.time ?? null, label: info.label, emoji: info.emoji,
    recTime: slotTime(recommended, s.settings), recLabel: rec.label, recEmoji: rec.emoji,
    why: lib?.timing ?? UNKNOWN_TIMING,
  }
}

/** Zeit-Tipp für ein Bibliotheks-Supplement, bevor es in der Liste ist (z. B. beim Hinzufügen). */
export function libTimeTip(lib: LibSupp, settings?: Settings) {
  const slot = lib.slots.find(x => x !== "training" || settings?.training) ?? "fruehstueck"
  const info = SLOTS.find(q => q.id === slot)!
  return { slot, label: info.label, emoji: info.emoji, time: settings ? slotTime(slot, settings) : null, why: lib.timing }
}

function libKey(suppId: string, s: LabState) { return s.supps.find(x => x.id === suppId)?.lib ?? suppId }

/** Welche Supplements gehören in den Stack? Behalten + durchgehende (außer rausgeworfen). */
export function stackMembers(s: LabState, withMaybe: boolean) {
  return s.supps.filter(x => {
    const v = s.verdicts[x.id]?.decision
    if (v === "drop") return false
    if (v === "keep") return true
    if (v === "maybe") return withMaybe
    return x.mode === "konstant"
  })
}

/** Platziert Supplements greedy in ihre bevorzugten Slots und löst Konflikte (≥2 h Abstand). */
export function buildStack(suppIds: string[], s: LabState): { placements: StackPlacement[]; weekly: string[]; issues: StackIssue[]; combos: PairRule[] } {
  const placements: StackPlacement[] = []
  const weekly = suppIds.filter(id => libOf(s.supps.find(x => x.id === id))?.weekly)
  const daily = suppIds.filter(id => !weekly.includes(id))
  const tooClose = (x: SlotId, y: SlotId) => Math.abs(slotMinutes(x, s.settings) - slotMinutes(y, s.settings)) < 120

  const order = [...daily].sort((a, b) => slotOf(a, s).length - slotOf(b, s).length)
  for (const id of order) {
    const override = s.slotOverrides[id]
    if (override) { placements.push({ suppId: id, slot: override }); continue }
    const prefs = slotOf(id, s)
    const conflictFree = prefs.find(slot => !placements.some(p => {
      const r = pairRule(libKey(id, s), libKey(p.suppId, s))
      return r?.kind === "trennen" && tooClose(slot, p.slot)
    }))
    placements.push({ suppId: id, slot: conflictFree ?? prefs[0] })
  }

  const issues: StackIssue[] = []
  const combos: PairRule[] = []
  for (let i = 0; i < suppIds.length; i++) {
    for (let j = i + 1; j < suppIds.length; j++) {
      const r = pairRule(libKey(suppIds[i], s), libKey(suppIds[j], s))
      if (!r) continue
      if (r.kind === "combo") { combos.push(r); continue }
      const p = placements.find(x => x.suppId === suppIds[i]), q = placements.find(x => x.suppId === suppIds[j])
      if (p && q && tooClose(p.slot, q.slot)) issues.push({ a: p.suppId, b: q.suppId, text: r.text })
    }
  }
  placements.sort((a, b) => slotMinutes(a.slot, s.settings) - slotMinutes(b.slot, s.settings))
  return { placements, weekly, issues, combos }
}

// ── Schritt-für-Schritt-Ablauf ─────────────────────────────────────────────────

export function nowTime(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function activePhase(s: LabState, today = todayIso()): PhaseWindow | null {
  return phaseAt(s, today)
}

export function lastPhase(s: LabState): PhaseWindow | null {
  const w = phaseWindows(s)
  return w[w.length - 1] ?? null
}

/** Welche Supplements warten noch auf ihren Test? (automatisch sortiert) */
export function nextCandidates(s: LabState): MySupp[] {
  const tested = new Set(phaseWindows(s).filter(w => w.kind === "test").map(w => w.suppId))
  const list = autoOrder(s.supps.filter(x => x.mode === "test" && isHere(x) && !s.verdicts[x.id] && !tested.has(x.id)), s.goals)
  // Experiment-Reihenfolge hat Vorrang (stabil sortiert, Rest bleibt wie von Kolbi geordnet)
  const q = s.queue ?? []
  const rank = (id: string) => { const i = q.indexOf(id); return i < 0 ? q.length : i }
  return q.length ? list.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x.id) - rank(b.x.id) || a.i - b.i).map(o => o.x) : list
}

/**
 * Grobe Erkennung "das klingt nach einer Dauertherapie, die man nicht zum Testen absetzt"
 * (Hormone, Blutverdünner, Psychopharmaka, Blutdruck- und Blutzuckermedikamente …).
 * Nur ein Hinweis, keine Diagnose — betrifft ausschließlich eigene, nicht in der Bibliothek
 * geführte Einträge, weil dort ohnehin keine Dauer-Empfehlung möglich ist.
 */
const PRESCRIPTION_HINTS = /testosteron|trt\b|hormonersatz|\bhrt\b|\bivf\b|insulin|levothyroxin|l-thyroxin|euthyrox|schilddrüsenhormon|kortison|cortison|prednisolon|ssri|antidepress|citalopram|sertralin|fluoxetin|escitalopram|\bpille\b|verhütung|marcumar|warfarin|blutverdünner|blutdruck|ramipril|metformin|opioid|methadon|\bbenzo\b|xanax|tavor|schilddrüse|antibabypille/i
export function looksPrescribed(name: string) { return PRESCRIPTION_HINTS.test(name) }

export type SuppStatusKey = "waiting" | "testing" | "kept" | "maybe" | "dropped" | "constant" | "paused" | "observing" | "verdict" | "away"

export function suppStatus(s: LabState, id: string, today = todayIso()): { key: SuppStatusKey; label: string; emoji: string } {
  const w = phaseAt(s, today)
  const x = s.supps.find(q => q.id === id)
  const v = s.verdicts[id]?.decision
  if (x?.away) return { key: "away", label: "Noch nicht da", emoji: "🛒" }
  if (w?.kind === "test" && w.suppId === id) return { key: "testing", label: `Im Test · Tag ${diffDays(w.start, today) + 1}/${w.days}`, emoji: "🔬" }
  if (w?.kind === "check" && w.suppId === id) return { key: "observing", label: "Pausiert zum Beobachten", emoji: "👀" }
  if (v === "keep") return { key: "kept", label: "Behalten", emoji: "💚" }
  if (v === "maybe") return { key: "maybe", label: "Vielleicht", emoji: "🤔" }
  if (v === "drop") return { key: "dropped", label: "Rausgeflogen", emoji: "✂️" }
  if (x?.mode === "konstant") return { key: "constant", label: "Läuft durchgehend", emoji: "📌" }
  if (x?.mode === "pause") return { key: "paused", label: "Pausiert", emoji: "⏸️" }
  if (phaseWindows(s).some(p => p.kind === "test" && p.suppId === id && p.end < today)) return { key: "verdict", label: "Urteil fällig", emoji: "⚖️" }
  return { key: "waiting", label: "Wartet auf Test", emoji: "⏳" }
}

/** Einnahme-Dauer: an wie vielen Tagen genommen, seit wann. */
export function takingInfo(s: LabState, id: string) {
  const dates = Object.keys(s.took).filter(d => s.took[d]?.includes(id)).sort()
  return { days: dates.length, since: dates[0] ?? null }
}

/** Ø Einnahme-Uhrzeit in Minuten (aus den automatisch gespeicherten Zeiten). */
export function avgIntakeMinutes(s: LabState, id: string): number | null {
  const times = Object.values(s.tookAt).map(m => m[id]).filter(Boolean).map(toMin)
  if (times.length < 2) return null
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
}

/** Ende einer Phase (letzter Tag, 23:59) als Zeitstempel. */
export function phaseEndsAt(w: { end: string }) {
  const [y, m, d] = w.end.split("-").map(Number)
  return new Date(y, m - 1, d, 23, 59, 59).getTime()
}

export function fmtCountdown(ms: number) {
  if (ms <= 0) return "jetzt"
  const min = Math.floor(ms / 60000)
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
  if (d > 0) return `${d} T ${h} Std`
  if (h > 0) return `${h} Std ${m} Min`
  return `${m} Min`
}

/** Aktive Phase beenden (heute mitgerechnet oder nicht). Gibt den neuen Zustand zurück. */
export function closeActive(s: LabState, today: string, includeToday: boolean): LabState {
  const w = phaseAt(s, today)
  if (!w) return s
  const days = diffDays(w.start, today) + (includeToday ? 1 : 0)
  s.phases = days <= 0
    ? s.phases.filter((_, i) => i !== w.index)
    : s.phases.map((p, i) => i === w.index ? { ...p, start: w.start, days, open: false } : p)
  return s
}

/** Explizite Startdaten für alle Phasen festschreiben (damit neue Phasen frei starten können). */
function pinStarts(s: LabState) {
  const wins = phaseWindows(s)
  s.phases = s.phases.map((p, i) => ({ ...p, start: wins[i].start }))
}

export function startTest(s: LabState, suppId: string, today: string, days?: number): LabState {
  pinStarts(s)
  closeActive(s, today, false)
  const supp = s.supps.find(x => x.id === suppId)
  s.phases.push({ id: `test-${suppId}-${today}`, kind: "test", suppId, start: today, days: days ?? (supp ? defaultDays(supp) : 3) })
  s.supps = s.supps.map(x => x.id === suppId ? { ...x, mode: "test" } : x)
  return s
}

export function startStack(s: LabState, today: string): LabState {
  pinStarts(s)
  closeActive(s, today, false)
  s.phases.push({ id: `stack-${today}`, kind: "stack", start: today, days: 3650, open: true })
  return s
}

export function startCheck(s: LabState, suppId: string, today: string, days = 3): LabState {
  pinStarts(s)
  closeActive(s, today, false)
  s.phases.push({ id: `check-${suppId}-${today}`, kind: "check", suppId, start: today, days })
  return s
}

/** Urteil speichern; nach einem Test automatisch eine kurze Pause einplanen. */
export function applyVerdict(s: LabState, suppId: string, decision: Decision, note: string, today: string): LabState {
  s.verdicts[suppId] = { decision, note, date: today }
  const w = [...phaseWindows(s)].reverse().find(p => p.kind === "test" && p.suppId === suppId)
  if (!w) return s
  pinStarts(s)
  if (today <= w.end) closeActive(s, today, true) // früher beendet → heute ist der letzte Testtag
  const testEnd = today <= w.end ? today : w.end
  const isLast = phaseWindows(s)[phaseWindows(s).length - 1]?.index === w.index
  const wash = s.settings.washoutDays
  if (isLast && wash > 0) {
    const start = addDays(testEnd, 1)
    const end = addDays(start, wash - 1)
    if (end >= today) s.phases.push({ id: `wash-${suppId}-${start}`, kind: "washout", suppId, start, days: wash })
  }
  return s
}

/** Nach dem Beobachten: war das Supplement nötig? */
export function resolveCheck(s: LabState, suppId: string, keepIt: boolean, today: string): LabState {
  if (!keepIt) s.verdicts[suppId] = { decision: "drop", note: "Beim Stack-Check weggelassen, ohne dass etwas gefehlt hat", date: today }
  return startStack(s, today)
}

/** Ø Tages-Score einer Liste von Tagen. */
export function meanScore(cs: CheckIn[]): number | null {
  return cs.length ? cs.map(daySum).reduce((a, b) => a + b, 0) / cs.length : null
}

// ── Demo-Daten ─────────────────────────────────────────────────────────────────

export function demoState(): LabState {
  const s = emptyState()
  s.demo = true
  s.goals = ["schlaf", "regeneration", "fokus"]
  const third = STORE_MODE ? "ashwagandha" : "bpc157"
  const picks = ["magnesium", "theanin", third, "kreatin", "vitd", STORE_MODE ? "glycin" : "cjc-ipa"]
  s.supps = picks.map((id, i) => ({ ...makeSupp(LIB_BY_ID[id], LIB_BY_ID[id].name, []), color: i }))
  s.supps.find(x => x.id === "vitd")!.mode = "konstant"
  s.settings = { ...DEFAULT_SETTINGS, training: "18:00", washoutDays: 1 }
  s.reminders = { enabled: true, checkin: "22:00", intake: true }
  // Reset 5 T → Magnesium 3 T → Pause 1 T → L-Theanin 3 T → Pause 1 T → jetzt Tag 2 im dritten Test
  const total = 5 + 3 + 1 + 3 + 1 + 1
  const start = addDays(todayIso(), -total)
  s.startDate = start
  s.phases = [
    { id: "baseline", kind: "baseline", start, days: 5 },
    { id: "test-magnesium", kind: "test", suppId: "magnesium", start: addDays(start, 5), days: 3 },
    { id: "wash-magnesium", kind: "washout", suppId: "magnesium", start: addDays(start, 8), days: 1 },
    { id: "test-theanin", kind: "test", suppId: "theanin", start: addDays(start, 9), days: 3 },
    { id: "wash-theanin", kind: "washout", suppId: "theanin", start: addDays(start, 12), days: 1 },
    { id: `test-${third}`, kind: "test", suppId: third, start: addDays(start, 13), days: STORE_MODE ? 5 : 5 },
  ]
  const effects: Record<string, Scores> = {
    magnesium: { schlaf: 1.3, ruhe: 0.9, koerper: 0.4 },
    theanin: { ruhe: 0.8, fokus: 0.6, stimmung: 0.2 },
    bpc157: { gelenke: 1.1, koerper: 0.5, verdauung: 0.4 },
    ashwagandha: { ruhe: 0.8, schlaf: 0.6, gelenke: 0.3 },
  }
  let seed = 7
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  const windows = phaseWindows(s)
  const dims = activeDims(s)
  for (let i = 0; i < total; i++) {
    const date = addDays(start, i)
    const w = windows.find(x => date >= x.start && date <= x.end)
    const eff = w?.kind === "test" && w.suppId ? effects[w.suppId] ?? {} : {}
    const scores: Scores = {}
    for (const d of dims) {
      const base = d.id === "schlaf" ? 2.6 : d.id === "ruhe" ? 2.5 : d.id === "gelenke" ? 2.4 : 3
      scores[d.id] = Math.max(1, Math.min(5, Math.round(base + (eff[d.id] ?? 0) + (rnd() - 0.5) * 1.6)))
    }
    const tags: string[] = []
    const sides: Record<string, number> = {}
    if (i < 3) sides.kopfschmerz = i === 0 ? 2 : 1 // Koffein-Entzug im Reset
    if (w?.suppId === "magnesium" && w.kind === "test" && rnd() > 0.5) sides.traeume = 1
    if (w?.suppId === "theanin" && w.kind === "test" && rnd() > 0.4) sides.muede = 1
    if (w?.suppId === "bpc157" && rnd() > 0.3) sides.einstich = 1
    if (w?.suppId === "ashwagandha" && rnd() > 0.5) sides.muede = 1
    if (rnd() > 0.8) tags.push("Training")
    if (rnd() > 0.9) tags.push("Alkohol")
    s.checkins[date] = { date, scores, tags, sides, note: "", at: `2${Math.floor(rnd() * 3)}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}` }
    s.took[date] = intakeOn(s, date)
    s.tookAt[date] = Object.fromEntries(s.took[date].map(id => [id, fromMin(slotMinutes(slotFor(id, s), s.settings) + Math.round((rnd() - 0.3) * 60))]))
  }
  s.verdicts = {
    magnesium: { decision: "keep", note: "Schlafe tiefer, wache ruhiger auf.", date: addDays(start, 8) },
    theanin: { decision: "maybe", note: "Ruhiger mit Kaffee, aber kein Wow.", date: addDays(start, 12) },
  }
  s.xp = 20 * total + 180
  s.badges = computeBadges(s)
  return s
}
