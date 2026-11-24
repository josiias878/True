// Gibt eine in der App erzeugte Kalenderdatei zurück, damit das iPhone „Alle hinzufügen“ anbietet.
// Enthält nur Termin-Titel und Daten, keine Geldbeträge. Nichts wird gespeichert.
module.exports = (req, res) => {
  const c = String((req.query && req.query.c) || '');
  const bad = () => { res.statusCode = 400; res.end('Ungültige Anfrage'); };
  if (!c || c.length > 40000 || !/^[A-Za-z0-9_-]+$/.test(c)) return bad();
  const text = Buffer.from(c, 'base64url').toString('utf8');
  if (!text.startsWith('BEGIN:VCALENDAR') || !text.includes('PRODID:-//Mein Geld//DE') || !text.trimEnd().endsWith('END:VCALENDAR')) return bad();
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="mein-geld-erinnerungen.ics"');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(text);
};
