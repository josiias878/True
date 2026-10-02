// Instagram-Karussell (1080×1350): „Wirken deine Supplements bei DIR?“ – 5 Slides (Ton: brand/BRAND.md)
// Aufruf (im Ordner marketing): node tools/carousel.mjs  → content/carousel-1/*.png
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")
const OUT = "content/carousel-1"; fs.mkdirSync(OUT, { recursive: true })
const FONT = fs.readFileSync("brand/fonts/Nunito-latin.woff2").toString("base64")
const k = (n, s) => fs.readFileSync(`brand/kolbi-${n}.svg`, "utf8").replace(/width="512" height="512"/, `width="${s}" height="${s}"`)
const shot = f => `data:image/webp;base64,${fs.readFileSync(`site/img/${f}.webp`).toString("base64")}`
const CSS = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${FONT}) format("woff2");font-weight:200 1000}
*{box-sizing:border-box;margin:0}body{width:1080px;height:1350px;overflow:hidden;font-family:Nunito,sans-serif;color:#fff;
background:radial-gradient(45% 35% at 20% 12%,#9085e9cc,transparent 70%),radial-gradient(40% 30% at 88% 30%,#3987e5aa,transparent 70%),radial-gradient(50% 40% at 70% 95%,#e87ba499,transparent 70%),#14122b}
.s{position:absolute;inset:0;padding:90px 80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;text-align:center}
h1{font-size:96px;line-height:1.03;font-weight:900}h2{font-size:76px;line-height:1.05;font-weight:900}
p{font-size:42px;font-weight:700;opacity:.88;line-height:1.35}.g{background:linear-gradient(90deg,#7CF5C0,#9ad0ff);-webkit-background-clip:text;color:transparent}
.n{position:absolute;bottom:48px;right:60px;font-size:30px;font-weight:900;opacity:.6}
.row{display:flex;gap:26px;align-items:center;text-align:left;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.18);border-radius:40px;padding:26px 34px;width:100%}
.row b{font-size:50px;font-weight:900;display:block}.row span{font-size:34px;opacity:.85}
.swipe{font-size:34px;font-weight:900;opacity:.75}`
const slides = [
  `<div class="s">${k("think-alive", 420)}<h1>Wirken deine<br>Supplements<br>bei <span class="g">DIR?</span></h1><div class="swipe">Wisch → Kolbi zeigt's dir</div></div>`,
  `<div class="s">${k("alert", 300)}<h2>Das Problem</h2><p>Du startest mehrere Sachen gleichzeitig,<br>fühlst dich „irgendwie anders“ –<br>und weißt nicht, <b>was</b> davon es war.</p></div>`,
  `<div class="s"><h2>Kolbis Methode</h2>
    <div class="row">${k("think", 150)}<div><b>1 · Reset</b><span>Ein paar Tage: dein Normal</span></div></div>
    <div class="row">${k("happy", 150)}<div><b>2 · Testen</b><span>Eins nach dem anderen, abends 1 Min.</span></div></div>
    <div class="row">${k("party", 150)}<div><b>3 · Aufdecken</b><span>Behalten, vielleicht oder raus</span></div></div></div>`,
  `<div class="s" style="flex-direction:row;gap:40px;padding:70px 60px"><img src="${shot("de-03-4-muster")}" style="height:1180px;border-radius:40px;box-shadow:0 30px 80px rgba(0,0,0,.4)"><div style="text-align:left;display:flex;flex-direction:column;gap:24px"><h2 style="font-size:64px">Und<br>dazu:</h2><p style="font-size:38px">🔎 Muster<br>💸 Kosten<br>📦 Vorrat<br>⏰ Erinnerungen<br>📊 Wochen-Story</p><p style="font-size:26px;opacity:.7">Bild: Beispiel-Daten</p></div></div>`,
  `<div class="s">${k("party-alive", 380)}<h1>Finde raus, was<br>bei <span class="g">DIR</span> wirkt.</h1><p>Kostenlos in der Beta · ohne Konto<br>Daten bleiben auf deinem Handy</p><div class="swipe">🔗 Link in Bio</div></div>`,
]
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } })
for (const [i, s] of slides.entries()) {
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${s}<div class="n">${i + 1}/${slides.length}</div></body></html>`)
  await p.evaluate(() => document.fonts.ready)
  await p.screenshot({ path: `${OUT}/${i + 1}.png` }); console.log("✓", i + 1)
}
await b.close()
