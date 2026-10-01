// Landingpage + Rechtsseiten als statische Dateien nach marketing/site/.
// Aufruf (im Ordner marketing): node tools/build-site.mjs
// Solange im Impressum Platzhalter stehen, ist die Seite auf „noindex“ (nicht in Google).
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")

const APP = "https://supplement-lab-six.vercel.app"
/** Kanal-Links: gleiche Startseite unter eigenem Pfad → Vercel Analytics zeigt Besuche je Kanal (ohne Cookies). */
export const CHANNELS = ["reddit", "tiktok", "insta", "youtube", "producthunt", "hn", "facebook", "linkedin", "x", "threads", "discord", "betalist", "indiehackers", "pinterest", "forum", "qr"]
const OUT = "site"
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(`${OUT}/img`, { recursive: true }); fs.mkdirSync(`${OUT}/fonts`, { recursive: true })
fs.copyFileSync("brand/fonts/Nunito-latin.woff2", `${OUT}/fonts/Nunito-latin.woff2`)
fs.copyFileSync("brand/png/kolbi-happy-glow.png", `${OUT}/img/kolbi.png`)

const legalMd = Object.fromEntries(["impressum", "datenschutz", "nutzungsbedingungen"].map(n => [n, fs.readFileSync(`legal/${n}.md`, "utf8")]))
const PLACEHOLDER = /\[(Vorname Nachname|Straße Hausnummer|PLZ Ort|E-Mail-Adresse)\]/
const DRAFT = Object.values(legalMd).some(t => PLACEHOLDER.test(t))

/** Kolbi inline – jede Einbettung bekommt eigene IDs, sonst kollidieren Verläufe/Clips. */
let kid = 0
const kolbi = (name, cls = "") => {
  const id = `k${kid++}`
  return fs.readFileSync(`brand/kolbi-${name}.svg`, "utf8")
    .replace(/_R_[0-9a-z]*_/g, id)
    .replace(/width="512" height="512"/, `class="kolbi ${cls}" aria-hidden="true"`)
    .replace(/ role="img" aria-label="[^"]*"/, "")
}

// ── Mini-Markdown für die Rechtstexte ─────────────────────────────────────────
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const inline = s => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>')
  .replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;–])/g, '$1<a href="$2">$2</a>')
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\[([^\]]+)\]/g, '<mark title="wird vor dem Start ergänzt">[$1]</mark>')
function md(t) {
  const html = []
  for (const block of t.trim().split(/\n\s*\n/)) {
    const lines = block.split("\n")
    const h = lines[0].match(/^(#{1,3}) (.*)/)
    if (h && lines.length === 1) { html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue }
    if (lines.every(l => l.startsWith(">"))) { html.push(`<blockquote>${inline(lines.map(l => l.replace(/^>\s?/, "")).join(" "))}</blockquote>`); continue }
    if (/^[-*] /.test(lines[0])) {
      const items = []; for (const l of lines) /^[-*] /.test(l) ? items.push(l.slice(2)) : (items[items.length - 1] += " " + l.trim())
      html.push(`<ul>${items.map(i => `<li>${inline(i)}</li>`).join("")}</ul>`); continue
    }
    // Adressblöcke (kurze Zeilen) mit Zeilenumbruch, sonst Fließtext
    const addr = lines.length > 1 && lines.every(l => l.length < 48)
    html.push(`<p>${lines.map(inline).join(addr ? "<br>" : " ")}</p>`)
  }
  return html.join("\n")
}

// ── Gemeinsames Gerüst ───────────────────────────────────────────────────────
const CSS = fs.readFileSync(new URL("./site.css", import.meta.url), "utf8")
const page = ({ title, desc, body, path = "" }) => `<!doctype html>
<html lang="de"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title><meta name="description" content="${desc}">
${DRAFT ? '<meta name="robots" content="noindex, nofollow">' : ""}
<meta name="theme-color" content="#14122b">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}">
<meta property="og:image" content="/img/og.png"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/img/kolbi.png">
<link rel="preload" href="/fonts/Nunito-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
<script defer src="/_vercel/insights/script.js"></script>
</head><body${path ? ` class="legal"` : ""}>
<header class="nav"><a class="brand" href="/">${kolbi("happy")}<span>Kolbi</span></a>
<a class="btn small" href="${APP}" data-cta="nav">Beta öffnen</a></header>
${body}
<footer class="foot"><div class="wrap">
<div class="foot-brand">${kolbi("sleepy-nightcap")}<span><b>Kolbi · Supplement Lab</b><br>Finde raus, was bei dir wirkt.</span></div>
<nav><a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a><a href="/nutzungsbedingungen">Nutzungsbedingungen</a></nav>
<p class="fine">Kolbi ist ein Tagebuch- und Experimentier-Werkzeug, kein Medizinprodukt. Keine Diagnose, keine Heilversprechen –
die Ergebnisse sind deine persönliche Einschätzung. Bei Beschwerden, Schwangerschaft oder Medikamenten sprich vorher mit
Ärztin, Arzt oder Apotheke.</p></div></footer>
<script>${fs.readFileSync(new URL("./site.js", import.meta.url), "utf8")}</script>
</body></html>`

// ── Startseite ───────────────────────────────────────────────────────────────
const SHOTS = [
  ["01-1-heute", "Heute: Kolbi führt dich durch den Tag"],
  ["02-3b-checkin", "Abend-Check-in in einer Minute"],
  ["03-4-muster", "Muster in deinen Daten"],
  ["04-5-kosten", "Was dein Stack kostet"],
  ["05-7-experimente", "Fertige Experimente"],
  ["06-9-story", "Deine Woche als Story"],
]
const STEPS = [
  ["think-alive", "1", "Reset", "Ein paar Tage ohne Neues. Kolbi lernt dein Normal kennen: Schlaf, Energie, Ruhe, Fokus."],
  ["happy-alive", "2", "Testen", "Ein Supplement nach dem anderen. Jeden Abend eine Minute Check-in – ein paar Taps."],
  ["party-alive", "3", "Aufdecken", "Kolbi vergleicht mit deinem Normal. Du entscheidest: Behalten, Vielleicht oder raus."],
]
const FEATURES = [
  ["🔎", "Muster-Detektor", "Schläfst du nach Alkohol schlechter? Bist du montags anders drauf? Kolbi findet es."],
  ["⏰", "Erinnert, ohne zu nerven", "Gebündelt nach Tageszeit – und Kolbi merkt sich, wann du wirklich einnimmst."],
  ["💸", "Kosten & Sparen", "Sieh, was dein Stack im Monat kostet und was du sparst, wenn etwas rausfliegt."],
  ["🧭", "Fertige Experimente", "Schlaf, Fokus, Ruhe, Training: Thema wählen, Kolbi plant den Rest."],
  ["⏱️", "Timing-Check", "Was lieber mit Abstand, was zusammen? Auf einer Tageslinie erklärt."],
  ["📦", "Vorrat im Blick", "Kolbi sagt dir Bescheid, bevor eine Dose leer ist."],
  ["📊", "Wochen-Story", "Jeden Sonntag dein Rückblick – zum Durchtippen und Teilen."],
  ["📅", "Kalender-Abo", "Testende und Ergebnisse automatisch in deinem Kalender."],
]
const FAQ = [
  ["Ist das medizinische Beratung?", "Nein. Kolbi hilft dir, deine eigenen Beobachtungen strukturiert festzuhalten und zu vergleichen. Die App stellt keine Diagnosen und sagt nicht, dass ein Supplement „wirkt“ – sie zeigt dir, wie <em>du</em> dich mit und ohne gefühlt hast. Bei Beschwerden oder Medikamenten bitte vorher ärztlich beraten lassen."],
  ["Was kostet Kolbi?", "In der Beta ist alles kostenlos. Später bleibt der Kern gratis; ein kleines „Lab Pro“ kommt als Einmalkauf. Wer in der Beta dabei ist, bekommt Pro als Dankeschön dauerhaft."],
  ["Wo landen meine Daten?", "Auf deinem Gerät. Es gibt kein Konto. Nur wenn du es einschaltest, werden Push-Erinnerungen (mit neutralem Text) oder ein anonymes Test-Ergebnis für die Community übertragen – Details in der <a href=\"/datenschutz\">Datenschutzerklärung</a>."],
  ["Wie installiere ich die App?", "iPhone: Link in Safari öffnen → Teilen-Symbol → „Zum Home-Bildschirm“. Android: im Chrome-Menü „App installieren“. Die Store-Versionen sind in Arbeit."],
  ["Wie lange dauert ein Test?", "Meist 5–10 Tage pro Supplement, dazu ein paar Tage Reset am Anfang. Kolbi plant die Reihenfolge und sagt dir, wann das Ergebnis da ist."],
]

const index = page({
  title: "Kolbi – Finde raus, welche Supplements bei dir wirken",
  desc: "Teste deine Supplements eins nach dem anderen, vergleiche mit deinem Normal und spar dir, was nichts bringt. Ohne Konto, Daten bleiben auf deinem Gerät.",
  body: `
<main>
<section class="hero"><div class="wrap hero-grid">
  <div class="hero-copy">
    <span class="chip">🧪 Beta · kostenlos</span>
    <h1>Finde raus, was bei <span class="grad">DIR</span> wirkt.</h1>
    <p class="lead">Kolbi testet deine Supplements eins nach dem anderen, vergleicht mit deinem Normal und zeigt dir, was du behalten kannst – und was du dir sparen kannst.</p>
    <div class="cta-row"><a class="btn" href="${APP}" data-cta="hero">Jetzt kostenlos starten</a><a class="btn ghost" href="#so-gehts">So geht's ↓</a></div>
    <ul class="trust"><li>🔒 Kein Konto</li><li>📱 Daten bleiben auf deinem Gerät</li><li>⏱️ 1 Minute am Tag</li></ul>
  </div>
  <div class="hero-art">
    <div class="bubble" id="say">Hi, ich bin Kolbi! 👋</div>
    <button class="kolbi-btn" id="poke" aria-label="Kolbi anstupsen">${kolbi("happy-alive", "float")}</button>
  </div>
</div></section>

<section id="so-gehts" class="wrap section">
  <h2>So einfach geht's</h2>
  <div class="steps">${STEPS.map(([k, n, t, d]) => `<article class="card step reveal">${kolbi(k)}<span class="num">${n}</span><h3>${t}</h3><p>${d}</p></article>`).join("")}</div>
</section>

<section class="section shots-sec">
  <div class="wrap"><h2>Ein Blick in die App</h2><p class="sub">Bunt, klar, ohne Zahlensalat – Kolbi zeigt dir nur, was gerade zählt.</p></div>
  <div class="shots" tabindex="0">${SHOTS.map(([f, a]) => `<img loading="lazy" src="/img/${f}.webp" width="430" height="932" alt="${a}">`).join("")}</div>
</section>

<section class="wrap section">
  <h2>Was Kolbi für dich macht</h2>
  <div class="features">${FEATURES.map(([e, t, d]) => `<article class="card feat reveal"><span class="emo">${e}</span><h3>${t}</h3><p>${d}</p></article>`).join("")}</div>
</section>

<section class="wrap section">
  <div class="band reveal">
    <div><h2>Deine Daten gehören dir.</h2><p>Kein Konto, keine Anmeldung, kein Verkauf von Daten. Alles bleibt auf deinem Handy. Teilen ist immer freiwillig – und jederzeit löschbar.</p></div>
    <div class="lock">🔒</div>
  </div>
</section>

<section class="wrap section">
  <div class="card founder reveal">
    ${kolbi("happy-shades")}
    <div><h2>Gründer-Beta</h2><p>Jetzt ist alles gratis. Wer in der Beta mitmacht und Feedback gibt, behält <b>Lab Pro dauerhaft kostenlos</b> – als Dankeschön.</p>
    <a class="btn" href="${APP}" data-cta="founder">Beta öffnen</a></div>
  </div>
</section>

<section class="wrap section">
  <h2>Häufige Fragen</h2>
  <div class="faq">${FAQ.map(([q, a]) => `<details class="card"><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
</section>

<section class="wrap section final">
  ${kolbi("party-alive", "float")}
  <h2>Schluss mit Raten.</h2>
  <p class="sub">Starte heute dein erstes Experiment – Kolbi führt dich Schritt für Schritt.</p>
  <a class="btn big" href="${APP}" data-cta="final">Kostenlos starten</a>
</section>
</main>`,
})
fs.writeFileSync(`${OUT}/index.html`, index)

// ── Rechtsseiten ─────────────────────────────────────────────────────────────
const titles = { impressum: "Impressum", datenschutz: "Datenschutzerklärung", nutzungsbedingungen: "Nutzungsbedingungen" }
for (const [n, t] of Object.entries(legalMd)) {
  fs.writeFileSync(`${OUT}/${n}.html`, page({ title: `${titles[n]} – Kolbi`, desc: `${titles[n]} von Kolbi · Supplement Lab`, path: n, body: `<main class="wrap doc">${md(t)}</main>` }))
}

// ── Bilder: Screenshots als WebP, OG-Bild, Favicon ───────────────────────────
fs.writeFileSync(`${OUT}/img/icon.svg`, fs.readFileSync("brand/kolbi-happy.svg", "utf8").replace(/width="512" height="512"/, 'width="64" height="64"'))
const browser = await chromium.launch()
const p = await browser.newPage()
for (const [f] of SHOTS) {
  const b64 = fs.readFileSync(`store/screenshots-de/${f}.png`).toString("base64")
  const webp = await p.evaluate(async src => {
    const img = new Image(); img.src = src; await img.decode()
    const c = document.createElement("canvas"); c.width = 540; c.height = 1170
    c.getContext("2d").drawImage(img, 0, 0, 540, 1170)
    return c.toDataURL("image/webp", 0.86)
  }, `data:image/png;base64,${b64}`)
  fs.writeFileSync(`${OUT}/img/${f}.webp`, Buffer.from(webp.split(",")[1], "base64"))
}
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
const font = fs.readFileSync("brand/fonts/Nunito-latin.woff2").toString("base64")
await og.setContent(`<!doctype html><html><head><style>@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:200 1000}
body{margin:0;font-family:Nunito,sans-serif}</style></head><body><div style="width:1200px;height:630px;background:radial-gradient(60% 80% at 15% 20%,#9085e9 0%,transparent 60%),radial-gradient(50% 70% at 90% 85%,#e87ba4 0%,transparent 60%),radial-gradient(60% 60% at 70% 10%,#3987e5 0%,transparent 55%),#14122b;display:flex;align-items:center;gap:40px;padding:0 80px;box-sizing:border-box;color:#fff">
<div style="width:400px;height:400px;flex-shrink:0">${kolbi("party-glow").replace('class="kolbi "', 'width="400" height="400"')}</div>
<div><div style="font-size:28px;font-weight:800;opacity:.85;letter-spacing:.06em">KOLBI · SUPPLEMENT LAB</div>
<div style="font-size:74px;font-weight:900;line-height:1.02;margin-top:12px">Finde raus,<br>was bei <span style="color:#7CF5C0">DIR</span><br>wirkt.</div></div></div></body></html>`)
await og.evaluate(() => document.fonts.ready)
await og.screenshot({ path: `${OUT}/img/og.png` })
await browser.close()

fs.writeFileSync(`${OUT}/robots.txt`, DRAFT ? "User-agent: *\nDisallow: /\n" : "User-agent: *\nAllow: /\n")
fs.writeFileSync(`${OUT}/vercel.json`, JSON.stringify({
  cleanUrls: true,
  rewrites: CHANNELS.map(c => ({ source: `/${c}`, destination: "/index.html" })),
  headers: [
    ...(DRAFT ? [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : []),
    { source: "/fonts/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
  ],
}, null, 2))
console.log(`✓ site/ gebaut${DRAFT ? " (Entwurf: noindex, Impressum-Platzhalter offen)" : ""}`)
