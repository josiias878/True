"use client"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

function PartnerLoginInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const redirectTo = searchParams.get("redirect") || "/partner-dashboard"

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError("Supabase nicht konfiguriert."); return }
    setError("")
    setLoading(true)
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInErr) throw signInErr
      router.push(redirectTo)
    } catch (err: any) {
      const msg = err?.message ?? ""
      if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials") || msg.toLowerCase().includes("password")) {
        setError("E-Mail oder Passwort falsch.")
      } else {
        setError(msg || "Login fehlgeschlagen.")
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px", padding: "0.9rem 1rem",
    color: "#fff", fontSize: "0.95rem", outline: "none",
    fontFamily: "system-ui,-apple-system,sans-serif",
  }
  const labelStyle: React.CSSProperties = {
    fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
    marginBottom: "0.4rem", display: "block",
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(180deg, #061410 0%, #091c13 30%, #0b1e16 60%, #0d1a12 100%)",
      fontFamily: "system-ui,-apple-system,sans-serif",
      color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "2rem 1rem",
    }}>
      <style>{`
        input::placeholder { color: rgba(255,255,255,0.25); }
        input:focus { border-color: #2ECC8A !important; }
        .login-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.05em", color: "#2ECC8A", marginBottom: "0.25rem" }}>TRUE</div>
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>Partner-Login</div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "420px",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "24px", padding: "2rem",
      }}>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <h2 style={{ fontWeight: 900, fontSize: "1.2rem", margin: "0 0 0.35rem" }}>Willkommen zurück</h2>
            <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.82rem", margin: 0 }}>
              Melde dich in deinem Partner-Dashboard an.
            </p>
          </div>

          <div>
            <label style={labelStyle}>E-Mail</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="deine@firma.de" style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Passwort</label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(255,68,85,0.1)", border: "1px solid rgba(255,68,85,0.35)",
              borderRadius: "10px", padding: "0.75rem 1rem",
              fontSize: "0.82rem", color: "#ff7788",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading} className="login-btn"
            style={{
              background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000",
              border: "none", borderRadius: "12px", padding: "1rem",
              fontWeight: 800, fontSize: "0.95rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "filter 0.15s, transform 0.15s",
            }}
          >
            {loading ? "Anmelden…" : "Anmelden →"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>
              Noch kein Account?{" "}
              <a href="/partner-register" style={{ color: "#2ECC8A", textDecoration: "none", fontWeight: 700 }}>
                Registrieren
              </a>
            </span>
            <a href="/partner-forgot-password" style={{ color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>
              Passwort vergessen
            </a>
          </div>
        </form>
      </div>

      <p style={{ marginTop: "1.5rem", fontSize: "0.75rem" }}>
        <a href="/partner" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>← Zurück zur Partner-Seite</a>
      </p>
    </div>
  )
}

export default function PartnerLoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#061410", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)" }}>
        Lade…
      </div>
    }>
      <PartnerLoginInner />
    </Suspense>
  )
}
