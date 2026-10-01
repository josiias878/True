# Kolbi · Kanal-Playbook (alle Kanäle, 0 € Budget)

Stand: 1. Okt 2026 · Regeln recherchiert. Vor jedem Post die Regeln der jeweiligen Gruppe noch mal ansehen,
denn die ändern sich. Jeder Kanal hat einen **eigenen Link**, damit wir sehen, was wirkt:
`https://kolbi-smoky.vercel.app/<kanal>`. Kanäle: `reddit`, `tiktok`, `insta`, `youtube`, `producthunt`, `hn`,
`facebook`, `linkedin`, `x`, `threads`, `discord`, `indiehackers`, `pinterest`, `forum`, `qr`.

> **[Platzhalter]** in eckigen Klammern vor dem Posten durch deine echten Angaben ersetzen – nichts erfinden.

## Die 5 goldenen Regeln

1. **Ehrlich sein:** Immer sagen „ich bin der Entwickler“. Versteckte Werbung wird auf Reddit sofort gebannt.
2. **Erst geben, dann posten:** Auf Reddit zuerst 2–4 Wochen hilfreich kommentieren (Ziel: ~200 Kommentar-Karma).
3. **Nie kopieren:** Jede Gruppe bekommt ihren eigenen Text. Pro Tag höchstens eine Gruppe.
4. **Dableiben:** In den ersten 3–6 Stunden nach einem Post jeden Kommentar beantworten.
5. **Keine Wirkversprechen:** Niemals „X hilft bei Y“. Immer „teste es bei dir, vergleich mit deinem Normal“
   (siehe `../legal/health-claims-check.md`).

## Fahrplan

| Wann | Deutsch (geht sofort, App ist deutsch) | Englisch (erst wenn die App auf Englisch da ist) |
|---|---|---|
| **Woche 1–2** | TikTok + Instagram nach `../content/posting-plan.md` · Reddit-Konto anlegen und aufwärmen · LinkedIn-Post · Podcast-Pitch | – |
| **Woche 3** | r/FitnessDE (nach Mod-OK) · Facebook-Gruppen (nach Admin-OK) · t3n-Tipp | AlternativeTo + SaaSHub eintragen |
| **Woche 4** | Erfahrungen auswerten, bestes Video variieren | r/QuantifiedSelf + QS-Forum (Feedback) · r/SideProject · r/alphaandbetausers |
| **Woche 5–6** | – | Fazier, Uneed, Peerlist, Microlaunch · Discord-Server · r/Biohackers (nach Mod-OK) |
| **Launch-Tag** (Di–Do) | – | **Product Hunt** + **Show HN** am selben Tag, danach r/InternetIsBeautiful |

Bewusst **nicht**: r/Supplements (verbietet jede Werbung), r/productivity, r/de, gutefrage.net (dort nur
hilfreich antworten, Link nur im Profil), BetaList (kostet jetzt Geld), r/AppHookup (nur für Rabatte auf Bezahl-Apps).

---

## 1 · Reddit

**Konto:** neutraler Name, kein Markenname (manche Gruppen bannen Marken-Konten), z. B. `u/flask_dev_de`
oder dein eigener Spitzname. Profil-Bio: *„Solo dev of Kolbi, a free app to test your supplements one at a
time. Not medical advice.“* Profilbild: `../brand/avatar.png`.

**Aufwärmen (Woche 1–3), 10 Min. pro Tag:** in r/QuantifiedSelf, r/Biohackers, r/FitnessDE, r/sleep echte
Fragen beantworten (Tracking, Routinen, wie man Dinge sauber ausprobiert). **Ohne Link.** Hilfreiche Muster-Antwort:

> Tip that helped me: change only one thing at a time and rate your day every evening for a week before
> you start, so you know your normal. Otherwise you can't tell what did what.

### r/FitnessDE (Deutsch) – erst Modmail, dann Post

**Modmail:**
> Hallo Mods! Ich habe als Solo-Entwickler eine kostenlose App gebaut, mit der man Supplements
> nacheinander selbst testet (Baseline, dann eins nach dem anderen, abends 1 Minute bewerten). Ohne Konto,
> keine Werbung, keine Daten auf Servern. Darf ich sie einmal vorstellen und um Feedback bitten? Wenn nicht,
> völlig okay. Danke!

**Post** (Flair z. B. „Ernährung“). Titel: *Ich wusste nie, ob meine Supplements was bringen – also teste ich sie jetzt einzeln (kostenlose App, Feedback gesucht)*
> Kennt ihr das: Kreatin, Magnesium, Vitamin D, Ashwagandha … alles gleichzeitig angefangen und danach
> keine Ahnung, was was gemacht hat?
>
> Ich hab mir deshalb eine kleine App gebaut, die das sauber macht:
> - ein paar Tage **Reset**, damit man sein Normal kennt
> - dann **ein Supplement nach dem anderen**
> - abends **1 Minute Check-in** (Schlaf, Energie, Ruhe, Fokus)
> - am Ende vergleicht sie mit dem eigenen Normal → behalten, vielleicht oder raus
>
> Kein Konto, die Daten bleiben auf dem Handy, kostenlos. Ist natürlich keine Studie, sondern ein ehrlicher
> Selbstversuch, aber viel besser als Bauchgefühl.
>
> Ich bin der Entwickler und suche ehrliches Feedback: Was würde euch fehlen, damit ihr dem eigenen Ergebnis traut?
>
> Link: https://kolbi-smoky.vercel.app/reddit

### r/QuantifiedSelf (EN) – Feedback-Post *(nach englischer App)*

Titel: *I built a tiny n-of-1 tool to test supplements one at a time – looking for feedback on the method*
> I kept stacking supplements without knowing what any of them did, so I built a small app around a simple protocol:
>
> 1. **Baseline:** a few days of 1-minute evening ratings (sleep, energy, calm, focus)
> 2. **One change at a time:** each supplement gets its own test window, with optional washout days
> 3. **Compare vs. your own baseline** → keep / maybe / drop
>
> It also flags patterns in your own entries (e.g. tagged days like alcohol vs. sleep rating) and tracks cost per month.
> Local-first: no account, data stays on the device, export as JSON.
>
> I'm the solo dev. What I'd love feedback on:
> - Is a 5–10 day window per supplement too short to be useful for you?
> - How would you handle confounders (training days, stress) in such a simple setup?
>
> https://kolbi-smoky.vercel.app/reddit (free, no sign-up)

### r/SideProject (EN) *(nach englischer App)*

Titel: *Kolbi – a cute lab flask that helps you find out which supplements actually do something for you*
> **What:** free web app (installable PWA) for structured self-experiments with supplements.
> **Why:** I was spending [your amount] €/month on supplements with zero idea what worked.
> **How:** baseline days → one supplement at a time → 1-min evening check-in → compare with your own normal.
> **Stack/decisions:** React + Vite, local-first (no backend for your data), optional push via Supabase,
> mascot drawn in SVG and animated in CSS.
>
> Screens: [store screenshots] · Try it: https://kolbi-smoky.vercel.app/reddit
> Happy to answer anything about building it. Brutal feedback welcome.

### r/alphaandbetausers (EN) *(nach englischer App)*

Titel: *[Beta] Kolbi – test your supplements one at a time (free, no account)*
> Looking for 20 beta testers who take 2+ supplements. You'd do a 1-minute check-in each evening for ~2 weeks.
> In return: lifetime "Founder Pro" for free + I'll build the features you ask for. Feedback button is in the app.
> https://kolbi-smoky.vercel.app/reddit

### r/Biohackers (EN) – nur nach Mod-OK *(nach englischer App)*

**Modmail:**
> Hi mods, solo dev here. I built a free, local-first tool for n-of-1 supplement tests (baseline → one change
> at a time → compare vs. own baseline). No claims about any supplement, no affiliate links, no account.
> Would a single "method + tool, feedback wanted" post be OK, or is there a thread you'd prefer? Thanks!

---

## 2 · Product Hunt + Show HN (Launch-Tag, nach englischer App)

**Product Hunt** (Launch 00:01 Uhr Pacific = 09:01 Uhr bei uns, Di–Do; vorher eine Woche Maker-Profil pflegen)
- **Name:** Kolbi
- **Tagline (≤ 60):** `Find out which supplements actually work for you`
- **Beschreibung (≤ 260):** `Kolbi is a free, local-first app for personal supplement experiments: a few baseline days, then one supplement at a time with a 1-minute evening check-in. It compares each test with your own normal so you can keep, maybe or drop. No account.`
- **Galerie:** englische Store-Screenshots (`../store/screenshots-en/`) + Video `../content/videos/02-so-gehts.mp4` (EN-Version folgt)
- **Erster Kommentar (Maker):**
> Hey PH 👋 I built Kolbi because my supplement shelf was costing me [your amount] €/month and I couldn't tell what any
> of it did. Kolbi turns that into a simple personal experiment: baseline → one change at a time → compare.
> It's not a study and makes no health claims, just your own data, structured. Everything stays on your device.
> I'd love to hear: what would you test first?

**Show HN**
- **Titel:** `Show HN: Kolbi – local-first n-of-1 experiments for your supplements`
- **Text:**
> I wanted a dead-simple way to run single-subject experiments on my own supplements: baseline days, one
> change at a time, a 1-minute evening rating, then compare against my own baseline. Kolbi is a PWA (React +
> Vite) that keeps all data in localStorage, with no account. Optional features (push reminders, calendar feed,
> anonymous aggregate stats with k≥5) run on small Supabase edge functions that never see your entries.
> Happy to talk about the protocol's limits (no blinding, confounders, regression to the mean) and the design.
> https://kolbi-smoky.vercel.app/hn

---

## 3 · Verzeichnisse (einmal eintragen, bringen dauerhaft Besucher + Google-Ranking)

Text für alle:
> **Kolbi – Supplement Lab.** Free app to test your supplements one at a time. Baseline days, a 1-minute
> evening check-in and a comparison with your own normal show you what's worth keeping. Pattern detection,
> cost tracking, reminders. No account, data stays on your device.

| Verzeichnis | Hinweis | Link-Suffix |
|---|---|---|
| AlternativeTo | als Alternative zu **Bearable, Exist, Daylio** eintragen | `/forum` |
| SaaSHub | Kategorie Health / Self-tracking | `/forum` |
| Fazier, Uneed, Microlaunch, Peerlist, Launching Next, TinyLaunch | jeweils kostenlose Variante | `/producthunt` |
| QS-Forum „Apps & Tools“ | Text wie r/QuantifiedSelf | `/forum` |

---

## 4 · Deutsche Kanäle

### LinkedIn (dein Profil, „Build in Public“) – sofort
> Ich habe ein Nebenprojekt gestartet: **Kolbi** 🧪
>
> Viele von uns nehmen Supplements, aber kaum jemand weiß, ob sie bei einem selbst etwas bringen. Kolbi macht
> daraus einen kleinen, ehrlichen Selbstversuch: ein paar Tage Reset, dann eins nach dem anderen testen, abends
> eine Minute bewerten, am Ende mit dem eigenen Normal vergleichen.
>
> Kein Konto, die Daten bleiben auf dem Handy, in der Beta komplett kostenlos.
>
> Ich suche 30 Beta-Tester. Wer testet mit? 👇
> https://kolbi-smoky.vercel.app/linkedin

### Podcast „Die Biohacking-Praxis“ – E-Mail-Pitch (Adresse auf der Podcast-Website)
Betreff: *Kostenloses Tool für Hörer: Supplements im Selbstversuch testen*
> Hallo liebes Team der Biohacking-Praxis,
>
> ich höre eure Folgen gern und habe eine kleine, kostenlose App gebaut, die zu eurem Praxis-Ansatz passt:
> **Kolbi** hilft, Supplements strukturiert im Selbstversuch zu testen (Baseline, dann eins nach dem anderen,
> abends 1 Minute bewerten, Vergleich mit dem eigenen Normal). Ohne Konto, die Daten bleiben auf dem Gerät,
> keine Wirkversprechen.
>
> Falls es für eure Hörer interessant ist, freue ich mich über eine Erwähnung, oder über euer ehrliches
> Feedback. https://kolbi-smoky.vercel.app/youtube
>
> Viele Grüße, [Dein Name]

### t3n – Themen-Tipp (redaktion@t3n.de)
Betreff: *Solo-Entwickler baut „Privacy-first“-App für Supplement-Selbstversuche*
> Hallo t3n-Team,
> kurzer Tipp für eure Startup-/App-Rubrik: **Kolbi** ist eine kostenlose Web-App, mit der man Supplements
> nacheinander im Selbstversuch testet. Das Besondere: kein Konto, alle Gesundheitseinträge bleiben lokal auf
> dem Gerät, ein Maskottchen statt Zahlenwüste. Gebaut von einem Solo-Entwickler mit 0 € Budget.
> https://kolbi-smoky.vercel.app/forum · Screenshots und Videos schicke ich gern.
> Viele Grüße, [Dein Name]

### Facebook-Gruppen (Suche: „Biohacking Deutschland“, „Nahrungsergänzung“, „Fitness Ernährung“) – erst Admin fragen
> Hallo! Ich bin Entwickler einer kostenlosen App zum Selbsttesten von Supplements (keine Werbung für
> Produkte, keine Wirkversprechen). Darf ich sie einmal in der Gruppe vorstellen und um Feedback bitten?

Post danach: Text wie r/FitnessDE, Link `/facebook`, Bild `../content/carousel-1/1.png`.

### gutefrage.net / Foren (team-andro …)
Nur hilfreich antworten, **kein Link im Beitrag**. Link nur in Profil oder Signatur: `/forum`.

---

## 5 · Weitere eigene Kanäle

| Kanal | Was | Link |
|---|---|---|
| YouTube Shorts | gleiche Videos wie TikTok, Banner `../brand/banner.png` | `/youtube` |
| Threads / X | Video + 1 Satz, „Build in Public“-Updates (z. B. „Woche 2: 31 Tester, das häufigste Feedback war …“) | `/threads`, `/x` |
| Pinterest | Karussell-Slides als Pins („Supplements selbst testen in 3 Schritten“) | `/pinterest` |
| Discord (EN) | Biohacker Lounge, Biohackers HQ: nur im #self-promo-Kanal, Text wie r/alphaandbetausers | `/discord` |
| Flyer/QR | z. B. Aushang im Gym (QR-Code kann ich erzeugen) | `/qr` |

## 6 · „Oben stehen“ bei Google

1. Impressum-Daten eintragen → `noindex` fällt automatisch weg (`node tools/build-site.mjs`).
2. **Google Search Console** (kostenlos): Seite hinzufügen, Sitemap einreichen. Mache ich, sobald du Zugriff einrichtest.
3. Einträge in Verzeichnissen (Abschnitt 3) = Backlinks → besseres Ranking.
4. Danach baue ich Ratgeber-Seiten für Suchen wie „Supplements selbst testen“ und „Wirkt Magnesium bei mir?“
   (als Anleitung zum Selbsttest, ohne Wirkversprechen).

## Messen (alle 2 Wochen, in `../PLAN.md` → Log)

Vercel Analytics → Projekt **kolbi** → Seiten: Besuche je `/kanal` · Supabase `lab_feedback` · Reddit-Upvotes und
Kommentare · Product-Hunt-Rang. Was nicht wirkt, lassen wir weg. Was wirkt, machen wir öfter.
