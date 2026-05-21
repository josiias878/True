"use client"
import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

function PartnerRegisterInner() {
  const router = useRouter()

  const [email, setEmail]             = useState("")
  const [password, setPassword]       = useState("")
  const [password2, setPassword2]     = useState("")
  const [companyName, setCompanyName] = useState("")
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError("Supabase nicht konfiguriert."); return }
    if (password !== password2) { setError("Passwörter stimmen nicht überein."); return }
    if (password.length < 8) { setError("Passwort muss mindestens 8 Zeichen haben."); return }
    if (!companyName.trim()) { setError("Firmenname erforderlich."); return }
    setError("")
    setLoading(true)
    try {
      // 1. Server-side: create user + partner profile (bypasses RLS, auto-confirms email)
      const res = await fetch("/api/partner-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          companyName: companyName.trim(),
          contactEmail: email.trim(),
          tier: "trial",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Registrierung fehlgeschlagen")

      // 2. Sign in client-side so the partner-dashboard sees an active session
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInErr) throw signInErr

      router.push("/partner-dashboard")
    } catch (err: any) {
      setError(err?.message ?? "Registrierung fehlgeschlagen.")
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
        .reg-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.05em", color: "#2ECC8A", marginBottom: "0.25rem" }}>TRUE</div>
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>Partner werden</div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "420px",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "24px", padding: "2rem",
      }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <h2 style={{ fontWeight: 900, fontSize: "1.2rem", margin: "0 0 0.35rem" }}>Account erstellen</h2>
            <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.82rem", margin: 0 }}>
              In 30 Sekunden startklar — kein Abo nötig.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Firmenname</label>
            <input
              type="text" required autoComplete="organization"
              value={companyName} onChange={e => setCompanyName(e.target.value)}
              placeholder="Meine GmbH" style={inputStyle}
            />
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
              type="password" required autoComplete="new-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen" style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Passwort bestätigen</label>
            <input
              type="password" required autoComplete="new-password"
              value={password2} onChange={e => setPassword2(e.target.value)}
              placeholder="Passwort wiederholen" style={inputStyle}
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
            type="submit" disabled={loading} className="reg-btn"
            style={{
              background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000",
              border: "none", borderRadius: "12px", padding: "1rem",
              fontWeight: 800, fontSize: "0.95rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "filter 0.15s, transform 0.15s",
            }}
          >
            {loading ? "Wird erstellt…" : "Kostenlos starten →"}
          </button>

          <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>
            Bereits Partner?{" "}
            <a href="/partner-login" style={{ color: "#2ECC8A", textDecoration: "none", fontWeight: 700 }}>
              Anmelden
            </a>
          </p>

          <p style={{ textAlign: "center", fontSize: "0.68rem", color: "rgba(255,255,255,0.2)", margin: 0, lineHeight: 1.6 }}>
            Mit der Registrierung stimmst du unseren{" "}
            <a href="/datenschutz" style={{ color: "#2ECC8A", textDecoration: "none" }}>Datenschutzbestimmungen</a> zu.
          </p>
        </form>
      </div>

      <p style={{ marginTop: "1.5rem", fontSize: "0.75rem" }}>
        <a href="/partner" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>← Zurück zur Partner-Seite</a>
      </p>
    </div>
  )
}

export default function PartnerRegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#061410", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)" }}>
        Lade…
      </div>
    }>
      <PartnerRegisterInner />
    </Suspense>
  )
}
