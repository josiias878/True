// ── Supplement Lab: Smarter Coach ─────────────────────────────────────────────
// Regelbasiert und offline: schaut auf Phase, Check-ins, Nebenwirkungen und Uhrzeiten
// und sagt dir, was als Nächstes dran ist — inkl. 1-Tipp-Aktion.

import {
  DIMS, LIB_BY_ID, ONSET_INFO, SLOTS, SIDE_BY_ID,
  phaseWindows, phaseAt, checkinsIn, nextCandidates, signal, testResult, intakeOn, slotFor, slotMinutes, slotTime,
  avgIntakeMinutes, meanScore, libOf, defaultMode, todayIso, addDays, diffDays, fmtDate, fromMin, toMin, daySum,
  type LabState, type Decision, type PhaseWindow,
} from "./supplementLab"

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
  | { kind: "take"; suppId: string }
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
    if (x.mode !== "test" || s.verdicts[x.id]) return false
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
      actions: [
        { label: many ? "📌 Alle auf „durchgehend“ setzen" : `📌 ${first.name} durchgehend nehmen`,
          action: many ? { kind: "konstantAll", suppIds: reclassify.map(x => x.id) } : { kind: "konstant", suppId: first.id }, primary: true },
        { label: "Doch einzeln testen", action: { kind: "dismiss" } },
      ] })
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
    const at = slotMinutes(slotFor(id, s), s.settings)
    const nowRel = minutesNow < toMin(s.settings.wake) ? minutesNow + 1440 : minutesNow
    if (nowRel >= at - 15) {
      push({ id: `take-${id}`, mood: "happy", prio: 4, title: `Zeit für ${name(s, id)}`,
        text: `Geplant um ${fromMin(at)} Uhr (${SLOTS.find(x => x.id === slotFor(id, s))?.label.toLowerCase()}). Tipp zum Abhaken, die Uhrzeit speichere ich automatisch.`,
        actions: [{ label: "✓ Genommen", action: { kind: "take", suppId: id }, primary: true }] })
    }
  }

  // ── Phasen-spezifisch
  if (w) phaseAdvice(s, w, today, baseMean, push)
  else idleAdvice(s, today, wins, push)

  // ── Einnahme-Uhrzeit (aus automatisch gespeicherten Zeiten)
  for (const x of s.supps) {
    const avg = avgIntakeMinutes(s, x.id)
    if (avg == null || !x.lib) continue
    const ideal = slotMinutes(slotFor(x.id, s), s.settings)
    const avgRel = avg < toMin(s.settings.wake) ? avg + 1440 : avg
    if (Math.abs(avgRel - ideal) >= 90) {
      push({ id: `time-${x.id}`, mood: "think", prio: 8, title: `Timing-Tipp: ${x.name}`,
        text: `Du nimmst es im Schnitt um ${fromMin(avg)} Uhr, ideal wäre ${fromMin(ideal)} Uhr. ${LIB_BY_ID[x.lib]?.timing ?? ""}` })
      break
    }
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
      text: `${left === 0 ? "Morgen bekommst du dein Ergebnis. " : ""}Nur ${name(s, w.suppId)}, um ${slotTime(slotFor(w.suppId, s), s.settings)} Uhr.${watch ? ` Achte besonders auf: ${watch}.` : ""}${lib && lib.onset !== "schnell" ? ` ${ONSET_INFO[lib.onset].emoji} ${ONSET_INFO[lib.onset].label}.` : ""}` })
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
