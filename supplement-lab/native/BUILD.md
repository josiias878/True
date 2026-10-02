# Kolbi · Store-Builds über GitHub Actions (ohne eigenen Mac)

App-ID für beide Stores: **`app.kolbi`** (iOS Bundle ID = Android Package Name, nie mehr änderbar).
Version **1.0.0** · Build-Nummer = Laufnummer des Workflows (steigt automatisch).

| Workflow | Startet | Ergebnis |
|---|---|---|
| `.github/workflows/kolbi-android.yml` | bei jedem Push auf `claude/supplement-tracking-app-hwna5s`, der `supplement-lab/`, `lib/` oder `app/lab/` ändert · manuell | **mit** Android-Secrets: signiertes `app-release.aab` für Google Play · **ohne**: unsigniertes AAB + Debug-APK (nur Prüfung) |
| `.github/workflows/kolbi-ios.yml` | nur manuell oder wenn sich `supplement-lab/ios/**` / `capacitor.config.ts` ändert (macOS-Minuten sind teuer) | Job 1: Simulator-Build ohne Signierung (Prüfung) · Job 2 **mit** Apple-Secrets: signiert + Upload zu **TestFlight** |

Manuell starten: GitHub → Repo → **Actions** → „Kolbi Android“ bzw. „Kolbi iOS“ → **Run workflow** →
Branch `claude/supplement-tracking-app-hwna5s`. Das AAB liegt danach im Lauf unten unter **Artifacts** (ZIP).
Nach reinen Web-Änderungen (lib/, app/lab/) für einen neuen TestFlight-Build „Kolbi iOS“ manuell starten.

**Secrets eintragen:** GitHub → Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Name exakt wie unten, Wert einfügen, *Add secret*. GitHub zeigt den Wert danach nie wieder an.

> 🔒 Schlüsseldateien, Passwörter und `.p8` **nie** in den Chat, in E-Mails oder ins Repo – nur in GitHub-Secrets
> und in deinen Passwort-Manager.

---

## A. Android – Upload-Schlüssel (bis zum ersten Upload in den geschlossenen Test, ca. 23. Okt)

**1. Schlüssel erzeugen** – entweder lokal (Terminal, Java muss installiert sein) **oder** in einem GitHub
Codespace (Repo → *Code* → *Codespaces* → *Create codespace*, dort *Terminal*). Im Codespace **nicht** im
Repo-Ordner arbeiten, sondern im Home-Ordner (`cd ~`), damit die Datei nie versehentlich committet wird:

```bash
cd ~
keytool -genkeypair -v -storetype PKCS12 -keystore kolbi-upload.jks -alias kolbi-upload \
  -keyalg RSA -keysize 4096 -validity 10000
# fragt: Passwort (2×) + Name/Ort (Name genügt). Bei PKCS12 gilt dasselbe Passwort auch für den Schlüssel.
base64 -w0 kolbi-upload.jks > kolbi-upload.b64     # macOS: base64 -i kolbi-upload.jks -o kolbi-upload.b64
cat kolbi-upload.b64                                # eine lange Zeile → komplett kopieren
```

**2. Vier Secrets anlegen:**

| Secret | Wert |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | die lange Zeile aus `kolbi-upload.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | dein Passwort |
| `ANDROID_KEY_ALIAS` | `kolbi-upload` |
| `ANDROID_KEY_PASSWORD` | dasselbe Passwort (PKCS12) |

**3. Sicher aufbewahren:** `kolbi-upload.jks` + Passwort in den Passwort-Manager (Datei als Anhang) **und**
eine zweite Kopie offline (z. B. USB-Stick). Danach die Dateien im Codespace löschen
(`rm ~/kolbi-upload.jks ~/kolbi-upload.b64`) und den Codespace löschen.

⚠️ **Verlust von Datei oder Passwort = keine Updates mehr.** Google Play nimmt nur Builds an, die mit diesem
Upload-Schlüssel signiert sind. Retten lässt sich das nur über einen *Upload-Key-Reset* beim Google-Support
(geht nur mit „Play App Signing“, dauert Tage). Darum beim ersten Upload in der Play Console
**„Play App Signing“ / „Von Google verwalteten Schlüssel verwenden“** aktiviert lassen (Standard).

**4. Erster Upload:** Workflow „Kolbi Android“ laufen lassen → Artefakt `kolbi-android-<Nr>-signed` laden →
ZIP entpacken → Play Console → *Test → Geschlossener Test → Neuen Release erstellen* → `app-release.aab` hochladen.

---

## B. iOS – App-Store-Connect-API-Schlüssel (sobald der Apple-Developer-Account aktiv ist)

**Vorher nötig:** die App ist in App Store Connect angelegt (STORE.md Schritt 4.5, Bundle-ID `app.kolbi`) –
sonst bricht der Upload mit „No suitable application records“ ab. Die Bundle-ID und die Zertifikate legt der
Workflow selbst an (automatische Signierung).

**1. Schlüssel erzeugen:** **appstoreconnect.apple.com → Benutzer und Zugriff → Integrationen →
App Store Connect API** → Reiter **Team-Schlüssel** (beim ersten Mal „Zugriff anfordern“ bestätigen) → **+** →
Name `GitHub Actions Kolbi` → Zugriff/Rolle wählen → *Erstellen*.

- **Rolle:** **Admin** empfohlen. „App Manager“ reicht für den Upload, aber die vollautomatische Signierung
  ohne Mac nutzt von Apple verwaltete Verteilungszertifikate – die darf nach unserem Kenntnisstand nur ein
  Admin-Schlüssel. Bricht der Build mit „Cloud signing permission error“ ab: Schlüssel mit Rolle Admin anlegen.
- **API-Schlüssel laden** → Datei `AuthKey_XXXXXXXXXX.p8` (geht nur **ein einziges Mal**).
- Auf derselben Seite stehen **Schlüssel-ID** (in der Liste) und **Issuer-ID** (oben über der Liste).
- **Team-ID:** developer.apple.com → *Account* → *Mitgliedschaftsdetails* → Team-ID (10 Zeichen).

**2. Vier Secrets anlegen:**

| Secret | Wert |
|---|---|
| `APP_STORE_CONNECT_KEY_ID` | Schlüssel-ID, z. B. `AB12CD34EF` |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer-ID (lange ID mit Bindestrichen) |
| `APP_STORE_CONNECT_KEY_P8` | **gesamter Inhalt** der `.p8`-Datei (mit Texteditor öffnen, inkl. `-----BEGIN PRIVATE KEY-----` und `-----END …-----`) |
| `APPLE_TEAM_ID` | Team-ID |

`.p8` danach in den Passwort-Manager, sonst nirgends. Geht sie verloren: Schlüssel in App Store Connect
widerrufen, neuen anlegen, Secrets ersetzen (kein Schaden für die App).

**3. Build:** Actions → „Kolbi iOS“ → *Run workflow*. Nach ~20–40 Min. Build + 10–30 Min. Apple-Verarbeitung
erscheint er in App Store Connect → **TestFlight** (Exportkonformität ist schon beantwortet).
Hinweis: Jeder Lauf kann ein neues „Apple Development“-Zertifikat anlegen. Meldet Apple irgendwann ein
Zertifikats-Limit: developer.apple.com → *Certificates* → alte Einträge „Created by GitHub Actions Kolbi“ widerrufen.

---

## C. Optional – Bezahlen (RevenueCat, öffentliche Schlüssel)

| Secret | Wert | ab wann |
|---|---|---|
| `VITE_RC_ANDROID_KEY` | `goog_…` | sobald RevenueCat eingerichtet ist (STORE.md Schritt 5) |
| `VITE_RC_IOS_KEY` | `appl_…` | dito |

Ohne diese Schlüssel baut alles trotzdem – Lab Pro bleibt dann gratis.

---

## D. Versionen & Kosten

- **Neue Store-Version** (z. B. 1.0.1): `versionName` in `supplement-lab/android/app/build.gradle` **und**
  `MARKETING_VERSION` im Xcode-Projekt (`supplement-lab/ios/App/App.xcodeproj/project.pbxproj`, 2×) ändern –
  macht Claude. Die Build-Nummer zählt der Workflow selbst hoch (nie zurücksetzen: Workflow-Datei nicht umbenennen).
- **Kosten:** Linux-Minuten (Android) sind günstig; macOS-Minuten zählen in privaten Repos 10-fach gegen das
  Freikontingent. Deshalb startet „Kolbi iOS“ nur manuell bzw. bei iOS-Änderungen; ein voller Lauf
  (Prüfung + TestFlight) dauert ca. 30–50 macOS-Minuten.
- **Lokal bauen** (optional, mit Android Studio / Xcode): `cd supplement-lab && npx vite build && npx cap sync`,
  dann `npx cap open android` bzw. `npx cap open ios`.
