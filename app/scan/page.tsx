"use client"
import React, { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { ThemeToggle } from "@/components/ThemeProvider"
import BottomNav from "@/components/BottomNav"
import { incrementScan, incrementAvoided } from "@/components/Rings"
import { useScanLimit } from "@/lib/useScanLimit"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"
import { supabase } from "@/lib/supabase"
import PremiumGate from "@/components/PremiumGate"
import FloatingAssistant from "@/components/FloatingAssistant"
import ProductScore from "@/components/ProductScore"
import { guessEmoji, guessCategory } from "@/lib/productDetection"
import { calcScoreFromSeverity } from "@/lib/productScore"
// ZXing is lazy-loaded inside startCamera() — never runs during SSR/build
let BrowserMultiFormatReader: any = null

interface ScanResult {
  found: boolean; query?: string
  corporation?: { name: string; severity: string; aliases: string[] }
  categories?: { id: string; name: string; icon: string; description: string }[]
  evidence?: { id: string; title: string; source: string; date: string; level: string; status?: string }[]
  imageUrl?: string | null
  source?: string
  nutriments?: { kcal?: number; protein?: number; carbs?: number; sugar?: number; fat?: number; fiber?: number } | null
}

interface HistoryEntry {
  id: string
  query: string
  timestamp: number
  found: boolean
  corpName?: string
  severity?: string
  grade?: string   // A B C D F — computed score grade
  score?: number
  result: ScanResult
}

interface PartnerAlt {
  id: number
  partner_id: string
  name: string
  description: string | null
  category: string | null
  image_url: string | null
  shop_url: string | null
  price_hint: string | null
}

const HISTORY_KEY = "true-scan-history"
const SEV_COLOR: Record<string,string> = { critical:"#ff2233", high:"#ff7700", medium:"#ffcc00", low:"#2ECC8A" }
const SEV_LABEL: Record<string,string> = { critical:"KRITISCH", high:"HOCH", medium:"MITTEL", low:"GERING" }
const GRADE_COLOR: Record<string,string> = { A:"#2ECC8A", B:"#88cc44", C:"#ffcc00", D:"#ff7700", F:"#ff2233" }
const GRADE_LABEL: Record<string,string> = { A:"GUT", B:"OKAY", C:"BEDINGT", D:"KRITISCH", F:"GEFÄHRLICH" }

// ── Goal-spezifischer Kontext im Scan-Ergebnis ────────────────────────────
const GOAL_META: Record<string, { icon: string; label: string; color: string }> = {
  env:        { icon: "🌱", label: "Umwelt schützen",   color: "#2ECC8A" },
  health:     { icon: "💪", label: "Gesünder leben",    color: "#ff7700" },
  family:     { icon: "👨‍👩‍👧", label: "Familie schützen",  color: "#ffaa00" },
  truth:      { icon: "🔍", label: "Wahrheit kennen",   color: "#44aaff" },
  action:     { icon: "✊", label: "Etwas bewegen",     color: "#cc66ff" },
  budget:     { icon: "💸", label: "Clever sparen",     color: "#ffcc00" },
  weightloss: { icon: "⚖️", label: "Abnehmen",          color: "#38BDF8" },
  protein:    { icon: "💪", label: "Mehr Protein",      color: "#fb923c" },
  vegan:      { icon: "🌿", label: "Vegan/Vegetarisch", color: "#4ade80" },
}

const GOAL_SCAN_HINT: Record<string, Record<string, string>> = {
  env: {
    critical: "Dieser Konzern zählt zu den größten Verursachern von Abholzung und Plastik-Müll weltweit.",
    high:     "Dieser Konzern hat erhebliche Umweltauswirkungen — mit einer Alternative machst du den Unterschied.",
    medium:   "TRUE hat Umwelt-Hintergründe zu diesem Konzern — tippe auf Details.",
    low:      "Aus Umweltsicht keine schwerwiegenden Probleme bekannt.",
  },
  health: {
    critical: "Für dein Gesundheitsziel klar bedenklich — schau dir die Inhaltsstoffe genau an.",
    high:     "Für gesundheitsbewussten Einkauf gibt es hier bessere Alternativen.",
    medium:   "TRUE hat Infos zu Inhaltsstoffen und Zusatzstoffen dieses Konzerns für dich.",
    low:      "Aus Gesundheitssicht keine schwerwiegenden Bedenken bekannt.",
  },
  family: {
    critical: "Für Familien mit Kindern gibt es klar sicherere Alternativen zu diesem Konzern.",
    high:     "Für deine Familie empfehlen wir, eine Alternative zu prüfen.",
    medium:   "TRUE hat Infos zu Kindermarketing und Inhaltsstoffen für dich.",
    low:      "Keine besonderen Bedenken für Familien bekannt.",
  },
  truth: {
    critical: "Dieser Konzern ist mit zahlreichen dokumentierten Klagen und Verstößen belastet.",
    high:     "Hinter diesem Konzern stecken mehrere gut dokumentierte Probleme.",
    medium:   "TRUE hat recherchierte Hintergründe — tippe auf Details.",
    low:      "Keine schwerwiegenden dokumentierten Verstöße bekannt.",
  },
  action: {
    critical: "Du hast die Wahl — dein Kauf ist ein Signal. Hier gibt es eine bessere Option.",
    high:     "Mit einer Alternative sendest du als Verbraucher ein klares Signal.",
    medium:   "Bewusster Kauf: TRUE zeigt dir die Hintergründe dieses Konzerns.",
    low:      "Dieser Kauf ist unbedenklich — kein Handlungsbedarf.",
  },
  budget: {
    critical: "Es gibt günstigere UND bessere Alternativen zu diesem Produkt.",
    high:     "Faire Alternative oft zum gleichen oder niedrigeren Preis erhältlich.",
    medium:   "TRUE hat Preisvergleiche und Alternativen für dich.",
    low:      "Kein Grund zum Wechseln — dieser Kauf ist in Ordnung.",
  },
  weightloss: {
    critical: "Für Abnehmen ungeeignet — hoher Zucker- oder Kaloriengehalt. Schau auf die Nährwerte.",
    high:     "Für dein Ziel gibt es kalorienärmere Alternativen.",
    medium:   "Prüfe Kalorien und Zucker — TRUE zeigt dir die Nährwerte unten.",
    low:      "Für Abnehmen unbedenklich — kalorienarm und wenig Zucker.",
  },
  protein: {
    critical: "Sehr proteinarm — für Muskelaufbau klar die falsche Wahl.",
    high:     "Wenig Protein — für Muskelaufbau besser eine proteinreichere Alternative wählen.",
    medium:   "Mittlerer Proteingehalt — schau auf die genauen Werte unten.",
    low:      "Gute Proteinquelle — passt zu deinem Muskelaufbau-Ziel.",
  },
  vegan: {
    critical: "Enthält tierische Zutaten — nicht vegan. Schau auf die Inhaltsstoffe.",
    high:     "Möglicherweise tierische Inhaltsstoffe enthalten — prüfe die Zutatenliste.",
    medium:   "Veganer Status unklar — Zutaten prüfen empfohlen.",
    low:      "Keine auffälligen tierischen Zutaten erkannt — weitgehend pflanzlich.",
  },
}

function getGoalHint(goals: string[], severity: string | undefined): { icon: string; label: string; color: string; hint: string } | null {
  if (!goals.length || !severity) return null
  const g = goals[0]
  const meta = GOAL_META[g]
  const hint = GOAL_SCAN_HINT[g]?.[severity]
  if (!meta || !hint) return null
  return { ...meta, hint }
}

// ── Vertical score bar (0–100 scale) ─────────────────────────────────────
function scoreToColor(score: number): string {
  if (score >= 80) return "#2ECC8A"
  if (score >= 65) return "#88cc44"
  if (score >= 45) return "#ffcc00"
  if (score >= 25) return "#ff7700"
  return "#ff2233"
}
function scoreToLabel(score: number): string {
  if (score >= 80) return "Gut"
  if (score >= 65) return "Okay"
  if (score >= 45) return "Bedenklich"
  if (score >= 25) return "Kritisch"
  return "Gefährlich"
}

function VertikalScore({ score }: { score: number }) {
  const col = scoreToColor(score)
  const lbl = scoreToLabel(score)
  // score 100 → top (0%), score 0 → bottom (100%)
  const pct   = 100 - score

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "stretch", userSelect: "none" }}>
      {/* Scale numbers */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 2 }}>
        {[100, 75, 50, 25, 0].map(n => (
          <span key={n} style={{
            fontSize: "0.55rem", fontWeight: n === 100 || n === 0 ? 800 : 500,
            color: n === 100 ? "#2ECC8A" : n === 0 ? "#ff2233" : "var(--text-dim)",
            lineHeight: 1,
          }}>{n}</span>
        ))}
      </div>

      {/* Bar + marker */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ position: "relative", width: 20, height: 200, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(to bottom, #2ECC8A 0%, #a8e060 18%, #ffcc00 42%, #ff7700 68%, #ff2233 100%)",
          boxShadow: "inset 0 0 0 1px var(--border), 0 2px 12px rgba(0,0,0,0.15)" }}>
          {/* Tick marks at 25/50/75 */}
          {[25, 50, 75].map(n => (
            <div key={n} style={{ position: "absolute", left: 3, right: 3, top: `${100 - n}%`, height: 1, background: "rgba(0,0,0,0.25)" }} />
          ))}
          {/* Marker with score inside */}
          <div style={{
            position: "absolute", left: "50%", top: `${pct}%`,
            transform: "translate(-50%, -50%)",
            width: 36, height: 36, borderRadius: "50%",
            background: col,
            border: "3px solid #fff",
            boxShadow: `0 0 0 2px ${col}55, 0 4px 14px ${col}77`,
            transition: "top 0.7s cubic-bezier(.16,1,.3,1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2,
          }}>
            <span style={{ fontSize: "0.6rem", fontWeight: 900, color: "#000", lineHeight: 1 }}>{score}</span>
          </div>
        </div>
        {/* Label */}
        <div style={{ fontWeight: 900, fontSize: "0.68rem", color: col, textAlign: "center", whiteSpace: "nowrap", marginTop: 2 }}>{lbl}</div>
      </div>
    </div>
  )
}

// ── Circular score ring (Yuka-style) ─────────────────────────────────────
function CircleScore({ score }: { score: number }) {
  const col = scoreToColor(score)
  const lbl = scoreToLabel(score)
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = circ * (score / 100)
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, userSelect: "none" }}>
      <div style={{ position: "relative", width: 96, height: 96 }}>
        <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="48" cy="48" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
          <circle cx="48" cy="48" r={r} fill="none" stroke={col} strokeWidth="7"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s cubic-bezier(.16,1,.3,1)", filter: `drop-shadow(0 0 6px ${col}88)` }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <span style={{ fontSize: "1.65rem", fontWeight: 900, color: col, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: "0.5rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>/100</span>
        </div>
      </div>
      <span style={{ fontSize: "0.65rem", fontWeight: 800, color: col, textTransform: "uppercase", letterSpacing: "0.07em" }}>{lbl}</span>
    </div>
  )
}

// ── Better alternatives (Premium) ──────────────────────────────────────────
type Alt = { name: string; brand: string; reason: string; price: string; link: string }
const ALTERNATIVES: Record<string, Alt[]> = {
  nestle:     [{ name: "Nocciolata Bio Nusscreme", brand: "Rigoni di Asiago", reason: "Ohne Palmöl, Bio-zertifiziert, familiengeführt", price: "~4,50€", link: "https://www.rewe.de/suche/?search=nocciolata" },
               { name: "Zotter Labooko Schokolade", brand: "Zotter", reason: "100% Fairtrade, Bio, österreichische Manufaktur", price: "~3,80€", link: "https://www.zotter.at/shop" },
               { name: "AlnaturA Instant-Brühe", brand: "Alnatura", reason: "Bio, ohne Glutamat & Geschmacksverstärker", price: "~2,99€", link: "https://www.alnatura.de/de-de/produkte/" }],
  unilever:   [{ name: "Frosch Spülmittel Zitrone", brand: "Werner & Mertz", reason: "Ohne Mikroplastik, 100% biologisch abbaubar", price: "~2,20€", link: "https://www.frosch.de/produkte/geschirrspuelen/" },
               { name: "Sonett Waschmittel", brand: "Sonett", reason: "Zertifiziert biologisch abbaubar, vegan", price: "~8,90€", link: "https://www.sonett.eu/produkte/waschmittel/" },
               { name: "Logona Körperpflege", brand: "Logona", reason: "NATRUE-zertifiziert, kein Mikroplastik", price: "~5,50€", link: "https://www.logona.de/produkte/" }],
  cocacola:   [{ name: "Bionade Holunder", brand: "Bionade GmbH", reason: "Organisch gebraut, keine Konzernzugehörigkeit", price: "~1,20€", link: "https://www.bionade.de/produkte/" },
               { name: "Voelkel Bio-Direktsaft", brand: "Voelkel", reason: "Bio, familiengeführt seit 1936", price: "~2,50€", link: "https://www.voelkeljuice.de/produkte/" },
               { name: "Lemonaid Bio-Limonade", brand: "Lemonaid", reason: "Fairtrade, soziales Unternehmen", price: "~1,49€", link: "https://www.lemonaid.de/produkte/" }],
  pepsi:      [{ name: "Fritz Kola", brand: "fritz-kola GmbH", reason: "Unabhängig, nachhaltigere Produktion", price: "~1,50€", link: "https://www.fritz-kola.de/produkte/" },
               { name: "Bionade Holunder", brand: "Bionade GmbH", reason: "Organisch gebraut, kein Konzern", price: "~1,20€", link: "https://www.bionade.de/produkte/" },
               { name: "True Fruits Smoothie", brand: "true fruits", reason: "Unabhängig, kein Konzern", price: "~2,99€", link: "https://www.true-fruits.com/produkte/" }],
  procter:    [{ name: "Alverde Naturkosmetik", brand: "dm Alverde", reason: "Naturkosmetik, kein Mikroplastik, erschwinglich", price: "~2,95€", link: "https://www.dm.de/marken/alverde-naturkosmetik/" },
               { name: "Lavera Naturkosmetik", brand: "Laverana", reason: "NATRUE-zertifiziert, ohne Parabene", price: "~4,50€", link: "https://www.lavera.de/produkte/" }],
  kraft:      [{ name: "Alnatura Produkte", brand: "Alnatura", reason: "Bio, fair, ohne künstliche Zusatzstoffe", price: "ab 1,99€", link: "https://www.alnatura.de/de-de/produkte/" },
               { name: "Byodo Bio-Saucen", brand: "Byodo", reason: "Bio, ohne Geschmacksverstärker", price: "~3,49€", link: "https://www.rewe.de/suche/?search=byodo" }],
  mondelez:   [{ name: "Zotter Labooko", brand: "Zotter", reason: "100% Fairtrade, Bio, ohne Palmöl", price: "~3,80€", link: "https://www.zotter.at/shop" },
               { name: "Vivani Bio-Schokolade", brand: "Vivani", reason: "Bio-Kakao, Fairtrade-zertifiziert", price: "~2,50€", link: "https://www.rewe.de/suche/?search=vivani" },
               { name: "iChoc Bio-Schokolade", brand: "iChoc", reason: "Vegan, Bio, Fairtrade", price: "~2,79€", link: "https://www.rewe.de/suche/?search=ichoc+schokolade" }],
  mars:       [{ name: "Vivani Schoko-Riegel", brand: "Vivani", reason: "Bio-Kakao, fairer Handel", price: "~1,99€", link: "https://www.rewe.de/suche/?search=vivani+schokolade" },
               { name: "Ritter Sport Bio", brand: "Ritter Sport", reason: "Familienunternehmen, eigene Kakaoplantagenn", price: "~1,59€", link: "https://www.ritter-sport.de/de/schokolade/bio-schokolade" }],
  ferrero:    [{ name: "Nocciolata Bio Nusscreme", brand: "Rigoni di Asiago", reason: "Ohne Palmöl, Bio-zertifiziert", price: "~4,50€", link: "https://www.rewe.de/suche/?search=nocciolata" },
               { name: "SunButter Sonnenblumenkernmus", brand: "SunButter", reason: "Palmölfrei, nussallergiegeeignet", price: "~5,99€", link: "https://www.rewe.de/suche/?search=sonnenblumenkernmus" }],
  danone:     [{ name: "Andechser Bio-Joghurt", brand: "Andechser Natur", reason: "Bio, bayerische Molkerei, familiengeführt", price: "~0,99€", link: "https://www.andechser-natur.de/produkte/" },
               { name: "Alnatura Bio-Joghurt", brand: "Alnatura", reason: "Bio, fair, regional bezogen", price: "~0,89€", link: "https://www.alnatura.de/de-de/produkte/milchprodukte/" },
               { name: "Söbbeke Bio-Joghurt", brand: "Söbbeke", reason: "Familiengeführte Bio-Molkerei", price: "~1,19€", link: "https://www.rewe.de/suche/?search=soebbeke+joghurt" }],
  henkel:     [{ name: "Ecover Waschmittel", brand: "Ecover", reason: "Pflanzliche Inhaltsstoffe, biologisch abbaubar", price: "~7,50€", link: "https://www.ecover.com/de/produkte/" },
               { name: "Frosch Waschmittel", brand: "Werner & Mertz", reason: "Biologisch abbaubar, ohne Mikroplastik", price: "~5,50€", link: "https://www.frosch.de/produkte/waschmittel/" },
               { name: "Sodasan Waschmittel", brand: "Sodasan", reason: "Öko-zertifiziert, vegan, phosphatfrei", price: "~6,99€", link: "https://www.rewe.de/suche/?search=sodasan+waschmittel" }],
  bayer:      [{ name: "Weleda Naturheilmittel", brand: "Weleda", reason: "Pflanzliche Wirkstoffe, nachhaltig produziert", price: "variiert", link: "https://www.weleda.de/produkte" },
               { name: "Dr. Hauschka Pflege", brand: "Dr. Hauschka", reason: "Biodynamische Inhaltsstoffe", price: "variiert", link: "https://www.drhauschka.de/naturkosmetik/" }],
  redbull:    [{ name: "Voelkel Ingwer-Shots", brand: "Voelkel", reason: "Bio, natürlicher Energielieferant", price: "~1,49€", link: "https://www.voelkeljuice.de/produkte/" },
               { name: "Lemonaid Mate", brand: "Lemonaid", reason: "Fairtrade, natürliches Koffein aus Mate", price: "~1,49€", link: "https://www.lemonaid.de/produkte/" },
               { name: "Premium Cola", brand: "Premium Cola", reason: "Unabhängig, fair gehandelt", price: "~1,20€", link: "https://www.premium-cola.de/" }],
  "red bull": [{ name: "Voelkel Ingwer-Shots", brand: "Voelkel", reason: "Bio, natürlicher Energielieferant", price: "~1,49€", link: "https://www.voelkeljuice.de/produkte/" },
               { name: "Lemonaid Mate", brand: "Lemonaid", reason: "Fairtrade, natürliches Koffein aus Mate", price: "~1,49€", link: "https://www.lemonaid.de/produkte/" }],
  kellogg:    [{ name: "Barnhouse Bio-Müsli", brand: "Barnhouse", reason: "Bio-zertifiziert, ohne Palmöl", price: "~3,99€", link: "https://www.rewe.de/suche/?search=barnhouse+muesli" },
               { name: "Alnatura Müsli", brand: "Alnatura", reason: "Bio, fair, ohne künstliche Aromen", price: "~2,99€", link: "https://www.alnatura.de/de-de/produkte/getreide-brot/" }],
  "noe-quelle": [{ name: "BRITA Wasserfilter", brand: "BRITA", reason: "Kein Plastikmüll, günstigste Dauerlösung", price: "~30€ einmalig", link: "https://www.brita.de/wasserfilter/" },
                  { name: "Regionales Mineralwasser", brand: "Lokale Quelle", reason: "Kürzere Transportwege, weniger CO₂", price: "~0,30€", link: "https://www.rewe.de/suche/?search=mineralwasser+regional" }],
  "noe":      [{ name: "BRITA Wasserfilter", brand: "BRITA", reason: "Kein Plastikmüll, günstigste Dauerlösung", price: "~30€ einmalig", link: "https://www.brita.de/wasserfilter/" },
               { name: "Regionales Mineralwasser", brand: "Lokale Quelle", reason: "Kürzere Transportwege", price: "~0,30€", link: "https://www.rewe.de/suche/?search=mineralwasser+regional" }],
  beiersdorf: [{ name: "Lavera Naturkosmetik", brand: "Laverana", reason: "NATRUE-zertifiziert, ohne Parabene", price: "~4,50€", link: "https://www.lavera.de/produkte/" },
               { name: "Weleda Pflegeprodukte", brand: "Weleda", reason: "Biodynamische Zutaten, ohne Mineralöle", price: "~5,99€", link: "https://www.weleda.de/produkte" }],
  reckitt:    [{ name: "Frosch Reiniger", brand: "Werner & Mertz", reason: "Biologisch abbaubar, kein Chlor", price: "~2,49€", link: "https://www.frosch.de/produkte/" },
               { name: "Sodasan Reinigungsmittel", brand: "Sodasan", reason: "Vegan, öko-zertifiziert", price: "~3,99€", link: "https://www.rewe.de/suche/?search=sodasan" }],
}

// Accent-normalisierung für zuverlässiges Matching (z.B. "Nestlé" → "Nestle")
function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function getAlternatives(corpName: string): Alt[] {
  const key = normalizeStr(corpName)
  for (const [k, v] of Object.entries(ALTERNATIVES)) {
    if (key.includes(normalizeStr(k))) return v
  }
  // Kein Google-Fallback mehr — stattdessen Alnatura als universelle Alternative
  return [
    { name: "Alnatura Produkte", brand: "Alnatura", reason: "Bio, fair, ohne Konzernzugehörigkeit", price: "ab 0,99€", link: "https://www.alnatura.de/de-de/produkte/" },
    { name: "Regionaler Markt / Wochenmarkt", brand: "Lokal & unabhängig", reason: "Direkt vom Erzeuger — kein Konzern dazwischen", price: "variiert", link: "https://www.regional-einkaufen.de/" },
  ]
}

// ── Familienmitglied ──────────────────────────────────────────────────────
interface FamilyMember { id: string; name: string; age: string; emoji: string }

function getFamilyMemberScore(member: FamilyMember, result: ScanResult, konzernScore: { score: number } | null): {
  emoji: string; label: string; color: string; note: string
} {
  // Haustier-Erkennung
  const PET_EMOJIS = new Set(["🐕","🐈","🐶","🐱","🐾","🐇","🐹","🐠","🐦","🦜","🐰","🦮","🐩","🐈‍⬛","🐕‍🦺","🐓","🐢","🦎","🐡","🦮"])
  const PET_REGEX = /hund|katze|hamster|vogel|kaninchen|hase|welpe|kitten|kätzchen|haustier|meerschwein|schildkröte|goldfisch|labrador|retriever|bulldogge|pudel|dackel|papagei/i
  if (PET_EMOJIS.has(member.emoji) || PET_REGEX.test(member.name)) {
    return { emoji: "🐾", label: "Nicht relevant", color: "var(--text-dim)", note: "Kein Mensch — kein Lebensmittel-Score" }
  }
  const age = parseInt(member.age) || 30
  const cats = result.categories ?? []
  const hasNova4     = cats.some(c => c.id === "nova-4" || c.id.includes("nova4") || c.name?.toLowerCase().includes("nova 4"))
  const hasAdditives = cats.some(c => c.id === "additives-msg" || c.name?.toLowerCase().includes("zusatzstoff"))
  const hasPalmoel   = cats.some(c => c.id === "palmoel")
  const severity     = result.corporation?.severity ?? "low"
  const base         = konzernScore?.score ?? 85

  if (age < 6) {
    if (hasNova4 || hasAdditives || severity === "critical")
      return { emoji: "🚫", label: "Nicht geeignet", color: "#ff2233", note: "Für Kleinkinder nicht empfohlen" }
    if (hasPalmoel || severity === "high")
      return { emoji: "⚠️", label: "Mit Vorsicht", color: "#ff7700", note: "Nur sehr selten & in kleinen Mengen" }
    if (base >= 65) return { emoji: "✅", label: "Geeignet", color: "#2ECC8A", note: "Für Kleinkinder unbedenklich" }
    return { emoji: "🔶", label: "Eingeschränkt", color: "#ffcc00", note: "Lieber eine Alternative wählen" }
  }
  if (age < 13) {
    if (hasNova4 && (hasAdditives || severity === "critical"))
      return { emoji: "🚫", label: "Nicht geeignet", color: "#ff2233", note: "Für Kinder nicht empfohlen" }
    if (hasNova4 || severity === "critical")
      return { emoji: "⚠️", label: "Selten okay", color: "#ff7700", note: "Hochverarbeitetes lieber meiden" }
    if (base >= 60) return { emoji: "✅", label: "Geeignet", color: "#2ECC8A", note: "Für Kinder unbedenklich" }
    return { emoji: "🔶", label: "Eingeschränkt", color: "#ffcc00", note: "Nur gelegentlich" }
  }
  if (age < 18) {
    if (severity === "critical")
      return { emoji: "⚠️", label: "Bedenklich", color: "#ff7700", note: "Bessere Alternativen verfügbar" }
    if (base >= 65) return { emoji: "✅", label: "Okay", color: "#2ECC8A", note: "Für Jugendliche unbedenklich" }
    return { emoji: "🔶", label: "Gelegentlich", color: "#ffcc00", note: "Maßvoll genießen" }
  }
  // Erwachsene
  if (base >= 80) return { emoji: "✅", label: "Gut",          color: "#2ECC8A", note: "Unbedenklich" }
  if (base >= 65) return { emoji: "✅", label: "Okay",         color: "#88cc44", note: "Regelmäßig okay" }
  if (base >= 45) return { emoji: "🔶", label: "Eingeschränkt",color: "#ffcc00", note: "Gelegentlich okay" }
  if (base >= 25) return { emoji: "⚠️", label: "Kritisch",    color: "#ff7700", note: "Selten konsumieren" }
  return { emoji: "🚫", label: "Nicht empfohlen", color: "#ff2233", note: "Alternative wählen" }
}

// ── Ernährungscoach – goal-based coaching tips ────────────────────────────
const COACH_TIPS: Record<string, { good: string; bad: string; mid: string }> = {
  env: {
    bad:  "Als Umweltschützer lohnt sich eine nachhaltigere Alternative. Palmöl, Plastikverpackung und weite Transportwege belasten die Umwelt erheblich.",
    mid:  "Aus Umweltsicht gibt es bessere Optionen. Bio-Alternativen mit kürzeren Lieferketten wären hier vorzuziehen.",
    good: "Gute Wahl für dein Umwelt-Ziel! Achte zusätzlich auf Saisonalität und regionale Herkunft.",
  },
  health: {
    bad:  "Für dein Gesundheitsziel gibt es deutlich bessere Alternativen. Stark verarbeitete Produkte erhöhen langfristig das Risiko für Herz-Kreislauf-Erkrankungen.",
    mid:  "Als Gesundheitsbewusster: Achte auf den NOVA-Score und die Zutatenliste — je kürzer, desto besser.",
    good: "Tolle Wahl für dein Gesundheitsziel! Minimal verarbeitete Produkte sind der Grundstein einer gesunden Ernährung.",
  },
  family: {
    bad:  "Für Familien mit Kindern gibt es sicherere Alternativen. Kinder reagieren empfindlicher auf Zusatzstoffe und hochverarbeitete Zutaten.",
    mid:  "Für Kinder gilt: Weniger Zusatzstoffe, kürzere Zutatenlisten und niedrige NOVA-Scores sind das Ziel.",
    good: "Für die ganze Familie geeignet! Ergänze mit frischem Gemüse und Vollkornprodukten für eine ausgewogene Ernährung.",
  },
  truth: {
    bad:  "Die dokumentierten Probleme dieses Konzerns sind gut belegt. Als kritischer Verbraucher kannst du mit deiner Kaufentscheidung ein Zeichen setzen.",
    mid:  "Wissen schützt: TRUE liefert dir die Fakten — die Entscheidung liegt bei dir.",
    good: "Keine schwerwiegenden Verstöße dokumentiert — dennoch lohnt es sich, die Herkunft regelmäßig zu hinterfragen.",
  },
  action: {
    bad:  "Dein Kauf hat Macht. Mit einer bewussten Alternative sendest du ein klares Signal an die Lebensmittelindustrie.",
    mid:  "Jeder Kauf ist eine Abstimmung. TRUE zeigt dir, welche Unternehmen deinen Werten entsprechen.",
    good: "Guter Kauf — dieses Produkt ist eine vertretbare Wahl. Teile deine Erfahrung im TRUE-Feed!",
  },
  budget: {
    bad:  "Es gibt günstigere UND ethischere Alternativen. Faire Produkte sind oft nicht teurer als bekannte Marken.",
    mid:  "Budget + Ethik: Eigenmarken von Bioläden bieten oft das beste Verhältnis aus Preis und Qualität.",
    good: "Gutes Preis-Leistungs-Verhältnis bei vertretbarer Ethik — eine solide Wahl.",
  },
}

function getCoachTip(goal: string, score: number): string | null {
  const tips = COACH_TIPS[goal]
  if (!tips) return null
  if (score < 50) return tips.bad
  if (score >= 70) return tips.good
  return tips.mid
}

// ── "Warum dieses Ergebnis?" — Erklärung für nicht-perfekte Scores ───────
function getWhyExplanation(
  score: number,
  result: ScanResult,
  productType: "water" | "beverage" | "food",
): string | null {
  if (score >= 80) return null // A = top, keine Erklärung nötig
  const cats = (result.categories ?? []).filter(
    c => !c.id.startsWith("nova-") && !c.id.startsWith("ecoscore-")
  )
  const ecoscore = (result.categories ?? []).find(c => c.id.startsWith("ecoscore-"))
  const nova = (result.categories ?? []).find(c => c.id.startsWith("nova-"))

  if (score >= 65) {
    // Grade B — "Okay": erklären warum kein A
    if (cats.length > 0) {
      return `Nicht ganz bedenkenlos, weil: ${cats.map(c => c.name).join(", ")}. Insgesamt aber vertretbar.`
    }
    if (ecoscore) {
      const ecoGrade = ecoscore.id.replace("ecoscore-", "").toUpperCase()
      if (productType === "water") return `Der Konzern hat Eco-Score ${ecoGrade} — die Herstellung und der Transport des Wassers verursachen einen mittleren CO₂-Fußabdruck.`
      return `Eco-Score ${ecoGrade}: mittlere Ökobilanz. Das Produkt selbst ist unbedenklich, aber die Produktion hat einen spürbaren Umwelteinfluss.`
    }
    return "Vereinzelte dokumentierte Auffälligkeiten beim Konzern — kein akuter Handlungsbedarf, aber Alternativen verfügbar."
  }

  if (score >= 45) {
    // Grade C — "Bedenklich"
    if (cats.length > 0) return `Problematisch in den Bereichen: ${cats.map(c => c.name).join(", ")}. Gelegentlicher Kauf vertretbar — aber Alternativen prüfen.`
    return "Mehrere dokumentierte Missstände beim Konzern. Alternativen werden empfohlen."
  }

  // Grade D/F
  if (cats.length > 0) return `Schwerwiegende Probleme: ${cats.map(c => c.name).join(", ")}. TRUE empfiehlt eine Alternative.`
  return "Erhebliche oder kritische Missstände dokumentiert. Alternativen verfügbar."
}

// ── Produkt-Typ Erkennung ─────────────────────────────────────────────────
type ProductType = "water" | "beverage" | "food"

function detectProductType(query: string | undefined, corpName: string | undefined, aliases: string[]): ProductType {
  const text = [query ?? "", corpName ?? "", ...aliases].join(" ").toLowerCase()
  if (/wasser|mineral|quelle|quell|brunnen|spring|sparkling|still water|stilles|naturell|quellbrunn/.test(text)) return "water"
  if (/saft|juice|cola|limo|limonade|tee|tea|kaffee|coffee|energie|energy|bier|beer|wein|wine|bionade|fritz|getränk|drink/.test(text)) return "beverage"
  return "food"
}

// Gibt einen produkttyp-spezifischen Frequenz-Tipp zurück
function getFrequencyTip(productType: ProductType, tip: string, score: number): string {
  if (productType === "water") {
    if (score >= 65) return "Täglich empfohlen — Wasser ist lebenswichtig. 1,5–2 Liter pro Tag sind ideal. Still- oder Mineralwasser ohne Zusätze ist die beste Wahl."
    return "Täglich trinken — aber beachte: Dieser Konzern hat einige dokumentierte Probleme. Wasserfilter oder andere Marken sind eine Alternative."
  }
  if (productType === "beverage") {
    if (score >= 75) return "Als Getränk täglich in Maßen okay. Wasser bleibt die gesündeste Basis — dieses Getränk kann es sinnvoll ergänzen."
    if (score >= 50) return "Max. 1–3× pro Woche als Begleitung. Wasser sollte die Hauptquelle der Flüssigkeitszufuhr bleiben."
    return "Selten & in kleinen Mengen — besser auf Alternativen zurückgreifen."
  }
  return tip
}

// ── Recommendation logic ───────────────────────────────────────────────────
interface Rec {
  emoji: string
  verdict: string
  color: string
}

function getRecommendation(result: ScanResult): Rec {
  if (!result.found || !result.corporation) {
    return { emoji: "✅", color: "#2ECC8A", verdict: "Keine Auffälligkeiten." }
  }
  const s = result.corporation.severity
  if (s === "critical") return { emoji: "🚫", color: "#ff2233", verdict: "Nicht kaufen." }
  if (s === "high")     return { emoji: "⚠️", color: "#ff7700", verdict: "Alternative empfohlen." }
  if (s === "medium")   return { emoji: "🔶", color: "#ffcc00", verdict: "Mit Bedacht." }
  return { emoji: "✅", color: "#2ECC8A", verdict: "Bedenkenlos kaufen." }
}

// ── Drei klare Punkte für die Verdict-Card (kostenlos) ───────────────────
function hasKnownAlternative(corpName: string): boolean {
  const key = corpName.toLowerCase()
  return Object.keys(ALTERNATIVES).some(k => key.includes(k))
}

function getVerdictPoints(result: ScanResult): string[] {
  const cats  = result.categories ?? []
  const sev   = result.corporation?.severity ?? "low"
  const name  = result.corporation?.name ?? ""
  const hasAlt = hasKnownAlternative(name)

  if (sev === "critical") {
    const points = cats.slice(0, 3).map(c => c.name)
    const fallbacks = [
      "Mehrfach dokumentierte Verstöße",
      "Schlechte Bewertung durch NGOs",
      hasAlt ? "TRUE hat eine konkrete Alternative" : "TRUE empfiehlt einen Wechsel",
    ]
    while (points.length < 3) points.push(fallbacks[points.length])
    return points
  }
  if (sev === "high") {
    const points = cats.slice(0, 3).map(c => c.name)
    const fallbacks = [
      hasAlt ? "Konkrete Alternative in ähnlichem Preissegment" : "Eingeschränkte Empfehlung",
      "Eingeschränkte Empfehlung",
      "Hintergründe beachten",
    ]
    while (points.length < 3) points.push(fallbacks[points.length])
    return points
  }
  if (sev === "medium") {
    const realCats = cats.filter(c => !c.id.startsWith("nova-") && !c.id.startsWith("ecoscore-")).slice(0, 2)
    const points = realCats.map(c => c.name)
    if (points.length === 0) points.push("Dokumentierte Auffälligkeiten — Details unter Hintergründe")
    if (points.length < 2) points.push(hasAlt ? "Bessere Alternative verfügbar" : "Kein akuter Handlungsbedarf")
    points.push("Kein Grund zur sofortigen Vermeidung")
    return points
  }
  // low / gut
  const goodPoints: string[] = []
  const novaGood = cats.find(c => c.id === "nova-1" || c.id === "nova-2")
  if (novaGood) goodPoints.push(novaGood.name)
  const ecoGood = cats.find(c => c.id === "ecoscore-a" || c.id === "ecoscore-b")
  if (ecoGood) goodPoints.push(ecoGood.name)
  while (goodPoints.length < 3) goodPoints.push([
    "Keine kritischen Zusatzstoffe",
    "Keine schwerwiegenden Belege",
    name ? `Unbedenklich konsumierbar` : "Unbedenklich konsumierbar",
  ][goodPoints.length] ?? "")
  return goodPoints
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveHistory(h: HistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 30))) } catch {}
}

function relTime(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Gerade eben"
  if (m < 60) return `Vor ${m} Min.`
  const h = Math.floor(m / 60)
  if (h < 24) return `Vor ${h} Std.`
  return `Vor ${Math.floor(h / 24)} Tagen`
}

function syncScanHistory(userId: string, query: string, found: boolean, corpName?: string, severity?: string) {
  if (!supabase) return
  supabase.from("scan_history").insert({
    id: `${userId}-${Date.now()}`,
    user_id: userId,
    query,
    found,
    corp_name: corpName ?? null,
    severity: severity ?? null,
    scanned_at: new Date().toISOString(),
  }).then(() => {})
}

export default function ScanPage() {
  const { user } = useSupabaseAuth()
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const readerRef = useRef<any>(null)

  const [mode, setMode]             = useState<"idle"|"scanning"|"result"|"manual">("idle")
  const [manualInput, setManualInput] = useState("")
  const [result, setResult]         = useState<ScanResult | null>(null)
  const [cameraError, setCameraError] = useState(false)
  const [scanLine, setScanLine]     = useState(0)
  const [history, setHistory]       = useState<HistoryEntry[]>([])
  const [addedToList, setAddedToList] = useState(false)
  const [showPremiumGate, setShowPremiumGate] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [userGoals, setUserGoals]       = useState<string[]>([])
  const [userAllergies, setUserAllergies] = useState<string[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [facingMode, setFacingMode]     = useState<"environment"|"user">("environment")
  const [torchOn, setTorchOn]           = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [scanSeconds, setScanSeconds]   = useState(0)
  const [ingredientData, setIngredientData] = useState<{
    found: boolean; productName?: string; nutriScore?: string | null
    flags?: { icon: string; label: string; detail: string; severity: "red"|"yellow"|"green" }[]
    clean?: boolean
  } | null>(null)
  const [ingredientLoading, setIngredientLoading] = useState(false)
  const [lookupError, setLookupError] = useState(false)

  // ── KI-Coach ──────────────────────────────────────────────────────────────
  const [coachReply, setCoachReply]       = useState<string | null>(null)
  const [coachLoading, setCoachLoading]   = useState(false)

  // ── Partner alternatives ──────────────────────────────────────────────────
  const [partnerAlts, setPartnerAlts]         = useState<PartnerAlt[]>([])
  const [partnerAltsLoading, setPartnerAltsLoading] = useState(false)

  // Map scan categories to partner product categories
  function mapToPartnerCategory(result: ScanResult | null): string | null {
    if (!result) return null
    const q = (result.query ?? "").toLowerCase()
    const corp = (result.corporation?.name ?? "").toLowerCase()
    const text = `${q} ${corp}`
    if (/milch|joghurt|käse|butter|dairy|quark/.test(text)) return "Milch"
    if (/schoko|nutella|nuss|aufstrich|chocolate/.test(text)) return "Schokolade"
    if (/reiniger|wasch|spül|clean|detergent/.test(text)) return "Reinigung"
    if (/snack|chip|cracker|keks|cookie|riegel/.test(text)) return "Snacks"
    if (/saft|cola|bier|wein|wasser|getränk|drink|limon|bionade/.test(text)) return "Getränke"
    return null
  }

  async function fetchPartnerAlts(scanResult: ScanResult) {
    if (!supabase) return
    const category = mapToPartnerCategory(scanResult)
    if (!category) return
    setPartnerAltsLoading(true)
    try {
      const { data } = await supabase
        .from("partner_products")
        .select("id,partner_id,name,description,category,image_url,shop_url,price_hint")
        .eq("category", category)
        .eq("active", true)
        .limit(2)
      const alts = (data ?? []) as PartnerAlt[]
      setPartnerAlts(alts)
      // Track impressions
      alts.forEach(a => {
        fetch("/api/partner/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: a.id, partnerId: a.partner_id, eventType: "impression", metadata: { scannedQuery: scanResult.query } }),
        }).catch(() => {})
      })
    } catch {}
    setPartnerAltsLoading(false)
  }

  async function fetchCoachAnalysis(scanResult: ScanResult, ingData: typeof ingredientData) {
    setCoachLoading(true)
    setCoachReply(null)
    try {
      const res = await fetch("/api/scan-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            name: scanResult.query ?? "unbekannt",
            corporation: scanResult.corporation?.name,
            severity: scanResult.corporation?.severity,
            nutriScore: ingData?.nutriScore,
            flags: ingData?.flags ?? [],
            categories: scanResult.categories?.map(c => c.name).join(", "),
          },
          goals: userGoals,
          allergies: userAllergies,
        }),
      })
      const data = await res.json()
      setCoachReply(data.reply ?? null)
    } catch {
      setCoachReply("Analyse konnte nicht geladen werden.")
    }
    setCoachLoading(false)
  }

  // Startet Coach-Analyse sobald Coach offen + Inhaltsstoff-Daten geladen (Race Condition Fix)
  useEffect(() => {
    if (expandedDetail === "coach" && !ingredientLoading && !coachReply && !coachLoading && result && isPremium) {
      fetchCoachAnalysis(result, ingredientData)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedDetail, ingredientLoading, ingredientData])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("true-profile")
      if (raw) {
        const p = JSON.parse(raw)
        if (Array.isArray(p.goals) && p.goals.length > 0) setUserGoals(p.goals)
        if (Array.isArray(p.allergies) && p.allergies.length > 0) setUserAllergies(p.allergies)
      }
      // Fallback goal keys (guest = "true-goals", auth = "true-goals-v1")
      const goalsRaw = localStorage.getItem("true-goals") || localStorage.getItem("true-goals-v1")
      if (goalsRaw) {
        try {
          const goals = JSON.parse(goalsRaw)
          if (Array.isArray(goals) && goals.length > 0) setUserGoals(goals)
        } catch {}
      }
    } catch {}
    try {
      const fm = localStorage.getItem("true-family-members")
      if (fm) setFamilyMembers(JSON.parse(fm))
    } catch {}
  }, [])

  const { canScan, scansLeft, isLimitHit, isPremium, recordScan, FREE_DAILY_LIMIT } = useScanLimit()

  useEffect(() => {
    setHistory(loadHistory())
    // Merge remote history on login
    if (!user || !supabase) return
    supabase
      .from("scan_history")
      .select("*")
      .eq("user_id", user.id)
      .order("scanned_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const remote = data.map((r: any) => ({
          id: r.id,
          query: r.query,
          timestamp: new Date(r.scanned_at).getTime(),
          found: r.found,
          corpName: r.corp_name ?? undefined,
          severity: r.severity ?? undefined,
          result: { found: r.found, corporation: r.corp_name ? { name: r.corp_name, severity: r.severity ?? "medium", aliases: [] } : undefined },
        }))
        setHistory(prev => {
          const localIds = new Set(prev.map(h => h.id))
          const merged = [...prev, ...remote.filter((r: any) => !localIds.has(r.id))]
          merged.sort((a, b) => b.timestamp - a.timestamp)
          saveHistory(merged)
          return merged.slice(0, 30)
        })
      })
  }, [user?.id])

  // Scan line animation
  useEffect(() => {
    if (mode !== "scanning") return
    setScanSeconds(0)
    let dir = 1, pos = 0, sec = 0
    const id = setInterval(() => {
      pos += dir * 2
      if (pos >= 100) dir = -1
      if (pos <= 0) { dir = 1; sec++; setScanSeconds(sec) }
      setScanLine(pos)
    }, 16)
    return () => clearInterval(id)
  }, [mode])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    try { readerRef.current?.reset() } catch {}
    readerRef.current = null
    setTorchOn(false)
    setTorchSupported(false)
  }, [])

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
      setTorchSupported(true)
    } catch {
      // Torch not supported on this device (e.g. iOS Safari)
      setTorchSupported(false)
    }
  }, [torchOn])

  const startCamera = useCallback(async (facing?: "environment"|"user") => {
    const f = facing ?? facingMode
    if (!canScan) { setShowPremiumGate(true); return }
    stopCamera()
    setCameraError(false)
    setMode("scanning")
    try {
      if (!BrowserMultiFormatReader) {
        const m = await import("@zxing/browser")
        BrowserMultiFormatReader = m.BrowserMultiFormatReader
      }

      // Optimierte Kamera-Einstellungen für schnelles Barcode-Lesen
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: f },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, min: 15 },
        }
      }).catch(() => navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: f },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        }
      }))

      // Continuous autofocus + torch-Support prüfen
      const track = stream.getVideoTracks()[0]
      if (track?.applyConstraints) {
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" } as any]
          })
        } catch {}
      }
      // Check torch support (best-effort — not available on iOS)
      const capabilities = (track as any)?.getCapabilities?.()
      const hasTorch = !!(capabilities?.torch)
      setTorchSupported(hasTorch)
      setTorchOn(false)

      streamRef.current = stream

      const hints = new Map()
      const { BarcodeFormat, DecodeHintType } = await import("@zxing/library")
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        BarcodeFormat.DATA_MATRIX, BarcodeFormat.ITF,
        BarcodeFormat.CODE_39, BarcodeFormat.RSS_14,
      ])
      // Alle Orientierungen + aggressiverer Scan-Modus
      hints.set(DecodeHintType.TRY_HARDER, true)

      const reader = new BrowserMultiFormatReader(hints)
      readerRef.current = reader

      await reader.decodeFromStream(
        stream,
        videoRef.current!,
        (res: any, _err: any, controls: any) => {
          if (res) {
            controls.stop()
            stopCamera()
            lookup(res.getText())
          }
        }
      )
    } catch {
      setCameraError(true)
      setMode("manual")
    }
  }, [stopCamera, facingMode, canScan])

  async function lookup(q: string) {
    if (!canScan) { setShowPremiumGate(true); return }
    setMode("result")
    setLookupError(false)
    setIngredientData(null)
    setIngredientLoading(true)
    let data: ScanResult
    try {
      const r = await fetch(`/api/lookup?q=${encodeURIComponent(q)}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      data = await r.json()
    } catch (e) {
      console.error("[lookup] fetch failed:", e)
      setLookupError(true)
      setIngredientLoading(false)
      return
    }
    setResult(data)
    setPartnerAlts([])
    setAddedToList(false)
    setCoachReply(null)
    // Fetch partner alternatives
    fetchPartnerAlts(data)
    // Auto-fetch ingredient data from Open Food Facts (independent of TRUE DB)
    fetch(`/api/ingredients?q=${encodeURIComponent(q)}&goals=${userGoals.join(",")}`)
      .then(r => r.json())
      .then(d => { setIngredientData(d); setIngredientLoading(false) })
      .catch(() => setIngredientLoading(false))
    recordScan()
    incrementScan()
    if (data.found && data.corporation?.severity && data.corporation.severity !== "low") incrementAvoided()

    // Save to history (local + Supabase)
    const computedScore = data.found && data.corporation
      ? calcScoreFromSeverity(
          data.corporation.severity,
          data.corporation.aliases ?? [],
          data.categories ?? [],
          data.evidence ?? [],
          userGoals,
        )
      : null
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      query: q,
      timestamp: Date.now(),
      found: data.found,
      corpName: data.corporation?.name,
      severity: data.corporation?.severity,
      grade: computedScore?.grade,
      score: computedScore?.score,
      result: data,
    }
    const next = [entry, ...loadHistory()].slice(0, 50)
    saveHistory(next)
    setHistory(next)
    if (user) {
      syncScanHistory(user.id, q, data.found, data.corporation?.name, data.corporation?.severity)
    }
  }

  function addToShoppingList() {
    if (!result) return
    try {
      const existing = JSON.parse(localStorage.getItem("shopping-list-items-v1") || "[]")
      const corpName = result.corporation?.name ?? result.query ?? "Unbekannt"
      const productName = result.query || corpName
      // If query is a pure barcode (only digits), use corp name for category detection
      const isBarcode = /^\d{6,}$/.test(productName.trim())
      const detectFrom = (isBarcode ? corpName : productName).toLowerCase()
      const category =
        /wasser|saft|cola|bier|wein|drink|getränk|tee|kaffee|espresso|limonade|energy/i.test(detectFrom) ? "drinks" :
        /milch|joghurt|käse|butter|quark|sahne|molke/i.test(detectFrom) ? "dairy" :
        /brot|brötchen|toast|knäcke|mehl|backen/i.test(detectFrom) ? "bread" :
        /fleisch|wurst|hähnchen|schnitzel|steak|fisch|lachs/i.test(detectFrom) ? "meat" :
        /tiefkühl|pizza|eis|frozen/i.test(detectFrom) ? "frozen" :
        /waschmittel|spülmittel|reiniger|shampoo|deo|dusch|seife/i.test(detectFrom) ? "household" :
        /obst|gemüse|salat|tomate|banane|apfel|gurke|karotte/i.test(detectFrom) ? "produce" :
        /nestle|nestlé|coca.cola|pepsi|unilever|procter|henkel|kraft/i.test(detectFrom) ? "snacks" :
        "other"
      const item = {
        id: `scan-${Date.now()}`,
        name: productName,
        brand: corpName,
        issue: result.corporation?.severity === "critical" ? "Kritisch" :
               result.corporation?.severity === "high"     ? "Problematisch" :
               result.corporation?.severity === "medium"   ? "Mittel" : "—",
        severity: result.corporation?.severity ?? "none",
        emoji: guessEmoji(detectFrom),
        category,
        checked: false,
        addedAt: Date.now(),
      }
      localStorage.setItem("shopping-list-items-v1", JSON.stringify([item, ...existing]))
      setAddedToList(true)

      // Sync to Supabase so other devices see it immediately
      if (user && supabase) {
        supabase.from("list_items").upsert({
          id: item.id,
          user_id: user.id,
          list_id: "default",
          product_id: item.id,
          product_name: item.name,
          product_brand: item.brand,
          product_emoji: item.emoji,
          severity: item.severity,
          issue: `${item.category}||${item.issue}`,
          checked: item.checked,
          added_at: new Date(item.addedAt).toISOString(),
        }).then(() => {})
      }
    } catch {}
  }

  function reset() {
    stopCamera()
    setMode("idle"); setResult(null); setManualInput(""); setAddedToList(false); setShowDetails(false)
    setIngredientData(null); setIngredientLoading(false); setLookupError(false)
    setPartnerAlts([]); setPartnerAltsLoading(false)
  }

  function showHistoryResult(entry: HistoryEntry) {
    setResult(entry.result)
    setMode("result")
    setAddedToList(false)
  }

  function deleteHistory(id: string) {
    const next = history.filter(h => h.id !== id)
    setHistory(next); saveHistory(next)
  }

  useEffect(() => () => stopCamera(), [stopCamera])

  const konzernScore = result?.found && result.corporation
    ? calcScoreFromSeverity(
        result.corporation.severity,
        result.corporation.aliases ?? [],
        result.categories ?? [],
        result.evidence ?? [],
        userGoals,
      )
    : null

  // rec vom berechneten Score ableiten (nicht vom rohen severity)
  const rec: Rec | null = result
    ? konzernScore
      ? (() => {
          const s = konzernScore.score
          if (s >= 80) return { emoji: "✅", color: "#2ECC8A", verdict: "Bedenkenlos kaufen." }
          if (s >= 65) return { emoji: "🟢", color: "#88cc44", verdict: "Okay." }
          if (s >= 45) return { emoji: "🔶", color: "#ffcc00", verdict: "Mit Bedacht." }
          if (s >= 25) return { emoji: "⚠️", color: "#ff7700", verdict: "Alternative empfohlen." }
          return { emoji: "🚫", color: "#ff2233", verdict: "Nicht kaufen." }
        })()
      : getRecommendation(result)
    : null

  return (
    <div style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 90 }}>
      {/* NAV */}
      <nav style={{ borderBottom: "1px solid var(--border)", background: "var(--nav-bg)", backdropFilter: "blur(20px)", padding: "0 1.25rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/home" style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.05em", color: "var(--accent)", textDecoration: "none" }}>TRUE</Link>
        <span style={{ fontWeight: 700, fontSize: "1rem" }}>Scanner</span>
        <div />
      </nav>

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "1.5rem 1.1rem 0" }}>

        {/* IDLE */}
        {mode === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "0.2rem" }}>Produkt scannen</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Kamera auf Barcode richten oder Produktname eingeben.</p>


            {/* Scan-Limit-Anzeige */}
            {!isPremium && (
              <div style={{ background: isLimitHit ? "rgba(255,68,85,0.08)" : "var(--surface)", border: `1px solid ${isLimitHit ? "rgba(255,68,85,0.3)" : "var(--border)"}`, borderRadius: "12px", padding: "0.75rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1rem" }}>{isLimitHit ? "🔒" : "📷"}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem", color: isLimitHit ? "#ff4455" : "var(--text)" }}>
                      {isLimitHit ? "Tageslimit erreicht" : `${scansLeft} von ${FREE_DAILY_LIMIT} Scans übrig`}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "1px" }}>
                      {isLimitHit ? "Setzt sich täglich zurück — oder jetzt upgraden" : "Kostenlos · Setzt sich täglich zurück"}
                    </div>
                  </div>
                </div>
                {!isLimitHit && (
                  <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
                    {Array.from({ length: FREE_DAILY_LIMIT }).map((_, i) => (
                      <div key={i} style={{ width: "6px", height: "18px", borderRadius: "3px", background: i < (FREE_DAILY_LIMIT - scansLeft) ? "rgba(255,68,85,0.4)" : "var(--accent)", transition: "background 0.2s" }} />
                    ))}
                  </div>
                )}
                {isLimitHit && (
                  <button onClick={() => setShowPremiumGate(true)} style={{ background: "linear-gradient(135deg, #ffd700, #ffaa00)", color: "#000", border: "none", borderRadius: "8px", padding: "0.4rem 0.85rem", fontWeight: 800, cursor: "pointer", fontSize: "0.75rem", flexShrink: 0, whiteSpace: "nowrap" }}>
                    👑 Premium
                  </button>
                )}
              </div>
            )}

            <button onClick={() => startCamera()} disabled={isLimitHit} style={{ background: isLimitHit ? "var(--surface)" : "var(--accent)", color: isLimitHit ? "var(--text-dim)" : "#000", border: isLimitHit ? "1px solid var(--border)" : "none", borderRadius: "16px", padding: "1.25rem", fontWeight: 800, cursor: isLimitHit ? "default" : "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", boxShadow: isLimitHit ? "none" : "0 0 20px rgba(46,204,138,0.15)", opacity: isLimitHit ? 0.6 : 1 }}>
              📷 Barcode scannen
            </button>
            <button onClick={() => isLimitHit ? setShowPremiumGate(true) : setMode("manual")} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.25rem", fontWeight: 600, cursor: "pointer", fontSize: "1rem", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", opacity: isLimitHit ? 0.6 : 1 }}>
              ✏️ Name eingeben
            </button>
          </div>
        )}

        {/* SCANNING */}
        {mode === "scanning" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", background: "#000", aspectRatio: "1" }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "65%", aspectRatio: "1.5", position: "relative" }}>
                  {[["0%","0%","top","left"],["0%","100%","top","right"],["100%","0%","bottom","left"],["100%","100%","bottom","right"]].map(([t,l,v,h]) => (
                    <div key={`${v}${h}`} style={{ position: "absolute", top: t, left: l, width: "20px", height: "20px", borderTop: v === "top" ? "2px solid var(--accent)" : "none", borderBottom: v === "bottom" ? "2px solid var(--accent)" : "none", borderLeft: h === "left" ? "2px solid var(--accent)" : "none", borderRight: h === "right" ? "2px solid var(--accent)" : "none" }} />
                  ))}
                  <div style={{ position: "absolute", left: 0, right: 0, top: `${scanLine}%`, height: "2px", background: "var(--accent)", boxShadow: "0 0 8px var(--accent)", transition: "top 0.016s linear" }} />
                </div>
              </div>
              {/* Torch + Abbrechen */}
              <div style={{ position: "absolute", bottom: "1rem", left: 0, right: 0, display: "flex", justifyContent: "center", gap: "0.75rem" }}>
                <button onClick={toggleTorch} style={{ background: torchOn ? "rgba(255,215,0,0.9)" : "rgba(0,0,0,0.6)", border: `1px solid ${torchOn ? "rgba(255,215,0,0.8)" : "rgba(255,255,255,0.2)"}`, color: torchOn ? "#000" : "#fff", borderRadius: "8px", padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, transition: "all 0.15s" }}>
                  {torchOn ? "🔦 An" : "🔦 Licht"}
                </button>
                <button onClick={reset} style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "8px", padding: "0.5rem 1.2rem", cursor: "pointer", fontSize: "0.85rem" }}>Abbrechen</button>
              </div>
            </div>
            {/* Hint after ~6s of scanning */}
            {scanSeconds >= 6 && (
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 14, padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>Barcode nicht erkannt?</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 2 }}>Etikett gerade halten, Licht einschalten oder Name eingeben</div>
                </div>
                <button onClick={() => { reset(); setTimeout(() => setMode("manual"), 80) }} style={{ flexShrink: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.45rem 0.85rem", color: "var(--text)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  ✏️ Eingeben
                </button>
              </div>
            )}
          </div>
        )}

        {/* MANUAL */}
        {mode === "manual" && (
          <div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 900, letterSpacing: "-0.02em", marginBottom: "1rem" }}>Name eingeben</h1>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input autoFocus value={manualInput} onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && manualInput.trim() && lookup(manualInput)}
                placeholder="z.B. Maggi, KitKat, Nescafé…"
                style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.85rem 1rem", color: "var(--text)", fontSize: "1rem", outline: "none" }} />
              <button onClick={() => manualInput.trim() && lookup(manualInput)} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "10px", padding: "0 1.5rem", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" }}>→</button>
            </div>
            <button onClick={reset} style={{ marginTop: "0.75rem", background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem" }}>← Zurück</button>
          </div>
        )}

        {/* LOOKUP LOADING — shown while API-call is in-flight */}
        {mode === "result" && !result && !lookupError && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeIn 0.2s" }}>
            {/* Skeleton Hauptkarte */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--surface-2)", animation: "pulse 1.4s ease-in-out infinite" }} />
              <div style={{ width: "60%", height: 14, borderRadius: 8, background: "var(--surface-2)", animation: "pulse 1.4s ease-in-out infinite 0.1s" }} />
              <div style={{ width: "40%", height: 10, borderRadius: 8, background: "var(--surface-2)", animation: "pulse 1.4s ease-in-out infinite 0.2s" }} />
            </div>
            {/* Skeleton Cards */}
            {[1,2].map(i => (
              <div key={i} style={{ height: 64, borderRadius: 16, background: "var(--surface)", border: "1px solid var(--border)", animation: `pulse 1.4s ease-in-out infinite ${i * 0.15}s` }} />
            ))}
            <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-dim)", marginTop: 4 }}>
              🔍 Produkt wird analysiert…
            </div>
          </div>
        )}

        {/* LOOKUP ERROR */}
        {mode === "result" && lookupError && (
          <div style={{ background: "rgba(255,68,85,0.08)", border: "1.5px solid rgba(255,68,85,0.3)", borderRadius: 16, padding: "1.5rem 1.25rem", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center" }}>
            <span style={{ fontSize: "2rem" }}>⚠️</span>
            <div style={{ fontWeight: 700, fontSize: "1rem" }}>Verbindungsfehler</div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.5 }}>Scan konnte nicht abgeschlossen werden. Bitte Internetverbindung prüfen und erneut versuchen.</div>
            <button onClick={reset} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 10, padding: "0.6rem 1.5rem", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>← Nochmal versuchen</button>
          </div>
        )}

        {/* RESULT */}
        {mode === "result" && result && rec && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>

            {/* ── NEUE HAUPTKARTE (Yuka-Stil, CircleScore) ── */}
            <div style={{ background: "var(--surface)", borderRadius: 24, border: `1.5px solid ${rec.color}33`, overflow: "hidden", boxShadow: `0 4px 32px ${rec.color}14` }}>

              {/* Farbstreifen oben */}
              <div style={{ height: 6, background: `linear-gradient(90deg, ${rec.color}, ${rec.color}66)` }} />

              {/* Verdict-Banner */}
              <div style={{ padding: "14px 18px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: rec.color + "15", border: `1.5px solid ${rec.color}44`, borderRadius: 99, padding: "6px 20px" }}>
                  <span style={{ fontWeight: 900, fontSize: "1rem", color: rec.color, letterSpacing: "-0.01em" }}>
                    {rec.emoji} {rec.verdict}
                  </span>
                </div>
              </div>

              {/* Score-Ring + Corp-Info nebeneinander */}
              <div style={{ padding: "16px 18px", display: "flex", gap: 18, alignItems: "center" }}>
                {/* Score-Ring */}
                {konzernScore
                  ? <CircleScore score={konzernScore.score} />
                  : <div style={{ width: 96 }} />
                }

                {/* Name + Aliases + Bullet Points */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {result.corporation ? (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.2 }}>{result.corporation.name}</div>
                          {result.corporation.aliases.length > 0 && (
                            <div style={{ fontSize: "0.66rem", color: "var(--text-dim)", marginTop: 3, lineHeight: 1.4 }}>
                              {result.corporation.aliases.slice(0, 4).join(" · ")}
                            </div>
                          )}
                        </div>
                        {result.imageUrl && (
                          <img
                            src={result.imageUrl}
                            alt={result.corporation.name}
                            style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 10, background: "#fff", flexShrink: 0, border: "1px solid var(--border)", padding: 3 }}
                            onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                          />
                        )}
                      </div>
                      {/* Bullet points */}
                      {konzernScore && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {getVerdictPoints(result).map((point, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                              <span style={{ color: rec.color, fontSize: "0.48rem", marginTop: 4, flexShrink: 0 }}>●</span>
                              <span style={{ fontSize: "0.76rem", color: "var(--text)", lineHeight: 1.45, fontWeight: 500 }}>{point}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginTop: 8 }}>Produkt nicht in der TRUE-Datenbank</div>
                  )}
                </div>
              </div>

              {/* Damage-Chips — kostenlos sichtbar */}
              {result.corporation && (() => {
                const damageCats = (result.categories ?? []).filter(c =>
                  !c.id.startsWith("nova-") && !c.id.startsWith("ecoscore-")
                )
                if (damageCats.length === 0) return null
                const sev = result.corporation.severity
                const chipStyle =
                  sev === "critical" ? { bg: "rgba(255,34,51,0.1)",  border: "rgba(255,34,51,0.3)",  text: "#ff2233" } :
                  sev === "high"     ? { bg: "rgba(255,119,0,0.1)",  border: "rgba(255,119,0,0.3)",  text: "#ff7700" } :
                  sev === "medium"   ? { bg: "rgba(255,170,0,0.1)",  border: "rgba(255,170,0,0.3)",  text: "var(--warning)" } :
                                       { bg: "rgba(46,204,138,0.1)", border: "rgba(46,204,138,0.3)", text: "#2ECC8A" }
                return (
                  <div style={{ padding: "0 18px 14px" }}>
                    <div style={{ height: 1, background: "var(--border)", marginBottom: 12 }} />
                    <div style={{ fontSize: "0.6rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      Dokumentierte Probleme
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {damageCats.slice(0, 6).map(cat => (
                        <span key={cat.id} style={{
                          background: chipStyle.bg,
                          border: `1px solid ${chipStyle.border}`,
                          borderRadius: 99,
                          padding: "4px 11px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: chipStyle.text,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}>
                          {cat.icon} {cat.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Aktions-Buttons */}
              <div style={{ padding: "0 14px 16px", display: "flex", gap: 8 }}>
                <button onClick={addToShoppingList} disabled={addedToList}
                  style={{ flex: 1, background: addedToList ? "rgba(46,204,138,0.12)" : "var(--accent)", color: addedToList ? "var(--accent)" : "#000", border: `1.5px solid ${addedToList ? "rgba(46,204,138,0.4)" : "transparent"}`, borderRadius: 12, padding: "10px 0", fontWeight: 700, cursor: addedToList ? "default" : "pointer", fontSize: "0.83rem", transition: "all 0.18s" }}>
                  {addedToList ? "✓ In Liste" : "🛒 Merken"}
                </button>
                {result.found && (
                  <button onClick={() => { setShowDetails(v => !v); setExpandedDetail(null); setExpandedCat(null) }}
                    style={{ flex: 1, background: showDetails ? "var(--surface-2)" : "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 0", fontWeight: 700, cursor: "pointer", fontSize: "0.83rem", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <span>{showDetails ? "Weniger" : "Details"}</span>
                    <span style={{ fontSize: "0.6rem", transform: showDetails ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.18s" }}>▼</span>
                  </button>
                )}
                {/* Share */}
                <button
                  onClick={() => {
                    const corp = result.corporation?.name ?? result.query ?? "Produkt"
                    const sev  = result.corporation?.severity
                    const verdict = sev === "critical" ? "🚫 Nicht empfohlen" : sev === "high" ? "⚠️ Mit Bedacht" : sev === "medium" ? "🔶 Okay" : "✅ Bedenkenlos"
                    const cats = (result.categories ?? []).filter(c => !c.id.startsWith("nova-") && !c.id.startsWith("ecoscore-")).slice(0,3).map(c => c.name).join(", ")
                    const text = `${verdict}: ${corp}${cats ? `\n📋 ${cats}` : ""}\n\nGescannt mit TRUE — get-true.de`
                    if (navigator.share) navigator.share({ title: `TRUE: ${corp}`, text })
                  }}
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 13px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: "var(--text-dim)" }}>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* ── INHALTSSTOFFE KARTE (immer sichtbar, unabhängig von TRUE-DB) ── */}
            {(() => {
              const NUTRI_COLOR: Record<string,string> = { A:"#2ECC8A", B:"#88cc44", C:"#ffcc00", D:"#ff7700", E:"#ff2233" }
              const hasFlags = (ingredientData?.flags?.length ?? 0) > 0
              const showContent = isPremium
              // Allergie-Check: welche der User-Allergien passen zum Produkt?
              const ALLERGIE_KEYWORDS: Record<string, string[]> = {
                gluten:        ["gluten","weizen","gerste","roggen","hafer","dinkel","wheat","barley","rye","oat"],
                laktose:       ["milch","molke","laktose","butter","sahne","käse","joghurt","milk","lactose","dairy","whey"],
                nuesse:        ["nuss","nüsse","mandel","haselnuss","cashew","walnuss","pistazie","nut","almond","hazelnut"],
                eier:          ["ei","eier","eigelb","eiweiß","egg","yolk"],
                soja:          ["soja","soy","tofu","edamame","miso"],
                fisch:         ["fisch","lachs","thunfisch","kabeljau","fish","salmon","tuna","cod","anchovy"],
                meeresfrüchte: ["garnele","shrimp","krebs","muschel","tintenfisch","seafood","prawn","crab","lobster"],
                sellerie:      ["sellerie","celery"],
                sesam:         ["sesam","tahini","sesame"],
                palmöl:        ["palmöl","palm","palm oil","palmin"],
              }
              const allergyWarnings: { id: string; label: string }[] = []
              if (userAllergies.length > 0 && result?.query) {
                const searchText = (result.query + " " + (ingredientData?.productName ?? "")).toLowerCase()
                userAllergies.forEach(allergyId => {
                  const keywords = ALLERGIE_KEYWORDS[allergyId] ?? []
                  if (keywords.some(kw => searchText.includes(kw))) {
                    const LABELS: Record<string,string> = { gluten:"Gluten", laktose:"Laktose", nuesse:"Nüsse", eier:"Eier", soja:"Soja", fisch:"Fisch", meeresfrüchte:"Meeresfrüchte", sellerie:"Sellerie", sesam:"Sesam", palmöl:"Palmöl" }
                    allergyWarnings.push({ id: allergyId, label: LABELS[allergyId] ?? allergyId })
                  }
                })
              }
              return (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 12px" }}>
                    <span style={{ fontSize: "1.1rem" }}>🧪</span>
                    <span style={{ flex: 1, fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>Inhaltsstoffe</span>
                    {!isPremium && <span style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", borderRadius: 6, padding: "1px 7px", fontSize: "0.58rem", fontWeight: 800 }}>👑 Premium</span>}
                    {ingredientData?.nutriScore && (
                      <span style={{ background: NUTRI_COLOR[ingredientData.nutriScore] ?? "var(--surface-2)", color: "#000", fontWeight: 900, fontSize: "0.78rem", borderRadius: 7, padding: "2px 9px" }}>
                        Nutri-Score {ingredientData.nutriScore}
                      </span>
                    )}
                  </div>
                  {/* Body */}
                  <div style={{ padding: "0 14px 14px", position: "relative" }}>
                    {/* Allergie-Warnung — IMMER sichtbar, kein Premium nötig */}
                    {allergyWarnings.length > 0 && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "rgba(255,68,85,0.1)", border: "1.5px solid rgba(255,68,85,0.4)", borderRadius: 12, padding: "10px 13px", marginBottom: 10 }}>
                        <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>⚠️</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#ff4455", marginBottom: 2 }}>Deine Allergien erkannt</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
                            Produkt enthält möglicherweise: <strong style={{ color: "var(--text)" }}>{allergyWarnings.map(a => a.label).join(", ")}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                    {showContent ? (
                      ingredientLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {[1,2].map(i => <div key={i} style={{ height: 38, borderRadius: 10, background: "var(--surface-2)", opacity: 0.55, animation: "pulse 1.4s ease-in-out infinite" }} />)}
                        </div>
                      ) : !ingredientData?.found ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                          <span style={{ fontSize: "0.85rem" }}>🔍</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Keine Nährwertdaten in Open Food Facts</span>
                          <a href="https://www.openfoodfacts.org/product/add" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--accent)", textDecoration: "none", fontWeight: 700, marginLeft: "auto", flexShrink: 0 }}>Eintragen →</a>
                        </div>
                      ) : ingredientData.clean || !hasFlags ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 12, padding: "10px 14px" }}>
                          <span style={{ fontSize: "1.1rem" }}>✅</span>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent)" }}>Keine bedenklichen Inhaltsstoffe</span>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {(ingredientData.flags ?? []).map((flag, fi) => (
                            <div key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: flag.severity === "red" ? "rgba(255,68,85,0.07)" : "rgba(255,170,0,0.07)", border: `1px solid ${flag.severity === "red" ? "rgba(255,68,85,0.22)" : "rgba(255,170,0,0.22)"}`, borderRadius: 12, padding: "9px 13px" }}>
                              <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: 1 }}>{flag.icon}</span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "0.8rem", color: flag.severity === "red" ? "#ff4455" : "#ffaa00" }}>{flag.label}</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 1 }}>{flag.detail}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      /* Non-premium: blurred preview + CTA */
                      <div style={{ position: "relative" }}>
                        <div style={{ filter: "blur(5px)", pointerEvents: "none", opacity: 0.4, display: "flex", flexDirection: "column", gap: 7 }}>
                          {[{icon:"🔬",label:"E211 Natriumbenzoat",sev:"red"},{icon:"🌴",label:"Palmöl",sev:"red"},{icon:"🍬",label:"Viel Zucker",sev:"yellow"}].map((f,i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: f.sev === "red" ? "rgba(255,68,85,0.07)" : "rgba(255,170,0,0.07)", border: `1px solid ${f.sev === "red" ? "rgba(255,68,85,0.22)" : "rgba(255,170,0,0.22)"}`, borderRadius: 12, padding: "9px 13px" }}>
                              <span>{f.icon}</span>
                              <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{f.label}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <div style={{ fontSize: "1.1rem" }}>👑</div>
                          <div style={{ fontWeight: 900, fontSize: "0.82rem", textAlign: "center" }}>Inhaltsstoffe mit Premium</div>
                          <button onClick={() => setShowPremiumGate(true)} style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", border: "none", borderRadius: 10, padding: "7px 18px", fontWeight: 800, cursor: "pointer", fontSize: "0.78rem" }}>14 Tage kostenlos →</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* ── NÄHRWERTE FÜR DEIN ZIEL ── */}
            {(() => {
              // Only show when user has protein / weightloss / vegan goal AND nutriments available
              const nutriGoals = userGoals.filter(g => ["protein","weightloss","vegan"].includes(g))
              if (nutriGoals.length === 0) return null
              const nm = result.nutriments

              // Vegan goal: use categories instead of nutriments
              const hasVeganGoal  = nutriGoals.includes("vegan")
              const veganCat      = (result.categories ?? []).find(c => c.id === "vegan-label")
              const vegetCat      = (result.categories ?? []).find(c => c.id === "vegetarian-label")
              const animalCat     = (result.categories ?? []).find(c => c.id === "animal-ingredient")
              const palmCat       = (result.categories ?? []).find(c => c.id === "palmoel")

              const hasProteinGoal    = nutriGoals.includes("protein")
              const hasWeightlossGoal = nutriGoals.includes("weightloss")
              const hasNutrimentData  = nm && (nm.protein !== undefined || nm.kcal !== undefined || nm.sugar !== undefined)

              if (!hasVeganGoal && !hasNutrimentData) return null

              return (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 12px" }}>
                    <span style={{ fontSize: "1.1rem" }}>🎯</span>
                    <span style={{ flex: 1, fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>Für dein Ziel</span>
                  </div>
                  <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

                    {/* ── Protein goal ── */}
                    {hasProteinGoal && nm?.protein !== undefined && (() => {
                      const p = nm.protein
                      const color = p >= 15 ? "#2ECC8A" : p >= 8 ? "#ffcc00" : "#ff4455"
                      const label = p >= 15 ? "Sehr proteinreich ✓" : p >= 8 ? "Mittlerer Proteingehalt" : "Wenig Protein ✗"
                      const tip   = p >= 15 ? "Super für Muskelaufbau — gute Proteinquelle." : p >= 8 ? "Brauchbar als Ergänzung, nicht als Hauptquelle." : "Kaum Protein — für Muskelaufbau kaum geeignet."
                      return (
                        <div style={{ background: color + "12", border: `1.5px solid ${color}44`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ fontSize: "1.6rem", fontWeight: 900, color, lineHeight: 1, flexShrink: 0, minWidth: 44, textAlign: "center" }}>
                            {p}<span style={{ fontSize: "0.7rem", fontWeight: 700 }}>g</span>
                          </div>
                          <div>
                            <div style={{ fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-dim)", marginBottom: 2 }}>Protein / 100g</div>
                            <div style={{ fontWeight: 800, fontSize: "0.82rem", color }}>{label}</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 2 }}>{tip}</div>
                          </div>
                          <span style={{ fontSize: "1.3rem", marginLeft: "auto" }}>💪</span>
                        </div>
                      )
                    })()}

                    {/* ── Weightloss goal ── */}
                    {hasWeightlossGoal && (nm?.kcal !== undefined || nm?.sugar !== undefined) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {nm.kcal !== undefined && (() => {
                          const k = nm.kcal
                          const color = k <= 60 ? "#2ECC8A" : k <= 200 ? "#ffcc00" : "#ff4455"
                          const label = k <= 60 ? "Kalorienarm ✓" : k <= 200 ? "Mittel" : "Kalorienreich ✗"
                          return (
                            <div style={{ background: color + "12", border: `1.5px solid ${color}44`, borderRadius: 12, padding: "9px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ fontSize: "1.4rem", fontWeight: 900, color, lineHeight: 1, flexShrink: 0, minWidth: 44, textAlign: "center" }}>
                                {k}<span style={{ fontSize: "0.65rem", fontWeight: 700 }}>kcal</span>
                              </div>
                              <div>
                                <div style={{ fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-dim)", marginBottom: 2 }}>Kalorien / 100g</div>
                                <div style={{ fontWeight: 800, fontSize: "0.8rem", color }}>{label}</div>
                              </div>
                              <span style={{ fontSize: "1.2rem", marginLeft: "auto" }}>⚖️</span>
                            </div>
                          )
                        })()}
                        {nm.sugar !== undefined && (() => {
                          const s = nm.sugar
                          const color = s <= 5 ? "#2ECC8A" : s <= 12 ? "#ffcc00" : "#ff4455"
                          const label = s <= 5 ? "Wenig Zucker ✓" : s <= 12 ? "Mittlerer Zuckergehalt" : "Zuckerreich ✗"
                          return (
                            <div style={{ background: color + "12", border: `1.5px solid ${color}44`, borderRadius: 12, padding: "9px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ fontSize: "1.4rem", fontWeight: 900, color, lineHeight: 1, flexShrink: 0, minWidth: 44, textAlign: "center" }}>
                                {s}<span style={{ fontSize: "0.65rem", fontWeight: 700 }}>g</span>
                              </div>
                              <div>
                                <div style={{ fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-dim)", marginBottom: 2 }}>Zucker / 100g</div>
                                <div style={{ fontWeight: 800, fontSize: "0.8rem", color }}>{label}</div>
                              </div>
                              <span style={{ fontSize: "1.2rem", marginLeft: "auto" }}>🍬</span>
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    {/* ── Vegan goal ── */}
                    {hasVeganGoal && (() => {
                      if (veganCat) return (
                        <div style={{ background: "#4ade8012", border: "1.5px solid #4ade8044", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: "1.5rem" }}>🌿</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#4ade80" }}>Vegan zertifiziert ✓</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 2 }}>Laut Hersteller vegan — keine tierischen Zutaten.</div>
                          </div>
                        </div>
                      )
                      if (vegetCat) return (
                        <div style={{ background: "#fbbf2412", border: "1.5px solid #fbbf2444", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: "1.5rem" }}>🥕</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#fbbf24" }}>Vegetarisch — nicht vegan</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 2 }}>Vegetarisch zertifiziert, enthält aber ggf. Milch oder Ei.</div>
                          </div>
                        </div>
                      )
                      if (animalCat) return (
                        <div style={{ background: "#ff445512", border: "1.5px solid #ff445544", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: "1.5rem" }}>🐄</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#ff4455" }}>Tierische Zutaten ✗</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 2 }}>Enthält Fleisch, Milch, Ei, Gelatine o.ä. — nicht vegan.</div>
                          </div>
                        </div>
                      )
                      if (palmCat) return (
                        <div style={{ background: "#ff770012", border: "1.5px solid #ff770044", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: "1.5rem" }}>🌴</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#ff7700" }}>Palmöl enthalten</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 2 }}>Vegan, enthält aber Palmöl — umweltkritisch.</div>
                          </div>
                        </div>
                      )
                      return (
                        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: "1.5rem" }}>❓</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text)" }}>Vegan-Status unklar</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 2 }}>Keine Vegan-Kennzeichnung gefunden — Zutaten prüfen.</div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Vollständige Nährwerttabelle (kompakt) */}
                    {nm && (nm.kcal !== undefined || nm.protein !== undefined || nm.carbs !== undefined) && (
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2 }}>
                        <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", marginBottom: 7 }}>Nährwerte pro 100g</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                          {nm.kcal     !== undefined && <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "7px 10px", textAlign: "center" }}><div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--text)" }}>{nm.kcal}</div><div style={{ fontSize: "0.57rem", color: "var(--text-dim)", marginTop: 1 }}>kcal</div></div>}
                          {nm.protein  !== undefined && <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "7px 10px", textAlign: "center" }}><div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--text)" }}>{nm.protein}g</div><div style={{ fontSize: "0.57rem", color: "var(--text-dim)", marginTop: 1 }}>Protein</div></div>}
                          {nm.carbs    !== undefined && <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "7px 10px", textAlign: "center" }}><div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--text)" }}>{nm.carbs}g</div><div style={{ fontSize: "0.57rem", color: "var(--text-dim)", marginTop: 1 }}>Kohlehydr.</div></div>}
                          {nm.sugar    !== undefined && <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "7px 10px", textAlign: "center" }}><div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--text)" }}>{nm.sugar}g</div><div style={{ fontSize: "0.57rem", color: "var(--text-dim)", marginTop: 1 }}>Zucker</div></div>}
                          {nm.fat      !== undefined && <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "7px 10px", textAlign: "center" }}><div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--text)" }}>{nm.fat}g</div><div style={{ fontSize: "0.57rem", color: "var(--text-dim)", marginTop: 1 }}>Fett</div></div>}
                          {nm.fiber    !== undefined && <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: "7px 10px", textAlign: "center" }}><div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--text)" }}>{nm.fiber}g</div><div style={{ fontSize: "0.57rem", color: "var(--text-dim)", marginTop: 1 }}>Ballaststoffe</div></div>}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )
            })()}

            {/* ── DETAIL-BEREICH (klappt auf) — Accordion ── */}
            {showDetails && result.found && result.corporation && konzernScore && (() => {
              const productType = detectProductType(result.query, result.corporation.name, result.corporation.aliases ?? [])
              const freqTip = getFrequencyTip(productType, konzernScore.tip, konzernScore.score)
              const freqIcon = productType === "water" ? "💧" : productType === "beverage" ? "🥤" : "⏱"
              const freqLabel = productType === "water" ? "Trinkmenge" : productType === "beverage" ? "Empfehlung" : "Empfohlene Häufigkeit"
              const premiumCats = (result.categories ?? []).filter(c => !c.id.startsWith("nova-") && !c.id.startsWith("ecoscore-") && c.id !== "palmoel" && c.id !== "additives-msg")
              const premiumGateBlock = (
                <div style={{ padding: "1.1rem", position: "relative" }}>
                  <div style={{ filter: "blur(4px)", pointerEvents: "none", opacity: 0.35, height: 44 }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <div style={{ fontSize: "1.2rem" }}>👑</div>
                    <div style={{ fontWeight: 900, fontSize: "0.85rem" }}>Premium freischalten</div>
                    <button onClick={() => setShowPremiumGate(true)} style={{ marginTop: 3, background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", border: "none", borderRadius: 10, padding: "7px 18px", fontWeight: 800, cursor: "pointer", fontSize: "0.8rem" }}>14 Tage kostenlos →</button>
                  </div>
                </div>
              )

              return (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", animation: "fadeIn 0.25s ease" }}>

                {/* ── HINTERGRÜNDE ── */}
                {(premiumCats.length > 0 || (result.evidence && result.evidence.length > 0)) && (() => {
                  const open = expandedDetail === "hintergruende"
                  return (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                      <button onClick={() => { setExpandedDetail(open ? null : "hintergruende"); setExpandedCat(null) }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: "1.1rem" }}>💡</span>
                        <span style={{ flex: 1, fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>Hintergründe</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
                      </button>
                      {open && (
                        <div style={{ borderTop: "1px solid var(--border)" }}>
                          {premiumCats.map(c => {
                            const catOpen = expandedCat === c.id
                            return (
                              <div key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <button onClick={() => setExpandedCat(catOpen ? null : c.id)}
                                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                                  <span style={{ fontSize: "1.1rem" }}>{c.icon}</span>
                                  <span style={{ flex: 1, fontWeight: 700, fontSize: "0.84rem", color: "var(--text)" }}>{c.name}</span>
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", transform: catOpen ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
                                </button>
                                {catOpen && (
                                  <div style={{ padding: "4px 16px 14px 42px" }}>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.6 }}>{c.description}</div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          {/* Evidence / Quellen aus interner DB */}
                          {(result.evidence ?? []).length > 0 && (
                            <div style={{ padding: "12px 16px" }}>
                              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>📋 Quellen & Belege</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {(result.evidence ?? []).map(ev => (
                                  <div key={ev.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                                    <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text)", marginBottom: 2 }}>{ev.title}</div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{ev.source} · {ev.date}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* If both empty, show placeholder */}
                          {premiumCats.length === 0 && (result.evidence ?? []).length === 0 && (
                            <div style={{ padding: "16px", fontSize: "0.78rem", color: "var(--text-dim)", textAlign: "center" }}>
                              Noch keine Hintergrundinformationen für dieses Produkt verfügbar.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* ── ALTERNATIVEN — nur bei hoher/kritischer Bewertung ── */}
                {(result.corporation.severity === "high" || result.corporation.severity === "critical") && (() => {
                  const open = expandedDetail === "alternativen"
                  return (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                      <button onClick={() => { if (!isPremium) { setShowPremiumGate(true); return } setExpandedDetail(open ? null : "alternativen"); setExpandedCat(null) }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: "1.1rem" }}>🔄</span>
                        <span style={{ flex: 1, fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>Bessere Alternativen</span>
                        {!isPremium && <span style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", borderRadius: 6, padding: "1px 6px", fontSize: "0.58rem", fontWeight: 800 }}>👑</span>}
                        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
                      </button>
                      {open && (
                        <div style={{ borderTop: "1px solid var(--border)" }}>
                          {isPremium ? (
                            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                              {getAlternatives(result.corporation.name).map((alt, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{alt.name}</div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 600 }}>{alt.brand}</div>
                                    <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 1 }}>{alt.reason}</div>
                                  </div>
                                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: "0.78rem", color: "var(--accent)", marginBottom: 4 }}>{alt.price}</div>
                                    <a href={alt.link} target="_blank" rel="noopener noreferrer" style={{ background: "var(--accent)", color: "#000", borderRadius: 8, padding: "4px 10px", fontSize: "0.7rem", fontWeight: 800, textDecoration: "none", display: "inline-block" }}>Ansehen →</a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : premiumGateBlock}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* ── ERNÄHRUNGSCOACH (KI-powered) ── */}
                {(() => {
                  const open = expandedDetail === "coach"
                  return (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                      <button onClick={() => {
                        if (!isPremium) { setShowPremiumGate(true); return }
                        setExpandedDetail(open ? null : "coach")
                        setExpandedCat(null)
                      }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: "1.1rem" }}>🥗</span>
                        <span style={{ flex: 1, fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>Ernährungscoach</span>
                        {!isPremium && <span style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", borderRadius: 6, padding: "1px 6px", fontSize: "0.58rem", fontWeight: 800 }}>👑</span>}
                        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
                      </button>
                      {open && (
                        <div style={{ borderTop: "1px solid var(--border)" }}>
                          {isPremium ? (
                            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

                              {/* Deine Ziele — als Chips oben */}
                              {userGoals.length > 0 && (
                                <div>
                                  <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Deine Ziele</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {userGoals.map(g => {
                                      const gm = GOAL_META[g]
                                      if (!gm) return null
                                      return (
                                        <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: gm.color + "18", border: `1px solid ${gm.color}44`, borderRadius: 99, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, color: gm.color }}>
                                          {gm.icon} {gm.label}
                                        </span>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Trennlinie */}
                              {userGoals.length > 0 && <div style={{ height: 1, background: "var(--border)" }} />}

                              {/* KI-Coach Analyse */}
                              {(coachLoading || ingredientLoading) && (
                                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "var(--accent)08", borderRadius: 10, border: "1px solid var(--accent)22" }}>
                                  <div style={{ display: "flex", gap: 3 }}>
                                    {[0,1,2].map(i => (
                                      <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", animation: `pulse 1.2s ease ${i*0.2}s infinite` }} />
                                    ))}
                                  </div>
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600 }}>
                                    {ingredientLoading ? "Lade Inhaltsstoffe …" : "Analysiere mit KI …"}
                                  </span>
                                </div>
                              )}

                              {coachReply && !coachLoading && (
                                <div style={{ padding: "12px 14px", background: "var(--accent)0d", borderRadius: 12, border: "1px solid var(--accent)22" }}>
                                  <div style={{ fontSize: "0.78rem", color: "var(--text)", lineHeight: 1.6 }}>{coachReply}</div>
                                </div>
                              )}

                              {!coachLoading && !coachReply && (
                                <div style={{ textAlign: "center", padding: "16px 12px", color: "var(--text-dim)" }}>
                                  <div style={{ fontSize: "0.75rem", marginBottom: 8 }}>Klicke nochmal um die KI-Analyse zu laden</div>
                                  <button onClick={() => fetchCoachAnalysis(result, ingredientData)}
                                    style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                                    Analysieren
                                  </button>
                                </div>
                              )}

                              {userGoals.length === 0 && !coachLoading && !coachReply && (
                                <div style={{ textAlign: "center", padding: "8px 0", fontSize: "0.78rem", color: "var(--text-dim)" }}>
                                  Keine Ziele gesetzt — geh in dein <strong>Profil</strong> und wähle deine Ziele für personalisierte Tipps.
                                </div>
                              )}

                            </div>
                          ) : premiumGateBlock}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* ── FAMILIEN-SCORE ── */}
                {familyMembers.length > 0 && (() => {
                  const open = expandedDetail === "familie"
                  return (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                      <button onClick={() => { if (!isPremium) { setShowPremiumGate(true); return } setExpandedDetail(open ? null : "familie"); setExpandedCat(null) }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: "1.1rem" }}>👨‍👩‍👧</span>
                        <span style={{ flex: 1, fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>Familien-Score</span>
                        {!isPremium && <span style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", borderRadius: 6, padding: "1px 6px", fontSize: "0.58rem", fontWeight: 800 }}>👑</span>}
                        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
                      </button>
                      {open && (
                        <div style={{ borderTop: "1px solid var(--border)" }}>
                          {isPremium ? (
                            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                              {familyMembers.map(m => {
                                const ms = getFamilyMemberScore(m, result, konzernScore)
                                return (
                                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.55rem 0.75rem", background: ms.color + "10", borderRadius: 10, border: `1px solid ${ms.color}25` }}>
                                    <span style={{ fontSize: "1.4rem" }}>{m.emoji}</span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{m.name}</div>
                                      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{m.age ? `${m.age} Jahre · ` : ""}{ms.note}</div>
                                    </div>
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                      <span style={{ fontSize: "1.2rem" }}>{ms.emoji}</span>
                                      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: ms.color, marginTop: 1 }}>{ms.label}</div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : premiumGateBlock}
                        </div>
                      )}
                    </div>
                  )
                })()}


              </div>
              )
            })()}

            {/* ── TRUE EMPFOHLEN — Partner Alternativen ─────────────────── */}
            {(partnerAltsLoading || partnerAlts.length > 0) && (
              <div style={{ background: "var(--surface)", border: "1px solid rgba(46,204,138,0.22)", borderRadius: "16px", overflow: "hidden", marginTop: "0.5rem" }}>
                <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1rem" }}>💚</span>
                  <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)", flex: 1 }}>TRUE Empfohlen</span>
                  <span style={{ fontSize: "0.58rem", color: "var(--text-dim)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "5px", padding: "1px 6px" }}>Gesponsert</span>
                </div>
                {partnerAltsLoading ? (
                  <div style={{ padding: "1rem 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {[1,2].map(i => <div key={i} style={{ height: 60, borderRadius: 10, background: "var(--surface-2)", opacity: 0.4 }} />)}
                  </div>
                ) : (
                  <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {partnerAlts.map(alt => (
                      <div key={alt.id} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(46,204,138,0.04)", border: "1px solid rgba(46,204,138,0.12)", borderRadius: "12px", padding: "10px 12px" }}>
                        {alt.image_url && (
                          <img src={alt.image_url} alt={alt.name}
                            style={{ width: 44, height: 44, borderRadius: 9, objectFit: "cover", flexShrink: 0, border: "1px solid rgba(46,204,138,0.2)" }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alt.name}</div>
                          {alt.price_hint && <div style={{ fontSize: "0.68rem", color: "var(--accent)", fontWeight: 600, marginTop: "1px" }}>{alt.price_hint}</div>}
                          {alt.description && <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alt.description}</div>}
                        </div>
                        {alt.shop_url && (
                          <a href={alt.shop_url} target="_blank" rel="noopener noreferrer"
                            onClick={() => {
                              fetch("/api/partner/track", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ productId: alt.id, partnerId: alt.partner_id, eventType: "click" }),
                              }).catch(() => {})
                            }}
                            style={{ background: "var(--accent)", color: "#000", borderRadius: "9px", padding: "6px 12px", fontSize: "0.7rem", fontWeight: 800, textDecoration: "none", flexShrink: 0, display: "inline-block", whiteSpace: "nowrap" }}>
                            Im Shop →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button onClick={reset} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.85rem 1.1rem", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", color: "var(--text)" }}>
                ← Zurück
              </button>
              <button onClick={() => { reset(); setTimeout(() => startCamera(), 80) }} style={{ flex: 1, background: "var(--accent)", color: "#000", border: "none", borderRadius: "12px", padding: "0.85rem", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
                📷 Nochmal scannen
              </button>
            </div>
          </div>
        )}

        {cameraError && (
          <div style={{ background: "rgba(255,68,85,0.1)", border: "1px solid #ff4455", borderRadius: "12px", padding: "1rem", marginTop: "1rem" }}>
            <p style={{ color: "#ff4455", fontWeight: 700, marginBottom: "0.4rem" }}>📷 Kamera nicht verfügbar</p>
            <p style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>Nutze die Texteingabe — oder öffne die App im Browser auf dem Handy für Kamerazugriff.</p>
            <button onClick={() => setMode("manual")} style={{ marginTop: "0.75rem", background: "var(--accent)", color: "#000", border: "none", borderRadius: "10px", padding: "0.65rem 1.25rem", fontWeight: 700, cursor: "pointer" }}>
              ✏️ Name eingeben
            </button>
          </div>
        )}

        {/* ── Scan-Verlauf ───────────────────────────────────────────────── */}
        {mode === "idle" && history.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-dim)" }}>🕑 Zuletzt gescannt</h2>
              <button onClick={() => { setHistory([]); saveHistory([]) }} style={{ background: "transparent", border: "none", color: "var(--text-dim)", fontSize: "0.75rem", cursor: "pointer" }}>Alle löschen</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {history.map(h => {
                const damageCats = (h.result?.categories ?? []).filter(c =>
                  !c.id.startsWith("nova-") && !c.id.startsWith("ecoscore-")
                ).slice(0, 3)
                const sev = h.severity
                const chipColor = sev === "critical" ? "#ff2233" : sev === "high" ? "#ff7700" : sev === "medium" ? "#cc9900" : "#2ECC8A"
                return (
                  <div key={h.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", cursor: "pointer" }}
                    onClick={() => showHistoryResult(h)}>
                    <div style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>
                        {!h.found ? "✅" : h.grade ? (h.grade === "A" || h.grade === "B" ? "✅" : h.grade === "C" ? "🔶" : "⚠️") : "🔍"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {h.corpName || h.query}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.1rem" }}>{relTime(h.timestamp)}</div>
                      </div>
                      {(h.grade || h.severity) && (
                        <span style={{ background: (h.grade ? GRADE_COLOR[h.grade] : SEV_COLOR[h.severity!] ?? "#888") + "18", color: h.grade ? GRADE_COLOR[h.grade] : SEV_COLOR[h.severity!] ?? "#888", borderRadius: "6px", padding: "0.15rem 0.5rem", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 }}>
                          {h.grade ? GRADE_LABEL[h.grade] : SEV_LABEL[h.severity!] ?? ""}
                        </span>
                      )}
                      <button onClick={e => { e.stopPropagation(); deleteHistory(h.id) }} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1rem", padding: "0 0.2rem", flexShrink: 0 }}>×</button>
                    </div>
                    {damageCats.length > 0 && (
                      <div style={{ padding: "0 1rem 0.65rem", display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {damageCats.map(cat => (
                          <span key={cat.id} style={{ background: chipColor + "15", border: `1px solid ${chipColor}33`, borderRadius: 99, padding: "3px 9px", fontSize: "0.63rem", fontWeight: 700, color: chipColor, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {cat.icon} {cat.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
      <FloatingAssistant page="scan" tips={[
        { icon: "📷", text: "Halte den Barcode ruhig in den Rahmen — alle Winkel funktionieren." },
        { icon: "✏️", text: "Kein Barcode? Tippe einfach den Produktnamen ein — TRUE kennt über 100 Marken." },
        { icon: "🎯", text: "Lege im Profil Ziele fest (z.B. palmölfrei) — der Scanner bewertet dann gezielt danach." },
      ]} />
      <BottomNav />
      {showPremiumGate && <PremiumGate trigger="scan" onClose={() => setShowPremiumGate(false)} />}
    </div>
  )
}
