"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import BottomNav from "@/components/BottomNav"
import { ThemeToggle, ThemeIcon } from "@/components/ThemeProvider"
import Link from "next/link"
import PremiumGate from "@/components/PremiumGate"
import { useListSync } from "@/lib/useListSync"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"
import { guessEmoji, guessCategory } from "@/lib/productDetection"
import ProductCoachPanel from "@/components/ProductCoachPanel"

interface FamilyMember { id: string; name: string; age: string; emoji: string }

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low" | "none"
type Category = "snacks" | "drinks" | "dairy" | "bread" | "pasta" | "produce" | "household" | "frozen" | "meat"

interface Alternative {
  name: string
  stores: string[]
  price: string
  pexelsId?: number
  link?: string        // product link to show on website
}

interface CatalogProduct {
  id: string
  name: string
  brand: string
  issue: string
  severity: Severity
  emoji: string
  category: Category
  alternative?: Alternative
  issueDetail?: string
  sources?: IssueSource[]
}

interface IssueSource {
  label: string
  url: string
  desc?: string
}

interface ListItem extends CatalogProduct {
  checked: boolean
  addedAt: number
  personId?: string   // which family member this item belongs to
}

// ─── Shared Source Data ───────────────────────────────────────────────────────

const SRC_PALMOIL: IssueSource[] = [
  { label: "Rainforest Action Network", url: "https://www.ran.org/palm-oil/", desc: "Konzern-Rangliste & Abholzungs-Tracking" },
  { label: "WWF Palmöl-Report 2023", url: "https://www.wwf.de/themen-projekte/landwirtschaft/produkte-aus-der-natur/palmoil", desc: "840.000 ha Regenwald 2023 vernichtet" },
  { label: "EFSA – GE-Fettsäureester", url: "https://www.efsa.europa.eu/en/efsajournal/pub/4426", desc: "Krebsverdacht bei erhitztem Palmöl" },
]

const SRC_WATER: IssueSource[] = [
  { label: "TU Berlin – Wasserreport", url: "https://www.tu.berlin/", desc: "Coca-Cola entnimmt bis zu 350 % über Genehmigung" },
  { label: "US Forest Service – Nestlé", url: "https://www.fs.usda.gov/", desc: "Nestlé Waters ohne gültige Genehmigung" },
  { label: "WHO – Wasserknappheit global", url: "https://www.who.int/news-room/fact-sheets/detail/drinking-water", desc: "3 Mrd. Menschen ohne sicheres Trinkwasser" },
]

const SRC_CHEMICALS: IssueSource[] = [
  { label: "BUND – Waschmittel-Check", url: "https://www.bund.net/themen/chemikalien/", desc: "Gefährliche Inhaltsstoffe in Haushaltsreinigern" },
  { label: "Öko-Test Waschmittel", url: "https://www.oekotest.de/haushalt/Waschmittel-im-Test_11531_1.html", desc: "Unabhängiger Labortest aller gängigen Marken" },
]

const SRC_PESTICIDES: IssueSource[] = [
  { label: "PAN Europe – Pestizid-Atlas", url: "https://www.pan-europe.info/resources/reports/", desc: "Glyphosat & Co. in Lebensmitteln" },
  { label: "Greenpeace – Bananen-Report", url: "https://www.greenpeace.de/themen/landwirtschaft/pestizide", desc: "Chiquita Pestizideinsatz dokumentiert" },
]

const SRC_FACTORY: IssueSource[] = [
  { label: "Greenpeace – Milchreport", url: "https://www.greenpeace.de/themen/landwirtschaft/massentierhaltung", desc: "Zustände in deutschen Milchbetrieben" },
  { label: "Albert Schweitzer Stiftung", url: "https://albert-schweitzer-stiftung.de/massentierhaltung", desc: "Dokumentation Massentierhaltung" },
]

// ─── Catalog ──────────────────────────────────────────────────────────────────

const CATALOG: CatalogProduct[] = [
  // snacks
  { id: "kitkat",  name: "KitKat",        brand: "Nestlé",    issue: "Palmöl",           severity: "high",   emoji: "🍫", category: "snacks",    alternative: { name: "Vivani Bio",     stores: ["dm", "Rewe"],          price: "~1,80€", pexelsId: 918327,  link: "https://www.vivani.de/sortiment/schokolade/" }, issueDetail: "Nestlé verwendet Palmöl aus nicht-zertifizierten Quellen. Für eine Tonne Palmöl werden 1,3 ha Regenwald gerodet.", sources: SRC_PALMOIL },
  { id: "nutella", name: "Nutella",        brand: "Ferrero",   issue: "Palmöl",           severity: "high",   emoji: "🫙", category: "snacks",    alternative: { name: "Nocciolata Bio", stores: ["Rewe", "Edeka"],        price: "~4,50€", pexelsId: 1126359, link: "https://www.rigoni.it/de/produkte/nocciolata/" }, issueDetail: "Ferrero ist einer der weltgrößten Palmöl-Käufer. Greenpeace dokumentierte Palmöl aus Regenwaldrodungen.",        sources: SRC_PALMOIL },
  { id: "pringles",name: "Pringles",       brand: "Kellogg's", issue: "Palmöl",           severity: "medium", emoji: "🥫", category: "snacks",    issueDetail: "Palmöl in der Rezeptur — Kellogg's hat keine vollständige Rückverfolgung der Lieferkette veröffentlicht.", sources: SRC_PALMOIL },
  { id: "milka",   name: "Milka",          brand: "Mondelez",  issue: "Palmöl",           severity: "high",   emoji: "🍫", category: "snacks",    alternative: { name: "Zotter Bio",     stores: ["Bio Company", "Alnatura"], price: "~2,90€", pexelsId: 65882 }, issueDetail: "Mondelez (Milka) wurde 2022 vom Rainforest Action Network als Konzern mit mangelhafter Palmöl-Transparenz gelistet.", sources: SRC_PALMOIL },
  { id: "oreo",    name: "Oreo",           brand: "Mondelez",  issue: "Palmöl",           severity: "medium", emoji: "🍪", category: "snacks",    issueDetail: "Palmöl-Anteil in der Füllung. Mondelez hat RSPO-Zertifizierung, aber keine vollständige Rückverfolgung.", sources: SRC_PALMOIL },
  { id: "lays",    name: "Lay's",          brand: "PepsiCo",   issue: "Palmöl",           severity: "medium", emoji: "🥔", category: "snacks",    issueDetail: "PepsiCo verwendet Palmöl in der Frittierung. RSPO-Mitglied, Umsetzung lückenhaft.", sources: SRC_PALMOIL },
  // drinks
  { id: "cocacola",name: "Coca-Cola",      brand: "Coca-Cola", issue: "Wasserrechte",     severity: "high",   emoji: "🥤", category: "drinks",    alternative: { name: "Bionade",        stores: ["Rewe", "Edeka", "Lidl"],   price: "~1,20€", pexelsId: 2668503, link: "https://www.bionade.de" }, issueDetail: "Coca-Cola entnimmt täglich 1,8 Mrd. Liter Grundwasser, auch in wasserknappen Regionen — laut TU Berlin bis zu 350 % über Genehmigung.", sources: SRC_WATER },
  { id: "fanta",   name: "Fanta",          brand: "Coca-Cola", issue: "Wasserrechte",     severity: "medium", emoji: "🍊", category: "drinks",    issueDetail: "Fanta-Produktion durch Coca-Cola — gleiche Wasserentnahme-Problematik wie bei Coca-Cola.", sources: SRC_WATER },
  { id: "nescafe", name: "Nescafé",        brand: "Nestlé",    issue: "Wasserrechte",     severity: "high",   emoji: "☕", category: "drinks",    alternative: { name: "Kaffa Noir Bio", stores: ["Alnatura"],               price: "~4,90€", pexelsId: 312418 }, issueDetail: "Nestlé Waters entnahm ohne gültige Genehmigung Wasser aus US-Nationalparks (US Forest Service Untersuchung 2021).", sources: SRC_WATER },
  { id: "caprisun",name: "Capri-Sun",      brand: "Coca-Cola", issue: "Zucker",           severity: "low",    emoji: "🧃", category: "drinks" },
  { id: "redbull", name: "Red Bull",       brand: "Redbull",   issue: "—",                severity: "none",   emoji: "🐂", category: "drinks" },
  // dairy
  { id: "milram",  name: "Milram Milch",   brand: "FrieslandCampina", issue: "Massentierhaltung", severity: "medium", emoji: "🥛", category: "dairy", alternative: { name: "Weidemilch Bio", stores: ["Rewe", "Edeka", "Alnatura"], price: "~1,50€", link: "https://www.rewe.de" }, issueDetail: "FrieslandCampina-Höfe halten Tiere mehrheitlich in Anbindehaltung oder Großställen ohne Weidezugang.", sources: SRC_FACTORY },
  { id: "danone",  name: "Danone Joghurt", brand: "Danone",    issue: "—",                severity: "none",   emoji: "🍶", category: "dairy" },
  { id: "landliebe",name:"Landliebe",      brand: "FrieslandCampina", issue: "Massentierhaltung", severity: "medium", emoji: "🧈", category: "dairy", alternative: { name: "Andechser Bio-Joghurt", stores: ["Rewe", "Edeka", "dm"], price: "~1,80€", link: "https://www.andechser-natur.de" }, issueDetail: "Trotz 'Landliebe'-Image: Mehrheit der Lieferanten-Höfe ohne Weidegang zertifiziert.", sources: SRC_FACTORY },
  // bread
  { id: "toast",   name: "Toast Harry",    brand: "Lieken",    issue: "Palmöl",           severity: "medium", emoji: "🍞", category: "bread",     issueDetail: "Palmöl als Backhilfsmittel. Lieken (zu Barilla) hat keine transparente Palmöl-Lieferkette veröffentlicht.", sources: SRC_PALMOIL },
  { id: "wasa",    name: "Knäckebrot Wasa",brand: "Barilla",   issue: "—",                severity: "none",   emoji: "🫓", category: "bread" },
  // produce
  { id: "bananen", name: "Bananen Chiquita",brand:"Chiquita",  issue: "Pestizide",        severity: "medium", emoji: "🍌", category: "produce",   alternative: { name: "Fairtrade Bio-Bananen", stores: ["Rewe", "Edeka", "Alnatura", "Lidl"], price: "~0,39€/Stk", link: "https://www.fairtrade-deutschland.de/fairtrade-produkte/lebensmittel/bananen" }, issueDetail: "Greenpeace dokumentierte hohen Pestizideinsatz auf Chiquita-Plantagen in Lateinamerika. Arbeiter ohne Schutzausrüstung.", sources: SRC_PESTICIDES },
  { id: "aepfel",  name: "Äpfel",          brand: "",          issue: "—",                severity: "none",   emoji: "🍎", category: "produce" },
  { id: "tomaten", name: "Tomaten",        brand: "",          issue: "—",                severity: "none",   emoji: "🍅", category: "produce" },
  { id: "karotten",name: "Karotten",       brand: "",          issue: "—",                severity: "none",   emoji: "🥕", category: "produce" },
  // household
  { id: "ariel",   name: "Ariel",          brand: "P&G",       issue: "Chemikalien",      severity: "medium", emoji: "🧴", category: "household", alternative: { name: "Sodasan Bio",    stores: ["dm", "Alnatura"],          price: "~5,90€", pexelsId: 545015,  link: "https://www.sodasan.com/produkte/waschmittel/" }, issueDetail: "Ariel enthält laut Öko-Test optische Aufheller und schwer abbaubare Tenside. P&G hat keine vollständige Inhaltsstoff-Offenlegung.", sources: SRC_CHEMICALS },
  { id: "persil",  name: "Persil",         brand: "Henkel",    issue: "Chemikalien",      severity: "medium", emoji: "🧺", category: "household", alternative: { name: "Frosch",         stores: ["Rewe", "Edeka", "dm"],     price: "~4,50€", pexelsId: 2346165, link: "https://www.frosch.de/produkte/waschmittel/" }, issueDetail: "Persil enthält synthetische Duftstoffe und Enzyme, die in Gewässern nicht vollständig abgebaut werden.", sources: SRC_CHEMICALS },
  { id: "fairy",   name: "Fairy",          brand: "P&G",       issue: "Chemikalien",      severity: "low",    emoji: "🫧", category: "household", issueDetail: "Geringes Risiko, aber synthetische Duftstoffe. Bessere Alternativen wie Frosch oder Fit sind verfügbar.", sources: SRC_CHEMICALS },
  // frozen
  { id: "tiefkuehl-pizza", name: "TK Pizza", brand: "", issue: "—", severity: "none", emoji: "🍕", category: "frozen" },
  { id: "tiefkuehl-erbsen",name: "TK Erbsen",brand: "", issue: "—", severity: "none", emoji: "🫛", category: "frozen" },
  // meat
  { id: "haehnchen", name: "Hähnchen",     brand: "",          issue: "—",                severity: "none",     emoji: "🍗", category: "meat" },
  { id: "hackfleisch",name:"Hackfleisch",  brand: "",          issue: "—",                severity: "none",     emoji: "🥩", category: "meat" },
]

const CATEGORY_META: Record<Category, { label: string; emoji: string; bg: string; color: string; border: string }> = {
  produce:   { label: "Obst & Gemüse",    emoji: "🥦", color: "#22cc6e", bg: "rgba(34,204,110,0.10)",   border: "rgba(34,204,110,0.25)"  },
  dairy:     { label: "Milch & Käse",     emoji: "🥛", color: "#44aaff", bg: "rgba(68,170,255,0.10)",   border: "rgba(68,170,255,0.25)"  },
  bread:     { label: "Brot & Gebäck",    emoji: "🍞", color: "#ff8833", bg: "rgba(255,136,51,0.10)",   border: "rgba(255,136,51,0.25)"  },
  pasta:     { label: "Teigwaren & Reis", emoji: "🍝", color: "#ffcc00", bg: "rgba(255,204,0,0.10)",    border: "rgba(255,204,0,0.25)"   },
  snacks:    { label: "Snacks",           emoji: "🍫", color: "#cc66ff", bg: "rgba(204,102,255,0.10)",  border: "rgba(204,102,255,0.25)" },
  drinks:    { label: "Getränke",         emoji: "🧃", color: "#00ccff", bg: "rgba(0,204,255,0.10)",    border: "rgba(0,204,255,0.25)"   },
  meat:      { label: "Fleisch & Fisch",  emoji: "🥩", color: "#ff4455", bg: "rgba(255,68,85,0.10)",    border: "rgba(255,68,85,0.25)"   },
  frozen:    { label: "Tiefkühl",         emoji: "🧊", color: "#88eeff", bg: "rgba(136,238,255,0.10)",  border: "rgba(136,238,255,0.25)" },
  household: { label: "Haushalt",         emoji: "🧴", color: "#aaaacc", bg: "rgba(170,170,204,0.10)",  border: "rgba(170,170,204,0.25)" },
}

const CATEGORY_ORDER: Category[] = ["produce", "dairy", "bread", "pasta", "meat", "frozen", "drinks", "snacks", "household"]

const CATEGORY_FILTERS = [
  { key: "all",       label: "Alle",            emoji: "🛒",  color: "var(--accent)" },
  { key: "produce",   label: "Obst & Gemüse",   emoji: "🥦",  color: "#22cc6e" },
  { key: "dairy",     label: "Milch & Käse",    emoji: "🥛",  color: "#44aaff" },
  { key: "bread",     label: "Brot & Gebäck",   emoji: "🍞",  color: "#ff8833" },
  { key: "pasta",     label: "Teigwaren & Reis", emoji: "🍝", color: "#ffcc00" },
  { key: "snacks",    label: "Snacks",           emoji: "🍫",  color: "#cc66ff" },
  { key: "drinks",    label: "Getränke",         emoji: "🧃",  color: "#00ccff" },
  { key: "household", label: "Haushalt",         emoji: "🧴",  color: "#aaaacc" },
  { key: "frozen",    label: "Tiefkühl",         emoji: "🧊",  color: "#88eeff" },
  { key: "meat",      label: "Fleisch & Fisch",  emoji: "🥩",  color: "#ff4455" },
]

const STORES = ["Alle", "Rewe", "Edeka", "Lidl", "Aldi", "dm", "Alnatura", "Bio Company"]

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ff2244",
  high:     "#ff5533",
  medium:   "#ffaa00",
  low:      "#44aaff",
  none:     "transparent",
}

const STORAGE_KEY = "shopping-list-items-v1"

// ─── Nutrition Coach data ─────────────────────────────────────────────────────

const PROD_FLAGS: Record<string, string[]> = {
  nutella:           ["high-sugar","high-fat","palmöl"],
  kitkat:            ["high-sugar","high-fat","palmöl"],
  milka:             ["high-sugar","palmöl"],
  oreo:              ["high-sugar","palmöl"],
  pringles:          ["high-fat","palmöl","processed"],
  lays:              ["high-fat","processed"],
  cocacola:          ["high-sugar","empty-kcal"],
  fanta:             ["high-sugar","empty-kcal"],
  redbull:           ["caffeine","high-sugar"],
  caprisun:          ["high-sugar"],
  nescafe:           ["caffeine"],
  milram:            ["dairy","protein","calcium"],
  danone:            ["dairy","protein","probiotic"],
  landliebe:         ["dairy","calcium"],
  toast:             ["processed","palmöl","low-fiber"],
  wasa:              ["whole-grain","fiber","low-fat"],
  bananen:           ["potassium","fiber","fruit"],
  aepfel:            ["fiber","vitamin-c","fruit"],
  tomaten:           ["vitamin-c","vegetable","lycopene"],
  karotten:          ["beta-carotene","fiber","vegetable"],
  ariel:             ["household"],
  persil:            ["household"],
  fairy:             ["household"],
  "tiefkuehl-pizza": ["processed","high-fat","high-sodium"],
  "tiefkuehl-erbsen":["vegetable","fiber","protein"],
  haehnchen:         ["protein","lean-meat"],
  hackfleisch:       ["protein","high-fat","meat"],
}

const CAT_FLAGS: Record<string, string[]> = {
  produce:   ["fiber","vitamins","vegetable","low-cal"],
  dairy:     ["dairy","calcium","protein"],
  bread:     ["carbs"],
  pasta:     ["carbs","energy"],
  snacks:    ["high-sugar","high-fat","processed"],
  drinks:    ["liquid"],
  meat:      ["protein","animal"],
  frozen:    ["processed"],
  household: ["household"],
}

// Protein per 100g known products
const PROTEIN_LABEL: Record<string, string> = {
  haehnchen: "23g/100g", hackfleisch: "17g/100g",
  milram: "3.4g/100ml", danone: "4g/100g",
  "tiefkuehl-erbsen": "5g/100g", wasa: "10g/100g",
}

// Sugar label known products
const SUGAR_LABEL: Record<string, string> = {
  nutella: "56g", cocacola: "10g/100ml", kitkat: "49g",
  oreo: "37g", caprisun: "11g/100ml", fanta: "9g/100ml",
  milka: "51g", redbull: "11g/100ml",
}

type TipType = "warn"|"good"|"miss"|"tip"
interface CoachTip { type: TipType; text: string }

function getFlags(item: ListItem): string[] {
  return PROD_FLAGS[item.id] ?? CAT_FLAGS[item.category ?? ""] ?? []
}

// ─── Haustier-Erkennung ───────────────────────────────────────────────────────
const PET_EMOJIS = new Set(["🐕","🐈","🐶","🐱","🐾","🐇","🐹","🐠","🐦","🦜","🐰","🦮","🐩","🐈‍⬛","🐕‍🦺","🐓","🐢","🦎","🐠","🐡","🐦"])
const PET_REGEX  = /hund|katze|hamster|vogel|kaninchen|hase|welpe|kitten|kätzchen|haustier|meerschwein|schildkröte|goldfisch|labrador|retriever|bulldogge|pudel|dackel|papagei/i
function isPet(member: { name: string; emoji: string }) {
  return PET_EMOJIS.has(member.emoji) || PET_REGEX.test(member.name)
}

// ─── Getränke-Check ───────────────────────────────────────────────────────────
const SUGARY_DRINKS = ["cocacola","fanta","sprite","redbull","monster","caprisun","eistee","softdrink"]
const HEALTHY_DRINKS = ["wasser","sprudel","tee","kräutertee","mineralwasser","grüner-tee","kaffee"]

function drinkTips(items: ListItem[], goal?: string): CoachTip[] {
  const tips: CoachTip[] = []
  const drinks = items.filter(i => i.category === "drinks")
  const sugaryDrinks = drinks.filter(i => SUGARY_DRINKS.includes(i.id) || getFlags(i).includes("high-sugar"))
  const hasHealthyDrink = drinks.some(i => HEALTHY_DRINKS.includes(i.id))
  const hasWater = items.some(i => i.name.toLowerCase().includes("wasser") || i.id === "wasser" || i.id === "mineralwasser")

  if (!hasWater && !hasHealthyDrink) {
    // Personalized water tip by goal
    let waterMissTip = "💧 Wasser fehlt — 1.5–2L/Tag. Der günstigste Gesundheits-Booster."
    if (goal === "abnehmen") waterMissTip = "💧 Wasser fehlt! Tipp: 500ml Wasser vor dem Essen trinken — reduziert Hunger um bis zu 22% und spart Kalorien."
    else if (goal === "muskel" || goal === "muskelaufbau") waterMissTip = "💧 Wasser fehlt — Muskeln bestehen zu 76% aus Wasser. Ohne ausreichend Flüssigkeit sinkt deine Leistung im Training."
    else if (goal === "kind" || goal === "familie") waterMissTip = "💧 Wasser fehlt — Kinder brauchen 1–1,5L/Tag. Zuckergetränke fördern Karies und Übergewicht."
    tips.push({ type: "miss", text: waterMissTip })
  } else if (hasWater) {
    // Personalized water good tip by goal
    let waterGoodTip = "💧 Wasser ✓ — perfekte Wahl. Kein Zucker, kein Koffein."
    if (goal === "abnehmen") waterGoodTip = "💧 Wasser ✓ — Top! Wenn du Hunger spürst, zuerst ein Glas Wasser trinken — oft ist es nur Durst."
    else if (goal === "muskel" || goal === "muskelaufbau") waterGoodTip = "💧 Wasser ✓ — Gut! Trinke 0.5L extra für jede Stunde Training."
    else if (goal === "kind" || goal === "familie") waterGoodTip = "💧 Wasser ✓ — Super! Wasser ist die beste Wahl für die ganze Familie."
    tips.push({ type: "good", text: waterGoodTip })
  }
  if (sugaryDrinks.length > 0) {
    const d = sugaryDrinks[0]
    const s = SUGAR_LABEL[d.id] ? ` (${SUGAR_LABEL[d.id]} Zucker)` : ""
    let altText = "Alternative: stilles Wasser mit Zitrone"
    if (goal === "abnehmen") altText = "Alternative: Wasser mit Gurke oder ungesüßter Tee — spart 100–150 kcal pro Dose"
    else if (goal === "muskel" || goal === "muskelaufbau") altText = "Alternative: Wasser + eine Prise Salz nach dem Training (Elektrolyte)"
    tips.push({ type: "warn", text: `🥤 ${d.emoji} ${d.name}${s} — ${altText}` })
  }
  if (sugaryDrinks.length >= 2) {
    tips.push({ type: "tip", text: "💡 Ungesüßter Tee, Kefir oder Kombucha als Soft-Drink-Ersatz" })
  }
  return tips
}

function analyzeCart(goal: string, items: ListItem[]): CoachTip[] {
  const food = items.filter(i => i.category !== "household")
  const tips: CoachTip[] = []
  const has = (cat: string) => food.some(i => i.category === cat)
  const get = (id: string) => food.find(i => i.id === id)
  const withFlag = (f: string) => food.filter(i => getFlags(i).includes(f))

  // Immer: Getränke-Check (personalisiert nach Ziel)
  const dTips = drinkTips(food, goal)
  tips.push(...dTips.slice(0, 1)) // max 1 Getränke-Tipp in Ziel-Analyse

  switch (goal) {
    case "abnehmen": {
      const sugary = withFlag("high-sugar").filter(i => i.category !== "drinks").slice(0, 2)
      sugary.forEach(i => {
        const s = SUGAR_LABEL[i.id]
        tips.push({ type: "warn", text: `${i.emoji} ${i.name}${s ? ` — ${s} Zucker/100g` : ""} → max 2× pro Woche` })
      })
      if (has("produce")) tips.push({ type: "good", text: "🥦 Gemüse ✓ — Volumen satt machen, ~35 kcal/100g" })
      if (get("wasa"))    tips.push({ type: "good", text: "🫓 Wasa ✓ — sättigt lange, nur 1.5g Fett" })
      if (!has("produce"))tips.push({ type: "miss", text: "➕ Gemüse fehlt — sättigt mit <50 kcal/100g" })
      if (!withFlag("protein").length) tips.push({ type: "miss", text: "➕ Protein fehlt — erhält Muskeln beim Abnehmen" })
      if (dTips.length === 0) tips.push({ type: "tip", text: "💡 Vor dem Essen 500ml Wasser → 22% weniger Hunger" })
      break
    }
    case "muskelaufbau": case "muskel": {
      const proteins = withFlag("protein")
      if (proteins.length === 0) {
        tips.push({ type: "miss", text: "➕ Protein fehlt — Ziel: 1.6g × kg Körpergewicht/Tag" })
      } else {
        proteins.slice(0, 2).forEach(i => {
          const p = PROTEIN_LABEL[i.id] ?? "~10g/100g"
          tips.push({ type: "good", text: `${i.emoji} ${i.name} — ${p} Protein ✓` })
        })
      }
      if (!has("produce")) tips.push({ type: "miss", text: "➕ Gemüse fehlt — Mikronährstoffe für Muskelregeneration" })
      if (get("cocacola") || get("redbull")) tips.push({ type: "warn", text: "⚠️ Zucker-Drinks nach Training bremsen Fettverbrennung" })
      if (!has("meat") && !has("dairy")) tips.push({ type: "miss", text: "➕ 2. Proteinquelle: Quark, Eier oder Hülsenfrüchte" })
      tips.push({ type: "tip",  text: "💡 Protein im 3h-Fenster nach Training → +20% Muskelaufbau" })
      break
    }
    case "vegan": {
      const animal = food.filter(i => getFlags(i).some(f => ["dairy","meat","animal","protein"].includes(f) && i.category !== "produce"))
      animal.slice(0, 2).forEach(i => {
        tips.push({ type: "warn", text: `${i.emoji} ${i.name} — tierisch → ${i.alternative?.name ?? "Pflanzliche Alternative"}` })
      })
      if (!has("produce")) tips.push({ type: "miss", text: "➕ Hülsenfrüchte — Protein & Eisen ohne Tier" })
      if (has("produce"))  tips.push({ type: "good", text: "🥦 Pflanzenbasis ✓ — weiter so" })
      tips.push({ type: "tip",  text: "💡 B12 täglich ergänzen — fehlt in veganer Ernährung immer" })
      break
    }
    case "kind": {
      const junk = ["nutella","kitkat","milka","cocacola","fanta","redbull","caprisun","oreo"]
      const junks = food.filter(i => junk.includes(i.id))
      if (junks.length) tips.push({ type: "warn", text: `${junks[0].emoji} Süßes/Koffein → WHO: max 25g Zucker/Tag für Kinder` })
      if (get("redbull") || get("cocacola")) tips.push({ type: "warn", text: "🚫 Koffein für Kinder unter 18 nicht empfohlen" })
      if (has("produce")) tips.push({ type: "good", text: "🥦 Gemüse ✓ — Kinder: 5 Portionen/Tag Ziel" })
      else tips.push({ type: "miss", text: "➕ Obst oder Gemüse fehlt — 200g/Tag Minimum" })
      if (!has("dairy"))  tips.push({ type: "miss", text: "➕ Milchprodukt fehlt — Kalzium für Knochenwachstum" })
      tips.push({ type: "tip",  text: "💡 Kinder essen was sie kennen — 10× anbieten bevor 'mögen'" })
      break
    }
    case "diabetes": {
      const sugary = withFlag("high-sugar")
      sugary.slice(0, 2).forEach(i => {
        const s = SUGAR_LABEL[i.id]
        tips.push({ type: "warn", text: `${i.emoji} ${i.name}${s ? ` — ${s} Zucker` : ""} — Blutzucker-Spike` })
      })
      if (!has("produce")) tips.push({ type: "miss", text: "➕ Ballaststoffe fehlen — verlangsamen Glukose-Aufnahme" })
      if (has("produce"))  tips.push({ type: "good", text: "🥦 Gemüse ✓ — niedriger glykämischer Index" })
      tips.push({ type: "tip", text: "💡 Wasser statt Saft — 1 Glas OJ hat so viel Zucker wie Cola" })
      break
    }
    case "herzgesund": {
      const highFat = withFlag("high-fat")
      highFat.slice(0, 2).forEach(i => tips.push({ type: "warn", text: `${i.emoji} ${i.name} — gesättigte Fette erhöhen LDL-Cholesterin` }))
      if (has("produce"))  tips.push({ type: "good", text: "🥦 Gemüse ✓ — schützt Herz durch Folsäure & Kalium" })
      if (!has("produce")) tips.push({ type: "miss", text: "➕ Omega-3-Quelle fehlt: Leinsamen, Nüsse, Lachs" })
      tips.push({ type: "tip", text: "💡 Olivenöl statt Butter — senkt LDL um bis zu 15%" })
      break
    }
    default: {
      const bad = food.filter(i => i.severity === "high").slice(0, 2)
      bad.forEach(i => tips.push({ type: "warn", text: `${i.emoji} ${i.name} — ${i.issue} (hohes Risiko)` }))
      if (has("produce")) tips.push({ type: "good", text: "🥦 Obst & Gemüse ✓ — gute Basis" })
      else tips.push({ type: "miss", text: "➕ Kein Obst/Gemüse — Fundament jeder Ernährung" })
      tips.push({ type: "tip",  text: "💡 Ziel im Profil setzen → Coach wird sofort präziser" })
    }
  }
  return tips.slice(0, 6)
}

// ─── Allergen mapping ─────────────────────────────────────────────────────────

const ALLERGEN_MAP: Record<string, string[]> = {
  laktose:       ["milram","danone","landliebe","milka","kitkat"],
  gluten:        ["toast","wasa","kitkat","oreo","pringles","lays"],
  nuesse:        ["nutella","milka","kitkat"],
  eier:          ["toast"],
  soja:          ["toast","pringles","lays"],
  fisch:         [],
  "meeresfrüchte": [],
  sellerie:      [],
  sesam:         ["toast","wasa"],
  "palmöl":      ["nutella","kitkat","milka","oreo","pringles","lays","toast","ariel","persil"],
}

// ─── NutritionCoach Chat Bubble ───────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  abnehmen: "🔥 Abnehmen", muskelaufbau: "💪 Muskelaufbau", muskel: "💪 Muskel",
  vegan: "🌱 Vegan", vegetarisch: "🥦 Vegetarisch", kind: "👶 Kind / Familie",
  diabetes: "💉 Diabetes", herzgesund: "❤️ Herzgesund",
}

const TIP_STYLE: Record<TipType, { bg: string; border: string; dot: string }> = {
  warn: { bg: "rgba(255,68,85,0.09)",  border: "rgba(255,68,85,0.22)",  dot: "#ff4455" },
  good: { bg: "rgba(34,204,110,0.09)", border: "rgba(34,204,110,0.22)", dot: "#22cc6e" },
  miss: { bg: "rgba(255,170,0,0.09)",  border: "rgba(255,170,0,0.22)",  dot: "#ffaa00" },
  tip:  { bg: "rgba(68,170,255,0.09)", border: "rgba(68,170,255,0.22)", dot: "#44aaff" },
}

const ALLERGEN_LABELS: Record<string, string> = {
  laktose: "Laktose", gluten: "Gluten", nuesse: "Nüsse", eier: "Eier",
  soja: "Soja", fisch: "Fisch", "meeresfrüchte": "Meeresfrüchte",
  sellerie: "Sellerie", sesam: "Sesam", "palmöl": "Palmöl",
}

function allergenTips(items: ListItem[], allergies: string[]): CoachTip[] {
  const tips: CoachTip[] = []
  for (const allergy of allergies) {
    const ids = ALLERGEN_MAP[allergy] ?? []
    const hits = items.filter(i => ids.includes(i.id))
    if (hits.length > 0) {
      hits.slice(0, 2).forEach(item => {
        tips.push({ type: "warn", text: `🚫 ${item.emoji} ${item.name} enthält ${ALLERGEN_LABELS[allergy] ?? allergy}` })
      })
    }
  }
  return tips
}

// Chat message type – extends CoachTip with "user" role
type ChatMsg = { role: "bot" | "user"; type?: TipType; text: string }

const QUICK_REPLIES = [
  { label: "⚠️ Probleme in meiner Liste?",    key: "Welche Produkte in meiner Liste sind problematisch und warum?" },
  { label: "➕ Was fehlt mir?",               key: "Was fehlt in meiner Einkaufsliste für eine ausgewogene Ernährung?" },
  { label: "🔄 Bessere Alternativen",         key: "Für welche Produkte in meiner Liste gibt es ethisch bessere Alternativen?" },
  { label: "🥗 Gesamtbewertung",             key: "Wie bewertest du meine gesamte Einkaufsliste kurz zusammengefasst?" },
]

// ─── Intelligente Antwort-Engine ──────────────────────────────────────────────
function generateCoachReply(input: string, items: ListItem[], goals: string[], allergies: string[]): ChatMsg[] {
  const q    = input.toLowerCase().trim()
  const food = items.filter(i => i.category !== "household")
  const activeGoal = goals.find(g => GOAL_LABELS[g]) ?? ""

  // Keyword-basierte Antworten
  if (/zucker|süß|süßigkeiten|schokolade|candy/i.test(q)) {
    const sugary = food.filter(i => getFlags(i).includes("high-sugar"))
    if (sugary.length > 0)
      return [{ role: "bot", type: "warn", text: `⚠️ Zucker: ${sugary.map(i => i.name).join(", ")} haben hohen Zuckergehalt. WHO-Empfehlung: max. 25g/Tag für Erwachsene.` }]
    return [{ role: "bot", type: "good", text: "✅ Kein offensichtlicher Zucker-Überschuss in deiner Liste erkannt. Achte trotzdem auf versteckten Zucker in Saucen und Fertigprodukten." }]
  }
  if (/protein|eiweiß|muskel|fleisch|quark|hühnchen/i.test(q)) {
    const proteins = food.filter(i => getFlags(i).includes("protein"))
    if (proteins.length > 0)
      return [{ role: "bot", type: "good", text: `💪 Protein: ${proteins.map(i => `${i.emoji} ${i.name}`).join(", ")}. Für Muskelaufbau: 1.6–2g/kg Körpergewicht täglich.` }]
    return [{ role: "bot", type: "miss", text: "➕ Protein fehlt in deiner Liste. Hühnchen, Quark, Eier, Hülsenfrüchte oder Tofu wären gute Ergänzungen." }]
  }
  if (/wasser|trinken|getränk|durst|flüssigkeit/i.test(q)) {
    const dTips = drinkTips(food)
    return dTips.length > 0
      ? dTips.map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
      : [{ role: "bot", type: "good", text: "💧 Täglicher Bedarf: 1.5–2L Wasser. Mehr bei Sport oder Hitze. Ungesüßter Tee, Mineralwasser oder Leitungswasser sind ideal." }]
  }
  if (/gemüse|obst|frucht|salat|vitamin|gesund/i.test(q)) {
    const hasProduce = food.some(i => i.category === "produce")
    if (hasProduce) return [{ role: "bot", type: "good", text: "🥦 Sehr gut! Obst & Gemüse gefunden. Ziel: 5 Portionen à 80g täglich (WHO). Abwechslung ist dabei wichtiger als Menge." }]
    return [{ role: "bot", type: "miss", text: "➕ Kein Obst oder Gemüse in deiner Liste. Das ist das Fundament jeder gesunden Ernährung — füge mindestens 1 Portion hinzu." }]
  }
  if (/allergi|laktose|gluten|nuss|nüsse|soja|intoleran/i.test(q)) {
    if (allergies.length > 0) {
      const aTips = allergenTips(items, allergies)
      return aTips.length > 0
        ? aTips.map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
        : [{ role: "bot", type: "good", text: `✅ Keine Allergen-Konflikte für ${allergies.join(", ")} in deiner Liste gefunden.` }]
    }
    return [{ role: "bot", type: "tip", text: "💡 Du kannst Allergien & Unverträglichkeiten in deinem Profil eintragen — dann warne ich dich automatisch wenn ein Produkt betroffen ist." }]
  }
  if (/abnehm|abnehmen|diät|kalorien|kcal|gewicht verlier/i.test(q)) {
    const tips = analyzeCart("abnehmen", items)
    return tips.slice(0, 3).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
  }
  if (/vegan|vegetarisch|pflanzlich|tier/i.test(q)) {
    const tips = analyzeCart("vegan", items)
    return tips.slice(0, 3).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
  }
  if (/kind|kinder|baby|kleinkind/i.test(q)) {
    const tips = analyzeCart("kind", items)
    return tips.slice(0, 3).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
  }
  if (/diabetes|blutzucker|insulin/i.test(q)) {
    const tips = analyzeCart("diabetes", items)
    return tips.slice(0, 3).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
  }
  if (/herz|cholesterin|fett|gesättig/i.test(q)) {
    const tips = analyzeCart("herzgesund", items)
    return tips.slice(0, 3).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
  }
  if (/palmöl|palm/i.test(q)) {
    const palmItems = food.filter(i => (ALLERGEN_MAP["palmöl"] ?? []).includes(i.id))
    if (palmItems.length > 0)
      return [{ role: "bot", type: "warn", text: `⚠️ Palmöl in: ${palmItems.map(i => i.name).join(", ")}. Palmöl ist mit Regenwaldrodung verbunden — Alternativen: Bio-Produkte, Marken ohne Palmöl.` }]
    return [{ role: "bot", type: "good", text: "✅ Kein offensichtliches Palmöl in deiner Liste gefunden." }]
  }
  if (/risik|warn|problem|schlecht|gefährlich/i.test(q)) {
    const bad = food.filter(i => i.severity === "high")
    if (bad.length > 0)
      return bad.slice(0, 3).map(i => ({ role: "bot" as const, type: "warn" as TipType, text: `⚠️ ${i.emoji} ${i.name} — ${i.issue}` }))
    return [{ role: "bot", type: "good", text: "✅ Keine kritischen Produkte in deiner Liste. Deine Auswahl sieht solide aus." }]
  }
  if (/tipp|rat|empfehlung|was soll|was kann|verbesser/i.test(q)) {
    const allTips = [...allergenTips(items, allergies), ...analyzeCart(activeGoal, items)]
    return allTips.slice(0, 3).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
  }
  if (/hallo|hi|hey|guten|servus/i.test(q)) {
    return [{ role: "bot", text: activeGoal
      ? `Hallo! 👋 Ich analysiere deine Liste für dein Ziel ${GOAL_LABELS[activeGoal]}. Stell mir einfach eine Frage oder wähle unten eine Option.`
      : "Hallo! 👋 Ich bin dein Ernährungscoach. Frag mich z.B. nach Zucker, Protein, Getränken, Allergien oder tippe 'Tipps' für eine Übersicht."
    }]
  }
  if (/danke|super|gut|klasse|toll|prima/i.test(q)) {
    return [{ role: "bot", text: "Gerne! 😊 Ich bin immer hier wenn du eine Frage hast. Gesunde Einkäufe machen einen großen Unterschied!" }]
  }

  // Fallback: Allgemeine Analyse
  const allTips = [...allergenTips(items, allergies), ...analyzeCart(activeGoal, items)]
  if (allTips.length > 0) {
    return [
      { role: "bot", text: `Ich habe deine Frage "${input}" nicht ganz verstanden, aber hier sind meine aktuellen Tipps zu deiner Liste:` },
      ...allTips.slice(0, 2).map(t => ({ role: "bot" as const, type: t.type, text: t.text })),
    ]
  }
  return [{ role: "bot", type: "tip", text: `💡 Gute Fragen die ich beantworten kann: Zucker, Protein, Getränke, Allergien, Palmöl, Risiken, Abnehmen, Vegan, Kinder, Diabetes, Herz.` }]
}

function NutritionCoachChat({ items, goals, allergies, open, onClose }: {
  items: ListItem[]; goals: string[]; allergies: string[]; open: boolean; onClose: () => void
}) {
  const activeGoal  = goals.find(g => GOAL_LABELS[g]) ?? ""
  const allergyTips = allergenTips(items, allergies)
  const goalTips    = analyzeCart(activeGoal, items)
  const allTips     = [...allergyTips, ...goalTips]
  const msgEndRef   = useRef<HTMLDivElement>(null)

  const initMsgs = (): ChatMsg[] => {
    const greeting = activeGoal
      ? `Hallo! 🥗 Ich bin dein Ernährungscoach für **${GOAL_LABELS[activeGoal]}**. Hier meine erste Einschätzung:`
      : `Hallo! 🥗 Ich bin dein Ernährungscoach. Stell mir Fragen zu deiner Einkaufsliste — z.B. zu Zucker, Protein, Getränken oder Allergien.`
    const msgs: ChatMsg[] = [{ role: "bot", text: greeting }]
    allTips.slice(0, 2).forEach(t => msgs.push({ role: "bot", type: t.type, text: t.text }))
    if (items.length === 0) msgs.push({ role: "bot", type: "tip", text: "🛒 Deine Liste ist noch leer — füge Produkte hinzu, dann analysiere ich sie direkt." })
    return msgs
  }

  const [msgs, setMsgs]     = useState<ChatMsg[]>(initMsgs)
  const [input, setInput]   = useState("")
  const [typing, setTyping] = useState(false)

  const firstOpen = useRef(true)
  useEffect(() => {
    if (open) {
      if (firstOpen.current) { firstOpen.current = false; return }
      setMsgs(initMsgs())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [msgs, typing])

  async function sendMessage(text: string) {
    const q = text.trim()
    if (!q) return
    setInput("")
    const userMsg: ChatMsg = { role: "user", text: q }
    setMsgs(prev => [...prev, userMsg])
    setTyping(true)
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, items, goals, allergies }),
      })
      const data = await res.json()
      if (data.reply) {
        setMsgs(prev => [...prev, { role: "bot", text: data.reply }])
      } else {
        setMsgs(prev => [...prev, { role: "bot", type: "warn", text: "Leider gab es einen Fehler. Bitte versuche es nochmal." }])
      }
    } catch {
      setMsgs(prev => [...prev, { role: "bot", type: "warn", text: "Keine Verbindung. Bitte Internet prüfen." }])
    }
    setTyping(false)
  }

  function handleQuickReply(key: string) {
    sendMessage(key)
  }

  if (!open) return null
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: "var(--surface)", borderRadius: "20px 20px 0 0", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.35)", animation: "slideUp 0.22s ease" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 10px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>🥗</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text)" }}>Ernährungscoach</div>
            <div style={{ fontSize: "0.68rem", color: "var(--accent)", fontWeight: 600 }}>
              {typing ? "⌛ tippt …" : "● Online — analysiert deine Liste"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "var(--surface-2)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: "1rem", color: "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8, animation: "fadeIn 0.2s ease" }}>
              {m.role === "bot" && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0, marginTop: 2 }}>🥗</div>
              )}
              <div style={{
                maxWidth: "82%",
                background: m.role === "user" ? "var(--accent)" : (m.type ? TIP_STYLE[m.type].bg : "var(--surface-2)"),
                border: m.role === "bot" && m.type ? `1px solid ${TIP_STYLE[m.type!].border}` : "none",
                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "10px 14px", fontSize: "0.82rem", lineHeight: 1.55,
                color: m.role === "user" ? "#000" : "var(--text)",
                fontWeight: m.role === "user" ? 700 : 500, position: "relative",
              }}>
                {m.type && m.role === "bot" && (
                  <div style={{ position: "absolute", top: -5, left: -5, width: 10, height: 10, borderRadius: "50%", background: TIP_STYLE[m.type].dot, border: "2px solid var(--surface)" }} />
                )}
                {m.text.replace(/\*\*(.*?)\*\*/g, "$1")}
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>🥗</div>
              <div style={{ background: "var(--surface-2)", borderRadius: "18px 18px 18px 4px", padding: "10px 16px", display: "flex", gap: 4, alignItems: "center" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-dim)", animation: `pulse 1.2s ease ${i*0.2}s infinite` }} />)}
              </div>
            </div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* Quick Replies */}
        <div style={{ padding: "8px 14px 6px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUICK_REPLIES.map(r => (
              <button key={r.key} onClick={() => handleQuickReply(r.key)}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 11px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", color: "var(--text)", whiteSpace: "nowrap" }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input */}
        <div style={{ padding: "8px 14px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))", display: "flex", gap: 8, flexShrink: 0 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Frag mich etwas… z.B. 'Wie viel Zucker ist drin?'"
            style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 22, padding: "11px 16px", fontSize: "0.85rem", color: "var(--text)", outline: "none" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            style={{ width: 44, height: 44, borderRadius: "50%", background: input.trim() ? "var(--accent)" : "var(--surface-2)", border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0, transition: "background 0.15s" }}
          >↑</button>
        </div>
      </div>
    </>
  )
}

// ─── Default list ─────────────────────────────────────────────────────────────

const DEFAULT_ITEM_IDS = new Set(["nutella","cocacola","milram","toast","bananen","ariel","kitkat","danone","wasa"])

const DEFAULT_ITEMS: ListItem[] = Array.from(DEFAULT_ITEM_IDS).map(id => {
  const p = CATALOG.find(c => c.id === id)!
  return { ...p, checked: false, addedAt: Date.now() - Math.random() * 1e6 }
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShoppingListPage() {
  const { user } = useSupabaseAuth()
  const [items, setItems]                   = useState<ListItem[]>([])
  const [selectedStore, setSelectedStore]   = useState("Alle")
  const [activeCategory, setActiveCategory] = useState("all")
  const [showAddModal, setShowAddModal]      = useState(false)
  const [detailItem, setDetailItem]         = useState<ListItem | null>(null)
  const [vorschlagItem, setVorschlagItem]   = useState<ListItem | null>(null)
  const [sourceItem, setSourceItem]         = useState<ListItem | null>(null)
  const [showShare, setShowShare]           = useState(false)
  const [shareUrl, setShareUrl]             = useState<string | null>(null)
  const [shareLoading, setShareLoading]     = useState(false)
  const [itemComments, setItemComments]     = useState<Record<string, {id:string;author:string;text:string;time:number}[]>>({})
  const [newItemSearch, setNewItemSearch]   = useState("")
  const [doneExpanded, setDoneExpanded]     = useState(false)
  const [hydrated, setHydrated]             = useState(false)
  const [familyMembers, setFamilyMembers]   = useState<FamilyMember[]>([])
  const [activePerson, setActivePerson]     = useState("all")
  const [isPremium, setIsPremium]           = useState(false)
  const [showPremiumGate, setShowPremiumGate] = useState(false)
  const [userGoals, setUserGoals]           = useState<string[]>([])
  const [userAllergies, setUserAllergies]   = useState<string[]>([])
  const [viewMode, setViewMode]               = useState<"list" | "grid">("list")
  const [showSortSheet, setShowSortSheet]     = useState(false)
  const [coachOpen, setCoachOpen]             = useState(false)
  const [coachItem, setCoachItem]             = useState<ListItem | null>(null)
  const [menuSheetItem, setMenuSheetItem]     = useState<ListItem | null>(null)
  const [itemQty, setItemQty]                 = useState<Record<string, number>>({})
  const [itemComment, setItemComment]         = useState<Record<string, string>>({})
  const [userName, setUserName]               = useState("")
  const [showPersonSheet, setShowPersonSheet] = useState(false)
  const [newPersonName, setNewPersonName]     = useState("")
  const [newPersonAge, setNewPersonAge]       = useState("")
  const [newPersonEmoji, setNewPersonEmoji]   = useState("🧒")
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const pastaKeywords = /nudel|pasta|spaghetti|penne|fusilli|rigatoni|tagliatelle|lasagne|gnocchi|reis|risotto|couscous|bulgur|quinoa/i
        const parsed = JSON.parse(raw)
        // Migrate: items that look like pasta but are in "bread" → move to "pasta"
        const migrated = parsed.map((it: ListItem) =>
          it.category === "bread" && pastaKeywords.test(it.name)
            ? { ...it, category: "pasta" as Category, emoji: "🍝" }
            : it
        )
        setItems(migrated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      } else { setItems(DEFAULT_ITEMS) }
    } catch { setItems(DEFAULT_ITEMS) }
    try {
      const raw = localStorage.getItem("list-item-comments-v1")
      if (raw) setItemComments(JSON.parse(raw))
    } catch {}
    // Apply saved supermarket from profile
    try {
      const p = localStorage.getItem("true-profile")
      if (p) {
        const parsed = JSON.parse(p)
        const markets: string[] = parsed.supermarkets ?? []
        if (markets.length > 0) setSelectedStore(markets[0])
      }
    } catch {}
    // Load family members
    try {
      const fm = localStorage.getItem("true-family-members")
      if (fm) setFamilyMembers(JSON.parse(fm))
    } catch {}
    // Load premium status
    try {
      setIsPremium(localStorage.getItem("true-premium") === "1")
    } catch {}
    // Load user goals + allergies
    try {
      const p = localStorage.getItem("true-profile")
      if (p) {
        const parsed = JSON.parse(p)
        setUserGoals(parsed.nutritionGoals ?? [])
        setUserAllergies(parsed.allergies ?? [])
        setUserName(parsed.name ?? "")
      }
    } catch {}
    // Load item qty + comments
    try {
      const q = localStorage.getItem("list-item-qty-v1")
      if (q) setItemQty(JSON.parse(q))
    } catch {}
    try {
      const c = localStorage.getItem("list-item-note-v1")
      if (c) setItemComment(JSON.parse(c))
    } catch {}
    setHydrated(true)
  }, [])

  // Supabase sync
  const { syncAdd, syncRemove, syncToggle } = useListSync(user, items as any, setItems as any, hydrated)

  // Save to localStorage
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
  }, [items, hydrated])

  const toggleItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(it => it.id === id)
      if (!item) return prev
      const newChecked = !item.checked
      syncToggle(id, newChecked)
      return prev.map(it => it.id === id ? { ...it, checked: newChecked } : it)
    })
  }, [syncToggle])

  const addItem = useCallback((product: CatalogProduct, personId?: string) => {
    setItems(prev => {
      if (prev.find(it => it.id === product.id && it.personId === personId)) return prev
      const newItem: ListItem = { ...product, checked: false, addedAt: Date.now(), personId }
      syncAdd(newItem as any)
      return [...prev, newItem]
    })
    setShowAddModal(false)
    setNewItemSearch("")
  }, [syncAdd])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(it => it.id !== id))
    syncRemove(id)
    setDetailItem(null)
  }, [syncRemove])

  const clearDone = useCallback(() => {
    setItems(prev => {
      // Remove checked items from Supabase too
      prev.filter(it => it.checked).forEach(it => syncRemove(it.id))
      return prev.filter(it => !it.checked)
    })
  }, [syncRemove])

  function addItemComment(itemId: string, text: string, author: string) {
    const comment = { id: Date.now().toString(), author, text, time: Date.now() }
    setItemComments(prev => {
      const next = { ...prev, [itemId]: [...(prev[itemId] ?? []), comment] }
      try { localStorage.setItem("list-item-comments-v1", JSON.stringify(next)) } catch {}
      return next
    })
  }

  async function createShareUrl(): Promise<string> {
    const shareData = items.map(it => ({ id: it.id, name: it.name, brand: it.brand, emoji: it.emoji, checked: it.checked, severity: it.severity, issue: it.issue }))
    const profileName = (() => { try { const p = localStorage.getItem("true-profile"); if (!p) return "Jemand"; const parsed = JSON.parse(p); return parsed.name || parsed.vorname || "Jemand" } catch { return "Jemand" } })()
    const res = await fetch("/api/shared-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: shareData, ownerName: profileName }),
    })
    const data = await res.json()
    if (!data.code) throw new Error("Kein Code erhalten")
    const base = typeof window !== "undefined" ? window.location.origin : "https://get-true.de"
    return `${base}/list/shared?code=${data.code}`
  }

  async function openShare() {
    if (shareLoading) return
    setShareLoading(true)
    try {
      const url = await createShareUrl()
      setShareUrl(url)
      setShowShare(true)
    } catch {
      alert("Teilen fehlgeschlagen. Bitte versuche es erneut.")
    } finally {
      setShareLoading(false)
    }
  }

  function shareWhatsApp() {
    const url = shareUrl
    if (!url) return
    const profileName = (() => { try { const p = localStorage.getItem("true-profile"); if (!p) return "Ich"; const parsed = JSON.parse(p); return parsed.name || parsed.vorname || "Ich" } catch { return "Ich" } })()
    const text = `${profileName} hat eine Einkaufsliste mit TRUE geteilt 🛒\n\nÖffne sie hier: ${url}\n\n(TRUE zeigt dir, welche Produkte problematisch sind — und schlägt Alternativen vor)`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
  }

  // ─── Derived state ──────────────────────────────────────────────────────────

  const filteredItems = items.filter(it => {
    const catOk  = activeCategory === "all" || it.category === activeCategory
    const persOk = activePerson === "all" || (activePerson === "mine" ? !it.personId : it.personId === activePerson)
    return catOk && persOk
  })
  const unchecked = filteredItems.filter(it => !it.checked)
  const checked   = filteredItems.filter(it => it.checked)

  // Group unchecked by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, ListItem[]>>((acc, cat) => {
    const g = unchecked.filter(it => it.category === cat)
    if (g.length) acc[cat] = g
    return acc
  }, {})

  // Search suggestions
  const query = newItemSearch.trim().toLowerCase()
  const suggestions = query.length < 1
    ? CATALOG.filter(p => !items.find(it => it.id === p.id)).slice(0, 12)
    : CATALOG.filter(p =>
        !items.find(it => it.id === p.id) &&
        (p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query))
      )

  // ─── Long-press handlers ────────────────────────────────────────────────────

  const handleTouchStart = (item: ListItem) => {
    longPressTimer.current = setTimeout(() => { setDetailItem(item) }, 500)
  }
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (!hydrated) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", paddingBottom: 100 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.94) } to { opacity:1; transform:scale(1) } }
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
        .tile-btn { transition: transform 0.12s ease, box-shadow 0.12s ease; }
        .tile-btn:active { transform: scale(0.93) !important; }
        .filter-pill { transition: background 0.15s, color 0.15s, border-color 0.15s; }
        .filter-pill:active { transform: scale(0.95); }
        .fab { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .fab:active { transform: scale(0.9); }
        .check-overlay { pointer-events: none; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: 20px; background: rgba(0,0,0,0.18); font-size: 1.8rem; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--nav-bg)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        padding: "14px 16px 12px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Einkaufsliste
          </h1>
          <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 1 }}>
            {items.filter(i => !i.checked).length} Artikel übrig
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Sort + View combined */}
          <button
            onClick={() => setShowSortSheet(true)}
            style={{
              background: activeCategory !== "all" ? "var(--accent)" : "var(--surface-2)",
              color: activeCategory !== "all" ? "#000" : "var(--text-dim)",
              border: "1px solid var(--border)", borderRadius: 10,
              padding: "6px 10px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {activeCategory !== "all"
              ? <>{CATEGORY_META[activeCategory as Category]?.emoji}</>
              : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="6" y1="12" x2="10" y2="12"/></svg>
            }
            <span style={{ fontSize: "1rem" }}>{viewMode === "list" ? "⊞" : "☰"}</span>
          </button>

          {/* Hinzufügen / Teilen */}
          <button
            onClick={openShare}
            disabled={shareLoading}
            style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "10px", padding: "6px 12px", fontWeight: 700, cursor: shareLoading ? "default" : "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "5px", opacity: shareLoading ? 0.7 : 1 }}
          >
            {shareLoading
              ? <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #00000044", borderTopColor: "#000", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              : <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="5" r="2.5"/><path d="M1 13c0-2.5 2.2-4 5-4"/><circle cx="12" cy="9" r="2"/><line x1="12" y1="11" x2="12" y2="14"/><line x1="10.5" y1="12.5" x2="13.5" y2="12.5"/></svg>
            }
            {shareLoading ? "Erstelle…" : "Hinzufügen"}
          </button>
        </div>
      </header>

      {/* ── Person tabs ── */}
      <div style={{ overflowX: "auto", display: "flex", gap: 8, padding: "10px 16px", scrollbarWidth: "none", borderBottom: "1px solid var(--border)", background: "var(--surface)", alignItems: "center" }}>
        {/* Alle */}
        <button
          onClick={() => setActivePerson("all")}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, border: `1.5px solid ${activePerson === "all" ? "var(--accent)" : "var(--border)"}`, background: activePerson === "all" ? "var(--accent-dim)" : "transparent", color: activePerson === "all" ? "var(--accent)" : "var(--text-dim)", fontSize: "0.78rem", fontWeight: activePerson === "all" ? 700 : 500, cursor: "pointer" }}
        >
          🛒 Alle
        </button>
        {/* Meine (items ohne personId) */}
        <button
          onClick={() => setActivePerson("mine")}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, border: `1.5px solid ${activePerson === "mine" ? "var(--accent)" : "var(--border)"}`, background: activePerson === "mine" ? "var(--accent-dim)" : "transparent", color: activePerson === "mine" ? "var(--accent)" : "var(--text-dim)", fontSize: "0.78rem", fontWeight: activePerson === "mine" ? 700 : 500, cursor: "pointer" }}
        >
          👤 Meine
        </button>
        {/* Familie */}
        {familyMembers.map(m => (
          <button
            key={m.id}
            onClick={() => setActivePerson(m.id)}
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, border: `1.5px solid ${activePerson === m.id ? "var(--accent)" : "var(--border)"}`, background: activePerson === m.id ? "var(--accent-dim)" : "transparent", color: activePerson === m.id ? "var(--accent)" : "var(--text-dim)", fontSize: "0.78rem", fontWeight: 500, cursor: "pointer" }}
          >
            {m.emoji} {m.name}
          </button>
        ))}
        {/* Person hinzufügen */}
        <button
          onClick={() => setShowPersonSheet(true)}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 999, border: "1.5px dashed var(--border)", background: "transparent", color: "var(--text-dim)", fontSize: "0.78rem", cursor: "pointer" }}
        >
          + Person
        </button>
      </div>

      {/* ── Main content ── */}
      <main style={{ padding: "16px 14px" }}>

        {/* Coach-Hinweis wenn Items vorhanden */}
        {unchecked.length >= 2 && !coachOpen && (
          <button
            onClick={() => setCoachOpen(true)}
            style={{ width: "100%", marginBottom: 14, background: "rgba(46,204,138,0.07)", border: "1px dashed rgba(46,204,138,0.35)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>🥗</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--accent)" }}>Ernährungscoach</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 1 }}>
                {userGoals.length > 0 ? `Tipps für dein Ziel: ${userGoals[0]}` : "Frag mich zu deiner Einkaufsliste"}
              </div>
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 700 }}>Öffnen →</span>
          </button>
        )}

        {/* Empty state */}
        {unchecked.length === 0 && checked.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)", animation: "fadeUp 0.4s ease" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>🛍️</div>
            <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 6 }}>Liste ist leer</p>
            <p style={{ fontSize: "0.82rem" }}>Tippe auf + um Artikel hinzuzufügen</p>
          </div>
        )}

        {/* Grouped unchecked items */}
        {Object.entries(grouped).map(([cat, catItems]) => {
          const meta = CATEGORY_META[cat as Category]
          return (
            <section key={cat} style={{ marginBottom: 24, animation: "fadeUp 0.35s ease" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                marginBottom: 10, padding: "0 2px",
              }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: meta.bg, border: `1.5px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>{meta.emoji}</span>
                <span style={{ fontSize: "0.78rem", fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {meta.label}
                </span>
                <span style={{
                  marginLeft: 4, background: meta.bg, color: meta.color,
                  borderRadius: 999, padding: "1px 7px", fontSize: "0.7rem", fontWeight: 700,
                }}>
                  {catItems.length}
                </span>
              </div>

              {viewMode === "list" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {catItems.map(item => (
                    <ProductRow
                      key={item.id}
                      item={item}
                      selectedStore={selectedStore}
                      onToggle={() => toggleItem(item.id)}
                      onInfo={() => setDetailItem(item)}
                      onVorschlag={() => setVorschlagItem(item)}
                      onSource={() => setSourceItem(item)}
                      onMenu={() => setMenuSheetItem(item)}
                      onCoach={() => setCoachItem(item)}
                      catBg={meta.bg}
                      catColor={meta.color}
                      catBorder={meta.border}
                      qty={itemQty[item.id]}
                      comment={itemComment[item.id]}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {catItems.map(item => (
                    <ProductTile
                      key={item.id}
                      item={item}
                      catBg={meta.bg}
                      selectedStore={selectedStore}
                      onToggle={() => toggleItem(item.id)}
                      onInfo={() => setDetailItem(item)}
                      onVorschlag={() => setVorschlagItem(item)}
                      onTouchStart={() => handleTouchStart(item)}
                      onTouchEnd={handleTouchEnd}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {/* ── Erledigt section ── */}
        {checked.length > 0 && (
          <section style={{ marginTop: 8 }}>
            <button
              onClick={() => setDoneExpanded(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 14, padding: "10px 14px", cursor: "pointer",
                color: "var(--text-dim)", fontSize: "0.82rem", fontWeight: 600,
                marginBottom: doneExpanded ? 10 : 0,
              }}
            >
              <span style={{ fontSize: "1rem", transition: "transform 0.2s", display: "inline-block", transform: doneExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
              Erledigt ({checked.length})
              {checked.length > 0 && doneExpanded && (
                <span
                  onClick={e => { e.stopPropagation(); clearDone() }}
                  style={{ marginLeft: "auto", color: "var(--danger)", fontSize: "0.75rem", fontWeight: 600 }}
                >
                  Alle entfernen
                </span>
              )}
            </button>

            {doneExpanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, animation: "fadeUp 0.25s ease" }}>
                {checked.map(item => (
                  <ProductRow
                    key={item.id}
                    item={item}
                    selectedStore={selectedStore}
                    onToggle={() => toggleItem(item.id)}
                    onInfo={() => setDetailItem(item)}
                    onVorschlag={() => setVorschlagItem(item)}
                    onSource={() => setSourceItem(item)}
                    onMenu={() => setMenuSheetItem(item)}
                    onCoach={() => setCoachItem(item)}
                    qty={itemQty[item.id]}
                    comment={itemComment[item.id]}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Coach Chat Sheet — per 3-Punkte-Menü aufgerufen */}
      <NutritionCoachChat
        items={unchecked}
        goals={userGoals}
        allergies={userAllergies}
        open={coachOpen}
        onClose={() => setCoachOpen(false)}
      />

      {/* Per-product coach panel — opens on ⚠️ triangle click */}
      <ProductCoachPanel
        product={coachItem}
        goals={userGoals}
        allergies={userAllergies}
        onClose={() => setCoachItem(null)}
      />

      {/* ── FABs ── */}
      {/* Coach FAB */}
      <button
        onClick={() => setCoachOpen(v => !v)}
        title="Ernährungscoach"
        style={{
          position: "fixed", bottom: 90, right: 88, zIndex: 40,
          width: 52, height: 52, borderRadius: "50%",
          background: coachOpen ? "var(--accent)" : "var(--surface)",
          border: `2px solid ${coachOpen ? "var(--accent)" : "var(--border)"}`,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.45rem",
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          transition: "all 0.2s",
        }}
        aria-label="Ernährungscoach öffnen"
      >
        🥗
      </button>
      {/* Add FAB */}
      <button
        className="fab"
        onClick={() => setShowAddModal(true)}
        style={{
          position: "fixed", bottom: 90, right: 20, zIndex: 40,
          width: 58, height: 58, borderRadius: "50%",
          background: "var(--accent)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem", color: "#000",
          boxShadow: "0 4px 20px rgba(46,204,138,0.45), 0 2px 8px rgba(0,0,0,0.3)",
          fontWeight: 300, lineHeight: 1,
        }}
        aria-label="Artikel hinzufügen"
      >
        +
      </button>

      {/* ── Sort / Filter Sheet ── */}
      {showSortSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={() => setShowSortSheet(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 520, margin: "0 auto", background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "16px 16px 40px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 16px" }} />
            {/* View toggle inside sheet */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["list", "grid"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{ flex: 1, padding: "10px", borderRadius: 12, border: `1.5px solid ${viewMode === mode ? "var(--accent)" : "var(--border)"}`, background: viewMode === mode ? "rgba(46,204,138,0.12)" : "var(--background)", color: viewMode === mode ? "var(--accent)" : "var(--text-dim)", fontWeight: viewMode === mode ? 700 : 500, cursor: "pointer", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  {mode === "list" ? <>☰ Liste</> : <>⊞ Kacheln</>}
                </button>
              ))}
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-dim)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Kategorie filtern</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              <button
                onClick={() => { setActiveCategory("all"); setShowSortSheet(false) }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, border: `1.5px solid ${activeCategory === "all" ? "var(--accent)" : "var(--border)"}`, background: activeCategory === "all" ? "rgba(46,204,138,0.12)" : "var(--background)", cursor: "pointer", fontWeight: activeCategory === "all" ? 700 : 500, color: activeCategory === "all" ? "var(--accent)" : "var(--text)" }}
              >
                <span style={{ fontSize: "1.2rem" }}>🛒</span>
                <span style={{ fontSize: "0.85rem" }}>Alle</span>
                {activeCategory === "all" && <span style={{ marginLeft: "auto", fontSize: "0.7rem" }}>✓</span>}
              </button>
              {Object.entries(CATEGORY_META).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => { setActiveCategory(key); setShowSortSheet(false) }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, border: `1.5px solid ${activeCategory === key ? m.color : "var(--border)"}`, background: activeCategory === key ? m.bg : "var(--background)", cursor: "pointer", fontWeight: activeCategory === key ? 700 : 500, color: activeCategory === key ? m.color : "var(--text)" }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{m.emoji}</span>
                  <span style={{ fontSize: "0.82rem" }}>{m.label}</span>
                  {activeCategory === key && <span style={{ marginLeft: "auto", fontSize: "0.7rem" }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Item Modal ── */}
      {showAddModal && (
        <AddModal
          query={newItemSearch}
          onQueryChange={setNewItemSearch}
          suggestions={suggestions}
          onAdd={addItem}
          onClose={() => { setShowAddModal(false); setNewItemSearch("") }}
          familyMembers={familyMembers}
          defaultPersonId={activePerson !== "all" && activePerson !== "mine" ? activePerson : undefined}
        />
      )}

      {/* ── Share Modal ── */}
      {showShare && shareUrl && (
        <ShareModal
          onClose={() => { setShowShare(false); setShareUrl(null) }}
          shareUrl={shareUrl}
          onWhatsApp={shareWhatsApp}
          itemCount={items.length}
        />
      )}

      {/* ── Vorschlag Sheet ── */}
      {vorschlagItem && vorschlagItem.alternative && (
        <VorschlagSheet
          item={vorschlagItem}
          selectedStore={selectedStore}
          onClose={() => setVorschlagItem(null)}
        />
      )}

      {/* ── Source Sheet ── */}
      {sourceItem && sourceItem.sources && sourceItem.sources.length > 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }} onClick={() => setSourceItem(null)}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 520, margin: "0 auto", background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", maxHeight: "70vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 16px" }} />
            <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 4 }}>
              ⚠ {sourceItem.issue} — Quellen
            </div>
            {sourceItem.issueDetail && (
              <p style={{ fontSize: "0.83rem", color: "var(--text-dim)", lineHeight: 1.65, marginBottom: 14 }}>{sourceItem.issueDetail}</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sourceItem.sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", textDecoration: "none", display: "block" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--accent)", marginBottom: 2 }}>↗ {s.label}</div>
                  {s.desc && <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{s.desc}</div>}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Bottom Sheet ── */}
      {detailItem && (
        <DetailSheet
          item={detailItem}
          selectedStore={selectedStore}
          comments={itemComments[detailItem.id] ?? []}
          onAddComment={(text, author) => addItemComment(detailItem.id, text, author)}
          onClose={() => setDetailItem(null)}
          onRemove={() => removeItem(detailItem.id)}
        />
      )}

      {/* ── PRODUKT-MENÜ BOTTOM SHEET ── */}
      {menuSheetItem && (() => {
        const si      = menuSheetItem
        const qty     = itemQty[si.id] ?? 1
        const comment = itemComment[si.id] ?? ""

        function saveQty(val: number) {
          const next = { ...itemQty, [si.id]: val }
          setItemQty(next)
          try { localStorage.setItem("list-item-qty-v1", JSON.stringify(next)) } catch {}
        }
        function saveComment(val: string) {
          const next = { ...itemComment, [si.id]: val }
          setItemComment(next)
          try { localStorage.setItem("list-item-note-v1", JSON.stringify(next)) } catch {}
        }
        function sendCommentNotification(text: string) {
          if (!text.trim()) return
          if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission()
          }
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`🛒 ${si.name}`, {
              body: `${userName || "Jemand"}: "${text.trim()}"`,
              icon: "/icon-192.png",
              tag: `list-comment-${si.id}`,
            })
          }
          try {
            const NOTIF_KEY = "true-notifications-v2"
            const stored = JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "[]")
            const n = { id: `list-${si.id}-${Date.now()}`, title: `🛒 ${si.name}`, body: `${userName || "Jemand"}: "${text.trim()}"`, url: "/list", time: Date.now(), read: false, type: "tip" }
            localStorage.setItem(NOTIF_KEY, JSON.stringify([n, ...stored].slice(0, 50)))
            localStorage.setItem(NOTIF_KEY + "-day", String(Math.floor(Date.now() / 86_400_000)))
          } catch {}
        }

        return (
          <>
            <div onClick={() => setMenuSheetItem(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }} />
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: "var(--surface)", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,0.35)", animation: "slideUp 0.22s ease", maxHeight: "88dvh", overflowY: "auto" }}>
              {/* Handle */}
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
              </div>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px 14px" }}>
                <span style={{ fontSize: "1.5rem" }}>{si.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>{si.name}</div>
                  {si.brand && <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{si.brand}</div>}
                </div>
                <button onClick={() => setMenuSheetItem(null)} style={{ background: "var(--surface-2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "0.9rem", color: "var(--text-dim)" }}>✕</button>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", margin: "0 20px" }} />

              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Menge */}
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Menge</div>
                  <div style={{ display: "flex", alignItems: "center", background: "var(--background)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", maxWidth: 180 }}>
                    <button onClick={() => saveQty(Math.max(1, qty - 1))} style={{ width: 50, height: 46, background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text)", fontWeight: 700 }}>−</button>
                    <span style={{ flex: 1, textAlign: "center", fontWeight: 900, fontSize: "1.1rem" }}>{qty}</span>
                    <button onClick={() => saveQty(qty + 1)} style={{ width: 50, height: 46, background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--accent)", fontWeight: 700 }}>+</button>
                  </div>
                </div>

                {/* Kommentar + Push */}
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
                      id={`list-comment-${si.id}`}
                      defaultValue={comment}
                      onChange={e => saveComment(e.target.value)}
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
                        const input = document.getElementById(`list-comment-${si.id}`) as HTMLInputElement
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

                {/* Coach-Tipp */}
                <ProductCoachTip item={si} goals={userGoals} allergies={userAllergies} />

                {/* Aus Liste entfernen */}
                <button
                  onClick={() => {
                    setItems(prev => {
                      const updated = prev.filter(i => i.id !== si.id)
                      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
                      return updated
                    })
                    setMenuSheetItem(null)
                  }}
                  style={{ width: "100%", background: "var(--danger-dim)", border: "1px solid var(--danger)", borderRadius: 12, padding: "13px", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", color: "var(--danger)" }}
                >🗑 Aus Liste entfernen</button>
              </div>

              <div style={{ padding: "4px 20px 16px" }}>
                <button onClick={() => setMenuSheetItem(null)} style={{ width: "100%", background: "var(--accent)", border: "none", borderRadius: 14, padding: "14px", fontSize: "0.95rem", fontWeight: 800, cursor: "pointer", color: "#000" }}>Fertig ✓</button>
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Person Sheet ── */}
      {showPersonSheet && (() => {
        const PERSON_EMOJIS = ["👶","🧒","👦","👧","🧑","👩","👨","👴","👵","🐶","🐱","🐕","🐈","🐾","🐇","🐹","🦜"]
        function savePeople(next: FamilyMember[]) {
          setFamilyMembers(next)
          try { localStorage.setItem("true-family-members", JSON.stringify(next)) } catch {}
        }
        function addPerson() {
          const name = newPersonName.trim()
          if (!name) return
          savePeople([...familyMembers, { id: Date.now().toString(), name, age: newPersonAge.trim(), emoji: newPersonEmoji }])
          setNewPersonName(""); setNewPersonAge(""); setNewPersonEmoji("🧒")
        }
        return (
          <>
            <div onClick={() => setShowPersonSheet(false)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.5)" }} />
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 301, background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "0 0 env(safe-area-inset-bottom,20px)", boxShadow: "0 -8px 40px rgba(0,0,0,0.35)", animation: "slideUp 0.22s ease", maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 14px" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem" }}>👨‍👩‍👧 Personen</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 2 }}>Für wen kaufst du ein?</div>
                </div>
                <button onClick={() => setShowPersonSheet(false)} style={{ background: "var(--surface-2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "0.9rem", color: "var(--text-dim)" }}>✕</button>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", margin: "0 20px" }} />
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                {familyMembers.map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px" }}>
                    <span style={{ fontSize: "1.5rem" }}>{m.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{m.name}</div>
                      {m.age && <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{m.age} Jahre</div>}
                    </div>
                    <button onClick={() => savePeople(familyMembers.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.2rem", padding: "0 4px" }}>×</button>
                  </div>
                ))}
                {familyMembers.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "0.82rem", padding: "4px 0 8px" }}>Noch niemand hinzugefügt.</div>
                )}
                <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Person hinzufügen</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {PERSON_EMOJIS.map(em => (
                      <button key={em} onClick={() => setNewPersonEmoji(em)} style={{ background: newPersonEmoji === em ? "var(--accent)" : "var(--surface)", border: `1.5px solid ${newPersonEmoji === em ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "5px 8px", fontSize: "1.1rem", cursor: "pointer" }}>{em}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} onKeyDown={e => e.key === "Enter" && addPerson()} placeholder="Name (z.B. Lena, Hund …)" style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: "0.88rem", outline: "none" }} />
                    <input value={newPersonAge} onChange={e => setNewPersonAge(e.target.value)} placeholder="Alter" type="number" min="0" max="120" style={{ width: 70, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px", color: "var(--text)", fontSize: "0.88rem", outline: "none" }} />
                  </div>
                  <button onClick={addPerson} style={{ width: "100%", background: "var(--accent)", color: "#000", border: "none", borderRadius: 10, padding: "11px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}>✓ Hinzufügen</button>
                </div>
              </div>
            </div>
          </>
        )
      })()}

      <BottomNav />
      {showPremiumGate && <PremiumGate trigger="list" onClose={() => setShowPremiumGate(false)} />}
    </div>
  )
}

// ─── ProductCoachTip ─────────────────────────────────────────────────────────
function ProductCoachTip({ item, goals, allergies }: { item: ListItem; goals: string[]; allergies: string[] }) {
  const [tip, setTip]       = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(false)

  useEffect(() => {
    let cancelled = false
    setTip(null); setLoading(true); setError(false)
    const question = `Gib mir einen kurzen Ernährungstipp zu diesem Produkt: ${item.name}${item.brand ? ` (${item.brand})` : ""}. Ist es gesund? Gibt es Bedenken (Palmöl, Zucker, Zusatzstoffe etc.)? Falls ja, empfiehl eine bessere Alternative. Max. 3 Sätze.`
    fetch("/api/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, items: [item], goals, allergies }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) { setTip(d.reply ?? null); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [item.id])

  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: loading || error ? 0 : 8 }}>
        <span style={{ fontSize: "1rem" }}>🥗</span>
        <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Coach-Tipp</span>
        {loading && <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--text-dim)", opacity: 0.7 }}>lädt…</span>}
      </div>
      {loading && (
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 8, flex: i === 3 ? "0.6" : "1", borderRadius: 4, background: "var(--border)", opacity: 0.5, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      )}
      {!loading && error && (
        <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: 6 }}>Tipp konnte nicht geladen werden.</div>
      )}
      {!loading && tip && (
        <div style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.55 }}>{tip}</div>
      )}
    </div>
  )
}

// ─── ProductRow (horizontal) ─────────────────────────────────────────────────

interface RowProps {
  item: ListItem
  selectedStore: string
  onToggle: () => void
  onInfo: () => void
  onVorschlag: () => void
  onSource: () => void
  onMenu: () => void
  onCoach?: () => void
  catBg?: string
  catColor?: string
  catBorder?: string
  qty?: number
  comment?: string
}

function ProductRow({ item, selectedStore, onToggle, onInfo, onVorschlag, onSource, onMenu, onCoach, catBg, catColor, catBorder, qty, comment }: RowProps) {
  const hasIssue = item.severity !== "none" && item.issue !== "—"
  const sevColor = hasIssue ? SEVERITY_COLOR[item.severity] : null
  const hasAlt   = !!item.alternative
  const hasSrc   = !!(item.sources && item.sources.length > 0)

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: catBg ?? "var(--surface)",
      border: `1px solid ${catBorder ?? "var(--border)"}`,
      borderRadius: 14, padding: "10px 10px 10px 12px",
      opacity: item.checked ? 0.5 : 1,
      transition: "opacity 0.2s",
      boxShadow: catColor && !item.checked ? `0 0 12px ${catColor}28, inset 0 0 20px ${catColor}0a` : undefined,
    }}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          border: `2px solid ${item.checked ? "var(--accent)" : "var(--border)"}`,
          background: item.checked ? "var(--accent)" : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.75rem", color: "#000", fontWeight: 800,
        }}
      >{item.checked ? "✓" : ""}</button>

      {/* Emoji */}
      <span style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>

      {/* Name + brand + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700, fontSize: "0.9rem",
          textDecoration: item.checked ? "line-through" : "none",
          textDecorationColor: "var(--text-dim)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{item.name}</div>
        <div style={{ display: "flex", gap: 5, marginTop: 2, flexWrap: "wrap" }}>
          {item.brand && <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>{item.brand}</span>}
          {qty && qty > 1 && <span style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: 700 }}>×{qty}</span>}
          {comment && <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>💬 {comment}</span>}
        </div>
      </div>

      {/* Issue badge — opens ProductCoachPanel */}
      {hasIssue && (
        <button
          onClick={e => { e.stopPropagation(); onCoach ? onCoach() : (hasSrc ? onSource() : onInfo()) }}
          style={{
            background: (sevColor ?? "#888") + "18",
            color: sevColor ?? "#888",
            border: `1px solid ${(sevColor ?? "#888")}33`,
            borderRadius: 8, padding: "5px 9px",
            fontSize: "0.75rem", fontWeight: 800,
            cursor: "pointer", flexShrink: 0,
            display: "flex", alignItems: "center", gap: 3,
          }}
          title="Coach-Tipp für dieses Produkt"
        >
          ⚠️
        </button>
      )}

      {/* Alternative button */}
      {hasAlt && !item.checked && (
        <button
          onClick={onVorschlag}
          style={{
            background: "rgba(46,204,138,0.12)", color: "var(--accent)",
            border: "1px solid rgba(46,204,138,0.3)",
            borderRadius: 99, padding: "3px 10px",
            fontSize: "0.65rem", fontWeight: 800,
            cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
          }}
        >💚 Alt.</button>
      )}

      {/* ••• Menü */}
      <button
        onClick={e => { e.stopPropagation(); onMenu() }}
        style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "var(--surface-2)", border: "none",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, fontSize: "0.75rem", color: "var(--text-dim)", letterSpacing: "0.05em",
        }}
      >•••</button>
    </div>
  )
}

// ─── ProductTile ──────────────────────────────────────────────────────────────

interface TileProps {
  item: ListItem
  catBg: string
  selectedStore: string
  onToggle: () => void
  onInfo: () => void
  onVorschlag: () => void
  onTouchStart: () => void
  onTouchEnd: () => void
}

function ProductTile({ item, catBg, selectedStore, onToggle, onInfo, onVorschlag, onTouchStart, onTouchEnd }: TileProps) {
  const dotColor = item.severity !== "none" ? SEVERITY_COLOR[item.severity] : null
  const availableInStore = selectedStore !== "Alle" && item.alternative?.stores.includes(selectedStore)

  return (
    <div style={{ position: "relative", aspectRatio: "1 / 1" }}>
      {/* Warning dot */}
      {dotColor && (
        <div style={{
          position: "absolute", top: 8, right: 8, zIndex: 3,
          width: 9, height: 9, borderRadius: "50%",
          background: dotColor,
          boxShadow: `0 0 6px ${dotColor}`,
        }} />
      )}

      {/* Info button */}
      {(item.issue !== "—" || item.alternative) && (
        <button
          onClick={e => { e.stopPropagation(); onInfo() }}
          style={{
            position: "absolute", top: 6, left: 6, zIndex: 3,
            background: "rgba(0,0,0,0.35)", border: "none", borderRadius: "50%",
            width: 22, height: 22, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.65rem", lineHeight: 1, color: "#fff",
            backdropFilter: "blur(4px)",
          }}
          aria-label="Details"
        >
          ℹ️
        </button>
      )}

      {/* Vorschlag button — sits below the tile as its own row */}
      {item.alternative && !item.checked && (item.severity === "high" || item.severity === "critical") && (
        <button
          onClick={e => { e.stopPropagation(); onVorschlag() }}
          style={{
            position: "absolute", bottom: -14, left: "50%",
            transform: "translateX(-50%)",
            zIndex: 5, whiteSpace: "nowrap",
            background: "var(--accent)", color: "#000",
            border: "none", borderRadius: 999,
            padding: "3px 10px", fontSize: "0.6rem", fontWeight: 800,
            boxShadow: "0 2px 10px rgba(46,204,138,0.5)",
            cursor: "pointer",
          }}
          aria-label="Alternative anzeigen"
        >
          💚 Vorschlag
        </button>
      )}
      {/* Store availability indicator (no alternative button case) */}
      {availableInStore && !item.alternative && (
        <div style={{
          position: "absolute", bottom: 6, left: 0, right: 0, zIndex: 3,
          display: "flex", justifyContent: "center",
        }}>
          <span style={{
            background: "var(--accent)", color: "#000",
            borderRadius: 999, padding: "1px 6px", fontSize: "0.58rem", fontWeight: 700,
          }}>✓</span>
        </div>
      )}

      {/* Tile button */}
      <button
        className="tile-btn"
        onClick={onToggle}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onTouchStart}
        onMouseUp={onTouchEnd}
        onMouseLeave={onTouchEnd}
        style={{
          width: "100%", height: "100%",
          background: catBg,
          border: "1.5px solid var(--border)",
          borderRadius: 20,
          cursor: "pointer",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 6, padding: "10px 6px",
          position: "relative", overflow: "hidden",
          opacity: item.checked ? 0.42 : 1,
          boxShadow: item.checked ? "none" : "0 2px 10px rgba(0,0,0,0.12)",
        }}
        aria-label={item.name}
      >
        <span style={{ fontSize: "2rem", lineHeight: 1, userSelect: "none" }}>{item.emoji}</span>
        <span style={{
          fontSize: "0.72rem", fontWeight: 600, color: "var(--text)",
          textAlign: "center", lineHeight: 1.3,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", maxWidth: "90%",
          textDecoration: item.checked ? "line-through" : "none",
          textDecorationColor: "var(--text-dim)",
        }}>
          {item.name}
        </span>

        {/* Checked overlay */}
        {item.checked && (
          <div className="check-overlay">
            <span style={{ fontSize: "1.5rem" }}>✅</span>
          </div>
        )}
      </button>
    </div>
  )
}

// ─── AddModal ─────────────────────────────────────────────────────────────────

interface AddModalProps {
  query: string
  onQueryChange: (v: string) => void
  suggestions: CatalogProduct[]
  onAdd: (p: CatalogProduct, personId?: string) => void
  onClose: () => void
  familyMembers?: FamilyMember[]
  defaultPersonId?: string
}

function AddModal({ query, onQueryChange, suggestions, onAdd, onClose, familyMembers = [], defaultPersonId }: AddModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedPerson, setSelectedPerson] = useState<string | undefined>(defaultPersonId)
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleCustomAdd = () => {
    if (!query.trim()) return
    const category = guessCategory(query.trim()) as Category
    const emoji    = guessEmoji(query.trim())
    const custom: CatalogProduct = {
      id: `custom-${Date.now()}`,
      name: query.trim(),
      brand: "",
      issue: "—",
      severity: "none",
      emoji,
      category,
    }
    onAdd(custom, selectedPerson)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxHeight: "85vh",
          background: "var(--surface)", borderRadius: "24px 24px 0 0",
          padding: "0 0 40px",
          display: "flex", flexDirection: "column",
          animation: "slideUp 0.28s cubic-bezier(0.32,0,0.16,1)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        <div style={{ padding: "0 16px 12px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 12 }}>Artikel hinzufügen</h2>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "1rem" }}>🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCustomAdd()}
              placeholder="Suchen oder eigenen Artikel eingeben…"
              style={{
                width: "100%", padding: "10px 12px 10px 38px",
                background: "var(--surface-2)", border: "1.5px solid var(--border)",
                borderRadius: 12, color: "var(--text)", fontSize: "0.88rem",
                outline: "none",
              }}
            />
          </div>
          {/* Person selector */}
          {familyMembers.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600, marginBottom: 6 }}>Für wen?</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setSelectedPerson(undefined)} style={{ padding: "5px 12px", borderRadius: 999, border: `1.5px solid ${!selectedPerson ? "var(--accent)" : "var(--border)"}`, background: !selectedPerson ? "var(--accent-dim)" : "transparent", color: !selectedPerson ? "var(--accent)" : "var(--text-dim)", fontSize: "0.74rem", fontWeight: !selectedPerson ? 700 : 400, cursor: "pointer" }}>
                  🛒 Alle
                </button>
                {familyMembers.map(m => (
                  <button key={m.id} onClick={() => setSelectedPerson(m.id)} style={{ padding: "5px 12px", borderRadius: 999, border: `1.5px solid ${selectedPerson === m.id ? "var(--accent)" : "var(--border)"}`, background: selectedPerson === m.id ? "var(--accent-dim)" : "transparent", color: selectedPerson === m.id ? "var(--accent)" : "var(--text-dim)", fontSize: "0.74rem", fontWeight: selectedPerson === m.id ? 700 : 400, cursor: "pointer" }}>
                    {m.emoji} {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Custom add button — always show when something is typed */}
        {query.trim() && (
          <div style={{ padding: "10px 16px 0" }}>
            <button
              onClick={handleCustomAdd}
              style={{
                width: "100%", background: "var(--accent-dim)", border: "1.5px solid var(--accent)",
                color: "var(--accent)", borderRadius: 12, padding: "11px 16px",
                cursor: "pointer", fontSize: "0.88rem", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>{guessEmoji(query.trim())}</span>
              <span>„{query.trim()}" direkt hinzufügen</span>
            </button>
          </div>
        )}

        {/* Suggestions grid */}
        <div style={{ overflowY: "auto", padding: "12px 16px", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {suggestions.map(p => {
              const meta = CATEGORY_META[p.category]
              return (
                <button
                  key={p.id}
                  onClick={() => onAdd(p, selectedPerson)}
                  style={{
                    background: meta.bg, border: "1.5px solid var(--border)",
                    borderRadius: 16, padding: "12px 8px",
                    cursor: "pointer", display: "flex",
                    flexDirection: "column", alignItems: "center", gap: 5,
                    transition: "transform 0.1s",
                  }}
                >
                  <span style={{ fontSize: "1.8rem" }}>{p.emoji}</span>
                  <span style={{
                    fontSize: "0.68rem", fontWeight: 600, color: "var(--text)",
                    textAlign: "center", lineHeight: 1.3,
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {p.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DetailSheet ──────────────────────────────────────────────────────────────

interface ItemComment { id: string; author: string; text: string; time: number }

interface DetailSheetProps {
  item: ListItem
  selectedStore: string
  comments: ItemComment[]
  onAddComment: (text: string, author: string) => void
  onClose: () => void
  onRemove: () => void
}

function DetailSheet({ item, selectedStore, comments, onAddComment, onClose, onRemove }: DetailSheetProps) {
  const alt = item.alternative
  const dotColor = item.severity !== "none" ? SEVERITY_COLOR[item.severity] : null
  const storeAvailable = selectedStore !== "Alle" && alt?.stores.includes(selectedStore)

  const severityLabel: Record<Severity, string> = {
    critical: "Kritisch",
    high:     "Hoch",
    medium:   "Mittel",
    low:      "Niedrig",
    none:     "Keine",
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          background: "var(--surface)", borderRadius: "24px 24px 0 0",
          padding: "0 0 44px",
          animation: "slideUp 0.28s cubic-bezier(0.32,0,0.16,1)",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        {/* Product header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "12px 20px 16px",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: CATEGORY_META[item.category].bg,
            border: `1.5px solid ${CATEGORY_META[item.category].border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2rem", flexShrink: 0,
          }}>
            {item.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{item.name}</h2>
            {item.brand && <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 2 }}>{item.brand}</p>}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--surface-2)", border: "1px solid var(--border)",
              borderRadius: "50%", width: 32, height: 32, cursor: "pointer",
              color: "var(--text-dim)", fontSize: "1rem", flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Issue / Verdict */}
          {(() => {
            const isScanned = item.id.startsWith("scan-")
            const sev = item.severity

            // Scanned items: show TRUE verdict
            if (isScanned) {
              const verdicts: Record<string, { emoji: string; title: string; text: string; color: string }> = {
                critical: { emoji: "🚫", title: "Besser meiden",                        color: "#ff2233", text: "Schwerwiegende Verstöße dokumentiert. TRUE empfiehlt dieses Produkt zu meiden und eine bessere Alternative zu wählen." },
                high:     { emoji: "🔶", title: "TRUE empfiehlt eine Alternative",       color: "#ff7700", text: "Bekannte Probleme beim Konzern hinter diesem Produkt. TRUE empfiehlt auf eine bessere Alternative umzusteigen." },
                medium:   { emoji: "⚠️", title: "Mit Bedacht kaufen",                   color: "#ffcc00", text: "Einige Missstände dokumentiert. Schau dir die Details an und erwäge eine Alternative." },
                low:      { emoji: "✅", title: "Bedenkenlos kaufen",                    color: "#2ECC8A", text: "Keine schwerwiegenden Verstöße bekannt. Du kannst dieses Produkt bedenkenlos kaufen." },
                none:     { emoji: "✅", title: "Bedenkenlos kaufen",                    color: "#2ECC8A", text: "Keine Einträge in unserer Datenbank. Keine bekannten Konzernprobleme." },
              }
              const v = verdicts[sev] ?? verdicts.none
              return (
                <div style={{ background: `${v.color}14`, border: `1px solid ${v.color}44`, borderRadius: 14, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: "1.3rem" }}>{v.emoji}</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: v.color }}>{v.title}</span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.55, margin: 0 }}>{v.text}</p>
                  <p style={{ fontSize: "0.62rem", color: "var(--text-dim)", marginTop: 8, opacity: 0.7 }}>Basiert auf dokumentierten Konzernpraktiken. Keine Rechtsberatung.</p>
                </div>
              )
            }

            // Catalog items: original display
            if (item.issue !== "—" && dotColor) return (
              <div style={{ background: `${dotColor}14`, border: `1px solid ${dotColor}44`, borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: dotColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {severityLabel[item.severity]} Priorität
                  </span>
                </div>
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text)" }}>Problem: {item.issue}</p>
                {item.issueDetail ? (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 4, lineHeight: 1.4 }}>{item.issueDetail}</p>
                ) : (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 4, lineHeight: 1.4 }}>
                    {item.brand ? `${item.brand} hat dokumentierte Probleme mit ${item.issue}.` : `Dieses Produkt hat bekannte Probleme.`}
                  </p>
                )}
              </div>
            )

            return (
              <div style={{ background: "var(--accent-dim)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.2rem" }}>✅</span>
                <p style={{ fontSize: "0.85rem", color: "var(--text)" }}>Keine bekannten Probleme</p>
              </div>
            )
          })()}

          {/* Alternative */}
          {alt && (
            <div style={{
              background: "var(--surface-2)", border: "1.5px solid var(--border)",
              borderRadius: 14, padding: "12px 14px",
            }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Bio-Alternative
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{alt.name}</span>
                <span style={{
                  background: "var(--accent-dim)", color: "var(--accent)",
                  borderRadius: 8, padding: "2px 8px", fontSize: "0.78rem", fontWeight: 700,
                }}>
                  {alt.price}
                </span>
              </div>

              {storeAvailable && (
                <div style={{
                  background: "var(--accent)", color: "#000",
                  borderRadius: 8, padding: "6px 10px", marginBottom: 8,
                  fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
                }}>
                  ✓ Verfügbar bei {selectedStore}
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {alt.stores.map(s => (
                  <span
                    key={s}
                    style={{
                      background: s === selectedStore ? "var(--accent)" : "var(--surface)",
                      color: s === selectedStore ? "#000" : "var(--text-dim)",
                      border: `1px solid ${s === selectedStore ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: 8, padding: "3px 9px", fontSize: "0.72rem", fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <CommentSection comments={comments} onAdd={onAddComment} />

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button onClick={() => onRemove()} style={{ flex: 1, padding: "11px", borderRadius: 14, background: "var(--danger-dim)", border: "1px solid var(--danger)", color: "var(--danger)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
              Entfernen
            </button>
            <button onClick={onClose} style={{ flex: 2, padding: "11px", borderRadius: 14, background: "var(--accent)", border: "none", color: "#000", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
              Fertig
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── VorschlagSheet ───────────────────────────────────────────────────────────

interface VorschlagSheetProps {
  item: ListItem
  selectedStore: string
  onClose: () => void
}

function VorschlagSheet({ item, selectedStore, onClose }: VorschlagSheetProps) {
  const alt = item.alternative!
  const storeAvailable = selectedStore !== "Alle" && alt.stores.includes(selectedStore)
  const googleImgUrl = `https://www.google.de/search?tbm=isch&q=${encodeURIComponent(alt.name + " Produkt kaufen")}`
  const googleSearchUrl = `https://www.google.de/search?q=${encodeURIComponent(alt.name + " wo kaufen")}`

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "flex-end",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, margin: "0 auto",
          background: "var(--surface)", borderRadius: "24px 24px 0 0",
          maxHeight: "88vh", overflowY: "auto",
          animation: "slideUp 0.28s cubic-bezier(0.32,0,0.16,1)",
          border: "1px solid rgba(46,204,138,0.2)", borderBottom: "none",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        {/* Green header */}
        <div style={{
          padding: "8px 20px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
              💚 BESSERE ALTERNATIVE ZU {item.name.toUpperCase()}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
              Gleiche Preisklasse · kein {item.issue}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "var(--text-dim)", fontSize: "0.95rem" }}>✕</button>
        </div>

        {/* Alt product hero — emoji gradient (always looks right) */}
        <div style={{ height: "160px", background: "linear-gradient(135deg, rgba(46,204,138,0.2), rgba(46,204,138,0.05))", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "rgba(46,204,138,0.1)", top: -30, right: -30 }} />
          <div style={{ position: "absolute", width: 80, height: 80, borderRadius: "50%", background: "rgba(46,204,138,0.07)", bottom: -20, left: -20 }} />
          <div style={{ textAlign: "center", zIndex: 1 }}>
            <div style={{ fontSize: "3.5rem", lineHeight: 1, filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.15))" }}>💚</div>
            <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--text)", marginTop: 8 }}>{alt.name}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--accent)", marginTop: 3, fontWeight: 600 }}>Empfehlung von TRUE</div>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "var(--accent)" }} />
        </div>

        <div style={{ padding: "16px 20px 36px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Google image search — so user knows what to look for in store */}
          <div style={{ background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 12, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>🔍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text)", marginBottom: 2 }}>Weißt du nicht, wie es aussieht?</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Öffne Google Bilder — damit du es im Laden erkennst</div>
            </div>
            <a href={googleImgUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#4285F4", color: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}>
              Bild ansehen
            </a>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {alt.stores.map(s => (
                <span key={s} style={{
                  background: s === selectedStore ? "var(--accent)" : "var(--surface-2)",
                  color: s === selectedStore ? "#000" : "var(--text-dim)",
                  border: `1px solid ${s === selectedStore ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8, padding: "3px 10px", fontSize: "0.74rem", fontWeight: 600,
                }}>{s}</span>
              ))}
            </div>
            <span style={{
              background: "rgba(46,204,138,0.1)", color: "var(--accent)",
              borderRadius: 8, padding: "4px 10px", fontSize: "0.85rem", fontWeight: 800,
            }}>
              {alt.price}
            </span>
          </div>

          {storeAvailable && (
            <div style={{
              background: "var(--accent)", color: "#000", borderRadius: 10,
              padding: "10px 14px", fontWeight: 700, fontSize: "0.85rem",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              ✓ Jetzt bei {selectedStore} erhältlich — einfach tauschen!
            </div>
          )}

          {/* External links row */}
          <div style={{ display: "flex", gap: 8 }}>
            {alt.link && (
              <a
                href={alt.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 10px", color: "var(--text)", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}
              >
                🌐 Hersteller-Website ↗
              </a>
            )}
            <a
              href={googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 10px", color: "var(--text)", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}
            >
              🛒 Wo kaufen? ↗
            </a>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "var(--accent)", color: "#000", border: "none",
              borderRadius: 14, padding: "13px", fontWeight: 800, cursor: "pointer",
              fontSize: "0.95rem",
            }}
          >
            Verstanden — ich kaufe die Alternative! 💚
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CommentSection ───────────────────────────────────────────────────────────

interface CommentSectionProps {
  comments: { id: string; author: string; text: string; time: number }[]
  onAdd: (text: string, author: string) => void
}

function CommentSection({ comments, onAdd }: CommentSectionProps) {
  const [input, setInput] = useState("")
  const [author, setAuthor] = useState("")

  useEffect(() => {
    try {
      const p = localStorage.getItem("true-profile")
      if (p) { const parsed = JSON.parse(p); setAuthor(parsed.name || parsed.vorname || "") }
    } catch {}
  }, [])

  function formatTime(ms: number) {
    const d = Date.now() - ms
    if (d < 60000) return "Gerade"
    if (d < 3600000) return `${Math.floor(d/60000)} Min.`
    return `${Math.floor(d/3600000)} Std.`
  }

  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        💬 Kommentare ({comments.length})
      </div>
      {comments.map(c => (
        <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>🧑</div>
          <div style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "6px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ fontWeight: 700, fontSize: "0.72rem" }}>{c.author}</span>
              <span style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>{formatTime(c.time)}</span>
            </div>
            <p style={{ fontSize: "0.82rem", margin: 0, lineHeight: 1.4 }}>{c.text}</p>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && input.trim()) { onAdd(input.trim(), author || "Anonym"); setInput("") } }}
          placeholder="Kommentar hinzufügen…"
          style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 20, padding: "8px 12px", color: "var(--text)", fontSize: "0.82rem", outline: "none" }}
        />
        <button
          onClick={() => { if (input.trim()) { onAdd(input.trim(), author || "Anonym"); setInput("") } }}
          style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontWeight: 700, fontSize: "1rem", flexShrink: 0 }}
        >→</button>
      </div>
    </div>
  )
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

interface ShareModalProps {
  onClose: () => void
  shareUrl: string
  onWhatsApp: () => void
  itemCount: number
}

function ShareModal({ onClose, shareUrl, onWhatsApp, itemCount }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }).catch(() => {})
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Meine TRUE Einkaufsliste",
          text: `${itemCount} Artikel — öffne die Liste hier:`,
          url: shareUrl,
        })
        setShared(true)
        return
      } catch {}
    }
    onWhatsApp()
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "var(--surface)", borderRadius: "24px 24px 0 0", paddingBottom: "max(44px, env(safe-area-inset-bottom))", animation: "slideUp 0.28s cubic-bezier(0.32,0,0.16,1)", border: "1px solid var(--border)", borderBottom: "none" }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>

        <div style={{ padding: "8px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>📤 Liste teilen</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 2 }}>{itemCount} Artikel · Partner oder Familie hinzufügen</div>
          </div>
          <button onClick={onClose} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "var(--text-dim)", fontSize: "1rem" }}>✕</button>
        </div>

        <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Primary share button */}
          <button
            onClick={nativeShare}
            style={{ display: "flex", alignItems: "center", gap: 14, background: "#25D366", color: "#fff", border: "none", borderRadius: 16, padding: "14px 18px", cursor: "pointer", fontWeight: 800, fontSize: "0.95rem" }}
          >
            <span style={{ fontSize: "1.6rem" }}>💬</span>
            <div style={{ textAlign: "left" }}>
              <div>Via WhatsApp / App teilen</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 400, opacity: 0.85 }}>Link öffnet die Live-Liste im Browser</div>
            </div>
          </button>

          {/* Copy link */}
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Link kopieren</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", fontSize: "0.72rem", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {shareUrl}
              </div>
              <button onClick={copyLink} style={{ background: copied ? "var(--accent)" : "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 14px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, color: copied ? "#000" : "var(--text)", flexShrink: 0, transition: "all 0.2s", whiteSpace: "nowrap" }}>
                {copied ? "✓ Kopiert!" : "Kopieren"}
              </button>
            </div>
          </div>

          {/* Live sync info */}
          <div style={{ background: "rgba(46,204,138,0.06)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>🔄</span>
            <div style={{ fontSize: "0.78rem", color: "var(--text)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--accent)" }}>Live-Synchronisation aktiv.</strong> Wer den Link öffnet, sieht deine aktuelle Liste in Echtzeit. Änderungen werden sofort übertragen — kein Refresh nötig.
              <br /><br />
              <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>Kommentare per Artikel möglich, z.B. „2× nehmen" oder „haben wir noch".</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
