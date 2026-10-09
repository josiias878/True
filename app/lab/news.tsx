"use client"
// ── „Neu bei Kolbi“: kleiner Story-Kreis auf Heute + Vollbild-Storys (Daten: lib/labNews.ts) ─────
// Kreis nur, solange ungesehene Neuheiten existieren – sonst rendert er nichts (kein Platzverbrauch).
// Storys: Fortschrittsbalken, rechts/links tippen = weiter/zurück, gedrückt halten = Pause,
// nach unten wischen / ✕ / Esc = schließen, Auto-Weiter nach 6 s. Bewegung reduzieren → keine Animationen.
import React, { useCallback, useEffect, useRef, useState } from "react"
import { LAB_NEWS, installDateOf, markNewsSeen, onNewsSeenChange, seenNews, unseenNews, type LabNews, type NewsAction } from "@/lib/labNews"
import { suppIconSrc } from "@/lib/labIcons"
import { STORE_MODE, fmtDate, type LabState } from "@/lib/supplementLab"
import { Mascot, MASCOT_NAME } from "./mascot"
import { haptic } from "./ui"
import { t } from "@/lib/labI18n"

const STORY_MS = 6000
const VIDEO_MAX_MS = 30000

const NEWS_CSS = `
.lab-news-ring { position: absolute; inset: 0; border-radius: 999px; background: conic-gradient(from 0deg, #2ECC8A, #3987e5, #a77bf3, #2ECC8A); animation: labNewsSpin 3.2s linear infinite; }
.lab-news-glow { animation: labNewsGlow 2.2s ease-in-out infinite; }
@keyframes labNewsSpin { to { transform: rotate(360deg) } }
@keyframes labNewsGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(46,204,138,.0) } 50% { box-shadow: 0 0 14px 2px rgba(46,204,138,.55) } }
.lab-news-scanline { position: absolute; left: 8%; right: 8%; height: 3px; border-radius: 3px; background: #2ECC8A; box-shadow: 0 0 14px 3px rgba(46,204,138,.8); animation: labNewsScan 2.2s ease-in-out infinite alternate; }
@keyframes labNewsScan { from { top: 12% } to { top: 84% } }
.lab-news-pop { animation: labPop .45s cubic-bezier(.2,1.4,.4,1) both; }
.lab-news-float { animation: labFloat 4s ease-in-out infinite; }
.lab-news-orbit { animation: labNewsSpin 18s linear infinite; }
.lab-news-orbit > span > span { animation: labNewsSpin 18s linear infinite reverse; }
.lab-news-star { animation: labNewsStar .5s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes labNewsStar { 0% { transform: scale(0) rotate(-40deg); opacity: 0 } 100% { transform: scale(1) rotate(0); opacity: 1 } }
.lab-news-hero { animation: labNewsHero 5s ease-in-out infinite; }
@keyframes labNewsHero { 0%,100% { transform: translateY(0) scale(1) } 50% { transform: translateY(-8px) scale(1.025) } }
.lab-news-spark { position: absolute; width: 14px; height: 14px; pointer-events: none; background: radial-gradient(circle, #fff 0 18%, rgba(255,230,150,.9) 30%, rgba(255,209,102,0) 70%); clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%); animation: labNewsSpark 2.4s ease-in-out infinite; opacity: 0; }
@keyframes labNewsSpark { 0%,100% { opacity: 0; transform: scale(.3) rotate(0) } 45% { opacity: 1; transform: scale(1.15) rotate(45deg) } 70% { opacity: 0; transform: scale(.5) rotate(90deg) } }
.lab-news-in { animation: labRise .4s cubic-bezier(.2,.9,.3,1) both; }
@media (prefers-reduced-motion: reduce) {
  .lab-news-ring, .lab-news-glow, .lab-news-scanline, .lab-news-pop, .lab-news-float, .lab-news-orbit, .lab-news-orbit > span > span, .lab-news-star, .lab-news-hero { animation: labNewsHero 5s ease-in-out infinite; }
@keyframes labNewsHero { 0%,100% { transform: translateY(0) scale(1) } 50% { transform: translateY(-8px) scale(1.025) } }
.lab-news-spark { position: absolute; width: 14px; height: 14px; pointer-events: none; background: radial-gradient(circle, #fff 0 18%, rgba(255,230,150,.9) 30%, rgba(255,209,102,0) 70%); clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%); animation: labNewsSpark 2.4s ease-in-out infinite; opacity: 0; }
@keyframes labNewsSpark { 0%,100% { opacity: 0; transform: scale(.3) rotate(0) } 45% { opacity: 1; transform: scale(1.15) rotate(45deg) } 70% { opacity: 0; transform: scale(.5) rotate(90deg) } }
.lab-news-in { animation: none !important; }
  .lab-news-scanline { top: 48%; }
}
`

const reducedMotion = () => { try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches } catch { return false } }

/** Ungesehene Neuheiten für diesen Nutzer; aktualisiert sich live, wenn eine gesehen wird. */
export function useUnseenNews(s: LabState, today: string): LabNews[] {
  const install = installDateOf(s)
  const [list, setList] = useState<LabNews[]>([])
  useEffect(() => {
    const check = () => setList(unseenNews(LAB_NEWS, install, today, seenNews()))
    check()
    return onNewsSeenChange(check)
  }, [install, today])
  return list
}

/** Kleiner runder Kolbi-Kreis mit leuchtendem Ring – nur bei ungesehenen Neuheiten. */
export function NewsRing({ s, today, onOpen }: { s: LabState; today: string; onOpen: (items: LabNews[]) => void }) {
  const items = useUnseenNews(s, today)
  if (!items.length) return null
  return (
    <button onClick={() => { haptic(8); onOpen(items) }} className="lab-press lab-pop" data-news-ring
      aria-label={items.length === 1 ? t("Neu bei Kolbi: 1 Neuheit ansehen") : t("Neu bei Kolbi: {n} Neuheiten ansehen", { n: items.length })}
      style={{ position: "relative", width: 48, height: 48, flexShrink: 0, padding: 0, border: "none", background: "transparent", borderRadius: 999 }}>
      <style>{NEWS_CSS}</style>
      <span aria-hidden className="lab-news-ring lab-news-glow" />
      <span aria-hidden style={{ position: "absolute", inset: 3, borderRadius: 999, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <span style={{ marginTop: 4 }}><Mascot size={36} mood="happy" /></span>
      </span>
    </button>
  )
}

// ── Illustrationen ──────────────────────────────────────────────────────────────

/** 3D-Icon (Store-App) bzw. Emoji (Next unter /lab hat keine Icons) */
function Ico({ id, emoji, size }: { id: string; emoji: string; size: number }) {
  const src = suppIconSrc(id)
  return src
    ? <img src={src} alt="" width={size} height={size} draggable={false} style={{ width: size, height: size, objectFit: "contain", display: "block", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.35))" }} />
    : <span style={{ fontSize: size * 0.7, lineHeight: 1, display: "block" }}>{emoji}</span>
}

const chip: React.CSSProperties = {
  minWidth: 56, height: 48, padding: "0 14px", borderRadius: 16, display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontWeight: 900, fontSize: "1.15rem", color: "#fff", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.22)",
}

type ArtProps = {
  n: LabNews; paused: boolean
  videoRef: React.MutableRefObject<HTMLVideoElement | null>
  onVideoState: (v: "loading" | "playing" | "failed" | "idle" | "ended") => void
}

/** Hauptbild: 3D-Kolbi (nur Store-App, liegt im Bundle) mit sanftem Schweben; fehlt es → gezeichnete Illustration */
function Art(p: ArtProps) {
  const { n } = p
  const [bad, setBad] = useState<string | null>(null)
  if (!n.img || !STORE_MODE || bad === n.id || n.art === "video") return <DrawnArt {...p} />
  const sparks = n.art === "stars" ? [[12, 18, 0], [80, 10, .6], [88, 62, 1.2], [6, 70, 1.8], [52, 4, .9]] : []
  return (
    <div style={{ position: "relative", width: "min(78vw, 46dvh, 340px)", aspectRatio: "1 / 1" }}>
      <img key={n.id} src={n.img} alt="" draggable={false} onError={() => setBad(n.id)} className="lab-news-hero"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 32,
          // Ränder weich ins Navy auslaufen lassen (Bild und Karte haben fast denselben Ton)
          WebkitMaskImage: "radial-gradient(72% 72% at 50% 50%, #000 72%, transparent 100%)", maskImage: "radial-gradient(72% 72% at 50% 50%, #000 72%, transparent 100%)" }} />
      {sparks.map(([x, y, d], i) => <span key={i} aria-hidden className="lab-news-spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s`, width: i % 2 ? 18 : 12, height: i % 2 ? 18 : 12 }} />)}
    </div>
  )
}

function DrawnArt({ n, onVideoState, videoRef, paused }: ArtProps) {
  switch (n.art) {
    case "scan": return (
      <div style={{ position: "relative", width: 220, height: 220, borderRadius: 32, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Sucher-Ecken */}
        {[{ top: 14, left: 14, b: "3px 0 0 3px" }, { top: 14, right: 14, b: "3px 3px 0 0" }, { bottom: 14, left: 14, b: "0 0 3px 3px" }, { bottom: 14, right: 14, b: "0 3px 3px 0" }].map((c, i) => {
          const { b, ...pos } = c
          return <span key={i} aria-hidden style={{ position: "absolute", width: 30, height: 30, borderColor: "#fff", borderStyle: "solid", borderWidth: b, borderRadius: 6, ...pos }} />
        })}
        <div className="lab-news-float" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Ico id="custom" emoji="🧴" size={110} />
          <svg aria-hidden width={92} height={30} viewBox="0 0 92 30">
            {[2, 6, 8, 13, 17, 19, 24, 29, 31, 36, 40, 43, 47, 52, 54, 59, 63, 66, 71, 75, 77, 82, 86, 89].map((x, i) => <rect key={x} x={x} y={0} width={i % 3 === 0 ? 2.6 : 1.4} height={30} fill="#fff" />)}
          </svg>
        </div>
        <span aria-hidden className="lab-news-scanline" />
        <span aria-hidden className="lab-news-pop" style={{ position: "absolute", right: -10, top: -10, width: 46, height: 46, borderRadius: 999, background: "#2ECC8A", color: "#06281b", fontWeight: 900, fontSize: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center", animationDelay: "1.1s", boxShadow: "0 8px 20px rgba(0,0,0,.3)" }}>✓</span>
      </div>
    )
    case "dose": return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div className="lab-news-float" style={{ position: "relative" }}>
          <Ico id="vitd" emoji="☀️" size={130} />
          <span aria-hidden className="lab-news-pop" style={{ position: "absolute", right: -6, bottom: 4, width: 44, height: 44, borderRadius: 999, background: "#2ECC8A", color: "#06281b", fontWeight: 900, fontSize: "1.3rem", display: "flex", alignItems: "center", justifyContent: "center", animationDelay: ".3s" }}>✓</span>
        </div>
        <div style={{ display: "flex", gap: 10 }} aria-hidden>
          {["½", "1×", "2×"].map((x, i) => (
            <span key={x} className="lab-news-pop" style={{ ...chip, animationDelay: `${0.7 + i * 0.18}s`, ...(i === 1 ? { background: "#fff", color: "#0f1a2a", border: "1px solid #fff" } : {}) }}>{x}</span>
          ))}
        </div>
      </div>
    )
    case "stars": return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div className="lab-news-float"><Mascot size={140} mood="party" glow /></div>
        <div aria-hidden style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} className="lab-news-star" style={{ fontSize: "2rem", lineHeight: 1, animationDelay: `${0.4 + i * 0.16}s`, color: i < 4 ? "#ffd166" : "rgba(255,255,255,.3)", textShadow: i < 4 ? "0 0 14px rgba(255,209,102,.6)" : undefined }}>★</span>
          ))}
        </div>
      </div>
    )
    case "groups": {
      const g: [string, string][] = [["melatonin", "😴"], ["koffein", "⚡"], ["lionsmane", "🎯"], ["ashwagandha", "🧘"], ["kreatin", "💪"]]
      const R = 108
      return (
        <div style={{ position: "relative", width: 280, height: 280 }}>
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}><Mascot size={110} mood="happy" glow /></div>
          <div aria-hidden className="lab-news-orbit" style={{ position: "absolute", inset: 0 }}>
            {g.map(([id, e], i) => {
              const a = (i / g.length) * Math.PI * 2 - Math.PI / 2
              return (
                <span key={id} style={{ position: "absolute", left: 140 + Math.cos(a) * R - 30, top: 140 + Math.sin(a) * R - 30, width: 60, height: 60 }}>
                  <span style={{ width: 60, height: 60, borderRadius: 999, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ico id={id} emoji={e} size={46} />
                  </span>
                </span>
              )
            })}
          </div>
        </div>
      )
    }
    case "video": return <NewsVideo n={n} videoRef={videoRef} onState={onVideoState} paused={paused} />
  }
}

/** Gestreamtes Video (stumm, inline). Offline/Fehler → Poster; fehlt auch das → Kolbi. Bewegung reduzieren → erst auf Tipp. */
function NewsVideo({ n, videoRef, onState, paused }: {
  n: LabNews; paused: boolean
  videoRef: React.MutableRefObject<HTMLVideoElement | null>
  onState: (v: "loading" | "playing" | "failed" | "idle" | "ended") => void
}) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false
  const [failed, setFailed] = useState(offline || !n.video)
  const [posterOk, setPosterOk] = useState(true)
  const [auto] = useState(() => !reducedMotion())
  const [playing, setPlaying] = useState(false)
  useEffect(() => { onState(failed ? "failed" : auto ? "loading" : "idle") }, [failed, auto]) // eslint-disable-line react-hooks/exhaustive-deps
  // Ohne Antwort in 8 s → wie offline behandeln
  useEffect(() => {
    if (failed || !auto) return
    const tm = setTimeout(() => { if (!videoRef.current || videoRef.current.readyState < 2) setFailed(true) }, 8000)
    return () => clearTimeout(tm)
  }, [failed, auto, videoRef])
  useEffect(() => {
    const v = videoRef.current
    if (!v || failed || !playing) return
    if (paused) v.pause(); else v.play().catch(() => {})
  }, [paused, failed, playing, videoRef])
  const box: React.CSSProperties = { width: "min(62vw, 300px)", aspectRatio: "9 / 16", maxHeight: "52dvh", borderRadius: 26, overflow: "hidden", position: "relative", background: "rgba(255,255,255,.08)", boxShadow: "0 18px 40px rgba(0,0,0,.4)" }
  if (failed || !n.video) return (
    <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {n.video && posterOk
        ? <img src={n.video.poster} alt="" onError={() => setPosterOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <Mascot size={120} mood="happy" />}
      <span style={{ position: "absolute", left: 10, right: 10, bottom: 10, padding: "8px 10px", borderRadius: 12, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: "0.78rem", fontWeight: 700, textAlign: "center" }}>
        {t("Video gerade nicht erreichbar – später nochmal reinschauen.")}
      </span>
    </div>
  )
  return (
    <div style={box}>
      <video ref={el => { videoRef.current = el; if (el) { el.muted = true; el.defaultMuted = true } }}
        src={n.video.src} poster={n.video.poster} muted playsInline autoPlay={auto} preload={auto ? "auto" : "none"} loop={false}
        onPlaying={() => { setPlaying(true); onState("playing") }} onEnded={() => onState("ended")} onError={() => setFailed(true)}
        aria-label={n.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      {!auto && !playing && (
        <button data-news-ui onClick={() => { const v = videoRef.current; if (v) v.play().then(() => setPlaying(true)).catch(() => setFailed(true)) }}
          aria-label={t("Video abspielen")} style={{ position: "absolute", left: "50%", top: "50%", width: 64, height: 64, marginLeft: -32, marginTop: -32, borderRadius: 999, border: "none", background: "rgba(0,0,0,.55)", color: "#fff", fontSize: "1.6rem" }}>▶</button>
      )}
    </div>
  )
}

// ── Vollbild-Storys ─────────────────────────────────────────────────────────────

export function NewsStories({ items, onClose, onAction }: { items: LabNews[]; onClose: () => void; onAction: (a: NonNullable<NewsAction>) => void }) {
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [held, setHeld] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [vState, setVState] = useState<"loading" | "playing" | "failed" | "idle" | "ended">("idle")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const elapsed = useRef(0)
  const n = items[idx]
  const paused = held || hidden

  const idxRef = useRef(0)
  idxRef.current = idx
  const go = useCallback((d: number) => {
    const j = idxRef.current + d
    if (j >= items.length) { onClose(); return }
    elapsed.current = 0; setProgress(0)
    setIdx(Math.max(0, j))
  }, [items.length, onClose])

  // Gesehen, sobald die Karte erscheint
  useEffect(() => { if (n) markNewsSeen(n.id) }, [n])
  useEffect(() => { if (n?.art !== "video") setVState("idle") }, [n])

  // Hintergrund nicht mitscrollen; Tastatur: ← → Esc
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1) }
    const onVis = () => setHidden(document.visibilityState === "hidden")
    window.addEventListener("keydown", onKey); document.addEventListener("visibilitychange", onVis)
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVis) }
  }, [go, onClose])

  // Fortschritt: Video nach Abspielzeit, sonst 6 s (Laden zählt nicht mit)
  useEffect(() => {
    let raf = 0, last = performance.now()
    const tick = (now: number) => {
      const dt = now - last; last = now
      const v = videoRef.current
      if (n?.art === "video" && vState === "playing" && v && v.duration > 0) {
        const total = Math.min(v.duration * 1000, VIDEO_MAX_MS)
        setProgress(Math.min(1, (v.currentTime * 1000) / total))
        if (v.currentTime * 1000 >= VIDEO_MAX_MS) { go(1); return } // kürzere Videos: weiter über onEnded
      } else if (!paused && !(n?.art === "video" && vState === "loading")) {
        elapsed.current += dt
        const p = Math.min(1, elapsed.current / STORY_MS)
        setProgress(p)
        if (p >= 1) { go(1); return }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [n, paused, vState, go])
  useEffect(() => { if (vState === "ended") go(1) }, [vState, go])

  // Gesten: tippen links/rechts, halten = Pause, nach unten wischen = schließen
  const g = useRef<{ x: number; y: number; t: number; hold: ReturnType<typeof setTimeout> | null } | null>(null)
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-news-ui]")) return
    g.current = { x: e.clientX, y: e.clientY, t: Date.now(), hold: setTimeout(() => setHeld(true), 220) }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!g.current) return
    const dy = e.clientY - g.current.y
    if (Math.abs(dy) > 10 || Math.abs(e.clientX - g.current.x) > 10) { if (g.current.hold) { clearTimeout(g.current.hold); g.current.hold = null } }
    if (dy > 0) setDragY(dy)
  }
  const onUp = (e: React.PointerEvent) => {
    const s = g.current; g.current = null
    if (!s) return
    if (s.hold) clearTimeout(s.hold)
    const dy = e.clientY - s.y, dx = e.clientX - s.x
    const wasHeld = held || Date.now() - s.t > 220
    setHeld(false); setDragY(0)
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) { onClose(); return }
    if (wasHeld || Math.abs(dx) > 30 || Math.abs(dy) > 30) return
    const w = (e.currentTarget as HTMLElement).clientWidth || window.innerWidth
    haptic(5)
    go(e.clientX < w * 0.3 ? -1 : 1)
  }
  const onCancel = () => { if (g.current?.hold) clearTimeout(g.current.hold); g.current = null; setHeld(false); setDragY(0) }

  if (!n) return null
  return (
    <div role="dialog" aria-modal="true" aria-label={t("Neu bei {name}", { name: MASCOT_NAME })}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 600, color: "#fff", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", overflow: "hidden",
        // Navy wie die 3D-Bilder (#14142a), dazu leise Markenlichter
        background: "radial-gradient(110% 60% at 15% 5%, rgba(46,204,138,.22) 0%, rgba(46,204,138,0) 60%), radial-gradient(110% 60% at 95% 95%, rgba(57,135,229,.25) 0%, rgba(57,135,229,0) 60%), #14142a",
        transform: dragY ? `translateY(${dragY}px) scale(${1 - Math.min(dragY, 300) / 1500})` : undefined, opacity: dragY ? 1 - Math.min(dragY, 300) / 500 : 1,
        borderRadius: dragY ? 24 : 0, transition: dragY ? "none" : "transform .25s ease, opacity .25s ease",
        display: "flex", flexDirection: "column",
        padding: "calc(10px + env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom))",
      }}>
      <style>{NEWS_CSS}</style>
      {/* Fortschritt */}
      <div aria-hidden style={{ display: "flex", gap: 4 }}>
        {items.map((x, i) => (
          <span key={x.id} style={{ flex: 1, height: 3, borderRadius: 3, background: "rgba(255,255,255,.3)", overflow: "hidden" }}>
            <span style={{ display: "block", height: "100%", background: "#fff", width: `${(i < idx ? 1 : i > idx ? 0 : progress) * 100}%` }} />
          </span>
        ))}
      </div>
      {/* Kopf */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <span aria-hidden style={{ width: 34, height: 34, borderRadius: 999, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ marginTop: 3 }}><Mascot size={26} /></span></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 900, fontSize: "0.9rem" }}>{t("Neu bei {name}", { name: MASCOT_NAME })}</span>
          <span style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "rgba(255,255,255,.75)" }}>{fmtDate(n.date)}{held ? ` · ${t("Pausiert")}` : ""}</span>
        </span>
        <button data-news-ui onClick={onClose} aria-label={t("Schließen")} className="lab-press" style={{
          width: 44, height: 44, marginRight: -6, borderRadius: 999, border: "none", background: "rgba(255,255,255,.12)", color: "#fff", fontSize: "1.1rem", fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>
      {/* Bild */}
      <div key={n.id} className="lab-news-in" style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ pointerEvents: n.art === "video" ? "auto" : "none" }}>
          <Art n={n} videoRef={videoRef} onVideoState={setVState} paused={paused} />
        </div>
      </div>
      {/* Text + ein Knopf */}
      <div key={`t-${n.id}`} className="lab-news-in" style={{ animationDelay: ".08s" }}>
        <h2 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-.01em" }}>{n.title}</h2>
        <p style={{ margin: "8px 0 0", fontSize: "1rem", fontWeight: 600, lineHeight: 1.45, color: "rgba(255,255,255,.88)" }}>{n.text}</p>
        {n.action ? (
          <button data-news-ui onClick={() => { haptic(10); onAction(n.action!) }} className="lab-press" style={{
            marginTop: 18, width: "100%", minHeight: 54, borderRadius: 18, border: "none", background: "#fff", color: "#0f1a2a", fontWeight: 900, fontSize: "1.02rem",
            boxShadow: "0 10px 28px rgba(0,0,0,.35)",
          }}>{t("Ausprobieren")}</button>
        ) : <div style={{ height: 18 + 54 }} aria-hidden />}
        <div aria-hidden style={{ marginTop: 10, textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,.6)" }}>
          {idx < items.length - 1 ? t("Tippen für weiter · nach unten wischen zum Schließen") : t("Nach unten wischen zum Schließen")}
        </div>
      </div>
    </div>
  )
}
