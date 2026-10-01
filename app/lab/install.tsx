"use client"
import React, { useEffect, useState } from "react"
import { Btn } from "./ui"
import { t } from "@/lib/labI18n"

/** Übersetzten Satz mit {platzhaltern} in JSX-Teile zerlegen (für <b> mitten im Satz). */
function rich(s: string, parts: Record<string, React.ReactNode>) {
  return s.split(/(\{\w+\})/).map((x, i) => { const m = /^\{(\w+)\}$/.exec(x); return <React.Fragment key={i}>{m && m[1] in parts ? parts[m[1]] : x}</React.Fragment> })
}

// ── „Zum Home-Bildschirm“: Web-App wie eine echte App installieren ─────────────

interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach(l => l())
  })
}

const KEY = "lab-install-dismissed"

function isStandalone() {
  if (typeof window === "undefined") return true
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true
    || window.location.protocol === "capacitor:" || /\bwv\b/.test(navigator.userAgent)
}

function platform(): "ios" | "android" | "other" {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document)) return "ios"
  if (/Android/.test(ua)) return "android"
  return "other"
}

/** Karte mit Anleitung bzw. Installieren-Knopf. Blendet sich aus, wenn die App schon installiert ist. */
export function InstallHint({ compact }: { compact?: boolean }) {
  const [hidden, setHidden] = useState(() => {
    try { return isStandalone() || localStorage.getItem(KEY) === "1" } catch { return isStandalone() }
  })
  const [canPrompt, setCanPrompt] = useState(() => deferred != null)
  useEffect(() => {
    const l = () => setCanPrompt(true)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  if (hidden) return null
  const p = platform()
  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, "1") } catch {} }
  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    deferred = null
    if (outcome === "accepted") dismiss()
  }
  return (
    <div className="lab-rise" style={{
      position: "relative", padding: compact ? 12 : 16, borderRadius: 20, background: "var(--surface)", border: "1px dashed var(--accent)",
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      <div style={{ fontSize: "1.8rem", lineHeight: 1 }}>📲</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: "0.95rem" }}>{t("Als App auf den Home-Bildschirm")}</div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.5, marginTop: 3 }}>
          {p === "ios" ? (
            <>{rich(t("In Safari unten auf {share} {icon} tippen, dann {home}. Am besten {before}: Auf dem iPhone hat die App ihren eigenen Speicher."), {
              share: <b style={{ color: "var(--text)" }}>{t("Teilen")}</b>, icon: <ShareIcon />, home: <b style={{ color: "var(--text)" }}>{t("„Zum Home-Bildschirm“")}</b>, before: <b style={{ color: "var(--text)" }}>{t("vor dem Start")}</b>,
            })}</>
          ) : canPrompt ? (
            <>{t("Ein Tipp, dann liegt das Lab wie eine normale App auf deinem Handy, im Vollbild und ohne Browser-Leiste.")}</>
          ) : p === "android" ? (
            <>{rich(t("Im Browser-Menü {menu} auf {install} bzw. {add} tippen."), {
              menu: <b style={{ color: "var(--text)" }}>⋮</b>, install: <b style={{ color: "var(--text)" }}>{t("„App installieren“")}</b>, add: <b style={{ color: "var(--text)" }}>{t("„Zum Startbildschirm hinzufügen“")}</b>,
            })}</>
          ) : (
            <>{t("Öffne diesen Link auf deinem Handy und füge ihn dort zum Home-Bildschirm hinzu.")}</>
          )}
        </div>
        {canPrompt && <Btn onClick={install} style={{ marginTop: 10, padding: "9px 14px", fontSize: "0.82rem", borderRadius: 12 }}>{t("📲 Jetzt installieren")}</Btn>}
      </div>
      <button onClick={dismiss} aria-label={t("Hinweis schließen")} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "1rem", cursor: "pointer", padding: 2 }}>✕</button>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 18" style={{ verticalAlign: "-2px", margin: "0 2px" }} aria-label={t("Teilen-Symbol")}>
      <path d="M7 1v10M3.5 4.5 7 1l3.5 3.5" fill="none" stroke="#3987e5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 7H2.5v10h9V7h-2" fill="none" stroke="#3987e5" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
