// Offline-Cache. Online wird immer die neueste Version geladen (Netzwerk zuerst),
// offline startet die App aus dem Zwischenspeicher.
const CACHE = 'mein-geld-v3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  const key = e.request.mode === 'navigate' ? './index.html' : e.request;
  e.respondWith(caches.open(CACHE).then(c =>
    fetch(e.request, { cache: 'no-store' })
      .then(r => { if (r.ok) c.put(key, r.clone()); return r; })
      .catch(() => c.match(key, { ignoreSearch: true }))
  ));
});
