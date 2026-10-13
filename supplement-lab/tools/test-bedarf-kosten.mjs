// Tests: „Nach Bedarf“ – Kosten/Monat, Vorrat „reicht bis“, Nachkauf-Erinnerung und Muster „An Tagen mit X“
// (lib/labStock.ts, lib/labReminders.ts, lib/labPatterns.ts, lib/supplementLab.ts).
// Aufruf (im Repo-Root): node supplement-lab/tools/test-bedarf-kosten.mjs
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
  const P = await load("/../lib/labPatterns.ts")
  const today = L.todayIso()
  const ago = n => L.addDays(today, -n)
  const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`)

  // 60 Kapseln à 1 Stück, 18 € → täglich 9 €/Monat (bei 30,44 Tagen: 18/60*30.44)
  const DAILY = 18 / 60 * 30.44
  const base = (freqAt = ago(40)) => {
    const s = L.emptyState()
    s.startDate = ago(60)
    s.phases = [{ id: "p0", kind: "baseline", days: 3 }]
    s.supps = [
      { id: "mag", name: "Magnesium", emoji: "💊", color: 0, dose: "", mode: "konstant",
        stock: { form: "kapseln", pack: 60, perDay: 1, left: 60, at: today, price: 18 } },
      { id: "mel", name: "Melatonin", emoji: "🌙", color: 1, dose: "", mode: "konstant", freq: "bedarf", freqAt,
        stock: { form: "kapseln", pack: 60, perDay: 1, left: 60, at: today, price: 18 } },
    ]
    return s
  }
  const takeOn = (s, days) => { for (const n of days) s.took[ago(n)] = [...(s.took[ago(n)] ?? []), "mel"] }

  await test("Täglich: Kosten unverändert (eine Einnahme pro Tag)", () => {
    const s = base()
    near(S.monthlyCost(s.supps[0], s, today), DAILY)
    near(S.monthlyCost(s.supps[0]), DAILY) // ohne Zustand wie bisher
  })
  await test("Nach Bedarf: 7 Einnahmetage in 28 Tagen → ¼ der Tageskosten", () => {
    const s = base()
    takeOn(s, [1, 4, 8, 12, 16, 20, 27])
    const r = S.needRate(s, s.supps[1], today)
    assert.equal(r.uses, 7)
    assert.equal(r.days, 27) // heute ohne Eintrag zählt nicht mit
    near(S.monthlyCost(s.supps[1], s, today), DAILY * 7 / 27)
    const c = S.costSummary(s, today)
    near(c.total, DAILY + DAILY * 7 / 27)
    assert.equal(c.items.find(i => i.x.id === "mel").need, true)
    assert.equal(c.pending.length, 0)
  })
  await test("Heute eingetragen zählt mit (Fenster bis heute)", () => {
    const s = base()
    takeOn(s, [0, 5, 10, 15])
    const r = S.needRate(s, s.supps[1], today)
    assert.equal(r.uses, 4)
    assert.equal(r.days, 28)
  })
  await test("Zu wenige Einträge (<3): kein Betrag, „pending“, nicht „Preis fehlt“", () => {
    const s = base()
    takeOn(s, [2, 9])
    assert.equal(S.needRate(s, s.supps[1], today).perDay, null)
    assert.equal(S.monthlyCost(s.supps[1], s, today), null)
    const c = S.costSummary(s, today)
    assert.deepEqual(c.pending.map(x => x.id), ["mel"])
    assert.ok(!c.missing.some(x => x.id === "mel"))
    near(c.total, DAILY)
  })
  await test("Erst seit <7 Tagen auf Nach Bedarf: noch zu wenig Daten (auch bei vielen Einträgen)", () => {
    const s = base(ago(4))
    takeOn(s, [0, 1, 2, 3, 4, 5, 6, 10]) // Tage vor der Umstellung zählen nicht
    const r = S.needRate(s, s.supps[1], today)
    assert.equal(r.uses, 5)
    assert.equal(r.perDay, null)
    assert.equal(S.monthlyCost(s.supps[1], s, today), null)
  })
  await test("Ab 7 Tagen seit Umstellung: Rückblick nur ab freqAt", () => {
    const s = base(ago(9))
    takeOn(s, [1, 3, 6, 15, 20])
    const r = S.needRate(s, s.supps[1], today)
    assert.equal(r.uses, 3)
    assert.equal(r.days, 9) // ago(9) … gestern
    near(r.perDay, 3 / 9)
  })
  await test("Vorrat: Reichweite nach Tempo, Datum + knapp-Logik", () => {
    const s = base()
    const mel = s.supps[1]
    mel.stock = { ...mel.stock, left: 12, at: ago(30) }
    takeOn(s, [1, 4, 8, 12, 16, 20, 27]) // 7 Tage → 5 übrig
    const info = S.stockInfo(s, mel, today)
    assert.equal(info.uses, 5)
    assert.equal(info.days, Math.floor(5 / (7 / 27)))
    assert.equal(info.until, L.addDays(today, info.days))
    assert.equal(info.low, false)
    assert.ok(info.need && info.need.perDay > 0)
  })
  await test("Vorrat bei zu wenig Daten: kein „reicht bis“, nicht knapp, keine Nachkauf-Erinnerung", () => {
    const s = base(ago(3))
    const mel = s.supps[1]
    mel.stock = { ...mel.stock, left: 4, at: ago(10) }
    takeOn(s, [1])
    const info = S.stockInfo(s, mel, today)
    assert.equal(info.uses, 3)
    assert.equal(info.until, null)
    assert.equal(info.low, false)
    assert.equal(S.needPending(info), true)
    assert.ok(!S.shoppingList(s, today).low.some(x => x.id === "mel"))
    const plan = R.notificationPlan(s, 10, new Date(`${today}T06:00:00`))
    assert.ok(!plan.some(n => n.kind === "stock" && n.key.startsWith("stock-mel")), "keine Nachkauf-Erinnerung")
  })
  await test("Täglicher Vorrat knapp: Erinnerung wie bisher; Bedarf mit Tempo und wenig Rest: auch knapp", () => {
    const s = base()
    s.supps[0].stock = { ...s.supps[0].stock, left: 3, at: today }
    const mel = s.supps[1]
    mel.stock = { ...mel.stock, left: 2, at: today }
    takeOn(s, [1, 2, 3, 5, 6, 8, 9, 10, 12, 14]) // fast jeden 2. Tag → 2 Einnahmen ≈ 5 Tage
    assert.equal(S.stockInfo(s, s.supps[0], today).low, true)
    const info = S.stockInfo(s, mel, today)
    assert.equal(info.low, true)
    assert.ok(info.days <= 7)
    assert.ok(S.shoppingList(s, today).low.some(x => x.id === "mel"))
  })
  await test("Im eigenen Test: täglich gerechnet (steht im Plan)", () => {
    const s = base()
    s.supps[1].mode = "test"
    s.phases = [{ id: "p0", kind: "baseline", days: 3 }, { id: "p1", kind: "test", suppId: "mel", days: 120 }]
    s.startDate = ago(10)
    assert.ok(L.intakeOn(s, today).includes("mel"))
    assert.equal(S.needRate(s, s.supps[1], today), null)
    near(S.monthlyCost(s.supps[1], s, today), DAILY)
  })
  await test("Extra-Einnahme desselben Mittels zählt als Einnahmetag", () => {
    const s = base()
    s.extra = { [ago(2)]: [{ supp: "mel", name: "Melatonin" }], [ago(5)]: [{ supp: "mel", name: "Melatonin" }] }
    takeOn(s, [9])
    assert.equal(S.needRate(s, s.supps[1], today).uses, 3)
  })
  await test("Gespart (weggelassen): Bedarf-Tempo zum Urteil, zu wenig Daten → nicht mitgezählt", () => {
    const s = base()
    s.verdicts.mel = { decision: "drop", note: "", date: ago(1) }
    assert.equal(S.costSummary(s, today).saved.length, 0)
    takeOn(s, [3, 7, 11, 20])
    const c = S.costSummary(s, today)
    near(c.savedMonthly, DAILY * 4 / 27)
  })
  await test("withFreq: Umstellungstag gemerkt, bleibt beim erneuten Setzen, weg bei täglich", () => {
    const x = { id: "a", freq: undefined }
    const b = L.withFreq(x, "bedarf", "2026-10-01")
    assert.equal(b.freq, "bedarf"); assert.equal(b.freqAt, "2026-10-01")
    assert.equal(L.withFreq(b, "bedarf", "2026-10-09").freqAt, "2026-10-01")
    const d = L.withFreq(b, "taeglich", "2026-10-09")
    assert.equal(d.freq, undefined); assert.equal(d.freqAt, undefined)
  })
  await test("Altstand ohne freqAt lädt weiter, freqAt = heute (ehrlich: erst zu wenig Daten)", () => {
    const s = base()
    delete s.supps[1].freqAt
    const h = L.hydrate(JSON.parse(JSON.stringify(s)))
    assert.equal(h.supps[1].freq, "bedarf")
    assert.equal(h.supps[1].freqAt, today)
    assert.equal(h.supps[0].freqAt, undefined)
    const ok = L.hydrate(JSON.parse(JSON.stringify(base(ago(20)))))
    assert.equal(ok.supps[1].freqAt, ago(20))
  })

  // ── Muster „An Tagen mit X / ohne X“ ──
  const withCheckins = (good, bad) => {
    const s = base()
    for (let n = 1; n <= 14; n++) {
      const d = ago(n)
      const took = good.includes(n)
      s.checkins[d] = { date: d, scores: { energie: took ? 4 : 2, fokus: 3 }, tags: [], note: "" }
      if (took) takeOn(s, [n])
    }
    return s
  }
  await test("Muster: An Tagen mit / ohne Nach-Bedarf-Mittel (genug Tage, klarer Unterschied)", () => {
    const s = withCheckins([1, 3, 5, 7, 9], [])
    const p = P.findPatterns(s).find(q => q.id === "need:mel")
    assert.ok(p, "Muster gefunden")
    assert.equal(p.kind, "need")
    assert.equal(p.labelWith, "mit"); assert.equal(p.labelWithout, "ohne")
    assert.equal(p.n, 5)
    assert.ok(p.delta > 0)
    assert.match(p.title, /Melatonin/)
  })
  await test("Muster: unter Mindestmenge (2 Tage mit) → kein Muster", () => {
    const s = withCheckins([1, 3], [])
    assert.ok(!P.findPatterns(s).some(q => q.id === "need:mel"))
  })
  await test("Muster: tägliches Mittel bekommt kein mit/ohne-Muster; Extra-Muster nicht doppelt", () => {
    const s = withCheckins([1, 3, 5, 7, 9], [])
    s.extra = { [ago(2)]: [{ supp: "mel", name: "Melatonin" }], [ago(4)]: [{ supp: "mel", name: "Melatonin" }], [ago(6)]: [{ supp: "mel", name: "Melatonin" }] }
    const ps = P.findPatterns(s)
    assert.ok(!ps.some(q => q.id === "need:mag"))
    assert.ok(!ps.some(q => q.id === "extra:mel"))
  })
} finally {
  await server.close()
}
console.log(`\n${passed} ok, ${failed} fehlgeschlagen`)
process.exit(failed ? 1 : 0)
