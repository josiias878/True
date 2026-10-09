"use client"
// ── „Neu bei Kolbi“: kleiner Story-Kreis auf Heute + Vollbild-Storys (Daten: lib/labNews.ts) ─────
// Kreis leuchtet bei ungesehenen Neuheiten; danach bleibt er ruhig stehen (Storys jederzeit nochmal ansehen).
// Dazu der Kolbi-Ticker im großen Feld auf Heute, wenn gerade nichts zu tun ist.
// Storys: Fortschrittsbalken, rechts/links tippen = weiter/zurück, gedrückt halten = Pause,
// nach unten wischen / ✕ / Esc = schließen, Auto-Weiter nach 6 s. Bewegung reduzieren → keine Animationen.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { markNewsSeen, newsFor, onNewsSeenChange, recentNews, seenNews, type LabNews, type NewsAction } from "@/lib/labNews"
import { suppIconSrc } from "@/lib/labIcons"
import { STORE_MODE, fmtDate, type LabState } from "@/lib/supplementLab"
import { Mascot, MASCOT_NAME } from "./mascot"
import { haptic } from "./ui"
import { t, LOCALE } from "@/lib/labI18n"

const STORY_MS = 6000
const VIDEO_MAX_MS = 30000

const NEWS_CSS = `
.lab-news-ring { position: absolute; inset: 0; border-radius: 999px; background: conic-gradient(from 0deg, #2ECC8A, #3987e5, #a77bf3, #2ECC8A); animation: labNewsSpin 3.2s linear infinite; }
.lab-news-glow { position: absolute; inset: 0; border-radius: 999px; animation: labNewsGlow 2.2s ease-in-out infinite; }
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
.lab-news-tick { animation: labNewsTick .45s cubic-bezier(.2,.9,.3,1) both; }
@keyframes labNewsTick { from { opacity: 0; transform: translateX(18px) } to { opacity: 1; transform: none } }
.lab-news-tick-back { animation-name: labNewsTickBack; }
@keyframes labNewsTickBack { from { opacity: 0; transform: translateX(-18px) } to { opacity: 1; transform: none } }
.lab-news-dot { animation: labNewsGlow 2.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .lab-news-ring, .lab-news-glow, .lab-news-scanline, .lab-news-pop, .lab-news-float, .lab-news-orbit, .lab-news-orbit > span > span, .lab-news-star, .lab-news-hero, .lab-news-spark, .lab-news-in, .lab-news-tick, .lab-news-dot { animation: none !important; }
  .lab-news-scanline { top: 48%; }
  .lab-news-spark { opacity: 0; }
}
`

const reducedMotion = () => { try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches } catch { return false } }

/** Ungesehene Neuheiten für diesen Nutzer; aktualisiert sich live, wenn eine gesehen wird. */
export function useUnseenNews(s: LabState, today: string): LabNews[] {
  const [list, setList] = useState<LabNews[]>([])
  useEffect(() => {
    const check = () => setList(newsFor(s, today, seenNews())) // Demo-Modus → immer leer
    check()
    return onNewsSeenChange(check)
  }, [s, today])
  return list
}

/** Alle aktuellen Neuheiten (Ticker/Archiv) + die ungesehenen; aktualisiert sich live. */
export function useNewsFeed(s: LabState, today: string): { recent: LabNews[]; unseen: LabNews[] } {
  const unseen = useUnseenNews(s, today)
  const recent = useMemo(() => s.demo ? [] : recentNews(today), [today, s.demo]) // Demo: nichts zeigen, Gesehen-Status nicht anfassen
  return { recent, unseen }
}

/** Kleiner runder Kolbi-Kreis: leuchtender Ring bei Ungesehenem, sonst ruhig – öffnet dann alle aktuellen Storys. */
export function NewsRing({ s, today, onOpen }: { s: LabState; today: string; onOpen: (items: LabNews[], start?: number) => void }) {
  const { recent, unseen } = useNewsFeed(s, today)
  if (!recent.length && !unseen.length) return null
  const fresh = unseen.length > 0
  return (
    <button onClick={() => { haptic(8); onOpen(fresh ? unseen : recent) }} className="lab-press lab-pop" data-news-ring
      aria-label={fresh ? (unseen.length === 1 ? t("Neu bei Kolbi: 1 Neuheit ansehen") : t("Neu bei Kolbi: {n} Neuheiten ansehen", { n: unseen.length })) : t("Neuigkeiten von Kolbi nochmal ansehen")}
      style={{ position: "relative", width: 48, height: 48, flexShrink: 0, padding: 0, border: "none", background: "transparent", borderRadius: 999 }}>
      <style>{NEWS_CSS}</style>
      {fresh && <span aria-hidden className="lab-news-glow" />}
      <span aria-hidden className={fresh ? "lab-news-ring" : undefined} style={fresh ? undefined : { position: "absolute", inset: 0, borderRadius: 999, background: "var(--border)" }} />
      <span aria-hidden style={{ position: "absolute", inset: fresh ? 3 : 2, borderRadius: 999, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <span style={{ marginTop: 4 }}><Mascot size={36} mood="happy" /></span>
      </span>
    </button>
  )
}

const ART_EMOJI: Record<LabNews["art"], string> = { scan: "📷", dose: "💊", stars: "⭐", groups: "👥", video: "🎬" }

/** Vorschaubild im Ticker: 3D-Bild (Store-App) bzw. Video-Poster, sonst Emoji */
function Thumb({ n }: { n: LabNews }) {
  const [bad, setBad] = useState(false)
  const src = n.art === "video" ? n.video?.poster : STORE_MODE ? n.img : undefined
  return (
    <span aria-hidden style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#14142a" }}>
      {src && !bad
        ? <img src={src} alt="" draggable={false} onError={() => setBad(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        : <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{ART_EMOJI[n.art]}</span>}
    </span>
  )
}

const TICK_MS = 5500

/**
 * Kolbi-Ticker: kompakte Neuigkeiten-Zeile im großen Feld auf Heute (nur, wenn gerade nichts zu tun ist).
 * Wechselt alle 5,5 s von selbst (nicht bei „Bewegung reduzieren“, nicht während Finger/Fokus darauf liegt),
 * wischen = vor/zurück, tippen = Story an dieser Stelle öffnen.
 */
export function NewsTicker({ s, today, onOpen }: { s: LabState; today: string; onOpen: (items: LabNews[], start?: number) => void }) {
  const { recent, unseen } = useNewsFeed(s, today)
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const [hold, setHold] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [still] = useState(reducedMotion)
  const down = useRef<{ x: number; y: number } | null>(null)
  const swipedAt = useRef(0) // Klick direkt nach einem Wisch ignorieren
  const len = recent.length
  const step = useCallback((d: number) => { setDir(d); setI(x => (x + d + len) % Math.max(1, len)) }, [len])
  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === "hidden")
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])
  useEffect(() => {
    if (len < 2 || hold || hidden || still) return
    const tm = setTimeout(() => step(1), TICK_MS)
    return () => clearTimeout(tm)
  }, [i, len, hold, hidden, still, step])
  if (!len) return null
  const n = recent[Math.min(i, len - 1)]
  const isNew = unseen.some(u => u.id === n.id)
  return (
    <div style={{ marginTop: 16, width: "100%" }}>
      <style>{NEWS_CSS}</style>
      <button className="lab-press" data-news-ticker
        onClick={() => { if (Date.now() - swipedAt.current < 400) return; haptic(8); onOpen(recent, recent.indexOf(n)) }}
        onPointerDown={e => { down.current = { x: e.clientX, y: e.clientY }; setHold(true) }}
        onPointerUp={e => {
          const d = down.current; down.current = null; setHold(false)
          if (!d) return
          const dx = e.clientX - d.x
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - d.y)) { swipedAt.current = Date.now(); step(dx < 0 ? 1 : -1) }
        }}
        onPointerCancel={() => { down.current = null; setHold(false) }}
        onPointerLeave={() => { if (!down.current) setHold(false) }}
        onFocus={e => { try { setHold(e.currentTarget.matches(":focus-visible")) } catch { setHold(true) } }} onBlur={() => setHold(false)}
        aria-label={`${t("Neu bei {name}", { name: MASCOT_NAME })}: ${n.title}. ${n.text} ${t("Story öffnen")}`}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 20, border: "1px solid var(--glass-line)", background: "var(--surface-2)", color: "var(--text)", textAlign: "left", cursor: "pointer", touchAction: "pan-y", overflow: "hidden" }}>
        <span key={n.id} className={`lab-news-tick${dir < 0 ? " lab-news-tick-back" : ""}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <Thumb n={n} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.68rem", fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--accent)" }}>
              {isNew && <span aria-hidden className="lab-news-dot" style={{ width: 7, height: 7, borderRadius: 999, background: "#2ECC8A", flexShrink: 0 }} />}
              {t("Neu bei {name}", { name: MASCOT_NAME })}
            </span>
            <span style={{ display: "block", fontWeight: 900, fontSize: "0.95rem", lineHeight: 1.25, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</span>
            <span style={{ display: "block", fontWeight: 600, fontSize: "0.78rem", lineHeight: 1.35, color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.text}</span>
          </span>
        </span>
        <span aria-hidden style={{ color: "var(--text-dim)", fontWeight: 900, fontSize: "1.1rem", flexShrink: 0 }}>›</span>
      </button>
      {len > 1 && (
        <div aria-hidden style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
          {recent.map((x, j) => <span key={x.id} style={{ width: j === i ? 16 : 6, height: 6, borderRadius: 6, background: j === i ? "var(--accent)" : "var(--border)", transition: "width .3s ease, background .3s ease" }} />)}
        </div>
      )}
    </div>
  )
}

/**
 * Kolbi-Werdegang: alle bisherigen Neuheiten als Zeitleiste (neueste oben, nach Monat gruppiert).
 * Tippen öffnet die Storys an dieser Stelle. Daten wie der Ticker (lib/labNews.ts), nur ohne Obergrenze.
 */
export function NewsTimeline({ today, onOpen }: { today: string; onOpen: (items: LabNews[], start?: number) => void }) {
  const all = useMemo(() => recentNews(today, undefined, undefined, Infinity), [today])
  const seen = useMemo(() => new Set(seenNews()), [])
  if (!all.length) return <div style={{ fontSize: "0.86rem", color: "var(--text-dim)" }}>{t("Noch keine Neuigkeiten.")}</div>
  const month = (d: string) => { try { return new Date(`${d}T12:00:00Z`).toLocaleDateString(LOCALE, { month: "long", year: "numeric" }) } catch { return d.slice(0, 7) } }
  return (
    <div style={{ position: "relative", paddingLeft: 18 }}>
      <style>{NEWS_CSS}</style>
      <span aria-hidden style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 2, borderRadius: 2, background: "var(--border)" }} />
      {all.map((n, i) => {
        const head = i === 0 || all[i - 1].date.slice(0, 7) !== n.date.slice(0, 7)
        return (
          <div key={n.id}>
            {head && <div style={{ fontSize: "0.72rem", fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-dim)", margin: i ? "14px 0 6px" : "0 0 6px" }}>{month(n.date)}</div>}
            <button className="lab-press" data-news-timeline={n.id} onClick={() => { haptic(8); onOpen(all, i) }}
              style={{ position: "relative", width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "8px 8px 8px 4px", marginBottom: 4, borderRadius: 16, border: "none", background: "none", color: "var(--text)", textAlign: "left", cursor: "pointer" }}>
              <span aria-hidden style={{ position: "absolute", left: -17, top: "50%", marginTop: -5, width: 10, height: 10, borderRadius: 999, background: seen.has(n.id) ? "var(--surface-2)" : "#2ECC8A", border: "2px solid var(--accent)" }} />
              <Thumb n={n} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 900, fontSize: "0.92rem", lineHeight: 1.25 }}>{n.title}</span>
                <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, lineHeight: 1.35, color: "var(--text-dim)" }}>{n.text}</span>
                <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-dim)", marginTop: 2 }}>{fmtDate(n.date)}</span>
              </span>
              <span aria-hidden style={{ color: "var(--text-dim)", fontWeight: 900 }}>›</span>
            </button>
          </div>
        )
      })}
    </div>
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
    <div style={{ position: "relative", width: "min(78vw, 40dvh, 340px)", aspectRatio: "1 / 1" }}>
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
      // Neutrale Ziel-Symbole – bewusst keine Supplements neben den Zielen (keine Wirkzuordnung)
      const g: [string, string][] = [["schlaf", "🌙"], ["energie", "🔋"], ["fokus", "🎯"], ["ruhe", "🫧"], ["muskeln", "🏋️"]]
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
                    <span style={{ fontSize: "1.8rem", lineHeight: 1 }}>{e}</span>
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
  const box: React.CSSProperties = { width: "min(62vw, 300px)", aspectRatio: "9 / 16", maxHeight: "40dvh", borderRadius: 26, overflow: "hidden", position: "relative", background: "rgba(255,255,255,.08)", boxShadow: "0 18px 40px rgba(0,0,0,.4)" }
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
        src={n.video.src} poster={n.video.poster} muted playsInline autoPlay={auto} preload={auto ? "metadata" : "none"} loop={false}
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

type VState = "loading" | "playing" | "failed" | "idle" | "ended"

const FOCUSABLE = "button:not([disabled]), [href], video[controls], [tabindex]:not([tabindex='-1'])"

export function NewsStories({ items, start = 0, onClose, onAction }: { items: LabNews[]; start?: number; onClose: () => void; onAction: (a: NonNullable<NewsAction>) => void }) {
  const [idx, setIdx] = useState(() => Math.min(Math.max(0, start), Math.max(0, items.length - 1)))
  const [held, setHeld] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  // Tastatur/Screenreader: kein Auto-Weiter, stattdessen Ansage über aria-live
  const [kbd, setKbd] = useState(false)
  const [dragY, setDragY] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const idxRef = useRef(idx)
  useEffect(() => { idxRef.current = idx }, [idx])
  const n = items[idx]
  const mediaPaused = held || hidden || userPaused // Video anhalten
  const paused = mediaPaused || kbd // kein Auto-Weiter

  const go = useCallback((d: number) => {
    const j = idxRef.current + d
    if (j >= items.length) { onClose(); return }
    setIdx(Math.max(0, j))
  }, [items.length, onClose])

  // Gesehen, sobald die Karte erscheint
  useEffect(() => { if (n) markNewsSeen(n.id) }, [n])

  // Öffnen: ✕ fokussieren, Hintergrund inert, Scrollen sperren · Schließen: Fokus zurück auf den Kreis
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const root = rootRef.current
    const siblings = root?.parentElement ? [...root.parentElement.children].filter((el): el is HTMLElement => el !== root && el instanceof HTMLElement && el.tagName !== "STYLE") : []
    const was = siblings.map(el => el.inert)
    siblings.forEach(el => { el.inert = true })
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // Fokus auf den Dialog selbst (nicht ✕): Leertaste pausiert statt zu schließen, iOS zeigt keinen Fokusrahmen
    rootRef.current?.focus({ preventScroll: true })
    return () => {
      siblings.forEach((el, i) => { el.inert = was[i] })
      document.body.style.overflow = prev
      const back = opener?.isConnected ? opener : document.querySelector<HTMLElement>("[data-news-ring]")
      try { back?.focus() } catch {}
    }
  }, [])

  // Tastatur: ← → Esc, Leertaste = Pause, Tab bleibt im Dialog
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose() }
      else if (e.key === "ArrowRight") { setKbd(true); go(1) }
      else if (e.key === "ArrowLeft") { setKbd(true); go(-1) }
      else if (e.key === " " && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); setUserPaused(p => !p) }
      else if (e.key === "Tab" && rootRef.current) {
        setKbd(true)
        const f = [...rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && (document.activeElement === first || !rootRef.current.contains(document.activeElement))) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && (document.activeElement === last || !rootRef.current.contains(document.activeElement))) { e.preventDefault(); first.focus() }
      }
    }
    const onVis = () => setHidden(document.visibilityState === "hidden")
    window.addEventListener("keydown", onKey); document.addEventListener("visibilitychange", onVis)
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVis) }
  }, [go, onClose])

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
  const roundBtn: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 999, border: "none", background: "rgba(255,255,255,.12)", color: "#fff", fontSize: "1.05rem", fontWeight: 900,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  }
  return (
    <div ref={rootRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("Neu bei {name}", { name: MASCOT_NAME })}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}
      onFocus={e => { if (e.target === e.currentTarget) return; try { if ((e.target as HTMLElement).matches(":focus-visible")) setKbd(true) } catch {} }}
      style={{
        position: "fixed", inset: 0, zIndex: 600, outline: "none", color: "#fff", touchAction: "none", userSelect: "none", WebkitUserSelect: "none", overflow: "hidden",
        // Navy wie die 3D-Bilder (#14142a), dazu leise Markenlichter
        background: "radial-gradient(110% 60% at 15% 5%, rgba(46,204,138,.22) 0%, rgba(46,204,138,0) 60%), radial-gradient(110% 60% at 95% 95%, rgba(57,135,229,.25) 0%, rgba(57,135,229,0) 60%), #14142a",
        transform: dragY ? `translateY(${dragY}px) scale(${1 - Math.min(dragY, 300) / 1500})` : undefined, opacity: dragY ? 1 - Math.min(dragY, 300) / 500 : 1,
        borderRadius: dragY ? 24 : 0, transition: dragY ? "none" : "transform .25s ease, opacity .25s ease",
        display: "flex", flexDirection: "column",
        padding: "calc(10px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))",
      }}>
      <style>{NEWS_CSS}</style>
      {/* Ansage für Screenreader/Tastatur (bleibt stehen, damit Wechsel angesagt werden) */}
      <span aria-live="polite" aria-atomic="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
        {kbd || userPaused ? `${t("{i} von {n}", { i: idx + 1, n: items.length })}: ${n.title}. ${n.text}` : ""}
      </span>
      <StoryCard key={n.id} n={n} idx={idx} items={items} paused={paused} mediaPaused={mediaPaused} held={held} kbd={kbd} userPaused={userPaused}
        onNext={() => go(1)} onClose={onClose} onAction={onAction} onTogglePause={() => setUserPaused(p => !p)} closeRef={closeRef} roundBtn={roundBtn} />
    </div>
  )
}

/** Eine Karte – eigener Zustand (Fortschritt, Video) beginnt bei jedem Kartenwechsel neu (key). */
function StoryCard({ n, idx, items, paused, mediaPaused, held, kbd, userPaused, onNext, onClose, onAction, onTogglePause, closeRef, roundBtn }: {
  n: LabNews; idx: number; items: LabNews[]; paused: boolean; mediaPaused: boolean; held: boolean; kbd: boolean; userPaused: boolean
  onNext: () => void; onClose: () => void; onAction: (a: NonNullable<NewsAction>) => void; onTogglePause: () => void
  closeRef: React.MutableRefObject<HTMLButtonElement | null>; roundBtn: React.CSSProperties
}) {
  const [progress, setProgress] = useState(0)
  const [vState, setVState] = useState<VState>(n.art === "video" ? "loading" : "idle")
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const elapsed = useRef(0)
  const isVideo = n.art === "video"

  // Fortschritt: Video nach Abspielzeit, sonst 6 s. Video lädt oder wartet auf Tipp (idle) → Zähler steht.
  useEffect(() => {
    let raf = 0, last = performance.now()
    const tick = (now: number) => {
      const dt = now - last; last = now
      const v = videoRef.current
      if (isVideo && vState === "playing" && v && v.duration > 0) {
        const total = Math.min(v.duration * 1000, VIDEO_MAX_MS)
        setProgress(Math.min(1, (v.currentTime * 1000) / total))
        if (!paused && v.currentTime * 1000 >= VIDEO_MAX_MS) { onNext(); return } // kürzere Videos: weiter über onEnded
      } else if (!paused && !(isVideo && (vState === "loading" || vState === "idle"))) {
        elapsed.current += dt
        const p = Math.min(1, elapsed.current / STORY_MS)
        setProgress(p)
        if (p >= 1) { onNext(); return }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [paused, vState, isVideo, onNext])
  useEffect(() => { if (vState === "ended" && !paused) onNext() }, [vState, paused, onNext])

  return <>
    {/* Fortschritt */}
    <div aria-hidden style={{ display: "flex", gap: 4 }}>
      {items.map((x, i) => (
        <span key={x.id} style={{ flex: 1, height: 3, borderRadius: 3, background: "rgba(255,255,255,.3)", overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", background: "#fff", width: `${(i < idx ? 1 : i > idx ? 0 : progress) * 100}%` }} />
        </span>
      ))}
    </div>
    {/* Kopf */}
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
      <span aria-hidden style={{ width: 34, height: 34, borderRadius: 999, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ marginTop: 3 }}><Mascot size={26} /></span></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 900, fontSize: "0.9rem" }}>{t("Neu bei {name}", { name: MASCOT_NAME })}</span>
        <span style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "rgba(255,255,255,.75)" }}>{fmtDate(n.date)}{held || userPaused ? ` · ${t("Pausiert")}` : ""}</span>
      </span>
      <button data-news-ui onClick={onTogglePause} aria-pressed={userPaused} aria-label={userPaused ? t("Weiter abspielen") : t("Pausieren")} className="lab-press" style={roundBtn}>
        {userPaused ? "▶" : "❚❚"}
      </button>
      <button data-news-ui ref={closeRef} onClick={onClose} aria-label={t("Schließen")} className="lab-press" style={{ ...roundBtn, marginRight: -6 }}>✕</button>
    </div>
    {/* Bild */}
    <div className="lab-news-in" style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: "8px 0" }}>
      <div style={{ pointerEvents: isVideo ? "auto" : "none", maxHeight: "100%" }}>
        <Art n={n} videoRef={videoRef} onVideoState={setVState} paused={mediaPaused} />
      </div>
    </div>
    {/* Text + ein Knopf */}
    <div className="lab-news-in" style={{ animationDelay: ".08s", flexShrink: 0 }}>
      <h2 style={{ margin: 0, fontSize: "clamp(1.3rem, 6vw, 1.65rem)", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-.01em" }}>{n.title}</h2>
      <p style={{ margin: "6px 0 0", fontSize: "clamp(0.9rem, 4.2vw, 1rem)", fontWeight: 600, lineHeight: 1.4, color: "rgba(255,255,255,.88)" }}>{n.text}</p>
      {n.action ? (
        <button data-news-ui onClick={() => { haptic(10); onAction(n.action!) }} className="lab-press" style={{
          marginTop: 14, width: "100%", minHeight: 52, borderRadius: 18, border: "none", background: "#fff", color: "#0f1a2a", fontWeight: 900, fontSize: "1.02rem",
          boxShadow: "0 10px 28px rgba(0,0,0,.35)",
        }}>{t("Ausprobieren")}</button>
      ) : idx < items.length - 1 || kbd ? (
        <button data-news-ui onClick={onNext} className="lab-press" style={{
          marginTop: 14, width: "100%", minHeight: 52, borderRadius: 18, border: "1px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.08)", color: "#fff", fontWeight: 900, fontSize: "1.02rem",
        }}>{idx < items.length - 1 ? t("Weiter") : t("Fertig")}</button>
      ) : <div style={{ height: 14 + 52 }} aria-hidden />}
      <div aria-hidden style={{ marginTop: 8, textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,.6)" }}>
        {idx < items.length - 1 ? t("Tippen für weiter · nach unten wischen zum Schließen") : t("Nach unten wischen zum Schließen")}
      </div>
    </div>
  </>
}
