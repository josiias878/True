// ── Schnellantwort lernt mit ──────────────────────────────────────────────────
// Tippt jemand „Okay“ (Gesicht 3) und bewertet danach „genauer“ (Sterne je Bereich), merkt sich der Check-in
// die Schnellantwort (CheckIn.face). Ab LEARN_MIN solchen Tagen mit derselben Schnellantwort füllt Kolbi die
// Sterne beim nächsten „Okay“ nach deinem persönlichen Muster vor (Mittel bleibt am Gesicht) – vorher wie bisher:
// alle = Gesicht.
//
// Auswertung: Vorgeschlagene Werte bleiben eine Schnellantwort (quick: true) und tragen est: true. Sie zählen
// genau wie bisherige Schnellantworten (1 Tag = 1 Tag, kein Zusatzgewicht) und werden nie selbst zu Lern-Daten –
// auch nicht nach „✓ Passt“ oder als nicht angetippte Bereiche nach „genauer“ (CheckIn.estDims).

import { type CheckIn, type Dim, type LabState, type Scores } from "./supplementLab"

/** Ab so vielen „genauer“-Bewertungen mit derselben Schnellantwort schlägt Kolbi Sterne vor. */
export const LEARN_MIN = 3

/** Lern-Beispiel: Schnellantwort gemerkt und danach „genauer“ bewertet (nicht geschätzt). Pro Bereich zählt nur, was selbst angetippt wurde (estDims). */
export function isLearnSample(c: CheckIn, face: number) {
  return c.face === face && !c.quick && !c.est
}

/** Selbst vergebener Stern eines Lern-Beispiels für einen Bereich (sonst undefined). */
function ownScore(c: CheckIn, d: Dim): number | undefined {
  const v = c.scores[d]
  return typeof v === "number" && v >= 1 && v <= 5 && !c.estDims?.includes(d) ? v : undefined
}

/**
 * Persönliche Sterne je Bereich für eine Schnellantwort. Gelernt wird nur die VERTEILUNG (welche Bereiche du bei
 * dieser Antwort höher/tiefer bewertest), das Mittel bleibt am Gesicht: Stern = Gesicht + (Ø Bereich − Ø aller gelernten
 * Bereiche), gerundet, 1–5. So verschiebt „Okay“ den Tageswert nicht Richtung „Gut“.
 * Pro Bereich nur mit ≥ min selbst getippten Werten, sonst (und ohne genug Beispiele) der bisherige Standard = Gesicht.
 */
export function suggestScores(s: Pick<LabState, "checkins">, face: number, dims: Dim[], min = LEARN_MIN): { scores: Scores; learned: boolean; n: number } {
  const samples = Object.values(s.checkins).filter(c => isLearnSample(c, face))
  const scores: Scores = {}
  for (const d of dims) scores[d] = face
  const avg: Partial<Record<Dim, number>> = {}
  if (samples.length >= min) for (const d of dims) {
    const vals = samples.map(c => ownScore(c, d)).filter((v): v is number => v != null)
    if (vals.length >= min) avg[d] = vals.reduce((a, b) => a + b, 0) / vals.length
  }
  const learnedDims = Object.keys(avg) as Dim[]
  // Erst ab 2 Bereichen gibt es eine Verteilung; mit einem bliebe er ohnehin beim Gesicht
  if (learnedDims.length < 2) return { scores, learned: false, n: samples.length }
  const mean = learnedDims.reduce((a, d) => a + avg[d]!, 0) / learnedDims.length
  for (const d of learnedDims) scores[d] = Math.min(5, Math.max(1, Math.round(face + avg[d]! - mean)))
  return { scores, learned: true, n: samples.length }
}
/** 1-Klick-Check-in aus einer Schnellantwort (Benachrichtigung, Gesicht ohne Sterne): gelernt vorbelegt, sonst alle = Gesicht. */
export function quickScores(s: Pick<LabState, "checkins">, face: number, dims: Dim[]): { scores: Scores; est: boolean } {
  const r = suggestScores(s, face, dims)
  return { scores: r.scores, est: r.learned }
}
