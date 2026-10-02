# Store-Formulare · kopierfertige Antworten (Google Play + Apple)

Stand: 2. Okt 2026 · Version **1.0** · App-ID **`app.kolbi`** · **ohne** Apple Health / Health Connect ·
iOS **nur iPhone** (`TARGETED_DEVICE_FAMILY = 1`) · Android **minSdk 26** (= Android 8.0) · targetSdk 36.

> **So benutzen:** Abschnitt für Abschnitt durch die Konsole klicken, Antwort übernehmen.
> Die Konsolen sind meist deutsch; der englische Begriff steht in Klammern, falls die Oberfläche englisch ist.
> **„Klären:“** = vor dem Absenden entscheiden oder nachsehen. Nichts davon ist geraten: jede Aussage ist
> im Code geprüft (Fundstelle steht in Abschnitt 0). Weicht der Build später ab → diese Datei zuerst anpassen.
> Wortlaute der Konsolen ändern sich gelegentlich. Grundsatz: **bei Unsicherheit die ehrlichere, „strengere“ Antwort.**

Verwandte Dateien: Texte → [`listing.md`](./listing.md) · Abos → [`subscriptions.md`](./subscriptions.md) ·
Prüfer-Notizen → [`review-notes.md`](./review-notes.md) · Ablauf → [`../../STORE.md`](../../STORE.md) ·
12-Tester-Pflicht → [`../launch/TESTERS.md`](../launch/TESTERS.md)

---

## 0 · Faktenbasis (im Code geprüft am 2. Okt 2026)

Alles, was die **Store-App** an einen Server schickt. Alles andere (Supplements, Einnahmen, Check-ins,
Notizen, Vorrat, Preise, Ziele) liegt **nur auf dem Gerät** (`localStorage`), kein Konto, keine Anmeldung.

| # | Funktion | Was geht raus | Kennung? | Standard | Löschen | Server | Fundstelle |
|---|---|---|---|---|---|---|---|
| 1 | **Anonyme Statistik** | Ereignisname (z. B. `first_checkin`, `paywall_view`, `purchase`), App-Sprache, Herkunftskanal (`src`, nur aus Web-Links oder ein fester Test-Kanal in Test-Versionen, z. B. `playtest` über `VITE_STATS_SRC`) → nur ein **Tageszähler** wird erhöht | **keine** (keine Geräte-ID, IP wird nicht gespeichert) | **an**, abschaltbar: Einstellungen → „📊 Anonyme Statistik“ | nicht nötig/möglich (nur Summen) | Supabase Frankfurt | `lib/labStats.ts`, `supabase/functions/lab-stats` |
| 2 | **Feedback** | Stimmung (love/ok/meh), Freitext ≤ 1000 Zeichen, Ort in der App (`where`), App-Version mit Plattform (z. B. `1.0.0-android`, `1.0.0-ios`, `1.0.0-web`) | **keine** | nur beim Abschicken | Löschung nach 12 Monaten (Datenschutz §7); einzeln nicht zuordenbar | Supabase | `lib/labGrow.ts` `sendFeedback`, `functions/lab-feedback` |
| 3 | **Community** | Bibliotheks-ID des Supplements, Testtage, Urteil, ±★ gesamt/je Bereich, Nebenwirkungs-IDs | **zufällige Geräte-ID** (32 Hex, in der App erzeugt) | **aus**, nur mit Zustimmung | in der App: „Meine geteilten Ergebnisse löschen“ (löscht alle Beiträge der ID) | Supabase | `lib/labCommunity.ts`, `functions/lab-community` |
| 4 | **Kalender-Abo** (Pro) | ICS-Datei mit großen Terminen; Titel **neutral**, Supplement-Namen nur wenn „Namen im Kalender“ an | **zufälliges Token** (48 Hex) | aus | „Abo beenden“ löscht die Datei | Supabase | `lib/labCalendar.ts`, `functions/lab-cal` |
| 5 | **Käufe** (RevenueCat) | anonyme App-Nutzer-ID von RevenueCat, Kaufbelege (Produkt, Zeitpunkt, Status) | **anonyme RC-ID** | aktiv, sobald der RC-Schlüssel im Build steckt (beim Start: Angebote + Kaufstatus abfragen) | über RevenueCat-Dashboard auf Anfrage | RevenueCat (USA, DPF) | `supplement-lab/src/billing.ts` |
| – | Push über Server | **nicht in der Store-App** (`allowPush(!native)`); Store-App nutzt lokale Benachrichtigungen | – | – | – | – | `src/main.tsx`, `src/native.ts` |
| – | Vercel Web Analytics | **nicht in der Store-App** (`if (!native) inject()`) | – | – | – | – | `src/main.tsx` |
| – | Apple Health / Health Connect | **nicht in 1.0**: Oberfläche aus (`HEALTH_UI`), Plugin weder als HealthKit noch als Health Connect gelinkt, `NSHealthShareUsageDescription` entfernt (Technik, 2. Okt) | – | – | – | – | `lib/health.ts`, `capacitor.config.ts` |
| – | Werbung / Tracking-SDKs | **keine** (Abhängigkeiten: Capacitor, Local Notifications, RevenueCat, In-App-Review, React); Werbe-ID-Berechtigung wird entfernt | – | – | – | – | `supplement-lab/package.json` |
| – | Kauf-Links (Amazon-Suche) | **nichts** – öffnet nur eine Amazon-Suche im Browser. Partner-Tag ist **leer** (`AFFILIATE.amazonTag = ""`) | – | – | – | – | `lib/labStock.ts` |

Alle Verbindungen laufen über **HTTPS**. Erwartete Android-Berechtigungen in 1.0 (Angabe Technik, 2. Okt 2026):
`INTERNET`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `ACCESS_NETWORK_STATE`,
`com.android.vending.BILLING` (+ signaturgeschützte androidx-Receiver-Berechtigung). **Kein** exakter Wecker,
**keine** Werbe-ID (`AD_ID` wird aktiv aus dem Manifest entfernt), **keine** Health-Berechtigung, kein Standort,
keine Kontakte, Kamera oder Mikrofon. Neu: natives **Bewertungs-Fenster** (In-App-Review; Apple zeigt es höchstens
3× pro Jahr, in TestFlight nie) – erhebt keine Daten für uns.

> **Klären (Logik, nach dem ersten AAB):** Play Console → *App-Bundle-Explorer* → Berechtigungen ansehen und mit der
> Liste oben vergleichen. Weicht etwas ab → diese Datei (1.6, 1.7) anpassen, bevor die Formulare abgeschickt werden.

---

## 1 · Google Play Console

Pfad für fast alles: **Play Console → Kolbi → Richtlinien (Policy) → App-Inhalte (App content)**.
Alle Erklärungen gelten schon für den **geschlossenen Test** – sie müssen vor dem ersten Test-Release fertig sein.

### 1.1 Datenschutzerklärung (Privacy policy)

| Feld | Eingabe |
|---|---|
| URL der Datenschutzerklärung | `https://kolbi-smoky.vercel.app/datenschutz` |

- Gültig erst, wenn die **Impressum-Daten** eingetragen und die Seite neu gebaut/deployt ist (heute stehen noch
  Platzhalter wie `[Vorname Nachname]` drin – Google verlangt, dass der Anbieter und ein Kontakt erkennbar sind).
- Die Seite ist öffentlich erreichbar, kein PDF, nicht ortsgesperrt; `noindex` ist dafür kein Problem.
- Rechtstexte am 2. Okt 2026 an die Store-App 1.0 angepasst (Statistik standardmäßig an, RevenueCat ohne Schalter, kein
  Health, Push nur Web-App, Beta-Test-Abschnitt). Offene Rechtsfragen gebündelt in [`../legal/FACHPERSON.md`](../legal/FACHPERSON.md).

### 1.2 App-Zugriff (App access)

| Frage | Antwort |
|---|---|
| Sind Teile der App eingeschränkt (Login, Mitgliedschaft, Standort …)? | **„Alle Funktionen sind ohne besondere Zugriffsrechte verfügbar“** (All functionality is available without special access) |

Begründung: kein Konto, kein Login. Lab Pro ist ein normaler In-App-Kauf – das zählt hier nicht als Zugangsbeschränkung.

### 1.3 Werbung (Ads)

| Frage | Antwort |
|---|---|
| Enthält Ihre App Werbung? (Does your app contain ads?) | **Nein, meine App enthält keine Werbung** |

Begründung: kein Werbe-SDK, keine Banner/Interstitials/Hausanzeigen. Die Amazon-Links sind Such-Links **ohne**
Partner-Tag. **Klären (später):** Sobald ein Amazon-Partner-Tag gesetzt wird, sind die Links „Anzeige“ (in der App
gekennzeichnet). Google zählt laut eigener Hilfe „bezahlte Produktplatzierung“ nicht unter das Label „Enthält
Werbung“ – vor dem Setzen des Tags trotzdem noch einmal prüfen und ggf. auf **Ja** stellen (ehrlichere Antwort).

### 1.4 Einstufung des Inhalts (Content rating · IARC-Fragebogen)

**Start:** E-Mail-Adresse für das IARC-Zertifikat = Support-E-Mail (**Klären:** welche Adresse).
**Kategorie (Category):** keine Spiele-App, kein soziales Netzwerk, keine Nachrichten/Referenz → die Kategorie für
**Dienstprogramme/Produktivität/Sonstiges** (Utility, Productivity, Communication or Other) wählen.
**Klären:** genaue Bezeichnung in der Konsole; nicht „Spiel“, nicht „Soziales/Kommunikation“, nicht „Unterhaltung“.

| Themenblock | Frage (sinngemäß) | Antwort | Warum |
|---|---|---|---|
| Gewalt (Violence) | Darstellung/Beschreibung von Gewalt, Blut, Waffen? | **Nein** | – |
| Angst (Fear) | Erschreckende, verstörende Inhalte? | **Nein** | Kolbi wird höchstens „trüb“ |
| Sexualität (Sexuality) | Nacktheit, sexuelle Inhalte, Andeutungen? | **Nein** | – |
| Sprache (Language) | Schimpfwörter, vulgäre Sprache? | **Nein** | – |
| Grober Humor (Crude humor) | Fäkalhumor o. Ä.? | **Nein** | – |
| **Kontrollierte Substanzen** (Controlled substances) | Bezüge zu **Alkohol**? | **Ja – nur Erwähnung/Hinweis**, keine Darstellung des Konsums, keine Verherrlichung | Tages-Merkmal „Alkohol“ beim Check-in (`TAGS` in `lib/supplementLab.ts`), Warnhinweise wie „nicht mit Alkohol oder Schlafmitteln kombinieren“ |
| | Bezüge zu **Tabak**? | **Nein** | – |
| | Bezüge zu **illegalen Drogen**? | **Nein** | Peptide sind im Store-Modus ausgeblendet; verschreibungspflichtige Mittel nur als neutrale Kategorie „Verschriebene Medikamente“ |
| | Verkauf/Bewerbung von Alkohol, Tabak, Drogen? | **Nein** | – |
| Glücksspiel (Gambling) | Echtes oder simuliertes Glücksspiel, Lootboxen? | **Nein** | Abzeichen/Serien sind kein Glücksspiel |
| Interaktion (User interaction) | Können Nutzer **miteinander** kommunizieren oder Inhalte austauschen? | **Nein** | Community = anonyme Zusammenfassung ab 5 Beiträgen, keine Profile, Nachrichten oder Kommentare; Feedback geht nur an uns |
| | Teilt die App den **Standort** des Nutzers mit anderen? | **Nein** | – |
| | Können Nutzer **digitale Waren kaufen**? | **Ja** | Lab Pro (Abo + Einmalkauf) |
| Sonstiges (Miscellaneous) | Uneingeschränkter Internetzugang / Webbrowser / Suchmaschine? | **Nein** | Links öffnen nur feste Seiten (Rechtstexte, Amazon-Suche) im System-Browser |
| | Ist die App eine Nachrichten-App? | **Nein** | – |

**Erwartetes Ergebnis:** niedrige Einstufung; wegen der Alkohol-Erwähnung evtl. „ab 12“ statt „ab 0/6“ in einzelnen
Systemen (USK/PEGI). Das berechnet IARC – nicht schönrechnen, die Erwähnung ist echt.

### 1.5 Zielgruppe und Inhalte (Target audience and content)

| Frage | Antwort |
|---|---|
| Zielaltersgruppen (Target age groups) | **nur „18 und älter“** (18 and over) – alle anderen Häkchen weg |
| Könnte der Store-Eintrag unbeabsichtigt Kinder ansprechen? (Appeal to children) | **Nein** (falls gefragt) |
| Werbung für Kinder / Familienprogramm | entfällt (keine Kinder-Zielgruppe) |

**Begründung 18+:** Kolbi ist ein Werkzeug für Menschen, die **bereits Supplements einnehmen** und Gesundheits-/
Wohlbefindens-Themen beobachten. Die Nutzungsbedingungen raten unter 18 ausdrücklich zur ärztlichen Rücksprache, der
Marken-Steckbrief (`brand/BRAND.md`) schließt Kinder und Jugendliche als Zielgruppe aus, und es gibt In-App-Käufe.
Mit 18+ fällt die App nicht unter die Familien-Richtlinie (keine zusätzlichen Prüfungen).
**Risiko:** Kolbi ist ein niedliches Maskottchen. Store-Texte und Screenshots sprechen deshalb klar Erwachsene an
(Supplements, Kosten, Selbstversuch) – so lassen.

### 1.6 Nachrichten-, Behörden-, Finanz- und weitere Erklärungen

| Erklärung | Antwort |
|---|---|
| Nachrichten-App (News apps) | **Nein** |
| Behörden-App (Government apps) | **Nein** |
| Finanzfunktionen (Financial features) | **„Meine App bietet keine dieser Finanzfunktionen“** (In-App-Käufe zählen nicht) |
| COVID-19-Kontaktverfolgung/Status (falls noch angezeigt) | **Nein / nicht zutreffend** |
| Werbe-ID (Advertising ID) | **Nein, meine App verwendet keine Werbe-ID** (`AD_ID` wird aktiv aus dem Manifest entfernt; im AAB gegenprüfen, Abschnitt 0) |
| Health-Connect-Berechtigungen | **entfällt** – 1.0 enthält kein Health Connect |
| Konto löschen (Account deletion) | entfällt – die App hat **keine Konten** |
| Exakte Wecker (Exact alarms) | **entfällt** – 1.0 fordert keine Berechtigung für exakte Wecker an. Erinnerungen sind normale lokale Benachrichtigungen. |

### 1.7 Datensicherheit (Data safety)

Pfad: **App-Inhalte → Datensicherheit → Starten**. Antworten gelten für die **Produktionsversion mit Lab Pro**
(RevenueCat aktiv). Muss inhaltlich zu Apple (Abschnitt 2.2) und zur Datenschutzerklärung passen.

**Übersicht (Data collection and security)**

| Frage | Antwort |
|---|---|
| Erhebt oder teilt Ihre App erforderliche Nutzerdatentypen? (Does your app collect or share any of the required user data types?) | **Ja** |
| Werden alle erhobenen Nutzerdaten bei der Übertragung verschlüsselt? (Encrypted in transit) | **Ja** (nur HTTPS) |
| Welche Kontoerstellungsmethoden unterstützt Ihre App? | **„Meine App lässt keine Kontoerstellung zu“** (My app does not allow users to create an account) |
| Können Nutzer die Löschung ihrer Daten anfordern? (Data deletion request) | **Ja** – in der App: Community-Beiträge löschen, Kalender-Abo beenden; sonst per E-Mail (Kaufdaten bei RevenueCat). Statistik/Feedback sind ohne Kennung und nicht zuordenbar. |
| Unabhängige Sicherheitsprüfung (Independent security review) | **Nein** (freiwillig, nicht gemacht) |

**Datentypen** (alle: **geteilt = Nein**, **flüchtig verarbeitet (ephemeral) = Nein**).
„Geteilt“ = Nein, weil Supabase und RevenueCat **Dienstleister** in unserem Auftrag sind – das ist laut Google kein Teilen.

| Kategorie → Datentyp (Play) | Was genau | Erhoben | Erforderlich oder optional | Zwecke (Purposes) |
|---|---|---|---|---|
| **Gesundheit und Fitness → Gesundheitsinformationen** (Health info) | anonymes Community-Testergebnis (#3); Kalender-Datei, **falls** „Namen im Kalender“ an ist (#4) | Ja | **Optional** (Einwilligung bzw. Schalter) | App-Funktionalität (App functionality) |
| **App-Aktivitäten → App-Interaktionen** (App interactions) | anonyme Tageszähler je Ereignis + Sprache + Kanal (#1) | Ja | **Optional** (in den Einstellungen abschaltbar) | Analysen (Analytics) |
| **App-Aktivitäten → Sonstige von Nutzern erstellte Inhalte** (Other user-generated content) | Feedback-Text + Stimmung (#2); Kalender-Datei mit neutralen Titeln (#4) | Ja | **Optional** | App-Funktionalität, Analysen |
| **Geräte- oder andere IDs** (Device or other IDs) | zufällige Community-Geräte-ID (#3), Kalender-Token (#4), **anonyme RevenueCat-ID** (#5) | Ja | **Erforderlich** – die RevenueCat-ID entsteht bei jedem Start der Store-App, sobald Bezahlen aktiv ist | **nur** App-Funktionalität (die zufälligen IDs dienen Löschen, Kalender und Käufen – gleich wie Apple 2.2 und `PrivacyInfo.xcprivacy`) |
| **Finanzinformationen → Kaufverlauf** (Financial info → Purchase history) | Kaufstatus/Belege über Google Play Billing → RevenueCat (#5) | Ja | **Optional** (nur wer kauft oder wiederherstellt) | App-Funktionalität, Analysen |

**Nicht erhoben** (nichts ankreuzen): Standort · Personenbezogene Angaben (Name, E-Mail, Adresse, Telefon …) ·
Finanzinfos außer Kaufverlauf (keine Zahlungsdaten – die bleiben bei Google) · Fitnessinformationen · Nachrichten ·
Fotos/Videos · Audio · Dateien und Dokumente · Kalender (wir lesen keinen Kalender des Nutzers) · Kontakte ·
Web-Browserverlauf · App-Informationen und Leistung (keine Absturzberichte, keine Diagnose-SDKs) ·
App-Aktivität „Suchverlauf in der App“, „Installierte Apps“, „Sonstige Aktionen“.

> Hinweis zur Gesundheit: Check-ins, Bewertungen, Nebenwirkungen und Notizen bleiben **auf dem Gerät** → nicht
> „erhoben“ im Sinne von Google. Nur das freiwillige Community-Ergebnis verlässt das Gerät.
> Hinweis zur Statistik: Sie ist **standardmäßig an** und abschaltbar. „Optional“ ist korrekt, weil Nutzer sie
> abschalten können. **Klären (Fachperson, `legal/FACHPERSON.md` A1):** ob die Statistik auf „aus bis zur Zustimmung“
> umgestellt werden muss – dann hier „Optional“ lassen, Datenschutz §5 anpassen, Logik baut das Opt-in.

### 1.8 Gesundheits-Apps (Health apps declaration)

Pfad: **App-Inhalte → Gesundheits-Apps**. Pflicht für jede App auf Google Play, auch im geschlossenen Test.

| Frage | Antwort |
|---|---|
| Gesundheitsfunktionen (Health features) – Häkchen | **Gesundheit und Fitness → „Stressbewältigung, Entspannung, geistige Leistungsfähigkeit“** (Stress management, relaxation, mental acuity) **und „Schlafmanagement“** (Sleep management) |
| Nicht ankreuzen | Aktivität und Fitness · Ernährung und Gewichtsmanagement · Periodentracking · Krankheiten und Erkrankungen · **alle Punkte unter „Medizin“** (klinische Entscheidungsunterstützung, Medizinprodukt-Apps, Medikations-Management usw.) · Forschung mit Menschen |
| Ist die App ein reguliertes Medizinprodukt? (falls gefragt) | **Nein** |
| Health Connect | **nicht genutzt** (Version 1.0) |

**Begründung:** Die App ist ein Tagebuch für Selbstbeobachtung: Nutzer bewerten abends Schlaf, Energie, Ruhe und
Fokus und vergleichen Testphasen mit ihrem eigenen Normal. Sie stellt keine Diagnosen, behandelt nichts und empfiehlt
keine Medikation. **Klären:** Falls die Konsole eine passendere Option wie „Sonstiges/Wellness-Tagebuch“ anbietet,
die nehmen; „Krankheiten“ oder „Medikations-Management“ **nicht** wählen – das stimmt nicht und zieht strengere Prüfung nach sich.

**Pflicht im Store-Text** (Google „Health Content and Services“): Nicht-Medizinprodukt-Apps brauchen in der
Beschreibung den Hinweis, dass die App **kein Medizinprodukt ist und keine Erkrankung diagnostiziert, behandelt,
heilt oder verhindert**, plus den Rat, für medizinische Fragen Fachpersonal zu fragen. → in `listing.md`
(Abschnitt „WICHTIG“ / „IMPORTANT“) seit 2. Okt 2026 so formuliert.

**Freitext, falls ein Begründungsfeld kommt (EN, max. ~500 Zeichen):**

```
Kolbi is a journaling and self-experiment tool for adults who already take dietary supplements. Users rate
sleep, energy, calm and focus once a day and compare test phases with their own baseline. The app is not a
medical device and does not diagnose, treat, cure or prevent any condition. It does not recommend substances
or personal doses. All entries stay on the device; an anonymous community result is shared only with consent.
```

### 1.9 Store-Einstellungen: Kategorie, Tags, Kontakt

Pfad: **Wachstum → Store-Präsenz → Store-Einstellungen** (Store settings).

| Feld | Eingabe |
|---|---|
| App oder Spiel | **App** |
| Kategorie | **Gesundheit & Fitness** (Health & Fitness) |
| Tags (bis zu 5, nur aus Googles Liste) | **Klären:** in der Liste nach passenden Begriffen suchen – Kandidaten in dieser Reihenfolge: Gesundheits-/Wellness-Tracker, Gewohnheits-Tracker (Habit tracker), Tagebuch/Journal, Schlaf, Erinnerungen. Nur nehmen, was wirklich zur App passt; keine Begriffe wie „Ernährung“, „Abnehmen“, „Medizin“. |
| E-Mail-Adresse (Pflicht, öffentlich) | **Klären:** Support-E-Mail des Inhabers (STORE.md Frage 4) |
| Telefonnummer | **Klären:** optional – als Händler (EU-DSA) zeigt Google Kontaktdaten aber ohnehin öffentlich (Konto-Ebene) |
| Website | `https://kolbi-smoky.vercel.app` (bis eine eigene Domain kommt) |
| Externes Marketing (Anzeigen außerhalb von Play) | Standard lassen |

**Händlerstatus (Trader, EU-DSA)** steht in der Play Console auf **Konto-Ebene** (Einstellungen → Entwicklerkonto):
Kolbi verkauft In-App-Käufe → **„Ich bin Händler“**. Adresse/Telefon/E-Mail werden öffentlich angezeigt → STORE.md Frage 3.

### 1.10 Store-Eintrag, Grafiken, Preis

- Texte DE/EN: [`listing.md`](./listing.md) (App-Name, Kurzbeschreibung 80, Beschreibung). Englisch über
  *Übersetzungen verwalten → Englisch (USA)*.
- Feature-Grafik `store/feature-graphic.png` (1024 × 500), Screenshots `screenshots-de/`, `screenshots-en/`
  (alle mit „Beispiel-Daten“-Kennzeichnung).
- Preis: **Kostenlos** (mit In-App-Käufen). Produkte → `subscriptions.md` Teil B.
- Geschlossener Test → Feld **Feedback-URL oder E-Mail** (Feedback channel): Support-E-Mail (Klären) → siehe `TESTERS.md`.

---

## 2 · Apple App Store Connect

### 2.1 App-Informationen (App Information)

**Kategorie** – Empfehlung: **Primär „Gesundheit & Fitness“ (Health & Fitness), sekundär „Lifestyle“.**

| | Gesundheit & Fitness (primär) | Lifestyle (primär) |
|---|---|---|
| Wo suchen unsere Nutzer? | Hier: Supplement-, Schlaf-, Habit-Tracker | eher Mode, Wohnen, Hobbys |
| Ranking-Chance | größere Konkurrenz, aber passende Suchanfragen | weniger passend, wirkt beliebig |
| Pflichten | **Medizinprodukt-Status** angeben (seit März 2026 für neue Apps in dieser Kategorie, gilt für EWR/UK/USA) → „Nein“, 1 Minute | keine zusätzliche |
| Prüfstrenge | Apple prüft Gesundheits-**Inhalte** (1.4.1) unabhängig von der Kategorie | gleich – die Kategorie schützt nicht |

Begründung: Die Kategorie entscheidet über Auffindbarkeit, nicht über die Prüfstrenge. Lifestyle als Primärkategorie
würde uns nur die Medizinprodukt-Erklärung sparen und Nutzer kosten. Lifestyle bleibt als Zweitkategorie.

**Reguliertes Medizinprodukt (Regulated Medical Device status)** – erscheint bei Gesundheit & Fitness:

| Frage | Antwort |
|---|---|
| Ist die App in der EU (EWR), im Vereinigten Königreich oder in den USA ein reguliertes Medizinprodukt? | **Nein** – für alle drei Regionen |

Begründung: keine medizinische Zweckbestimmung (keine Diagnose, Überwachung oder Behandlung von Krankheiten);
reines Selbstbeobachtungs-Tagebuch. **Klären (Rechtsprüfung):** Die Fachperson, die die Rechtstexte prüft, soll diese
Einstufung kurz bestätigen (Stichwort MDR, „Software als Medizinprodukt“).

**Inhaltsrechte (Content Rights)**

| Frage | Antwort |
|---|---|
| Enthält, zeigt oder nutzt deine App Inhalte Dritter? (Does your app contain, show, or access third-party content?) | **Ja** |
| Besitzt du die nötigen Rechte daran? | **Ja** |

Begründung: Bibliothekstexte, Kolbi-Grafiken und Texte sind selbst erstellt; Schrift Nunito steht unter der SIL Open Font
License; die Community-Zahlen stammen von Nutzern (mit Einwilligung, nur zusammengefasst). „Ja/Ja“ ist hier die
vorsichtigere, ehrliche Antwort und hat keine Nachteile.

**Altersfreigabe (Age Rating)** – neuer Fragebogen (seit 2025, Stufen 4+/9+/13+/16+/18+):

| Abschnitt | Frage | Antwort | Warum |
|---|---|---|---|
| In-App-Steuerung | Kindersicherung (Parental Controls) | **Nein** | – |
| | Altersüberprüfung (Age Assurance) | **Nein** | – |
| Funktionen (Capabilities) | Uneingeschränkter Webzugriff (Unrestricted Web Access) | **Nein** | nur feste Links im System-Browser |
| | Von Nutzern erstellte Inhalte (User-Generated Content) | **Nein** | keine öffentlichen Beiträge; Community nur als anonyme Statistik |
| | Nachrichten und Chat (Messaging and Chat) | **Nein** | – |
| | Werbung (Advertising) | **Nein** | keine Werbung (Klären später: Amazon-Partner-Tag, siehe 1.3) |
| Reife Themen | Vulgärsprache oder derber Humor | **Keine** (None) | – |
| | Horror/Angst | **Keine** | – |
| | **Alkohol, Tabak oder Drogen – Konsum oder Bezüge** | **Selten** (Infrequent) | Tages-Merkmal „Alkohol“, Hinweise „nicht mit Alkohol kombinieren“, Kaffee in Mustern |
| Medizin oder Wellness | **Medizinische oder Behandlungsinformationen** | **Selten** (Infrequent) | übliche Tagesmengen als Orientierung, Kombi-/Timing-Hinweise, „Verschriebene Medikamente“ als Kategorie – **nicht** „häufig“ |
| | **Gesundheits- oder Wellness-Themen** (Health or Wellness Topics) | **Ja** | Kern der App |
| Sexualität/Nacktheit | alle Fragen | **Keine** | – |
| Gewalt | alle Fragen | **Keine** | – |
| Zufallsbasierte Aktivitäten | Simuliertes Glücksspiel, Glücksspiel, Wettbewerbe, Lootboxen | **Keine / Nein** | – |

**Erwartetes Ergebnis: 13+** (wegen „selten“ bei Alkohol-Bezügen und Medizin-Infos). Keine Altersfreigabe-Überschreibung
nötig. `listing.md` ist darauf angepasst (früher „12+“ – die Stufe gibt es seit 2025 nicht mehr).
Hinweis: „häufig“ bei Medizin-Infos würde zusätzlich die Medizinprodukt-Erklärung auslösen – trifft nicht zu.

### 2.2 App-Datenschutz (App Privacy · „Nutrition Label“)

Pfad: **Apps → Kolbi → App-Datenschutz → Los geht's**. Datenschutz-URL: `https://kolbi-smoky.vercel.app/en/privacy`
(deutsche Lokalisierung: `…/datenschutz`). URL für Datenschutz-Auswahl (User Privacy Choices): leer lassen.

**Erhebst du oder deine Drittanbieter Daten aus dieser App?** → **Ja, wir erheben Daten aus dieser App.**

| Apple-Kategorie → Datentyp | Was genau | Mit Identität verknüpft? (Linked) | Tracking? | Zwecke (Purposes) |
|---|---|---|---|---|
| **Gesundheit und Fitness → Gesundheit** (Health) | Community-Ergebnis (#3, nur mit Zustimmung); Kalender-Datei mit Supplement-Namen, falls eingeschaltet (#4) | **Nein** | **Nein** | App-Funktionalität |
| **Nutzerinhalte → Andere Nutzerinhalte** (Other User Content) | Feedback-Text (#2), Kalender-Datei (#4) | **Nein** | **Nein** | App-Funktionalität, Analysen |
| **Kennungen → Geräte-ID** (Device ID) | zufällige Community-ID, Kalender-Token, anonyme RevenueCat-ID – **nicht** IDFA/IDFV | **Nein** | **Nein** | App-Funktionalität |
| **Nutzungsdaten → Produktinteraktion** (Product Interaction) | anonyme Tageszähler (#1), abschaltbar | **Nein** | **Nein** | Analysen |
| **Käufe → Kaufverlauf** (Purchase History) | Kaufstatus über RevenueCat (#5) | **Nein** | **Nein** | App-Funktionalität, Analysen (Mindestangabe laut RevenueCat-Doku) |

**Nicht ankreuzen:** Kontaktinformationen · Standort · Sensible Daten · Kontakte · Finanzinformationen (Zahlungsdaten
bleiben bei Apple) · Browserverlauf · Suchverlauf · Fitness · Diagnose · Fotos/Videos · Audio · Gameplay ·
Kundensupport · Werbedaten · Sonstige Daten · **Nutzer-ID** (RevenueCat läuft mit anonymer ID, keine eigene Nutzer-ID).

**Tracking-Frage:** Nein – keine Verknüpfung mit Daten anderer Firmen, keine Werbung, kein Datenhändler.
**Ergebnis im Store:** „Nicht mit dir verknüpfte Daten“: Gesundheit und Fitness, Nutzerinhalte, Kennungen,
Nutzungsdaten, Käufe · „Daten, die zum Tracking verwendet werden“: keine.

> **Abgleich mit dem Datenschutz-Manifest** (`supplement-lab/native/ios/PrivacyInfo.xcprivacy`): Dort fehlen noch
> *Kaufverlauf* und bei *Andere Nutzerinhalte* der Zweck *Analysen* → Übergabe an Logik (Abschnitt 4).
> RevenueCat bringt ein eigenes Manifest im SDK mit; Apple fasst beide im Datenschutz-Bericht zusammen.

### 2.3 Exportkonformität (Export Compliance)

| Wo | Antwort |
|---|---|
| `Info.plist` | `ITSAppUsesNonExemptEncryption` = **`false`** – steht schon drin (`supplement-lab/ios/App/App/Info.plist`) → Apple fragt bei TestFlight/Einreichung nicht mehr nach |
| Falls doch gefragt: „Verwendet deine App Verschlüsselung?“ | Nur die im Betriebssystem eingebaute Verschlüsselung (HTTPS/TLS) → **„Keiner der oben genannten Algorithmen“** bzw. ausgenommen; keine eigene Kryptografie, keine Dokumente für Frankreich nötig |

### 2.4 Medizinische Hinweise (Guidelines 1.4.1, 5.1.1, 5.1.3)

**Was Apple prüft und wie wir es erfüllen:**

| Richtlinie | Inhalt (kurz) | Kolbi |
|---|---|---|
| **1.4.1** Physische Schäden / medizinische Apps | Keine ungenauen Gesundheits-Messungen oder -Versprechen; Methode offenlegen; an Arzt verweisen | Kein Messgerät, nur eigene subjektive Bewertungen; keine Wirkversprechen ([Health-Claims-Check](../legal/health-claims-check.md)); Hinweis „ersetzt keine ärztliche Beratung“ in Onboarding, App (`LabApp.tsx`) und Beschreibung |
| **5.1.1** Datenerhebung | Datenschutz-Link in App + Store; nur nötige Daten; Einwilligung | Links in den Einstellungen („📄 Rechtliches“); Community nur mit Zustimmung; Statistik abschaltbar |
| **5.1.3** Gesundheitsdaten | Gesundheitsdaten nicht für Werbung/Data-Mining nutzen, nicht an Dritte geben; keine falschen Daten in HealthKit | Keine Werbung, kein Verkauf; HealthKit in 1.0 **nicht** enthalten; Community-Ergebnis pseudonym, nur aggregiert angezeigt |

**Standard-Formulierung (für Beschreibung, Prüfer-Notizen und Rückfragen):**

DE:
```
Kolbi ist ein Tagebuch- und Selbstversuch-Werkzeug, kein Medizinprodukt. Die App stellt keine Diagnosen und
behandelt, heilt oder verhindert keine Erkrankung. Ergebnisse sind deine eigenen, subjektiven Bewertungen.
Kolbi empfiehlt keine Supplements und keine persönlichen Dosierungen. Frag bei gesundheitlichen Fragen
deine Ärztin, deinen Arzt oder deine Apotheke.
```
EN:
```
Kolbi is a journaling and self-experiment tool, not a medical device. It does not diagnose, treat, cure or
prevent any condition. Results are your own subjective ratings. Kolbi does not recommend supplements or
personal doses. For medical questions, please consult a doctor or pharmacist.
```

> *Erledigt (Technik, 2. Okt):* Kauf-Tipps in `lib/labStock.ts` nennen keine Mengen mehr; die Bibliothek zeigt im
> Store nur die „übliche Packungsangabe“ als Vergleich. Prüfung durch die Fachperson: `legal/FACHPERSON.md` B2.

### 2.5 Abos & In-App-Käufe

Alles steht in [`subscriptions.md`](./subscriptions.md) Teil A: Abo-Gruppe **`Kolbi Pro`** (Anzeigename „Lab Pro“),
`kolbi_pro_monthly` (Stufe 2), `kolbi_pro_yearly` (Stufe 1, 7 Tage gratis), `kolbi_pro_lifetime` (Nicht-konsumierbar),
Preise 2,99 € / 19,99 € / 39,99 €, Familienfreigabe aus, Prüfungs-Screenshot + Notiz je Produkt,
**alle drei Produkte an Version 1.0 hängen** (A4). Pflicht-Links in der Beschreibung (A5).

### 2.6 App-Prüfung (App Review Information)

| Feld | Eingabe |
|---|---|
| Anmeldung erforderlich (Sign-in required) | **Nein** – Benutzername/Passwort leer lassen |
| Kontakt | **Klären:** Vorname, Nachname, Telefon, E-Mail des Inhabers (nur für Apple sichtbar) |
| Notizen (Notes, max. 4000) | Text aus [`review-notes.md`](./review-notes.md) Abschnitt 1 |
| Anhang | optional: 30-Sekunden-Bildschirmaufnahme Start → Beispiel-Daten → Lab Pro → Tarife |
| Freigabe der Version | **Manuell** (am 1. Dez selbst veröffentlichen) |

---

## 3 · Schnell-Übersicht: die 5 wichtigsten Antworten

1. **Datensicherheit / App-Datenschutz:** 5 Datentypen, alle **nicht verknüpft, kein Tracking, nicht geteilt**,
   HTTPS: Gesundheit (Community, opt-in) · App-Interaktionen/Produktinteraktion (anonyme Zähler, abschaltbar) ·
   Nutzerinhalte (Feedback, Kalender) · Geräte-IDs (zufällig + RevenueCat, erforderlich) · Kaufverlauf (RevenueCat).
2. **Altersfreigabe:** Google 18+-Zielgruppe; IARC ehrlich mit „Alkohol erwähnt“ + „digitale Käufe“;
   Apple **13+** (Alkohol-Bezüge selten, Medizin-Infos selten, Wellness-Themen ja).
3. **Kategorie:** Gesundheit & Fitness (beide Stores), Apple sekundär Lifestyle; Apple-Medizinprodukt-Status „Nein“.
4. **Gesundheits-Apps (Google):** Schlafmanagement + Stress/Entspannung/geistige Leistungsfähigkeit, kein Medizinprodukt,
   kein Health Connect; Pflicht-Hinweis in der Beschreibung.
5. **Werbung/Zugriff/Export:** keine Werbung · kein Login · `ITSAppUsesNonExemptEncryption = false`.

---

## 4 · Offene Punkte („Klären:“) und Übergaben

**Inhaber/CEO (vor dem ersten Formular):**
- Support-E-Mail (Google-Kontakt, IARC, Apple-Prüfkontakt, Feedback-Kanal im geschlossenen Test).
- Impressum-Daten eintragen → Datenschutz-URL wird erst damit gültig.
- Telefonnummer öffentlich ja/nein (EU-Händlerpflicht, Konto-Ebene).
- Google-Tags aus der Konsolen-Liste auswählen (1.9).
- Offene Rechtsfragen (Statistik-Einwilligung, Medizinprodukt-„Nein“, Claims, Impressum …) gebündelt in
  [`../legal/FACHPERSON.md`](../legal/FACHPERSON.md) – als eine Liste an die Fachperson geben.

**Übergabe an Logik:**
1. **Prüfer finden den Kauf nicht (Apple 2.1, Prüfung Ende Nov.):** Die Pro-Seite mit Tarifen (`PaywallSheet`) öffnet
   heute **nur** über eine gesperrte „🔒 Lab Pro“-Karte (`ProGate`) – und die gibt es nur für Nicht-Pro. Wer vor dem
   1. Dez startet, wird Gründer (`claimFounder`) → keine gesperrte Karte → **kein Weg zu Tarifen, Kauf und
   „Käufe wiederherstellen“**. Die „Lab Pro“-Karte im Kolbi-Tab (`ProCard`) klappt nur die Funktionsliste auf.
   Wunsch: in der Store-App auf der `ProCard` immer einen Knopf „Tarife ansehen“ / “See plans” → `openPaywall()`.
   Danach den Weg in `review-notes.md` bestätigen (dort als ⚠️ markiert).
2. **Datenschutz-Manifest** `native/ios/PrivacyInfo.xcprivacy`: *Purchase History* (App Functionality + Analytics)
   ergänzen; bei *Other User Content* Zweck *Analytics* ergänzen – damit Manifest = Label (2.2).
3. **Info.plist:** `UIRequiredDeviceCapabilities` = `armv7` (Capacitor-Vorlage) – prüfen, ob `arm64` gemeint ist
   (`NSHealthShareUsageDescription` ist laut Technik bereits entfernt).
4. ~~**Kauf-Tipps mit Mengenangaben**~~ *erledigt (Technik, 2. Okt):* Kauf-Tipps ohne Mengen („Achte auf die Dosis auf der
   Packung …“); Bibliotheks-Mengen erscheinen im Store als „übliche Packungsangabe“ und werden nicht mehr als eigene
   Dosis vorbelegt.
5. ~~**App-Version im Feedback**~~ *erledigt (Technik):* Feedback trägt jetzt z. B. `1.0.0-android` / `1.0.0-ios` / `1.0.0-web`.
6. **Paywall-Rechtstext** fehlt noch: Testwochen-Satz, Abrechnungszeitpunkt, Kündigungsweg je Plattform
   (`subscriptions.md` Teil D); Untertitel „nur {p} im Monat“ rechnet mit festem Euro-Preis statt Store-Preis.
7. **STORE.md** (nur melden, Datei gehört nicht Growth):
   - Zeile „Gründer sehen heute keine Tarife und keinen ‚Wiederherstellen‘-Knopf“ ist inzwischen anders, aber das
     eigentliche Problem besteht weiter (Punkt 1).
   - Schritt 4.9 „Altersfreigabe: überall Nein, nur Medizinische Informationen = selten“ → veraltet: zusätzlich
     **Alkohol-Bezüge = selten** und **Gesundheits-/Wellness-Themen = Ja** → Ergebnis 13+ (2.1).
   - Schritt 2.8 und 4.8 verweisen auf `review-notes.md` Abschnitt 2/3 → jetzt **`forms.md`** (dort maßgeblich).
   - Review-Risiko-Tabelle „Apple Health“ und „Google: Gesundheits-Formulare … Health-Connect-Begründung“ gelten
     nicht für 1.0; neu: Apple-Medizinprodukt-Status (Gesundheit & Fitness) als Pflichtfeld.
   - Frage 11 „Wer sind die 12 Google-Tester? (Beta-Nutzer …)“ → Plan steht jetzt in `launch/TESTERS.md`.

**Rechtstexte `legal/`:** *erledigt 2. Okt 2026 (Growth):* Datenschutz neu gegliedert – §2 trennt „ohne Schalter“
(Hosting, RevenueCat) / „standardmäßig an, abschaltbar“ (Statistik) / „nur wenn du es nutzt“; kein Apple Health/Health
Connect in 1.0; Push nur Web-App (Store-App: lokale Benachrichtigungen); neuer Abschnitt Beta-Test (Google Play/TestFlight);
§ 25 TDDDG. Nutzungsbedingungen: Abo-Bedingungen wie `subscriptions.md` Teil D, Beta-Abschnitt. Offene Rechtsfragen →
[`../legal/FACHPERSON.md`](../legal/FACHPERSON.md).
