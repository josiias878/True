// ── Supplement Lab: Fertige Experimente ───────────────────────────────────────
// Vorlagen mit klarer Frage, Reihenfolge und Ziel – ein Tipp und Kolbi plant alles.

import { LIB_BY_ID, makeSupp, todayIso, type GoalId, type LabState, type SuppMode } from "./supplementLab"

export interface Experiment {
  id: string
  emoji: string
  title: string
  question: string
  goals: GoalId[]
  colors: [string, string]
  supps: { lib: string; mode: SuppMode }[]
  weeks: string
  note: string
}

export const EXPERIMENTS: Experiment[] = [
  { id: "schlaf", emoji: "😴", title: "Besser schlafen", question: "Was hilft MIR beim Einschlafen und Durchschlafen?", goals: ["schlaf"],
    colors: ["#6c5ce7", "#3987e5"], weeks: "ca. 3 Wochen", note: "Drei bewährte Kandidaten nacheinander – am Ende weißt du, welcher bei dir wirkt.",
    supps: [{ lib: "magnesium", mode: "test" }, { lib: "glycin", mode: "test" }, { lib: "theanin", mode: "test" }] },
  { id: "fokus", emoji: "🧠", title: "Klarer Kopf", question: "Was gibt mir Fokus ohne Nervosität?", goals: ["fokus", "energie"],
    colors: ["#3987e5", "#1baf9a"], weeks: "ca. 3 Wochen", note: "Vom sanften Theanin bis Citicolin – Koffein bleibt wie gewohnt.",
    supps: [{ lib: "theanin", mode: "test" }, { lib: "citicolin", mode: "test" }, { lib: "rhodiola", mode: "test" }] },
  { id: "stress", emoji: "😌", title: "Weniger Stress", question: "Was macht mich gelassener im Alltag?", goals: ["stress", "schlaf"],
    colors: ["#1baf7a", "#9ee6c5"], weeks: "ca. 3–4 Wochen", note: "Adaptogene brauchen etwas länger – Kolbi plant dafür mehr Tage ein.",
    supps: [{ lib: "theanin", mode: "test" }, { lib: "rhodiola", mode: "test" }, { lib: "ashwagandha", mode: "test" }] },
  { id: "training", emoji: "💪", title: "Mehr Power im Training", question: "Was bringt mir im Training wirklich etwas?", goals: ["muskel", "regeneration"],
    colors: ["#eb6834", "#eda100"], weeks: "ca. 2–3 Wochen", note: "Kreatin läuft durchgehend (wirkt über Wochen), Citrullin & Elektrolyte werden getestet.",
    supps: [{ lib: "kreatin", mode: "konstant" }, { lib: "citrullin", mode: "test" }, { lib: "elektrolyte", mode: "test" }] },
  { id: "basis", emoji: "🛡️", title: "Gute Basis", question: "Bin ich gut versorgt – ohne Rätselraten?", goals: ["immun", "longevity"],
    colors: ["#eda100", "#e87ba4"], weeks: "dauerhaft", note: "Kein Test nötig: läuft durchgehend. Sinnvoll: Vitamin D & Co. nach 8–12 Wochen per Blutbild prüfen.",
    supps: [{ lib: "vitd", mode: "konstant" }, { lib: "omega3", mode: "konstant" }, { lib: "magnesium", mode: "konstant" }] },
  { id: "darm", emoji: "🌿", title: "Ruhiger Bauch", question: "Was tut meiner Verdauung gut?", goals: ["darm"],
    colors: ["#1baf7a", "#3987e5"], weeks: "ca. 3 Wochen", note: "Flohsamen wird getestet, Probiotika laufen durchgehend mit.",
    supps: [{ lib: "flohsamen", mode: "test" }, { lib: "probiotika", mode: "konstant" }] },
]

export function availableExperiments() {
  return EXPERIMENTS.map(e => ({ ...e, supps: e.supps.filter(x => LIB_BY_ID[x.lib]) })).filter(e => e.supps.length)
}

/** Experiment übernehmen: fehlende Supplements anlegen (inkl. „noch nicht da“), Ziele + Reihenfolge setzen. */
export function startExperiment(p: LabState, e: Experiment, away: Set<string>): LabState {
  const today = todayIso()
  for (const it of e.supps) {
    const lib = LIB_BY_ID[it.lib]
    if (!lib) continue
    const existing = p.supps.find(x => (x.lib ?? x.id) === it.lib)
    if (existing) {
      if (!p.verdicts[existing.id]) existing.mode = it.mode
      if (away.has(it.lib) && !existing.away) existing.away = today
      if (!away.has(it.lib)) existing.away = undefined
      continue
    }
    const x = { ...makeSupp(lib, lib.name, p.supps), mode: it.mode }
    if (away.has(it.lib)) x.away = today
    p.supps.push(x)
  }
  p.goals = [...new Set([...e.goals, ...p.goals])]
  p.queue = e.supps.filter(x => x.mode === "test").map(x => p.supps.find(q => (q.lib ?? q.id) === x.lib)?.id).filter((x): x is string => !!x)
  p.experiment = e.id
  return p
}
