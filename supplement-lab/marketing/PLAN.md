# Kolbi · Supplement Lab — Marketing & Verkauf

> Dieses Dokument ist das Gedächtnis des Projekts zwischen den Sitzungen.
> Ganz oben steht immer, wo wir stehen und was als Nächstes kommt.

## Status (aktuell)

| Bereich | Stand |
|---|---|
| App (PWA) | live: supplement-lab-six.vercel.app – Feature-komplett für Beta |
| Landingpage | live: kolbi-smoky.vercel.app (noindex, bis Impressum-Daten da sind) |
| Store-Auftritt | Texte, Keywords, Screenshots DE/EN, Feature-Grafik fertig (`store/`) |
| In-App-Wachstum | Lab Pro (Beta frei, Gründer), Einladen, Bewertungs-Moment, anonymes Feedback |
| Content | 5 Kolbi-Videos + 1 Karussell + 2-Wochen-Plan (`content/`) |
| Sprachen | App, Landingpage (`/en`), Rechtstexte, Store-Bilder und Videos auf Deutsch **und Englisch** |
| Native App (iOS/Android) | Capacitor-Projekt vorhanden, noch nicht im Store |
| Phase | **1 · Startklar** → wartet auf Inhaber-To-dos (Konten, Impressum) |

**Nächste Schritte (Claude):** nach den ersten Posts Zahlen auswerten, Gewinner-Video variieren;
Feedback aus `lab_feedback` einarbeiten; Store-Build vorbereiten, sobald der Apple-Account da ist.

## Entscheidungen (vom Inhaber)

- ✅ 6. Okt 2026 (Inhaber-Vorgabe, gilt vorrangig): **Sicher zuerst, nichts Riskantes, nichts Teures.** Kein Freitext von Nutzern
  (Beiträge, Antworten, eigene Namen, eigene Gruppen) und keine Peptid-Inhalte, solange keine Rechtsprüfung bezahlt/erfolgt ist.
  Stufe 2 nur mit sicheren Bausteinen: generiertes Pseudonym + Kolbi-Avatar-Baukasten, vorgefertigte Reaktionen („Durchhalten“,
  „hilfreich“), strukturierte Ergebnis-Posts, gemeinsame Startwellen, Melden. Freitext/Gruppen/Peptide = später (nach Prüfung + Einnahmen).
- ✅ 6. Okt 2026 (CEO): **App-Richtung „Instagram trifft Reddit“** – Kolbi wird selbst die Plattform. Instagram-Teil:
  Stories (Wochen-Story), Ergebnis-Posts als Bildkarte, Lab-Profil mit Pseudonym/Avatar. Reddit-Teil: pro Supplement eine
  Community („Lab Magnesium“: Beitreten, Überblick/Beiträge/Fragen/Regeln), Abstimmen „hilfreich“, Antworten, Melden.
  Neue Leiste: Heute · Entdecken · ＋ · Labor · Ich. Vorschau: https://claude.ai/artifact/AsWy1V5AFkxPznnbMJ37nQ.
  Freitext-Beiträge/Antworten erst mit Moderation + Fachperson F1 (Stufe 2); strukturierte Ergebnis-Posts zuerst.
- ✅ 6. Okt 2026 (CEO): **Community-Basis bleibt gratis** (Teilen + „Was andere erlebt haben“ in groben Worten), Pro bekommt
  die Tiefe (Verteilung, Bereiche, Filter). Schwellen: n 5–19 nur grobe Worte, ab n ≥ 20 Prozente; Beschwerden ab
  3 Nennungen; öffentliche SEO-Seiten ab n ≥ 20. Pseudonym wird generiert (kein Freitext). Feed ab Tag 1 mit Melden/Ausblenden.
  Partnerlinks nie aus Community-Daten. Quelle: `research/2026-10-community.md`.
- ✅ 6. Okt 2026 (CEO-Entscheidung nach Inhaber-Input): **Community = neutrale Plattform für Erfahrungsberichte**, wie Reddit –
  Kolbi rät, dosiert und empfiehlt nichts; Nutzer teilen eigene Erfahrungen, auch zu Peptiden (z. B. BPC-157).
  Reihenfolge: (1) Store-1.0 ohne Peptide in Bibliothek/Kolbi-Texten (Store-Freigabe zuerst); privat als eigener
  Eintrag erfassbar. (2) Community Stufe 1: strukturierte, anonyme Bewertungen (ab n ≥ 5). (3) Stufe 2 ab ~1.000 aktiven
  Nutzern: Freitext-Berichte zu jeder Substanz, mit Forenregeln (keine Dosis-Anleitungen, keine Bezugsquellen/Links,
  kein medizinischer Rat), Melden + Moderation (DSA-Melde-Verfahren), ab 18, keine Hervorhebung/Ranking durch Kolbi.
  Vor dem Einschalten: Fachperson (FACHPERSON.md F1) + Store-Richtlinien für nutzergenerierte Inhalte prüfen.

- ✅ 2. Okt 2026: **App-ID `app.kolbi`** (iOS + Android, endgültig). Store-Builds über **GitHub Actions** (kein eigener Mac; wie bei der App „Iron“). Apple-Entwicklerkonto wird ohnehin für Iron gebraucht – ein Konto für beide Apps.

- Herausgeber: **auf den Namen des Inhabers** (nicht über die bestehende Firma „Iron“)
- Budget: **0 €** zum Start. Bei Bedarf fragt Claude konkret nach 50–100 € (mit Begründung)
- **Kein Gesicht** – aller Content mit Kolbi (Maskottchen)
- Claude treibt Marketing & Verkauf selbstständig, der Inhaber übernimmt Konten, Verträge, Posten, Zahlungen

## 🧭 Vision (vom CEO festgelegt, 8. Okt 2026 – leitet jede Entscheidung)

**„Kolbi zeigt dir, was bei DIR wirkt – statt was das Internet sagt.“** Persönliches Supplement-Labor: einfach festhalten, ehrlich auswerten, von anderen lernen.

- **Zielgruppe:** 20–40 J., nimmt mehrere Supplements, will sich verbessern (Sport, Schlaf, Fokus, Energie) – „Biohacker light“. Erst DACH, dann EN. Nicht: Therapie-Suchende.
- **Mehrwert (Reihenfolge):** 1) Klarheit jeden Tag (was nehme ich, wofür, Nebenwirkungen, Kosten – mit 1 Tipp) · 2) Beweis (Selbsttest vs. eigenes Normal) · 3) Gemeinschaft (echte Erfahrungen anderer).
- **Kolbi-Coach denkt mit:** Kosten, Timing, Wechselwirkungen, „lohnt sich das?“ – auf Basis der eigenen Daten, nie als Heilversprechen.
- **Bewusst NICHT:** Shop, Kalorien-/Trainings-Tracker, Arzt-Ersatz, Wirkversprechen, Peptid-Werbung.
- **Heute = Startbildschirm zeigt alles Wichtige** (oben 1 Hauptsache, darunter feste Bereiche): Jetzt dran · Mein Stack (+ spontan) · Kosten & Coach · Mein Zustand (heute + 7 Tage) · Mein Weg · Community (neue Beiträge, Vorschlag). Details eine Ebene tiefer.

## Marke

- Maskottchen: **Kolbi** (lebendiger Laborkolben)
- Store-Name (Vorschlag): **„Kolbi: Supplement-Check“** (DE) · **„Kolbi: Supplement Lab“** (EN)
- Hinweis: „kölbi“ ist eine Telekom-Marke in Costa Rica (andere Branche/Region). Vor Launch:
  kostenlose Recherche im DPMA-Register (register.dpma.de) + EUIPO (euipo.europa.eu/eSearch) – **To-do Inhaber**
- Positionierung: *„Finde raus, was bei DIR wirkt – Schritt für Schritt, mit Kolbi.“*
  Spielerisch statt Tabellen, deutsch zuerst, ehrlich (Reset vs. Test, keine Werbeversprechen)

## Wettbewerb (Stand Okt 2026)

- **StackProof** (iOS): gleiche Grundidee (Baseline → Einnahme → Vergleich), englisch, nüchtern
- **Reflect**, **StudyMe**, **Outliyr**, Mount-Sinai **N1**: allgemeine n-of-1-Tracker, eher technisch
- Unser Vorsprung: Kolbi/Gamification, Tagesrunde in 1 Minute, Community-Daten, Kosten & Sparen,
  Wechselwirkungen, fertige Experimente, deutsch

## 🎯 Experiment: Kolbi als Vollzeit-Einkommen (von Claude gesetzt, 1. Okt 2026)

**Ziel: 1.500 € netto im Monat ≈ 2.500 € Umsatz/Monat** (nach Store-Anteil; Steuern + Krankenversicherung
als Selbstständiger fressen grob ein Drittel – genaue Zahlen mit Steuerberatung klären).
**Zieltermin: Oktober 2027** (12 Monate). Ehrlich: Das schaffen nur wenige Indie-Apps – deshalb mit festen
Prüfpunkten, an denen wir umsteuern.

### Warum das Geschäftsmodell sich ändern muss
Mit „4,99 € einmalig“ bräuchte man ~600 neue Käufer **jeden Monat** – das trägt kein Einkommen.
Ein Einkommen braucht **wiederkehrende** Einnahmen:

| Säule | Modell | Ziel/Monat (Okt 2027) |
|---|---|---|
| **Lab Pro Abo** | 2,99 €/Monat oder 19,99 €/Jahr (Kern bleibt gratis, Gründer behalten Pro) | ~900 Abos ≈ **1.700 €** |
| **Partnerlinks** | Nachkauf der Supplements, die man ohnehin nimmt – Amazon + Partnerprogramme von Supplement-Shops (5–12 % Provision), immer als „Anzeige“, **nie** nach Provision sortiert | ~290 Bestellungen ≈ **800 €** |
| *(später, optional)* Coaches | Trainer/Ernährungsberater begleiten Klienten mit Kolbi, 19 €/Monat | Bonus |

### Was das an Nutzern bedeutet
~**15.000 aktive Nutzer pro Monat** (6 % zahlen, 2 % bestellen über einen Link) → ca. 50.000 Installationen
über 12 Monate ≈ **4.000 neue pro Monat** im Schnitt. Das geht nur mit: App Store + Google Play,
TikTok/Reels als Hauptkanal (ein viraler Clip bringt mehr als alles andere), Store-Optimierung,
Weiterempfehlungen aus der App.

### Fahrplan
| Monat | Umsatz/Monat | Aktive Nutzer | Schwerpunkt |
|---|---|---|---|
| **Jan 2027** | 250 € | 700 | Beta → Store-Start (iOS), Abo live, Partnerlinks |
| **Apr 2027** | 800 € | 5.000 | Android, 5 Videos/Woche, Store-Optimierung, Einladungen |
| **Jul 2027** | 1.600 € | 10.000 | Englische Märkte (USA/UK), Partnerprogramme ausbauen |
| **Okt 2027** | 2.500 € | 15.000 | **Ziel: 1.500 € netto** |

### Prüfpunkte (ehrlich bleiben)
- **31. Jan 2027:** < 30 % der Neuen machen einen 2. Check-in → Produkt verbessern, nicht mehr Werbung.
- **30. Apr 2027:** < 2.000 aktive Nutzer **oder** < 3 % zahlen → Plan B: Coaches-Version (wenige zahlende
  Profis statt vieler Endnutzer) oder anderes Segment (z. B. Sportler).
- Jeden Monat: Kanäle ohne Wirkung streichen, Gewinner verdoppeln.

### Wie ich „Vollzeit“ arbeite
Jeden **Montag** ein Wochen-Sprint: Zahlen (`lab_funnel`, Feedback) auswerten → das Wichtigste bauen/verbessern
→ neue Videos/Posts vorbereiten → dir einen kurzen Bericht schicken: Zahlen vs. Plan, was erledigt ist, was ich
von dir brauche.

## Geschäftsmodell

- **Beta bis 30. Nov: alles gratis** („Gründer-Pro“ für immer für alle, die bis dahin starten)
- ✅ **Entschieden (1. Okt, Inhaber: „mach den Preis so, wie du es für richtig hältst“):**
  Lab Pro **2,99 €/Monat · 19,99 €/Jahr · 39,99 € einmalig (Lifetime)**. **Beta-Ende 30. Nov 2026**: Wer bis dahin
  startet, ist Gründer → Pro für immer gratis. Gesperrt wird erst, wenn Bezahlen wirklich geht (`PAYMENTS_READY`
  in `lib/labGrow.ts`). Gratis bleibt: Reset, Testen, Check-ins, Erinnerungen, Kolbi, Ergebnis je Test.
  Pro: Muster-Detektor, Kosten & Sparen, alle Experimente, Timing, Kalender-Abo, Community-Vergleich. Wochen-Story teilen bleibt gratis (Weitersagen).

## Phasen

1. **Startklar** – Rechtstexte, Landingpage + Warteliste, Store-Texte, Screenshots, Pro-Logik, Einladen, Content-Kit
2. **Beta** – TestFlight, 20–50 Tester, Feedback, erste Community-Daten
3. **Launch** – Store, Product Hunt, Reddit, TikTok/Reels 3×/Woche mit Kolbi
4. **Wachstum** – SEO-Artikel, Teilen-Karten, wöchentliche Auswertung

## Was der Inhaber tun muss (offen)

> **Aktueller Arbeitsauftrag mit Schritten, Einstellungen und Rückfragen:** https://claude.ai/artifact/BNn95W6ULttXsrgPmPxNq6
> **Kolbi Board (Live-Zahlen + CEO-Berichte):** https://claude.ai/artifact/FkKZis7KaEZPXbvnQfzKbw – Montags-Bericht per ArtifactData in Sammlung `reports` (Dokument-ID = Datum).
> (Status schickt der Inhaber per „Status kopieren“ in den Chat. Die Liste unten ist das Archiv.)

- [x] **Social S2 freischalten (1 Min.):** `supabase/inhaber/social-schritt.sql` im Supabase SQL Editor einfügen → Run. Danach App-Deploy durch Claude.
- [ ] Impressum-Daten: vollständiger Name, ladungsfähige Anschrift, E-Mail (Pflicht für Website & Store)
- [ ] Apple Developer Program (99 €/Jahr) – auf eigenen Namen
- [ ] Google Play Console (25 $ einmalig) – optional, später
- [ ] Marken-Recherche „Kolbi“ (DPMA/EUIPO, kostenlos)
- [ ] Reddit-Konto anlegen + 2–4 Wochen aufwärmen (siehe `channels/PLAYBOOK.md`)
- [ ] TikTok + Instagram Konto „@kolbi.lab“ (o. ä.) anlegen – Anleitung + fertige Posts in `content/posting-plan.md`
- [ ] Vercel → Projekt **kolbi** → Analytics → *Enable*
- [ ] Bis Mitte Nov: Amazon PartnerNet anmelden (kostenlos, braucht Impressum auf der Website) → Tracking-ID an Claude
- [ ] Bis Mitte Nov: Apple Developer (99 €) für den Store-Start am 1. Dez · Steuer kurz klären (Einnahmen als Privatperson/Kleinunternehmer) (zählt Besuche der Landingpage, kostenlos)
- [ ] Rechtstexte einmal von einer Fachperson prüfen lassen (Entwürfe liegen in `marketing/legal/`)

## Log

- 2026-10-01 · Start Phase 1: Plan angelegt, Namens-/Wettbewerbs-Check
- 2026-10-01 · Rechtstexte-Entwürfe (Datenschutz, Nutzungsbedingungen, Impressum-Vorlage, Health-Claims-Check)
- 2026-10-01 · Store-Auftritt: 6 Screenshots DE/EN (1290×2796), Texte + Keywords + Datenschutz-Label (`store/listing.md`),
  Feature-Grafik Google Play, Kolbi-Markenpaket (`brand/`: SVG/PNG je Stimmung, Profilbild, Banner, Schrift Nunito/OFL)
- 2026-10-01 · Landingpage `marketing/site/` (Generator `tools/build-site.mjs`): Hero mit anstupsbarem Kolbi,
  3 Schritte, Screenshots, Features, Datenschutz, Gründer-Beta, FAQ, Rechtsseiten. Bis Impressum-Daten da
  sind: `noindex` (robots + Header). CTA führt direkt in die Beta-PWA (keine E-Mail-Liste nötig).
- 2026-10-01 · In-App: Lab Pro (Beta = alles frei, Gründer-Status dauerhaft), Freunde einladen (Link zur
  Landingpage), Bewertungs-Moment nach Erfolgserlebnis, anonymes Feedback (Supabase `lab_feedback`,
  ohne Geräte-ID, Löschung nach 12 Monaten). Fix: ✕ in der Wochen-Story war vom Inhalt verdeckt.
- 2026-10-01 · Content-Kit: 5 Videos (`content/videos/`, 1080×1920, H.264, stumm für Trend-Sounds), Karussell,
  Posting-Plan mit Captions, Hashtags, Antwort-Vorlagen. Generatoren: `tools/videos.mjs`, `tools/carousel.mjs`
- 2026-10-01 · Kanal-Recherche + `channels/PLAYBOOK.md`: Fahrplan DE sofort / EN nach Übersetzung, kopierfertige
  Posts (Reddit, Product Hunt, Show HN, Verzeichnisse, LinkedIn, Podcast, t3n, Facebook), Kanal-Links `/reddit` usw.
  Erkenntnis: Für Reddit-EN, Product Hunt und HN braucht die App eine englische Oberfläche → nächster Baustein.
- 2026-10-01 · **Englische Version:** App komplett übersetzt (~1.560 Texte, `lib/labI18n.ts` + `lib/i18n/`), Sprache
  automatisch nach Gerät, umschaltbar in den Einstellungen; deutsche Version pixelgleich geprüft. Landingpage `/en`,
  englische Rechtstexte, Store-Screenshots EN neu, Videos EN (`content/videos-en/`). Prüfwerkzeuge: `tools/i18n-check.mjs`,
  `tools/i18n-ui-check.mjs`.
- 2026-10-01 · Anonyme Funnel-Statistik je Kanal (`lab_funnel`), Ratgeber DE/EN (`/ratgeber/…`, `/en/guide/…`) +
  Sitemap, Product-Hunt-Paket (`launch/`: animiertes Logo, Galerie, Ablauf). Fix: kein Neuladen beim ersten Besuch.
- 2026-10-01 · Experiment-Ziel gesetzt: **1.500 € netto/Monat bis Okt 2027** (≈ 2.500 € Umsatz: Abo + Partnerlinks,
  ~15.000 aktive Nutzer). Öffentliche Preisangaben („einmalig 1,99 €“) neutralisiert, bis das Preismodell entschieden ist.
  Wöchentlicher Sprint jeden Montag 08:47 (Routine).
- 2026-10-01 · **Preis entschieden:** 2,99 €/Monat · 19,99 €/Jahr · 39,99 € Lifetime, Beta-Ende 30. Nov. In App
  (Pro-Karte mit Preisen, „Gründer-Pro für immer – sonst 19,99 €/Jahr“, Einladen mit Frist) und Landingpage umgesetzt.
  Neuer Kanal-Link `/invite` für Weiterempfehlungen.
- 2026-10-01 · **Startklar-Paket:** Pro-Seite + Freischaltung (RevenueCat-Schnittstelle, Produkt-IDs, aus bis Bezahlen geht),
  Gründer-Willkommen nach dem Onboarding, Rechtliches-Links in den Einstellungen, AGB/Datenschutz für Abo + RevenueCat.
  Store-Checkliste rückwärts vom 1. Dez (`STORE.md`), iOS-Datenschutz-Manifest, Review-Notes, Abo-Setup.
  7 neue Videos DE/EN (06–12) + 30-Tage-Kalender DE/EN. **Fix:** Onboarding stürzte ab, wenn die Community-Statistik
  eine unerwartete Antwort lieferte.
- 2026-10-01 · RevenueCat-Anschluss fertig (nur Schlüssel fehlen), Pressemappe /presse + /en/press.
- 2026-10-01 · Wachstums-Motor (`GROWTH.md`) · Owned SEO live: Kosten-Rechner DE/EN + 8 Selbsttest-Seiten DE/EN (je eigene `src`, z. B. `testmagnesium`) – indexierbar sobald Impressum-Daten da sind
- 2026-10-01 · **Team-Sprint 1** (CEO-Modell, `TEAM.md`): UI – Fortgeschrittenes erst bei Bedarf · Growth – Baseline-Tracker-PDF DE/EN + `/vorlage` + 6 Pinterest-Pins · QA – 3 Prüfrunden, 2 mittlere + 10 kleine Befunde gefunden und behoben (u. a. Profil bei Gleichstand, Testtage im Normal, Rechner bei 2 Häkchen, Sprachpaare/hreflang) → deployt
- 2026-10-02 · **Etappen 1+2 + Investor-Feedback** → deployt: Analyst-Recherche (`research/2026-10-demand.md`), Health-Claims-Prüfung Bibliothek (92 Texte; GLP-1 nicht mehr bei „Abnehmen“), Marken-Steckbrief (`brand/BRAND.md`), 6 neue Selbsttest-Seiten (14 gesamt), Playbook +5 Orte; App: Wochenrückblick auf Heute, Stimmungs-Kalender → „Tag bearbeiten“, Kolbi-Tab als Kacheln. QA fand u. a.: Selbsttest-Einstieg führte zu „0 Tests“ → behoben.
- 2026-10-02 · **Phase „Startklar für Fremde“** → deployt: Store-Screenshots DE/EN neu (7 Bilder, Beispiel-Kennzeichnung, keine erfundenen Zahlen), Google-Go-Live vorbereitet (`launch/GO-LIVE.md`, OWNER/GSC_VERIFY), Wortwahl in App nach BRAND.md; Arbeitsauftrag für den Inhaber als Einsatzplan-Artefakt.
- 2026-10-06 · **Phase „Store-Einreichung + Inhaber-Feedback“** → deployt (App + Website): Health aus 1.0, native Projekte + CI, Hochformat, In-App-Review; QA-Befunde behoben (Gratis-Woche nur bei Store-Bestätigung, Android-Backup aus + Datenschutz „System-Backups“, Store-Builds brechen ohne RevenueCat-Schlüssel ab, keine Mengen im Store-Modus, Tarif-Einstiege nur wo kaufbar); **Störfaktoren (🍷 Alkohol u. a.) direkt in der Tagesrunde** + beim Tag-Bearbeiten (Inhaber-Feedback), Muster „Am Tag nach Alkohol“. Growth: Profilbilder TikTok/Instagram, `channels/BIOS.md`, 8 Reddit-Beiträge mit je 1 Bild; Post-Bank zum Kopieren: https://claude.ai/artifact/M56DMQDHv8dyT9umDjYf6S. Entscheidung: Reddit 2×/Woche fertig zum Kopieren (kein automatisches Posten – Reddit-Regeln), TikTok automatisch über Higgsfield sobald verbunden.
- 2026-10-07 · **Phase „Täglich nützlich“** (Inhaber-Feedback als Kunde) → deployt: Morgen-Frage 45 Min nach dem Aufstehen (5 Smileys, 1 Tipp; einstellbar), Schlaf zählt zur Nacht nach der Einnahme, Abend-Check-in früher offen (nie später als die eigene Erinnerung), „➕ Zusätzlich genommen“ (auch außerhalb des Plans, Störfaktor + Muster „An Tagen mit X“), Beschwerden an jedem Tag + „Ich vermute: …“ + Karte „Deine Vermutungen“, „✓ Genommen“/„⏰ Später“ in nativen Benachrichtigungen. QA: 3 mittlere + 4 kleine Befunde → behoben. Offen: Demo-Screenshots neu (Demo-Seed geändert), Knöpfe auf echten Geräten testen.
- 2026-10-06 · **Phase „Social S1“** → deployt: App umgebaut auf 5 Reiter (Heute · Entdecken · ＋ · Labor · Ich), eine Hauptsache pro Bildschirm, neutrale Lese-Flächen + Lab-Farben, generiertes Pseudonym, Community-Basis gratis (Details Pro), Feed nur aus echten anonymen Ergebnissen (Schwellen), Wochenrückblick auf Heute + als Story; neue Pro-Seite (Handy mit 4 Beispiel-Ansichten, große Felder), „Neu“-Abzeichen. QA: 2 Blocker (Rückblick fehlte auf Heute, beworbener „Filter nach Ziel“ existierte nicht) + 5 kleinere → behoben. Vor S2: eigene Zufalls-ID fürs öffentliche Pseudonym (nicht lab-device).
- 2026-10-06 (Nacht) · **Kurzphase** → deployt: QA-Reste (Touch-Ziele ≥44 px, kein Konfetti bei „Bewegung reduzieren“, DemoBadge-Kontrast, Heute bleibt kurz bei mehreren Hinweisen); Analyst: `legal/ANGEBOTE-RECHTSPRUEFUNG.md` (Empfehlung advocado-Festpreisangebot, Vergleich eRecht24 App-Paket ~990 €) – Entscheidung Inhaber offen.
- 2026-10-06 (Nacht) · **Social S2a** → deployt: Kolbi-Avatar-Baukasten (Farbe/Accessoire/Stimmung, lokal), Pseudonym würfeln (3×/Tag, nur Wortlisten), Pseudonym mit eigener Zufalls-ID (nicht mehr aus lab-device ableitbar). Keine Server-Aufrufe, kein Freitext. Nächstes (braucht Server + Datenschutz-Update): Reaktionen, Folgen, Startwellen.
- 2026-10-07 · **Social S2** → Code fertig + QA (Server 77/77, Oberfläche 82/82): Konto ohne E-Mail (Geräte-Schlüssel), Folgen, 2 feste Reaktionen, Ergebnis-Posts (kein Freitext, keine Bilder, kein Libido, keine Peptide), offizielle Communities suchen/beitreten, Melden/Blockieren, Entscheidungen mit Begründung an Betroffene (DSA Art. 17), Datenschutz §8a. Server: Tabellen + Funktion `lab-social` live. Offen: 2 DB-Funktionen mit „delete“ brauchen Inhaber-Bestätigung → `supabase/inhaber/social-schritt.sql`; App-Deploy erst danach (sonst Teilen/Konto-Löschen kaputt). Moderation: CEO-Entscheidung – solange es kaum Meldungen gibt, läuft sie im Chat (Inhaber schreibt „Moderation“ → Claude zeigt offene Meldungen, Inhaber tippt Behalten/Ausblenden/Sperren); eigenes Web-Dashboard erst ab regelmäßigen Meldungen (braucht Admin-Schlüssel).
- 2026-10-07 · **Social S2 live**: Inhaber hat die 2 DB-Funktionen eingespielt. Server-Test über die Datenbank: Konto anlegen ✓, Ergebnis teilen ✓ (Libido wird verworfen), Communities-Suche ✓, Konto löschen ✓ (danach 0 Profile/Posts). App + Website deployt. Dazu: Wochentag + Datum über jeder Tagesfrage (Inhaber-Wunsch) und über der Schlaf-Frage („Nacht auf …“).
- 2026-10-08 · **Heute 2.0** → deployt: Startbildschirm nach Vision – 1 Hauptsache oben, darunter Mein Stack (wofür mit zugelassenen EU-Claims, Nebenwirkungen, Kosten im Sheet, Genommen + Uhrzeit, Pausiert-Zeile während Tests), ＋ spontan (Kaffee mit grober Halbwertszeit, Alkohol belegt Check-in-Störfaktor vor), Kosten & Kolbi-Coach („lohnt sich das?“ nur aus eigenen Testdaten, nie bei Rx/Peptiden/eigenen Mitteln), Mein Zustand (7 Tage), Mein Weg, Community (nur mit Einwilligung). Mehrere Mittel auf einmal eintragen. QA: 4 mittlere + 7 kleine Befunde → behoben. Offen: Claim-Texte von Fachperson prüfen lassen (F1).
- 2026-10-08 · **Heute nicht (Wischen)** → deployt: Stack-Zeile nach links wischen = heute ausgelassen (Rückgängig per Toast/Antippen), keine Erinnerung/kein Vorrat-Abzug für den Tag, Auswertung zählt es als fehlende Einnahme. QA freigegeben. **Video:** erstes 3D-Kolbi-Video „Supplement-Schrank“ (19 s, Stimme „Max“, 38,6 Credits; Testclip 7,5). Kosten pro Knaller-Video ca. 40 Credits; Werkzeuge in content/higgsfield/. Hinweis: ~57 Higgsfield-Bilder 17:35–17:50 nicht von Claude erzeugt – beim Inhaber nachgefragt.
- 2026-10-08 · **Higgsfield-Runde 2** (freigegeben 55+5): Videos „Kolbi testet“ (16 s) + „Kolbi erklärt: Dein Normal“ (20 s), 5 Test-Icons → 52,3 Credits. Danach freigegeben: 3D-Icons für alle 61 Bibliotheks-Mittel ohne Peptide + neutrale Kapsel → 28,5 Credits. Icons kommen per Workflow fetch-icons.yml (cloudfront aus der Arbeitsumgebung gesperrt) nach supplement-lab/public/icons/. Gesamt Claude bisher: 126,9 Credits.
