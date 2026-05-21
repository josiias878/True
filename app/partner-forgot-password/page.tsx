"use client"
import { useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

function ForgotPasswordInner() {
  const router  = useRouter()
  const [email, setEmail]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError("Supabase nicht konfiguriert."); return }
    setError("")
    setLoading(true)
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          // After clicking the link in the email, land on the reset page
          redirectTo: `${window.location.origin}/auth/reset-password?from=partner`,
        }
      )
      if (resetErr) throw resetErr
      setSent(true)
    } catch (err: any) {
      setError(err?.message ?? "Fehler beim Senden der E-Mail.")
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
        .send-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "-0.05em", color: "#2ECC8A", marginBottom: "0.25rem" }}>TRUE</div>
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>Passwort zurücksetzen</div>
      </div>

      <div style={{
        width: "100%", maxWidth: "420px",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "24px", padding: "2rem",
      }}>
        {sent ? (
          /* ── Success state ── */
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📬</div>
            <h2 style={{ fontWeight: 900, fontSize: "1.15rem", marginBottom: "0.5rem" }}>E-Mail verschickt!</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Wir haben einen Reset-Link an <strong style={{ color: "#fff" }}>{email}</strong> geschickt.
              Bitte schau auch im Spam-Ordner nach.
            </p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", lineHeight: 1.6 }}>
              Kein E-Mail erhalten?{" "}
              <button onClick={() => setSent(false)} style={{ background: "none", border: "none", color: "#2ECC8A", fontWeight: 700, cursor: "pointer", fontSize: "0.75rem", padding: 0 }}>
                Nochmal versuchen
              </button>
            </p>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: "1.15rem", margin: "0 0 0.35rem" }}>Passwort vergessen?</h2>
              <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "0.82rem", margin: 0, lineHeight: 1.5 }}>
                Gib deine E-Mail-Adresse ein — wir senden dir einen Link zum Zurücksetzen.
              </p>
            </div>

            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.4rem", display: "block" }}>
                E-Mail
              </label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="deine@firma.de" style={inputStyle}
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
              type="submit" disabled={loading} className="send-btn"
              style={{
                background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000",
                border: "none", borderRadius: "12px", padding: "1rem",
                fontWeight: 800, fontSize: "0.95rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "filter 0.15s, transform 0.15s",
              }}
            >
              {loading ? "Wird gesendet…" : "Reset-Link senden →"}
            </button>

            <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>
              <a href="/partner-login" style={{ color: "#2ECC8A", textDecoration: "none", fontWeight: 700 }}>
                ← Zurück zum Login
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default function PartnerForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#061410", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)" }}>
        Lade…
      </div>
    }>
      <ForgotPasswordInner />
    </Suspense>
  )
}
