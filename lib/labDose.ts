// ── Menge pro Einnahme ────────────────────────────────────────────────────────
// Jedes Supplement kann eine Standard-Menge haben (MySupp.portion, z. B. 1 Kapsel oder 2000 IE).
// Abhaken speichert sie automatisch für den Tag mit (LabState.tookAmt); Abweichungen (½ · 1× · 2× · +1)
// sind 1 Tipp. Fehlt ein Eintrag, gilt die Standard-Menge (alte Daten bleiben gültig).
// Keine Dosierempfehlung: Kolbi schlägt nur neutrale Formen vor (1–3 Kapseln, 1–5 Tropfen …),
// nie Mengen aus der Bibliothek.

import { LIB_BY_ID, type LabState, type MySupp, type Portion, type PortionUnit, type Stock, type StockForm } from "./supplementLab"
import { t, LOCALE } from "./labI18n"

const num = (n: number) => (Math.round(n * 100) / 100).toLocaleString(LOCALE)

/** „1 Kapsel“, „2 Kapseln“, „5 Tropfen“, „2.000 IE“, „3 g“ … */
export function portionLabel(p: Portion): string {
  const n = num(p.n)
  switch (p.u) {
    case "stk": return p.n === 1 ? t("1 Kapsel") : t("{n} Kapseln", { n })
    case "tropfen": return p.n === 1 ? t("1 Tropfen") : t("{n} Tropfen", { n })
    case "IE": return t("{n} IE", { n })
    default: return `${n} ${p.u}`
  }
}

/** Kapsel-Einheit des Vorrats (gleiche Einheit wie Stock.perDay). */
export function stockUnit(form: StockForm): PortionUnit {
  return form === "kapseln" ? "stk" : form === "pulver" ? "g" : form === "tropfen" ? "tropfen" : "ml"
}

const UNIT_RE: [RegExp, PortionUnit][] = [
  [/^(kapseln?|tabletten?|stück|stk\.?|caps?(ules?)?|tabs?|tablets?|softgels?|pieces?|pcs)$/i, "stk"],
  [/^(tropfen|drops?)$/i, "tropfen"],
  [/^(ie|iu|i\.e\.)$/i, "IE"],
  [/^(µg|mcg|ug)$/i, "µg"],
  [/^mg$/i, "mg"],
  [/^g$/i, "g"],
  [/^ml$/i, "ml"],
]

/** „2000 IE“, „1 Kapsel“, „5 g“, „2 caps“ → Menge; Bereiche („3–5 g“) und Unklares → null. */
export function parsePortion(text: string | undefined): Portion | null {
  const m = (text ?? "").trim().match(/^(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*([a-zµ.äöü]+)\.?$/i)
  if (!m) return null
  const raw = m[1]
  const n = /^\d{1,3}([.,]\d{3})+$/.test(raw) ? Number(raw.replace(/[.,]/g, "")) : Number(raw.replace(",", "."))
  const u = UNIT_RE.find(([re]) => re.test(m[2]))?.[1]
  return u && n > 0 && n < 1e6 ? { n, u } : null
}

/** Standard-Menge: selbst gewählt → aus dem Vorrat (Menge pro Einnahme) → aus „Deine Dosis“. Sonst null (dann fragt Kolbi einmal). */
export function defaultPortion(x: MySupp | undefined): Portion | null {
  if (!x) return null
  if (x.portion) return x.portion
  if (x.stock && x.stock.perDay > 0) return { n: x.stock.perDay, u: stockUnit(x.stock.form) }
  return parsePortion(x.dose)
}

/** 3–4 neutrale Auswahl-Chips für das erste Mal (nur die Form wird geraten, keine Menge aus der Bibliothek). */
export function portionChoices(x: MySupp): Portion[] {
  const lib = x.lib ? LIB_BY_ID[x.lib] : undefined
  const dose = `${x.dose} ${lib?.dose ?? ""}`
  const parsed = parsePortion(x.dose)
  let base: Portion[]
  if (x.stock) {
    const u = stockUnit(x.stock.form)
    base = u === "stk" ? [1, 2, 3].map(n => ({ n, u })) : u === "tropfen" ? [1, 2, 5].map(n => ({ n, u })) : u === "g" ? [1, 3, 5].map(n => ({ n, u })) : [5, 10, 15].map(n => ({ n, u }))
  } else if (lib?.id === "vitd" || /tropfen|drops?/i.test(dose)) base = [{ n: 1, u: "tropfen" }, { n: 2, u: "tropfen" }, { n: 5, u: "tropfen" }, { n: 1, u: "stk" }]
  else if (/pulver|powder|portion|serving|messlöffel|scoop/i.test(dose)) base = [{ n: 1, u: "g" }, { n: 3, u: "g" }, { n: 5, u: "g" }, { n: 1, u: "stk" }]
  else base = [{ n: 1, u: "stk" }, { n: 2, u: "stk" }, { n: 3, u: "stk" }, { n: 1, u: "tropfen" }]
  const out = parsed ? [parsed, ...base.filter(p => !samePortion(p, parsed))] : base
  return out.slice(0, 4)
}

export function samePortion(a: Portion | null | undefined, b: Portion | null | undefined) {
  return !!a && !!b && a.u === b.u && Math.abs(a.n - b.n) < 1e-9
}

/** Menge × Faktor (½ · 2× …), auf 2 Nachkommastellen. */
export function scalePortion(p: Portion, f: number): Portion {
  return { n: Math.round(p.n * f * 100) / 100, u: p.u }
}

/** Tatsächlich genommene Menge an dem Tag: gespeichert, sonst die Standard-Menge (nur wenn abgehakt). */
export function amountOn(s: LabState, date: string, x: MySupp | undefined): Portion | null {
  if (!x || !(s.took[date] ?? []).includes(x.id)) return null
  return s.tookAmt?.[date]?.[x.id] ?? defaultPortion(x)
}

/** Menge für den Tag setzen (mutiert s). null = Eintrag entfernen (dann gilt wieder die Standard-Menge). */
export function setAmount(s: LabState, date: string, id: string, p: Portion | null) {
  const day = { ...(s.tookAmt?.[date] ?? {}) }
  if (p) day[id] = { n: p.n, u: p.u }
  else delete day[id]
  const next = { ...s.tookAmt }
  if (Object.keys(day).length) next[date] = day
  else delete next[date]
  s.tookAmt = next
}

/** Beim Abhaken: Standard-Menge mitspeichern (falls bekannt und noch nichts eingetragen). Mutiert s. */
export function recordDefaultAmount(s: LabState, date: string, id: string) {
  if (s.tookAmt?.[date]?.[id]) return
  const p = defaultPortion(s.supps.find(x => x.id === id))
  if (p) setAmount(s, date, id, p)
}

/** Standard-Menge eines Supplements setzen (mutiert s). Optional gleich die heutige Menge mit. */
export function setPortion(s: LabState, id: string, p: Portion, date?: string): LabState {
  s.supps = s.supps.map(x => x.id === id ? { ...x, portion: { n: p.n, u: p.u } } : x)
  if (date && (s.took[date] ?? []).includes(id)) setAmount(s, date, id, p)
  return s
}

/** Faktor gegenüber der Standard-Menge (für Anzeige „2×“); null, wenn nicht vergleichbar. */
export function amountFactor(x: MySupp, amt: Portion | null): number | null {
  const std = defaultPortion(x)
  if (!amt || !std || std.u !== amt.u || std.n <= 0) return null
  return amt.n / std.n
}

/**
 * Verbrauch einer abgehakten Einnahme in Packungs-Einheiten des Vorrats (Stück · g · ml).
 * Gleiche Einheit wie der Vorrat → direkt (Tropfen → ml); sonst Verhältnis zur Standard-Menge × übliche Menge;
 * unbekannt → übliche Menge (wie bisher).
 */
export function stockUse(s: LabState, x: MySupp, st: Stock, date: string, perUse: number, dropsPerMl: number): number {
  const amt = s.tookAmt?.[date]?.[x.id]
  if (!amt || !(s.took[date] ?? []).includes(x.id)) return perUse
  if (amt.u === stockUnit(st.form)) return st.form === "tropfen" ? amt.n / dropsPerMl : amt.n
  const f = amountFactor(x, amt)
  return f != null ? f * perUse : perUse
}
