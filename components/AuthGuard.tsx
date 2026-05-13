"use client"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"

// AuthGuard allows guest access — no login required.
// Login is optional (for cloud sync, profile, etc.)
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading } = useSupabaseAuth()

  // Show spinner while auth state is being determined
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

  // Guest & logged-in users both get access
  return <>{children}</>
}
