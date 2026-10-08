// Startbild 1080×1920 für Higgsfield-Videos (Kolbi auf Markengrund, oben Platz für Text-Overlay).
// Aufruf (im Ordner marketing): node content/higgsfield/render-start.mjs <mood>
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")
const mood = process.argv[2] || "think"
const svg = fs.readFileSync(new URL(`../../brand/kolbi-${mood}.svg`, import.meta.url), "utf8")
  .replace(/width="512" height="512"/, 'width="100%" height="100%"')
const bg = `radial-gradient(circle at 50% 58%, rgba(46,204,138,.45) 0%, rgba(57,135,229,.28) 25%, transparent 45%),
  radial-gradient(60% 40% at 10% 10%, #9085e9 0%, transparent 60%),
  radial-gradient(60% 40% at 95% 95%, #e87ba4 0%, transparent 60%), #14122b`
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } })
await p.setContent(`<body style="margin:0"><div style="width:1080px;height:1920px;background:${bg};display:flex;align-items:flex-end;justify-content:center">
  <div style="width:760px;height:760px;margin-bottom:420px;filter:drop-shadow(0 0 26px rgba(124,245,192,.5)) drop-shadow(0 30px 50px rgba(0,0,0,.4))">${svg}</div></div></body>`)
const out = new URL(`./kolbi-start-${mood}-9x16.png`, import.meta.url).pathname
await p.screenshot({ path: out }); await b.close(); console.log("✓", out)
