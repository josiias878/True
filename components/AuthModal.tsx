"use client"
import { useState, useEffect, useRef } from "react"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"

interface Props {
  onClose: () => void
  onSuccess?: () => void
  defaultMode?: "login" | "register"
}

type Mode = "login" | "register" | "forgot"
type RegStep = "name" | "email" | "otp" | "password" | "goals" | "done"
type LoginMode = "password" | "otp"

const GOALS = [
  { id: "abnehmen",   label: "Abnehmen",          emoji: "🏃", hint: "Kalorienarme Alternativen" },
  { id: "muskel",     label: "Mehr Protein",       emoji: "💪", hint: "Proteinreiche Produkte" },
  { id: "familie",    label: "Familie & Kinder",   emoji: "👨‍👩‍👧", hint: "Sicher für die ganze Familie" },
  { id: "vegan",      label: "Vegan/Vegetarisch",  emoji: "🌱", hint: "Pflanzliche Produkte" },
  { id: "nachhaltig", label: "Nachhaltigkeit",     emoji: "🌍", hint: "Wenig CO₂ & Palmöl" },
  { id: "konzerne",   label: "Konzerne meiden",    emoji: "🚫", hint: "Unabhängige Hersteller" },
]

// Step index for progress bar (name=0, email=1, otp=2, password=3, goals=4)
const STEP_IDX: Record<Exclude<RegStep, "done">, number> = {
  name: 0, email: 1, otp: 2, password: 3, goals: 4
}
const TOTAL_STEPS = 5

function isIOS()        { return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) }
function isAndroid()    { return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent) }
function isStandalone() { return typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) }

export default function AuthModal({ onClose, onSuccess, defaultMode = "login" }: Props) {
  const { signInWithPassword, signInWithEmail, signInWithEmailLoginOnly, verifyEmailOtp, resetPassword, updateUserMetadata, updatePassword } = useSupabaseAuth()

  const [mode, setMode]         = useState<Mode>(defaultMode)
  const [visible, setVisible]   = useState(false)

  // Login state
  const [loginEmail, setLoginEmail]     = useState("")
  const [loginPw, setLoginPw]           = useState("")
  const [showPw, setShowPw]             = useState(false)
  const [loginMode, setLoginMode]       = useState<LoginMode>("password")
  const [loginOtp, setLoginOtp]         = useState("")
  const [loginOtpSent, setLoginOtpSent] = useState(false)

  // Register state
  const [regStep, setRegStep]       = useState<RegStep>(defaultMode === "register" ? "name" : "name")
  const [name, setName]             = useState("")
  const [regEmail, setRegEmail]     = useState("")
  const [otp, setOtp]               = useState("")
  const [regPw, setRegPw]           = useState("")
  const [showRegPw, setShowRegPw]   = useState(false)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [animDir, setAnimDir]       = useState<"forward" | "back">("forward")
  const [animKey, setAnimKey]       = useState(0)

  // Forgot state
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent]   = useState(false)

  // Shared
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState("")
  const [errorHint, setErrorHint]   = useState<"register" | null>(null)
  const [cooldown, setCooldown]     = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => setVisible(true), 10) }, [])
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 320) }, [mode, regStep, loginMode])

  function handleClose() { setVisible(false); setTimeout(onClose, 300) }
  function success()     { setVisible(false); setTimeout(() => { onSuccess?.(); onClose() }, 300) }

  function switchMode(m: Mode) {
    setError(""); setErrorHint(null)
    setMode(m)
    if (m === "register") { setRegStep("name"); setAnimKey(k => k + 1) }
    if (m === "login")    { setLoginMode("password"); setLoginOtpSent(false); setLoginOtp("") }
  }

  function goReg(next: RegStep, dir: "forward" | "back" = "forward") {
    setAnimDir(dir); setAnimKey(k => k + 1); setError(""); setRegStep(next)
  }

  // Clear other user's data on switch
  function handleUserSwitch(newUserId: string) {
    try {
      const prevId = localStorage.getItem("true-user-id")
      if (prevId && prevId !== newUserId) {
        ["true-profile","true-family-members","true-goals-v1","true-onboarded-v3",
         "true-homescreen-shown","true-premium","shopping-list-items-v1",
         "list-item-qty-v1","list-item-note-v1","true-scan-history","true-meidliste"
        ].forEach(k => localStorage.removeItem(k))
      }
      localStorage.setItem("true-user-id", newUserId)
    } catch {}
  }

  function restoreMetadata(meta: Record<string, unknown>) {
    try {
      if (meta.profile && !localStorage.getItem("true-profile"))
        localStorage.setItem("true-profile", JSON.stringify(meta.profile))
      if (meta.goals && !localStorage.getItem("true-goals-v1"))
        localStorage.setItem("true-goals-v1", JSON.stringify(meta.goals))
    } catch {}
  }

  // ── LOGIN: Password ──────────────────────────────────────────────────────────
  async function handleLogin() {
    setError("")
    if (!loginEmail.trim() || !loginPw) { setError("Bitte E-Mail und Passwort eingeben."); return }
    setLoading(true)
    const { data, error: e } = await signInWithPassword(loginEmail.trim(), loginPw) as any
    setLoading(false)
    if (e) {
      const msg = e.message ?? ""
      if (msg.includes("Invalid login") || msg.includes("invalid_credentials") || msg.includes("Invalid email or password")) {
        setError("E-Mail oder Passwort falsch — noch kein Konto?")
        setErrorHint("register")
      } else if (msg.includes("Email not confirmed") || msg.includes("email_not_confirmed")) {
        setError("E-Mail noch nicht bestätigt. Bitte prüfe dein Postfach.")
      } else {
        setError("Anmeldung fehlgeschlagen: " + (msg || "Unbekannter Fehler"))
      }
      return
    }
    if (data?.user?.id) handleUserSwitch(data.user.id)
    restoreMetadata(data?.user?.user_metadata ?? {})
    try { localStorage.setItem("true-onboarded-v3", "1") } catch {}
    success()
  }

  // ── LOGIN: OTP (optional, passwordless) ─────────────────────────────────────
  async function handleSendLoginOtp() {
    setError("")
    if (!loginEmail.trim()) { setError("Bitte E-Mail eingeben."); return }
    setLoading(true)
    const { error: e } = await signInWithEmailLoginOnly(loginEmail.trim()) as any
    setLoading(false)
    if (e) {
      if (e.message?.includes("Signups not allowed") || e.message?.includes("not allowed")) {
        setError("Diese E-Mail ist nicht registriert.")
        setErrorHint("register")
      } else {
        setError("Fehler beim Senden — " + e.message)
      }
      return
    }
    setLoginOtpSent(true)
    setCooldown(60)
  }

  async function handleVerifyLoginOtp() {
    setError("")
    if (loginOtp.length !== 6) { setError("Bitte den 6-stelligen Code eingeben."); return }
    setLoading(true)
    const { data, error: e } = await verifyEmailOtp(loginEmail.trim(), loginOtp) as any
    setLoading(false)
    if (e) { setError("Falscher Code — bitte nochmal versuchen."); return }
    if (data?.user?.id) handleUserSwitch(data.user.id)
    restoreMetadata(data?.user?.user_metadata ?? {})
    try { localStorage.setItem("true-onboarded-v3", "1") } catch {}
    success()
  }

  // ── REGISTER: Step 2 — Send OTP ─────────────────────────────────────────────
  async function handleSendRegOtp() {
    setError("")
    const email = regEmail.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Bitte eine gültige E-Mail eingeben."); return
    }
    setLoading(true)
    const { error: e } = await signInWithEmail(email) as any
    setLoading(false)
    if (e) { setError("Fehler beim Senden — " + e.message); return }
    goReg("otp")
    setCooldown(60)
  }

  // ── REGISTER: Step 3 — Verify OTP ───────────────────────────────────────────
  async function handleVerifyOtp() {
    setError("")
    if (otp.length !== 6) { setError("Bitte den 6-stelligen Code eingeben."); return }
    setLoading(true)
    const { data, error: e } = await verifyEmailOtp(regEmail.trim(), otp) as any
    setLoading(false)
    if (e) { setError("Falscher Code — bitte nochmal versuchen."); return }

    const userId    = data?.user?.id ?? ""
    const createdAt = new Date(data?.user?.created_at ?? 0).getTime()
    const isNew     = Date.now() - createdAt < 120_000

    handleUserSwitch(userId)

    if (!isNew) {
      // Existing account — just log in
      restoreMetadata(data?.user?.user_metadata ?? {})
      try { localStorage.setItem("true-onboarded-v3", "1") } catch {}
      success()
      return
    }

    // New account — save name to profile, continue to password step
    try {
      const raw     = localStorage.getItem("true-profile")
      const profile = raw ? JSON.parse(raw) : {}
      if (name.trim()) profile.vorname = name.trim()
      profile.email = regEmail.trim()
      localStorage.setItem("true-profile", JSON.stringify(profile))
    } catch {}

    goReg("password")
  }

  // ── REGISTER: Step 4 — Set Password (optional) ──────────────────────────────
  async function handleSetPassword() {
    if (regPw.length > 0 && regPw.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen haben."); return
    }
    setError("")
    if (regPw.length >= 6) {
      setLoading(true)
      await updatePassword(regPw)
      setLoading(false)
    }
    goReg("goals")
  }

  // ── REGISTER: Step 5 — Save Goals ───────────────────────────────────────────
  async function handleSaveGoals() {
    try {
      localStorage.setItem("true-goals-v1", JSON.stringify(selectedGoals))
      localStorage.setItem("true-onboarded-v3", "1")
      localStorage.setItem("true-homescreen-shown", "1")
    } catch {}

    // Save to Supabase metadata
    const raw     = localStorage.getItem("true-profile")
    const profile = raw ? JSON.parse(raw) : {}
    await updateUserMetadata({ profile, goals: selectedGoals })
    goReg("done")
  }

  // ── FORGOT ───────────────────────────────────────────────────────────────────
  async function handleForgot() {
    setError("")
    if (!forgotEmail.trim()) { setError("Bitte E-Mail eingeben."); return }
    setLoading(true)
    await resetPassword(forgotEmail.trim())
    setLoading(false)
    setForgotSent(true)
  }

  const regIdx = regStep !== "done" ? STEP_IDX[regStep] : TOTAL_STEPS

  return (
    <div onClick={() => { if (mode !== "register") handleClose() }} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: visible ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0)",
      backdropFilter: visible ? "blur(10px)" : "none",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      transition: "background 0.3s, backdrop-filter 0.3s",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(180deg,#161a16 0%,#0f120f 100%)",
        borderRadius: "32px 32px 0 0",
        padding: "0 0 calc(env(safe-area-inset-bottom,20px) + 24px)",
        width: "100%", maxWidth: 480,
        boxShadow: "0 -20px 80px rgba(0,0,0,0.5),0 -1px 0 rgba(255,255,255,0.06)",
        transform: visible ? "translateY(0)" : "translateY(110%)",
        transition: "transform 0.38s cubic-bezier(.16,1,.3,1)",
        maxHeight: "94dvh", overflowY: "auto",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 10px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
        </div>

        {/* ══════════════ LOGIN ══════════════ */}
        {mode === "login" && (
          <div style={{ padding: "8px 24px 0" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>👤</div>
              <h2 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: "1.3rem", color: "#fff" }}>Willkommen zurück</h2>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
                {loginMode === "password" ? "Melde dich mit deiner E-Mail an" : "Login per Code — kein Passwort nötig"}
              </p>
            </div>

            <input ref={inputRef} type="email" inputMode="email" value={loginEmail}
              onChange={e => { setLoginEmail(e.target.value); setError("") }}
              onKeyDown={e => e.key === "Enter" && (loginMode === "password" ? handleLogin() : !loginOtpSent && handleSendLoginOtp())}
              placeholder="deine@email.de"
              style={iStyle(false, "#2ECC8A")} />

            {loginMode === "password" && (
              <>
                <div style={{ position: "relative", marginBottom: 4 }}>
                  <input type={showPw ? "text" : "password"} value={loginPw}
                    onChange={e => { setLoginPw(e.target.value); setError("") }}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    placeholder="Passwort"
                    style={{ ...iStyle(!!error, "#2ECC8A"), paddingRight: 48, marginBottom: 0 }} />
                  <button onClick={() => setShowPw(s => !s)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
                {error && <Err text={error} />}
                {errorHint === "register" && (
                  <button onClick={() => switchMode("register")} style={{ display: "block", width: "100%", marginTop: 10, background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: 12, padding: "12px", color: "#2ECC8A", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", textAlign: "center" }}>
                    ✨ Noch kein Konto? Jetzt kostenlos registrieren →
                  </button>
                )}
                <Btn label={loading ? "Anmelden…" : "Anmelden →"} color="#2ECC8A" disabled={loading} onClick={handleLogin} style={{ marginTop: errorHint ? 8 : 14 }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <button onClick={() => switchMode("forgot")} style={linkBtn}>Passwort vergessen?</button>
                  <button onClick={() => { setLoginMode("otp"); setLoginOtpSent(false); setLoginOtp(""); setError(""); setErrorHint(null) }}
                    style={{ ...linkBtn, color: "#38BDF8" }}>Ohne Passwort →</button>
                </div>
              </>
            )}

            {loginMode === "otp" && !loginOtpSent && (
              <>
                {error && <Err text={error} />}
                {errorHint === "register" && (
                  <button onClick={() => switchMode("register")} style={{ display: "block", width: "100%", marginTop: 10, background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: 12, padding: "12px", color: "#2ECC8A", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", textAlign: "center" }}>
                    ✨ Noch kein Konto? Jetzt kostenlos registrieren →
                  </button>
                )}
                <Btn label={loading ? "Code wird gesendet…" : "Code per E-Mail senden →"} color="#38BDF8" disabled={loading} onClick={handleSendLoginOtp} style={{ marginTop: errorHint ? 8 : 4 }} />
                <button onClick={() => { setLoginMode("password"); setError(""); setErrorHint(null) }} style={linkBtn}>← Mit Passwort anmelden</button>
              </>
            )}

            {loginMode === "otp" && loginOtpSent && (
              <>
                <div style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, fontSize: "0.83rem", color: "#38BDF8" }}>
                  ✉️ Code gesendet an {loginEmail}
                </div>
                <OtpInput value={loginOtp} onChange={v => { setLoginOtp(v); setError("") }} onComplete={handleVerifyLoginOtp} color="#38BDF8" />
                {error && <Err text={error} />}
                <Btn label={loading ? "Wird geprüft…" : "Bestätigen ✓"} color="#38BDF8" disabled={loading || loginOtp.length !== 6} onClick={handleVerifyLoginOtp} style={{ marginTop: 18 }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <button onClick={() => { setLoginMode("password"); setLoginOtpSent(false); setLoginOtp(""); setError("") }} style={linkBtn}>← Zurück</button>
                  <button onClick={() => { setLoginOtp(""); handleSendLoginOtp() }} disabled={cooldown > 0}
                    style={{ ...linkBtn, color: cooldown > 0 ? "rgba(255,255,255,0.2)" : "#38BDF8" }}>
                    {cooldown > 0 ? `Erneut (${cooldown}s)` : "Code erneut senden"}
                  </button>
                </div>
              </>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }}>Noch kein Konto?</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            </div>
            <button onClick={() => switchMode("register")} style={{
              display: "block", width: "100%", padding: "13px",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16, color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
            }}>Jetzt registrieren ✨</button>
            <button onClick={handleClose} style={{ ...linkBtn, marginTop: 8, display: "block", width: "100%", textAlign: "center" }}>Abbrechen</button>
          </div>
        )}

        {/* ══════════════ FORGOT ══════════════ */}
        {mode === "forgot" && (
          <div style={{ padding: "8px 24px 0", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔓</div>
            <h2 style={{ margin: "0 0 6px", fontWeight: 900, fontSize: "1.3rem", color: "#fff" }}>Passwort zurücksetzen</h2>
            {forgotSent ? (
              <>
                <p style={{ color: "#2ECC8A", fontWeight: 700, margin: "16px 0 24px" }}>✅ E-Mail gesendet! Schau in dein Postfach.</p>
                <Btn label="Zurück zum Login" color="#2ECC8A" disabled={false} onClick={() => { setForgotSent(false); switchMode("login") }} />
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 20px", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>Wir senden dir einen Link zum Zurücksetzen.</p>
                <input ref={inputRef} type="email" inputMode="email" value={forgotEmail}
                  onChange={e => { setForgotEmail(e.target.value); setError("") }}
                  placeholder="deine@email.de" style={iStyle(!!error, "#2ECC8A")} />
                {error && <Err text={error} />}
                <Btn label={loading ? "Wird gesendet…" : "Link senden →"} color="#2ECC8A" disabled={loading} onClick={handleForgot} />
                <button onClick={() => switchMode("login")} style={linkBtn}>← Zurück</button>
              </>
            )}
          </div>
        )}

        {/* ══════════════ REGISTER ══════════════ */}
        {mode === "register" && regStep !== "done" && (
          <>
            {/* Header with progress */}
            <div style={{ padding: "4px 24px 0", textAlign: "center" }}>
              <h2 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: "1.2rem", color: "#fff" }}>
                {regStep === "name"     && "Wie heißt du?"}
                {regStep === "email"    && "Deine E-Mail"}
                {regStep === "otp"     && "Code bestätigen"}
                {regStep === "password" && "Passwort festlegen"}
                {regStep === "goals"    && "Was sind deine Ziele?"}
              </h2>
              <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>
                Schritt {regIdx + 1} von {TOTAL_STEPS}
              </p>

              {/* Timeline progress bar */}
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <div key={i} style={{
                    height: 5, flex: 1, borderRadius: 3,
                    background: i < regIdx ? "#2ECC8A" : i === regIdx ? "#2ECC8A" : "rgba(255,255,255,0.1)",
                    opacity: i === regIdx ? 1 : i < regIdx ? 0.6 : 0.3,
                    transition: "all 0.4s cubic-bezier(.16,1,.3,1)",
                    boxShadow: i === regIdx ? "0 0 8px #2ECC8A80" : "none",
                  }} />
                ))}
              </div>
            </div>

            <div key={animKey} style={{ padding: "0 24px", animation: `${animDir === "forward" ? "slideRight" : "slideLeft"} 0.26s cubic-bezier(.16,1,.3,1)` }}>

              {/* ── Step 1: Name ── */}
              {regStep === "name" && (
                <div>
                  <div style={{ textAlign: "center", fontSize: "2.5rem", marginBottom: 16 }}>👋</div>
                  <input ref={inputRef} type="text" value={name}
                    onChange={e => { setName(e.target.value); setError("") }}
                    onKeyDown={e => e.key === "Enter" && goReg("email")}
                    placeholder="Dein Vorname (optional)"
                    style={iStyle(false, "#2ECC8A")} />
                  <Btn label="Weiter →" color="#2ECC8A" disabled={false} onClick={() => goReg("email")} />
                  <button onClick={() => goReg("email")} style={{ display: "block", width: "100%", marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "0.82rem", cursor: "pointer", padding: "8px 0", textAlign: "center" }}>
                    Überspringen
                  </button>
                  <button onClick={() => switchMode("login")} style={{ ...linkBtn, display: "block", width: "100%", textAlign: "center", marginTop: 6 }}>← Zurück zum Login</button>
                </div>
              )}

              {/* ── Step 2: Email ── */}
              {regStep === "email" && (
                <div>
                  <div style={{ textAlign: "center", fontSize: "2.5rem", marginBottom: 16 }}>📧</div>
                  <input ref={inputRef} type="email" inputMode="email" value={regEmail}
                    onChange={e => { setRegEmail(e.target.value); setError("") }}
                    onKeyDown={e => e.key === "Enter" && handleSendRegOtp()}
                    placeholder="deine@email.de"
                    style={iStyle(!!error, "#2ECC8A")} />
                  {error && <Err text={error} />}
                  <Btn label={loading ? "Code wird gesendet…" : "Code senden →"} color="#2ECC8A"
                    disabled={loading || !regEmail.trim()} onClick={handleSendRegOtp} />
                  <button onClick={() => goReg("name", "back")} style={{ ...linkBtn, display: "block", width: "100%", textAlign: "center", marginTop: 8 }}>← Zurück</button>
                  <p style={{ textAlign: "center", fontSize: "0.68rem", color: "rgba(255,255,255,0.18)", marginTop: 10, lineHeight: 1.6 }}>
                    🔒 Wir senden dir einen einmaligen Bestätigungs-Code
                  </p>
                </div>
              )}

              {/* ── Step 3: OTP ── */}
              {regStep === "otp" && (
                <div>
                  <div style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 20, fontSize: "0.83rem", color: "#2ECC8A", textAlign: "center" }}>
                    ✉️ Code an <strong>{regEmail}</strong> gesendet
                  </div>
                  <OtpInput value={otp} onChange={v => { setOtp(v); setError("") }} onComplete={handleVerifyOtp} color="#2ECC8A" />
                  {error && <Err text={error} />}
                  <Btn label={loading ? "Wird geprüft…" : "Bestätigen ✓"} color="#2ECC8A"
                    disabled={loading || otp.length !== 6} onClick={handleVerifyOtp} style={{ marginTop: 18 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                    <button onClick={() => { goReg("email", "back"); setOtp("") }} style={linkBtn}>← Zurück</button>
                    <button onClick={() => { setOtp(""); handleSendRegOtp() }} disabled={cooldown > 0}
                      style={{ ...linkBtn, color: cooldown > 0 ? "rgba(255,255,255,0.2)" : "#2ECC8A" }}>
                      {cooldown > 0 ? `Erneut (${cooldown}s)` : "Code erneut senden"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 4: Password (optional) ── */}
              {regStep === "password" && (
                <div>
                  <div style={{ textAlign: "center", fontSize: "2.5rem", marginBottom: 16 }}>🔐</div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "12px 14px", marginBottom: 16, fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                    Mit einem Passwort kannst du dich einfach mit E-Mail + Passwort anmelden. Du kannst es auch später in deinem Profil einrichten.
                  </div>
                  <div style={{ position: "relative" }}>
                    <input ref={inputRef} type={showRegPw ? "text" : "password"} value={regPw}
                      onChange={e => { setRegPw(e.target.value); setError("") }}
                      onKeyDown={e => e.key === "Enter" && handleSetPassword()}
                      placeholder="Passwort (min. 6 Zeichen)"
                      style={{ ...iStyle(!!error, "#A78BFA"), paddingRight: 48, marginBottom: 0 }} />
                    <button onClick={() => setShowRegPw(s => !s)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>
                      {showRegPw ? "🙈" : "👁"}
                    </button>
                  </div>
                  {error && <Err text={error} />}
                  <Btn label={loading ? "Wird gespeichert…" : "Passwort speichern →"} color="#A78BFA" disabled={loading || regPw.length < 6} onClick={handleSetPassword} style={{ marginTop: 12 }} />
                  <button onClick={() => goReg("goals")} style={{ display: "block", width: "100%", marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "0.82rem", cursor: "pointer", padding: "8px 0", textAlign: "center" }}>
                    Überspringen — App ohne Passwort nutzen
                  </button>
                </div>
              )}

              {/* ── Step 5: Goals ── */}
              {regStep === "goals" && (
                <div>
                  <div style={{ textAlign: "center", fontSize: "2.5rem", marginBottom: 8 }}>🎯</div>
                  <p style={{ textAlign: "center", fontSize: "0.84rem", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
                    Wähle was zu dir passt — mehrere möglich
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {GOALS.map(g => {
                      const active = selectedGoals.includes(g.id)
                      return (
                        <button key={g.id}
                          onClick={() => setSelectedGoals(prev => prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                          style={{
                            background: active ? "rgba(46,204,138,0.12)" : "rgba(255,255,255,0.04)",
                            border: `1.5px solid ${active ? "#2ECC8A" : "rgba(255,255,255,0.08)"}`,
                            borderRadius: 14, padding: "11px 14px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 12,
                            textAlign: "left", transition: "all 0.2s",
                            boxShadow: active ? "0 0 14px rgba(46,204,138,0.12)" : "none",
                          }}
                        >
                          <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{g.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: active ? "#2ECC8A" : "#fff" }}>{g.label}</div>
                            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{g.hint}</div>
                          </div>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                            border: `2px solid ${active ? "#2ECC8A" : "rgba(255,255,255,0.15)"}`,
                            background: active ? "#2ECC8A" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.65rem", color: "#000", fontWeight: 900,
                          }}>
                            {active ? "✓" : ""}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <Btn label="Los geht's 🚀" color="#2ECC8A" disabled={false} onClick={handleSaveGoals} />
                  <button onClick={() => { goReg("done") }} style={{ display: "block", width: "100%", marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "0.82rem", cursor: "pointer", padding: "8px 0", textAlign: "center" }}>
                    Überspringen
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════ DONE — Phone Tour ══════════════ */}
        {mode === "register" && regStep === "done" && (
          <PhoneTour name={name.trim()} onFinish={success} isIOS={isIOS()} isAndroid={isAndroid()} isStandalone={isStandalone()} />
        )}

        <style>{`
          @keyframes slideRight   { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
          @keyframes slideLeft    { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
          @keyframes popIn        { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
          @keyframes bounce       { 0%{transform:scale(0.3) rotate(-15deg)} 55%{transform:scale(1.3) rotate(8deg)} 75%{transform:scale(0.9) rotate(-3deg)} 100%{transform:scale(1) rotate(0)} }
          @keyframes confettiDrop { 0%{opacity:0;transform:translateY(-30px) rotate(-20deg) scale(0.5)} 70%{opacity:1;transform:translateY(4px) rotate(10deg) scale(1.15)} 100%{opacity:1;transform:translateY(0) rotate(5deg) scale(1)} }
          @keyframes scanLine     { 0%,100%{top:22%} 50%{top:68%} }
          @keyframes pulse        { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
          input::placeholder,textarea::placeholder { color:rgba(255,255,255,0.2)!important }
          input:focus,select:focus { outline:none }
          select option { background:#161a16;color:#fff }
        `}</style>
      </div>
    </div>
  )
}

// ── Phone Mockup Tour ─────────────────────────────────────────────────────────
const TOUR_SCREENS = [
  {
    color: "#38BDF8",
    title: "Produkt scannen",
    desc: "Kamera auf Barcode — in Sekunden siehst du wer dahinter steckt und ob du kaufen solltest.",
    screen: (
      <div style={{ background: "#0a0f0a", borderRadius: 12, padding: "14px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: "rgba(56,189,248,0.12)", border: "2px solid #38BDF8", borderRadius: 10, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ fontSize: "2rem" }}>📷</div>
          <div style={{ position: "absolute", top: 8, left: 8, right: 8, height: 2, background: "#38BDF8", opacity: 0.6, animation: "scanLine 2s ease-in-out infinite" }} />
        </div>
        <div style={{ background: "rgba(46,204,138,0.15)", border: "1px solid #2ECC8A", borderRadius: 10, padding: "8px 10px" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#2ECC8A" }}>✅ Nestlé · KitKat</div>
          <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Score: 23/100 · Palmöl ⚠️</div>
        </div>
      </div>
    ),
  },
  {
    color: "#2ECC8A",
    title: "Einkaufsliste",
    desc: "Produkte direkt nach dem Scan hinzufügen. Liste ist auf allen Geräten synchron.",
    screen: (
      <div style={{ background: "#0a0f0a", borderRadius: 12, padding: "12px 10px", height: "100%", display: "flex", flexDirection: "column", gap: 7 }}>
        {[
          { e: "🥛", n: "Landliebe Milch", ok: true },
          { e: "🍫", n: "KitKat", ok: false },
          { e: "🥦", n: "Brokkoli Bio", ok: true },
        ].map((item, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1rem" }}>{item.e}</span>
            <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.7)", flex: 1 }}>{item.n}</span>
            <span style={{ fontSize: "0.65rem", color: item.ok ? "#2ECC8A" : "#ff4455" }}>{item.ok ? "✓" : "⚠️"}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    color: "#A78BFA",
    title: "Community",
    desc: "Tausche Tipps, teile Alternativen und entdecke was andere bewusst kaufen.",
    screen: (
      <div style={{ background: "#0a0f0a", borderRadius: 12, padding: "12px 10px", height: "100%", display: "flex", flexDirection: "column", gap: 7 }}>
        {[
          { avatar: "📰", name: "TRUE Bot", text: "Nestlé verletzt erneut Palmöl-Richtlinien…", tag: "Palmöl" },
          { avatar: "✍️", name: "Eva M.", text: "Warum Zucker so gefährlich ist…", tag: "Analyse" },
        ].map((post, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: "0.85rem" }}>{post.avatar}</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{post.name}</span>
              <span style={{ marginLeft: "auto", fontSize: "0.55rem", color: "#A78BFA", background: "rgba(167,139,250,0.15)", padding: "1px 5px", borderRadius: 4 }}>{post.tag}</span>
            </div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{post.text}</div>
          </div>
        ))}
      </div>
    ),
  },
]

function PhoneTour({ name, onFinish, isIOS, isAndroid, isStandalone }: {
  name: string; onFinish: () => void
  isIOS: boolean; isAndroid: boolean; isStandalone: boolean
}) {
  const [screen, setScreen] = useState(-1) // -1 = confetti welcome
  const isLast = screen === TOUR_SCREENS.length - 1

  if (screen === -1) {
    return (
      <div style={{ padding: "20px 24px 0", textAlign: "center", animation: "popIn 0.45s cubic-bezier(.16,1,.3,1)" }}>
        {/* Big confetti emoji */}
        <div style={{ fontSize: "4rem", marginBottom: 10, display: "inline-block", animation: "bounce 0.8s cubic-bezier(.16,1,.3,1)" }}>🎉</div>
        {/* Confetti row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 18, fontSize: "1.6rem" }}>
          {["🌟","✨","🎊","💚","🌱","🎈","✅"].map((e, i) => (
            <span key={i} style={{
              display: "inline-block",
              animation: `confettiDrop 0.55s ${i * 0.07}s cubic-bezier(.16,1,.3,1) both`,
            }}>{e}</span>
          ))}
        </div>
        <h2 style={{ margin: "0 0 8px", fontWeight: 900, fontSize: "1.5rem", color: "#fff" }}>
          {name ? `Willkommen, ${name}!` : "Du bist dabei!"}
        </h2>
        <p style={{ margin: "0 0 6px", fontSize: "0.92rem", color: "#2ECC8A", fontWeight: 700 }}>
          🌱 Dein Konto ist aktiv
        </p>
        <p style={{ margin: "0 0 24px", fontSize: "0.82rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
          Kurze Einführung? Wir zeigen dir in 3 Schritten was TRUE kann.
        </p>
        <Btn label="TRUE kennenlernen →" color="#2ECC8A" disabled={false} onClick={() => setScreen(0)} />
        <button onClick={onFinish} style={{ display: "block", width: "100%", marginTop: 10, background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "0.82rem", cursor: "pointer", padding: "8px 0" }}>
          Direkt loslegen
        </button>
      </div>
    )
  }

  const s = TOUR_SCREENS[screen]
  return (
    <div key={screen} style={{ padding: "10px 24px 0", animation: "slideRight 0.28s cubic-bezier(.16,1,.3,1)" }}>
      {/* Progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
        {TOUR_SCREENS.map((_, i) => (
          <div key={i} style={{ width: i === screen ? 24 : 6, height: 5, borderRadius: 3, background: i === screen ? s.color : i < screen ? `${s.color}50` : "rgba(255,255,255,0.12)", transition: "all 0.3s" }} />
        ))}
      </div>

      {/* Phone mockup */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <div style={{
          width: 160, height: 270,
          background: "#111", borderRadius: 28,
          border: `2px solid ${s.color}40`,
          padding: "12px 6px 10px",
          boxShadow: `0 0 40px ${s.color}20`,
          display: "flex", flexDirection: "column",
        }}>
          {/* Phone notch */}
          <div style={{ width: 40, height: 5, background: "#222", borderRadius: 3, margin: "0 auto 10px" }} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            {s.screen}
          </div>
          {/* Phone home bar */}
          <div style={{ width: 36, height: 3, background: "#333", borderRadius: 2, margin: "8px auto 0" }} />
        </div>
      </div>

      {/* Text */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "#fff", marginBottom: 8 }}>{s.title}</div>
        <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.65 }}>{s.desc}</div>
      </div>

      {/* PWA hint on last card */}
      {isLast && !isStandalone && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 14px", marginBottom: 14, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#fff", marginBottom: 4 }}>📲 Zum Homescreen hinzufügen</div>
          {isIOS ? (
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
              Teilen <strong style={{ color: "#38BDF8" }}>↑</strong> → <strong style={{ color: "#38BDF8" }}>„Zum Home-Bildschirm"</strong>
            </div>
          ) : isAndroid ? (
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
              Menü <strong style={{ color: "#38BDF8" }}>⋮</strong> → <strong style={{ color: "#38BDF8" }}>„Zum Startbildschirm"</strong>
            </div>
          ) : (
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Menü → „App installieren"</div>
          )}
        </div>
      )}

      <Btn label={isLast ? "Los geht's 🚀" : "Weiter →"} color={s.color} disabled={false}
        onClick={() => isLast ? onFinish() : setScreen(c => c + 1)} />
      <button onClick={() => setScreen(c => c <= 0 ? -1 : c - 1)}
        style={{ display: "block", width: "100%", marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "0.82rem", cursor: "pointer", padding: "8px 0", textAlign: "center" }}>
        ← Zurück
      </button>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function OtpInput({ value, onChange, onComplete, color }: { value: string; onChange: (v: string) => void; onComplete: () => void; color: string }) {
  const refs = [useRef<HTMLInputElement>(null),useRef<HTMLInputElement>(null),useRef<HTMLInputElement>(null),useRef<HTMLInputElement>(null),useRef<HTMLInputElement>(null),useRef<HTMLInputElement>(null)]

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (value[i]) { onChange(value.slice(0,i)+value.slice(i+1)) }
      else if (i > 0) { refs[i-1].current?.focus(); onChange(value.slice(0,i-1)+value.slice(i)) }
    } else if (e.key === "Enter" && value.length === 6) onComplete()
  }
  function handleChange(i: number, raw: string) {
    const d = raw.replace(/\D/g,"").slice(-1); if (!d) return
    const next = value.slice(0,i)+d+value.slice(i+1); onChange(next.slice(0,6))
    if (i < 5) refs[i+1].current?.focus(); else if (next.length === 6) setTimeout(onComplete, 100)
  }
  function handlePaste(e: React.ClipboardEvent) {
    const p = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6)
    if (p) { onChange(p); refs[Math.min(p.length,5)].current?.focus(); if (p.length===6) setTimeout(onComplete,100) }
    e.preventDefault()
  }
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {([0,1,2,3,4,5] as const).map(i => {
        const f = !!value[i]
        return <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1}
          value={value[i]??""} onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)} onPaste={handlePaste} onFocus={e => e.target.select()}
          autoFocus={i===0}
          style={{ width:48,height:60,borderRadius:14,border:`2px solid ${f?color:"rgba(255,255,255,0.1)"}`,background:f?`${color}12`:"rgba(255,255,255,0.04)",fontSize:"1.7rem",fontWeight:800,color:f?color:"rgba(255,255,255,0.6)",textAlign:"center",outline:"none",boxShadow:f?`0 0 16px ${color}25`:"none",transition:"all 0.18s cubic-bezier(.16,1,.3,1)",caretColor:color }} />
      })}
    </div>
  )
}

function Err({text}:{text:string}){
  return <div style={{background:"rgba(255,68,85,0.08)",border:"1px solid rgba(255,68,85,0.2)",borderRadius:12,padding:"10px 14px",marginTop:10,fontSize:"0.83rem",color:"#ff5566",lineHeight:1.5}}>{text}</div>
}

function Btn({label,color,disabled,onClick,style:extra}:{label:string;color:string;disabled:boolean;onClick:()=>void;style?:React.CSSProperties}){
  return <button onClick={onClick} disabled={disabled} style={{display:"block",width:"100%",marginTop:14,background:disabled?"rgba(255,255,255,0.06)":`linear-gradient(135deg,${color},${color}bb)`,border:"none",borderRadius:18,padding:"16px",fontWeight:800,fontSize:"1rem",color:disabled?"rgba(255,255,255,0.2)":"#000",cursor:disabled?"not-allowed":"pointer",boxShadow:disabled?"none":`0 4px 20px ${color}35`,transition:"all 0.2s",...extra}}>{label}</button>
}

const linkBtn: React.CSSProperties = {background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:"0.82rem",cursor:"pointer",padding:"8px 0",fontWeight:500}

function iStyle(hasError: boolean, accent: string): React.CSSProperties {
  return {width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.05)",border:`1.5px solid ${hasError?"rgba(255,68,85,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:16,padding:"15px 18px",fontSize:"1.05rem",color:"#fff",outline:"none",marginBottom:8,transition:"border-color 0.2s",caretColor:accent}
}
