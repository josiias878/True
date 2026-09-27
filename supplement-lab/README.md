# Supplement Lab — eigenständige App (iOS / Android / Web)

Die Oberfläche ist dieselbe wie unter `get-true.de/lab` (Code liegt in `../app/lab` und `../lib`),
hier aber als eigene App im **Store-Modus** gebaut:

- keine Research-Peptide in der Bibliothek (nur neutral als eigene Substanz eintragbar,
  ohne Beschreibung, Dosierung oder Injektionshinweise), GLP-1 als „Verschriebene Medikamente“
- kein Link zurück zu TRUE
- echte Push-Erinnerungen über `@capacitor/local-notifications` (auch bei geschlossener App,
  mit 1-Tipp-Bewertung direkt aus der Benachrichtigung)
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

## Store-Fahrplan

Siehe [`STORE.md`](./STORE.md).
