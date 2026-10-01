// Lead-Magnet „Baseline-Tracker zum Ausdrucken“ (A4-PDF, DE + EN) + Vorschaubilder.
// Aufruf (im Ordner marketing): node tools/tracker.mjs
//   → content/tracker/*.pdf + *-p1/2.webp (Vorschau, Seite) + *-p1/2.png (2×, für Pins)
//   build-site.mjs kopiert PDF + WebP nach site/downloads/ (site/ wird dort jedes Mal neu angelegt).
// Regeln: keine Wirkversprechen, keine Krankheiten (legal/health-claims-check.md). Skala/Störfaktoren = wie in der App.
// QR-Codes (content/tracker/qr-*.svg) zeigen auf kolbi-smoky.vercel.app/qr bzw. /en/qr (Kanal „qr“ in Analytics).
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")

const OUT = "content/tracker"
export const TRACKER_FILES = { de: "supplement-selbsttest-vorlage", en: "supplement-self-test-tracker" }
const FONT = fs.readFileSync("brand/fonts/Nunito-latin.woff2").toString("base64")
let kid = 0
const kolbi = (name, mm) => fs.readFileSync(`brand/kolbi-${name}.svg`, "utf8")
  .replace(/_R_[0-9a-z]*_/g, `t${kid++}`)
  .replace(/width="512" height="512"/, `width="${mm}mm" height="${mm}mm"`)
  .replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true"')

const T = {
  de: {
    lang: "de", kicker: "Supplement-Selbsttest · Vorlage zum Ausdrucken",
    p1: "Dein Normal", p1days: "7 Tage", p1sub: "Erst mal <b>nichts Neues</b> starten. Jeden Abend eine Minute: pro Bereich eine Zahl ankreuzen – spontan, nicht grübeln.",
    p2: "Test:", p2days: "Tage", p2sub: "<b>Nur dieses eine</b> Supplement ist neu – alles andere wie in deinem Normal. Gleiche Uhrzeit, gleiche Menge (laut Packung).",
    fields1: ["Start (Datum)", "Was nimmst du schon länger? (bleibt gleich)"], fields2: ["Menge & Uhrzeit", "Start (Datum)"],
    scale: [["1", "mies"], ["2", "meh"], ["3", "okay"], ["4", "gut"], ["5", "top"]],
    day: "Tag", date: "Datum", areas: ["Schlaf", "Energie", "Fokus", "Stimmung", "Ruhe"], free: "Eigener Bereich", dis: "Störfaktoren",
    avg: "Ø Durchschnitt", avgHint: "Summe ÷ Tage",
    disLegend: "<b>Störfaktoren</b> kurz notieren, z. B.: wenig geschlafen · viel Stress · Alkohol · krank · Reise · Training · spät gegessen",
    more: "Länger? Seite nochmal drucken.",
    howH: "So geht's – in 4 Schritten",
    how: [["Normal festhalten", "Diese Seite: 5–7 Abende ohne Neues. Das ist dein Vergleichswert."], ["Eins nach dem anderen", "Seite 2: immer nur ein Supplement testen. Sonst weißt du nicht, was es war."], ["Abends bewerten", "Jeden Abend dieselben Bereiche + Störfaktoren. Eine Minute reicht."], ["Vergleichen", "Ø Test minus Ø Normal – unten auf Seite 2. Dann: behalten, vielleicht oder raus."]],
    cmpH: "So vergleichst du",
    cmpRows: ["Ø Normal (Seite 1)", "Ø Test (diese Seite)", "Unterschied (Test – Normal)"],
    cmp: [
      "<b>Durchschnitt:</b> alle Zahlen einer Spalte addieren und durch die Anzahl der Tage teilen. Tage mit starkem Störfaktor (krank, kaum Schlaf, Alkohol) behandelst du in beiden Phasen gleich – am einfachsten: weglassen.",
      "<b>Unter ca. 0,5:</b> Bei dir gerade vermutlich kein spürbarer Unterschied. <b>Ab ca. 0,5</b> (und ähnlichen Störfaktoren): ein Hinweis – mehr nicht.",
      "<b>Gegenprobe:</b> Danach ein paar Tage absetzen. Fällt der Wert zurück auf dein Normal, spricht das eher für einen Unterschied bei dir.",
    ],
    decide: "Meine Entscheidung:", keep: ["Behalten", "Vielleicht", "Raus"],
    footApp: "Kolbi macht das automatisch in der App", footSub: "Erinnert dich abends, rechnet die Durchschnitte und vergleicht mit deinem Normal. Kostenlos starten, ohne Konto.",
    fine: "Kein Medizinprodukt, keine Diagnose. Ein Selbstversuch zeigt, wie <i>du</i> dich fühlst – nicht, ob ein Supplement „wirkt“. Bei Beschwerden, Schwangerschaft, Stillzeit oder Medikamenten vorher ärztlich oder in der Apotheke beraten lassen.",
    page: "Seite", example: "Beispiel", exDis: "wenig geschlafen", exDate: "12.10.", blankDate: "___.___.",
  },
  en: {
    lang: "en", kicker: "Supplement self-test · printable tracker",
    p1: "Your normal", p1days: "7 days", p1sub: "Don't start <b>anything new</b> yet. One minute every evening: tick one number per area – go with your gut, don't overthink it.",
    p2: "Test:", p2days: "days", p2sub: "<b>Only this one</b> supplement is new – everything else as in your normal. Same time, same amount (as on the label).",
    fields1: ["Start (date)", "What do you already take? (stays the same)"], fields2: ["Amount & time", "Start (date)"],
    scale: [["1", "awful"], ["2", "meh"], ["3", "okay"], ["4", "good"], ["5", "great"]],
    day: "Day", date: "Date", areas: ["Sleep", "Energy", "Focus", "Mood", "Calm"], free: "Your own area", dis: "Disruptors",
    avg: "Ø Average", avgHint: "sum ÷ days",
    disLegend: "<b>Disruptors</b> – jot them down, e.g.: short on sleep · lots of stress · alcohol · sick · travel · workout · late meal",
    more: "Longer? Print this page again.",
    howH: "How it works – 4 steps",
    how: [["Track your normal", "This page: 5–7 evenings with nothing new. That's what you compare against."], ["One at a time", "Page 2: only ever test one supplement. Otherwise you won't know which one it was."], ["Rate every evening", "Same areas every evening + disruptors. One minute is enough."], ["Compare", "Test average minus normal average – bottom of page 2. Then: keep, maybe or drop."]],
    cmpH: "How to compare",
    cmpRows: ["Ø Normal (page 1)", "Ø Test (this page)", "Difference (test – normal)"],
    cmp: [
      "<b>Average:</b> add up all numbers in a column and divide by the number of days. Treat days with a big disruptor (sick, hardly slept, alcohol) the same way in both phases – easiest: leave them out.",
      "<b>Below about 0.5:</b> probably no noticeable difference for you right now. <b>From about 0.5</b> (with similar disruptors): a hint – nothing more.",
      "<b>Double-check:</b> stop it for a few days afterwards. If your rating drops back to your normal, that points more towards a real difference for you.",
    ],
    decide: "My decision:", keep: ["Keep", "Maybe", "Drop"],
    footApp: "Kolbi does this automatically in the app", footSub: "Reminds you every evening, works out the averages and compares with your normal. Start free, no account.",
    fine: "Not a medical device, no diagnosis. A self-test shows how <i>you</i> feel – not whether a supplement “works”. If you have health issues, are pregnant or breastfeeding or take medication, talk to a doctor or pharmacist first.",
    page: "Page", example: "Example", exDis: "short on sleep", exDate: "Oct 12", blankDate: "___ /___",
  },
}

const CSS = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${FONT}) format("woff2");font-weight:200 1000}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff}
body{font-family:Nunito,sans-serif;color:#14122b;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;padding:11mm 12mm 9mm;display:flex;flex-direction:column;position:relative;overflow:hidden;page-break-after:always;background:#fff}
.page:last-child{page-break-after:auto}
.head{display:flex;align-items:center;gap:4mm}
.head svg{flex-shrink:0;margin:-1.5mm -1mm -1.5mm -1.5mm}
.kick{font-size:8.5pt;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#7a70d6}
h1{font-size:25pt;font-weight:900;line-height:1.05;letter-spacing:-.01em}
h1 .days{font-size:13pt;font-weight:800;color:#7a70d6;margin-left:2mm}
h1 .blank{display:inline-block;width:72mm;border-bottom:.5mm solid #14122b;margin-left:2mm;height:8mm;vertical-align:bottom}
h1 .nblank{display:inline-block;width:12mm;border-bottom:.35mm solid #7a70d6;height:6mm;vertical-align:bottom;margin-left:2mm}
.sub{font-size:9.5pt;line-height:1.35;margin-top:2.2mm;color:#2c2a48}
.fields{display:flex;gap:6mm;margin-top:3mm}
.field{flex:1;font-size:7.5pt;font-weight:800;color:#6b6890;border-bottom:.3mm solid #b9b5d6;padding-bottom:4.5mm}
.field.w2{flex:2}
.scale{display:flex;gap:3.5mm;align-items:center;margin-top:3mm;font-size:8.5pt;font-weight:800;color:#2c2a48}
.scale .bx{display:inline-flex;align-items:center;justify-content:center;width:4mm;height:4mm;border:.3mm solid #8d88b8;border-radius:.8mm;font-size:6.5pt;margin-right:1mm;color:#6b6890}
table{width:100%;border-collapse:collapse;margin-top:3.5mm;table-layout:fixed}
th{font-size:8.5pt;font-weight:900;text-align:center;padding:1.6mm .5mm;border-bottom:.45mm solid #14122b;vertical-align:bottom}
th.l{text-align:left}
th small{display:block;font-size:6.5pt;font-weight:700;color:#6b6890}
th .free{display:block;border-bottom:.3mm solid #8d88b8;height:4.5mm;margin:0 1.5mm .6mm}
td{border-bottom:.25mm solid #cfcbe6;text-align:center;vertical-align:middle;padding:0 .4mm}
td.l{text-align:left;font-size:8.5pt;font-weight:900}
td.l{line-height:1.1}
td.l small{display:block;font-size:6pt;font-weight:700;color:#8d88b8;margin-top:.3mm}
tr.ex td{color:#8d88b8}
.bxs i.x{background:#e9e6f8;color:#14122b;border-color:#14122b;position:relative}
.bxs i.x::after{content:"";position:absolute;inset:-.4mm;background:linear-gradient(45deg,transparent 46%,#14122b 46%,#14122b 54%,transparent 54%),linear-gradient(-45deg,transparent 46%,#14122b 46%,#14122b 54%,transparent 54%)}
td.exn{font-size:7pt;font-style:italic;color:#6b6890;text-align:left;padding-left:2mm}
.big{font-size:12pt}
td.dis{border-left:.25mm solid #cfcbe6}
td.sep,th.sep{border-left:.25mm solid #e4e1f3}
.bxs{display:inline-flex;gap:.55mm}
.bxs i{display:inline-flex;align-items:center;justify-content:center;width:3.35mm;height:3.35mm;border:.25mm solid #a6a1cc;border-radius:.7mm;font-style:normal;font-size:5.6pt;font-weight:800;color:#a6a1cc}
tr.avg td{border-top:.45mm solid #14122b;border-bottom:none;background:#f6f5fd}
tr.avg td.l{color:#14122b}
.avgbox{display:inline-block;width:12mm;height:6.3mm;border:.3mm solid #8d88b8;border-radius:1.2mm;background:#fff;vertical-align:middle}
.legend{font-size:7.5pt;color:#4a4768;margin-top:2mm;line-height:1.35}
.legend.r{text-align:right;color:#7a70d6;font-weight:800}
.box{border:.3mm solid #cfcbe6;border-radius:3mm;padding:3.2mm 4mm;margin-top:3.5mm}
.box h2{font-size:11.5pt;font-weight:900;margin-bottom:2mm}
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}
.step b{display:flex;align-items:center;gap:1.5mm;font-size:8.8pt;font-weight:900}
.step b span{display:inline-flex;align-items:center;justify-content:center;width:5mm;height:5mm;border-radius:50%;border:.35mm solid #7a70d6;color:#7a70d6;font-size:7.5pt;flex-shrink:0}
.step p{font-size:8.2pt;line-height:1.35;margin-top:1mm;color:#2c2a48}
.cmpt{margin-top:0}
.cmpt td{height:6.6mm}
.cmpt td.l{font-size:7.8pt}
.cmpl{font-size:7.7pt;line-height:1.38;color:#2c2a48;margin-top:2.2mm;padding-left:3.5mm}
.cmpl li{margin:.8mm 0}
.decide{display:flex;align-items:center;gap:5mm;font-size:9pt;font-weight:900;margin-top:2.2mm}
.decide span{display:inline-flex;align-items:center;gap:1.6mm}
.decide span::before{content:"";display:inline-block;width:3.8mm;height:3.8mm;border:.35mm solid #14122b;border-radius:.8mm}
.grow{flex:1}
.foot{display:flex;align-items:center;gap:4mm;border-top:.3mm solid #cfcbe6;padding-top:3mm;margin-top:3mm}
.foot .qr{width:17mm;height:17mm;flex-shrink:0}
.foot .qr svg{width:100%;height:100%;display:block}
.foot .t{flex:1}
.foot .app{font-size:10pt;font-weight:900}
.foot .app a{color:#14122b;text-decoration:none}
.foot .s{font-size:7.6pt;color:#2c2a48;margin-top:.5mm}
.foot .url{font-size:10pt;font-weight:900;color:#7a70d6;margin-top:.8mm}
.foot .url a{color:#7a70d6;text-decoration:none}
.fine{font-size:6.3pt;color:#6b6890;line-height:1.35;margin-top:2mm}
.pno{position:absolute;right:12mm;top:11mm;font-size:7.5pt;font-weight:800;color:#a6a1cc}`

const boxes = () => `<span class="bxs">${[1, 2, 3, 4, 5].map(n => `<i>${n}</i>`).join("")}</span>`

function sheet(t, which) {
  const one = which === 1, days = one ? 7 : 14
  const qr = fs.readFileSync(`${OUT}/qr-${t.lang}.svg`, "utf8")
  const site = "https://kolbi-smoky.vercel.app" + (t.lang === "en" ? "/en/qr" : "/qr")
  const rowH = one ? 15.4 : 7.3
  const head = `<tr><th class="l" style="width:17mm">${t.day}${one ? `<small>${t.date}</small>` : ""}</th>${t.areas.map(a => `<th class="sep">${a}</th>`).join("")}<th class="sep"><span class="free"></span><small>${t.free}</small></th><th class="dis" style="width:34mm">${t.dis}</th></tr>`
  const rows = Array.from({ length: days }, (_, i) => `<tr style="height:${rowH}mm"><td class="l">${t.day} ${i + 1}${one ? `<small>${t.blankDate}</small>` : ""}</td>${Array.from({ length: 6 }, () => `<td class="sep">${boxes()}</td>`).join("")}<td class="dis"></td></tr>`).join("")
  const ex = [4, 2, 3, 4, 3]
  const exRow = one ? `<tr class="ex" style="height:10mm"><td class="l">${t.example}<small>${t.exDate}</small></td>${ex.map(v => `<td class="sep"><span class="bxs">${[1, 2, 3, 4, 5].map(n => `<i${n === v ? ' class="x"' : ""}>${n}</i>`).join("")}</span></td>`).join("")}<td class="sep"></td><td class="dis exn">${t.exDis}</td></tr>` : ""
  const avg = `<tr class="avg" style="height:${one ? 12 : 10}mm"><td class="l"><span class="big">Ø</span><small>${t.avgHint}</small></td>${Array.from({ length: 6 }, () => `<td class="sep"><span class="avgbox"></span></td>`).join("")}<td class="dis"></td></tr>`
  const title = one
    ? `<h1>${t.p1}<span class="days">· ${t.p1days}</span></h1>`
    : `<h1>${t.p2}<span class="blank"></span><span class="days">· <span class="nblank"></span> ${t.p2days}</span></h1>`
  const fields = (one ? t.fields1 : t.fields2).map((f, i) => `<div class="field${one && i === 1 ? " w2" : ""}">${f}</div>`).join("")
  const bottom = one
    ? `<div class="box"><h2>${t.howH}</h2><div class="steps">${t.how.map(([h, p], i) => `<div class="step"><b><span>${i + 1}</span>${h}</b><p>${p}</p></div>`).join("")}</div></div>`
    : `<div class="box"><h2>${t.cmpH}</h2>
      <table class="cmpt"><colgroup><col style="width:43mm">${Array.from({ length: 6 }, () => "<col>").join("")}</colgroup>
      <tr><th class="l"></th>${t.areas.map(a => `<th class="sep">${a}</th>`).join("")}<th class="sep"><span class="free" style="margin-top:2mm"></span></th></tr>
      ${t.cmpRows.map((r, i) => `<tr><td class="l"${i === 2 ? ' style="color:#7a70d6"' : ""}>${r}</td>${Array.from({ length: 6 }, () => `<td class="sep"></td>`).join("")}</tr>`).join("")}</table>
      <ul class="cmpl">${t.cmp.map(c => `<li>${c}</li>`).join("")}</ul>
      <div class="decide">${t.decide}${t.keep.map(k => `<span>${k}</span>`).join("")}</div></div>`
  return `<section class="page">
  <div class="pno">${t.page} ${which}/2</div>
  <div class="head">${kolbi(one ? "happy" : "think", 21)}<div><div class="kick">${t.kicker}</div>${title}</div></div>
  <p class="sub">${one ? t.p1sub : t.p2sub}</p>
  <div class="fields">${fields}</div>
  <div class="scale">${t.scale.map(([n, w]) => `<span><span class="bx">${n}</span>${w}</span>`).join("")}</div>
  <table><colgroup><col style="width:17mm">${Array.from({ length: 6 }, () => "<col>").join("")}<col style="width:34mm"></colgroup>${head}${exRow}${rows}${avg}</table>
  <p class="legend">${t.disLegend}${one ? "" : ` · <b style="color:#7a70d6">${t.more}</b>`}</p>
  ${bottom}
  <div class="grow"></div>
  <div class="foot"><div class="qr">${qr}</div><div class="t"><div class="app"><a href="${site}">${t.footApp}</a></div><div class="s">${t.footSub}</div><div class="url"><a href="${site}">kolbi-smoky.vercel.app</a></div></div></div>
  <p class="fine">${t.fine}</p>
</section>`
}

const html = t => `<!doctype html><html lang="${t.lang}"><head><meta charset="utf-8"><title>Kolbi – ${t.kicker}</title><style>${CSS}</style></head><body>${sheet(t, 1)}${sheet(t, 2)}</body></html>`

fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
for (const t of Object.values(T)) {
  const name = TRACKER_FILES[t.lang]
  const doc = html(t)
  const p = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 })
  await p.setContent(doc); await p.evaluate(() => document.fonts.ready)
  await p.pdf({ path: `${OUT}/${name}.pdf`, format: "A4", printBackground: true, preferCSSPageSize: true })
  // Vorschau: beide Seiten nebeneinander (für Download-Seite + Pins)
  const pages = p.locator(".page")
  for (const i of [0, 1]) await pages.nth(i).screenshot({ path: `${OUT}/${name}-p${i + 1}.png` })
  await p.close()
  console.log("✓", `${OUT}/${name}.pdf`)
}
// Vorschau-WebP je Seite (leicht) für die Download-Seite
const v = await browser.newPage()
for (const name of Object.values(TRACKER_FILES)) for (const pg of [1, 2]) {
  const b64 = fs.readFileSync(`${OUT}/${name}-p${pg}.png`).toString("base64")
  const webp = await v.evaluate(async src => {
    const img = new Image(); img.src = src; await img.decode()
    const c = document.createElement("canvas"); c.width = 800; c.height = Math.round(800 * img.height / img.width)
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL("image/webp", 0.86)
  }, `data:image/png;base64,${b64}`)
  fs.writeFileSync(`${OUT}/${name}-p${pg}.webp`, Buffer.from(webp.split(",")[1], "base64"))
}
await browser.close()
