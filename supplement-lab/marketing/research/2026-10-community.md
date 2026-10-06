# Kolbi · Community „Erfahrungen anderer sehen, eigene teilen“ (Research Okt 2026)

Stand 6. Okt 2026 · Analyst · Grundlage für Community Stufe 1 (jetzt) und Stufe 2 (ab ~1.000 aktiven Nutzern).

> **Grenzen:** EUR-Lex und DSA-Volltext-Seiten waren aus der Arbeitsumgebung **gesperrt** – DSA-Aussagen stammen aus
> Sekundärquellen (Regulierer-Seiten, Kanzlei-Factsheets) und sind vor Stufe 2 von der Fachperson am Originaltext zu
> prüfen. Keine Rechtsberatung. Alles mit „Annahme“ ist nicht gemessen.

## 0 · Eigene Zahlen (Supabase, nur gelesen, 6. Okt)

| Quelle | Stand |
|---|---|
| `lab_community` | **0 Einträge**, 0 Supplements, 0 Geräte |
| `lab_funnel` | 2 Zeilen (direkt): 1× `besucht` (en), 1× `sieben_checkins` (de, vermutlich intern) |
| `lab_feedback` | 1 Eintrag (unverändert) |

→ **Keine Daten** zur Community. Wichtig für den Kaltstart: Ein Beitrag entsteht erst nach einem **abgeschlossenen
Test** (Baseline 7 Tage + Test ≥ 5 Tage, `buildPhases`) und einem Urteil. Bis zum ersten sichtbaren Supplement (n ≥ 5)
braucht es also **≥ 5 Personen, die dasselbe Supplement ~2 Wochen durchtesten und teilen**. Außerdem steckt die
Community-Karte hinter `ProGate("community")` – nach der Beta sähe ein Gratis-Nutzer die Daten, zu denen er beiträgt, nicht.

## 1 · Wie andere es lösen – und was zu Kolbi passt

| Produkt | Muster | Passt zu Kolbi? |
|---|---|---|
| **CureTogether** (2008–12, dann von 23andMe gekauft) | Nutzer bewerten Behandlungen je Beschwerde strukturiert; Ergebnis = Rangliste „was half anderen“. Depression: >6.500 Mitglieder bewerteten 105 Behandlungen ([TechCrunch](https://techcrunch.com/2012/07/11/23andme-first-acquisition/), [participatorymedicine](https://participatorymedicine.org/epatients/2012/07/curetogether-acquired-by-23andme.html)) | **Sehr** – genau Stufe 1. Lehre: als Eigenständiges nicht überlebt, Wert lag in den Daten für Forschung. Ranglisten = Empfehlungscharakter → bei Kolbi **nicht** sortieren/ranken (Inhaber-Entscheid) |
| **PatientsLikeMe** (seit 2004) | „Treatment Evaluation“: Wirksamkeit, Nebenwirkungen, unerwartete Effekte je Medikament, strukturiert + Profilverlauf ([PLM](https://join.patientslikeme.com/takecharge/treatmenteval), [Wikipedia](https://en.wikipedia.org/wiki/PatientsLikeMe)). 2019 nach US-Auflage an UnitedHealth verkauft ([STAT](https://www.statnews.com/2019/06/24/patientslikeme-forced-by-u-s-to-ditch-chinese-investor-sold-to-unitedhealth-group/)) | **Ja** für die Feldstruktur (Wirkung · Nebenwirkung · Dauer). Lehre: Gesundheitsdaten + Geschäftsmodell = Vertrauensfrage → Kolbi-Versprechen „anonym, löschbar, nie verkauft“ sichtbar halten |
| **SSC-Nootropics-Umfrage** (r/Nootropics) | 850 (2016) bzw. 852 (2020) Leute bewerten Substanzen 0–10, veröffentlicht als Tabelle → viel zitiert ([2016](https://slatestarcodex.com/2016/03/01/2016-nootropics-survey-results/)) | **Ja**: Beweis, dass Reddit-Publikum strukturierte Selbstberichte will. Schwäche: Einmal-Erinnerung statt Messung – Kolbis Vorher/Nachher-Messung ist der Unterschied |
| **Reddit** r/Supplements, r/Nootropics | Freitext, Upvotes, Moderation durch Freiwillige | Für **Stufe 2**. Gründer nutzten anfangs Fake-Konten ([Vice](https://www.vice.com/en/article/how-reddit-got-huge-tons-of-fake-accounts-2/)) – für Kolbi ausgeschlossen (GROWTH.md §7) |
| **Examine** | Redaktionelle Evidenz-Datenbank, keine Nutzerberichte gefunden ([Examine](https://Examine.Com/plus/public-libraries/)) | Gegenpol: „Was sagen Studien“ vs. Kolbi „was erlebten Menschen, gemessen“. Keine Konkurrenz, eher Ergänzung |
| **Bearable** | Starker Einzelnutzer-Tracker mit Korrelationen; eine Community-Datenansicht fand ich **nicht** belegt ([bearable.app](https://bearable.app/symptom-tracker/)) | Zeigt: Tracker gewinnen über Einzelnutzen, nicht über Community |
| **Vivino / Untappd / Letterboxd / Goodreads** | Jede Nutzung (Etikett scannen, Check-in, Film loggen) erzeugt **nebenbei** eine strukturierte Bewertung → Aggregat pro Objekt + Tagebuch + Folgen. Vivino füllte die DB anfangs selbst mit echten Etiketten und lief Scan-Wettbewerbe ([TechCrunch](https://techcrunch.com/?p=717554), [oresundstartups](https://oresundstartups.com/vivino-reveals-interesting-numbers/)) | **Kernmuster für Kolbi**: Das Urteil am Testende *ist* der Beitrag. Seite „pro Supplement“ = Vivino-Weinseite |
| **Strava** | Feed + Kudos. Radboud-Studie: wer mehr Kudos bekam, lief mehr; früh sozial Aktive blieben öfter ([Running Magazine](https://runningmagazine.ca/?p=91520), [UX Collective](https://uxdesign.cc/why-over-100-million-athletes-are-hooked-on-strava-545708e17552)) | **Teilweise**: „Kudos fürs Durchhalten“ (Check-in-Serie, Test beendet) passt – Kudos für *Ergebnisse* wäre Wertung/Empfehlung → vermeiden |

**Strategie-Rahmen:** „Come for the tool, stay for the network“ (Chris Dixon, 2015) – Einzelnutzen trägt, bis das
Netzwerk groß genug ist ([TechCrunch](https://techcrunch.com/2016/12/01/come-for-the-tool-stay-for-the-network-reconsidered/)).
Andrew Chen: kleinste selbsttragende Einheit („atomic network“) zuerst ([Lenny's](https://www.lennysnewsletter.com/p/atomic-network)).
Für Kolbi heißt das: **ein Supplement** (Annahme: Magnesium oder Kreatin – höchstes Such-/Diskussionsvolumen laut
`2026-10-demand.md`) zuerst auf n ≥ 5 bringen statt 90 halbleere Seiten.

## 2 · Kaltstart ohne Fake

1. **Nutzung sichtbar machen, die es schon gibt:** Zähler, die nicht vom Urteil abhängen, z. B. „12 Leute testen gerade
   Magnesium“ (laufende Tests, nur Anzahl). Füllt sich ~2 Wochen früher als Ergebnisse. Braucht neues, anonymes Zählsignal
   (Logik-Aufgabe; Annahme: gleiches Datenschutz-Niveau wie heute).
2. **Ehrliche Leerzustände statt Platzhalter:** „Noch 3 Tests bis zur Auswertung – deiner zählt“ ist schon gebaut
   (`community.tsx`). Ergänzen: Fortschrittsbalken 0/5 und „Test starten“-Knopf direkt darunter.
3. **Gemeinsame Startwelle („Kohorte“):** „Magnesium-Woche ab Montag“ – alle starten denselben fertigen Test gleichzeitig →
   n ≥ 5 in ~2 Wochen erreichbar. Einladungen (`/invite`) mit „teste mit mir“. Kein Fake, nur Bündelung.
4. **Öffentliche SEO-Seiten aus Aggregaten** (`/selbsttest/<supp>` bekommt einen Community-Block) – **erst ab Schwelle**,
   davor nur „Sei unter den ersten 5“. Hebt Motor 1 (SEO) und Community zugleich.
5. **Schwellen:** Heute `MIN_N = 5`. Zum Vergleich: US-Behörde CMS veröffentlicht keine Zellen mit 1–10 Personen und
   verbietet auch Prozentwerte, aus denen sich solche Zahlen zurückrechnen lassen ([ResDAC](https://resdac.org/node/1506)).
   Kolbi zeigt bei n = 5 Nebenwirkungen schon ab 2 Nennungen als Prozent (`sides`, c ≥ 2). Daten sind anonym
   (Zufalls-Geräte-ID), Re-Identifikation daher unwahrscheinlich – **Empfehlung (Annahme, keine Pflicht):**
   - n < 5: nur „x von 5“ · n 5–19: Anteile **gerundet in Worten** („die meisten“, „etwa die Hälfte“) + Hinweis
     „wenige Daten“ · ab n ≥ 20: Prozent, Verteilung, Bereiche · Nebenwirkungen erst ab c ≥ 3.
   - Für **öffentliche** Seiten (Google) höhere Schwelle als in der App, z. B. n ≥ 20 (Annahme).

## 3 · Pflichten (Store + EU)

| Regel | Was sie verlangt | Stufe 1 (strukturiert, anonym, ohne Freitext) | Stufe 2 (Freitext) |
|---|---|---|---|
| **Apple 1.2** ([Guidelines](https://developer.apple.com/app-store/review/guidelines/)) | Filter gegen anstößige Inhalte · Melden + zeitnahe Reaktion · Nutzer blockieren · veröffentlichte Kontaktdaten. „Random or anonymous chat“ unerwünscht | Reine Aggregate sind m. E. kein UGC im Sinne 1.2 (Einschätzung). **Aber:** frei wählbares Pseudonym = Freitext → Filter nötig. Lösung: **Pseudonym generieren** („Kölbchen #4821“), nicht tippen lassen | **Alles vier Pflicht** + Apple 1.4.1-Nähe (Gesundheit) beachten |
| **Google Play UGC** ([Richtlinie](https://support.google.com/googleplay/android-developer/answer/9876937)) | UGC = von Nutzern beigetragen und für andere sichtbar. Nutzungsbedingungen mit Regeln **vor** dem Posten akzeptieren · Melden **und** Blockieren von Inhalten und Nutzern · „robuste, laufende Moderation“ | Ein **Feed mit Einzel-Ergebnissen** unter Pseudonym ist nach dieser Definition wohl UGC → einfacher „Melden“-Knopf + Ausblenden-Funktion schon in Stufe 1 einplanen (billig) | Pflicht: Regeln-Zustimmung, Melden, Blockieren, Moderations-Prozess |
| **DSA** (laut [Kanzlei-Factsheet](https://www.ictrecht.nl/hubfs/Kennisdocumenten/Factsheets/%5BENG%5D%20Factsheets/DSA/The%20Digital%20Service%20Act.pdf), [AKOS](https://www.akos-rs.si/en/digital-services/explore/for-service-providers/translate-to-english-izjeme-za-mikro-in-majhne-ponudnike), [Springlex Art. 15](https://www.springlex.eu/en/packages/dsa/dsa-regulation/article-15/), [Presencis Art. 19](https://presencis.com/regulations/dsa/article-19/)) | Hosting-Dienst auch als Kleinstunternehmen: **Art. 11** Kontaktstelle für Behörden · **Art. 12** Kontaktstelle für Nutzer (elektronisch, nicht nur automatisiert) · **Art. 14** AGB: Moderationsregeln, Verfahren, Werkzeuge, ob automatisiert oder menschlich · **Art. 16** Melde-und-Abhilfe-Verfahren (elektronisch, mit Begründung, Eingangsbestätigung, Entscheidungsmitteilung) · **Art. 17** Begründung bei Löschung/Einschränkung. **Befreit** (Kleinst/Klein): Art. 15 Transparenzbericht, Art. 20–28 Plattform-Pflichten (Art. 19) | Kolbi speichert Nutzerbeiträge → Hosting. Art. 11/12/14 sind mit Impressum + E-Mail + AGB-Abschnitt „Community“ schnell erfüllt; Art. 16 als „Melden“-Link genügt in schlanker Form | **Art. 11, 12, 14, 16, 17 vollständig** · Inhaber prüft, ob Ausnahme Art. 24(3) o. ä. greift (Originaltext!) |
| **DSGVO Art. 9** | Ergebnisse (Wirkung, Nebenwirkungen) sind **Gesundheitsdaten** → ausdrückliche Einwilligung, Widerruf/Löschung | Schon gebaut: Zustimmung + Vorschau + „Meine geteilten Ergebnisse löschen“. Datenschutzerklärung nennen | dito + Freitext kann Klarnamen/Dritte enthalten → Hinweis + Moderation |
| **Apple 5.1.3** ([Zusammenfassung](https://conductatlas.com/platform/apple/apple-app-store-review-guidelines/health-and-medical-data-handling-requirements/)) | Gesundheitsdaten nicht für Werbung/Data-Mining an Dritte | Partnerlinks **nie** aus Community-Daten speisen („Andere behielten X → kaufen“) | dito |

**Minimum Stufe 1:** generierte Pseudonyme · AGB-Abschnitt „Community/Moderation“ · Kontakt-E-Mail in App · „Melden“
an jedem Einzel-Eintrag im Feed · Aggregate erst ab Schwelle. **Stufe 2 zusätzlich:** Wortfilter + Vorab-Prüfung,
Melden/Blockieren von Nutzern, Begründung bei Löschung, Altersfreigabe 18+, Forenregeln (Dosis, Bezugsquellen, Rat).

## 4 · Empfehlung: Top-5-Bausteine Stufe 1 (in dieser Reihenfolge)

1. **Teilen-Moment am Testende scharf machen** (Ergebnis-Screen): Vorschau „das geht anonym raus“ + 1 Tipp. Das ist die
   einzige Quelle für Daten – ohne ihn bleibt alles leer. **Und:** Teilen + Basis-Ansicht (Anzahl, „x von 5“, grobe Anteile)
   **aus `ProGate` nehmen**; Pro bekommt Tiefe (Bereiche, Verteilung, „wo liegst du“). Begründung: Netzwerk braucht Beiträger;
   wer nichts sieht, teilt nicht (Annahme).
2. **Supplement-Seite „Was andere erlebt haben“** (Vivino-Muster): Kopf mit n, Testdauer Ø, Behalten/Vielleicht/Absetzen,
   Bereiche, Nebenwirkungen – gestuft nach Schwellen aus §2. Unter n: Fortschritt 0/5 + „Test starten“.
3. **Kohorten-Start „Gemeinsam testen“** auf Kolbi-Tab/Experimenten: „Magnesium-Woche – 3 sind dabei“ + Einladungslink.
   Löst den Kaltstart ehrlich (n ≥ 5 pro Woche bündeln).
4. **Feed „Gerade im Labor“** (Strava-light): Einträge wie „Kölbchen #4821 hat Kreatin 14 Tage getestet“ – **ohne**
   Urteil-Wertung im Feed, nur Aktivität; Reaktion „💪 Durchhalten“ statt Like. Melden-Knopf ab Tag 1.
5. **Lab-Pseudonym + Profil-Mini** (generiert, mit Kolbi-Avatar): zeigt nur Anzahl beendeter Tests und Serie.
   Bereitet Stufe 2 vor, ohne Freitext-Risiko.

*(Bewusst nicht in Stufe 1: Ranglisten „bestes Supplement“, Kommentare, Folgen-Graph, öffentliche SEO-Blöcke < n 20.)*

**Kennzahlen (alle neu zu messen, heute keine Daten):**
- **Leitzahl: Teilen-Quote** = geteilte Ergebnisse / abgegebene Urteile (`lab_community`-Zeilen ÷ `lab_funnel.urteile`).
  Sie zeigt, ob der Motor läuft. Zielwert erst nach 4 Wochen Messung festlegen.
- **Zeit bis zum 1. Supplement mit n ≥ 5** (Kaltstart überwunden?).
- **Wirkung auf Bindung:** Anteil `sieben_checkins` bei Nutzern, die eine Community-Seite gesehen / einer Kohorte
  beigetreten sind, vs. ohne (braucht ein zusätzliches anonymes Funnel-Signal `community_gesehen`).

## Offene Fragen

- Darf die Basis-Community gratis bleiben (Preismodell `PRO_FEATURES` ändern)? → CEO/Inhaber.
- Neues Zählsignal „laufender Test je Supplement“ datenschutzrechtlich ok (gleiche Zufalls-ID)? → Fachperson.
- Gilt Kolbi für Stufe 1 schon als „Online-Plattform“ (öffentliche Verbreitung) oder nur Hosting? → Originaltext DSA Art. 3(i).
