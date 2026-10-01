"use client"
// ── Teilen: Ergebnis- und Wochen-Karte als Story-Bild (1080×1920) ──────────────
import React, { useState } from "react"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { DIMS, addDays, daySum, streak, suppColor, testResult, type Dim, type LabState } from "@/lib/supplementLab"
import { Mascot } from "./mascot"
import { haptic } from "./ui"

const W = 1080, H = 1920
const fmt1 = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(1).replace(".", ",")}`
const DECISION: Record<string, { label: string; color: string }> = {
  keep: { label: "💚 Behalten", color: "#1baf7a" }, maybe: { label: "🤔 Vielleicht", color: "#eda100" }, drop: { label: "✂️ Fliegt raus", color: "#e34948" },
}

async function kolbiImage(mood: "party" | "happy" | "think", size: number): Promise<HTMLImageElement | null> {
  try {
    // Kolbi kurz unsichtbar rendern und als SVG-Bild übernehmen
    const host = document.createElement("div")
    host.style.cssText = "position:fixed;left:-9999px;top:0"
    document.body.appendChild(host)
    const root = createRoot(host)
    flushSync(() => root.render(<Mascot mood={mood} size={size} fill={0.85} />))
    const svg = host.innerHTML.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    root.unmount(); host.remove()
    const img = new Image()
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    await img.decode()
    return img
  } catch { return null }
}

function setup(top: string, bottom: string) {
  const c = document.createElement("canvas")
  c.width = W; c.height = H
  const g = c.getContext("2d")!
  const bg = g.createLinearGradient(0, 0, W * 0.4, H)
  bg.addColorStop(0, top); bg.addColorStop(1, bottom)
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  // weiche Lichtflecken
  for (const [x, y, r, a] of [[200, 260, 520, 0.22], [900, 700, 600, 0.16], [300, 1500, 700, 0.12]] as const) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = rg; g.fillRect(0, 0, W, H)
  }
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"
  return { c, g }
}
const font = (px: number, w = 900) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
function pill(g: CanvasRenderingContext2D, cx: number, cy: number, text: string, px: number, bg: string, fg = "#fff") {
  g.font = font(px)
  const w = g.measureText(text).width + px * 1.6, h = px * 1.9
  g.fillStyle = bg; g.beginPath(); g.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); g.fill()
  g.fillStyle = fg; g.fillText(text, cx, cy + 2)
}
async function footer(g: CanvasRenderingContext2D, mood: "party" | "happy" | "think", line: string) {
  const k = await kolbiImage(mood, 230)
  if (k) g.drawImage(k, 70, H - 330, 230, 230)
  g.fillStyle = "rgba(255,255,255,.16)"; g.beginPath(); g.roundRect(330, H - 300, 680, 150, 40); g.fill()
  g.fillStyle = "#fff"; g.textAlign = "left"; g.font = font(40, 800); g.fillText(line, 370, H - 248)
  g.font = font(34, 700); g.globalAlpha = 0.85; g.fillText("🧪 Supplement Lab", 370, H - 196); g.globalAlpha = 1; g.textAlign = "center"
}

/** Ergebnis eines Tests als Story-Karte. */
export async function makeResultCard(s: LabState, suppId: string): Promise<Blob | null> {
  const x = s.supps.find(q => q.id === suppId)
  const r = testResult(s, suppId)
  if (!x || !r || r.overall.base == null || r.overall.test == null) return null
  const col = suppColor(x)
  const { c, g } = setup(col, "#0b0b1a")
  const delta = r.overall.test - r.overall.base
  const v = s.verdicts[suppId]?.decision

  g.font = font(40, 900); g.globalAlpha = 0.85; g.fillText("M E I N   S E L B S T V E R S U C H", W / 2, 170); g.globalAlpha = 1
  g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.arc(W / 2, 400, 150, 0, Math.PI * 2); g.fill()
  g.fillStyle = "#fff"; g.font = font(170, 400); g.fillText(x.emoji, W / 2, 410)
  g.font = font(x.name.length > 16 ? 70 : 88); g.fillText(x.name, W / 2, 640)
  g.font = font(40, 700); g.globalAlpha = 0.85; g.fillText(`${r.n} Tage getestet · vs. mein Normal`, W / 2, 715); g.globalAlpha = 1

  g.font = font(250); g.fillText(`${fmt1(delta)}★`, W / 2, 920)
  g.font = font(44, 800); g.globalAlpha = 0.9; g.fillText("Gesamtgefühl", W / 2, 1065); g.globalAlpha = 1

  // Bereiche: auseinanderlaufende Balken um die Mitte
  const dims = (r.dims as Dim[]).map(d => ({ d, v: (r.delta as Record<string, number> | null)?.[d] ?? 0 }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 3)
  let y = 1150
  for (const { d, v: dv } of dims) {
    const info = DIMS.find(q => q.id === d)!
    g.textAlign = "left"; g.font = font(40, 800); g.fillText(`${info.emoji} ${info.label}`, 110, y)
    g.textAlign = "right"; g.fillText(`${fmt1(dv)}★`, W - 110, y)
    g.textAlign = "center"
    const cx = W / 2 + 60, len = Math.min(1, Math.abs(dv) / 2) * 300
    g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.roundRect(cx - 300, y + 36, 600, 22, 11); g.fill()
    g.fillStyle = dv >= 0 ? "#7CF5C0" : "#ff8a8a"; g.beginPath(); g.roundRect(dv >= 0 ? cx : cx - len, y + 36, Math.max(10, len), 22, 11); g.fill()
    g.fillStyle = "#fff"; g.fillRect(cx - 2, y + 28, 4, 38)
    y += 112
  }
  if (v) pill(g, W / 2, Math.min(y + 30, H - 390), DECISION[v].label, 52, DECISION[v].color)
  await footer(g, delta > 0.2 ? "party" : delta < -0.2 ? "think" : "happy", "Finde raus, was bei DIR wirkt.")
  return new Promise(res => c.toBlob(b => res(b), "image/png"))
}

/** Woche als Story-Karte (Check-ins, Gefühl, bester Tag, Serie). */
export async function makeWeekCard(s: LabState, end: string): Promise<Blob | null> {
  const days = Array.from({ length: 7 }, (_, k) => addDays(end, k - 6))
  const cs = days.map(d => s.checkins[d])
  const got = cs.filter(Boolean)
  if (!got.length) return null
  const avg = got.reduce((a, c) => a + daySum(c!), 0) / got.length
  const { c, g } = setup("#3987e5", "#2b1d5c")
  g.font = font(40, 900); g.globalAlpha = 0.85; g.fillText("M E I N E   W O C H E", W / 2, 170); g.globalAlpha = 1
  g.font = font(300); g.fillText(`${avg.toFixed(1).replace(".", ",")}★`, W / 2, 460)
  g.font = font(46, 800); g.fillText("so habe ich mich gefühlt", W / 2, 640)
  const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]
  const bw = 90, gap = 34, x0 = (W - (7 * bw + 6 * gap)) / 2, base = 1180
  const best = cs.reduce((bi, cc, i) => (cc && (bi < 0 || daySum(cc) > daySum(cs[bi]!)) ? i : bi), -1)
  days.forEach((d, i) => {
    const v = cs[i] ? daySum(cs[i]!) : 0
    const h = (v / 5) * 380
    g.fillStyle = i === best ? "#fff" : "rgba(255,255,255,.45)"; g.beginPath(); g.roundRect(x0 + i * (bw + gap), base - Math.max(14, h), bw, Math.max(14, h), 24); g.fill()
    g.fillStyle = "#fff"; g.font = font(38, 800); g.fillText(WD[new Date(`${d}T12:00:00`).getDay()], x0 + i * (bw + gap) + bw / 2, base + 50)
    if (i === best) { g.font = font(56, 400); g.fillText("👑", x0 + i * (bw + gap) + bw / 2, base - h - 50) }
  })
  pill(g, W / 2 - 230, 1400, `📅 ${got.length}/7 Tage`, 46, "rgba(255,255,255,.18)")
  const st = streak(s)
  pill(g, W / 2 + 230, 1400, `🔥 ${st} Tage Serie`, 46, "rgba(255,255,255,.18)")
  await footer(g, "party", "Ich teste, was bei mir wirkt.")
  return new Promise(res => c.toBlob(b => res(b), "image/png"))
}

export async function shareImage(blob: Blob, name: string, text: string): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], name, { type: "image/png" })
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return "shared" }
  } catch (e) { if ((e as Error)?.name === "AbortError") return "cancelled" }
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return "downloaded"
}

export function ShareButton({ make, name, text, label = "📤 Teilen", style, light }: {
  make: () => Promise<Blob | null>; name: string; text: string; label?: string; style?: React.CSSProperties; light?: boolean
}) {
  const [busy, setBusy] = useState(false)
  return (
    <button className="lab-press" disabled={busy} onClick={async e => {
      e.stopPropagation(); haptic(); setBusy(true)
      try { const b = await make(); if (b) await shareImage(b, name, text) } finally { setBusy(false) }
    }} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 18px", borderRadius: 16, border: "none", fontWeight: 900, fontSize: "0.9rem",
      background: light ? "#fff" : "linear-gradient(135deg, #9085e9, #e87ba4)", color: light ? "#0b0b1a" : "#fff",
      boxShadow: light ? "none" : "inset 0 1px 0 rgba(255,255,255,.4), 0 10px 24px rgba(144,133,233,.35)", opacity: busy ? 0.6 : 1, ...style,
    }}>{busy ? "Erstelle Bild …" : label}</button>
  )
}
