// ── Supplement Lab: Vorrat & Einkaufsliste ────────────────────────────────────
// Kolbi rechnet aus Packungsgröße + Tagesmenge, wie lange etwas reicht, prüft die
// Dosis gegen die übliche Tagesmenge und erinnert rechtzeitig ans Nachkaufen.

import {
  addDays, intakeOn, libOf, todayIso, isHere, looksPrescribed,
  type LabState, type LibSupp, type MySupp, type Stock, type StockForm,
} from "./supplementLab"

export const FORMS: Record<StockForm, {
  label: string; emoji: string; packUnit: string; doseUnit: string; packChips: number[]; doseChips: number[]; packMax: number; doseMax: number
}> = {
  kapseln:  { label: "Kapseln / Tabletten", emoji: "💊", packUnit: "Stück", doseUnit: "Stück", packChips: [30, 60, 90, 120, 180, 365], doseChips: [1, 2, 3, 4], packMax: 1000, doseMax: 20 },
  pulver:   { label: "Pulver", emoji: "🥄", packUnit: "g", doseUnit: "g", packChips: [100, 250, 500, 1000], doseChips: [1, 3, 5, 10], packMax: 5000, doseMax: 100 },
  tropfen:  { label: "Tropfen", emoji: "💧", packUnit: "ml", doseUnit: "Tropfen", packChips: [10, 20, 30, 50], doseChips: [1, 2, 3, 5], packMax: 500, doseMax: 60 },
  fluessig: { label: "Flüssig", emoji: "🧴", packUnit: "ml", doseUnit: "ml", packChips: [100, 250, 500, 1000], doseChips: [5, 10, 15, 20], packMax: 5000, doseMax: 200 },
}

/** Grobe Faustregel für Öl-Tropfen (steht so auch auf vielen Fläschchen). */
export const DROPS_PER_ML = 30
/** Ab so vielen Resttagen erinnert Kolbi ans Nachkaufen (Lieferzeit + Puffer). */
export const LOW_DAYS = 7

export const fmtNum = (n: number) => (Math.round(n * 10) / 10).toLocaleString("de-DE")

/** Verbrauch pro Einnahme in Packungs-Einheiten. */
export function perUse(st: Stock) { return st.form === "tropfen" ? st.perDay / DROPS_PER_ML : st.perDay }

export function doseLabel(st: Pick<Stock, "form" | "perDay">) {
  const n = fmtNum(st.perDay)
  if (st.form === "kapseln") return st.perDay === 1 ? "1 Kapsel" : `${n} Kapseln`
  if (st.form === "pulver") return `${n} g`
  if (st.form === "tropfen") return `${n} Tropfen`
  return `${n} ml`
}

/** Einnahmetage seit dem Eintragen (ab dem Folgetag; geplant oder abgehakt). */
function usedSince(s: LabState, id: string, from: string) {
  const today = todayIso()
  let n = 0
  for (let d = addDays(from, 1), k = 0; d <= today && k < 800; d = addDays(d, 1), k++) {
    if ((s.took[d] ?? []).includes(id) || intakeOn(s, d).includes(id)) n++
  }
  return n
}

export interface StockInfo { left: number; uses: number; days: number; until: string | null; pct: number; low: boolean; empty: boolean }

export function stockInfo(s: LabState, x: MySupp | undefined): StockInfo | null {
  const st = x?.stock
  if (!x || !st) return null
  const per = perUse(st)
  if (per <= 0) return null
  const left = Math.max(0, st.left - usedSince(s, x.id, st.at) * per)
  const uses = Math.floor(left / per + 1e-9)
  const days = libOf(x)?.weekly ? uses * 7 : uses
  return { left, uses, days, until: days > 0 ? addDays(todayIso(), days) : null, pct: Math.min(1, left / Math.max(st.pack, left, 1e-9)), low: days <= LOW_DAYS, empty: uses <= 0 }
}

/** Wird es gerade regelmäßig genommen? (Dann lohnt die Nachkauf-Erinnerung.) */
export function inUse(s: LabState, x: MySupp, today = todayIso()) {
  if (!isHere(x)) return false
  return x.mode === "konstant" || s.verdicts[x.id]?.decision === "keep" || intakeOn(s, today).includes(x.id)
}

// ── Dosis verstehen ────────────────────────────────────────────────────────────

type DoseUnit = "mg" | "IE"
/** „3–5 g“, „1.000–2.000 IE“, „50–100 µg“ → Bereich in mg bzw. IE. */
export function doseRange(lib: LibSupp | undefined): { min: number; max: number; unit: DoseUnit } | null {
  if (!lib) return null
  const m = lib.dose.match(/(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*(mg|µg|g|IE)\b/)
  if (!m) return null
  const num = (v: string) => Number(v.replace(/\.(?=\d{3})/g, "").replace(",", "."))
  const f = m[3] === "g" ? 1000 : m[3] === "µg" ? 0.001 : 1
  const min = num(m[1]) * f, max = num(m[2] ?? m[1]) * f
  return { min, max, unit: m[3] === "IE" ? "IE" : "mg" }
}

export function fmtAmount(v: number, unit: DoseUnit) {
  if (unit === "IE") return `${fmtNum(v)} IE`
  if (v >= 1000) return `${fmtNum(v / 1000)} g`
  if (v < 1) return `${fmtNum(v * 1000)} µg`
  return `${fmtNum(v)} mg`
}

/** Bereich in einer gemeinsamen Einheit: „3–5 g“, „250–1.000 µg“. */
export function fmtRange(min: number, max: number, unit: DoseUnit) {
  if (min === max) return fmtAmount(min, unit)
  if (unit === "IE") return `${fmtNum(min)}–${fmtNum(max)} IE`
  if (min >= 1000) return `${fmtNum(min / 1000)}–${fmtNum(max / 1000)} g`
  if (min < 1 && max <= 1) return `${fmtNum(min * 1000)}–${fmtNum(max * 1000)} µg`
  return `${fmtNum(min)}–${fmtNum(max)} mg`
}

export function guessForm(x: MySupp): StockForm {
  const lib = libOf(x)
  if (lib?.id === "vitd") return "tropfen"
  if (lib?.id === "omega3") return "kapseln"
  const r = doseRange(lib)
  if ((r?.unit === "mg" && r.min >= 1000) || /Portion/.test(lib?.dose ?? "")) return "pulver"
  return "kapseln"
}

export function guessPerDay(x: MySupp, form: StockForm) {
  if (form === "pulver") {
    const r = doseRange(libOf(x))
    return r?.unit === "mg" && r.max >= 500 ? Math.min(30, Math.round(r.max / 1000) || 1) : 5
  }
  return form === "fluessig" ? 5 : 1
}

/** Braucht Kolbi den Wirkstoff pro Stück, um die Dosis zu prüfen? (Bei Gramm-Pulvern wie Kreatin nicht.) */
export function gramDosed(x: MySupp, form: StockForm) {
  const r = doseRange(libOf(x))
  return form === "pulver" && r?.unit === "mg" && r.min >= 500
}

export interface DoseCheck { level: "ok" | "low" | "high"; amount: string; rec: string; text: string; better?: number }

/** Vergleicht die Tagesmenge mit der üblichen Dosis aus der Bibliothek — nur ein Hinweis, keine Verordnung. */
export function doseCheck(x: MySupp, st: Stock): DoseCheck | null {
  const r = doseRange(libOf(x))
  if (!r || libOf(x)?.rx || libOf(x)?.category === "Peptide") return null
  let amt: number | null = null
  if (gramDosed(x, st.form)) amt = st.perDay * 1000
  else if (st.active) {
    const u = st.activeUnit ?? "mg"
    if ((u === "IE") !== (r.unit === "IE")) return null
    amt = st.perDay * st.active * (u === "µg" ? 0.001 : 1)
  }
  if (amt == null || amt <= 0) return null
  const rec = fmtRange(r.min, r.max, r.unit)
  const amount = fmtAmount(amt, r.unit)
  if (amt > r.max * 1.3) {
    // Weniger Stück würden reichen → hält länger, spart Geld
    const per = gramDosed(x, st.form) ? 1000 : st.active! * (st.activeUnit === "µg" ? 0.001 : 1)
    const better = st.form === "kapseln" && per > 0 ? Math.max(1, Math.floor(r.max / per)) : undefined
    return { level: "high", amount, rec, better: better && better < st.perDay ? better : undefined,
      text: `Das ist mehr als die übliche Tagesmenge (${rec}). Mehr bringt hier meist nicht mehr – außer dein Arzt hat es so empfohlen.` }
  }
  if (amt < r.min * 0.75) return { level: "low", amount, rec, text: `Etwas weniger als üblich (${rec}). Kann reichen – wenn du nichts merkst, liegt es vielleicht an der Menge.` }
  return { level: "ok", amount, rec, text: `Passt genau in die übliche Tagesmenge (${rec}).` }
}

// ── Einkaufen ──────────────────────────────────────────────────────────────────

/**
 * Affiliate-Vorbereitung: Sobald hier z. B. ein Amazon-PartnerNet-Tag steht, hängen alle
 * Kauf-Links ihn an und werden in der App als „Anzeige“ gekennzeichnet (Pflicht in DE).
 */
export const AFFILIATE = { amazonTag: "" }
export const shopIsAd = () => !!AFFILIATE.amazonTag

/** Suchbegriff für den Nachkauf + Kolbis Tipp zur besseren Form. */
const BUY: Record<string, { q: string; alt?: string }> = {
  kupfer:      { q: "Kupfer Bisglycinat 2 mg", alt: "Kupfer-Bisglycinat ist gut verträglich – 1–2 mg am Tag reichen." },
  magnesium:   { q: "Magnesium Glycinat", alt: "Glycinat ist sanft zum Magen. Citrat wirkt eher abführend, Oxid wird schlecht aufgenommen." },
  kreatin:     { q: "Kreatin Monohydrat Pulver", alt: "Monohydrat ist die am besten untersuchte Form – teure „neue“ Formen bringen nachweislich nicht mehr." },
  vitd:        { q: "Vitamin D3 K2 Tropfen", alt: "Tropfen in Öl sind günstig und lassen sich fein dosieren." },
  omega3:      { q: "Omega 3 EPA DHA Kapseln", alt: "Achte auf EPA+DHA pro Kapsel, nicht nur „Fischöl“. Algenöl ist die vegane Variante." },
  zink:        { q: "Zink Bisglycinat 15 mg", alt: "Bisglycinat oder Picolinat werden gut aufgenommen – 10–15 mg reichen meist." },
  eisen:       { q: "Eisen Bisglycinat", alt: "Eisen-Bisglycinat ist deutlich magenschonender als Eisensulfat." },
  b12:         { q: "Vitamin B12 Methylcobalamin Lutschtabletten", alt: "Methyl- oder Adenosylcobalamin, als Lutschtablette oder Tropfen." },
  folat:       { q: "Folat 5-MTHF", alt: "5-MTHF (Methylfolat) ist die direkt aktive Form." },
  theanin:     { q: "L-Theanin 200 mg" },
  glycin:      { q: "Glycin Pulver", alt: "Als Pulver viel günstiger als Kapseln – schmeckt leicht süß." },
  ashwagandha: { q: "Ashwagandha KSM-66", alt: "KSM-66 ist der am besten untersuchte Extrakt." },
  curcumin:    { q: "Curcumin Piperin", alt: "Ohne Piperin oder Mizellen-Form wird kaum etwas aufgenommen." },
  q10:         { q: "Coenzym Q10 Ubiquinol", alt: "Ubiquinol wird – besonders ab 40 – besser aufgenommen als Ubichinon." },
  kollagen:    { q: "Kollagen Peptide Pulver" },
  whey:        { q: "Whey Protein Pulver" },
  elektrolyte: { q: "Elektrolyt Pulver ohne Zucker" },
  citrullin:   { q: "L-Citrullin Malat Pulver", alt: "Als Pulver viel günstiger – 6–8 g schafft man mit Kapseln kaum." },
  betaalanin:  { q: "Beta Alanin Pulver" },
  melatonin:   { q: "Melatonin 0,5 mg", alt: "Weniger ist oft mehr: 0,5–1 mg wirken meist genauso gut wie 5 mg." },
  probiotika:  { q: "Probiotika Kapseln magensaftresistent" },
  vitc:        { q: "Vitamin C gepuffert", alt: "Gepuffertes Vitamin C ist sanfter zum Magen." },
  selen:       { q: "Selen 100 µg" },
  jod:         { q: "Jod 100 µg" },
  flohsamen:   { q: "Flohsamenschalen gemahlen" },
  multivitamin:{ q: "Multivitamin" },
  nac:         { q: "NAC 600 mg" },
  taurin:      { q: "Taurin Pulver", alt: "Als Pulver sehr günstig und geschmacksneutral." },
}

export function buyInfo(x: MySupp): { q: string; alt?: string } {
  return BUY[x.lib ?? ""] ?? { q: x.name.replace(/\s*\(.*\)\s*/, " ").trim() }
}

/** Kauf-Link — nie für Verschreibungspflichtiges, Peptide oder Medikamenten-ähnliche eigene Einträge. */
export function shopUrl(x: MySupp): string | null {
  const lib = libOf(x)
  if (lib?.rx || lib?.category === "Peptide" || (!lib && looksPrescribed(x.name))) return null
  const tag = AFFILIATE.amazonTag
  return `https://www.amazon.de/s?k=${encodeURIComponent(buyInfo(x).q)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`
}

export function openShop(x: MySupp) {
  const url = shopUrl(x)
  if (url) window.open(url, "_blank", "noopener")
}

// ── Änderungen (für update(p => …)) ───────────────────────────────────────────

export function refillStock(s: LabState, x: MySupp, today = todayIso()): Stock | undefined {
  const st = x.stock
  if (!st) return undefined
  const info = stockInfo(s, x)
  return { ...st, left: (info?.left ?? 0) + st.pack, at: today, ordered: undefined }
}

/** Einkaufsliste: nicht da + Vorrat knapp (nur was gerade genommen wird). */
export function shoppingList(s: LabState, today = todayIso()) {
  const away = s.supps.filter(x => x.away)
  const low = s.supps.filter(x => !x.away && inUse(s, x, today) && stockInfo(s, x)?.low)
  return { away, low, count: away.length + low.length }
}
