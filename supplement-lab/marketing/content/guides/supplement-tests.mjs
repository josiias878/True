// ── „Wirkt X bei mir?“-Selbsttest-Seiten (SEO) ─────────────────────────────────
// Regeln (legal/health-claims-check.md): NIE sagen, dass ein Supplement etwas bewirkt. Wir beschreiben nur,
// worauf Leute achten und wie man es bei sich selbst sauber testet. Testdauer passt zu ONSET_INFO in der App.
// onset: schnell = Stunden–Tage · mittel = 1–3 Wochen · langsam = Wochen–Monate

export const DIMS = {
  schlaf: ["😴 Schlaf", "😴 Sleep"], ruhe: ["🧘 Ruhe", "🧘 Calm"], koerper: ["💪 Körpergefühl", "💪 Body"],
  stimmung: ["😊 Stimmung", "😊 Mood"], energie: ["⚡ Energie", "⚡ Energy"], fokus: ["🎯 Fokus", "🎯 Focus"],
  gelenke: ["🦴 Gelenke", "🦴 Joints"], verdauung: ["🫃 Verdauung", "🫃 Digestion"],
}

export const TESTS = [
  { id: "magnesium", emoji: "🌙", onset: "schnell", watch: ["schlaf", "ruhe", "koerper"],
    de: { slug: "magnesium", name: "Magnesium", why: "Viele nehmen Magnesium am Abend und achten dabei vor allem auf ihren Schlaf und darauf, wie entspannt sie sich fühlen.", when: "Nimm es im Test jeden Tag zur gleichen Zeit, z. B. 1 Stunde vor dem Schlafen.", tip: "Magnesium gibt es in vielen Formen (z. B. Glycinat, Citrat). Teste immer nur **eine** Form – sonst weißt du am Ende nicht, welche es war." },
    en: { slug: "magnesium", name: "Magnesium", why: "Many people take magnesium in the evening and mostly pay attention to their sleep and how relaxed they feel.", when: "During the test, take it at the same time every day, e.g. one hour before bed.", tip: "Magnesium comes in many forms (glycinate, citrate …). Only test **one** form at a time – otherwise you won't know which one it was." } },
  { id: "ashwagandha", emoji: "🌿", onset: "langsam", watch: ["ruhe", "schlaf", "stimmung"],
    de: { slug: "ashwagandha", name: "Ashwagandha", why: "Viele nehmen Ashwagandha in stressigen Phasen und achten auf Ruhe, Schlaf und Stimmung.", when: "Nimm es im Test jeden Tag zur gleichen Zeit, viele nehmen es abends.", tip: "Stressige Wochen verzerren jeden Vergleich. Markiere in Kolbi Störfaktoren wie Deadlines oder wenig Schlaf – dann rechnet Kolbi sie heraus." },
    en: { slug: "ashwagandha", name: "Ashwagandha", why: "Many people take ashwagandha during stressful periods and pay attention to calm, sleep and mood.", when: "During the test, take it at the same time every day – many take it in the evening.", tip: "Stressful weeks distort any comparison. Tag disruptors like deadlines or short nights in Kolbi so they can be accounted for." } },
  { id: "kreatin", emoji: "🏋️", onset: "langsam", watch: ["koerper", "energie", "fokus"],
    de: { slug: "kreatin", name: "Kreatin", why: "Viele nehmen Kreatin rund ums Training und achten auf Körpergefühl und Energie – manche auch auf ihren Fokus.", when: "Kreatin wird meist täglich genommen, unabhängig von der Uhrzeit. Bleib im Test bei einer festen Zeit, das macht es dir leichter.", tip: "Trainingsplan im Test nicht umstellen – sonst vergleichst du am Ende neues Training mit altem, nicht Kreatin mit ohne." },
    en: { slug: "creatine", name: "Creatine", why: "Many people take creatine around their workouts and pay attention to how their body feels and their energy – some also to their focus.", when: "Creatine is usually taken daily, regardless of the time. Stick to one fixed time during the test – it's easier to remember.", tip: "Don't change your training plan during the test – otherwise you're comparing new training with old training, not creatine with no creatine." } },
  { id: "omega3", emoji: "🐟", onset: "langsam", watch: ["stimmung", "fokus", "gelenke"],
    de: { slug: "omega-3", name: "Omega-3", why: "Viele nehmen Omega-3 langfristig und achten auf Stimmung, Fokus oder ihre Gelenke.", when: "Nimm es im Test zu einer Mahlzeit mit etwas Fett, jeden Tag zur gleichen Zeit.", tip: "Bei Omega-3 merken viele im Kurztest wenig – das ist normal. Ehrlich: Für manche Fragen sagt ein Bluttest (Omega-3-Index) mehr als das Gefühl." },
    en: { slug: "omega-3", name: "Omega-3", why: "Many people take omega-3 long term and pay attention to mood, focus or their joints.", when: "During the test, take it with a meal that contains some fat, at the same time every day.", tip: "Many people notice little with omega-3 in a short test – that's normal. Honestly: for some questions a blood test (omega-3 index) tells you more than how you feel." } },
  { id: "vitd", emoji: "🌞", onset: "langsam", watch: ["stimmung", "energie"],
    de: { slug: "vitamin-d", name: "Vitamin D", why: "Viele nehmen Vitamin D vor allem im Herbst und Winter und achten auf Stimmung und Energie.", when: "Nimm es im Test zu einer Mahlzeit mit etwas Fett, jeden Tag zur gleichen Zeit.", tip: "Bei Vitamin D sagt ein Bluttest beim Arzt meist mehr als dein Gefühl. Kolbi hilft dir, nebenbei festzuhalten, wie es dir geht – ersetzt aber keine Laborwerte." },
    en: { slug: "vitamin-d", name: "Vitamin D", why: "Many people take vitamin D mainly in autumn and winter and pay attention to mood and energy.", when: "During the test, take it with a meal that contains some fat, at the same time every day.", tip: "With vitamin D, a blood test usually tells you more than how you feel. Kolbi helps you keep track of how you're doing – but it doesn't replace lab values." } },
  { id: "theanin", emoji: "🍵", onset: "schnell", watch: ["ruhe", "fokus"],
    de: { slug: "l-theanin", name: "L-Theanin", why: "Viele nehmen L-Theanin tagsüber, oft zusammen mit Kaffee, und achten auf Ruhe und Fokus.", when: "Nimm es im Test jeden Tag zur gleichen Zeit – und halte deinen Kaffee-Konsum gleich.", tip: "Wenn du es mit Kaffee kombinierst, teste zuerst ein paar Tage Kaffee allein als dein Normal. Sonst misst du den Kaffee mit." },
    en: { slug: "l-theanine", name: "L-Theanine", why: "Many people take L-theanine during the day, often together with coffee, and pay attention to calm and focus.", when: "During the test, take it at the same time every day – and keep your coffee intake the same.", tip: "If you combine it with coffee, track a few days of coffee alone first as your normal. Otherwise you're measuring the coffee too." } },
  { id: "lionsmane", emoji: "🍄", onset: "langsam", watch: ["fokus", "stimmung"],
    de: { slug: "lions-mane", name: "Lion's Mane", why: "Viele nehmen Lion's Mane und achten vor allem auf Fokus und Stimmung.", when: "Nimm es im Test jeden Tag zur gleichen Zeit, viele nehmen es morgens.", tip: "Fokus schwankt stark mit Schlaf und Arbeitslast. Bewerte ihn in Kolbi immer abends mit Blick auf den ganzen Tag – nicht nach der letzten Stunde." },
    en: { slug: "lions-mane", name: "Lion's Mane", why: "Many people take lion's mane and mostly pay attention to focus and mood.", when: "During the test, take it at the same time every day – many take it in the morning.", tip: "Focus varies a lot with sleep and workload. Rate it in Kolbi every evening looking back at the whole day – not just the last hour." } },
  { id: "probiotika", emoji: "🦠", onset: "mittel", watch: ["verdauung", "stimmung"],
    de: { slug: "probiotika", name: "Probiotika", why: "Viele nehmen Probiotika und achten auf ihre Verdauung und ihr allgemeines Wohlbefinden.", when: "Nimm sie im Test jeden Tag zur gleichen Zeit, wie auf der Packung angegeben.", tip: "Ernährung im Test möglichst gleich halten – ein Urlaub oder eine neue Diät mitten im Test macht den Vergleich wertlos." },
    en: { slug: "probiotics", name: "Probiotics", why: "Many people take probiotics and pay attention to their digestion and general well-being.", when: "During the test, take them at the same time every day, as stated on the pack.", tip: "Keep your diet as stable as possible during the test – a holiday or a new diet in the middle makes the comparison worthless." } },
]

const ONSET = {
  schnell: { de: ["3–5 Tage", "Viele merken bei so etwas schon nach wenigen Tagen, ob sich etwas verändert – oder eben nicht."], en: ["3–5 days", "With something like this, many people notice within a few days whether anything changes – or not."], days: "3–5" },
  mittel: { de: ["1–2 Wochen", "Gib dem Test mindestens eine Woche, besser zwei. Kürzer sagt wenig."], en: ["1–2 weeks", "Give the test at least one week, ideally two. Shorter tells you little."], days: "7–14" },
  langsam: { de: ["2–4 Wochen (oder länger)", "Ehrlich: Wenn sich überhaupt etwas zeigt, dann eher über Wochen. Ein Kurztest kann trotzdem zeigen, ob du dich spürbar anders fühlst – und was es dich kostet."], en: ["2–4 weeks (or longer)", "Honestly: if anything shows at all, it tends to be over weeks. A short test can still show whether you feel noticeably different – and what it costs you."] },
}

/** Fertiger Seiteninhalt (Markdown-ähnlich als HTML-Bausteine) + FAQ für JSON-LD */
export function testPage(item, lang) {
  const x = item[lang], en = lang === "en", o = ONSET[item.onset][lang]
  const dims = item.watch.map(d => DIMS[d][en ? 1 : 0])
  const b = s => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
  const title = en ? `Does ${x.name} work for me? How to test it yourself` : `Wirkt ${x.name} bei mir? So testest du es selbst`
  const desc = en ? `A simple self-test for ${x.name}: track your normal, take only ${x.name}, rate ${dims.length} things each evening, compare honestly. No promises – just your own data.`
    : `Einfacher Selbsttest für ${x.name}: dein Normal festhalten, nur ${x.name} nehmen, abends ${dims.length} Dinge bewerten, ehrlich vergleichen. Keine Versprechen – nur deine eigenen Daten.`
  const faq = en ? [
    [`How long should I test ${x.name}?`, `${o[0]}. ${o[1]}`],
    [`What should I pay attention to with ${x.name}?`, `Many people watch ${dims.map(d => d.slice(d.indexOf(" ") + 1).toLowerCase()).join(", ")}. Rate the same things every evening – before (your normal) and during the test.`],
    [`How do I know ${x.name} makes no difference for me?`, `If your averages during the test are barely different from your normal (less than about half a star on a 5-star scale) and your disruptors were similar, it probably makes no noticeable difference for you right now.`],
  ] : [
    [`Wie lange sollte ich ${x.name} testen?`, `${o[0]}. ${o[1]}`],
    [`Worauf soll ich bei ${x.name} achten?`, `Viele achten auf ${dims.map(d => d.slice(d.indexOf(" ") + 1)).join(", ")}. Bewerte jeden Abend dieselben Dinge – vorher (dein Normal) und während des Tests.`],
    [`Woran merke ich, dass ${x.name} bei mir keinen Unterschied macht?`, `Wenn deine Durchschnittswerte im Test kaum von deinem Normal abweichen (weniger als etwa ein halber Stern auf einer 5-Sterne-Skala) und deine Störfaktoren ähnlich waren, macht es bei dir gerade vermutlich keinen spürbaren Unterschied.`],
  ]
  const steps = en ? [
    ["1 · Find your normal (7 days)", `For a week, rate ${dims.join(", ")} every evening – <b>without</b> ${x.name}. If you already take it: pause it for a few days first (only if that's medically fine for you).`],
    [`2 · Test only ${x.name} (${o[0]})`, `${b(x.when)} Don't start anything else new at the same time – one change at a time.`],
    ["3 · One minute every evening", "Rate the same things as before, 1–5 stars, and note disruptors (alcohol, little sleep, illness, stress)."],
    ["4 · Compare honestly", "Compare the averages of your test days with your normal. Days with strong disruptors count less. A small difference is probably just noise."],
  ] : [
    ["1 · Dein Normal festhalten (7 Tage)", `Bewerte eine Woche lang jeden Abend ${dims.join(", ")} – <b>ohne</b> ${x.name}. Nimmst du es schon: erst ein paar Tage pausieren (nur, wenn das für dich medizinisch in Ordnung ist).`],
    [`2 · Nur ${x.name} testen (${o[0]})`, `${b(x.when)} Fang in der Zeit nichts anderes Neues an – immer nur eine Veränderung.`],
    ["3 · Jeden Abend eine Minute", "Bewerte dieselben Dinge wie vorher mit 1–5 Sternen und notiere Störfaktoren (Alkohol, wenig Schlaf, krank, Stress)."],
    ["4 · Ehrlich vergleichen", "Vergleiche die Durchschnitte deiner Testtage mit deinem Normal. Tage mit starken Störfaktoren zählen weniger. Ein kleiner Unterschied ist vermutlich nur Zufall."],
  ]
  const html = `<p class="kicker">${item.emoji} ${en ? "Self-test guide" : "Selbsttest-Anleitung"}</p>
<h1>${title}</h1>
<p class="lead">${x.why} ${en ? `Studies talk about averages. Whether <b>you</b> notice a difference only your own comparison can show – here's how.` : `Studien sprechen über Durchschnitte. Ob <b>du</b> einen Unterschied merkst, zeigt nur dein eigener Vergleich – so geht's.`}</p>
<div class="tbox"><div><span>${en ? "Pay attention to" : "Worauf achten"}</span><b>${dims.join(" · ")}</b></div><div><span>${en ? "Test length" : "Testdauer"}</span><b>${o[0]}</b></div></div>
<h2>${en ? "The test in 4 steps" : "Der Test in 4 Schritten"}</h2>
${steps.map(([h, p]) => `<div class="tstep"><h3>${h}</h3><p>${p}</p></div>`).join("\n")}
<blockquote>💡 ${b(x.tip)}</blockquote>
<h2>${en ? "How long does it take?" : "Wie lange dauert es?"}</h2><p>${o[1]}</p>
<h2>${en ? "Typical mistakes" : "Typische Fehler"}</h2>
<ul>${(en ? ["Starting several supplements at once – then nobody knows what did what.", "Skipping the normal – without a baseline there's no comparison.", "Giving up after two days – or judging by one great (or terrible) day."]
    : ["Mehrere Supplements gleichzeitig starten – danach weiß niemand mehr, was was gemacht hat.", "Kein Normal festhalten – ohne Ausgangswert kein Vergleich.", "Nach zwei Tagen aufgeben – oder nach einem super (oder miesen) Tag urteilen."]).map(s => `<li>${s}</li>`).join("")}</ul>
<h2>${en ? "FAQ" : "Häufige Fragen"}</h2>
${faq.map(([q, a]) => `<details class="tfaq"><summary>${q}</summary><p>${a}</p></details>`).join("\n")}
<p class="fine" style="margin-top:22px">⚠️ ${en ? "This is not medical advice and makes no claims about effects. If you take medication, are pregnant or have a health condition, talk to a doctor or pharmacist before starting or stopping anything."
    : "Keine medizinische Beratung und keine Aussage über Wirkungen. Wenn du Medikamente nimmst, schwanger bist oder Vorerkrankungen hast, sprich vor dem Starten oder Absetzen mit Ärztin, Arzt oder Apotheke."}</p>`
  return { title, desc, html, faq, slug: x.slug, name: x.name }
}
