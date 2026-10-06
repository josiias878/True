// Quelle für die 8 Reddit-Beiträge (Okt 2026). Hier ändern, dann:
//   node supplement-lab/marketing/channels/reddit-posts.src.mjs
// → schreibt reddit-posts.json (für die Kopier-Seite) und reddit-posts.md (für Menschen) neu.
// Regeln: brand/BRAND.md + legal/health-claims-check.md – keine Wirkversprechen, keine erfundenen Erlebnisse.
import fs from "fs"
const dir = new URL(".", import.meta.url).pathname
const utm = (path, sub, id) =>
  `https://kolbi-smoky.vercel.app${path}?utm_source=reddit&utm_medium=social&utm_campaign=${sub.toLowerCase()}&utm_content=${id}`

const posts = [
  // ───────────────────────────── Woche 1 ─────────────────────────────
  {
    id: "reddit-01",
    date: "2026-10-08",
    day: "Do 08.10.",
    time: "15:00 (DE-Zeit, US-Vormittag)",
    sub: "r/SelfExperiments",
    lang: "en",
    kind: "value",
    image: "../content/reddit/reddit-01.png", // 1200×1200, gerendert mit content/reddit/render.mjs
    precondition: "Keine Mod-Rückfrage nötig. Vorher Sidebar/Regeln kurz lesen. Kein Link, Kolbi wird nicht erwähnt.",
    flair: "Falls Flair Pflicht: „Method“/„Protocol“/„Discussion“ – sonst ohne.",
    title: "A copy-paste template for n=1 supplement tests (one change at a time)",
    body: `Self-experiments with supplements usually fail for boring reasons: several changes at once, no record of what "normal" looked like, and a decision made by gut feeling at the end.

Here's a plain template you can paste into a notes app or a spreadsheet. No tools needed.

    QUESTION: Do I notice a difference with [X] compared with my normal?

    WHAT I RATE (1–5, same time every evening, takes ~1 min):
      sleep · energy · calm · focus   (pick 3–4 and keep them fixed)

    PHASE 1 – NORMAL (7 evenings): change nothing, just rate
    PHASE 2 – TEST (14+ evenings): add only [X], same time of day,
              keep coffee, training and bedtime as steady as you can
    PHASE 3 – OFF AGAIN (optional, 5–7 evenings): stop [X], keep rating

    TAGS (note them, don't skip the day):
      alcohol · short night · hard training · stressful day · sick · travel

    DECISION RULE (write it down BEFORE you start), for example:
      "Keep if my main rating is clearly above my normal swing. Otherwise drop."

**Daily log**

| Date | Phase | Sleep | Energy | Calm | Focus | Tags | Note |
|---|---|---|---|---|---|---|---|
| | normal | | | | | | |

**A few rules that make the result more honest**

- Write the decision rule before day 1. Afterwards it's too easy to talk yourself into a result.
- Missed an evening? Leave it blank. Don't fill it in from memory.
- Look at your normal week: how much do your ratings swing on their own? A test difference smaller than that swing is probably noise.
- "No difference" is a real result. It's also the cheapest one.
- One thing at a time. If you change two things, you learn about neither.

Not medical advice. If you take medication, are pregnant or have a health condition, check with a doctor or pharmacist before adding anything.

What would you add or change? Curious which metrics people here keep fixed across tests.`,
    firstComment: `Filled-in example row so it's clearer (made-up numbers, just to show the format):

| Date | Phase | Sleep | Energy | Calm | Focus | Tags | Note |
|---|---|---|---|---|---|---|---|
| Oct 9 | normal | 3 | 4 | 3 | 3 | hard training | late dinner |`,
    link: null,
  },
  {
    id: "reddit-02",
    date: "2026-10-11",
    day: "So 11.10.",
    time: "16:00 (DE-Zeit)",
    sub: "r/QuantifiedSelf",
    lang: "en",
    kind: "value",
    image: "../content/reddit/reddit-02.png", // 1200×1200, gerendert mit content/reddit/render.mjs
    precondition: "Keine Mod-Rückfrage nötig. Kein Link, Kolbi wird nicht erwähnt.",
    flair: "Falls angeboten: „Discussion“ oder „Method“.",
    title: "The baseline week is the most underrated part of a self-experiment – a simple way to set one up",
    body: `When people test something on themselves (a supplement, a new bedtime, less coffee), most of the attention goes to the test phase. The part that decides whether you can read the result at all is the week before it: your baseline.

**Why it matters**

Your daily ratings move on their own. Bad night, busy day, weather, training. Without a baseline you can't tell whether a change in the test phase is the thing you're testing or just your normal swing.

**A simple setup**

1. **Pick 3–4 things you rate every evening**, 1–5. For example sleep, energy, calm, focus. Same scale, same time of day, every day.
2. **Rate for at least 7 evenings without changing anything.** Seven days catches a full week rhythm (weekend vs. workdays).
3. **Tag unusual days** (alcohol, short night, hard training, stress, being sick) instead of skipping them.
4. **Write down two numbers per metric:** the average and the range (lowest to highest).
5. **Treat that range as your noise band.** If the test-phase average stays inside it, you can't really distinguish it from a normal week.

**Example (made-up numbers):** baseline sleep ratings 3, 4, 3, 2, 4, 3, 4 → average ≈ 3.3, range 2–4. A test-phase average of 3.5 sits well inside that range, so on its own it doesn't tell you much. That's still a useful answer.

**Two things that help**

- **Re-baseline after big life changes** (new job, new training plan, different season). Your normal moves too.
- **Don't look at your past ratings while rating.** It's surprisingly easy to anchor on yesterday's number.

How long do you run your baselines? Does anyone here re-baseline on a schedule?`,
    firstComment: null,
    link: null,
  },
  // ───────────────────────────── Woche 2 ─────────────────────────────
  {
    id: "reddit-03",
    date: "2026-10-14",
    day: "Mi 14.10.",
    time: "15:00 (DE-Zeit)",
    sub: "r/Biohackers",
    lang: "en",
    kind: "value",
    image: "../content/reddit/reddit-03.png", // 1200×1200, gerendert mit content/reddit/render.mjs
    precondition: "Keine Mod-Rückfrage nötig. Regel dort: medizinischer Rat nur von Fachleuten, Empfehlungen mit Sicherheitshinweis – ist im Text drin. Kein Link. Am selben Tag die Modmails an r/SelfExperiments und r/FitnessDE schicken (Texte unten).",
    flair: "Falls Pflicht: „Discussion“ oder „Protocol“ – kein „Supplement Review“.",
    title: "You can't fully rule out placebo in a self-test – but you can make it much harder for it to fool you",
    body: `If you try something on yourself and feel a difference, the honest question is: would I have felt that anyway? You can't fully answer that with n=1. But a few habits make a self-test a lot harder to fool.

**1. Decide the metric and the rule before you start**
"I'll rate sleep 1–5 every evening, and I'll keep it only if the test average is clearly above my normal range." Written down on day 0. This removes most after-the-fact storytelling.

**2. Measure your normal first**
At least a week of ratings with no changes. Without it, any good day during the test looks like an effect.

**3. Watch out for "regression to the mean"**
People often start something new when they feel worse than usual. Many of those rough patches would have passed on their own. A baseline helps here too: you can see whether you started from an unusual low.

**4. Switch on and off more than once (A-B-A-B)**
One switch (off → on) is weak evidence. Off → on → off → on, with each block long enough, is more convincing: if the ratings follow the switches, that's harder to explain by chance or mood.

**5. Blind yourself, if the form allows it**
With capsules, another person can fill numbered containers with the real thing or identical-looking empty capsules, and keep the key until the end. You rate without knowing which phase you're in. Only do this with something you'd take anyway, not with anything that has medication interactions.

**6. Add one measure that's less suggestible**
Next to your 1–5 ratings, something you don't "feel" directly: time in bed from a sleep tracker, a short reaction-time test, steps. Not perfect either, but harder to talk yourself into.

**7. Accept "no clear difference" as a result**
That's not a failed experiment. It's information, and it usually saves money.

None of this turns a self-test into a study. It just makes the answer to "do I notice a difference?" more honest.

Not medical advice. If you take medication or have a condition, talk to a doctor or pharmacist before changing anything.

Which of these do you actually use? Has anyone here done a proper blinded A-B-A-B on themselves?`,
    firstComment: null,
    link: null,
  },
  {
    id: "reddit-04",
    date: "2026-10-17",
    day: "Sa 17.10.",
    time: "11:00",
    sub: "r/FitnessDE",
    lang: "de",
    kind: "value",
    image: "../content/reddit/reddit-04.png", // 1200×1200, gerendert mit content/reddit/render.mjs
    precondition: "Keine Mod-Rückfrage nötig. Kein Link, Kolbi wird nicht erwähnt. Vorher Sidebar lesen (Flair-Pflicht? Wochen-Thread für Ernährung?).",
    flair: "„Ernährung“ (falls vorhanden), sonst „Diskussion“.",
    title: "Supplements selbst testen: 6 Störfaktoren, die euer Ergebnis verfälschen – und wie man sie im Griff behält",
    body: `Wer ein Supplement „mal ausprobiert“, merkt oft irgendwas – oder nichts. Das Problem: Im Alltag ändert sich ständig noch etwas anderes. Hier die sechs Störfaktoren, die einen Selbsttest am häufigsten kaputt machen:

**1. Trainingsphase**
Neuer Plan, Deload, Wettkampfvorbereitung: Das verändert Energie und Schlaf oft stärker als alles andere. Möglichst nicht mitten in einem Wechsel mit dem Test anfangen.

**2. Diät oder Aufbau**
Kaloriendefizit oder -überschuss färbt fast jede Tagesbewertung. Wenn möglich: Test in einer Phase, in der die Ernährung stabil bleibt.

**3. Schlafdauer**
Eine kurze Nacht schlägt auf Energie, Laune und Fokus durch. Die Stunden aufschreiben, nicht nur die Bewertung.

**4. Alkohol**
Auch ein, zwei Bier am Abend können die nächste Bewertung verschieben. Nicht weglassen, sondern als Tag markieren.

**5. Koffein**
Mehr Kaffee in einer stressigen Woche, Pre-Workout an Trainingstagen: Menge und Uhrzeit möglichst gleich halten.

**6. Stress, Infekt, Reisen**
Solche Tage einfach markieren. Am Ende vergleicht man die normalen Tage mit den normalen Tagen.

**So wird der Test sauberer**

- **Erst eine Woche dein Normal aufschreiben**, ohne etwas zu ändern. Jeden Abend dieselben 3–4 Punkte, 1–5 (z. B. Schlaf, Energie, Ruhe, Fokus).
- **Dann nur eine Sache dazunehmen** und mindestens zwei Wochen dabei bleiben.
- **Störfaktoren markieren statt Tage streichen.**
- **Vorher festlegen, wann du es behältst.** Danach ist man nicht mehr neutral.
- „Kein Unterschied“ ist auch ein Ergebnis – und spart Geld.

Keine medizinische Beratung. Wer Medikamente nimmt, schwanger ist oder Beschwerden hat, klärt das vorher mit Ärztin, Arzt oder Apotheke.

Welche Störfaktoren habt ihr noch auf dem Schirm? Und haltet ihr beim Testen das Training bewusst gleich?`,
    firstComment: null,
    link: null,
  },
  // ───────────────────────────── Woche 3 ─────────────────────────────
  {
    id: "reddit-05",
    date: "2026-10-21",
    day: "Mi 21.10.",
    time: "15:00 (DE-Zeit)",
    sub: "r/vitamins",
    lang: "en",
    kind: "value",
    image: "../content/reddit/reddit-05.png", // 1200×1200, gerendert mit content/reddit/render.mjs
    precondition: "Keine Mod-Rückfrage nötig. Kein Link, Kolbi wird nicht erwähnt. Keine Dosen nennen – auch nicht in Antworten.",
    flair: "Falls angeboten: „Discussion“ oder „Question“.",
    title: "What a self-test can (and can't) tell you about a vitamin – and when a blood test is the better tool",
    body: `A lot of people take a multi, D, B12 or magnesium for years without knowing whether they notice anything. A simple self-test can answer part of that question. Not all of it.

**What a self-test is good for**

- "Do I notice a difference in the things I care about?" (sleep, energy, mood, focus, rated the same way every evening)
- "Is this worth the money for me?"
- Deciding between keep, maybe and drop, based on your own ratings instead of a vague feeling

**What it can't tell you**

- **Whether you're low in something.** That's what a blood test is for. For vitamin D, B12 or iron, ask your doctor. Iron in particular shouldn't be taken without bloodwork and medical advice.
- **The right dose.** That's a question for a doctor or pharmacist, not for a rating scale.
- **Anything you can't feel.** Long-term effects don't show up in a few weeks of evening ratings.

**If you want to combine both**

1. Talk to your doctor and get a blood test first if a deficiency is the actual question.
2. Rate a normal week without changes (same 3–4 things, 1–5, every evening).
3. Take only the one product for a fixed period, same dose throughout, nothing else new.
4. Tag unusual days (short night, alcohol, sick) instead of skipping them.
5. Compare your test weeks with your normal week. Re-test blood values when your doctor suggests it.

"I didn't notice a difference" is a valid result, and it doesn't automatically mean the vitamin is useless for you. It just means you didn't notice it. That's exactly why the blood test is the better tool for the deficiency question.

Has anyone here combined lab values with daily ratings? How did you structure it?`,
    firstComment: null,
    link: null,
  },
  {
    id: "reddit-06",
    date: "2026-10-24",
    day: "Sa 24.10.",
    time: "15:00 (DE-Zeit)",
    sub: "r/SideProject",
    lang: "en",
    kind: "kolbi",
    image: "../content/reddit/reddit-06.png", // 1200×1200, gerendert mit content/reddit/render.mjs
    precondition: "r/SideProject ist für Projekt-Vorstellungen gedacht (Eigenwerbung erlaubt, aber nur mit Geschichte und Feedback-Frage; nackte Links fliegen raus). Vorher 2–3 andere Projekte dort ehrlich kommentieren. Konto sollte schon etwas Kommentar-Karma haben.",
    flair: "Falls Pflicht: „Feedback Request“ oder „Launch“ – das, was angeboten wird.",
    title: "I'm building Kolbi – a little lab flask that helps you test supplements one at a time (free web app, feedback wanted)",
    body: `**What it is:** Kolbi is a free web app for structured self-experiments with supplements. A small lab-flask mascot walks you through it.

**The problem:** many people start several supplements at once and afterwards can't tell which one made a difference, if any.

**How it works**

1. **Reset:** a few days without changes, to learn your normal
2. **Test:** one supplement at a time
3. **Check-in:** about one minute every evening (sleep, energy, calm, focus)
4. **Reveal:** your test days are compared with your own normal → keep, maybe or drop

It also shows what your supplements cost per month, so "drop" has a visible upside.

**Decisions I made**

- **Local-first:** no account, the data stays on your device. There's a backup export.
- **No promises about supplements.** Kolbi doesn't tell you that something works – it helps you find out whether *you* notice a difference. A self-test isn't a study, and the app says so.
- **Stack:** React + Vite, installable as a PWA, Capacitor for the store builds (in progress). The mascot is SVG, animated with CSS.
- **Pricing:** free during the beta. After that there'll be a Pro tier (€2.99/month). Anyone who starts by Nov 30 keeps Pro for free.

**What I'd love feedback on**

- Is the onboarding too long before the first check-in?
- Mascot: charming or annoying?
- What would make you trust (or distrust) a "keep / drop" verdict like this?

I'm the solo dev, happy to answer anything about building it. Brutal feedback welcome.`,
    firstComment: `Link, if you want to try it (free, no sign-up, works in the browser): {LINK}

Not medical advice. If you take medication or have a condition, check with a doctor or pharmacist before adding anything.`,
    link: utm("/en/reddit", "sideproject", "reddit-06"),
  },
  // ───────────────────────────── Woche 4 ─────────────────────────────
  {
    id: "reddit-07",
    date: "2026-10-28",
    day: "Mi 28.10.",
    time: "15:00 (DE-Zeit)",
    sub: "r/SelfExperiments",
    lang: "en",
    kind: "kolbi",
    image: "../content/reddit/reddit-07.png", // 1200×1200, gerendert mit content/reddit/render.mjs
    precondition: "NUR nach schriftlichem OK der Mods (Modmail ab 14.10., Text unten). Kein OK bis 27.10. → Beitrag ausfallen lassen (nicht „ohne Link“ trotzdem posten – der Text nennt Kolbi).",
    flair: "Falls Pflicht: „Method“/„Protocol“ – oder was die Mods im OK nennen.",
    title: "A simple n-of-1 protocol for supplements – and a free tool that runs it (feedback wanted)",
    body: `The protocol, in short:

1. **At least 5, better 7 evenings of your normal.** Rate the same 3–4 things (sleep, energy, calm, focus), 1–5, no changes.
2. **Only one supplement** for a fixed window. Same time of day, nothing else new.
3. **Same 1-minute rating every evening.** Tag disruptors (alcohol, short night, hard training, stress) instead of skipping days.
4. **Compare the averages** with your own normal. Small differences inside your normal swing count as noise.
5. **Decide:** keep, maybe or drop. "No difference" is a valid result.

Limits, to be upfront: no blinding by default, n=1, confounders. It's a structured self-experiment, not a study, and it can't prove anything.

I'm the developer of Kolbi, a free web app that does the bookkeeping for this: reminders, the comparison, disruptor tags and a cost overview. Data stays on your device, no account. It doesn't promise that any supplement works, it only helps you test it on yourself.

What I'd like to know from people who actually run self-experiments:

- How long should a test window be for the things you'd want to test?
- Would you use an optional "off again" phase (A-B-A), or is that too much effort in practice?
- What would make you trust or distrust a result from a setup like this?`,
    firstComment: `Link for anyone who wants to try it (free, no sign-up): {LINK}

Not medical advice. If you take medication or have a condition, talk to a doctor or pharmacist first.`,
    link: utm("/en/reddit", "selfexperiments", "reddit-07"),
  },
  {
    id: "reddit-08",
    date: "2026-10-31",
    day: "Sa 31.10.",
    time: "11:00",
    sub: "r/FitnessDE",
    lang: "de",
    kind: "kolbi",
    image: "../content/reddit/reddit-08.png", // 1200×1200, gerendert mit content/reddit/render.mjs
    precondition: "NUR nach schriftlichem OK der Mods (Modmail ab 14.10., Text unten). Kein OK bis 30.10. → nicht posten.",
    flair: "„Ernährung“ oder das Flair, das die Mods nennen (manche Subs wollen „Eigenwerbung“/„Projekt“).",
    title: "Supplements einzeln statt alle gleichzeitig testen – ich baue dafür eine kostenlose App (Feedback gesucht)",
    body: `Kennt ihr das: Kreatin, Magnesium, Vitamin D, Ashwagandha … alles ungefähr gleichzeitig angefangen, und danach weiß man nicht, was was gemacht hat – oder ob überhaupt etwas.

Dafür baue ich Kolbi, eine kleine Web-App, die den Selbsttest sauber macht:

- ein paar Tage **Reset**, damit man sein Normal kennt
- dann **ein Supplement nach dem anderen**
- abends **ca. 1 Minute Check-in** (Schlaf, Energie, Ruhe, Fokus)
- **Störfaktoren markieren** (Training, kurze Nacht, Alkohol …)
- am Ende Vergleich mit dem eigenen Normal → **behalten, vielleicht oder raus**
- dazu die **Kosten pro Monat**, damit man sieht, was man sich sparen kann

Kein Konto, die Daten bleiben auf dem Handy. In der Beta kostenlos; wer bis 30. November startet, behält Pro dauerhaft gratis (danach 2,99 €/Monat). Die App verspricht nicht, dass ein Supplement wirkt – sie hilft nur, es bei sich selbst zu testen. Ein Selbstversuch ist keine Studie.

Ich bin der Entwickler und suche ehrliches Feedback:

- Was müsste so ein Test haben, damit ihr dem eigenen Ergebnis traut?
- Wie würdet ihr Trainingsphasen berücksichtigen – Test pausieren oder einfach markieren?
- Ist ein Abend-Check-in realistisch, oder lieber morgens?`,
    firstComment: `Link zum Ausprobieren (kostenlos, ohne Anmeldung, läuft im Browser): {LINK}

Keine medizinische Beratung. Wer Medikamente nimmt oder Beschwerden hat: vorher mit Ärztin, Arzt oder Apotheke sprechen.`,
    link: utm("/reddit", "fitnessde", "reddit-08"),
  },
]

// Link in den ersten Kommentar einsetzen (Platzhalter {LINK}).
for (const p of posts) if (p.firstComment && p.link) p.firstComment = p.firstComment.replace("{LINK}", p.link)

// Selbstkontrolle: verbotene Wörter laut BRAND.md §4 (grob, ersetzt nicht das Lesen).
const banned = /\b(boost|cures?|heals?|detox|proven|clinically|miracle|game-?changer|hack your|toxic|heilt|lindert|beugt vor|bewiesen|wundermittel|gamechanger|garantiert)\b/i
for (const p of posts) {
  const t = [p.title, p.body, p.firstComment ?? ""].join("\n")
  const m = t.match(banned); if (m) throw new Error(`${p.id}: Wort „${m[0]}“ prüfen`)
  if (p.kind === "value" && (p.link || /kolbi/i.test(t))) throw new Error(`${p.id}: Mehrwert-Post darf weder Link noch Kolbi enthalten`)
  if (p.title.length > 300) throw new Error(`${p.id}: Titel > 300 Zeichen`)
  if (t.length > 40000) throw new Error(`${p.id}: Text > 40.000 Zeichen`)
  if (!p.image || !fs.existsSync(dir + p.image)) throw new Error(`${p.id}: Bild fehlt (${p.image}) – node supplement-lab/marketing/content/reddit/render.mjs`)
}

const MODMAIL = {
  selfexp: `Hi mods, I'm the developer of Kolbi, a free, local-first web app for n-of-1 supplement tests: a baseline week, then one supplement at a time, a 1-minute evening rating, and a comparison with your own baseline. No health claims, no affiliate links, no account. Would one post about the method (feedback wanted, link in a comment) be OK here? If not, no problem. Thanks!`,
  fitnessde: `Hallo Mods! Ich baue als Solo-Entwickler eine kostenlose App, mit der man Supplements nacheinander selbst testet (erst das eigene Normal, dann eins nach dem anderen, abends 1 Minute bewerten). Ohne Konto, keine Werbung, keine Partnerlinks, keine Wirkversprechen. Darf ich sie einmal vorstellen und um Feedback bitten (Link im Kommentar)? Wenn nicht, völlig okay. Danke!`,
}

fs.writeFileSync(dir + "reddit-posts.json", JSON.stringify(posts.map(({ id, date, day, time, sub, lang, kind, image, precondition, flair, title, body, firstComment, link }) =>
  ({ id, date, sub, flair, title, body, firstComment, link, image, day, time, lang, kind, precondition })), null, 2) + "\n")

const q = s => s.split("\n").map(l => (l ? "    " + l : "")).join("\n") // als Codeblock, damit Markdown beim Kopieren erhalten bleibt
const md = `# Kolbi · Reddit-Beiträge Okt 2026 (8 Stück, kopierfertig)

Stand 6. Okt 2026 · **Generiert** aus \`reddit-posts.src.mjs\` – Änderungen dort machen und neu erzeugen
(\`node supplement-lab/marketing/channels/reddit-posts.src.mjs\`). Gleiche Daten als \`reddit-posts.json\` für die Kopier-Seite.

## So gehst du vor (pro Beitrag ca. 5 Minuten)

Jeder Beitrag hat **genau ein Bild** (1200×1200, \`content/reddit/reddit-0N.png\`): Das Bild zieht im Feed den Blick,
der Text liefert die Tiefe. Reddit erlaubt bei Bild-Beiträgen einen optionalen Text darunter (seit 2022; Mods können
Bild-Beiträge oder den Text dazu pro Sub abschalten).

1. **Beitragstyp „Bilder & Video“ („Images & Video“)** wählen → Titel einfügen → **Bild hochladen** → den Text in das
   Feld darunter („Body text (optional)“) einfügen. Vorher im Textfeld auf **„Markdown“** umschalten
   („Markdown Mode“ / „Switch to Markdown“), falls angeboten – sonst gehen Tabellen, Fettdruck und Codeblöcke kaputt.
2. **Gibt es im Sub keinen Bild-Tab oder kein Textfeld darunter:** Beitragstyp **„Text“** wählen, Text im
   Markdown-Modus einfügen, zurück auf den normalen Editor schalten und das Bild über das **Bild-Symbol im Editor ganz
   oben** in den Beitrag hochladen. Geht auch das nicht: **ohne Bild** posten. Bild als Imgur-Link oder im
   Kommentar ist keine Option (wirkt wie Spam/Werbung).
3. **Flair** wählen (siehe Hinweis) → kurz in der Vorschau prüfen (Bild da, Tabelle ok) → absenden.
4. Gibt es einen **ersten Kommentar**: direkt nach dem Absenden selbst unter den Beitrag schreiben (bei den 3
   Kolbi-Beiträgen steht der Link **nur dort**, nicht im Beitrag – das wirkt weniger nach Werbung).
5. **3–6 Stunden dranbleiben** und jede Frage beantworten. Nie über eigene Ergebnisse oder Wirkungen schreiben.
6. Wird ein Beitrag entfernt: **nicht neu posten**, sondern höflich per Modmail fragen, was nicht gepasst hat.

**Mischung:** 5 Mehrwert-Beiträge **ohne Link und ohne Kolbi** (Karma + Vertrauen aufbauen) · 3 Beiträge mit Kolbi,
nur wo Eigenwerbung erlaubt ist (r/SideProject) bzw. **nach schriftlichem Mod-OK** (r/SelfExperiments, r/FitnessDE).

**Ehrlich bleiben:** Die Texte sagen nur, was stimmt: Du baust Kolbi (Entwickler/Betreiber). Keine erfundenen
Erlebnisse („als ich X genommen habe …“), keine Nutzerzahlen. Wenn dich jemand nach deinen eigenen Ergebnissen fragt:
„Dazu möchte ich hier nichts behaupten – mir geht's um die Methode.“

**Neues Konto?** Viele Subreddits entfernen Beiträge von sehr neuen Konten oder Konten mit wenig Karma automatisch
(die Grenzen sind nicht öffentlich). Deshalb vor dem 1. Beitrag ein paar Tage normal kommentieren
(Muster-Antworten in \`PLAYBOOK.md\`, Abschnitt 1 und 1b).

**Links:** Kanal-Seite \`/reddit\` (DE) bzw. \`/en/reddit\` (EN), zusätzlich mit UTM-Parametern
(\`utm_source=reddit&utm_medium=social&utm_campaign=<sub>&utm_content=<id>\`), damit man jeden Beitrag einzeln sieht.

## Modmails (am Mi 14.10. abschicken)

**An r/SelfExperiments** (für Beitrag 7):

${q(MODMAIL.selfexp)}

**An r/FitnessDE** (für Beitrag 8):

${q(MODMAIL.fitnessde)}

Antworten der Mods (Screenshot) in \`PLAN.md\` → Log notieren. Kein OK = kein Beitrag mit Kolbi in diesem Sub.

## Übersicht

| # | Datum | Sub | Sprache | Art | Bedingung |
|---|---|---|---|---|---|
${posts.map((p, i) => `| ${i + 1} | ${p.day} ${p.time.split(" ")[0]} | ${p.sub} | ${p.lang.toUpperCase()} | ${p.kind === "kolbi" ? "**mit Kolbi**" : "Mehrwert, ohne Link"} | ${p.kind === "kolbi" && /NUR nach/.test(p.precondition) ? "nur nach Mod-OK" : "–"} |`).join("\n")}

---

${posts.map((p, i) => `## ${i + 1} · ${p.day} · ${p.sub} · ${p.kind === "kolbi" ? "mit Kolbi" : "Mehrwert (ohne Link)"}

- **Uhrzeit:** ${p.time}
- **Vorher:** ${p.precondition}
- **Flair:** ${p.flair}
- **Link:** ${p.link ? `\`${p.link}\`` : "keiner"}
- **Bild:** \`${p.image.replace("../", "marketing/")}\` (hochladen, Text darunter)

![Bild ${p.id}](${p.image})

**Titel**

${q(p.title)}

**Text**

${q(p.body)}

**Erster Kommentar (von dir, direkt nach dem Absenden)**

${p.firstComment ? q(p.firstComment) : "_keiner_"}
`).join("\n---\n\n")}`
fs.writeFileSync(dir + "reddit-posts.md", md)
console.log("✓ reddit-posts.json + reddit-posts.md", posts.length, "Beiträge")
