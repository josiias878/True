"use client"
import { useEffect, useState } from "react"

export default function ForceRefresh() {
  const [status, setStatus] = useState("Wird bereinigt…")

  useEffect(() => {
    async function nuke() {
      try {
        // 1. Unregister all service workers
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations()
          await Promise.all(regs.map(r => r.unregister()))
        }

        // 2. Clear ALL caches
        if ("caches" in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(k => caches.delete(k)))
        }

        // 3. Clear version keys so fresh versions are detected
        try {
          localStorage.removeItem("true-app-version")
          localStorage.removeItem("true-build")
        } catch {}

        setStatus("✅ Fertig! Weiterleitung…")

        // 4. Hard redirect to home with cache-bust param
        setTimeout(() => {
          window.location.replace("/home?_fresh=" + Date.now())
        }, 800)
      } catch (e) {
        setStatus("Weiterleitung…")
        setTimeout(() => { window.location.replace("/home") }, 800)
      }
    }
    nuke()
  }, [])

  return (
    <div style={{
      minHeight: "100dvh", background: "#0d1117",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif", color: "#fff", gap: 20,
    }}>
      <div style={{ fontSize: "2.5rem" }}>🔄</div>
      <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{status}</div>
      <div style={{ fontSize: "0.75rem", color: "#8b949e" }}>Service Worker & Cache werden geleert</div>
    </div>
  )
}
