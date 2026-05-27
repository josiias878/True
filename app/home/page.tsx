"use client"
import React, { useEffect, useRef, useState } from "react"

import Link from "next/link"
import dynamic from "next/dynamic"
import { ThemeToggle, ThemeIcon } from "@/components/ThemeProvider"
import BottomNav from "@/components/BottomNav"
import NotificationBell from "@/components/NotificationBell"
import FloatingAssistant from "@/components/FloatingAssistant"
import RatingBlock from "@/components/RatingBlock"
import InstallButton from "@/components/InstallButton"
import type { Product } from "@/data/products"
import { guessEmoji, guessCategory } from "@/lib/productDetection"
import { supabase } from "@/lib/supabase"
import ProductScore from "@/components/ProductScore"
import { NutritionCoachChat } from "@/components/NutritionCoach"
import { calcScoreFromSeverity, type ProductScoreResult } from "@/lib/productScore"

const WorldMap = dynamic(() => import("@/components/WorldMap"), { ssr: false })

const px = (id: number, w = 600, h = 400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`

// ─── Haustier-Erkennung ───────────────────────────────────────────────────────
const PET_EMOJIS_HOME = new Set(["🐕","🐈","🐶","🐱","🐾","🐇","🐹","🐠","🐦","🦜","🐰","🦮","🐩","🐈‍⬛","🐕‍🦺","🐓","🐢","🦎","🐡","🦮"])
const PET_REGEX_HOME  = /hund|katze|hamster|vogel|kaninchen|hase|welpe|kitten|kätzchen|haustier|meerschwein|schildkröte|goldfisch|labrador|retriever|bulldogge|pudel|dackel|papagei/i
function isPetMember(member: { name: string; emoji: string }) {
  return PET_EMOJIS_HOME.has(member.emoji) || PET_REGEX_HOME.test(member.name)
}

// ── Dual News Bar Data ─────────────────────────────────────────────────────
const LEFT_NEWS = [
  { icon: "🌳", color: "#ff6633", tag: "Wälder",     text: "840.000 ha Regenwald vernichtet — allein 2023 für Palmöl", source: "WWF" },
  { icon: "🍫", color: "#ffaa00", tag: "Kinderarbeit", text: "1,56 Mio. Kinder arbeiten auf Kakaofeldern in Westafrika",  source: "ICI 2023" },
  { icon: "🌍", color: "#ff2233", tag: "Klima",       text: "10 Konzerne verantwortlich für 70 % globaler Abholzung",   source: "Science Mag" },
  { icon: "🐝", color: "#ffcc00", tag: "Artensterben", text: "70 % der Bienen-Nahrungsquellen durch Glyphosat vernichtet", source: "EFSA 2023" },
  { icon: "🏭", color: "#888",    tag: "Industrie",   text: "Shell: Neue Ölpest im Niger-Delta — keine behördliche Reaktion", source: "UN 2023" },
]

const RIGHT_NEWS = [
  { icon: "💧", color: "#44aaff", tag: "Wasser",    text: "Coca-Cola entnimmt tägl. 1,8 Mrd. Liter Grundwasser",      source: "TU Berlin" },
  { icon: "☠️", color: "#cc66ff", tag: "Glyphosat", text: "Bayer zahlt 13 Mrd. USD — Krebszusammenhang bestätigt",    source: "US Court 2023" },
  { icon: "🥤", color: "#ffcc00", tag: "Plastik",   text: "Coca-Cola, PepsiCo & Nestlé — größte Plastik-Verschmutzer", source: "BFFP 2023" },
  { icon: "🧪", color: "#44aaff", tag: "PFAS",      text: "PFAS in 70 % aller EU-Gewässer über Grenzwerten",          source: "EFSA 2023" },
  { icon: "🌊", color: "#0088ff", tag: "Ozeane",    text: "8 Mio. Tonnen Plastik landen jährlich im Meer",            source: "UNEP 2023" },
]


// ── Journalist Post ────────────────────────────────────────────────────────
const JOURNALIST_POST = {
  img: px(1352249, 700, 320),
  title: "Wie viel Zucker ist wirklich zu viel?",
  text: "Die WHO empfiehlt max. 25 g freie Zucker pro Tag. Eine Dose Cola enthält bereits 39 g. Industriezucker aktiviert dieselben Hirnareale wie Kokain — und steckt in fast jedem Fertigprodukt.",
  tag: "Zucker", tagColor: "#ffcc00",
  likes: 0, time: "Heute, 09:14",
}

// ── Ingredient info ────────────────────────────────────────────────────────
const INGREDIENT_INFO: Record<string, { title: string; color: string; emoji: string; body: { icon: string; label: string; text: string }[]; tip: string }> = {
  "Palmöl": {
    title: "Palmöl", color: "#ff6633", emoji: "🌴",
    body: [
      { icon: "🫀", label: "Herz-Kreislauf", text: "Erhöht LDL-Cholesterin. WHO: +17 % Herzinfarktrisiko bei regelmäßigem Konsum gesättigter Fette." },
      { icon: "🧪", label: "Krebsverdacht",  text: "Bei Erhitzung über 200 °C entstehen GE-Fettsäureester — von EFSA als potenziell krebserregend eingestuft." },
      { icon: "🌳", label: "Regenwald",      text: "Für 1 Tonne Palmöl werden Ø 1,3 Hektar Regenwald abgeholzt. 840.000 ha verloren 2023 allein für Palmöl." },
    ],
    tip: "Achte auf Zutatenliste: 'Palmöl', 'Palmfett', 'E471–E476'.",
  },
  "Glyphosat": {
    title: "Glyphosat", color: "#cc66ff", emoji: "☠️",
    body: [
      { icon: "🧬", label: "Krebsrisiko",  text: "IARC (WHO): 'wahrscheinlich krebserregend' Gruppe 2A. Bayer verlor Klagen mit $13 Mrd. Schadensersatz." },
      { icon: "🦋", label: "Ökosystem",    text: "Tötet alle Wildkräuter. 70 % der Bienen-Nahrungsquellen auf Ackerflächen vernichtet." },
      { icon: "🚿", label: "Trinkwasser",  text: "18 % der deutschen Grundwasserproben über Grenzwerten. Nachgewiesen in Muttermilch." },
    ],
    tip: "Bio-Produkte kaufen — Glyphosat ist im Ökolandbau verboten.",
  },
  "PFAS": {
    title: "PFAS (Ewigkeits-Chemikalien)", color: "#44aaff", emoji: "🧪",
    body: [
      { icon: "🫀", label: "Immunsystem",    text: "EFSA 2020: PFAS können die Immunantwort nach Impfungen schwächen — besonders bei Kindern." },
      { icon: "♾️", label: "Nicht abbaubar", text: "PFAS bauen sich im Körper nie vollständig ab — Halbwertszeit bis zu 8 Jahren." },
      { icon: "💧", label: "Grundwasser",    text: "In 70 % aller EU-Gewässer über Grenzwerten. EU-Verbot für viele PFAS erst ab 2025." },
    ],
    tip: "Vermeide Teflon-Pfannen, Lebensmittelverpackungen und Outdoor-Kleidung mit 'DWR-Beschichtung'.",
  },
  "Wasser": {
    title: "Wasserrechte", color: "#44aaff", emoji: "💧",
    body: [
      { icon: "🌍", label: "Weltweit",  text: "3 Mrd. Menschen ohne sicheren Zugang zu sauberem Wasser — WHO 2023." },
      { icon: "🏭", label: "Nestlé",    text: "US Forest Service: Nestlé Waters entnahm ohne gültige Genehmigung Wasser aus US-Nationalparks." },
      { icon: "🥤", label: "Coca-Cola", text: "TU Berlin: Coca-Cola entnimmt in wasserknappen Regionen bis zu 350 % mehr als die Genehmigungen erlauben." },
    ],
    tip: "Leitungswasser in Deutschland ist qualitativ hochwertiger als Flaschenwasser — und 500× günstiger.",
  },
}

// ── Goal config (mirrors Onboarding GOALS ids) ────────────────────────────
const GOAL_LABELS: Record<string, string> = {
  env: "Umwelt schützen", health: "Gesünder leben", family: "Familie schützen",
  truth: "Wahrheit kennen", action: "Etwas bewegen", budget: "Clever sparen",
}

const GOAL_CONFIG: Record<string, {
  subtitle: string
  fuerDich: Array<{ emoji: string; title: string; text: string; color: string; tip: string }>
  premium: { count: number; locked: Array<{ emoji: string; title: string; preview: string }> }
}> = {
  env: {
    subtitle: "Heute schützt du mit jedem Scan ein Stück Regenwald.",
    fuerDich: [
      { emoji: "🌴", title: "Palmöl erkennen", color: "#ff6633",
        text: "In 50 % aller Supermarktprodukte enthalten — erkennbar als 'E471', 'E476' oder 'pflanzliches Fett'. Nestlé und Ferrero zählen zu den größten Abnehmern.",
        tip: "Scanne heute ein Schokoprodukt — TRUE zeigt dir sofort, ob Palmöl enthalten ist." },
      { emoji: "♻️", title: "Plastik-Ranking 2024", color: "#44aaff",
        text: "Coca-Cola, PepsiCo & Nestlé produzieren zusammen 5,3 Mio. Tonnen Plastikmüll jährlich — 6 Jahre in Folge die größten Plastik-Verschmutzer weltweit.",
        tip: "Glasflasche statt PET: 5× weniger Ressourcen, unbegrenzt recycelbar." },
    ],
    premium: { count: 1240, locked: [
      { emoji: "🌲", title: "Regenwald-Radar: Deine Einkaufsliste", preview: "18 Produkte in deiner Liste stehen in direktem Zusammenhang mit Abholzung. Davon 4 mit kritischem Palmöl-Anteil aus Hochrisikoregionen…" },
      { emoji: "📊", title: "Deine monatliche Umwelt-Bilanz", preview: "Durch deine Kaufentscheidungen diesen Monat hast du schätzungsweise X kg CO₂ und Y Liter Wasser eingespart. Im Vergleich zu letztem Monat…" },
    ]},
  },
  health: {
    subtitle: "Weißt du wirklich, was in deinen Produkten steckt?",
    fuerDich: [
      { emoji: "🍭", title: "Zuckerfallen erkennen", color: "#ffcc00",
        text: "25 g freie Zucker täglich empfiehlt die WHO maximal. Eine Dose Cola enthält bereits 39 g. Viele Fertigprodukte übersteigen die Tagesdosis in einer einzigen Portion.",
        tip: "Scanne Frühstücksprodukte — Müslis enthalten oft mehr Zucker als Schokolade." },
      { emoji: "🧪", title: "PFAS: Ewigkeits-Chemikalien", color: "#cc66ff",
        text: "In 70 % aller EU-Gewässer über Grenzwerten. Halbwertszeit im Körper bis zu 8 Jahre. Enthalten in Teflon-Pfannen, Fast-Food-Verpackungen und Outdoor-Kleidung.",
        tip: "Vermeide Verpackungen mit Fettabweisern — z.B. Mikrowellenpopcorn-Tüten." },
    ],
    premium: { count: 890, locked: [
      { emoji: "🔬", title: "Vollständige Inhaltsstoff-Analyse", preview: "Für alle deine gescannten Produkte: NOVA-Gruppe, kritische Zusatzstoffe, Risikoklassen nach EFSA-Einstufung und individuelle Empfehlungen…" },
      { emoji: "💪", title: "Dein persönlicher Gesundheits-Score", preview: "Basierend auf deinen letzten Scans: Dein Haushalt hat einen Risikoscore von… Drei Produkte solltest du als erstes ersetzen…" },
    ]},
  },
  family: {
    subtitle: "Sichere Produkte für deine Familie — sofort erkennbar.",
    fuerDich: [
      { emoji: "🍫", title: "Kindermarketing entlarven", color: "#ffaa00",
        text: "Nestlé, Kellogg's & Co. nutzen bunte Designs und Comicfiguren um Kinder zu ungesunden Produkten zu drängen — eine Praxis, die die WHO seit Jahren kritisiert.",
        tip: "Produkte mit Comicfiguren sind oft 40 % zuckerreicher als Erwachsenenprodukte." },
      { emoji: "⚗️", title: "Schadstoffe in Kindersnacks", color: "#ff4455",
        text: "Viele populäre Kinderprodukte enthalten Farbstoffe (E102, E110), die laut EFSA Hyperaktivität begünstigen. Babynahrung ist strenger reguliert als Kindersnacks.",
        tip: "Achte auf E-Nummern zwischen E100–E180 in Kindersnacks und Säften." },
    ],
    premium: { count: 670, locked: [
      { emoji: "👶", title: "Kindersichere Produktliste (47 Einträge)", preview: "Geprüfte Produkte ohne kritische Zusatzstoffe, speziell für Kinder unter 12. Mit Altersangabe und Verfügbarkeit in deinen gespeicherten Märkten…" },
      { emoji: "🏪", title: "Familienfreundliche Alternativen bei dir", preview: "In deinen gespeicherten Märkten verfügbar: Günstige, sichere Alternativen für die beliebtesten Kinderprodukte — direkt vergleichbar…" },
    ]},
  },
  truth: {
    subtitle: "Was verbergen die großen Konzerne heute vor dir?",
    fuerDich: [
      { emoji: "🏭", title: "Greenwashing erkennen", color: "#44aaff",
        text: "Nestlé, Danone & Co. bewerben 'Nachhaltigkeit' — gleichzeitig steigen ihre Emissionen. Carbon Brief: 93 % der Net-Zero-Versprechen sind nicht messbar oder verifizierbar.",
        tip: "Scanne Produkte mit 'Bio'-Label — TRUE prüft das Mutterunternehmen dahinter." },
      { emoji: "💰", title: "Steuervermeidung auf Kosten aller", color: "#ff7700",
        text: "Amazon, Google, Apple zahlen in der EU teils unter 1 % effektiven Steuersatz. Der jährliche Schaden: Milliarden fehlen in Schulen, Krankenhäusern, Infrastruktur.",
        tip: "TRUE zeigt welche Konzerne trotz Milliarden-Gewinnen kaum Steuern zahlen." },
    ],
    premium: { count: 1050, locked: [
      { emoji: "📁", title: "Vollständige Konzern-Profile", preview: "Alle dokumentierten Verstöße, Klagen, Lobbying-Ausgaben und politische Verbindungen der 22 größten Konzerne in deiner Einkaufsliste…" },
      { emoji: "🔍", title: "Insider: Diese Woche neu", preview: "3 neue Studien und Gerichtsurteile, die Konzerne lieber nicht in den Medien sehen. Exklusiv für TRUE Premium — noch nicht in der Presse…" },
    ]},
  },
  action: {
    subtitle: "Jede Kaufentscheidung zählt. Was veränderst du heute?",
    fuerDich: [
      { emoji: "✊", title: "Boykotts die wirklich wirkten", color: "#2ECC8A",
        text: "Nach dem Wasser-Boykott gab Nestlé Wasserrechte in mehreren Regionen zurück. Kollektive Kaufentscheidungen haben messbare Wirkung — das zeigt die Geschichte.",
        tip: "Teile deine Scans in der Community — jede geteilte Entscheidung verstärkt den Effekt." },
      { emoji: "🌍", title: "Marken die durch Druck gewachsen sind", color: "#44aaff",
        text: "Tony's Chocolonely, Fairphone, Oatly — Marken die durch Verbrauchernachfrage groß wurden. Marktanteil nachhaltiger Produkte: +18 % im Jahr 2023.",
        tip: "Scanne heute ein Produkt und teile die Alternative im Community-Feed." },
    ],
    premium: { count: 520, locked: [
      { emoji: "📈", title: "Dein monatlicher Impact-Report", preview: "Durch deine Kaufentscheidungen diesen Monat: X Produkte ersetzt, Y Konzerne gemieden, geschätzter CO₂-Effekt…" },
      { emoji: "📣", title: "Community-Aktionen nahe dir", preview: "3 aktive Gruppen in deiner Region organisieren gerade Boykott-Aktionen und Aufklärungskampagnen. Jetzt mitmachen…" },
    ]},
  },
  budget: {
    subtitle: "Faire Alternativen, die deinen Geldbeutel schonen.",
    fuerDich: [
      { emoji: "💡", title: "Eigenmarken schlagen Markenprodukte", color: "#ffcc00",
        text: "Rewe Bio und Aldi-Eigenmarken haben oft dieselbe oder bessere Qualität als teure Markenprodukte — zu 30–60 % geringerem Preis. Gleiche Fabrik, anderes Label.",
        tip: "Scanne heute ein Markenprodukt — TRUE zeigt die günstigere Alternative." },
      { emoji: "📉", title: "Markenaufschlag verstehen", color: "#2ECC8A",
        text: "Du zahlst für Verpackung, Marketing und Konzernrendite. Bei Müsli z.B. bis zu 300 % Aufschlag auf denselben Inhalt verglichen mit Supermarkt-Eigenmarken.",
        tip: "Zutaten vergleichen statt Marken — oft identisch, Preis um die Hälfte." },
    ],
    premium: { count: 430, locked: [
      { emoji: "💰", title: "Sparrechner: Dein Potenzial", preview: "Basierend auf deinen bisherigen Scans könntest du monatlich bis zu X € sparen — bei gleichwertiger oder besserer Produktqualität…" },
      { emoji: "🏪", title: "Preisvergleich-Datenbank (200+ Produkte)", preview: "Faire Alternativen mit Preisen in Rewe, Edeka, Aldi und Lidl. Gefiltert nach deinen gespeicherten Märkten und Kategorien…" },
    ]},
  },
}

// ── Für dich heute — 1 Karte / Tag, Premium nur bei Interesse ─────────────
function FuerDichHeute({ goals }: { goals: string[] }) {
  const primary   = goals[0] || "truth"
  const cfg       = GOAL_CONFIG[primary] ?? GOAL_CONFIG["truth"]
  const goalLabel = GOAL_LABELS[primary] ?? "Wahrheit kennen"
  const STRIPE_LINK = process.env.NEXT_PUBLIC_STRIPE_LINK ?? ""

  // One card per day — rotates through goal's cards
  const card = cfg.fuerDich[dayIndex() % cfg.fuerDich.length]

  const [open, setOpen]               = React.useState(false)
  const [showPremium, setShowPremium] = React.useState(false)

  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h2 style={{ fontSize: "0.92rem", fontWeight: 800 }}>✨ Für dich heute</h2>
        <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>Täglich neu</span>
      </div>

      <div
        onClick={() => { setOpen(o => !o); if (open) setShowPremium(false) }}
        style={{ background: "var(--surface)", border: `1px solid ${card.color}33`, borderLeft: `3px solid ${card.color}`, borderRadius: "14px", padding: "0.9rem 1rem", cursor: "pointer" }}
      >
        {/* Header row — always visible */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{card.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>{card.title}</div>
            {!open && (
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "0.15rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {card.text.slice(0, 65)}…
              </div>
            )}
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--text-dim)", flexShrink: 0, display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>⌄</span>
        </div>

        {/* Expanded content */}
        {open && (
          <div style={{ marginTop: "0.7rem", paddingTop: "0.7rem", borderTop: `1px solid ${card.color}22` }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.7, margin: "0 0 0.6rem" }}>{card.text}</p>
            <div style={{ background: card.color + "0d", border: `1px solid ${card.color}22`, borderRadius: "8px", padding: "0.5rem 0.8rem", fontSize: "0.74rem", color: card.color, fontWeight: 600, marginBottom: "0.85rem" }}>
              💡 {card.tip}
            </div>

            {/* "Mehr Hintergründe" — intent gate before premium */}
            {!showPremium ? (
              <button
                onClick={() => setShowPremium(true)}
                style={{ width: "100%", background: "transparent", border: `1px solid ${card.color}44`, color: card.color, borderRadius: "10px", padding: "0.55rem 1rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
              >
                🔍 Mehr Hintergründe dazu →
              </button>
            ) : (
              /* Premium reveal — only after explicit user intent */
              <div style={{ background: "rgba(255,204,0,0.05)", border: "1px solid rgba(255,204,0,0.2)", borderRadius: "12px", padding: "0.9rem 1rem", animation: "fadeIn 0.25s ease" }}>
                <div style={{ fontSize: "0.68rem", color: "#ffcc00", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.6rem" }}>
                  👑 TIEFER EINSTEIGEN — NUR IN PREMIUM
                </div>

                {cfg.premium.locked.map((lc, i) => (
                  <div key={i} style={{ marginBottom: i < cfg.premium.locked.length - 1 ? "0.55rem" : "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem" }}>
                      <span style={{ fontSize: "1rem" }}>{lc.emoji}</span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text)" }}>{lc.title}</span>
                    </div>
                    <div style={{ position: "relative" }}>
                      <p style={{ fontSize: "0.73rem", color: "var(--text-dim)", lineHeight: 1.5, margin: 0, filter: "blur(3px)", userSelect: "none" }}>{lc.preview}</p>
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent 15%, var(--surface) 78%)", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "0.62rem", color: "#ffcc00", fontWeight: 700, flexShrink: 0 }}>🔒</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginBottom: "0.7rem" }}>
                  <strong style={{ color: "#ffcc00" }}>{cfg.premium.count.toLocaleString("de-DE")}</strong> Nutzer mit Ziel „{goalLabel}" lesen das bereits
                </div>

                {STRIPE_LINK ? (
                  <a href={STRIPE_LINK} style={{ display: "block", textAlign: "center", background: "linear-gradient(135deg,#ffcc00,#ff9900)", color: "#000", borderRadius: "10px", padding: "0.7rem", textDecoration: "none", fontWeight: 900, fontSize: "0.85rem" }}>
                    👑 Freischalten — €2,99 / Monat
                  </a>
                ) : (
                  <Link href="/premium" style={{ display: "block", textAlign: "center", background: "linear-gradient(135deg,#ffcc00,#ff9900)", color: "#000", borderRadius: "10px", padding: "0.7rem", textDecoration: "none", fontWeight: 900, fontSize: "0.85rem" }}>
                    👑 Freischalten — €2,99 / Monat
                  </Link>
                )}
                <p style={{ textAlign: "center", margin: "0.35rem 0 0", fontSize: "0.63rem", color: "var(--text-dim)" }}>Jederzeit kündbar · Kein Abo-Trick</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mini shopping list ─────────────────────────────────────────────────────
const DEFAULT_LIST = [
  { id: 1, name: "KitKat",    brand: "Nestlé",    issue: "Palmöl", alt: "Vivani Bio",   checked: false },
  { id: 2, name: "Nutella",   brand: "Ferrero",   issue: "Palmöl", alt: "Nocciolata",   checked: false },
  { id: 3, name: "Coca-Cola", brand: "Coca-Cola", issue: "Wasser", alt: "Bionade",      checked: false },
]

// ── News Detail Sheet ──────────────────────────────────────────────────────
function NewsDetailSheet({ item, onClose }: { item: typeof LEFT_NEWS[0]; onClose: () => void }) {
  // Extended info per tag
  const DETAIL: Record<string, { body: string; facts: string[]; source_full: string }> = {
    "Wälder":      { body: "Für Palmöl, Soja und Rindfleisch werden täglich tausende Hektar Regenwald gerodet. Der Regenwald ist die Lunge der Erde — und verschwindet in Rekordtempo.", facts: ["840.000 ha Regenwald 2023 für Palmöl vernichtet", "10 Konzerne verantwortlich für 70 % globaler Abholzung", "Jede Minute verschwindet ein Fußballfeld Regenwald"], source_full: "WWF Living Forests Report 2023" },
    "Kinderarbeit":{ body: "Auf Kakaofeldern in Westafrika arbeiten bis zu 1,56 Millionen Kinder — viele von ihnen unter gefährlichen Bedingungen. Hinter Schokolade bekannter Marken steckt oft dieses System.", facts: ["1,56 Mio. Kinder auf Kakaofeldern (ICI 2023)", "Ghana & Côte d'Ivoire: 90 % des westlichen Kakaos", "Nestlé, Ferrero, Mars: alle unter Druck"], source_full: "International Cocoa Initiative Report 2023" },
    "Klima":       { body: "Eine Handvoll Konzerne ist für den Großteil der weltweiten Emissionen verantwortlich. Trotz öffentlicher Versprechen investieren viele weiter massiv in fossile Brennstoffe.", facts: ["10 Konzerne: 70 % globaler Abholzung (Science Mag)", "Carbon Disclosure Project: 100 Firmen = 71 % CO₂", "Shell, BP, ExxonMobil weiter unter Beschuss"], source_full: "Science Magazine / CDP Report 2023" },
    "Artensterben":{ body: "Glyphosat und andere Pestizide vernichten die Nahrungsgrundlage von Bienen und anderen Bestäubern. Ohne Bestäuber kollabiert das globale Nahrungssystem.", facts: ["70 % der Bienen-Nahrungsquellen vernichtet", "1 Mrd. Insekten sterben jährlich durch Pestizide", "EFSA fordert strengere Grenzwerte"], source_full: "EFSA Pesticide Report 2023" },
    "Industrie":   { body: "Im Niger-Delta haben Ölkatastrophen ganze Ökosysteme zerstört. Lokale Gemeinden leben mit verseuchtem Wasser, Böden und Luft — seit Jahrzehnten.", facts: ["Shell operiert seit 1950er Jahren im Niger-Delta", "UN: 50 Jahre für vollständige Sanierung nötig", "Tausende Klagen gegen Shell vor internationalen Gerichten"], source_full: "UN Environment Programme 2023" },
    "Wasser":      { body: "Konzerne wie Coca-Cola und Nestlé entnehmen Milliarden Liter Grundwasser — auch in Regionen mit Wasserknappheit. Das Recht auf Wasser wird privatisiert.", facts: ["Coca-Cola: 1,8 Mrd. Liter täglich entnommen", "Nestlé: Entnahme ohne gültige Genehmigungen in US-Parks", "3 Mrd. Menschen ohne sicheres Trinkwasser (WHO)"], source_full: "TU Berlin Wasserreport 2023" },
    "Glyphosat":   { body: "Bayer zahlte 13 Milliarden USD Schadensersatz in US-Klagen. Glyphosat wurde von der WHO-Agentur IARC als 'wahrscheinlich krebserregend' eingestuft.", facts: ["IARC: Glyphosat Gruppe 2A (wahrscheinlich krebserregend)", "Bayer: 13 Mrd. USD in US-Vergleichen", "In 18 % der deutschen Grundwasserproben über Grenzwerten"], source_full: "US District Courts / IARC 2023" },
    "Plastik":     { body: "Coca-Cola, PepsiCo und Nestlé sind die drei größten Plastik-Verschmutzer der Welt — zum sechsten Mal in Folge laut Brand Audit.", facts: ["8 Mio. Tonnen Plastik jährlich im Meer", "Coca-Cola: #1 Plastik-Verschmutzer weltweit", "500 Mrd. Plastikflaschen produziert — nur 30 % recycelt"], source_full: "Break Free From Plastic Brand Audit 2023" },
    "PFAS":        { body: "PFAS (Per- und polyfluorierte Alkylsubstanzen) bauen sich im menschlichen Körper nie vollständig ab und finden sich bereits in 70 % aller EU-Gewässer.", facts: ["PFAS in 70 % aller EU-Gewässer über Grenzwerten", "Halbwertszeit im Körper: bis zu 8 Jahre", "EFSA: Immunsystem-Schwächung bei Kindern nachgewiesen"], source_full: "EFSA PFAS Assessment 2023" },
    "Ozeane":      { body: "Jährlich landen acht Millionen Tonnen Plastik im Meer — das entspricht einem LKW pro Minute. Der Großteil kommt von Produktverpackungen großer Konzerne.", facts: ["8 Mio. Tonnen Plastik im Meer jährlich", "Großer Pazifischer Müllstrudel: 3× Größe Frankreichs", "Plastik in 100 % der untersuchten Meeresschildkröten"], source_full: "UNEP Ocean Plastic Report 2023" },
  }
  const detail = DETAIL[item.tag]

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto", animation: "slideUp 0.3s cubic-bezier(.22,1,.36,1)", border: `1px solid ${item.color}33`, borderBottom: "none" }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "14px auto 0" }} />
        {/* Header */}
        <div style={{ padding: "1rem 1.5rem 0.75rem", borderBottom: `1px solid ${item.color}22` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
            <span style={{ background: item.color + "20", color: item.color, borderRadius: "20px", padding: "0.15rem 0.55rem", fontSize: "0.72rem", fontWeight: 700, border: `1px solid ${item.color}30` }}>
              {item.icon} {item.tag}
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", fontWeight: 600 }}>Quelle: {item.source}</span>
          </div>
          <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", lineHeight: 1.4, margin: 0 }}>{item.text}</p>
        </div>
        {/* Body */}
        <div style={{ padding: "1rem 1.5rem" }}>
          {detail ? (
            <>
              <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", lineHeight: 1.7, marginBottom: "1rem" }}>{detail.body}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                {detail.facts.map((f, i) => (
                  <div key={i} style={{ background: item.color + "0d", border: `1px solid ${item.color}22`, borderLeft: `3px solid ${item.color}`, borderRadius: "8px", padding: "0.6rem 0.85rem", fontSize: "0.82rem", color: "var(--text)" }}>
                    {f}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", padding: "0.5rem 0.75rem", background: "var(--surface-2)", borderRadius: "8px" }}>
                📰 Vollständige Quelle: <strong>{detail.source_full}</strong>
              </div>
            </>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", lineHeight: 1.7 }}>{item.text}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Dual News Bar ──────────────────────────────────────────────────────────
function DualNewsBar() {
  const [leftIdx, setLeftIdx]   = useState(0)
  const [rightIdx, setRightIdx] = useState(0)
  const [leftVis, setLeftVis]   = useState(true)
  const [rightVis, setRightVis] = useState(true)
  const [detail, setDetail]     = useState<typeof LEFT_NEWS[0] | null>(null)

  function fadeSwitch(
    setVis: (v: boolean) => void,
    setIdx: React.Dispatch<React.SetStateAction<number>>,
    len: number
  ) {
    setVis(false)
    setTimeout(() => {
      setIdx(i => (i + 1) % len)
      setVis(true)
    }, 350)
  }

  useEffect(() => {
    const l = setInterval(() => fadeSwitch(setLeftVis, setLeftIdx, LEFT_NEWS.length), 14000)
    return () => clearInterval(l)
  }, [])

  useEffect(() => {
    const r = setInterval(() => fadeSwitch(setRightVis, setRightIdx, RIGHT_NEWS.length), 18000)
    return () => clearInterval(r)
  }, [])

  const L = LEFT_NEWS[leftIdx]
  const R = RIGHT_NEWS[rightIdx]

  const NewsItem = ({ item, vis }: { item: typeof LEFT_NEWS[0]; vis: boolean }) => (
    <div
      onClick={() => setDetail(item)}
      style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        flex: 1, minWidth: 0, cursor: "pointer",
        opacity: vis ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}>
      <span style={{
        background: item.color + "20", color: item.color,
        borderRadius: "20px", padding: "0.12rem 0.45rem",
        fontSize: "0.58rem", fontWeight: 700, flexShrink: 0,
        border: `1px solid ${item.color}30`,
      }}>
        {item.icon} {item.tag}
      </span>
      <span style={{ fontSize: "0.72rem", color: "var(--text)", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {item.text}
      </span>
      <span style={{ fontSize: "0.58rem", color: "var(--accent)", flexShrink: 0, fontWeight: 700 }}>›</span>
    </div>
  )

  return (
    <>
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "0.55rem 1rem",
        display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: "0.75rem",
        alignItems: "center",
      }}>
        <NewsItem item={L} vis={leftVis} />
        <div style={{ height: "28px", background: "var(--border)" }} />
        <NewsItem item={R} vis={rightVis} />
      </div>
      {detail && <NewsDetailSheet item={detail} onClose={() => setDetail(null)} />}
    </>
  )
}

// ── Ingredient Modal ───────────────────────────────────────────────────────
function IngredientModal({ issue, onClose }: { issue: string; onClose: () => void }) {
  const info = INGREDIENT_INFO[issue]
  if (!info) return null
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(16px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={onClose}>
      <div style={{ background: "var(--surface)", border: `1px solid ${info.color}33`, borderRadius: "22px", maxWidth: "500px", width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "1.75rem 1.75rem 1rem", borderBottom: `1px solid ${info.color}22`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.4rem" }}>{info.emoji}</div>
            <h2 style={{ fontWeight: 900, fontSize: "1.3rem", color: info.color, margin: 0 }}>{info.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.4rem" }}>×</button>
        </div>
        <div style={{ padding: "1.25rem 1.75rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {info.body.map((b, i) => (
            <div key={i} style={{ background: "var(--surface-2)", border: `1px solid ${info.color}18`, borderLeft: `3px solid ${info.color}`, borderRadius: "12px", padding: "1rem", display: "flex", gap: "0.85rem" }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{b.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: info.color, marginBottom: "0.25rem" }}>{b.label}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.65 }}>{b.text}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ margin: "0 1.75rem 1.75rem", padding: "0.9rem 1.1rem", background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "10px", fontSize: "0.8rem", color: "var(--accent)" }}>
          💡 <strong>Tipp:</strong> {info.tip}
        </div>
      </div>
    </div>
  )
}

// ── Product Detail Modal (Bottom Sheet) ────────────────────────────────────
function ProductDetailModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const info = INGREDIENT_INFO[product.issue]
  const [imgError, setImgError] = useState(false)
  const hasImg = product.img && !imgError

  // Try to find a matching scan in local history and use the API-based score
  const scoreOverride = React.useMemo<ProductScoreResult | undefined>(() => {
    try {
      const raw = localStorage.getItem("true-scan-history")
      if (!raw) return undefined
      const history: Array<{
        query?: string; corpName?: string; result?: {
          found?: boolean
          corporation?: { name: string; severity: string; aliases: string[] }
          categories?: { id: string; name: string }[]
          evidence?: { level?: string }[]
        }
      }> = JSON.parse(raw)

      const needle = [product.name, product.brand].map(s => s.toLowerCase())

      const match = history.find(h => {
        if (!h.result?.found) return false
        const haystack = [
          h.query ?? "",
          h.corpName ?? "",
          h.result?.corporation?.name ?? "",
          ...(h.result?.corporation?.aliases ?? []),
        ].map(s => s.toLowerCase())
        return needle.some(n => haystack.some(hay => hay.includes(n) || n.includes(hay)))
      })

      if (!match?.result?.corporation) return undefined
      const { corporation, categories = [], evidence = [] } = match.result
      return calcScoreFromSeverity(
        corporation.severity,
        corporation.aliases ?? [],
        categories,
        evidence,
        [],
      )
    } catch {
      return undefined
    }
  }, [product.name, product.brand])

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface)", borderRadius: "24px 24px 0 0",
          width: "100%", maxWidth: "520px",
          maxHeight: "88vh", overflowY: "auto",
          animation: "slideUp 0.3s cubic-bezier(.22,1,.36,1)",
          border: `1px solid ${product.color}33`, borderBottom: "none",
        }}
      >
        {/* Hero image or colored emoji header */}
        <div style={{ position: "relative", height: "200px", flexShrink: 0, background: `linear-gradient(135deg, ${product.color}55 0%, ${product.color}22 100%)` }}>
          {hasImg ? (
            <img
              src={product.img}
              alt={product.name}
              onError={() => setImgError(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6rem" }}>
              {product.emoji}
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85) 100%)" }} />
          {/* Close pill */}
          <button onClick={onClose} style={{
            position: "absolute", top: "1rem", right: "1rem",
            background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", borderRadius: "50%", width: "34px", height: "34px",
            cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
          {/* Brand + name */}
          <div style={{ position: "absolute", bottom: "1rem", left: "1.25rem" }}>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.2rem" }}>{product.brand}</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>{product.name}</h2>
          </div>
          {/* Color accent line */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: product.color }} />
        </div>

        {/* Content */}
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {/* Issues */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "1rem" }}>
            {product.issues.map((issue, i) => (
              <span key={i} style={{
                background: product.color + "18", color: product.color,
                border: `1px solid ${product.color}44`,
                borderRadius: "20px", padding: "0.3rem 0.75rem",
                fontSize: "0.8rem", fontWeight: 700,
              }}>{issue}</span>
            ))}
          </div>

          {/* Safety Score */}
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "14px", padding: "0.9rem 1rem", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.6rem" }}>TRUE Sicherheits-Score</div>
            <ProductScore issues={product.issues} size="md" showTip isPremium={false} scoreOverride={scoreOverride} />
          </div>

          {/* Ingredient deep-dive */}
          {info && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{info.emoji}</span>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", color: info.color, margin: 0 }}>Warum problematisch?</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.1rem" }}>
                {info.body.map((b, i) => (
                  <div key={i} style={{
                    background: "var(--surface-2)", borderLeft: `3px solid ${info.color}`,
                    borderRadius: "10px", padding: "0.85rem",
                    display: "flex", gap: "0.75rem",
                  }}>
                    <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{b.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.8rem", color: info.color, marginBottom: "0.2rem" }}>{b.label}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.6 }}>{b.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Tip */}
              <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "10px", padding: "0.85rem 1rem", fontSize: "0.8rem", color: "var(--accent)", marginBottom: "1.25rem" }}>
                💡 <strong>Tipp:</strong> {info.tip}
              </div>
            </>
          )}

          {/* Spacer for bottom nav */}
          <div style={{ height: "1rem" }} />
        </div>
      </div>
    </div>
  )
}

// ── Konzern im Fokus ──────────────────────────────────────────────────────
function dayIndex() { return Math.floor(Date.now() / 86_400_000) }

const KONZERNE = [
  {
    name: "Nestlé",
    emoji: "☕",
    color: "#ff4455",
    category: "Lebensmittel & Wasser",
    facts: [
      "Entzieht in Dürreregionen Millionen Liter Grundwasser — teils ohne gültige Genehmigung",
      "Vermarktet Babynahrung in Entwicklungsländern gegen WHO-Empfehlungen",
      "Besitzt über 2.000 Marken — von KitKat bis Nescafé bis San Pellegrino",
    ],
    source: "WHO / US Forest Service 2023",
  },
  {
    name: "Coca-Cola",
    emoji: "🥤",
    color: "#ff2233",
    category: "Getränke & Plastik",
    facts: [
      "Größter Plastik-Verschmutzer der Welt — 6 Jahre in Folge laut Brand Audit",
      "Entnimmt täglich 1,8 Milliarden Liter Grundwasser weltweit",
      "Kämpft juristisch gegen staatliche Zuckersteuer in mehreren Ländern",
    ],
    source: "Break Free From Plastic / TU Berlin 2023",
  },
  {
    name: "Bayer / Monsanto",
    emoji: "☠️",
    color: "#cc66ff",
    category: "Agrochemie",
    facts: [
      "Glyphosat (Roundup) von WHO-Agentur IARC als 'wahrscheinlich krebserregend' eingestuft",
      "Zahlte 13 Milliarden USD Schadensersatz in US-Sammelklagen",
      "Verkauft Pestizide in Ländern, die in der EU längst verboten sind",
    ],
    source: "IARC / US District Courts 2023",
  },
  {
    name: "PepsiCo",
    emoji: "🌽",
    color: "#ffaa00",
    category: "Snacks & Getränke",
    facts: [
      "Zweitgrößter Plastik-Verschmutzer weltweit nach Coca-Cola",
      "Lay's und Doritos enthalten hochverarbeitete Zusatzstoffe (NOVA Gruppe 4)",
      "Vermarktet zuckerreiche Produkte gezielt an Kinder in Schwellenländern",
    ],
    source: "BFFP Brand Audit / NOVA 2023",
  },
  {
    name: "Unilever",
    emoji: "🧴",
    color: "#44aaff",
    category: "Konsumgüter",
    facts: [
      "Einer der größten Palmöl-Käufer weltweit — trotz Nachhaltigkeitsversprechen",
      "Klagte gegen Ben & Jerry's (eigene Marke!) wegen Boykott-Aussagen",
      "85 % der Plastikverpackungen nicht recycelbar",
    ],
    source: "Rainforest Action Network / Guardian 2022",
  },
  {
    name: "Amazon",
    emoji: "📦",
    color: "#ffcc00",
    category: "Tech & Logistik",
    facts: [
      "Vernichtete 2021 offiziell über 3 Millionen unverkaufte Artikel — täglich",
      "Lagerarbeiter haben doppelt so hohe Verletzungsrate wie US-Branchendurchschnitt",
      "Zahlt in Luxemburg effektiven Steuersatz von unter 1 % auf EU-Gewinne",
    ],
    source: "ITV / OSHA / EU Commission 2022",
  },
  {
    name: "Shell",
    emoji: "🛢️",
    color: "#ff7700",
    category: "Energie & Öl",
    facts: [
      "Im Niger-Delta verursachte Shell Ölpesten, die 50 Jahre zur Sanierung benötigen",
      "Holländisches Gericht verurteilte Shell zu CO₂-Reduzierung — Konzern ignorierte Urteil",
      "Investierte 2022 mehr in neue Ölfelder als in erneuerbare Energien",
    ],
    source: "UN / Haager Gericht 2021–2023",
  },
]

function KonzernImFokus() {
  const konzern = KONZERNE[dayIndex() % KONZERNE.length]
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${konzern.color}33`,
        borderRadius: "16px",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Color bar */}
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${konzern.color}, ${konzern.color}44)` }} />

      {/* Header */}
      <div style={{ padding: "1rem 1.1rem 0.85rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "14px", flexShrink: 0,
          background: `linear-gradient(135deg, ${konzern.color}33, ${konzern.color}11)`,
          border: `1px solid ${konzern.color}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.75rem",
        }}>
          {konzern.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem" }}>
            <span style={{ background: konzern.color + "18", color: konzern.color, border: `1px solid ${konzern.color}33`, borderRadius: "20px", padding: "0.1rem 0.5rem", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.04em" }}>
              🔍 KONZERN IM FOKUS
            </span>
            <span style={{ fontSize: "0.6rem", color: "var(--text-dim)", fontWeight: 600 }}>Täglich neu</span>
          </div>
          <div style={{ fontWeight: 900, fontSize: "1.15rem", letterSpacing: "-0.02em", color: "var(--text)" }}>{konzern.name}</div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontWeight: 600 }}>{konzern.category}</div>
        </div>
        <span style={{ fontSize: "1.1rem", color: "var(--text-dim)", transition: "transform 0.25s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>⌄</span>
      </div>

      {/* Facts — always show first, expand to show all */}
      <div style={{ padding: "0 1.1rem", paddingBottom: expanded ? "0" : "0.85rem" }}>
        <div style={{
          background: konzern.color + "0d",
          border: `1px solid ${konzern.color}22`,
          borderLeft: `3px solid ${konzern.color}`,
          borderRadius: "10px",
          padding: "0.7rem 0.9rem",
          fontSize: "0.82rem",
          color: "var(--text)",
          lineHeight: 1.55,
        }}>
          {konzern.facts[0]}
        </div>
      </div>

      {/* Expanded facts */}
      {expanded && (
        <div style={{ padding: "0.5rem 1.1rem 0" }}>
          {konzern.facts.slice(1).map((fact, i) => (
            <div key={i} style={{
              background: konzern.color + "0d",
              border: `1px solid ${konzern.color}22`,
              borderLeft: `3px solid ${konzern.color}88`,
              borderRadius: "10px",
              padding: "0.7rem 0.9rem",
              fontSize: "0.82rem",
              color: "var(--text)",
              lineHeight: 1.55,
              marginBottom: "0.5rem",
            }}>
              {fact}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "0.75rem 1.1rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${konzern.color}18`, marginTop: "0.75rem" }}>
        <span style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>📰 Quelle: {konzern.source}</span>
        <Link
          href="/community"
          onClick={e => e.stopPropagation()}
          style={{ background: konzern.color + "18", color: konzern.color, border: `1px solid ${konzern.color}33`, borderRadius: "20px", padding: "0.25rem 0.7rem", fontSize: "0.7rem", fontWeight: 700, textDecoration: "none" }}
        >
          Community →
        </Link>
      </div>
    </div>
  )
}

// ── Nearby stores helper ────────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}
async function fetchNearbyStores(lat: number, lng: number) {
  const q = `[out:json][timeout:10];(node["shop"="organic"](around:4000,${lat},${lng});node["shop"="health_food"](around:4000,${lat},${lng});node["name"~"Alnatura|denn|Denns|Reformhaus|BioCompany|Biomarkt",i](around:5000,${lat},${lng}););out body 6;`
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`)
  const data = await res.json()
  type OsmEl = { tags: { name?: string; shop?: string }; lat: number; lon: number }
  const seen = new Set<string>()
  return (data.elements as OsmEl[])
    .filter(el => el.tags?.name && !seen.has(el.tags.name) && seen.add(el.tags.name))
    .map(el => ({
      name: el.tags.name!,
      type: el.tags.shop === "organic" ? "🌿 Bioladen" : el.tags.shop === "health_food" ? "💊 Reformhaus" : "🛒 Biosortiment",
      dist: haversine(lat, lng, el.lat, el.lon),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4)
}

// ── Category colors (mirrors list/page.tsx) ────────────────────────────────
const CAT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  produce:   { color: "#22cc6e", bg: "rgba(34,204,110,0.10)",   border: "rgba(34,204,110,0.25)"  },
  dairy:     { color: "#44aaff", bg: "rgba(68,170,255,0.10)",   border: "rgba(68,170,255,0.25)"  },
  bread:     { color: "#ff8833", bg: "rgba(255,136,51,0.10)",   border: "rgba(255,136,51,0.25)"  },
  pasta:     { color: "#ffcc00", bg: "rgba(255,204,0,0.10)",    border: "rgba(255,204,0,0.25)"   },
  snacks:    { color: "#cc66ff", bg: "rgba(204,102,255,0.10)",  border: "rgba(204,102,255,0.25)" },
  drinks:    { color: "#00ccff", bg: "rgba(0,204,255,0.10)",    border: "rgba(0,204,255,0.25)"   },
  meat:      { color: "#ff4455", bg: "rgba(255,68,85,0.10)",    border: "rgba(255,68,85,0.25)"   },
  frozen:    { color: "#88eeff", bg: "rgba(136,238,255,0.10)",  border: "rgba(136,238,255,0.25)" },
  household: { color: "#aaaacc", bg: "rgba(170,170,204,0.10)",  border: "rgba(170,170,204,0.25)" },
}

// ── Main Home Page ─────────────────────────────────────────────────────────

export default function HomePage() {
  const [greeting, setGreeting]       = useState("Guten Tag")
  const [modal, setModal]             = useState<string | null>(null)
  const [productModal, setProductModal] = useState<Product | null>(null)
  const [listItems, setListItems]     = useState<{ id: number|string; name: string; emoji: string; brand?: string; severity?: string; issue?: string; alternative?: { name: string }; checked: boolean; personId?: string; category?: string }[]>([])
  const [severityModal, setSeverityModal] = useState<typeof listItems[0] | null>(null)
  const [familyMembers, setFamilyMembers] = useState<{ id: string; name: string; age: string; emoji: string; avatarUrl?: string }[]>([])
  const [activeListPerson, setActiveListPerson] = useState<string>("all")
  const [inviteMember, setInviteMember] = useState<{ id: string; name: string; emoji: string } | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [personSheetTab, setPersonSheetTab] = useState<"manual" | "invite">("manual")
  const [inviteName, setInviteName]   = useState("")
  const [inviteEmoji, setInviteEmoji] = useState("👤")
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [listSearch, setListSearch]   = useState("")
  const [listExpanded, setListExpanded] = useState(false)
  const [openMenu, setOpenMenu]       = useState<number|string|null>(null)
  const [menuSheetItem, setMenuSheetItem] = useState<typeof listItems[0] | null>(null)
  const [itemQty, setItemQty]         = useState<Record<number|string, number>>({})
  const [itemComment, setItemComment] = useState<Record<number|string, string>>({})
  const [itemTagged, setItemTagged]   = useState<Record<number|string, string>>({})
  const [tagMessages, setTagMessages] = useState<Record<number|string, { from: string; msg: string; reply?: string }[]>>({})
  const [commentModal, setCommentModal] = useState<typeof listItems[0] | null>(null)
  const [altModal, setAltModal]         = useState<{ name: string; productName: string; productEmoji: string; price?: string } | null>(null)
  const [showWelcome, setShowWelcome]   = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [invitedBy, setInvitedBy]       = useState("")
  const [invitedByPhoto, setInvitedByPhoto] = useState("")
  const [invitedByEmoji, setInvitedByEmoji] = useState("👤")
  const [justJoined, setJustJoined]     = useState("")
  const [justJoinedPhoto, setJustJoinedPhoto] = useState("")
  const [showCommunityCard, setShowCommunityCard] = useState(true)
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([])
  const [mapOpen, setMapOpen]         = useState(false)
  const [userGoals, setUserGoals]     = useState<string[]>([])
  const [userName, setUserName]       = useState("")
  const [isPremium, setIsPremium]     = useState(false)
  const [premiumToast, setPremiumToast] = useState("")
  const [quickAdd, setQuickAdd]       = useState("")
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [activeCat, setActiveCat]     = useState<string>("all")
  const [isDark, setIsDark]           = useState(false)
  const [coachOpen, setCoachOpen]     = useState(false)
  const [viewMode, setViewMode]       = useState<"list" | "grid">("list")
  const [showSortSheet, setShowSortSheet] = useState(false)
  const [showPersonSheet, setShowPersonSheet] = useState(false)
  const [showFeedSection, setShowFeedSection] = useState(true)
  const [newPersonName, setNewPersonName]     = useState("")
  const [newPersonAge, setNewPersonAge]       = useState("")
  const [newPersonEmoji, setNewPersonEmoji]   = useState("🧒")
  const tapCountRef                   = useRef(0)
  const tapTimerRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleLogoTap() {
    tapCountRef.current += 1
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0 }, 1500)
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0
      const next = localStorage.getItem("true-premium") !== "1"
      localStorage.setItem("true-premium", next ? "1" : "0")
      setIsPremium(next)
      setPremiumToast(next ? "👑 Premium aktiviert!" : "Premium deaktiviert")
      setTimeout(() => setPremiumToast(""), 2500)
    }
  }

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 11) setGreeting("Guten Morgen")
    else if (h < 17) setGreeting("Guten Tag")
    else setGreeting("Guten Abend")
    setIsPremium(localStorage.getItem("true-premium") === "1")
    if (localStorage.getItem("true-community-card-dismissed") === "1") setShowCommunityCard(false)
    // Auto-follow the official TRUE channel for every user
    try {
      const fc = localStorage.getItem("true-followed-channels")
      const arr: string[] = fc ? JSON.parse(fc) : []
      if (!arr.includes("true")) {
        arr.push("true")
        localStorage.setItem("true-followed-channels", JSON.stringify(arr))
      }
    } catch {}
    // Invite banner — shown when arriving via invite link (the invitee sees this)
    const invBy = localStorage.getItem("true-invited-by")
    if (invBy) {
      setInvitedBy(invBy)
      setInvitedByPhoto(localStorage.getItem("true-invited-by-photo") || "")
      setInvitedByEmoji(localStorage.getItem("true-invited-by-emoji") || "👤")
    }
    // "Just joined" banner — shown to the HOST when someone joined their list
    const joined = localStorage.getItem("true-just-joined")
    if (joined) {
      setJustJoined(joined)
      setJustJoinedPhoto(localStorage.getItem("true-just-joined-photo") || "")
      localStorage.removeItem("true-just-joined")
      localStorage.removeItem("true-just-joined-photo")
    }
    // First-login welcome card — auto-dismiss after 7s
    if (!localStorage.getItem("true-welcome-seen")) {
      setShowWelcome(true)
      setTimeout(() => { setShowWelcome(false); localStorage.setItem("true-welcome-seen", "1") }, 7000)
    }
    // Confetti for brand-new users coming from onboarding
    if (localStorage.getItem("true-new-user") === "1") {
      localStorage.removeItem("true-new-user")
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3500)
    }
    // Dark mode detection
    setIsDark(document.documentElement.classList.contains("dark"))
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  // Load user goals + name from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("true-profile")
      if (raw) {
        const p = JSON.parse(raw)
        if (Array.isArray(p.goals) && p.goals.length > 0) setUserGoals(p.goals)
        const vn = p.vorname || p.name || ""
        if (vn) setUserName(vn.split(" ")[0])
      }
    } catch {}
  }, [])

  // Load real shopping list items + family members from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("shopping-list-items-v1")
      if (raw) {
        const parsed: Array<{ id: number|string; name: string; emoji?: string; brand?: string; severity?: string; issue?: string; alternative?: { name: string }; checked?: boolean; personId?: string; category?: string }> = JSON.parse(raw)
        setListItems(parsed.map(it => ({
          id: it.id,
          name: it.name,
          emoji: it.emoji ?? "🛒",
          brand: it.brand,
          severity: it.severity,
          issue: it.issue,
          alternative: it.alternative,
          checked: it.checked ?? false,
          personId: it.personId,
          category: it.category,
        })))
      }
    } catch {}
    try {
      const fm = localStorage.getItem("true-family-members")
      if (fm) {
        const members = JSON.parse(fm)
        // Sync own avatar into any member that matches the current profile
        const myPhoto = localStorage.getItem("true-profile-photo")
        const myProfile = JSON.parse(localStorage.getItem("true-profile") || "{}")
        const myName = myProfile.vorname || myProfile.name || ""
        if (myPhoto && myName) {
          const updated = members.map((m: any) =>
            m.name === myName ? { ...m, avatarUrl: myPhoto } : m
          )
          setFamilyMembers(updated)
        } else {
          setFamilyMembers(members)
        }
      }
    } catch {}
    try {
      const tm = localStorage.getItem("true-tag-messages")
      if (tm) setTagMessages(JSON.parse(tm))
    } catch {}
    try {
      const jc = localStorage.getItem("true-joined-communities")
      if (jc) setJoinedCommunities(JSON.parse(jc))
    } catch {}
  }, [])

  // Erledigte Items permanent löschen
  function clearCheckedItems() {
    setListItems(prev => {
      const next = prev.filter(it => !it.checked)
      try {
        localStorage.setItem("shopping-list-items-v1", JSON.stringify(next))
      } catch {}
      return next
    })
  }

  // Komplette Liste leeren
  function clearAllItems() {
    setListItems([])
    try { localStorage.setItem("shopping-list-items-v1", JSON.stringify([])) } catch {}
  }

  // Persist checked state back to the shared localStorage key
  function toggleListItem(id: number|string) {
    setListItems(prev => {
      const next = prev.map(it => it.id === id ? { ...it, checked: !it.checked } : it)
      // Sync to the full list (update only the checked field)
      try {
        const raw = localStorage.getItem("shopping-list-items-v1")
        if (raw) {
          const full = JSON.parse(raw)
          const updated = full.map((it: { id: number|string; checked?: boolean }) =>
            it.id === id ? { ...it, checked: !it.checked } : it
          )
          localStorage.setItem("shopping-list-items-v1", JSON.stringify(updated))
        }
      } catch {}
      return next
    })
  }

  // feedPost removed — not rendered anywhere (dead code cleanup)

  // ── Scroll-Lock wenn Quick-Add offen (verhindert Seiten-Scroll bei Tastatur) ──
  useEffect(() => {
    if (!showQuickAdd) return
    const y = window.scrollY
    document.body.style.overflow = "hidden"
    document.body.style.position = "fixed"
    document.body.style.top = `-${y}px`
    document.body.style.width = "100%"
    return () => {
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
      window.scrollTo(0, y)
    }
  }, [showQuickAdd])

  // Kleiner Katalog für Suchvorschläge (mit Kategorie)
  const QUICK_CATALOG = [
    { name: "Wasser",        emoji: "💧", category: "drinks"    },
    { name: "Milch",         emoji: "🥛", category: "dairy"     },
    { name: "Brot",          emoji: "🍞", category: "bread"     },
    { name: "Butter",        emoji: "🧈", category: "dairy"     },
    { name: "Eier",          emoji: "🥚", category: "dairy"     },
    { name: "Joghurt",       emoji: "🍶", category: "dairy"     },
    { name: "Käse",          emoji: "🧀", category: "dairy"     },
    { name: "Äpfel",         emoji: "🍎", category: "produce"   },
    { name: "Bananen",       emoji: "🍌", category: "produce"   },
    { name: "Tomaten",       emoji: "🍅", category: "produce"   },
    { name: "Karotten",      emoji: "🥕", category: "produce"   },
    { name: "Kartoffeln",    emoji: "🥔", category: "produce"   },
    { name: "Nudeln",        emoji: "🍝", category: "pasta"     },
    { name: "Reis",          emoji: "🍚", category: "pasta"     },
    { name: "Müsli",         emoji: "🥣", category: "pasta"     },
    { name: "KitKat",        emoji: "🍫", category: "snacks"    },
    { name: "Nutella",       emoji: "🫙", category: "snacks"    },
    { name: "Coca-Cola",     emoji: "🥤", category: "drinks"    },
    { name: "Nescafé",       emoji: "☕", category: "drinks"    },
    { name: "Persil",        emoji: "🧺", category: "household" },
    { name: "Ariel",         emoji: "🧺", category: "household" },
    { name: "Hähnchen",      emoji: "🍗", category: "meat"      },
    { name: "Hackfleisch",   emoji: "🥩", category: "meat"      },
    { name: "Fisch",         emoji: "🐟", category: "meat"      },
    { name: "Olivenöl",      emoji: "🫒", category: "other"     },
    { name: "Mehl",          emoji: "🌾", category: "pasta"     },
    { name: "Zucker",        emoji: "🍬", category: "other"     },
    { name: "Salz",          emoji: "🧂", category: "other"     },
    { name: "Kaffee",        emoji: "☕", category: "drinks"    },
    { name: "Tee",           emoji: "🍵", category: "drinks"    },
    { name: "Spaghetti",     emoji: "🍝", category: "pasta"     },
    { name: "Hafermilch",    emoji: "🥛", category: "drinks"    },
    { name: "Orangensaft",   emoji: "🍊", category: "drinks"    },
    { name: "Apfelsaft",     emoji: "🧃", category: "drinks"    },
    { name: "Chips",         emoji: "🥔", category: "snacks"    },
    { name: "Kekse",         emoji: "🍪", category: "snacks"    },
    { name: "Schokolade",    emoji: "🍫", category: "snacks"    },
    { name: "Zahnpasta",     emoji: "🦷", category: "household" },
    { name: "Shampoo",       emoji: "🧴", category: "household" },
    { name: "Waschmittel",   emoji: "🧺", category: "household" },
    { name: "Spülmittel",    emoji: "🫧", category: "household" },
    { name: "Paprika",       emoji: "🫑", category: "produce"   },
    { name: "Zwiebeln",      emoji: "🧅", category: "produce"   },
    { name: "Knoblauch",     emoji: "🧄", category: "produce"   },
    { name: "Spinat",        emoji: "🥬", category: "produce"   },
    { name: "Gurke",         emoji: "🥒", category: "produce"   },
    { name: "Zitrone",       emoji: "🍋", category: "produce"   },
    { name: "Erdbeeren",     emoji: "🍓", category: "produce"   },
    { name: "Trauben",       emoji: "🍇", category: "produce"   },
    { name: "Aufschnitt",    emoji: "🥩", category: "meat"      },
    { name: "Tofu",          emoji: "🌿", category: "produce"   },
    { name: "Hummus",        emoji: "🫙", category: "other"     },
    { name: "Nüsse",         emoji: "🥜", category: "snacks"    },
    { name: "Mandeln",       emoji: "🥜", category: "snacks"    },
    { name: "Müsliriegel",   emoji: "🍫", category: "snacks"    },
    { name: "Cornflakes",    emoji: "🥣", category: "pasta"     },
    { name: "Haferflocken",  emoji: "🥣", category: "pasta"     },
    { name: "Quark",         emoji: "🥛", category: "dairy"     },
    { name: "Sahne",         emoji: "🥛", category: "dairy"     },
    { name: "Sprudel",       emoji: "💧", category: "drinks"    },
    { name: "Lachs",         emoji: "🐟", category: "meat"      },
    { name: "Red Bull",      emoji: "⚡", category: "drinks"    },
    { name: "Fanta",         emoji: "🥤", category: "drinks"    },
    { name: "Brokkoli",      emoji: "🥦", category: "produce"   },
    { name: "Avocado",       emoji: "🥑", category: "produce"   },
    { name: "Blaubeeren",    emoji: "🫐", category: "produce"   },
    { name: "Wurst",         emoji: "🥩", category: "meat"      },
    { name: "Pizza",         emoji: "🍕", category: "frozen"    },
  ]

  const COMMUNITY_TOPICS = [
    { id: "palmoil",  name: "Palmöl-Frei",      icon: "🌳", color: "#2ECC8A", preview: "Welche Produkte sind wirklich palmölfrei? Mitglieder teilen ihre Erfahrungen." },
    { id: "plastik",  name: "Plastikfrei",       icon: "🌊", color: "#44aaff", preview: "Tipps für weniger Plastik im Alltag — von der Community gesammelt." },
    { id: "wasser",   name: "Wasserrechte",      icon: "💧", color: "#66ccff", preview: "Nestlé, Coca-Cola & Co. — was wirklich mit unserem Grundwasser passiert." },
    { id: "bio",      name: "Regional & Bio",    icon: "🌿", color: "#88ff66", preview: "Regionale Alternativen zu Supermarkt-Produkten entdecken." },
    { id: "chemfrei", name: "Chemikalien-Check", icon: "☠️", color: "#cc66ff", preview: "PFAS, Glyphosat & Co — die Community prüft Inhaltsstoffe." },
    { id: "bewusst",  name: "Bewusst Leben",     icon: "✨", color: "#ffcc00", preview: "Lifestyle-Tipps für bewussteren Konsum — täglich neue Beiträge." },
  ]

  function addFromCatalog(item: { name: string; emoji: string; category?: string }) {
    const personId = activeListPerson !== "all" && activeListPerson !== "mine" ? activeListPerson : undefined
    const newItem = {
      id: `quick-${Date.now()}`,
      name: item.name,
      emoji: item.emoji,
      checked: false,
      category: item.category ?? guessCategory(item.name),
      personId,
    }
    setListItems(prev => {
      if (prev.find(it => it.name === item.name)) return prev
      const next = [...prev, newItem]
      try {
        const raw = localStorage.getItem("shopping-list-items-v1")
        const current = raw ? JSON.parse(raw) : []
        if (!current.find((it: { name: string }) => it.name === item.name)) {
          localStorage.setItem("shopping-list-items-v1", JSON.stringify([...current, newItem]))
        }
      } catch {}
      return next
    })
    setListSearch("")
  }

  function sendTagMessage(itemId: number|string, memberId: string, msg: string) {
    const updated = { ...tagMessages }
    if (!updated[itemId]) updated[itemId] = []
    updated[itemId] = [...updated[itemId].filter(m => m.from !== userName), { from: userName || "Du", msg }]
    localStorage.setItem("true-tag-messages", JSON.stringify(updated))
    setTagMessages(updated)
    setItemTagged(t => ({ ...t, [itemId]: memberId }))
  }

  return (
    <>
    {/* ── Konfetti für neue Nutzer ── */}
    {showConfetti && (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: 60 }).map((_, i) => {
          const colors = ["#2ECC8A","#ffd700","#ff6b6b","#38BDF8","#a78bfa","#fb923c"]
          const color  = colors[i % colors.length]
          const left   = `${Math.random() * 100}%`
          const delay  = `${Math.random() * 1.2}s`
          const dur    = `${2.2 + Math.random() * 1.2}s`
          const size   = `${6 + Math.random() * 8}px`
          return (
            <div key={i} style={{
              position: "absolute", top: "-20px", left,
              width: size, height: size,
              background: color, borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              animation: `confettiFall ${dur} ${delay} ease-in forwards`,
              opacity: 0.9,
            }} />
          )
        })}
        <style>{`
          @keyframes confettiFall {
            0%   { transform: translateY(0)    rotate(0deg);   opacity: 1 }
            80%  { opacity: 1 }
            100% { transform: translateY(105vh) rotate(720deg); opacity: 0 }
          }
        `}</style>
      </div>
    )}
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: "140px" }}>
      {/* ── ALTERNATIVE BOTTOM SHEET ── */}
      {altModal && (() => {
        // Preis nach Original-Produktname → realistische Marktpreise
        const ALT_PRICES: Record<string, string> = {
          // Aufstriche & Süßes
          "nutella": "2,99 €", "nuss-nougat": "2,99 €", "haselnuss": "2,49 €",
          "nocciolata": "4,50 €", "zotter": "3,80 €", "vivani": "2,50 €",
          "schokolade": "1,79 €", "kakao": "2,29 €", "konfitüre": "1,79 €",
          "honig": "3,99 €", "marmelade": "1,69 €",
          // Getränke
          "coca-cola": "1,09 €", "cola": "1,09 €", "pepsi": "1,09 €",
          "limonade": "0,99 €", "bionade": "1,29 €", "fritz": "1,50 €",
          "saft": "2,49 €", "voelkel": "2,50 €", "innocent": "3,49 €",
          "wasser": "0,29 €", "mineralwasser": "0,35 €",
          "kaffee": "4,99 €", "nescafé": "4,99 €", "tee": "2,49 €",
          "milch": "1,19 €", "hafermilch": "1,69 €", "oatly": "1,99 €",
          "mandelmilch": "2,29 €", "alpro": "1,89 €",
          // Waschmittel & Reinigung
          "persil": "5,49 €", "ariel": "5,49 €", "waschmittel": "4,99 €",
          "frosch": "2,29 €", "ecover": "7,50 €", "sonett": "8,90 €",
          "spülmittel": "1,99 €", "reiniger": "2,49 €",
          // Körperpflege
          "shampoo": "2,95 €", "alverde": "2,95 €", "duschgel": "2,99 €",
          "deodorant": "3,49 €", "weleda": "6,99 €", "lavera": "4,99 €",
          "zahnpasta": "2,49 €", "creme": "4,99 €", "seife": "1,99 €",
          // Snacks & Süßes
          "chips": "1,49 €", "keks": "1,29 €", "riegel": "1,19 €",
          "kitkat": "1,19 €", "müsli": "3,49 €",
          "joghurt": "0,89 €", "andechser": "0,99 €",
          // Lebensmittel
          "butter": "1,89 €", "margarine": "1,49 €", "käse": "2,99 €",
          "wurst": "2,49 €", "fleisch": "4,99 €", "hähnchen": "3,99 €",
          "brot": "2,49 €", "nudeln": "0,99 €", "alnatura nudeln": "1,99 €",
          "reis": "1,49 €", "öl": "3,99 €", "olivenöl": "4,99 €",
          "mehl": "0,89 €", "zucker": "1,29 €", "salz": "0,59 €",
        }
        const prodLow = altModal.productName.toLowerCase()
        const altLow  = altModal.name.toLowerCase()
        // Erst genaue Treffer, dann Teil-Treffer
        const matchedPrice =
          Object.entries(ALT_PRICES).find(([k]) => altLow === k)?.[1] ??
          Object.entries(ALT_PRICES).find(([k]) => altLow.includes(k))?.[1] ??
          Object.entries(ALT_PRICES).find(([k]) => prodLow.includes(k))?.[1]
        const displayPrice = altModal.price ?? matchedPrice ?? "2,49 €"

        return (
        <div onClick={() => setAltModal(null)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s cubic-bezier(.22,1,.36,1)" }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "12px auto 0", flexShrink: 0 }} />
            {/* Header */}
            <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(46,204,138,0.15)", border: "1px solid rgba(46,204,138,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>
                {altModal.productEmoji}
              </div>
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>💚 Bessere Alternative</div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>statt {altModal.productName}</div>
              </div>
              <button onClick={() => setAltModal(null)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 }}>×</button>
            </div>

            {/* Scrollbarer Body */}
            <div style={{ overflowY: "auto", padding: "16px 18px 8px", flex: 1 }}>
              {/* Alternativ-Karte mit Preis */}
              <div style={{ background: "rgba(46,204,138,0.08)", border: "1.5px solid rgba(46,204,138,0.3)", borderRadius: 16, padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ fontSize: "0.68rem", color: "var(--accent)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Empfohlene Alternative</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text)" }}>🌿 {altModal.name}</div>
                  <div style={{ background: "rgba(46,204,138,0.2)", color: "var(--accent)", border: "1px solid rgba(46,204,138,0.4)", borderRadius: 99, padding: "4px 10px", fontSize: "0.85rem", fontWeight: 800, flexShrink: 0 }}>
                    ab ~{displayPrice}
                  </div>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
                  Keine problematischen Inhaltsstoffe — eine bewusstere Wahl für dich und die Umwelt.
                </div>
              </div>

              {/* Info-Zeilen (ohne "Scan"-Zeile) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-2)", borderRadius: 10, padding: "10px 12px" }}>
                  <span style={{ fontSize: "1.1rem" }}>🏪</span>
                  <div style={{ fontSize: "0.82rem", color: "var(--text)" }}>In Bio- &amp; Supermärkten erhältlich</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-2)", borderRadius: 10, padding: "10px 12px" }}>
                  <span style={{ fontSize: "1.1rem" }}>✅</span>
                  <div style={{ fontSize: "0.82rem", color: "var(--text)" }}>Ohne Palmöl · Ohne Mikroplastik · Transparent</div>
                </div>
              </div>

              {/* Online suchen */}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(altModal.name + " kaufen Supermarkt")}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: "0.88rem", color: "var(--text)", textDecoration: "none", marginBottom: 8, boxSizing: "border-box" }}
              >
                🔎 Im Internet ansehen
              </a>
            </div>

            {/* Footer — über BottomNav (zIndex 500 > 200) */}
            <div style={{ padding: "10px 18px 24px", flexShrink: 0, borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
              <button
                onClick={() => {
                  addFromCatalog({ name: altModal.name, emoji: "🌿" })
                  setAltModal(null)
                }}
                style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", borderRadius: 12, padding: "13px", fontWeight: 800, fontSize: "0.92rem", cursor: "pointer" }}
              >
                ➕ {altModal.name} zur Liste hinzufügen
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* ── KOMMENTAR BOTTOM SHEET ── */}
      {commentModal && (() => {
        const msgs = tagMessages[commentModal.id] ?? []
        return (
          <div onClick={() => setCommentModal(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 520, maxHeight: "70vh", display: "flex", flexDirection: "column", animation: "slideUp 0.3s cubic-bezier(.22,1,.36,1)" }}>
              {/* Handle */}
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "12px auto 0", flexShrink: 0 }} />
              {/* Header */}
              <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: "1.3rem" }}>{commentModal.emoji}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{commentModal.name}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>{msgs.length} Kommentar{msgs.length !== 1 ? "e" : ""}</div>
                </div>
                <button onClick={() => setCommentModal(null)} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text-dim)" }}>×</button>
              </div>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {msgs.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "0.82rem", paddingTop: "1rem" }}>Noch keine Kommentare</div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ background: "var(--background)", borderRadius: "0 12px 12px 12px", padding: "8px 12px", alignSelf: "flex-start", maxWidth: "85%" }}>
                      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--accent)", marginBottom: 2 }}>{m.from}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text)", lineHeight: 1.5 }}>{m.msg}</div>
                    </div>
                    {m.reply && (
                      <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "12px 0 12px 12px", padding: "8px 12px", alignSelf: "flex-end", maxWidth: "85%" }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--accent)", marginBottom: 2 }}>Antwort</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text)", lineHeight: 1.5 }}>{m.reply}</div>
                      </div>
                    )}
                    {!m.reply && (
                      <div style={{ alignSelf: "flex-end", display: "flex", gap: 6, maxWidth: "85%" }}>
                        <input
                          placeholder="Antworten …"
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              const val = (e.target as HTMLInputElement).value.trim()
                              if (!val) return
                              const updated = { ...tagMessages }
                              updated[commentModal.id] = (updated[commentModal.id] ?? []).map((tm, ti) => ti === i ? { ...tm, reply: val } : tm)
                              localStorage.setItem("true-tag-messages", JSON.stringify(updated))
                              setTagMessages(updated);(e.target as HTMLInputElement).value = ""
                            }
                          }}
                          style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 99, padding: "7px 14px", fontSize: "0.82rem", color: "var(--text)", outline: "none", minWidth: 160 }}
                        />
                        <button onClick={e => {
                          const input = (e.currentTarget.previousSibling as HTMLInputElement)
                          const val = input?.value?.trim()
                          if (!val) return
                          const updated = { ...tagMessages }
                          updated[commentModal.id] = (updated[commentModal.id] ?? []).map((tm, ti) => ti === i ? { ...tm, reply: val } : tm)
                          localStorage.setItem("true-tag-messages", JSON.stringify(updated))
                          setTagMessages(updated); input.value = ""
                        }} style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", border: "none", cursor: "pointer", color: "#000", fontWeight: 700, flexShrink: 0 }}>→</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* New comment input */}
              <div style={{ padding: "10px 16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 }}>
                <input
                  id="new-comment-input"
                  placeholder="Kommentar schreiben …"
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (!val) return
                      const updated = { ...tagMessages }
                      if (!updated[commentModal.id]) updated[commentModal.id] = []
                      updated[commentModal.id] = [...updated[commentModal.id], { from: userName || "Du", msg: val }]
                      localStorage.setItem("true-tag-messages", JSON.stringify(updated))
                      setTagMessages(updated);(e.target as HTMLInputElement).value = ""
                    }
                  }}
                  style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 99, padding: "9px 16px", fontSize: "0.88rem", color: "var(--text)", outline: "none" }}
                />
                <button onClick={() => {
                  const input = document.getElementById("new-comment-input") as HTMLInputElement
                  const val = input?.value?.trim()
                  if (!val) return
                  const updated = { ...tagMessages }
                  if (!updated[commentModal.id]) updated[commentModal.id] = []
                  updated[commentModal.id] = [...updated[commentModal.id], { from: userName || "Du", msg: val }]
                  localStorage.setItem("true-tag-messages", JSON.stringify(updated))
                  setTagMessages(updated); input.value = ""
                }} style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--accent)", border: "none", cursor: "pointer", color: "#000", fontWeight: 800, flexShrink: 0, fontSize: "1rem" }}>→</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── HEADER ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--nav-bg)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", padding: "0 1.25rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span onClick={handleLogoTap} style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.06em", color: "var(--accent)", cursor: "default", userSelect: "none" }}>TRUE</span>
          {isPremium && <span style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", borderRadius: 6, padding: "1px 6px", fontSize: "0.55rem", fontWeight: 900 }}>PREMIUM</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => setShowSortSheet(v => !v)}
            style={{ width: 34, height: 34, borderRadius: 10, background: (activeCat !== "all" || viewMode === "grid") ? "var(--accent)" : "var(--surface-2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", color: (activeCat !== "all" || viewMode === "grid") ? "#000" : "var(--text-dim)" }}
            aria-label="Ansicht & Filter"
          >{viewMode === "grid" ? "⊞" : "☰"}</button>
          <ThemeIcon />
          <NotificationBell />
        </div>
      </header>

      {/* Premium Toast */}
      {premiumToast && (
        <div style={{ position: "fixed", top: 64, left: "50%", transform: "translateX(-50%)", background: "var(--surface)", color: "var(--text)", borderRadius: 12, padding: "0.6rem 1.2rem", fontWeight: 700, fontSize: "0.88rem", zIndex: 999, boxShadow: "var(--shadow)", border: "1px solid rgba(255,215,0,0.4)", whiteSpace: "nowrap" }}>
          {premiumToast}
        </div>
      )}

      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "1rem 1rem 0.5rem" }}>

        {/* ── JOINED BANNER (shown to host when someone joined) ── */}
        {justJoined && (
          <div style={{ background: "linear-gradient(135deg, rgba(46,204,138,0.18), rgba(46,204,138,0.06))", border: "1.5px solid rgba(46,204,138,0.5)", borderRadius: 18, padding: "14px 18px", marginBottom: 10, position: "relative", animation: "fadeUp 0.4s ease", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setJustJoined("")}
              style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}>✕</button>
            {justJoinedPhoto
              ? <img src={justJoinedPhoto} alt={justJoined} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)", flexShrink: 0 }} />
              : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(46,204,138,0.2)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1rem", color: "var(--accent)", flexShrink: 0 }}>
                  {justJoined.charAt(0).toUpperCase()}
                </div>
            }
            <div style={{ flex: 1, paddingRight: 20 }}>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--accent)", marginBottom: 2 }}>✅ {justJoined} ist beigetreten!</div>
              <div style={{ fontSize: "0.73rem", color: "var(--text-dim)" }}>Jetzt gemeinsam einkaufen</div>
            </div>
          </div>
        )}

        {/* ── INVITE BANNER (shown first, on top) ── */}
        {invitedBy && (
          <div style={{ background: "linear-gradient(135deg, rgba(46,204,138,0.15), rgba(46,204,138,0.05))", border: "1.5px solid rgba(46,204,138,0.4)", borderRadius: 18, padding: "16px 18px", marginBottom: 10, position: "relative", animation: "fadeUp 0.4s ease", display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => { setInvitedBy(""); localStorage.removeItem("true-invited-by"); localStorage.removeItem("true-invited-by-photo"); localStorage.removeItem("true-invited-by-emoji") }}
              style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}>✕</button>
            {invitedByPhoto
              ? <img src={invitedByPhoto} alt={invitedBy} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)", flexShrink: 0 }} />
              : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(46,204,138,0.2)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.1rem", color: "var(--accent)", flexShrink: 0 }}>
                  {invitedBy.charAt(0).toUpperCase()}
                </div>
            }
            <div style={{ flex: 1, paddingRight: 20 }}>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--accent)", marginBottom: 2 }}>🎉 Eingeladen von {invitedBy}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", lineHeight: 1.5 }}>Du kannst die Einkaufsliste gemeinsam bearbeiten.</div>
            </div>
          </div>
        )}

        {/* ── FIRST-LOGIN WELCOME CARD ── */}
        {showWelcome && (
          <div style={{ background: "linear-gradient(135deg, rgba(46,204,138,0.12), rgba(46,204,138,0.04))", border: "1.5px solid rgba(46,204,138,0.3)", borderRadius: 18, padding: "18px 18px 16px", marginBottom: 16, position: "relative", animation: "fadeUp 0.4s ease" }}>
            <button onClick={() => { setShowWelcome(false); localStorage.setItem("true-welcome-seen", "1") }} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}>✕</button>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>👋</div>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 6, color: "var(--text)" }}>
              Willkommen{userName ? `, ${userName}` : ""}!
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.6, marginBottom: 14 }}>
              Scanne dein erstes Produkt und sieh sofort, welcher Konzern dahintersteckt — und welche Schäden belegt sind.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href="/scan" style={{ flex: 1, background: "var(--accent)", color: "#000", borderRadius: 10, padding: "10px 0", fontWeight: 800, fontSize: "0.88rem", textDecoration: "none", textAlign: "center", display: "block" }}>
                📷 Jetzt scannen
              </a>
              <button onClick={() => { setShowWelcome(false); localStorage.setItem("true-welcome-seen", "1") }} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.82rem" }}>
                Später
              </button>
            </div>
          </div>
        )}

        {/* ── GREETING ── */}
        {userName && !showWelcome ? (
          <div style={{ marginBottom: "0.85rem" }}>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.025em", margin: 0 }}>
              Hey, {userName} 👋
            </h1>
          </div>
        ) : null}

        {/* ── FAMILY TABS — immer sichtbar ── */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14, scrollbarWidth: "none" }}>
          {/* Alle */}
          <button onClick={() => setActiveListPerson("all")}
            style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: activeListPerson === "all" ? "var(--accent)" : "var(--surface)", border: `2.5px solid ${activeListPerson === "all" ? "var(--accent)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", transition: "all 0.15s" }}>🛒</div>
            <span style={{ fontSize: "0.65rem", fontWeight: activeListPerson === "all" ? 800 : 500, color: activeListPerson === "all" ? "var(--accent)" : "var(--text-dim)", whiteSpace: "nowrap" }}>Alle</span>
            <span style={{ fontSize: "0.58rem", color: "var(--text-dim)" }}>{listItems.filter(i => !i.checked).length} offen</span>
          </button>
          {/* Familienmitglieder */}
          {familyMembers.map(m => {
            const count = listItems.filter(i => i.personId === m.id && !i.checked).length
            const isActive = activeListPerson === m.id
            const pet = isPetMember(m)
            const accentColor = pet ? "#ff8833" : "var(--accent)"
            return (
              <div key={m.id} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setActiveListPerson(isActive ? "all" : m.id)}
                    style={{ width: 52, height: 52, borderRadius: "50%", background: isActive ? accentColor : "var(--surface)", border: `2.5px solid ${isActive ? accentColor : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: m.avatarUrl ? 0 : "1.4rem", transition: "all 0.15s", cursor: "pointer", overflow: "hidden", padding: 0 }}>
                    {m.avatarUrl
                      ? <img src={m.avatarUrl} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                      : m.emoji}
                  </button>
                  {count > 0 && <div style={{ position: "absolute", top: -3, right: -3, background: pet ? "#ff8833" : "#ff4455", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: "0.6rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--background)" }}>{count}</div>}
                  {/* Invite button */}
                  <button
                    onClick={() => { setInviteMember(m); setInviteCopied(false) }}
                    title="Einladen"
                    style={{ position: "absolute", bottom: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "var(--surface)", border: "1.5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", cursor: "pointer", padding: 0 }}
                  >🔗</button>
                </div>
                <span style={{ fontSize: "0.65rem", fontWeight: isActive ? 800 : 500, color: isActive ? accentColor : "var(--text-dim)", whiteSpace: "nowrap", maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                <span style={{ fontSize: "0.58rem", color: "var(--text-dim)" }}>{count} offen</span>
              </div>
            )
          })}
          {/* Person hinzufügen — immer sichtbar */}
          <button onClick={() => setShowPersonSheet(true)} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "transparent", border: "1.5px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", color: "var(--text-dim)" }}>+</div>
            <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>Person</span>
          </button>
        </div>


          {/* ── EINKAUFSLISTE — Bring!-Style ── */}
          {(() => {
            const CAT_LABELS: Record<string, string> = {
              produce: "Obst & Gemüse", dairy: "Milch & Käse",
              bread: "Brot & Backwaren", pasta: "Nudeln & Getreide",
              snacks: "Snacks", drinks: "Getränke",
              meat: "Fleisch & Fisch", frozen: "Tiefkühlkost",
              household: "Haushalt & Pflege", other: "Sonstiges",
            }
            const CARD_COLORS: Record<string, string> = {
              produce: "#18a36a", dairy: "#1a80cc", bread: "#aa5010",
              pasta: "#a08800", snacks: "#7830c0", drinks: "#0080aa",
              meat: "#aa2040", frozen: "#2060aa", household: "#5566aa",
            }
            const allVisible = listItems.filter(i =>
              activeListPerson === "all" ? true
              : activeListPerson === "mine" ? !i.personId
              : i.personId === activeListPerson
            )
            const uncheckedAll = allVisible.filter(i => !i.checked)
            const unchecked = activeCat === "all" ? uncheckedAll : uncheckedAll.filter(i => (i.category || "other") === activeCat)
            const checked   = allVisible.filter(i => i.checked)

            // Normalisierung: unbekannte/alte Kategorien → "other"
            const KNOWN_CATS = new Set(["produce","dairy","bread","pasta","snacks","drinks","meat","frozen","household","other"])

            // Alle vorhandenen Kategorien für Filter-Chips
            const availableCats = Array.from(new Set(uncheckedAll.map(i => {
              const raw = i.category || "other"
              return KNOWN_CATS.has(raw) ? raw : "other"
            })))
            const grouped: Record<string, typeof unchecked> = {}
            unchecked.forEach(item => {
              const raw = item.category || "other"
              const cat = KNOWN_CATS.has(raw) ? raw : "other"
              if (!grouped[cat]) grouped[cat] = []
              grouped[cat].push(item)
            })
            const groupedEntries = Object.entries(grouped)

            function renderBigCard(item: typeof listItems[0], dim = false) {
              const qty     = itemQty[item.id] ?? 1
              const comment = itemComment[item.id] ?? ""
              const forPet  = item.personId ? isPetMember(familyMembers.find(m => m.id === item.personId) ?? { name: "", emoji: "" }) : false

              // Sanfte Farben: leicht getönter Hintergrund + farbiger linker Rand
              let accentColor = CARD_COLORS[item.category ?? ""] ?? "#18a36a"
              if (!dim && forPet)                          accentColor = "#cc6600"
              else if (!dim && item.severity === "high")   accentColor = "#d43040"
              else if (!dim && item.severity === "medium") accentColor = "#c87000"

              // Light mode: more saturated tint so cards look vivid
              const tintBg  = isDark ? "26" : "42"
              const tintBdr = isDark ? "40" : "66"
              const cardStyle = dim
                ? { background: "var(--surface)", borderLeft: "3px solid var(--border)", border: "1px solid var(--border)" }
                : { background: accentColor + tintBg, borderLeft: `3px solid ${accentColor}`, border: `1px solid ${accentColor}${tintBdr}` }

              // Untertitel: nur Brand oder Kommentar — KEIN Severity-Text (⚠️ kommt als eigener Button)
              const subText = !dim
                ? comment
                  ? `💬 ${comment}`
                  : (item.brand ?? "")
                : ""

              return (
                <div key={item.id}
                  onClick={() => toggleListItem(item.id)}
                  style={{ display: "flex", alignItems: "center", gap: 13, ...cardStyle, borderRadius: 14, padding: "14px 11px 14px 14px", marginBottom: 8, cursor: "pointer", opacity: dim ? 0.55 : 1, transition: "opacity 0.15s", WebkitTapHighlightColor: "transparent", userSelect: "none" }}
                >
                  {/* Großes Emoji */}
                  <span style={{ fontSize: "2rem", lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>

                  {/* Name + Subtext */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: "0.97rem", color: dim ? "var(--text-dim)" : "var(--text)", textDecoration: dim ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}{qty > 1 ? <span style={{ fontWeight: 600, color: accentColor }}> × {qty}</span> : ""}
                    </div>
                    {subText ? <div style={{ fontSize: "0.7rem", color: dim ? "var(--text-dim)" : accentColor, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{subText}</div> : null}
                  </div>

                  {/* ✓ bei erledigten */}
                  {dim && <span style={{ fontSize: "1.1rem", flexShrink: 0, color: "#22cc6e" }}>✓</span>}

                  {/* ⚠️ Severity-Button (öffnet Erklär-Modal) */}
                  {!dim && (item.severity === "high" || item.severity === "medium") && (
                    <button
                      onClick={e => { e.stopPropagation(); setSeverityModal(item) }}
                      style={{ background: item.severity === "high" ? "rgba(212,48,64,0.15)" : "rgba(200,112,0,0.15)", color: item.severity === "high" ? "#d43040" : "#c87000", border: `1px solid ${item.severity === "high" ? "rgba(212,48,64,0.35)" : "rgba(200,112,0,0.35)"}`, borderRadius: 99, padding: "4px 7px", fontSize: "0.75rem", fontWeight: 900, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer", lineHeight: 1 }}
                    >⚠️</button>
                  )}

                  {/* Alternative-Chip */}
                  {!dim && item.alternative && (
                    <button
                      onClick={e => { e.stopPropagation(); setAltModal({ name: item.alternative!.name, productName: item.name, productEmoji: item.emoji }) }}
                      style={{ background: accentColor + "20", color: accentColor, border: `1px solid ${accentColor}44`, borderRadius: 99, padding: "4px 9px", fontSize: "0.62rem", fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}
                    >💚 Alt.</button>
                  )}

                  {/* ••• Button */}
                  <button
                    onClick={e => { e.stopPropagation(); setMenuSheetItem(item) }}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--surface-2)", border: "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", color: "var(--text-dim)", letterSpacing: "0.04em" }}
                  >•••</button>
                </div>
              )
            }

            // Grid-Kachel
            function renderGridTile(item: typeof listItems[0]) {
              const accentColor = CARD_COLORS[item.category ?? ""] ?? "#18a36a"
              const tintBg  = isDark ? "26" : "42"
              return (
                <div key={item.id}
                  onClick={() => toggleListItem(item.id)}
                  style={{ background: accentColor + tintBg, border: `1px solid ${accentColor}50`, borderRadius: 16, padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", userSelect: "none", WebkitTapHighlightColor: "transparent", minHeight: 90, position: "relative" }}
                >
                  <span style={{ fontSize: "2rem", lineHeight: 1 }}>{item.emoji}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text)", textAlign: "center", lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"] }}>{item.name}</span>
                  {(item.severity === "high" || item.severity === "medium") && (
                    <span style={{ position: "absolute", top: 6, right: 6, fontSize: "0.7rem" }}>⚠️</span>
                  )}
                </div>
              )
            }

            return (
              <div>
                {/* Liste leeren Button */}
                {listItems.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                    <button onClick={clearAllItems} style={{ background: "transparent", border: "none", fontSize: "0.65rem", color: "var(--text-dim)", cursor: "pointer", padding: "4px 0" }}>
                      🗑 Liste leeren
                    </button>
                  </div>
                )}

                {/* Leer-Zustand */}
                {unchecked.length === 0 && checked.length === 0 && (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-dim)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: 8 }}>🛍️</div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>Liste ist leer</div>
                    <div style={{ fontSize: "0.8rem" }}>Tippe auf + um Produkte hinzuzufügen</div>
                  </div>
                )}

                {/* Items nach Kategorie — Liste oder Grid */}
                {groupedEntries.map(([cat, items]) => (
                  <div key={cat} style={{ marginBottom: viewMode === "grid" ? 16 : 0 }}>
                    {groupedEntries.length > 1 && activeCat === "all" && (
                      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7, marginTop: 12 }}>
                        {CAT_LABELS[cat] ?? cat}
                      </div>
                    )}
                    {viewMode === "list"
                      ? items.map(item => renderBigCard(item))
                      : <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>{items.map(item => renderGridTile(item))}</div>
                    }
                  </div>
                ))}

                {/* Erledigte Items — intern scrollbar, max 3 sichtbar */}
                {checked.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em" }}>✓ Erledigt ({checked.length})</div>
                      <button onClick={clearCheckedItems}
                        style={{ background: "rgba(212,48,64,0.1)", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: "0.65rem", fontWeight: 800, color: "#d43040", cursor: "pointer" }}>
                        🗑 Löschen
                      </button>
                    </div>
                    <div style={{ maxHeight: 240, overflowY: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
                      {checked.map(item => renderBigCard(item, true))}
                    </div>
                  </div>
                )}

                {/* ── Trennlinie + Aufdeckungen Toggle ── */}
                <div style={{ marginTop: 28, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <button
                    onClick={() => setShowFeedSection(v => !v)}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", borderRadius: 99, padding: "4px 12px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-dim)" }}
                  >
                    📡 Aufdeckungen {showFeedSection ? "▲" : "▼"}
                  </button>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>

                {showFeedSection && <>
                {/* ── Community ── */}
                {showCommunityCard && (
                  <div style={{ marginBottom: 12, position: "relative" }}>
                    <Link href="/community" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px", textDecoration: "none", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: "1.6rem" }}>💬</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text)" }}>Community</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 2 }}>Was kaufen andere? Scans teilen & diskutieren</div>
                        </div>
                      </div>
                      <span style={{ fontSize: "1rem", color: "var(--text-dim)", flexShrink: 0 }}>›</span>
                    </Link>
                    <button
                      onClick={() => { setShowCommunityCard(false); localStorage.setItem("true-community-card-dismissed", "1") }}
                      style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 4 }}
                    >×</button>
                  </div>
                )}

                {/* ── Feed-Vorschau (täglicher Beitrag) ── */}
                {(() => {
                  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
                  const FEED_POSTS = [
                    { tag: "Palmöl", tagColor: "#ff6633", text: "Nestlé hat in Indonesien erneut Zertifizierungspflichten für Palmöl-Lieferanten nicht eingehalten. 38.000 Hektar Borneo-Regenwald betroffen laut Rainforest Action Network.", source: "Rainforest Action Network · 2026", img: "https://images.pexels.com/photos/975250/pexels-photo-975250.jpeg?auto=compress&cs=tinysrgb&w=800" },
                    { tag: "Wasserrechte", tagColor: "#44aaff", text: "Coca-Cola entnimmt täglich 1,8 Milliarden Liter Grundwasser — in Gebieten mit Wasserknappheit bis zu 350 % mehr als genehmigt. TU Berlin: In 6 Ländern Südostasiens hat das direkte Folgen für die Trinkwasserversorgung.", source: "TU Berlin Umweltforschung · 2026", img: "https://images.pexels.com/photos/2893555/pexels-photo-2893555.jpeg?auto=compress&cs=tinysrgb&w=800" },
                    { tag: "Palmöl", tagColor: "#ff6633", text: "Ferrero (Nutella, Kinder) ist der weltweit drittgrößte Palmöl-Käufer. Trotz öffentlicher Versprechen bezieht das Unternehmen laut Greenpeace 2024 noch immer Palmöl aus Gebieten mit aktiver Abholzung in Borneo.", source: "Greenpeace Palmöl-Report 2024", img: "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg?auto=compress&cs=tinysrgb&w=800" },
                    { tag: "Kindermarketing", tagColor: "#cc66ff", text: "Nestlé, Unilever und Mondelez geben gemeinsam über 2 Milliarden € jährlich für Kindermarketing aus — davon 68 % für Ultra-Processed Food (NOVA 4). Laut Lancet direkt verknüpft mit Anstieg von Kinderübergewicht in Europa.", source: "The Lancet · WHO Marketingbericht 2025", img: "https://images.pexels.com/photos/1128678/pexels-photo-1128678.jpeg?auto=compress&cs=tinysrgb&w=800" },
                    { tag: "Greenwashing", tagColor: "#2ECC8A", text: "Unilever wurde vom britischen Werberat verurteilt: Mehrere Produkte wurden als 'nachhaltig' vermarktet, ohne belastbare Belege. Betroffen: Dove, Hellmann's und Knorr. Strafe: Werbestopp und öffentliche Rüge.", source: "Advertising Standards Authority UK · 2024", img: "https://images.pexels.com/photos/4033148/pexels-photo-4033148.jpeg?auto=compress&cs=tinysrgb&w=800" },
                    { tag: "Plastik", tagColor: "#ff4455", text: "PepsiCo landete 2024 erneut auf der globalen Plastik-Blacklist: 58.000 Tonnen Einwegplastik produziert, davon nur 9 % recycelt. In Entwicklungsländern ist PepsiCo nach Coca-Cola der zweitgrößte Plastikverschmutzer.", source: "Break Free From Plastic · 2024", img: "https://images.pexels.com/photos/2547565/pexels-photo-2547565.jpeg?auto=compress&cs=tinysrgb&w=800" },
                    { tag: "Arbeitsbedingungen", tagColor: "#ffcc00", text: "Mars Inc. (Snickers, M&M's, Pedigree) steht unter Druck: Kakaobauern in Ghana erhalten durchschnittlich 0,87 € pro Tag — weit unter dem Existenzminimum. Oxfam bezeichnet die Lieferkette als 'systematisch ausbeuterisch'.", source: "Oxfam Schokoladenbericht 2025", img: "https://images.pexels.com/photos/1352249/pexels-photo-1352249.jpeg?auto=compress&cs=tinysrgb&w=800" },
                    { tag: "Zusatzstoffe", tagColor: "#ff7700", text: "Red Bull enthält 7 Lebensmittelzusatzstoffe, die in der EU zulässig, aber wissenschaftlich umstritten sind. Für Kinder unter 12 Jahren empfiehlt die EFSA ausdrücklich keinen Konsum. TRUE zeigt dir Alternativen beim nächsten Scan.", source: "EFSA Bewertung Energydrinks · 2024", img: "https://images.pexels.com/photos/5591661/pexels-photo-5591661.jpeg?auto=compress&cs=tinysrgb&w=800" },
                  ]
                  const post = FEED_POSTS[dayOfYear % FEED_POSTS.length]
                  const today = new Date()
                  return (
                    <div style={{ marginTop: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                      {/* Post-Header */}
                      <div style={{ padding: "10px 14px 8px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(46,204,138,0.15)", border: "1.5px solid rgba(46,204,138,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>🤖</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: "0.82rem" }}>TRUE Bot</div>
                          <div style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>{today.toLocaleDateString("de-DE", { day: "numeric", month: "long" })}</div>
                        </div>
                        <span style={{ fontSize: "0.62rem", fontWeight: 800, color: post.tagColor, background: post.tagColor + "18", border: `1px solid ${post.tagColor}33`, borderRadius: 20, padding: "2px 8px", flexShrink: 0 }}>{post.tag}</span>
                      </div>
                      {/* Bild */}
                      <img src={post.img} alt={post.tag} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                      {/* Text */}
                      <div style={{ padding: "12px 14px 10px" }}>
                        <div style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.6 }}>{post.text}</div>
                        <div style={{ marginTop: 8, fontSize: "0.62rem", color: "var(--text-dim)" }}>📋 {post.source}</div>
                      </div>
                      {/* Footer */}
                      <div style={{ borderTop: "1px solid var(--border)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Link href="/channel/true" style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                          📡 TRUE-Kanal
                        </Link>
                        <Link href="/community" style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 700, textDecoration: "none" }}>Community →</Link>
                      </div>
                    </div>
                  )
                })()}

                </>}

                {/* ── Sort / View-Modus Sheet ── */}
                {showSortSheet && (
                  <div onClick={() => setShowSortSheet(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
                    <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 520, margin: "0 auto", background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "16px 16px 40px" }}>
                      <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 18px" }} />
                      {/* Liste / Kacheln */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                        {(["list", "grid"] as const).map(mode => (
                          <button key={mode} onClick={() => setViewMode(mode)}
                            style={{ flex: 1, padding: "12px", borderRadius: 14, border: `1.5px solid ${viewMode === mode ? "var(--accent)" : "var(--border)"}`, background: viewMode === mode ? "rgba(46,204,138,0.12)" : "var(--background)", color: viewMode === mode ? "var(--accent)" : "var(--text-dim)", fontWeight: viewMode === mode ? 700 : 500, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            {mode === "list" ? <>☰ Liste</> : <>⊞ Kacheln</>}
                          </button>
                        ))}
                      </div>
                      {/* Kategorie filtern */}
                      <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-dim)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Kategorie</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                        <button onClick={() => { setActiveCat("all"); setShowSortSheet(false) }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, border: `1.5px solid ${activeCat === "all" ? "var(--accent)" : "var(--border)"}`, background: activeCat === "all" ? "rgba(46,204,138,0.12)" : "var(--background)", cursor: "pointer", fontWeight: activeCat === "all" ? 700 : 500, color: activeCat === "all" ? "var(--accent)" : "var(--text)" }}>
                          <span style={{ fontSize: "1.1rem" }}>🛒</span>
                          <span style={{ fontSize: "0.82rem" }}>Alle</span>
                          {activeCat === "all" && <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.8rem" }}>✓</span>}
                        </button>
                        {availableCats.map(cat => {
                          const color = CARD_COLORS[cat] ?? "#18a36a"
                          const isActive = activeCat === cat
                          return (
                            <button key={cat} onClick={() => { setActiveCat(cat); setShowSortSheet(false) }}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, border: `1.5px solid ${isActive ? color : "var(--border)"}`, background: isActive ? color + "22" : "var(--background)", cursor: "pointer", fontWeight: isActive ? 700 : 500, color: isActive ? color : "var(--text)" }}>
                              <span style={{ fontSize: "1.1rem" }}>{["produce","dairy","bread","pasta","snacks","drinks","meat","frozen","household"].indexOf(cat) >= 0 ? ["🥬","🥛","🍞","🍝","🍫","🥤","🥩","❄️","🧴"][["produce","dairy","bread","pasta","snacks","drinks","meat","frozen","household"].indexOf(cat)] : "🛒"}</span>
                              <span style={{ fontSize: "0.82rem" }}>{CAT_LABELS[cat] ?? cat}</span>
                              {isActive && <span style={{ marginLeft: "auto", fontSize: "0.8rem" }}>✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

        {/* ── TIPP DES TAGES (kompakt) ── */}
        {userGoals.length > 0 && (() => {
          const primary = userGoals[0]
          const cfg = GOAL_CONFIG[primary] ?? GOAL_CONFIG["truth"]
          const card = cfg.fuerDich[dayIndex() % cfg.fuerDich.length]
          return (
            <div style={{ marginTop: 16, background: "var(--surface)", border: `1px solid ${card.color}33`, borderLeft: `3px solid ${card.color}`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>{card.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.78rem", color: card.color, marginBottom: 1 }}>💡 Tipp</div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.title}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.tip}</div>
              </div>
              <Link href="/community" style={{ background: card.color + "18", color: card.color, border: `1px solid ${card.color}33`, borderRadius: 99, padding: "5px 11px", fontSize: "0.68rem", fontWeight: 800, textDecoration: "none", flexShrink: 0 }}>Community →</Link>
            </div>
          )
        })()}

      </div>

      {/* ── MODALS ── */}
      {modal && <IngredientModal issue={modal} onClose={() => setModal(null)} />}
      {productModal && <ProductDetailModal product={productModal} onClose={() => setProductModal(null)} />}

      {/* ── PRODUKT-MENÜ BOTTOM SHEET ── */}
      {menuSheetItem && (() => {
        const si      = menuSheetItem
        const qty     = itemQty[si.id] ?? 1
        const comment = itemComment[si.id] ?? ""

        // Kommentar senden + Push an alle Familienmitglieder
        function sendCommentNotification(text: string) {
          if (!text.trim()) return
          // Browser-Notification anfordern falls noch nicht erlaubt
          if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission()
          }
          // Browser-Notification auslösen
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`🛒 ${si.name}`, {
              body: `${userName || "Jemand"}: "${text.trim()}"`,
              icon: "/icon-192.png",
              tag: `list-comment-${si.id}`,
            })
          }
          // App-Benachrichtigung für alle → localStorage
          try {
            const NOTIF_KEY = "true-notifications-v2"
            const stored: Array<{ id: string; title: string; body: string; url: string; time: number; read: boolean; type: string }> =
              JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "[]")
            const newNotif = {
              id: `list-${si.id}-${Date.now()}`,
              title: `🛒 ${si.name}`,
              body: `${userName || "Jemand"}: "${text.trim()}"`,
              url: "/home",
              time: Date.now(),
              read: false,
              type: "tip" as const,
            }
            localStorage.setItem(NOTIF_KEY, JSON.stringify([newNotif, ...stored].slice(0, 50)))
            localStorage.setItem(NOTIF_KEY + "-day", String(Math.floor(Date.now() / 86_400_000)))
          } catch {}
        }

        return (
          <>
            {/* Backdrop */}
            <div onClick={() => setMenuSheetItem(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }} />
            {/* Sheet */}
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "0 0 env(safe-area-inset-bottom,16px)", boxShadow: "0 -8px 40px rgba(0,0,0,0.35)", animation: "slideUp 0.22s ease" }}>
              {/* Handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
              </div>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "8px 20px 12px" }}>
                <span style={{ fontSize: "1.6rem", flexShrink: 0, marginTop: 2 }}>{si.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text)" }}>{si.name}</div>
                  {si.brand && <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 1 }}>{si.brand}</div>}
                  {/* Inhaltsstoff-Badges */}
                  {(si.severity === "high" || si.severity === "medium") && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {si.severity === "high" && (
                        <span style={{ background: "rgba(212,48,64,0.12)", color: "#d43040", border: "1px solid rgba(212,48,64,0.3)", borderRadius: 99, padding: "3px 9px", fontSize: "0.68rem", fontWeight: 800 }}>⚠️ Kritisch</span>
                      )}
                      {si.severity === "medium" && (
                        <span style={{ background: "rgba(200,112,0,0.12)", color: "#c87000", border: "1px solid rgba(200,112,0,0.3)", borderRadius: 99, padding: "3px 9px", fontSize: "0.68rem", fontWeight: 800 }}>⚠️ Überprüfen</span>
                      )}
                      {si.alternative && (
                        <button onClick={() => { setAltModal({ name: si.alternative!.name, productName: si.name, productEmoji: si.emoji }); setMenuSheetItem(null) }}
                          style={{ background: "rgba(46,204,138,0.12)", color: "var(--accent)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: 99, padding: "3px 9px", fontSize: "0.68rem", fontWeight: 800, cursor: "pointer" }}>
                          💚 Alternative ansehen
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => setMenuSheetItem(null)} style={{ background: "var(--surface-2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "0.9rem", color: "var(--text-dim)", flexShrink: 0 }}>✕</button>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", margin: "0 20px" }} />

              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Menge */}
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Menge</div>
                  <div style={{ display: "flex", alignItems: "center", background: "var(--background)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", maxWidth: 180 }}>
                    <button onClick={() => setItemQty(q => ({ ...q, [si.id]: Math.max(1, (q[si.id] ?? 1) - 1) }))} style={{ width: 50, height: 46, background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text)", fontWeight: 700 }}>−</button>
                    <span style={{ flex: 1, textAlign: "center", fontWeight: 900, fontSize: "1.1rem" }}>{qty}</span>
                    <button onClick={() => setItemQty(q => ({ ...q, [si.id]: (q[si.id] ?? 1) + 1 }))} style={{ width: 50, height: 46, background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--accent)", fontWeight: 700 }}>+</button>
                  </div>
                </div>

                {/* Kommentar + Senden → Push an alle */}
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                    Kommentar
                    {familyMembers.length > 0 && (
                      <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "var(--text-dim)", marginLeft: 6 }}>
                        → alle {familyMembers.length + 1} bekommen eine Benachrichtigung
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      id={`comment-sheet-${si.id}`}
                      defaultValue={comment}
                      onChange={e => setItemComment(c => ({ ...c, [si.id]: e.target.value }))}
                      placeholder="z.B. Bio kaufen, laktosefrei …"
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value
                          sendCommentNotification(val)
                          setMenuSheetItem(null)
                        }
                      }}
                      style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", fontSize: "0.9rem", color: "var(--text)", outline: "none" }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`comment-sheet-${si.id}`) as HTMLInputElement
                        const val = input?.value ?? comment
                        sendCommentNotification(val)
                        setMenuSheetItem(null)
                      }}
                      style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 12, padding: "0 18px", fontWeight: 800, cursor: "pointer", fontSize: "1.1rem", flexShrink: 0 }}
                    >💬</button>
                  </div>
                  {familyMembers.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {familyMembers.map(m => (
                        <span key={m.id} style={{ fontSize: "0.72rem", color: "var(--text-dim)", background: "var(--surface-2)", borderRadius: 99, padding: "3px 8px" }}>{m.emoji} {m.name}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Aus Liste entfernen */}
                <button
                  onClick={() => {
                    setListItems(prev => {
                      const updated = prev.filter(i => i.id !== si.id)
                      localStorage.setItem("shopping-list-items-v1", JSON.stringify(updated))
                      return updated
                    })
                    setMenuSheetItem(null)
                  }}
                  style={{ width: "100%", background: "var(--danger-dim)", border: "1px solid var(--danger)", borderRadius: 12, padding: "13px", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", color: "var(--danger)" }}
                >🗑 Aus Liste entfernen</button>

              </div>

              {/* Fertig-Button */}
              <div style={{ padding: "4px 20px 16px" }}>
                <button onClick={() => setMenuSheetItem(null)} style={{ width: "100%", background: "var(--accent)", border: "none", borderRadius: 14, padding: "14px", fontSize: "0.95rem", fontWeight: 800, cursor: "pointer", color: "#000" }}>Fertig ✓</button>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── QUICK-ADD OVERLAY (vom FAB) ── */}
      {showQuickAdd && (() => {
        const q = quickAdd.trim()
        const matches = q.length > 0 ? QUICK_CATALOG.filter(c => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []
        const isNew = q.length > 0 && !QUICK_CATALOG.find(c => c.name.toLowerCase() === q.toLowerCase())
        // Browse grid shown when nothing is typed yet
        const browseItems = q.length === 0 ? QUICK_CATALOG.filter(c => !listItems.find(i => i.name === c.name)) : []
        return (
          <>
            <div onClick={() => { setShowQuickAdd(false); setQuickAdd("") }} style={{ position: "fixed", inset: 0, zIndex: 140 }} />
            <div style={{ position: "fixed", bottom: "max(16px, env(safe-area-inset-bottom))", left: 16, right: 16, zIndex: 151, maxWidth: 440, margin: "0 auto" }}>
              {/* Browse grid (no query) */}
              {q.length === 0 && browseItems.length > 0 && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, marginBottom: 8, boxShadow: "0 -4px 24px rgba(0,0,0,0.2)", maxHeight: 260, overflowY: "auto" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
                    {browseItems.slice(0, 20).map((m, i) => (
                      <button key={m.name} onClick={() => { addFromCatalog(m); setQuickAdd(""); setShowQuickAdd(false) }}
                        style={{ background: "transparent", border: "none", borderRight: (i + 1) % 4 !== 0 ? "1px solid var(--border)" : "none", borderBottom: "1px solid var(--border)", padding: "12px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
                        <span style={{ fontSize: "1.5rem" }}>{m.emoji}</span>
                        <span style={{ fontSize: "0.62rem", fontWeight: 600, color: "var(--text)", textAlign: "center", lineHeight: 1.2 }}>{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Search results */}
              {(matches.length > 0 || isNew) && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 8, boxShadow: "0 -4px 24px rgba(0,0,0,0.2)" }}>
                  {matches.map(m => (
                    <button key={m.name} onClick={() => { addFromCatalog(m); setQuickAdd(""); setShowQuickAdd(false) }}
                      style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
                      <span style={{ fontSize: "1.3rem" }}>{m.emoji}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>{m.name}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 800 }}>+ hinzufügen</span>
                    </button>
                  ))}
                  {isNew && (
                    <button onClick={() => { addFromCatalog({ name: quickAdd.trim(), emoji: guessEmoji(quickAdd.trim()), category: guessCategory(quickAdd.trim()) }); setQuickAdd(""); setShowQuickAdd(false) }}
                      style={{ width: "100%", background: "transparent", border: "none", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
                      <span style={{ fontSize: "1.3rem" }}>{guessEmoji(quickAdd.trim())}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>„{quickAdd.trim()}" hinzufügen</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 800 }}>+ Neu</span>
                    </button>
                  )}
                </div>
              )}
              <div style={{ background: "var(--surface)", border: "1.5px solid var(--accent)", borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 24px rgba(46,204,138,0.35)" }}>
                {/* X-Schließen links */}
                <button onClick={() => { setShowQuickAdd(false); setQuickAdd("") }}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
                <input autoFocus value={quickAdd} onChange={e => setQuickAdd(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && q) { addFromCatalog({ name: q, emoji: guessEmoji(q), category: guessCategory(q) }); setQuickAdd(""); setShowQuickAdd(false) } }}
                  placeholder="Ich brauche …"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "1rem", color: "var(--text)", fontWeight: 500 }} />
                {/* Absenden-Button rechts — nur wenn Text vorhanden */}
                {q && (
                  <button onClick={() => { addFromCatalog({ name: q, emoji: guessEmoji(q), category: guessCategory(q) }); setQuickAdd(""); setShowQuickAdd(false) }}
                    style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
                )}
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Ernährungscoach FAB entfernt — nur noch in der Einkaufsliste ── */}

{/* ── FAB Produkt hinzufügen (rechts) — versteckt wenn Quick-Add offen ── */}
      {!showQuickAdd && (
        <button
          onClick={() => { setShowQuickAdd(true) }}
          style={{ position: "fixed", bottom: 76, right: 20, zIndex: 152, width: 54, height: 54, borderRadius: "50%", background: "var(--accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", color: "#000", fontWeight: 300, lineHeight: 1, boxShadow: "0 4px 20px rgba(46,204,138,0.5), 0 2px 8px rgba(0,0,0,0.25)" }}
          aria-label="Produkt hinzufügen"
        >+</button>
      )}

      {/* ── Severity-Erklär-Modal ── */}
      {severityModal && (() => {
        const sm = severityModal

        // Score + Grade aus Severity ableiten
        const SEVERITY_SCORE: Record<string, { score: number; grade: string; label: string; color: string }> = {
          critical: { score: 15, grade: "F", label: "Nicht empfohlen", color: "#d43040" },
          high:     { score: 32, grade: "D", label: "Bedenklich",       color: "#ff5500" },
          medium:   { score: 52, grade: "C", label: "Eingeschränkt",    color: "#e09000" },
          low:      { score: 74, grade: "B", label: "Okay",             color: "#88cc44" },
        }
        const sv = SEVERITY_SCORE[sm.severity ?? "medium"] ?? SEVERITY_SCORE.medium

        // Konzern-Datenbank (nach Brandname und Produktname)
        const KONZERN_DB: Record<string, { name: string; issues: string }> = {
          "nestlé": { name: "Nestlé", issues: "Wasserprivatisierung weltweit. Kinderarbeit im Kakaoanbau. Babynahrung-Kritik der WHO." },
          "nestle": { name: "Nestlé", issues: "Wasserprivatisierung weltweit. Kinderarbeit im Kakaoanbau. Babynahrung-Kritik der WHO." },
          "coca-cola": { name: "Coca-Cola", issues: "Größter Plastikverschmutzer weltweit (5 Jahre in Folge, BFFP). Entnimmt tägl. 1,8 Mrd. Liter Grundwasser in Wasserknappheits-Regionen." },
          "ferrero": { name: "Ferrero", issues: "Palmöl in fast allen Produkten trotz Kritik. Umstrittene Kakao-Lieferketten in Westafrika." },
          "mondelez": { name: "Mondelez", issues: "Palmöl, hoher Zuckergehalt, Kindermarketing. Konzern hinter Milka, Oreo, Chips Ahoy." },
          "unilever": { name: "Unilever", issues: "Palmöl-Einsatz, Plastikverpackungen, Greenwashing-Vorwürfe." },
          "pepsico": { name: "PepsiCo", issues: "Plastik-Fußabdruck, Kindermarketing für zuckerhaltige Getränke." },
          "kellogg": { name: "Kellogg's", issues: "Hochverarbeitete Produkte, übermäßiger Zuckeranteil, Kindermarketing." },
          "henkel": { name: "Henkel", issues: "Palmöl in Produkten, Plastikverpackungen, Greenwashing-Vorwürfe." },
          "bayer": { name: "Bayer/Monsanto", issues: "Glyphosat-Klagen ($13 Mrd. Schadensersatz). WHO: 'wahrscheinlich krebserregend'." },
          "danone": { name: "Danone", issues: "Wassergeschäft (Evian, Volvic) kritisiert. Greenwashing bei Nachhaltigkeitsversprechen." },
          "mcdonalds": { name: "McDonald's", issues: "Tierwohl, Regenwald-Abholzung für Sojaanbau, Hochverarbeitete Produkte." },
        }
        // Lookup: zuerst nach Brand, dann nach Produktname
        const brandKey = (sm.brand ?? "").toLowerCase().replace(/[^a-zäöü]/g, "")
        const nameKey  = sm.name.toLowerCase().replace(/[^a-zäöü]/g, "")
        const konzern = KONZERN_DB[brandKey] ?? KONZERN_DB[nameKey] ??
          Object.entries(KONZERN_DB).find(([k]) => brandKey.includes(k) || nameKey.includes(k))?.[1]

        // Einfache Alternativen-Suche
        const QUICK_ALTS: { match: RegExp; alts: { emoji: string; name: string; why: string }[] }[] = [
          { match: /coca.?cola|cola\b/i, alts: [{ emoji: "💧", name: "Mineralwasser + Zitrone", why: "Kein Zucker, kein Konzern" }, { emoji: "🍵", name: "Mate-Tee", why: "Natürliches Koffein" }] },
          { match: /fanta|sprite/i,      alts: [{ emoji: "🍋", name: "Wasser + Zitronensaft", why: "Selbst gemacht, zuckerfrei" }] },
          { match: /red.?bull|monster/i, alts: [{ emoji: "☕", name: "Espresso", why: "Echtes Koffein, keine Zusätze" }, { emoji: "🍵", name: "Matcha Latte", why: "Lange Energie ohne Crash" }] },
          { match: /nutella/i,           alts: [{ emoji: "🫙", name: "Rapunzel Nussnougat Bio", why: "Palmölfrei, fairer Kakao" }, { emoji: "🥜", name: "Erdnussbutter natur", why: "Nur Erdnüsse, kein Palmöl" }] },
          { match: /kitkat|milka|oreo/i, alts: [{ emoji: "🍫", name: "Vivani Bio-Schokolade", why: "Fairtrade, palmölfrei" }] },
          { match: /pringles|chips/i,    alts: [{ emoji: "🥜", name: "Nüsse ungesalzen", why: "Gesunde Fette, natürlich" }] },
          { match: /wurst|aufschnitt/i,  alts: [{ emoji: "🌿", name: "Räuchertofu", why: "Proteinreich, tierleidfrei" }] },
          { match: /nescaf/i,            alts: [{ emoji: "☕", name: "Bio-Bohnenkaffee", why: "Fair trade, kein Konzern" }] },
          { match: /persil|ariel/i,      alts: [{ emoji: "🧺", name: "Frosch Waschmittel", why: "Biologisch abbaubar" }] },
        ]
        const quickAlts = QUICK_ALTS.find(e => e.match.test(sm.name))?.alts ?? []
        const hasAlt = sm.alternative || quickAlts.length > 0

        return (
          <>
            <div onClick={() => setSeverityModal(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)" }} />
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 301, background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "0 0 env(safe-area-inset-bottom,20px)", boxShadow: "0 -8px 40px rgba(0,0,0,0.4)", animation: "slideUp 0.22s ease", maxWidth: 520, margin: "0 auto", maxHeight: "88vh", overflowY: "auto" }}>
              {/* Handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px", position: "sticky", top: 0, background: "var(--surface)", zIndex: 1 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
              </div>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 20px 16px" }}>
                <span style={{ fontSize: "2.4rem", lineHeight: 1, flexShrink: 0 }}>{sm.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sm.name}</div>
                  {sm.brand && <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 1 }}>von {sm.brand}</div>}
                </div>
                <button onClick={() => setSeverityModal(null)} style={{ background: "var(--surface-2)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "var(--text-dim)", flexShrink: 0, fontSize: "0.9rem" }}>✕</button>
              </div>

              <div style={{ padding: "0 18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* ── Score-Skala ── */}
                <div style={{ background: "var(--background)", borderRadius: 16, padding: "16px 16px 14px" }}>
                  <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Bewertung</div>

                  {/* Skala-Bar */}
                  <div style={{ position: "relative", marginBottom: 10 }}>
                    <div style={{ height: 14, borderRadius: 99, background: "linear-gradient(to right, #d43040 0%, #ff6600 25%, #e09000 50%, #88cc44 75%, #22cc88 100%)" }} />
                    {/* Marker */}
                    <div style={{
                      position: "absolute", top: "50%", left: `${sv.score}%`,
                      transform: "translate(-50%, -50%)",
                      width: 22, height: 22, borderRadius: "50%",
                      background: "var(--surface)", border: `3px solid ${sv.color}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                    }} />
                  </div>

                  {/* Grade-Labels */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    {["F","D","C","B","A"].map(g => (
                      <span key={g} style={{ fontSize: "0.62rem", fontWeight: g === sv.grade ? 900 : 500, color: g === sv.grade ? sv.color : "var(--text-dim)" }}>{g}</span>
                    ))}
                  </div>

                  {/* Score + Verdict */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 900, fontSize: "2rem", color: sv.color, lineHeight: 1 }}>{sv.score}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: sv.color }}>{sv.label}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 1 }}>Note {sv.grade} · von 100 Punkten</div>
                    </div>
                  </div>
                </div>

                {/* ── Konzern-Info ── */}
                <div style={{ background: "var(--background)", borderRadius: 16, padding: "14px 16px" }}>
                  <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Hersteller-Einordnung</div>
                  {konzern ? (
                    <>
                      <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text)", marginBottom: 6 }}>🏭 {konzern.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.65 }}>{konzern.issues}</div>
                    </>
                  ) : sm.brand ? (
                    <>
                      <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text)", marginBottom: 4 }}>🏭 {sm.brand}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.65 }}>
                        {sv.score < 50
                          ? "Kritische oder mehrfach dokumentierte Auffälligkeiten beim Hersteller — prüfe Alternativen."
                          : "Dokumentierte Auffälligkeiten beim Hersteller. Gelegentlicher Kauf vertretbar."}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.65 }}>
                      {sv.score < 50
                        ? "Kritische oder mehrfach dokumentierte Auffälligkeiten beim Hersteller."
                        : "Vereinzelte Auffälligkeiten beim Hersteller dokumentiert."}
                    </div>
                  )}
                </div>

                {/* ── Bessere Alternativen ── */}
                {hasAlt && (
                  <div style={{ background: "var(--background)", borderRadius: 16, padding: "14px 16px" }}>
                    <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Bessere Alternative</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {sm.alternative && (
                        <button onClick={() => { setAltModal({ name: sm.alternative!.name, productName: sm.name, productEmoji: sm.emoji }); setSeverityModal(null) }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%" }}>
                          <span style={{ fontSize: "1.2rem" }}>💚</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: "0.84rem", color: "var(--text)" }}>{sm.alternative.name}</div>
                            <div style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: 600, marginTop: 1 }}>Empfehlung aus dem Scan</div>
                          </div>
                        </button>
                      )}
                      {quickAlts.map((alt, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}>
                          <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{alt.emoji}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: "0.84rem", color: "var(--text)" }}>{alt.name}</div>
                            <div style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: 600, marginTop: 1 }}>{alt.why}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Löschen ── */}
                <button onClick={() => {
                  setListItems(prev => {
                    const updated = prev.filter(i => i.id !== sm.id)
                    localStorage.setItem("shopping-list-items-v1", JSON.stringify(updated))
                    return updated
                  })
                  setSeverityModal(null)
                }} style={{ width: "100%", background: "transparent", border: "1px solid var(--border)", borderRadius: 12, padding: "12px", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-dim)", cursor: "pointer" }}>
                  🗑 Aus Liste entfernen
                </button>

              </div>
            </div>
          </>
        )
      })()}

      {/* ── Ernährungscoach Chat Sheet ── */}
      <NutritionCoachChat
        items={listItems.filter(i => !i.checked)}
        goals={userGoals}
        allergies={[]}
        open={coachOpen}
        onClose={() => setCoachOpen(false)}
      />

      <FloatingAssistant page="home" tips={[
        { icon: "📷", text: "Tippe auf Scanner und halte die Kamera an einen Barcode — siehst sofort, welcher Konzern dahintersteckt." },
        { icon: "🛒", text: "Nach dem Scan kannst du Produkte auf deine Einkaufsliste setzen und später abhaken." },
        { icon: "👥", text: "In der Community tauscht du dich mit anderen aus — Alternativen, Tipps und tägliche Aufdeckungen." },
        { icon: "🎯", text: "Lege im Profil deine Ziele fest — der Scanner bewertet dann nach deinen Prioritäten." },
      ]} />
      {!showQuickAdd && <BottomNav />}

      {/* ── Person hinzufügen Sheet ── */}
      {showPersonSheet && (() => {
        const PERSON_EMOJIS = ["👶","🧒","👦","👧","🧑","👩","👨","👴","👵","🐶","🐱","🐕","🐈","🐾","🐇","🐹","🦜"]
        function savePeople(next: typeof familyMembers) {
          setFamilyMembers(next)
          try { localStorage.setItem("true-family-members", JSON.stringify(next)) } catch {}
        }
        function addPerson() {
          const name = newPersonName.trim()
          if (!name) return
          savePeople([...familyMembers, { id: Date.now().toString(), name, age: newPersonAge.trim(), emoji: newPersonEmoji }])
          setNewPersonName(""); setNewPersonAge(""); setNewPersonEmoji("🧒")
        }
        function getListId() {
          try {
            let id = localStorage.getItem("true-list-id")
            if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem("true-list-id", id) }
            return id
          } catch { return "shared" }
        }
        function generateInviteLink() {
          const myProfile = (() => { try { return JSON.parse(localStorage.getItem("true-profile") || "{}") } catch { return {} } })()
          const myName = myProfile.vorname || myProfile.name || "Jemand"
          const myPhoto = localStorage.getItem("true-profile-photo") || ""
          const listId = getListId()
          const itemCount = listItems.filter(i => !i.checked).length
          const link = `https://get-true.de/join?list=${listId}&from=${encodeURIComponent(myName)}&fromPhoto=${encodeURIComponent(myPhoto)}&emoji=${encodeURIComponent(inviteEmoji)}&items=${itemCount}`
          setGeneratedLink(link)
        }
        return (
          <>
            <div onClick={() => { setShowPersonSheet(false); setGeneratedLink(null); setInviteLinkCopied(false) }} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)" }} />
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 301, background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "0 0 env(safe-area-inset-bottom,20px)", boxShadow: "0 -8px 40px rgba(0,0,0,0.35)", animation: "slideUp 0.22s ease", maxHeight: "88vh", overflowY: "auto" }}>
              {/* Handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
              </div>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 12px" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem" }}>👨‍👩‍👧 Meine Liste</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 2 }}>Für wen kaufst du ein?</div>
                </div>
                <button onClick={() => { setShowPersonSheet(false); setGeneratedLink(null); setInviteLinkCopied(false) }} style={{ background: "var(--surface-2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "0.9rem", color: "var(--text-dim)" }}>✕</button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", margin: "0 20px 0", background: "var(--background)", borderRadius: 10, padding: 4, gap: 4 }}>
                {([["manual","👤 Manuell"],["invite","🔗 Einladen"]] as const).map(([tab, label]) => (
                  <button key={tab} onClick={() => { setPersonSheetTab(tab); setGeneratedLink(null); setInviteLinkCopied(false) }}
                    style={{ flex: 1, background: personSheetTab === tab ? "var(--surface)" : "transparent", border: "none", borderRadius: 8, padding: "8px", fontWeight: personSheetTab === tab ? 700 : 500, fontSize: "0.82rem", color: personSheetTab === tab ? "var(--text)" : "var(--text-dim)", cursor: "pointer", transition: "all 0.15s" }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* ── TAB: Manuell ── */}
                {personSheetTab === "manual" && (
                  <>
                    {familyMembers.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {familyMembers.map(m => (
                          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px" }}>
                            {m.avatarUrl
                              ? <img src={m.avatarUrl} alt={m.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                              : <span style={{ fontSize: "1.5rem" }}>{m.emoji}</span>}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{m.name}</div>
                              {m.age && <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{m.age} Jahre</div>}
                            </div>
                            <button onClick={() => { setInviteMember(m); setInviteCopied(false) }} style={{ background: "none", border: "none", fontSize: "0.9rem", cursor: "pointer", padding: "0 6px", color: "var(--text-dim)" }} title="Einladen">🔗</button>
                            <button onClick={() => savePeople(familyMembers.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.2rem", padding: "0 4px" }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {familyMembers.length === 0 && (
                      <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "0.82rem", padding: "4px 0" }}>Noch niemand hinzugefügt.</div>
                    )}
                    <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
                      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Person hinzufügen</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {PERSON_EMOJIS.map(em => (
                          <button key={em} onClick={() => setNewPersonEmoji(em)} style={{ background: newPersonEmoji === em ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${newPersonEmoji === em ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "5px 8px", fontSize: "1.1rem", cursor: "pointer" }}>{em}</button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        <input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === "Enter" && addPerson()} placeholder="Name (z.B. Lena, Hund …)"
                          style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: "0.88rem", outline: "none" }} />
                        <input value={newPersonAge} onChange={e => setNewPersonAge(e.target.value)} placeholder="Alter" type="number" min="0" max="120"
                          style={{ width: 70, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px", color: "var(--text)", fontSize: "0.88rem", outline: "none" }} />
                      </div>
                      <button onClick={addPerson} style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", borderRadius: 10, padding: "11px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}>
                        ✓ Hinzufügen
                      </button>
                    </div>
                  </>
                )}

                {/* ── TAB: Einladen ── */}
                {personSheetTab === "invite" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.55, margin: 0 }}>
                      Generiere einen persönlichen Einlade-Link. Die Person sieht deine Liste und kann sich registrieren, um mitzumachen.
                    </p>

                    {/* Emoji picker */}
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Emoji</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {PERSON_EMOJIS.map(em => (
                          <button key={em} onClick={() => setInviteEmoji(em)} style={{ background: inviteEmoji === em ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${inviteEmoji === em ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "5px 8px", fontSize: "1.1rem", cursor: "pointer" }}>{em}</button>
                        ))}
                      </div>
                    </div>

                    {!generatedLink ? (
                      <button onClick={generateInviteLink}
                        style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", borderRadius: 12, padding: "13px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}>
                        🔗 Einlade-Link erstellen
                      </button>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", fontSize: "0.72rem", color: "var(--text-dim)", wordBreak: "break-all", fontFamily: "monospace" }}>
                          {generatedLink}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => { navigator.clipboard.writeText(generatedLink).then(() => { setInviteLinkCopied(true); setTimeout(() => setInviteLinkCopied(false), 2500) }) }}
                            style={{ flex: 1, background: inviteLinkCopied ? "rgba(46,204,138,0.15)" : "var(--accent)", color: inviteLinkCopied ? "var(--accent)" : "#000", border: inviteLinkCopied ? "1px solid var(--accent)" : "none", borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer" }}>
                            {inviteLinkCopied ? "✓ Kopiert!" : "📋 Kopieren"}
                          </button>
                          {typeof navigator !== "undefined" && navigator.share && (
                            <button onClick={() => navigator.share({ title: `TRUE Einkaufsliste teilen`, url: generatedLink })}
                              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 18px", fontSize: "1.1rem", cursor: "pointer" }}>↗</button>
                          )}
                        </div>
                        <button onClick={() => { setGeneratedLink(null); setInviteName(""); setInviteEmoji("👤") }}
                          style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.78rem", cursor: "pointer", padding: "4px" }}>
                          Neuen Link erstellen
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Einlade-Modal ── */}
      {inviteMember && (() => {
        const listId = (() => {
          try {
            let id = localStorage.getItem("true-list-id")
            if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem("true-list-id", id) }
            return id
          } catch { return "shared" }
        })()
        const link = `https://get-true.de/join?list=${listId}&name=${encodeURIComponent(inviteMember.name)}&emoji=${encodeURIComponent(inviteMember.emoji)}`
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setInviteMember(null) }}>
            <div style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <span style={{ fontWeight: 800, fontSize: "1rem" }}>{inviteMember.emoji} {inviteMember.name} einladen</span>
                <button onClick={() => setInviteMember(null)} style={{ background: "none", border: "none", fontSize: "1.3rem", color: "var(--text-dim)", cursor: "pointer", padding: 4 }}>✕</button>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: 16, lineHeight: 1.5 }}>
                Teile diesen Link mit <strong style={{ color: "var(--text)" }}>{inviteMember.name}</strong>. Sobald die Person TRUE installiert und den Link öffnet, wird sie zur Einkaufsliste hinzugefügt.
              </p>
              {/* Link box */}
              <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", fontSize: "0.75rem", color: "var(--text-dim)", wordBreak: "break-all", marginBottom: 14, fontFamily: "monospace" }}>
                {link}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(link).then(() => { setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000) }) }}
                  style={{ flex: 1, background: inviteCopied ? "rgba(46,204,138,0.15)" : "var(--accent)", color: inviteCopied ? "var(--accent)" : "#000", border: inviteCopied ? "1px solid var(--accent)" : "none", borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}
                >
                  {inviteCopied ? "✓ Kopiert!" : "🔗 Link kopieren"}
                </button>
                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    onClick={() => navigator.share({ title: `${inviteMember.name} zu TRUE einladen`, url: link })}
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", fontSize: "1.1rem", cursor: "pointer" }}
                  >
                    ↗
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      <style>{`
        @keyframes pulse0 { 0%,100%{opacity:1;transform:translate(-50%,-50%) scale(1)} 50%{opacity:.6;transform:translate(-50%,-50%) scale(1.4)} }
        @keyframes pulse1 { 0%,100%{opacity:1;transform:translate(-50%,-50%) scale(1)} 50%{opacity:.5;transform:translate(-50%,-50%) scale(1.6)} }
        @keyframes pulse2 { 0%,100%{opacity:1;transform:translate(-50%,-50%) scale(1)} 50%{opacity:.7;transform:translate(-50%,-50%) scale(1.3)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
    </>
  )
}
