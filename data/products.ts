// ─────────────────────────────────────────────────────────────────────────────
// TRUE – Bekannte Problemprodukte
//
// BILDER-WORKFLOW (jede Woche neue Produkte hinzufügen):
//   1. img: ""         → Emoji-Fallback, immer sauber (Standard für neue Produkte)
//   2. img: "/products/name.jpg" → Echtes Foto aus /public/products/
//      → Foto per sips konvertieren: sips -s format jpeg -Z 400 input.jpg --out public/products/name.jpg
//      → Nur echte Produktfotos, keine Logos mit weißem Hintergrund!
//
// Derzeit verifiziert (echte Produktfotos von Wikimedia Commons):
//   kitkat, nutella, kinder-bueno, bounty, lays, coca-cola, doritos,
//   sprite, miracoli
// ─────────────────────────────────────────────────────────────────────────────

export interface Product {
  id: number
  name: string
  brand: string
  img: string        // product image — onError falls back to emoji
  emoji: string      // emoji fallback
  color: string
  issues: string[]
  issue: "Palmöl" | "Wasser" | "PFAS" | "Glyphosat"
  addedAt: string
}

const W1 = "2026-04-01"
const W2 = "2026-04-14"
const W3 = "2026-04-24"   // within last 7 days → shows "NEU" badge

export const PRODUCTS: Product[] = [

  // ── SCHOKOLADE / SÜSSWAREN ───────────────────────────────────────────────
  {
    id: 1, name: "KitKat", brand: "Nestlé",
    img: "/products/kitkat.jpg", emoji: "🍫",
    color: "#ff4455",
    issues: ["🌴 Palmöl", "👶 Kinderarbeit Kakao"],
    issue: "Palmöl", addedAt: W1,
  },
  {
    id: 2, name: "Milka", brand: "Mondelez",
    img: "", emoji: "🍫",
    color: "#cc66ff",
    issues: ["🌴 Palmöl", "🍫 Kinderarbeit Kakao"],
    issue: "Palmöl", addedAt: W1,
  },
  {
    id: 3, name: "Nutella", brand: "Ferrero",
    img: "/products/nutella.jpg", emoji: "🫙",
    color: "#ff7700",
    issues: ["🌴 Palmöl", "🍫 73 % Zucker + Fett"],
    issue: "Palmöl", addedAt: W1,
  },
  {
    id: 4, name: "Kinder Bueno", brand: "Ferrero",
    img: "/products/kinder-bueno.jpg", emoji: "🍬",
    color: "#ff7700",
    issues: ["🌴 Palmöl", "🏭 Ultraprozessiert NOVA 4"],
    issue: "Palmöl", addedAt: W2,
  },
  {
    id: 5, name: "Bounty", brand: "Mars",
    img: "/products/bounty.jpg", emoji: "🥥",
    color: "#ffaa00",
    issues: ["🌴 Palmöl", "🥥 Monokulturen"],
    issue: "Palmöl", addedAt: W2,
  },

  // ── CHIPS / SNACKS ───────────────────────────────────────────────────────
  {
    id: 6, name: "Pringles", brand: "Kellogg's",
    img: "", emoji: "🥫",
    color: "#ffaa00",
    issues: ["🌴 Palmöl", "🧂 NOVA Gruppe 4"],
    issue: "Palmöl", addedAt: W1,
  },
  {
    id: 7, name: "Lay's", brand: "PepsiCo",
    img: "/products/lays.jpg", emoji: "🥔",
    color: "#ffcc00",
    issues: ["🌴 Palmöl", "📦 Nicht recycelbar"],
    issue: "Palmöl", addedAt: W1,
  },
  {
    id: 8, name: "Doritos", brand: "PepsiCo",
    img: "/products/doritos.jpg", emoji: "🌽",
    color: "#ff7700",
    issues: ["🌴 Palmöl", "🧂 Hochverarbeitet"],
    issue: "Palmöl", addedAt: W3,
  },

  // ── GETRÄNKE ─────────────────────────────────────────────────────────────
  {
    id: 9, name: "Coca-Cola", brand: "Coca-Cola Co.",
    img: "/products/coca-cola.jpg", emoji: "🥤",
    color: "#ff2233",
    issues: ["💧 Grundwasser", "🥤 Plastik #1 weltweit"],
    issue: "Wasser", addedAt: W1,
  },
  {
    id: 10, name: "Fanta", brand: "Coca-Cola Co.",
    img: "", emoji: "🍊",
    color: "#ff7700",
    issues: ["💧 Wasserverbrauch", "🥤 Plastikflasche"],
    issue: "Wasser", addedAt: W1,
  },
  {
    id: 11, name: "Sprite", brand: "Coca-Cola Co.",
    img: "/products/sprite.jpg", emoji: "💚",
    color: "#44ff88",
    issues: ["💧 Grundwasser", "🥤 Einwegplastik"],
    issue: "Wasser", addedAt: W3,
  },
  {
    id: 12, name: "Pepsi", brand: "PepsiCo",
    img: "", emoji: "🥤",
    color: "#4466ff",
    issues: ["💧 Wasserrechte", "🥤 Plastik-Hauptverschmutzer"],
    issue: "Wasser", addedAt: W2,
  },

  // ── KAFFEE / HEISSGETRÄNKE ────────────────────────────────────────────────
  {
    id: 13, name: "Nescafé", brand: "Nestlé",
    img: "", emoji: "☕",
    color: "#ff4455",
    issues: ["💧 Wasserrechte", "👶 Kaffeebauern-Ausbeutung"],
    issue: "Wasser", addedAt: W1,
  },
  {
    id: 14, name: "Nespresso", brand: "Nestlé",
    img: "", emoji: "☕",
    color: "#ff4455",
    issues: ["♻️ Alu-Kapseln", "💧 Wasserrechte"],
    issue: "Wasser", addedAt: W2,
  },

  // ── FERTIGGERICHTE / WÜRZMITTEL ───────────────────────────────────────────
  {
    id: 15, name: "Maggi", brand: "Nestlé",
    img: "", emoji: "🍜",
    color: "#ff4455",
    issues: ["☠️ Glutamat E621", "🧂 Übersalzung"],
    issue: "Wasser", addedAt: W1,
  },
  {
    id: 16, name: "Knorr Fix", brand: "Unilever",
    img: "", emoji: "🥣",
    color: "#ff7700",
    issues: ["🌴 Palmöl", "🧪 Glutamat E621"],
    issue: "Palmöl", addedAt: W1,
  },
  {
    id: 17, name: "Miracoli", brand: "Mars Food",
    img: "/products/miracoli.jpg", emoji: "🍝",
    color: "#ff4455",
    issues: ["🌴 Palmöl", "🧂 NOVA Gruppe 4"],
    issue: "Palmöl", addedAt: W3,
  },

  // ── WASCHMITTEL / REINIGUNG ───────────────────────────────────────────────
  {
    id: 18, name: "Ariel Pods", brand: "P&G",
    img: "", emoji: "🫧",
    color: "#44aaff",
    issues: ["☠️ PFAS-Beschichtung", "🐟 Mikroplastik"],
    issue: "PFAS", addedAt: W1,
  },
  {
    id: 19, name: "Persil", brand: "Henkel",
    img: "", emoji: "🧺",
    color: "#4488ff",
    issues: ["☠️ PFAS", "🧪 Tenside im Grundwasser"],
    issue: "PFAS", addedAt: W2,
  },

  // ── PESTIZIDE / CHEMIE ────────────────────────────────────────────────────
  {
    id: 20, name: "Roundup", brand: "Bayer / Monsanto",
    img: "", emoji: "☠️",
    color: "#cc66ff",
    issues: ["☠️ Glyphosat IARC 2A", "🧬 Krebsrisiko bestätigt"],
    issue: "Glyphosat", addedAt: W1,
  },
]

export function isNewThisWeek(addedAt: string): boolean {
  return Date.now() - new Date(addedAt).getTime() < 7 * 24 * 60 * 60 * 1000
}
