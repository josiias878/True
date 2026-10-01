// Feature-Grafik (Google Play), Profilbild, Kolbi-PNGs, Übersichtsblatt.
// Aufruf (im Ordner marketing): node tools/graphics.mjs   (vorher kolbi-svg.mjs)
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")
const svg = n => fs.readFileSync(`brand/kolbi-${n}.svg`, "utf8").replace(/width="512" height="512"/, 'width="100%" height="100%"')
const FONT_B64 = fs.readFileSync(new URL("../brand/fonts/Nunito-latin.woff2", import.meta.url)).toString("base64")
const FACE = `<style>@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${FONT_B64}) format("woff2");font-weight:200 1000}</style>`
const FONT = `font-family: Nunito, 'DejaVu Sans', sans-serif;`
const bg = `background: radial-gradient(60% 80% at 15% 20%, #9085e9 0%, transparent 60%), radial-gradient(50% 70% at 90% 85%, #e87ba4 0%, transparent 60%), radial-gradient(60% 60% at 70% 10%, #3987e5 0%, transparent 55%), #14122b;`
const browser = await chromium.launch()
async function render(html, w, h, path, transparent = false) {
  const p = await browser.newPage({ viewport: { width: w, height: h } })
  await p.setContent(`<!doctype html><html><head>${FACE}</head><body style="margin:0;${FONT}${transparent ? "background:transparent" : ""}">${html}</body></html>`)
  await p.evaluate(() => document.fonts.ready); await p.screenshot({ path, omitBackground: transparent }); await p.close(); console.log("✓", path)
}
// Google-Play-Feature-Grafik 1024×500
await render(`<div style="width:1024px;height:500px;${bg};display:flex;align-items:center;gap:30px;padding:0 70px;box-sizing:border-box;color:#fff">
  <div style="width:330px;height:330px;flex-shrink:0;filter:drop-shadow(0 20px 40px rgba(0,0,0,.35))">${svg("party-glow")}</div>
  <div><div style="font-size:24px;font-weight:800;opacity:.85;letter-spacing:.06em">KOLBI · SUPPLEMENT-CHECK</div>
  <div style="font-size:62px;font-weight:900;line-height:1.02;margin-top:10px">Finde raus,<br>was bei <span style="background:linear-gradient(90deg,#7CF5C0,#9ad0ff);-webkit-background-clip:text;color:transparent">DIR</span> wirkt.</div>
  <div style="font-size:24px;font-weight:700;opacity:.88;margin-top:16px">Testen · Vergleichen · Sparen</div></div></div>`, 1024, 500, "store/feature-graphic.png")
// Profilbild (TikTok/Instagram/YouTube) 1080×1080 – im Kreis gut erkennbar
await render(`<div style="width:1080px;height:1080px;${bg};display:flex;align-items:center;justify-content:center">
  <div style="width:760px;height:760px;margin-top:40px;filter:drop-shadow(0 30px 60px rgba(0,0,0,.35))">${svg("happy-glow")}</div></div>`, 1080, 1080, "brand/avatar.png")
// Banner (YouTube/X) 1500×500
await render(`<div style="width:1500px;height:500px;${bg};display:flex;align-items:center;justify-content:center;gap:40px;color:#fff">
  <div style="width:300px;height:300px">${svg("happy-shades")}</div>
  <div><div style="font-size:72px;font-weight:900;line-height:1">Kolbi</div><div style="font-size:34px;font-weight:800;opacity:.9;margin-top:10px">Finde raus, was bei dir wirkt. 🧪</div></div></div>`, 1500, 500, "brand/banner.png")
// Transparente PNGs je Stimmung (für Videos, Sticker, Website)
fs.mkdirSync("brand/png", { recursive: true })
for (const f of fs.readdirSync("brand").filter(f => f.endsWith(".svg"))) {
  const n = f.replace(/^kolbi-|\.svg$/g, "")
  await render(`<div style="width:1024px;height:1024px;padding:110px;box-sizing:border-box">${svg(n)}</div>`, 1024, 1024, `brand/png/kolbi-${n}.png`, true)
}
// Übersichtsblatt
const names = fs.readdirSync("brand").filter(f => f.endsWith(".svg")).map(f => f.replace(/^kolbi-|\.svg$/g, ""))
await render(`<div style="padding:40px;background:#14122b;color:#fff;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;width:1200px;box-sizing:border-box">
  ${names.map(n => `<div style="text-align:center"><div style="height:220px;padding:20px;background:#211e3f;border-radius:28px">${svg(n)}</div><div style="margin-top:8px;font-weight:800">${n}</div></div>`).join("")}</div>`, 1200, 920, "brand/kolbi-sheet.png")
await browser.close()
