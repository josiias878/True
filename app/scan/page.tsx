"use client"
import AuthGuard from "@/components/AuthGuard"
import React, { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { ThemeToggle } from "@/components/ThemeProvider"
import BottomNav from "@/components/BottomNav"
import { incrementScan, incrementAvoided } from "@/components/Rings"
import { useScanLimit } from "@/lib/useScanLimit"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"
import { supabase } from "@/lib/supabase"
import PremiumGate from "@/components/PremiumGate"
import ProductScore from "@/components/ProductScore"
import { calcScoreFromSeverity } from "@/lib/productScore"
// ZXing is lazy-loaded inside startCamera() — never runs during SSR/build
let BrowserMultiFormatReader: any = null

interface ScanResult {
  found: boolean; query?: string
  corporation?: { name: string; severity: string; aliases: string[] }
  categories?: { id: string; name: string; icon: string; description: string }[]
  evidence?: { id: string; title: string; source: string; date: string; level: string; status?: string }[]
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

const HISTORY_KEY = "true-scan-history"
const SEV_COLOR: Record<string,string> = { critical:"#ff2233", high:"#ff7700", medium:"#ffcc00", low:"#2ECC8A" }
const SEV_LABEL: Record<string,string> = { critical:"KRITISCH", high:"HOCH", medium:"MITTEL", low:"GERING" }
const GRADE_COLOR: Record<string,string> = { A:"#2ECC8A", B:"#88cc44", C:"#ffcc00", D:"#ff7700", F:"#ff2233" }
const GRADE_LABEL: Record<string,string> = { A:"GUT", B:"OKAY", C:"BEDINGT", D:"KRITISCH", F:"GEFÄHRLICH" }

// ── Goal-spezifischer Kontext im Scan-Ergebnis ────────────────────────────
const GOAL_META: Record<string, { icon: string; label: string; color: string }> = {
  env:    { icon: "🌱", label: "Umwelt schützen",  color: "#2ECC8A" },
  health: { icon: "💪", label: "Gesünder leben",   color: "#ff7700" },
  family: { icon: "👨‍👩‍👧", label: "Familie schützen", color: "#ffaa00" },
  truth:  { icon: "🔍", label: "Wahrheit kennen",  color: "#44aaff" },
  action: { icon: "✊", label: "Etwas bewegen",    color: "#cc66ff" },
  budget: { icon: "💸", label: "Clever sparen",    color: "#ffcc00" },
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

// ── Better alternatives (Premium) ──────────────────────────────────────────
type Alt = { name: string; brand: string; reason: string; price: string; link: string }
const ALTERNATIVES: Record<string, Alt[]> = {
  nestle:     [{ name: "Nocciolata Bio", brand: "Rigoni di Asiago", reason: "Ohne Palmöl, fair produziert", price: "~4,50€", link: "https://www.rewe.de/suche/?search=nocciolata" },
               { name: "Zotter Schokolade", brand: "Zotter", reason: "Fairtrade, Bio, familiengeführt", price: "~3,80€", link: "https://www.zotter.at/shop" }],
  unilever:   [{ name: "Frosch Spülmittel", brand: "Werner & Mertz", reason: "Ohne Mikroplastik, biologisch abbaubar", price: "~2,20€", link: "https://www.frosch.de/produkte/geschirrspuelen/" },
               { name: "Sonett Waschmittel", brand: "Sonett", reason: "100% biologisch abbaubar", price: "~8,90€", link: "https://www.sonett.eu/produkte/waschmittel/" }],
  cocacola:   [{ name: "Bionade", brand: "Bionade GmbH", reason: "Organisch gebraut, keine Konzernzugehörigkeit", price: "~1,20€", link: "https://www.bionade.de/produkte/" },
               { name: "Voelkel Direktsaft", brand: "Voelkel", reason: "Bio, familiengeführt seit 1936", price: "~2,50€", link: "https://www.voelkeljuice.de/produkte/" }],
  pepsi:      [{ name: "Fritz Kola", brand: "fritz-kola", reason: "Unabhängig, nachhaltigere Produktion", price: "~1,50€", link: "https://www.fritz-kola.de/produkte/" },
               { name: "Bionade", brand: "Bionade GmbH", reason: "Organisch gebraut, fair", price: "~1,20€", link: "https://www.bionade.de/produkte/" }],
  procter:    [{ name: "Alverde Naturkosmetik", brand: "dm Alverde", reason: "Naturkosmetik, kein Mikroplastik", price: "~2,95€", link: "https://www.dm.de/marken/alverde-naturkosmetik/" }],
  pg:         [{ name: "Alverde Naturkosmetik", brand: "dm Alverde", reason: "Naturkosmetik, kein Mikroplastik", price: "~2,95€", link: "https://www.dm.de/marken/alverde-naturkosmetik/" }],
  kraft:      [{ name: "Alnatura Produkte", brand: "Alnatura", reason: "Bio, fair, ohne Zusatzstoffe", price: "ab 1,99€", link: "https://www.alnatura.de/de-de/produkte/" }],
  mondelez:   [{ name: "Zotter Schokolade", brand: "Zotter", reason: "Fairtrade, Bio, ohne Palmöl", price: "~3,80€", link: "https://www.zotter.at/shop" },
               { name: "Vivani Bio-Schokolade", brand: "Vivani", reason: "Bio-Kakao, Fairtrade", price: "~2,50€", link: "https://www.rewe.de/suche/?search=vivani" }],
  mars:       [{ name: "Vivani Schokolade", brand: "Vivani", reason: "Bio-Kakao, fairer Handel", price: "~2,50€", link: "https://www.rewe.de/suche/?search=vivani+schokolade" }],
  ferrero:    [{ name: "Nocciolata Bio", brand: "Rigoni di Asiago", reason: "Ohne Palmöl, Bio-zertifiziert", price: "~4,50€", link: "https://www.rewe.de/suche/?search=nocciolata" }],
  danone:     [{ name: "Andechser Bio-Joghurt", brand: "Andechser Natur", reason: "Bio, bayerische Molkerei", price: "~0,99€", link: "https://www.andechser-natur.de/produkte/" },
               { name: "Alnatura Bio-Joghurt", brand: "Alnatura", reason: "Bio, fair, regional", price: "~0,89€", link: "https://www.alnatura.de/de-de/produkte/milchprodukte/" }],
  henkel:     [{ name: "Ecover Waschmittel", brand: "Ecover", reason: "Pflanzliche Inhaltsstoffe, biologisch abbaubar", price: "~7,50€", link: "https://www.ecover.com/de/produkte/" },
               { name: "Frosch Waschmittel", brand: "Werner & Mertz", reason: "Biologisch abbaubar, ohne Mikroplastik", price: "~5,50€", link: "https://www.frosch.de/produkte/waschmittel/" }],
  bayer:      [{ name: "Naturheilmittel", brand: "Alnatura / Weleda", reason: "Pflanzliche Alternativen wo möglich", price: "variiert", link: "https://www.weleda.de/produkte" }],
  "noe-quelle": [{ name: "BRITA Wasserfilter", brand: "BRITA", reason: "Kein Plastikmüll, günstigste Dauerlösung", price: "~30€ einmalig", link: "https://www.brita.de/wasserfilter/" },
                  { name: "Regionales Mineralwasser", brand: "Lokale Quelle", reason: "Kürzere Transportwege, weniger CO₂", price: "~0,30€", link: "https://www.rewe.de/suche/?search=mineralwasser+regional" }],
  "noe":      [{ name: "BRITA Wasserfilter", brand: "BRITA", reason: "Kein Plastikmüll, günstigste Dauerlösung", price: "~30€ einmalig", link: "https://www.brita.de/wasserfilter/" }],
}

function getAlternatives(corpName: string): Alt[] {
  const key = corpName.toLowerCase()
  for (const [k, v] of Object.entries(ALTERNATIVES)) {
    if (key.includes(k)) return v
  }
  // Dynamic fallback: Google-Suche nach fairer Alternative
  const encoded = encodeURIComponent(`faire Alternative zu ${corpName}`)
  return [{ name: `Faire Alternative zu ${corpName}`, brand: "Suche starten", reason: "Unabhängige Produkte ohne Konzernbindung", price: "variiert", link: `https://www.google.de/search?q=${encoded}` }]
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
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [meidliste, setMeidliste]       = useState<string[]>([])
  const [facingMode, setFacingMode]     = useState<"environment"|"user">("environment")
  const [ingredientData, setIngredientData] = useState<{
    found: boolean; productName?: string; nutriScore?: string | null
    flags?: { icon: string; label: string; detail: string; severity: "red"|"yellow"|"green" }[]
    clean?: boolean
  } | null>(null)
  const [ingredientLoading, setIngredientLoading] = useState(false)
  const [lookupError, setLookupError] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("true-profile")
      if (raw) {
        const p = JSON.parse(raw)
        if (Array.isArray(p.goals) && p.goals.length > 0) setUserGoals(p.goals)
      }
    } catch {}
    try {
      const fm = localStorage.getItem("true-family-members")
      if (fm) setFamilyMembers(JSON.parse(fm))
    } catch {}
    try {
      const ml = localStorage.getItem("true-meidliste")
      if (ml) setMeidliste(JSON.parse(ml))
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
    let dir = 1, pos = 0
    const id = setInterval(() => {
      pos += dir * 2
      if (pos >= 100) dir = -1
      if (pos <= 0) dir = 1
      setScanLine(pos)
    }, 16)
    return () => clearInterval(id)
  }, [mode])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    try { readerRef.current?.reset() } catch {}
    readerRef.current = null
  }, [])

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
          facingMode: { exact: "environment" },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, min: 15 },
        }
      }).catch(() => navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        }
      }))

      // Continuous autofocus + torch (Taschenlampe) wenn verfügbar
      const track = stream.getVideoTracks()[0]
      if (track?.applyConstraints) {
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" } as any]
          })
        } catch {}
      }

      streamRef.current = stream

      const hints = new Map()
      const { BarcodeFormat } = await import("@zxing/library")
      hints.set(2, [ // DecodeHintType.POSSIBLE_FORMATS
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        BarcodeFormat.DATA_MATRIX,
      ])

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
  }, [stopCamera])

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
    setAddedToList(false)
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
      // Sofort nach Supabase pushen damit History auf allen Geräten aktuell ist
      supabase?.from("user_profiles").upsert({
        id: user.id,
        scan_history: next.slice(0, 50).map(h => ({
          id: h.id, query: h.query, timestamp: h.timestamp,
          found: h.found, corpName: h.corpName, severity: h.severity,
          grade: h.grade, score: h.score,
        })),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id", ignoreDuplicates: false }).then(() => {})
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
        emoji: "🔍",
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
    <AuthGuard>
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

            {/* Ziel-Block entfernt — Ziele werden beim Onboarding / Profil gesetzt */}

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
                      {isLimitHit ? "Morgen wieder verfügbar — oder jetzt upgraden" : "Kostenlos · Setzt täglich um Mitternacht zurück"}
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
            <div style={{ position: "absolute", bottom: "1rem", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
              <button onClick={reset} style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: "8px", padding: "0.5rem 1.2rem", cursor: "pointer", fontSize: "0.85rem" }}>Abbrechen</button>
            </div>
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

            {/* ── YUKA-STIL HAUPTKARTE ── */}
            <div style={{ background: "var(--surface)", borderRadius: 24, border: `2px solid ${rec.color}44`, overflow: "hidden" }}>

              {/* Farbstreifen oben */}
              <div style={{ height: 5, background: `linear-gradient(90deg, ${rec.color}, ${rec.color}55)` }} />

              {/* Hauptinhalt: VertikalScore links + Content rechts */}
              <div style={{ padding: "20px 18px 16px", display: "flex", gap: 16, alignItems: "flex-start" }}>

                {/* Linke Seite: Vertikale Score-Skala */}
                {konzernScore
                  ? <VertikalScore score={konzernScore.score} />
                  : <div style={{ width: 48 }} />
                }

                {/* Rechte Seite: Urteil + Name + Punkte */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>

                  {/* Urteil-Badge */}
                  <div style={{ background: rec.color + "18", border: `1.5px solid ${rec.color}55`, borderRadius: 99, padding: "5px 14px", alignSelf: "flex-start" }}>
                    <span style={{ fontWeight: 900, fontSize: "0.92rem", color: rec.color }}>{rec.emoji} {rec.verdict}</span>
                  </div>

                  {/* Konzern / Produktname */}
                  {result.corporation && (
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", lineHeight: 1.2 }}>{result.corporation.name}</div>
                      {result.corporation.aliases.length > 0 && (
                        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 3 }}>
                          {result.corporation.aliases.slice(0, 3).join(" · ")}
                        </div>
                      )}
                    </div>
                  )}
                  {!result.found && (
                    <div style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>Produkt nicht gefunden</div>
                  )}

                  {/* Bullet Points — kostenlos direkt sichtbar */}
                  {result.found && result.corporation && konzernScore && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {getVerdictPoints(result).map((point, i) => {
                        const isGood = konzernScore.score >= 65
                        const dotColor = isGood ? "#2ECC8A" : rec.color
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: dotColor, fontSize: "0.5rem", marginTop: 5, flexShrink: 0 }}>●</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text)", lineHeight: 1.45, fontWeight: 500 }}>{point}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                </div>
              </div>

              {/* Dummy-Wrapper für Meidliste — außerhalb der Zeile */}
              <div style={{ padding: "0 18px 8px" }}>
                {/* Meidliste-Warnung inline */}
                {(() => {
                  if (!result.corporation || meidliste.length === 0) return null
                  const corp = result.corporation.name.toLowerCase()
                  const matched = meidliste.find(m => corp.includes(m.toLowerCase()) || m.toLowerCase().includes(corp))
                  if (!matched) return null
                  return (
                    <div style={{ width: "100%", background: "rgba(255,68,85,0.12)", border: "1.5px solid rgba(255,68,85,0.4)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>🚫</span>
                      <div style={{ fontSize: "0.78rem", color: "#ff4455", fontWeight: 700 }}>Auf deiner Meide-Liste: <span style={{ color: "var(--text)" }}>{matched}</span></div>
                    </div>
                  )
                })()}
              </div>

              {/* Aktions-Buttons */}
              <div style={{ padding: "0 16px 20px", display: "flex", gap: 10 }}>
                <button onClick={addToShoppingList} disabled={addedToList}
                  style={{ flex: 1, background: addedToList ? "rgba(46,204,138,0.12)" : "var(--accent)", color: addedToList ? "var(--accent)" : "#000", border: `1px solid ${addedToList ? "rgba(46,204,138,0.4)" : "var(--accent)"}`, borderRadius: 12, padding: "11px 0", fontWeight: 700, cursor: addedToList ? "default" : "pointer", fontSize: "0.85rem" }}>
                  {addedToList ? "✓ In Liste" : "🛒 Zur Liste"}
                </button>
                {result.found && (
                  <button onClick={() => { setShowDetails(v => !v); setExpandedDetail(null); setExpandedCat(null) }}
                    style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 0", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    {showDetails ? "↑ Weniger" : "Details ↓"}
                  </button>
                )}
              </div>
            </div>

            {/* ── INHALTSSTOFFE KARTE (immer sichtbar, unabhängig von TRUE-DB) ── */}
            {(() => {
              const NUTRI_COLOR: Record<string,string> = { A:"#2ECC8A", B:"#88cc44", C:"#ffcc00", D:"#ff7700", E:"#ff2233" }
              const hasFlags = (ingredientData?.flags?.length ?? 0) > 0
              const showContent = isPremium
              return (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 12px" }}>
                    <span style={{ fontSize: "1.1rem" }}>🧪</span>
                    <span style={{ flex: 1, fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>Inhaltsstoffe</span>
                    {!isPremium && <span style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", borderRadius: 6, padding: "1px 7px", fontSize: "0.58rem", fontWeight: 800 }}>👑 Premium</span>}
                    {ingredientData?.nutriScore && isPremium && (
                      <span style={{ background: NUTRI_COLOR[ingredientData.nutriScore] ?? "var(--surface-2)", color: "#000", fontWeight: 900, fontSize: "0.78rem", borderRadius: 7, padding: "2px 9px" }}>
                        {ingredientData.nutriScore}
                      </span>
                    )}
                  </div>
                  {/* Body */}
                  <div style={{ padding: "0 14px 14px", position: "relative" }}>
                    {showContent ? (
                      ingredientLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {[1,2].map(i => <div key={i} style={{ height: 38, borderRadius: 10, background: "var(--surface-2)", opacity: 0.55, animation: "pulse 1.4s ease-in-out infinite" }} />)}
                        </div>
                      ) : !ingredientData?.found ? (
                        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: "1.2rem" }}>🔍</span>
                            <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--text)" }}>Keine Nährwertdaten gefunden</span>
                          </div>
                          <div style={{ fontSize: "0.77rem", color: "var(--text-dim)", lineHeight: 1.55, marginBottom: 10 }}>
                            Für dieses Produkt liegen in Open Food Facts noch keine Inhaltsstoffe vor. Du kannst helfen, die Datenbank zu verbessern!
                          </div>
                          <a href={`https://www.openfoodfacts.org/product/add`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: 10, padding: "7px 14px", fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
                            📝 Produkt eintragen →
                          </a>
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
                {premiumCats.length > 0 && (() => {
                  const open = expandedDetail === "hintergruende"
                  return (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                      <button onClick={() => { setExpandedDetail(open ? null : "hintergruende"); setExpandedCat(null) }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: "1.1rem" }}>💡</span>
                        <span style={{ flex: 1, fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>Hintergründe</span>
                        {!isPremium && <span style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", borderRadius: 6, padding: "1px 6px", fontSize: "0.58rem", fontWeight: 800 }}>👑</span>}
                        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
                      </button>
                      {open && (
                        <div style={{ borderTop: "1px solid var(--border)" }}>
                          {isPremium ? premiumCats.map(c => {
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
                          }) : premiumGateBlock}
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
                      <button onClick={() => { setExpandedDetail(open ? null : "alternativen"); setExpandedCat(null) }}
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

                {/* ── ERNÄHRUNGSCOACH ── */}
                {(() => {
                  const open = expandedDetail === "coach"
                  // Ingredient-aware coach hints
                  const iFlags = ingredientData?.flags ?? []
                  const hasSugar  = iFlags.some(f => f.label.toLowerCase().includes("zucker"))
                  const hasPalm   = iFlags.some(f => f.label.toLowerCase().includes("palm"))
                  const hasAdditives = iFlags.some(f => f.icon === "🔬")
                  const nutriScore = ingredientData?.nutriScore
                  const NUTRI_TIPS: Record<string,string> = {
                    A: "Nutri-Score A — sehr gute Nährwertbilanz für dieses Produkt.",
                    B: "Nutri-Score B — gute Nährwerte, kann regelmäßig konsumiert werden.",
                    C: "Nutri-Score C — mittelmäßige Nährwertbilanz, in Maßen okay.",
                    D: "Nutri-Score D — ungünstige Nährwerte, selten konsumieren.",
                    E: "Nutri-Score E — sehr ungünstige Nährwertbilanz, besser meiden.",
                  }
                  const GOAL_INGR_TIPS: Record<string, string> = {
                    health: hasSugar && hasPalm
                      ? "Enthält sowohl viel Zucker als auch Palmöl — für dein Gesundheitsziel klar eine schlechtere Wahl."
                      : hasSugar
                      ? "Der Zuckergehalt ist hoch. Für dein Gesundheitsziel: max. 1× pro Woche und auf Zuckerzusatz in anderen Mahlzeiten achten."
                      : hasPalm
                      ? "Palmöl erhöht den LDL-Cholesterinspiegel. Für gesündere Alternativen achte auf Produkte mit Raps- oder Olivenöl."
                      : hasAdditives
                      ? "Enthält Zusatzstoffe, die bei empfindlichen Personen Reaktionen auslösen können. Im Alltag besser minimieren."
                      : konzernScore.score >= 72
                      ? "Aus Gesundheitssicht eine solide Wahl — achte trotzdem auf Portionsgröße und ausgewogene Mahlzeiten."
                      : "Für dein Gesundheitsziel gibt es bessere Alternativen mit kürzerer Zutatenliste.",
                    env:    "Wähle ergänzend regionale und saisonale Produkte — das spart CO₂ und unterstützt lokale Bauern.",
                    family: hasSugar
                      ? "Für Kinder gilt: max. 25 g freier Zucker pro Tag (WHO). Dieses Produkt kann schnell einen Großteil davon ausmachen."
                      : hasAdditives
                      ? "Kinder reagieren empfindlicher auf Farbstoffe und Konservierungsstoffe — lieber auf Produkte ohne E-Nummern achten."
                      : "Für Familien vertretbar — ergänze mit frischem Gemüse und Vollkornprodukten für eine ausgewogene Ernährung.",
                    budget: "Faire und gesündere Alternativen sind oft günstiger als Markenprodukte. Eigenmarken von Bio-Supermärkten sind einen Vergleich wert.",
                    truth:  "Als kritischer Verbraucher: Lies die Zutatenliste — je kürzer, desto transparenter das Produkt.",
                    action: "Mit bewusstem Einkauf gibst du ein klares Signal. Produkte mit kürzerer Zutatenliste und weniger Verpackung bevorzugen.",
                  }
                  return (
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                      <button onClick={() => { setExpandedDetail(open ? null : "coach"); setExpandedCat(null) }}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: "1.1rem" }}>🥗</span>
                        <span style={{ flex: 1, fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>Ernährungscoach</span>
                        {!isPremium && <span style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", borderRadius: 6, padding: "1px 6px", fontSize: "0.58rem", fontWeight: 800 }}>👑</span>}
                        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
                      </button>
                      {open && (
                        <div style={{ borderTop: "1px solid var(--border)" }}>
                          {isPremium ? (
                            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

                              {/* Nutri-Score Einordnung */}
                              {nutriScore && NUTRI_TIPS[nutriScore] && (
                                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                  <span style={{ fontSize: "1.2rem", flexShrink: 0, marginTop: 1 }}>📊</span>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: 2 }}>Nährwertbilanz</div>
                                    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.55 }}>{NUTRI_TIPS[nutriScore]}</div>
                                  </div>
                                </div>
                              )}

                              {/* Häufigkeitsempfehlung */}
                              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <span style={{ fontSize: "1.2rem", flexShrink: 0, marginTop: 1 }}>{freqIcon}</span>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: 2 }}>{freqLabel}</div>
                                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.55 }}>{freqTip}</div>
                                </div>
                              </div>

                              {/* Ziel-spezifischer Inhaltsstoff-Tipp */}
                              {userGoals[0] && !(productType === "water" && konzernScore.score >= 65) && (() => {
                                const ingrTip = GOAL_INGR_TIPS[userGoals[0]]
                                const gm = GOAL_META[userGoals[0]]
                                if (!ingrTip) return null
                                return (
                                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--surface-2)", borderRadius: 12, padding: "10px 12px" }}>
                                    <span style={{ fontSize: "1.2rem", flexShrink: 0, marginTop: 1 }}>{gm?.icon ?? "🎯"}</span>
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: 2, color: gm?.color ?? "var(--accent)" }}>Für dein Ziel: {gm?.label}</div>
                                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.55 }}>{ingrTip}</div>
                                    </div>
                                  </div>
                                )
                              })()}

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
                      <button onClick={() => { setExpandedDetail(open ? null : "familie"); setExpandedCat(null) }}
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

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button onClick={() => { reset(); setTimeout(() => startCamera(), 80) }} style={{ flex: 1, background: "var(--accent)", color: "#000", border: "none", borderRadius: "12px", padding: "0.85rem", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
                📷 Nochmal scannen
              </button>
              <Link href="/list" style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.85rem", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", color: "var(--text)", textDecoration: "none", textAlign: "center" }}>
                Zur Liste →
              </Link>
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
              {history.map(h => (
                <div key={h.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}
                  onClick={() => showHistoryResult(h)}>
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
              ))}
            </div>
          </div>
        )}

      </div>
      <BottomNav />
      {showPremiumGate && <PremiumGate trigger="scan" onClose={() => setShowPremiumGate(false)} />}
    </div>
    </AuthGuard>
  )
}
