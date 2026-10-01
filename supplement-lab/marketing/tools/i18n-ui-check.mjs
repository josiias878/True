// Klickt die App in einer Sprache durch und meldet sichtbaren Text, der nach der anderen Sprache aussieht,
// plus fehlende Übersetzungen (Konsole). Aufruf: node i18n-ui-check.mjs <url> <outdir> [dark] [en|de]
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")
const [URL_, OUT = "raw", SCHEME = "dark", LANGX = "en"] = process.argv.slice(2)
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
await page.addInitScript(([s, sch, lx]) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("true-supplement-lab-v1", s); localStorage.setItem("true-lab-tab", "heute"); localStorage.setItem("lab-theme", sch); localStorage.setItem("lab-lang", lx); window.__LAB_I18N_DEBUG__ = true; sessionStorage.setItem("seeded", "1") } }, [JSON.stringify(state), SCHEME, LANGX])
const missing = new Set(); page.on("console", m => { const x = m.text(); if (x.startsWith("[i18n] fehlt:")) missing.add(x.slice(14)) })
await page.addInitScript(() => { window.__LAB_I18N_DEBUG__ = true })
await page.goto(URL_, { waitUntil: "networkidle" }); await page.clock.runFor(1500)
const real = ms => new Promise(r => setTimeout(r, ms))
const nice = async () => { for (let k = 0; k < 4; k++) { const b = page.getByRole("button", { name: /Nice!/ }); if (await b.count()) { await b.click(); await page.clock.runFor(300) } } }
const shot = async name => { await real(1300); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log("✓", name) }
const DE = /[äöüÄÖÜß]|\b(der|die|das|und|nicht|ist|du|dein|deine|mit|für|noch|heute|gestern|Tag|Tage|Tagen|Woche|ich|mich|wie|was|bei|auf|zum|zur|einen?|oder|schon|jetzt|nach|Einnahme|Abend|Ergebnis|bitte|alles|Uhr|Kapseln|Behalten|Vielleicht|Weiter|Schließen|Einstellungen|Erinnerung)\b/
const EN = /\b(the|and|your|you|with|today|week|day|days|keep|drop|next|close|settings)\b/i
const bad = new Map()
const scan = async label => {
  await real(700)
  const lines = (await page.evaluate(() => document.body.innerText)).split("\n").map(s => s.trim()).filter(Boolean)
  for (const l of lines) if (LANGX === "en" ? DE.test(l) : (EN.test(l) && !DE.test(l))) { if (!bad.has(l)) bad.set(l, label) }
  await shot(label)
}
const click = async (re, opts = {}) => { const b = page.getByRole("button", { name: re }).first(); if (await b.count()) { await b.click({ force: true, ...opts }); await page.clock.runFor(700); return true } return false }
const esc = async () => { await page.keyboard.press("Escape"); await page.clock.runFor(500) }
await nice()
await scan("today")
if (await click(/Let's go|Los geht/)) {
  for (let k = 0; k < 7; k++) {
    await scan("round-" + k)
    // Einnahme: großes Symbol antippen · Check-in: je Zeile das 4. Gesicht · sonst „Weiter“
    const face = page.locator("button[aria-label*='4']")
    if (await face.count() > 2) { for (let j = 0; j < await face.count(); j++) await face.nth(j).click({ force: true }).catch(() => {}); await page.clock.runFor(400) }
    else await page.mouse.click(215, 370)
    await page.clock.runFor(900)
    for (const re of [/Next|Weiter/, /Save|Speichern|Done|Fertig/]) { const b = page.getByRole("button", { name: re }).first(); if (await b.count()) { await b.click({ force: true }).catch(() => {}); await page.clock.runFor(700) } }
    await nice()
  }
  await page.mouse.click(398, 32); await page.clock.runFor(800); await nice()
}
for (const tab of [/^Supps$|^Meine$/, /Results|Ergebnisse/, /^Kolbi$/]) {
  await page.getByRole("button", { name: tab }).first().click({ force: true }); await page.clock.runFor(900); await scan("tab-" + tab.source.slice(0, 8))
}
await page.getByRole("button", { name: /Results|Ergebnisse/ }).first().click({ force: true }); await page.clock.runFor(600)
for (const seg of [/History|Verlauf/]) if (await click(seg)) await scan("results-history")
if (await click(/weekly recap|Wochenrückblick/i)) { for (let k = 0; k < 6; k++) { await scan("recap-" + k); await page.mouse.click(380, 500); await page.clock.runFor(400) } await page.mouse.click(397, 37); await page.clock.runFor(600) }
await page.getByRole("button", { name: /^Supps$|^Meine$/ }).first().click({ force: true }); await page.clock.runFor(700)
for (const seg of [/Experiments|Experimente/, /Stack/]) if (await click(seg)) await scan("mine-" + seg.source.slice(0, 6))
await page.getByRole("button", { name: /^Supps$|^Meine$/ }).first().click({ force: true }); await page.clock.runFor(500)
if (await click(/My supps|Meine$/)) await page.clock.runFor(300)
const row = page.locator("[role=button]").filter({ hasText: /Magnesium/ }).first()
if (await row.count()) { await row.click({ force: true }); await page.clock.runFor(800); await scan("supp-sheet"); await esc() }
if (await click(/Settings|Einstellungen/)) { await scan("settings"); await esc() }
await page.getByRole("button", { name: /^Kolbi$/ }).first().click({ force: true }); await page.clock.runFor(600)
if (await click(/Feedback/)) { await scan("feedback"); await esc() }
console.log(`\n── ${bad.size} verdächtige Zeilen (${LANGX === "en" ? "Deutsch in EN" : "Englisch in DE"}) ──`)
for (const [l, where] of bad) console.log(`[${where}] ${l.slice(0, 120)}`)
console.log(`\n── ${missing.size} fehlende Übersetzungen (Konsole) ──`)
for (const m of missing) console.log(m.slice(0, 140))
await browser.close()
