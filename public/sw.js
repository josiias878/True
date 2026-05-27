// TRUE Service Worker — Push Notifications + Offline Cache

const CACHE = "true-v4"
const PRECACHE = ["/home", "/scan", "/offline"]

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener("message", e => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting()
})

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()).then(() => {
      // Notify all clients to reload after SW takeover
      self.clients.matchAll({ type: "window" }).then(clients => {
        clients.forEach(client => client.postMessage({ type: "SW_UPDATED" }))
      })
    })
  )
})

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})

self.addEventListener("push", e => {
  const data = e.data?.json() ?? {}
  e.waitUntil(
    self.registration.showNotification(data.title ?? "TRUE", {
      body: data.body ?? "Neue Meldung verfügbar",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag ?? "true-alert",
      data: { url: data.url ?? "/home" },
      actions: [
        { action: "open",    title: "Ansehen" },
        { action: "dismiss", title: "Schließen" },
      ],
    })
  )
})

self.addEventListener("notificationclick", e => {
  e.notification.close()
  if (e.action === "dismiss") return
  const url = e.notification.data?.url ?? "/home"
  e.waitUntil(
    clients.matchAll({ type: "window" }).then(list => {
      const w = list.find(c => c.url.includes(url) && "focus" in c)
      return w ? w.focus() : clients.openWindow(url)
    })
  )
})
