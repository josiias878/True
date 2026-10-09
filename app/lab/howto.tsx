"use client"
// ── „So teilst du dein Ergebnis“: kurzes Erklär-Video oben in Entdecken ────────────────────────────
// Aufgenommen aus der echten App (keine KI), stumm mit eingebrannten Untertiteln, liegt im App-Bundle
// (supplement-lab/public/howto/). Nur Store-App (Next unter /lab hat die Datei nicht). Karte zeigt das Poster,
// Tippen öffnet das Video groß. Bewegung reduzieren → kein Autoplay, Steuerung sichtbar.
import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { STORE_MODE } from "@/lib/supplementLab"
import { markSeen, seenNew } from "@/lib/labNew"
import { t, isEn } from "@/lib/labI18n"
import { haptic } from "./ui"

const SRC = "./howto/so-teilst-du.mp4"
const POSTER = "./howto/so-teilst-du.jpg"
const SEEN_ID = "howto-share"

export function HowToShare() {
  const [open, setOpen] = useState(false)
  const [bad, setBad] = useState(false)
  // Untertitel im Video sind Deutsch → nur in der deutschen App
  if (!STORE_MODE || isEn || bad) return null
  const fresh = !seenNew().includes(SEEN_ID)
  return (
    <>
      <button className="lab-card lab-press lab-rise" data-howto onClick={() => { haptic(8); markSeen(SEEN_ID); setOpen(true) }}
        aria-label={t("Video ansehen: So teilst du dein Ergebnis")}
        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: 10, borderRadius: 22, textAlign: "left", color: "var(--text)" }}>
        <span style={{ position: "relative", width: 64, height: 96, borderRadius: 14, overflow: "hidden", flexShrink: 0, background: "#14142a" }}>
          <img src={POSTER} alt="" draggable={false} onError={() => setBad(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <span aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 30, height: 30, borderRadius: 999, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 2 }}>▶</span>
          </span>
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.68rem", fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent)" }}>
            {fresh && <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: "#2ECC8A" }} />}
            {t("Kurz erklärt · 20 Sek.")}
          </span>
          <span style={{ display: "block", fontWeight: 900, fontSize: "1rem", lineHeight: 1.25, marginTop: 2 }}>{t("So teilst du dein Ergebnis")}</span>
          <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-dim)", lineHeight: 1.35, marginTop: 2 }}>{t("Gruppe beitreten, testen, teilen – Kolbi zeigt dir, wie es aussieht.")}</span>
        </span>
        <span aria-hidden style={{ color: "var(--text-dim)", fontWeight: 900 }}>›</span>
      </button>
      {open && createPortal(<HowToPlayer onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

function HowToPlayer({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [failed, setFailed] = useState(false)
  const [auto] = useState(() => { try { return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches } catch { return true } })
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // Hintergrund inert: Tab bleibt im Dialog (Schließen ↔ Video)
    const root = ref.current
    const siblings = root?.parentElement ? [...root.parentElement.children].filter((el): el is HTMLElement => el !== root && el instanceof HTMLElement && el.tagName !== "STYLE") : []
    const was = siblings.map(el => el.inert)
    siblings.forEach(el => { el.inert = true })
    const opener = document.activeElement as HTMLElement | null
    ref.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose() } }
    window.addEventListener("keydown", onKey)
    return () => { siblings.forEach((el, i) => { el.inert = was[i] }); document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); try { opener?.focus() } catch {} }
  }, [onClose])
  return (
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("So teilst du dein Ergebnis")} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 600, outline: "none", background: "rgba(10,10,24,.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "calc(12px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))" }}>
      <button onClick={onClose} aria-label={t("Schließen")} className="lab-press"
        style={{ position: "absolute", top: "calc(10px + env(safe-area-inset-top))", right: 12, width: 44, height: 44, borderRadius: 999, border: "none", background: "rgba(255,255,255,.14)", color: "#fff", fontSize: "1.05rem", fontWeight: 900 }}>✕</button>
      <div onClick={e => e.stopPropagation()} style={{ width: "min(100%, 420px, calc((100dvh - 120px) * 9 / 16))", aspectRatio: "9 / 16", borderRadius: 24, overflow: "hidden", background: "#14142a", boxShadow: "0 20px 50px rgba(0,0,0,.5)" }}>
        {failed ? (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", padding: 24, textAlign: "center", fontWeight: 700 }}>
            {t("Video gerade nicht abspielbar – später nochmal reinschauen.")}
          </div>
        ) : (
          <video src={SRC} poster={POSTER} muted playsInline autoPlay={auto} controls loop={false} onError={() => setFailed(true)}
            aria-label={t("So teilst du dein Ergebnis")} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
      </div>
      <div style={{ color: "rgba(255,255,255,.7)", fontSize: "0.76rem", fontWeight: 700, marginTop: 10 }}>{t("Tippen außerhalb schließt")}</div>
    </div>
  )
}
