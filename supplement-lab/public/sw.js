// Supplement Lab — Service Worker (Web/PWA): Offline-Cache + Benachrichtigungs-Aktionen
const CACHE = "supplement-lab-v2"

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "./index.html"]).catch(() => {})))
  self.skipWaiting()
})
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== "lab-push").map(k => caches.delete(k)))).then(() => self.clients.claim()))
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
// Echte Push-Nachricht: Server schickt nur neutrale Texte, die persönlichen liegen lokal im Cache
self.addEventListener("push", e => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch { d = { title: e.data ? e.data.text() : "" } }
  e.waitUntil((async () => {
    let n = d
    try {
      const res = await (await caches.open("lab-push")).match("/__lab_push_plan.json")
      if (res) {
        const mine = (await res.json()).find(x => x.id === d.id)
        if (mine) n = { ...d, ...mine }
      }
    } catch {}
    await self.registration.showNotification(n.title || "Supplement Lab", {
      body: n.body || "", icon: "./icon-192.png", badge: "./icon-192.png", tag: n.tag || n.id || "lab",
      data: { url: n.url || "./", taken: n.taken },
      ...(n.taken ? { actions: [{ action: "lab-taken", title: "✓ Genommen" }] } : {}),
    })
  })())
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
