# Go-Live bei Google (kolbi-smoky.vercel.app)

Stand 2. Okt 2026 · Ziel: Sobald der Inhaber seine Impressum-Daten liefert, wird die Seite mit **einem** Schritt
indexierbar. Bis dahin bleibt sie absichtlich auf `noindex` (Entwurf).

## Wie „Entwurf“ heute entsteht

`tools/build-site.mjs` setzt `DRAFT = true`, solange in **irgendeinem** Rechtstext (DE `legal/*.md` **oder** EN
`legal/en/*.md`) noch ein Platzhalter steht: `[Vorname Nachname]`, `[Straße Hausnummer]`, `[PLZ Ort]`,
`[E-Mail-Adresse]`. Bei `DRAFT` gilt:

- jede Seite bekommt `<meta name="robots" content="noindex, nofollow">`
- `site/robots.txt` = `Disallow: /`
- `site/vercel.json` bekommt den Header `X-Robots-Tag: noindex, nofollow`

## Schritt für Schritt

**(a) Daten eintragen – eine Datei, vier Felder.** In `marketing/tools/build-site.mjs` ganz oben:

```js
const OWNER = { "Vorname Nachname": "", "Straße Hausnummer": "", "PLZ Ort": "", "E-Mail-Adresse": "" }
```

Alle vier ausfüllen (ladungsfähige Anschrift, kein Postfach). Beim Bauen werden damit **alle** Platzhalter in
Impressum, Datenschutz (DE + EN), Imprint und Pressemappe ersetzt und die Ausfüll-Hinweise entfernt. Die
Markdown-Dateien in `legal/` bleiben unverändert. Fehlt ein Feld, bleibt alles Entwurf (Meldung „OWNER unvollständig“).

**(b) Bauen** (im Ordner `supplement-lab/marketing`):

```bash
node tools/build-site.mjs        # Ausgabe ohne „(Entwurf …)“ = indexierbar
```

Kurz prüfen: `grep -rl noindex site` → nichts · `cat site/robots.txt` → `Allow: /` + `Sitemap:` ·
`grep -rn "\[E-Mail-Adresse\]" site` → nichts.

**(c) Deploy (CEO):** Der Deploy-Aufruf des CEO enthält eine **eigene, inline geschriebene `vercel.json`** mit
`X-Robots-Tag: noindex, nofollow`. Die steht **nicht** im Repo. Diesen Header beim Go-Live-Deploy **entfernen**
(am besten einfach `site/vercel.json` aus dem Build verwenden). Sonst bleibt Google ausgesperrt, egal was in den
Seiten steht. Nach dem Deploy prüfen: `curl -sI https://kolbi-smoky.vercel.app | grep -i x-robots` → keine Zeile.

**(d) robots.txt + sitemap.xml:** werden automatisch erzeugt. Ohne Entwurf:
`User-agent: * / Allow: / / Sitemap: https://kolbi-smoky.vercel.app/sitemap.xml`, **kein** `Disallow`.
Die Sitemap enthält alle 46 Seiten (DE + EN, Selbsttests, Rechner, Vorlage, Presse, Rechtsseiten).
Live prüfen: `/robots.txt` und `/sitemap.xml` im Browser öffnen.

**(e) Google Search Console (Inhaber, mit eigenem Google-Konto):**

1. search.google.com/search-console → **Property hinzufügen** → **URL-Präfix** wählen (eine *Domain*-Property
   geht bei `*.vercel.app` nicht, dafür bräuchte man DNS-Zugriff) → `https://kolbi-smoky.vercel.app/` eintragen.
2. Bestätigungsmethode **HTML-Tag** wählen. Google zeigt
   `<meta name="google-site-verification" content="AbC123…">`. **Nur den `content`-Wert** an den CEO schicken.
3. CEO trägt ihn in `build-site.mjs` ein: `const GSC_VERIFY = "AbC123…"` → neu bauen → deployen.
   (Leer = kein Tag, die Ausgabe bleibt dann byte-gleich.) Der Tag landet in **allen** Seiten.
4. In der Search Console auf **Bestätigen** klicken. Den Tag danach drin lassen (sonst verfällt die Bestätigung).

**(f) Sitemap einreichen:** Search Console → **Sitemaps** → `sitemap.xml` eingeben → **Senden**. Dann unter
**URL-Prüfung** die Startseite `/` und `/en` eingeben → **Indexierung beantragen**. Erste Einträge dauern meist
einige Tage bis wenige Wochen.

## Vorher entscheiden (nicht technisch)

- Datenschutz und Nutzungsbedingungen tragen oben noch den Hinweis **„ENTWURF – vor Veröffentlichung von einer
  Fachperson prüfen lassen“** (DE + EN). Der wird nicht automatisch entfernt. Prüfen lassen, dann die Zeile in
  `legal/*.md` löschen (Rechtstexte: CEO).
- Die Impressum-Daten sind danach öffentlich und im Git-Verlauf. Das ist beim Impressum Pflicht, aber gut zu wissen.
