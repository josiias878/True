"use client"
import React, { useEffect } from "react"
import type { MySupp } from "@/lib/supplementLab"
import { suppColor, TAGS, tagLabel } from "@/lib/supplementLab"
import { TAG_EMOJI } from "@/lib/labPatterns"
import { t } from "@/lib/labI18n"

// ── Lab-Styles (Animationen & wiederverwendbare Klassen) ────────────────────────

export const LAB_CSS = `
.lab { --lab-grad: linear-gradient(135deg, #2ECC8A 0%, #1baf9a 45%, #3987e5 100%); --lab-radius: 24px; }
.lab-card { background: var(--surface); border: 1px solid var(--glass-line, color-mix(in srgb, var(--border) 70%, transparent)); border-radius: var(--lab-radius); box-shadow: inset 0 1px 0 var(--glass-edge, transparent), 0 1px 2px rgba(0,0,0,.04), 0 10px 30px rgba(20,30,60,.07); }
.lab { --glass: rgba(255,255,255,.58); --glass-strong: rgba(255,255,255,.78); --glass-edge: rgba(255,255,255,.95); --glass-line: rgba(20,24,40,.08); --glass-shadow: 0 10px 40px rgba(20,30,60,.14), 0 2px 6px rgba(20,30,60,.05); }
html.dark .lab { --glass: rgba(24,24,44,.5); --glass-strong: rgba(28,28,50,.72); --glass-edge: rgba(255,255,255,.14); --glass-line: rgba(255,255,255,.07); --glass-shadow: 0 14px 44px rgba(0,0,0,.55); }
.lab-glass { background: var(--glass); backdrop-filter: blur(22px) saturate(1.8); -webkit-backdrop-filter: blur(22px) saturate(1.8); border: 1px solid var(--glass-line); box-shadow: inset 0 1px 0 var(--glass-edge), var(--glass-shadow); }
.lab-press { transition: transform .5s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease, background-color .25s, border-color .25s, color .25s; -webkit-tap-highlight-color: transparent; cursor: pointer; }
.lab-press:active { transform: scale(.93); transition-duration: .1s, .2s, .25s, .25s, .25s; transition-timing-function: ease-out; }
.lab-drop { position: relative; overflow: hidden; isolation: isolate; }
.lab-drop::before { content: ""; position: absolute; left: 8%; right: 8%; top: 2px; height: 42%; border-radius: 999px; background: linear-gradient(180deg, rgba(255,255,255,.26), rgba(255,255,255,0)); pointer-events: none; z-index: -1; }
.lab-drop::after { content: ""; position: absolute; top: -20%; bottom: -20%; width: 35%; left: -60%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.5), transparent); transform: skewX(-18deg); animation: labSweep 5s ease-in-out infinite; pointer-events: none; }
@keyframes labSweep { 0%, 72% { left: -60% } 100% { left: 140% } }
.lab-island { animation: labIsland .55s cubic-bezier(.34,1.56,.64,1) both; transform-origin: top center; }
@keyframes labIsland { 0% { transform: scale(.35, .6); opacity: 0; border-radius: 999px } 55% { opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
.lab-island > * { animation: labFade .3s ease .18s both; }
.lab-blob { position: absolute; border-radius: 999px; filter: blur(38px); pointer-events: none; animation: labBlob 14s ease-in-out infinite alternate; transition: background 1.2s ease; }
@keyframes labBlob { 0% { transform: translate(0, 0) scale(1) } 50% { transform: translate(18%, 12%) scale(1.15) } 100% { transform: translate(-14%, -8%) scale(.95) } }
.lab-hop { animation: labHop .7s cubic-bezier(.34,1.56,.64,1); }
@keyframes labHop { 0% { transform: translateY(0) } 30% { transform: translateY(-16px) scale(1.04, .96) } 60% { transform: translateY(0) scale(1.06, .92) } 100% { transform: translateY(0) scale(1) } }
.lab-blink { transform-box: fill-box; transform-origin: center; animation: labBlink 5.2s infinite; }
@keyframes labBlink { 0%, 93%, 100% { transform: scaleY(1) } 95% { transform: scaleY(.08) } 97% { transform: scaleY(1) } }
.lab-pop { animation: labPop .45s cubic-bezier(.2,1.4,.4,1) both; }
.lab-rise { animation: labRise .45s cubic-bezier(.2,.9,.3,1) both; }
.lab-fade { animation: labFade .3s ease both; }
.lab-float { animation: labFloat 4s ease-in-out infinite; }
.lab-pulse { animation: labPulse 1.8s ease-out infinite; }
.lab-wiggle { animation: labWiggle 2.4s ease-in-out infinite; }
.lab-shine { background-size: 200% 100%; animation: labShine 3s linear infinite; }
.lab-scroll::-webkit-scrollbar { display: none; }
.lab-scroll { scrollbar-width: none; }
@keyframes labPop   { 0% { transform: scale(.6); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
@keyframes labRise  { 0% { transform: translateY(18px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
@keyframes labFade  { from { opacity: 0 } to { opacity: 1 } }
@keyframes labFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes labPulse { 0% { box-shadow: 0 0 0 0 rgba(46,204,138,.55) } 100% { box-shadow: 0 0 0 18px rgba(46,204,138,0) } }
@keyframes labWiggle { 0%,90%,100% { transform: rotate(0) } 93% { transform: rotate(-10deg) } 96% { transform: rotate(10deg) } }
@keyframes labShine { from { background-position: 200% 0 } to { background-position: -200% 0 } }
@keyframes labSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
@keyframes labBubble { 0% { transform: translateY(0) scale(1); opacity: .9 } 100% { transform: translateY(-60px) scale(.4); opacity: 0 } }
.lab-wave { animation: labWave 3.2s ease-in-out infinite alternate; }
@keyframes labWave { from { transform: translateX(0) } to { transform: translateX(-38px) } }
.lab-squish { animation: labSquish .4s ease; }
@keyframes labSquish { 0% { transform: scale(1,1) } 40% { transform: scale(1.12,.84) translateY(8px) } 100% { transform: scale(1,1) } }
.lab-drip { position: absolute; width: 9px; height: 12px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; background: linear-gradient(#2ECC8A, #3987e5); opacity: 0; pointer-events: none; animation: labDrip .7s ease-in forwards; }
@keyframes labDrip { 0% { opacity: 1; transform: translateY(0) scale(1) } 100% { opacity: 0; transform: translateY(170px) scale(.4) } }
.lab-flood { position: fixed; inset: 0; z-index: 470; pointer-events: none; background: linear-gradient(200deg, #2ECC8A 0%, #1baf9a 50%, #3987e5 100%); animation: labFlood 1.15s cubic-bezier(.6,0,.3,1) forwards; }
.lab-flood::before { content: ""; position: absolute; left: -10%; right: -10%; top: -38px; height: 40px; border-radius: 50% 50% 0 0 / 100% 100% 0 0; background: inherit; }
@keyframes labFlood { 0% { transform: translateY(105%) } 42%, 55% { transform: translateY(0) } 100% { transform: translateY(-110%) } }
.lab-late { animation: labFade .35s ease .55s both; }
.lab-flip { perspective: 1200px; }
.lab-flip-inner { position: relative; transition: transform .7s cubic-bezier(.3,1.3,.5,1); transform-style: preserve-3d; }
.lab-flip-inner.on { transform: rotateY(180deg); }
.lab-flip-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.lab-flip-back { position: absolute; inset: 0; transform: rotateY(180deg); }
.lab-tabin { animation: labTabIn .32s cubic-bezier(.2,.9,.3,1) backwards; } /* backwards: danach kein transform → Blätter (position: fixed) im Tab liegen wieder über allem */
@keyframes labTabIn { from { opacity: 0; transform: translateX(var(--dx, 24px)) } to { opacity: 1; transform: none } }
@keyframes labDropIn { 0% { opacity: 0; transform: translateY(-30px) scale(.6) } 30% { opacity: 1 } 100% { opacity: 0; transform: translateY(70px) scale(.9) } }
@keyframes labGrow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
@keyframes labFill { from { width: 0 } to { width: 100% } }
@keyframes labCheck { 0% { transform: scale(.6) } 60% { transform: scale(1.15) } 100% { transform: scale(1) } }
@media (prefers-reduced-motion: reduce) {
  .lab-blob, .lab-blink, .lab-hop, .lab-island, .lab-drop::after, .lab-tabin, .lab-pop, .lab-rise, .lab-fade, .lab-float, .lab-pulse, .lab-wiggle, .lab-shine, .lab-wave, .lab-squish, .lab-late { animation: none !important; }
  .lab-flood { animation-duration: .01s !important; }
}
`

// ── Primitives ─────────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ReactNode> = {
  home: <><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>,
  path: <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M6 17v-4a3 3 0 0 1 3-3h6a3 3 0 0 0 3-3" /></>,
  chart: <><path d="M4 19h16" /><path d="M6 15l4-5 3 3 5-7" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" /><path d="M12 13v4M9 20h6" /></>,
  pill: <><rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)" /><path d="M9.2 9.2 14.8 14.8" /></>,
  flask: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  back: <><path d="M15 18l-6-6 6-6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
}

export function Icon({ name, size = 22 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      {ICONS[name]}
    </svg>
  )
}

export function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="lab-press" aria-label={label} style={{
      width: 38, height: 38, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text-dim)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0,
    }}>{children}</button>
  )
}

export function Card({ children, style, className = "", onClick }: { children: React.ReactNode; style?: React.CSSProperties; className?: string; onClick?: () => void }) {
  return (
    <div className={`lab-card ${onClick ? "lab-press" : ""} ${className}`} onClick={onClick} style={{ padding: 18, ...style }}>
      {children}
    </div>
  )
}

/** Kurzes haptisches Feedback (Android/Web; iPhone erst in der Store-App). */
export function haptic(ms = 8) { try { navigator.vibrate?.(ms) } catch {} }

export function Btn({ children, onClick, variant = "primary", style, disabled, full }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "soft" | "danger"; style?: React.CSSProperties; disabled?: boolean; full?: boolean
}) {
  const base: React.CSSProperties = {
    border: "none", borderRadius: 16, padding: "14px 20px", fontWeight: 800, fontSize: "0.95rem",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    width: full ? "100%" : undefined, opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? "none" : undefined,
  }
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--lab-grad)", color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,.45), inset 0 -2px 0 rgba(0,0,0,.12), 0 10px 26px rgba(46,204,138,.38)" },
    ghost:   { background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border)" },
    soft:    { background: "color-mix(in srgb, var(--surface-2) 85%, transparent)", color: "var(--text)", boxShadow: "inset 0 1px 0 var(--glass-edge)" },
    danger:  { background: "var(--danger-dim)", color: "var(--danger)" },
  }
  return (
    <button className={`lab-press ${variant === "primary" ? "lab-drop" : ""}`} onClick={() => { if (variant === "primary") haptic(); onClick?.() }} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  )
}

export function Capsule({ supp, size = "md", onClick, right }: { supp: MySupp | undefined; size?: "sm" | "md"; onClick?: () => void; right?: React.ReactNode }) {
  if (!supp) return null
  const c = suppColor(supp)
  const sm = size === "sm"
  return (
    <span
      className={onClick ? "lab-press" : undefined}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: sm ? "4px 10px 4px 4px" : "6px 14px 6px 6px", borderRadius: 999,
        background: `color-mix(in srgb, ${c} 14%, var(--surface))`,
        border: `1px solid color-mix(in srgb, ${c} 40%, transparent)`,
        fontSize: sm ? "0.75rem" : "0.85rem", fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap",
        maxWidth: "100%", minWidth: 0,
      }}
    >
      <span style={{
        width: sm ? 20 : 26, height: sm ? 20 : 26, borderRadius: 999, background: c,
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: sm ? "0.7rem" : "0.85rem", flexShrink: 0,
      }}>{supp.emoji}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{supp.name}</span>
      {right}
    </span>
  )
}

export function Sheet({ open, onClose, children, title, z = 400 }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string; z?: number }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey) }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="lab-fade" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: z, background: "rgba(5,5,12,.55)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 560, maxHeight: "92dvh", overflowY: "auto",
        background: "var(--background)", borderRadius: "28px 28px 0 0", padding: "10px 18px calc(24px + env(safe-area-inset-bottom))",
        animation: "labSlideUp .35s cubic-bezier(.2,.9,.3,1) both", boxShadow: "0 -10px 40px rgba(0,0,0,.3)",
      }}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: "var(--border)", margin: "0 auto 14px" }} />
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 900 }}>{title}</div>
            <button onClick={onClose} className="lab-press" aria-label={t("Schließen")} style={{
              width: 34, height: 34, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text-dim)", fontSize: "1rem",
            }}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Stepper({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  const b: React.CSSProperties = { width: 32, height: 32, borderRadius: 10, border: "none", background: "var(--surface-2)", color: "var(--text)", fontWeight: 900, fontSize: "1rem" }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button className="lab-press" style={b} onClick={() => onChange(Math.max(min, value - 1))} aria-label={t("weniger")}>−</button>
      <span style={{ minWidth: 44, textAlign: "center", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}{suffix}</span>
      <button className="lab-press" style={b} onClick={() => onChange(Math.min(max, value + 1))} aria-label={t("mehr")}>+</button>
    </span>
  )
}

export function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", ...style }}>{children}</div>
}

/** Fortschrittsring (SVG). */
export function Ring({ size = 64, stroke = 7, progress, color = "var(--accent)", children }: { size?: number; stroke?: number; progress: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))} style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.9,.3,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  )
}

/** Kurzer XP-Toast, der nach oben schwebt. */
export function XpToast({ amount, label }: { amount: number; label: string }) {
  return (
    <div style={{ position: "fixed", top: "calc(10px + env(safe-area-inset-top))", left: 0, right: 0, zIndex: 600, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div className="lab-island" style={{
        background: "#000", color: "#fff", borderRadius: 999, padding: "10px 18px 10px 10px", minHeight: 44,
        fontWeight: 800, boxShadow: "0 12px 34px rgba(0,0,0,.35)", display: "flex", gap: 10, alignItems: "center",
      }}>
        <span style={{ padding: "4px 10px", borderRadius: 999, background: "linear-gradient(135deg, #2ECC8A, #3987e5)", fontWeight: 900, fontSize: "0.85rem" }}>+{amount} XP</span>
        <span style={{ fontSize: "0.9rem" }}>{label}</span>
      </div>
    </div>
  )
}

/** Sterne-Bewertung 1–5 (ein Tipp). */
export function Stars({ value, onChange, size = 26 }: { value: number | undefined; onChange?: (v: number) => void; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} role={onChange ? "radiogroup" : "img"} aria-label={value ? t("{n} von 5 Sternen", { n: value }) : t("keine Bewertung")}>
      {[1, 2, 3, 4, 5].map(i => {
        const on = (value ?? 0) >= i
        return (
          <button key={i} type="button" disabled={!onChange} onClick={() => onChange?.(i)} aria-label={i === 1 ? t("1 Sterne") : t("{n} Sterne", { n: i })}
            className={onChange ? "lab-press" : undefined}
            style={{
              width: size + 6, height: size + 6, border: "none", background: "none", padding: 0, cursor: onChange ? "pointer" : "default",
              fontSize: size * 0.9, lineHeight: 1, color: on ? "#f5b400" : "var(--border)",
              textShadow: on ? "0 2px 8px rgba(245,180,0,.35)" : undefined, transition: "color .15s, transform .15s",
            }}>★</button>
        )
      })}
    </span>
  )
}

/** Große Gesichter-Reihe für die 1-Klick-Bewertung. */
export function FaceRow({ value, onPick, faces, labels, size = 60 }: { value?: number; onPick: (v: number) => void; faces: string[]; labels?: string[]; size?: number }) {
  const hue = ["#e34948", "#eb6834", "#eda100", "#1baf7a", "#2ECC8A"]
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
      {faces.map((f, i) => {
        const v = i + 1
        const on = value === v
        return (
          <button key={i} className="lab-press" onClick={() => onPick(v)} aria-label={labels?.[i] ?? t("{n} von 5", { n: v })} style={{
            flex: 1, maxWidth: size + 16, minHeight: size, borderRadius: 18, padding: "8px 0 6px",
            border: on ? `3px solid ${hue[i]}` : "1px solid var(--border)",
            background: on ? `color-mix(in srgb, ${hue[i]} 18%, var(--surface))` : "var(--surface)",
            transform: on ? "scale(1.08)" : undefined, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            color: "var(--text-dim)",
          }}>
            <span style={{ fontSize: size * 0.5, lineHeight: 1.1 }}>{f}</span>
            {labels && <span style={{ fontSize: "0.62rem", fontWeight: 800 }}>{labels[i]}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Kopf eines Bildschirms: kleine Zeile darüber, großer Titel, rechts optional etwas (z. B. „BEISPIEL“), links optional „zurück“. */
export function TabHead({ kicker, title, right, onBack }: { kicker?: React.ReactNode; title: React.ReactNode; right?: React.ReactNode; onBack?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px 16px", minWidth: 0 }}>
      {onBack && (
        <button onClick={onBack} className="lab-press" aria-label={t("Zurück")} style={{
          width: 40, height: 40, marginLeft: -6, borderRadius: 999, border: "none", background: "transparent", color: "var(--text)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}><Icon name="back" size={24} /></button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {kicker && <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-dim)", letterSpacing: ".07em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kicker}</div>}
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
      </div>
      {right}
    </div>
  )
}

/** Kleines „BEISPIEL“-Schild für die Demo. */
export function DemoBadge() {
  return <span style={{ flexShrink: 0, fontSize: "0.66rem", fontWeight: 900, background: "var(--warning-dim)", color: "var(--warning)", padding: "4px 9px", borderRadius: 999 }}>{t("BEISPIEL")}</span>
}

/** Reiter mit Unterstrich (Lab-Seite): max. 3–4 Einträge. */
export function UnderTabs<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", overflowX: "auto" }} className="lab-scroll">
      {options.map(o => {
        const on = value === o.id
        return (
          <button key={o.id} role="tab" aria-selected={on} onClick={() => onChange(o.id)} style={{
            flexShrink: 0, background: "none", border: "none", padding: "10px 10px 9px", fontSize: "0.92rem", fontWeight: on ? 900 : 800, whiteSpace: "nowrap",
            color: on ? "var(--text)" : "var(--text-dim)", borderBottom: `3px solid ${on ? "var(--accent)" : "transparent"}`, marginBottom: -1,
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

/** Segment-Schalter (1 Tipp). */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 12, padding: 3, gap: 2 }}>
      {options.map(o => (
        <button key={o.id} className="lab-press" onClick={() => onChange(o.id)} style={{
          flex: 1, border: "none", borderRadius: 10, padding: "9px 6px", fontSize: "0.82rem", fontWeight: 800, whiteSpace: "nowrap",
          background: value === o.id ? "var(--surface)" : "transparent", color: value === o.id ? "var(--text)" : "var(--text-dim)",
          boxShadow: value === o.id ? "0 1px 4px rgba(0,0,0,.12)" : "none",
        }}>{o.label}</button>
      ))}
    </div>
  )
}

/** Nebenwirkungs-Chips: Tipp = leicht, nochmal = stark, nochmal = weg. */
export function SideChips({ value, onChange, suggested, all, compact }: {
  value: Record<string, number>; onChange: (v: Record<string, number>) => void
  suggested: { id: string; label: string; emoji: string }[]; all?: { id: string; label: string; emoji: string }[]; compact?: boolean
}) {
  const [more, setMore] = React.useState(false)
  const none = Object.values(value).every(v => !v)
  const cycle = (id: string) => {
    const cur = value[id] ?? 0
    const next = { ...value, [id]: (cur + 1) % 3 }
    if (!next[id]) delete next[id]
    onChange(next)
  }
  const list = more && all ? [...suggested, ...all.filter(a => !suggested.some(x => x.id === a.id))] : suggested
  const chip = (x: { id: string; label: string; emoji: string }) => {
    const sev = value[x.id] ?? 0
    const col = sev === 2 ? "var(--danger)" : sev === 1 ? "var(--warning)" : undefined
    return (
      <button key={x.id} className="lab-press" onClick={() => cycle(x.id)} style={{
        padding: compact ? "7px 10px" : "8px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: sev ? 800 : 600, color: "var(--text)",
        border: sev ? `2px solid ${col}` : "1px solid var(--border)",
        background: sev === 2 ? "var(--danger-dim)" : sev === 1 ? "var(--warning-dim)" : "var(--surface)",
      }}>{x.emoji} {x.label}{sev === 1 ? t(" · leicht") : sev === 2 ? t(" · stark") : ""}</button>
    )
  }
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        <button className="lab-press" onClick={() => onChange({})} style={{
          padding: compact ? "7px 10px" : "8px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 800, color: "var(--text)",
          border: none ? "2px solid var(--accent)" : "1px solid var(--border)", background: none ? "var(--accent-dim)" : "var(--surface)",
        }}>{t("✓ Keine")}</button>
        {list.map(chip)}
        {all && !more && <button onClick={() => setMore(true)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>{t("+ mehr")}</button>}
      </div>
    </div>
  )
}

/** Störfaktoren in Anzeige-Reihenfolge: 🍷 Alkohol zuerst (häufigster Grund für einen „unfairen“ Tag). */
export const DAY_TAGS = ["Alkohol", ...TAGS.filter(x => x !== "Alkohol")]
/** Störfaktor-Chips: ein Tipp = an, nochmal = aus. Gespeichert wird der deutsche Wert (tags im Check-in). */
export function TagChips({ value, onChange, show = 5 }: { value: string[]; onChange: (v: string[]) => void; show?: number }) {
  const [more, setMore] = React.useState(false)
  const head = DAY_TAGS.slice(0, show)
  const list = more ? DAY_TAGS : [...head, ...value.filter(x => !head.includes(x))]
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {list.map(tag => {
        const on = value.includes(tag)
        return (
          <button key={tag} className="lab-press" aria-pressed={on} onClick={() => { haptic(); onChange(on ? value.filter(x => x !== tag) : [...value, tag]) }} style={{
            padding: "8px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: on ? 800 : 600, color: "var(--text)",
            border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)",
          }}>{TAG_EMOJI[tag] ? `${TAG_EMOJI[tag]} ` : ""}{tagLabel(tag)}</button>
        )
      })}
      {!more && DAY_TAGS.length > list.length && <button onClick={() => setMore(true)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>{t("+ mehr")}</button>}
    </div>
  )
}
