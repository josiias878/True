"use client"
import React, { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function JoinInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const fromName  = params.get("from") || "Jemand"
  const fromPhoto = params.get("fromPhoto") || ""
  const emoji     = params.get("emoji") || "👤"
  const listId    = params.get("list") || ""

  const [name, setName] = useState("")
  const [ready, setReady] = useState(false)

  // Check if user already has a name saved
  useEffect(() => {
    try {
      const p = localStorage.getItem("true-profile")
      if (p) {
        const parsed = JSON.parse(p)
        const existing = parsed.name || parsed.vorname
        if (existing) setName(existing)
      }
      const guestName = localStorage.getItem("true-guest-name")
      if (guestName && !name) setName(guestName)
    } catch {}
    setReady(true)
  }, [])

  function join() {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      // Save name as profile
      const existing = (() => { try { return JSON.parse(localStorage.getItem("true-profile") || "{}") } catch { return {} } })()
      const photo = localStorage.getItem("true-profile-photo") || ""
      const updated = { ...existing, name: trimmed, vorname: trimmed }
      localStorage.setItem("true-profile", JSON.stringify(updated))
      localStorage.setItem("true-guest-name", trimmed)

      // Save list ID to share the same list
      if (listId) localStorage.setItem("true-list-id", listId)

      // Save invite info for home banner
      localStorage.setItem("true-invited-by", fromName)
      if (fromPhoto) localStorage.setItem("true-invited-by-photo", fromPhoto)
      localStorage.setItem("true-invited-by-emoji", emoji)

      // Add the invitee (self) to the family list so they appear as a member
      // Also add the host so they see the host in their list
      const members = (() => { try { return JSON.parse(localStorage.getItem("true-family-members") || "[]") } catch { return [] } })()
      const alreadyHasHost = members.some((m: any) => m.name === fromName)
      if (!alreadyHasHost) {
        members.unshift({ id: `host-${listId}`, name: fromName, age: "", emoji, avatarUrl: fromPhoto || "" })
        localStorage.setItem("true-family-members", JSON.stringify(members))
      }

      // Mark as joining so home shows the joined notification
      localStorage.setItem("true-just-joined", trimmed)
      localStorage.setItem("true-just-joined-photo", photo)

      // Welcome confetti
      localStorage.setItem("true-new-user", "1")
    } catch {}
    router.replace("/home")
  }

  if (!ready) return (
    <div style={{ minHeight: "100dvh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
      Lade…
    </div>
  )

  const initials = fromName.charAt(0).toUpperCase()

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0d1117",
      color: "#fff",
      fontFamily: "system-ui,-apple-system,sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Inviter card */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 20, padding: "20px", display: "flex", alignItems: "center", gap: 14 }}>
          {fromPhoto
            ? <img src={fromPhoto} alt={fromName} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid #2ecc8a", flexShrink: 0 }} />
            : <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(46,204,138,0.15)", border: "2px solid #2ecc8a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.3rem", color: "#2ecc8a", flexShrink: 0 }}>
                {initials}
              </div>
          }
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff", marginBottom: 2 }}>
              🎉 {fromName} lädt dich ein
            </div>
            <div style={{ fontSize: "0.78rem", color: "#8b949e", lineHeight: 1.5 }}>
              zur gemeinsamen Einkaufsliste bei TRUE
            </div>
          </div>
        </div>

        {/* Name input */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 20, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              SCHRITT 1 VON 1
            </div>
            <div style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 4 }}>Wie heißt du?</div>
            <div style={{ fontSize: "0.8rem", color: "#8b949e" }}>So wirst du in der Liste angezeigt</div>
          </div>

          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && join()}
            placeholder="Dein Name…"
            autoFocus
            style={{
              background: "#0d1117",
              border: `1.5px solid ${name.trim() ? "#2ecc8a" : "#30363d"}`,
              borderRadius: 12,
              padding: "14px 16px",
              color: "#fff",
              fontSize: "1rem",
              outline: "none",
              transition: "border-color 0.15s",
            }}
          />

          <button
            onClick={join}
            disabled={!name.trim()}
            style={{
              width: "100%",
              background: name.trim() ? "#2ecc8a" : "#21262d",
              color: name.trim() ? "#000" : "#8b949e",
              border: "none",
              borderRadius: 14,
              padding: "15px",
              fontWeight: 800,
              fontSize: "1rem",
              cursor: name.trim() ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            Einkaufsliste beitreten →
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#8b949e", margin: 0, lineHeight: 1.6 }}>
          Kostenlos · Keine App nötig · Kein Konto erforderlich
        </p>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
        Lade…
      </div>
    }>
      <JoinInner />
    </Suspense>
  )
}
