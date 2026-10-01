// Gestaltete Store-Screenshots (1290×2796) aus Roh-Screenshots: Überschrift + iPhone-Rahmen.
// Aufruf: node compose.mjs <rawdir> <outdir> [de|en]
import { createRequire } from "module"
import fs from "fs"
import path from "path"
const FONT_B64 = fs.readFileSync(new URL("../brand/fonts/Nunito-latin.woff2", import.meta.url)).toString("base64")
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")
const [RAW, OUT, LANG = "de"] = process.argv.slice(2)
fs.mkdirSync(OUT, { recursive: true })

const SLIDES = {
  de: [
    ["1-heute", "Finde raus, was<br>bei <em>DIR</em> wirkt", "Kolbi führt dich Schritt für Schritt", ["#2ECC8A", "#1b7f9a"]],
    ["3b-checkin", "1 Minute<br>am Abend", "Sterne tippen – fertig", ["#3987e5", "#6c5ce7"]],
    ["4-muster", "Kolbi entdeckt<br>deine Muster", "Was dir z. B. den Schlaf raubt", ["#9085e9", "#e87ba4"]],
    ["5-kosten", "Spar dir, was<br>nichts bringt", "Kosten im Blick – Flops fliegen raus", ["#1baf7a", "#eda100"]],
    ["7-experimente", "Fertige<br>Experimente", "Besser schlafen, klarer Kopf – mit 1 Tipp", ["#eb6834", "#9085e9"]],
    ["9-story", "Deine Woche<br>als Story", "Jeden Sonntag – zum Durchwischen", ["#3987e5", "#2ECC8A"]],
  ],
  en: [
    ["1-heute", "Find out what<br>works for <em>YOU</em>", "Kolbi guides you step by step", ["#2ECC8A", "#1b7f9a"]],
    ["3b-checkin", "1 minute<br>each evening", "Tap the stars – done", ["#3987e5", "#6c5ce7"]],
    ["4-muster", "Kolbi spots<br>your patterns", "Like what's ruining your sleep", ["#9085e9", "#e87ba4"]],
    ["5-kosten", "Stop paying for<br>what doesn't work", "Costs at a glance – duds get cut", ["#1baf7a", "#eda100"]],
    ["7-experimente", "Ready-made<br>experiments", "Better sleep, clear head – one tap", ["#eb6834", "#9085e9"]],
    ["9-story", "Your week<br>as a story", "Every Sunday – swipe through", ["#3987e5", "#2ECC8A"]],
  ],
}[LANG]

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 })).newPage()
for (const [i, [raw, title, sub, [c1, c2]]] of SLIDES.entries()) {
  const img = fs.readFileSync(path.join(RAW, `${raw}.png`)).toString("base64")
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:Nunito;src:url(data:font/woff2;base64,${FONT_B64}) format("woff2");font-weight:200 1000}
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:430px;height:932px;overflow:hidden;font-family:Nunito,"DejaVu Sans",sans-serif;color:#fff;
      background:radial-gradient(120% 60% at 20% 0%, ${c1} 0%, transparent 60%), radial-gradient(100% 60% at 100% 30%, ${c2} 0%, transparent 65%), linear-gradient(180deg, #0d1022, #07070f);}
    .blob{position:absolute;border-radius:999px;filter:blur(40px);opacity:.35}
    h1{position:absolute;top:58px;left:0;right:0;text-align:center;font-size:38px;line-height:1.08;font-weight:900;letter-spacing:-.02em}
    h1 em{font-style:normal;background:linear-gradient(90deg,#7CF5C0,#9ee6ff);-webkit-background-clip:text;color:transparent}
    p{position:absolute;top:156px;left:0;right:0;text-align:center;font-size:17px;font-weight:700;opacity:.85}
    .phone{position:absolute;left:50%;top:214px;width:330px;height:715px;transform:translateX(-50%);border-radius:52px;padding:10px;
      background:linear-gradient(145deg,#2b2d3a,#0c0d14);box-shadow:0 30px 70px rgba(0,0,0,.55), inset 0 0 0 2px rgba(255,255,255,.08)}
    .screen{width:100%;height:100%;border-radius:43px;overflow:hidden;background:#08080f}
    .sb{height:38px;display:flex;align-items:center;justify-content:space-between;padding:6px 26px 0 30px;font-size:13px;font-weight:800;color:#fff}
    .sb i{font-style:normal;letter-spacing:1px;font-size:11px}
    .screen img{width:100%;display:block}
    .island{position:absolute;top:20px;left:50%;transform:translateX(-50%);width:96px;height:28px;border-radius:20px;background:#000}
  </style></head><body>
    <div class="blob" style="width:260px;height:260px;left:-60px;top:520px;background:${c1}"></div>
    <div class="blob" style="width:240px;height:240px;right:-70px;top:300px;background:${c2}"></div>
    <h1>${title}</h1><p>${sub}</p>
    <div class="phone"><div class="screen"><div class="sb"><span>9:41</span><i>▂▄▆ ᯤ ▮</i></div><img src="data:image/png;base64,${img}"></div><div class="island"></div></div>
  </body></html>`)
  await page.waitForTimeout(200)
  const name = `${String(i + 1).padStart(2, "0")}-${raw}.png`
  await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: path.join(OUT, name) })
  console.log("✓", name)
}
await browser.close()
