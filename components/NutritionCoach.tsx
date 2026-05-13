"use client"
import { useState, useEffect, useRef } from "react"

// ─── Minimal Item-Typ (kompatibel mit Home + List) ────────────────────────────
export interface CoachItem {
  id: number | string
  name: string
  emoji: string
  category?: string
  severity?: string
  alternative?: { name: string }
  issue?: string
}

// ─── Daten ────────────────────────────────────────────────────────────────────
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
const PROTEIN_LABEL: Record<string, string> = {
  haehnchen: "23g/100g", hackfleisch: "17g/100g",
  milram: "3.4g/100ml", danone: "4g/100g",
  "tiefkuehl-erbsen": "5g/100g", wasa: "10g/100g",
}
const SUGAR_LABEL: Record<string, string> = {
  nutella: "56g", cocacola: "10g/100ml", kitkat: "49g",
  oreo: "37g", caprisun: "11g/100ml", fanta: "9g/100ml",
  milka: "51g", redbull: "11g/100ml",
}
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
const ALLERGEN_LABELS: Record<string, string> = {
  laktose: "Laktose", gluten: "Gluten", nuesse: "Nüsse", eier: "Eier",
  soja: "Soja", fisch: "Fisch", "meeresfrüchte": "Meeresfrüchte",
  sellerie: "Sellerie", sesam: "Sesam", "palmöl": "Palmöl",
}
const GOAL_LABELS: Record<string, string> = {
  abnehmen: "🔥 Abnehmen", muskelaufbau: "💪 Muskelaufbau", muskel: "💪 Muskel",
  vegan: "🌱 Vegan", vegetarisch: "🥦 Vegetarisch", kind: "👶 Kind / Familie",
  diabetes: "💉 Diabetes", herzgesund: "❤️ Herzgesund",
}
const SUGARY_DRINKS = ["cocacola","fanta","sprite","redbull","monster","caprisun","eistee","softdrink"]
const HEALTHY_DRINKS = ["wasser","sprudel","tee","kräutertee","mineralwasser","grüner-tee","kaffee"]

type TipType = "warn" | "good" | "miss" | "tip"
interface CoachTip { type: TipType; text: string }
type ChatMsg = { role: "bot" | "user"; type?: TipType; text: string }

const TIP_STYLE: Record<TipType, { bg: string; border: string; dot: string }> = {
  warn: { bg: "rgba(255,68,85,0.09)",  border: "rgba(255,68,85,0.22)",  dot: "#ff4455" },
  good: { bg: "rgba(34,204,110,0.09)", border: "rgba(34,204,110,0.22)", dot: "#22cc6e" },
  miss: { bg: "rgba(255,170,0,0.09)",  border: "rgba(255,170,0,0.22)",  dot: "#ffaa00" },
  tip:  { bg: "rgba(68,170,255,0.09)", border: "rgba(68,170,255,0.22)", dot: "#44aaff" },
}
const QUICK_REPLIES = [
  { label: "💧 Getränke-Check", key: "drinks" },
  { label: "⚠️ Risiken zeigen", key: "risks"  },
  { label: "➕ Was fehlt?",     key: "miss"   },
  { label: "✅ Was ist gut?",   key: "good"   },
]

function getFlags(item: CoachItem): string[] {
  return PROD_FLAGS[String(item.id)] ?? CAT_FLAGS[item.category ?? ""] ?? []
}

function drinkTips(items: CoachItem[]): CoachTip[] {
  const tips: CoachTip[] = []
  const drinks = items.filter(i => i.category === "drinks")
  const sugary = drinks.filter(i => SUGARY_DRINKS.includes(String(i.id)) || getFlags(i).includes("high-sugar"))
  const hasWater = items.some(i => i.name.toLowerCase().includes("wasser") || String(i.id) === "wasser")
  const hasHealthy = drinks.some(i => HEALTHY_DRINKS.includes(String(i.id)))
  if (!hasWater && !hasHealthy) tips.push({ type: "miss", text: "💧 Wasser fehlt — 1.5–2L/Tag. Der günstigste Gesundheits-Booster." })
  else if (hasWater) tips.push({ type: "good", text: "💧 Wasser ✓ — perfekte Wahl." })
  if (sugary.length > 0) {
    const d = sugary[0]; const s = SUGAR_LABEL[String(d.id)] ? ` (${SUGAR_LABEL[String(d.id)]} Zucker)` : ""
    tips.push({ type: "warn", text: `🥤 ${d.emoji} ${d.name}${s} — Alternative: stilles Wasser mit Zitrone` })
  }
  return tips
}

function allergenTips(items: CoachItem[], allergies: string[]): CoachTip[] {
  const tips: CoachTip[] = []
  for (const allergy of allergies) {
    const ids = ALLERGEN_MAP[allergy] ?? []
    items.filter(i => ids.includes(String(i.id))).slice(0, 2).forEach(item => {
      tips.push({ type: "warn", text: `🚫 ${item.emoji} ${item.name} enthält ${ALLERGEN_LABELS[allergy] ?? allergy}` })
    })
  }
  return tips
}

function analyzeCart(goal: string, items: CoachItem[]): CoachTip[] {
  const food = items.filter(i => i.category !== "household")
  const tips: CoachTip[] = []
  const has = (cat: string) => food.some(i => i.category === cat)
  const get = (id: string) => food.find(i => String(i.id) === id)
  const withFlag = (f: string) => food.filter(i => getFlags(i).includes(f))
  tips.push(...drinkTips(food).slice(0, 1))
  switch (goal) {
    case "abnehmen": {
      withFlag("high-sugar").filter(i => i.category !== "drinks").slice(0, 2).forEach(i => {
        const s = SUGAR_LABEL[String(i.id)]; tips.push({ type: "warn", text: `${i.emoji} ${i.name}${s ? ` — ${s} Zucker/100g` : ""} → max 2× pro Woche` })
      })
      if (has("produce"))        tips.push({ type: "good", text: "🥦 Gemüse ✓ — Volumen satt machen" })
      if (!has("produce"))       tips.push({ type: "miss", text: "➕ Gemüse fehlt — sättigt mit <50 kcal/100g" })
      if (!withFlag("protein").length) tips.push({ type: "miss", text: "➕ Protein fehlt — erhält Muskeln" })
      break
    }
    case "muskelaufbau": case "muskel": {
      const proteins = withFlag("protein")
      if (!proteins.length) tips.push({ type: "miss", text: "➕ Protein fehlt — Ziel: 1.6g × kg/Tag" })
      else proteins.slice(0, 2).forEach(i => tips.push({ type: "good", text: `${i.emoji} ${i.name} — ${PROTEIN_LABEL[String(i.id)] ?? "~10g/100g"} ✓` }))
      if (!has("produce")) tips.push({ type: "miss", text: "➕ Gemüse fehlt — Mikronährstoffe" })
      tips.push({ type: "tip", text: "💡 Protein im 3h-Fenster nach Training → +20% Muskelaufbau" })
      break
    }
    case "vegan": {
      food.filter(i => getFlags(i).some(f => ["dairy","meat","animal"].includes(f))).slice(0, 2).forEach(i =>
        tips.push({ type: "warn", text: `${i.emoji} ${i.name} — tierisch → ${i.alternative?.name ?? "Pflanzliche Alternative"}` }))
      if (has("produce")) tips.push({ type: "good", text: "🥦 Pflanzenbasis ✓" })
      tips.push({ type: "tip", text: "💡 B12 täglich ergänzen — fehlt in veganer Ernährung immer" })
      break
    }
    case "kind": {
      const junks = food.filter(i => ["nutella","kitkat","milka","cocacola","fanta","redbull","caprisun","oreo"].includes(String(i.id)))
      if (junks.length) tips.push({ type: "warn", text: `${junks[0].emoji} Süßes → WHO: max 25g Zucker/Tag für Kinder` })
      if (has("produce")) tips.push({ type: "good", text: "🥦 Gemüse ✓ — Kinder: 5 Portionen/Tag" })
      else tips.push({ type: "miss", text: "➕ Obst/Gemüse fehlt" })
      break
    }
    case "diabetes": {
      withFlag("high-sugar").slice(0, 2).forEach(i => {
        const s = SUGAR_LABEL[String(i.id)]; tips.push({ type: "warn", text: `${i.emoji} ${i.name}${s ? ` — ${s} Zucker` : ""} — Blutzucker-Spike` })
      })
      if (!has("produce")) tips.push({ type: "miss", text: "➕ Ballaststoffe fehlen" })
      tips.push({ type: "tip", text: "💡 Wasser statt Saft — 1 Glas OJ hat so viel Zucker wie Cola" })
      break
    }
    case "herzgesund": {
      withFlag("high-fat").slice(0, 2).forEach(i => tips.push({ type: "warn", text: `${i.emoji} ${i.name} — gesättigte Fette erhöhen LDL` }))
      if (has("produce")) tips.push({ type: "good", text: "🥦 Gemüse ✓ — schützt Herz" })
      tips.push({ type: "tip", text: "💡 Olivenöl statt Butter — senkt LDL um bis zu 15%" })
      break
    }
    default: {
      food.filter(i => i.severity === "high").slice(0, 2).forEach(i =>
        tips.push({ type: "warn", text: `${i.emoji} ${i.name} — ${i.issue ?? "hohes Risiko"}` }))
      if (has("produce")) tips.push({ type: "good", text: "🥦 Obst & Gemüse ✓ — gute Basis" })
      else tips.push({ type: "miss", text: "➕ Kein Obst/Gemüse — Fundament jeder Ernährung" })
      tips.push({ type: "tip", text: "💡 Ziel im Profil setzen → Coach wird präziser" })
    }
  }
  if (!get("wasa") && !get("haehnchen")) tips.push({ type: "tip", text: "💡 Wasser vor dem Essen → 22% weniger Hunger" })
  return tips.slice(0, 6)
}

function generateCoachReply(input: string, items: CoachItem[], goals: string[], allergies: string[]): ChatMsg[] {
  const q = input.toLowerCase().trim()
  const food = items.filter(i => i.category !== "household")
  const activeGoal = goals.find(g => GOAL_LABELS[g]) ?? ""
  const withFlag = (f: string) => food.filter(i => getFlags(i).includes(f))

  if (/zucker|süß|schokolade/i.test(q)) {
    const sugary = withFlag("high-sugar")
    if (sugary.length) return [{ role: "bot", type: "warn", text: `⚠️ Zucker: ${sugary.map(i => i.name).join(", ")} — WHO: max 25g/Tag.` }]
    return [{ role: "bot", type: "good", text: "✅ Kein offensichtlicher Zucker-Überschuss erkannt." }]
  }
  if (/protein|eiweiß|muskel/i.test(q)) {
    const proteins = withFlag("protein")
    if (proteins.length) return [{ role: "bot", type: "good", text: `💪 Protein: ${proteins.map(i => `${i.emoji} ${i.name}`).join(", ")} ✓` }]
    return [{ role: "bot", type: "miss", text: "➕ Protein fehlt. Hühnchen, Quark, Eier oder Tofu wären gut." }]
  }
  if (/wasser|trinken|getränk/i.test(q)) {
    const dTips = drinkTips(food)
    return dTips.length ? dTips.map(t => ({ role: "bot" as const, type: t.type, text: t.text })) : [{ role: "bot", type: "good", text: "💧 Tagesziel: 1.5–2L Wasser." }]
  }
  if (/gemüse|obst|vitamin/i.test(q)) {
    if (food.some(i => i.category === "produce")) return [{ role: "bot", type: "good", text: "🥦 Super! Obst & Gemüse gefunden. Ziel: 5 Portionen à 80g." }]
    return [{ role: "bot", type: "miss", text: "➕ Kein Gemüse in der Liste. Füge mindestens 1 Portion hinzu." }]
  }
  if (/allergi|laktose|gluten|nuss/i.test(q)) {
    if (allergies.length) {
      const aTips = allergenTips(items, allergies)
      return aTips.length ? aTips.map(t => ({ role: "bot" as const, type: t.type, text: t.text })) : [{ role: "bot", type: "good", text: `✅ Keine Allergen-Konflikte gefunden.` }]
    }
    return [{ role: "bot", type: "tip", text: "💡 Allergien im Profil eintragen — dann warne ich automatisch." }]
  }
  if (/abnehm|diät|kalorien/i.test(q)) return analyzeCart("abnehmen", items).slice(0, 3).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
  if (/vegan|pflanzlich/i.test(q))     return analyzeCart("vegan", items).slice(0, 3).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
  if (/kind|kinder/i.test(q))          return analyzeCart("kind", items).slice(0, 3).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
  if (/risik|warn|problem/i.test(q)) {
    const bad = food.filter(i => i.severity === "high")
    if (bad.length) return bad.slice(0, 3).map(i => ({ role: "bot" as const, type: "warn" as TipType, text: `⚠️ ${i.emoji} ${i.name} — ${i.issue ?? "hohes Risiko"}` }))
    return [{ role: "bot", type: "good", text: "✅ Keine kritischen Produkte erkannt." }]
  }
  if (/tipp|rat|verbesser/i.test(q)) {
    return [...allergenTips(items, allergies), ...analyzeCart(activeGoal, items)].slice(0, 3).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))
  }
  if (/hallo|hi|hey/i.test(q)) {
    return [{ role: "bot", text: activeGoal ? `Hallo! 👋 Ich analysiere für dein Ziel ${GOAL_LABELS[activeGoal]}. Stell mir eine Frage.` : "Hallo! 👋 Ich bin dein Ernährungscoach. Frag mich nach Zucker, Protein oder Risiken." }]
  }
  const allTips = [...allergenTips(items, allergies), ...analyzeCart(activeGoal, items)]
  if (allTips.length) return [{ role: "bot", text: "Hier meine aktuellen Tipps:" }, ...allTips.slice(0, 2).map(t => ({ role: "bot" as const, type: t.type, text: t.text }))]
  return [{ role: "bot", type: "tip", text: "💡 Frag mich nach: Zucker, Protein, Getränke, Allergien, Risiken, Abnehmen, Vegan, Kinder." }]
}

// ─── Shared Chat UI (used by both inline + sheet) ─────────────────────────────
function ChatUI({ items, goals, allergies, onClose, inline = false, initText }: {
  items: CoachItem[]; goals: string[]; allergies: string[]
  onClose?: () => void; inline?: boolean; initText?: string
}) {
  const activeGoal = goals.find(g => GOAL_LABELS[g]) ?? ""
  const msgEndRef  = useRef<HTMLDivElement>(null)

  const buildInitMsgs = (): ChatMsg[] => {
    const allTips = [...allergenTips(items, allergies), ...analyzeCart(activeGoal, items)]
    const greeting = activeGoal
      ? `Hallo! Ich bin dein Ernährungscoach für ${GOAL_LABELS[activeGoal]}. Hier meine erste Einschätzung:`
      : `Hallo! Ich bin dein Ernährungscoach. Stell mir Fragen zu deiner Einkaufsliste — Inhaltsstoffe, Risiken, Tipps.`
    const msgs: ChatMsg[] = [{ role: "bot", text: greeting }]
    allTips.slice(0, 2).forEach(t => msgs.push({ role: "bot", type: t.type, text: t.text }))
    if (items.length === 0) msgs.push({ role: "bot", type: "tip", text: "Liste ist leer — füge Produkte hinzu, dann analysiere ich sie." })
    return msgs
  }

  const [msgs, setMsgs]     = useState<ChatMsg[]>(buildInitMsgs)
  const [input, setInput]   = useState("")
  const [typing, setTyping] = useState(false)
  const didInit = useRef(false)

  // If a pre-fill message is passed, auto-send it once
  useEffect(() => {
    if (initText && !didInit.current) {
      didInit.current = true
      sendMessage(initText)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initText])

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs, typing])

  function sendMessage(text: string) {
    const q = text.trim(); if (!q) return
    setInput("")
    setMsgs(prev => [...prev, { role: "user", text: q }])
    setTyping(true)
    setTimeout(() => {
      setMsgs(prev => [...prev, ...generateCoachReply(q, items, goals, allergies)])
      setTyping(false)
    }, 700)
  }

  const msgArea = (
    <div style={{ flex: 1, overflowY: "auto", padding: inline ? "12px 0" : "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      {msgs.map((m, i) => (
        <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8, padding: inline ? "0 16px" : 0 }}>
          {m.role === "bot" && (
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(46,204,138,0.2)", border: "1.5px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", flexShrink: 0, marginTop: 2 }}>🥗</div>
          )}
          <div style={{
            maxWidth: "78%",
            background: m.role === "user"
              ? "var(--accent)"
              : m.type ? TIP_STYLE[m.type].bg : "var(--surface-2)",
            border: m.role === "bot" && m.type ? `1px solid ${TIP_STYLE[m.type!].border}` : "none",
            borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            padding: "9px 13px",
            fontSize: "0.83rem",
            lineHeight: 1.55,
            color: m.role === "user" ? "#000" : "var(--text)",
            fontWeight: m.role === "user" ? 700 : 400,
          }}>
            {m.text}
          </div>
        </div>
      ))}
      {typing && (
        <div style={{ display: "flex", gap: 8, padding: inline ? "0 16px" : 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(46,204,138,0.2)", border: "1.5px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", flexShrink: 0 }}>🥗</div>
          <div style={{ background: "var(--surface-2)", borderRadius: "16px 16px 16px 4px", padding: "9px 14px", display: "flex", gap: 4, alignItems: "center" }}>
            {[0,1,2].map(j => <div key={j} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-dim)", animation: `pulse 1.2s ease ${j*0.2}s infinite` }} />)}
          </div>
        </div>
      )}
      <div ref={msgEndRef} />
    </div>
  )

  const quickArea = (
    <div style={{ padding: "6px 16px 4px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {QUICK_REPLIES.map(r => (
          <button key={r.key} onClick={() => sendMessage(r.label.replace(/^[^\s]+\s/, ""))}
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 12px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", color: "var(--text)", whiteSpace: "nowrap", flexShrink: 0 }}>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )

  const inputArea = (
    <div style={{ padding: "8px 12px", paddingBottom: inline ? "8px" : "calc(8px + env(safe-area-inset-bottom,0px))", display: "flex", gap: 8, flexShrink: 0 }}>
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
        placeholder="Frag mich …"
        style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 22, padding: "10px 16px", fontSize: "0.85rem", color: "var(--text)", outline: "none" }}
      />
      <button onClick={() => sendMessage(input)} disabled={!input.trim()}
        style={{ width: 42, height: 42, borderRadius: "50%", background: input.trim() ? "var(--accent)" : "var(--border)", border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0, transition: "background 0.15s", color: "#000" }}>
        ↑
      </button>
    </div>
  )

  // ── Inline mode: render directly in page flow ──
  if (inline) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {msgArea}
        {quickArea}
        {inputArea}
      </div>
    )
  }

  // ── Sheet mode: fixed bottom overlay ──
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: "var(--surface)", borderRadius: "20px 20px 0 0", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.35)", animation: "slideUp 0.22s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 10px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(46,204,138,0.2)", border: "1.5px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>🥗</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>Ernährungscoach</div>
            <div style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: 600 }}>{typing ? "tippt …" : "● Online"}</div>
          </div>
          <button onClick={onClose} style={{ background: "var(--surface-2)", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontSize: "0.9rem", color: "var(--text-dim)" }}>✕</button>
        </div>
        {msgArea}
        {quickArea}
        {inputArea}
      </div>
    </>
  )
}

// ─── NutritionCoachChat — Bottom Sheet für Home/Scan ──────────────────────────
export function NutritionCoachChat({ items, goals, allergies, open, onClose }: {
  items: CoachItem[]; goals: string[]; allergies: string[]; open: boolean; onClose: () => void
}) {
  if (!open) return null
  return <ChatUI items={items} goals={goals} allergies={allergies} onClose={onClose} inline={false} />
}

// ─── NutritionCoachInline — Direkt eingebettet für Coach-Seite ────────────────
export function NutritionCoachInline({ items, goals, allergies, initText }: {
  items: CoachItem[]; goals: string[]; allergies: string[]; initText?: string
}) {
  return <ChatUI items={items} goals={goals} allergies={allergies} inline={true} initText={initText} />
}
