"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"

// AuthGuard — Login erforderlich. Gäste werden zur Landingpage weitergeleitet.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabaseAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [loading, user, router])

  // Spinner während Auth-Check oder wenn kein User
  if (loading || !user) return (
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

  return <>{children}</>
}
