// Abgleich zwischen Geräten. Speichert nur verschlüsselte Daten (AES-GCM, Schlüssel nur auf deinen Geräten).
// GET  ?id=<32 hex>  → { v, iv, ct } oder 204 (noch nichts gespeichert)
// POST ?id=<32 hex>  → speichert { v, iv, ct }
const { put, get } = require('@vercel/blob');

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '');
  if (!/^[0-9a-f]{32}$/.test(id)) { res.statusCode = 400; return res.end('Ungültige Anfrage'); }
  const path = `sync/${id}.json`;
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
      let o; try { o = JSON.parse(body); } catch { o = null; }
      if (!o || body.length > 4000000 || typeof o.iv !== 'string' || typeof o.ct !== 'string' || !/^[A-Za-z0-9_-]+$/.test(o.iv + o.ct)) {
        res.statusCode = 400; return res.end('Ungültige Daten');
      }
      await put(path, JSON.stringify({ v: 1, iv: o.iv, ct: o.ct }), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
      return res.end('ok');
    }
    if (req.method !== 'GET') { res.statusCode = 405; return res.end(); }
    const r = await get(path, { access: 'private', useCache: false });
    if (!r) { res.statusCode = 204; return res.end(); }
    res.setHeader('Content-Type', 'application/json');
    return res.end(await new Response(r.stream).text());
  } catch (e) {
    res.statusCode = 500; return res.end('Fehler');
  }
};
