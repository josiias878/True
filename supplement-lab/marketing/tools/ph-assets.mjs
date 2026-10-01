// Product-Hunt-Paket: animiertes Logo (240×240 GIF) + Galerie (1270×760) aus englischen App-Screenshots.
// Aufruf (im Ordner marketing): FFMPEG=… node tools/ph-assets.mjs <raw-en-ordner>
import { createRequire } from "module"
import fs from "fs"
import { execFileSync } from "child_process"
const require = createRequire(import.meta.url)
const { chromium } = require(execFileSync("npm", ["root", "-g"]).toString().trim() + "/playwright")
const FFMPEG = process.env.FFMPEG || "ffmpeg"
const RAW = process.argv[2]
const OUT = "launch/producthunt"; fs.mkdirSync(OUT, { recursive: true })
const TMP = (process.env.TMPDIR_FRAMES || "/tmp/kolbi-frames") + "/ph"; fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true })
const FONT = fs.readFileSync("brand/fonts/Nunito-latin.woff2").toString("base64")
const svg = n => fs.readFileSync(`brand/kolbi-${n}.svg`, "utf8").replace(/width="512" height="512"/, 'width="100%" height="100%"')
const BG = "radial-gradient(60% 80% at 15% 20%,#9085e9 0%,transparent 60%),radial-gradient(50% 70% at 90% 85%,#e87ba4 0%,transparent 60%),radial-gradient(60% 60% at 70% 10%,#3987e5 0%,transparent 55%),#14122b"
const b = await chromium.launch()

// 1) Animiertes Logo: Kolbi hüpft und blinzelt (2 s Schleife, 25 fps)
const p = await b.newPage({ viewport: { width: 240, height: 240 } })
await p.setContent(`<html><body style="margin:0;width:240px;height:240px;background:${BG};display:flex;align-items:center;justify-content:center;overflow:hidden">
<style>.lab-blink{transform-box:fill-box;transform-origin:center;animation:bl 2s infinite}@keyframes bl{0%,80%,100%{transform:scaleY(1)}86%{transform:scaleY(.08)}92%{transform:scaleY(1)}}
.lab-wave{animation:wv 2s ease-in-out infinite alternate}@keyframes wv{to{transform:translateX(-38px)}}
.k{width:190px;height:190px;animation:hop 2s cubic-bezier(.3,1.4,.5,1) infinite;transform-origin:50% 100%}@keyframes hop{0%,50%,100%{transform:translateY(0) scale(1,1)}15%{transform:translateY(0) scale(1.08,.92)}30%{transform:translateY(-16px) scale(.96,1.04)}}</style>
<div class="k">${svg("happy-alive")}</div></body></html>`)
for (let f = 0; f < 50; f++) {
  await p.evaluate(ms => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms } }, f * 40)
  await p.screenshot({ path: `${TMP}/${String(f).padStart(3, "0")}.png` })
}
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", "25", "-i", `${TMP}/%03d.png`, "-vf", "split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer", "-loop", "0", `${OUT}/thumbnail.gif`])
fs.copyFileSync(`${TMP}/000.png`, `${OUT}/thumbnail.png`)
console.log("✓ thumbnail.gif", (fs.statSync(`${OUT}/thumbnail.gif`).size / 1e3).toFixed(0), "kB")

// 2) Galerie 1270×760: Telefon + Überschrift
const G = [
  ["1-heute", "Find out which supplements actually work for YOU", "Kolbi plans your experiment: reset, then one supplement at a time.", "happy-alive"],
  ["3b-checkin", "One minute each evening", "Rate sleep, energy, calm and focus – Kolbi compares with your normal.", "think-alive"],
  ["4-muster", "Patterns you'd never notice", "Kolbi spots what affects your ratings – from your own data.", "party-alive"],
  ["5-kosten", "Stop paying for what doesn't work for you", "See what your stack costs and what you save when something gets dropped.", "happy-shades"],
]
const g = await b.newPage({ viewport: { width: 1270, height: 760 } })
for (const [i, [shot, h, sub, k]] of G.entries()) {
  const img = fs.readFileSync(`${RAW}/${shot}.png`).toString("base64")
  await g.setContent(`<html><head><style>@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${FONT}) format("woff2");font-weight:200 1000}</style></head>
<body style="margin:0;width:1270px;height:760px;overflow:hidden;font-family:Nunito,sans-serif;color:#fff;background:${BG};display:flex;align-items:center;gap:60px;padding:0 90px;box-sizing:border-box">
<div style="flex:1;display:flex;flex-direction:column;gap:22px">
  <div style="width:130px;height:130px">${svg(k)}</div>
  <div style="font-size:60px;font-weight:900;line-height:1.05">${h}</div>
  <div style="font-size:28px;font-weight:700;opacity:.88;line-height:1.35">${sub}</div>
  <div style="font-size:22px;font-weight:900;opacity:.7;margin-top:6px">🧪 Kolbi · free · no account · data stays on your device</div>
</div>
<div style="width:330px;height:715px;flex-shrink:0;border-radius:52px;background:#0b0b14;padding:12px;box-shadow:0 40px 90px rgba(0,0,0,.5),inset 0 0 0 2px rgba(255,255,255,.12);margin-top:110px">
  <img src="data:image/png;base64,${img}" style="width:100%;height:100%;object-fit:cover;object-position:top;border-radius:42px"></div>
</body></html>`)
  await g.evaluate(() => document.fonts.ready)
  await g.screenshot({ path: `${OUT}/gallery-${i + 1}.png` }); console.log("✓ gallery", i + 1)
}
await b.close()
