"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    async function handleCallback() {
      if (!supabase) { setStatus("error"); return }

      const params    = new URLSearchParams(window.location.search)
      const tokenHash = params.get("token_hash")
      const type      = params.get("type") as "email" | "magiclink" | "recovery" | null
      const hash      = window.location.hash

      try {
        if (tokenHash && type) {
          // Password reset — don't verify here, let the reset page handle it
          if (type === "recovery") {
            router.replace(`/auth/reset-password?token_hash=${tokenHash}&type=recovery`)
            return
          }
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
          if (error) throw error
        } else if (hash) {
          // Check if it's a recovery flow from hash (legacy)
          if (hash.includes("type=recovery")) {
            router.replace(`/auth/reset-password${hash}`)
            return
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setStatus("success")
          setTimeout(() => router.replace("/home"), 800)
        } else {
          setStatus("error")
        }
      } catch {
        setStatus("error")
      }
    }

    handleCallback()
  }, [router])

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0f0a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#2ECC8A", marginBottom: 20 }}>TRUE</div>
        {status === "loading" && (
          <>
            <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #2ECC8A", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.88rem" }}>Wird verarbeitet…</div>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✅</div>
            <div style={{ color: "#2ECC8A", fontWeight: 700 }}>Erfolgreich!</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", marginTop: 6 }}>Weiterleitung…</div>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>❌</div>
            <div style={{ color: "#ff4455", fontWeight: 700 }}>Link ungültig oder abgelaufen</div>
            <button onClick={() => router.replace("/login")}
              style={{ marginTop: 16, background: "#2ECC8A", color: "#000", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 700, cursor: "pointer" }}>
              Neu anmelden →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
