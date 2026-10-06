// Reddit-Bilder (1200×1200 PNG) – je Beitrag GENAU EIN Bild → content/reddit/reddit-0N.png
// Aufruf: node supplement-lab/marketing/content/reddit/render.mjs   (Texte: channels/reddit-posts.src.mjs)
// Regeln (brand/BRAND.md, legal/health-claims-check.md):
//  · 01–05 sind Mehrwert-Bilder: KEIN Kolbi, kein Logo, kein Link.
//  · keine Wirkversprechen, keine Dosen, keine echten Nutzerzahlen; jede Beispielzahl sichtbar als Beispiel markiert.
//  · Sprache = Sprache des Beitrags (04 + 08 DE, Rest EN).
//  · 06–08 nutzen die Store-Screenshots (Beispiel-Daten) → Kennzeichnung „Example data“/„Beispiel-Daten“ im Bild.
import { createRequire } from "module"
import fs from "fs"
import path from "path"
const require = createRequire(import.meta.url)
const { chromium } = require("/opt/node22/lib/node_modules/playwright")

const HERE = path.dirname(new URL(import.meta.url).pathname)
const MK = path.resolve(HERE, "../..") // supplement-lab/marketing
const FONT = fs.readFileSync(path.join(MK, "brand/fonts/Nunito-latin.woff2")).toString("base64")
const png = f => `data:image/png;base64,${fs.readFileSync(path.join(MK, f)).toString("base64")}`

// Phone-Ausschnitt aus den gestalteten Store-Screenshots (1290×2796; Phone-Rahmen bei x150 y642, 990×2145).
// h = sichtbarer Anteil der Phone-Höhe (unten weich ausgeblendet).
const phone = (file, w, h = 0.72) => {
  const s = w / 990
  const rad = Math.round(150 * s)
  return `<div class="ph" style="width:${w}px;height:${Math.round(2145 * s * h)}px;border-radius:${rad}px ${rad}px 0 0">
    <img src="${png(file)}" style="width:${1290 * s}px;margin-left:${-150 * s}px;margin-top:${-642 * s}px"></div>`
}

const BASE = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${FONT}) format("woff2");font-weight:200 1000}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1200px;height:1200px;overflow:hidden;position:relative;font-family:Nunito,"DejaVu Sans","Noto Color Emoji",sans-serif;color:#f4f2ff;
 background:radial-gradient(45% 35% at 10% 5%,#9085e966,transparent 70%),radial-gradient(45% 35% at 100% 45%,#3987e555,transparent 70%),radial-gradient(50% 35% at 60% 105%,#e87ba455,transparent 70%),#14122b}
.g{background:linear-gradient(90deg,#7CF5C0,#9ad0ff);-webkit-background-clip:text;color:transparent}
h1{font-weight:900;letter-spacing:-.015em;line-height:1.04}
.ex{display:inline-block;padding:8px 20px;border-radius:999px;background:#ffd166;color:#14122b;font-size:26px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
.ph{position:relative;overflow:hidden;flex-shrink:0;box-shadow:0 30px 60px rgba(0,0,0,.45);
 -webkit-mask-image:linear-gradient(180deg,#000 82%,transparent 100%);mask-image:linear-gradient(180deg,#000 82%,transparent 100%)}
.ph img{display:block}`

// ─────────────────────────── 01 · Protokoll-Vorlage (EN) ───────────────────────────
const boxes = `<span class="bx">1</span><span class="bx">2</span><span class="bx">3</span><span class="bx">4</span><span class="bx">5</span>`
const img01 = `<style>
.paper{position:absolute;inset:40px;background:#fbfaff;color:#1c1940;border-radius:26px;padding:46px 50px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.k{font-size:27px;font-weight:900;letter-spacing:.12em;color:#6f63d9;text-transform:uppercase}
.q{font-size:58px;font-weight:900;line-height:1.08;margin-top:8px;letter-spacing:-.01em}
.q u{text-decoration:none;background:#e9e6ff;border-radius:10px;padding:0 10px}
.phs{display:flex;align-items:stretch;gap:12px;margin-top:34px}
.p{flex:1;border-radius:20px;padding:16px 18px;text-align:center}
.p b{display:block;font-size:34px;font-weight:900;letter-spacing:.02em}
.p i{display:block;font-style:normal;font-size:30px;font-weight:800;margin-top:2px}
.p s{display:block;text-decoration:none;font-size:27px;font-weight:700;opacity:.8;margin-top:2px}
.ar{align-self:center;font-size:40px;font-weight:900;color:#8c86b8}
.sec{margin-top:36px;font-size:26px;font-weight:900;letter-spacing:.1em;color:#6f63d9;text-transform:uppercase}
.rates{display:grid;grid-template-columns:1fr 1fr;gap:16px 44px;margin-top:14px}
.r{display:flex;align-items:center;justify-content:space-between;font-size:38px;font-weight:900}
.bx{display:inline-flex;width:48px;height:48px;margin-left:7px;border:3px solid #b9b3e6;border-radius:10px;align-items:center;justify-content:center;font-size:25px;font-weight:800;color:#7d77ad}
.tags{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.tags span{font-size:28px;font-weight:800;padding:7px 18px;border-radius:999px;background:#efedfa;border:2px solid #dcd8f3}
.rule{margin-top:36px;border:4px solid #1EA872;background:#eafaf2;border-radius:20px;padding:18px 24px}
.rule b{display:block;font-size:26px;font-weight:900;letter-spacing:.1em;color:#137a52;text-transform:uppercase}
.rule p{font-size:36px;font-weight:800;line-height:1.2;margin-top:6px}
</style>
<div class="paper">
  <div class="k">n=1 supplement test · template</div>
  <div class="q">Do I notice a difference with <u>[X]</u> compared with my normal?</div>
  <div class="phs">
    <div class="p" style="background:#ecebf5;border:3px solid #cfcbe6"><b>1 · NORMAL</b><i>7 evenings</i><s>change nothing</s></div>
    <div class="ar">→</div>
    <div class="p" style="background:#2ECC8A;color:#0d2a1e;border:3px solid #22b077"><b>2 · TEST</b><i>14+ evenings</i><s>add only [X]</s></div>
    <div class="ar">→</div>
    <div class="p" style="background:#fff;border:3px dashed #a79fe0"><b>3 · OFF AGAIN</b><i>5–7 evenings</i><s>optional</s></div>
  </div>
  <div class="sec">Every evening · same time · ~1 minute · 1–5</div>
  <div class="rates">
    <div class="r">Sleep<span>${boxes}</span></div><div class="r">Energy<span>${boxes}</span></div>
    <div class="r">Calm<span>${boxes}</span></div><div class="r">Focus<span>${boxes}</span></div>
  </div>
  <div class="sec">Tag it, don't skip the day</div>
  <div class="tags"><span>alcohol</span><span>short night</span><span>hard training</span><span>stressful day</span><span>sick</span><span>travel</span></div>
  <div class="rule"><b>Decision rule · write it before day 1</b><p>“Keep if my main rating is clearly above my normal swing. Otherwise drop.”</p></div>
  <div style="margin-top:22px;font-size:27px;font-weight:800;color:#5d5890">Missed an evening? Leave it blank – don't fill it in from memory.</div>
</div>`

// ─────────────────────────── 02 · Baseline-Diagramm (EN) ───────────────────────────
const BASEL = [3, 4, 3, 2, 4, 3, 4] // Ø 3,29 · Spanne 2–4 (wie im Beitragstext)
const TEST = [3, 4, 4, 3, 3, 4, 3, 4, 4, 3, 3, 4, 3, 4] // Ø 3,5
const img02 = (() => {
  const W = 1080, H = 680, L = 70, R = 30, T = 30, B = 70
  const n = BASEL.length + TEST.length
  const x = i => L + (i + 0.5) * (W - L - R) / n
  const y = v => T + (5 - v) * (H - T - B) / 4
  const all = [...BASEL, ...TEST]
  const xSplit = L + BASEL.length * (W - L - R) / n
  const avgB = BASEL.reduce((a, b) => a + b) / BASEL.length, avgT = TEST.reduce((a, b) => a + b) / TEST.length
  const grid = [1, 2, 3, 4, 5].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#ffffff1f" stroke-width="2"/><text x="${L - 22}" y="${y(v) + 10}" text-anchor="end" font-size="28" font-weight="800" fill="#b4b0d6">${v}</text>`).join("")
  const pts = all.map((v, i) => `${x(i)},${y(v)}`).join(" ")
  const dots = all.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="10" fill="${i < BASEL.length ? "#c9c4f2" : "#2ECC8A"}" stroke="#14122b" stroke-width="4"/>`).join("")
  return `<style>
  .hd{position:absolute;left:60px;right:60px;top:52px}
  .hd h1{font-size:76px}.hd p{font-size:36px;font-weight:800;color:#d6d2f2;margin-top:14px}
  .ex{position:absolute;right:60px;top:60px}
  svg{position:absolute;left:60px;top:300px}
  .note{position:absolute;left:60px;right:60px;bottom:52px;font-size:31px;font-weight:800;line-height:1.25;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.16);border-radius:22px;padding:18px 26px}
  .note b{color:#7CF5C0}
  </style>
  <div class="hd"><h1>Your normal<br><span class="g">swings on its own</span></h1><p>Measure the swing first – then judge the test.</p></div>
  <div class="ex">Example data</div>
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Nunito">
    <rect x="${L}" y="${T}" width="${xSplit - L}" height="${H - T - B}" fill="#ffffff0d"/>
    ${grid}
    <rect x="${L}" y="${y(4)}" width="${W - L - R}" height="${y(2) - y(4)}" fill="#9085e94d" rx="6"/>
    <text x="${W - R - 14}" y="${y(2) - 18}" text-anchor="end" font-size="27" font-weight="900" fill="#e4e0ff">normal swing: 2–4</text>
    <line x1="${L}" x2="${W - R}" y1="${y(avgB)}" y2="${y(avgB)}" stroke="#e4e0ff" stroke-width="3" stroke-dasharray="10 9"/>
    <line x1="${xSplit}" x2="${W - R}" y1="${y(avgT)}" y2="${y(avgT)}" stroke="#2ECC8A" stroke-width="5"/>
    <line x1="${xSplit}" x2="${xSplit}" y1="${T}" y2="${H - B}" stroke="#ffffff66" stroke-width="3"/>
    <polyline points="${pts}" fill="none" stroke="#ffffff59" stroke-width="3"/>
    ${dots}
    <text x="${(L + xSplit) / 2}" y="${H - 22}" text-anchor="middle" font-size="30" font-weight="900" fill="#e4e0ff">NORMAL WEEK</text>
    <text x="${(xSplit + W - R) / 2}" y="${H - 22}" text-anchor="middle" font-size="30" font-weight="900" fill="#7CF5C0">TEST (2 WEEKS)</text>
  </svg>
  <div class="note">Normal average ${avgB.toFixed(1)} (dashed) · test average <b>${avgT.toFixed(1)}</b> (green) → still <b>inside the swing</b>. On its own, that's hard to tell apart from a normal week.</div>`
})()

// ─────────────────────────── 03 · Placebo erschweren (EN) ───────────────────────────
const img03 = `<style>
.hd{position:absolute;left:60px;right:60px;top:50px}.hd h1{font-size:66px}
.grid{position:absolute;left:60px;right:60px;top:268px;display:grid;grid-template-columns:1fr 1fr;gap:26px}
.c{height:400px;border-radius:30px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.16);padding:26px 30px;display:flex;flex-direction:column}
.v{height:170px;display:flex;align-items:center;justify-content:center}
.c h2{font-size:40px;font-weight:900;line-height:1.08;margin-top:12px}
.c p{font-size:27px;font-weight:700;color:#d6d2f2;margin-top:8px;line-height:1.2}
.n{color:#7CF5C0}
.ab{display:flex;gap:8px}.ab span{width:96px;height:96px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900}
.off{background:#3a3760;color:#d6d2f2}.on{background:#2ECC8A;color:#0d2a1e}
.note{width:330px;background:#fbfaff;color:#1c1940;border-radius:14px;padding:14px 18px;transform:rotate(-3deg);box-shadow:0 12px 30px rgba(0,0,0,.4)}
.note small{display:block;font-size:20px;font-weight:900;letter-spacing:.1em;color:#6f63d9}
.note div{font-size:27px;font-weight:900;line-height:1.15;margin-top:4px}
.caps{display:flex;gap:30px;align-items:center}
.cap{position:relative;width:150px;height:62px;border-radius:999px;background:linear-gradient(90deg,#e9e6ff 50%,#c9c4f2 50%);box-shadow:0 8px 20px rgba(0,0,0,.35)}
.cap b{position:absolute;top:-46px;left:50%;transform:translateX(-50%);font-size:30px;font-weight:900}
.foot{position:absolute;left:60px;right:60px;bottom:40px;text-align:center;font-size:27px;font-weight:800;color:#b4b0d6}
</style>
<div class="hd"><h1>Placebo in a self-test:<br><span class="g">4 ways to make it harder</span></h1></div>
<div class="grid">
  <div class="c"><div class="v"><div class="note"><small>DAY 0 · BEFORE START</small><div>Keep only if clearly above my normal swing.</div></div></div>
    <h2><span class="n">1</span> Write the rule first</h2><p>Metric + decision rule, before day 1.</p></div>
  <div class="c"><div class="v"><svg width="420" height="150" viewBox="0 0 420 150">
      <rect x="0" y="40" width="420" height="70" rx="10" fill="#9085e94d"/>
      <polyline points="10,90 70,55 130,80 190,100 250,60 310,85 370,70 410,62" fill="none" stroke="#e4e0ff" stroke-width="6" stroke-linejoin="round"/>
      <text x="410" y="140" text-anchor="end" font-family="Nunito" font-size="24" font-weight="900" fill="#d6d2f2">your normal swing</text></svg></div>
    <h2><span class="n">2</span> Measure your normal first</h2><p>A week with no changes. Did you start from a low?</p></div>
  <div class="c"><div class="v"><div class="ab"><span class="off">OFF</span><span class="on">ON</span><span class="off">OFF</span><span class="on">ON</span></div></div>
    <h2><span class="n">3</span> Switch more than once</h2><p>A-B-A-B: do your ratings follow the switches?</p></div>
  <div class="c"><div class="v"><div class="caps"><div class="cap"><b>#1</b></div><div class="cap"><b>#2</b></div><div style="font-size:70px;font-weight:900;color:#ffd166">?</div></div></div>
    <h2><span class="n">4</span> Blind it, if you can</h2><p>Someone else fills numbered containers and keeps the key.</p></div>
</div>
<div class="foot">Still n=1 – not a study. It just makes the answer more honest.</div>`

// ─────────────────────────── 04 · 6 Störfaktoren (DE) ───────────────────────────
const D04 = [["🏋️", "Trainingsphase", "nicht mitten im Planwechsel starten"], ["🍽️", "Diät oder Aufbau", "Ernährung möglichst stabil"],
  ["🌙", "Schlafdauer", "Stunden notieren"], ["🍺", "Alkohol", "als Tag markieren"],
  ["☕", "Koffein", "Menge + Uhrzeit gleich"], ["✈️", "Stress, Infekt,<br>Reisen", "markieren, nicht streichen"]]
const img04 = `<style>
.hd{position:absolute;left:60px;right:60px;top:48px}.hd h1{font-size:62px}
.grid{position:absolute;left:60px;right:60px;top:262px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:22px}
.t{height:360px;border-radius:30px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.16);padding:24px 22px;text-align:center;display:flex;flex-direction:column;align-items:center}
.t .e{font-size:92px;line-height:1.1;font-family:"Noto Color Emoji"}
.t h2{font-size:36px;font-weight:900;line-height:1.08;margin-top:14px}
.t p{font-size:26px;font-weight:700;color:#d6d2f2;margin-top:8px;line-height:1.2}
.n{position:absolute;margin:-8px 0 0 -250px;font-size:26px;font-weight:900;color:#7CF5C0}
.foot{position:absolute;left:60px;right:60px;bottom:44px;font-size:31px;font-weight:800;line-height:1.25;background:#2ECC8A;color:#0d2a1e;border-radius:22px;padding:18px 26px;text-align:center}
</style>
<div class="hd"><h1>6 Störfaktoren, die deinen<br><span class="g">Supplement-Selbsttest</span> verfälschen</h1></div>
<div class="grid">${D04.map(([e, h, p], i) => `<div class="t"><span class="n">${i + 1}</span><div class="e">${e}</div><h2>${h}</h2><p>${p}</p></div>`).join("")}</div>
<div class="foot">Markieren statt Tage streichen – dann normale Tage mit normalen Tagen vergleichen.</div>`

// ─────────────────────────── 05 · Selbsttest vs. Bluttest (EN) ───────────────────────────
const stars = `<div style="display:flex;gap:6px">${[1, 2, 3, 4, 5].map(i => `<svg width="52" height="52" viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" fill="${i <= 4 ? "#ffd166" : "#3a3760"}"/></svg>`).join("")}</div>`
const report = `<svg width="120" height="120" viewBox="0 0 120 120"><rect x="22" y="8" width="76" height="104" rx="10" fill="#e9e6ff"/>
  ${[30, 48, 66, 84].map((yy, i) => `<rect x="34" y="${yy}" width="30" height="8" rx="4" fill="#8c86b8"/><rect x="${70}" y="${yy}" width="${[16, 12, 18, 10][i]}" height="8" rx="4" fill="#3987e5"/>`).join("")}</svg>`
const img05 = `<style>
.hd{position:absolute;left:60px;right:60px;top:50px}.hd h1{font-size:66px}
.cols{position:absolute;left:60px;right:60px;top:268px;display:grid;grid-template-columns:1fr 1fr;gap:26px}
.col{height:700px;border-radius:30px;padding:28px 30px;border:3px solid}
.col .v{height:110px;display:flex;align-items:center}
.col h2{font-size:46px;font-weight:900;margin-top:8px}
.col .s{font-size:27px;font-weight:800;color:#d6d2f2}
.col .lab{font-size:22px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-top:26px;color:#b4b0d6}
.col li{list-style:none;font-size:32px;font-weight:800;line-height:1.18;margin-top:16px;padding-left:46px;position:relative}
.col li:before{content:"?";position:absolute;left:0;top:0;width:34px;height:34px;border-radius:50%;font-size:24px;font-weight:900;display:flex;align-items:center;justify-content:center;color:#14122b}
.a{background:rgba(46,204,138,.1);border-color:#2ECC8A}.a li:before{background:#2ECC8A}
.b{background:rgba(57,135,229,.12);border-color:#3987e5}.b li:before{background:#9ad0ff}
.col li.x:before{content:"✕";background:#5a5680;color:#e4e0ff}.col li.x{color:#b4b0d6}
.foot{position:absolute;left:60px;right:60px;bottom:44px;font-size:31px;font-weight:800;text-align:center;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.16);border-radius:22px;padding:16px 24px}
</style>
<div class="hd"><h1>Self-test or blood test?<br><span class="g">Two tools, two questions</span></h1></div>
<div class="cols">
  <div class="col a"><div class="v">${stars}</div><h2>Self-test</h2><div class="s">same 1–5 ratings every evening</div>
    <div class="lab">Good for</div><ul><li>Do I notice a difference?</li><li>Is it worth the money for me?</li><li>Keep, maybe or drop?</li></ul>
    <div class="lab">Can't answer</div><ul><li class="x">Am I low in something?</li></ul></div>
  <div class="col b"><div class="v">${report}</div><h2>Blood test</h2><div class="s">ordered with your doctor</div>
    <div class="lab">Good for</div><ul><li>Am I low in something?</li><li>How do my values change at re-tests?</li></ul>
    <div class="lab">Can't answer</div><ul><li class="x">Do I notice a difference day to day?</li></ul></div>
</div>
<div class="foot">The right dose? Neither one – ask a doctor or pharmacist.</div>`

// ─────────────────────────── 06–08 · Kolbi-Collagen ───────────────────────────
const kolbiHead = (title, sub) => `<div style="position:absolute;left:60px;right:60px;top:44px;display:flex;align-items:center;gap:26px">
  <img src="${png("brand/png/kolbi-happy.png")}" style="width:128px;height:128px;flex-shrink:0">
  <div><h1 style="font-size:58px">${title}</h1><p style="font-size:30px;font-weight:800;color:#d6d2f2;margin-top:8px">${sub}</p></div></div>`
const three = (lang, shots, labels, top = 224, h = 1) => `<div style="position:absolute;left:44px;right:44px;top:${top}px;display:flex;justify-content:space-between">
  ${shots.map((f, i) => `<div style="width:352px;display:flex;flex-direction:column;align-items:center">
    <div style="height:96px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:32px;font-weight:900;line-height:1.08"><span><span style="color:#7CF5C0">${i + 1} ·</span> ${labels[i]}</span></div>
    <div style="margin-top:14px">${phone(`store/screenshots-${lang}/${f}`, 340, h)}</div></div>`).join("")}</div>`
const exTag = t => `<div class="ex" style="position:absolute;left:50%;bottom:34px;transform:translateX(-50%)">${t}</div>`

const img06 = `${kolbiHead('Test supplements <span class="g">one at a time</span>', "Free web app · no account · data stays on your device")}
${three("en", ["02-3b-checkin.png", "03-4-muster.png", "04-5-kosten.png"], ["1-minute check-in", "Compared with your normal", "See what your stack costs"])}
${exTag("Example data")}`

const STEPS07 = [["Rate your normal", "5–7 evenings, no changes"], ["Test one supplement", "nothing else new"], ["1-minute rating", "every evening, tag disruptors"], ["Compare", "test vs. your own normal"], ["Decide", "keep · maybe · drop"]]
const img07 = `<style>.st{display:flex;gap:18px;align-items:flex-start;margin-bottom:26px}.st b{flex-shrink:0;width:52px;height:52px;border-radius:50%;background:#2ECC8A;color:#0d2a1e;font-size:30px;font-weight:900;display:flex;align-items:center;justify-content:center}
.st h3{font-size:34px;font-weight:900;line-height:1.1}.st p{font-size:25px;font-weight:700;color:#d6d2f2;margin-top:2px}</style>
${kolbiHead('An n-of-1 protocol –<br><span class="g">the app keeps the log</span>', "The method is simple. The bookkeeping is the hard part.")}
<div style="position:absolute;left:60px;top:300px;width:430px">
  <div style="font-size:23px;font-weight:900;letter-spacing:.1em;color:#b4b0d6;margin-bottom:22px">THE PROTOCOL</div>
  ${STEPS07.map(([h, p], i) => `<div class="st"><b>${i + 1}</b><div><h3>${h}</h3><p>${p}</p></div></div>`).join("")}
  <div style="font-size:24px;font-weight:800;color:#b4b0d6;line-height:1.25;margin-top:6px">n=1, not blinded by default –<br>a self-experiment, not a study.</div>
</div>
<div style="position:absolute;right:44px;top:296px;display:flex;gap:22px">
  ${["02-3b-checkin.png", "03-4-muster.png"].map(f => `${phone(`store/screenshots-en/${f}`, 310, 0.99)}`).join("")}
</div>
<div class="ex" style="position:absolute;left:60px;bottom:44px">Example data</div>`

const img08 = `${kolbiHead('Supplements <span class="g">einzeln testen</span><br>statt alle gleichzeitig', "Kostenlos · ohne Konto · Daten bleiben auf dem Handy")}
${three("de", ["01-1-heute.png", "03-4-muster.png", "04-5-kosten.png"], ["Eins nach dem anderen", "Störfaktoren wie Alkohol, Training", "Kosten pro Monat"], 254, 0.97)}
${exTag("Beispiel-Daten")}`

const IMAGES = { "reddit-01": img01, "reddit-02": img02, "reddit-03": img03, "reddit-04": img04, "reddit-05": img05, "reddit-06": img06, "reddit-07": img07, "reddit-08": img08 }

const only = process.argv[2]
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 })).newPage()
for (const [name, html] of Object.entries(IMAGES)) {
  if (only && !name.endsWith(only)) continue
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${BASE}</style></head><body>${html}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)
  // Selbstkontrolle: nichts darf über den Bildrand ragen.
  const out = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(e => {
    const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.top < -1 || r.right > 1201 || r.bottom > 1201) && !e.closest(".ph")
  }).map(e => e.tagName + "." + e.className + " " + (e.textContent || "").slice(0, 30)))
  if (out.length) console.log("⚠️", name, "ragt über den Rand:", out)
  await page.screenshot({ path: path.join(HERE, `${name}.png`) })
  console.log("✓", name + ".png")
}
await browser.close()
