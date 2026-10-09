// Tests: „Neu bei Kolbi“ – Filter (Installationstag, Alter, Zukunft) + Gesehen-Status (lib/labNews.ts).
// Aufruf (im Repo-Root): node supplement-lab/tools/test-news.mjs
import assert from "node:assert/strict"
import { createServer } from "vite"

const server = await createServer({ configFile: new URL("../vite.config.ts", import.meta.url).pathname, server: { middlewareMode: true }, appType: "custom", logLevel: "error" })
const load = p => server.ssrLoadModule(p)
let failed = 0, passed = 0
const test = async (name, fn) => {
  try { await fn(); passed++; console.log(`✓ ${name}`) } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.message}`) }
}

// Mini-localStorage + window für markNewsSeen/seenNews
const store = new Map()
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }
let events = 0
globalThis.window = { addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => { events++; return true } }
globalThis.CustomEvent ??= class { constructor(type, o) { this.type = type; this.detail = o?.detail } }

try {
  const N = await load("/../lib/labNews.ts")
  const item = (id, date, o = {}) => ({ id, date, title: id, text: id, art: "scan", action: null, ...o })
  const list = [item("a", "2026-10-01"), item("b", "2026-10-09"), item("c", "2026-10-09"), item("future", "2026-12-01"), item("old", "2026-06-01")]

  await test("Daten der echten Neuheiten sind gültig und ids eindeutig", () => {
    const ids = N.LAB_NEWS.map(n => n.id)
    assert.equal(new Set(ids).size, ids.length)
    for (const n of N.LAB_NEWS) {
      assert.match(n.date, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(n.title && n.text, n.id)
      if (n.art === "video") assert.ok(n.video?.src.startsWith("https://") && n.video.poster.endsWith(".jpg"), "Video gestreamt + Poster")
      else assert.ok(n.action, `${n.id}: Ausprobieren braucht ein Ziel`)
    }
  })
  await test("vor dem Onboarding (kein Installationstag) → nichts", () => {
    assert.deepEqual(N.eligibleNews(list, null, "2026-10-09"), [])
    assert.equal(N.installDateOf({ startDate: null }), null)
  })
  await test("nur Neuheiten NACH dem Installationstag", () => {
    assert.deepEqual(N.eligibleNews(list, "2026-10-01", "2026-10-09").map(n => n.id), ["b", "c"])
    assert.deepEqual(N.eligibleNews(list, "2026-09-20", "2026-10-09").map(n => n.id), ["b", "c", "a"])
    // am Erscheinungstag installiert → war schon da, nicht „neu“
    assert.deepEqual(N.eligibleNews(list, "2026-10-09", "2026-10-09"), [])
  })
  await test("nichts aus der Zukunft, nichts Uraltes", () => {
    assert.deepEqual(N.eligibleNews(list, "2026-01-01", "2026-10-09").map(n => n.id), ["b", "c", "a"])
    assert.deepEqual(N.eligibleNews(list, "2026-01-01", "2026-12-01").map(n => n.id), ["future"])
    assert.deepEqual(N.eligibleNews(list, "2026-01-01", "2026-10-09", 5).map(n => n.id), ["b", "c"])
  })
  await test("Installationstag = frühester Eintrag (Start oder ältester Check-in/Haken)", () => {
    assert.equal(N.installDateOf({ startDate: "2026-10-05" }), "2026-10-05")
    assert.equal(N.installDateOf({ startDate: "2026-10-05", checkins: { "2026-10-02": {} }, took: { "2026-10-03": [] } }), "2026-10-02")
    assert.equal(N.installDateOf({ startDate: "2026-10-05", checkins: { kaputt: {} } }), "2026-10-05")
  })
  await test("Gesehen-Status: gemerkt, ohne Doppel, Ring-Liste schrumpft", () => {
    store.clear(); events = 0
    assert.deepEqual(N.seenNews(), [])
    assert.deepEqual(N.unseenNews(list, "2026-09-20", "2026-10-09", N.seenNews()).map(n => n.id), ["b", "c", "a"])
    N.markNewsSeen("b"); N.markNewsSeen("b")
    assert.deepEqual(N.seenNews(), ["b"])
    assert.equal(events, 1, "Ereignis nur bei echter Änderung")
    N.markNewsSeen("c"); N.markNewsSeen("a")
    assert.deepEqual(N.unseenNews(list, "2026-09-20", "2026-10-09", N.seenNews()), [])
  })
  await test("Demo-Modus (Beispiel-Daten) → nie Neuheiten", () => {
    const st = { startDate: "2026-09-20", checkins: {}, took: {} }
    assert.deepEqual(N.newsFor(st, "2026-10-09", [], list).map(n => n.id), ["b", "c", "a"])
    assert.deepEqual(N.newsFor({ ...st, demo: true }, "2026-10-09", [], list), [])
    assert.deepEqual(N.newsFor({ ...st, startDate: null }, "2026-10-09", [], list), [])
  })
  await test("Sprach-Karten: nur in ihrer Sprache (Video mit deutscher Schrift nicht in EN)", () => {
    const l2 = [item("de-only", "2026-10-09", { lang: "de" }), item("alle", "2026-10-09")]
    assert.deepEqual(N.eligibleNews(l2, "2026-10-01", "2026-10-09", 45, "de").map(n => n.id), ["de-only", "alle"])
    assert.deepEqual(N.eligibleNews(l2, "2026-10-01", "2026-10-09", 45, "en").map(n => n.id), ["alle"])
    assert.equal(N.LAB_NEWS.find(n => n.art === "video")?.lang, "de")
  })
  await test("kaputter oder fehlender Speicher → leer, kein Absturz", () => {
    store.set("lab-news-seen", "{kaputt")
    assert.deepEqual(N.seenNews(), [])
    store.set("lab-news-seen", JSON.stringify({ a: 1 }))
    assert.deepEqual(N.seenNews(), [])
    store.set("lab-news-seen", JSON.stringify(["x", 3, null]))
    assert.deepEqual(N.seenNews(), ["x"])
    const ls = globalThis.localStorage
    globalThis.localStorage = { getItem: () => { throw new Error("blocked") }, setItem: () => { throw new Error("blocked") } }
    assert.deepEqual(N.seenNews(), [])
    assert.doesNotThrow(() => N.markNewsSeen("z"))
    globalThis.localStorage = ls
  })
} finally {
  await server.close()
}
console.log(`\n${passed} bestanden · ${failed} fehlgeschlagen`)
if (failed) process.exitCode = 1
