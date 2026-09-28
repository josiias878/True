import React from "react"
import { createRoot } from "react-dom/client"
import "./app.css"
import LabApp from "@/app/lab/LabApp"
import { initNative } from "./native"
import { initHealth } from "./health"

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
  // Web/PWA: Service Worker für Offline & Benachrichtigungen
  if (!native && "serviceWorker" in navigator) {
    // Sobald eine neue Version die Kontrolle übernimmt, die Seite neu laden —
    // sonst bleibt eine schon offene Installation (z. B. vom Home-Bildschirm)
    // auf dem alten Stand hängen, bis man sie manuell schließt und neu öffnet.
    let reloading = false
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return
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
