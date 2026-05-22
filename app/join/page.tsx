"use client"
import React, { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import AuthModal from "@/components/AuthModal"

function JoinInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const fromName  = params.get("from") || "Jemand"
  const fromPhoto = params.get("fromPhoto") || ""
  const name      = params.get("name") || ""
  const emoji     = params.get("emoji") || "👤"
  const listId    = params.get("list") || ""
  const itemCount = parseInt(params.get("items") || "0")

  const [showAuth, setShowAuth] = useState(false)
  const [accepted, setAccepted] = useState(false)

  function accept() {
    try {
      localStorage.setItem("true-list-id", listId)
      const existing = JSON.parse(localStorage.getItem("true-family-members") || "[]")
      const alreadyIn = existing.some((m: any) => m.name === fromName)
      if (!alreadyIn) {
        const myPhoto = localStorage.getItem("true-profile-photo") || undefined
        existing.unshift({ id: `inv-${listId}`, name: fromName, age: "", emoji, avatarUrl: myPhoto })
        localStorage.setItem("true-family-members", JSON.stringify(existing))
      }
    } catch {}
    setAccepted(true)
  }

  function onAuthSuccess() {
    accept()
    setTimeout(() => router.push("/home"), 1200)
  }

  const hasInitials = fromName.charAt(0).toUpperCase()

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--background)",
      color: "var(--text)",
      fontFamily: "system-ui,-apple-system,sans-serif",
    }}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={onAuthSuccess} />}

      {/* Header */}
      <nav style={{ padding: "0 1.25rem", height: 56, display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.05em", color: "var(--accent)", textDecoration: "none" }}>TRUE</Link>
      </nav>

      <div style={{ maxWidth: 420, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>

        {accepted ? (
          <div style={{ textAlign: "center", paddingTop: "3rem", animation: "fadeIn 0.3s ease" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 14 }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", marginBottom: 8 }}>Willkommen in der Liste!</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: 28 }}>Du wirst weitergeleitet…</div>
            <Link href="/home" style={{ display: "inline-block", background: "var(--accent)", color: "#000", borderRadius: 12, padding: "12px 28px", fontWeight: 800, textDecoration: "none" }}>
              Zur Einkaufsliste →
            </Link>
          </div>
        ) : (
          <>
            {/* Inviter card */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px", marginBottom: 24 }}>
              {fromPhoto ? (
                <img src={fromPhoto} alt={fromName} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--accent)" }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(46,204,138,0.15)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.2rem", color: "var(--accent)", flexShrink: 0 }}>
                  {hasInitials}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{fromName}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 2 }}>lädt dich zur gemeinsamen Einkaufsliste ein</div>
              </div>
            </div>

            {/* List preview */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1rem" }}>🛒</span>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Aktuelle Einkaufsliste</span>
                <span style={{ marginLeft: "auto", background: "rgba(46,204,138,0.12)", color: "var(--accent)", borderRadius: 99, padding: "2px 10px", fontSize: "0.68rem", fontWeight: 700, border: "1px solid rgba(46,204,138,0.25)" }}>
                  {itemCount} Artikel
                </span>
              </div>
              {/* Blurred preview rows */}
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
                {[...Array(Math.min(itemCount || 3, 4))].map((_, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: 1 - i * 0.15 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid var(--border)", flexShrink: 0 }} />
                    <div style={{ height: 12, borderRadius: 6, background: "var(--border)", width: `${65 + Math.random() * 30}%`, filter: "blur(4px)" }} />
                  </div>
                ))}
                {/* Lock overlay */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 10%, var(--surface) 70%)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    <span>🔒</span>
                    <span>Registriere dich, um die Liste zu sehen</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => setShowAuth(true)}
                style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", borderRadius: 14, padding: "15px", fontWeight: 800, fontSize: "1rem", cursor: "pointer" }}
              >
                ✓ Einladung annehmen & registrieren
              </button>
              <button
                onClick={() => { accept(); router.push("/home") }}
                style={{ width: "100%", background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 14, padding: "13px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}
              >
                Ohne Konto beitreten (nur auf diesem Gerät)
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 20, lineHeight: 1.6 }}>
              Mit einem Konto kannst du die Liste auf allen Geräten sehen und gemeinsam bearbeiten.
            </p>
          </>
        )}
      </div>

      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
        Lade…
      </div>
    }>
      <JoinInner />
    </Suspense>
  )
}
