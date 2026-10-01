# iOS-Dateien für den App Store

Diese Dateien gehören in das Xcode-Projekt. Der Ordner `ios/` existiert erst, nachdem einmal
`npx cap add ios` gelaufen ist (siehe [`../../README.md`](../../README.md) → „Auf dem iPhone testen“).
Bis dahin liegen sie hier bereit. Claude erledigt das gern für dich – du musst nur Xcode öffnen.

| Datei | Wofür |
|---|---|
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
Version 1 weglassen: Capability **und** Text weglassen. Einen `NSHealthUpdateUsageDescription`-Text
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

Ist Apple Health in Version 1 **nicht** dabei, in beiden Dateien die Zeile mit
`NSHealthShareUsageDescription` löschen (sie schadet zwar nicht, wirkt beim Review aber unaufgeräumt).

---

## 4. Kurz-Check vor dem Upload

- [ ] `PrivacyInfo.xcprivacy` im Target **App**
- [ ] Info.plist: `CFBundleDisplayName`, `CFBundleLocalizations`, `ITSAppUsesNonExemptEncryption`
- [ ] Health an? → Capability *HealthKit* + `NSHealthShareUsageDescription` + beide `InfoPlist.strings`
- [ ] Health aus? → keine Capability, kein Text
- [ ] *Signing & Capabilities*: Team gewählt, **In-App Purchase** als Capability hinzugefügt (für Lab Pro)
- [ ] Bundle-ID = endgültige ID aus `capacitor.config.ts`
