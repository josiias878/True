# Klar: automatische Erinnerungen aktivieren

## Stand

Code und lokale Tests sind vorhanden. Der echte Versand ist erst nach den
folgenden Einrichtungsschritten und einer empfangenen Testnachricht bestätigt.
Projekt: `tranquil-melomakarona-403b3f`, GitHub `josiias878/True`, Branch
`klar-finanzplaner`. Andere Projekte und der Branch `main` bleiben unverändert.

## Einmalige Einrichtung

1. Im Supabase-Projekt **Finanzplaner** (`fvykxvrdvjeriahlxded`) die Datei
   [`klar-push.sql`](./klar-push.sql) im SQL Editor ausführen. Die vorhandene
   Tabelle `klar_financial_plans` muss bereits existieren. Das SQL kann erneut
   ausgeführt werden; es löscht keine Finanzpläne und schaltet deren RLS nicht ab.
2. Ein VAPID-Schlüsselpaar erzeugen. Mit Terminalzugriff im Checkout:
   `cd klar && npm ci`, dann vom Repository-Hauptverzeichnis
   `node setup/create-push-env.cjs /tmp/klar-push-vapid.env`.
   Die Datei ist nur für den Besitzer lesbar und liegt außerhalb des Repositories.
   Bereits eingerichtete Schlüssel beibehalten: Ein Austausch erfordert die
   erneute Anmeldung der Geräte.
3. In Netlify → dieses Projekt → Environment variables folgende Werte setzen,
   für den Kontext **Production**, Scope **Functions** (oder All scopes):

   | Variable | Wert |
   | --- | --- |
   | `KLAR_SUPABASE_URL` | `https://fvykxvrdvjeriahlxded.supabase.co` |
   | `KLAR_SUPABASE_SERVICE_KEY` | Supabase `service_role` oder serverseitiger Secret API key dieses Projekts |
   | `KLAR_VAPID_PUBLIC_KEY` | Öffentlicher Teil des erzeugten VAPID-Paars |
   | `KLAR_VAPID_PRIVATE_KEY` | Privater Teil desselben Paars |
   | `KLAR_VAPID_SUBJECT` | `https://tranquil-melomakarona-403b3f.netlify.app` |

   Server-Schlüssel ausschließlich in Netlify hinterlegen, nicht in App-Felder,
   GitHub, Chatantworten oder Screenshots übernehmen. Die erzeugte temporäre
   Datei nach dem Import entfernen. Keine neuen kostenpflichtigen Tarife buchen.
4. Einen Production-Deploy aus `klar-finanzplaner` starten. Base `klar`, Publish
   `.`, Functions-Verzeichnis relativ zur Base `netlify/functions`. Die Datei
   `klar/package.json` installiert `web-push`. Prüfen, dass die Funktionen
   `klar-push` und `klar-reminders` gebaut wurden und bei `klar-reminders` der
   Zeitplan `*/15 7-8 * * *` angezeigt wird. Netlify Scheduled Functions laufen
   nur auf Production-Deploys; Deploy Previews versenden keine geplanten Nachrichten.
5. `https://tranquil-melomakarona-403b3f.netlify.app/.netlify/functions/klar-push`
   muss HTTP 200 mit dem **öffentlichen** Push-Schlüssel zurückgeben. HTTP 503
   bedeutet, dass Konfiguration oder Datenbankzugriff noch fehlen.

### Wenn ausschließlich Browserzugriff vorhanden ist

Ein VAPID-Paar lässt sich alternativ in einer vertrauenswürdigen HTTPS-Seite
mit der eingebauten Web-Crypto-API erzeugen (keinen fremden Schlüsselgenerator
verwenden). Im Browser-Ausführungskontext:

```js
const pair = await crypto.subtle.generateKey(
  {name: 'ECDSA', namedCurve: 'P-256'}, true, ['sign', 'verify']
);
const publicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
const publicKey = btoa(String.fromCharCode(...publicBytes))
  .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
// publicKey -> KLAR_VAPID_PUBLIC_KEY; privateJwk.d -> KLAR_VAPID_PRIVATE_KEY.
// Werte direkt in die Netlify-Felder übertragen, nicht im Chat ausgeben.
```

## Auf dem Gerät

Am iPhone: iOS 16.4 oder neuer, Seite in Safari öffnen → Teilen → Zum
Home-Bildschirm. Klar anschließend über dieses Symbol starten. Am Mac kann
ein aktueller Safari-, Chrome- oder Firefox-Browser verwendet werden.

1. In Klar anmelden und die eigene Planung einmal auf den Server hochladen.
2. Einstellungen → Erinnerungen einrichten → Erinnerungen einschalten.
3. Die Mitteilungsfreigabe am Gerät selbst bestätigen.
4. Testnachricht senden. Erst eine tatsächlich angekommene Nachricht bestätigt
   die Ende-zu-Ende-Verbindung. Antippen muss den Geldkalender öffnen.
5. Für den automatischen Test einen offenen Termin speichern, der morgen fällig
   ist. Am nächsten Morgen ab etwa 9 Uhr deutscher Zeit sollte eine Erinnerung
   erscheinen. Eine Testnachricht allein bestätigt noch keinen Cron-Lauf.

## Verhalten und Grenzen

- Ein allgemeiner Tagescheck je Gerät, wenn offene Zahlungen bis einschließlich
  morgen oder offene private Schulden/Rückzahlungen bis heute vorhanden sind.
  Bereits überfällige Einträge werden erneut täglich erinnert, bis sie als
  erledigt markiert oder verschoben und auf den Server hochgeladen sind.
- Keine Namen, Beträge, Gläubiger oder Einzelposten auf dem Sperrbildschirm.
- Versandzeit ca. 9 Uhr Europe/Berlin, Sommerzeit wird berücksichtigt. Der Cron
  prüft viertelstündlich 7–8 Uhr UTC, versendet aber nur während der deutschen
  9-Uhr-Stunde. Erfolgreiche Tagesnachrichten werden per Datenbankschlüssel
  dedupliziert. Ein Prozessabbruch nach Reservierung einer Nachricht kann den
  Versand dieses Tages auslassen; es gibt keine Garantie minutengenauer Zustellung.
- Die gespeicherte Serverplanung ist maßgeblich, nicht ungespeicherte lokale
  Änderungen. In der Oberfläche wird dieser Unterschied ausdrücklich erklärt.
- Abmelden beendet die Sitzung, aber nicht das Push-Abonnement. Auf gemeinsam
  genutzten Geräten vorher **Auf diesem Gerät ausschalten**. Andere Geräte
  bleiben davon unberührt. Nach einer abgelaufenen Browserfreigabe neu einschalten.
- Höchstens fünf regulär angemeldete Geräte pro Konto. Endpunkte von Apple,
  Firebase/Chrome und Mozilla werden akzeptiert; fremde URLs werden abgelehnt.
- Der Service Worker verarbeitet Push und Klicks; er speichert keine Finanzdaten
  im Cache und macht die App nicht offline verfügbar.
- Die Funktion versendet Web Push, keine SMS oder E-Mail. Geräte-Fokus,
  Betriebssystem und Netzwerk können Nachrichten verzögern oder unterdrücken.

## Prüfungen

`cd klar && npm test` prüft Fälligkeiten, Tilgungen, Terminverschiebungen,
Sommer-/Winterzeit, Authentifizierung, erlaubte Push-Dienste und Deduplizierung.
Zusätzlich lokal geprüft: SQL zweimal ausführbar, Tabellen für anonyme und
angemeldete Browsernutzer gesperrt, Service-Rolle berechtigt, kaskadierendes
Aufräumen; Browserablauf Einschalten/Test/Ausschalten sowie nicht eingerichteter
Server mit simuliertem Transport. Echte iPhone-Zustellung und Production-Cron
sind noch zu prüfen.

## Übergabe an Claude

> Richte die bereits implementierten automatischen Push-Erinnerungen für meine
> Klar-App fertig ein. Repository josiias878/True, Branch klar-finanzplaner,
> Netlify-Projekt tranquil-melomakarona-403b3f, Supabase-Projekt Finanzplaner
> (fvykxvrdvjeriahlxded). Lies setup/PUSH-EINRICHTEN.md und führe die einmalige
> Einrichtung daraus durch: SQL-Migration, VAPID-Schlüsselpaar, Netlify-Variablen
> und Production-Deploy. Übernimm Geheimnisse nur direkt in die vorgesehenen
> Server-Einstellungen und gib sie nicht im Chat aus. Erhalte bestehende Daten
> und Zugriffsschutz. Prüfe die beiden Funktionen und den Cron-Zeitplan. Sag mir
> dann nur, wann ich am iPhone die Mitteilungen erlauben und die Testnachricht
> auslösen soll. Behaupte erst nach bestätigtem Empfang, dass die Zustellung
> funktioniert. Wenn dir ein Zugang fehlt, benenne nur den konkret fehlenden.
