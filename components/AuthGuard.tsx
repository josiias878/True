"use client"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabaseAuth()
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear any pending redirect when auth state changes
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!loading && !user) {
      // Small buffer (300ms) to handle the race condition where
      // verifyOtp just succeeded but onAuthStateChange hasn't fired yet
      timerRef.current = setTimeout(() => {
        router.replace("/login")
      }, 300)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user, loading, router])

  // Loading spinner
  if (loading) return (
    <div style={{
      minHeight: "100dvh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--background)",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--accent)" }}>TRUE</div>
        <div style={{
          width: 28, height: 28,
          border: "3px solid var(--border)",
          borderTop: "3px solid var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (!user) return null

  return <>{children}</>
}
