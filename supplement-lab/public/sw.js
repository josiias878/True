// Supplement Lab — Service Worker (Web/PWA): Offline-Cache + Benachrichtigungs-Aktionen
const CACHE = "supplement-lab-v1"

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./index.html"]).catch(() => {})))
  self.skipWaiting()
})
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return
  // Network first, Cache als Offline-Fallback
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone()
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {})
      return res
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  )
})
self.addEventListener("notificationclick", e => {
  e.notification.close()
  let url = e.notification.data?.url ?? "/"
  if (e.action && e.action.startsWith("lab-rate-")) url = "/?rate=" + e.action.slice(9)
  if (e.action === "lab-taken" && e.notification.data?.taken) url = "/?taken=" + encodeURIComponent(e.notification.data.taken)
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(list => {
    const w = list.find(c => "navigate" in c)
    return w ? w.navigate(url).then(c => c && c.focus()) : self.clients.openWindow(url)
  }))
})
