// Tests: Beschwerde mit „anderem Grund“ – zählt nicht gegen ein Supplement, Tag gekennzeichnet (lib/supplementLab.ts, labDay, labPatterns).
// Aufruf (im Repo-Root): node supplement-lab/tools/test-other-reason.mjs
import assert from "node:assert/strict"
import { createServer } from "vite"

const server = await createServer({ configFile: new URL("../vite.config.ts", import.meta.url).pathname, server: { middlewareMode: true }, appType: "custom", logLevel: "error" })
const load = p => server.ssrLoadModule(p)
let failed = 0, passed = 0
const test = async (name, fn) => {
  try { await fn(); passed++; console.log(`✓ ${name}`) } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.stack}`) }
}
const store = new Map()
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }

try {
  const L = await load("/../lib/supplementLab.ts")
  const D = await load("/../lib/labDay.ts")
  const P = await load("/../lib/labPatterns.ts")

  // Reset 7 Tage ohne Beschwerden, dann Test „mag“ 7 Tage; an 3 Testtagen Kopfschmerzen
  const build = (suspect) => {
    const s = L.emptyState()
    s.startDate = "2026-09-01"
    s.supps = [{ id: "mag", name: "Magnesium", emoji: "💊", color: 0, dose: "", mode: "test" }]
    s.phases = [{ id: "p0", kind: "baseline", days: 7 }, { id: "p1", kind: "test", suppId: "mag", days: 7 }]
    for (let i = 0; i < 14; i++) {
      const date = L.addDays("2026-09-01", i)
      const c = { date, scores: { energie: 3, stimmung: 3 }, tags: [], note: "" }
      if (i >= 7 && i <= 9) { c.sides = { kopfschmerz: i === 9 ? 2 : 1 }; if (suspect) c.suspect = { kopfschmerz: suspect(i) } }
      s.checkins[date] = c
    }
    return s
  }

  await test("ohne Vermutung (alte Daten): Kopfschmerzen zählen wie bisher gegen das Mittel", () => {
    const r = L.testResult(build(null), "mag")
    assert.equal(r.sides.list[0].id, "kopfschmerz")
    assert.equal(r.sides.list[0].days, 3)
    assert.equal(r.sides.strongDays, 1)
    assert.equal(r.other.days, 0)
    assert.ok(!r.tags.some(([k]) => k === L.OTHER_TAG))
    assert.ok(L.signal(build(null), "mag").cost > 0)
  })
  await test("„weiß nicht“/Mittel vermutet: unverändert", () => {
    const r = L.testResult(build(() => "mag"), "mag")
    assert.equal(r.sides.list[0].days, 3)
  })
  await test("alle 3 mit anderem Grund: keine Nebenwirkung, kein Kosten-Abzug, Störfaktor-Kennzeichnung", () => {
    const s = build(i => i === 7 ? "o" : "o:wasser")
    const r = L.testResult(s, "mag")
    assert.equal(r.sides.list.length, 0)
    assert.equal(r.sides.strongDays, 0)
    assert.equal(r.sides.load, 0)
    assert.equal(L.signal(s, "mag").cost, 0)
    assert.equal(r.other.days, 3)
    assert.deepEqual(r.other.list, [{ id: "kopfschmerz", days: 3, reasons: ["o:wasser"] }])
    assert.deepEqual(r.tags.find(([k]) => k === L.OTHER_TAG), [L.OTHER_TAG, 3])
    // Sterne werden nicht herausgerechnet (wie Störfaktoren)
    assert.equal(r.n, 7)
  })
  await test("gemischt: nur die zugerechneten zählen", () => {
    const r = L.testResult(build(i => i === 9 ? "o:stress" : "mag"), "mag")
    assert.equal(r.sides.list[0].days, 2)
    assert.equal(r.sides.strongDays, 0)
    assert.equal(r.other.days, 1)
  })
  await test("Vermutungen-Übersicht: anderer Grund ist kein Mittel, eigene Zusammenfassung", () => {
    const s = build(i => i === 9 ? "o:stress" : "mag")
    const sum = D.suspectSummary(s)
    assert.deepEqual(sum.map(x => x.key), ["mag"])
    assert.equal(D.otherReasonSummary(s).days, 1)
    assert.equal(D.dayMarked(s, "2026-09-10"), true)
    assert.equal(D.dayMarked(s, "2026-09-08"), false)
  })
  await test("setDaySides/putCheckin behalten den Grund (Tages-Beschwerde vor dem Check-in)", () => {
    const s = build(null)
    D.setDaySides(s, "2026-09-20", { kopfschmerz: 1, uebelkeit: 1 }, { kopfschmerz: "o:bildschirm", uebelkeit: D.SUSPECT_UNKNOWN })
    assert.deepEqual(s.daySides["2026-09-20"].suspect, { kopfschmerz: "o:bildschirm" })
    D.putCheckin(s, { date: "2026-09-20", scores: { energie: 3 }, tags: [], note: "" })
    assert.deepEqual(s.checkins["2026-09-20"].suspect, { kopfschmerz: "o:bildschirm" })
    assert.deepEqual(L.ownSides(s.checkins["2026-09-20"]), { uebelkeit: 1 })
  })
  await test("Import/hydrate: alte Stände unverändert, unbekannte Gründe → „o“, Müll verworfen", () => {
    const raw = JSON.parse(JSON.stringify(build(i => i === 7 ? "o:quatsch" : i === 8 ? "mag" : "o:infekt")))
    raw.checkins["2026-09-09"].suspect.gibtsnicht = "mag"
    raw.checkins["2026-09-10"].suspect.kopfschmerz = 5
    raw.daySides = { "2026-09-30": { sides: { kopfschmerz: 2 }, suspect: { kopfschmerz: "o:xyz" } } }
    const s = L.hydrate(raw)
    assert.deepEqual(s.checkins["2026-09-08"].suspect, { kopfschmerz: "o" })
    assert.deepEqual(s.checkins["2026-09-09"].suspect, { kopfschmerz: "mag" })
    assert.equal(s.checkins["2026-09-10"].suspect, undefined)
    assert.deepEqual(s.daySides["2026-09-30"].suspect, { kopfschmerz: "o" })
    const old = L.hydrate(JSON.parse(JSON.stringify(build(null))))
    assert.equal(old.checkins["2026-09-08"].suspect, undefined)
    assert.deepEqual(old.checkins["2026-09-08"].sides, { kopfschmerz: 1 })
    // Rundreise Export → Import stabil
    assert.deepEqual(L.hydrate(JSON.parse(JSON.stringify(s))).checkins, s.checkins)
  })
  await test("Muster: Tage mit anderem Grund wie ein Störfaktor-Tag", () => {
    const s = build(null)
    for (let i = 0; i < 14; i++) {
      const c = s.checkins[L.addDays("2026-09-01", i)]
      if (i % 3 === 0) { c.sides = { kopfschmerz: 1 }; c.suspect = { kopfschmerz: "o:wasser" }; c.scores = { energie: 2, stimmung: 2 } }
      else { delete c.sides; delete c.suspect }
    }
    const p = P.findPatterns(s).find(x => x.id === "tag:other")
    assert.ok(p, "Muster gefunden")
    assert.equal(p.n, 5)
    assert.ok(p.delta < 0)
  })
} finally {
  await server.close()
}
console.log(`\n${passed} bestanden · ${failed} fehlgeschlagen`)
process.exit(failed ? 1 : 0)
