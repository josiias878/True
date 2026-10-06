# Kolbi · Supplement Lab — Launch-Checkliste App Store & Google Play

**Start: Dienstag, 1. Dezember 2026** (Beta endet am 30. Nov.; wer vorher startet, ist „Gründer“ mit Pro für immer).
Stand dieser Liste: 2. Oktober 2026.

| | |
|---|---|
| Store-Name DE / EN | **Kolbi: Supplement-Check** / **Kolbi: Supplement Lab** (Texte: `marketing/store/listing.md`) |
| Name unter dem Icon | **Kolbi** (`capacitor.config.ts`) |
| Lab Pro | **2,99 €/Monat · 19,99 €/Jahr (7 Tage gratis) · 39,99 € einmalig** |
| Produkt-IDs | `kolbi_pro_monthly`, `kolbi_pro_yearly` (Abo-Gruppe „Kolbi Pro“), `kolbi_pro_lifetime` |
| Bezahlung | RevenueCat, ein Entitlement `pro` (iOS + Android, später Web über Stripe) |
| **App-ID** (iOS Bundle ID = Android Package Name) | **`app.kolbi`** – entschieden am 2. Okt 2026, danach nie mehr änderbar |
| Builds | **GitHub Actions** (kein eigener Mac nötig) → [`native/BUILD.md`](native/BUILD.md) |

Alle Detail-Anleitungen:
- Abos & Preise eintippen → [`marketing/store/subscriptions.md`](marketing/store/subscriptions.md)
- **Alle Store-Formulare** (Datensicherheit, App-Datenschutz, Altersfreigabe, Gesundheits-Apps, Zielgruppe, Kategorie,
  Medizinprodukt-Status) – kopierfertig und **maßgeblich** → [`marketing/store/forms.md`](marketing/store/forms.md)
- Prüfer-Notizen (App Review Information) → [`marketing/store/review-notes.md`](marketing/store/review-notes.md) Abschnitt 1
- 12 Google-Tester (Plan, Texte, Feedback) → [`marketing/launch/TESTERS.md`](marketing/launch/TESTERS.md)
- iOS-Dateien (Datenschutz-Manifest, Info.plist) → [`native/ios/README.md`](native/ios/README.md)
- Builds über GitHub Actions + Secrets (Upload-Schlüssel, App-Store-Connect-API) → [`native/BUILD.md`](native/BUILD.md)

---

## 🗓️ Zeitplan (rückwärts vom 1. Dezember)

| Bis wann | Wer | Was |
|---|---|---|
| **Fr 9. Okt** | Du | Offene Fragen unten beantworten (v. a. Privatperson/Firma, Adresse) – Bundle-ID ✅ `app.kolbi` |
| **Fr 9. Okt** | Du | **Google Play Console** anlegen (Identitätsprüfung dauert ein paar Tage) |
| **Fr 23. Okt** | Claude | Erster Android-Build (noch ohne Bezahlen) in den **geschlossenen Test** |
| **Mo 26. Okt** | Du | **12 Tester** im geschlossenen Test – müssen **14 Tage am Stück** dabeibleiben (Google-Pflicht für neue Privatkonten) |
| **Fr 30. Okt** (empfohlen) · **Di 10. Nov** (spätestens) | Du | **Apple Developer Account** aktiv |
| direkt danach, bis **Fr 13. Nov** | Du | App Store Connect: Verträge, Steuer, Bank, Small Business Program, App + 3 Produkte anlegen; RevenueCat einrichten |
| **Mo 9. Nov** | Du | Google: **Produktionszugriff beantragen** (nach 14 Tagen Test, Prüfung bis zu 7 Tage) |
| **Mo 16. Nov** | Claude | RevenueCat eingebaut, Paywall fertig, erster **TestFlight**-Build + Android-Build mit Bezahlen |
| **Fr 20. Nov** | Du | **TestFlight** auf deinem iPhone: Testkauf (Sandbox), Wiederherstellen, alles durchklicken; Paywall-Screenshots |
| **Di 24. Nov** (spätestens) | Du + Claude | **Bei Apple einreichen** + Google-Produktionsrelease einreichen. Freigabe jeweils auf **manuell** stellen |
| Do 26. Nov | – | US-Feiertag (Thanksgiving) – Apple-Prüfung kann länger dauern → deshalb nicht später einreichen |
| bis Mo 30. Nov | Claude | Puffer: bei Ablehnung korrigieren und neu einreichen |
| **Di 1. Dez, morgens** | Du | In beiden Stores auf **„Veröffentlichen“** tippen 🎉 |

---

## ✅ Erledigt

- [x] Eigenständige App (Vite + React + Capacitor 8), gleicher Code wie die Web-App
- [x] **Store-Modus:** keine Research-Peptide in Bibliothek & Community, eigene Substanzen ohne
      Beschreibung/Dosierung, GLP-1 nur als „Verschriebene Medikamente“, „App empfiehlt keine Substanzen
      oder Dosierungen“, kein Link zu TRUE
- [x] Native lokale Erinnerungen (mit „✓ Genommen“ direkt aus der Benachrichtigung)
- [x] Daten nur lokal, Backup-Export/-Import; optionale Server-Funktionen anonym (Frankfurt)
- [x] App zweisprachig (DE/EN), Store-Texte DE/EN, Screenshots DE/EN, Feature-Grafik (`marketing/store/`)
- [x] Entwürfe Datenschutz, Impressum, Nutzungsbedingungen DE/EN (`marketing/legal/`, Website `marketing/site/`)
- [x] App-Icon & Splash (`assets/`)
- [x] Lab Pro im Code vorbereitet: Pro-Funktionen, Paywall mit „Käufe wiederherstellen“, Produkt-IDs
      (`lib/labGrow.ts`, `lib/labBilling.ts`, `app/lab/grow.tsx`) – zahlt erst, wenn RevenueCat angeschlossen ist
- [x] Name unter dem Icon „Kolbi“ (`capacitor.config.ts`)
- [x] Apple-Datenschutz-Manifest + Info.plist-Anleitung + Dialog-Texte DE/EN (`native/ios/`)
- [x] Prüfer-Notizen (`marketing/store/review-notes.md`) und kopierfertige Formular-Antworten für beide Stores
      (`marketing/store/forms.md`)
- [x] Datenschutz-Manifest = Apple-Label (`forms.md` 2.2): inkl. **Kaufverlauf** (RevenueCat) und Zweck *Analysen*
      bei Nutzerinhalten; `UIRequiredDeviceCapabilities` = `arm64` (2. Okt 2026)
- [x] Kauf-/Dosis-Tipps ohne Mengenangaben, Dosis-Vergleich im Store-Modus nur als „übliche Packungsangabe“
      (passt zu „Kolbi empfiehlt keine persönlichen Dosierungen“, Apple 1.4.1)
- [x] App-Version im Feedback aus dem Build (`1.0.0-ios` / `1.0.0-android` / `1.0.0-web`), Tester-Feedback trennbar
- [x] Abo-Einrichtung Schritt für Schritt inkl. Texte & Zeichenzahlen (`marketing/store/subscriptions.md`)
- [x] Apple Health / Health Connect für 1.0 **nativ ausgeschlossen** (kein HealthKit, keine Health-Connect-Bibliothek;
      `capacitor.config.ts` → `includePlugins`, Workflows prüfen das). Plugin bleibt ungetestet für später (Frage 5)

---

## 👤 Deine Aufgaben (einmalig)

### 1. Entscheidungen (bis 9. Okt)

- [x] **Bundle-ID** festgelegt: **`app.kolbi`** (iOS + Android, 2. Okt 2026, `capacitor.config.ts`).
      Danach **nie mehr änderbar**.
- [ ] **Name im Store frei?** In App Store Connect wird das beim Anlegen geprüft (Schritt 4). Plan B
      bereithalten, z. B. „Kolbi – Supplement-Check“.
- [ ] **Als Privatperson oder Firma?** Privatperson geht schneller (keine D-U-N-S-Nummer), dann steht
      **dein Name** als Anbieter im Store. Firma braucht eine D-U-N-S-Nummer (kostenlos, ~1–2 Wochen).
- [ ] **Adresse, Telefon, E-Mail für den Store:** Weil Kolbi etwas verkauft, bist du „Händler“ (EU-Gesetz
      DSA). Apple und Google zeigen diese Daten **öffentlich** an. Tipp: Geschäftsadresse/Postfach-Service
      statt Wohnadresse.
- [ ] **Rechtstexte final:** Platzhalter in `marketing/legal/*` ausfüllen und prüfen lassen.

### 2. Google Play Console (25 $ einmalig) – sofort

1. **play.google.com/console/signup** → mit deinem Google-Konto anmelden.
2. **Persönliches Konto** (bzw. Organisation) wählen → 25 $ zahlen.
3. Identität bestätigen (Ausweis-Foto), Telefonnummer + E-Mail bestätigen, ggf. Play-Console-App auf
   einem Android-Handy installieren (Geräteprüfung).
4. **Einstellungen → Zahlungsprofil**: Händlerkonto anlegen (IBAN), sonst keine Käufe möglich.
5. **App erstellen**: Name „Kolbi: Supplement-Check“, Standardsprache Deutsch, App, Kostenlos (mit In-App-Käufen).
6. **Test → Geschlossener Test → Tester**: E-Mail-Liste mit **mind. 12 Personen** anlegen (woher sie kommen:
   [`marketing/launch/TESTERS.md`](marketing/launch/TESTERS.md)).
   Sobald Claude den Build hochgeladen hat, den **Beitritts-Link** an die Tester schicken. Alle müssen
   **14 Tage am Stück** angemeldet bleiben.
7. Danach: **Dashboard → Zugriff auf Produktion beantragen** (ein paar Fragen zum Test beantworten).
8. **Richtlinien → App-Inhalte**: alle Formulare ausfüllen – Antworten in [`forms.md`](marketing/store/forms.md)
   **Abschnitt 1** (Datenschutz-URL, App-Zugriff, Werbung, Altersfreigabe/IARC, Zielgruppe 18+, Datensicherheit,
   Gesundheits-Apps, Store-Einstellungen).
9. Abos + Lifetime anlegen → `subscriptions.md` Teil B (geht erst, wenn ein Build mit Bezahlen oben ist).
10. **Upload-Schlüssel** für die Builds erzeugen und als GitHub-Secrets eintragen → [`native/BUILD.md`](native/BUILD.md) Teil A.

### 3. Apple Developer Program (99 €/Jahr) – spätestens 10. Nov

1. Auf dem iPhone die App **„Apple Developer“** laden → *Account* → **Jetzt registrieren** (Enroll).
   (Alternativ: **developer.apple.com/programs/enroll**.) Deine Apple-ID braucht Zwei-Faktor-Anmeldung.
2. Als **Einzelperson** (oder Organisation mit D-U-N-S) → Ausweis scannen → 99 € zahlen.
3. Warten auf die Bestätigungs-Mail (meist 1–2 Tage, manchmal länger – deshalb lieber schon Ende Oktober).
4. **Small Business Program** (15 % statt 30 % Gebühr): **developer.apple.com/app-store/small-business-program**
   → *Enroll* (erst möglich, wenn der „Paid Apps“-Vertrag aus Schritt 4 angenommen ist).

### 4. App Store Connect – direkt nach der Freischaltung

1. **appstoreconnect.apple.com → Geschäftlich (Business)** → Vertrag **„Paid Apps“** annehmen.
2. Dort **Steuerformulare**: US-Formular **W-8BEN** (Privatperson) – Deutschland als Wohnsitz,
   deine Steuer-ID eintragen, Doppelbesteuerungsabkommen anhaken → 0 % US-Quellensteuer.
3. **Bankkonto** (IBAN) hinzufügen. Erst wenn Vertrag, Steuer und Bank **„Aktiv“** zeigen, funktionieren
   Testkäufe.
4. **DSA-Händlerstatus** (Geschäftlich → Digital Services Act): „Ich bin Händler“ + Adresse/Telefon/E-Mail.
5. **Apps → (+) Neue App**: Plattform iOS · Name „Kolbi: Supplement Lab“ · Primärsprache **Englisch (USA)** ·
   Bundle-ID **`app.kolbi`** (wird beim ersten GitHub-Actions-Build automatisch registriert; sonst unter
   developer.apple.com → *Identifiers* selbst anlegen) · SKU `kolbi-ios`.
6. **Lokalisierung Deutsch** hinzufügen → Name „Kolbi: Supplement-Check“, Texte aus `listing.md`.
7. **Abo-Gruppe „Kolbi Pro“ + 2 Abos + Lifetime** → exakt nach `subscriptions.md` Teil A
   (Referenznamen, IDs, Preise 2,99 / 19,99 / 39,99 €, US $2.99 / $19.99 / $39.99, 7 Tage gratis beim Jahresabo,
   Prüfungs-Screenshot je Produkt = Paywall mit ausgewähltem Tarif aus TestFlight, Prüfungs-Notizen).
8. **App-Datenschutz** ausfüllen → [`forms.md`](marketing/store/forms.md) **Abschnitt 2.2** (5 Datentypen inkl.
   Kaufverlauf, nichts verknüpft, kein Tracking). Datenschutz-URL + Support-URL eintragen.
9. **App-Informationen** → [`forms.md`](marketing/store/forms.md) **Abschnitt 2.1**: Kategorie, **Medizinprodukt-Status
   „Nein“** (Pflicht bei Gesundheit & Fitness), Inhaltsrechte und **Altersfreigabe-Fragebogen** (Alkohol-Bezüge
   = selten, Medizinische Informationen = selten, Gesundheits-/Wellness-Themen = Ja → erwartet **13+**).
10. **Nutzer und Zugriff → Integrationen → In-App-Kauf** → Schlüssel erzeugen → `.p8`-Datei laden
    (nur einmal möglich, sicher aufheben) – kommt in RevenueCat (Schritt 5).
11. **Nutzer und Zugriff → Integrationen → App Store Connect API** → Team-Schlüssel für die automatischen
    Builds anlegen und als GitHub-Secrets eintragen → [`native/BUILD.md`](native/BUILD.md) Teil B.
    (Das ist ein **anderer** Schlüssel als der In-App-Kauf-Schlüssel aus Schritt 10.)

### 5. RevenueCat (kostenlos bis 2.500 $ Umsatz/Monat)

1. **app.revenuecat.com** → Konto anlegen → Projekt **„Kolbi“**.
2. **+ App → App Store**: Bundle-ID `app.kolbi`, die `.p8`-Datei aus Schritt 4.10 + *Key ID* + *Issuer ID* hochladen.
   RevenueCat zeigt eine **Server-Notification-URL** → in App Store Connect unter *App → App-Informationen →
   App Store-Server-Benachrichtigungen* (Produktion **und** Sandbox) einfügen.
3. **+ App → Play Store**: Package-Name `app.kolbi` + Dienstkonto-Datei (JSON). Das ist fummelig – Claude führt dich
   Klick für Klick durch.
4. Entitlement `pro`, Produkte, Offering `default` → `subscriptions.md` Teil C.
5. **An Claude geben – nur diese zwei Schlüssel** (*Project settings → API keys*):
   - Apple: **Public SDK key** (beginnt mit `appl_`)
   - Google: **Public SDK key** (beginnt mit `goog_`)

   🔒 **Nicht** in den Chat: `.p8`-Datei, Dienstkonto-JSON, „Secret API keys“ (`sk_…`), Passwörter.
   Die lädst du nur direkt bei RevenueCat hoch.

### 6. Steuern (kurz mit Steuerberater klären)

- Gewerbe anmelden, falls noch nicht geschehen.
- Umsatzsteuer: Apple/Google verkaufen an die Kunden und führen die Mehrwertsteuer ab; du bekommst eine
  Auszahlung. Klären: Reverse-Charge auf die Store-Provision, Kleinunternehmerregelung ja/nein.

---

## 🤖 Claudes Aufgaben (sobald die Konten da sind)

- [x] Bundle-ID `app.kolbi` gesetzt, `npx cap add ios` / `android`, Dateien aus `native/ios/` eingebaut, Icons/Splash
- [x] Build-Workflows GitHub Actions: `kolbi-android.yml` (AAB) und `kolbi-ios.yml` (Simulator-Prüfung + TestFlight) → `native/BUILD.md`
- [ ] `@revenuecat/purchases-capacitor` einbauen, Adapter `src/billing.ts` → `setBillingProvider(...)`
- [ ] **Paywall für Prüfer:** Der Apple-Prüfer (Ende Nov.) wird Gründer und sieht keine gesperrte Pro-Karte → braucht
      in der Store-App immer einen Weg zu Tarifen, Kauf und „Käufe wiederherstellen“ (`forms.md` Abschnitt 4,
      Übergabe 1); danach den Weg in `review-notes.md` bestätigen
- [ ] Paywall: Testwochen-Satz + vollständiger Rechtstext (`subscriptions.md` Teil D); **alle** Preise in der
      Store-App aus dem Store, nicht fest „€“ (z. B. auch auf der Pro-Karte im Kolbi-Tab)
- [ ] Links **Datenschutz · Nutzungsbedingungen · Impressum** in die Einstellungen (Apple-Pflicht)
- [x] Bewertungs-Plugin `@capacitor-community/in-app-review` eingebaut (`src/native.ts` → `lib/labGrow.ts` nativeReview)
- [ ] Rechtstexte anpassen: Nutzungsbedingungen „Käufe“ (steht noch „einmaliger Kauf ohne Abo“) und
      Datenschutz Abschnitt 11 (RevenueCat als Dienstleister nennen)
- [ ] Android: Upload-Schlüssel erzeugen (**du**, Befehl in `native/BUILD.md`; Backup bei dir!), AAB per GitHub Actions bauen, in den geschlossenen Test laden
- [ ] iOS: Build + Upload zu **TestFlight** automatisch über GitHub Actions (dafür legst du einen
      *App Store Connect API Key* an → `native/BUILD.md`)
- [ ] Datenschutz-Bericht in Xcode prüfen, Paywall-Screenshots für die Produkt-Prüfung
- [ ] Beim Einreichen helfen (Metadaten, Notizen, Produkte an Version 1.0 hängen)

---

## ⚠️ Review-Risiken & Maßnahmen

| Risiko | Maßnahme |
|---|---|
| **Apple 1.4.1 / Google „Unapproved substances“** (Peptide) | Store-Modus: keine Peptide in Bibliothek, Demo-Daten und Community; eigene Substanzen nur neutral, ohne Dosierung/Bezugsquelle |
| **Apple 1.4.1 – Dosis-Empfehlungen** | Tipps ohne Mengen („Achte auf die Dosis auf der Packung …“); Bibliotheks-Mengen nur als „übliche Packungsangabe“, nicht als „deine Dosis“ vorbelegt; kein „X Kapseln würden reichen“ |
| **Health-Claims** (Apple 1.4.1 / 2.3.1, Google „Health misinformation“) | Texte nur über die App (testen, vergleichen, erinnern, sparen), nie „Supplement X wirkt“; [Health-Claims-Check](marketing/legal/health-claims-check.md); Hinweis „kein Medizinprodukt“ im Onboarding, in der App und in der Beschreibung |
| **Datenschutz-Angaben passen nicht** (Apple 5.1.1/5.1.2, Google Datensicherheit) | Manifest (`ios/App/App/PrivacyInfo.xcprivacy`), Apple-Label und Google-Formular nach [`forms.md`](marketing/store/forms.md) Abschnitt 0/1.7/2.2: nichts verknüpft, kein Tracking; Community nur mit Zustimmung; Statistik abschaltbar; Datenschutz-Link in der App (Claude-Aufgabe) |
| **Apple Health** (2.5.1, 5.1.3) | **Nicht in 1.0** (kein HealthKit im Binary). Erst relevant, wenn Health später kommt: dann in Beschreibung und App sichtbar nennen |
| **Apple: Medizinprodukt-Status** (Gesundheit & Fitness) | Pflichtfeld für neue Apps dieser Kategorie (EWR/UK/USA) → „Nein“ ([`forms.md`](marketing/store/forms.md) 2.1), Einstufung von der Fachperson bestätigen lassen |
| **Abo / In-App-Kauf** (3.1.1, 3.1.2) | Nur Apple/Google-Kauf in der App, kein Hinweis auf Web-Preise/Stripe; Preise aus dem Store; Rechtstext + Links + „Käufe wiederherstellen“; kostenloser Kern bleibt nutzbar |
| **Prüfer findet die Käufe nicht** (2.1) | Paywall muss für Prüfer sichtbar sein (siehe Claude-Aufgaben); Weg in den Prüfer-Notizen beschrieben |
| **„Nur eine Website in einer Hülle“** (4.2) | Native Erinnerungen mit Aktionen, Offline, Bewertungsdialog, Haptik; kein Login, kein Link zur Website nötig |
| **Google: neue Privatkonten** | 12 Tester × 14 Tage geschlossener Test, dann Produktionszugriff beantragen → früh starten |
| **Google: Gesundheits-Formulare** | „Health apps“-Erklärung ([`forms.md`](marketing/store/forms.md) 1.8) + Pflicht-Hinweis „kein Medizinprodukt“ in der Beschreibung; **Health Connect nicht in 1.0** (keine Begründung nötig) |
| **Gründer-Versprechen** | Gründer-Status ist lokal gespeichert – Web-Nutzer, die in die Store-App wechseln, brauchen einen Weg, ihn mitzunehmen (siehe Frage 7) |

---

## 💶 Preisrechnung (Deutschland, mit Small Business Program 15 %)

| Plan | Preis | ohne 19 % USt | nach 15 % Gebühr = bei dir |
|---|---|---|---|
| Monatlich | 2,99 € | 2,51 € | **≈ 2,14 € / Monat** |
| Jährlich | 19,99 € | 16,80 € | **≈ 14,28 € / Jahr** (≈ 1,19 €/Monat) |
| Für immer | 39,99 € | 33,61 € | **≈ 28,57 € einmalig** |

Ohne Small Business Program wären es 30 % Gebühr (z. B. Jahresabo nur ≈ 11,76 €). RevenueCat ist bis
2.500 $ Monatsumsatz kostenlos, danach ca. 1 % (aktuelle Preise auf revenuecat.com prüfen).

---

## ❓ Offene Fragen an dich

1. ~~**Bundle-ID**~~ ✅ entschieden: `app.kolbi` (iOS und Android).
2. **Konto als Privatperson oder Firma?** Welcher Name soll als Anbieter im Store stehen?
3. **Welche Adresse/Telefonnummer** darf öffentlich im Store stehen (EU-Händlerpflicht)?
4. **Domain & Support:** Bleibt es bei `kolbi-smoky.vercel.app` oder kommt eine eigene Domain? Welche
   **Support-E-Mail**? (Apple verlangt eine Support-URL mit Kontaktmöglichkeit.)
5. ~~**Apple Health / Health Connect in Version 1?**~~ ✅ entschieden: **nicht in 1.0** (nativ ausgeschlossen,
   siehe Erledigt); später nachreichen.
6. **Primärsprache bei Apple:** Englisch (USA) empfohlen (Länder ohne Deutsch sehen dann Englisch). Okay?
7. **Gründer aus der Web-App:** Sollen sie ihren Gründer-Status in die Store-App mitnehmen können
   (z. B. per Backup-Import oder Code)? Sonst sehen sie dort ab 1. Dez. die Paywall.
8. **Name „Lab Pro“ vs. „Kolbi Pro“:** In der App heißt es „Lab Pro“, die Abo-Gruppe „Kolbi Pro“.
   Vorschlag: für Nutzer überall „Lab Pro“ (so stehen die Produktnamen in `subscriptions.md`).
9. **7 Tage gratis** beim Jahresabo okay?
10. ~~**iOS-Build**~~ ✅ entschieden: automatisch in der Cloud (GitHub Actions, `native/BUILD.md`).
11. **Wer sind die 12 Google-Tester?** Plan, Wege und Texte stehen in
    [`marketing/launch/TESTERS.md`](marketing/launch/TESTERS.md) – dort freigeben, wer angesprochen wird.

---

## 🔌 Bezahlen anschließen (Code ist fertig: `src/billing.ts`)

Sobald RevenueCat eingerichtet ist, trägt Claude die **öffentlichen** Schlüssel als Build-Variablen ein – sonst nichts:

| Variable | Wert | Wo |
|---|---|---|
| `VITE_RC_IOS_KEY` | `appl_…` | iOS-Build |
| `VITE_RC_ANDROID_KEY` | `goog_…` | Android-Build |
| `VITE_RC_WEB_KEY` | `rcb_…` (optional, Web über Stripe) – **erst setzen, wenn** Datenschutz §10 und die Nutzungsbedingungen Web-Käufe (RevenueCat Web Billing/Stripe, Zahlungsdaten, Widerruf/Kündigung im Web) beschreiben | Vercel → Projekt supplement-lab → Environment Variables |

RevenueCat-Offering „default“ mit den Paketen `$rc_monthly`, `$rc_annual`, `$rc_lifetime` (→ Produkte `kolbi_pro_monthly`,
`kolbi_pro_yearly`, `kolbi_pro_lifetime`), Entitlement `pro`. Ohne Schlüssel bleibt alles gratis.

- **Pflicht für Store-Builds:** Der signierte Android-Build (Upload-Schlüssel gesetzt) und der TestFlight-Job brechen ab,
  wenn `VITE_RC_ANDROID_KEY` bzw. `VITE_RC_IOS_KEY` leer ist. Unsignierte Prüf-Builds und der Simulator-Build laufen ohne.
- **Web-Schlüssel noch nicht setzen:** Solange Datenschutz (§10) und Bedingungen nur App-Store-/Google-Play-Käufe
  beschreiben, bleibt `VITE_RC_WEB_KEY` leer – die Web-Version bleibt dann gratis, ohne Kaufseite.
- **Gratis-Woche:** Die App zeigt „7 Tage gratis“ nur, wenn der Store sie für diesen Nutzer bestätigt
  (iOS: Einführungsangebot 0 € + Berechtigung; Android: Gratis-Phase im Standard-Angebot). Ohne eingerichtete
  Testphase im Store erscheint kein Gratis-Text.
