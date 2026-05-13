"use client"
import { useState, useEffect, useRef } from "react"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"

interface Props {
  onClose: () => void
  onSuccess?: () => void
  defaultMode?: "login" | "register"
}

type Mode = "login" | "register" | "forgot"
type RegStep = "name" | "birth" | "email" | "otp" | "done"
type LoginMode = "password" | "otp"

const CURRENT_YEAR = new Date().getFullYear()
const BIRTH_YEARS  = Array.from({ length: 80 }, (_, i) => CURRENT_YEAR - 13 - i)
const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"]

const STEP_NUM: Record<RegStep, number> = { name: 0, birth: 1, email: 2, otp: 3, done: 3 }
const STEP_META: Record<RegStep, { emoji: string; color: string; title: string }> = {
  name:  { emoji: "👋", color: "#2ECC8A", title: "Wie heißt du?" },
  birth: { emoji: "🎂", color: "#A78BFA", title: "Wann hast du Geburtstag?" },
  email: { emoji: "📧", color: "#38BDF8", title: "Deine E-Mail-Adresse" },
  otp:   { emoji: "🔑", color: "#FB923C", title: "Code bestätigen" },
  done:  { emoji: "🎉", color: "#2ECC8A", title: "Willkommen!" },
}

function daysUntilBirthday(day: number, month: number): number {
  const now = new Date()
  let next  = new Date(now.getFullYear(), month - 1, day)
  if (next.getTime() - now.getTime() < 0) next = new Date(now.getFullYear() + 1, month - 1, day)
  return Math.ceil((next.getTime() - now.getTime()) / 86400000)
}

function isIOS()        { return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) }
function isAndroid()    { return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent) }
function isStandalone() { return typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true) }

export default function AuthModal({ onClose, onSuccess, defaultMode = "login" }: Props) {
  const { signInWithPassword, signInWithEmail, signInWithEmailLoginOnly, verifyEmailOtp, resetPassword, updateUserMetadata } = useSupabaseAuth()

  const [mode, setMode]         = useState<Mode>(defaultMode)
  const [visible, setVisible]   = useState(false)

  // Login
  const [loginEmail, setLoginEmail]     = useState("")
  const [loginPw, setLoginPw]           = useState("")
  const [showPw, setShowPw]             = useState(false)
  const [loginMode, setLoginMode]       = useState<LoginMode>("password")
  const [loginOtp, setLoginOtp]         = useState("")
  const [loginOtpSent, setLoginOtpSent] = useState(false)

  // Register
  const [regStep, setRegStep]       = useState<RegStep>(defaultMode === "register" ? "email" : "name")
  const [name, setName]             = useState("")
  const [birthDay, setBirthDay]     = useState("")
  const [birthMonth, setBirthMonth] = useState("")
  const [birthYear, setBirthYear]   = useState("")
  const [regEmail, setRegEmail]     = useState("")
  const [otp, setOtp]               = useState("")
  const [animDir, setAnimDir]       = useState<"forward" | "back">("forward")
  const [animKey, setAnimKey]       = useState(0)

  // Forgot
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent]   = useState(false)

  // Shared
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [errorHint, setErrorHint] = useState<"register" | null>(null)
  const [cooldown, setCooldown] = useState(0)

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
    if (m === "register") { setRegStep("email"); setAnimKey(k => k + 1) }
    if (m === "login")    { setLoginMode("password"); setLoginOtpSent(false); setLoginOtp("") }
  }

  function goReg(next: RegStep, dir: "forward" | "back" = "forward") {
    setAnimDir(dir); setAnimKey(k => k + 1); setError(""); setRegStep(next)
  }

  // Wenn ein anderer User einloggt → alle nutzerspezifischen Daten löschen
  function handleUserSwitch(newUserId: string) {
    try {
      const prevId = localStorage.getItem("true-user-id")
      if (prevId && prevId !== newUserId) {
        const keysToRemove = [
          "true-profile",
          "true-family-members",
          "true-goals-v1",
          "true-onboarded-v3",
          "true-homescreen-shown",
          "true-premium",
          "shopping-list-items-v1",
          "list-item-qty-v1",
          "list-item-note-v1",
          "true-scan-history",
          "true-meidliste",
        ]
        keysToRemove.forEach(k => localStorage.removeItem(k))
      }
      localStorage.setItem("true-user-id", newUserId)
    } catch {}
  }

  // Restore profile from Supabase metadata → localStorage (nur wenn lokal leer)
  function restoreMetadata(meta: Record<string, unknown>) {
    try {
      if (meta.profile && !localStorage.getItem("true-profile")) {
        localStorage.setItem("true-profile", JSON.stringify(meta.profile))
      }
      if (meta.goals && !localStorage.getItem("true-goals-v1")) {
        localStorage.setItem("true-goals-v1", JSON.stringify(meta.goals))
      }
    } catch {}
  }

  // ── LOGIN: Passwort ───────────────────────────────────────────────────────
  async function handleLogin() {
    setError("")
    if (!loginEmail.trim() || !loginPw) { setError("Bitte E-Mail und Passwort eingeben."); return }
    setLoading(true)
    const { data, error: e } = await signInWithPassword(loginEmail.trim(), loginPw) as any
    setLoading(false)
    if (e) {
      const msg = e.message ?? ""
      if (msg.includes("Invalid login") || msg.includes("invalid_credentials") || msg.includes("Invalid email or password")) {
        setError("E-Mail oder Passwort falsch — oder noch kein Konto?")
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

  // ── LOGIN: OTP senden (nur für existierende Accounts) ────────────────────
  async function handleSendLoginOtp() {
    setError("")
    if (!loginEmail.trim()) { setError("Bitte E-Mail eingeben."); return }
    setLoading(true)
    const { error: e } = await signInWithEmailLoginOnly(loginEmail.trim()) as any
    setLoading(false)
    if (e) {
      if (e.message?.includes("Signups not allowed") || e.message?.includes("not allowed") || e.message?.includes("signup")) {
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

  // ── LOGIN: OTP bestätigen ─────────────────────────────────────────────────
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

  // ── REGISTER: OTP senden ─────────────────────────────────────────────────
  async function handleSendRegOtp() {
    setError("")
    const email = regEmail.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Bitte eine gültige E-Mail eingeben."); return }
    setLoading(true)
    const { error: e } = await signInWithEmail(email) as any
    setLoading(false)
    if (e) { setError("Fehler beim Senden — " + e.message); return }
    goReg("otp")
    setCooldown(60)
  }

  // ── REGISTER: OTP bestätigen ──────────────────────────────────────────────
  async function handleVerifyOtp() {
    setError("")
    if (otp.length !== 6) { setError("Bitte den 6-stelligen Code eingeben."); return }
    setLoading(true)
    const { data, error: e } = await verifyEmailOtp(regEmail.trim(), otp) as any
    setLoading(false)
    if (e) { setError("Falscher Code — bitte nochmal versuchen."); return }

    const userId    = data?.user?.id ?? ""
    const createdAt = new Date(data?.user?.created_at ?? 0).getTime()
    const isNewAccount = Date.now() - createdAt < 120_000  // < 2 Minuten = frisch erstellt

    handleUserSwitch(userId)

    if (!isNewAccount) {
      // Konto existierte bereits — einfach einloggen, keine neue Registrierung
      restoreMetadata(data?.user?.user_metadata ?? {})
      try { localStorage.setItem("true-onboarded-v3", "1") } catch {}
      setError("") // reset
      // Kleiner Hinweis dann success
      setLoading(false)
      success()
      return
    }

    // Neues Konto — Profil speichern und Tour zeigen
    const profileData = saveProfile()
    await updateUserMetadata({ profile: profileData })
    goReg("done")
  }

  function saveProfile(): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    try {
      const raw     = localStorage.getItem("true-profile")
      const profile = raw ? JSON.parse(raw) : {}
      if (name.trim())  profile.vorname   = name.trim()
      if (birthDay && birthMonth && birthYear) {
        profile.birthDay = birthDay; profile.birthMonth = birthMonth; profile.birthYear = birthYear
      }
      profile.email = regEmail.trim()
      localStorage.setItem("true-profile", JSON.stringify(profile))
      localStorage.setItem("true-onboarded-v3", "1")
      localStorage.setItem("true-homescreen-shown", "1")
      Object.assign(result, profile)
    } catch {}
    return result
  }

  // ── FORGOT PASSWORD ───────────────────────────────────────────────────────
  async function handleForgot() {
    setError("")
    if (!forgotEmail.trim()) { setError("Bitte E-Mail eingeben."); return }
    setLoading(true)
    await resetPassword(forgotEmail.trim())
    setLoading(false)
    setForgotSent(true)
  }

  const bdMsg = (() => {
    if (!birthDay || !birthMonth) return null
    const d = parseInt(birthDay), m = parseInt(birthMonth)
    if (isNaN(d) || isNaN(m)) return null
    const days = daysUntilBirthday(d, m)
    if (days === 0) return { text: "Heute ist dein Geburtstag!! 🎂🥳", color: "#FB923C" }
    if (days === 1) return { text: "Morgen ist dein Geburtstag — schon aufgeregt? 😄", color: "#A78BFA" }
    if (days <= 7)  return { text: `In nur ${days} Tagen hast du Geburtstag 🎈`, color: "#A78BFA" }
    return { text: `In ${days} Tagen hast du Geburtstag — TRUE erinnert dich 😉`, color: "#2ECC8A" }
  })()

  const regMeta   = STEP_META[regStep]
  const regAccent = regMeta.color
  const regIdx    = STEP_NUM[regStep]

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

            {/* Passwort-Modus */}
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

            {/* OTP-Modus: Code anfordern */}
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

            {/* OTP-Modus: Code eingeben */}
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
            <div style={{ padding: "8px 28px 0", textAlign: "center" }}>
              <div style={{ width: 76, height: 76, borderRadius: "50%", background: `radial-gradient(circle at 40% 35%,${regAccent}30,${regAccent}08)`, border: `1.5px solid ${regAccent}30`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: "2rem", boxShadow: `0 0 28px ${regAccent}20`, transition: "all 0.4s" }}>
                {regStep === "otp" ? "🔑" : "📧"}
              </div>
              <h2 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: "1.25rem", color: "#fff" }}>
                {regStep === "otp" ? "Code bestätigen" : "Konto erstellen"}
              </h2>
              {regStep === "otp" && (
                <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
                  Code an <strong style={{ color: "rgba(255,255,255,0.75)" }}>{regEmail}</strong> gesendet.
                </p>
              )}
            </div>

            {/* Progress: 2 Schritte */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "16px 0 0" }}>
              {[0, 1].map(i => {
                const cur = regStep === "otp" ? 1 : 0
                return (
                  <div key={i} style={{ height: 6, width: i === cur ? 24 : 6, borderRadius: 3, background: i === cur ? regAccent : i < cur ? `${regAccent}50` : "rgba(255,255,255,0.1)", transition: "all 0.35s cubic-bezier(.16,1,.3,1)" }} />
                )
              })}
            </div>

            <div key={animKey} style={{ padding: "18px 24px 0", animation: `${animDir === "forward" ? "slideRight" : "slideLeft"} 0.26s cubic-bezier(.16,1,.3,1)` }}>

              {/* Schritt 1: E-Mail */}
              {regStep === "email" && (
                <div>
                  <input ref={inputRef} type="email" inputMode="email" value={regEmail}
                    onChange={e => { setRegEmail(e.target.value); setError("") }}
                    onKeyDown={e => e.key === "Enter" && handleSendRegOtp()}
                    placeholder="deine@email.de" style={iStyle(!!error, regAccent)} />
                  {error && <Err text={error} />}
                  <Btn label={loading ? "Code wird gesendet…" : "Code senden →"} color={regAccent}
                    disabled={loading || !regEmail.trim()} onClick={handleSendRegOtp} />
                  <button onClick={() => switchMode("login")} style={linkBtn}>← Zurück zum Login</button>
                  <p style={{ textAlign: "center", fontSize: "0.68rem", color: "rgba(255,255,255,0.2)", marginTop: 14, lineHeight: 1.6 }}>
                    🔒 Wir senden dir einen Bestätigungs-Code — kein Passwort nötig
                  </p>
                </div>
              )}

              {/* Schritt 2: OTP */}
              {regStep === "otp" && (
                <div>
                  <OtpInput value={otp} onChange={v => { setOtp(v); setError("") }} onComplete={handleVerifyOtp} color={regAccent} />
                  {error && <Err text={error} />}
                  <Btn label={loading ? "Wird geprüft…" : "Bestätigen ✓"} color={regAccent}
                    disabled={loading || otp.length !== 6} onClick={handleVerifyOtp} style={{ marginTop: 18 }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                    <button onClick={() => { goReg("email", "back"); setOtp("") }} style={linkBtn}>← Zurück</button>
                    <button onClick={() => { setOtp(""); handleSendRegOtp() }} disabled={cooldown > 0}
                      style={{ ...linkBtn, color: cooldown > 0 ? "rgba(255,255,255,0.2)" : regAccent }}>
                      {cooldown > 0 ? `Erneut (${cooldown}s)` : "Code erneut senden"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════ DONE — Mini-Tour ══════════════ */}
        {mode === "register" && regStep === "done" && (
          <DoneTour name={name.trim()} onFinish={success} isIOS={isIOS()} isAndroid={isAndroid()} isStandalone={isStandalone()} />
        )}

        <style>{`
          @keyframes slideRight { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
          @keyframes slideLeft  { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
          @keyframes popIn      { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
          @keyframes bounce     { 0%{transform:scale(0.4) rotate(-10deg)} 60%{transform:scale(1.25) rotate(5deg)} 80%{transform:scale(0.95)} 100%{transform:scale(1) rotate(0)} }
          input::placeholder,textarea::placeholder { color:rgba(255,255,255,0.2)!important }
          input:focus,select:focus { outline:none }
          select option { background:#161a16;color:#fff }
        `}</style>
      </div>
    </div>
  )
}

// ── OTP Input ─────────────────────────────────────────────────────────────────
function OtpInput({ value, onChange, onComplete, color }: { value: string; onChange: (v: string) => void; onComplete: () => void; color: string }) {
  const r0=useRef<HTMLInputElement>(null),r1=useRef<HTMLInputElement>(null),r2=useRef<HTMLInputElement>(null)
  const r3=useRef<HTMLInputElement>(null),r4=useRef<HTMLInputElement>(null),r5=useRef<HTMLInputElement>(null)
  const refs=[r0,r1,r2,r3,r4,r5]

  function handleKey(i:number,e:React.KeyboardEvent<HTMLInputElement>){
    if(e.key==="Backspace"){if(value[i]){onChange(value.slice(0,i)+value.slice(i+1))}else if(i>0){refs[i-1].current?.focus();onChange(value.slice(0,i-1)+value.slice(i))}}
    else if(e.key==="Enter"&&value.length===6)onComplete()
  }
  function handleChange(i:number,raw:string){
    const d=raw.replace(/\D/g,"").slice(-1);if(!d)return
    const next=value.slice(0,i)+d+value.slice(i+1);onChange(next.slice(0,6))
    if(i<5)refs[i+1].current?.focus();else if(next.length===6)setTimeout(onComplete,100)
  }
  function handlePaste(e:React.ClipboardEvent){
    const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6)
    if(p){onChange(p);refs[Math.min(p.length,5)].current?.focus();if(p.length===6)setTimeout(onComplete,100)}
    e.preventDefault()
  }
  return (
    <div style={{display:"flex",gap:10,justifyContent:"center"}}>
      {([0,1,2,3,4,5] as const).map(i=>{
        const f=!!value[i]
        return <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1} value={value[i]??""} onChange={e=>handleChange(i,e.target.value)} onKeyDown={e=>handleKey(i,e)} onPaste={handlePaste} onFocus={e=>e.target.select()} autoFocus={i===0}
          style={{width:48,height:60,borderRadius:14,border:`2px solid ${f?color:"rgba(255,255,255,0.1)"}`,background:f?`${color}12`:"rgba(255,255,255,0.04)",fontSize:"1.7rem",fontWeight:800,color:f?color:"rgba(255,255,255,0.6)",textAlign:"center",outline:"none",boxShadow:f?`0 0 16px ${color}25`:"none",transition:"all 0.18s cubic-bezier(.16,1,.3,1)",caretColor:color}} />
      })}
    </div>
  )
}

// ── Done Tour ─────────────────────────────────────────────────────────────────
const TOUR_CARDS = [
  {
    emoji: "📷",
    color: "#38BDF8",
    title: "Produkte scannen",
    desc: "Halte die Kamera auf einen Barcode — TRUE zeigt dir in Sekunden alles über den Hersteller und gibt dir eine klare Kaufempfehlung.",
  },
  {
    emoji: "🛒",
    color: "#2ECC8A",
    title: "Einkaufsliste",
    desc: "Füge Produkte direkt nach dem Scan hinzu. Deine Liste ist nach Kategorie sortiert und auf allen Geräten synchron.",
  },
  {
    emoji: "👥",
    color: "#A78BFA",
    title: "Community",
    desc: "Tausche Einkaufstipps, teile Alternativen und entdecke was andere bewusst kaufen — alles in der TRUE Community.",
  },
]

function DoneTour({ name, onFinish, isIOS, isAndroid, isStandalone }: {
  name: string; onFinish: () => void
  isIOS: boolean; isAndroid: boolean; isStandalone: boolean
}) {
  const [card, setCard] = useState(-1) // -1 = welcome screen, 0-2 = feature cards
  const isLast = card === TOUR_CARDS.length - 1

  if (card === -1) {
    return (
      <div key="welcome" style={{ padding: "24px 24px 0", textAlign: "center", animation: "popIn 0.4s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: 14, animation: "bounce 0.6s cubic-bezier(.16,1,.3,1)" }}>🎉</div>
        <h2 style={{ margin: "0 0 8px", fontWeight: 900, fontSize: "1.4rem", color: "#fff" }}>
          {name ? `Willkommen, ${name}!` : "Du bist dabei!"}
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: "0.88rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          Dein Konto ist aktiv. Kurze Einführung gefällig? 🌱
        </p>
        <Btn label="TRUE kennenlernen →" color="#2ECC8A" disabled={false} onClick={() => setCard(0)} />
        <button onClick={onFinish} style={{ display: "block", width: "100%", marginTop: 10, background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "0.82rem", cursor: "pointer", padding: "8px 0" }}>
          Überspringen
        </button>
      </div>
    )
  }

  const c = TOUR_CARDS[card]
  return (
    <div key={card} style={{ padding: "20px 24px 0", animation: "slideRight 0.28s cubic-bezier(.16,1,.3,1)" }}>
      {/* Progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
        {TOUR_CARDS.map((_, i) => (
          <div key={i} style={{ width: i === card ? 22 : 6, height: 6, borderRadius: 3, background: i === card ? c.color : "rgba(255,255,255,0.12)", transition: "all 0.3s" }} />
        ))}
      </div>

      {/* Card */}
      <div style={{ background: `radial-gradient(ellipse at 30% 20%, ${c.color}18, transparent 70%)`, border: `1px solid ${c.color}25`, borderRadius: 24, padding: "28px 22px", textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: "3rem", marginBottom: 14 }}>{c.emoji}</div>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "#fff", marginBottom: 10 }}>{c.title}</div>
        <div style={{ fontSize: "0.86rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>{c.desc}</div>
      </div>

      {/* PWA hint on last card */}
      {isLast && !isStandalone && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "12px 14px", marginBottom: 16, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#fff", marginBottom: 4 }}>📲 Zum Homescreen hinzufügen</div>
          {isIOS ? (
            <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
              Teilen <strong style={{ color: "#38BDF8" }}>↑</strong> → <strong style={{ color: "#38BDF8" }}>„Zum Home-Bildschirm"</strong>
            </div>
          ) : isAndroid ? (
            <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }}>
              Menü <strong style={{ color: "#38BDF8" }}>⋮</strong> → <strong style={{ color: "#38BDF8" }}>„Zum Startbildschirm"</strong>
            </div>
          ) : (
            <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.4)" }}>Menü → „App installieren"</div>
          )}
        </div>
      )}

      <Btn
        label={isLast ? "Los geht's 🚀" : "Weiter →"}
        color={c.color}
        disabled={false}
        onClick={() => isLast ? onFinish() : setCard(c => c + 1)}
      />
      <button
        onClick={() => setCard(c => c <= 0 ? -1 : c - 1)}
        style={{ display: "block", width: "100%", marginTop: 8, background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: "0.82rem", cursor: "pointer", padding: "8px 0" }}
      >
        ← Zurück
      </button>
    </div>
  )
}

function Err({text}:{text:string}){return<div style={{background:"rgba(255,68,85,0.08)",border:"1px solid rgba(255,68,85,0.2)",borderRadius:12,padding:"10px 14px",marginTop:10,fontSize:"0.83rem",color:"#ff5566",lineHeight:1.5}}>{text}</div>}

function Btn({label,color,disabled,onClick,style:extra}:{label:string;color:string;disabled:boolean;onClick:()=>void;style?:React.CSSProperties}){
  return<button onClick={onClick} disabled={disabled} style={{display:"block",width:"100%",marginTop:14,background:disabled?"rgba(255,255,255,0.06)":`linear-gradient(135deg,${color},${color}bb)`,border:"none",borderRadius:18,padding:"16px",fontWeight:800,fontSize:"1rem",color:disabled?"rgba(255,255,255,0.2)":"#000",cursor:disabled?"not-allowed":"pointer",boxShadow:disabled?"none":`0 4px 20px ${color}35`,transition:"all 0.2s",...extra}}>{label}</button>
}

const linkBtn:React.CSSProperties={background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:"0.82rem",cursor:"pointer",padding:"8px 0",fontWeight:500}

function iStyle(hasError:boolean,accent:string):React.CSSProperties{
  return{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.05)",border:`1.5px solid ${hasError?"rgba(255,68,85,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:16,padding:"15px 18px",fontSize:"1.05rem",color:"#fff",outline:"none",marginBottom:8,transition:"border-color 0.2s",caretColor:accent}
}
