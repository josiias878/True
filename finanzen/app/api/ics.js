// Alte Kalender-Funktion (ersetzt durch das Kalender-Abo). Zeigt einen Hinweis statt eines Fehlers.
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mein Geld</title></head>
<body style="font:17px/1.5 -apple-system,Helvetica,sans-serif;padding:40px 24px;max-width:480px;margin:auto">
<h2>📅 Kalender wurde verbessert</h2>
<p>Bitte dieses Fenster schließen, die App <b>„Mein Geld“ einmal ganz schließen</b> (nach oben wegwischen) und neu öffnen.</p>
<p>Dann: Einstellungen → Erinnerungen &amp; Kalender → <b>„Mit iPhone-Kalender verbinden“</b>.</p></body></html>`);
};
