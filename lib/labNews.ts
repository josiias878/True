// ── „Neu bei Kolbi“: kurze Storys über frische Funktionen (Anzeige: app/lab/news.tsx) ─────────
// Datengetrieben: neue Karte = neuer Eintrag mit neuer, nie wiederverwendeter id. Gesehen-Status je id
// in localStorage („lab-news-seen“). Reine Anzeige-Hilfe ohne Netz und ohne Tracking.
import { t } from "./labI18n"

/** Welche animierte Illustration die Karte zeigt (gezeichnet in app/lab/news.tsx) */
export type NewsArt = "scan" | "dose" | "stars" | "groups" | "video"

/** Wohin „Ausprobieren“ führt (null = kein Knopf, z. B. Video) */
export type NewsAction = "scan" | "stack" | "checkin" | "communities" | null

export type LabNews = {
  /** Eindeutig und versioniert, z. B. "2026-10-scan" – nie wiederverwenden */
  id: string
  /** Veröffentlicht am (YYYY-MM-DD) */
  date: string
  title: string
  /** EIN Satz, ohne Wirkversprechen */
  text: string
  art: NewsArt
  action: NewsAction
  /** 3D-Kolbi-Hauptbild im App-Bundle (supplement-lab/public/news/*.webp); fehlt es → gezeichnete Illustration */
  img?: string
  /** Nur für art "video": gestreamt (nicht im Bundle), Poster daneben */
  video?: { src: string; poster: string }
}

/** Website (wie SITE_URL in lib/labGrow.ts) – Video wird gestreamt, nicht mitgeliefert */
const VIDEO_BASE = "https://kolbi-smoky.vercel.app/video/archiv/kolbi-02-testet"

export const LAB_NEWS: LabNews[] = [
  { id: "2026-10-scan", date: "2026-10-09", art: "scan", img: "./news/news-scan.webp", action: "scan",
    title: t("Scan deine Dose"), text: t("Strichcode in die Kamera halten – Kolbi trägt sie für dich ein.") },
  { id: "2026-10-dose", date: "2026-10-09", art: "dose", img: "./news/news-menge.webp", action: "stack",
    title: t("Menge mit einem Tipp"), text: t("½ · 1× · 2× direkt nach dem Abhaken – ohne extra Bildschirm.") },
  { id: "2026-10-stars", date: "2026-10-09", art: "stars", img: "./news/news-sterne.webp", action: "checkin",
    title: t("Kolbi lernt deine Sterne"), text: t("Nach ein paar Check-ins schlägt Kolbi deine üblichen Sterne vor – du bestätigst nur.") },
  { id: "2026-10-groups", date: "2026-10-09", art: "groups", img: "./news/news-gruppen.webp", action: "communities",
    title: t("Start-Gruppen"), text: t("Schlaf, Energie, Fokus, Stress, Muskeln – mit einem Tipp beitreten.") },
  { id: "2026-10-video-testet", date: "2026-10-09", art: "video", action: null,
    title: t("Kolbi im Labor"), text: t("Ein kurzer Blick hinter die Kulissen."),
    video: { src: `${VIDEO_BASE}.mp4`, poster: `${VIDEO_BASE}.jpg` } },
]

/** Neuheiten verschwinden nach so vielen Tagen von selbst (wer lange weg war, bekommt keine alten Storys) */
export const NEWS_MAX_DAYS = 45

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000)
const isIso = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)

/**
 * Welche Neuheiten kommen für diesen Nutzer überhaupt in Frage?
 * - Erst nach dem Onboarding (`installDate` = null → keine).
 * - Nur, was NACH dem Installationstag erschienen ist (beim ersten Start schon Vorhandenes ist nicht „neu“).
 * - Nicht aus der Zukunft, nicht älter als NEWS_MAX_DAYS.
 * Neueste zuerst; bei gleichem Datum Reihenfolge der Liste.
 */
export function eligibleNews(news: LabNews[], installDate: string | null, today: string, maxDays = NEWS_MAX_DAYS): LabNews[] {
  if (!isIso(installDate) || !isIso(today)) return []
  return news
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => isIso(n.date) && n.date > installDate && n.date <= today && dayDiff(n.date, today) < maxDays)
    .sort((a, b) => (a.n.date === b.n.date ? a.i - b.i : a.n.date < b.n.date ? 1 : -1))
    .map(({ n }) => n)
}

/** Noch nicht gesehene Neuheiten (für den leuchtenden Ring) */
export function unseenNews(news: LabNews[], installDate: string | null, today: string, seen: string[]): LabNews[] {
  return eligibleNews(news, installDate, today).filter(n => !seen.includes(n.id))
}

/**
 * Installationstag = frühester bekannter Tag dieses Nutzers (Start des Labors oder ältester Eintrag).
 * null, solange das Onboarding nicht abgeschlossen ist.
 */
export function installDateOf(s: { startDate: string | null; checkins?: Record<string, unknown>; took?: Record<string, unknown> }): string | null {
  if (!isIso(s.startDate)) return null
  let d = s.startDate
  for (const k of [...Object.keys(s.checkins ?? {}), ...Object.keys(s.took ?? {})]) if (isIso(k) && k < d) d = k
  return d
}

const KEY = "lab-news-seen"
const EVENT = "lab-news-seen"

/** Bereits gesehene Neuheiten-ids (leer ohne Speicher) */
export function seenNews(): string[] {
  try {
    if (typeof window === "undefined") return []
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch { return [] }
}

/** Neuheit als gesehen merken (Ring aktualisiert sich live) */
export function markNewsSeen(id: string) {
  try {
    const seen = seenNews()
    if (seen.includes(id)) return
    localStorage.setItem(KEY, JSON.stringify([...seen, id].slice(-200)))
  } catch {}
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: id })) } catch {}
}

export function onNewsSeenChange(fn: () => void): () => void {
  try {
    window.addEventListener(EVENT, fn)
    return () => window.removeEventListener(EVENT, fn)
  } catch { return () => {} }
}
