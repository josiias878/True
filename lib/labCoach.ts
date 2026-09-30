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
import { buyInfo, inUse, shopUrl, stockInfo } from "./labStock"
import { fmtGap, interactionChecks } from "./labInteractions"
import { dimLabel, findPatterns } from "./labPatterns"

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

const fmt = (n: number) => n.toFixed(1).replace(".", ",")
const name = (s: LabState, id?: string) => s.supps.find(x => x.id === id)?.name ?? "das Supplement"
const DECISION_LABEL: Record<Decision, string> = { keep: "💚 Behalten", maybe: "🤔 Vielleicht", drop: "✂️ Rausnehmen" }

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
    push({ id: "not-started", mood: "happy", prio: 10, title: `Morgen geht's los`,
      text: `Ab ${fmtDate(wins[0].start)} nimmst du ${wins[0].days} Tage lang nichts. Heute darfst du noch alles wie gewohnt nehmen.` })
    return out
  }

  // ── Starke Nebenwirkungen im laufenden Test
  if (w?.kind === "test" && w.suppId) {
    const strong = checkinsIn(s, w).flatMap(c => Object.entries(c.sides ?? {}).filter(([, v]) => v >= 2).map(([id]) => SIDE_BY_ID[id]?.label))
    if (strong.length) {
      push({ id: `strong-${w.id}`, mood: "alert", prio: 1, title: `Starke Nebenwirkung bei ${name(s, w.suppId)}`,
        text: `${[...new Set(strong)].join(", ")}. Wenn es dir damit nicht gut geht: brich den Test ab. Hält es an, lass es ärztlich abklären.`,
        actions: [{ label: "✋ Test abbrechen", action: { kind: "abort" }, primary: true }, { label: "Weiter testen", action: { kind: "dismiss" } }] })
    }
  }

  // ── Urteil fällig
  for (const p of wins.filter(x => x.kind === "test" && x.suppId && x.end < today && !s.verdicts[x.suppId])) {
    const sig = signal(s, p.suppId!)
    const sug = sig.suggestion ?? "maybe"
    const r = testResult(s, p.suppId!)
    const detail = r?.overall.base != null && r.overall.test != null ? ` Im Test ${fmt(r.overall.test)}★ statt ${fmt(r.overall.base)}★ im Reset.` : ""
    push({ id: `verdict-${p.id}`, mood: sug === "keep" ? "party" : "think", prio: 2, title: `${name(s, p.suppId)} ist fertig getestet`,
      text: `${sig.emoji} ${sig.text}.${detail} Mein Vorschlag: ${DECISION_LABEL[sug].slice(2).trim()}.`,
      actions: [{ label: `${DECISION_LABEL[sug]}`, action: { kind: "verdict", suppId: p.suppId!, decision: sug }, primary: true },
        { label: "Details ansehen", action: { kind: "openVerdict", suppId: p.suppId! } }] })
  }

  // ── Stack-Check beendet: Hat es gefehlt?
  if (!w && last?.kind === "check" && last.suppId) {
    const during = meanScore(checkinsIn(s, last))
    const before = wins.filter(x => x.kind === "stack" && x.end < last.start).pop()
    const beforeMean = before ? meanScore(checkinsIn(s, { start: addDays(last.start, -5), end: addDays(last.start, -1) })) : null
    const missing = during != null && beforeMean != null && during < beforeMean - 0.3
    push({ id: `resolve-${last.id}`, mood: "think", prio: 2, title: `Hat dir ${name(s, last.suppId)} gefehlt?`,
      text: during != null && beforeMean != null
        ? `Ohne ${name(s, last.suppId)}: Ø ${fmt(during)}★, davor ${fmt(beforeMean)}★. ${missing ? "Sieht so aus, als hätte es dir gutgetan." : "Kaum Unterschied, du brauchst es vermutlich nicht."}`
        : "Du hast es ein paar Tage weggelassen. Wie fühlt es sich an?",
      actions: [
        { label: "💚 Wieder rein", action: { kind: "resolveCheck", suppId: last.suppId, keep: true }, primary: missing },
        { label: "✂️ Bleibt draußen", action: { kind: "resolveCheck", suppId: last.suppId, keep: false }, primary: !missing },
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
      title: many ? `${reclassify.length} Supplements brauchen keinen Test` : `${first.name} braucht keinen Test`,
      text: `${reclassify.map(x => x.name).join(", ")} wirk${many ? "en" : "t"} erst über Wochen — ein kurzer Test bringt da wenig. Mein Vorschlag: einfach durchgehend nehmen, kein Test nötig.`,
      actions: many ? [
        { label: "📌 Alle durchgehend", action: { kind: "konstantAll", suppIds: reclassify.map(x => x.id) }, primary: true },
        { label: "☑️ Selbst auswählen", action: { kind: "reclassifyPick", suppIds: reclassify.map(x => x.id) } },
        { label: "🔬 Alle testen", action: { kind: "keepTesting", suppIds: reclassify.map(x => x.id) } },
      ] : [
        { label: `📌 ${first.name} durchgehend`, action: { kind: "konstant", suppId: first.id }, primary: true },
        { label: "🔬 Doch testen", action: { kind: "keepTesting", suppIds: [first.id] } },
      ] })
  }

  // ── Einkaufsliste & Vorrat
  for (const x of s.supps) {
    const shop = shopUrl(x)
    if (x.away) {
      const since = diffDays(x.away, today)
      if (since < 3) continue
      push({ id: `away-${x.id}-${x.away}`, mood: "think", prio: 4, title: `📦 Ist ${x.name} schon da?`,
        text: `Steht seit ${since} Tagen auf deiner Einkaufsliste. Sobald es da ist, plane ich es ein – vorher zählt es nirgends mit.`,
        actions: [
          { label: "✓ Ja, ist da", action: { kind: "arrived", suppId: x.id }, primary: true },
          ...(shop ? [{ label: "🛒 Bestellen", action: { kind: "shop" as const, suppId: x.id } }] : []),
          { label: "Noch nicht", action: { kind: "stillAway", suppId: x.id } },
        ] })
      continue
    }
    const info = stockInfo(s, x)
    if (!info || !x.stock || !inUse(s, x, today)) continue
    if (x.stock.ordered) {
      if (diffDays(x.stock.ordered, today) < 2) continue
      push({ id: `restock-${x.id}-${x.stock.ordered}`, mood: "happy", prio: 4, title: `📦 Neue Packung ${x.name} da?`,
        text: "Dann tippe kurz – ich fülle den Vorrat auf und rechne neu.",
        actions: [{ label: "✓ Ja, aufgefüllt", action: { kind: "refill", suppId: x.id }, primary: true }, { label: "Noch nicht", action: { kind: "dismiss" } }] })
    } else if (info.empty) {
      push({ id: `empty-${x.id}-${x.stock.at}`, mood: "alert", prio: 4, title: `${x.name} müsste leer sein`,
        text: "Laut meiner Rechnung ist die Packung aufgebraucht. Stimmt das?",
        actions: [
          { label: "🛒 Ja, leer", action: { kind: "setAway", suppId: x.id }, primary: true },
          { label: "Noch was da", action: { kind: "stock", suppId: x.id } },
        ] })
    } else if (info.low) {
      const alt = buyInfo(x).alt
      push({ id: `low-${x.id}-${x.stock.at}`, mood: "think", prio: 5, title: `🛒 ${x.name} reicht noch ${info.days} ${info.days === 1 ? "Tag" : "Tage"}`,
        text: `Zeit nachzubestellen, damit keine Lücke entsteht.${alt ? ` 💡 ${alt}` : ""}`,
        actions: [
          { label: "📦 Hab bestellt", action: { kind: "ordered", suppId: x.id }, primary: true },
          ...(shop ? [{ label: "🛒 Nachkaufen", action: { kind: "shop" as const, suppId: x.id } }] : []),
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
      push({ id: tipId, mood: "think", prio: 3, title: `${label} – liegt's an ${name(s, id)}?`, text: c.text,
        actions: [
          ...(c.add && addName && !has ? [{ label: `🛒 ${addName} vormerken`, action: { kind: "addSupp" as const, libId: c.add, tipId } }] : []),
          { label: "👍 Gut zu wissen", action: { kind: "gotIt", tipId }, primary: !c.add || has },
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
        { label: `🛒 ${LIB_BY_ID[p.with].name} vormerken`, action: { kind: "addSupp", libId: p.with, tipId } },
        { label: "Nein danke", action: { kind: "gotIt", tipId } },
      ] })
    break
  }

  // ── Täglicher Check-in
  if (!s.checkins[today]) {
    push({ id: "checkin", mood: minutesNow > 20 * 60 ? "sleepy" : "happy", prio: minutesNow > 17 * 60 ? 3 : 7,
      title: "Wie war dein Tag?", text: "Ein Tipp auf ein Gesicht reicht. Je regelmäßiger, desto genauer wird meine Auswertung.",
      actions: [{ label: "📝 Jetzt einchecken", action: { kind: "checkin" }, primary: true }] })
  }

  // ── Einnahme fällig
  const took = s.took[today] ?? []
  for (const id of intakeOn(s, today)) {
    if (took.includes(id)) continue
    const at = suppMinutes(id, s)
    const nowRel = relMin(minutesNow, s.settings)
    if (nowRel >= at - 15) {
      push({ id: `take-${id}`, mood: "happy", prio: 4, title: `Zeit für ${name(s, id)}`,
        text: `Geplant um ${fromMin(at)} Uhr. Tipp zum Abhaken, die Uhrzeit speichere ich automatisch.`,
        actions: [{ label: "✓ Genommen", action: { kind: "take", suppId: id }, primary: true }] })
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
    push({ id: tipId, mood: "alert", prio: 3, title: `⚠️ ${p.a.name} & ${p.b.name} zu nah beieinander`,
      text: `Nur ${fmtGap(p.gap)} Abstand. ${p.rule.text} Mein Vorschlag: ${moved.name} um ${p.fix.time} Uhr.`,
      actions: [
        { label: `⏰ ${moved.name} → ${p.fix.time}`, action: { kind: "setTime", suppId: moved.id, time: p.fix.time, tipId }, primary: true },
        { label: "Passt so", action: { kind: "gotIt", tipId } },
      ] })
    break
  }

  // ── Muster-Detektor: etwas Neues entdeckt?
  const fresh = findPatterns(s).find(p => !seen.has(`pattern:${p.id}`))
  if (fresh) {
    const tipId = `pattern:${fresh.id}`
    const d = fresh.delta
    push({ id: tipId, mood: d > 0 ? "party" : "think", prio: 6, title: `🔎 Ich hab was entdeckt`,
      text: `${fresh.emoji} ${fresh.title}: ${dimLabel(fresh.dim)} ${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1).replace(".", ",")}★ im Schnitt.`,
      actions: [{ label: "👀 Ansehen", action: { kind: "seePattern", tipId }, primary: true }] })
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
    push({ id: tipId, mood: "think", prio: 4, title: `⏰ ${x.name} lieber um ${fromMin(rounded)} Uhr?`,
      text: `${r.count > 1 ? `Du nimmst es meist um ${fromMin(r.avg)} Uhr` : `Du hast es um ${fromMin(r.avg)} Uhr genommen`}, geplant war ${fromMin(planned)} Uhr. Soll ich dich ab jetzt um ${fromMin(rounded)} Uhr erinnern?${farFromIdeal ? ` 💡 Kleiner Hinweis: ${lib!.timing}` : ""}`,
      actions: [
        { label: `✓ Ja, ${fromMin(rounded)} Uhr`, action: { kind: "setTime", suppId: x.id, time: fromMin(rounded), tipId }, primary: true },
        { label: `Nein, ${suppTime(x.id, s)} passt`, action: { kind: "gotIt", tipId } },
      ] })
    break
  }

  // ── Erinnerungen
  if (!s.reminders.enabled) {
    push({ id: "reminders", mood: "happy", prio: 9, title: "Soll ich dich erinnern?",
      text: "Ich melde mich zur Einnahme-Zeit und abends zum Check-in. So bleibst du ohne Nachdenken dran.",
      actions: [{ label: "🔔 Ja, erinnere mich", action: { kind: "reminders" }, primary: true }] })
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
      s.supps.some(x => x.lib === "koffein") ? "Ohne Kaffee sind Kopfschmerzen in den ersten Tagen normal. Das legt sich." : "Tag 1 fühlt sich evtl. ungewohnt an. Bleib einfach bei deiner normalen Routine.",
      "Check-in möglichst immer zur gleichen Uhrzeit, am besten abends.",
      "Ehrlich bewerten: 😐 ist ein ganz normaler Tag, kein schlechter.",
      "Alkohol, wenig Schlaf oder Stress? Beim Check-in unter „Störfaktoren“ antippen, dann bleibt der Vergleich fair.",
      "Bleib bei deinem Alltag: gleiches Essen, gleicher Sport. So sehe ich später echte Unterschiede.",
    ]
    push({ id: `phase-${w.id}-${day}`, mood: "happy", prio: 5, title: left === 0 ? "Letzter Reset-Tag!" : `Reset-Phase · Tag ${day} von ${w.days}`,
      text: left === 0 ? `Morgen startet dein erster Test${next ? `: ${next.name}` : ""}. Heute noch nichts nehmen.` : `Heute nimmst du nichts. ${tips[Math.min(day - 1, tips.length - 1)]}` })
    return
  }

  if (w.kind === "washout") {
    push({ id: `phase-${w.id}`, mood: "sleepy", prio: 5, title: "Kurze Pause",
      text: `Damit ${name(s, w.suppId)} nicht in den nächsten Test reinwirkt, nimmst du ${left === 0 ? "heute" : `bis ${fmtDate(w.end)}`} nichts.${next ? ` Danach kommt ${next.name}.` : ""}`,
      actions: next ? [{ label: `Pause überspringen: ${next.name} starten`, action: { kind: "startTest", suppId: next.id } }] : undefined })
    return
  }

  if (w.kind === "test" && w.suppId) {
    const cs = checkinsIn(s, w)
    const mean = meanScore(cs)
    const lib = libOf(s.supps.find(x => x.id === w.suppId))
    if (cs.length >= 2 && mean != null && baseMean != null && mean < baseMean - 0.5) {
      push({ id: `worse-${w.id}-${cs.length}`, mood: "alert", prio: 2, title: "Dir geht's schlechter als im Reset",
        text: `Seit ${name(s, w.suppId)}: Ø ${fmt(mean)}★ statt ${fmt(baseMean)}★. Beobachte noch einen Tag. Bleibt es so, lass es weg.`,
        actions: [{ label: "✋ Jetzt abbrechen", action: { kind: "abort" } }] })
    } else if (cs.length >= 2 && mean != null && baseMean != null && mean > baseMean + 0.4) {
      push({ id: `better-${w.id}-${cs.length}`, mood: "party", prio: 6, title: "Sieht gut aus!",
        text: `Mit ${name(s, w.suppId)} liegst du bei Ø ${fmt(mean)}★, im Reset waren es ${fmt(baseMean)}★. Zieh den Test noch durch, dann ist das Ergebnis sicher.` })
    }
    const watch = lib?.watch.map(d => DIMS.find(x => x.id === d)?.label).filter(Boolean).join(", ")
    push({ id: `phase-${w.id}-${day}`, mood: "happy", prio: 5,
      title: left === 0 ? `Letzter Testtag: ${name(s, w.suppId)}` : `Test ${name(s, w.suppId)} · Tag ${day} von ${w.days}`,
      text: `${left === 0 ? "Morgen bekommst du dein Ergebnis. " : ""}Nur ${name(s, w.suppId)}, um ${suppTime(w.suppId, s)} Uhr.${watch ? ` Achte besonders auf: ${watch}.` : ""}${lib && lib.onset !== "schnell" ? ` ${ONSET_INFO[lib.onset].emoji} ${ONSET_INFO[lib.onset].label}.` : ""}` })
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
      push({ id: `fading-${w.id}-${cs.length}`, mood: "think", prio: 2, title: "Die Wirkung lässt nach",
        text: `Die letzten 3 Tage: Ø ${fmt(recentMean!)}★, zu Beginn des Stacks ${fmt(earlyMean ?? baseMean ?? 0)}★. Lass ${suspect.name} 3 Tage weg und beobachte, ob sich etwas ändert. Es kann auch an Schlaf, Stress oder Ernährung liegen.`,
        actions: [{ label: `👀 ${suspect.name} 3 Tage weglassen`, action: { kind: "check", suppId: suspect.id }, primary: true }] })
    } else {
      push({ id: `stack-${w.id}-${Math.floor(cs.length / 7)}`, mood: "party", prio: 6, title: `Dein Stack läuft · Tag ${diffDays(w.start, today) + 1}`,
        text: cs.length >= 3 && recentMean != null ? `Stabil bei Ø ${fmt(recentMean)}★. Ich passe auf und melde mich, wenn die Wirkung nachlässt.` : "Nimm deine behaltenen Supplements wie geplant. Ich beobachte, ob die Wirkung anhält." })
    }
    return
  }

  if (w.kind === "check" && w.suppId) {
    push({ id: `phase-${w.id}-${day}`, mood: "think", prio: 5, title: `Ohne ${name(s, w.suppId)} · Tag ${day} von ${w.days}`,
      text: "Achte darauf, ob dir etwas fehlt: Schlaf, Energie, Stimmung? Danach frage ich dich, ob es wieder rein soll." })
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
      push({ id: `slow-${next.id}`, mood: "think", prio: 3, title: `Als Nächstes: ${next.name}`,
        text: `${next.name} wirkt eher über Wochen. In ein paar Tagen merkst du davon wenig. Du kannst es trotzdem ${ONSET_INFO[lib.onset].days} Tage testen, oder es einfach durchgehend nehmen und per Blutbild prüfen.`,
        actions: [{ label: `🔬 ${ONSET_INFO[lib.onset].days} Tage testen`, action: { kind: "startTest", suppId: next.id }, primary: true },
          { label: "📌 Einfach durchgehend nehmen", action: { kind: "konstant", suppId: next.id } },
          { label: "Anderes wählen", action: { kind: "pickNext" } }] })
    } else if (lib) {
      push({ id: `next-${next.id}`, mood: "happy", prio: 3, title: `Bereit für den nächsten Test`,
        text: `Mein Vorschlag: ${next.name}. Ich empfehle ${ONSET_INFO[lib.onset].days} Tage, du kannst das beim Start noch anpassen.`,
        actions: [{ label: `🔬 ${next.name} starten`, action: { kind: "startTest", suppId: next.id }, primary: true }, { label: "Anderes wählen", action: { kind: "pickNext" } }] })
    } else {
      push({ id: `next-${next.id}`, mood: "think", prio: 3, title: `Bereit für den nächsten Test`,
        text: `${next.name} kenne ich nicht — ich kann dir keine Dauer empfehlen, das wäre Beratung. Du entscheidest beim Start selbst.`,
        actions: [{ label: `🔬 ${next.name} starten`, action: { kind: "startTest", suppId: next.id }, primary: true }, { label: "Anderes wählen", action: { kind: "pickNext" } }] })
    }
    return
  }
  const kept = s.supps.filter(x => s.verdicts[x.id]?.decision === "keep")
  if (kept.length && !wins.some(x => x.kind === "stack")) {
    push({ id: "stack-ready", mood: "party", prio: 3, title: "Alles getestet! 🎉",
      text: `${kept.length} Supplement${kept.length > 1 ? "s haben" : " hat"} überzeugt. Ab jetzt nimmst du ${kept.length > 1 ? "sie" : "es"} zusammen, und ich passe auf, ob die Wirkung anhält.`,
      actions: [{ label: "🏆 Stack starten", action: { kind: "startStack" }, primary: true }] })
  } else if (!kept.length) {
    push({ id: "nothing-kept", mood: "think", prio: 3, title: "Nichts hat klar überzeugt",
      text: "Das ist auch ein Ergebnis: Du sparst Geld und Pillen. Füge neue Supplements hinzu oder teste „Vielleicht“-Kandidaten nochmal.",
      actions: [{ label: "➕ Supplement hinzufügen", action: { kind: "pickNext" }, primary: true }] })
  }
}

/** Ø Tages-Score der letzten n Check-ins (für kleine Anzeigen). */
export function recentMean(s: LabState, n = 3) {
  const cs = Object.values(s.checkins).sort((a, b) => a.date.localeCompare(b.date)).slice(-n)
  return cs.length ? cs.map(daySum).reduce((a, b) => a + b, 0) / cs.length : null
}
