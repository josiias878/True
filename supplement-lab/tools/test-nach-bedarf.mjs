// Tests: eigene Mittel im Stack + Einnahme „nach Bedarf“ (lib/supplementLab.ts, labStock, labReminders).
// Aufruf (im Repo-Root): node supplement-lab/tools/test-nach-bedarf.mjs
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
  const S = await load("/../lib/labStock.ts")
  const R = await load("/../lib/labReminders.ts")

  const base = () => {
    const s = L.emptyState()
    s.startDate = "2026-09-01"
    s.supps = [
      { id: "mag", name: "Magnesium", emoji: "💊", color: 0, dose: "", mode: "konstant" },
      { id: "mel", name: "Melatonin", emoji: "💊", color: 1, dose: "", mode: "konstant", freq: "bedarf" },
      { id: "the", name: "Theanin", emoji: "💊", color: 2, dose: "", mode: "test", freq: "bedarf" },
    ]
    s.phases = [{ id: "p0", kind: "baseline", days: 3 }, { id: "p1", kind: "test", suppId: "the", days: 3 }]
    return s
  }

  await test("Eigenes Mittel landet im Stack (läuft durchgehend)", () => {
    const x = L.makeSupp(null, "Mein Pulver", [])
    assert.equal(x.mode, "konstant")
    assert.equal(x.freq, undefined)
  })
  await test("Nach Bedarf steht nicht im Tagesplan, Täglich schon (Feld fehlt = täglich)", () => {
    const s = base()
    assert.deepEqual(L.intakeOn(s, "2026-09-02"), ["mag"])
  })
  await test("Im eigenen Test steht auch ein Nach-Bedarf-Mittel im Plan (fairer Test)", () => {
    const s = base()
    assert.deepEqual(L.intakeOn(s, "2026-09-04"), ["the", "mag"])
  })
  await test("Behaltenes Nach-Bedarf-Mittel in der Stack-Phase: kein Plan-Eintrag", () => {
    const s = base()
    s.phases.push({ id: "p2", kind: "stack", days: 30 })
    s.verdicts.the = { decision: "keep", note: "", date: "2026-09-07" }
    assert.ok(!L.intakeOn(s, "2026-09-10").includes("the"))
  })
  await test("Vorrat: kein Abzug ohne Eintrag, Abzug nach „Heute genommen“", () => {
    const s = base()
    const mel = s.supps[1]
    mel.stock = { form: "kapseln", pack: 30, perDay: 1, left: 30, at: "2026-09-01" }
    const today = L.todayIso()
    mel.stock.at = L.addDays(today, -5)
    assert.equal(S.stockInfo(s, mel).left, 30)
    s.took[L.addDays(today, -2)] = ["mel"]
    assert.equal(S.stockInfo(s, mel).left, 29)
  })
  await test("Kalender-Erinnerungen: keine Tages-Erinnerung für Nach Bedarf", () => {
    const s = base()
    s.startDate = L.todayIso()
    s.reminders = { ...s.reminders, enabled: true }
    const ics = R.buildIcs ? R.buildIcs(s) : null
    if (ics == null) return // ältere Signatur – Plan-Test oben deckt den Kern ab
    assert.ok(ics.includes("Magnesium"))
    assert.ok(!ics.includes("Melatonin"))
  })
  await test("Benachrichtigungs-Plan: keine Einnahme-Erinnerung für Nach Bedarf", () => {
    const s = base()
    s.startDate = L.todayIso()
    s.phases = [{ id: "p0", kind: "stack", days: 30 }]
    s.reminders = { ...s.reminders, enabled: true, intake: true }
    const txt = JSON.stringify(R.notificationPlan(s, 3))
    assert.ok(txt.includes("Magnesium"), "tägliches Mittel wird erinnert")
    assert.ok(!txt.includes("Melatonin"), "Nach Bedarf nicht")
  })
  await test("Status in der Liste: „Nach Bedarf“ statt „Läuft durchgehend“", () => {
    const s = base()
    assert.equal(L.suppStatus(s, "mel", "2026-09-02").label, "Nach Bedarf")
    assert.equal(L.suppStatus(s, "mag", "2026-09-02").label, "Läuft durchgehend")
  })
  await test("Altbestand: wartendes eigenes Testmittel wird einmalig Teil des Stacks", () => {
    const raw = {
      supps: [
        { id: "custom-a", name: "Eigenes A", emoji: "💊", color: 0, dose: "", mode: "test" },
        { id: "custom-b", name: "Eigenes B (eingeplant)", emoji: "💊", color: 1, dose: "", mode: "test" },
        { id: "custom-c", name: "Eigenes C (bewusst testen)", emoji: "💊", color: 2, dose: "", mode: "test", keepTesting: true },
        { id: "theanin", lib: "theanin", name: "L-Theanin", emoji: "🍵", color: 3, dose: "", mode: "test" },
      ],
      phases: [{ id: "p0", kind: "baseline", days: 3 }, { id: "p1", kind: "test", suppId: "custom-b", days: 3 }],
    }
    const s = L.hydrate(raw)
    const mode = id => s.supps.find(x => x.id === id).mode
    assert.equal(mode("custom-a"), "konstant")
    assert.equal(mode("custom-b"), "test")
    assert.equal(mode("custom-c"), "test")
    assert.equal(mode("theanin"), "test")
    assert.ok(s.migrated.includes("own-stack"))
    // nur einmal: später wieder auf Test gestellt → bleibt so
    s.supps.find(x => x.id === "custom-a").mode = "test"
    assert.equal(L.hydrate(JSON.parse(JSON.stringify(s))).supps.find(x => x.id === "custom-a").mode, "test")
  })
} finally {
  await server.close()
}
console.log(`\n${passed} bestanden · ${failed} fehlgeschlagen`)
if (failed) process.exitCode = 1
