# Finanz- & Auto-Cockpit

Eigenständige Web-App (eine HTML-Datei, kein Build, offline nutzbar). `index.html` im Browser öffnen.

- Daten liegen im `localStorage` des Browsers → regelmäßig **Backup (JSON)** exportieren.
- Stammdaten (Budget, Abos, Auto-Plan) stehen in `seed()` in `index.html`. Bei Änderungen `SEED_REV` erhöhen – die App bietet dann „Neue Stammdaten übernehmen“ an, Monatseinträge bleiben erhalten.
- Liegt bewusst **nicht** in `public/`, damit die persönlichen Daten nicht mit der Next.js-App deployt werden.
