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
| Native App (iOS/Android) | Capacitor-Projekt vorhanden, noch nicht im Store |
| Phase | **1 · Startklar** → wartet auf Inhaber-To-dos (Konten, Impressum) |

**Nächste Schritte (Claude):** nach den ersten Posts Zahlen auswerten, Gewinner-Video variieren;
Feedback aus `lab_feedback` einarbeiten; Store-Build vorbereiten, sobald der Apple-Account da ist.

## Entscheidungen (vom Inhaber)

- Herausgeber: **auf den Namen des Inhabers** (nicht über die bestehende Firma „Iron“)
- Budget: **0 €** zum Start. Bei Bedarf fragt Claude konkret nach 50–100 € (mit Begründung)
- **Kein Gesicht** – aller Content mit Kolbi (Maskottchen)
- Claude treibt Marketing & Verkauf selbstständig, der Inhaber übernimmt Konten, Verträge, Posten, Zahlungen

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

## Geschäftsmodell

- **Beta: alles gratis** („Gründer-Pro“ für alle Beta-Tester, als Dankeschön → Bewertungen)
- Danach **Freemium**: Basis gratis (Reset, 1 Test, Check-ins, Kolbi) · **Lab Pro einmalig 1,99 €**
  (unbegrenzte Tests, Muster-Detektor, Kosten, Wochenrückblick, Community-Details, Experimente, Export)

## Phasen

1. **Startklar** – Rechtstexte, Landingpage + Warteliste, Store-Texte, Screenshots, Pro-Logik, Einladen, Content-Kit
2. **Beta** – TestFlight, 20–50 Tester, Feedback, erste Community-Daten
3. **Launch** – Store, Product Hunt, Reddit, TikTok/Reels 3×/Woche mit Kolbi
4. **Wachstum** – SEO-Artikel, Teilen-Karten, wöchentliche Auswertung

## Was der Inhaber tun muss (offen)

- [ ] Impressum-Daten: vollständiger Name, ladungsfähige Anschrift, E-Mail (Pflicht für Website & Store)
- [ ] Apple Developer Program (99 €/Jahr) – auf eigenen Namen
- [ ] Google Play Console (25 $ einmalig) – optional, später
- [ ] Marken-Recherche „Kolbi“ (DPMA/EUIPO, kostenlos)
- [ ] TikTok + Instagram Konto „@kolbi.lab“ (o. ä.) anlegen – Anleitung + fertige Posts in `content/posting-plan.md`
- [ ] Vercel → Projekt **kolbi** → Analytics → *Enable* (zählt Besuche der Landingpage, kostenlos)
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
