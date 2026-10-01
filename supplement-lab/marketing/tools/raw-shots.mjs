// Rohe App-Screenshots (iPhone 6,7"/6,9": 430×932 @3x) mit realistischen Beispieldaten.
// Aufruf: node raw-shots.mjs <url> <outdir> [dark|light] [de|en]
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")
const [URL_, OUT = "raw", SCHEME = "dark", LANGX = "de"] = process.argv.slice(2)
fs.mkdirSync(OUT, { recursive: true })
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
const base = new Date(2026, 9, 4, 21, 20) // Sonntagabend, Check-in offen
const ago = n => { const d = new Date(base); d.setDate(d.getDate() - n); return iso(d) }
const sup = (id, name, emoji, color, mode, extra = {}) => ({ id, name, emoji, dose: "", lib: id, color, mode, ...extra })
const checkins = {}, took = {}, tookAt = {}
let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
const clamp = v => Math.max(1, Math.min(5, Math.round(v)))
for (let k = 24; k >= 1; k--) {
  const d = ago(k), alk = k % 6 === 2, mag = k <= 15 && k >= 9
  checkins[d] = { date: d, at: "21:10", tags: alk ? ["Alkohol"] : k % 5 === 0 ? ["Training"] : [], note: "", sides: {},
    scores: { energie: clamp(3.3 + rnd() * 0.8), fokus: clamp(3.2 + rnd() * 0.8), stimmung: clamp(3.5 + rnd() * 0.6), ruhe: clamp((mag ? 4 : 3.2) + rnd() * 0.6), schlaf: clamp((alk ? 2.2 : mag ? 4.4 : 3.3) + rnd() * 0.5) } }
  if (k <= 21) { took[d] = ["kreatin", "vitd", ...(mag ? ["magnesium"] : []), ...(k <= 6 ? ["theanin", "magnesium"] : [])]; tookAt[d] = Object.fromEntries(took[d].map(id => [id, id === "magnesium" ? "22:05" : id === "theanin" ? "08:10" : "12:20"])) }
}
const state = {
  v: 2, startDate: ago(24), goals: ["schlaf", "fokus"],
  supps: [
    sup("magnesium", "Magnesium (Glycinat)", "🌙", 3, "test", { stock: { form: "kapseln", pack: 120, perDay: 2, left: 70, at: ago(6), price: 16.9 } }),
    sup("kreatin", "Kreatin", "🏋️", 0, "konstant", { time: "12:15", stock: { form: "pulver", pack: 500, perDay: 5, left: 140, at: ago(4), price: 24.9 } }),
    sup("vitd", "Vitamin D3 + K2", "🌞", 2, "konstant", { stock: { form: "tropfen", pack: 20, perDay: 2, left: 15, at: ago(4), price: 14.5 } }),
    sup("theanin", "L-Theanin", "🍵", 4, "test", { stock: { form: "kapseln", pack: 90, perDay: 1, left: 80, at: ago(6), price: 19.9 } }),
    sup("ashwagandha", "Ashwagandha", "🌿", 5, "test", { stock: { form: "kapseln", pack: 60, perDay: 1, left: 40, at: ago(17), price: 18 } }),
    sup("glycin", "Glycin", "💤", 1, "test", { away: ago(1) }),
  ],
  phases: [
    { id: "b", kind: "baseline", days: 5, start: ago(24) },
    { id: "t-ash", kind: "test", suppId: "ashwagandha", days: 3, start: ago(19) },
    { id: "w1", kind: "washout", days: 1, start: ago(16) },
    { id: "t-mag", kind: "test", suppId: "magnesium", days: 6, start: ago(15) },
    { id: "w2", kind: "washout", days: 2, start: ago(9) },
    { id: "t-the", kind: "test", suppId: "theanin", days: 6, start: ago(5) },
  ],
  checkins, verdicts: { ashwagandha: { decision: "drop", note: "", date: ago(16) }, magnesium: { decision: "keep", note: "", date: ago(9) } },
  slotOverrides: {}, took, tookAt, settings: { wake: "07:00", bed: "23:00", training: null, washoutDays: 2 },
  reminders: { enabled: true, checkin: "21:00", intake: true }, xp: 860,
  badges: ["first", "streak3", "streak7", "reminder", "reset", "verdict1", "verdict3", "drop", "stack", "baseline"], health: {}, healthEnabled: false,
  learned: ["magnesium:0", "magnesium:1", "kreatin:0", "general:1", "general:2", "theanin:0", "vitd:0"], community: true, recapSeen: "2026-09-27",
}
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, colorScheme: SCHEME, locale: LANGX === "en" ? "en-US" : "de-DE" })
const page = await ctx.newPage()
await page.clock.install({ time: base })
await page.route("**/functions/v1/**", r => r.fulfill({ json: { lib: "magnesium", n: 214, min: 5, keepPct: 61, maybePct: 22, avg: 0.38, quantiles: [-0.5, 0.0, 0.4, 0.8, 1.2], dims: { schlaf: 0.7, ruhe: 0.4, energie: 0.1 }, sides: {}, avgDays: 6, total: 1873, libs: { magnesium: { n: 214, keepPct: 61 } } } }))
await page.addInitScript(([s, sch, lx]) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("true-supplement-lab-v1", s); localStorage.setItem("true-lab-tab", "heute"); localStorage.setItem("lab-theme", sch); localStorage.setItem("lab-lang", lx); sessionStorage.setItem("seeded", "1") } }, [JSON.stringify(state), SCHEME, LANGX])
await page.goto(URL_, { waitUntil: "networkidle" }); await page.clock.runFor(1500)
const real = ms => new Promise(r => setTimeout(r, ms))
const nice = async () => { for (let k = 0; k < 4; k++) { const b = page.getByRole("button", { name: /Nice!/ }); if (await b.count()) { await b.click(); await page.clock.runFor(300) } } }
const shot = async name => { await real(1300); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log("✓", name) }
await nice(); await page.mouse.move(80, 200)
await shot("1-heute")
await page.evaluate(() => window.scrollTo(0, 620)); await shot("2-weg"); await page.evaluate(() => window.scrollTo(0, 0))
// Tagesrunde: Einnahme-Schritt, dann Check-in-Tabelle (halb ausgefüllt)
await page.getByRole("button", { name: /Los geht's|aufdecken|Let's go|Reveal result/ }).first().click(); await page.clock.runFor(1600)
await shot("3-runde")
for (let g = 0; g < 4; g++) { const take = page.getByRole("button", { name: / genommen$| taken$/ }); if (await take.count()) { await take.click(); await page.clock.runFor(900) } else break }
const s4 = page.getByRole("button", { name: /4 Sterne|4 stars/ }); const n4 = await s4.count()
for (let k = 0; k < Math.max(0, n4 - 3); k++) await s4.nth(k).click()
await shot("3b-checkin")
await page.getByRole("button", { name: /Runde schließen|Close round/ }).click(); await page.clock.runFor(600); await nice()
// Ergebnisse
await page.getByRole("button", { name: /^(Ergebnisse|Results)$/ }).click({ force: true }); await page.clock.runFor(900); await nice(); await shot("4-muster")
// Meine (Kosten)
await page.getByRole("button", { name: /^(Meine|Supps)$/ }).click({ force: true }); await page.clock.runFor(900); await nice(); await shot("5-kosten")
await page.locator("button", { hasText: "Magnesium" }).first().click(); await page.clock.runFor(900)
await page.getByText(/Was andere erlebt haben|What others/).first().evaluate(el => el.scrollIntoView({ block: "start" })); await page.evaluate(() => { const sc = [...document.querySelectorAll("div")].find(d => d.style.maxHeight === "92dvh"); sc?.scrollBy(0, -40) })
await shot("6-community")
await page.keyboard.press("Escape"); await page.clock.runFor(500)
await page.getByRole("button", { name: /🧪 Experimente|🧪 Experiments/ }).click(); await page.clock.runFor(900); await shot("7-experimente")
// Kolbi
await page.getByRole("button", { name: "Kolbi", exact: true }).click({ force: true }); await page.clock.runFor(900); await shot("8-kolbi")
// Wochenrückblick
await page.getByRole("button", { name: /^(Ergebnisse|Results)$/ }).click({ force: true }); await page.clock.runFor(700)
await page.getByRole("button", { name: /Wochenrückblick ansehen|See weekly recap/ }).click(); await page.clock.runFor(800)
await page.mouse.click(380, 500); await page.clock.runFor(300); await page.mouse.click(380, 500); await page.clock.runFor(300)
await shot("9-story")
await browser.close()
