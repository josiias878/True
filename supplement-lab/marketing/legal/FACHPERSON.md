# Für die Fachperson – offene Rechtsfragen gebündelt

Stand: 2. Okt 2026 · Kolbi · Supplement Lab (Web-App, Website, Store-Apps iPhone/Android Version 1.0)

> **Für den Inhaber:** Diese Datei kannst du so, wie sie ist, an eine Fachperson geben (Datenschutz/IT-Recht und
> Lebensmittel-/Heilmittelwerberecht). Jede Frage nennt den heutigen Stand, wo er steht und welche Antwort wir
> brauchen. Nichts davon haben wir selbst rechtlich entschieden. Nach der Prüfung die Antworten hier eintragen und die
> Texte in `legal/` anpassen (DE ist verbindlich, EN zieht nach).

**Unterlagen zum Mitschicken:** `datenschutz.md` (+ `en/privacy.md`), `nutzungsbedingungen.md` (+ `en/terms.md`),
`impressum.md`, `health-claims-check.md`, `../store/forms.md` Abschnitt 0 (Faktentabelle: was die App an welchen
Server schickt, mit Fundstellen im Code), `../store/listing.md` (Store-Texte).

**Kurzbild der App:** Tagebuch für Selbstversuche mit Nahrungsergänzungsmitteln. Kein Konto; alle Einträge nur lokal
auf dem Gerät. Server-Kontakt nur: anonyme Ereignis-Zählung (standardmäßig an, abschaltbar), Kaufprüfung über
RevenueCat (Store-Apps, ohne Schalter), und freiwillig Web-Push, Kalender-Abo, Community-Ergebnis (Einwilligung),
Feedback. Server: Supabase (Region Frankfurt), Vercel (Hosting Website/Web-App), RevenueCat (USA). Verkauf: Abo
2,99 €/Monat, 19,99 €/Jahr (7 Tage gratis), 39,99 € einmalig – nur über Apple/Google. Start im Store: 1. Dez 2026;
Beta-Test über Google Play/TestFlight ab Ende Oktober.

---

## A · Datenschutz

**A1. Anonyme Statistik – Einwilligung oder berechtigtes Interesse mit Abschaltmöglichkeit? (wichtigste Frage)**
- Stand: Die App meldet Ereignisse („erster Check-in“, „Tarife angesehen“, „Kauf“ …) mit App-Sprache und
  Herkunftskanal (z. B. `reddit`, in Test-Versionen fest `playtest`) an eine eigene Supabase-Funktion; gespeichert wird nur ein Tageszähler
  (Tag, Ereignis, Sprache, Kanal, Anzahl) – keine Geräte-ID, keine IP in der Tabelle. **Standardmäßig an**, Schalter in
  den Einstellungen. Das erste Ereignis („Einführung angesehen“) wird schon beim ersten Öffnen gesendet, bevor man den
  Schalter in den Einstellungen sehen kann.
- Für die Zuordnung zum Kanal merkt sich die App den Kanal und die Einstellung im lokalen Speicher (localStorage).
  Der Text nennt heute Art. 6 Abs. 1 lit. f DSGVO und ist im Abschnitt 5 als „Klären durch Fachperson“ markiert.
- Fragen: (a) Ist der lokale Merker für die Zählung nach § 25 TDDDG einwilligungspflichtig, oder „unbedingt
  erforderlich“? (b) Sind die Zähl-Anfragen überhaupt personenbezogen (IP nur technisch bei der Übertragung)?
  (c) Reicht Opt-out, oder muss die Statistik auf „aus bis zur Zustimmung“ (z. B. ein Häkchen im Onboarding)?
- Folge: Bei „Einwilligung nötig“ baut Logik ein Opt-in; dann ändern sich Datenschutz §5, Play-Datensicherheit und
  Apple-Datenschutz-Label (`store/forms.md` 1.7, 2.2).

**A2. RevenueCat ohne Schalter bei jedem Start (Store-Apps)**
- Stand: Sobald Käufe aktiv sind, startet das RevenueCat-SDK bei jedem App-Start, legt eine zufällige anonyme
  App-Nutzer-ID auf dem Gerät ab, lädt Preise und prüft den Kaufstatus – auch bei Nutzern, die nie kaufen.
  Text: Art. 6 Abs. 1 lit. b (Kauf/Wiederherstellen), sonst lit. f; Speicherung als unbedingt erforderlich.
- Fragen: Tragen lit. f und § 25 Abs. 2 Nr. 2 TDDDG für Nicht-Käufer? Ist die Angabe „EU-US Data Privacy Framework“
  für RevenueCat richtig (Zertifizierung prüfen) – sonst Standardvertragsklauseln? Auftragsverarbeitungsvertrag
  (DPA) mit RevenueCat abschließen.

**A3. Supabase (Supabase, Inc., USA; Datenbank in Frankfurt, eu-central-1)**
- Fragen: AV-Vertrag/DPA abgeschlossen bzw. abzuschließen? Reicht die Formulierung in §11 (Auftragsverarbeiter,
  Speicherort Frankfurt), oder muss ein möglicher Drittlandzugriff (USA) samt Garantie (DPF/SCC) genannt werden?
  Wie lange speichert Supabase technische Protokolle mit IP-Adressen (für §14 Speicherdauer)?

**A4. Vercel Hosting und Web Analytics (Website + Web-App)**
- Stand: Server-Logs (lit. f); Web Analytics in cookieloser Variante, nicht in den Store-Apps.
- Fragen: Fällt das Analytics-Skript unter § 25 TDDDG (Lesen von Geräte-/Browserinformationen)? Reicht lit. f?
  AV-Vertrag mit Vercel; Speicherdauer der Logs (§14 sagt heute nur „nach den Fristen von Vercel“).

**A5. Community-Ergebnisse (Gesundheitsdaten, Art. 9)**
- Stand: nur nach Zustimmung in der App; pseudonyme Geräte-ID; Anzeige erst ab 5 Beiträgen; gespeichert bis zur
  Löschung durch den Nutzer (kein automatisches Ablaufdatum).
- Fragen: Erfüllt der Zustimmungsdialog in der App die Anforderungen an eine **ausdrückliche** Einwilligung (Art. 9
  Abs. 2 lit. a, Art. 7)? Braucht es eine Höchstspeicherdauer? Ist „pseudonym, wir können es keiner Person zuordnen“
  so haltbar?

**A6. Kalender-Abo mit Supplement-Namen**
- Stand: Standard ohne Namen; mit Schalter „Supplement-Namen im Kalender zeigen“ landen Namen in einer per Link
  abrufbaren Datei. Text: Art. 6 lit. a, mit Namen zusätzlich Art. 9 Abs. 2 lit. a.
- Frage: Reicht der Schalter als ausdrückliche Einwilligung, oder braucht es einen eigenen Hinweis-/Bestätigungsdialog?

**A7. Beta-Test über Google Play / TestFlight**
- Stand: Google/Apple verarbeiten Tester-Daten nach eigenen Bedingungen; wir sehen in den Konsolen Tester-Anzahl,
  Absturzberichte, Store-Feedback, bei TestFlight ggf. Name/E-Mail. Text: lit. f.
- Fragen: Rechtsgrundlage lit. f richtig (oder lit. b)? Gemeinsame Verantwortung mit Google/Apple (Art. 26)?
  Konkrete Löschfrist für Tester-Feedback und Tester-E-Mails festlegen.

**A8. Mindestalter**
- Stand: Google-Zielgruppe „18+“; Nutzungsbedingungen raten unter 18 nur zur ärztlichen Rücksprache.
- Frage: Ausdrückliches Mindestalter (z. B. 16 wegen Art. 8 DSGVO bei Einwilligungen, oder 18) in Datenschutz und
  Nutzungsbedingungen aufnehmen?

**A9. Sonstiges Datenschutz**
- Datenschutzbeauftragter nicht nötig (Einzelperson, keine umfangreiche Verarbeitung von Art.-9-Daten)? Bestätigen.
- Feedback „Löschung nach 12 Monaten“ ist ein Versprechen im Text; die automatische Löschung ist technisch noch
  nicht gebaut (Übergabe an Logik). Bis dahin manuell – ist das so in Ordnung?
- Verzeichnis von Verarbeitungstätigkeiten (Art. 30) – brauchen wir eins, und welche Vorlage?

## B · Werbung und Gesundheitsaussagen (HCVO / HWG / UWG)

**B1. Zugelassene Claims in der App-Bibliothek**
- Stand: 92 Texte umformuliert; Vitamine/Mineralstoffe nur mit Wortlaut aus VO (EU) 432/2012 („trägt zu … bei“),
  sonst beschreibend („wird genutzt für …“) – Details in `health-claims-check.md`.
- Fragen (Stichprobe): Ist das Zitieren zugelassener Claims in einer App, die selbst keine Supplements verkauft,
  „Werbung“ im Sinne der HCVO? Pflanzliche Stoffe ohne zugelassene Claims (Ashwagandha, Rhodiola …) – sind die
  beschreibenden Formulierungen zulässig? „Probiotika“ als Begriff (gilt in der EU als Claim)? Ziel-Vorschläge
  („Besser schlafen“, „Weniger Stress“ → Supplement-Liste) – unzulässige Wirkungsverknüpfung?
- Marketing-Regeln für Posts/Store-Texte (`health-claims-check.md`, „Regeln für alle Posts“) einmal bestätigen.

**B2. Melatonin-Seite (`/selbsttest/melatonin`, EN `/en/self-test/melatonin`)**
- Stand: Anleitung für einen Selbsttest mit Hinweis „In Deutschland gilt Melatonin nur in niedriger Dosis (bis 1 mg
  pro Tag) als Nahrungsergänzungsmittel; höhere Dosen sind Arzneimittel“, Einnahmezeitpunkt „30–60 Minuten vor dem
  Schlafen“, Erwähnung von Jetlag/Schichtarbeit als Nutzungsanlass; „Kolbi gibt keine Dosis-Empfehlung“.
  Quelle: `content/guides/supplement-tests.mjs`.
- Fragen: Ist die 1-mg-Grenze für Deutschland korrekt und aktuell formuliert? Sind Jetlag/Schichtarbeit als
  „Nutzungsanlass“ ein unzulässiger Gesundheits- oder Krankheitsbezug? Ist der Zeitpunkt-Hinweis eine unzulässige
  Anwendungsempfehlung? Seite so lassen, umformulieren oder streichen?
- Verwandt (App): Kauf-Tipps nennen seit 2. Okt keine Mengen mehr („Achte auf die Dosis auf der Packung“). In der
  Store-App vergleicht die Bibliothek die eingetragene Menge mit der „üblichen Packungsangabe“ (z. B. „Mehr als die
  übliche Packungsangabe … halte dich an die Packung oder an ärztlichen Rat“) und belegt keine Dosis mehr vor. Frage:
  Ist dieser Vergleich mit dem Satz „Kolbi gibt keine Dosis-Empfehlung“ vereinbar?

**B3. Affiliate-Links**
- Stand: Amazon-Suchlinks ohne Partner-Tag; sobald ein Tag gesetzt wird, Kennzeichnung „Anzeige“.
- Frage: Reicht „Anzeige“ am Link? Folgen für die Store-Frage „Enthält Werbung?“ und für HCVO (wird die App dann
  Werbung für Nahrungsergänzungsmittel)?

## C · Medizinprodukt

**C1. „Kein Medizinprodukt“ bestätigen**
- Stand: Selbstbeobachtungs-Tagebuch: subjektive Bewertungen (Schlaf, Energie, Ruhe, Fokus), Vergleich von
  Testphasen mit dem eigenen Normal, keine Diagnose, keine Therapie, keine Dosis-Empfehlung. Im Apple-Formular
  „Reguliertes Medizinprodukt?“ für EWR/UK/USA → **Nein**; Google „Gesundheits-Apps“ → kein Medizinprodukt;
  Pflicht-Hinweis in der Store-Beschreibung.
- Frage: Bestätigung, dass die App nach MDR (Regel 11, „Software als Medizinprodukt“) keine medizinische
  Zweckbestimmung hat – auch mit Funktionen wie „Muster-Detektor“, Nebenwirkungs-Erfassung, „Timing-Check“ und
  Hinweisen zu Kombinationen mit Medikamenten. Welche Formulierungen in App/Store müssten wir meiden?

## D · Impressum, Anbieter, Adresse

**D1. Impressum (§ 5 DDG, § 18 Abs. 2 MStV)**
- Stand: Platzhalter `[Vorname Nachname]`, `[Straße Hausnummer]`, `[PLZ Ort]`, `[E-Mail-Adresse]` in Impressum,
  Datenschutz und Nutzungsbedingungen. Google verlangt eine gültige Datenschutz-URL mit erkennbarem Anbieter.
- Fragen: Muss eine private Wohnanschrift genannt werden, oder ist eine ladungsfähige Geschäfts-/Service-Anschrift
  zulässig? Telefonnummer oder zweiter schneller Kontaktweg nötig? Gewerbeanmeldung, Kleinunternehmer-Hinweis,
  USt-IdNr. ins Impressum? Ist der Satz zur Verbraucherschlichtung so richtig?

**D2. EU-Händlerstatus in den Stores (DSA)**
- Stand: Wegen In-App-Käufen „Händler“ in Play Console und App Store Connect → Name, Adresse, Telefon, E-Mail werden
  im Store öffentlich angezeigt.
- Frage: Gleiche Fragen wie D1 (welche Adresse/Telefonnummer darf/muss öffentlich stehen).

## E · Nutzungsbedingungen und Verbraucherrecht

**E1. Haftungsklausel**
- Stand: „Wir haften nur für Vorsatz und grobe Fahrlässigkeit sowie nach den zwingenden gesetzlichen Vorschriften.“
- Frage: AGB-rechtlich wirksam (§ 309 Nr. 7 BGB: Verletzung von Leben, Körper, Gesundheit; wesentliche Pflichten)?
  Bitte wirksame Formulierung vorschlagen.

**E2. Widerrufsrecht und Abo-Pflichten**
- Stand: Käufe nur über Apple/Google; Text verweist auf deren Bedingungen und Erstattungsregeln. Web-Käufe (Stripe)
  sind für später angedacht.
- Fragen: Brauchen wir für Store-Käufe eigene Widerrufs-/Verbraucherinformationen, oder sind Apple/Google als
  Verkäufer dafür zuständig? Was müssten wir bei späteren Web-Käufen zusätzlich bauen (Widerrufsbelehrung,
  Kündigungsbutton § 312k BGB, Preisangaben)?

**E3. Gründer-Versprechen**
- Stand: „Wer bis einschließlich 30. November 2026 mit der App startet, erhält Lab Pro dauerhaft ohne Kosten.“ Der
  Status liegt nur lokal auf dem Gerät (kein Konto) und lässt sich nicht über „Käufe wiederherstellen“ übertragen –
  so steht es jetzt auch in den Nutzungsbedingungen.
- Frage: Ist „dauerhaft“ mit dieser Einschränkung transparent genug, oder umformulieren (z. B. „solange die App-Daten
  auf deinem Gerät erhalten bleiben“)? Sonstige Risiken des Versprechens (Irreführung, spätere Änderung)?

**E4. Apple-Standard-EULA plus eigene Nutzungsbedingungen**
- Stand: Feld „Lizenzvereinbarung“ in App Store Connect leer → Apples Standard-EULA gilt zusätzlich.
- Frage: Widersprechen sich die beiden Texte irgendwo, und welcher Text gilt vorrangig?

## F · Community mit Erfahrungsberichten (geplant, noch nicht gebaut)

**F1. Nutzer-Erfahrungsberichte auch zu nicht zugelassenen Stoffen (z. B. Peptide wie BPC-157)**
- Plan: Kolbi stellt nur die Plattform (wie ein Forum). Nutzer schreiben eigene Erfahrungen; Kolbi gibt keine
  Empfehlungen, keine Dosierungen, keine Bezugsquellen, hebt nichts hervor. Regeln + Melden + Moderation, ab 18.
- Fragen: Haftungsprivileg als Hosting-Anbieter (DSA Art. 6) – was müssen wir konkret tun (Melde-Verfahren,
  Kontaktstelle, Transparenz)? Kann eine solche Rubrik als Werbung für Arzneimittel (HWG/AMG) gewertet werden,
  wenn die App kostenpflichtig ist? Braucht es eine Altersprüfung? Was ist bei strukturierten Auswertungen
  („58 % behalten“) zu beachten – gilt das als unsere eigene Aussage?

---

## Antworten der Fachperson (hier eintragen)

| Nr. | Antwort / Entscheidung | Datum | Umgesetzt in |
|---|---|---|---|
| A1 | | | |
| A2 | | | |
| A3 | | | |
| A4 | | | |
| A5 | | | |
| A6 | | | |
| A7 | | | |
| A8 | | | |
| A9 | | | |
| B1 | | | |
| B2 | | | |
| B3 | | | |
| C1 | | | |
| D1 | | | |
| D2 | | | |
| E1 | | | |
| E2 | | | |
| E3 | | | |
| E4 | | | |
