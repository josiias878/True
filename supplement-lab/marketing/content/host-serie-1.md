# Host DE · Serie 1 (6 Kurzvideos)

KI-Host DE (Mann, Loft/Backstein), Format laut [`VIDEO-PLAN.md`](./VIDEO-PLAN.md) → „Host-Format“. Regeln:
[`../legal/health-claims-check.md`](../legal/health-claims-check.md) · [`../brand/BRAND.md`](../brand/BRAND.md).

**Status:** Entwurf. Nichts generieren (Credits), nichts posten ohne Freigabe des CEO.

**Aufbau je Video (Verlust-Framing):** Hook-Frage → **Vorteil** in der Mitte (was Kolbi macht) → **Verlust** am Ende
(was du ohne Test verlierst) → Aufforderung. Verlust ist **nur Geld, Zeit oder Klarheit** – nie Gesundheitsangst.

**Für alle 6 gilt:**
- Gesprochener Text ca. 10 s (24–27 Wörter, Schnitt spielt 1,2× schneller ab), schnell, du-Form. Der Text unter
  „Gesprochen“ geht **wortgleich** in den Gemini-Prompt (Anführungszeichen außen weglassen).
- Host erklärt nur die Methode – nie „bei mir“, nie eigene Erfahrung, keine Nutzerzahlen.
- Kein Satz sagt, dass ein Supplement etwas bewirkt. Keine Dosis, keine Einnahme-/Anwendungsempfehlung.
- Beträge nur als markiertes **Rechenbeispiel** („Beispiel: …“), nie als Tatsache. App-Karten mit Beispielwerten
  tragen das Schild „Beispiel-Daten“ (in den vorhandenen Bildern schon drin).
- Aufforderung immer „gratis im Browser / Link in Bio“ – Store-Apps erst ab Dezember.
- Beim Posten Häkchen **„KI-generiert“** setzen.
- Schlussbilder (1080×1920, 2,2 s mit Whoosh) liegen unter `site/img/v/` – nach Deploy öffentlich als
  `https://kolbi-smoky.vercel.app/img/v/<name>.png`. Neu erzeugen (aus `supplement-lab/marketing`):
  `node content/higgsfield/frames.mjs - <outDir> ends`

| Schlussbild | Großer Satz | Kolbi | Videos |
|---|---|---|---|
| `end-sparen.png` | Hör auf, für Dosen zu zahlen, die bei DIR nichts tun | happy | 1, 3 |
| `end-scan.png` | Scan die Dose – sonst weißt du nicht, wofür du zahlst | think | 2 |
| `end-gratis.png` | Wer nicht vergleicht, rät. Teste gratis. | party | 4, 5 |
| `end-community.png` | Teil dein Ergebnis – statt allein bei null anzufangen | party | 6 |

Kleine Zeile auf allen: „Kolbi · gratis · Link in Bio“.

---

## 1 · „Welche Dose bringt was?“

- **Hook (Einblendung Sek. 1):** Welche bringt DIR was?
- **Gesprochen (27 Wörter):**
  „Welche Dose bringt bei dir was? Kolbi testet sie einzeln. Ohne Test zahlst du monatlich für Dosen, die bei dir vielleicht nichts tun. Gratis, Link in Bio.“
- **Vorteil:** Kolbi testet einzeln. **Verlust (Geld):** monatlich zahlen für Dosen, die bei dir vielleicht nichts tun.
- **App-Karten:** `site/img/v/stack.png` auf `stack-bg.png` (scrollt) → `baseline.png` (Beispiel).
- **Schlussbild:** `end-sparen.png`
- **Caption:** Mehrere Dosen im Schrank – und keine Ahnung, welche bei dir was bringt? Kolbi testet eine nach der
  anderen, mit deinen eigenen Werten. Jedes Supplement, das bei dir nichts bringt, kostet dich jeden Monat Geld.
  Gratis im Browser, Link in Bio.
- **Hashtags:** #supplements #nahrungsergänzung #selbsttest #geldsparen #kolbi
- **Health-Claims-Check:** ✅ Kein Supplement genannt, keine Wirkung behauptet; „bringt was“ / „nichts tun“ nur
  „bei dir“ und mit „vielleicht“. Verlust = Geld.

## 2 · „Scannen statt abtippen“

- **Hook:** Scannen statt abtippen.
- **Gesprochen (27 Wörter):**
  „Keine Lust, abzutippen? Kamera auf den Barcode – Kolbi sucht das Produkt raus, du bestätigst. Ohne Liste weißt du nicht mal, wofür du zahlst. Gratis, Link in Bio.“
- **Vorteil (Zeit):** Scan statt Tippen. **Verlust (Klarheit/Geld):** kein Überblick, wofür du zahlst.
- **App-Karten:** **neu nötig:** `scan.png` – Scan-Screen (Kamera-Rahmen mit Barcode) + vorbefüllte Auswahl
  „Hinzufügen“, Schild „Beispiel“. Danach `stack.png` (Eintrag erscheint).
- **Schlussbild:** `end-scan.png`
- **Caption:** Supplements eintragen geht schnell: Barcode auf der Dose scannen, Kolbi sucht das Produkt raus, du
  bestätigst. Das Kamerabild bleibt auf deinem Handy. Gratis im Browser – Link in Bio.
- **Hashtags:** #supplements #barcode #apptipp #selbsttest #kolbi
- **Health-Claims-Check:** ✅ Reine Funktionsbeschreibung. Keine Zeitangabe („3 Sekunden“ – nicht gemessen).
  „Sucht raus“ statt „erkennt jede Dose“ (nicht jedes Produkt ist in der Datenbank).

## 3 · „Was kostet dein Stack?“

- **Hook:** Was kostet dein Stack?
- **Gesprochen (26 Wörter):**
  „Was kostet dein Stack im Monat? Kolbi rechnet's dir vor. Jede Dose, die bei dir nichts bringt, kostet dich jeden Monat Geld. Gratis, Link in Bio.“
- **Vorteil:** Kolbi rechnet die Monatskosten aus Preis und Vorrat. **Verlust (Geld):** Dosen ohne Nutzen bei dir
  kosten jeden Monat.
- **App-Karten:** `site/img/v/coach.png` (Kosten-Coach, Beispiel-Daten). Dazu Einblendung in der Mitte:
  „**Beispiel:** 3 Dosen à 20 € = 60 € im Monat“.
- **Schlussbild:** `end-sparen.png`
- **Caption:** Trag Preis und Vorrat ein – Kolbi rechnet, was dein Stack im Monat kostet, und stellt es neben dein
  eigenes Testergebnis. Rechenbeispiel: 3 Dosen à 20 € = 60 € im Monat. Du entscheidest. Gratis, Link in Bio.
- **Hashtags:** #supplements #geldsparen #nahrungsergänzung #stack #kolbi
- **Health-Claims-Check:** ✅ Betrag nur als markiertes Rechenbeispiel; Coach-Karte als Beispiel markiert. Kein Rat
  zum Absetzen – nur Kosten vs. eigenes Ergebnis.

## 4 · „Wein gestern?“

- **Hook:** Wein gestern? Notier's!
- **Gesprochen (25 Wörter):**
  „Gestern Wein, kurze Nacht? Tipp's beim Check-in als Störfaktor an – dann bleibt dein Vergleich fair. Sonst rätst du, jeden Monat neu. Gratis, Link in Bio.“
- **Vorteil:** fairer Vergleich. **Verlust (Klarheit):** raten statt wissen, jeden Monat neu.
- **App-Karten:** **neu nötig:** `checkin-stoer.png` – Check-in mit „Störfaktoren“ (Alkohol / wenig Schlaf /
  Stress angetippt), Schild „Beispiel“. Danach `baseline.png`.
- **Schlussbild:** `end-gratis.png`
- **Caption:** Ein Abend mit Wein oder eine kurze Nacht kann deine Tagesbewertung schief machen. In Kolbi tippst du
  so was als Störfaktor an – damit dein Vergleich fair bleibt. Wer nicht vergleicht, rät. Gratis, Link in Bio.
- **Hashtags:** #selbsttest #supplements #biohacking #tracking #kolbi
- **Health-Claims-Check:** ✅ Betrifft nur die Messung (deine eigene Bewertung), nicht die Wirkung von Alkohol oder
  Supplements. Kein Rat zum Trinken/Nicht-Trinken. Störfaktoren gibt es in der App (Check-in).

## 5 · „Erst dein Normal“

- **Hook:** Erst dein Normal.
- **Gesprochen (27 Wörter):**
  „Bevor du was Neues testest: erst dein Normal festhalten. Dann siehst du, ob sich was ändert. Ohne Normal zahlst du für ein Bauchgefühl. Gratis, Link in Bio.“
- **Vorteil (Klarheit):** du siehst, ob sich was ändert. **Verlust (Geld):** du zahlst für ein Bauchgefühl.
- **App-Karten:** `site/img/v/baseline.png` (Beispiel) – passt genau.
- **Schlussbild:** `end-gratis.png`
- **Caption:** Ohne dein Normal weißt du nicht, womit du vergleichst. Kolbi hält erst ein paar Tage deine normalen
  Werte fest – dann testest du. Sonst zahlst du für ein Bauchgefühl. Gratis im Browser, Link in Bio.
- **Hashtags:** #selbsttest #baseline #supplements #biohacking #kolbi
- **Health-Claims-Check:** ✅ Methodentipp zum Testen, keine Einnahme- oder Dosierempfehlung; „was Neues“ nennt kein
  Produkt; „ob sich was ändert“ lässt offen, dass sich nichts ändert.

## 6 · „Was erleben andere?“

- **Hook:** Was erleben andere?
- **Gesprochen (27 Wörter):**
  „Fertig getestet? Teil dein Ergebnis in Gruppen wie Schlaf, Energie, Fokus – und sieh, was andere erlebt haben. Wer allein bleibt, fängt bei null an. Link in Bio.“
- **Vorteil:** Austausch in Start-Gruppen. **Verlust (Zeit):** allein bei null anfangen.
- **App-Karten:** **neu nötig:** `community.png` – Community-Übersicht mit den Start-Gruppen, nur Platzhalter-Posts
  mit Schild „Beispiel“ (keine echten oder erfundenen Nutzer-Beiträge zeigen).
- **Schlussbild:** `end-community.png`
- **Caption:** Dein Ergebnis gilt für dich – aber spannend ist, was andere bei sich gemessen haben. In Kolbis
  Community gibt es Gruppen wie Schlaf, Energie und Fokus. Gratis, Link in Bio.
- **Hashtags:** #community #supplements #selbsttest #erfahrungsaustausch #kolbi
- **Health-Claims-Check:** ✅ Keine Erfahrungsberichte gezeigt oder erfunden. Pin-Kommentar: „Ergebnisse in der
  Community sind persönliche Erfahrungen, keine Wirkaussagen.“

---

## Bewusst vermieden (Recht)

| Vermieden | Warum | Stattdessen |
|---|---|---|
| „Dir fehlt etwas“, „du schadest dir“, „Mangel“ | Angst vor Gesundheitsschäden in Werbung (Art. 12 HCVO, UWG) | Verlust nur Geld/Zeit/Klarheit |
| „Dosen, die nichts bringen“ (allgemein) | Abwertende Wirkaussage über Produkte | „bei dir“ + „vielleicht“ |
| „Spar 60 € im Monat“ | Erfundener Betrag als Tatsache | „Beispiel: 3 Dosen à 20 € = 60 €“ |
| „in 3 Sekunden“ | Nicht gemessen | „Kolbi sucht das Produkt raus“ |
| „Setz ab“, „nimm morgens“ | Anwendungs-/Absetzempfehlung | „Du entscheidest“ |
| „Andere sagen, es hilft“ | Erfahrungsberichte als Wirkbeleg | „was andere erlebt haben“ + Pin-Hinweis |
| „Lade im App Store“ | Store-Apps erst ab Dezember | „Gratis, Link in Bio“ |

## Wort-Untertitel (grüne Schlüsselwörter)

| # | Grün |
|---|---|
| 1 | bei dir · monatlich |
| 2 | Barcode · wofür |
| 3 | im Monat · Geld |
| 4 | Störfaktor · rätst |
| 5 | Normal · Bauchgefühl |
| 6 | Ergebnis · null |
