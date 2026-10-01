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
const ctaEnd = (a, sub) => beat(a, null, `
  <div class="center col">
    <div class="float">${kolbi("party-alive", 460)}</div>
    ${big(tx("Finde raus, was<br>bei <span class='grad'>DIR</span> wirkt.", "Find out what<br>works for <span class='grad'>YOU</span>."), 92)}
    <div class="pill">🧪 Kolbi · Supplement Lab</div>
    ${small(sub || tx("Kostenlos in der Beta · Link in Bio", "Free during the beta · link in bio"))}
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
.count2{counter-reset:n var(--n)}
.count2::before{content:counter(n,decimal-leading-zero)}
.beat.safe{padding:160px 165px 400px 110px}
.badge{display:flex;align-items:center;justify-content:center;width:120px;height:120px;border-radius:50%;background:#e34948;font-size:72px;font-weight:900;box-shadow:0 10px 40px rgba(227,73,72,.45)}
.fix{font-size:50px;font-weight:900;padding:18px 34px;border-radius:32px;background:#1baf7a;line-height:1.15;text-align:center}
@keyframes fadein{from{opacity:0}}
@keyframes growh{from{height:0}}
@keyframes drop{0%{opacity:0;transform:translateY(-1100px) rotate(var(--r))}70%{opacity:1;transform:translateY(18px) rotate(0)}85%{transform:translateY(-10px)}100%{opacity:1;transform:none}}
@keyframes flip{to{transform:rotateY(180deg)}}
.flip{perspective:1800px}
.flip-in{position:relative;width:100%;height:100%;transform-style:preserve-3d}
.face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;padding:24px}
.face.back{transform:rotateY(180deg);box-shadow:0 30px 80px rgba(0,0,0,.3)}
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

// ── Serie 2 (06–12) ──────────────────────────────────────────────────────────
// Safe Zones: Text bleibt aus den unteren 20 % und dem rechten Rand (TikTok-Buttons) raus → sb() statt beat().
// Health-Claims: nur über die Methode reden (testen, vergleichen, eigene Daten, sparen). Zahlen = „Beispiel“.
const sb = (a, b, html, o = {}) => beat(a, b, html, { ...o, cls: `safe ${o.cls || ""}` })
const at = (a, d = 0.5) => `animation:pop ${d}s cubic-bezier(.3,1.5,.5,1) ${a}s both`

const mistake = (n, emo, title, fix, a) => `<div class="card center col" style="width:100%;gap:30px">
  <div style="display:flex;align-items:center;gap:26px"><div class="badge">${n}</div><div style="font-size:96px">${emo}</div></div>
  ${big(title, 84)}
  <div class="fix" style="${at(a + 1.0)}">✅ ${fix}</div></div>`
V["06-drei-fehler"] = { dur: 12, cover: 1.0, html: [
  sb(0.1, 2.2, `<div class="center col"><div style="animation:shake .4s ease-in-out .5s 3">${kolbi("alert", 400)}</div>${big(tx("3 Fehler beim<br>Supplement-<br>Testen ❌", "3 mistakes<br>when testing<br>supplements ❌"), 96)}</div>`),
  sb(2.2, 4.6, mistake(1, "💊🌿🍵", tx("Alles<br>gleichzeitig", "Everything<br>at once"), tx("Eins nach<br>dem anderen", "One at<br>a time"), 2.2), { inn: "slidein", out: "slideout" }),
  sb(4.6, 7.0, mistake(2, "❓", tx("Kein Normal", "No baseline"), tx("Erst ein paar Tage<br>dein Normal messen", "First a few days<br>to learn your normal"), 4.6), { inn: "slidein", out: "slideout" }),
  sb(7.0, 9.4, mistake(3, "⏱️", tx("Nach 2 Tagen<br>aufgeben", "Quitting<br>after 2 days"), tx("Jedem Test<br>genug Tage geben", "Give each test<br>enough days"), 7.0), { inn: "slidein", out: "slideout" }),
  ctaEnd(9.4),
] }

V["07-tag-1-vs-tag-14"] = { dur: 12.6, cover: 1.6, html: [
  sb(0.1, 2.8, `<div class="center col">${big(tx("Tag 1 <span style='opacity:.6'>vs.</span> Tag 14", "Day 1 <span style='opacity:.6'>vs.</span> Day 14"), 88)}
    <div style="display:flex;gap:30px;align-items:flex-end">
      <div class="center col" style="gap:14px">${kolbi("happy-empty", 340)}<div class="pill">${tx("Tag 1", "Day 1")}</div></div>
      <div class="center col" style="gap:14px;${at(1.0, 0.55)}">${kolbi("happy-glow", 340)}<div class="pill" style="background:#1baf7a">${tx("Tag 14", "Day 14")}</div></div>
    </div></div>`),
  sb(2.8, 4.8, `<div class="center col">${kolbi("think-murky", 420)}${big(tx("Tag 1:<br>keine Daten.<br>Nur Bauchgefühl.", "Day 1:<br>no data.<br>Just a gut feeling."), 88)}</div>`),
  sb(4.8, 8.0, `<div class="card center col" style="width:100%;gap:30px">
    <div style="font-size:150px;font-weight:900;line-height:1">🔥 <span class="count" style="--to:14;animation:count 2.4s linear 5.0s both"></span></div>
    ${big(tx("Check-ins<br>in Folge", "check-ins<br>in a row"), 64)}
    <div style="display:grid;grid-template-columns:repeat(7,80px);gap:14px">
      ${Array.from({ length: 14 }, (_, i) => `<div style="width:80px;height:80px;border-radius:22px;background:rgba(255,255,255,.12);position:relative"><div style="position:absolute;inset:0;border-radius:22px;background:#2ECC8A;display:flex;align-items:center;justify-content:center;font-size:46px;font-weight:900;${at(5.0 + ((i + 1) * 2.4) / 14 - 0.12, 0.35)}">✓</div></div>`).join("")}
    </div>
    ${small(tx("je 1 Minute am Abend", "1 minute each evening"))}</div>`),
  sb(8.0, 10.2, `<div class="center col">${kolbi("happy-glow", 420)}${big(tx("Tag 14:<br><span class='grad'>deine eigenen<br>Daten.</span>", "Day 14:<br><span class='grad'>your own<br>data.</span>"), 92)}${small(tx("Jetzt kannst du vergleichen.", "Now you can compare."))}</div>`),
  ctaEnd(10.2),
] }

const vbar = (label, v, txt, c, a) => `<div class="center col" style="gap:14px;justify-content:flex-end;height:100%">
  <div style="font-size:56px;font-weight:900;${at(a + 0.7, 0.4)}">${txt}★</div>
  <div style="width:190px;height:${Math.round(v * 90)}px;border-radius:28px 28px 12px 12px;background:${c};animation:growh .8s ease-out ${a}s both"></div>
  <div style="font-size:46px;font-weight:900">${label}</div></div>`
V["08-was-ist-eine-baseline"] = { dur: 12.8, cover: 6.8, html: [
  sb(0.1, 2.2, `<div class="center col">${kolbi("think-alive", 420)}${big(tx("Was ist eine<br><span class='grad'>Baseline</span>? 🤔", "What's a<br><span class='grad'>baseline</span>? 🤔"), 100)}</div>`),
  sb(2.2, 4.4, `<div class="center col">${kolbi("happy", 360)}${big(tx("= dein <span class='grad'>Normal</span>.", "= your <span class='grad'>normal</span>."), 100)}${small(tx("Ein paar Abende bewerten –<br>ohne etwas Neues.", "Rate a few evenings –<br>with nothing new."))}</div>`),
  sb(4.4, 8.4, `<div class="card center col" style="width:100%;gap:24px">
    ${big(tx("⭐ Deine Tagesbewertung", "⭐ Your daily rating"), 52)}
    <div style="display:flex;align-items:flex-end;gap:70px;height:540px">${vbar("Normal", 3.4, tx("3,4", "3.4"), "#b4b0d6", 4.7)}${vbar("Test", 3.9, tx("3,9", "3.9"), "#2ECC8A", 5.5)}</div>
    <div style="font-size:100px;font-weight:900;color:#7CF5C0;${at(6.4, 0.6)}">${tx("+0,5★", "+0.5★")}</div>
    ${small(tx("Beispiel · eigene Bewertungen", "Example · your own ratings"))}</div>`),
  sb(8.4, 10.4, `<div class="center col">${kolbi("happy-shades", 420)}${big(tx("Ohne Normal<br><span class='grad'>kein Vergleich.</span>", "No baseline,<br><span class='grad'>no comparison.</span>"), 96)}</div>`),
  ctaEnd(10.4),
] }

const shelf = ["🫙", "💊", "🧴", "🫙", "🍵", "🌿", "🫙", "🐟", "💊", "🧴", "⚡", "🫙", "🌙", "💊", "🫙", "🌞", "🧴", "🫙"]
const shelfPos = [5, 4, 4, 3, 2].flatMap((n, r) => Array.from({ length: n }, (_, k) => [512 + (k - (n - 1) / 2) * 150 - 65, 1330 - r * 125]))
V["09-pov-supplement-schrank"] = { dur: 11.8, cover: 4.4, html: [
  `<div class="beat" style="padding:0;display:block;animation:fadein .3s ease-out .1s both, fadeout .35s ease-in 7.05s forwards">${shelf.map((e, i) => {
    const [x, y] = shelfPos[i]
    return `<span style="position:absolute;left:${x}px;top:${y}px;font-size:130px;line-height:1;--r:${(i % 2 ? 1 : -1) * (20 + i * 7)}deg;animation:drop .6s ease-out ${0.4 + i * 0.1}s both">${e}</span>`
  }).join("")}</div>`,
  sb(0.1, 3.6, `<div class="center col" style="gap:20px">${small("POV:")}${big(tx("Dein<br>Supplement-<br>Schrank 🫙", "Your<br>supplement<br>shelf 🫙"), 96)}</div>`, { style: "align-items:flex-start" }),
  sb(3.6, 7.4, `<div class="center col" style="gap:24px">${kolbi("happy-shades", 300)}${big(tx("Welches davon<br>merkst du<br><span class='grad'>wirklich</span>? 👀", "Which of these<br>do you <span class='grad'>actually</span><br>notice? 👀"), 84)}</div>`, { style: "align-items:flex-start" }),
  sb(7.4, 9.4, `<div class="center col">${kolbi("think-alive", 380)}${big(tx("Eins nach dem<br>anderen testen.<br><span class='grad'>Nur behalten, was<br>du merkst.</span>", "Test them<br>one at a time.<br><span class='grad'>Keep only what<br>you notice.</span>"), 84)}</div>`),
  ctaEnd(9.4),
] }

const flipCard = (name, a, bg, back) => `<div class="flip" style="width:370px;height:540px"><div class="flip-in" style="animation:flip .8s cubic-bezier(.45,1.35,.5,1) ${a}s both">
  <div class="face card"><div style="font-size:170px;font-weight:900;line-height:1">?</div><div style="font-size:44px;font-weight:900">${name}</div></div>
  <div class="face back" style="background:${bg}">${back}</div></div></div>`
const flipBack = (emo, verdict, val, note) => `<div style="font-size:110px;line-height:1">${emo}</div><div style="font-size:62px;font-weight:900">${verdict}</div>
  <div style="font-size:76px;font-weight:900">${val}</div><div style="font-size:34px;font-weight:800;opacity:.9">${note}</div>`
V["10-behalten-oder-raus"] = { dur: 11.6, cover: 5.6, html: [
  sb(0.1, 2.2, `<div class="center col">${kolbi("think-alive", 420)}${big(tx("Behalten<br>oder raus? 🤔", "Keep it<br>or drop it? 🤔"), 104)}</div>`),
  sb(2.2, 6.6, `<div class="center col" style="gap:30px">${big(tx("Nach dem Test:", "After the test:"), 76)}
    <div style="display:flex;gap:30px">
      ${flipCard("Supplement A", 3.0, "linear-gradient(160deg,#21c487,#0f7f58)", flipBack("💚", tx("Behalten", "Keep"), tx("+0,6★", "+0.6★"), tx("vs. dein Normal", "vs. your normal")))}
      ${flipCard("Supplement B", 4.2, "linear-gradient(160deg,#e05a59,#a8302f)", flipBack("✂️", tx("Raus", "Drop"), tx("±0,0★", "±0.0★"), tx("spart 18 €/Monat", "saves €18/month")))}
    </div>
    ${small(tx("Beispiel · vs. dein Normal", "Example · vs. your normal"))}</div>`),
  sb(6.6, 8.9, `<div class="center col">${kolbi("happy-shades", 420)}${big(tx("Du entscheidest –<br><span class='grad'>mit deinen<br>eigenen Daten.</span>", "You decide –<br><span class='grad'>with your<br>own data.</span>"), 92)}</div>`),
  ctaEnd(8.9),
] }

const rateRows = [["🌙", tx("Schlaf", "Sleep"), 4], ["⚡", tx("Energie", "Energy"), 3], ["🍃", tx("Ruhe", "Calm"), 4], ["🎯", tx("Fokus", "Focus"), 5]]
V["11-1-minute-am-abend"] = { dur: 12.8, cover: 5.6, html: [
  sb(0.1, 2.4, `<div class="center col">${kolbi("sleepy-nightcap", 420)}${big(tx("1 Minute<br>am Abend. 🌙", "1 minute 🌙<br>each evening."), 104)}${small(tx("Mehr braucht Kolbi nicht.", "That's all Kolbi needs."))}</div>`),
  sb(2.4, 8.4, `<div class="center col" style="gap:30px">
    <div class="pill" style="font-size:76px;padding:14px 40px">⏱️ 0:<span class="count2" style="--to:59;animation:count 5s linear 2.7s both reverse"></span></div>
    <div class="card col" style="display:flex;width:100%;gap:34px">
      ${big(tx("Check-in · heute", "Check-in · today"), 56)}
      ${rateRows.map(([e, l, v], i) => `<div style="display:flex;align-items:center;gap:20px">
        <span style="font-size:60px">${e}</span><span style="flex:1;font-size:50px;font-weight:900">${l}</span>
        <span style="display:flex;gap:6px">${[0, 1, 2, 3, 4].map(j => `<span style="position:relative;font-size:64px;line-height:1;color:rgba(255,255,255,.22)">★${j < v ? `<span style="position:absolute;left:0;top:0;color:#ffc93c;${at(3.0 + i * 1.1 + j * 0.18, 0.3)}">★</span>` : ""}</span>`).join("")}</span></div>`).join("")}
      <div class="pill" style="align-self:center;background:#1baf7a;font-size:52px;${at(7.3)}">${tx("✓ Gespeichert", "✓ Saved")}</div>
    </div></div>`),
  sb(8.4, 10.4, `<div class="center col">${kolbi("happy-glow", 420)}${big(tx("Fertig.<br>Kolbi rechnet<br>den Rest. 📊", "Done.<br>Kolbi does<br>the math. 📊"), 100)}</div>`),
  ctaEnd(10.4),
] }

V["12-gruender-beta"] = { dur: 11, cover: 1.2, html: [
  sb(0.1, 2.4, `<div class="center col"><div style="animation:shake .4s ease-in-out .4s 3">${kolbi("alert", 400)}</div>${big(tx("⏳ Nur bis<br><span class='grad'>30. November</span>", "⏳ Only until<br><span class='grad'>November 30</span>"), 100)}</div>`),
  sb(2.4, 5.8, `<div class="card center col" style="width:100%;gap:26px">
    <div style="font-size:130px;line-height:1">🏅</div>
    ${big(tx("Gründer-Beta", "Founder beta"), 76)}
    ${big(tx("<span class='grad'>Pro für immer<br>gratis.</span>", "<span class='grad'>Pro free<br>forever.</span>"), 96)}
    ${small(tx("Wer bis 30.11. startet,<br>behält Pro – für immer.", "Start by Nov 30 and<br>keep Pro – forever."))}</div>`),
  sb(5.8, 8.6, `<div class="center col">
    <div style="width:400px;border-radius:48px;overflow:hidden;background:#fff;color:#1a1c20;box-shadow:0 30px 80px rgba(0,0,0,.35);animation:shake .5s ease-in-out 6.3s 2">
      <div style="background:#e34948;color:#fff;font-size:64px;font-weight:900;padding:18px 0;text-align:center;letter-spacing:.08em">${tx("NOV", "NOV")}</div>
      <div style="font-size:220px;font-weight:900;line-height:1.1;text-align:center;padding-bottom:16px">30</div></div>
    ${big(tx("Ab 1.12.:<br>2,99 €/Monat.<br><span class='grad'>Jetzt: 0 €.</span>", "From Dec 1:<br>€2.99/month.<br><span class='grad'>Now: €0.</span>"), 80)}
    ${small(tx("Kein Konto nötig.", "No account needed."))}</div>`),
  ctaEnd(8.6, tx("🏅 Gründer-Pro gratis bis 30.11.<br>Link in Bio", "🏅 Founder Pro free until Nov 30<br>link in bio")),
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
