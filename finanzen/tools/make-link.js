// Erzeugt den privaten Link, der die Stammdaten (daten/stammdaten.json) einmalig aufs Gerät lädt.
// Aufruf: node tools/make-link.js https://<app-url>/
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const base = process.argv[2] || 'https://example.invalid/';
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../daten/stammdaten.json'), 'utf8'));
const payload = { v: 1, id: 'p' + Date.now().toString(36), data };
const code = 'z' + zlib.deflateRawSync(Buffer.from(JSON.stringify(payload)), { level: 9 }).toString('base64url');
console.log(base.replace(/#.*$/, '') + '#d=' + code);
