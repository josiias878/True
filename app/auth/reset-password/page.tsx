"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ResetPasswordPage() {
  const router = useRouter()

  const [status, setStatus]     = useState<"loading" | "ready" | "success" | "error">("loading")
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [showPw, setShowPw]     = useState(false)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState("")

  useEffect(() => {
    async function init() {
      if (!supabase) { setStatus("error"); return }

      try {
        // ── PKCE flow: token_hash in query params ──────────────────────
        const params    = new URLSearchParams(window.location.search)
        const tokenHash = params.get("token_hash")
        const type      = params.get("type")

        if (tokenHash && type === "recovery") {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          })
          if (error) throw error
          setStatus("ready")
          return
        }

        // ── Legacy hash flow: #access_token=...&type=recovery ──────────
        const hash = window.location.hash
        if (hash.includes("access_token") && hash.includes("type=recovery")) {
          // Supabase auto-detects this via onAuthStateChange
          await new Promise(r => setTimeout(r, 800))
          const { data } = await supabase.auth.getSession()
          if (data.session) { setStatus("ready"); return }
        }

        // ── Already have session (came from callback redirect) ─────────
        const { data } = await supabase.auth.getSession()
        if (data.session) { setStatus("ready"); return }

        setStatus("error")
      } catch {
        setStatus("error")
      }
    }
    init()
  }, [])

  async function handleSave() {
    setErr("")
    if (password.length < 6) { setErr("Passwort muss mindestens 6 Zeichen haben."); return }
    if (password !== password2) { setErr("Passwörter stimmen nicht überein."); return }
    if (!supabase) return
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) { setErr("Fehler: " + error.message); return }
    setStatus("success")
    setTimeout(() => router.replace("/home"), 1800)
  }

  const strength = password.length >= 12 ? 4 : password.length >= 8 ? 3 : password.length >= 6 ? 2 : password.length > 0 ? 1 : 0
  const strengthColors = ["","#ff4455","#ffb400","#2ECC8A","#2ECC8A"]
  const strengthLabels = ["","Schwach","OK","Gut","Stark 💪"]

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0f0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>

        <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#2ECC8A", marginBottom: 32, letterSpacing: "-0.05em" }}>TRUE</div>

        {/* ── Loading ── */}
        {status === "loading" && (
          <>
            <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.08)", borderTop: "3px solid #2ECC8A", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.88rem" }}>Link wird geprüft…</div>
          </>
        )}

        {/* ── Form ── */}
        {status === "ready" && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "28px 24px" }}>
            <div style={{ fontSize: "2.4rem", marginBottom: 12 }}>🔐</div>
            <h2 style={{ margin: "0 0 6px", color: "#fff", fontWeight: 900, fontSize: "1.25rem" }}>Neues Passwort</h2>
            <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.4)", fontSize: "0.84rem" }}>
              Wähle ein sicheres Passwort für deinen Account.
            </p>

            {/* Password 1 */}
            <div style={{ position: "relative", marginBottom: 10 }}>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setErr("") }}
                placeholder="Neues Passwort (min. 6 Zeichen)"
                style={inputStyle}
                autoFocus
              />
              <button onClick={() => setShowPw(s => !s)} style={eyeBtn}>{showPw ? "🙈" : "👁"}</button>
            </div>

            {/* Strength bar */}
            {strength > 0 && (
              <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 10 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColors[strength] : "rgba(255,255,255,0.1)", transition: "background 0.2s" }} />
                ))}
                <span style={{ fontSize: "0.65rem", color: strengthColors[strength] || "rgba(255,255,255,0.3)", whiteSpace: "nowrap", marginLeft: 4 }}>
                  {strengthLabels[strength]}
                </span>
              </div>
            )}

            {/* Password 2 */}
            <input
              type={showPw ? "text" : "password"}
              value={password2}
              onChange={e => { setPassword2(e.target.value); setErr("") }}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="Passwort wiederholen"
              style={{ ...inputStyle, marginBottom: 4 }}
            />

            {/* Match indicator */}
            {password2.length > 0 && (
              <div style={{ fontSize: "0.72rem", color: password === password2 ? "#2ECC8A" : "#ff4455", textAlign: "left", marginBottom: 12 }}>
                {password === password2 ? "✓ Passwörter stimmen überein" : "✗ Passwörter stimmen nicht überein"}
              </div>
            )}

            {err && (
              <div style={{ background: "rgba(255,68,85,0.1)", border: "1px solid rgba(255,68,85,0.2)", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem", color: "#ff5566", marginBottom: 12, textAlign: "left" }}>
                {err}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || password.length < 6 || password !== password2}
              style={{
                width: "100%", padding: "15px", border: "none", borderRadius: 16,
                fontWeight: 800, fontSize: "1rem", cursor: saving ? "wait" : "pointer",
                background: saving || password.length < 6 || password !== password2
                  ? "rgba(255,255,255,0.06)"
                  : "linear-gradient(135deg,#2ECC8A,#1aaa6e)",
                color: saving || password.length < 6 || password !== password2
                  ? "rgba(255,255,255,0.2)" : "#000",
                boxShadow: password.length >= 6 && password === password2
                  ? "0 4px 20px rgba(46,204,138,0.3)" : "none",
                transition: "all 0.2s",
              }}
            >
              {saving ? "Wird gespeichert…" : "Passwort speichern ✓"}
            </button>
          </div>
        )}

        {/* ── Success ── */}
        {status === "success" && (
          <>
            <div style={{ fontSize: "3rem", marginBottom: 14 }}>✅</div>
            <div style={{ color: "#2ECC8A", fontWeight: 800, fontSize: "1.1rem", marginBottom: 6 }}>Passwort gespeichert!</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>Du wirst weitergeleitet…</div>
          </>
        )}

        {/* ── Error ── */}
        {status === "error" && (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: 14 }}>❌</div>
            <div style={{ color: "#ff4455", fontWeight: 700, marginBottom: 6 }}>Link ungültig oder abgelaufen</div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", marginBottom: 20 }}>
              Bitte fordere einen neuen Reset-Link an.
            </p>
            <button onClick={() => router.replace("/login")}
              style={{ background: "#2ECC8A", color: "#000", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 800, cursor: "pointer" }}>
              Zurück zum Login →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.05)",
  border: "1.5px solid rgba(255,255,255,0.1)",
  borderRadius: 14, padding: "14px 44px 14px 16px",
  fontSize: "1rem", color: "#fff", outline: "none",
  caretColor: "#2ECC8A", marginBottom: 0,
}
const eyeBtn: React.CSSProperties = {
  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer",
  fontSize: "0.9rem", color: "rgba(255,255,255,0.3)",
}
