"use client"
import React, { useEffect, useId, useRef, useState } from "react"
import type { CoachAction, CoachMsg, Mood } from "@/lib/labCoach"
import { Btn, Sheet } from "./ui"

export const MASCOT_NAME = "Kolbi"

// ── Kolbi: kleiner Laborkolben mit Gesicht ─────────────────────────────────────

/**
 * fill: Füllstand 0–1 (Tamagotchi: wie viel heute erledigt ist) · glow: Serie läuft · murky: vernachlässigt
 */
/** Kolbis Augen folgen dem Finger/Mauszeiger – und schauen zwischendurch selbst mal herum. */
function useLook(ref: React.RefObject<SVGSVGElement | null>, on: boolean) {
  const [look, setLook] = useState({ x: 0, y: 0 })
  useEffect(() => {
    if (!on) return
    let raf = 0, last = 0
    const move = (e: PointerEvent) => {
      last = Date.now()
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect()
        if (!r) return
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.6)
        const d = Math.hypot(dx, dy) || 1
        const k = Math.min(1, d / 160)
        setLook({ x: (dx / d) * 2.6 * k, y: (dy / d) * 2 * k })
      })
    }
    const idle = setInterval(() => {
      if (Date.now() - last < 3000) return
      const r = Math.random()
      setLook(r < 0.4 ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 3 })
    }, 2600)
    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerdown", move, { passive: true })
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerdown", move); clearInterval(idle); cancelAnimationFrame(raf) }
  }, [on, ref])
  return look
}

export type Accessory = "shades" | "nightcap" | null

export function Mascot({ mood = "happy", size = 56, fill, glow, murky, alive, accessory }: {
  mood?: Mood; size?: number; fill?: number; glow?: boolean; murky?: boolean
  /** blinzeln + Blick folgt dem Finger */
  alive?: boolean
  accessory?: Accessory
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const look = useLook(svgRef, !!alive)
  const level = fill == null ? 0 : -8 + (1 - Math.max(0, Math.min(1, fill))) * 52
  const uid = useId().replace(/:/g, "")
  const eyes = {
    happy: <><ellipse cx="41" cy="60" rx="4" ry="5" fill="#1a1c20" /><ellipse cx="59" cy="60" rx="4" ry="5" fill="#1a1c20" /><circle cx="42.5" cy="58" r="1.4" fill="#fff" /><circle cx="60.5" cy="58" r="1.4" fill="#fff" /></>,
    think: <><ellipse cx="41" cy="60" rx="4" ry="5" fill="#1a1c20" /><ellipse cx="59" cy="60" rx="4" ry="5" fill="#1a1c20" /><circle cx="43" cy="57.5" r="1.4" fill="#fff" /><circle cx="61" cy="57.5" r="1.4" fill="#fff" /><path d="M53 50 q6 -4 11 0" stroke="#1a1c20" strokeWidth="2.4" fill="none" strokeLinecap="round" /></>,
    alert: <><circle cx="41" cy="59" r="5.5" fill="#fff" stroke="#1a1c20" strokeWidth="2" /><circle cx="59" cy="59" r="5.5" fill="#fff" stroke="#1a1c20" strokeWidth="2" /><circle cx="41" cy="59" r="2.6" fill="#1a1c20" /><circle cx="59" cy="59" r="2.6" fill="#1a1c20" /></>,
    party: <><path d="M36 61 q5 -7 10 0" stroke="#1a1c20" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M54 61 q5 -7 10 0" stroke="#1a1c20" strokeWidth="3" fill="none" strokeLinecap="round" /></>,
    sleepy: <><path d="M36 60 q5 4 10 0" stroke="#1a1c20" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M54 60 q5 4 10 0" stroke="#1a1c20" strokeWidth="3" fill="none" strokeLinecap="round" /></>,
  }[mood]
  const mouth = {
    happy: <path d="M44 70 q6 6 12 0" stroke="#1a1c20" strokeWidth="2.6" fill="none" strokeLinecap="round" />,
    think: <path d="M45 72 h10" stroke="#1a1c20" strokeWidth="2.6" strokeLinecap="round" />,
    alert: <ellipse cx="50" cy="72" rx="3.5" ry="4.2" fill="#1a1c20" />,
    party: <path d="M42 68 q8 11 16 0 z" fill="#1a1c20" />,
    sleepy: <path d="M46 71 q4 3 8 0" stroke="#1a1c20" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
  }[mood]
  return (
    <svg ref={svgRef} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${MASCOT_NAME}, dein Lab-Coach`} style={{
      display: "block", overflow: "visible",
      filter: glow ? "drop-shadow(0 0 10px rgba(46,204,138,.75))" : undefined, transition: "filter .6s",
    }}>
      <defs>
        <linearGradient id={`liq-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={murky ? "#8f9a7a" : "#2ECC8A"} />
          <stop offset="1" stopColor={murky ? "#6b7280" : "#3987e5"} />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <path d="M40 14 h20 v22 l20 36 c5 9 -1 20 -11 20 H31 c-10 0 -16 -11 -11 -20 l20 -36 z" />
        </clipPath>
      </defs>
      {/* Glas */}
      <path d="M40 14 h20 v22 l20 36 c5 9 -1 20 -11 20 H31 c-10 0 -16 -11 -11 -20 l20 -36 z" fill="#eafaf3" />
      <g clipPath={`url(#clip-${uid})`}>
        <g style={{ transform: `translateY(${level}px)`, transition: "transform 1s cubic-bezier(.3,.9,.3,1)" }}>
          <path className="lab-wave" d="M-20 50 C -2 44, 10 54, 22 49 S 48 44, 62 50 S 88 56, 100 49 S 124 44, 140 50 V 160 H-20 Z" fill={`url(#liq-${uid})`} />
        </g>
        <circle cx="34" cy="82" r="3" fill="#fff" opacity=".5" />
        <circle cx="66" cy="78" r="2.2" fill="#fff" opacity=".5" />
      </g>
      <path d="M40 14 h20 v22 l20 36 c5 9 -1 20 -11 20 H31 c-10 0 -16 -11 -11 -20 l20 -36 z" fill="none" stroke="#1a1c20" strokeWidth="3" strokeLinejoin="round" />
      <rect x="36" y="8" width="28" height="9" rx="4.5" fill="#fff" stroke="#1a1c20" strokeWidth="3" />
      {/* Gesicht */}
      <circle cx="34" cy="68" r="4" fill="#ff8fa3" opacity=".7" />
      <circle cx="66" cy="68" r="4" fill="#ff8fa3" opacity=".7" />
      <g style={{ transform: `translate(${look.x}px, ${look.y}px)`, transition: "transform .35s cubic-bezier(.3,.9,.3,1)" }}>
        <g className={alive && accessory !== "shades" && mood !== "sleepy" && mood !== "party" ? "lab-blink" : undefined}>{eyes}</g>
      </g>
      {mouth}
      {accessory === "shades" && (
        <g className="lab-pop">
          <path d="M31 55 h16 a2 2 0 0 1 2 2 v3 a6 6 0 0 1 -6 6 h-5 a7 7 0 0 1 -7 -7 v-2 a2 2 0 0 1 2 -2 z" fill="#111" />
          <path d="M53 55 h16 a2 2 0 0 1 2 2 v2 a7 7 0 0 1 -7 7 h-5 a6 6 0 0 1 -6 -6 v-3 a2 2 0 0 1 2 -2 z" fill="#111" />
          <path d="M49 58 h4" stroke="#111" strokeWidth="2.4" />
          <path d="M34 58 l5 -2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
          <path d="M56 58 l5 -2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
        </g>
      )}
      {accessory === "nightcap" && (
        <g className="lab-pop">
          <path d="M34 12 C 40 -4, 66 -8, 80 6 C 72 4, 70 8, 66 12 Z" fill="#5b6ee1" stroke="#1a1c20" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M34 12 h32" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="82" cy="8" r="5" fill="#fff" stroke="#1a1c20" strokeWidth="2" />
        </g>
      )}
      {mood === "party" && <>
        <path d="M14 20 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1 z" fill="#f5b400" />
        <circle cx="86" cy="24" r="3" fill="#e87ba4" /><circle cx="82" cy="12" r="2" fill="#2ECC8A" />
      </>}
      {mood === "sleepy" && <text x="72" y="22" fontSize="14" fontWeight="900" fill="#7a7a9a">z</text>}
      {mood === "think" && <text x="74" y="24" fontSize="18" fontWeight="900" fill="#3987e5">?</text>}
      {mood === "alert" && <text x="76" y="26" fontSize="20" fontWeight="900" fill="#e34948">!</text>}
    </svg>
  )
}

// ── Coach-Karte mit Sprechblase (oben im Dashboard) ───────────────────────────

export function CoachBubble({ msg, onAction, more, onMore, compact }: { msg: CoachMsg; onAction: (a: CoachAction, id: string) => void; more: number; onMore: () => void; compact?: boolean }) {
  return (
    <div className="lab-rise" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      {!compact && <div className="lab-float" style={{ flexShrink: 0, marginTop: 4 }}><Mascot mood={msg.mood} size={58} /></div>}
      <div className={compact ? "lab-card" : undefined} style={compact ? { flex: 1, minWidth: 0, padding: "14px 16px" } : {
        position: "relative", flex: 1, minWidth: 0, background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "20px 20px 20px 6px", padding: "12px 14px", boxShadow: "var(--shadow)",
      }}>
        {!compact && <span aria-hidden style={{ position: "absolute", left: -7, top: 22, width: 14, height: 14, background: "var(--surface)", borderLeft: "1px solid var(--border)", borderBottom: "1px solid var(--border)", transform: "rotate(45deg)" }} />}
        {compact && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.68rem", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 6 }}><Mascot mood={msg.mood} size={18} /> {MASCOT_NAME} meint</div>}
        <div style={{ fontWeight: 900, fontSize: "0.98rem", marginBottom: 3 }}>{msg.title}</div>
        <div style={{ fontSize: "0.86rem", lineHeight: 1.45, color: "var(--text-dim)" }}>{msg.text}</div>
        {msg.actions && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {msg.actions.map((a, i) => (
              <Btn key={i} variant={a.primary ? "primary" : "soft"} onClick={() => onAction(a.action, msg.id)} style={{ padding: "9px 12px", fontSize: "0.8rem", borderRadius: 12 }}>{a.label}</Btn>
            ))}
          </div>
        )}
        {more > 0 && (
          <button onClick={onMore} style={{ marginTop: 8, background: "none", border: "none", color: "var(--accent)", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer", padding: 0 }}>
            + {more} weitere{more === 1 ? "r" : ""} Tipp{more === 1 ? "" : "s"} von {MASCOT_NAME}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Kleiner Kolbi-Tipp (z. B. beste Einnahmezeit) ─────────────────────────────

export function KolbiTip({ title, children, mood = "happy" }: { title: React.ReactNode; children?: React.ReactNode; mood?: Mood }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 18, background: "var(--accent-dim)", textAlign: "left" }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}><Mascot mood={mood} size={30} /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 900, fontSize: "0.88rem" }}>{title}</span>
        {children && <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.45, marginTop: 2 }}>{children}</span>}
      </span>
    </div>
  )
}

// ── Schwebender Kolbi unten rechts → Hilfe & alle Tipps ────────────────────────

export function FloatingMascot({ mood, badge, onClick }: { mood: Mood; badge: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="lab-press" aria-label={`${MASCOT_NAME} fragen: Tipps und Hilfe`} style={{
      position: "fixed", right: 14, bottom: "calc(78px + env(safe-area-inset-bottom))", zIndex: 190,
      width: 62, height: 62, borderRadius: 999, border: "2px solid var(--accent)", background: "var(--surface)",
      boxShadow: "0 10px 30px rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
    }}>
      <span className="lab-wiggle" style={{ display: "inline-block" }}><Mascot mood={mood} size={46} /></span>
      {badge > 0 && (
        <span style={{ position: "absolute", top: -4, right: -4, minWidth: 22, height: 22, borderRadius: 999, background: "var(--danger)", color: "#fff", fontSize: "0.72rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{badge}</span>
      )}
    </button>
  )
}

const GUIDE: { q: string; a: string }[] = [
  { q: "Wie funktioniert das Lab?", a: "1) Reset: ein paar Tage gar nichts nehmen, so lerne ich dein Normal kennen. 2) Einzeln testen: immer nur ein Supplement für ein paar Tage, dazwischen kurze Pausen. 3) Stack: alles, was gewirkt hat, nimmst du am Ende zusammen, und ich passe auf, ob die Wirkung anhält." },
  { q: "Was muss ich jeden Tag tun?", a: "Nur zwei Dinge: Einnahme abhaken (ein Tipp, die Uhrzeit speichere ich automatisch) und abends ein Gesicht antippen: Wie war dein Tag? Mehr nicht." },
  { q: "Was ist „Feintuning“?", a: "Optional kannst du einzelne Bereiche mit Sternen bewerten, z. B. Schlaf oder Energie. Unter jedem Bereich steht, was gemeint ist. Der Tagesdurchschnitt wird automatisch berechnet." },
  { q: "Warum Nebenwirkungen eintragen?", a: "Damit ich Nutzen gegen Nachteile abwägen kann. Tipp einmal für „leicht“, zweimal für „stark“. Bei starken Nebenwirkungen schlage ich dir vor, den Test abzubrechen." },
  { q: "Woher weißt du, ob etwas wirkt?", a: "Ich vergleiche deine Werte im Test mit deinen Reset-Tagen, gewichte nach deinen Zielen und ziehe Nebenwirkungen ab. Am Ende eines Tests bekommst du einen Vorschlag: behalten, vielleicht oder raus. Du bestätigst mit einem Tipp." },
  { q: "Was ist der Countdown oben?", a: "Er zeigt, wie lange die aktuelle Phase noch läuft, also wann der nächste Schritt kommt." },
  { q: "Was passiert im Stack?", a: "Du nimmst alle behaltenen Supplements zusammen. Lässt die Wirkung nach, schlage ich vor, eins für 3 Tage wegzulassen. So findest du raus, ob es wirklich noch hilft oder ob andere Dinge (Schlaf, Stress) schuld sind." },
  { q: "Kann ich die Reihenfolge ändern?", a: "Ja. Wenn ein Test ansteht, tippe auf „Anderes wählen“ oder direkt auf ein Supplement in deiner Liste." },
  { q: "Wo sind meine Daten?", a: "Nur auf deinem Gerät. Unter ⚙️ kannst du ein Backup erstellen und auf ein anderes Gerät übertragen." },
]

/** Kolbis aktuelle Tipps als Liste (Kolbi-Tab & Hilfe). */
export function TipsList({ msgs, onAction, onDone }: { msgs: CoachMsg[]; onAction: (a: CoachAction, id: string) => void; onDone?: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {msgs.map((m, k) => (
        <div key={m.id} className="lab-rise" style={{ animationDelay: `${Math.min(k, 6) * 0.04}s`, display: "flex", gap: 10, padding: 12, borderRadius: 18, background: "var(--surface)", border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)" }}>
          <Mascot mood={m.mood} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "0.92rem" }}>{m.title}</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.45 }}>{m.text}</div>
            {m.actions && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {m.actions.map((a, i) => (
                  <Btn key={i} variant={a.primary ? "primary" : "soft"} onClick={() => { onAction(a.action, m.id); onDone?.() }} style={{ padding: "8px 11px", fontSize: "0.8rem", borderRadius: 12 }}>{a.label}</Btn>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** „So funktioniert die App“ – aufklappbare Fragen. */
export function Guide({ openFirst }: { openFirst?: boolean }) {
  const [open, setOpen] = useState<number | null>(openFirst ? 0 : null)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {GUIDE.map((g, i) => (
        <div key={g.q} style={{ borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <button onClick={() => setOpen(o => o === i ? null : i)} style={{
            width: "100%", textAlign: "left", padding: "12px 14px", background: "none", border: "none", color: "var(--text)",
            fontWeight: 800, fontSize: "0.88rem", display: "flex", justifyContent: "space-between", gap: 8, cursor: "pointer",
          }}>{g.q}<span style={{ color: "var(--text-dim)" }}>{open === i ? "−" : "+"}</span></button>
          {open === i && <div className="lab-fade" style={{ padding: "0 14px 12px", fontSize: "0.84rem", lineHeight: 1.5, color: "var(--text-dim)" }}>{g.a}</div>}
        </div>
      ))}
    </div>
  )
}

export function HelpSheet({ msgs, onAction, onClose }: { msgs: CoachMsg[]; onAction: (a: CoachAction, id: string) => void; onClose: () => void }) {
  return (
    <Sheet open onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Mascot mood={msgs[0]?.mood ?? "happy"} size={64} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: "1.2rem" }}>Hi, ich bin {MASCOT_NAME}!</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>Ich werte deine Daten aus und sage dir, was als Nächstes dran ist.</div>
        </div>
        <button onClick={onClose} className="lab-press" aria-label="Schließen" style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text-dim)" }}>✕</button>
      </div>
      {msgs.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 10 }}>Meine Tipps für dich</div>
          <TipsList msgs={msgs} onAction={onAction} onDone={onClose} />
        </div>
      )}
      <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: 8 }}>So funktioniert die App</div>
      <Guide openFirst={!msgs.length} />
    </Sheet>
  )
}
