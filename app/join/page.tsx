"use client"
import React, { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

function JoinInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const fromName  = params.get("from") || "Jemand"
  const fromPhoto = params.get("fromPhoto") || ""
  const emoji     = params.get("emoji") || "👤"
  const listId    = params.get("list") || ""

  const [step, setStep]     = useState(1) // 1=name, 2=photo
  const [name, setName]     = useState("")
  const [photo, setPhoto]   = useState<string | null>(null)
  const [ready, setReady]   = useState(false)

  useEffect(() => {
    try {
      const p = localStorage.getItem("true-profile")
      if (p) {
        const parsed = JSON.parse(p)
        const existing = parsed.name || parsed.vorname
        if (existing) setName(existing)
      }
      const existingPhoto = localStorage.getItem("true-profile-photo")
      if (existingPhoto) setPhoto(existingPhoto)
    } catch {}
    setReady(true)
  }, [])

  async function finishJoin(finalPhoto: string | null) {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      // Save profile
      const existing = (() => { try { return JSON.parse(localStorage.getItem("true-profile") || "{}") } catch { return {} } })()
      localStorage.setItem("true-profile", JSON.stringify({ ...existing, name: trimmed, vorname: trimmed }))
      localStorage.setItem("true-guest-name", trimmed)
      if (finalPhoto) localStorage.setItem("true-profile-photo", finalPhoto)

      // Share the same list ID as the host
      if (listId) localStorage.setItem("true-list-id", listId)

      // Save invite info → home shows "Eingeladen von X" banner
      localStorage.setItem("true-invited-by", fromName)
      if (fromPhoto) localStorage.setItem("true-invited-by-photo", fromPhoto)
      localStorage.setItem("true-invited-by-emoji", emoji)

      // Welcome flag for confetti
      localStorage.setItem("true-new-user", "1")

      // Write to Supabase list_members so HOST sees the join in realtime
      if (supabase && listId) {
        await supabase.from("list_members").upsert({
          list_id: listId,
          member_name: trimmed,
          member_photo: finalPhoto || "",
          member_emoji: emoji,
          joined_at: new Date().toISOString(),
        }, { onConflict: "list_id,member_name" }).then(() => {})
      }
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
    <div style={{ minHeight: "100dvh", background: "#0d1117", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Inviter card */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 20, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          {fromPhoto
            ? <img src={fromPhoto} alt={fromName} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid #2ecc8a", flexShrink: 0 }} />
            : <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(46,204,138,0.15)", border: "2px solid #2ecc8a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.3rem", color: "#2ecc8a", flexShrink: 0 }}>{initials}</div>
          }
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff", marginBottom: 2 }}>🎉 {fromName} lädt dich ein</div>
            <div style={{ fontSize: "0.75rem", color: "#8b949e" }}>zur gemeinsamen Einkaufsliste bei TRUE</div>
          </div>
        </div>

        {/* Step card */}
        <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 20, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ height: 4, borderRadius: 2, background: "#2ecc8a", flex: 1 }} />
            <div style={{ height: 4, borderRadius: 2, background: step === 2 ? "#2ecc8a" : "#21262d", flex: 1 }} />
            <span style={{ fontSize: "0.65rem", color: "#8b949e", fontWeight: 700, whiteSpace: "nowrap" }}>SCHRITT {step} VON 2</span>
          </div>

          {/* ── STEP 1: Name ── */}
          {step === 1 && <>
            <div>
              <div style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 4 }}>Wie heißt du?</div>
              <div style={{ fontSize: "0.78rem", color: "#8b949e" }}>So wirst du in der Liste angezeigt</div>
            </div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && name.trim() && setStep(2)}
              placeholder="Dein Name…"
              autoFocus
              style={{ background: "#0d1117", border: `1.5px solid ${name.trim() ? "#2ecc8a" : "#30363d"}`, borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: "1rem", outline: "none", transition: "border-color 0.15s" }}
            />
            <button onClick={() => name.trim() && setStep(2)} disabled={!name.trim()}
              style={{ width: "100%", background: name.trim() ? "#2ecc8a" : "#21262d", color: name.trim() ? "#000" : "#8b949e", border: "none", borderRadius: 14, padding: "15px", fontWeight: 800, fontSize: "1rem", cursor: name.trim() ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
              Weiter →
            </button>
          </>}

          {/* ── STEP 2: Photo ── */}
          {step === 2 && <>
            <div>
              <div style={{ fontWeight: 900, fontSize: "1.2rem", marginBottom: 4 }}>📸 Profilbild</div>
              <div style={{ fontSize: "0.78rem", color: "#8b949e" }}>Damit erkennt dich {fromName} in der Liste</div>
            </div>

            <label style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#0d1117", border: `2.5px solid ${photo ? "#2ecc8a" : "#30363d"}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "border-color 0.2s" }}>
                {photo
                  ? <img src={photo} alt="Vorschau" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: "1.8rem" }}>👤</span>
                }
              </div>
              <span style={{ fontSize: "0.82rem", color: "#2ecc8a", fontWeight: 700 }}>
                {photo ? "Anderes Foto wählen" : "📷 Foto auswählen"}
              </span>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = ev => {
                  const img = new Image()
                  img.onload = () => {
                    const canvas = document.createElement("canvas")
                    const MAX = 400
                    const scale = Math.min(1, MAX / Math.max(img.width, img.height))
                    canvas.width = img.width * scale
                    canvas.height = img.height * scale
                    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
                    setPhoto(canvas.toDataURL("image/jpeg", 0.7))
                  }
                  img.src = ev.target?.result as string
                }
                reader.readAsDataURL(file)
              }} />
            </label>

            <button onClick={() => finishJoin(photo)}
              style={{ width: "100%", background: "#2ecc8a", color: "#000", border: "none", borderRadius: 14, padding: "15px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", boxShadow: "0 0 30px rgba(46,204,138,0.25)" }}>
              {photo ? "Beitreten →" : "Ohne Foto beitreten →"}
            </button>
            {photo && (
              <button onClick={() => finishJoin(null)} style={{ background: "none", border: "none", color: "#8b949e", fontSize: "0.75rem", cursor: "pointer", padding: 4 }}>
                Überspringen
              </button>
            )}
          </>}
        </div>

        <p style={{ textAlign: "center", fontSize: "0.7rem", color: "#8b949e", margin: 0 }}>
          Kostenlos · Kein Konto erforderlich
        </p>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>Lade…</div>}>
      <JoinInner />
    </Suspense>
  )
}
