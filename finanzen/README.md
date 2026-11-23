# Mein Geld & Auto

Web-App (eine HTML-Datei) für Monats-Check, Schulden/Erspartes und Auto-Wartung. Installierbar auf dem Home-Bildschirm, offline nutzbar.

- `index.html` – App. Enthält **keine persönlichen Daten** (nur eine leere Vorlage).
- `daten/stammdaten.json` – persönliche Planung (Quelle der Wahrheit für Claude). Wird **nicht** deployt.
- `tools/make-link.js <app-url>` – erzeugt den privaten Link `…#d=…`, der die Stammdaten einmalig aufs Gerät lädt. Der Teil nach `#` wird nie an den Server gesendet. Bereits erfasste Monate bleiben bei späteren Links erhalten (nur die Planung wird aktualisiert).
- `api/ics.js` – gibt die in der App erzeugte Kalenderdatei zurück (nur Termin-Titel/Daten), damit iOS „Alle hinzufügen“ anbietet.
- `sw.js`, `manifest.webmanifest`, `icon-*.png` – Home-Bildschirm & Offline.

Deploy: nur `index.html sw.js manifest.webmanifest icon-*.png api/ics.js` hochladen (ohne `daten/`, `tools/`).
