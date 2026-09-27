// ── Supplement Lab ────────────────────────────────────────────────────────────
// Selbstexperiment: 1 Woche Reset (nichts nehmen) → Supplements einzeln testen →
// Vergleich mit der Baseline → persönlicher Stack mit perfektem Tagesplan.
// Alles lokal im Browser (localStorage), kein Login nötig.

// ── Dimensionen für den täglichen Check-in ──────────────────────────────────────

export type Dim = "energie" | "fokus" | "stimmung" | "ruhe" | "schlaf" | "koerper" | "verdauung"

export const DIMS: { id: Dim; label: string; emoji: string; question: string; low: string; high: string }[] = [
  { id: "energie",   label: "Energie",    emoji: "⚡", question: "Wie viel Energie hattest du heute?",        low: "leer",       high: "voll geladen" },
  { id: "fokus",     label: "Fokus",      emoji: "🎯", question: "Wie klar war dein Kopf?",                    low: "Nebel",      high: "messerscharf" },
  { id: "stimmung",  label: "Stimmung",   emoji: "☀️", question: "Wie war deine Stimmung?",                    low: "mies",       high: "richtig gut" },
  { id: "ruhe",      label: "Ruhe",       emoji: "🌊", question: "Wie entspannt warst du? (wenig Stress)",     low: "unter Strom", high: "tiefenentspannt" },
  { id: "schlaf",    label: "Schlaf",     emoji: "🌙", question: "Wie gut hast du letzte Nacht geschlafen?",   low: "katastrophal", high: "wie ein Stein" },
  { id: "koerper",   label: "Körper",     emoji: "💪", question: "Wie hat sich dein Körper angefühlt?",        low: "schlapp",    high: "stark & fit" },
  { id: "verdauung", label: "Verdauung",  emoji: "🌿", question: "Wie lief deine Verdauung?",                  low: "Chaos",      high: "top" },
]

export const FACES = ["😣", "😕", "😐", "🙂", "🤩"]

export const TAGS = [
  "Kopfschmerzen", "Müde am Nachmittag", "Unruhig / nervös", "Lebhafte Träume", "Früh wach",
  "Heißhunger", "Blähungen", "Übelkeit", "Guter Pump", "Motiviert", "Gereizt", "Kribbeln",
  "Wenig geschlafen", "Viel Stress", "Training", "Alkohol", "Krank",
]

// ── Tagesablauf-Slots ───────────────────────────────────────────────────────────

export type SlotId = "nuechtern" | "fruehstueck" | "mittag" | "training" | "nachmittag" | "abendessen" | "schlaf"

export const SLOTS: { id: SlotId; label: string; emoji: string; hint: string }[] = [
  { id: "nuechtern",   label: "Nach dem Aufstehen", emoji: "🌅", hint: "nüchtern, mit Wasser" },
  { id: "fruehstueck", label: "Zum Frühstück",      emoji: "🍳", hint: "mit Essen" },
  { id: "mittag",      label: "Zum Mittagessen",    emoji: "🥗", hint: "größte / fettreichste Mahlzeit" },
  { id: "training",    label: "Vor dem Training",   emoji: "🏋️", hint: "30–60 Min vorher" },
  { id: "nachmittag",  label: "Nachmittag",         emoji: "☕", hint: "Tief überbrücken" },
  { id: "abendessen",  label: "Zum Abendessen",     emoji: "🍲", hint: "mit Essen" },
  { id: "schlaf",      label: "Vor dem Schlafen",   emoji: "🛌", hint: "30–60 Min vorher" },
]

export interface Settings {
  wake: string      // "07:00"
  bed: string       // "23:00"
  training: string | null // "18:00" oder null
  washoutDays: number
}

export const DEFAULT_SETTINGS: Settings = { wake: "07:00", bed: "23:00", training: null, washoutDays: 2 }

function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0) }
function fromMin(m: number) { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}` }

/** Uhrzeit eines Slots aus Aufsteh-/Schlafenszeit. */
export function slotMinutes(slot: SlotId, s: Settings): number {
  const wake = toMin(s.wake)
  let bed = toMin(s.bed)
  if (bed <= wake) bed += 1440
  switch (slot) {
    case "nuechtern":   return wake + 10
    case "fruehstueck": return wake + 60
    case "mittag":      return wake + Math.round((bed - wake) * 0.38)
    case "training":    return s.training ? toMin(s.training) - 45 : wake + Math.round((bed - wake) * 0.62)
    case "nachmittag":  return wake + Math.round((bed - wake) * 0.52)
    case "abendessen":  return wake + Math.round((bed - wake) * 0.72)
    case "schlaf":      return bed - 45
  }
}
export function slotTime(slot: SlotId, s: Settings) { return fromMin(slotMinutes(slot, s)) }

// ── Supplement-Bibliothek ───────────────────────────────────────────────────────

export type Onset = "schnell" | "mittel" | "langsam"

export const ONSET_INFO: Record<Onset, { label: string; days: number; text: string }> = {
  schnell: { label: "Spürbar in Stunden–Tagen",  days: 4,  text: "Ideal für den 3–5-Tage-Test." },
  mittel:  { label: "Spürbar nach 1–3 Wochen",   days: 10, text: "Braucht einen längeren Testblock." },
  langsam: { label: "Wirkt über Wochen–Monate",  days: 14, text: "Kaum im Kurztest fühlbar — hier helfen Blutwerte mehr als Gefühl." },
}

export interface LibSupp {
  id: string
  name: string
  emoji: string
  category: "Schlaf & Ruhe" | "Energie & Fokus" | "Vitamine & Mineralien" | "Training" | "Darm & Immun" | "Stress & Adaptogene"
  onset: Onset
  slots: SlotId[]          // bevorzugte Reihenfolge
  dose: string
  effect: string           // was man erwarten kann
  watch: Dim[]             // wo man am ehesten was merkt
  timing: string           // Einnahme-Tipp
  caution?: string
  withFat?: boolean
}

export const LIBRARY: LibSupp[] = [
  { id: "magnesium", name: "Magnesium (Glycinat)", emoji: "🌙", category: "Schlaf & Ruhe", onset: "schnell",
    slots: ["schlaf", "abendessen"], dose: "200–400 mg", watch: ["schlaf", "ruhe", "koerper"],
    effect: "Kann entspannen, Schlaf vertiefen und Muskelkrämpfe lindern.",
    timing: "Abends, 1 h vor dem Schlafen. Citrat wirkt eher abführend, Glycinat ist sanfter.",
    caution: "Mit Abstand (≈2 h) zu Eisen und Zink einnehmen." },
  { id: "glycin", name: "Glycin", emoji: "💤", category: "Schlaf & Ruhe", onset: "schnell",
    slots: ["schlaf"], dose: "3 g", watch: ["schlaf", "energie"],
    effect: "Kann Einschlafen erleichtern und Morgenmüdigkeit reduzieren.",
    timing: "30–60 Min vor dem Schlafen, in Wasser gelöst (schmeckt süß)." },
  { id: "melatonin", name: "Melatonin", emoji: "🦉", category: "Schlaf & Ruhe", onset: "schnell",
    slots: ["schlaf"], dose: "0,5–1 mg", watch: ["schlaf", "energie"],
    effect: "Verschiebt die innere Uhr, hilft beim Einschlafen (Jetlag, Schichtarbeit).",
    timing: "30–60 Min vor dem Schlafen. Niedrig dosiert wirkt oft besser als hoch.",
    caution: "Nicht für Dauereinnahme gedacht. Bei Medikamenten ärztlich abklären." },
  { id: "theanin", name: "L-Theanin", emoji: "🍵", category: "Energie & Fokus", onset: "schnell",
    slots: ["fruehstueck", "schlaf"], dose: "100–200 mg", watch: ["ruhe", "fokus"],
    effect: "Ruhige Konzentration ohne Müdigkeit, glättet Koffein-Nervosität.",
    timing: "Morgens zusammen mit Kaffee — oder abends zum Runterkommen." },
  { id: "koffein", name: "Koffein / Kaffee", emoji: "☕", category: "Energie & Fokus", onset: "schnell",
    slots: ["fruehstueck", "training"], dose: "100–200 mg", watch: ["energie", "fokus", "schlaf"],
    effect: "Wacher und fokussierter — aber kann Schlaf und Ruhe kosten.",
    timing: "90 Min nach dem Aufstehen, spätestens 8 h vor dem Schlafen.",
    caution: "Im Reset weglassen = Entzugskopfschmerz möglich (2–9 Tage). Eher langsam reduzieren." },
  { id: "rhodiola", name: "Rhodiola Rosea", emoji: "🏔️", category: "Stress & Adaptogene", onset: "schnell",
    slots: ["nuechtern", "fruehstueck"], dose: "200–400 mg", watch: ["energie", "fokus", "ruhe"],
    effect: "Kann Stress-Erschöpfung und mentale Müdigkeit senken.",
    timing: "Morgens, möglichst nüchtern. Nicht abends — kann wach machen." },
  { id: "ashwagandha", name: "Ashwagandha", emoji: "🌿", category: "Stress & Adaptogene", onset: "langsam",
    slots: ["abendessen", "schlaf"], dose: "300–600 mg (KSM-66)", watch: ["ruhe", "schlaf", "stimmung"],
    effect: "Kann Stress und Cortisol senken, Schlaf verbessern.",
    timing: "Abends mit Essen. Wirkung baut sich über 4–8 Wochen auf.",
    caution: "Nicht in der Schwangerschaft, bei Schilddrüsen- oder Lebererkrankungen ärztlich abklären." },
  { id: "vitd", name: "Vitamin D3 + K2", emoji: "🌞", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["mittag", "fruehstueck"], dose: "1.000–2.000 IE", watch: ["stimmung", "energie"], withFat: true,
    effect: "Wichtig für Immunsystem, Knochen und Stimmung — v. a. im Winter.",
    timing: "Zur fettreichsten Mahlzeit. Blutwert 25(OH)D sagt mehr als Gefühl.",
    caution: "Hohe Dosen nur nach Blutbild." },
  { id: "omega3", name: "Omega-3 (EPA/DHA)", emoji: "🐟", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["mittag", "abendessen"], dose: "1–2 g EPA+DHA", watch: ["stimmung", "fokus", "koerper"], withFat: true,
    effect: "Entzündungshemmend, gut für Herz, Gehirn und Stimmung.",
    timing: "Zu einer Mahlzeit mit Fett — weniger Fischaufstoßen.",
    caution: "Bei Blutverdünnern ärztlich abklären." },
  { id: "zink", name: "Zink", emoji: "🛡️", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["abendessen", "mittag"], dose: "10–15 mg", watch: ["koerper", "stimmung"],
    effect: "Immunsystem, Haut, Testosteron — vor allem bei Mangel spürbar.",
    timing: "Mit Essen (nüchtern oft Übelkeit). Abstand zu Eisen & Calcium.",
    caution: "Langfristig über 25 mg/Tag kann Kupfermangel verursachen." },
  { id: "eisen", name: "Eisen", emoji: "🩸", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["nuechtern"], dose: "nach Blutbild", watch: ["energie", "koerper"],
    effect: "Gegen Müdigkeit — aber nur bei nachgewiesenem Mangel (Ferritin).",
    timing: "Nüchtern mit Vitamin C, ≥2 h Abstand zu Kaffee, Tee, Calcium, Zink, Magnesium.",
    caution: "Niemals ohne Blutbild supplementieren — zu viel Eisen schadet." },
  { id: "b12", name: "Vitamin B12", emoji: "🔋", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["fruehstueck", "nuechtern"], dose: "250–1.000 µg", watch: ["energie", "fokus"],
    effect: "Nerven & Blutbildung. Spürbar vor allem bei Mangel (vegan!).",
    timing: "Morgens — kann bei manchen leicht aktivierend wirken." },
  { id: "bkomplex", name: "B-Komplex", emoji: "🅱️", category: "Vitamine & Mineralien", onset: "mittel",
    slots: ["fruehstueck"], dose: "1 Kapsel", watch: ["energie", "stimmung"],
    effect: "Energiestoffwechsel. Färbt den Urin gelb — harmlos.",
    timing: "Morgens zum Frühstück, nicht abends (kann wach halten)." },
  { id: "vitc", name: "Vitamin C", emoji: "🍊", category: "Darm & Immun", onset: "mittel",
    slots: ["fruehstueck", "mittag"], dose: "200–500 mg", watch: ["koerper"],
    effect: "Immunsystem, Kollagenbildung, verbessert Eisenaufnahme.",
    timing: "Zu einer Mahlzeit. Mit Eisen zusammen = bessere Aufnahme." },
  { id: "probiotika", name: "Probiotika", emoji: "🦠", category: "Darm & Immun", onset: "mittel",
    slots: ["fruehstueck"], dose: "1 Kapsel", watch: ["verdauung", "stimmung"],
    effect: "Kann Verdauung und Darmflora unterstützen. Anfangs evtl. Blähungen.",
    timing: "Täglich zur gleichen Zeit, kurz vor oder zum Frühstück." },
  { id: "kreatin", name: "Kreatin", emoji: "🏋️", category: "Training", onset: "langsam",
    slots: ["fruehstueck", "training"], dose: "3–5 g", watch: ["koerper", "fokus", "energie"],
    effect: "Mehr Kraft & Leistung, evtl. auch mentale Ausdauer. Leichte Wassereinlagerung.",
    timing: "Timing egal — Hauptsache jeden Tag. Muskel-Sättigung nach ~3–4 Wochen." },
  { id: "citrullin", name: "L-Citrullin", emoji: "🔥", category: "Training", onset: "schnell",
    slots: ["training"], dose: "6–8 g", watch: ["koerper", "energie"],
    effect: "Besserer Pump und Ausdauer im Training.",
    timing: "30–60 Min vor dem Training." },
  { id: "betaalanin", name: "Beta-Alanin", emoji: "⚡", category: "Training", onset: "langsam",
    slots: ["training", "fruehstueck"], dose: "3–5 g", watch: ["koerper"],
    effect: "Mehr Ausdauer bei intensiven Sätzen. Kribbeln ist harmlos.",
    timing: "Täglich, gern aufgeteilt. Effekt nach 2–4 Wochen." },
  { id: "elektrolyte", name: "Elektrolyte", emoji: "💧", category: "Training", onset: "schnell",
    slots: ["nuechtern", "training"], dose: "1 Portion", watch: ["energie", "koerper", "fokus"],
    effect: "Weniger Kopfweh/Schlappheit bei Hitze, Sport oder Low-Carb.",
    timing: "Morgens in Wasser oder rund ums Training." },
  { id: "kollagen", name: "Kollagen", emoji: "✨", category: "Training", onset: "langsam",
    slots: ["fruehstueck"], dose: "10 g", watch: ["koerper"],
    effect: "Haut, Gelenke, Sehnen — Effekte nach Wochen bis Monaten.",
    timing: "Egal wann, z. B. im Kaffee oder Smoothie." },
  { id: "q10", name: "Coenzym Q10", emoji: "❤️", category: "Energie & Fokus", onset: "langsam",
    slots: ["fruehstueck", "mittag"], dose: "100–200 mg", watch: ["energie"], withFat: true,
    effect: "Zellenergie, v. a. relevant ab 40 oder bei Statin-Einnahme.",
    timing: "Morgens/mittags mit fetthaltigem Essen." },
  { id: "lionsmane", name: "Lion's Mane", emoji: "🍄", category: "Energie & Fokus", onset: "langsam",
    slots: ["fruehstueck"], dose: "500–1.000 mg", watch: ["fokus", "stimmung"],
    effect: "Kann Fokus und Gedächtnis unterstützen — Effekt baut sich langsam auf.",
    timing: "Morgens zum Frühstück." },
  { id: "curcumin", name: "Curcumin", emoji: "🟡", category: "Darm & Immun", onset: "langsam",
    slots: ["mittag", "abendessen"], dose: "500 mg", watch: ["koerper", "verdauung"], withFat: true,
    effect: "Entzündungshemmend, Gelenke & Regeneration.",
    timing: "Mit Fett und Piperin (schwarzer Pfeffer) für bessere Aufnahme.",
    caution: "Bei Blutverdünnern oder Gallenproblemen ärztlich abklären." },
  { id: "calcium", name: "Calcium", emoji: "🦴", category: "Vitamine & Mineralien", onset: "langsam",
    slots: ["abendessen", "mittag"], dose: "nach Bedarf", watch: ["koerper"],
    effect: "Knochen — meist reicht die Ernährung.",
    timing: "Mit Essen, ≥2 h Abstand zu Eisen und Zink." },
]

export const LIB_BY_ID: Record<string, LibSupp> = Object.fromEntries(LIBRARY.map(s => [s.id, s]))

// ── Wechselwirkungen / Timing-Regeln ────────────────────────────────────────────

export interface PairRule { a: string; b: string; kind: "trennen" | "combo"; text: string }

export const PAIR_RULES: PairRule[] = [
  { a: "eisen", b: "calcium",   kind: "trennen", text: "Calcium hemmt die Eisenaufnahme — 2 h Abstand." },
  { a: "eisen", b: "zink",      kind: "trennen", text: "Eisen und Zink konkurrieren — 2 h Abstand." },
  { a: "eisen", b: "magnesium", kind: "trennen", text: "Magnesium kann Eisenaufnahme mindern — trennen." },
  { a: "eisen", b: "koffein",   kind: "trennen", text: "Kaffee/Tee hemmt Eisen — mind. 1–2 h Abstand." },
  { a: "zink",  b: "calcium",   kind: "trennen", text: "Calcium bremst Zink — besser getrennt." },
  { a: "zink",  b: "magnesium", kind: "trennen", text: "Hoch dosiert konkurrieren sie — lieber trennen." },
  { a: "eisen", b: "vitc",      kind: "combo",   text: "Vitamin C verbessert die Eisenaufnahme." },
  { a: "koffein", b: "theanin", kind: "combo",   text: "Fokus-Duo: klar & ruhig statt zittrig." },
  { a: "magnesium", b: "glycin", kind: "combo",  text: "Schlaf-Combo für tiefere Nächte." },
  { a: "vitd",  b: "omega3",    kind: "combo",   text: "Beide fettlöslich — zusammen zur Hauptmahlzeit." },
]

export function pairRule(a: string, b: string) {
  return PAIR_RULES.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a))
}

// ── State ──────────────────────────────────────────────────────────────────────

export interface MySupp {
  id: string          // libId oder "custom-xyz"
  name: string
  emoji: string
  dose: string
  lib?: string        // Verweis auf LIBRARY
  color: number       // Index in SUPP_COLORS
}

export type PhaseKind = "baseline" | "test" | "washout"

export interface Phase {
  id: string
  kind: PhaseKind
  suppId?: string
  days: number
}

export interface CheckIn {
  date: string // YYYY-MM-DD
  scores: Record<Dim, number> // 1–5
  tags: string[]
  note: string
}

export type Decision = "keep" | "maybe" | "drop"

export interface Verdict { decision: Decision; note: string; date: string }

export interface LabState {
  v: 1
  startDate: string | null
  supps: MySupp[]
  phases: Phase[]
  checkins: Record<string, CheckIn>
  verdicts: Record<string, Verdict>
  slotOverrides: Record<string, SlotId>
  taken: Record<string, boolean> // Datum → Test-Supplement eingenommen
  settings: Settings
  xp: number
  badges: string[]
  demo?: boolean
}

export const STORAGE_KEY = "true-supplement-lab-v1"

export function emptyState(): LabState {
  return {
    v: 1, startDate: null, supps: [], phases: [], checkins: {}, verdicts: {},
    slotOverrides: {}, taken: {}, settings: { ...DEFAULT_SETTINGS }, xp: 0, badges: [],
  }
}

export function loadState(): LabState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as LabState
    return { ...emptyState(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } }
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

// ── Datum ──────────────────────────────────────────────────────────────────────

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
export function todayIso() { return isoDate(new Date()) }
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

export function phaseWindows(s: LabState): PhaseWindow[] {
  if (!s.startDate) return []
  let cursor = s.startDate
  return s.phases.map((p, index) => {
    const start = cursor
    const end = addDays(start, p.days - 1)
    cursor = addDays(end, 1)
    return { ...p, start, end, index }
  })
}

export function phaseAt(s: LabState, date: string): PhaseWindow | null {
  return phaseWindows(s).find(w => date >= w.start && date <= w.end) ?? null
}

/** Neuen Plan aus Reihenfolge der Test-Supplements erstellen. */
export function buildPhases(testIds: string[], testDays: Record<string, number>, washout: number, baselineDays = 7): Phase[] {
  const phases: Phase[] = [{ id: "baseline", kind: "baseline", days: baselineDays }]
  testIds.forEach((id, i) => {
    phases.push({ id: `test-${id}`, kind: "test", suppId: id, days: testDays[id] ?? 5 })
    if (washout > 0 && i < testIds.length - 1) phases.push({ id: `wash-${id}`, kind: "washout", suppId: id, days: washout })
  })
  return phases
}

/** Test-Supplement an einem Tag (Baseline & Auswaschphase: nichts). Jedes Supplement läuft allein gegen die Baseline. */
export function testSuppOn(s: LabState, date: string): string | null {
  const w = phaseAt(s, date)
  return w?.kind === "test" && w.suppId ? w.suppId : null
}

// ── Statistik ──────────────────────────────────────────────────────────────────

export function avgScores(checkins: CheckIn[]): Record<Dim, number> | null {
  if (!checkins.length) return null
  const out = {} as Record<Dim, number>
  for (const d of DIMS) out[d.id] = checkins.reduce((a, c) => a + (c.scores[d.id] ?? 3), 0) / checkins.length
  return out
}

export function checkinsIn(s: LabState, w: { start: string; end: string }): CheckIn[] {
  return Object.values(s.checkins).filter(c => c.date >= w.start && c.date <= w.end).sort((a, b) => a.date.localeCompare(b.date))
}

export function baselineAvg(s: LabState) {
  const w = phaseWindows(s).find(p => p.kind === "baseline")
  return w ? avgScores(checkinsIn(s, w)) : null
}

export function testResult(s: LabState, suppId: string) {
  const w = phaseWindows(s).find(p => p.kind === "test" && p.suppId === suppId)
  if (!w) return null
  const cs = checkinsIn(s, w)
  const avg = avgScores(cs)
  const base = baselineAvg(s)
  if (!avg || !base) return { window: w, n: cs.length, avg, base, delta: null, total: 0, tags: tagCounts(cs) }
  const delta = {} as Record<Dim, number>
  let total = 0
  for (const d of DIMS) { delta[d.id] = avg[d.id] - base[d.id]; total += delta[d.id] }
  return { window: w, n: cs.length, avg, base, delta, total, tags: tagCounts(cs) }
}

function tagCounts(cs: CheckIn[]) {
  const m: Record<string, number> = {}
  cs.forEach(c => c.tags.forEach(t => { m[t] = (m[t] ?? 0) + 1 }))
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

export function daySum(c: CheckIn) { return DIMS.reduce((a, d) => a + (c.scores[d.id] ?? 3), 0) / DIMS.length }

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
  const my = s.supps.find(x => x.id === suppId)
  const lib = my?.lib ? LIB_BY_ID[my.lib] : undefined
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

function libKey(suppId: string, s: LabState) { return s.supps.find(x => x.id === suppId)?.lib ?? suppId }

/** Platziert Supplements greedy in ihre bevorzugten Slots und löst Konflikte (≥2 h Abstand). */
export function buildStack(suppIds: string[], s: LabState): { placements: StackPlacement[]; issues: StackIssue[]; combos: PairRule[] } {
  const placements: StackPlacement[] = []
  const tooClose = (x: SlotId, y: SlotId) => Math.abs(slotMinutes(x, s.settings) - slotMinutes(y, s.settings)) < 120

  // Stark eingeschränkte zuerst (Eisen nüchtern, Schlaf-Sachen …)
  const order = [...suppIds].sort((a, b) => slotOf(a, s).length - slotOf(b, s).length)

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
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const p = placements[i], q = placements[j]
      const r = pairRule(libKey(p.suppId, s), libKey(q.suppId, s))
      if (!r) continue
      if (r.kind === "trennen" && tooClose(p.slot, q.slot)) issues.push({ a: p.suppId, b: q.suppId, text: r.text })
      if (r.kind === "combo") combos.push(r)
    }
  }
  placements.sort((a, b) => slotMinutes(a.slot, s.settings) - slotMinutes(b.slot, s.settings))
  return { placements, issues, combos }
}

// ── Demo-Daten ─────────────────────────────────────────────────────────────────

export function demoState(): LabState {
  const s = emptyState()
  s.demo = true
  const picks = ["magnesium", "theanin", "vitd", "kreatin", "ashwagandha"]
  s.supps = picks.map((id, i) => ({ id, name: LIB_BY_ID[id].name, emoji: LIB_BY_ID[id].emoji, dose: LIB_BY_ID[id].dose, lib: id, color: i }))
  s.phases = buildPhases(["magnesium", "theanin", "kreatin"], { magnesium: 5, theanin: 4, kreatin: 5 }, 2)
  s.settings = { ...DEFAULT_SETTINGS, training: "18:00" }
  // Start so, dass wir mitten im 3. Test stehen
  const total = 7 + 5 + 2 + 4 + 2 + 2
  s.startDate = addDays(todayIso(), -total)
  const effects: Record<string, Partial<Record<Dim, number>>> = {
    magnesium: { schlaf: 1.3, ruhe: 0.9, koerper: 0.4 },
    theanin: { ruhe: 0.8, fokus: 0.6, stimmung: 0.2 },
    kreatin: { koerper: 0.5, energie: 0.3 },
  }
  let seed = 7
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  const windows = phaseWindows(s)
  for (let i = 0; i < total; i++) {
    const date = addDays(s.startDate, i)
    const w = windows.find(x => date >= x.start && date <= x.end)
    const eff = w?.kind === "test" && w.suppId ? effects[w.suppId] ?? {} : {}
    const scores = {} as Record<Dim, number>
    for (const d of DIMS) {
      const base = d.id === "schlaf" ? 2.6 : d.id === "ruhe" ? 2.5 : 3
      scores[d.id] = Math.max(1, Math.min(5, Math.round(base + (eff[d.id] ?? 0) + (rnd() - 0.5) * 1.6)))
    }
    const tags: string[] = []
    if (i < 3) tags.push("Kopfschmerzen")
    if (w?.suppId === "magnesium" && rnd() > 0.5) tags.push("Lebhafte Träume")
    if (rnd() > 0.8) tags.push("Training")
    s.checkins[date] = { date, scores, tags, note: "" }
    if (w?.kind === "test") s.taken[date] = true
  }
  s.verdicts = {
    magnesium: { decision: "keep", note: "Schlafe tiefer, wache ruhiger auf.", date: addDays(s.startDate, 12) },
    theanin: { decision: "maybe", note: "Ruhiger mit Kaffee, aber kein Wow.", date: addDays(s.startDate, 18) },
  }
  s.xp = 20 * total + 180
  s.badges = computeBadges(s)
  return s
}
