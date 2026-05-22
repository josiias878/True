"use client"
import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Confetti from "./Confetti"
import { supabase } from "@/lib/supabase"

const GOALS = [
  { id: "health", icon: "💪", label: "Gesünder" },
  { id: "env",    icon: "🌱", label: "Umwelt" },
  { id: "family", icon: "👨‍👩‍👧", label: "Familie" },
  { id: "truth",  icon: "🔍", label: "Wahrheit" },
  { id: "budget", icon: "💸", label: "Sparen" },
  { id: "action", icon: "✊", label: "Handeln" },
]

export default function Onboarding() {
  const router = useRouter()
  const [show, setShow]         = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [step, setStep]         = useState<"form" | "goals" | "done">("form")

  const [name, setName]     = useState("")
  const [email, setEmail]   = useState("")
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [regError, setRegError]   = useState("")
  const [regLoading, setRegLoading] = useState(false)
  const [emailSent, setEmailSent]   = useState(false)

  // ── Zeige Onboarding nach 2.5s (User sieht kurz Home) ─────────────────────
  useEffect(() => {
    async function check() {
      if (localStorage.getItem("true-onboarded-v3")) return
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession()
          if (data.session) { localStorage.setItem("true-onboarded-v3", "1"); return }
        } catch {}
      }
      try {
        const p = JSON.parse(localStorage.getItem("true-profile") || "{}")
        if (p.email || p.vorname) { localStorage.setItem("true-onboarded-v3", "1"); return }
      } catch {}
      setTimeout(() => setShow(true), 2500)
    }
    check()
  }, [])

  function toggleGoal(id: string) {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id])
  }

  async function submitForm() {
    if (!name.trim()) { setRegError("Name fehlt."); return }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRegError("E-Mail ungültig."); return
    }
    setRegError("")
    // Weiter zu Goal-Auswahl
    setStep("goals")
  }

  async function finishRegistration() {
    setRegLoading(true)

    const staleKeys = [
      "shopping-list-items-v1","true-scan-history","true-premium","true-meidliste",
      "true-saved-posts-v2","true-post-likes-v1","true-community-user-posts",
      "true-community-comments","true-joined-communities","true-following",
      "true-profile-photo","true-followed-channels","true-community-card-dismissed",
    ]
    staleKeys.forEach(k => { try { localStorage.removeItem(k) } catch {} })

    // Profil inkl. Goals speichern
    localStorage.setItem("true-profile", JSON.stringify({
      name: name.trim(), vorname: name.trim(), email: email.trim(),
      goals: selectedGoals,
      nutritionGoals: [], allergies: [],
      joined: new Date().toISOString(),
    }))
    localStorage.setItem("true-onboarded-v3", "1")
    try { localStorage.setItem("true-followed-channels", JSON.stringify(["true"])) } catch {}

    try {
      if (supabase) {
        await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + "/auth/callback", data: { vorname: name.trim() } },
        })
        setEmailSent(true)
      }
    } catch {}

    setRegLoading(false)
    setStep("done")
    setConfetti(true)
  }

  function finish() {
    setShow(false)
    window.scrollTo({ top: 0, behavior: "instant" })
  }

  if (!show) return null

  return (
    <>
      {confetti && <Confetti onDone={() => setConfetti(false)} />}

      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(5,5,12,0.7)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{
          background: "var(--surface)", borderRadius: "24px 24px 0 0",
          border: "1px solid var(--border)",
          padding: "1.25rem 1.5rem 2.5rem",
          maxWidth: 440, width: "100%",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.45)",
          maxHeight: "92vh", overflowY: "auto",
        }}>
          {/* Handle */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 1.25rem" }} />

          {/* ── SCHRITT 1: Name + E-Mail ── */}
          {step === "form" && (
            <>
              <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>🌍</div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 0.3rem" }}>
                  Willkommen bei TRUE
                </h2>
                <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", margin: 0 }}>
                  Kostenlos · Kein Spam · Jederzeit löschbar
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "1.25rem" }}>
                {[
                  { icon: "📷", label: "Scannen" },
                  { icon: "👥", label: "Community" },
                  { icon: "📡", label: "TRUE-Kanal" },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-dim)" }}>{item.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "0.85rem" }}>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitForm()}
                  placeholder="Vorname *"
                  style={inputStyle}
                  autoComplete="given-name"
                />
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitForm()}
                  placeholder="E-Mail *"
                  type="email"
                  style={inputStyle}
                  autoComplete="email"
                />
                {regError && <p style={{ fontSize: "0.75rem", color: "#ff4455", margin: 0 }}>{regError}</p>}
              </div>

              <button
                onClick={submitForm}
                style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", borderRadius: "14px", padding: "0.95rem", fontWeight: 900, fontSize: "1rem", cursor: "pointer", marginBottom: "0.6rem" }}
              >
                Weiter →
              </button>

              <button
                onClick={() => { try { localStorage.setItem("true-onboarded-v3", "skip") } catch {}; finish() }}
                style={{ width: "100%", background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem", padding: "0.3rem" }}
              >
                Ohne Konto fortfahren
              </button>
            </>
          )}

          {/* ── SCHRITT 2: Ziele wählen ── */}
          {step === "goals" && (
            <>
              <div style={{ textAlign: "center", marginBottom: "1.1rem" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: "0.35rem" }}>🎯</div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 0.25rem" }}>
                  Was ist dir wichtig?
                </h2>
                <p style={{ color: "var(--text-dim)", fontSize: "0.76rem", margin: 0 }}>
                  Wähle 1–3 Ziele. TRUE passt deine Tipps daran an.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: "1.1rem" }}>
                {GOALS.map(g => {
                  const active = selectedGoals.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGoal(g.id)}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        background: active ? "rgba(46,204,138,0.12)" : "var(--background)",
                        border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: 14, padding: "14px 8px", cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "1.6rem" }}>{g.icon}</span>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: active ? "var(--accent)" : "var(--text-dim)" }}>{g.label}</span>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={finishRegistration}
                disabled={regLoading}
                style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", borderRadius: "14px", padding: "0.95rem", fontWeight: 900, fontSize: "1rem", cursor: regLoading ? "not-allowed" : "pointer", opacity: regLoading ? 0.7 : 1, marginBottom: "0.6rem" }}
              >
                {regLoading ? "Wird erstellt…" : selectedGoals.length > 0 ? `Starten mit ${selectedGoals.length} Ziel${selectedGoals.length > 1 ? "en" : ""} →` : "Überspringen →"}
              </button>
            </>
          )}

          {/* ── SCHRITT 3: Done ── */}
          {step === "done" && (
            <div style={{ textAlign: "center", padding: "0.5rem 0 1rem" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "0.6rem" }}>🎉</div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--accent)", letterSpacing: "-0.03em", marginBottom: "0.4rem" }}>
                {name ? `Hey ${name}!` : "Willkommen!"}
              </h2>
              {selectedGoals.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, margin: "0.6rem 0" }}>
                  {selectedGoals.map(id => {
                    const g = GOALS.find(x => x.id === id)
                    return g ? (
                      <span key={id} style={{ background: "rgba(46,204,138,0.12)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: 99, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)" }}>
                        {g.icon} {g.label}
                      </span>
                    ) : null
                  })}
                </div>
              )}
              {emailSent && (
                <div style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: "12px", padding: "0.75rem 1rem", margin: "0.75rem 0", textAlign: "left" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.85rem", marginBottom: "0.2rem" }}>📧 Bestätigungslink gesendet</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    An <strong style={{ color: "var(--text)" }}>{email}</strong>
                  </div>
                </div>
              )}
              <button
                onClick={finish}
                style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", borderRadius: "14px", padding: "1rem", fontWeight: 900, fontSize: "1.05rem", cursor: "pointer", marginTop: "0.75rem" }}
              >
                TRUE öffnen →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: "10px",
  padding: "0.85rem 1rem", fontSize: "0.95rem",
  outline: "none", boxSizing: "border-box",
  background: "var(--background)",
  border: "1px solid var(--border)",
  color: "var(--text)",
}
