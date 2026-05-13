"use client"
import React, { useEffect, useState } from "react"

export default function InstallButton({ style }: { style?: React.CSSProperties }) {
  const [prompt, setPrompt]   = useState<any>(null)
  const [isIOS, setIsIOS]     = useState(false)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)

  useEffect(() => {
    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    // Detect already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true)
      return
    }

    // Android/Chrome — capture install prompt
    const handler = (e: any) => { e.preventDefault(); setPrompt(e) }
    window.addEventListener("beforeinstallprompt", handler)
    window.addEventListener("appinstalled", () => setInstalled(true))
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  // Already installed or dismissed
  if (installed || dismissed) return null

  async function handleClick() {
    if (isIOS) { setShowIOSHint(h => !h); return }
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === "accepted") setInstalled(true)
    setPrompt(null)
  }

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={handleClick} style={{ flex: 1,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.18)",
        color: "#fff", borderRadius: "12px",
        padding: "0.9rem 2rem",
        fontWeight: 700, cursor: "pointer",
        fontSize: "1rem",
        display: "flex", alignItems: "center",
        gap: "0.6rem",
        backdropFilter: "blur(12px)",
        ...style,
      }}>
        📲 Als App installieren
      </button>
      <button onClick={() => setDismissed(true)} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>×</button>

      {/* iOS hint */}
      {showIOSHint && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 12px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "14px", padding: "1rem 1.25rem",
          width: "260px", zIndex: 50,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          fontSize: "0.82rem", color: "rgba(255,255,255,0.75)",
          lineHeight: 1.7, textAlign: "center",
        }}>
          <div style={{ fontSize: "1.4rem", marginBottom: "0.4rem" }}>📱</div>
          <strong style={{ color: "#fff" }}>Auf iPhone/iPad:</strong><br />
          Tippe unten auf das <strong style={{ color: "#2ECC8A" }}>Teilen-Symbol</strong> und dann auf<br />
          <strong style={{ color: "#2ECC8A" }}>"Zum Home-Bildschirm"</strong>
          <div style={{ marginTop: "0.6rem", fontSize: "1.5rem" }}>
            ⬆️ → 📲
          </div>
          {/* Arrow */}
          <div style={{
            position: "absolute", bottom: "-6px", left: "50%",
            width: "12px", height: "12px",
            background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)",
            borderTop: "none", borderLeft: "none",
            transform: "translateX(-50%) rotate(45deg)",
          }} />
        </div>
      )}
    </div>
  )
}
