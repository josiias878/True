"use client"
import React, { useEffect, useState } from "react"
import BottomNav from "@/components/BottomNav"
import Link from "next/link"
import type { CoachItem } from "@/components/NutritionCoach"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"
import AuthModal from "@/components/AuthModal"

// ── Coach-Setup Wizard ─────────────────────────────────────────────────────────

const ONBOARDING_GOALS = [
  { id: "abnehmen",     emoji: "🔥", label: "Abnehmen",       desc: "Kalorienreduziert & sättigend" },
  { id: "muskelaufbau", emoji: "💪", label: "Muskelaufbau",   desc: "Proteinreich, mit Timing" },
  { id: "vegan",        emoji: "🌱", label: "Vegan",          desc: "Pflanzlich & vollständig" },
  { id: "gesund",       emoji: "❤️", label: "Gesund essen",   desc: "Nährstoffreich & ausgewogen" },
  { id: "kind",         emoji: "👶", label: "Familie",        desc: "Kindgerecht & sicher" },
  { id: "budget",       emoji: "💰", label: "Günstig",        desc: "Faire Qualität, kleiner Preis" },
]

const ONBOARDING_ALLERGIES = [
  { id: "gluten",   emoji: "🌾", label: "Gluten" },
  { id: "laktose",  emoji: "🥛", label: "Laktose" },
  { id: "nüsse",    emoji: "🥜", label: "Nüsse" },
  { id: "ei",       emoji: "🥚", label: "Ei" },
  { id: "soja",     emoji: "🫘", label: "Soja" },
  { id: "fisch",    emoji: "🐟", label: "Fisch" },
  { id: "veganer",  emoji: "🌿", label: "Vegan" },
  { id: "vegetarisch", emoji: "🥗", label: "Vegetarisch" },
]

const ONBOARDING_VALUES = [
  { id: "gesundheit", emoji: "🏥", label: "Gesundheit",     desc: "Kritische Inhaltsstoffe erkennen" },
  { id: "umwelt",     emoji: "🌍", label: "Umwelt",         desc: "Palmöl, Plastik, CO₂ im Blick" },
  { id: "preis",      emoji: "💡", label: "Preis-Leistung", desc: "Faire Alternativen finden" },
]

interface CoachSetup {
  goals: string[]
  allergies: string[]
  values: string[]
}

function CoachOnboarding({ onDone }: { onDone: (setup: CoachSetup) => void }) {
  const [step, setStep] = useState(0) // 0=goals, 1=allergies, 2=values
  const [goals, setGoals] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [values, setValues] = useState<string[]>([])

  const totalSteps = 3

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  function next() {
    if (step === 2) {
      const setup: CoachSetup = { goals, allergies, values }
      localStorage.setItem("true-coach-setup", JSON.stringify(setup))
      onDone(setup)
    } else {
      setStep(s => s + 1)
    }
  }

  const STEPS = ["Mein Ziel", "Unverträglichkeiten", "Meine Werte"]
  const canNext = step === 1 || (step === 0 && goals.length > 0) || (step === 2 && values.length > 0)

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
      {/* Progress */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "var(--accent)" : "var(--border)", transition: "background 0.3s" }} />
          ))}
        </div>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: 4 }}>
          Schritt {step + 1} von {totalSteps}
        </div>
      </div>

      <div style={{ flex: 1, padding: "0 20px 20px", maxWidth: 520, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column" }}>

        {/* Step 0: Goals */}
        {step === 0 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
                Was ist dein Ziel? 🎯
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
                Dein Coach passt sich komplett auf dich an. Wähle 1–3 Ziele.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1 }}>
              {ONBOARDING_GOALS.map(g => {
                const sel = goals.includes(g.id)
                return (
                  <button key={g.id} onClick={() => setGoals(prev => toggle(prev, g.id))}
                    style={{ background: sel ? "rgba(46,204,138,0.15)" : "var(--surface)", border: `2px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 16, padding: "18px 14px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, textAlign: "left", transition: "all 0.15s" }}>
                    <span style={{ fontSize: "1.8rem" }}>{g.emoji}</span>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: sel ? "var(--accent)" : "var(--text)" }}>{g.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", lineHeight: 1.4 }}>{g.desc}</div>
                    {sel && <div style={{ alignSelf: "flex-end", width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "#000", fontWeight: 900 }}>✓</div>}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Step 1: Allergies */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
                Unverträglichkeiten? 🚫
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
                Wähle was zutrifft — oder überspringe diesen Schritt.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {ONBOARDING_ALLERGIES.map(a => {
                const sel = allergies.includes(a.id)
                return (
                  <button key={a.id} onClick={() => setAllergies(prev => toggle(prev, a.id))}
                    style={{ background: sel ? "rgba(255,68,85,0.12)" : "var(--surface)", border: `2px solid ${sel ? "#ff4455" : "var(--border)"}`, borderRadius: 14, padding: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", transition: "all 0.15s" }}>
                    <span style={{ fontSize: "1.4rem" }}>{a.emoji}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: sel ? "#ff4455" : "var(--text)", flex: 1 }}>{a.label}</span>
                    {sel && <span style={{ fontSize: "0.8rem", color: "#ff4455" }}>✕</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Step 2: Values */}
        {step === 2 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.03em", margin: "0 0 8px" }}>
                Was liegt dir am Herzen? 💚
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", margin: 0, lineHeight: 1.6 }}>
                Dein Coach zeigt dir genau das, was für dich relevant ist.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ONBOARDING_VALUES.map(v => {
                const sel = values.includes(v.id)
                return (
                  <button key={v.id} onClick={() => setValues(prev => toggle(prev, v.id))}
                    style={{ background: sel ? "rgba(46,204,138,0.12)" : "var(--surface)", border: `2px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 16, padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left", transition: "all 0.15s" }}>
                    <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{v.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.9rem", color: sel ? "var(--accent)" : "var(--text)", marginBottom: 2 }}>{v.label}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{v.desc}</div>
                    </div>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: sel ? "var(--accent)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: sel ? "#000" : "transparent", fontWeight: 900, flexShrink: 0, transition: "all 0.15s" }}>✓</div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Nav Buttons */}
        <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ flex: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 20px", fontWeight: 700, fontSize: "0.88rem", color: "var(--text-dim)", cursor: "pointer" }}>
              ← Zurück
            </button>
          )}
          {step === 1 && (
            <button onClick={() => setStep(2)}
              style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-dim)", cursor: "pointer" }}>
              Überspringen
            </button>
          )}
          <button onClick={next} disabled={!canNext}
            style={{ flex: 1, background: canNext ? "var(--accent)" : "var(--border)", color: canNext ? "#000" : "var(--text-dim)", border: "none", borderRadius: 14, padding: "14px", fontWeight: 800, fontSize: "0.95rem", cursor: canNext ? "pointer" : "default", transition: "all 0.15s" }}>
            {step === totalSteps - 1 ? "🚀 Coach starten" : "Weiter →"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Inhaltsstoff-Karten (einfach, visuell) ────────────────────────────────────
const INGREDIENT_CARDS: {
  id: string; emoji: string; color: string; label: string
  simple: string // wie für ein Kind erklärt
  keywords: string[] // welche Produktnamen matchen
  detail: string // 1-2 Sätze mehr Info
}[] = [
  {
    id: "palmoel", emoji: "🌴", color: "#ff6633", label: "Palmöl",
    simple: "Macht dein Herz krank und schadet dem Regenwald.",
    keywords: ["nutella", "kitkat", "milka", "oreo", "hanuta", "duplo", "bounty", "snickers", "balisto"],
    detail: "Palmöl verstopft auf Dauer die Adern. Für jede Tonne werden Regenwälder abgeholzt — Heimat von Orang-Utans und Tiger.",
  },
  {
    id: "zucker", emoji: "🍬", color: "#ffaa00", label: "Zucker (zu viel)",
    simple: "Lässt dich schneller wieder Hunger bekommen und macht Zähne kaputt.",
    keywords: ["cola", "fanta", "sprite", "limonade", "saft", "kekse", "müsli", "cornflakes", "riegel", "joghurt"],
    detail: "Zu viel Zucker führt dazu, dass dein Körper immer mehr davon will. Mit der Zeit kann er Diabetes auslösen.",
  },
  {
    id: "zusatzstoffe", emoji: "🔬", color: "#ff8833", label: "Zusatzstoffe",
    simple: "Kleine Chemikalien, die Essen länger haltbar machen — aber deinen Darm stören.",
    keywords: ["wurst", "aufschnitt", "fertigpizza", "chips", "pringles", "dosen"],
    detail: "E-Nummern wie E211 oder E102 stehen im Verdacht, bei Kindern Unruhe auszulösen und Darmbakterien zu schädigen.",
  },
  {
    id: "glyphosat", emoji: "☠️", color: "#cc66ff", label: "Glyphosat",
    simple: "Ein Pestizid im Getreide, das möglicherweise Krebs auslösen kann.",
    keywords: ["weizenbrot", "weizen", "brötchen", "mehl", "hafer", "haferflocken"],
    detail: "Die WHO stuft Glyphosat als 'wahrscheinlich krebserregend' ein. Es steckt in vielen Getreideprodukten aus konventionellem Anbau.",
  },
  {
    id: "transfette", emoji: "🧈", color: "#ffcc00", label: "Transfette",
    simple: "Versteckte schlechte Fette, die Adern zukleben.",
    keywords: ["margarine", "blätterteig", "croissant", "gebäck", "fertigkuchen"],
    detail: "Transfette entstehen beim Härten von Pflanzenölen. Sie erhöhen den schlechten Cholesterinspiegel und begünstigen Herzinfarkte.",
  },
]

// ── Alternativen-Datenbank ─────────────────────────────────────────────────────
interface AltEntry {
  emoji: string
  name: string
  why: string
  icon: string
  color: string
}
const ALTERNATIVES_DB: { match: RegExp; konzern?: string; alts: AltEntry[] }[] = [
  {
    match: /coca.?cola|cola\b/i, konzern: "Coca-Cola",
    alts: [
      { emoji: "💧", name: "Mineralwasser mit Zitrone", why: "Kein Zucker, kein Konzern", icon: "💧", color: "#44aaff" },
      { emoji: "🍵", name: "Mate-Tee (gekühlt)", why: "Natürliches Koffein, fair", icon: "🌿", color: "#22cc88" },
    ],
  },
  {
    match: /fanta|sprite|mezzo\s?mix/i, konzern: "Coca-Cola",
    alts: [
      { emoji: "🍋", name: "Wasser + Zitronensaft", why: "Selbst gemacht, zuckerfrei", icon: "❤️", color: "#22cc88" },
      { emoji: "💧", name: "Fruchtschorle (Bio)", why: "Weniger Zucker, kein Konzern", icon: "🌿", color: "#44aaff" },
    ],
  },
  {
    match: /red\s?bull|monster|energy/i,
    alts: [
      { emoji: "☕", name: "Espresso", why: "Echtes Koffein ohne Zusätze", icon: "❤️", color: "#22cc88" },
      { emoji: "🍵", name: "Matcha Latte", why: "Lange Energie ohne Crash", icon: "🌿", color: "#22cc88" },
    ],
  },
  {
    match: /nutella|nuss.?nougat/i, konzern: "Ferrero",
    alts: [
      { emoji: "🫙", name: "Rapunzel Nussnougat (Bio)", why: "Palmölfrei, fairer Kakao", icon: "🌍", color: "#22cc88" },
      { emoji: "🥜", name: "Erdnussbutter (natur)", why: "Nur Erdnüsse, kein Palmöl", icon: "❤️", color: "#22cc88" },
    ],
  },
  {
    match: /kitkat|kit.?kat/i, konzern: "Nestlé",
    alts: [
      { emoji: "🍫", name: "Vivani Schokolade (Bio)", why: "Fairtrade-Kakao, kein Konzern", icon: "🌍", color: "#44aa88" },
      { emoji: "🍎", name: "Apfel + Nussbutter", why: "Natürlich süß, gesünder", icon: "❤️", color: "#22cc88" },
    ],
  },
  {
    match: /milka|oreo|chips.?ahoy/i, konzern: "Mondelez",
    alts: [
      { emoji: "🍫", name: "Zotter Schokolade", why: "Fairtrade, bean-to-bar", icon: "🌍", color: "#44aa88" },
      { emoji: "🍫", name: "Vivani Bio-Schokolade", why: "Palmölfrei, Bio", icon: "🌿", color: "#22cc88" },
    ],
  },
  {
    match: /pringles|chips\b/i,
    alts: [
      { emoji: "🥜", name: "Nüsse (ungesalzen)", why: "Gesunde Fette, kein Palmöl", icon: "❤️", color: "#22cc88" },
      { emoji: "🥕", name: "Gemüsesticks + Hummus", why: "Proteinreich, sättigend", icon: "❤️", color: "#44aaff" },
    ],
  },
  {
    match: /wurst|aufschnitt|salami/i,
    alts: [
      { emoji: "🌿", name: "Räuchertofu in Scheiben", why: "Proteinreich, tierleidfrei", icon: "🌿", color: "#22cc88" },
      { emoji: "🫙", name: "Hummus als Brotaufstrich", why: "Pflanzlich & lecker", icon: "❤️", color: "#44aaff" },
    ],
  },
  {
    match: /fertigpizza|tiefkühlpizza/i,
    alts: [
      { emoji: "🍕", name: "Dinkel-Flammkuchen (selbst)", why: "Frisch, ohne Zusätze", icon: "❤️", color: "#22cc88" },
      { emoji: "🫓", name: "Ofenbrot mit Belag", why: "Schnell & gesünder", icon: "❤️", color: "#44aaff" },
    ],
  },
  {
    match: /margarine/i,
    alts: [
      { emoji: "🧈", name: "Bio-Butter", why: "Ohne Transfette, natürlich", icon: "❤️", color: "#22cc88" },
      { emoji: "🫒", name: "Olivenöl extra vergine", why: "Herzgesunde Fette", icon: "❤️", color: "#44aa88" },
    ],
  },
  {
    match: /toastbrot|weißbrot/i,
    alts: [
      { emoji: "🍞", name: "Vollkornbrot (Bäcker)", why: "Mehr Ballaststoffe, sättigend", icon: "❤️", color: "#22cc88" },
      { emoji: "🫓", name: "Dinkelbrot", why: "Besser verträglich", icon: "❤️", color: "#44aaff" },
    ],
  },
  {
    match: /cornflakes|zuckerflakes/i,
    alts: [
      { emoji: "🥣", name: "Haferflocken (natur)", why: "Ohne Zucker, sättigend", icon: "❤️", color: "#22cc88" },
      { emoji: "🥣", name: "Granola (Bio, zuckerarm)", why: "Mehr Nährstoffe", icon: "🌿", color: "#44aa88" },
    ],
  },
  {
    match: /joghurt.*(frucht|beere|erdbeer|himbeere)/i,
    alts: [
      { emoji: "🍶", name: "Naturjoghurt + frische Beeren", why: "Kein versteckter Zucker", icon: "❤️", color: "#22cc88" },
    ],
  },
  {
    match: /apfelsaft|fruchtsaft/i,
    alts: [
      { emoji: "🍎", name: "Frischer Apfel", why: "Ballaststoffe, kein Zucker-Spike", icon: "❤️", color: "#22cc88" },
      { emoji: "💧", name: "Wasser + Apfelessig", why: "Darmgesund, zuckerfrei", icon: "❤️", color: "#44aaff" },
    ],
  },
  {
    match: /nescaf[eé]|kaffee.*(pad|kapsel|dolce)/i, konzern: "Nestlé",
    alts: [
      { emoji: "☕", name: "Filterkaffee (fair trade)", why: "Kein Konzern, fair gehandelt", icon: "🌍", color: "#44aa88" },
      { emoji: "☕", name: "Bio-Bohnenkaffee", why: "Besserer Geschmack, fairer Preis", icon: "🌿", color: "#22cc88" },
    ],
  },
  {
    match: /persil|ariel|lenor/i, konzern: "Henkel/P&G",
    alts: [
      { emoji: "🧺", name: "Frosch Waschmittel", why: "Biologisch abbaubar", icon: "🌍", color: "#22cc88" },
      { emoji: "🧺", name: "Sonett (Bio)", why: "Ökologisch, kein Mikroplastik", icon: "🌿", color: "#44aa88" },
    ],
  },
]

function findAlternatives(itemName: string): AltEntry[] | null {
  const entry = ALTERNATIVES_DB.find(e => e.match.test(itemName))
  return entry ? entry.alts : null
}
function findKonzern(itemName: string): string | undefined {
  return ALTERNATIVES_DB.find(e => e.match.test(itemName))?.konzern
}

export default function CoachPage() {
  const { user } = useSupabaseAuth()
  const [authModal, setAuthModal] = useState(false)
  const [listItems, setListItems] = useState<CoachItem[]>([])
  const [userGoals, setUserGoals] = useState<string[]>([])
  const [isPremium, setIsPremium] = useState(false)
  const [activeTab, setActiveTab] = useState<"research" | "alternatives">("research")
  const [openIngredient, setOpenIngredient] = useState<string | null>(null)
  const [coachSetup, setCoachSetup] = useState<CoachSetup | null | "loading">("loading")

  useEffect(() => {
    try {
      const raw = localStorage.getItem("shopping-list-items-v1")
      if (raw) {
        const parsed = JSON.parse(raw)
        setListItems(parsed.map((it: { id: number|string; name: string; emoji?: string; brand?: string; severity?: string; alternative?: { name: string }; checked?: boolean; category?: string; issue?: string }) => ({
          id: it.id, name: it.name, emoji: it.emoji ?? "🛒",
          brand: it.brand, severity: it.severity, alternative: it.alternative,
          category: it.category, issue: it.issue,
        })))
      }
    } catch {}
    try {
      const raw = localStorage.getItem("true-profile")
      if (raw) { const p = JSON.parse(raw); if (Array.isArray(p.goals)) setUserGoals(p.goals) }
    } catch {}
    setIsPremium(localStorage.getItem("true-premium") === "1")
    try {
      const cs = localStorage.getItem("true-coach-setup")
      setCoachSetup(cs ? JSON.parse(cs) : null)
    } catch {
      setCoachSetup(null)
    }
  }, [])


  const unchecked = listItems.filter(i => !(i as { checked?: boolean }).checked)
  const highRisk  = unchecked.filter(i => i.severity === "high")

  // Show onboarding if setup not done yet
  if (coachSetup === "loading") return null

  // Soft gate: no Supabase user → show teaser
  if (!user) {
    return (
      <>
        <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem", textAlign: "center", fontFamily: "system-ui,-apple-system,sans-serif" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🥗</div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "0.75rem" }}>TRUE Coach</h1>
          <p style={{ fontSize: "1rem", color: "var(--text-dim)", lineHeight: 1.7, maxWidth: 360, marginBottom: "0.5rem" }}>
            Dein persönlicher KI-Ernährungscoach — analysiert deine Einkaufsliste, erkennt kritische Inhaltsstoffe und schlägt bessere Alternativen vor.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem", display: "flex", flexDirection: "column", gap: "0.55rem", maxWidth: 320 }}>
            {["🎯 Persönliche Ernährungsziele", "⚠️ Warnungen bei Glyphosat & Palmöl", "✅ Bessere Alternativen im Supermarkt", "🛒 Direkte Analyse deiner Einkaufsliste"].map(f => (
              <li key={f} style={{ fontSize: "0.9rem", color: "var(--text-dim)", textAlign: "left" }}>{f}</li>
            ))}
          </ul>
          <button
            onClick={() => setAuthModal(true)}
            style={{ background: "#2ECC8A", color: "#000", borderRadius: "12px", padding: "1rem 2.5rem", fontWeight: 800, fontSize: "1rem", border: "none", cursor: "pointer", boxShadow: "0 0 40px rgba(46,204,138,0.3)" }}
          >
            Jetzt anmelden →
          </button>
          <p style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "rgba(128,128,128,0.7)" }}>Kostenlos · Kein Abo nötig</p>
          <BottomNav />
        </div>
        {authModal && <AuthModal defaultMode="register" onClose={() => setAuthModal(false)} onSuccess={() => setAuthModal(false)} />}
      </>
    )
  }

  if (coachSetup === null) {
    return (
      <>
        <CoachOnboarding onDone={(setup) => setCoachSetup(setup)} />
        <BottomNav />
      </>
    )
  }

  // Match ingredients found in shopping list
  const matchedIngredients = INGREDIENT_CARDS.filter(ing =>
    unchecked.some(item =>
      ing.keywords.some(kw => item.name.toLowerCase().includes(kw))
    )
  )
  const listIngredientMatches = (ing: typeof INGREDIENT_CARDS[0]) =>
    unchecked.filter(item => ing.keywords.some(kw => item.name.toLowerCase().includes(kw)))

  // Alternativen für Einkaufsliste
  const itemsWithAlts = unchecked.map(item => ({
    item,
    alts: findAlternatives(item.name),
    konzern: findKonzern(item.name),
  }))
  const matchedAlts  = itemsWithAlts.filter(x => x.alts !== null)
  const unmatchedAlts = itemsWithAlts.filter(x => x.alts === null)

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", color: "var(--text)" }}>

        {/* Header */}
        <header style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--nav-bg)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", padding: "0 1.25rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.3rem" }}>📊</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: "1rem", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Analyse</div>
              <div style={{ fontSize: "0.62rem", color: "var(--accent)", fontWeight: 700 }}>
                {coachSetup.goals.length > 0
                  ? coachSetup.goals.map(g => ONBOARDING_GOALS.find(og => og.id === g)?.emoji ?? "").join("") + " " + (ONBOARDING_GOALS.find(og => og.id === coachSetup.goals[0])?.label ?? "")
                  : "Personalisiert"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isPremium && <span style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", borderRadius: 6, padding: "2px 8px", fontSize: "0.55rem", fontWeight: 900 }}>PREMIUM</span>}
            <button onClick={() => { localStorage.removeItem("true-coach-setup"); setCoachSetup(null) }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 9px", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-dim)", cursor: "pointer" }}>
              ✏️ Anpassen
            </button>
          </div>
        </header>

        <div style={{ maxWidth: 520, margin: "0 auto", padding: "1rem 1rem 2rem" }}>

          {/* Tab Bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "var(--surface)", borderRadius: 14, padding: 4 }}>
            {([
              { id: "research",     label: "🔬 Inhaltsstoffe" },
              { id: "alternatives", label: "🔄 Alternativen" },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: activeTab === tab.id ? 800 : 500, background: activeTab === tab.id ? "var(--accent)" : "transparent", color: activeTab === tab.id ? "#000" : "var(--text-dim)", transition: "all 0.15s" }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB: Inhaltsstoffe ── */}
          {activeTab === "research" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {unchecked.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-dim)" }}>
                  <div style={{ fontSize: "2.4rem", marginBottom: 8 }}>🛒</div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Einkaufsliste ist leer</div>
                  <div style={{ fontSize: "0.75rem", marginTop: 4 }}>Füge Produkte hinzu — dann prüfen wir die Inhaltsstoffe.</div>
                </div>
              )}

              {/* Gefundene Risiken aus der Liste */}
              {matchedIngredients.map(ing => {
                const matches = listIngredientMatches(ing)
                const isOpen = openIngredient === ing.id
                return (
                  <div key={ing.id} style={{ borderRadius: 16, overflow: "hidden", border: `2px solid ${ing.color}55`, background: ing.color + "0a" }}>
                    <button onClick={() => setOpenIngredient(isOpen ? null : ing.id)}
                      style={{ width: "100%", background: "transparent", padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", border: "none" }}>
                      {/* Emoji-Badge */}
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: ing.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>{ing.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <div style={{ fontWeight: 900, fontSize: "0.88rem", color: ing.color }}>{ing.label}</div>
                          <span style={{ background: "#d43040", color: "#fff", borderRadius: 6, padding: "1px 6px", fontSize: "0.55rem", fontWeight: 900 }}>IN LISTE</span>
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {matches.map(m => m.name).join(" · ")}
                        </div>
                      </div>
                      <span style={{ fontSize: "1rem", color: "var(--text-dim)", flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>⌄</span>
                    </button>
                    {isOpen && (
                      <div style={{ borderTop: `1px solid ${ing.color}22`, padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)", marginBottom: 8, lineHeight: 1.5 }}>{ing.simple}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 10 }}>{ing.detail}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {matches.map(m => (
                            <span key={String(m.id)} style={{ background: ing.color + "18", border: `1px solid ${ing.color}33`, borderRadius: 8, padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700, color: ing.color }}>
                              {m.emoji} {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Trennlinie wenn beide Sektionen vorhanden */}
              {matchedIngredients.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: "0.62rem", color: "var(--text-dim)", fontWeight: 700 }}>WORAUF DU GRUNDSÄTZLICH ACHTEN SOLLTEST</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
              )}

              {/* Alle übrigen Inhaltsstoffe (noch nicht in Liste) */}
              {INGREDIENT_CARDS.filter(ing => !matchedIngredients.includes(ing)).map(ing => {
                const isOpen = openIngredient === ing.id + "-all"
                return (
                  <div key={ing.id} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface)" }}>
                    <button onClick={() => setOpenIngredient(isOpen ? null : ing.id + "-all")}
                      style={{ width: "100%", background: "transparent", padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", border: "none" }}>
                      <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{ing.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--text)" }}>{ing.label}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ing.simple}</div>
                      </div>
                      <span style={{ fontSize: "0.9rem", color: "var(--text-dim)", flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>⌄</span>
                    </button>
                    {isOpen && (
                      <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", fontSize: "0.75rem", color: "var(--text-dim)", lineHeight: 1.65 }}>
                        {ing.detail}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── TAB: Alternativen ── */}
          {activeTab === "alternatives" && (
            <div>
              {unchecked.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-dim)" }}>
                  <div style={{ fontSize: "2.8rem", marginBottom: 12 }}>🛒</div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)", marginBottom: 6 }}>Liste ist leer</div>
                  <div style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>Füge Produkte zur Einkaufsliste hinzu — der Coach findet bessere Alternativen.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Produkte mit bekannten Alternativen */}
                  {matchedAlts.map(({ item, alts, konzern }) => (
                    <div key={String(item.id)} style={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden" }}>
                      {/* Original-Produkt */}
                      <div style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{item.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: "0.86rem", color: "var(--text)" }}>{item.name}</div>
                          {konzern && <div style={{ fontSize: "0.62rem", color: "var(--text-dim)", marginTop: 1 }}>{konzern}</div>}
                        </div>
                        <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "var(--accent)", border: "1px solid var(--accent)", padding: "2px 8px", borderRadius: 99, flexShrink: 0, whiteSpace: "nowrap" }}>Besser geht's</span>
                      </div>
                      {/* Alternativen — neutral, kein Farbchaos */}
                      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                        {alts!.map((alt, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "var(--background)", borderRadius: 10, border: "1px solid var(--border)" }}>
                            <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{alt.emoji}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: "0.83rem", color: "var(--text)" }}>{alt.name}</div>
                              <div style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: 600, marginTop: 1 }}>{alt.why}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Produkte ohne bekannte Probleme */}
                  {unmatchedAlts.length > 0 && (
                    <div style={{ marginTop: matchedAlts.length > 0 ? 4 : 0 }}>
                      {matchedAlts.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 10px" }}>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                          <span style={{ fontSize: "0.58rem", color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.06em" }}>KEINE BEKANNTEN PROBLEME</span>
                          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                        </div>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {unmatchedAlts.map(({ item }) => (
                          <div key={String(item.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 99, fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>
                            <span>{item.emoji}</span><span>{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchedAlts.length === 0 && unmatchedAlts.length > 0 && (
                    <div style={{ marginTop: 8, padding: "16px", background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", textAlign: "center" }}>
                      <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>👍</div>
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>Alles okay</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 4 }}>Für diese Produkte sind uns keine problematischen Alternativen bekannt.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
  )
}
