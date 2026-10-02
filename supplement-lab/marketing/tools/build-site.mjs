// Landingpage + Rechtsseiten als statische Dateien nach marketing/site/.
// Aufruf (im Ordner marketing): node tools/build-site.mjs
// Solange im Impressum Platzhalter stehen, ist die Seite auf „noindex“ (nicht in Google).
import { createRequire } from "module"
import fs from "fs"
const require = createRequire(import.meta.url)
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright")

const APP = "https://supplement-lab-six.vercel.app"
/** Öffentliche Adresse der Website – für hreflang, og:image und Sitemap (müssen absolut sein). */
const SITE = "https://kolbi-smoky.vercel.app"
/** Kanal-Links: gleiche Startseite unter eigenem Pfad → Vercel Analytics zeigt Besuche je Kanal (ohne Cookies). */
export const CHANNELS = ["invite", "reddit", "tiktok", "insta", "youtube", "producthunt", "hn", "facebook", "linkedin", "x", "threads", "discord", "betalist", "indiehackers", "pinterest", "forum", "qr"]
const OUT = "site"
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(`${OUT}/img`, { recursive: true }); fs.mkdirSync(`${OUT}/fonts`, { recursive: true })
fs.copyFileSync("brand/fonts/Nunito-latin.woff2", `${OUT}/fonts/Nunito-latin.woff2`)
fs.copyFileSync("brand/png/kolbi-happy-glow.png", `${OUT}/img/kolbi.png`)
// Druck-Vorlage (Lead-Magnet): Quelle content/tracker/ (erzeugt von tools/tracker.mjs) → site/downloads/
const TRACKER = { de: "supplement-selbsttest-vorlage", en: "supplement-self-test-tracker" }
fs.mkdirSync(`${OUT}/downloads`, { recursive: true })
for (const n of Object.values(TRACKER)) for (const ext of [".pdf", "-p1.webp", "-p2.webp"]) {
  const f = `content/tracker/${n}${ext}`
  if (fs.existsSync(f)) fs.copyFileSync(f, `${OUT}/downloads/${n}${ext}`); else console.log(`⚠️ ${f} fehlt – erst node tools/tracker.mjs`)
}

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
    features: [["🔎", "Muster-Detektor", "Schläfst du nach Alkohol schlechter? Bist du montags anders drauf? Kolbi schaut in deinen Daten nach."], ["⏰", "Erinnert, ohne zu nerven", "Gebündelt nach Tageszeit – und Kolbi merkt sich, wann du wirklich einnimmst."], ["💸", "Kosten & Sparen", "Sieh, was dein Stack im Monat kostet und was du sparst, wenn etwas rausfliegt."], ["🧭", "Fertige Experimente", "Schlaf, Fokus, Ruhe, Training: Thema wählen, Kolbi plant den Rest."], ["⏱️", "Timing-Check", "Was lieber mit Abstand, was zusammen? Auf einer Tageslinie erklärt."], ["📦", "Vorrat im Blick", "Kolbi sagt dir Bescheid, bevor eine Dose leer ist."], ["📊", "Wochen-Story", "Jeden Sonntag dein Rückblick – zum Durchtippen und Teilen."], ["📅", "Kalender-Abo", "Testende und Ergebnisse automatisch in deinem Kalender."]],
    faq: [["Ist das medizinische Beratung?", "Nein. Kolbi hilft dir, deine eigenen Beobachtungen strukturiert festzuhalten und zu vergleichen. Die App stellt keine Diagnosen und sagt nicht, dass ein Supplement „wirkt“ – sie zeigt dir, wie <em>du</em> dich mit und ohne gefühlt hast. Bei Beschwerden oder Medikamenten bitte vorher ärztlich beraten lassen."], ["Was kostet Kolbi?", "In der Beta ist alles kostenlos. Danach bleibt der Kern gratis; Lab Pro kostet 2,99 €/Monat, 19,99 €/Jahr oder 39,99 € einmalig. Wer bis zum 30. November startet, bekommt Pro als Dankeschön für immer gratis."], ["Wo landen meine Daten?", "Auf deinem Gerät. Es gibt kein Konto. Nur wenn du es einschaltest, werden Push-Erinnerungen (mit neutralem Text) oder ein anonymes Test-Ergebnis für die Community übertragen – Details in der <a href=\"/datenschutz\">Datenschutzerklärung</a>."], ["Wie installiere ich die App?", "iPhone: Link in Safari öffnen → Teilen-Symbol → „Zum Home-Bildschirm“. Android: im Chrome-Menü „App installieren“. Die Store-Versionen sind in Arbeit."], ["Wie lange dauert ein Test?", "Meist 5–10 Tage pro Supplement, dazu ein paar Tage Reset am Anfang. Kolbi plant die Reihenfolge und sagt dir, wann das Ergebnis da ist."]],
    t: { chip: "🧪 Beta · Gründer-Pro gratis bis 30. Nov", h1: 'Finde raus, was bei <span class="grad">DIR</span> wirkt.', lead: "Kolbi testet deine Supplements eins nach dem anderen, vergleicht mit deinem Normal und zeigt dir, was du behalten kannst – und was du dir sparen kannst.", start: "Jetzt kostenlos starten", how: "So geht's ↓", trust: ["🔒 Kein Konto", "📱 Daten bleiben auf deinem Gerät", "⏱️ 1 Minute am Tag"], hi: "Hi, ich bin Kolbi! 👋", poke: "Kolbi anstupsen", stepsH: "So einfach geht's", shotsH: "Ein Blick in die App", shotsSub: "Bunt, klar, ohne Zahlensalat – Kolbi zeigt dir nur, was gerade zählt.", featH: "Was Kolbi für dich macht", dataH: "Deine Daten gehören dir.", dataP: "Kein Konto, keine Anmeldung, kein Verkauf von Daten. Alles bleibt auf deinem Handy. Teilen ist immer freiwillig – und jederzeit löschbar.", founderH: "Gründer-Beta bis 30. November", founderP: "Jetzt ist alles gratis. Wer bis zum <b>30. November</b> startet, behält <b>Lab Pro für immer kostenlos</b> – als Dankeschön. Danach kostet Pro 2,99 €/Monat oder 19,99 €/Jahr.", faqH: "Häufige Fragen", finalH: "Schluss mit Raten.", finalP: "Starte heute dein erstes Experiment – Kolbi führt dich Schritt für Schritt.", finalBtn: "Kostenlos starten" },
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
    features: [["🔎", "Pattern detector", "Do you sleep worse after drinking? Feel different on Mondays? Kolbi looks for it in your data."], ["⏰", "Reminders that don't nag", "Bundled by time of day – and Kolbi learns when you actually take them."], ["💸", "Cost & savings", "See what your stack costs per month and what you save when something gets dropped."], ["🧭", "Ready-made experiments", "Sleep, focus, calm, training: pick a topic, Kolbi plans the rest."], ["⏱️", "Timing check", "What's better apart, what together? Explained on a simple day line."], ["📦", "Stock at a glance", "Kolbi lets you know before a bottle runs out."], ["📊", "Weekly recap", "Every Sunday your week as a story – tap through and share."], ["📅", "Calendar feed", "Test ends and results show up in your calendar automatically."]],
    faq: [["Is this medical advice?", "No. Kolbi helps you record and compare your own observations in a structured way. The app doesn't diagnose and doesn't say a supplement \"works\" – it shows how <em>you</em> felt with and without it. If you have health issues or take medication, please ask a doctor first."], ["What does Kolbi cost?", "Everything is free during the beta. After that the core stays free; Lab Pro costs €2.99/month, €19.99/year or €39.99 one-time. Start by November 30 and you get Pro free forever, as a thank-you."], ["Where does my data go?", "It stays on your device. There's no account. Only if you turn it on, push reminders (with neutral text) or an anonymous test result for the community are sent – details in the <a href=\"/en/privacy\">privacy policy</a>."], ["How do I install the app?", "iPhone: open the link in Safari → Share → \"Add to Home Screen\". Android: Chrome menu → \"Install app\". Store versions are on the way."], ["How long does a test take?", "Usually 5–10 days per supplement, plus a few reset days at the start. Kolbi plans the order and tells you when your result is ready."]],
    t: { chip: "🧪 Beta · Founder Pro free until Nov 30", h1: 'Find out what works for <span class="grad">YOU</span>.', lead: "Kolbi tests your supplements one at a time, compares them with your normal and shows you what's worth keeping – and what you can skip.", start: "Start for free", how: "How it works ↓", trust: ["🔒 No account", "📱 Data stays on your device", "⏱️ 1 minute a day"], hi: "Hi, I'm Kolbi! 👋", poke: "Poke Kolbi", stepsH: "As easy as that", shotsH: "A look inside", shotsSub: "Colorful, clear, no number soup – Kolbi only shows what matters right now.", featH: "What Kolbi does for you", dataH: "Your data is yours.", dataP: "No account, no sign-up, no selling data. Everything stays on your phone. Sharing is always optional – and can be deleted any time.", founderH: "Founder beta until November 30", founderP: "Everything is free right now. Start by <b>November 30</b> and keep <b>Lab Pro free forever</b> – as a thank-you. After that, Pro costs €2.99/month or €19.99/year.", faqH: "FAQ", finalH: "Stop guessing.", finalP: "Start your first experiment today – Kolbi guides you step by step.", finalBtn: "Start for free" },
    lines: ["Hehe, that tickles! 😄", "I'll test with you. 🧪", "Reset first, then test!", "Keep or drop? I'll show you.", "Hi, I'm Kolbi! 👋"],
  },
}

// ── Gemeinsames Gerüst ───────────────────────────────────────────────────────
const CSS = fs.readFileSync(new URL("./site.css", import.meta.url), "utf8")
const JS = fs.readFileSync(new URL("./site.js", import.meta.url), "utf8")
/** alt = { de: "/pfad", en: "/en/pfad" }: hreflang-Paar (absolut) + Sprachumschalter/Fußzeilen-Link zum Gegenstück. */
const page = (l0, { title, desc, body, path = "", alt, head = "" }) => {
  const ol = l0.lang === "de" ? "en" : "de", abs = u => SITE + (u === "/" ? "" : u)
  const l = alt ? { ...l0, other: { ...l0.other, href: alt[ol] } } : l0
  return `<!doctype html>
<html lang="${l.lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title><meta name="description" content="${desc}">
${DRAFT ? '<meta name="robots" content="noindex, nofollow">' : ""}
${alt ? `<link rel="alternate" hreflang="de" href="${abs(alt.de)}"><link rel="alternate" hreflang="en" href="${abs(alt.en)}"><link rel="alternate" hreflang="x-default" href="${abs(alt.de)}">` : ""}
${head}<meta name="theme-color" content="#14122b">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc}">
<meta property="og:image" content="${SITE}/img/og${l.lang === "en" ? "-en" : ""}.png"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/img/kolbi.png">
<link rel="preload" href="/fonts/Nunito-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
<script defer src="/_vercel/insights/script.js"></script>
</head><body${path ? ` class="legal"` : ""} data-lang="${l.lang}">
<header class="nav"><a class="brand" href="${l.base || "/"}">${kolbi("happy")}<span>Kolbi</span></a>
<span class="nav-r"><a class="lang" href="${l.other.href}" hreflang="${ol}">${l.other.label}</a><a class="btn small" href="${APP}?lang=${l.lang}" data-cta="nav">${l.open}</a></span></header>
${body}
<footer class="foot"><div class="wrap">
<div class="foot-brand">${kolbi("sleepy-nightcap")}<span><b>Kolbi · Supplement Lab</b><br>${l.tagline}</span></div>
<nav><a href="${l.lang === "en" ? "/en/self-test" : "/selbsttest"}">${l.lang === "en" ? "Self-tests" : "Selbsttests"}</a><a href="${l.lang === "en" ? "/en/calculator" : "/rechner"}">${l.lang === "en" ? "Cost calculator" : "Kosten-Rechner"}</a><a href="${l.lang === "en" ? "/en/template" : "/vorlage"}">${l.lang === "en" ? "Printable tracker" : "Vorlage zum Ausdrucken"}</a><a href="${l.guide.href}">${l.guide.label}</a><a href="${l.lang === "en" ? "/en/press" : "/presse"}">${l.lang === "en" ? "Press" : "Presse"}</a>${l.legal.map(([, label, href]) => `<a href="/${href}">${label}</a>`).join("")}<a href="${l.other.href}">${l.other.hint}</a></nav>
<p class="fine">${l.fine}</p></div></footer>
<script>window.KOLBI_LINES=${JSON.stringify(l.lines)};${JS}</script>
</body></html>`
}

function home(l) {
  const T = l.t, A = `${APP}?lang=${l.lang}`
  return page(l, { title: l.ogTitle, desc: l.desc, alt: { de: "/", en: "/en" }, body: `
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
/** Rechtsseiten-Paare DE ↔ EN (Index wie in L.de.legal / L.en.legal); Gegenstück nur, wenn die EN-Datei existiert */
const legalAlt = i => fs.existsSync(`legal/en/${L.en.legal[i][0]}.md`) ? { de: `/${L.de.legal[i][2]}`, en: `/${L.en.legal[i][2]}` } : undefined
for (const [n, t] of Object.entries(legalMd)) {
  const title = L.de.legalTitles[n]
  fs.writeFileSync(`${OUT}/${n}.html`, page(L.de, { title: `${title} – Kolbi`, desc: `${title} von Kolbi · Supplement Lab`, path: n, alt: legalAlt(L.de.legal.findIndex(x => x[0] === n)), body: `<main class="wrap doc">${md(t)}</main>` }))
}
for (const [i, n] of ["imprint", "privacy", "terms"].entries()) {
  const f = `legal/en/${n}.md`
  if (!fs.existsSync(f)) { console.log(`⚠️ ${f} fehlt – englische Rechtsseite übersprungen`); continue }
  const title = L.en.legalTitles[n]
  fs.writeFileSync(`${OUT}/en/${n}.html`, page(L.en, { title: `${title} – Kolbi`, desc: `${title} of Kolbi · Supplement Lab`, path: n, alt: legalAlt(i), body: `<main class="wrap doc">${md(fs.readFileSync(f, "utf8"))}</main>` }))
}

// ── Ratgeber ────────────────────────────────────────────────────────────────
for (const l of Object.values(L)) {
  const g = l.guide, src = fs.readFileSync(g.file, "utf8")
  const title = src.split("\n")[0].replace(/^# /, "")
  fs.mkdirSync(`${OUT}${g.href.slice(0, g.href.lastIndexOf("/"))}`, { recursive: true })
  fs.writeFileSync(`${OUT}${g.href}.html`, page(l, { title: `${title} – Kolbi`, desc: g.desc, path: "guide", alt: { de: L.de.guide.href, en: L.en.guide.href }, body: `<main class="wrap doc guide">${md(src)}
    <p style="margin-top:22px"><a href="${l.lang === "en" ? "/en/template" : "/vorlage"}">${l.lang === "en" ? "📄 Prefer paper? Free printable tracker (PDF) →" : "📄 Lieber auf Papier? Gratis-Vorlage zum Ausdrucken (PDF) →"}</a></p>
    <div class="card founder" style="margin-top:36px">${kolbi("party-alive")}<div><h2>${l.tagline}</h2><a class="btn" href="${APP}?lang=${l.lang}" data-cta="guide">${g.cta}</a></div></div></main>` }))
}

// ── Kosten-Rechner (Werkzeug: teilbar, verlinkbar, ohne Gesundheitsversprechen) ──
// [emoji, DE, EN, €/Monat, App-Bibliotheks-ID → ?s= wählt sie im Onboarding schon aus]
const CALC_ITEMS = [["🌙", "Magnesium", "Magnesium", 10, "magnesium"], ["🌞", "Vitamin D3 + K2", "Vitamin D3 + K2", 6, "vitd"], ["🐟", "Omega-3", "Omega-3", 15, "omega3"], ["🏋️", "Kreatin", "Creatine", 12, "kreatin"], ["🛡️", "Zink", "Zinc", 5, "zink"], ["🌈", "Multivitamin", "Multivitamin", 12, "multivitamin"], ["🌿", "Ashwagandha", "Ashwagandha", 15, "ashwagandha"], ["🍵", "L-Theanin", "L-Theanine", 15, "theanin"], ["🔋", "Vitamin B12", "Vitamin B12", 6, "b12"], ["🦠", "Probiotika", "Probiotics", 20, "probiotika"], ["✨", "Kollagen", "Collagen", 30, "kollagen"], ["🥛", "Whey Protein", "Whey protein", 35, "whey"], ["❤️", "Coenzym Q10", "Coenzyme Q10", 20, "q10"], ["🍄", "Lion's Mane", "Lion's Mane", 25, "lionsmane"]]
const CALC = {
  de: { path: "/rechner", title: "Supplement-Kosten-Rechner: Was kostet dein Schrank im Jahr?", h: "Was kostet dein Supplement-Schrank?", lead: "Hak an, was du nimmst – Preise sind grobe Schätzwerte pro Monat, du kannst sie anpassen.",
    month: "im Monat", year: "im Jahr", what1: "Und wenn eins davon bei dir keinen spürbaren Unterschied macht?", what2: "Und wenn 2 davon bei dir keinen spürbaren Unterschied machen?",
    save1: "Dann zahlst du dafür {x} im Jahr – ohne es zu merken.", save2: "Dann zahlst du dafür {x} im Jahr – ohne es zu merken.", range: "{a} bis {b}", upto: "bis zu {b}",
    none: "Hak mindestens ein Supplement an.", cta: "Finde mit Kolbi heraus, welche – kostenlos", share: "📤 Ergebnis teilen", shareText: "Mein Supplement-Schrank kostet {y} im Jahr 😳 Was kostet deiner?", note: "Schätzwerte für typische Monatsmengen. Kolbi sagt dir nicht, was „wirkt“ – sondern hilft dir, es bei dir selbst zu testen.", cur: (v) => `${Math.round(v).toLocaleString("de-DE")} €` },
  en: { path: "/en/calculator", title: "Supplement cost calculator: what does your shelf cost per year?", h: "What does your supplement shelf cost?", lead: "Tick what you take – prices are rough monthly estimates, you can adjust them.",
    month: "per month", year: "per year", what1: "And if one of them makes no noticeable difference for you?", what2: "And if 2 of them make no noticeable difference for you?",
    save1: "Then you're paying {x} a year for it – without noticing.", save2: "Then you're paying {x} a year for them – without noticing.", range: "{a} to {b}", upto: "up to {b}",
    none: "Tick at least one supplement.", cta: "Find out which with Kolbi – free", share: "📤 Share result", shareText: "My supplement shelf costs {y} a year 😳 What does yours cost?", note: "Estimates for typical monthly amounts. Kolbi doesn't tell you what \"works\" – it helps you test it on yourself.", cur: (v) => `€${Math.round(v).toLocaleString("en-US")}` },
}
for (const [lang, C] of Object.entries(CALC)) {
  const l = L[lang]
  const rows = CALC_ITEMS.map(([e, de, en, pr, id], i) => `<label class="calc-row"><input type="checkbox" data-i="${i}" data-id="${id}"${i < 3 ? " checked" : ""}><span class="ce">${e}</span><span class="cn">${lang === "en" ? en : de}</span><input type="number" min="0" step="1" value="${pr}" data-p="${i}" aria-label="€"><span class="cu">€</span></label>`).join("")
  const curFn = C.cur.toString()
  fs.mkdirSync(`${OUT}${C.path.slice(0, C.path.lastIndexOf("/")) || ""}`, { recursive: true })
  fs.writeFileSync(`${OUT}${C.path}.html`, page(l, { title: `${C.title} – Kolbi`, desc: C.lead, path: "calc", alt: { de: CALC.de.path, en: CALC.en.path }, body: `<main class="wrap doc">
<style>.calc-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:var(--card);border:1px solid var(--line);margin:6px 0;cursor:pointer}
.calc-row input[type=checkbox]{width:20px;height:20px;accent-color:#2ECC8A}.ce{font-size:1.3rem}.cn{flex:1;font-weight:800}
.calc-row input[type=number]{width:64px;padding:6px 8px;border-radius:10px;border:1px solid var(--line);background:#0e0c20;color:var(--text);font:inherit;text-align:right}
.calc-bar{position:sticky;bottom:12px;z-index:5;margin-top:14px;padding:10px 18px;border-radius:999px;background:linear-gradient(135deg,rgba(144,133,233,.97),rgba(232,123,164,.97));box-shadow:0 14px 40px rgba(0,0,0,.45);color:#fff;font-weight:800}
.calc-bar b{font-size:1.35rem;font-weight:900}
.calc-total{margin-top:12px;padding:18px 20px;border-radius:24px;background:linear-gradient(135deg,rgba(144,133,233,.95),rgba(232,123,164,.95))}
.calc-total b{font-size:2.2rem;font-weight:900}.calc-total p{color:#fff;margin:4px 0}.calc-total .btn{white-space:normal;text-align:center;max-width:100%}</style>
<h1>${C.h}</h1><p>${C.lead}</p>
<div id="rows">${rows}</div>
<div class="calc-bar" id="bar"></div>
<div class="calc-total" id="tot"></div>
<p class="fine" style="margin-top:14px">${C.note}</p>
<script>(() => {
  const cur = ${curFn}, T = ${JSON.stringify({ month: C.month, year: C.year, what1: C.what1, what2: C.what2, save1: C.save1, save2: C.save2, range: C.range, upto: C.upto, none: C.none, cta: C.cta, share: C.share, shareText: C.shareText })}
  const app = ${JSON.stringify(APP)} + "?lang=${l.lang}&src=calc"
  // Preis aus dem Feld: leer/ungültig = 0, nie negativ
  const price = f => { const v = +f.value; return Number.isFinite(v) ? Math.max(0, v) : 0 }
  const calc = () => {
    const on = [...document.querySelectorAll("[data-i]")].filter(c => c.checked)
    const sel = on.map(c => price(document.querySelector('[data-p="' + c.dataset.i + '"]')))
    const el = document.getElementById("tot")
    const bar = document.getElementById("bar")
    if (!sel.length) { el.innerHTML = "<p>" + T.none + "</p>"; bar.textContent = T.none; return }
    const m = sel.reduce((a, b) => a + b, 0), y = m * 12, s = [...sel].sort((a, b) => a - b)
    // ≥ 3: die zwei günstigsten bis die zwei teuersten · genau 2: das günstigere bis das teurere
    const k = sel.length >= 3 ? 2 : 1, lo = s.slice(0, k).reduce((a, b) => a + b, 0) * 12, hi = s.slice(-k).reduce((a, b) => a + b, 0) * 12
    const x = cur(lo) === cur(hi) ? cur(hi) : lo <= 0 ? T.upto.replace("{b}", cur(hi)) : T.range.replace("{a}", cur(lo)).replace("{b}", cur(hi))
    bar.innerHTML = "<b>" + cur(y) + "</b> " + T.year + " · " + cur(m) + " " + T.month
    el.innerHTML = "<p><b>" + cur(y) + "</b> " + T.year + " · " + cur(m) + " " + T.month + "</p>"
      + (sel.length >= 2 && hi > 0 ? "<p style='margin-top:10px;font-weight:800'>" + T["what" + k] + "</p><p>" + T["save" + k].replace("{x}", x) + "</p>" : "")
      + "<div style='display:flex;flex-wrap:wrap;gap:8px;margin-top:12px'><a class='btn' href='" + app + "&s=" + on.map(c => c.dataset.id).join(",") + "' data-cta='calc' style='background:#fff;color:#14122b'>" + T.cta + "</a><button class='btn ghost' id='sh' style='border:0;cursor:pointer;font-family:inherit'>" + T.share + "</button></div>"
    document.getElementById("sh").onclick = async () => {
      const text = T.shareText.replace("{y}", cur(y)), url = location.origin + location.pathname
      // Teilen-Menü; nur bewusstes Abbrechen (AbortError) beendet still – sonst (z. B. NotAllowedError) Zwischenablage
      if (navigator.share) try { await navigator.share({ text, url }); return } catch (e) { if (e && e.name === "AbortError") return }
      try { await navigator.clipboard.writeText(text + " " + url); document.getElementById("sh").textContent = "✓" } catch {}
    }
  }
  const rowsEl = document.getElementById("rows")
  rowsEl.addEventListener("input", calc)
  // Negative Eingaben auch im Feld auf 0 setzen (beim Verlassen/Bestätigen, nicht mitten im Tippen)
  rowsEl.addEventListener("change", e => { const f = e.target; if (f.dataset && f.dataset.p != null && f.value !== "" && +f.value < 0) { f.value = "0"; calc() } })
  calc()
})()</script></main>` }))
}

// ── Selbsttest-Seiten je Supplement (SEO: „Wirkt X bei mir?“) ─────────────────
const { TESTS, testPage } = await import("../content/guides/supplement-tests.mjs")
const TEST_BASE = { de: "/selbsttest", en: "/en/self-test" }
for (const lang of ["de", "en"]) {
  const l = L[lang], en = lang === "en", base = TEST_BASE[lang], other = en ? "de" : "en"
  fs.mkdirSync(`${OUT}${base}`, { recursive: true })
  const pages = TESTS.map(it => ({ it, p: testPage(it, lang), o: testPage(it, other) }))
  for (const { it, p, o } of pages) {
    const href = `${base}/${p.slug}`, ohref = `${TEST_BASE[other]}/${o.slug}`
    const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }
    const more = pages.filter(x => x.it !== it).map(x => `<a class="tchip" href="${base}/${x.p.slug}">${x.it.emoji} ${x.p.name}</a>`).join("")
    const src = "test" + it.id.replace(/[^a-z]/g, "")
    fs.writeFileSync(`${OUT}${href}.html`, page(l, { title: `${p.title} – Kolbi`, desc: p.desc, path: "test", alt: { [lang]: href, [other]: ohref },
      head: `<script type="application/ld+json">${JSON.stringify(ld)}</script>`,
      body: `<main class="wrap doc guide">${p.html}
<div class="card founder" style="margin-top:32px">${kolbi("party-alive")}<div><h2>${p.cta?.h ?? (en ? `Kolbi runs this ${p.name} test with you` : `Kolbi macht diesen ${p.name}-Test mit dir`)}</h2><p>${p.cta?.p ?? (en ? "Normal, test phase, evening check-in, honest comparison – with reminders. Free in the beta, no account." : "Normal, Testphase, Abend-Check-in, ehrlicher Vergleich – mit Erinnerungen. In der Beta kostenlos, ohne Konto.")}</p><a class="btn" href="${APP}?lang=${lang}&src=${src}" data-cta="${src}">${p.cta?.btn ?? (en ? "Start the test for free" : "Test kostenlos starten")}</a></div></div>
<h2>${en ? "More self-tests" : "Weitere Selbsttests"}</h2><div class="tchips">${more}</div>
<p style="margin-top:18px"><a href="${en ? "/en/template" : "/vorlage"}">${en ? `📄 Prefer paper? Free printable tracker for your ${p.name} test →` : `📄 Lieber auf Papier? Gratis-Vorlage für deinen ${p.name}-Test →`}</a></p>
<p style="margin-top:8px"><a href="${en ? "/en/calculator" : "/rechner"}">${en ? "💸 What does your supplement shelf cost per year? →" : "💸 Was kostet dein Supplement-Schrank im Jahr? →"}</a></p></main>` }))
  }
  // Übersicht
  const hubT = en ? `Does my supplement work for me? Self-tests for ${TESTS.length} supplements` : `Wirkt mein Supplement bei mir? Selbsttests für ${TESTS.length} Supplements`
  fs.writeFileSync(`${OUT}${base}.html`, page(l, { title: `${hubT} – Kolbi`, desc: en ? "Step-by-step self-tests: find your normal, test one supplement at a time, compare honestly. No promises – just your own data." : "Schritt-für-Schritt-Selbsttests: dein Normal festhalten, eins nach dem anderen testen, ehrlich vergleichen. Keine Versprechen – nur deine eigenen Daten.", path: "test", alt: TEST_BASE,
    body: `<main class="wrap doc"><p class="kicker">🧪 ${en ? "Self-tests" : "Selbsttests"}</p><h1>${en ? "Does it work for <span class=\"grad\">you</span>?" : "Wirkt es bei <span class=\"grad\">dir</span>?"}</h1>
<p class="lead">${en ? "Pick a supplement – each guide shows what people pay attention to, how long to test and how to compare honestly." : "Such dir ein Supplement aus – jede Anleitung zeigt, worauf Leute achten, wie lange du testest und wie du ehrlich vergleichst."}</p>
<div class="tgrid">${pages.map(({ it, p }) => `<a class="tcard" href="${base}/${p.slug}"><span>${it.emoji}</span><b>${p.name}</b><small>${en ? "Self-test →" : "Selbsttest →"}</small></a>`).join("")}</div>
<p style="margin-top:22px"><a href="${l.guide.href}">${l.guide.label} →</a></p>
<p style="margin-top:8px"><a href="${en ? "/en/template" : "/vorlage"}">${en ? "📄 Free printable tracker (PDF) →" : "📄 Gratis-Vorlage zum Ausdrucken (PDF) →"}</a></p></main>` }))
}

// ── Druck-Vorlage: Download-Seiten (Lead-Magnet, Motor 1) ─────────────────────
const TPL = {
  de: { path: "/vorlage", src: "vorlage", other: "/en/template", title: "Supplements selbst testen: Vorlage zum Ausdrucken (PDF)",
    desc: "Gratis-Vorlage (A4-PDF) für deinen Supplement-Selbsttest: 7 Tage dein Normal festhalten, eins nach dem anderen testen, abends bewerten, ehrlich vergleichen.",
    kicker: "📄 Gratis-Vorlage · A4 · PDF", h: 'Supplements selbst testen – <span class="grad">auf Papier</span>',
    lead: "Halte 7 Abende dein Normal fest, teste dann ein Supplement nach dem anderen und vergleiche am Ende ehrlich mit deinem Durchschnitt. Zwei A4-Seiten, kostenlos, ohne Anmeldung – ausdrucken, abends eine Minute ankreuzen.",
    alt: ["Vorschau Seite 1: Dein Normal – 7 Tage", "Vorschau Seite 2: Test – bis zu 14 Tage mit Vergleich"],
    dl: "⬇️ PDF herunterladen", dlNote: "A4 · 2 Seiten · druckerfreundlich (weißer Hintergrund)",
    inH: "Was drin ist", items: ["<b>Seite 1 · Dein Normal:</b> 7 Tage × Schlaf, Energie, Fokus, Stimmung, Ruhe + ein eigener Bereich – je 1 bis 5 ankreuzen, Störfaktoren notieren.", "<b>Seite 2 · Test:</b> bis zu 14 Tage für genau ein Supplement, gleiche Bereiche, Durchschnitt-Zeile.", "<b>So vergleichst du:</b> Ø Normal gegen Ø Test, Faustregel für kleine Unterschiede, Gegenprobe – dann behalten, vielleicht oder raus."],
    appH: "Kein Bock auf Papier? Kolbi macht das automatisch.", appP: "Erinnert dich abends, notiert Störfaktoren, rechnet die Durchschnitte und vergleicht mit deinem Normal. In der Beta kostenlos, ohne Konto – deine Daten bleiben auf deinem Handy.", appBtn: "Kolbi kostenlos starten",
    more: ["/selbsttest", `🧪 Selbsttests für ${TESTS.length} Supplements →`], calc: ["/rechner", "💸 Was kostet dein Supplement-Schrank im Jahr? →"], lang: "🇬🇧 English version" },
  en: { path: "/en/template", src: "template", other: "/vorlage", title: "Supplement self-test tracker: free printable template (PDF)",
    desc: "Free printable A4 tracker for testing supplements on yourself: record your normal for 7 days, test one at a time, rate every evening, compare honestly.",
    kicker: "📄 Free template · A4 · PDF", h: 'Test your supplements – <span class="grad">on paper</span>',
    lead: "Record your normal for 7 evenings, then test one supplement at a time and compare honestly with your average at the end. Two A4 pages, free, no sign-up – print it and tick a few boxes each evening.",
    alt: ["Preview page 1: your normal – 7 days", "Preview page 2: test – up to 14 days with comparison"],
    dl: "⬇️ Download PDF", dlNote: "A4 · 2 pages · printer-friendly (white background)",
    inH: "What's inside", items: ["<b>Page 1 · Your normal:</b> 7 days × sleep, energy, focus, mood, calm + one area of your own – tick 1 to 5, note disruptors.", "<b>Page 2 · Test:</b> up to 14 days for exactly one supplement, same areas, average row.", "<b>How to compare:</b> normal average vs. test average, a rule of thumb for small differences, a double-check – then keep, maybe or drop."],
    appH: "Not into paper? Kolbi does this automatically.", appP: "Reminds you every evening, tracks disruptors, works out the averages and compares with your normal. Free during the beta, no account – your data stays on your phone.", appBtn: "Start Kolbi for free",
    more: ["/en/self-test", `🧪 Self-tests for ${TESTS.length} supplements →`], calc: ["/en/calculator", "💸 What does your supplement shelf cost per year? →"], lang: "🇩🇪 Deutsche Version" },
}
for (const [lang, P] of Object.entries(TPL)) {
  const l = L[lang], f = TRACKER[lang]
  fs.mkdirSync(`${OUT}${P.path.slice(0, P.path.lastIndexOf("/")) || ""}`, { recursive: true })
  fs.writeFileSync(`${OUT}${P.path}.html`, page(l, { title: `${P.title} – Kolbi`, desc: P.desc, path: "template", alt: { de: TPL.de.path, en: TPL.en.path },
    body: `<main class="wrap doc">
<style>.tpl-prev{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0 18px}
.tpl-prev a{display:block;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 18px 40px rgba(0,0,0,.4);transition:transform .25s}
.tpl-prev a:hover{transform:translateY(-3px)}.tpl-prev img{display:block;width:100%;height:auto}
.tpl-dl{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin:6px 0 4px}.tpl-dl .btn{white-space:normal;text-align:center}
.tpl-dl small{color:var(--dim)}.tpl-list{padding-left:20px}.tpl-list li{margin:8px 0}</style>
<p class="kicker">${P.kicker}</p><h1>${P.h}</h1>
<p class="lead">${P.lead}</p>
<div class="tpl-dl"><a class="btn big" href="/downloads/${f}.pdf" download>${P.dl}</a><small>${P.dlNote}</small></div>
<div class="tpl-prev">${[1, 2].map(n => `<a href="/downloads/${f}.pdf"><img src="/downloads/${f}-p${n}.webp" width="800" height="1131" alt="${P.alt[n - 1]}"${n > 1 ? ' loading="lazy"' : ""}></a>`).join("")}</div>
<h2>${P.inH}</h2><ul class="tpl-list">${P.items.map(x => `<li>${x}</li>`).join("")}</ul>
<div class="card founder" style="margin-top:32px">${kolbi("party-alive")}<div><h2>${P.appH}</h2><p>${P.appP}</p><a class="btn" href="${APP}?lang=${lang}&src=${P.src}" data-cta="${P.src}">${P.appBtn}</a></div></div>
<p style="margin-top:22px"><a href="${P.more[0]}">${P.more[1]}</a></p>
<p style="margin-top:8px"><a href="${P.calc[0]}">${P.calc[1]}</a></p>
<p style="margin-top:8px"><a href="${l.guide.href}">${l.guide.label} →</a></p>
<p style="margin-top:8px"><a href="${P.other}" hreflang="${lang === "de" ? "en" : "de"}">${P.lang}</a></p></main>` }))
}

// ── Pressemappe ─────────────────────────────────────────────────────────────
fs.mkdirSync(`${OUT}/press`, { recursive: true })
for (const [src, dst] of [["brand/kolbi-happy.svg", "kolbi.svg"], ["brand/png/kolbi-happy-glow.png", "kolbi.png"], ["brand/avatar.png", "kolbi-avatar.png"], ["brand/banner.png", "kolbi-banner.png"], ["store/feature-graphic.png", "kolbi-feature-de.png"], ["launch/producthunt/thumbnail.gif", "kolbi-animated.gif"]])
  if (fs.existsSync(src)) fs.copyFileSync(src, `${OUT}/press/${dst}`)
const PRESS = {
  de: { path: "/presse", title: "Pressemappe", h: "Pressemappe", lead: "Alles für Artikel, Podcasts und Posts über Kolbi – frei verwendbar für Berichte über die App.",
    facts: [["Name", "Kolbi · Supplement Lab"], ["Was", "App für Selbstversuche mit Supplements: Baseline, eins nach dem anderen testen, Abend-Check-in, Vergleich mit dem eigenen Normal"], ["Für wen", "Menschen, die Supplements nehmen und wissen wollen, was bei ihnen einen Unterschied macht"], ["Preis", "Kern gratis · Lab Pro 2,99 €/Monat, 19,99 €/Jahr oder 39,99 € einmalig · Gründer (Start bis 30.11.2026) gratis"], ["Datenschutz", "Kein Konto, Einträge bleiben auf dem Gerät"], ["Sprachen", "Deutsch, Englisch"], ["Plattformen", "Web-App (iPhone & Android über den Browser), App Store & Google Play ab Dezember 2026"], ["Gemacht von", "Solo-Entwickler aus Deutschland, mit Maskottchen Kolbi statt Gesicht"]],
    shortH: "Kurztext (1 Satz)", short: "Kolbi ist eine kostenlose App, mit der man Supplements eins nach dem anderen im Selbstversuch testet und mit dem eigenen Normal vergleicht – ohne Konto, die Daten bleiben auf dem Handy.",
    longH: "Langtext", long: "Viele Menschen nehmen Supplements, wissen aber nicht, ob sie bei ihnen selbst etwas verändern. Kolbi macht daraus einen strukturierten Selbstversuch: ein paar Tage Reset, dann ein Supplement nach dem anderen, jeden Abend eine Minute Check-in zu Schlaf, Energie, Ruhe und Fokus. Am Ende vergleicht die App mit dem eigenen Normal – behalten, vielleicht oder raus. Dazu kommen ein Muster-Detektor, ein Kosten-Überblick und fertige Experimente. Kolbi gibt keine Heilversprechen und ersetzt keine ärztliche Beratung; die Ergebnisse sind die persönliche Einschätzung der Nutzer.",
    dlH: "Downloads", contact: "Kontakt: [E-Mail-Adresse]" },
  en: { path: "/en/press", title: "Press kit", h: "Press kit", lead: "Everything for articles, podcasts and posts about Kolbi – free to use when covering the app.",
    facts: [["Name", "Kolbi · Supplement Lab"], ["What", "App for personal supplement experiments: baseline, one supplement at a time, evening check-in, comparison with your own normal"], ["For whom", "People who take supplements and want to know what makes a difference for them"], ["Price", "Core free · Lab Pro €2.99/month, €19.99/year or €39.99 lifetime · founders (start by Nov 30, 2026) free"], ["Privacy", "No account, entries stay on the device"], ["Languages", "English, German"], ["Platforms", "Web app (iPhone & Android via browser), App Store & Google Play from December 2026"], ["Made by", "Solo developer from Germany, with Kolbi the mascot instead of a face"]],
    shortH: "Short description (1 sentence)", short: "Kolbi is a free app that helps you test supplements one at a time on yourself and compare them with your own normal – no account, your data stays on your phone.",
    longH: "Long description", long: "Many people take supplements without knowing whether they change anything for them. Kolbi turns this into a structured self-experiment: a few reset days, then one supplement at a time, with a one-minute evening check-in on sleep, energy, calm and focus. At the end the app compares with your own normal – keep, maybe or drop. It also includes a pattern detector, a cost overview and ready-made experiments. Kolbi makes no health claims and does not replace medical advice; results are the users' own ratings.",
    dlH: "Downloads", contact: "Contact: [E-Mail-Adresse]" },
}
for (const [lang, P] of Object.entries(PRESS)) {
  const l = L[lang]
  const shots = l.shots.slice(0, 4).map(([f, a]) => `<a href="/img/${l.lang}-${f}.webp" download><img src="/img/${l.lang}-${f}.webp" alt="${a}" style="width:120px;border-radius:14px"></a>`).join("")
  const files = [["kolbi.svg", "Logo (SVG)"], ["kolbi.png", "Logo (PNG)"], ["kolbi-avatar.png", "Avatar"], ["kolbi-banner.png", "Banner"], ["kolbi-animated.gif", "Animated (GIF)"], ["kolbi-feature-de.png", "Feature graphic"]]
  fs.mkdirSync(`${OUT}${P.path.slice(0, P.path.lastIndexOf("/")) || ""}`, { recursive: true })
  fs.writeFileSync(`${OUT}${P.path}.html`, page(l, { title: `${P.title} – Kolbi`, desc: P.lead, path: "press", alt: { de: PRESS.de.path, en: PRESS.en.path }, body: `<main class="wrap doc">
<h1>${P.h}</h1><p>${P.lead}</p>
<div class="card" style="padding:18px 20px;margin:18px 0">${P.facts.map(([k, v]) => `<p style="margin:6px 0"><b>${k}:</b> ${v}</p>`).join("")}</div>
<h2>${P.shortH}</h2><blockquote>${P.short}</blockquote>
<h2>${P.longH}</h2><p>${P.long}</p>
<h2>${P.dlH}</h2><div style="display:flex;flex-wrap:wrap;gap:10px;margin:10px 0">${shots}</div>
<ul>${files.map(([f, n]) => `<li><a href="/press/${f}" download>${n}</a></li>`).join("")}</ul>
<p><mark>${P.contact}</mark></p></main>` }))
}

// ── Sitemap ─────────────────────────────────────────────────────────────────
const urls = ["/", "/en", L.de.guide.href, L.en.guide.href, "/presse", "/en/press", "/rechner", "/en/calculator", "/vorlage", "/en/template", "/selbsttest", "/en/self-test", ...TESTS.flatMap(it => [`/selbsttest/${it.de.slug}`, `/en/self-test/${it.en.slug}`]), "/impressum", "/datenschutz", "/nutzungsbedingungen", "/en/imprint", "/en/privacy", "/en/terms"]
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

fs.writeFileSync(`${OUT}/robots.txt`, DRAFT ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`)
fs.writeFileSync(`${OUT}/vercel.json`, JSON.stringify({
  cleanUrls: true,
  rewrites: [...CHANNELS.map(c => ({ source: `/${c}`, destination: "/index.html" })), ...CHANNELS.map(c => ({ source: `/en/${c}`, destination: "/en.html" }))],
  headers: [
    ...(DRAFT ? [{ source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : []),
    { source: "/fonts/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
  ],
}, null, 2))
console.log(`✓ site/ gebaut${DRAFT ? " (Entwurf: noindex, Impressum-Platzhalter offen)" : ""}`)
