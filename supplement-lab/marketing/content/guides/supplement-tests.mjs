// ── „Wirkt X bei mir?“-Selbsttest-Seiten (SEO) ─────────────────────────────────
// Regeln (legal/health-claims-check.md): NIE sagen, dass ein Supplement etwas bewirkt. Wir beschreiben nur,
// worauf Leute achten und wie man es bei sich selbst sauber testet. Testdauer passt zu ONSET_INFO in der App.
// onset: schnell = Stunden–Tage · mittel = 1–3 Wochen · langsam = Wochen–Monate

export const DIMS = {
  schlaf: ["😴 Schlaf", "😴 Sleep"], ruhe: ["🧘 Ruhe", "🧘 Calm"], koerper: ["💪 Körpergefühl", "💪 Body"],
  stimmung: ["😊 Stimmung", "😊 Mood"], energie: ["⚡ Energie", "⚡ Energy"], fokus: ["🎯 Fokus", "🎯 Focus"],
  gelenke: ["🦴 Gelenke", "🦴 Joints"], verdauung: ["🫃 Verdauung", "🫃 Digestion"],
  haut: ["✨ Haut & Haar", "✨ Skin & hair"], libido: ["🔥 Lust", "🔥 Libido"],
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
  // ── Etappe 2 (Okt 2026, Nachfrage laut research/2026-10-demand.md) ──
  // Optionale Felder je Sprache: notice (Kasten „Wichtig vorab“), faqMore (zusätzliche FAQ), faq (ersetzt alle FAQ),
  // title/desc/lead2 (eigener Rahmen), step1 ({dims} = Bereiche), step2h ({len} = Testdauer), mistake, onsetNote, cta {h, p, btn}
  { id: "melatonin", emoji: "🦉", onset: "schnell", watch: ["schlaf", "energie"],
    de: { slug: "melatonin", name: "Melatonin", why: "Viele nehmen Melatonin am Abend, manche auch bei Jetlag oder Schichtarbeit, und achten vor allem auf ihren Schlaf und darauf, wie wach sie am nächsten Tag sind.", when: "Nimm es im Test jeden Abend zur gleichen Zeit, z. B. 30–60 Minuten vor dem Schlafen – und geh möglichst zur gleichen Uhrzeit ins Bett.", tip: "Schlaf hängt stark an Störfaktoren: Kaffee am Nachmittag, Alkohol, spätes Handy, Lärm, Stress. Markiere sie in Kolbi jeden Abend – sonst vergleichst du am Ende deine Abende, nicht Melatonin mit ohne.",
      notice: "In Deutschland gilt Melatonin nur in **niedriger Dosis (bis 1 mg pro Tag)** als Nahrungsergänzungsmittel. Höhere Dosen sind Arzneimittel – das klärst du mit Ärztin, Arzt oder Apotheke, nicht mit einer App. Wenn du schwanger bist, stillst oder Medikamente nimmst: nicht ohne Rücksprache starten. Melatonin ist nicht für die Dauereinnahme gedacht, und diese Anleitung richtet sich nur an Erwachsene. Kolbi gibt keine Dosis-Empfehlung.",
      faqMore: [["Ist Melatonin in Deutschland ein Nahrungsergänzungsmittel?", "Nur in niedriger Dosis: Bis 1 mg pro Tag gilt Melatonin als Nahrungsergänzungsmittel, höhere Dosen sind Arzneimittel. Alles darüber klärst du mit Ärztin, Arzt oder Apotheke. Kolbi gibt keine Dosis-Empfehlung."]] },
    en: { slug: "melatonin", name: "Melatonin", why: "Many people take melatonin in the evening – some also for jet lag or shift work – and mostly pay attention to their sleep and how awake they feel the next day.", when: "During the test, take it at the same time every evening, e.g. 30–60 minutes before bed – and try to go to bed at the same time.", tip: "Sleep depends a lot on disruptors: afternoon coffee, alcohol, late phone time, noise, stress. Tag them in Kolbi every evening – otherwise you end up comparing your evenings, not melatonin with no melatonin.",
      notice: "Rules differ by country. In Germany, melatonin only counts as a food supplement at a **low dose (up to 1 mg a day)**; higher doses are classed as medicines – check those with a doctor or pharmacist, not with an app. If you're pregnant, breastfeeding or take medication, don't start without talking to them first. Melatonin isn't meant for long-term use, and this guide is for adults only. Kolbi doesn't recommend doses.",
      faqMore: [["Is melatonin a food supplement?", "It depends on the country. In Germany, melatonin only counts as a food supplement up to 1 mg a day; higher doses are medicines. Elsewhere the rules differ – check what applies where you live and talk to a doctor or pharmacist. Kolbi doesn't recommend doses."]] } },
  { id: "kollagen", emoji: "✨", onset: "langsam", watch: ["haut", "gelenke"],
    de: { slug: "kollagen", name: "Kollagen", why: "Viele nehmen Kollagen, oft als Pulver im Kaffee oder Smoothie, und achten auf Haut, Haare und ihre Gelenke.", when: "Nimm es im Test jeden Tag zur gleichen Zeit, z. B. morgens im Kaffee – Hauptsache gleichbleibend.", tip: "Ehrlich: Bei Kollagen zeigt sich im Kurztest oft wenig. Wenn du es wissen willst, plane eher 8 Wochen ein, lass deine Hautpflege in der Zeit gleich und mach am Anfang und am Ende ein Foto bei gleichem Licht – dann vergleichst du nicht nur aus dem Gedächtnis.",
      faqMore: [["Warum merke ich bei Kollagen im Kurztest kaum etwas?", "Haut, Haare und Gelenke ändern sich im Alltag nur langsam. Ein Unterschied – falls es bei dir einen gibt – zeigt sich deshalb eher über Wochen als über Tage. Ein Kurztest zeigt dir vor allem, ob du dich spürbar anders fühlst und was dich das Pulver kostet."]] },
    en: { slug: "collagen", name: "Collagen", why: "Many people take collagen, often as a powder in coffee or a smoothie, and pay attention to their skin, hair and joints.", when: "During the test, take it at the same time every day, e.g. in your morning coffee – what matters is keeping it the same.", tip: "Honestly: with collagen, a short test often shows little. If you really want to know, plan for about 8 weeks, keep your skincare the same and take a photo in the same light at the start and the end – so you're not comparing from memory alone.",
      faqMore: [["Why do I notice so little with collagen in a short test?", "Skin, hair and joints only change slowly in everyday life. So a difference – if there is one for you – tends to show over weeks rather than days. A short test mainly shows whether you feel noticeably different and what the powder costs you."]] } },
  { id: "b12", emoji: "🔋", onset: "langsam", watch: ["energie", "fokus"],
    de: { slug: "vitamin-b12", name: "Vitamin B12", why: "Viele nehmen Vitamin B12 – oft bei veganer oder vegetarischer Ernährung – und achten auf Energie und Fokus.", when: "Nimm es im Test jeden Tag zur gleichen Zeit, viele nehmen es morgens.", tip: "Bei Vitamin B12 sagt ein Bluttest oft mehr als dein Gefühl. Lass den Wert am besten vor dem Test und danach bei Ärztin oder Arzt bestimmen. Kolbi hilft dir, nebenbei festzuhalten, wie es dir geht – ersetzt aber keine Laborwerte.",
      notice: "Ernährst du dich vegan? Dann setz B12 nicht einfach ab, um dein Normal zu messen – sprich vorher mit Ärztin, Arzt oder Apotheke. Ein Blutwert vorher und nachher ist hier der ehrlichere Vergleich.",
      faqMore: [["Brauche ich für den B12-Test einen Bluttest?", "Für den Selbsttest nicht zwingend – aber bei B12 sagt ein Bluttest oft mehr als dein Gefühl. Am aussagekräftigsten: Wert vorher bestimmen lassen, testen, Wert nachher bestimmen lassen. Kolbi hält dazwischen fest, wie es dir geht."]] },
    en: { slug: "vitamin-b12", name: "Vitamin B12", why: "Many people take vitamin B12 – often on a vegan or vegetarian diet – and pay attention to energy and focus.", when: "During the test, take it at the same time every day – many take it in the morning.", tip: "With vitamin B12, a blood test often tells you more than how you feel. Ideally, have your level checked by a doctor before and after the test. Kolbi helps you keep track of how you're doing – but it doesn't replace lab values.",
      notice: "Are you vegan? Then don't just stop B12 to measure your normal – talk to a doctor or pharmacist first. A blood value before and after is the more honest comparison here.",
      faqMore: [["Do I need a blood test for the B12 test?", "Not necessarily for the self-test – but with B12 a blood test often tells you more than how you feel. The most telling way: get your level checked, test, get it checked again. Kolbi keeps track of how you're doing in between."]] } },
  { id: "zink", emoji: "🛡️", onset: "langsam", watch: ["koerper", "haut", "libido"],
    de: { slug: "zink", name: "Zink", why: "Viele nehmen Zink und achten auf ihr Körpergefühl und ihre Haut – manche auch auf ihre Lust.", when: "Nimm es im Test jeden Tag zur gleichen Zeit zu einer Mahlzeit – auf leeren Magen ist es vielen unangenehm. Halte Abstand zu Eisen- und Calcium-Präparaten.", tip: "Zink nicht dauerhaft hoch dosieren: Auf Dauer zu viel kann den Kupferhaushalt stören. Zähl auch Zink aus Multivitamin oder Mineral-Mix mit. Kolbi gibt keine Dosis-Empfehlung.",
      faqMore: [["Wie viel Zink ist zu viel?", "Für Erwachsene nennt die EFSA 25 mg pro Tag (aus allen Quellen zusammen) als obere Grenze für die dauerhafte Aufnahme. Rechne Zink aus Multivitamin und anderen Präparaten mit. Alles darüber klärst du mit Ärztin, Arzt oder Apotheke."]] },
    en: { slug: "zinc", name: "Zinc", why: "Many people take zinc and pay attention to how their body feels and their skin – some also to their libido.", when: "During the test, take it at the same time every day with a meal – many find it unpleasant on an empty stomach. Keep it apart from iron and calcium supplements.", tip: "Don't take high doses of zinc long term: too much over time can upset your copper balance. Count the zinc in your multivitamin or mineral mix too. Kolbi doesn't recommend doses.",
      faqMore: [["How much zinc is too much?", "For adults, EFSA sets 25 mg a day (from all sources combined) as the upper limit for long-term intake. Count the zinc in multivitamins and other supplements too. Anything beyond that is for a doctor or pharmacist to advise on."]] } },
  { id: "eisen", emoji: "🩸", onset: "langsam", watch: ["energie", "koerper"],
    de: { slug: "eisen", name: "Eisen", title: "Wirkt Eisen bei mir? Erst Blutbild, dann Befinden festhalten",
      desc: "Eisen ist nichts zum Ausprobieren: erst Blutbild (Ferritin) und Absprache mit Ärztin oder Arzt. So hältst du nebenbei fest, wie es dir geht – ohne Laborwerte zu ersetzen.",
      why: "Eisen ist kein Supplement zum Ausprobieren. Viele nehmen es erst, nachdem ein Blutbild (Ferritin) einen niedrigen Wert gezeigt hat und Ärztin oder Arzt zugestimmt haben – und achten dann nebenbei auf Energie und Körpergefühl.",
      lead2: "Ob die Einnahme bei dir passt, zeigt dein Blutwert. Kolbi hilft dir, nebenbei festzuhalten, wie es dir geht – so geht's.",
      notice: "**Bitte nicht auf Verdacht testen.** Eisen nimmst du nur nach einem Blutbild (Ferritin) und in Absprache mit Ärztin oder Arzt – zu viel Eisen schadet dem Körper. Kolbi hilft dir, dein Befinden nebenbei festzuhalten. Laborwerte ersetzt das nicht.",
      when: "Wann und wie du Eisen nimmst, legt am besten deine Ärztin oder dein Arzt fest. Halte dich an diese Zeit, jeden Tag gleich.",
      step1: "Bewerte eine Woche lang jeden Abend {dims} – <b>bevor</b> du mit Eisen anfängst, z. B. zwischen Blutbild und Start. Bekommst du schon Eisen verordnet: nicht eigenmächtig pausieren, sondern einfach ab jetzt mitschreiben.",
      step2h: "2 · Eisen nach Absprache nehmen ({len})",
      tip: "Notiere deine Blutwerte (Ferritin vorher und bei der Kontrolle) zusammen mit deinen Kolbi-Notizen. Dein Befinden ist die Ergänzung – entscheiden tun die Laborwerte und das Gespräch mit Ärztin oder Arzt.",
      mistake: "Eisen auf Verdacht nehmen, weil man müde ist – ohne Blutbild und ohne Absprache.",
      onsetNote: "Bei Eisen legt deine Ärztin oder dein Arzt fest, wann kontrolliert wird. Dein Befinden ergänzt den Blutwert, es ersetzt ihn nicht.",
      faq: [["Kann ich Eisen einfach mal ausprobieren?", "Nein. Eisen nimmst du nur nach einem Blutbild (Ferritin) und in Absprache mit Ärztin oder Arzt. Kolbi ist dafür da, dein Befinden festzuhalten – nicht für die Entscheidung, ob du Eisen brauchst."],
        ["Wie lange sollte ich mein Befinden mit Eisen festhalten?", "Mindestens bis zur nächsten Blutkontrolle, die deine Ärztin oder dein Arzt festlegt. Veränderungen im Befinden zeigen sich – wenn überhaupt – eher über Wochen als über Tage."],
        ["Worauf achten viele bei Eisen?", "Viele achten auf Energie und Körpergefühl. Bewerte jeden Abend dieselben Dinge – vor dem Start (dein Normal) und während der Einnahme."],
        ["Was, wenn ich keinen Unterschied merke?", "Bei Eisen sagt das der Kontroll-Blutwert, nicht dein Gefühl. Wenn sich dein Befinden kaum von deinem Normal unterscheidet, ist das eine nützliche Notiz für das Gespräch mit Ärztin oder Arzt – aber kein Grund, eigenmächtig etwas zu ändern."]],
      cta: { h: "Kolbi schreibt dein Befinden mit", p: "Für alle, die Eisen nach Blutbild und in Absprache nehmen: Normal, Abend-Check-in, ehrlicher Vergleich – als Ergänzung zu deinen Laborwerten. In der Beta kostenlos, ohne Konto.", btn: "Befinden festhalten" } },
    en: { slug: "iron", name: "Iron", title: "Does iron work for me? Blood test first, then track how you feel",
      desc: "Iron isn't something to just try: get a blood test (ferritin) and agree it with your doctor first. Here's how to track how you feel alongside – without replacing lab values.",
      why: "Iron isn't a supplement to just try out. Many people only take it after a blood test (ferritin) showed a low value and their doctor agreed – and then also pay attention to energy and how their body feels.",
      lead2: "Whether it's right for you is shown by your blood values. Kolbi helps you keep track of how you feel alongside – here's how.",
      notice: "**Please don't test this on a hunch.** Only take iron after a blood test (ferritin) and in agreement with your doctor – too much iron harms the body. Kolbi helps you keep track of how you feel alongside. It doesn't replace lab values.",
      when: "When and how you take iron is best decided by your doctor. Stick to that time, the same every day.",
      step1: "For a week, rate {dims} every evening – <b>before</b> you start iron, e.g. between your blood test and the start. Already prescribed iron? Don't pause it on your own – just start tracking from now.",
      step2h: "2 · Take iron as agreed ({len})",
      tip: "Note your blood values (ferritin before and at the check-up) next to your Kolbi notes. How you feel is the add-on – the lab values and the talk with your doctor are what decide.",
      mistake: "Taking iron on a hunch because you're tired – without a blood test and without asking a doctor.",
      onsetNote: "With iron, your doctor decides when to re-check. How you feel adds to the blood value – it doesn't replace it.",
      faq: [["Can I just try iron and see?", "No. Only take iron after a blood test (ferritin) and in agreement with your doctor. Kolbi is there to track how you feel – not to decide whether you need iron."],
        ["How long should I track how I feel on iron?", "At least until your next blood check, which your doctor sets. Changes in how you feel – if any – tend to show over weeks rather than days."],
        ["What do people pay attention to with iron?", "Many people watch energy and how their body feels. Rate the same things every evening – before you start (your normal) and while taking it."],
        ["What if I don't notice any difference?", "With iron, the follow-up blood value tells you that, not your feeling. If how you feel barely differs from your normal, that's a useful note for the talk with your doctor – but no reason to change anything on your own."]],
      cta: { h: "Kolbi keeps track of how you feel", p: "For anyone taking iron after a blood test and with their doctor's OK: normal, evening check-in, honest comparison – alongside your lab values. Free in the beta, no account.", btn: "Track how you feel" } } },
  { id: "multivitamin", emoji: "🌈", onset: "langsam", watch: ["energie", "koerper"],
    de: { slug: "multivitamin", name: "Multivitamin", why: "Viele nehmen ein Multivitamin als Grundversorgung – und fragen sich irgendwann, ob sie davon überhaupt etwas merken. Meist achten sie auf Energie und Körpergefühl.", when: "Nimm es im Test jeden Tag zum Frühstück, zusammen mit etwas Essen.", tip: "Ein Multi enthält oft Dinge, die du schon einzeln nimmst (z. B. Vitamin D, Zink, Magnesium). Rechne vor dem Start zusammen – gerade Zink solltest du nicht dauerhaft hoch dosieren. Und starte kein neues Einzelpräparat parallel zum Multi.",
      faqMore: [["Lohnt sich ein Multivitamin für mich?", "Das kann dir keine Seite pauschal sagen. Ein Selbsttest zeigt dir, ob du im Alltag einen Unterschied merkst – und der Kosten-Rechner, was dich das Multi im Jahr kostet. Bei Fragen zu Mangel oder Blutwerten: Ärztin, Arzt oder Apotheke."]] },
    en: { slug: "multivitamin", name: "Multivitamin", why: "Many people take a multivitamin as a baseline – and at some point wonder whether they notice anything at all. Most pay attention to energy and how their body feels.", when: "During the test, take it with breakfast every day, together with some food.", tip: "A multi often contains things you already take separately (e.g. vitamin D, zinc, magnesium). Add it all up before you start – zinc especially shouldn't be taken in high doses long term. And don't start a new single supplement alongside the multi.",
      faqMore: [["Is a multivitamin worth it for me?", "No page can tell you that across the board. A self-test shows whether you notice a difference in everyday life – and the cost calculator shows what the multi costs you per year. For questions about deficiencies or blood values: a doctor or pharmacist."]] } },
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
  const title = x.title ?? (en ? `Does ${x.name} work for me? How to test it yourself` : `Wirkt ${x.name} bei mir? So testest du es selbst`)
  const desc = x.desc ?? (en ? `A simple self-test for ${x.name}: track your normal, take only ${x.name}, rate ${dims.length} things each evening, compare honestly. No promises – just your own data.`
    : `Einfacher Selbsttest für ${x.name}: dein Normal festhalten, nur ${x.name} nehmen, abends ${dims.length} Dinge bewerten, ehrlich vergleichen. Keine Versprechen – nur deine eigenen Daten.`)
  const faq = x.faq ? [...x.faq] : en ? [
    [`How long should I test ${x.name}?`, `${o[0]}. ${o[1]}`],
    [`What should I pay attention to with ${x.name}?`, `Many people watch ${dims.map(d => d.slice(d.indexOf(" ") + 1).toLowerCase()).join(", ")}. Rate the same things every evening – before (your normal) and during the test.`],
    [`How do I know ${x.name} makes no difference for me?`, `If your averages during the test are barely different from your normal (less than about half a star on a 5-star scale) and your disruptors were similar, it probably makes no noticeable difference for you right now.`],
  ] : [
    [`Wie lange sollte ich ${x.name} testen?`, `${o[0]}. ${o[1]}`],
    [`Worauf soll ich bei ${x.name} achten?`, `Viele achten auf ${dims.map(d => d.slice(d.indexOf(" ") + 1)).join(", ")}. Bewerte jeden Abend dieselben Dinge – vorher (dein Normal) und während des Tests.`],
    [`Woran merke ich, dass ${x.name} bei mir keinen Unterschied macht?`, `Wenn deine Durchschnittswerte im Test kaum von deinem Normal abweichen (weniger als etwa ein halber Stern auf einer 5-Sterne-Skala) und deine Störfaktoren ähnlich waren, macht es bei dir gerade vermutlich keinen spürbaren Unterschied.`],
  ]
  if (x.faqMore) faq.push(...x.faqMore)
  const step1 = x.step1 ? x.step1.replace("{dims}", dims.join(", ")) : null
  const step2h = x.step2h ? x.step2h.replace("{len}", o[0]) : null
  const steps = en ? [
    ["1 · Find your normal (7 days)", step1 ?? `For a week, rate ${dims.join(", ")} every evening – <b>without</b> ${x.name}. If you already take it: pause it for a few days first (only if that's medically fine for you).`],
    [step2h ?? `2 · Test only ${x.name} (${o[0]})`, `${b(x.when)} Don't start anything else new at the same time – one change at a time.`],
    ["3 · One minute every evening", "Rate the same things as before, 1–5 stars, and note disruptors (alcohol, little sleep, illness, stress)."],
    ["4 · Compare honestly", "Compare the averages of your test days with your normal. Days with strong disruptors count less. A small difference is probably just noise."],
  ] : [
    ["1 · Dein Normal festhalten (7 Tage)", step1 ?? `Bewerte eine Woche lang jeden Abend ${dims.join(", ")} – <b>ohne</b> ${x.name}. Nimmst du es schon: erst ein paar Tage pausieren (nur, wenn das für dich medizinisch in Ordnung ist).`],
    [step2h ?? `2 · Nur ${x.name} testen (${o[0]})`, `${b(x.when)} Fang in der Zeit nichts anderes Neues an – immer nur eine Veränderung.`],
    ["3 · Jeden Abend eine Minute", "Bewerte dieselben Dinge wie vorher mit 1–5 Sternen und notiere Störfaktoren (Alkohol, wenig Schlaf, krank, Stress)."],
    ["4 · Ehrlich vergleichen", "Vergleiche die Durchschnitte deiner Testtage mit deinem Normal. Tage mit starken Störfaktoren zählen weniger. Ein kleiner Unterschied ist vermutlich nur Zufall."],
  ]
  const html = `<p class="kicker">${item.emoji} ${en ? "Self-test guide" : "Selbsttest-Anleitung"}</p>
<h1>${title}</h1>
<p class="lead">${x.why} ${x.lead2 ?? (en ? `Studies talk about averages. Whether <b>you</b> notice a difference only your own comparison can show – here's how.` : `Studien sprechen über Durchschnitte. Ob <b>du</b> einen Unterschied merkst, zeigt nur dein eigener Vergleich – so geht's.`)}</p>
${x.notice ? `<div class="tnote"><b>${en ? "Before you start" : "Wichtig vorab"}</b><p>${b(x.notice)}</p></div>` : ""}
<div class="tbox"><div><span>${en ? "Pay attention to" : "Worauf achten"}</span><b>${dims.join(" · ")}</b></div><div><span>${en ? "Test length" : "Testdauer"}</span><b>${o[0]}</b></div></div>
<h2>${en ? "The test in 4 steps" : "Der Test in 4 Schritten"}</h2>
${steps.map(([h, p]) => `<div class="tstep"><h3>${h}</h3><p>${p}</p></div>`).join("\n")}
<blockquote>💡 ${b(x.tip)}</blockquote>
<h2>${en ? "How long does it take?" : "Wie lange dauert es?"}</h2><p>${o[1]}${x.onsetNote ? ` ${x.onsetNote}` : ""}</p>
<h2>${en ? "Typical mistakes" : "Typische Fehler"}</h2>
<ul>${[...(x.mistake ? [x.mistake] : []), ...(en ? ["Starting several supplements at once – then nobody knows what did what.", "Skipping the normal – without a baseline there's no comparison.", "Giving up after two days – or judging by one great (or terrible) day."]
    : ["Mehrere Supplements gleichzeitig starten – danach weiß niemand mehr, was was gemacht hat.", "Kein Normal festhalten – ohne Ausgangswert kein Vergleich.", "Nach zwei Tagen aufgeben – oder nach einem super (oder miesen) Tag urteilen."])].map(s => `<li>${s}</li>`).join("")}</ul>
<h2>${en ? "FAQ" : "Häufige Fragen"}</h2>
${faq.map(([q, a]) => `<details class="tfaq"><summary>${q}</summary><p>${a}</p></details>`).join("\n")}
<p class="fine" style="margin-top:22px">⚠️ ${en ? "This is not medical advice and makes no claims about effects. If you take medication, are pregnant or have a health condition, talk to a doctor or pharmacist before starting or stopping anything."
    : "Keine medizinische Beratung und keine Aussage über Wirkungen. Wenn du Medikamente nimmst, schwanger bist oder Vorerkrankungen hast, sprich vor dem Starten oder Absetzen mit Ärztin, Arzt oder Apotheke."}</p>`
  return { title, desc, html, faq, slug: x.slug, name: x.name, cta: x.cta }
}
