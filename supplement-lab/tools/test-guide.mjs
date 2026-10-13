// Tests: „Kolbi führt dich“ (lib/labGuide.ts) – Status, Später/Nicht für mich, Zeitleiste, sanfte Erinnerung (labReminders).
// Aufruf (im Repo-Root): node supplement-lab/tools/test-guide.mjs
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
  const G = await load("/../lib/labGuide.ts")
  const R = await load("/../lib/labReminders.ts")
  const today = L.todayIso()
  const noon = (d = today) => new Date(`${d}T13:00:00`)

  /** Neuer Nutzer: heute gestartet, 3 Tage Reset, 2 Bibliotheks-Supplements ohne Menge/Vorrat */
  const fresh = (start = today) => {
    const s = L.emptyState()
    s.startDate = start
    s.supps = [L.makeSupp(L.LIB_BY_ID.magnesium, "Magnesium", []), L.makeSupp(L.LIB_BY_ID.theanin, "L-Theanin", [])]
    s.supps[1].color = 1
    s.supps.forEach(x => { x.dose = ""; x.mode = "test" })
    s.phases = [{ id: "baseline", kind: "baseline", start, days: 3 }]
    s.reminders = { enabled: true, checkin: "22:00", intake: true }
    return s
  }
  const ctx = (o = {}) => ({ push: "off", social: true, recapReady: false, checkinLocked: false, now: noon(), prefs: {}, ...o })
  const st = (steps, id) => steps.find(x => x.id === id)?.status

  await test("Neuer Nutzer Tag 0: Check-in zuerst, nichts erledigt, alle Einstiegs-Schritte da", () => {
    const steps = G.guideSteps(fresh(), today, ctx())
    assert.deepEqual(steps.map(x => x.id), ["checkin", "push", "scan", "portion", "stock", "price", "morning", "test", "recap", "group"])
    assert.equal(G.nextGuideStep(steps).id, "checkin")
    assert.deepEqual(G.guideProgress(steps), { done: 0, total: 10 })
    assert.equal(st(steps, "test"), "waiting") // Reset läuft
    assert.match(steps.find(x => x.id === "test").wait, /1/)
    // Check-in groß oben → Karte zeigt den nächsten
    assert.equal(G.nextGuideStep(steps, ["checkin"]).id, "push")
  })

  await test("Status folgt dem Zustand: Check-in, Push, Menge, Vorrat, Preis", () => {
    const s = fresh()
    s.checkins[today] = { date: today, scores: { energie: 3 }, tags: [], note: "" }
    let steps = G.guideSteps(s, today, ctx({ push: "on" }))
    assert.equal(st(steps, "checkin"), "done")
    assert.equal(st(steps, "push"), "done")
    assert.equal(G.nextGuideStep(steps).id, "scan")
    assert.deepEqual(steps.find(x => x.id === "portion").action, { kind: "portion", suppId: "magnesium" })
    s.supps.forEach(x => { x.portion = { n: 1, u: "stk" } })
    s.supps[0].stock = { form: "kapseln", pack: 60, perDay: 1, left: 60, at: today }
    steps = G.guideSteps(s, today, ctx({ push: "on" }))
    assert.equal(st(steps, "portion"), "done")
    assert.equal(st(steps, "stock"), "done")
    // Preis: zuerst beim Supplement mit Vorrat → direkt zum Preis
    assert.deepEqual(steps.find(x => x.id === "price").action, { kind: "price", suppId: "magnesium" })
    s.supps[0].stock.price = 15
    steps = G.guideSteps(s, today, ctx({ push: "on" }))
    assert.equal(st(steps, "price"), "done")
  })

  await test("Push nicht möglich/gesperrt → kein Schritt (keine Endlosschleife); Demo: kein Push, keine Gruppe", () => {
    assert.equal(st(G.guideSteps(fresh(), today, ctx({ push: "na" })), "push"), undefined)
    const d = fresh(); d.demo = true
    const steps = G.guideSteps(d, today, ctx())
    assert.equal(st(steps, "push"), undefined)
    assert.equal(st(steps, "group"), undefined)
  })

  await test("Check-in gesperrt (nicht Starttag) → wartet mit Uhrzeit", () => {
    const s = fresh(L.addDays(today, -1))
    const x = G.guideSteps(s, today, ctx({ checkinLocked: true, checkinAt: "16:00" })).find(q => q.id === "checkin")
    assert.equal(x.status, "waiting")
    assert.match(x.wait, /16:00/)
  })

  await test("Nach dem Reset: Test-Schritt offen mit Vorschlag; gestartet → erledigt", () => {
    const s = fresh(L.addDays(today, -3))
    let steps = G.guideSteps(s, today, ctx())
    const x = steps.find(q => q.id === "test")
    assert.equal(x.status, "open")
    assert.equal(x.action.kind, "test")
    L.startTest(s, x.action.suppId, today, 5)
    steps = G.guideSteps(s, today, ctx())
    assert.equal(st(steps, "test"), "done")
  })

  await test("Später: bis morgen weg, dann wieder da; 3× Später = Nicht für mich (zählt nicht mehr mit)", () => {
    const s = fresh()
    let p = G.snoozeStep({}, "scan", today)
    assert.equal(st(G.guideSteps(s, today, ctx({ prefs: p })), "scan"), "later")
    assert.equal(st(G.guideSteps(s, L.addDays(today, 1), ctx({ prefs: p })), "scan"), "open")
    p = G.snoozeStep(p, "scan", today)
    p = G.snoozeStep(p, "scan", today)
    const steps = G.guideSteps(s, L.addDays(today, 5), ctx({ prefs: p }))
    assert.equal(st(steps, "scan"), "never")
    assert.equal(G.guideProgress(steps).total, 9)
  })

  await test("Nicht für mich + Merker im Speicher (localStorage), Zurücksetzen behält Merker", () => {
    store.clear()
    G.neverGuide("group")
    G.markGuide("scan", today)
    let p = G.loadGuide()
    assert.deepEqual(p.never, ["group"])
    assert.equal(p.flags.scan, today)
    const steps = G.guideSteps(fresh(), today, ctx({ prefs: p }))
    assert.equal(st(steps, "group"), "never")
    assert.equal(st(steps, "scan"), "done")
    G.resetGuide()
    p = G.loadGuide()
    assert.equal(p.never, undefined)
    assert.equal(p.flags.scan, today)
    store.clear()
  })

  await test("Bestandsnutzer: alles erledigt → kein nächster Schritt, nichts wartet", () => {
    const s = fresh(L.addDays(today, -20))
    s.checkins[today] = { date: today, scores: { energie: 3 }, tags: [], note: "" }
    s.morning = { [today]: { schlaf: 4 } }
    s.recapSeen = L.addDays(today, -3)
    s.supps.forEach(x => { x.portion = { n: 1, u: "stk" }; x.stock = { form: "kapseln", pack: 60, perDay: 1, left: 60, at: today, price: 12 } })
    L.startTest(s, "magnesium", L.addDays(today, -10), 5)
    const steps = G.guideSteps(s, today, ctx({ push: "on", prefs: { flags: { scan: today, group: today } } }))
    assert.equal(G.nextGuideStep(steps), null)
    assert.equal(G.waitingGuideStep(steps), null)
    const pr = G.guideProgress(steps)
    assert.equal(pr.done, pr.total)
  })

  await test("Zeitleiste Tag 0: Start → Tag 3 Normal → Test (Vorschlag) → erstes Ergebnis – aus Plan-Daten", () => {
    const s = fresh()
    const tl = G.guideTimeline(s, today)
    const keys = tl.map(m => m.key)
    assert.deepEqual(keys, ["start", "normal", "t-next", "r-next"])
    assert.equal(tl[1].day, 3)
    assert.equal(tl[2].day, 4)
    const days = L.defaultDays(L.nextCandidates(s)[0])
    assert.equal(tl[3].day, 4 + days)
    assert.ok(tl[2].est && tl[3].est)
    assert.equal(tl[0].state, "now") // Starttag = heute
  })

  await test("Zeitleiste mit laufendem Test: echtes Ende statt Schätzung, „Heute“ einsortiert", () => {
    const s = fresh(L.addDays(today, -5))
    L.startTest(s, "theanin", L.addDays(today, -2), 7)
    const tl = G.guideTimeline(s, today)
    assert.ok(!tl.some(m => m.est))
    const r = tl.find(m => m.key.startsWith("r-"))
    assert.equal(r.date, L.addDays(today, 5))
    assert.ok(tl.some(m => m.key === "today" && m.state === "now"))
  })

  // ── Sanfte Erinnerung ──
  await test("Erinnerung: höchstens 1 pro Tag, nur Tag 1–7 nach dem Start", () => {
    const s = fresh(today)
    s.checkins[today] = { date: today, scores: { energie: 3 }, tags: [], note: "" }
    const ns = R.notificationPlan(s, 10, new Date(`${today}T00:01:00`), {}).filter(n => n.key.startsWith("guide-"))
    assert.ok(ns.length >= 1)
    const dates = ns.map(n => n.key.slice(6))
    assert.equal(new Set(dates).size, dates.length) // je Tag höchstens eine
    for (const d of dates) {
      const k = L.diffDays(s.startDate, d)
      assert.ok(k >= 1 && k <= G.NUDGE_DAYS, `Tag ${k}`)
    }
  })

  await test("Erinnerung: neutraler Push-Text ohne Supplement-Namen, Abstand ≥ 60 Min. zu anderen Nachrichten", () => {
    const s = fresh(today)
    const plan = R.notificationPlan(s, 8, new Date(`${today}T00:01:00`), {})
    const ns = plan.filter(n => n.key.startsWith("guide-"))
    assert.ok(ns.length)
    for (const n of ns) {
      for (const x of s.supps) {
        assert.ok(!n.generic.title.includes(x.name) && !n.generic.body.includes(x.name), "Name im Push")
        assert.ok(!n.title.includes(x.name) && !n.body.includes(x.name), "Name lokal")
      }
      const others = plan.filter(o => o !== n && o.at.toDateString() === n.at.toDateString())
      for (const o of others) assert.ok(Math.abs(+o.at - +n.at) > 60 * 60_000, `zu nah an ${o.key}`)
    }
  })

  await test("Erinnerung: keine bei Demo, ohne Benachrichtigungen, bei Später/Nicht für mich oder wenn alles erledigt", () => {
    const d = fresh(today); d.demo = true
    assert.equal(R.notificationPlan(d, 8, new Date(`${today}T00:01:00`), {}).filter(n => n.key.startsWith("guide-")).length, 0)
    const off = fresh(today); off.reminders.enabled = false
    assert.equal(R.notificationPlan(off, 8, new Date(`${today}T00:01:00`), {}).length, 0)
    // Alle erinnerbaren Schritte erledigt bzw. abgelehnt → keine
    const s = fresh(today)
    const prefs = { never: ["scan", "portion", "stock", "price", "test"] }
    assert.equal(R.notificationPlan(s, 8, new Date(`${today}T00:01:00`), prefs).filter(n => n.key.startsWith("guide-")).length, 0)
    // Später gilt bis morgen: morgen keine, übermorgen wieder (für denselben oder nächsten Schritt)
    const later = { later: { scan: L.addDays(today, 3), portion: L.addDays(today, 3), stock: L.addDays(today, 3), price: L.addDays(today, 3) } }
    const ns = R.notificationPlan(s, 8, new Date(`${today}T00:01:00`), later).filter(n => n.key.startsWith("guide-")).map(n => n.key.slice(6))
    assert.ok(!ns.includes(L.addDays(today, 1)) && !ns.includes(L.addDays(today, 2)))
  })

  await test("Erinnerung: Bestandsnutzer (Start vor > 7 Tagen) bekommt keine", () => {
    const s = fresh(L.addDays(today, -30))
    assert.equal(R.notificationPlan(s, 8, new Date(`${today}T00:01:00`), {}).filter(n => n.key.startsWith("guide-")).length, 0)
  })
} finally {
  await server.close()
}
console.log(`\n${passed} bestanden · ${failed} fehlgeschlagen`)
if (failed) process.exitCode = 1
