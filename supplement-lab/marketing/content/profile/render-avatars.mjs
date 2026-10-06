// Profilbilder TikTok/Instagram (1080×1080, kreis-sicher, ohne Text) + Prüf-Vorschau.
// Aufruf (im Ordner marketing): node content/profile/render-avatars.mjs
// Kolbi liegt komplett im inneren Kreis (Durchmesser ~70 % = 756 px), Hintergrund in Markenfarben (brand/BRAND.md §5).
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")
const dir = new URL(".", import.meta.url).pathname
const svg = n => fs.readFileSync(new URL(`../../brand/kolbi-${n}.svg`, import.meta.url), "utf8")
  .replace(/width="512" height="512"/, 'width="100%" height="100%"')
  .replace(/filter:drop-shadow\([^;]*\);?/, "") // eigener Schein unten, damit er zum Hintergrund passt

// Kolbis Umriss reicht im viewBox (0..100) bis ~48 Einheiten vom Mittelpunkt (Deckel- und Bodenecken).
// 730 px Kasten → 48 × 7,3 ≈ 350 px Radius < 378 px (70 % von 540), Rest = Luft für Kontur und Schein.
const K = 730
const variants = {
  // farbig: Nacht-Violett mit Markenlichtern + heller Lichthof hinter Kolbi
  "kolbi-avatar-1080.png": {
    bg: `radial-gradient(circle at 50% 52%, rgba(46,204,138,.55) 0%, rgba(57,135,229,.35) 30%, transparent 52%),
         radial-gradient(55% 55% at 12% 15%, #9085e9 0%, transparent 60%),
         radial-gradient(50% 50% at 92% 90%, #e87ba4 0%, transparent 60%),
         radial-gradient(50% 50% at 88% 8%, #3987e5 0%, transparent 60%), #14122b`,
    shadow: "drop-shadow(0 0 22px rgba(124,245,192,.55)) drop-shadow(0 24px 40px rgba(0,0,0,.35))",
    kolbi: "happy",
  },
  // hell: Mint → Lavendel, ruhig, für helle Feeds
  "kolbi-avatar-alt-1080.png": {
    bg: `radial-gradient(circle at 50% 52%, #ffffff 0%, rgba(255,255,255,0) 50%),
         linear-gradient(135deg, #c9f5e2 0%, #d9e8ff 55%, #e6e1ff 100%)`,
    shadow: "drop-shadow(0 22px 36px rgba(20,18,43,.22))",
    kolbi: "happy",
  },
}

const browser = await chromium.launch()
async function shot(html, w, h, path) {
  const p = await browser.newPage({ viewport: { width: w, height: h } })
  await p.setContent(`<!doctype html><html><body style="margin:0">${html}</body></html>`)
  await p.screenshot({ path }); await p.close(); console.log("✓", path)
}
for (const [file, v] of Object.entries(variants)) {
  await shot(`<div style="width:1080px;height:1080px;background:${v.bg};display:flex;align-items:center;justify-content:center">
    <div style="width:${K}px;height:${K}px;filter:${v.shadow}">${svg(v.kolbi)}</div></div>`, 1080, 1080, dir + file)
}

// Vorschau: 1080er mit 70-%-Hilfskreis + runde Avatare bei 110 px und 40 px, auf hellem und dunklem App-Grund
const b64 = f => "data:image/png;base64," + fs.readFileSync(dir + f).toString("base64")
const files = Object.keys(variants)
const row = (bg, fg) => `<div style="background:${bg};color:${fg};padding:24px;display:flex;gap:28px;align-items:center;font:600 14px sans-serif">
  ${files.map(f => `<div style="text-align:center"><img src="${b64(f)}" style="width:110px;height:110px;border-radius:50%;display:block"><div>${f.includes("alt") ? "hell (alt)" : "farbig"} · 110 px</div></div>
  <img src="${b64(f)}" style="width:40px;height:40px;border-radius:50%">`).join("")}</div>`
await shot(`<div style="width:900px;font:600 14px sans-serif">
  <div style="display:flex;gap:20px;padding:20px;background:#888">${files.map(f => `<div style="position:relative;width:420px;height:420px">
    <img src="${b64(f)}" style="width:420px;height:420px;border-radius:50%;display:block">
    <div style="position:absolute;inset:${420 * .15}px;border:2px dashed #ff3b30;border-radius:50%"></div></div>`).join("")}</div>
  ${row("#ffffff", "#111")}${row("#000000", "#eee")}</div>`, 900, 760, dir + "preview-110.png")
await browser.close()
