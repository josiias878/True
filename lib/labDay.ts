// ── Supplement Lab: Tagesablauf – Morgen-Frage, Extra-Einnahmen, Beschwerden ──
// Alles, was nicht in den Abend-Check-in gehört:
//  • Morgen-Frage (Schlaf + optional „Wie fit bist du gerade?“) kurz nach dem Aufwachen
//  • spontane Extra-Einnahmen (auch außerhalb des Plans, auch für vergangene Tage)
//  • Beschwerden an jedem Tag + „Ich vermute: …“
// Funktionen, die den Stand ändern, verändern `s` direkt und geben ihn zurück (passt zu update(p => …)).
//
// Datums-Regel (siehe auch sleepAfter in supplementLab.ts):
//  • morning[D] und checkins[D].scores.schlaf = Nacht D−1 → D (gespeichert am AUFWACH-Tag, wie bisher „Letzte Nacht“)
//  • die Auswertung rechnet diese Nacht dem Tag D−1 zu (Einnahmen am Abend/Tag davor wirken auf diese Nacht)

import {
  LIB_BY_ID, activeDims, extraEmoji, extraKey, extraLabel, extrasOn, intakeOn, morningMin, nowTime, phaseWindows,
  relMin, suppName, todayIso, toMin, fromMin, checkinOpensMin,
  type CheckIn, type DaySides, type DimInfo, type ExtraIntake, type LabState, type MorningEntry,
} from "./supplementLab"

// ── Morgen-Frage ─────────────────────────────────────────────────────────────

export function morningOf(s: Pick<LabState, "morning">, date: string): MorningEntry | undefined { return s.morning?.[date] }

/** Wurde der Schlaf für diesen Aufwach-Tag schon morgens beantwortet? */
export function morningAnswered(s: Pick<LabState, "morning">, date: string) { return s.morning?.[date]?.schlaf != null }

const clamp5 = (v: number | undefined) => v == null || !Number.isFinite(v) ? undefined : Math.max(1, Math.min(5, Math.round(v)))

/**
 * Morgen-Antwort speichern. `sleep` (Alias `schlaf`) = 1–5 aus den 5 Smileys, `fit` optional („Genauer“).
 * date = Aufwach-Tag (normal todayIso()). Gibt es für den Tag schon einen Check-in, wird `schlaf` dort sofort mit übernommen.
 * Felder, die nicht übergeben werden, bleiben erhalten (zweiter Aufruf mit nur `fit` überschreibt den Schlaf nicht).
 */
export function saveMorning(s: LabState, date: string, v: { sleep?: number; schlaf?: number; fit?: number }, now = new Date()): LabState {
  const cur = s.morning?.[date] ?? {}
  const schlaf = clamp5(v.sleep ?? v.schlaf) ?? cur.schlaf
  const fit = clamp5(v.fit) ?? cur.fit
  const entry: MorningEntry = { ...(schlaf != null ? { schlaf } : {}), ...(fit != null ? { fit } : {}), at: cur.at ?? (date === todayIso() ? nowTime(now) : undefined) }
  if (entry.at === undefined) delete entry.at
  s.morning = { ...(s.morning ?? {}), [date]: entry }
  const c = s.checkins[date]
  if (c && schlaf != null) s.checkins[date] = { ...c, scores: { ...c.scores, schlaf } }
  return s
}

/** Morgen-Antwort löschen (z. B. „falscher Tag“). Ein schon übernommener Check-in-Wert bleibt stehen. */
export function clearMorning(s: LabState, date: string): LabState {
  if (s.morning?.[date]) { const m = { ...s.morning }; delete m[date]; s.morning = m }
  return s
}

/**
 * Soll die App die Morgen-Frage gerade anbieten (Tagesrunde / Heute-Karte)?
 * Ab dem Aufstehen (die Push-Erinnerung kommt erst um Aufstehzeit + morningDelay) bis der Abend-Check-in öffnet –
 * danach fragt der Abend-Check-in den Schlaf wie bisher mit (eveningDims).
 */
export function morningDue(s: LabState, today: string, now: Date): boolean {
  const first = phaseWindows(s)[0]
  if (!s.startDate || !first || today < first.start) return false
  if (morningAnswered(s, today) || s.checkins[today]?.scores.schlaf != null) return false
  const nowRel = relMin(now.getHours() * 60 + now.getMinutes(), s.settings)
  const wake = relMin(toMin(s.settings.wake), s.settings)
  // spätestens 6 h nach dem Aufstehen – danach fragt der Abend-Check-in den Schlaf mit (kein „Wie hast du geschlafen?“ am Nachmittag)
  return nowRel >= wake - 30 && nowRel < Math.min(checkinOpensMin(s), wake + 360)
}

/** Uhrzeit der Morgen-Frage als HH:MM (für Einstellungen/Erklärtexte). */
export function morningTime(s: Pick<LabState, "settings">) { return fromMin(morningMin(s.settings)) }

/** Bereiche für den ABEND-Check-in: wie activeDims, aber ohne Schlaf, wenn er für diesen Tag morgens schon beantwortet wurde. */
export function eveningDims(s: LabState, date: string): DimInfo[] {
  const dims = activeDims(s)
  return morningAnswered(s, date) ? dims.filter(d => d.id !== "schlaf") : dims
}

/**
 * Check-in speichern (statt p.checkins[c.date] = c): übernimmt den Morgen-Schlaf (gewinnt vor dem Abend-Wert,
 * auch bei 1-Klick-Check-ins) und tagsüber eingetragene Beschwerden (DaySides), falls der Check-in keine eigenen mitbringt.
 * Die UI soll das Beschwerde-Feld des Check-ins mit sidesOf(s, date) vorbelegen – dann ist c.sides maßgeblich.
 */
export function putCheckin(s: LabState, c: CheckIn): LabState {
  const m = s.morning?.[c.date]
  const ds = s.daySides?.[c.date]
  const out: CheckIn = { ...c, scores: { ...c.scores } }
  if (m?.schlaf != null) out.scores.schlaf = m.schlaf
  if (ds) {
    if (!out.sides || !Object.keys(out.sides).length) out.sides = { ...ds.sides }
    if (ds.suspect) out.suspect = { ...ds.suspect, ...out.suspect }
    const rest = { ...s.daySides }; delete rest[c.date]; s.daySides = rest
  }
  if (out.suspect) out.suspect = cleanSuspect(out.suspect, out.sides ?? {})
  s.checkins[c.date] = out
  return s
}

// ── Extra-Einnahmen ──────────────────────────────────────────────────────────

export interface ExtraInput { lib?: string; supp?: string; name?: string; emoji?: string; dose?: string; at?: string }

/**
 * Spontane Einnahme eintragen – Bibliothek (lib), eigene Liste (supp) oder freier Name.
 * date: heute/gestern/beliebiger vergangener Tag. Uhrzeit: übergeben, sonst „jetzt“ nur für heute.
 * Gibt den Stand zurück; der neue Eintrag ist der letzte in s.extra[date]. Ungültige Eingabe (kein Name) → unverändert.
 */
export function addExtra(s: LabState, date: string, item: ExtraInput, now = new Date()): LabState {
  const mine = item.supp ? s.supps.find(x => x.id === item.supp) : undefined
  const libId = item.lib ?? mine?.lib
  const lib = libId ? LIB_BY_ID[libId] : undefined
  const name = (item.name?.trim() || (mine ? mine.name : lib?.name) || "").slice(0, 60)
  if (!name) return s
  const list = s.extra?.[date] ?? []
  const x: ExtraIntake = {
    id: `x${Date.now().toString(36)}${list.length}`,
    ...(lib ? { lib: lib.id } : {}),
    ...(mine ? { supp: mine.id } : {}),
    name,
    ...(item.emoji ?? mine?.emoji ?? lib?.emoji ? { emoji: item.emoji ?? mine?.emoji ?? lib?.emoji } : {}),
    ...(item.dose?.trim() ? { dose: item.dose.trim().slice(0, 40) } : {}),
    ...(item.at ? { at: item.at } : date === todayIso() ? { at: nowTime(now) } : {}),
  }
  s.extra = { ...(s.extra ?? {}), [date]: [...list, x] }
  return s
}

export function removeExtra(s: LabState, date: string, id: string): LabState {
  const list = (s.extra?.[date] ?? []).filter(x => x.id !== id)
  const next = { ...(s.extra ?? {}) }
  if (list.length) next[date] = list
  else delete next[date]
  s.extra = next
  return s
}

export interface RecentExtra { key: string; lib?: string; supp?: string; name: string; emoji: string; count: number; last: string }

/** Zuletzt genutzte Extra-Einnahmen für die Schnellauswahl (neueste zuerst, dann häufigste). */
export function recentExtras(s: Pick<LabState, "extra">, n = 8): RecentExtra[] {
  const m = new Map<string, RecentExtra>()
  for (const [date, list] of Object.entries(s.extra ?? {})) for (const x of list) {
    const k = extraKey(x)
    const cur = m.get(k)
    if (!cur) m.set(k, { key: k, ...(x.lib ? { lib: x.lib } : {}), ...(x.supp ? { supp: x.supp } : {}), name: extraLabel(x), emoji: extraEmoji(x), count: 1, last: date })
    else { cur.count++; if (date > cur.last) cur.last = date }
  }
  return [...m.values()].sort((a, b) => b.last.localeCompare(a.last) || b.count - a.count).slice(0, n)
}

// ── Beschwerden an jedem Tag + Vermutung ─────────────────────────────────────

/** Auswahl „Ich vermute: weiß nicht“ (wird nicht gespeichert – fehlender Eintrag = weiß nicht). */
export const SUSPECT_UNKNOWN = "?"

export interface SuspectOption { key: string; name: string; emoji: string; source: "plan" | "extra" }

/** Wofür kann man an einem Tag etwas vermuten? Eingenommenes + Geplantes aus dem Plan, dann Extra-Einnahmen. */
export function suspectOptions(s: LabState, date: string): SuspectOption[] {
  const ids = [...new Set([...(s.took[date] ?? []), ...intakeOn(s, date)])]
  const out: SuspectOption[] = []
  for (const id of ids) {
    const x = s.supps.find(q => q.id === id)
    if (x) out.push({ key: x.id, name: suppName(x), emoji: x.emoji, source: "plan" })
  }
  const seen = new Set(out.map(o => LIB_BY_ID[o.key] ? o.key : ""))
  for (const x of extrasOn(s, date)) {
    const k = `x:${extraKey(x)}`
    if (out.some(o => o.key === k) || (x.lib && seen.has(x.lib)) || (x.supp && ids.includes(x.supp))) continue
    out.push({ key: k, name: extraLabel(x), emoji: extraEmoji(x), source: "extra" })
  }
  return out
}

function cleanSuspect(sus: Record<string, string>, sides: Record<string, number>) {
  const out: Record<string, string> = {}
  for (const [side, key] of Object.entries(sus)) if (sides[side] && key && key !== SUSPECT_UNKNOWN) out[side] = key
  return Object.keys(out).length ? out : undefined
}

/** Beschwerden eines Tages (aus dem Check-in oder – ohne Check-in – aus den Tages-Beschwerden). Zum Vorbelegen. */
export function sidesOf(s: LabState, date: string): { sides: Record<string, number>; suspect: Record<string, string> } {
  const c = s.checkins[date]
  if (c) return { sides: { ...(c.sides ?? {}) }, suspect: { ...(c.suspect ?? {}) } }
  const d = s.daySides?.[date]
  return { sides: { ...(d?.sides ?? {}) }, suspect: { ...(d?.suspect ?? {}) } }
}

/**
 * Beschwerden für einen Tag setzen (ersetzt die bisherigen dieses Tages). sides: id → 1 leicht / 2 stark (0 = entfernen).
 * suspect: id → SuspectOption.key bzw. SUSPECT_UNKNOWN. Gibt es einen Check-in, landet alles direkt dort (zählt sofort
 * in testResult); sonst in s.daySides[date] und wird beim Check-in übernommen (putCheckin).
 */
export function setDaySides(s: LabState, date: string, sides: Record<string, number>, suspect: Record<string, string> = {}, now = new Date()): LabState {
  const clean: Record<string, number> = {}
  for (const [id, v] of Object.entries(sides)) if (v === 1 || v === 2) clean[id] = v
  const sus = cleanSuspect(suspect, clean)
  const c = s.checkins[date]
  if (c) {
    const next: CheckIn = { ...c, sides: clean }
    if (sus) next.suspect = sus
    else delete next.suspect
    s.checkins[date] = next
    return s
  }
  const rest = { ...(s.daySides ?? {}) }
  if (Object.keys(clean).length) {
    const e: DaySides = { sides: clean, ...(sus ? { suspect: sus } : {}) }
    const at = rest[date]?.at ?? (date === todayIso() ? nowTime(now) : undefined)
    if (at) e.at = at
    rest[date] = e
  } else delete rest[date]
  s.daySides = rest
  return s
}

export interface SuspectStat {
  key: string; name: string; emoji: string
  total: number                         // Tage mit mind. einer Vermutung für dieses Supplement
  sides: { id: string; n: number; strong: number }[]
  last: string
}

/**
 * „Deine Vermutungen“: pro Supplement, wie oft welche Beschwerde vermutet wurde (nur lokale Anzeige –
 * wird NICHT an die Community gesendet). Sortiert nach Häufigkeit.
 */
export function suspectSummary(s: LabState): SuspectStat[] {
  const days: { date: string; sides: Record<string, number>; suspect: Record<string, string> }[] = []
  for (const c of Object.values(s.checkins)) if (c.suspect) days.push({ date: c.date, sides: c.sides ?? {}, suspect: c.suspect })
  for (const [date, d] of Object.entries(s.daySides ?? {})) if (d.suspect && !s.checkins[date]) days.push({ date, sides: d.sides, suspect: d.suspect })
  const m = new Map<string, SuspectStat & { dates: Set<string> }>()
  for (const d of days) for (const [side, key] of Object.entries(d.suspect)) {
    if (!key || key === SUSPECT_UNKNOWN) continue
    let st = m.get(key)
    if (!st) { st = { key, ...suspectName(s, key, d.date), total: 0, sides: [], last: d.date, dates: new Set() }; m.set(key, st) }
    st.dates.add(d.date)
    if (d.date > st.last) st.last = d.date
    const x = st.sides.find(q => q.id === side) ?? (st.sides.push({ id: side, n: 0, strong: 0 }), st.sides[st.sides.length - 1])
    x.n++
    if ((d.sides[side] ?? 0) >= 2) x.strong++
  }
  return [...m.values()].map(({ dates, ...st }) => ({ ...st, total: dates.size, sides: st.sides.sort((a, b) => b.n - a.n || b.strong - a.strong) }))
    .sort((a, b) => b.total - a.total || b.last.localeCompare(a.last))
}

function suspectName(s: LabState, key: string, date: string): { name: string; emoji: string } {
  if (key.startsWith("x:")) {
    const k = key.slice(2)
    const hit = extrasOn(s, date).find(x => extraKey(x) === k)
      ?? Object.values(s.extra ?? {}).flat().find(x => extraKey(x) === k)
    if (hit) return { name: extraLabel(hit), emoji: extraEmoji(hit) }
    const lib = LIB_BY_ID[k]
    return lib ? { name: lib.name, emoji: lib.emoji } : { name: k.replace(/^n:/, ""), emoji: "💊" }
  }
  const x = s.supps.find(q => q.id === key)
  if (x) return { name: suppName(x), emoji: x.emoji }
  const lib = LIB_BY_ID[key]
  return lib ? { name: lib.name, emoji: lib.emoji } : { name: key, emoji: "💊" }
}

/** Gibt es an diesem Tag irgendetwas, das den Vergleich unfair macht? (Störfaktoren oder Extra-Einnahmen) – für Tages-Markierungen. */
export function dayMarked(s: LabState, date: string) {
  return (s.checkins[date]?.tags.length ?? 0) > 0 || extrasOn(s, date).length > 0
}
