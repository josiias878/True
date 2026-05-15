"use client"
import React, { useEffect, useRef, useState, useCallback, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import AuthModal from "@/components/AuthModal"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"

function px(id: number, w = 1920, h = 1080) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`
}

const SLIDES = [
  {
    id: 3523455,       // Abgeholzter Regenwald
    tint: "rgba(100,20,0,0.3)",
    context: "Jeden Tag brennt ein Wald, damit du Schokolade kaufen kannst.",
    tag: "🔥 Brennende Wälder",
    tagColor: "#ff6b6b",
  },
  {
    id: 4996765,       // Plastikmüll
    tint: "rgba(0,20,60,0.28)",
    context: "74 Mio. Tonnen Plastik — Jahr für Jahr. TRUE zeigt, wer dahinter steckt.",
    tag: "🌊 Plastikmüll",
    tagColor: "#38BDF8",
  },
  {
    id: 2280571,       // Pillen / Giftstoffe
    tint: "rgba(80,20,0,0.26)",
    context: "Glyphosat, Palmöl, PFAS — in Produkten, die du täglich kaufst.",
    tag: "☠️ Giftstoffe",
    tagColor: "#fb923c",
  },
  {
    id: 164527,        // Geldscheine — Konzernmacht
    tint: "rgba(10,30,10,0.3)",
    context: "10 Konzerne kontrollieren fast alles, was du im Supermarkt siehst.",
    tag: "💰 Konzernmacht",
    tagColor: "#a78bfa",
  },
]

function useInView(threshold = 0.04) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold, rootMargin: "0px 0px -20px 0px" })
    if (ref.current) o.observe(ref.current)
    return () => o.disconnect()
  }, [threshold])
  return { ref, vis }
}

function useCountUp(target: number, duration = 2000, start = false) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!start) return
    let t0: number | null = null
    const tick = (ts: number) => {
      if (!t0) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      setV(Math.floor((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration, start])
  return v
}

// ─── Phone Shell (klein) ───────────────────────────────────────────────────
function SmallPhone({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 128,
      filter: "drop-shadow(0 18px 32px rgba(0,0,0,0.18)) drop-shadow(0 4px 10px rgba(0,0,0,0.1))",
    }}>
      <div style={{ background: "#1c1c1e", borderRadius: 26, padding: 4, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }}>
        <div style={{ background: "#000", borderRadius: 23, overflow: "hidden" }}>
          {/* Status bar */}
          <div style={{ height: 24, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px 0 8px" }}>
            <span style={{ fontSize: "0.42rem", fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.02em" }}>9:41</span>
            <div style={{ width: 48, height: 12, background: "#1c1c1e", borderRadius: 6 }} />
            <div style={{ width: 14, height: 6, background: "rgba(255,255,255,0.55)", borderRadius: 2 }} />
          </div>
          {/* Screen content */}
          <div style={{ height: 252 }}>{children}</div>
          {/* Home indicator */}
          <div style={{ height: 15, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 54, height: 2.5, background: "rgba(255,255,255,0.22)", borderRadius: 2 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── App Screens ───────────────────────────────────────────────────────────
function ScanScreen() {
  return (
    <div style={{ background: "#000", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#0a0a0a", padding: "6px 11px 5px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.65rem", fontWeight: 900, color: "#2ECC8A", letterSpacing: "-0.05em" }}>TRUE</span>
        <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.35)" }}>📷 Scanner</span>
      </div>
      {/* Viewfinder */}
      <div style={{ flex: 1, position: "relative", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        {/* Corner brackets */}
        {([{top:22,left:22},{top:22,right:22},{bottom:22,left:22},{bottom:22,right:22}] as React.CSSProperties[]).map((pos, i) => (
          <div key={i} style={{ position: "absolute", width: 18, height: 18, ...pos }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: "#2ECC8A", borderRadius: 1.5 }} />
            <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 2.5, background: "#2ECC8A", borderRadius: 1.5 }} />
          </div>
        ))}
        <div style={{ position: "absolute", left: "18%", right: "18%", height: 1.5, background: "linear-gradient(90deg, transparent, #2ECC8A, transparent)", boxShadow: "0 0 8px #2ECC8A99", animation: "scanLine 2s ease-in-out infinite" }} />
        <div style={{ display: "flex", gap: 1.5, alignItems: "center", opacity: 0.45 }}>
          {[3,1,4,2,3,1,5,2,1,3,2,1,4,2].map((w, i) => (
            <div key={i} style={{ width: w * 1.2, background: "rgba(255,255,255,0.8)", height: 46, borderRadius: 0.5 }} />
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 7, left: "50%", transform: "translateX(-50%)", fontSize: "0.4rem", color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>ERKENNE BARCODE …</div>
      </div>
      {/* Result */}
      <div style={{ background: "#0d1117", padding: "8px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <div>
            <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#fff" }}>Maggi Würze</div>
            <div style={{ fontSize: "0.46rem", color: "rgba(255,255,255,0.35)" }}>Nestlé S.A.</div>
          </div>
          <div style={{ background: "rgba(255,59,48,0.18)", border: "1px solid rgba(255,59,48,0.45)", borderRadius: 4, padding: "1px 5px", fontSize: "0.42rem", fontWeight: 800, color: "#ff6b6b" }}>KRITISCH</div>
        </div>
        <div style={{ display: "flex", gap: 3, marginBottom: 7, flexWrap: "wrap" }}>
          {["🌳 Abholzung", "☠️ Glyphosat"].map(t => (
            <span key={t} style={{ background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 3, padding: "1px 4px", fontSize: "0.4rem", color: "#ff9f9f" }}>{t}</span>
          ))}
        </div>
        <button style={{ width: "100%", background: "#2ECC8A", border: "none", borderRadius: 7, padding: "6px", fontSize: "0.52rem", fontWeight: 800, color: "#000", cursor: "pointer" }}>+ Zur Einkaufsliste</button>
      </div>
    </div>
  )
}

function ListScreen() {
  const items = [
    { name: "Bio Vollmilch",  brand: "Weihenstephan", done: true  },
    { name: "Hafer Drink",    brand: "Oatly",          done: true  },
    { name: "Rote Linsen Bio",brand: "Alnatura",       done: false },
    { name: "Olivenöl nativ", brand: "Bertolli",       done: false },
    { name: "Dinkelbrot",     brand: "Mestemacher",    done: false },
  ]
  return (
    <div style={{ background: "#0d1117", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "7px 12px 6px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#fff" }}>🛒 Einkaufsliste</span>
        <span style={{ fontSize: "0.48rem", color: "#2ECC8A", fontWeight: 700 }}>2 / 5 ✓</span>
      </div>
      <div style={{ height: 2, background: "#1a1a1a" }}>
        <div style={{ height: "100%", width: "40%", background: "#2ECC8A" }} />
      </div>
      <div style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5, overflow: "hidden" }}>
        {items.map(item => (
          <div key={item.name} style={{ background: item.done ? "rgba(46,204,138,0.07)" : "rgba(255,255,255,0.03)", border: `1px solid ${item.done ? "rgba(46,204,138,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 8, padding: "5px 8px", display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${item.done ? "#2ECC8A" : "rgba(255,255,255,0.18)"}`, background: item.done ? "#2ECC8A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.44rem", color: "#000", fontWeight: 900, flexShrink: 0 }}>
              {item.done ? "✓" : ""}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.52rem", fontWeight: 700, color: item.done ? "rgba(255,255,255,0.3)" : "#fff", textDecoration: item.done ? "line-through" : "none" }}>{item.name}</div>
              <div style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.22)" }}>{item.brand}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "6px 10px", borderTop: "1px solid #1a1a1a", background: "rgba(46,204,138,0.05)", display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: "0.6rem" }}>👨‍👩‍👧</span>
        <span style={{ fontSize: "0.46rem", color: "#2ECC8A", fontWeight: 600 }}>Familie teilt diese Liste</span>
        <span style={{ marginLeft: "auto", fontSize: "0.4rem", color: "rgba(255,255,255,0.18)" }}>Live</span>
      </div>
    </div>
  )
}

function CommunityScreen() {
  return (
    <div style={{ background: "#0d1117", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "7px 12px 6px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#fff" }}>👥 Community</span>
        <div style={{ background: "rgba(167,139,250,0.14)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 4, padding: "1px 6px", fontSize: "0.42rem", fontWeight: 700, color: "#A78BFA" }}>Live</div>
      </div>
      <div style={{ flex: 1, padding: "7px 9px", display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
        {[
          { av: "👩", name: "Marie K.", time: "2h", tag: "Tipp",  tc: "#2ECC8A", text: "Lidl Eigenmarke statt Maggi — kein Nestlé! 👌", likes: 23 },
          { av: "👨", name: "Jonas R.", time: "4h", tag: "News",  tc: "#ff7700", text: "Bayer zahlt 2 Mrd. USD für Roundup-Klagen 🔬",  likes: 41 },
          { av: "🧑", name: "Sara L.",  time: "5h", tag: "Frage", tc: "#38BDF8", text: "Kennt ihr palmölfreie Schokocreme?",             likes: 17 },
        ].map((p, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <div style={{ width: 19, height: 19, borderRadius: "50%", background: `${p.tc}16`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", flexShrink: 0 }}>{p.av}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.48rem", fontWeight: 700, color: "#fff" }}>{p.name}</div>
                <div style={{ fontSize: "0.4rem", color: "rgba(255,255,255,0.25)" }}>{p.time}</div>
              </div>
              <div style={{ background: `${p.tc}16`, border: `1px solid ${p.tc}32`, borderRadius: 3, padding: "1px 4px", fontSize: "0.38rem", fontWeight: 800, color: p.tc }}>{p.tag}</div>
            </div>
            <p style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.58)", lineHeight: 1.5, margin: "0 0 4px" }}>{p.text}</p>
            <span style={{ fontSize: "0.4rem", color: "rgba(255,255,255,0.25)" }}>❤️ {p.likes}</span>
          </div>
        ))}
        <div style={{ background: "rgba(167,139,250,0.07)", border: "1px dashed rgba(167,139,250,0.28)", borderRadius: 7, padding: "5px", textAlign: "center" }}>
          <span style={{ fontSize: "0.48rem", color: "#A78BFA", fontWeight: 700 }}>✏️ Eigenen Beitrag posten</span>
        </div>
      </div>
    </div>
  )
}

function CoachScreen() {
  const msgs = [
    { from: "coach", text: "Hey! Basierend auf deinen Zielen habe ich deinen Wochenplan erstellt 🌱" },
    { from: "user",  text: "Was kann ich als Snack nehmen?" },
    { from: "coach", text: "Walnüsse, Hummus & Reiswaffeln — alle palmölfrei ✓" },
    { from: "user",  text: "Perfekt, danke!" },
  ]
  return (
    <div style={{ background: "#0d1117", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "7px 12px 6px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#4ade80,#22c55e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem" }}>🥗</div>
          <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "#fff" }}>TRUE Coach</span>
        </div>
        <span style={{ fontSize: "0.38rem", color: "#4ade80", fontWeight: 700 }}>● Online</span>
      </div>
      <div style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6, overflow: "hidden", justifyContent: "flex-end" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              background: m.from === "user" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${m.from === "user" ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: m.from === "user" ? "10px 10px 3px 10px" : "10px 10px 10px 3px",
              padding: "4px 8px", maxWidth: "78%",
            }}>
              <p style={{ margin: 0, fontSize: "0.42rem", color: m.from === "user" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.65)", lineHeight: 1.45 }}>{m.text}</p>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "4px 7px" }}>
            <span style={{ fontSize: "0.38rem", color: "rgba(255,255,255,0.25)" }}>Nachricht schreiben…</span>
          </div>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5rem" }}>↑</div>
        </div>
      </div>
    </div>
  )
}

function KonzerneScreen() {
  return (
    <div style={{ background: "#0d1117", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "7px 12px 6px", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#fff" }}>🕵️ Konzerne</span>
        <span style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.28)" }}>847+ erfasst</span>
      </div>
      <div style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 7, overflow: "hidden" }}>
        {[
          { name: "Nestlé",   badge: "KRITISCH", bc: "#ff3b30", brands: ["Maggi", "KitKat", "Nespresso", "+83"], info: "Abholzung · Wasserrechte" },
          { name: "Unilever", badge: "HOCH",     bc: "#ff9500", brands: ["Dove", "Knorr", "Axe", "+400"],       info: "Palmöl · PFAS" },
          { name: "Bayer",    badge: "HOCH",     bc: "#ff9500", brands: ["Aspirin", "Roundup", "+60"],          info: "Glyphosat · Krebsklagen" },
        ].map((k) => (
          <div key={k.name} style={{ background: `${k.bc}08`, border: `1px solid ${k.bc}25`, borderRadius: 9, padding: "7px 9px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "#fff" }}>{k.name}</span>
              <span style={{ background: `${k.bc}20`, border: `1px solid ${k.bc}48`, borderRadius: 3, padding: "1px 4px", fontSize: "0.4rem", fontWeight: 800, color: k.bc }}>{k.badge}</span>
            </div>
            <div style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.28)", marginBottom: 4 }}>{k.info}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {k.brands.map(b => (
                <span key={b} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 3, padding: "1px 4px", fontSize: "0.38rem", color: "rgba(255,255,255,0.4)" }}>{b}</span>
              ))}
            </div>
          </div>
        ))}
        <div style={{ textAlign: "center", padding: "4px", fontSize: "0.46rem", color: "rgba(255,255,255,0.22)" }}>+ 844 weitere Konzerne →</div>
      </div>
    </div>
  )
}

// Helper: Schlüsselwort grün unterstreichen
function G({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ position: "relative", display: "inline" }}>
      {children}
      <span style={{
        position: "absolute", left: 0, right: 0, bottom: "-3px", height: "2.5px",
        background: "linear-gradient(90deg, #2ECC8A, #1bab6b)",
        borderRadius: 2,
        boxShadow: "0 0 6px rgba(46,204,138,0.45)",
      }} />
    </span>
  )
}

// ─── Nummerierte Feature-Sektion ──────────────────────────────────────────
function FeatureSection({ num, icon, color, label, title, desc, phone, bg, floatAnim }: {
  num: string; icon: string; color: string; label: string
  title: React.ReactNode; desc: React.ReactNode; phone: React.ReactNode; bg: string; floatAnim: string
}) {
  const { ref, vis } = useInView(0.06)
  return (
    <section ref={ref} style={{ background: bg, borderTop: "1px solid rgba(0,0,0,0.055)", padding: "4.5rem 2rem 5rem", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "clamp(12rem, 24vw, 20rem)",
        fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1,
        color: `${color}18`,
        userSelect: "none", pointerEvents: "none", whiteSpace: "nowrap",
      }}>{num}</div>

      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", zIndex: 2 }}>

        {/* Number + label */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "2rem" }}>
          <span style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "-0.08em", lineHeight: 1, color, textShadow: `0 0 36px ${color}40` }}>{num}</span>
          <div style={{ width: 1.5, height: 30, background: `${color}30`, borderRadius: 1 }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: `${color}12`, border: `1px solid ${color}35`, borderRadius: 99, padding: "0.32rem 0.9rem" }}>
            <span style={{ fontSize: "0.95rem" }}>{icon}</span>
            <span style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.18em", color, textTransform: "uppercase" }}>{label}</span>
          </div>
        </div>

        {/* Phone */}
        <div style={{
          animation: vis ? `${floatAnim} 4s ease-in-out infinite` : "none",
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(40px)",
          transition: "opacity 0.75s ease, transform 0.9s cubic-bezier(.22,1,.36,1)",
          marginBottom: "2rem",
        }}>
          <SmallPhone>{phone}</SmallPhone>
        </div>

        {/* Title + desc */}
        <div style={{
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.65s ease 0.2s, transform 0.65s ease 0.2s",
        }}>
          <h3 style={{
            fontSize: "clamp(1.4rem, 2.8vw, 1.8rem)",
            fontWeight: 900, color: "#0f172a",
            letterSpacing: "-0.03em", lineHeight: 1.1,
            marginBottom: "0.75rem",
          }}>{title}</h3>
          <p style={{
            fontSize: "1rem", color: "#475569",
            lineHeight: 1.75, margin: 0,
            fontWeight: 500, maxWidth: 400,
          }}>{desc}</p>
        </div>
      </div>
    </section>
  )
}

// ─── Feature Block Card ───────────────────────────────────────────────────
const CARD_ORIGINS = [
  "translate(-100px,-80px) rotate(-13deg) scale(0.72)",
  "translate( 100px,-80px) rotate( 13deg) scale(0.72)",
  "translate(-100px, 80px) rotate( 10deg) scale(0.72)",
  "translate( 100px, 80px) rotate(-10deg) scale(0.72)",
]

function AppFeatureCard({ color, icon, label, tagline, imgId, visible, index }: {
  color: string; icon: string; label: string; tagline: string; imgId: number; visible: boolean; index: number
}) {
  const [hovered, setHovered] = useState(false)
  const [pulse,   setPulse]   = useState(false)

  // Pulse-Highlight sobald Karte reinfliegt
  useEffect(() => {
    if (!visible) return
    setPulse(true)
    const t = setTimeout(() => setPulse(false), 750)
    return () => clearTimeout(t)
  }, [visible])

  const active = hovered || pulse
  // Linke Karte (index 0, 2) fliegt sofort rein — rechte (index 1, 3) mit 110ms Verzögerung
  const stagger = (index % 2 === 1) ? "110ms" : "0ms"

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 18, overflow: "hidden",
        boxShadow: visible
          ? active ? `0 20px 56px rgba(0,0,0,0.22), 0 0 0 2.5px ${color}` : "0 8px 40px rgba(0,0,0,0.16)"
          : "none",
        opacity: visible ? 1 : 0,
        transform: visible
          ? active ? "translate(0,0) rotate(0deg) scale(1.05)" : "translate(0,0) rotate(0deg) scale(1)"
          : CARD_ORIGINS[index],
        transition: `opacity 0.55s ease ${stagger}, transform 0.7s cubic-bezier(0.34,1.56,0.64,1) ${stagger}, box-shadow 0.3s ease`,
        cursor: "pointer",
      }}>
      <div style={{ height: 170, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${px(imgId, 600, 400)})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${color}18 0%, rgba(5,5,10,0.75) 100%)` }} />
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: "0.35rem", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", borderRadius: 99, padding: "0.28rem 0.7rem 0.28rem 0.5rem", border: `1px solid ${color}45` }}>
          <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>{icon}</span>
          <span style={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.12em", color, textTransform: "uppercase" }}>{label}</span>
        </div>
        <div style={{ position: "absolute", bottom: 14, left: 14, right: 14 }}>
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 900, color: "#fff", lineHeight: 1.25, letterSpacing: "-0.02em", textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}>{tagline}</p>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}44)` }} />
      </div>
    </div>
  )
}

function AppFeatureBlocks() {
  const sectionRef    = useRef<HTMLDivElement>(null)
  const lockedRef     = useRef(false)
  const cooldownRef   = useRef(false)
  const doneRef       = useRef(false)
  const touchStartY   = useRef(0)
  const savedScrollY  = useRef(0)
  const [visibleCount, setVisibleCount] = useState(0)
  const [headingVis,   setHeadingVis]   = useState(false)

  const features = [
    { icon: "📷", color: "#38BDF8", label: "Scanner",       tagline: "Scan deinen Einkauf. Erfahre Inhaltsstoffe & Konzern.", imgId: 3962285 },
    { icon: "🛒", color: "#2ECC8A", label: "Einkaufsliste", tagline: "Erstelle Listen & lade deine Familie ein.",             imgId: 3184183 },
    { icon: "👥", color: "#A78BFA", label: "Community",      tagline: "Tausch dich aus. Nimm gemeinsam Einfluss.",            imgId: 1181406 },
    { icon: "🥗", color: "#4ade80", label: "Coaching",       tagline: "Coaching für deine persönlichen Ernährungsziele.",     imgId: 1640777 },
  ]

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const lockBody = (atScrollY: number) => {
      savedScrollY.current          = atScrollY
      document.body.style.position  = "fixed"
      document.body.style.top       = `-${atScrollY}px`
      document.body.style.width     = "100%"
    }

    const unlockBody = () => {
      document.body.style.position = ""
      document.body.style.top      = ""
      document.body.style.width    = ""
      window.scrollTo(0, savedScrollY.current)
    }

    const advance = () => {
      if (!lockedRef.current || cooldownRef.current) return
      cooldownRef.current = true
      setVisibleCount(prev => {
        const next = Math.min(4, prev + 2)
        if (next >= 4) {
          setTimeout(() => {
            lockedRef.current = false
            doneRef.current   = true
            unlockBody()
          }, 800)
        }
        return next
      })
      setTimeout(() => { cooldownRef.current = false }, 800)
    }

    const handleWheel = (e: WheelEvent) => {
      if (!lockedRef.current) return
      e.preventDefault()
      if (e.deltaY > 15) advance()
    }

    const handleTouchStart = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY }
    const handleTouchMove  = (e: TouchEvent) => {
      if (!lockedRef.current) return
      e.preventDefault()
      if (touchStartY.current - e.touches[0].clientY > 28) {
        advance()
        touchStartY.current = e.touches[0].clientY
      }
    }

    // Freeze sobald Section-Oberkante den Viewport-Top erreicht
    const handlePageScroll = () => {
      if (doneRef.current || lockedRef.current) return
      const rect = section.getBoundingClientRect()
      // rect.top <= 10: Section ist oben angekommen
      // rect.top >= -80: noch nicht komplett vorbei gescrollt
      if (rect.top <= 10 && rect.top >= -80) {
        // Korrekte absolute Position: scrollY + rect.top = wo section.top=0 wäre
        const snapY = window.scrollY + rect.top
        lockBody(snapY)
        lockedRef.current = true
        setHeadingVis(true)
      }
    }

    window.addEventListener("scroll",     handlePageScroll, { passive: true  })
    window.addEventListener("wheel",      handleWheel,      { passive: false })
    window.addEventListener("touchstart", handleTouchStart, { passive: true  })
    window.addEventListener("touchmove",  handleTouchMove,  { passive: false })

    return () => {
      window.removeEventListener("scroll",     handlePageScroll)
      window.removeEventListener("wheel",      handleWheel)
      window.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("touchmove",  handleTouchMove)
      if (lockedRef.current) unlockBody()
    }
  }, [])

  return (
    <section ref={sectionRef} style={{
      background: "#f9faf8", borderTop: "1px solid rgba(0,0,0,0.05)",
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "4rem 1.5rem",
      position: "relative",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 55% at 50% 50%, rgba(46,204,138,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{
        textAlign: "center", marginBottom: "2rem",
        opacity: headingVis ? 1 : 0,
        transform: headingVis ? "translateY(0)" : "translateY(-18px)",
        transition: "opacity 0.5s ease, transform 0.6s cubic-bezier(.22,1,.36,1)",
      }}>
        <p style={{ fontSize: "0.66rem", letterSpacing: "0.2em", color: "#2ECC8A", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>Was TRUE kann</p>
        <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em" }}>Eine App. Vier Werkzeuge.</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", maxWidth: "640px", width: "100%", position: "relative" }}>
        {features.map((f, i) => <AppFeatureCard key={i} {...f} visible={i < visibleCount} index={i} />)}
      </div>

      {/* Pfeil im normalen Fluss — immer sichtbar wenn Section aktiv */}
      <div style={{
        marginTop: "2.5rem",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem",
        opacity: headingVis && visibleCount < 4 ? 1 : 0,
        transition: "opacity 0.5s ease",
        pointerEvents: "none",
      }}>
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {visibleCount === 0 ? "Scroll für mehr" : visibleCount < 4 ? "Weiter scrollen" : ""}
        </span>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ animation: "scrollBounce 1.3s ease-in-out infinite" }}>
          <circle cx="20" cy="20" r="19" stroke="#cbd5e1" strokeWidth="1.5" />
          <path d="M12 17 L20 25 L28 17" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  )
}

function FeaturesShowcase({ onLogin }: { onLogin: () => void }) {
  return (
    <div id="features">
      <FeatureSection
        num="01" icon="📷" color="#38BDF8" label="Scanner"
        title={<>Scan. Erkenn. <G>Entscheid.</G></>}
        desc={<>Halte die Kamera auf jeden Barcode — sieh sofort <G>welcher Konzern</G> dahinter steckt, welche <G>Schäden belegt</G> sind und welche Alternative besser ist.</>}
        phone={<ScanScreen />} bg="#ffffff" floatAnim="float0"
      />
      <FeatureSection
        num="02" icon="🛒" color="#2ECC8A" label="Einkaufsliste"
        title={<>Bewusst planen. <G>Gezielt kaufen.</G></>}
        desc={<>Erstelle Listen für <G>Familie, Kinder oder Haustiere</G>, teile sie in Echtzeit und erhalte <G>Allergie-Warnungen</G> bei unverträglichen Produkten.</>}
        phone={<ListScreen />} bg="#f4f7f4" floatAnim="float1"
      />
      <FeatureSection
        num="03" icon="👥" color="#A78BFA" label="Community"
        title={<>Gemeinsam <G>mehr erreichen.</G></>}
        desc={<>Entdecke Tipps echter Nutzer, teile <G>bessere Alternativen</G> und meide Konzerne gemeinsam — <G>jede Stimme zählt.</G></>}
        phone={<CommunityScreen />} bg="#ffffff" floatAnim="float2"
      />
      <FeatureSection
        num="04" icon="🥗" color="#4ade80" label="Coaching"
        title={<>Dein persönlicher <G>Ernährungscoach.</G></>}
        desc={<>Lege deine Ziele & <G>Unverträglichkeiten</G> fest — dein KI-Coach empfiehlt passende Produkte und begleitet dich zu einem <G>bewussteren Einkauf.</G></>}
        phone={<CoachScreen />} bg="#f4f7f4" floatAnim="float3"
      />
      <div style={{ background: "#ffffff", borderTop: "1px solid rgba(0,0,0,0.055)", padding: "3rem 2rem", textAlign: "center" }}>
        <button onClick={onLogin} style={{ background: "#2ECC8A", color: "#000", borderRadius: 12, padding: "0.9rem 2.5rem", fontWeight: 800, fontSize: "0.98rem", border: "none", cursor: "pointer", boxShadow: "0 0 50px rgba(46,204,138,0.2)" }}>
          Kostenlos starten →
        </button>
      </div>
    </div>
  )
}

// ─── Landing ───────────────────────────────────────────────────────────────
function LandingInner() {
  const [slide,     setSlide]     = useState(0)
  const [scrollY,   setScrollY]   = useState(0)
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null)
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { user }     = useSupabaseAuth()
  const next = useCallback(() => setSlide(s => (s + 1) % SLIDES.length), [])
  useEffect(() => { const t = setInterval(next, 4000); return () => clearInterval(t) }, [next])
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])
  useEffect(() => { if (searchParams.get("login") === "1") setAuthMode("login") }, [searchParams])
  // Logged-in users skip landing — but NOT during registration (authMode is open)
  useEffect(() => {
    if (user && !authMode) router.replace("/home")
  }, [user, router, authMode])
  // Guest CTA — no login required
  const goToApp = useCallback(() => router.push("/scan"), [router])
  const openRegister = useCallback(() => setAuthMode("register"), [])

  return (
    <>
    <div style={{ background: "#f9faf8", color: "#0f172a", fontFamily: "system-ui,-apple-system,sans-serif", overflowX: "hidden" }}>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 300, padding: "0 1.5rem", height: "62px", display: "flex", alignItems: "center", justifyContent: "space-between", background: scrollY > 60 ? "rgba(8,8,15,0.96)" : "transparent", backdropFilter: "blur(20px)", borderBottom: scrollY > 60 ? "1px solid rgba(255,255,255,0.07)" : "none", transition: "all 0.35s" }}>
        <span style={{ fontSize: "1.45rem", fontWeight: 900, letterSpacing: "-0.06em", color: "#2ECC8A" }}>TRUE</span>
        <button onClick={() => setAuthMode("login")} style={{ background: "rgba(46,204,138,0.15)", border: "1px solid rgba(46,204,138,0.4)", color: "#2ECC8A", borderRadius: "10px", padding: "0.45rem 1.1rem", fontWeight: 700, fontSize: "0.87rem", cursor: "pointer" }}>
          Anmelden →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", height: "100vh", overflow: "hidden" }}>
        {SLIDES.map((s, i) => (
          <div key={i} style={{ position: "absolute", inset: 0, opacity: i === slide ? 1 : 0, transition: "opacity 1.8s ease-in-out" }}>
            <div style={{ position: "absolute", inset: "-5%", backgroundImage: `url(${px(s.id, 1920, 1080)})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.68) saturate(0.85) contrast(1.05)", animation: i === slide ? "kb 14s ease-out forwards" : "none" }} />
            <div style={{ position: "absolute", inset: 0, background: s.tint }} />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 25%, rgba(5,5,10,0.88) 100%)" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 45%, rgba(5,5,10,1) 100%)" }} />
          </div>
        ))}

        {/* Slide context label — oben links */}
        <div style={{ position: "absolute", top: "5.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          {SLIDES.map((s, i) => (
            <div key={i} style={{
              position: "absolute",
              opacity: i === slide ? 1 : 0,
              transition: "opacity 1s ease",
              display: "flex", alignItems: "center", gap: "0.55rem",
              background: "rgba(0,0,0,0.42)", backdropFilter: "blur(12px)",
              border: `1px solid ${s.tagColor}35`,
              borderRadius: 99, padding: "0.35rem 0.9rem 0.35rem 0.6rem",
              whiteSpace: "nowrap",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.tagColor, boxShadow: `0 0 8px ${s.tagColor}`, flexShrink: 0 }} />
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: s.tagColor, letterSpacing: "0.06em" }}>{s.tag}</span>
            </div>
          ))}
          {/* Platzhalter-Höhe damit Layout nicht springt */}
          <div style={{ height: "30px", visibility: "hidden" }}>·</div>
        </div>

        {/* Slide-Dots + Context unten */}
        <div style={{ position: "absolute", bottom: "7rem", left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}>
          {/* Context-Text */}
          <div style={{ position: "relative", width: "min(480px, 88vw)", textAlign: "center", minHeight: "2.4rem" }}>
            {SLIDES.map((s, i) => (
              <p key={i} style={{
                position: "absolute", left: 0, right: 0, top: 0,
                margin: 0,
                fontSize: "0.75rem", color: "rgba(255,255,255,0.52)",
                fontWeight: 500, letterSpacing: "0.01em", lineHeight: 1.6,
                opacity: i === slide ? 1 : 0,
                transition: "opacity 1s ease",
              }}>{s.context}</p>
            ))}
          </div>
          {/* Dots */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {SLIDES.map((s, i) => (
              <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? "28px" : "7px", height: "4px", borderRadius: "2px", border: "none", cursor: "pointer", padding: 0, background: i === slide ? s.tagColor : "rgba(255,255,255,0.22)", transition: "all 0.4s", boxShadow: i === slide ? `0 0 8px ${s.tagColor}80` : "none" }} />
            ))}
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(3rem, 8vw, 7rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", marginBottom: "1rem", maxWidth: "900px", color: "#fff", textShadow: "0 4px 60px rgba(0,0,0,0.8)" }}>
            Du hast das Recht,<br />
            <span style={{ color: "#2ECC8A", position: "relative", display: "inline-block" }}>
              die Wahrheit
              <svg viewBox="0 0 300 16" fill="none" style={{ position: "absolute", bottom: "-4px", left: 0, width: "100%", height: "12px", overflow: "visible" }}>
                <path d="M4 10 Q75 3 150 8 Q225 13 296 6" stroke="#2ECC8A" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" style={{ filter: "drop-shadow(0 0 8px rgba(46,204,138,0.7))" }} />
              </svg>
            </span><br />
            zu kennen.
          </h1>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "3.5rem" }}>
            <button onClick={openRegister} style={{ background: "#2ECC8A", color: "#000", borderRadius: "12px", padding: "1rem 2.8rem", fontWeight: 800, fontSize: "1.05rem", boxShadow: "0 0 60px rgba(46,204,138,0.35)", border: "none", cursor: "pointer" }}>
              Kostenlos starten →
            </button>
          </div>
          {/* Scroll-Pfeil */}
          <button
            onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            style={{ marginTop: "1.5rem", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", padding: 0 }}
            aria-label="Nach unten scrollen"
          >
            <span style={{ fontSize: "0.65rem", letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase" }}>Entdecken</span>
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none" style={{ animation: "scrollBounce 1.4s ease-in-out infinite" }}>
              <circle cx="19" cy="19" r="18" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
              <path d="M12 16 L19 23 L26 16" stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* ── FEATURE BLOCKS ── */}
      <AppFeatureBlocks />

      {/* ── 4 PHONES ── */}
      <FeaturesShowcase onLogin={openRegister} />

      {/* ── TRUST STRIP ── */}
      <section style={{ padding: "1.25rem 2rem", background: "#fff", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center", gap: "clamp(1rem, 4vw, 3rem)", flexWrap: "wrap" }}>
          {[
            { icon: "🔓", text: "Kostenlos" },
            { icon: "🚫", text: "Keine Werbung" },
            { icon: "🌱", text: "Open Source" },
          ].map((t) => (
            <div key={t.text} style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{ fontSize: "1rem" }}>{t.icon}</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748b" }}>{t.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "7rem 2rem 8rem", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${px(1658580)})`, backgroundSize: "cover", backgroundPosition: "center 30%", filter: "brightness(0.25) saturate(0.55)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(46,204,138,0.18) 0%, rgba(5,5,10,0.8) 100%)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #2ECC8A55, transparent)" }} />
        <div style={{ position: "relative", zIndex: 2, maxWidth: "480px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "-0.035em", marginBottom: "2.25rem", color: "#fff", textShadow: "0 4px 40px rgba(0,0,0,0.8)" }}>
            Bereit für die <span style={{ color: "#2ECC8A" }}>Wahrheit?</span>
          </h2>
          <button
            onClick={openRegister}
            style={{ background: "#2ECC8A", color: "#000", borderRadius: "14px", padding: "1.15rem 3.8rem", fontWeight: 900, fontSize: "1.1rem", border: "none", cursor: "pointer", animation: "ctaPulse 2.2s ease-in-out infinite" }}
          >
            Jetzt App öffnen →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#fff", borderTop: "1px solid rgba(0,0,0,0.07)", padding: "2.5rem 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#2ECC8A", letterSpacing: "-0.05em", marginBottom: "0.4rem" }}>TRUE</div>
        <div style={{ fontSize: "0.68rem", color: "#d1d5db", letterSpacing: "0.05em", marginBottom: "1.25rem" }}>TRANSPARENZ FÜR DEINE LEBENSMITTEL</div>
        <div style={{ display: "flex", gap: "2rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
          <Link href="/impressum"   style={{ fontSize: "0.82rem", color: "#9ca3af", textDecoration: "none" }}>Impressum</Link>
          <Link href="/datenschutz" style={{ fontSize: "0.82rem", color: "#9ca3af", textDecoration: "none" }}>Datenschutz</Link>
          <Link href="/community"   style={{ fontSize: "0.82rem", color: "#9ca3af", textDecoration: "none" }}>Community</Link>
          <a href="mailto:info@get-true.de" style={{ fontSize: "0.82rem", color: "#9ca3af", textDecoration: "none" }}>Kontakt</a>
        </div>
        <div style={{ fontSize: "0.68rem", color: "#d1d5db" }}>© {new Date().getFullYear()} TRUE · get-true.de</div>
      </footer>

      <style>{`
        @keyframes kb       { from{transform:scale(1.08)} to{transform:scale(1.0)} }
        @keyframes scanLine { 0%,100%{top:22%} 50%{top:68%} }
        @keyframes float0   { 0%,100%{transform:translateY(0px)  rotate(-1deg)} 50%{transform:translateY(-11px) rotate(-1deg)} }
        @keyframes float1   { 0%,100%{transform:translateY(-5px) rotate(1deg)}  50%{transform:translateY(7px)  rotate(1deg)}  }
        @keyframes float2   { 0%,100%{transform:translateY(-2px) rotate(-0.5deg)} 50%{transform:translateY(9px) rotate(-0.5deg)} }
        @keyframes float3       { 0%,100%{transform:translateY(0px)  rotate(1.5deg)} 50%{transform:translateY(-9px) rotate(1.5deg)} }
        @keyframes scrollBounce { 0%,100%{transform:translateY(0px); opacity:0.45} 50%{transform:translateY(6px); opacity:1} }
        @keyframes ctaPulse     { 0%,100%{box-shadow:0 0 40px rgba(46,204,138,0.35)} 50%{box-shadow:0 0 80px rgba(46,204,138,0.7), 0 0 0 6px rgba(46,204,138,0.15)} }
        @keyframes bulletPulse  { 0%{transform:translateX(-16px);opacity:0} 60%{transform:translateX(4px) scale(1.03)} 80%{box-shadow:0 0 0 4px rgba(46,204,138,0.18)} 100%{transform:translateX(0) scale(1);opacity:1} }
        * { box-sizing: border-box }
        a { transition: opacity .2s }
        a:hover { opacity: .72 }
      `}</style>
    </div>

    {authMode && (
      <AuthModal defaultMode={authMode} onClose={() => setAuthMode(null)} onSuccess={() => router.replace("/home")} onGuest={goToApp} />
    )}
    </>
  )
}

export default function Landing() {
  return (
    <Suspense>
      <LandingInner />
    </Suspense>
  )
}
