# Supplement Lab — eigenständige App (iOS / Android / Web)

Die Oberfläche ist dieselbe wie unter `get-true.de/lab` (Code liegt in `../app/lab` und `../lib`),
hier aber als eigene App im **Store-Modus** gebaut:

- keine Research-Peptide in der Bibliothek (nur neutral als eigene Substanz eintragbar,
  ohne Beschreibung, Dosierung oder Injektionshinweise), GLP-1 als „Verschriebene Medikamente“
- kein Link zurück zu TRUE
- echte Push-Erinnerungen über `@capacitor/local-notifications` (auch bei geschlossener App,
  mit 1-Tipp-Bewertung direkt aus der Benachrichtigung)
- optionale Anbindung an Apple Health / Google Health Connect (nur Schlaf + HRV, siehe unten)
- alle Daten bleiben lokal auf dem Gerät

## Im Browser testen

```bash
cd supplement-lab
npm install
npm run dev        # http://localhost:5173
```

## Auf dem iPhone testen (MacBook + Xcode)

Voraussetzungen: Xcode (aktuell). Falls `npx cap add ios` nach CocoaPods fragt: `brew install cocoapods`.

```bash
cd supplement-lab
npm install
npm run build
npx cap add ios          # nur beim ersten Mal — legt den Ordner ios/ an
npm run assets           # App-Icons & Splash aus assets/ erzeugen
npx cap sync ios
npx cap open ios         # öffnet Xcode
```

In Xcode:
1. Links das Projekt **App** anklicken → *Signing & Capabilities* → dein **Team** (Apple Developer Account) wählen.
2. Oben dein iPhone als Ziel wählen (per Kabel verbunden, auf dem iPhone *Entwicklermodus* aktivieren).
3. ▶︎ drücken — die App landet auf dem iPhone.

Nach Code-Änderungen: `npm run ios` (baut, synchronisiert und öffnet Xcode).

## Android

```bash
npx cap add android      # nur beim ersten Mal
npm run assets
npm run android          # öffnet Android Studio
```

## Apple Health / Google Health Connect (optional)

Eigenes, kleines lokales Plugin unter `packages/capacitor-supp-health/` — liest **nur**
Schlafdauer und HRV, sonst nichts (kein Training, keine Schritte). Es gibt kein fertiges
Capacitor-Plugin, das beides auf beiden Plattformen abdeckt, deshalb ist das selbst geschrieben.

⚠️ **Neu und ungetestet** — Swift/Kotlin lassen sich hier nicht kompilieren. Baue es einmal in
Xcode/Android Studio; bei Fehlern einfach die Meldung zurückschicken.

Setup-Schritte (HealthKit-Capability, Info.plist-Eintrag, Android-Manifest-Permissions):
siehe [`packages/capacitor-supp-health/README.md`](./packages/capacitor-supp-health/README.md).
Ohne dieses Setup bleibt `isAvailable()` einfach `false` und die App fragt gar nicht erst danach —
nichts bricht, wenn man es auslässt.

## Store-Fahrplan

Siehe [`STORE.md`](./STORE.md).
