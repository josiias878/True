"use client"
// ── „Neu“-Abzeichen für frisch hinzugekommene Funktionen (Logik: lib/labNew.ts) ───────
import React, { useEffect, useState } from "react"
import { isNew, markSeen, onSeenChange } from "@/lib/labNew"
import { todayIso } from "@/lib/supplementLab"
import { t } from "@/lib/labI18n"

/**
 * Kleines „Neu“-Abzeichen. Zeigt sich nur, solange `isNew(id)` gilt (21 Tage ab `since`, bis zum ersten Öffnen).
 * - `tone="onColor"`: weiß, für farbige Flächen (Verläufe); sonst dunkles Grün auf neutraler Fläche.
 * - `force`: immer zeigen (z. B. Vorschau/Test).
 * Rendert erst nach dem Laden (localStorage) → keine Abweichung zwischen Server und Browser.
 */
export function NewBadge({ id, today, tone = "accent", force, style }: {
  id: string; today?: string; tone?: "accent" | "onColor"; force?: boolean; style?: React.CSSProperties
}) {
  const on = useIsNew(id, today)
  if (!on && !force) return null
  return (
    <span className="lab-pop" style={{
      display: "inline-flex", alignItems: "center", flexShrink: 0, verticalAlign: "middle",
      fontSize: "0.62rem", fontWeight: 900, letterSpacing: ".04em", lineHeight: 1, padding: "4px 7px", borderRadius: 999,
      // Kontrast ≥ 4.5:1 in hell und dunkel: Weiß auf dunklem Grün (5,3:1) bzw. dunkles Violett auf Weiß (6,2:1)
      ...(tone === "onColor" ? { background: "#fff", color: "#5a4fc8" } : { background: "#0f7a52", color: "#fff" }),
      ...style,
    }}>{t("Neu")}</span>
  )
}

/** Ist die Funktion gerade neu? Aktualisiert sich live, wenn sie irgendwo als gesehen markiert wird. */
export function useIsNew(id: string, today?: string): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const check = () => setOn(isNew(id, today ?? todayIso()))
    check()
    return onSeenChange(check)
  }, [id, today])
  return on
}

/** Beim Öffnen einer Funktion aufrufen: blendet ihr „Neu“ überall aus (when = false → noch nicht). */
export function useMarkSeen(id: string, when = true) {
  useEffect(() => { if (when) markSeen(id) }, [id, when])
}
