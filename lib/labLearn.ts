// ── Schnellantwort lernt mit ──────────────────────────────────────────────────
// Tippt jemand „Okay“ (Gesicht 3) und bewertet danach „genauer“ (Sterne je Bereich), merkt sich der Check-in
// die Schnellantwort (CheckIn.face). Ab LEARN_MIN solchen Tagen mit derselben Schnellantwort füllt Kolbi die
// Sterne beim nächsten „Okay“ mit dem persönlichen Durchschnitt (gerundet) vor – vorher wie bisher: alle = Gesicht.
//
// Auswertung: Vorgeschlagene Werte bleiben eine Schnellantwort (quick: true) und tragen est: true. Sie zählen
// genau wie bisherige Schnellantworten (1 Tag = 1 Tag, kein Zusatzgewicht) und werden nie selbst zu Lern-Daten.

import { type CheckIn, type Dim, type LabState, type Scores } from "./supplementLab"

/** Ab so vielen „genauer“-Bewertungen mit derselben Schnellantwort schlägt Kolbi Sterne vor. */
export const LEARN_MIN = 3

/** Lern-Beispiel: Schnellantwort gemerkt und die Sterne danach selbst vergeben (nicht geschätzt). */
export function isLearnSample(c: CheckIn, face: number) {
  return c.face === face && !c.quick && !c.est
}

/**
 * Persönliche Sterne je Bereich für eine Schnellantwort. Pro Bereich nur, wenn ≥ LEARN_MIN Beispiele ihn haben;
 * sonst (und ohne genug Beispiele) der bisherige Standard = Gesicht. learned = mind. ein Bereich kommt aus dem Gelernten.
 */
export function suggestScores(s: Pick<LabState, "checkins">, face: number, dims: Dim[], min = LEARN_MIN): { scores: Scores; learned: boolean; n: number } {
  const samples = Object.values(s.checkins).filter(c => isLearnSample(c, face))
  const scores: Scores = {}
  let learned = false
  for (const d of dims) {
    const vals = samples.map(c => c.scores[d]).filter((v): v is number => typeof v === "number" && v >= 1 && v <= 5)
    if (samples.length >= min && vals.length >= min) {
      const v = Math.min(5, Math.max(1, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)))
      scores[d] = v
      learned = true
    } else scores[d] = face
  }
  return { scores, learned, n: samples.length }
}

/** 1-Klick-Check-in aus einer Schnellantwort (Benachrichtigung, Gesicht ohne Sterne): gelernt vorbelegt, sonst alle = Gesicht. */
export function quickScores(s: Pick<LabState, "checkins">, face: number, dims: Dim[]): { scores: Scores; est: boolean } {
  const r = suggestScores(s, face, dims)
  return { scores: r.scores, est: r.learned }
}
