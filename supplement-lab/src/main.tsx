import React from "react"
import { createRoot } from "react-dom/client"
import { inject } from "@vercel/analytics"
import "./app.css"
import LabApp from "@/app/lab/LabApp"
import { initNative } from "./native"
import { initHealth } from "./health"
import { allowPush } from "@/lib/labPush"

// System-Theme live übernehmen (solange keins fest gewählt ist)
try {
  const mq = matchMedia("(prefers-color-scheme: light)")
  mq.addEventListener("change", e => {
    if (localStorage.getItem("lab-theme")) return
    document.documentElement.classList.toggle("light", e.matches)
    document.documentElement.classList.toggle("dark", !e.matches)
  })
} catch {}

async function boot() {
  const native = await initNative().catch(() => false)
  await initHealth().catch(() => false)
  // Anonyme Öffnungs-Zählung (nur Web/PWA, kein Tracking-Profil, keine Health-Daten) —
  // sichtbar als aggregierte Zahl im Vercel-Dashboard, nicht pro Person
  if (!native) inject()
  // Web/PWA: echte Push-Nachrichten (native App nutzt lokale Benachrichtigungen)
  allowPush(!native)
  // Web/PWA: Service Worker für Offline & Benachrichtigungen
  if (!native && "serviceWorker" in navigator) {
    // Sobald eine neue Version die Kontrolle übernimmt, die Seite neu laden —
    // sonst bleibt eine schon offene Installation (z. B. vom Home-Bildschirm)
    // auf dem alten Stand hängen, bis man sie manuell schließt und neu öffnet.
    // Beim allerersten Besuch gibt es noch keinen alten Stand → kein Neuladen (sonst flackert die Seite einmal)
    const hadController = !!navigator.serviceWorker.controller
    let reloading = false
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading || !hadController) return
      reloading = true
      window.location.reload()
    })
    navigator.serviceWorker.register("./sw.js").catch(() => {})
  }
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <LabApp />
    </React.StrictMode>,
  )
}
boot()
