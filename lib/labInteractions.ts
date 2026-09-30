// ── Supplement Lab: Wechselwirkungs-Check ─────────────────────────────────────
// Prüft Paare aus deinem Stack gegen Kolbis Regeln – inklusive echtem Uhrzeit-Abstand.

import {
  LIB_BY_ID, fromMin, intakeOn, isHere, pairRule, relMin, suppMinutes, toMin, todayIso,
  type LabState, type MySupp, type PairRule,
} from "./supplementLab"

export const MIN_GAP = 120 // „trennen“: mind. 2 h Abstand

export interface PairCheck {
  a: MySupp
  b: MySupp
  rule: PairRule
  gap: number          // Minuten zwischen den geplanten Einnahmen
  ok: boolean          // trennen: genug Abstand · combo: zeitlich nah beieinander
  fix?: { suppId: string; time: string } // 1-Tipp-Lösung
}

const key = (x: MySupp) => x.lib ?? x.id

/** Supplements, die gerade (zusammen) genommen werden. */
function regular(s: LabState, today: string) {
  const plan = new Set(intakeOn(s, today))
  return s.supps.filter(x => isHere(x) && s.verdicts[x.id]?.decision !== "drop" && x.mode !== "pause"
    && (plan.has(x.id) || x.mode === "konstant" || s.verdicts[x.id]?.decision === "keep"))
}

export function interactionChecks(s: LabState, today = todayIso()): PairCheck[] {
  const list = regular(s, today)
  const wake = toMin(s.settings.wake)
  let bed = relMin(toMin(s.settings.bed), s.settings)
  if (bed <= wake) bed += 1440
  const out: PairCheck[] = []
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const rule = pairRule(key(list[i]), key(list[j]))
    if (!rule) continue
    // a = früher, b = später
    const [a, b] = suppMinutes(list[i].id, s) <= suppMinutes(list[j].id, s) ? [list[i], list[j]] : [list[j], list[i]]
    const ma = suppMinutes(a.id, s), mb = suppMinutes(b.id, s)
    const gap = mb - ma
    if (rule.kind === "trennen") {
      const ok = gap >= MIN_GAP
      let fix: PairCheck["fix"]
      if (!ok) {
        const later = ma + 150
        fix = later <= bed - 30 ? { suppId: b.id, time: fromMin(Math.round(later / 15) * 15) }
          : ma - 150 >= wake ? { suppId: a.id, time: fromMin(Math.round((mb - 150) / 15) * 15) } : undefined
      }
      out.push({ a, b, rule, gap, ok, fix })
    } else {
      const ok = gap <= 90
      out.push({ a, b, rule, gap, ok, fix: ok ? undefined : { suppId: b.id, time: fromMin(ma) } })
    }
  }
  // Probleme zuerst, dann Combos
  return out.sort((x, y) => Number(x.ok) - Number(y.ok) || (x.rule.kind === "trennen" ? -1 : 1))
}

/** Beim Hinzufügen: Was passt zu dem, was du schon nimmst – und was nicht? */
export function pairsWith(s: Pick<LabState, "supps">, libId: string): { other: MySupp; rule: PairRule }[] {
  return s.supps.filter(x => key(x) !== libId).map(other => ({ other, rule: pairRule(libId, key(other)) }))
    .filter((p): p is { other: MySupp; rule: PairRule } => !!p.rule && !!LIB_BY_ID[libId])
}

export function fmtGap(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}
