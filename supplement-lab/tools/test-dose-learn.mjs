// Tests: Menge pro Einnahme (lib/labDose.ts) + gelernte Schnellantwort (lib/labLearn.ts) + Vorrat + Migration.
// Aufruf (im Repo-Root): node supplement-lab/tools/test-dose-learn.mjs
import assert from "node:assert/strict"
import { createServer } from "vite"

const server = await createServer({ configFile: new URL("../vite.config.ts", import.meta.url).pathname, server: { middlewareMode: true }, appType: "custom", logLevel: "error" })
const load = p => server.ssrLoadModule(p)
let failed = 0, passed = 0
const test = async (name, fn) => {
  try { await fn(); passed++; console.log(`✓ ${name}`) } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.message}`) }
}

try {
  const L = await load("/../lib/supplementLab.ts")
  const D = await load("/../lib/labDose.ts")
  const N = await load("/../lib/labLearn.ts")
  const S = await load("/../lib/labStock.ts")
  const R = await load("/../lib/labReminders.ts")
  const today = L.todayIso()
  const supp = (o = {}) => ({ id: "vitd", name: "Vitamin D3", emoji: "☀️", dose: "", lib: "vitd", color: 0, mode: "konstant", ...o })
  const state = (o = {}) => ({ ...L.emptyState(), startDate: L.addDays(today, -30), ...o })

  // ── Menge ──
  await test("parsePortion versteht übliche Angaben, Bereiche nicht", () => {
    assert.deepEqual(D.parsePortion("2000 IE"), { n: 2000, u: "IE" })
    assert.deepEqual(D.parsePortion("2.000 IE"), { n: 2000, u: "IE" })
    assert.deepEqual(D.parsePortion("1 Kapsel"), { n: 1, u: "stk" })
    assert.deepEqual(D.parsePortion("2 caps"), { n: 2, u: "stk" })
    assert.deepEqual(D.parsePortion("50 µg"), { n: 50, u: "µg" })
    assert.deepEqual(D.parsePortion("3,5 g"), { n: 3.5, u: "g" })
    assert.equal(D.parsePortion("3–5 g"), null)
    assert.equal(D.parsePortion("laut Packung"), null)
    assert.equal(D.parsePortion(""), null)
  })
  await test("defaultPortion: eigene Wahl > Vorrat > Dosis-Text > nichts", () => {
    assert.equal(D.defaultPortion(supp()), null)
    assert.deepEqual(D.defaultPortion(supp({ dose: "1000 IE" })), { n: 1000, u: "IE" })
    const stock = { form: "kapseln", pack: 60, perDay: 2, left: 60, at: today }
    assert.deepEqual(D.defaultPortion(supp({ dose: "1000 IE", stock })), { n: 2, u: "stk" })
    assert.deepEqual(D.defaultPortion(supp({ dose: "1000 IE", stock, portion: { n: 2000, u: "IE" } })), { n: 2000, u: "IE" })
  })
  await test("portionChoices: 3–4 neutrale Chips, Dosis-Text zuerst", () => {
    const a = D.portionChoices(supp())
    assert.ok(a.length >= 3 && a.length <= 4)
    assert.equal(a[0].u, "tropfen") // Vitamin D: Form Tropfen
    const b = D.portionChoices(supp({ lib: "magnesium", id: "mg", dose: "2 Kapseln" }))
    assert.deepEqual(b[0], { n: 2, u: "stk" })
    assert.equal(new Set(b.map(p => `${p.n}${p.u}`)).size, b.length)
  })
  await test("Abhaken speichert die Standard-Menge, Abweichung überschreibt, Abhaken weg = Menge weg", () => {
    const s = state({ supps: [supp({ portion: { n: 1, u: "stk" } })] })
    s.took[today] = ["vitd"]
    D.recordDefaultAmount(s, today, "vitd")
    assert.deepEqual(s.tookAmt[today].vitd, { n: 1, u: "stk" })
    D.setAmount(s, today, "vitd", D.scalePortion({ n: 1, u: "stk" }, 2))
    D.recordDefaultAmount(s, today, "vitd") // überschreibt nicht
    assert.deepEqual(D.amountOn(s, today, s.supps[0]), { n: 2, u: "stk" })
    L.setSkipped(s, today, "vitd", true)
    assert.equal(s.tookAmt[today]?.vitd, undefined)
  })
  await test("Ohne Standard-Menge wird nichts erfunden", () => {
    const s = state({ supps: [supp()] })
    s.took[today] = ["vitd"]
    D.recordDefaultAmount(s, today, "vitd")
    assert.equal(s.tookAmt?.[today]?.vitd, undefined)
    assert.equal(D.amountOn(s, today, s.supps[0]), null)
  })
  await test("setPortion setzt Standard + heutige Menge (nur wenn abgehakt)", () => {
    const s = state({ supps: [supp()] })
    D.setPortion(s, "vitd", { n: 5, u: "tropfen" }, today)
    assert.deepEqual(s.supps[0].portion, { n: 5, u: "tropfen" })
    assert.equal(s.tookAmt?.[today]?.vitd, undefined)
    s.took[today] = ["vitd"]
    D.setPortion(s, "vitd", { n: 2, u: "tropfen" }, today)
    assert.deepEqual(s.tookAmt[today].vitd, { n: 2, u: "tropfen" })
  })
  await test("Benachrichtigung „✓ Genommen“ speichert die Standard-Menge mit", () => {
    const s = state({ supps: [supp({ portion: { n: 2000, u: "IE" } })] })
    R.applyTaken(s, { date: today, ids: ["vitd"], at: "08:00" })
    assert.deepEqual(s.tookAmt[today].vitd, { n: 2000, u: "IE" })
  })
  await test("Vorrat sinkt nach tatsächlicher Menge (gleiche Einheit und per Verhältnis)", () => {
    const y = L.addDays(today, -1), y2 = L.addDays(today, -2), at = L.addDays(today, -3)
    const stock = { form: "kapseln", pack: 60, perDay: 1, left: 60, at }
    const s = state({ supps: [supp({ id: "mg", lib: "magnesium", stock })] })
    s.took[y2] = ["mg"]; s.took[y] = ["mg"]; s.took[today] = ["mg"]
    assert.equal(S.stockInfo(s, s.supps[0]).left, 57) // wie bisher: 1 je Tag
    D.setAmount(s, y, "mg", { n: 3, u: "stk" })
    assert.equal(S.stockInfo(s, s.supps[0]).left, 55)
    // Standard 2000 IE, Vorrat in Tropfen (1 Tropfen je Einnahme): 4000 IE = 2× → 2 Tropfen
    const drops = { form: "tropfen", pack: 10, perDay: 1, left: 10, at }
    const v = state({ supps: [supp({ stock: drops, portion: { n: 2000, u: "IE" } })] })
    v.took[y] = ["vitd"]
    D.setAmount(v, y, "vitd", { n: 4000, u: "IE" })
    assert.ok(Math.abs(S.stockInfo(v, v.supps[0]).left - (10 - 2 / S.DROPS_PER_ML)) < 1e-9)
  })

  // ── Lernen ──
  const dims = ["energie", "fokus", "stimmung"]
  const ci = (date, o) => ({ date, scores: {}, tags: [], note: "", ...o })
  await test("Unter 3 „genauer“-Bewertungen: Standard (alle = Gesicht), nicht geschätzt", () => {
    const s = state()
    s.checkins[L.addDays(today, -1)] = ci(L.addDays(today, -1), { face: 3, quick: false, scores: { energie: 4, fokus: 2, stimmung: 3 } })
    s.checkins[L.addDays(today, -2)] = ci(L.addDays(today, -2), { face: 3, quick: false, scores: { energie: 4, fokus: 2, stimmung: 3 } })
    const r = N.quickScores(s, 3, dims)
    assert.deepEqual(r.scores, { energie: 3, fokus: 3, stimmung: 3 })
    assert.equal(r.est, false)
  })
  await test("Ab 3: persönlicher Durchschnitt (gerundet), als geschätzt markiert", () => {
    const s = state()
    const vals = [[4, 2, 3], [5, 2, 3], [4, 3, 3]]
    vals.forEach(([e, f, m], k) => { const d = L.addDays(today, -1 - k); s.checkins[d] = ci(d, { face: 3, quick: false, scores: { energie: e, fokus: f, stimmung: m } }) })
    const r = N.quickScores(s, 3, dims)
    assert.deepEqual(r.scores, { energie: 4, fokus: 2, stimmung: 3 })
    assert.equal(r.est, true)
    // andere Schnellantwort: noch nichts gelernt
    assert.deepEqual(N.quickScores(s, 4, dims).scores, { energie: 4, fokus: 4, stimmung: 4 })
  })
  await test("Geschätzte und reine Schnellantworten zählen nie als Lern-Daten", () => {
    const s = state()
    for (let k = 0; k < 5; k++) { const d = L.addDays(today, -1 - k); s.checkins[d] = ci(d, { face: 2, quick: true, est: k % 2 === 0, scores: { energie: 5, fokus: 5, stimmung: 5 } }) }
    const r = N.suggestScores(s, 2, dims)
    assert.equal(r.n, 0)
    assert.deepEqual(r.scores, { energie: 2, fokus: 2, stimmung: 2 })
  })
  await test("Bereich mit zu wenig Beispielen bleibt beim Gesicht", () => {
    const s = state()
    for (let k = 0; k < 3; k++) { const d = L.addDays(today, -1 - k); s.checkins[d] = ci(d, { face: 4, quick: false, scores: k ? { energie: 2 } : { energie: 2, fokus: 5 } }) }
    assert.deepEqual(N.suggestScores(s, 4, dims).scores, { energie: 2, fokus: 4, stimmung: 4 })
  })
  await test("Auswertung: geschätzter Check-in zählt wie eine Schnellantwort (1 Tag, Ø der Sterne)", () => {
    const c = ci(today, { face: 3, quick: true, est: true, scores: { energie: 4, fokus: 2, stimmung: 3 } })
    assert.equal(L.daySum(c), 3)
    assert.equal(L.avgScores([c, ci(today, { scores: { energie: 2, fokus: 2, stimmung: 2 } })]).energie, 3)
  })

  // ── Migration ──
  await test("Alte Daten laden unverändert; kaputte neue Felder werden still verworfen", () => {
    const old = { v: 2, startDate: today, goals: [], supps: [supp()], phases: [], checkins: { [today]: ci(today, { quick: true, scores: { energie: 3 } }) }, verdicts: {}, slotOverrides: {}, took: { [today]: ["vitd"] }, tookAt: {}, settings: {}, reminders: {}, xp: 0, badges: [] }
    const s = L.hydrate(JSON.parse(JSON.stringify(old)))
    assert.equal(s.tookAmt, undefined)
    assert.equal(s.checkins[today].face, undefined)
    assert.deepEqual(s.took[today], ["vitd"])
    const bad = L.hydrate({ ...old, supps: [supp({ portion: { n: -1, u: "x" } })], tookAmt: { [today]: { vitd: { n: 2, u: "stk" }, x: { n: "a" } }, nope: {} },
      checkins: { [today]: ci(today, { quick: false, est: true, face: 9, scores: { energie: 3 } }) } })
    assert.equal(bad.supps[0].portion, undefined)
    assert.deepEqual(bad.tookAmt, { [today]: { vitd: { n: 2, u: "stk" } } })
    assert.equal(bad.checkins[today].est, undefined) // est nur zusammen mit quick
    assert.equal(bad.checkins[today].face, undefined)
  })
} finally {
  await server.close()
}
console.log(`\n${passed} bestanden · ${failed} fehlgeschlagen`)
if (failed) process.exitCode = 1
