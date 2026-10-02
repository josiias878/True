# Supplement Lab — eigenständige App (iOS / Android / Web)

Die Oberfläche ist dieselbe wie unter `get-true.de/lab` (Code liegt in `../app/lab` und `../lib`),
hier aber als eigene App im **Store-Modus** gebaut:

- keine Research-Peptide in der Bibliothek (nur neutral als eigene Substanz eintragbar,
  ohne Beschreibung, Dosierung oder Injektionshinweise), GLP-1 als „Verschriebene Medikamente“
- kein Link zurück zu TRUE
- echte Push-Erinnerungen über `@capacitor/local-notifications` (auch bei geschlossener App,
  mit „✓ Genommen“ direkt aus der Benachrichtigung); als Home-Bildschirm-App per Web-Push (siehe unten)
- optionale Anbindung an Apple Health / Google Health Connect (nur Schlaf + HRV, siehe unten)
- alle Daten bleiben lokal auf dem Gerät
- anonyme Öffnungs-Zählung über Vercel Web Analytics (nur „wie oft geöffnet“, keine Namen,
  keine Profile, keine Health-Daten) — siehe unten

## Push-Nachrichten (Home-Bildschirm-App / Web)

Echte Push-Nachrichten, auch wenn die App geschlossen ist (iPhone ab iOS 16.4, nur wenn die App
über „Zum Home-Bildschirm“ installiert ist; Android/Desktop in jedem Browser).

- **Plan:** `lib/labReminders.ts → notificationPlan()` – gemeinsam für Push und die spätere Store-App
  (dort lokale Benachrichtigungen, `src/native.ts`). Pro Tageszeit gebündelt, abends die Tagesrunde
  (Einnahmen ±60 Min. werden mitgenommen), Serien-Retter, „Ergebnis ist da“, sonntags ein Praxis-Tipp.
- **Datenschutz:** Der Server bekommt nur die Push-Adresse und **neutrale** Texte
  („Zeit für deine Supplements“). Die persönlichen Texte mit Supplement-Namen liegen im Cache des
  Geräts; der Service Worker (`public/sw.js`) setzt sie beim Empfang ein.
- **Server (Supabase-Projekt „Supplement Lab“, Frankfurt):**
  - Tabellen `lab_push_subs`, `lab_push_queue`, `lab_push_config` (RLS an, nur Service-Role)
  - Edge Functions in `supabase/functions/`: `push-register` (Gerät + Plan ersetzen),
    `push-send` (versendet fällige Nachrichten, räumt abgelaufene Geräte auf)
  - `pg_cron` ruft `push-send` jede Minute auf, aber nur wenn etwas fällig ist
- **Schlüssel:** VAPID-Schlüssel und Cron-Geheimnis liegen nur in `lab_push_config` in der
  Datenbank (nicht im Repo). Der öffentliche VAPID-Schlüssel steht in `lib/labPush.ts`.

## Kalender-Abo & Community (gleiches Supabase-Projekt)

- **Kalender-Abo** (`supabase/functions/lab-cal`): Das Gerät erzeugt ein zufälliges Token und lädt
  bei Änderungen eine ICS-Datei mit den großen Terminen hoch (Testende, Ergebnis, nächster Test,
  Nachkaufen, Wochenrückblick). Abonniert wird `webcal://…/lab-cal?t=<token>`. Titel standardmäßig
  neutral; Namen nur, wenn man es in den Einstellungen einschaltet. „Abo beenden“ löscht alles.
- **Community** (`supabase/functions/lab-community`, Tabelle `lab_community`): nur mit Zustimmung,
  nur Bibliotheks-Supplements. Gespeichert: zufällige Geräte-ID, Supplement-ID, Testdauer, Urteil,
  ±★ gesamt/je Bereich, Nebenwirkungs-IDs – keine Namen, Daten oder Notizen. Statistiken werden erst
  ab 5 Beiträgen gezeigt und nur aggregiert (Quantile statt Einzelwerte). Löschen per Einstellungen.

## Feedback & Wachstum (gleiches Supabase-Projekt)

- **Feedback** (`supabase/functions/lab-feedback`, Tabelle `lab_feedback`): 😍/🙂/😕 + Text, **ohne**
  Geräte-ID. Lesen: `select created_at, mood, text from lab_feedback order by created_at desc;`
  Ein Cron-Job löscht Einträge nach 12 Monaten.
- **Lab Pro** (`lib/labGrow.ts`): solange `BETA = true`, ist alles frei und jeder Nutzer bekommt den
  Gründer-Status (`s.pro.founder`), der auch nach der Beta gilt.
- **Bewertungs-Moment:** nach einem Urteil oder der Wochen-Story, nur wenn ≥ 7 Check-ins und ein
  Erfolg (behalten oder 7 Tage Serie), max. 3× mit 30 Tagen Abstand. In der Store-App ruft 😍 das
  native Bewertungsfenster (Plugin `InAppReview`), im Web „Weiterempfehlen“.

## Anonyme Statistik / Funnel (gleiches Supabase-Projekt)

- `lib/labStats.ts` → Edge Function `lab-stats` → Tabelle `lab_stats` (nur Tageszähler je Ereignis, Sprache,
  Herkunftskanal; keine Geräte-ID). Abschaltbar in den Einstellungen („📊 Anonyme Statistik“).
- Herkunftskanal: Landingpage-Links `/reddit`, `/en/hn` … hängen `?src=<kanal>` an die App-Links; die App merkt
  sich den Kanal beim Einrichten.
- Auswerten: `select * from lab_funnel;` (besucht → eingerichtet → erster Check-in → 7 Check-ins … je Kanal)

## Wie oft wird die App geöffnet? (Vercel Web Analytics)

Da es keine Accounts gibt, ist die einzige Möglichkeit zu sehen, ob die App überhaupt genutzt
wird, eine **anonyme** Zählung über [Vercel Web Analytics](https://vercel.com/docs/analytics) —
läuft über den bestehenden Vercel-Account, kein neuer Drittanbieter-Login nötig.

**Einmalig aktivieren:** im Vercel-Dashboard beim Projekt → Tab **Analytics** → *Enable*.
Danach siehst du dort aggregierte Zahlen wie „342 Besuche diese Woche“ — keine Namen, keine
IPs im Klartext, keine Verknüpfung zu den App-Daten (die bleiben ja weiterhin nur lokal auf
dem Gerät). Ohne diesen Klick im Dashboard sammelt sich nichts an, obwohl der Code schon drin ist.

## Im Browser testen

```bash
cd supplement-lab
npm install
npm run dev        # http://localhost:5173
```

## Store-Builds (iOS + Android)

Die nativen Projekte `ios/` (Swift Package Manager, kein CocoaPods) und `android/` sind eingecheckt,
App-ID `app.kolbi`. Gebaut wird in **GitHub Actions** – ohne eigenen Mac → [`native/BUILD.md`](native/BUILD.md).

Lokal (optional, mit Xcode bzw. Android Studio):

```bash
cd supplement-lab
npm install
npm run ios              # vite build + cap sync ios + öffnet Xcode
npm run android          # vite build + cap sync android + öffnet Android Studio
npm run assets           # nur wenn sich assets/ (Icon, Splash) ändert
```

In Xcode für ein echtes iPhone: Projekt **App** → *Signing & Capabilities* → **Team** wählen → iPhone als Ziel → ▶︎.

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
