"use client"
import React, { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function JoinInner() {
  const params    = useSearchParams()
  const router    = useRouter()
  const fromName  = params.get("from") || "Jemand"
  const fromPhoto = params.get("fromPhoto") || ""
  const emoji     = params.get("emoji") || "👤"
  const listId    = params.get("list") || ""

  useEffect(() => {
    try {
      // Save list ID so this device shares the same list
      if (listId) localStorage.setItem("true-list-id", listId)
      // Save invite info so home page can show the banner
      localStorage.setItem("true-invited-by", fromName)
      if (fromPhoto) localStorage.setItem("true-invited-by-photo", fromPhoto)
      localStorage.setItem("true-invited-by-emoji", emoji)
      // Mark as new user so confetti + welcome banner show
      if (!localStorage.getItem("true-welcome-seen")) {
        localStorage.setItem("true-new-user", "1")
      }
    } catch {}
    router.replace("/home")
  }, [])

  return (
    <div style={{ minHeight: "100dvh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontFamily: "system-ui,sans-serif" }}>
      Wird weitergeleitet…
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
