"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Confetti from "./Confetti"
import InstallButton from "./InstallButton"
import { supabase } from "@/lib/supabase"

const AVATARS = ["🧑","👩","👨","🧑‍🦱","👩‍🦱","🧑‍🦲","👴","👵","🧒","👦","👧","🙋","🦸","🧑‍💻","🌱","✊"]

// ── Goals (shown FIRST to personalise) ───────────────────────────────────────
const GOALS = [
  { id: "env",    icon: "🌱", label: "Umwelt schützen",     desc: "Konzerne aufdecken die Wälder vernichten" },
  { id: "health", icon: "💪", label: "Gesünder leben",      desc: "Schädliche Inhaltsstoffe im Essen meiden" },
  { id: "family", icon: "👨‍👩‍👧", label: "Familie schützen", desc: "Sichere Produkte für Kinder & Familie" },
  { id: "truth",  icon: "🔍", label: "Wahrheit kennen",     desc: "Was steckt wirklich hinter den Marken?" },
  { id: "action", icon: "✊", label: "Etwas bewegen",       desc: "Mit jedem Kauf einen Unterschied machen" },
  { id: "budget", icon: "💸", label: "Clever sparen",       desc: "Faire Alternativen zu teuren Markenprodukten" },
]

type Step = "welcome" | "install" | "goals" | "supermarkt" | "register" | "done"

export default function Onboarding() {
  const router = useRouter()
  const [show, setShow]         = useState(false)
  const [step, setStep]         = useState<Step>("welcome")
  const [leaving, setLeaving]   = useState(false)
  const [confetti, setConfetti] = useState(false)

  // Registration fields
  const [name, setName]       = useState("")
  const [contact, setContact] = useState("")   // phone number
  const [email, setEmail]     = useState("")   // optional email
  const [avatar, setAvatar]   = useState("🧑")
  const [goals, setGoals]     = useState<Set<string>>(new Set())
  const [supermarkets, setSupermarkets] = useState<Set<string>>(new Set())
  const [regError, setRegError]   = useState("")
  const [regLoading, setRegLoading] = useState(false)
  const [emailSent, setEmailSent]   = useState(false)

  useEffect(() => {
    async function check() {
      // Already completed onboarding
      if (localStorage.getItem("true-onboarded-v3")) return

      // Active Supabase session = user is already registered → never show onboarding
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession()
          if (data.session) {
            localStorage.setItem("true-onboarded-v3", "1")
            return
          }
        } catch {}
      }

      // Local profile with email/name → skip onboarding
      try {
        const raw = localStorage.getItem("true-profile")
        if (raw) {
          const p = JSON.parse(raw)
          if (p.email || p.vorname) {
            localStorage.setItem("true-onboarded-v3", "1")
            return
          }
        }
      } catch {}

      setTimeout(() => setShow(true), 700)
    }
    check()
  }, [])

  function go(next: Step) {
    setLeaving(true)
    setTimeout(() => { setStep(next); setLeaving(false) }, 220)
  }

  function skip() {
    localStorage.setItem("true-onboarded-v3", "skip")
    setShow(false)
  }

  function toggleGoal(id: string) {
    setGoals(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleSupermarkt(id: string) {
    setSupermarkets(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function submitGoals() {
    go("supermarkt")
  }

  async function submitRegister() {
    if (!name.trim()) { setRegError("Bitte gib deinen Namen ein."); return }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setRegError("Bitte gib eine gültige E-Mail-Adresse ein.")
      return
    }

    setRegError("")
    setRegLoading(true)
    const profile = {
      name: name.trim(),
      vorname: name.trim(),
      email: email.trim(),
      telefon: contact.trim(),
      avatar,
      goals: [...goals],
      supermarkets: [...supermarkets],
      joined: new Date().toISOString(),
    }
    // Clear any leftover data from a previous account on this device
    const staleKeys = [
      "shopping-list-items-v1", "true-scan-history", "true-premium",
      "true-meidliste", "true-saved-posts-v2", "true-post-likes-v1",
      "true-community-user-posts", "true-community-comments",
      "true-joined-communities", "true-following", "true-profile-photo",
      "true-followed-channels", "true-community-card-dismissed",
    ]
    staleKeys.forEach(k => { try { localStorage.removeItem(k) } catch {} })
    localStorage.setItem("true-profile", JSON.stringify(profile))
    localStorage.setItem("true-onboarded-v3", "1")

    // Create real Supabase account via magic-link OTP
    try {
      if (supabase) {
        await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: (typeof window !== "undefined" ? window.location.origin : "") + "/auth/callback",
            data: { vorname: name.trim(), avatar },
          },
        })
        setEmailSent(true)
      }
    } catch {}

    setRegLoading(false)
    setStep("done")
    setConfetti(true)
  }

  function goHome() {
    setShow(false)
    router.push("/home")
  }

  if (!show) return null

  const STEPS: Step[] = ["welcome", "install", "goals", "supermarkt", "register"]
  const stepIdx = STEPS.indexOf(step)

  return (
    <>
      {confetti && <Confetti onDone={() => setConfetti(false)} />}

      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(8,8,15,0.9)", backdropFilter: "blur(16px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "28px", padding: "2.5rem 2rem",
          maxWidth: "440px", width: "100%", textAlign: "center",
          position: "relative",
          opacity: leaving ? 0 : 1,
          transform: leaving ? "translateY(16px) scale(0.97)" : "translateY(0) scale(1)",
          transition: "opacity 0.22s, transform 0.22s",
          boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
          maxHeight: "90vh", overflowY: "auto",
        }}>

          {/* Skip button — only on steps where bypassing makes sense */}
          {(step === "goals" || step === "supermarkt") && (
            <button onClick={skip} style={{
              position: "absolute", top: "1.1rem", right: "1.1rem",
              background: "transparent", border: "none",
              color: "var(--text-dim)", cursor: "pointer", fontSize: "0.78rem",
            }}>Überspringen</button>
          )}

          {/* Step dots */}
          {step !== "done" && (
            <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center", marginBottom: "1.75rem" }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{
                  width: i === stepIdx ? "22px" : "6px", height: "6px",
                  borderRadius: "3px",
                  background: i <= stepIdx ? "var(--accent)" : "var(--border)",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>
          )}

          {/* ── STEP 1: WELCOME ── */}
          {step === "welcome" && (
            <>
              <div style={{ fontSize: "3.5rem", marginBottom: "1rem", animation: "bounceIn 0.6s ease" }}>🌍</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.025em", marginBottom: "1.25rem" }}>
                Willkommen bei TRUE
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "1.75rem", textAlign: "left" }}>
                {[
                  { icon: "📷", text: "Produkt scannen" },
                  { icon: "🔄", text: "Bessere Alternative" },
                  { icon: "👥", text: "Community" },
                ].map(row => (
                  <div key={row.text} style={{ display: "flex", gap: "0.85rem", alignItems: "center", background: "var(--surface-2)", borderRadius: "12px", padding: "0.65rem 1rem" }}>
                    <span style={{ fontSize: "1.2rem" }}>{row.icon}</span>
                    <span style={{ fontSize: "0.9rem", color: "var(--text)", fontWeight: 700 }}>{row.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => go("install")} style={btnStyle}>Los geht's →</button>
            </>
          )}

          {/* ── STEP 2: INSTALL ── */}
          {step === "install" && (
            <>
              <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📲</div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
                Zum Homescreen hinzufügen
              </h2>
              <InstallButton style={{ width: "100%", justifyContent: "center", borderRadius: "14px", padding: "1rem", fontSize: "1rem", marginBottom: "0.75rem" }} />
              <button onClick={() => go("goals")} style={skipBtnStyle}>Bereits installiert → Weiter</button>
            </>
          )}

          {/* ── STEP 3: GOALS ── */}
          {step === "goals" && (
            <>
              <div style={{ fontSize: "3.2rem", marginBottom: "1rem" }}>🎯</div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
                Was ist dir wichtig?
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem", textAlign: "left" }}>
                {GOALS.map(g => {
                  const active = goals.has(g.id)
                  return (
                    <button key={g.id} onClick={() => toggleGoal(g.id)} style={{
                      display: "flex", alignItems: "center", gap: "0.85rem",
                      background: active ? "var(--accent-dim)" : "var(--surface-2)",
                      border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "14px", padding: "0.85rem 1rem",
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "all 0.18s",
                    }}>
                      <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{g.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: active ? "var(--accent)" : "var(--text)" }}>{g.label}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.4 }}>{g.desc}</div>
                      </div>
                      <div style={{
                        marginLeft: "auto", width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.7rem", color: active ? "#000" : "transparent",
                      }}>✓</div>
                    </button>
                  )
                })}
              </div>

              <button onClick={submitGoals} style={btnStyle}>
                {goals.size > 0 ? `Weiter mit ${goals.size} Ziel${goals.size > 1 ? "en" : ""} →` : "Weiter →"}
              </button>
              <button onClick={() => go("register")} style={skipBtnStyle}>Überspringen</button>
            </>
          )}

          {/* ── STEP 4: SUPERMARKT ── */}
          {step === "supermarkt" && (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏪</div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
                Wo kaufst du ein?
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "2rem", textAlign: "left" }}>
                {[
                  { id: "Rewe",        emoji: "🛒", color: "#cc0000" },
                  { id: "Edeka",       emoji: "🏪", color: "#ffcc00" },
                  { id: "Lidl",        emoji: "🔵", color: "#0050aa" },
                  { id: "Aldi",        emoji: "🟦", color: "#004a9f" },
                  { id: "dm",          emoji: "🟠", color: "#ff6600" },
                  { id: "Alnatura",    emoji: "🌿", color: "#5c8a00" },
                  { id: "Bio Company", emoji: "🌱", color: "#3d7a00" },
                  { id: "Penny",       emoji: "🔴", color: "#cc0000" },
                  { id: "Netto",       emoji: "🟡", color: "#ffcc00" },
                  { id: "Kaufland",    emoji: "🏬", color: "#cc0000" },
                ].map(s => {
                  const active = supermarkets.has(s.id)
                  return (
                    <button key={s.id} onClick={() => toggleSupermarkt(s.id)} style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      background: active ? "var(--accent-dim)" : "var(--surface-2)",
                      border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "12px", padding: "0.75rem 0.9rem",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                      <span style={{ fontSize: "1.3rem" }}>{s.emoji}</span>
                      <span style={{ fontSize: "0.88rem", fontWeight: active ? 700 : 500, color: active ? "var(--accent)" : "var(--text)" }}>{s.id}</span>
                      {active && <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.9rem" }}>✓</span>}
                    </button>
                  )
                })}
              </div>

              <button onClick={() => go("register")} style={btnStyle}>
                {supermarkets.size > 0 ? `Weiter mit ${supermarkets.size} Markt${supermarkets.size > 1 ? "märkten" : ""} →` : "Weiter →"}
              </button>
              <button onClick={() => go("register")} style={skipBtnStyle}>Überspringen</button>
            </>
          )}

          {/* ── STEP 5: REGISTER ── */}
          {step === "register" && (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👤</div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>
                Profil anlegen
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem", textAlign: "left" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                    Vorname <span style={{ color: "var(--accent)" }}>*</span>
                  </label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="z. B. Maximilian"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                    E-Mail <span style={{ color: "var(--accent)" }}>*</span>
                  </label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="deine@email.de"
                    type="email"
                    style={inputStyle}
                  />
                  <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", margin: "4px 0 0 2px" }}>
                    Zum späteren Anmelden & Synchronisieren
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                    Handynummer <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="0151 23456789"
                    type="tel"
                    inputMode="numeric"
                    style={inputStyle}
                  />
                </div>

                {regError && <p style={{ fontSize: "0.78rem", color: "#ff4455", margin: 0 }}>{regError}</p>}

                <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", lineHeight: 1.6, margin: 0 }}>
                  🔒 Deine Daten bleiben privat. Keine Werbung, kein Tracking.
                </p>
              </div>

              <button onClick={submitRegister} disabled={regLoading} style={{ ...btnStyle, opacity: regLoading ? 0.7 : 1 }}>
                {regLoading ? "Wird gespeichert…" : "Profil speichern →"}
              </button>
              <button onClick={() => {
                localStorage.setItem("true-onboarded-v3", "skip")
                setShow(false)
              }} style={skipBtnStyle}>Ohne Profil fortfahren</button>
            </>
          )}

          {/* ── STEP 5: DONE ── */}
          {step === "done" && (
            <div style={{ animation: "bounceIn 0.7s ease" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
              <h2 style={{ fontSize: "1.7rem", fontWeight: 900, letterSpacing: "-0.025em", color: "var(--accent)", marginBottom: "0.6rem" }}>
                Willkommen{name ? `, ${name}` : ""}!
              </h2>
              <p style={{ color: "var(--text-dim)", lineHeight: 1.75, fontSize: "0.92rem", marginBottom: "0.75rem" }}>
                Ab jetzt weißt du immer, was du kaufst — und hast{name ? `, ${name.split(" ")[0]}` : ""}, die Wahl.
              </p>
              {goals.size > 0 && (
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.85rem 1rem", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 700, marginBottom: "0.5rem", letterSpacing: "0.05em" }}>DEINE ZIELE</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
                    {GOALS.filter(g => goals.has(g.id)).map(g => (
                      <span key={g.id} style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: "20px", padding: "0.2rem 0.65rem", fontSize: "0.78rem", fontWeight: 700 }}>
                        {g.icon} {g.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {emailSent && (
                <div style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: "12px", padding: "0.85rem 1rem", marginBottom: "1.25rem", fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
                  📧 Wir haben dir einen Bestätigungslink an <strong style={{ color: "var(--text)" }}>{email}</strong> gesendet — klicke darauf, um dein Konto zu aktivieren.
                </div>
              )}
              <p style={{ color: "var(--accent)", fontSize: "1rem", fontWeight: 700, marginBottom: "1.5rem", fontStyle: "italic" }}>
                „Deine Kaufentscheidung ist deine Stimme."
              </p>

              {/* PWA install hint */}
              <div style={{ background: "rgba(46,204,138,0.06)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: "14px", padding: "1rem", marginBottom: "1.5rem" }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", margin: "0 0 0.75rem" }}>
                  📲 Speichere TRUE auf deinem Homescreen — für schnellen Zugriff beim Einkaufen.
                </p>
                <InstallButton style={{ width: "100%", justifyContent: "center", borderRadius: "10px", padding: "0.75rem 1rem", fontSize: "0.9rem" }} />
              </div>

              <button onClick={goHome} style={{ ...btnStyle, fontSize: "1.05rem", padding: "1rem 2rem" }}>
                TRUE öffnen →
              </button>
              <Link href="/community" onClick={() => setShow(false)} style={{ display: "block", marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-dim)", textDecoration: "none" }}>
                Community entdecken →
              </Link>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounceIn {
          0%   { transform: scale(0.3); opacity: 0 }
          50%  { transform: scale(1.08) }
          100% { transform: scale(1); opacity: 1 }
        }
      `}</style>
    </>
  )
}

const btnStyle: React.CSSProperties = {
  background: "var(--accent)", color: "#000",
  border: "none", borderRadius: "14px", padding: "0.9rem 2rem",
  fontWeight: 800, cursor: "pointer", fontSize: "1rem", width: "100%",
  transition: "opacity 0.15s",
}

const skipBtnStyle: React.CSSProperties = {
  background: "transparent", border: "none",
  color: "var(--text-dim)", cursor: "pointer",
  fontSize: "0.82rem", marginTop: "0.75rem", width: "100%",
  padding: "0.4rem",
}

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: "10px",
  padding: "0.85rem 1rem", fontSize: "0.95rem",
  outline: "none",
}
