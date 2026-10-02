# iOS-Dateien für den App Store

**Stand 2. Okt 2026: eingebaut.** Das Xcode-Projekt `ios/` existiert (Capacitor 8, Swift Package Manager –
kein CocoaPods), Bundle-ID **`app.kolbi`**. Die Dateien unten liegen jetzt im App-Target unter
`ios/App/App/` (Datenschutz-Manifest, `de.lproj`/`en.lproj`, Info.plist-Einträge) und werden über
GitHub Actions gebaut → [`../BUILD.md`](../BUILD.md). **Ab jetzt nur noch dort ändern**; die Kopien hier
sind die Vorlage/Referenz.

| Datei | Wofür | Im Projekt |
|---|---|---|
| `PrivacyInfo.xcprivacy` | Apples „Datenschutz-Manifest“: welche Daten die App erhebt, kein Tracking | `ios/App/App/PrivacyInfo.xcprivacy` ✅ |
| `de.lproj/InfoPlist.strings` | Deutsche Texte für System-Dialoge (z. B. Apple-Health-Abfrage) | `ios/App/App/de.lproj/` ✅ |
| `en.lproj/InfoPlist.strings` | Englische Texte für System-Dialoge | `ios/App/App/en.lproj/` ✅ |

Bereits gesetzt in `ios/App/App/Info.plist`: `CFBundleDisplayName` = Kolbi, `CFBundleDevelopmentRegion` = en,
`CFBundleLocalizations` (de, en), `ITSAppUsesNonExemptEncryption` = false. Version 1.0.0,
Build-Nummer setzt GitHub Actions. Nur iPhone (`TARGETED_DEVICE_FAMILY = 1` → keine iPad-Screenshots nötig).

**Store-Version 1.0 ohne Apple Health:** Das Health-Plugin wird nicht ins iOS-Projekt eingebunden
(`capacitor.config.ts` → `includePlugins`) → kein HealthKit im Binary, darum auch **kein**
`NSHealthShareUsageDescription` in `ios/App/App` (die Health-Zeilen in den Vorlagen hier bleiben für später).
Health einschalten: `packages/capacitor-supp-health/README.md` (HealthKit-Capability + `App.entitlements`,
Info.plist-Text, Strings aus diesen Vorlagen zurück nach `ios/App/App/*.lproj/`).

Die Abschnitte unten beschreiben die Handgriffe in Xcode, falls das Projekt einmal neu erzeugt werden muss.

---|---|
| `PrivacyInfo.xcprivacy` | Apples „Datenschutz-Manifest“: welche Daten die App erhebt, kein Tracking |
| `de.lproj/InfoPlist.strings` | Deutsche Texte für System-Dialoge (z. B. Apple-Health-Abfrage) |
| `en.lproj/InfoPlist.strings` | Englische Texte für System-Dialoge |

---

## 1. Datenschutz-Manifest einfügen (Pflicht)

1. Im Terminal: `npx cap open ios` → Xcode öffnet sich.
2. Links im Datei-Baum: **App** → Ordner **App** aufklappen (dort liegen `AppDelegate.swift`, `Info.plist`).
3. Im Finder `supplement-lab/native/ios/PrivacyInfo.xcprivacy` öffnen und die Datei **auf diesen Ordner
   App ziehen**.
4. Im Dialog anhaken: **„Copy items if needed“** und bei **„Add to targets“** → **App**. → *Finish*.
5. Prüfen: Datei anklicken → rechts (Datei-Inspektor) unter *Target Membership* ist **App** angehakt.

Ergebnis: `ios/App/App/PrivacyInfo.xcprivacy`.

**Was drinsteht** (passt zur Datenschutz-Tabelle in `marketing/store/listing.md` und zu
`marketing/store/review-notes.md`):

- `NSPrivacyTracking = false`, keine Tracking-Domains.
- Erhobene Daten – alle **nicht mit der Person verknüpft**, **kein Tracking**:
  - *Produktinteraktion* → anonyme Tageszähler („erster Check-in“ …), Zweck **Analyse** (abschaltbar).
  - *Gesundheit* → nur das anonyme Community-Ergebnis (nur mit Zustimmung), Zweck **App-Funktion**.
  - *Sonstige Nutzerinhalte* → freiwilliges Feedback + Kalender-Abo-Datei, Zweck **App-Funktion**.
  - *Geräte-ID* → zufällige Kennung (Community-Beiträge ersetzen/löschen, Kalender-Link), Zweck **App-Funktion**.
- Benutzte „Required Reason“-Schnittstelle: `UserDefaults` mit Grund `CA92.1` (Capacitor und die
  Benachrichtigungen speichern darüber App-eigene Einstellungen).

**Nach dem ersten Archiv-Build einmal prüfen:** Xcode → *Product → Archive* → im Organizer Rechtsklick
auf das Archiv → **Generate Privacy Report**. Wenn dort eine weitere Schnittstelle ohne Grund auftaucht
(z. B. *File Timestamp* oder *Disk Space*), Claude Bescheid geben – dann wird sie ergänzt.
RevenueCat bringt später sein eigenes Manifest mit (Kaufhistorie) – das fügt Xcode automatisch hinzu.

---

## 2. Einträge in der Info.plist

In Xcode: **App** → **App** → `Info.plist` anklicken → Rechtsklick → *Open As → Source Code*.
Vor dem letzten `</dict>` einfügen:

```xml
<!-- Name unter dem Icon -->
<key>CFBundleDisplayName</key>
<string>Kolbi</string>

<!-- App ist zweisprachig: Deutsch + Englisch -->
<key>CFBundleDevelopmentRegion</key>
<string>en</string>
<key>CFBundleLocalizations</key>
<array>
    <string>de</string>
    <string>en</string>
</array>

<!-- Exportkontrolle: nur normale HTTPS-Verschlüsselung des Systems → spart die Frage bei jedem Upload -->
<key>ITSAppUsesNonExemptEncryption</key>
<false/>

<!-- NUR wenn das Apple-Health-Plugin aktiv ist (siehe unten) -->
<key>NSHealthShareUsageDescription</key>
<string>Kolbi only reads your sleep duration and HRV from Apple Health to show them next to your check-ins. The data stays on your device and is never uploaded.</string>
```

> `CFBundleDevelopmentRegion` = `en`, damit Nutzer mit z. B. französischem iPhone Englisch sehen statt
> Deutsch. Falls `CFBundleDisplayName` oder `CFBundleDevelopmentRegion` schon in der Datei steht:
> den vorhandenen Wert ändern, nicht doppelt einfügen.

**Apple Health:** Der Eintrag `NSHealthShareUsageDescription` ist **nur** nötig, wenn das Plugin
`capacitor-supp-health` eingebaut ist **und** die Capability *HealthKit* aktiviert wurde
(*Signing & Capabilities → + Capability → HealthKit*). Ohne diesen Text stürzt die App beim
Health-Dialog ab – mit HealthKit, aber ohne Text, lehnt Apple die App ab. Wenn wir Apple Health für
Version 1 weglassen: nur die Capability weglassen – den Text behalten, solange das Plugin eingebunden ist (s. u.). Einen `NSHealthUpdateUsageDescription`-Text
brauchen wir nicht – die App liest nur, sie schreibt nichts in Apple Health.

Benachrichtigungen (lokale Erinnerungen) brauchen **keinen** Info.plist-Eintrag.

---

## 3. Übersetzte Dialog-Texte (InfoPlist.strings)

Damit der Apple-Health-Dialog auf Deutsch **und** Englisch erscheint:

1. Im Finder die beiden Ordner `native/ios/de.lproj` und `native/ios/en.lproj` gleichzeitig markieren.
2. In Xcode auf den Ordner **App → App** ziehen → **„Copy items if needed“** + Target **App** anhaken
   → *Finish*.
3. Xcode zeigt danach `InfoPlist.strings` mit den Sprachen *German* und *English*.
4. Falls Xcode fragt, ob Deutsch als Sprache hinzugefügt werden soll: **Ja**. (Alternativ:
   Projekt **App** anklicken → Tab *Info* → *Localizations* → **+** → *German*.)

Ergebnis: `ios/App/App/de.lproj/InfoPlist.strings` und `ios/App/App/en.lproj/InfoPlist.strings`.

Den Text `NSHealthShareUsageDescription` **drinlassen**, solange das Plugin `capacitor-supp-health` im
Projekt ist – Apple prüft beim Upload, ob Code HealthKit nutzt, und lehnt Builds ohne Zweck-Text ab
(ITMS-90683). Erst wenn das Plugin ganz entfernt wird, darf auch der Text weg.

---

## 4. Kurz-Check vor dem Upload

- [x] `PrivacyInfo.xcprivacy` im Target **App**
- [x] Info.plist: `CFBundleDisplayName`, `CFBundleLocalizations`, `ITSAppUsesNonExemptEncryption`
- [ ] Health an? → Capability *HealthKit* + `NSHealthShareUsageDescription` + beide `InfoPlist.strings`
- [ ] Health aus? → keine Capability; Text bleibt (Plugin ist eingebunden)
- [ ] *Signing & Capabilities*: Team gewählt, **In-App Purchase** als Capability hinzugefügt (für Lab Pro)
- [x] Bundle-ID = `app.kolbi` (`capacitor.config.ts`, Xcode-Projekt)
