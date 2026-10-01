// Pinterest-Pins (1000×1500) DE + EN → content/pins/{de,en}/*.png  · Texte/Links: content/pins/README.md
// Aufruf (im Ordner marketing): node tools/pins.mjs   (vorher node tools/tracker.mjs – Pin 1 zeigt die Vorlage)
// Regeln: keine Wirkversprechen; Beispielzahlen als Beispiel kennzeichnen (legal/health-claims-check.md).
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")

const FONT = fs.readFileSync("brand/fonts/Nunito-latin.woff2").toString("base64")
let kid = 0
const k = (n, s) => fs.readFileSync(`brand/kolbi-${n}.svg`, "utf8").replace(/_R_[0-9a-z]*_/g, `p${kid++}`).replace(/width="512" height="512"/, `width="${s}" height="${s}"`)
const img = f => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`
const TRACKER = { de: "supplement-selbsttest-vorlage", en: "supplement-self-test-tracker" }

const CSS = `@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${FONT}) format("woff2");font-weight:200 1000}
*{box-sizing:border-box;margin:0}body{width:1000px;height:1500px;overflow:hidden;font-family:Nunito,sans-serif;color:#fff;position:relative;
background:radial-gradient(50% 30% at 15% 8%,#9085e9cc,transparent 70%),radial-gradient(45% 30% at 95% 40%,#3987e5aa,transparent 70%),radial-gradient(55% 35% at 70% 98%,#e87ba499,transparent 70%),#14122b}
.g{background:linear-gradient(90deg,#7CF5C0,#9ad0ff);-webkit-background-clip:text;color:transparent}
.chip{display:inline-block;padding:12px 26px;border-radius:999px;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.25);font-size:32px;font-weight:900}
h1{font-size:92px;line-height:1.02;font-weight:900;letter-spacing:-.01em}
.url{position:absolute;left:0;right:0;bottom:46px;text-align:center;font-size:34px;font-weight:900;opacity:.9}
.url span{display:inline-block;padding:14px 34px;border-radius:999px;background:linear-gradient(135deg,#2ECC8A,#3987e5)}`

const P = {
  de: {
    t1: ["📄 Gratis-PDF zum Ausdrucken", 'Supplements<br><span class="g">selbst testen</span>', "Dein Normal · eins nach dem anderen · vergleichen"],
    t2: ["Welches Supplement<br>bringt <span class=\"g\">dir</span> was?", "Finde es in 4 Schritten selbst raus:",
      [["think", "Normal festhalten", "5–7 Abende nichts Neues"], ["happy", "Eins nach dem anderen", "nie mehrere gleichzeitig"], ["sleepy", "Abends 1 Minute bewerten", "Schlaf, Energie, Fokus … 1–5"], ["party", "Vergleichen", "Ø Test gegen Ø Normal"]],
      "Gratis-Vorlage + Anleitung"],
    t3: ["Was kostet dein<br><span class=\"g\">Supplement-Schrank?</span>", [["🌙", "Magnesium", 10], ["🐟", "Omega-3", 15], ["🌞", "Vitamin D3 + K2", 6], ["🌿", "Ashwagandha", 15]],
      "Beispiel · grobe Schätzwerte", "im Monat", "im Jahr", "Und wenn 2 davon bei dir keinen spürbaren Unterschied machen?", "💸 Rechne deinen aus – gratis", v => `${v.toLocaleString("de-DE")} €`],
  },
  en: {
    t1: ["📄 Free printable PDF", 'Test your<br><span class="g">supplements</span><br>yourself', "Your normal · one at a time · compare"],
    t2: ["Which supplement<br>works for <span class=\"g\">you</span>?", "Find out yourself in 4 steps:",
      [["think", "Track your normal", "5–7 evenings, nothing new"], ["happy", "One at a time", "never several at once"], ["sleepy", "Rate it every evening", "sleep, energy, focus … 1–5"], ["party", "Compare", "test average vs. normal"]],
      "Free tracker + guide"],
    t3: ["What does your<br><span class=\"g\">supplement shelf</span> cost?", [["🌙", "Magnesium", 10], ["🐟", "Omega-3", 15], ["🌞", "Vitamin D3 + K2", 6], ["🌿", "Ashwagandha", 15]],
      "Example · rough estimates", "per month", "per year", "And if 2 of them make no noticeable difference for you?", "💸 Calculate yours – free", v => `€${v.toLocaleString("en-US")}`],
  },
}

const pins = lang => {
  const x = P[lang], f = `content/tracker/${TRACKER[lang]}`
  const [c1, h1, s1] = x.t1, [h2, s2, steps, cta2] = x.t2, [h3, items, ex, mo, yr, what, cta3, cur] = x.t3
  const m = items.reduce((a, [, , v]) => a + v, 0)
  return {
    "1-vorlage": `<div style="padding:80px 70px 0;text-align:center"><span class="chip">${c1}</span><h1 style="margin-top:34px">${h1}</h1></div>
      <div style="position:absolute;left:150px;top:${lang === "en" ? 560 : 470}px;width:560px;transform:rotate(-5deg);box-shadow:0 30px 70px rgba(0,0,0,.5);border-radius:10px;overflow:hidden;background:#fff"><img src="${img(f + "-p2.png")}" style="width:100%;display:block"></div>
      <div style="position:absolute;left:300px;top:${lang === "en" ? 600 : 510}px;width:560px;transform:rotate(3deg);box-shadow:0 30px 70px rgba(0,0,0,.55);border-radius:10px;overflow:hidden;background:#fff"><img src="${img(f + "-p1.png")}" style="width:100%;display:block"></div>
      <div style="position:absolute;left:40px;bottom:150px;filter:drop-shadow(0 20px 30px rgba(0,0,0,.4))">${k("party-glow", 250)}</div>
      <div style="position:absolute;left:0;right:0;bottom:128px;text-align:center"><span class="chip" style="font-size:28px;background:rgba(20,18,43,.85)">${s1}</span></div>`,
    "2-vier-schritte": `<div style="padding:90px 70px 0;text-align:center"><h1 style="font-size:88px">${h2}</h1><p style="font-size:40px;font-weight:800;opacity:.88;margin-top:26px">${s2}</p></div>
      <div style="padding:36px 60px;display:flex;flex-direction:column;gap:24px">${steps.map(([kn, h, d], i) => `<div style="display:flex;align-items:center;gap:24px;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.18);border-radius:36px;padding:17px 30px">
        <div style="flex-shrink:0">${k(kn, 140)}</div><div><div style="font-size:46px;font-weight:900;line-height:1.1"><span style="opacity:.6">${i + 1} ·</span> ${h}</div><div style="font-size:32px;opacity:.85;font-weight:700;margin-top:4px">${d}</div></div></div>`).join("")}</div>
      <div style="position:absolute;left:0;right:0;bottom:130px;text-align:center"><span class="chip">📄 ${cta2}</span></div>`,
    "3-schrank-kosten": `<div style="padding:90px 70px 0;text-align:center"><h1 style="font-size:86px">${h3}</h1></div>
      <div style="margin:44px 90px 0;background:#fff;color:#14122b;border-radius:28px;padding:34px 44px 30px;box-shadow:0 30px 70px rgba(0,0,0,.45);transform:rotate(-1.5deg)">
        <div style="font-size:24px;font-weight:900;color:#7a70d6;letter-spacing:.06em;text-transform:uppercase">${ex}</div>
        ${items.map(([e, n, v]) => `<div style="display:flex;justify-content:space-between;font-size:40px;font-weight:800;padding:14px 0;border-bottom:3px dashed #e1def2"><span>${e} ${n}</span><span>${cur(v)}</span></div>`).join("")}
        <div style="display:flex;justify-content:space-between;font-size:40px;font-weight:900;padding-top:18px"><span>= ${mo}</span><span>${cur(m)}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;font-weight:900;margin-top:6px"><span style="font-size:40px">= ${yr}</span><span style="font-size:84px;color:#e05a8c">${cur(m * 12)}</span></div></div>
      <p style="font-size:44px;font-weight:900;text-align:center;margin:56px 80px 0;line-height:1.2">${what}</p>
      <div style="position:absolute;right:30px;bottom:150px">${k("think", 170)}</div>
      <div style="position:absolute;left:0;right:0;bottom:140px;text-align:center"><span class="chip">${cta3}</span></div>`,
  }
}

const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 1500 } })
for (const lang of ["de", "en"]) {
  const dir = `content/pins/${lang}`; fs.mkdirSync(dir, { recursive: true })
  for (const [name, body] of Object.entries(pins(lang))) {
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}<div class="url"><span>kolbi-smoky.vercel.app</span></div></body></html>`)
    await p.evaluate(() => document.fonts.ready)
    await p.screenshot({ path: `${dir}/${name}.png` }); console.log("✓", `${dir}/${name}.png`)
  }
}
await b.close()
