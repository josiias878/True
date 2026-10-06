// ── Supplement Lab: „Dein Weg“ ─────────────────────────────────────────────────
// Was heute noch ansteht und was in den nächsten Tagen passiert — als Stationen auf einer Strecke.

import {
  addDays, checkinOpensMin, diffDays, fromMin, intakeOn, morningMin, nextCandidates, phaseWindows, relMin, stackMembers, streak, suppColor, suppMinutes,
  type LabState,
} from "./supplementLab"
import { morningAnswered, morningDue } from "./labDay"
import { t, clock } from "./labI18n"
import { LOW_DAYS, inUse, stockInfo } from "./labStock"

export type StopKind = "morning" | "take" | "checkin" | "result" | "lastDay" | "nextTest" | "startTest" | "stock" | "streak" | "stack" | "check" | "reset"

export interface Stop {
  key: string
  date: string
  kind: StopKind
  emoji: string
  title: string
  sub?: string
  state: "done" | "now" | "future"
  color?: string
  suppId?: string
  est?: boolean // Prognose (z. B. nächster Test als Vorschlag)
}

const MILESTONES = [3, 7, 14, 21, 30, 50, 100]

export function pathStops(s: LabState, today: string, now: Date, checkinLocked: boolean, horizon = 14): { stops: Stop[]; goal: Stop | null } {
  const wins = phaseWindows(s)
  if (!wins.length) return { stops: [], goal: null }
  const nowRel = relMin(now.getHours() * 60 + now.getMinutes(), s.settings)
  const w = wins.find(x => today >= x.start && today <= x.end) ?? null
  const first = wins[0]
  const notStarted = today < first.start
  const next = nextCandidates(s)[0]
  const name = (id?: string) => s.supps.find(x => x.id === id)?.name ?? "?"
  const col = (id?: string) => suppColor(s.supps.find(x => x.id === id))
  const out: Stop[] = []
  const add = (x: Omit<Stop, "state"> & { state?: Stop["state"] }) => out.push({ state: "future", ...x })

  // ── Heute
  const yesterday = addDays(today, -1)
  if (!notStarted && yesterday >= first.start && !s.checkins[yesterday])
    out.push({ key: "catchup", date: today, kind: "checkin", emoji: "🌅", title: t("Gestern nachtragen"), sub: t("10 Sekunden"), state: "now" })
  if (!notStarted) {
    // Morgen-Frage (Schlaf): offen ab dem Aufstehen bis der Abend-Check-in öffnet, danach fragt der Check-in mit
    if (morningAnswered(s, today))
      out.push({ key: "morning", date: today, kind: "morning", emoji: "🌙", title: t("Wie hast du geschlafen?"), sub: t("✓ erledigt"), state: "done" })
    else if (morningDue(s, today, now))
      out.push({ key: "morning", date: today, kind: "morning", emoji: "🌙", title: t("Wie hast du geschlafen?"), sub: t("1 Tipp"),
        state: nowRel >= relMin(morningMin(s.settings), s.settings) - 30 ? "now" : "future" })
    const took = s.took[today] ?? []
    const ids = [...intakeOn(s, today)].sort((a, b) => suppMinutes(a, s) - suppMinutes(b, s))
    for (const id of ids) {
      const x = s.supps.find(q => q.id === id)
      if (!x) continue
      const at = suppMinutes(id, s)
      const done = took.includes(id)
      add({ key: `take-${id}`, date: today, kind: "take", emoji: x.emoji, suppId: id, color: suppColor(x),
        title: x.name, sub: done ? `✓ ${s.tookAt[today]?.[id] ?? ""}`.trim() : clock(fromMin(at)),
        state: done ? "done" : nowRel >= at - 15 ? "now" : "future" })
    }
    for (const p of wins) {
      if (p.kind === "test" && p.suppId && p.end < today && !s.verdicts[p.suppId])
        add({ key: `result-${p.id}`, date: today, kind: "result", emoji: "🎁", title: t("Ergebnis: {name}", { name: name(p.suppId) }), sub: t("Aufdecken!"), suppId: p.suppId, state: "now", color: col(p.suppId) })
    }
    const checked = !!s.checkins[today]
    // offen ab checkinOpensMin (6 h vor der Erinnerung, frühestens 8 h nach dem Aufstehen) – Frühaufsteher z. B. ab 16 Uhr
    const cm = checkinOpensMin(s)
    add({ key: "checkin", date: today, kind: "checkin", emoji: "⭐", title: t("Check-in"),
      sub: checked ? t("✓ erledigt") : checkinLocked ? t("ab {time}", { time: clock(fromMin(cm)) }) : t("Wie war dein Tag?"),
      state: checked ? "done" : checkinLocked || nowRel < cm ? "future" : "now" })
    if (!w && next && !wins.some(p => p.kind === "stack"))
      add({ key: "start-next", date: today, kind: "startTest", emoji: "🔬", title: t("Test starten: {name}", { name: next.name }), sub: t("Mein Vorschlag"), suppId: next.id, state: "now", color: col(next.id) })
    else if (!w && !next && stackMembers(s, false).length && !wins.some(p => p.kind === "stack"))
      add({ key: "start-stack", date: today, kind: "stack", emoji: "🏆", title: t("Stack starten"), sub: t("Alles getestet!"), state: "now", color: "#eda100" })
  } else {
    add({ key: "reset", date: first.start, kind: "reset", emoji: "🧘", title: t("Reset startet"), sub: t("{n} Tage nichts nehmen", { n: first.days }), color: "#2ECC8A" })
  }

  // ── Die nächsten Tage
  const later: Stop[] = []
  const soon = (d: string) => d > today && diffDays(today, d) <= horizon
  const push = (x: Omit<Stop, "state">) => { if (soon(x.date)) later.push({ state: "future", ...x }) }
  const wash = s.settings.washoutDays
  if (w && !w.open) {
    if (w.kind === "baseline") {
      push({ key: "base-end", date: w.end, kind: "lastDay", emoji: "🏁", title: t("Letzter Reset-Tag"), color: "#2ECC8A" })
      if (next) push({ key: "first-test", date: addDays(w.end, 1), kind: "nextTest", emoji: next.emoji, title: t("Erster Test: {name}", { name: next.name }), sub: t("Vorschlag"), suppId: next.id, color: col(next.id), est: true })
    }
    if (w.kind === "test" && w.suppId) {
      if (w.end > today) push({ key: "test-end", date: w.end, kind: "lastDay", emoji: "🏁", title: t("Letzter Testtag"), sub: name(w.suppId), suppId: w.suppId, color: col(w.suppId) })
      push({ key: "result", date: addDays(w.end, 1), kind: "result", emoji: "🎁", title: t("Ergebnis: {name}", { name: name(w.suppId) }), sub: wash ? (wash === 1 ? t("danach 1 Tag Pause") : t("danach {n} Tage Pause", { n: wash })) : t("Wirkt es bei dir?"), suppId: w.suppId, color: col(w.suppId) })
      const after = nextCandidates(s).find(x => x.id !== w.suppId)
      if (after) push({ key: "next-test", date: addDays(w.end, 1 + wash), kind: "nextTest", emoji: after.emoji, title: t("Nächster Test: {name}", { name: after.name }), sub: t("Vorschlag"), suppId: after.id, color: col(after.id), est: true })
    }
    if (w.kind === "washout" && next) push({ key: "next-test", date: addDays(w.end, 1), kind: "nextTest", emoji: next.emoji, title: t("Nächster Test: {name}", { name: next.name }), sub: t("Vorschlag"), suppId: next.id, color: col(next.id), est: true })
    if (w.kind === "check" && w.suppId) push({ key: "check-end", date: addDays(w.end, 1), kind: "check", emoji: "🤔", title: t("Hat {name} gefehlt?", { name: name(w.suppId) }), sub: t("Du entscheidest"), suppId: w.suppId, color: col(w.suppId) })
  }
  // Vorrat geht aus
  for (const x of s.supps) {
    const info = stockInfo(s, x)
    if (!info?.until || !inUse(s, x, today) || x.stock?.ordered) continue
    const order = addDays(info.until, -LOW_DAYS)
    if (order > today) push({ key: `stock-${x.id}`, date: order, kind: "stock", emoji: "🛒", title: t("{name} nachkaufen", { name: x.name }), sub: t("reicht bis {d}.{m}.", { d: info.until.slice(8), m: info.until.slice(5, 7) }), suppId: x.id })
  }
  // Serien-Meilenstein
  const st = streak(s)
  const m = MILESTONES.find(v => v > st)
  if (m && st > 0) {
    const d = addDays(today, m - st - (s.checkins[today] ? 0 : 1))
    push({ key: `streak-${m}`, date: d, kind: "streak", emoji: "🔥", title: t("{n}-Tage-Serie", { n: m }), sub: t("Dranbleiben!"), color: "#eb6834" })
  }
  later.sort((a, b) => a.date.localeCompare(b.date))

  const goal: Stop | null = wins.some(p => p.kind === "stack") ? null
    : { key: "goal", date: "", kind: "stack", emoji: "🏆", title: t("Dein Stack"), sub: stackMembers(s, false).length ? t("{n} dabei", { n: stackMembers(s, false).length }) : t("Das Ziel"), state: "future", color: "#eda100" }
  return { stops: [...out, ...later.slice(0, 5)], goal }
}
