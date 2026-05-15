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
              <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem", animation: "bounceIn 0.6s ease" }}>🌍</div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.35rem" }}>
                Willkommen bei TRUE
              </h2>
              <p style={{ color: "var(--text-dim)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
                Scanne Barcodes — sieh sofort wer dahintersteckt.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.5rem", textAlign: "left" }}>
                {[
                  { icon: "📷", text: "Barcode scannen", sub: "Sofort Konzern & Score sehen" },
                  { icon: "🔄", text: "Bessere Alternative", sub: "Ethische Produkte entdecken" },
                  { icon: "👥", text: "Community", sub: "Tipps teilen & lernen" },
                ].map(row => (
                  <div key={row.text} style={{ display: "flex", gap: "0.75rem", alignItems: "center", background: "var(--surface-2)", borderRadius: "12px", padding: "0.6rem 0.9rem" }}>
                    <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{row.icon}</span>
                    <div>
                      <div style={{ fontSize: "0.92rem", color: "var(--text)", fontWeight: 800 }}>{row.text}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{row.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => go("install")} style={btnStyle}>Los geht's →</button>
            </>
          )}

          {/* ── STEP 2: INSTALL ── */}
          {step === "install" && (
            <>
              <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>📲</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
                Zum Homescreen
              </h2>
              <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
                Schneller Zugriff beim Einkaufen
              </p>
              <InstallButton style={{ width: "100%", justifyContent: "center", borderRadius: "14px", padding: "1rem", fontSize: "1rem", marginBottom: "0.75rem" }} />
              <button onClick={() => go("goals")} style={skipBtnStyle}>Bereits installiert → Weiter</button>
            </>
          )}

          {/* ── STEP 3: GOALS ── */}
          {step === "goals" && (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "0.6rem" }}>🎯</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
                Was ist dir wichtig?
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.5rem", textAlign: "left" }}>
                {GOALS.map(g => {
                  const active = goals.has(g.id)
                  return (
                    <button key={g.id} onClick={() => toggleGoal(g.id)} style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      background: active ? "var(--accent-dim)" : "var(--surface-2)",
                      border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "12px", padding: "0.65rem 0.9rem",
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "all 0.15s",
                    }}>
                      <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{g.icon}</span>
                      <span style={{ fontWeight: 800, fontSize: "0.92rem", color: active ? "var(--accent)" : "var(--text)" }}>{g.label}</span>
                      <span style={{
                        marginLeft: "auto", width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.65rem", color: active ? "#000" : "transparent",
                      }}>✓</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={submitGoals} style={btnStyle}>
                {goals.size > 0 ? `Weiter →` : "Weiter →"}
              </button>
              <button onClick={() => go("register")} style={skipBtnStyle}>Überspringen</button>
            </>
          )}

          {/* ── STEP 4: SUPERMARKT ── */}
          {step === "supermarkt" && (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "0.6rem" }}>🏪</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
                Wo kaufst du ein?
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {[
                  { id: "Rewe",        emoji: "🛒" },
                  { id: "Edeka",       emoji: "🏪" },
                  { id: "Lidl",        emoji: "🔵" },
                  { id: "Aldi",        emoji: "🟦" },
                  { id: "dm",          emoji: "🟠" },
                  { id: "Alnatura",    emoji: "🌿" },
                  { id: "Bio Company", emoji: "🌱" },
                  { id: "Penny",       emoji: "🔴" },
                  { id: "Netto",       emoji: "🟡" },
                  { id: "Kaufland",    emoji: "🏬" },
                ].map(s => {
                  const active = supermarkets.has(s.id)
                  return (
                    <button key={s.id} onClick={() => toggleSupermarkt(s.id)} style={{
                      display: "flex", alignItems: "center", gap: "0.6rem",
                      background: active ? "var(--accent-dim)" : "var(--surface-2)",
                      border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "10px", padding: "0.6rem 0.75rem",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                      <span style={{ fontSize: "1.1rem" }}>{s.emoji}</span>
                      <span style={{ fontSize: "0.88rem", fontWeight: active ? 800 : 500, color: active ? "var(--accent)" : "var(--text)" }}>{s.id}</span>
                      {active && <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.8rem" }}>✓</span>}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => go("register")} style={btnStyle}>Weiter →</button>
              <button onClick={() => go("register")} style={skipBtnStyle}>Überspringen</button>
            </>
          )}

          {/* ── STEP 5: REGISTER ── */}
          {step === "register" && (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "0.6rem" }}>👤</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
                Profil anlegen
              </h2>
              <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", marginBottom: "1.1rem" }}>
                🔒 Privat · Kein Spam · Jederzeit löschbar
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem", textAlign: "left" }}>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Vorname *"
                  style={inputStyle}
                />
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="E-Mail *"
                  type="email"
                  style={inputStyle}
                />
                {regError && <p style={{ fontSize: "0.78rem", color: "#ff4455", margin: 0 }}>{regError}</p>}
              </div>
              <button onClick={submitRegister} disabled={regLoading} style={{ ...btnStyle, opacity: regLoading ? 0.7 : 1 }}>
                {regLoading ? "Wird gespeichert…" : "Konto erstellen →"}
              </button>
              <button onClick={() => {
                localStorage.setItem("true-onboarded-v3", "skip")
                setShow(false)
              }} style={skipBtnStyle}>Ohne Konto fortfahren</button>
            </>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div style={{ animation: "bounceIn 0.7s ease" }}>
              <div style={{ fontSize: "4rem", marginBottom: "0.75rem" }}>🎉</div>
              <h2 style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--accent)", marginBottom: "0.5rem" }}>
                {name ? `Willkommen, ${name}!` : "Willkommen!"}
              </h2>
              {emailSent ? (
                <div style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: "12px", padding: "0.85rem 1rem", margin: "1rem 0", textAlign: "left" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: "0.25rem" }}>📧 E-Mail unterwegs</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                    Bestätigungslink an <strong style={{ color: "var(--text)" }}>{email}</strong> gesendet.
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  Alles bereit — los geht's!
                </p>
              )}
              {goals.size > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", justifyContent: "center", marginBottom: "1.25rem" }}>
                  {GOALS.filter(g => goals.has(g.id)).map(g => (
                    <span key={g.id} style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: "20px", padding: "0.2rem 0.6rem", fontSize: "0.76rem", fontWeight: 800 }}>
                      {g.icon} {g.label}
                    </span>
                  ))}
                </div>
              )}
              <button onClick={goHome} style={{ ...btnStyle, fontSize: "1.05rem", padding: "1rem 2rem", marginBottom: "0.5rem" }}>
                TRUE öffnen →
              </button>
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
