// Kalender-Abo für „Mein Geld“.
// POST ?t=<token>  → speichert die in der App erzeugte Kalenderdatei (nur Termin-Titel, keine Beträge)
// GET  ?t=<token>  → liefert sie an den iPhone-Kalender (webcal-Abo, aktualisiert sich automatisch)
// Der Token ist eine 128-Bit-Zufallszahl, die nur auf deinem Gerät erzeugt wird.
const { put, get } = require('@vercel/blob');

const EMPTY = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Mein Geld//DE\r\nX-WR-CALNAME:Mein Geld & Auto\r\nEND:VCALENDAR\r\n';

module.exports = async (req, res) => {
  const t = String((req.query && req.query.t) || '');
  if (!/^[0-9a-f]{32}$/.test(t)) { res.statusCode = 400; return res.end('Ungültige Anfrage'); }
  const path = `kalender/${t}.ics`;
  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
      if (body.length > 500000 || !body.startsWith('BEGIN:VCALENDAR') || !body.includes('PRODID:-//Mein Geld//DE') || !body.trimEnd().endsWith('END:VCALENDAR')) {
        res.statusCode = 400; return res.end('Ungültiger Kalender');
      }
      await put(path, body, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'text/calendar; charset=utf-8', cacheControlMaxAge: 60 });
      res.setHeader('Cache-Control', 'no-store');
      return res.end('ok');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end(); }
    const r = await get(path, { access: 'private', useCache: false });
    const text = r ? await new Response(r.stream).text() : EMPTY;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="mein-geld.ics"');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    return res.end(req.method === 'HEAD' ? '' : text);
  } catch (e) {
    res.statusCode = 500; return res.end('Fehler');
  }
};
