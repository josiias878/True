"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"
import AuthModal from "@/components/AuthModal"

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useSupabaseAuth()
  const [ready, setReady] = useState(false)

  // If already logged in → go straight to /home
  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/home")
      } else {
        setReady(true)
      }
    }
  }, [user, loading, router])

  return (
    <div style={{
      minHeight: "100dvh",
      background: "var(--background)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* TRUE Logo */}
      <div style={{
        fontSize: "2.2rem",
        fontWeight: 900,
        color: "#2ECC8A",
        letterSpacing: "-1px",
        marginBottom: 8,
      }}>
        TRUE
      </div>
      <div style={{
        fontSize: "0.8rem",
        color: "var(--text-dim)",
        marginBottom: 40,
        letterSpacing: "0.05em",
      }}>
        Bewusst einkaufen.
      </div>

      {/* Spinner while checking session */}
      {!ready && (
        <>
          <div style={{
            width: 28, height: 28,
            border: "3px solid var(--border)",
            borderTop: "3px solid #2ECC8A",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </>
      )}

      {/* Login modal — if closed without login, go back to landing page */}
      {ready && (
        <AuthModal
          onClose={() => router.replace("/")}
          onSuccess={() => router.replace("/home")}
        />
      )}
    </div>
  )
}
