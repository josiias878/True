// ── Supplement Lab: Smarter Coach ─────────────────────────────────────────────
// Regelbasiert und offline: schaut auf Phase, Check-ins, Nebenwirkungen und Uhrzeiten
// und sagt dir, was als Nächstes dran ist — inkl. 1-Tipp-Aktion.

import {
  DIMS, LIB_BY_ID, ONSET_INFO, SLOTS, SIDE_BY_ID,
  phaseWindows, phaseAt, checkinsIn, nextCandidates, signal, testResult, intakeOn, slotFor, slotMinutes, slotTime,
  avgIntakeMinutes, meanScore, libOf, defaultMode, todayIso, addDays, diffDays, fmtDate, fromMin, toMin, daySum,
  suppMinutes, suppTime, recentIntake, relMin, isHere,
  type LabState, type Decision, type PhaseWindow,
} from "./supplementLab"
import { partnerTips, recentSides, sideCauses } from "./labKnowledge"
import { buyInfo, costSummary, fmtEuro, inUse, shopUrl, stockInfo } from "./labStock"
import { fmtGap, interactionChecks } from "./labInteractions"
import { dimLabel, findPatterns } from "./labPatterns"
import { t, dec, clock } from "./labI18n"

export type Mood = "happy" | "think" | "alert" | "party" | "sleepy"

export type CoachAction =
  | { kind: "checkin" }
  | { kind: "startTest"; suppId: string }
  | { kind: "pickNext" }
  | { kind: "verdict"; suppId: string; decision: Decision }
  | { kind: "openVerdict"; suppId: string }
  | { kind: "abort" }
  | { kind: "startStack" }
  | { kind: "check"; suppId: string }
  | { kind: "resolveCheck"; suppId: string; keep: boolean }
  | { kind: "konstant"; suppId: string }
  | { kind: "konstantAll"; suppIds: string[] }
  | { kind: "reclassifyPick"; suppIds: string[] }
  | { kind: "keepTesting"; suppIds: string[] }
  | { kind: "addSupp"; libId: string; tipId?: string }
  | { kind: "gotIt"; tipId: string }
  | { kind: "take"; suppId: string }
  | { kind: "arrived"; suppId: string }
  | { kind: "stillAway"; suppId: string }
  | { kind: "setAway"; suppId: string }
  | { kind: "shop"; suppId: string }
  | { kind: "ordered"; suppId: string }
  | { kind: "refill"; suppId: string }
  | { kind: "stock"; suppId: string }
  | { kind: "setTime"; suppId: string; time: string; tipId: string }
  | { kind: "seePattern"; tipId: string }
  | { kind: "recap" }
  | { kind: "experiments" }
  | { kind: "reminders" }
  | { kind: "dismiss" }

export interface CoachMsg {
  id: string
  mood: Mood
  title: string
  text: string
  actions?: { label: string; action: CoachAction; primary?: boolean }[]
  prio: number // kleiner = wichtiger
}

const fmt = (n: number) => dec(n, 1)
const name = (s: LabState, id?: string) => s.supps.find(x => x.id === id)?.name ?? t("das Supplement")
const DECISION_LABEL: Record<Decision, string> = { keep: t("💚 Behalten"), maybe: t("🤔 Vielleicht"), drop: t("✂️ Rausnehmen") }

export function coach(s: LabState, now = new Date(), dismissed: string[] = []): CoachMsg[] {
  if (!s.startDate) return []
  const today = todayIso()
  const wins = phaseWindows(s)
  const w = phaseAt(s, today)
  const last = wins[wins.length - 1]
  const base = wins.find(p => p.kind === "baseline")
  const baseMean = base ? meanScore(checkinsIn(s, base)) : null
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const out: CoachMsg[] = []
  const push = (m: CoachMsg) => { if (!dismissed.includes(m.id)) out.push(m) }

  // ── Noch nicht gestartet
  if (wins[0] && today < wins[0].start) {
    push({ id: "not-started", mood: "happy", prio: 10, title: t("Morgen geht's los"),
      text: t("Ab {date} nimmst du {n} Tage lang nichts. Heute darfst du noch alles wie gewohnt nehmen.", { date: fmtDate(wins[0].start), n: wins[0].days }) })
    return out
  }

  // ── Starke Nebenwirkungen im laufenden Test
  if (w?.kind === "test" && w.suppId) {
    const strong = checkinsIn(s, w).flatMap(c => Object.entries(c.sides ?? {}).filter(([, v]) => v >= 2).map(([id]) => SIDE_BY_ID[id]?.label))
    if (strong.length) {
      push({ id: `strong-${w.id}`, mood: "alert", prio: 1, title: t("Starke Nebenwirkung bei {name}", { name: name(s, w.suppId) }),
        text: t("{sides}. Wenn es dir damit nicht gut geht: brich den Test ab. Hält es an, lass es ärztlich abklären.", { sides: [...new Set(strong)].join(", ") }),
        actions: [{ label: t("✋ Test abbrechen"), action: { kind: "abort" }, primary: true }, { label: t("Weiter testen"), action: { kind: "dismiss" } }] })
    }
  }

  // ── Urteil fällig
  for (const p of wins.filter(x => x.kind === "test" && x.suppId && x.end < today && !s.verdicts[x.suppId])) {
    const sig = signal(s, p.suppId!)
    const sug = sig.suggestion ?? "maybe"
    const r = testResult(s, p.suppId!)
    const detail = r?.overall.base != null && r.overall.test != null ? ` ${t("Im Test {test}★ statt {base}★ im Reset.", { test: fmt(r.overall.test), base: fmt(r.overall.base) })}` : ""
    push({ id: `verdict-${p.id}`, mood: sug === "keep" ? "party" : "think", prio: 2, title: t("{name} ist fertig getestet", { name: name(s, p.suppId) }),
      text: `${sig.emoji} ${sig.text}.${detail} ${t("Mein Vorschlag: {choice}.", { choice: DECISION_LABEL[sug].slice(2).trim() })}`,
      actions: [{ label: `${DECISION_LABEL[sug]}`, action: { kind: "verdict", suppId: p.suppId!, decision: sug }, primary: true },
        { label: t("Details ansehen"), action: { kind: "openVerdict", suppId: p.suppId! } }] })
  }

  // ── Stack-Check beendet: Hat es gefehlt?
  if (!w && last?.kind === "check" && last.suppId) {
    const during = meanScore(checkinsIn(s, last))
    const before = wins.filter(x => x.kind === "stack" && x.end < last.start).pop()
    const beforeMean = before ? meanScore(checkinsIn(s, { start: addDays(last.start, -5), end: addDays(last.start, -1) })) : null
    const missing = during != null && beforeMean != null && during < beforeMean - 0.3
    push({ id: `resolve-${last.id}`, mood: "think", prio: 2, title: t("Hat dir {name} gefehlt?", { name: name(s, last.suppId) }),
      text: during != null && beforeMean != null
        ? `${t("Ohne {name}: Ø {during}★, davor {before}★.", { name: name(s, last.suppId), during: fmt(during), before: fmt(beforeMean) })} ${missing ? t("Sieht so aus, als hätte es dir gutgetan.") : t("Kaum Unterschied, du brauchst es vermutlich nicht.")}`
        : t("Du hast es ein paar Tage weggelassen. Wie fühlt es sich an?"),
      actions: [
        { label: t("💚 Wieder rein"), action: { kind: "resolveCheck", suppId: last.suppId, keep: true }, primary: missing },
        { label: t("✂️ Bleibt draußen"), action: { kind: "resolveCheck", suppId: last.suppId, keep: false }, primary: !missing },
      ] })
  }

  // ── Supplements, die eigentlich keinen Test brauchen (z. B. nach einem Update neu erkannt)
  const reclassify = s.supps.filter(x => {
    if (x.mode !== "test" || x.keepTesting || s.verdicts[x.id]) return false
    const lib = libOf(x)
    if (!lib || defaultMode(lib) !== "konstant") return false
    return !phaseWindows(s).some(p => p.suppId === x.id)
  })
  if (reclassify.length) {
    const first = reclassify[0]
    const many = reclassify.length > 1
    push({ id: `reclassify-${reclassify.map(x => x.id).join("-")}`, mood: "think", prio: 3,
      title: many ? t("{n} Supplements brauchen keinen Test", { n: reclassify.length }) : t("{name} braucht keinen Test", { name: first.name }),
      text: many
        ? t("Bei {names} merkt man, wenn überhaupt, erst nach Wochen etwas — ein kurzer Test bringt da wenig. Mein Vorschlag: einfach alle durchgehend nehmen, kein Test nötig.", { names: reclassify.map(x => x.name).join(", ") })
        : t("Bei {names} merkt man, wenn überhaupt, erst nach Wochen etwas — ein kurzer Test bringt da wenig. Mein Vorschlag: einfach durchgehend nehmen, kein Test nötig.", { names: reclassify.map(x => x.name).join(", ") }),
      actions: many ? [
        { label: t("📌 Alle durchgehend"), action: { kind: "konstantAll", suppIds: reclassify.map(x => x.id) }, primary: true },
        { label: t("☑️ Selbst auswählen"), action: { kind: "reclassifyPick", suppIds: reclassify.map(x => x.id) } },
        { label: t("🔬 Alle testen"), action: { kind: "keepTesting", suppIds: reclassify.map(x => x.id) } },
      ] : [
        { label: t("📌 {name} durchgehend", { name: first.name }), action: { kind: "konstant", suppId: first.id }, primary: true },
        { label: t("🔬 Doch testen"), action: { kind: "keepTesting", suppIds: [first.id] } },
      ] })
  }

  // ── Einkaufsliste & Vorrat
  for (const x of s.supps) {
    const shop = shopUrl(x)
    if (x.away) {
      const since = diffDays(x.away, today)
      if (since < 3) continue
      push({ id: `away-${x.id}-${x.away}`, mood: "think", prio: 4, title: t("📦 Ist {name} schon da?", { name: x.name }),
        text: t("Steht seit {n} Tagen auf deiner Einkaufsliste. Sobald es da ist, plane ich es ein – vorher zählt es nirgends mit.", { n: since }),
        actions: [
          { label: t("✓ Ja, ist da"), action: { kind: "arrived", suppId: x.id }, primary: true },
          ...(shop ? [{ label: t("🛒 Bestellen"), action: { kind: "shop" as const, suppId: x.id } }] : []),
          { label: t("Noch nicht"), action: { kind: "stillAway", suppId: x.id } },
        ] })
      continue
    }
    const info = stockInfo(s, x)
    if (!info || !x.stock || !inUse(s, x, today)) continue
    if (x.stock.ordered) {
      if (diffDays(x.stock.ordered, today) < 2) continue
      push({ id: `restock-${x.id}-${x.stock.ordered}`, mood: "happy", prio: 4, title: t("📦 Neue Packung {name} da?", { name: x.name }),
        text: t("Dann tippe kurz – ich fülle den Vorrat auf und rechne neu."),
        actions: [{ label: t("✓ Ja, aufgefüllt"), action: { kind: "refill", suppId: x.id }, primary: true }, { label: t("Noch nicht"), action: { kind: "dismiss" } }] })
    } else if (info.empty) {
      push({ id: `empty-${x.id}-${x.stock.at}`, mood: "alert", prio: 4, title: t("{name} müsste leer sein", { name: x.name }),
        text: t("Laut meiner Rechnung ist die Packung aufgebraucht. Stimmt das?"),
        actions: [
          { label: t("🛒 Ja, leer"), action: { kind: "setAway", suppId: x.id }, primary: true },
          { label: t("Noch was da"), action: { kind: "stock", suppId: x.id } },
        ] })
    } else if (info.low) {
      const alt = buyInfo(x).alt
      push({ id: `low-${x.id}-${x.stock.at}`, mood: "think", prio: 5, title: info.days === 1 ? t("🛒 {name} reicht noch 1 Tag", { name: x.name }) : t("🛒 {name} reicht noch {n} Tage", { name: x.name, n: info.days }),
        text: `${t("Zeit nachzubestellen, damit keine Lücke entsteht.")}${alt ? ` 💡 ${alt}` : ""}`,
        actions: [
          { label: t("📦 Hab bestellt"), action: { kind: "ordered", suppId: x.id }, primary: true },
          ...(shop ? [{ label: t("🛒 Nachkaufen"), action: { kind: "shop" as const, suppId: x.id } }] : []),
        ] })
    }
  }

  // ── Kolbi erklärt: Nebenwirkung → mögliche Ursache, und passende Partner
  const seen = new Set(s.learned)
  const taking = [...new Set([...intakeOn(s, today), ...(w?.kind === "test" && w.suppId ? [w.suppId] : [])])]
  const sides = recentSides(s, 3)
  let causeShown = false
  for (const id of taking) {
    if (causeShown) break
    for (const c of sideCauses(s, id, sides)) {
      const tipId = `cause:${c.lib}:${c.matched.join("+")}`
      if (seen.has(tipId)) continue
      const label = c.matched.map(x => SIDE_BY_ID[x]?.label).filter(Boolean).join(", ")
      const addName = c.add ? LIB_BY_ID[c.add]?.name : undefined
      const has = c.add ? s.supps.some(x => (x.lib ?? x.id) === c.add) : true
      push({ id: tipId, mood: "think", prio: 3, title: t("{sides} – liegt's an {name}?", { sides: label, name: name(s, id) }), text: c.text,
        actions: [
          ...(c.add && addName && !has ? [{ label: t("🛒 {name} vormerken", { name: addName }), action: { kind: "addSupp" as const, libId: c.add, tipId } }] : []),
          { label: t("👍 Gut zu wissen"), action: { kind: "gotIt", tipId }, primary: !c.add || has },
        ] })
      causeShown = true
      break
    }
  }
  for (const id of taking) {
    const p = partnerTips(s, id)[0]
    if (!p) continue
    const tipId = `partner:${libOf(s.supps.find(x => x.id === id))?.id}:${p.with}`
    if (seen.has(tipId)) continue
    push({ id: tipId, mood: "happy", prio: 8, title: `💡 ${p.title}`, text: p.text,
      actions: [
        { label: t("🛒 {name} vormerken", { name: LIB_BY_ID[p.with].name }), action: { kind: "addSupp", libId: p.with, tipId } },
        { label: t("Nein danke"), action: { kind: "gotIt", tipId } },
      ] })
    break
  }

  // ── Täglicher Check-in
  if (!s.checkins[today]) {
    push({ id: "checkin", mood: minutesNow > 20 * 60 ? "sleepy" : "happy", prio: minutesNow > 17 * 60 ? 3 : 7,
      title: t("Wie war dein Tag?"), text: t("Ein Tipp auf ein Gesicht reicht. Je regelmäßiger, desto genauer wird meine Auswertung."),
      actions: [{ label: t("📝 Jetzt einchecken"), action: { kind: "checkin" }, primary: true }] })
  }

  // ── Einnahme fällig
  const took = s.took[today] ?? []
  for (const id of intakeOn(s, today)) {
    if (took.includes(id)) continue
    const at = suppMinutes(id, s)
    const nowRel = relMin(minutesNow, s.settings)
    if (nowRel >= at - 15) {
      push({ id: `take-${id}`, mood: "happy", prio: 4, title: t("Zeit für {name}", { name: name(s, id) }),
        text: t("Geplant um {time}. Tipp zum Abhaken, die Uhrzeit speichere ich automatisch.", { time: clock(fromMin(at)) }),
        actions: [{ label: t("✓ Genommen"), action: { kind: "take", suppId: id }, primary: true }] })
    }
  }

  // ── Phasen-spezifisch
  if (w) phaseAdvice(s, w, today, baseMean, push)
  else idleAdvice(s, today, wins, push)

  // ── Wechselwirkung: zwei Supplements, die man trennen sollte, liegen zu nah beieinander
  for (const p of interactionChecks(s, today)) {
    if (p.ok || p.rule.kind !== "trennen" || !p.fix) continue
    const tipId = `inter:${p.a.id}:${p.b.id}:${p.fix.time}`
    if (seen.has(tipId)) continue
    const moved = s.supps.find(x => x.id === p.fix!.suppId)!
    push({ id: tipId, mood: "alert", prio: 3, title: t("⚠️ {a} & {b} zu nah beieinander", { a: p.a.name, b: p.b.name }),
      text: `${t("Nur {gap} Abstand.", { gap: fmtGap(p.gap) })} ${p.rule.text} ${t("Mein Vorschlag: {name} um {time}.", { name: moved.name, time: clock(p.fix.time) })}`,
      actions: [
        { label: `⏰ ${moved.name} → ${p.fix.time}`, action: { kind: "setTime", suppId: moved.id, time: p.fix.time, tipId }, primary: true },
        { label: t("Passt so"), action: { kind: "gotIt", tipId } },
      ] })
    break
  }

  // ── Muster-Detektor: etwas Neues entdeckt?
  const fresh = findPatterns(s).find(p => !seen.has(`pattern:${p.id}`))
  if (fresh) {
    const tipId = `pattern:${fresh.id}`
    const d = fresh.delta
    push({ id: tipId, mood: d > 0 ? "party" : "think", prio: 6, title: t("🔎 Ich hab was entdeckt"),
      text: `${fresh.emoji} ${fresh.title}: ${t("{dim} {delta}★ im Schnitt.", { dim: dimLabel(fresh.dim), delta: `${d > 0 ? "+" : "−"}${dec(Math.abs(d), 1)}` })}`,
      actions: [{ label: t("👀 Ansehen"), action: { kind: "seePattern", tipId }, primary: true }] })
  }

  // ── Kolbi lernt deine Uhrzeit: nimmst du etwas regelmäßig woanders als geplant, schlägt er deine Zeit vor
  for (const x of s.supps) {
    if (!isHere(x)) continue
    const r = recentIntake(s, x.id, 3)
    if (!r) continue
    const planned = suppMinutes(x.id, s)
    const diff = Math.abs(r.avg - planned)
    if (!((r.count >= 1 && diff >= 90) || (r.count >= 2 && diff >= 45))) continue
    const rounded = Math.round(r.avg / 15) * 15
    const tipId = `time:${x.id}:${rounded}`
    if (seen.has(tipId)) continue
    const lib = libOf(x)
    const ideal = lib ? slotMinutes(slotFor(x.id, s), s.settings) : null
    const farFromIdeal = ideal != null && Math.abs(rounded - ideal) >= 180
    push({ id: tipId, mood: "think", prio: 4, title: t("⏰ {name} lieber um {time}?", { name: x.name, time: clock(fromMin(rounded)) }),
      text: `${r.count > 1
        ? t("Du nimmst es meist um {avg}, geplant war {planned}. Soll ich dich ab jetzt um {time} erinnern?", { avg: clock(fromMin(r.avg)), planned: clock(fromMin(planned)), time: clock(fromMin(rounded)) })
        : t("Du hast es um {avg} genommen, geplant war {planned}. Soll ich dich ab jetzt um {time} erinnern?", { avg: clock(fromMin(r.avg)), planned: clock(fromMin(planned)), time: clock(fromMin(rounded)) })}${farFromIdeal ? ` ${t("💡 Kleiner Hinweis: {tip}", { tip: lib!.timing })}` : ""}`,
      actions: [
        { label: t("✓ Ja, {time}", { time: clock(fromMin(rounded)) }), action: { kind: "setTime", suppId: x.id, time: fromMin(rounded), tipId }, primary: true },
        { label: t("Nein, {time} passt", { time: suppTime(x.id, s) }), action: { kind: "gotIt", tipId } },
      ] })
    break
  }

  // ── Erinnerungen
  if (!s.reminders.enabled) {
    push({ id: "reminders", mood: "happy", prio: 9, title: t("Soll ich dich erinnern?"),
      text: t("Ich melde mich zur Einnahme-Zeit und abends zum Check-in. So bleibst du ohne Nachdenken dran."),
      actions: [{ label: t("🔔 Ja, erinnere mich"), action: { kind: "reminders" }, primary: true }] })
  }

  return out.sort((a, b) => a.prio - b.prio)
}

type Push = (m: CoachMsg) => void

function phaseAdvice(s: LabState, w: PhaseWindow, today: string, baseMean: number | null, push: Push) {
  const day = diffDays(w.start, today) + 1
  const left = diffDays(today, w.end)
  const next = nextCandidates(s)[0]

  if (w.kind === "baseline") {
    const tips = [
      s.supps.some(x => x.lib === "koffein") ? t("Ohne Kaffee sind Kopfschmerzen in den ersten Tagen normal. Das legt sich.") : t("Tag 1 fühlt sich evtl. ungewohnt an. Bleib einfach bei deiner normalen Routine."),
      t("Check-in möglichst immer zur gleichen Uhrzeit, am besten abends."),
      t("Ehrlich bewerten: 😐 ist ein ganz normaler Tag, kein schlechter."),
      t("Alkohol, wenig Schlaf oder Stress? Beim Check-in unter „Störfaktoren“ antippen, dann bleibt der Vergleich fair."),
      t("Bleib bei deinem Alltag: gleiches Essen, gleicher Sport. So sehe ich später echte Unterschiede."),
    ]
    push({ id: `phase-${w.id}-${day}`, mood: "happy", prio: 5, title: left === 0 ? t("Letzter Reset-Tag!") : t("Reset-Phase · Tag {day} von {days}", { day, days: w.days }),
      text: left === 0
        ? (next ? t("Morgen startet dein erster Test: {name}. Heute noch nichts nehmen.", { name: next.name }) : t("Morgen startet dein erster Test. Heute noch nichts nehmen."))
        : `${t("Heute nimmst du nichts.")} ${tips[Math.min(day - 1, tips.length - 1)]}` })
    return
  }

  if (w.kind === "washout") {
    push({ id: `phase-${w.id}`, mood: "sleepy", prio: 5, title: t("Kurze Pause"),
      text: `${left === 0
        ? t("Damit {name} nicht in den nächsten Test reinwirkt, nimmst du heute nichts.", { name: name(s, w.suppId) })
        : t("Damit {name} nicht in den nächsten Test reinwirkt, nimmst du bis {date} nichts.", { name: name(s, w.suppId), date: fmtDate(w.end) })}${next ? ` ${t("Danach kommt {name}.", { name: next.name })}` : ""}`,
      actions: next ? [{ label: t("Pause überspringen: {name} starten", { name: next.name }), action: { kind: "startTest", suppId: next.id } }] : undefined })
    return
  }

  if (w.kind === "test" && w.suppId) {
    const cs = checkinsIn(s, w)
    const mean = meanScore(cs)
    const lib = libOf(s.supps.find(x => x.id === w.suppId))
    if (cs.length >= 2 && mean != null && baseMean != null && mean < baseMean - 0.5) {
      push({ id: `worse-${w.id}-${cs.length}`, mood: "alert", prio: 2, title: t("Dir geht's schlechter als im Reset"),
        text: t("Seit {name}: Ø {mean}★ statt {base}★. Beobachte noch einen Tag. Bleibt es so, lass es weg.", { name: name(s, w.suppId), mean: fmt(mean), base: fmt(baseMean) }),
        actions: [{ label: t("✋ Jetzt abbrechen"), action: { kind: "abort" } }] })
    } else if (cs.length >= 2 && mean != null && baseMean != null && mean > baseMean + 0.4) {
      push({ id: `better-${w.id}-${cs.length}`, mood: "party", prio: 6, title: t("Sieht gut aus!"),
        text: t("Mit {name} liegst du bei Ø {mean}★, im Reset waren es {base}★. Zieh den Test noch durch, dann ist das Ergebnis belastbarer.", { name: name(s, w.suppId), mean: fmt(mean), base: fmt(baseMean) }) })
    }
    const watch = lib?.watch.map(d => DIMS.find(x => x.id === d)?.label).filter(Boolean).join(", ")
    push({ id: `phase-${w.id}-${day}`, mood: "happy", prio: 5,
      title: left === 0 ? t("Letzter Testtag: {name}", { name: name(s, w.suppId) }) : t("Test {name} · Tag {day} von {days}", { name: name(s, w.suppId), day, days: w.days }),
      text: `${left === 0 ? `${t("Morgen bekommst du dein Ergebnis.")} ` : ""}${t("Nur {name}, um {time}.", { name: name(s, w.suppId), time: clock(suppTime(w.suppId, s)) })}${watch ? ` ${t("Achte besonders auf: {dims}.", { dims: watch })}` : ""}${lib && lib.onset !== "schnell" ? ` ${ONSET_INFO[lib.onset].emoji} ${ONSET_INFO[lib.onset].label}.` : ""}` })
    return
  }

  if (w.kind === "stack") {
    const cs = checkinsIn(s, w)
    const recent = cs.slice(-3)
    const early = cs.slice(0, 5)
    const recentMean = meanScore(recent)
    const earlyMean = meanScore(early)
    const kept = s.supps.filter(x => s.verdicts[x.id]?.decision === "keep")
    const fading = cs.length >= 6 && recentMean != null && ((earlyMean != null && recentMean < earlyMean - 0.4) || (baseMean != null && recentMean < baseMean))
    if (fading && kept.length) {
      const suspect = [...kept].sort((a, b) => signal(s, a.id).net - signal(s, b.id).net)[0]
      push({ id: `fading-${w.id}-${cs.length}`, mood: "think", prio: 2, title: t("Deine Werte sinken"),
        text: t("Die letzten 3 Tage: Ø {recent}★, zu Beginn des Stacks {early}★. Lass {name} 3 Tage weg und beobachte, ob sich etwas ändert. Es kann auch an Schlaf, Stress oder Ernährung liegen.", { recent: fmt(recentMean!), early: fmt(earlyMean ?? baseMean ?? 0), name: suspect.name }),
        actions: [{ label: t("👀 {name} 3 Tage weglassen", { name: suspect.name }), action: { kind: "check", suppId: suspect.id }, primary: true }] })
    } else {
      push({ id: `stack-${w.id}-${Math.floor(cs.length / 7)}`, mood: "party", prio: 6, title: t("Dein Stack läuft · Tag {day}", { day: diffDays(w.start, today) + 1 }),
        text: cs.length >= 3 && recentMean != null ? t("Stabil bei Ø {mean}★. Ich passe auf und melde mich, wenn deine Werte sinken.", { mean: fmt(recentMean) }) : t("Nimm deine behaltenen Supplements wie geplant. Ich beobachte, ob deine Werte stabil bleiben.") })
    }
    return
  }

  if (w.kind === "check" && w.suppId) {
    push({ id: `phase-${w.id}-${day}`, mood: "think", prio: 5, title: t("Ohne {name} · Tag {day} von {days}", { name: name(s, w.suppId), day, days: w.days }),
      text: t("Achte darauf, ob dir etwas fehlt: Schlaf, Energie, Stimmung? Danach frage ich dich, ob es wieder rein soll.") })
  }
}

function idleAdvice(s: LabState, today: string, wins: PhaseWindow[], push: Push) {
  const pending = wins.some(x => x.kind === "test" && x.suppId && x.end < today && !s.verdicts[x.suppId])
  if (pending) return
  const last = wins[wins.length - 1]
  if (last?.kind === "check") return // eigene Frage oben
  const next = nextCandidates(s)[0]
  if (next) {
    const lib = libOf(next)
    if (lib?.onset === "langsam") {
      push({ id: `slow-${next.id}`, mood: "think", prio: 3, title: t("Als Nächstes: {name}", { name: next.name }),
        text: t("Bei {name} merkt man, wenn überhaupt, eher nach Wochen etwas. In ein paar Tagen siehst du davon wenig. Du kannst es trotzdem {n} Tage testen, oder es einfach durchgehend nehmen und per Blutbild prüfen.", { name: next.name, n: ONSET_INFO[lib.onset].days }),
        actions: [{ label: t("🔬 {n} Tage testen", { n: ONSET_INFO[lib.onset].days }), action: { kind: "startTest", suppId: next.id }, primary: true },
          { label: t("📌 Einfach durchgehend nehmen"), action: { kind: "konstant", suppId: next.id } },
          { label: t("Anderes wählen"), action: { kind: "pickNext" } }] })
    } else if (lib) {
      push({ id: `next-${next.id}`, mood: "happy", prio: 3, title: t("Bereit für den nächsten Test"),
        text: t("Mein Vorschlag: {name}. Ich empfehle {n} Tage, du kannst das beim Start noch anpassen.", { name: next.name, n: ONSET_INFO[lib.onset].days }),
        actions: [{ label: t("🔬 {name} starten", { name: next.name }), action: { kind: "startTest", suppId: next.id }, primary: true }, { label: t("Anderes wählen"), action: { kind: "pickNext" } }] })
    } else {
      push({ id: `next-${next.id}`, mood: "think", prio: 3, title: t("Bereit für den nächsten Test"),
        text: t("{name} kenne ich nicht — ich kann dir keine Dauer empfehlen, das wäre Beratung. Du entscheidest beim Start selbst.", { name: next.name }),
        actions: [{ label: t("🔬 {name} starten", { name: next.name }), action: { kind: "startTest", suppId: next.id }, primary: true }, { label: t("Anderes wählen"), action: { kind: "pickNext" } }] })
    }
    return
  }
  const kept = s.supps.filter(x => s.verdicts[x.id]?.decision === "keep")
  if (kept.length && !wins.some(x => x.kind === "stack")) {
    push({ id: "stack-ready", mood: "party", prio: 3, title: t("Alles getestet! 🎉"),
      text: kept.length > 1
        ? t("{n} Supplements haben überzeugt. Ab jetzt nimmst du sie zusammen, und ich passe auf, ob deine Werte stabil bleiben.", { n: kept.length })
        : t("{n} Supplement hat überzeugt. Ab jetzt nimmst du es zusammen, und ich passe auf, ob deine Werte stabil bleiben.", { n: kept.length }),
      actions: [{ label: t("🏆 Stack starten"), action: { kind: "startStack" }, primary: true }] })
  } else if (!kept.length && (Object.keys(s.verdicts).length > 0 || wins.some(x => x.kind === "test"))) {
    push({ id: "nothing-kept", mood: "think", prio: 3, title: t("Nichts hat klar überzeugt"),
      text: t("Das ist auch ein Ergebnis: Du sparst Geld und Pillen. Füge neue Supplements hinzu oder teste „Vielleicht“-Kandidaten nochmal."),
      actions: [{ label: t("🧪 Experiment wählen"), action: { kind: "experiments" }, primary: true }, { label: t("➕ Supplement hinzufügen"), action: { kind: "pickNext" } }] })
  } else if (!kept.length) {
    // Noch nichts getestet – z. B. nur Durchgehendes auf der Liste: kein „Ergebnis“ behaupten, sondern einen Test anbieten
    push({ id: "nothing-to-test", mood: "think", prio: 3, title: t("Was willst du als Erstes testen?"),
      text: t("Dein Normal steht. Gerade ist nichts zum Einzeltest eingeplant – such dir eins aus, dann vergleiche ich es mit deinem Normal."),
      actions: [{ label: t("🔬 Supplement wählen"), action: { kind: "pickNext" }, primary: true }, { label: t("🧪 Experiment wählen"), action: { kind: "experiments" } }] })
  }
}

/** Ø Tages-Score der letzten n Check-ins (für kleine Anzeigen). */
export function recentMean(s: LabState, n = 3) {
  const cs = Object.values(s.checkins).sort((a, b) => a.date.localeCompare(b.date)).slice(-n)
  return cs.length ? cs.map(daySum).reduce((a, b) => a + b, 0) / cs.length : null
}

// ── Kosten-Coach: „Lohnt sich das?“ aus deinen eigenen Daten ───────────────────

export interface CostCoach { suppId: string; text: string; action?: { label: string; action: CoachAction } }

/**
 * Ein Satz für Heute → „Kosten & Kolbi-Coach“: verbindet Preis (Vorrat) mit deinem eigenen Testergebnis.
 * Mit Ergebnis/Urteil: „X kostet dich 9 €/Monat – dein Test zeigte kaum Unterschied. Weiter nehmen?“
 * Ohne: „Teste X, dann weißt du, ob sich die 9 €/Monat lohnen.“ Verschreibungspflichtiges (rx) wird nie
 * in Frage gestellt (nie zum Absetzen raten), Peptide ebenso nicht. Nichts Passendes → null.
 */
export function costCoach(s: LabState, today = todayIso()): CostCoach | null {
  const items = costSummary(s, today).items.filter(i => { const l = libOf(i.x); return !l?.rx && l?.category !== "Peptide" })
  if (!items.length) return null
  const wins = phaseWindows(s)
  const tested = (id: string) => wins.some(p => p.kind === "test" && p.suppId === id && p.end < today)
  const n = (id: string) => s.supps.find(x => x.id === id)?.name ?? ""
  // 1) Eigenes Ergebnis vorhanden → ehrlich gegen den Preis stellen
  for (const { x, cost } of items) {
    if (!tested(x.id) && !s.verdicts[x.id]) continue
    const sig = signal(s, x.id)
    const price = fmtEuro(cost)
    if (sig.key === "few" || sig.key === "none") continue
    if (sig.key === "flat" || sig.key === "neg")
      return { suppId: x.id, text: t("{name} kostet dich {price}/Monat – dein Test zeigte kaum Unterschied. Weiter nehmen?", { name: x.name, price }),
        action: { label: t("Neu entscheiden"), action: { kind: "openVerdict", suppId: x.id } } }
    if (sig.key === "tradeoff")
      return { suppId: x.id, text: t("{name} kostet dich {price}/Monat – bei dir ein Plus, aber mit Nebenwirkungen. Lohnt es sich für dich?", { name: x.name, price }),
        action: { label: t("Neu entscheiden"), action: { kind: "openVerdict", suppId: x.id } } }
    return { suppId: x.id, text: t("{name} kostet dich {price}/Monat – dein Test zeigte bei dir ein Plus (eigene Bewertung).", { name: x.name, price }) }
  }
  // 2) Läuft gerade der Test? → bald weißt du es
  const w = phaseAt(s, today)
  const running = w?.kind === "test" && w.suppId ? items.find(i => i.x.id === w.suppId) : undefined
  if (running) return { suppId: running.x.id, text: t("Dein Test zeigt bald, ob sich die {price}/Monat für {name} lohnen.", { name: running.x.name, price: fmtEuro(running.cost) }) }
  // 3) Teuerstes noch nicht getestetes, das sich im Kurztest überhaupt zeigen kann
  const cand = items.find(i => libOf(i.x)?.onset !== "langsam")
  if (!cand) return null
  const baseDone = wins.some(p => p.kind === "baseline" && p.end < today) || (!!w && w.kind !== "baseline")
  const canStart = baseDone && w?.kind !== "test"
  return { suppId: cand.x.id, text: t("Teste {name}, dann weißt du, ob sich die {price}/Monat lohnen.", { name: n(cand.x.id), price: fmtEuro(cand.cost) }),
    ...(canStart ? { action: { label: t("🔬 Test starten"), action: { kind: "startTest" as const, suppId: cand.x.id } } } : {}) }
}
