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

// ── Texte je Sprache ─────────────────────────────────────────────────────────
const L = {
  de: {
    base: "", lang: "de", ogTitle: "Kolbi – Finde raus, welche Supplements bei dir wirken",
    desc: "Teste deine Supplements eins nach dem anderen, vergleiche mit deinem Normal und spar dir, was nichts bringt. Ohne Konto, Daten bleiben auf deinem Gerät.",
    open: "Beta öffnen", tagline: "Finde raus, was bei dir wirkt.",
    guide: { href: "/ratgeber/supplements-selbst-testen", label: "Ratgeber: Supplements selbst testen", file: "content/guides/supplements-selbst-testen.md", desc: "Schritt-für-Schritt-Anleitung: So testest du Supplements im Selbstversuch – Baseline, eins nach dem anderen, Abend-Check-in, Vergleich.", cta: "Kolbi macht das automatisch – kostenlos testen" }, other: { href: "/en", label: "EN", hint: "🇬🇧 English version" },
    legal: [["impressum", "Impressum", "impressum"], ["datenschutz", "Datenschutz", "datenschutz"], ["nutzungsbedingungen", "Nutzungsbedingungen", "nutzungsbedingungen"]],
    legalTitles: { impressum: "Impressum", datenschutz: "Datenschutzerklärung", nutzungsbedingungen: "Nutzungsbedingungen" },
    fine: "Kolbi ist ein Tagebuch- und Experimentier-Werkzeug, kein Medizinprodukt. Keine Diagnose, keine Heilversprechen – die Ergebnisse sind deine persönliche Einschätzung. Bei Beschwerden, Schwangerschaft oder Medikamenten sprich vorher mit Ärztin, Arzt oder Apotheke.",
    shotsDir: "store/screenshots-de",
    shots: [["01-1-heute", "Heute: Kolbi führt dich durch den Tag"], ["02-3b-checkin", "Abend-Check-in in einer Minute"], ["03-4-muster", "Muster in deinen Daten"], ["04-5-kosten", "Was dein Stack kostet"], ["05-7-experimente", "Fertige Experimente"], ["06-9-story", "Deine Woche als Story"]],
    steps: [["think-alive", "1", "Reset", "Ein paar Tage ohne Neues. Kolbi lernt dein Normal kennen: Schlaf, Energie, Ruhe, Fokus."], ["happy-alive", "2", "Testen", "Ein Supplement nach dem anderen. Jeden Abend eine Minute Check-in – ein paar Taps."], ["party-alive", "3", "Aufdecken", "Kolbi vergleicht mit deinem Normal. Du entscheidest: Behalten, Vielleicht oder raus."]],
    features: [["🔎", "Muster-Detektor", "Schläfst du nach Alkohol schlechter? Bist du montags anders drauf? Kolbi findet es."], ["⏰", "Erinnert, ohne zu nerven", "Gebündelt nach Tageszeit – und Kolbi merkt sich, wann du wirklich einnimmst."], ["💸", "Kosten & Sparen", "Sieh, was dein Stack im Monat kostet und was du sparst, wenn etwas rausfliegt."], ["🧭", "Fertige Experimente", "Schlaf, Fokus, Ruhe, Training: Thema wählen, Kolbi plant den Rest."], ["⏱️", "Timing-Check", "Was lieber mit Abstand, was zusammen? Auf einer Tageslinie erklärt."], ["📦", "Vorrat im Blick", "Kolbi sagt dir Bescheid, bevor eine Dose leer ist."], ["📊", "Wochen-Story", "Jeden Sonntag dein Rückblick – zum Durchtippen und Teilen."], ["📅", "Kalender-Abo", "Testende und Ergebnisse automatisch in deinem Kalender."]],
    faq: [["Ist das medizinische Beratung?", "Nein. Kolbi hilft dir, deine eigenen Beobachtungen strukturiert festzuhalten und zu vergleichen. Die App stellt keine Diagnosen und sagt nicht, dass ein Supplement „wirkt“ – sie zeigt dir, wie <em>du</em> dich mit und ohne gefühlt hast. Bei Beschwerden oder Medikamenten bitte vorher ärztlich beraten lassen."], ["Was kostet Kolbi?", "In der Beta ist alles kostenlos. Später bleibt der Kern gratis, dazu kommt ein optionales „Lab Pro“. Wer in der Beta dabei ist, bekommt Pro als Dankeschön dauerhaft."], ["Wo landen meine Daten?", "Auf deinem Gerät. Es gibt kein Konto. Nur wenn du es einschaltest, werden Push-Erinnerungen (mit neutralem Text) oder ein anonymes Test-Ergebnis für die Community übertragen – Details in der <a href=\"/datenschutz\">Datenschutzerklärung</a>."], ["Wie installiere ich die App?", "iPhone: Link in Safari öffnen → Teilen-Symbol → „Zum Home-Bildschirm“. Android: im Chrome-Menü „App installieren“. Die Store-Versionen sind in Arbeit."], ["Wie lange dauert ein Test?", "Meist 5–10 Tage pro Supplement, dazu ein paar Tage Reset am Anfang. Kolbi plant die Reihenfolge und sagt dir, wann das Ergebnis da ist."]],
    t: { chip: "🧪 Beta · kostenlos", h1: 'Finde raus, was bei <span class="grad">DIR</span> wirkt.', lead: "Kolbi testet deine Supplements eins nach dem anderen, vergleicht mit deinem Normal und zeigt dir, was du behalten kannst – und was du dir sparen kannst.", start: "Jetzt kostenlos starten", how: "So geht's ↓", trust: ["🔒 Kein Konto", "📱 Daten bleiben auf deinem Gerät", "⏱️ 1 Minute am Tag"], hi: "Hi, ich bin Kolbi! 👋", poke: "Kolbi anstupsen", stepsH: "So einfach geht's", shotsH: "Ein Blick in die App", shotsSub: "Bunt, klar, ohne Zahlensalat – Kolbi zeigt dir nur, was gerade zählt.", featH: "Was Kolbi für dich macht", dataH: "Deine Daten gehören dir.", dataP: "Kein Konto, keine Anmeldung, kein Verkauf von Daten. Alles bleibt auf deinem Handy. Teilen ist immer freiwillig – und jederzeit löschbar.", founderH: "Gründer-Beta", founderP: "Jetzt ist alles gratis. Wer in der Beta mitmacht und Feedback gibt, behält <b>Lab Pro dauerhaft kostenlos</b> – als Dankeschön.", faqH: "Häufige Fragen", finalH: "Schluss mit Raten.", finalP: "Starte heute dein erstes Experiment – Kolbi führt dich Schritt für Schritt.", finalBtn: "Kostenlos starten" },
    lines: ["Hihi, das kitzelt! 😄", "Ich teste mit dir. 🧪", "Erst Reset, dann Test!", "Behalten oder raus? Ich zeig's dir.", "Hi, ich bin Kolbi! 👋"],
  },
  en: {
    base: "/en", lang: "en", ogTitle: "Kolbi – Find out which supplements actually work for you",
    desc: "Test your supplements one at a time, compare with your own normal and stop paying for what doesn't work for you. No account, your data stays on your device.",
    open: "Open beta", tagline: "Find out what works for you.",
    guide: { href: "/en/guide/how-to-test-supplements", label: "Guide: how to test supplements", file: "content/guides/how-to-test-supplements.md", desc: "Step-by-step guide to testing supplements on yourself – baseline, one at a time, evening check-in, comparison.", cta: "Kolbi does this for you – try it free" }, other: { href: "/", label: "DE", hint: "🇩🇪 Deutsche Version" },
    legal: [["imprint", "Legal notice", "en/imprint"], ["privacy", "Privacy", "en/privacy"], ["terms", "Terms", "en/terms"]],
    legalTitles: { imprint: "Legal notice", privacy: "Privacy Policy", terms: "Terms of Use" },
    fine: "Kolbi is a journaling and self-experiment tool, not a medical device. No diagnosis, no health claims – results are your personal rating. If you have health issues, are pregnant or take medication, talk to your doctor or pharmacist first.",
    shotsDir: "store/screenshots-en",
    shots: [["01-1-heute", "Today: Kolbi guides you through your day"], ["02-3b-checkin", "One-minute evening check-in"], ["03-4-muster", "Patterns in your data"], ["04-5-kosten", "What your stack costs"], ["05-7-experimente", "Ready-made experiments"], ["06-9-story", "Your week as a story"]],
    steps: [["think-alive", "1", "Reset", "A few days without anything new. Kolbi learns your normal: sleep, energy, calm, focus."], ["happy-alive", "2", "Test", "One supplement at a time. A one-minute check-in every evening – just a few taps."], ["party-alive", "3", "Reveal", "Kolbi compares with your normal. You decide: keep, maybe or drop."]],
    features: [["🔎", "Pattern detector", "Do you sleep worse after drinking? Feel different on Mondays? Kolbi spots it."], ["⏰", "Reminders that don't nag", "Bundled by time of day – and Kolbi learns when you actually take them."], ["💸", "Cost & savings", "See what your stack costs per month and what you save when something gets dropped."], ["🧭", "Ready-made experiments", "Sleep, focus, calm, training: pick a topic, Kolbi plans the rest."], ["⏱️", "Timing check", "What's better apart, what together? Explained on a simple day line."], ["📦", "Stock at a glance", "Kolbi lets you know before a bottle runs out."], ["📊", "Weekly recap", "Every Sunday your week as a story – tap through and share."], ["📅", "Calendar feed", "Test ends and results show up in your calendar automatically."]],
    faq: [["Is this medical advice?", "No. Kolbi helps you record and compare your own observations in a structured way. The app doesn't diagnose and doesn't say a supplement \"works\" – it shows how <em>you</em> felt with and without it. If you have health issues or take medication, please ask a doctor first."], ["What does Kolbi cost?", "Everything is free during the beta. Later the core stays free, plus an optional \"Lab Pro\". Beta testers keep Pro for free, as a thank-you."], ["Where does my data go?", "It stays on your device. There's no account. Only if you turn it on, push reminders (with neutral text) or an anonymous test result for the community are sent – details in the <a href=\"/en/privacy\">privacy policy</a>."], ["How do I install the app?", "iPhone: open the link in Safari → Share → \"Add to Home Screen\". Android: Chrome menu → \"Install app\". Store versions are on the way."], ["How long does a test take?", "Usually 5–10 days per supplement, plus a few reset days at the start. Kolbi plans the order and tells you when your result is ready."]],
    t: { chip: "🧪 Beta · free", h1: 'Find out what works for <span class="grad">YOU</span>.', lead: "Kolbi tests your supplements one at a time, compares them with your normal and shows you what's worth keeping – and what you can skip.", start: "Start for free", how: "How it works ↓", trust: ["🔒 No account", "📱 Data stays on your device", "⏱️ 1 minute a day"], hi: "Hi, I'm Kolbi! 👋", poke: "Poke Kolbi", stepsH: "As easy as that", shotsH: "A look inside", shotsSub: "Colorful, clear, no number soup – Kolbi only shows what matters right now.", featH: "What Kolbi does for you", dataH: "Your data is yours.", dataP: "No account, no sign-up, no selling data. Everything stays on your phone. Sharing is always optional – and can be deleted any time.", founderH: "Founder beta", founderP: "Everything is free right now. Join the beta, give feedback and keep <b>Lab Pro free forever</b> – as a thank-you.", faqH: "FAQ", finalH: "Stop guessing.", finalP: "Start your first experiment today – Kolbi guides you step by step.", finalBtn: "Start for free" },
    lines: ["Hehe, that tickles! 😄", "I'll test with you. 🧪", "Reset first, then test!", "Keep or drop? I'll show you.", "Hi, I'm Kolbi! 👋"],
  },
}

// ── Gemeinsames Gerüst ───────────────────────────────────────────────────────
const CSS = fs.readFileSync(new URL("./site.css", import.meta.url), "utf8")
const JS = fs.readFileSync(new URL("./site.js", import.meta.url), "utf8")
const page = (l, { title, desc, body, path = "", alt }) => `<!doctype html>
<html lang="${l.lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title><meta name="description" content="${desc}">
${DRAFT ? '<meta name="robots" content="noindex, nofollow">' : ""}
${alt ? `<link rel="alternate" hreflang="de" href="/"><link rel="alternate" hreflang="en" href="/en">` : ""}
<meta name="theme-color" content="#14122b">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}">
<meta property="og:image" content="/img/og${l.lang === "en" ? "-en" : ""}.png"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/img/kolbi.png">
<link rel="preload" href="/fonts/Nunito-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
<script defer src="/_vercel/insights/script.js"></script>
</head><body${path ? ` class="legal"` : ""} data-lang="${l.lang}">
<header class="nav"><a class="brand" href="${l.base || "/"}">${kolbi("happy")}<span>Kolbi</span></a>
<span class="nav-r"><a class="lang" href="${l.other.href}" hreflang="${l.lang === "de" ? "en" : "de"}">${l.other.label}</a><a class="btn small" href="${APP}?lang=${l.lang}" data-cta="nav">${l.open}</a></span></header>
${body}
<footer class="foot"><div class="wrap">
<div class="foot-brand">${kolbi("sleepy-nightcap")}<span><b>Kolbi · Supplement Lab</b><br>${l.tagline}</span></div>
<nav><a href="${l.guide.href}">${l.guide.label}</a>${l.legal.map(([, label, href]) => `<a href="/${href}">${label}</a>`).join("")}<a href="${l.other.href}">${l.other.hint}</a></nav>
<p class="fine">${l.fine}</p></div></footer>
<script>window.KOLBI_LINES=${JSON.stringify(l.lines)};${JS}</script>
</body></html>`

function home(l) {
  const T = l.t, A = `${APP}?lang=${l.lang}`
  return page(l, { title: l.ogTitle, desc: l.desc, alt: true, body: `
<main>
<section class="hero"><div class="wrap hero-grid">
  <div class="hero-copy">
    <span class="chip">${T.chip}</span>
    <h1>${T.h1}</h1>
    <p class="lead">${T.lead}</p>
    <div class="cta-row"><a class="btn" href="${A}" data-cta="hero">${T.start}</a><a class="btn ghost" href="#how">${T.how}</a></div>
    <ul class="trust">${T.trust.map(x => `<li>${x}</li>`).join("")}</ul>
  </div>
  <div class="hero-art">
    <div class="bubble" id="say">${T.hi}</div>
    <button class="kolbi-btn" id="poke" aria-label="${T.poke}">${kolbi("happy-alive", "float")}</button>
  </div>
</div></section>

<section id="how" class="wrap section">
  <h2>${T.stepsH}</h2>
  <div class="steps">${l.steps.map(([k, n, h, d]) => `<article class="card step reveal">${kolbi(k)}<span class="num">${n}</span><h3>${h}</h3><p>${d}</p></article>`).join("")}</div>
</section>

<section class="section shots-sec">
  <div class="wrap"><h2>${T.shotsH}</h2><p class="sub">${T.shotsSub}</p></div>
  <div class="shots" tabindex="0">${l.shots.map(([f, a]) => `<img loading="lazy" src="/img/${l.lang}-${f}.webp" width="430" height="932" alt="${a}">`).join("")}</div>
</section>

<section class="wrap section">
  <h2>${T.featH}</h2>
  <div class="features">${l.features.map(([e, h, d]) => `<article class="card feat reveal"><span class="emo">${e}</span><h3>${h}</h3><p>${d}</p></article>`).join("")}</div>
</section>

<section class="wrap section">
  <div class="band reveal">
    <div><h2>${T.dataH}</h2><p>${T.dataP}</p></div>
    <div class="lock">🔒</div>
  </div>
</section>

<section class="wrap section">
  <div class="card founder reveal">
    ${kolbi("happy-shades")}
    <div><h2>${T.founderH}</h2><p>${T.founderP}</p>
    <a class="btn" href="${A}" data-cta="founder">${l.open}</a></div>
  </div>
</section>

<section class="wrap section">
  <h2>${T.faqH}</h2>
  <div class="faq">${l.faq.map(([q, a]) => `<details class="card"><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
</section>

<section class="wrap section final">
  ${kolbi("party-alive", "float")}
  <h2>${T.finalH}</h2>
  <p class="sub">${T.finalP}</p>
  <a class="btn big" href="${A}" data-cta="final">${T.finalBtn}</a>
</section>
</main>` })
}

// ── Seiten schreiben ─────────────────────────────────────────────────────────
fs.mkdirSync(`${OUT}/en`, { recursive: true })
fs.writeFileSync(`${OUT}/index.html`, home(L.de))
fs.writeFileSync(`${OUT}/en.html`, home(L.en))
for (const [n, t] of Object.entries(legalMd)) {
  const title = L.de.legalTitles[n]
  fs.writeFileSync(`${OUT}/${n}.html`, page(L.de, { title: `${title} – Kolbi`, desc: `${title} von Kolbi · Supplement Lab`, path: n, body: `<main class="wrap doc">${md(t)}</main>` }))
}
for (const n of ["imprint", "privacy", "terms"]) {
  const f = `legal/en/${n}.md`
  if (!fs.existsSync(f)) { console.log(`⚠️ ${f} fehlt – englische Rechtsseite übersprungen`); continue }
  const title = L.en.legalTitles[n]
  fs.writeFileSync(`${OUT}/en/${n}.html`, page(L.en, { title: `${title} – Kolbi`, desc: `${title} of Kolbi · Supplement Lab`, path: n, body: `<main class="wrap doc">${md(fs.readFileSync(f, "utf8"))}</main>` }))
}

// ── Ratgeber ────────────────────────────────────────────────────────────────
for (const l of Object.values(L)) {
  const g = l.guide, src = fs.readFileSync(g.file, "utf8")
  const title = src.split("\n")[0].replace(/^# /, "")
  fs.mkdirSync(`${OUT}${g.href.slice(0, g.href.lastIndexOf("/"))}`, { recursive: true })
  fs.writeFileSync(`${OUT}${g.href}.html`, page(l, { title: `${title} – Kolbi`, desc: g.desc, path: "guide", body: `<main class="wrap doc guide">${md(src)}
    <div class="card founder" style="margin-top:36px">${kolbi("party-alive")}<div><h2>${l.tagline}</h2><a class="btn" href="${APP}?lang=${l.lang}" data-cta="guide">${g.cta}</a></div></div></main>` }))
}

// ── Sitemap ─────────────────────────────────────────────────────────────────
const SITE = "https://kolbi-smoky.vercel.app"
const urls = ["/", "/en", L.de.guide.href, L.en.guide.href, "/impressum", "/datenschutz", "/nutzungsbedingungen", "/en/imprint", "/en/privacy", "/en/terms"]
fs.writeFileSync(`${OUT}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE}${u === "/" ? "" : u}</loc></url>`).join("\n")}\n</urlset>\n`)

// ── Bilder: Screenshots als WebP, OG-Bild, Favicon ───────────────────────────
fs.writeFileSync(`${OUT}/img/icon.svg`, fs.readFileSync("brand/kolbi-happy.svg", "utf8").replace(/width="512" height="512"/, 'width="64" height="64"'))
const browser = await chromium.launch()
const p = await browser.newPage()
for (const l of Object.values(L)) for (const [f] of l.shots) {
  const b64 = fs.readFileSync(`${l.shotsDir}/${f}.png`).toString("base64")
  const webp = await p.evaluate(async src => {
    const img = new Image(); img.src = src; await img.decode()
    const c = document.createElement("canvas"); c.width = 540; c.height = 1170
    c.getContext("2d").drawImage(img, 0, 0, 540, 1170)
    return c.toDataURL("image/webp", 0.86)
  }, `data:image/png;base64,${b64}`)
  fs.writeFileSync(`${OUT}/img/${l.lang}-${f}.webp`, Buffer.from(webp.split(",")[1], "base64"))
}
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } })
const font = fs.readFileSync("brand/fonts/Nunito-latin.woff2").toString("base64")
for (const [suffix, top, claim] of [["", "KOLBI · SUPPLEMENT LAB", 'Finde raus,<br>was bei <span style="color:#7CF5C0">DIR</span><br>wirkt.'], ["-en", "KOLBI · SUPPLEMENT LAB", 'Find out<br>what works<br>for <span style="color:#7CF5C0">YOU</span>.']]) {
  await og.setContent(`<!doctype html><html><head><style>@font-face{font-family:Nunito;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:200 1000}
body{margin:0;font-family:Nunito,sans-serif}</style></head><body><div style="width:1200px;height:630px;background:radial-gradient(60% 80% at 15% 20%,#9085e9 0%,transparent 60%),radial-gradient(50% 70% at 90% 85%,#e87ba4 0%,transparent 60%),radial-gradient(60% 60% at 70% 10%,#3987e5 0%,transparent 55%),#14122b;display:flex;align-items:center;gap:40px;padding:0 80px;box-sizing:border-box;color:#fff">
<div style="width:400px;height:400px;flex-shrink:0">${kolbi("party-glow").replace('class="kolbi "', 'width="400" height="400"')}</div>
<div><div style="font-size:28px;font-weight:800;opacity:.85;letter-spacing:.06em">${top}</div>
<div style="font-size:74px;font-weight:900;line-height:1.02;margin-top:12px">${claim}</div></div></div></body></html>`)
  await og.evaluate(() => document.fonts.ready)
  await og.screenshot({ path: `${OUT}/img/og${suffix}.png` })
}
await browser.close()

fs.writeFileSync(`${OUT}/robots.txt`, DRAFT ? "User-agent: *\nDisallow: /\n" : "User-agent: *\nAllow: /\nSitemap: https://kolbi-smoky.vercel.app/sitemap.xml\n")
fs.writeFileSync(`${OUT}/vercel.json`, JSON.stringify({
  cleanUrls: true,
  rewrites: [...CHANNELS.map(c => ({ source: `/${c}`, destination: "/index.html" })), ...CHANNELS.map(c => ({ source: `/en/${c}`, destination: "/en.html" }))],
  headers: [
    ...(DRAFT ? [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : []),
    { source: "/fonts/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
  ],
}, null, 2))
console.log(`✓ site/ gebaut${DRAFT ? " (Entwurf: noindex, Impressum-Platzhalter offen)" : ""}`)
