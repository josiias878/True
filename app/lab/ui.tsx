"use client"
import React, { useEffect } from "react"
import type { MySupp } from "@/lib/supplementLab"
import { suppColor } from "@/lib/supplementLab"

// ── Lab-Styles (Animationen & wiederverwendbare Klassen) ────────────────────────

export const LAB_CSS = `
.lab { --lab-grad: linear-gradient(135deg, #2ECC8A 0%, #1baf9a 45%, #3987e5 100%); --lab-radius: 22px; }
.lab-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--lab-radius); box-shadow: var(--shadow); }
.lab-press { transition: transform .15s ease, box-shadow .15s ease, background-color .2s, border-color .2s; -webkit-tap-highlight-color: transparent; cursor: pointer; }
.lab-press:active { transform: scale(.96); }
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
@media (prefers-reduced-motion: reduce) {
  .lab-pop, .lab-rise, .lab-fade, .lab-float, .lab-pulse, .lab-wiggle, .lab-shine { animation: none !important; }
}
`

// ── Primitives ─────────────────────────────────────────────────────────────────

export function Card({ children, style, className = "", onClick }: { children: React.ReactNode; style?: React.CSSProperties; className?: string; onClick?: () => void }) {
  return (
    <div className={`lab-card ${onClick ? "lab-press" : ""} ${className}`} onClick={onClick} style={{ padding: 18, ...style }}>
      {children}
    </div>
  )
}

export function Btn({ children, onClick, variant = "primary", style, disabled, full }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "soft" | "danger"; style?: React.CSSProperties; disabled?: boolean; full?: boolean
}) {
  const base: React.CSSProperties = {
    border: "none", borderRadius: 16, padding: "14px 20px", fontWeight: 800, fontSize: "0.95rem",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    width: full ? "100%" : undefined, opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? "none" : undefined,
  }
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--lab-grad)", color: "#fff", boxShadow: "0 8px 24px rgba(46,204,138,.35)" },
    ghost:   { background: "transparent", color: "var(--text-dim)", border: "1px solid var(--border)" },
    soft:    { background: "var(--surface-2)", color: "var(--text)" },
    danger:  { background: "var(--danger-dim)", color: "var(--danger)" },
  }
  return (
    <button className="lab-press" onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
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

export function Sheet({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
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
      position: "fixed", inset: 0, zIndex: 400, background: "rgba(5,5,12,.55)", backdropFilter: "blur(6px)",
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
            <button onClick={onClose} className="lab-press" aria-label="Schließen" style={{
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
      <button className="lab-press" style={b} onClick={() => onChange(Math.max(min, value - 1))} aria-label="weniger">−</button>
      <span style={{ minWidth: 44, textAlign: "center", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}{suffix}</span>
      <button className="lab-press" style={b} onClick={() => onChange(Math.min(max, value + 1))} aria-label="mehr">+</button>
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
    <div style={{ position: "fixed", top: 18, left: 0, right: 0, zIndex: 600, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div className="lab-pop" style={{
        background: "var(--lab-grad)", color: "#fff", borderRadius: 999, padding: "10px 18px",
        fontWeight: 900, boxShadow: "0 10px 30px rgba(46,204,138,.45)", display: "flex", gap: 8, alignItems: "center",
      }}>
        <span>+{amount} XP</span><span style={{ opacity: 0.85, fontWeight: 700 }}>{label}</span>
      </div>
    </div>
  )
}

/** Sterne-Bewertung 1–5 (ein Tipp). */
export function Stars({ value, onChange, size = 26 }: { value: number | undefined; onChange?: (v: number) => void; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }} role={onChange ? "radiogroup" : "img"} aria-label={value ? `${value} von 5 Sternen` : "keine Bewertung"}>
      {[1, 2, 3, 4, 5].map(i => {
        const on = (value ?? 0) >= i
        return (
          <button key={i} type="button" disabled={!onChange} onClick={() => onChange?.(i)} aria-label={`${i} Sterne`}
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
          <button key={i} className="lab-press" onClick={() => onPick(v)} aria-label={labels?.[i] ?? `${v} von 5`} style={{
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

/** Segment-Schalter (1 Tipp). */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 12, padding: 3, gap: 2 }}>
      {options.map(o => (
        <button key={o.id} className="lab-press" onClick={() => onChange(o.id)} style={{
          flex: 1, border: "none", borderRadius: 10, padding: "7px 4px", fontSize: "0.72rem", fontWeight: 800, whiteSpace: "nowrap",
          background: value === o.id ? "var(--surface)" : "transparent", color: value === o.id ? "var(--text)" : "var(--text-dim)",
          boxShadow: value === o.id ? "0 1px 4px rgba(0,0,0,.12)" : "none",
        }}>{o.label}</button>
      ))}
    </div>
  )
}
