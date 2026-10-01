// Kolbi-Kurzvideos (9:16, 1080×1920, 30 fps, H.264) für TikTok / Reels / Shorts – ohne Gesicht, nur Kolbi.
// Jede Szene ist HTML mit CSS-Animationen; Bild für Bild wird die Zeit gesetzt und abfotografiert.
// Aufruf (im Ordner marketing): node tools/videos.mjs [name …]     → content/videos/<name>.mp4 + Cover
// ffmpeg: FFMPEG=/pfad/zu/ffmpeg (sonst „ffmpeg“ aus dem PATH; z. B. pip install imageio-ffmpeg)
import { createRequire } from "module"
import fs from "fs"
import { execFileSync } from "child_process"
const require = createRequire(import.meta.url)
const { chromium } = require(execFileSync("npm", ["root", "-g"]).toString().trim() + "/playwright")
const FFMPEG = process.env.FFMPEG || "ffmpeg"
const FPS = 30, W = 1080, H = 1920
const EN = process.env.VLANG === "en"
const tx = (de, en) => (EN ? en : de)
const OUT = EN ? "content/videos-en" : "content/videos", TMP = process.env.TMPDIR_FRAMES || "/tmp/kolbi-frames"
fs.mkdirSync(OUT, { recursive: true })

const FONT = fs.readFileSync("brand/fonts/Nunito-latin.woff2").toString("base64")
let kid = 0
const kolbi = (name, size, extra = "") => fs.readFileSync(`brand/kolbi-${name}.svg`, "utf8")
  .replace(/_R_[0-9a-z]*_/g, `v${kid++}`)
  .replace(/width="512" height="512"/, `width="${size}" height="${size}" ${extra}`)

// ── Bausteine ─────────────────────────────────────────────────────────────────
// beat(start, end, html, {inn, out, pos}) – sichtbar von start bis end (Sekunden)
const beat = (a, b, html, { inn = "pop", out = "fadeout", style = "", cls = "" } = {}) =>
  `<div class="beat ${cls}" style="animation: ${inn} .55s cubic-bezier(.3,1.5,.5,1) ${a}s both${b != null ? `, ${out} .35s ease-in ${b - 0.35}s forwards` : ""};${style}">${html}</div>`
const big = (t, size = 96) => `<div class="big" style="font-size:${size}px">${t}</div>`
const small = t => `<div class="small">${t}</div>`
const ctaEnd = a => beat(a, null, `
  <div class="center col">
    <div class="float">${kolbi("party-alive", 460)}</div>
    ${big(tx("Finde raus, was<br>bei <span class='grad'>DIR</span> wirkt.", "Find out what<br>works for <span class='grad'>YOU</span>."), 92)}
    <div class="pill">🧪 Kolbi · Supplement Lab</div>
    ${small(tx("Kostenlos in der Beta · Link in Bio", "Free during the beta · link in bio"))}
  </div>`)

const CSS = `
@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${FONT}) format("woff2");font-weight:200 1000}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:Nunito,sans-serif;color:#fff;background:#14122b}
.bg{position:absolute;inset:-10%;background:radial-gradient(45% 35% at 20% 15%,#9085e9cc,transparent 70%),radial-gradient(40% 30% at 85% 30%,#3987e5aa,transparent 70%),radial-gradient(50% 40% at 70% 90%,#e87ba499,transparent 70%),radial-gradient(40% 30% at 10% 85%,#2ECC8A66,transparent 70%),#14122b;animation:drift 12s ease-in-out infinite alternate}
@keyframes drift{to{transform:translate(4%,-3%) scale(1.08)}}
.beat{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:150px 90px 330px}
.center{display:flex;align-items:center;justify-content:center;text-align:center}
.col{flex-direction:column;gap:34px}
.big{font-weight:900;line-height:1.04;letter-spacing:-.01em;text-align:center;text-shadow:0 6px 30px rgba(0,0,0,.25)}
.small{font-size:44px;font-weight:800;opacity:.85;text-align:center}
.grad{background:linear-gradient(90deg,#7CF5C0,#9ad0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.pill{font-size:46px;font-weight:900;padding:18px 36px;border-radius:999px;background:rgba(255,255,255,.16);border:2px solid rgba(255,255,255,.25)}
.bubble{position:relative;background:#fff;color:#1a1c20;font-weight:900;font-size:64px;padding:30px 48px;border-radius:56px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.bubble::after{content:"";position:absolute;left:50%;bottom:-18px;width:40px;height:40px;background:#fff;transform:translateX(-50%) rotate(45deg);border-radius:8px}
.card{background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.2);border-radius:56px;padding:44px 52px;box-shadow:inset 0 2px 0 rgba(255,255,255,.2),0 30px 80px rgba(0,0,0,.3)}
.emo{font-size:120px;display:inline-block}
.float{animation:float 3s ease-in-out infinite}
@keyframes float{50%{transform:translateY(-22px)}}
.lab-blink{transform-box:fill-box;transform-origin:center;animation:blink 3.4s infinite}
@keyframes blink{0%,90%,100%{transform:scaleY(1)}93%{transform:scaleY(.08)}96%{transform:scaleY(1)}}
.lab-wave{animation:wave 2.4s ease-in-out infinite alternate}
@keyframes wave{to{transform:translateX(-38px)}}
@keyframes pop{0%{opacity:0;transform:scale(.6)}70%{opacity:1;transform:scale(1.04)}100%{opacity:1;transform:none}}
@keyframes rise{0%{opacity:0;transform:translateY(90px)}100%{opacity:1;transform:none}}
@keyframes slidein{0%{opacity:0;transform:translateX(260px)}100%{opacity:1;transform:none}}
@keyframes fadeout{to{opacity:0;transform:scale(.94)}}
@keyframes slideout{to{opacity:0;transform:translateX(-260px)}}
@keyframes grow{from{width:0}}
@keyframes shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-7deg)}75%{transform:rotate(7deg)}}
@keyframes flyin{0%{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--r)) scale(.4)}100%{opacity:1;transform:none}}
@keyframes jitter{0%,100%{transform:translate(0,0) rotate(0)}25%{transform:translate(14px,-10px) rotate(8deg)}50%{transform:translate(-12px,8px) rotate(-6deg)}75%{transform:translate(8px,12px) rotate(4deg)}}
@property --n{syntax:"<integer>";initial-value:0;inherits:false}
.count{counter-reset:n var(--n)}
.count::before{content:counter(n)}
@keyframes count{from{--n:0}to{--n:var(--to)}}
`

// ── Die Videos ───────────────────────────────────────────────────────────────
const V = {}

V["01-hallo-kolbi"] = { dur: 10, cover: 1.2, html: [
  beat(0.1, 2.6, `<div class="center col"><div class="bubble">${tx("Hi, ich bin Kolbi! 👋", "Hi, I'm Kolbi! 👋")}</div><div class="float">${kolbi("happy-alive", 560)}</div></div>`),
  beat(2.6, 5.0, `<div class="center col">${big(tx("Du nimmst 5 Supplements …", "You take 5 supplements …"), 104)}<div>${["💊", "🌙", "🍵", "🌿", "🏋️"].map((e, i) => `<span class="emo" style="animation:pop .5s cubic-bezier(.3,1.5,.5,1) ${2.9 + i * 0.18}s both">${e}</span>`).join(" ")}</div></div>`),
  beat(5.0, 7.6, `<div class="center col">${kolbi("think-alive", 420)}${big(tx("… aber welches<br>bringt <span class='grad'>bei dir</span><br>wirklich was?", "… but which one<br>actually does<br>something <span class='grad'>for you</span>?"), 104)}</div>`),
  ctaEnd(7.6),
] }

V["02-so-gehts"] = { dur: 12, cover: 0.9, html: [
  beat(0.1, 1.9, `<div class="center col">${big(tx("Supplements testen<br>in 3 Schritten", "Test your<br>supplements<br>in 3 steps"), 108)}${kolbi("happy-alive", 360)}</div>`),
  beat(1.9, 4.3, `<div class="card center col" style="width:100%">${kolbi("think", 300)}${big("1 · Reset", 96)}${small(tx("Ein paar Tage ohne Neues –<br>Kolbi lernt dein Normal.", "A few days without anything new –<br>Kolbi learns your normal."))}</div>`, { inn: "slidein", out: "slideout" }),
  beat(4.3, 6.7, `<div class="card center col" style="width:100%">${kolbi("happy", 300)}${big(tx("2 · Testen", "2 · Test"), 96)}${small(tx("Eins nach dem anderen.<br>Abends 1 Minute Check-in.", "One at a time.<br>1-minute check-in each evening."))}</div>`, { inn: "slidein", out: "slideout" }),
  beat(6.7, 9.4, `<div class="card center col" style="width:100%">${kolbi("party-glow", 300)}${big(tx("3 · Aufdecken", "3 · Reveal"), 96)}
    <div class="pill" style="font-size:64px;background:#1baf7a;animation:pop .6s cubic-bezier(.3,1.5,.5,1) 7.5s both">${tx("💚 Behalten", "💚 Keep")}</div>${small(tx("oder raus – <b>deine</b> Entscheidung.", "or drop it – <b>your</b> call."))}</div>`, { inn: "slidein", out: "slideout" }),
  ctaEnd(9.4),
] }

const chaos = ["💊", "🌙", "🍵", "🌿", "🏋️", "🐟", "🌞", "⚡"]
V["03-alles-gleichzeitig"] = { dur: 11, cover: 2.2, html: [
  beat(0.1, 3.6, `<div class="center col">${small("POV:")}${big(tx("Du startest 5 neue<br>Supplements<br>gleichzeitig.", "You start 5 new<br>supplements<br>at once."), 100)}</div>`),
  beat(1.4, 3.6, `<div style="position:absolute;inset:0">${chaos.map((e, i) => {
    const x = [8, 70, 15, 78, 40, 60, 5, 82][i], y = [10, 12, 70, 68, 82, 6, 24, 60][i]
    return `<span class="emo" style="position:absolute;left:${x}%;top:${y}%;--x:${(50 - x) * 8}px;--y:${(50 - y) * 8}px;--r:${i * 40}deg;animation:flyin .5s ease-out ${1.4 + i * 0.12}s both, jitter .5s ease-in-out ${2 + i * 0.05}s infinite">${e}</span>`
  }).join("")}</div>`, { inn: "pop" }),
  beat(3.6, 6.4, `<div class="center col"><div style="animation:shake .4s ease-in-out 3.8s 3">${kolbi("alert", 440)}</div>${big(tx("Und danach weißt<br>du nicht, was was<br>gemacht hat. 🤷", "And afterwards<br>you have no idea<br>what did what. 🤷"), 96)}</div>`),
  beat(6.4, 8.7, `<div class="center col">${kolbi("happy-shades", 440)}${big(tx("Eins nach dem anderen.<br><span class='grad'>Dann siehst du's.</span>", "One at a time.<br><span class='grad'>Then you'll see.</span>"), 96)}</div>`),
  ctaEnd(8.7),
] }

const items = [["🌙", "Magnesium", 17, "#9085e9"], ["🏋️", tx("Kreatin", "Creatine"), 25, "#2ECC8A"], ["🌞", "Vitamin D3", 15, "#eda100"], ["🌿", "Ashwagandha", 18, "#e87ba4"], ["🍵", tx("L-Theanin", "L-Theanine"), 19, "#3987e5"]]
V["04-was-kostet-dein-schrank"] = { dur: 12, cover: 3.2, html: [
  beat(0.1, 2.4, `<div class="center col">${kolbi("think-alive", 380)}${big(tx("Was kostet dein<br>Supplement-Schrank<br>im Monat?", "What does your<br>supplement shelf<br>cost per month?"), 100)}</div>`),
  beat(2.4, 6.6, `<div class="card col" style="display:flex;width:100%;gap:26px">
    ${items.map(([e, n, p, c], i) => `<div style="display:flex;align-items:center;gap:22px;font-size:48px;font-weight:900;animation:rise .45s ease-out ${2.6 + i * 0.22}s both">
      <span style="font-size:64px">${e}</span><span style="flex:1">${n}</span>
      <span style="width:220px;height:26px;border-radius:13px;background:rgba(255,255,255,.15);overflow:hidden"><span style="display:block;height:100%;width:${p * 8}px;background:${c};border-radius:13px;animation:grow .7s ease-out ${2.8 + i * 0.22}s both"></span></span>
      <span style="width:130px;text-align:right">${tx(`${p} €`, `€${p}`)}</span></div>`).join("")}
    <div style="border-top:2px solid rgba(255,255,255,.25);padding-top:22px;display:flex;justify-content:space-between;font-size:64px;font-weight:900">
      <span>${tx("Summe", "Total")}</span><span>${tx("", "€")}<span class="count" style="--to:94;animation:count 1.6s ease-out 3.4s both"></span>${tx(" €", "")}</span></div>
  </div>`),
  beat(6.6, 9.2, `<div class="center col">${kolbi("happy-shades", 420)}${big(tx("Teste, was <span class='grad'>bei dir</span><br>einen Unterschied macht.<br>Spar dir den Rest. ✂️", "Test what makes<br>a difference <span class='grad'>for you</span>.<br>Skip the rest. ✂️"), 92)}</div>`),
  ctaEnd(9.2),
] }

V["05-kolbi-entdeckt-muster"] = { dur: 11, cover: 3.6, html: [
  beat(0.1, 2.3, `<div class="center col">${kolbi("think-alive", 440)}${big(tx("Kolbi hat in<br>deinen Daten<br>was entdeckt 🔎", "Kolbi found<br>something in<br>your data 🔎"), 104)}</div>`),
  beat(2.3, 6.4, `<div class="card col" style="display:flex;width:100%">
    <div style="display:flex;align-items:center;gap:26px"><span style="font-size:110px">🍷</span><div><div class="big" style="font-size:66px;text-align:left">${tx("An Tagen mit Alkohol", "On days with alcohol")}</div><div class="small" style="text-align:left">${tx("🌙 dein Schlaf", "🌙 your sleep")}</div></div></div>
    ${[[tx("mit", "with"), 2.3, "#e34948"], [tx("ohne", "without"), 3.6, "#b4b0d6"]].map(([l, v, c], i) => `<div style="display:flex;align-items:center;gap:24px;font-size:52px;font-weight:900">
      <span style="width:${tx(150, 230)}px;text-align:right;opacity:.8">${l}</span><span style="flex:1;height:40px;border-radius:20px;background:rgba(255,255,255,.12);overflow:hidden"><span style="display:block;height:100%;width:${v * 20}%;background:${c};border-radius:20px;animation:grow .9s ease-out ${3 + i * 0.3}s both"></span></span><span style="width:130px">${tx(String(v).replace(".", ","), String(v))}★</span></div>`).join("")}
    <div style="font-size:120px;font-weight:900;color:#ff8a8a;text-align:center;animation:pop .6s cubic-bezier(.3,1.5,.5,1) 4.2s both">${tx("−1,3★", "−1.3★")}</div>
    ${small(tx("Beispiel · deine eigenen Bewertungen", "Example · your own ratings"))}
  </div>`),
  beat(6.4, 8.6, `<div class="center col">${kolbi("party-glow", 420)}${big(tx("Muster, die dir<br>selbst nie<br>auffallen würden.", "Patterns you'd<br>never notice<br>on your own."), 100)}</div>`),
  ctaEnd(8.6),
] }

// ── Rendern ──────────────────────────────────────────────────────────────────
const only = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H } })
for (const [name, v] of Object.entries(V)) {
  if (only.length && !only.some(o => name.includes(o))) continue
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="bg"></div>${v.html.join("")}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  const dir = `${TMP}/${name}`
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
  const frames = Math.round(v.dur * FPS)
  for (let f = 0; f < frames; f++) {
    await page.evaluate(ms => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms } }, (f / FPS) * 1000)
    await page.screenshot({ path: `${dir}/${String(f).padStart(4, "0")}.jpg`, type: "jpeg", quality: 92 })
  }
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${dir}/%04d.jpg`, "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${OUT}/${name}.mp4`])
  fs.copyFileSync(`${dir}/${String(Math.round(v.cover * FPS)).padStart(4, "0")}.jpg`, `${OUT}/${name}-cover.jpg`)
  fs.rmSync(dir, { recursive: true, force: true })
  console.log("✓", name, `${(fs.statSync(`${OUT}/${name}.mp4`).size / 1e6).toFixed(1)} MB`)
}
await browser.close()
