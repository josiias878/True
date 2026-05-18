"use client"
import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Confetti from "./Confetti"
import InstallButton from "./InstallButton"
import { supabase } from "@/lib/supabase"

const AVATARS = ["🧑","👩","👨","🧑‍🦱","👩‍🦱","🧑‍🦲","👴","👵","🧒","👦","👧","🙋","🦸","🧑‍💻","🌱","✊"]

// ── Visuelle Tour-Karten (3 Slides) ──────────────────────────────────────────
const TOUR_SLIDES = [
  {
    icon: "📷",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.25)",
    title: "Barcode scannen",
    desc: "Halt die Kamera auf ein Produkt — sieh sofort welcher Konzern dahintersteckt und ob es sicher für dich ist.",
    tag: "Scanner",
  },
  {
    icon: "👥",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.08)",
    border: "rgba(167,139,250,0.25)",
    title: "Community & Tipps",
    desc: "Teile Entdeckungen, diskutiere mit anderen und findet gemeinsam bessere Alternativen.",
    tag: "Community",
  },
  {
    icon: "📺",
    color: "#2ECC8A",
    bg: "rgba(46,204,138,0.08)",
    border: "rgba(46,204,138,0.25)",
    title: "TRUE-Kanal",
    desc: "Täglich neue Aufdeckungen von unserem Bot, Journalisten und deiner Community — alles an einem Ort.",
    tag: "TRUE-Kanal",
  },
]

// ── Goals ─────────────────────────────────────────────────────────────────────
const GOALS = [
  { id: "env",    icon: "🌱", label: "Umwelt schützen",  desc: "Konzerne aufdecken die Wälder vernichten" },
  { id: "health", icon: "💪", label: "Gesünder leben",   desc: "Schädliche Inhaltsstoffe im Essen meiden" },
  { id: "family", icon: "👨‍👩‍👧", label: "Familie schützen", desc: "Sichere Produkte für Kinder & Familie" },
  { id: "truth",  icon: "🔍", label: "Wahrheit kennen",  desc: "Was steckt wirklich hinter den Marken?" },
  { id: "action", icon: "✊", label: "Etwas bewegen",    desc: "Mit jedem Kauf einen Unterschied machen" },
  { id: "budget", icon: "💸", label: "Clever sparen",    desc: "Faire Alternativen zu teuren Markenprodukten" },
]

type Step = "tour" | "goals" | "register" | "done"

export default function Onboarding() {
  const router = useRouter()
  const [show, setShow]         = useState(false)
  const [step, setStep]         = useState<Step>("tour")
  const [leaving, setLeaving]   = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [tourSlide, setTourSlide] = useState(0)

  // Registration fields
  const [name, setName]     = useState("")
  const [email, setEmail]   = useState("")
  const [avatar, setAvatar] = useState("🧑")
  const [goals, setGoals]   = useState<Set<string>>(new Set())
  const [regError, setRegError]   = useState("")
  const [regLoading, setRegLoading] = useState(false)
  const [emailSent, setEmailSent]   = useState(false)

  // ── Erst Home anzeigen lassen (2.5s), dann Onboarding einblenden ─────────────
  useEffect(() => {
    async function check() {
      if (localStorage.getItem("true-onboarded-v3")) return

      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession()
          if (data.session) {
            localStorage.setItem("true-onboarded-v3", "1")
            return
          }
        } catch {}
      }

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

      // Verzögerung: User sieht kurz den Homescreen, DANN kommt Tour
      setTimeout(() => setShow(true), 2500)
    }
    check()
  }, [])

  function go(next: Step) {
    setLeaving(true)
    setTimeout(() => { setStep(next); setLeaving(false) }, 220)
  }

  function toggleGoal(id: string) {
    setGoals(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
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
      avatar,
      goals: [...goals],
      joined: new Date().toISOString(),
    }
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
    // Auto-subscribe to TRUE channel
    try { localStorage.setItem("true-followed-channels", JSON.stringify(["true"])) } catch {}

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

  const STEPS: Step[] = ["tour", "goals", "register"]
  const stepIdx = STEPS.indexOf(step)

  return (
    <>
      {confetti && <Confetti onDone={() => setConfetti(false)} />}

      {/* ── Backdrop ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(5,5,12,0.75)", backdropFilter: "blur(10px)",
        // Bottom sheet kommt von unten rein
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
        onClick={e => { if (e.target === e.currentTarget && step !== "register") {} }}
      >
        <div style={{
          background: "var(--surface)", borderRadius: "28px 28px 0 0",
          border: "1px solid var(--border)",
          padding: "1.5rem 1.5rem 2.5rem",
          maxWidth: "480px", width: "100%", textAlign: "center",
          position: "relative",
          opacity: leaving ? 0 : 1,
          transform: leaving ? "translateY(32px)" : "translateY(0)",
          transition: "opacity 0.22s, transform 0.22s",
          boxShadow: "0 -24px 80px rgba(0,0,0,0.5)",
          maxHeight: "90vh", overflowY: "auto",
        }}>
          {/* Drag handle */}
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 1.25rem" }} />

          {/* Step dots (nur bei tour + goals + register) */}
          {step !== "done" && (
            <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", marginBottom: "1.5rem" }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{
                  width: i === stepIdx ? "24px" : "6px", height: "6px",
                  borderRadius: "3px",
                  background: i <= stepIdx ? "var(--accent)" : "var(--border)",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>
          )}

          {/* ── STEP 1: VISUELLER TOUR ── */}
          {step === "tour" && (
            <>
              {/* Tour-Karte */}
              {TOUR_SLIDES.map((slide, i) => (
                <div key={i} style={{
                  display: i === tourSlide ? "block" : "none",
                  animation: "fadeInUp 0.4s ease",
                }}>
                  <div style={{
                    background: slide.bg,
                    border: `1.5px solid ${slide.border}`,
                    borderRadius: "20px",
                    padding: "2rem 1.5rem",
                    marginBottom: "1.25rem",
                  }}>
                    <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>{slide.icon}</div>
                    <div style={{
                      display: "inline-block",
                      background: slide.bg, border: `1px solid ${slide.border}`,
                      color: slide.color, borderRadius: 99,
                      padding: "0.2rem 0.75rem", fontSize: "0.65rem",
                      fontWeight: 800, letterSpacing: "0.1em",
                      textTransform: "uppercase", marginBottom: "0.75rem",
                    }}>{slide.tag}</div>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.5rem", color: "var(--text)" }}>
                      {slide.title}
                    </h2>
                    <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", lineHeight: 1.6, margin: 0 }}>
                      {slide.desc}
                    </p>
                  </div>
                </div>
              ))}

              {/* Slide dots */}
              <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", marginBottom: "1.25rem" }}>
                {TOUR_SLIDES.map((_, i) => (
                  <button key={i} onClick={() => setTourSlide(i)} style={{
                    width: i === tourSlide ? "22px" : "6px", height: "6px",
                    borderRadius: "3px", border: "none", padding: 0,
                    background: i === tourSlide ? "var(--accent)" : "var(--border)",
                    cursor: "pointer", transition: "all 0.3s",
                  }} />
                ))}
              </div>

              {tourSlide < TOUR_SLIDES.length - 1 ? (
                <button onClick={() => setTourSlide(s => s + 1)} style={btnStyle}>
                  Weiter →
                </button>
              ) : (
                <button onClick={() => go("goals")} style={btnStyle}>
                  Ziele festlegen →
                </button>
              )}
              <button onClick={() => go("register")} style={skipBtnStyle}>
                Direkt registrieren
              </button>
            </>
          )}

          {/* ── STEP 2: GOALS ── */}
          {step === "goals" && (
            <>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎯</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
                Was ist dir wichtig?
              </h2>
              <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginBottom: "1rem" }}>
                Wir passen TRUE auf dich an
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.25rem", textAlign: "left" }}>
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
                      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{g.icon}</span>
                      <span style={{ fontWeight: 800, fontSize: "0.9rem", color: active ? "var(--accent)" : "var(--text)" }}>{g.label}</span>
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
              <button onClick={() => go("register")} style={btnStyle}>Weiter →</button>
              <button onClick={() => go("register")} style={skipBtnStyle}>Überspringen</button>
            </>
          )}

          {/* ── STEP 3: REGISTER ── */}
          {step === "register" && (
            <>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>👤</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
                Konto anlegen
              </h2>
              <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", marginBottom: "1.1rem" }}>
                🔒 <strong style={{ color: "var(--text)" }}>Kein Spam</strong> · Jederzeit löschbar · Gratis
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
                try { localStorage.setItem("true-onboarded-v3", "skip") } catch {}
                setShow(false)
              }} style={skipBtnStyle}>Ohne Konto fortfahren</button>
            </>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div style={{ animation: "bounceIn 0.7s ease", padding: "0.5rem 0 1rem" }}>
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
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px) }
          to   { opacity: 1; transform: translateY(0) }
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
