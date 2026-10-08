// Standbilder/Overlays (1080×1920) für Higgsfield-Probevideos. Aufruf: node frames.mjs <shotsDir> <outDir>
// Regeln: keine Wirkversprechen, App-Bilder als „Beispiel-Daten“ gekennzeichnet (brand/BRAND.md, legal/health-claims-check.md).
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")
const [SHOTS, OUT] = process.argv.slice(2)
fs.mkdirSync(OUT, { recursive: true })
const FONT = fs.readFileSync(new URL("../../brand/fonts/Nunito-latin.woff2", import.meta.url)).toString("base64")
const img = f => "data:image/png;base64," + fs.readFileSync(f).toString("base64")
const svg = n => fs.readFileSync(new URL(`../../brand/kolbi-${n}.svg`, import.meta.url), "utf8").replace(/width="512" height="512"/, 'width="100%" height="100%"')
const BG = `radial-gradient(60% 40% at 10% 10%, #9085e9 0%, transparent 60%), radial-gradient(60% 40% at 95% 95%, #e87ba4 0%, transparent 60%), radial-gradient(circle at 50% 55%, rgba(57,135,229,.30) 0%, transparent 45%), #14122b`
const CSS = `@font-face{font-family:N;src:url(data:font/woff2;base64,${FONT})} *{box-sizing:border-box} body{margin:0;font-family:N,sans-serif;color:#fff}
 .t{font-weight:900;font-size:92px;line-height:1.05;letter-spacing:-.01em;text-align:center;text-shadow:0 6px 24px rgba(0,0,0,.55)}
 .s{font-weight:800;font-size:46px;line-height:1.2;text-align:center;color:#d9d6f5;text-shadow:0 4px 16px rgba(0,0,0,.5)}
 .pill{position:absolute;right:48px;bottom:90px;background:#f0c063;color:#14122b;font-weight:900;font-size:30px;padding:10px 22px;border-radius:999px}
 em{font-style:normal;color:#7CF5C0}`
const b = await chromium.launch()
async function shot(name, html, transparent = false) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
  await p.setContent(`<html><head><style>${CSS}</style></head><body style="background:${transparent ? "transparent" : "#14122b"}">${html}</body></html>`)
  await p.waitForTimeout(150)
  await p.screenshot({ path: `${OUT}/${name}.png`, omitBackground: transparent }); await p.close(); console.log("✓", name)
}
const wrap = (inner) => `<div style="position:relative;width:1080px;height:1920px;overflow:hidden">${inner}</div>`
// A: Hook-Overlays (transparent) für den Kolbi-Clip
const HOOKS = {
  "hook-magnesium": `Bringt dein<br><em>Magnesium</em><br>überhaupt was?`,
  "hook-kosten": `37 € im Monat<br>für Supplements …<br><em>und wofür?</em>`,
}
for (const [n, t] of Object.entries(HOOKS))
  await shot(n, wrap(`<div style="position:absolute;top:220px;left:60px;right:60px" class="t">${t}</div>`), true)
// B: Coach-Karte
await shot("coach", wrap(`<div style="position:absolute;inset:0;background:${BG}"></div>
  <div class="t" style="position:absolute;top:230px;left:60px;right:60px;font-size:80px">Kolbi rechnet mit<br>und <em>fragt nach</em></div>
  <img src="${img(SHOTS + "/de-dark-coach.png")}" style="position:absolute;left:50%;top:760px;transform:translateX(-50%);width:960px;border-radius:44px;box-shadow:0 30px 80px rgba(0,0,0,.55)">
  <div class="s" style="position:absolute;top:1480px;left:80px;right:80px">Kosten · Testergebnis · deine Entscheidung</div>
  <div class="pill">Beispiel-Daten</div>`))
// C: Stack-Karte (hoch, wird im Video gescrollt) – Rahmen mit Titel, Karte als eigenes Bild
await shot("stack-bg", wrap(`<div style="position:absolute;inset:0;background:${BG}"></div>
  <div class="t" style="position:absolute;top:150px;left:60px;right:60px;font-size:78px">Was nehme ich –<br><em>und wofür?</em></div>
  <div class="pill">Beispiel-Daten</div>`))
// D: Schlussbild
await shot("end", wrap(`<div style="position:absolute;inset:0;background:${BG}"></div>
  <div style="position:absolute;left:50%;top:330px;transform:translateX(-50%);width:640px;height:640px;filter:drop-shadow(0 0 26px rgba(124,245,192,.5))">${svg("happy")}</div>
  <div class="t" style="position:absolute;top:1060px;left:60px;right:60px">Teste selbst,<br>was bei <em>DIR</em> wirkt</div>
  <div class="s" style="position:absolute;top:1370px;left:60px;right:60px">Kolbi · gratis · Link in Bio 🧪</div>`))
// E: Untertitel für das 3D-Video (transparent, oben)
const CAPS = {
  "cap-1": `40 € im Monat …`,
  "cap-2": `… und was davon<br><em>wirkt bei dir?</em>`,
  "cap-3": `Kolbi findet's raus`,
  "cap-4": `<em>Behalten ✓</em><br>Raus ✗`,
}
for (const [n, t] of Object.entries(CAPS))
  await shot(n, wrap(`<div style="position:absolute;top:210px;left:50px;right:50px" class="t">${t}</div>`), true)
await b.close()
