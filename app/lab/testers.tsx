"use client"
// ── Android-Tester gesucht (Google Play verlangt 12 Tester × 14 Tage, launch/TESTERS.md 5.4) ─────────
import React, { useState } from "react"
import { canSwitchLang, t } from "@/lib/labI18n"
import { haptic } from "./ui"

/**
 * Ziel des „Mitmachen“-Knopfs (Seite mit Schritt 1–3 bzw. Opt-in-Link).
 * Leer = Karte AUS. Einschalten, sobald der geschlossene Test läuft, z. B. "https://kolbi-smoky.vercel.app".
 */
export const TESTER_URL = ""

const OFF_KEY = "lab-tester-card-off"

/** Nur zum Testen auf localhost: window.__LAB_TESTER_URL__ = "https://…" ersetzt die leere Konstante. */
function testerUrl(): string {
  if (TESTER_URL) return TESTER_URL
  try {
    const w = window as { __LAB_TESTER_URL__?: string }
    if (w.__LAB_TESTER_URL__ && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return w.__LAB_TESTER_URL__
  } catch {}
  return ""
}

/** Nur Web-App im Android-Browser – nicht in der Store-App, nicht auf iPhone/iPad, nicht auf get-true.de. */
function androidWeb(): boolean {
  try {
    const native = !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    return !native && canSwitchLang() && /android/i.test(navigator.userAgent)
  } catch { return false }
}

export function AndroidTesterCard() {
  const [off, setOff] = useState(() => { try { return localStorage.getItem(OFF_KEY) === "1" } catch { return false } })
  const url = testerUrl()
  if (off || !url || !androidWeb()) return null
  const close = () => { haptic(6); setOff(true); try { localStorage.setItem(OFF_KEY, "1") } catch {} }
  return (
    <div className="lab-rise" style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, padding: "12px 40px 12px 14px", borderRadius: 18, border: "1px solid var(--glass-line)", background: "linear-gradient(135deg, color-mix(in srgb, #2ECC8A 12%, var(--surface)), color-mix(in srgb, #9085e9 10%, var(--surface)))" }}>
      <span aria-hidden style={{ fontSize: "1.4rem" }}>🧪</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 900, fontSize: "0.86rem" }}>{t("Android-Tester gesucht")}</span>
        <span style={{ display: "block", fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.4 }}>{t("Hilf Kolbi in den Play Store: 14 Tage die Store-Version testen – deine Daten ziehst du per Backup mit.")}</span>
        <a href={url} target="_blank" rel="noreferrer" onClick={() => haptic()} className="lab-press" style={{ display: "inline-block", marginTop: 8, padding: "7px 14px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontWeight: 900, fontSize: "0.78rem", textDecoration: "none" }}>{t("Mitmachen")}</a>
      </span>
      <button onClick={close} aria-label={t("Schließen")} className="lab-press" style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text-dim)", fontSize: "0.85rem", cursor: "pointer" }}>✕</button>
    </div>
  )
}
