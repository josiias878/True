// ── Supplement Lab · Barcode → Bibliothek ─────────────────────────────────────
// Kamera-Scan (app/lab/scan.tsx) liefert nur den Zahlencode; das Bild verlässt das Gerät nie.
// Lookup über die Edge-Function lab-barcode: (1) eigene Zuordnungen (barcode_map, bestätigt),
// (2) Vorschläge anderer Nutzer (noch nicht bestätigt), (3) Open Food Facts (Name, Marke, Zutaten,
// Nährwerte) → Abgleich auf Bibliotheks-IDs über die Aliase aus lib/supplementLab.ts.
// Keine Peptide, keine verschreibungspflichtigen Mittel. Keine Health-Claims aus OFF.

import { LIBRARY, LIB_BY_ID, type LibSupp } from "./supplementLab"
import { device } from "./labCommunity"

const URL_ = "https://mkdfohmshuuiroeruyyz.supabase.co/functions/v1/lab-barcode"

// ── Code prüfen ─────────────────────────────────────────────────────────────────

function gtinOk(c: string) {
  const d = c.split("").map(Number)
  const check = d.pop()!
  let sum = 0
  d.reverse().forEach((x, i) => { sum += x * (i % 2 === 0 ? 3 : 1) })
  return (10 - (sum % 10)) % 10 === check
}

/** UPC-E (8 Stellen, Zahlensystem 0/1) → UPC-A (12 Stellen) */
function upcEtoA(e: string): string | null {
  if (!/^[01]\d{7}$/.test(e)) return null
  const ns = e[0], d = e.slice(1, 7), ck = e[7]
  const last = d[5]
  let body: string
  if ("012".includes(last)) body = d[0] + d[1] + last + "0000" + d[2] + d[3] + d[4]
  else if (last === "3") body = d[0] + d[1] + d[2] + "00000" + d[3] + d[4]
  else if (last === "4") body = d[0] + d[1] + d[2] + d[3] + "00000" + d[4]
  else body = d.slice(0, 5) + "0000" + last
  return ns + body + ck
}

/**
 * EAN-13 / EAN-8 / UPC-A / UPC-E → einheitlicher Schlüssel (EAN-13 oder EAN-8), sonst null.
 * UPC-A bekommt eine führende 0 (= EAN-13), Prüfziffer muss stimmen.
 */
export function normalizeBarcode(raw: string): string | null {
  let c = String(raw ?? "").replace(/[\s-]/g, "")
  if (!/^\d{6,14}$/.test(c)) return null
  if (c.length === 14 && c[0] === "0") c = c.slice(1)
  if (c.length === 12) c = "0" + c
  if (c.length === 13) return gtinOk(c) ? c : null
  if (c.length === 8) {
    if (gtinOk(c)) return c
    const a = upcEtoA(c)
    return a && gtinOk("0" + a) ? "0" + a : null
  }
  return null
}

// ── Welche Bibliothekseinträge darf ein Scan treffen? ───────────────────────────

/** Ohne Peptide und verschreibungspflichtige Mittel (auch nicht im Web-Lab). */
export function barcodeEligible(l: LibSupp | undefined): l is LibSupp {
  return !!l && l.category !== "Peptide" && l.category !== "Verschriebene Medikamente" && !l.rx
}
export const BARCODE_LIBRARY: LibSupp[] = LIBRARY.filter(barcodeEligible)

// ── Open-Food-Facts-Daten (so, wie lab-barcode sie kompakt liefert) ─────────────

export interface OffInfo {
  /** Produktnamen (Hauptsprache zuerst, dann de/en) */
  names?: string[]
  generic?: string
  brand?: string
  ingredients?: string
  /** Kategorie-Schlüssel ohne Sprachpräfix, z. B. "magnesium-supplements" */
  categories?: string[]
  /** Nährstoff → Menge pro Portion in Gramm (OFF-Schlüssel, z. B. "magnesium", "vitamin-d") */
  nutrients?: Record<string, number>
  serving?: string
  quantity?: string
}

export interface MapEntry { lib: string; name?: string; amount?: number; unit?: string }
export interface LookupResult {
  code: string
  /** Bestätigte Zuordnungen (Team oder ≥ 2 Geräte) */
  map: MapEntry[]
  /** Noch nicht bestätigte Vorschläge anderer Nutzer */
  crowd: { lib: string; n: number }[]
  off: OffInfo | null
  /** OFF war nicht erreichbar (nicht: „nicht gefunden“) */
  offError?: boolean
}

// ── Abgleich ────────────────────────────────────────────────────────────────────

const W = "a-z0-9\\u00e4\\u00f6\\u00fc\\u00df"
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const RE_CACHE = new Map<string, RegExp>()
/** Alias muss am Wortanfang stehen (deutsche Komposita: „Magnesiumcitrat“ trifft „magnesium“); kurze (≤ 3) als ganzes Wort. */
function aliasRe(alias: string) {
  let re = RE_CACHE.get(alias)
  if (!re) {
    const a = esc(alias)
    re = new RegExp(alias.length <= 3 ? `(^|[^${W}])${a}(?![${W}])` : `(^|[^${W}])${a}`)
    RE_CACHE.set(alias, re)
  }
  return re
}
const clean = (s: string) => s.toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").trim()

/** Zu allgemeine Aliase, die in Zutatenlisten fast immer vorkommen (Natriumcyclamat, Eiweiß, …) */
const INGREDIENT_SKIP = new Set(["natrium", "salz", "protein", "eiwei\u00df", "eiweiss", "amino", "multi", "a-z", "kaffee", "coffee", "kelp"])
/** Hilfs- und Trägerstoffe – kein Wirkstoff, auch wenn der Mineralstoff im Namen steckt */
const EXCIPIENTS = [
  /magnesium\s*-?\s*stearat\w*/g, /magnesiumsalze?\s+(?:der|von)\s+speisefettsäuren/g, /magnesium salts? of fatty acids/g,
  /(?:tri|di)?calcium\s*-?\s*phosphat\w*/g, /(?:tri|di)?calcium phosphate/g, /siliciumdioxid/g,
]

/** OFF-Nährstoff → Bibliotheks-ID */
export const NUTRIENT_LIB: Record<string, string> = {
  "vitamin-d": "vitd", "vitamin-b12": "b12", "vitamin-c": "vitc", magnesium: "magnesium", zinc: "zink", iron: "eisen",
  calcium: "calcium", selenium: "selen", iodine: "jod", "vitamin-b9": "folat", folates: "folat", biotin: "biotin",
  copper: "kupfer", caffeine: "koffein", "omega-3-fat": "omega3", taurine: "taurin",
}

export type CandSource = "map" | "crowd" | "name" | "ingredients"
export interface BarcodeCand { lib: LibSupp; source: CandSource; dose: string; votes?: number }

const NAME_DOSE = /(\d+(?:[.,]\d+)?)\s*(mg|µg|μg|mcg|ug|g|i\.?\s?e\.?|iu)(?![a-z])/i
function doseFromName(s: string): string {
  const m = s.match(NAME_DOSE)
  if (!m) return ""
  const u = m[2].toLowerCase().replace(/\s|\./g, "")
  const unit = u === "μg" || u === "mcg" || u === "ug" ? "µg" : u === "ie" || u === "iu" ? "IE" : u
  return `${m[1]} ${unit}`
}

/**
 * OFF-Produkt → passende Bibliothekseinträge, beste zuerst.
 * Name/Kategorie = starke Treffer; Zutaten/Nährwerte = schwache (werden nicht vorausgewählt).
 * Multivitamin im Namen → einzelne Vitamine/Mineralien aus Zutaten und Nährwerten weglassen.
 */
export function matchOff(p: OffInfo | null | undefined, libs: LibSupp[] = BARCODE_LIBRARY): { lib: LibSupp; source: "name" | "ingredients"; score: number; dose: string }[] {
  if (!p) return []
  const names = (p.names ?? []).filter(Boolean)
  const nameText = clean(names.join(" | "))
  const genericText = clean(p.generic ?? "")
  const catText = clean((p.categories ?? []).map(c => c.replace(/-/g, " ")).join(" | "))
  let ingText = clean(p.ingredients ?? "")
  for (const re of EXCIPIENTS) ingText = ingText.replace(re, " ")

  const hits = new Map<string, { lib: LibSupp; source: "name" | "ingredients"; score: number }>()
  const add = (lib: LibSupp, source: "name" | "ingredients", score: number) => {
    const prev = hits.get(lib.id)
    if (!prev || score > prev.score) hits.set(lib.id, { lib, source, score })
  }
  for (const lib of libs) {
    for (const raw of lib.aliases) {
      const a = raw.trim().toLowerCase()
      if (!a) continue
      const re = aliasRe(a)
      const at = nameText.search(re)
      // früh im Namen + längerer Alias = besser („Eisen + Vitamin C“ → Eisen zuerst)
      if (at >= 0) add(lib, "name", 1000 - Math.min(at, 300) + a.length)
      else if (genericText && re.test(genericText)) add(lib, "name", 600 + a.length)
      else if (catText && re.test(catText)) add(lib, "name", 500 + a.length)
      else if (ingText && a.length >= 3 && !INGREDIENT_SKIP.has(a) && re.test(ingText)) add(lib, "ingredients", 100 + a.length)
    }
  }
  for (const [k, g] of Object.entries(p.nutrients ?? {})) {
    const lib = libs.find(l => l.id === NUTRIENT_LIB[k])
    if (lib && g > 0) add(lib, "ingredients", 90)
  }
  let list = [...hits.values()]
  const multi = list.some(h => h.lib.id === "multivitamin" && h.source === "name")
  if (multi) list = list.filter(h => h.source === "name")
  list.sort((a, b) => b.score - a.score)

  // Menge nur aus dem Produktnamen („… 400 mg“) und nur für den stärksten Treffer – bei Kombis gehört die Zahl
  // meist zum ersten Stoff. OFF-Nährwerte pro Portion sind oft falsch erfasst → nicht als Menge vorschlagen.
  const nameDose = names.map(doseFromName).find(Boolean) ?? ""
  return list.slice(0, 6).map((h, i) => ({ ...h, dose: i === 0 && h.source === "name" ? nameDose : "" }))
}

function mapDose(m: MapEntry) {
  if (!(m.amount && m.amount > 0) || !m.unit) return ""
  return `${String(m.amount).replace(".", ",")} ${m.unit}`
}

/**
 * Lookup-Ergebnis → Auswahl für den Dialog.
 * Reihenfolge: bestätigte Zuordnung › Vorschläge anderer › Produktname/Kategorie › Zutaten/Nährwerte.
 * Vorausgewählt: alle bestätigten, sonst der stärkste Vorschlag/Namens-Treffer, sonst nichts.
 */
export function buildCandidates(r: LookupResult | null, libs: LibSupp[] = BARCODE_LIBRARY): { cands: BarcodeCand[]; preselect: string[] } {
  if (!r) return { cands: [], preselect: [] }
  const ok = new Map(libs.map(l => [l.id, l]))
  const out: BarcodeCand[] = []
  const seen = new Set<string>()
  const offMatches = matchOff(r.off, libs)
  const offDose = (id: string) => offMatches.find(m => m.lib.id === id)?.dose ?? ""
  for (const m of r.map) {
    const lib = ok.get(m.lib)
    if (!lib || seen.has(lib.id)) continue
    seen.add(lib.id); out.push({ lib, source: "map", dose: mapDose(m) || offDose(lib.id) })
  }
  for (const c of [...r.crowd].sort((a, b) => b.n - a.n)) {
    const lib = ok.get(c.lib)
    if (!lib || seen.has(lib.id)) continue
    seen.add(lib.id); out.push({ lib, source: "crowd", dose: offDose(lib.id), votes: c.n })
  }
  for (const m of offMatches) {
    if (seen.has(m.lib.id)) continue
    seen.add(m.lib.id); out.push({ lib: m.lib, source: m.source, dose: m.dose })
  }
  const confirmed = out.filter(c => c.source === "map").map(c => c.lib.id)
  const first = out.find(c => c.source === "crowd" || c.source === "name")
  return { cands: out.slice(0, 8), preselect: confirmed.length ? confirmed : first ? [first.lib.id] : [] }
}

/** Anzeigename des Produkts (OFF-Hauptname oder Name aus der eigenen Zuordnung) */
export function productName(r: LookupResult | null): string {
  if (!r) return ""
  return r.off?.names?.find(Boolean) ?? r.map.find(m => m.name)?.name ?? ""
}

/** Wurden Daten von Open Food Facts verwendet? (→ ODbL-Hinweis anzeigen) */
export function usesOff(r: LookupResult | null): boolean {
  return !!r && (!!r.off || r.map.some(m => !!m.name))
}

// ── Server ──────────────────────────────────────────────────────────────────────

const cache = new Map<string, { t: number; v: LookupResult }>()

function validResult(raw: unknown, code: string): LookupResult | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const arr = (v: unknown) => (Array.isArray(v) ? v : []) as Record<string, unknown>[]
  const map = arr(o.map).filter(m => typeof m.lib === "string").map(m => ({
    lib: m.lib as string,
    ...(typeof m.name === "string" ? { name: m.name } : {}),
    ...(typeof m.amount === "number" ? { amount: m.amount } : {}),
    ...(typeof m.unit === "string" ? { unit: m.unit } : {}),
  }))
  const crowd = arr(o.crowd).filter(c => typeof c.lib === "string" && typeof c.n === "number").map(c => ({ lib: c.lib as string, n: c.n as number }))
  const off = o.off && typeof o.off === "object" ? o.off as OffInfo : null
  return { code, map, crowd, off, ...(o.offError ? { offError: true } : {}) }
}

/** null = keine Verbindung / Serverfehler (→ „wähle aus der Liste“) */
export async function lookupBarcode(code: string, lang: "de" | "en" = "de"): Promise<LookupResult | null> {
  const hit = cache.get(code)
  if (hit && Date.now() - hit.t < 30 * 60_000) return hit.v
  const d = device()
  if (!d) return null
  try {
    const res = await fetch(URL_, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lookup", device: d, code, lang }),
      signal: AbortSignal.timeout?.(12_000),
    })
    if (!res.ok) return null
    const v = validResult(await res.json(), code)
    if (v && !v.offError) cache.set(code, { t: Date.now(), v })
    return v
  } catch { return null }
}

/** Anonyme Zuordnung melden (nur Code + Bibliotheks-IDs). Gilt erst ab 2 Geräten als bestätigt. */
export async function submitBarcode(code: string, libIds: string[]): Promise<boolean> {
  const libs = [...new Set(libIds)].filter(id => barcodeEligible(LIB_BY_ID[id])).slice(0, 3)
  const d = device()
  if (!d || !libs.length || !normalizeBarcode(code)) return false
  try {
    const res = await fetch(URL_, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit", device: d, code, libs }),
    })
    cache.delete(code)
    return res.ok
  } catch { return false }
}

/** Link zum Produkt bei Open Food Facts (Quelle/ODbL) */
export const offProductUrl = (code: string) => `https://world.openfoodfacts.org/product/${code}`
