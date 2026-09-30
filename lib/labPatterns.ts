// ── Supplement Lab: Muster-Detektor ───────────────────────────────────────────
// Kolbi sucht in deinen Check-ins nach Zusammenhängen: Störfaktoren, Wochentage,
// ausgelassene Einnahmen und Einnahme-Uhrzeit. Nur Hinweise – keine Beweise.

import {
  DIMS, TAGS, daySum, intakeOn, libOf, relMin, toMin, fromMin,
  type CheckIn, type Dim, type LabState,
} from "./supplementLab"

export interface Pattern {
  id: string
  kind: "tag" | "weekday" | "skip" | "time"
  emoji: string
  title: string       // z. B. „Nach Alkohol“
  dim: Dim | null     // null = Gesamtgefühl
  delta: number       // mit − ohne (★)
  with: number        // Ø ★ mit
  without: number     // Ø ★ ohne
  labelWith: string
  labelWithout: string
  n: number           // Tage „mit“
}

export const TAG_EMOJI: Record<string, string> = {
  "Wenig geschlafen": "😴", "Viel Stress": "😣", "Training": "🏋️", "Alkohol": "🍷", "Krank": "🤒",
  "Reise": "✈️", "Spät gegessen": "🍕", "Motiviert": "🚀", "Guter Pump": "💪",
}
const WEEKDAYS = ["Sonntags", "Montags", "Dienstags", "Mittwochs", "Donnerstags", "Freitags", "Samstags"]
const MIN_N = 3
const MIN_DELTA = 0.4

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
const score = (c: CheckIn, dim: Dim | null) => dim ? c.scores[dim] : daySum(c)

/** Größter Unterschied über Gesamt + einzelne Bereiche (mind. MIN_N Tage je Gruppe). */
function bestSplit(yes: CheckIn[], no: CheckIn[], dims: (Dim | null)[]) {
  let best: { dim: Dim | null; w: number; wo: number; d: number } | null = null
  for (const dim of dims) {
    const a = yes.map(c => score(c, dim)).filter((v): v is number => v != null)
    const b = no.map(c => score(c, dim)).filter((v): v is number => v != null)
    if (a.length < MIN_N || b.length < MIN_N) continue
    const w = mean(a), wo = mean(b), d = w - wo
    // Gesamtgefühl leicht bevorzugen (ist robuster)
    const weight = dim ? Math.abs(d) : Math.abs(d) * 1.15
    if (!best || weight > (best.dim ? Math.abs(best.d) : Math.abs(best.d) * 1.15)) best = { dim, w, wo, d }
  }
  return best && Math.abs(best.d) >= MIN_DELTA ? best : null
}

export function findPatterns(s: LabState): Pattern[] {
  const cs = Object.values(s.checkins).filter(c => !c.quick || Object.keys(c.scores).length)
  if (cs.length < 6) return []
  const allDims: (Dim | null)[] = [null, ...DIMS.filter(d => cs.some(c => c.scores[d.id] != null)).map(d => d.id)]
  const out: Pattern[] = []

  // Störfaktoren
  for (const tag of TAGS) {
    const yes = cs.filter(c => c.tags.includes(tag)), no = cs.filter(c => !c.tags.includes(tag))
    const b = bestSplit(yes, no, allDims)
    if (b) out.push({ id: `tag:${tag}`, kind: "tag", emoji: TAG_EMOJI[tag] ?? "🏷️", title: tag === "Training" || tag === "Reise" ? `An ${tag}stagen` : `Bei „${tag}“`,
      dim: b.dim, delta: b.d, with: b.w, without: b.wo, labelWith: "mit", labelWithout: "ohne", n: yes.length })
  }

  // Wochentage: schwächster bzw. stärkster Tag gegen den Rest
  const byDay = new Map<number, CheckIn[]>()
  for (const c of cs) { const d = new Date(`${c.date}T12:00:00`).getDay(); byDay.set(d, [...(byDay.get(d) ?? []), c]) }
  let wd: Pattern | null = null
  for (const [d, list] of byDay) {
    const b = bestSplit(list, cs.filter(c => !list.includes(c)), [null])
    if (b && Math.abs(b.d) >= 0.5 && (!wd || Math.abs(b.d) > Math.abs(wd.delta)))
      wd = { id: `weekday:${d}`, kind: "weekday", emoji: "📅", title: WEEKDAYS[d], dim: null, delta: b.d, with: b.w, without: b.wo, labelWith: WEEKDAYS[d].replace(/s$/, ""), labelWithout: "sonst", n: list.length }
  }
  if (wd) out.push(wd)

  // Ausgelassene Einnahme (bei allem, was regelmäßig geplant ist)
  for (const x of s.supps) {
    const planned = cs.filter(c => intakeOn(s, c.date).includes(x.id))
    const yes = planned.filter(c => (s.took[c.date] ?? []).includes(x.id)), no = planned.filter(c => !(s.took[c.date] ?? []).includes(x.id))
    const dims = [null, ...(libOf(x)?.watch ?? [])] as (Dim | null)[]
    const b = bestSplit(yes, no, dims)
    if (b) out.push({ id: `skip:${x.id}`, kind: "skip", emoji: x.emoji, title: `Mit ${x.name}`, dim: b.dim, delta: b.d, with: b.w, without: b.wo,
      labelWith: "genommen", labelWithout: "vergessen", n: yes.length })
  }

  // Einnahme-Uhrzeit: früher vs. später (Median-Split)
  for (const x of s.supps) {
    const days = cs.map(c => ({ c, t: s.tookAt[c.date]?.[x.id] })).filter((d): d is { c: CheckIn; t: string } => !!d.t)
      .map(d => ({ ...d, m: relMin(toMin(d.t), s.settings) }))
    if (days.length < 6) continue
    const sorted = [...days].sort((a, b) => a.m - b.m)
    const mid = sorted[Math.floor(sorted.length / 2)].m
    const early = days.filter(d => d.m < mid), late = days.filter(d => d.m >= mid)
    if (!early.length || !late.length || mean(late.map(d => d.m)) - mean(early.map(d => d.m)) < 45) continue
    const dims = [null, ...(libOf(x)?.watch ?? [])] as (Dim | null)[]
    const b = bestSplit(early.map(d => d.c), late.map(d => d.c), dims)
    if (b) out.push({ id: `time:${x.id}:${Math.round(mid / 30) * 30}`, kind: "time", emoji: "⏰", title: `${x.name} vor ${fromMin(Math.round(mid / 15) * 15)}`,
      dim: b.dim, delta: b.d, with: b.w, without: b.wo, labelWith: "früher", labelWithout: "später", n: early.length })
  }

  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6)
}

export function dimLabel(d: Dim | null) {
  const x = DIMS.find(q => q.id === d)
  return x ? `${x.emoji} ${x.label}` : "✨ Gesamtgefühl"
}
