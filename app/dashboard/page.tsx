"use client"
import React, { useState, useEffect, useRef } from "react"
import AuthGuard from "@/components/AuthGuard"
import { ThemeToggle } from "@/components/ThemeProvider"
import BottomNav from "@/components/BottomNav"

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ff4455",
  high: "#ff8800",
  medium: "#ffcc00",
  low: "#2ECC8A",
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: "KRITISCH",
  high: "HOCH",
  medium: "MITTEL",
  low: "GERING",
}

type Tab = "overview" | "search" | "bot" | "categories" | "list" | "impact"

interface ListItem {
  id: number; name: string; brand: string; issue: string
  alt: string; altBrand: string; altPrice: string; checked: boolean
}

const ALTERNATIVES: Record<string, { alt: string; altBrand: string; altPrice: string; issue: string }> = {
  "kitkat":    { alt: "Veganer Schokoriegel",  altBrand: "Vivani",          altPrice: "~1,80 €", issue: "Palmöl" },
  "maggi":     { alt: "Würzpaste Bio",          altBrand: "Rapunzel",        altPrice: "~2,50 €", issue: "Palmöl" },
  "nescafé":   { alt: "Bio-Filterkaffee",       altBrand: "Kaffa Noir",      altPrice: "~4,90 €", issue: "Wasserrechte" },
  "nutella":   { alt: "Nocciolata Bio",         altBrand: "Rigoni di Asiago",altPrice: "~4,50 €", issue: "Palmöl" },
  "knorr":     { alt: "Gemüsebrühe Bio",        altBrand: "Alnatura",        altPrice: "~1,99 €", issue: "Palmöl" },
  "coca-cola": { alt: "Bio-Limo",               altBrand: "Bionade",         altPrice: "~1,20 €", issue: "Wasserrechte" },
  "lay's":     { alt: "Bio-Chips",              altBrand: "Funny-Frisch Bio",altPrice: "~2,29 €", issue: "Palmöl" },
  "default":   { alt: "Bio-Alternative",        altBrand: "Alnatura",        altPrice: "~variabel",issue: "Palmöl" },
}

const STORE_AVAIL: Record<string, string[]> = {
  "Vivani":           ["Rewe", "dm", "Alnatura", "Bio Company"],
  "Rigoni di Asiago": ["Rewe", "Edeka", "Alnatura"],
  "Kaffa Noir":       ["Alnatura", "Bio Company", "Online"],
  "Rapunzel":         ["Rewe", "Edeka", "dm", "Alnatura"],
  "Alnatura":         ["Rewe", "dm", "Alnatura"],
  "Bionade":          ["Rewe", "Edeka", "Lidl", "Aldi"],
  "Funny-Frisch Bio": ["Rewe", "Edeka"],
  "Prolupin":         ["Alnatura", "Bio Company", "Online"],
  "Natumi":           ["Alnatura", "dm", "Bio Company"],
  "VN Tofu":          ["Alnatura", "Bio Company"],
}

const INGREDIENT_INFO: Record<string, { title: string; color: string; emoji: string; what: string; body: { icon: string; label: string; text: string }[]; tip: string }> = {
  "Palmöl": {
    title: "Palmöl", color: "#ff6633", emoji: "🌴",
    what: "Palmöl steckt in über 50 % aller Supermarktprodukte — Schokolade, Seife, Brot, Tiefkühlpizza. Es ist billig, haltbar, vielseitig — und zerstört Regenwald.",
    body: [
      { icon: "🫀", label: "Herz-Kreislauf", text: "Erhöht LDL-Cholesterin durch gesättigte Fettsäuren (Palmitinsäure). Studie WHO 2022: +17% Herzinfarktrisiko bei regelmäßigem Konsum." },
      { icon: "🧪", label: "Krebsverdacht", text: "Erhitzt über 200°C entstehen Glycidyl-Fettsäureester — von EFSA als 'möglicherweise krebserregend' eingestuft. Besonders problematisch in Babynahrung." },
      { icon: "🌳", label: "Regenwald", text: "Für jede Tonne Palmöl werden Ø 1,3 Hektar Regenwald abgeholzt. 2023 verlor Borneo 840.000 Hektar Primärwald allein für Palmöl-Plantagen." },
      { icon: "🦧", label: "Artensterben", text: "80 % der Orang-Utan-Population verloren. Sumatra-Tiger, Borneo-Elefant: kritisch gefährdet. Palmöl-Plantagen haben ihren natürlichen Lebensraum nahezu vollständig verdrängt." },
    ],
    tip: "Achte auf: 'Palmöl', 'Palmfett', 'Pflanzenfett' und E471-E476 auf der Zutatenliste.",
  },
  "Wasserrechte": {
    title: "Wasserrechte", color: "#44aaff", emoji: "💧",
    what: "Konzerne wie Nestlé, Coca-Cola und PepsiCo fördern täglich Milliarden Liter Grundwasser — oft aus Regionen mit Wasserknappheit, ohne angemessene Entschädigung.",
    body: [
      { icon: "🚰", label: "Trinkwasser", text: "In Chennai, Indien entnimmt Coca-Cola 1,5 Mio. Liter/Tag — während Bewohner unter akuter Wasserknappheit leiden. Grundwasserpegel sank um 14 m in 10 Jahren." },
      { icon: "🌾", label: "Landwirtschaft", text: "Übermäßige Grundwasserentnahme zerstört lokale Ernte. Im Aralsee-Becken hat Baumwollanbau den See zu 90 % austrocknen lassen." },
      { icon: "💊", label: "Gesundheit", text: "Wenn Grundwasser sinkt, steigt Salzgehalt. In Vietnam verursacht Mekong-Delta-Grundwasserentnahme Salzwassereinbrüche — Ernten werden zerstört, Menschen krank." },
      { icon: "⚖️", label: "Rechtlich", text: "Nestlé Water bezieht in 11 US-Bundesstaaten Wasser mit abgelaufenen oder nie erneuerten Lizenzen. Gerichtliche Verfahren in Kanada und Michigan laufen seit 2020." },
    ],
    tip: "Wähle Leitungswasser statt Flaschenwasser und meide Marken wie Nestlé Pure Life, Vittel, San Pellegrino.",
  },
  "Glyphosat": {
    title: "Glyphosat", color: "#cc66ff", emoji: "☠️",
    what: "Glyphosat ist das meistverkaufte Unkrautvernichtungsmittel weltweit — entwickelt von Monsanto (heute Bayer). Es steckt in Getreide, Hülsenfrüchten und Sojaöl.",
    body: [
      { icon: "🧬", label: "Krebsrisiko", text: "IARC (WHO) stuft Glyphosat als 'wahrscheinlich krebserregend' ein. Bayer verlor bislang Prozesse mit $13 Mrd. Schadensersatz wegen Non-Hodgkin-Lymphom." },
      { icon: "🦋", label: "Ökosystem", text: "Glyphosat tötet alle Pflanzen außer gentechnisch veränderten 'Roundup Ready'-Kulturen. 70 % der Bienen-Nahrungsquellen auf Ackerflächen vernichtet." },
      { icon: "🚿", label: "Trinkwasser", text: "In Deutschland überschreiten 18 % der Grundwasserproben Glyphosat-Grenzwerte. Im Ganges-Becken trinken 200 Mio. Menschen kontaminiertes Wasser." },
      { icon: "🍼", label: "Kinder", text: "US-Studie 2022: Glyphosat in 87 % der getesteten Getreideflocken für Kinder. Nachgewiesen in Muttermilch in 11 EU-Ländern." },
    ],
    tip: "Kaufe zertifiziert Bio — Glyphosat ist im ökologischen Landbau verboten.",
  },
  "PFAS": {
    title: "PFAS (Ewigkeitschemikalien)", color: "#00aadd", emoji: "🧪",
    what: "PFAS (Per- und polyfluorierte Alkylsubstanzen) sind synthetische Chemikalien in Pfannen, Verpackungen und Kleidung. Sie bauen sich nicht ab — nie.",
    body: [
      { icon: "🫁", label: "Lunge & Leber", text: "PFAS reichern sich im Körper an. Studien zeigen Zusammenhang mit Schilddrüsenerkrankungen, erhöhtem Cholesterin und Leberkrebs." },
      { icon: "🌊", label: "Wasser", text: "PFAS kontaminieren Grundwasser weltweit. Donau in Rumänien: 70 % der Messstellen überschreiten EU-Grenzwerte. Halblewertszeit im Boden: 300+ Jahre." },
      { icon: "🍳", label: "Küche", text: "Antihaft-Beschichtungen (Teflon) setzen beim Erhitzen PFAS frei. Mikrowellen-Popcorn-Tüten, Fast-Food-Verpackungen — alles liniert mit PFAS." },
      { icon: "🧒", label: "Entwicklung", text: "Föten und Kinder besonders gefährdet. PFAS beeinträchtigen Hormonsystem und Immunfunktion. Muttermilch in 9 von 10 EU-Ländern belastet." },
    ],
    tip: "Vermeide Antihaft-Pfannen, Fast-Food-Verpackungen und wasserabweisende Textilien ohne PFAS-frei Zertifikat.",
  },
}

const STORES = ["Alle", "Rewe", "Edeka", "Lidl", "Aldi", "dm", "Alnatura", "Bio Company"]

interface Corp { id: string; name: string; aliases: string[]; categoryIds: string[]; evidenceIds: string[]; severity: string; lastUpdated: string }
interface Category { id: string; name: string; description: string; icon: string; createdBy: string; createdAt: string }
interface Evidence { id: string; title: string; source: string; date: string; level: string }
interface LookupResult { found: boolean; query?: string; corporation?: Corp; categories?: Category[]; evidence?: Evidence[] }

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview")
  const [corps, setCorps] = useState<Corp[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [searchQ, setSearchQ] = useState("")
  const [searchResult, setSearchResult] = useState<LookupResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [botText, setBotText] = useState("")
  const [botSource, setBotSource] = useState("")
  const [botLoading, setBotLoading] = useState(false)
  const [botResult, setBotResult] = useState<{ success?: boolean; error?: string; extracted?: { corporations: number; categories: number } } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [listItems, setListItems] = useState<ListItem[]>([
    { id: 1, name: "KitKat", brand: "Nestlé", issue: "Palmöl", alt: "Veganer Schokoriegel", altBrand: "Vivani", altPrice: "~1,80 €", checked: false },
    { id: 2, name: "Nutella", brand: "Ferrero", issue: "Palmöl", alt: "Nocciolata Bio", altBrand: "Rigoni di Asiago", altPrice: "~4,50 €", checked: false },
    { id: 3, name: "Maggi Fix", brand: "Nestlé", issue: "Palmöl", alt: "Würzpaste Bio", altBrand: "Rapunzel", altPrice: "~2,50 €", checked: false },
  ])
  const [listInput, setListInput] = useState("")
  const [selectedStore, setSelectedStore] = useState("Alle")
  const [ingredientModal, setIngredientModal] = useState<string | null>(null)

  function loadData() {
    fetch("/api/lookup", { method: "POST" })
      .then(r => r.json())
      .then(d => { setCorps(d.corporations); setCats(d.categories); setEvidence(d.evidence) })
  }

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (botResult?.success) loadData() }, [botResult])

  async function doSearch() {
    if (!searchQ.trim()) return
    setSearching(true)
    setSearchResult(null)
    const r = await fetch(`/api/lookup?q=${encodeURIComponent(searchQ)}`)
    setSearchResult(await r.json())
    setSearching(false)
  }

  async function submitBot() {
    if (!botText.trim() || !botSource.trim()) return
    setBotLoading(true)
    setBotResult(null)
    const r = await fetch("/api/bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: botText, source: botSource }),
    })
    setBotResult(await r.json())
    setBotLoading(false)
    setBotText("")
    setBotSource("")
  }

  const stats = {
    corps: corps.length,
    cats: cats.length,
    evidence: evidence.length,
    critical: corps.filter(c => c.severity === "critical").length,
  }

  return (
    <AuthGuard>
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid var(--border)", background: "var(--surface)",
        padding: "0 2rem", display: "flex", alignItems: "center", gap: "2rem",
        height: "60px", position: "sticky", top: 0, zIndex: 100,
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
          <span style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.05em", color: "var(--accent)" }}>TRUE</span>
          <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Transparenz</span>
        </a>
        <nav style={{ display: "flex", gap: "0.25rem", flex: 1 }}>
          {([ ["overview","Übersicht"], ["search","Suchen"], ["list","🛒 Einkaufsliste"], ["impact","📊 Mein Impact"], ["bot","Bot"], ["categories","Kategorien"] ] as [Tab,string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "0.35rem 0.9rem", borderRadius: "6px", border: "none", cursor: "pointer",
              fontSize: "0.85rem", fontWeight: tab === id ? 600 : 400,
              background: tab === id ? "var(--accent-dim)" : "transparent",
              color: tab === id ? "var(--accent)" : "var(--text-dim)", transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            {stats.critical} kritisch · {stats.corps} Konzerne
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Konzerne", value: stats.corps, color: "var(--accent)" },
                { label: "Kategorien", value: stats.cats, color: "#8888ff" },
                { label: "Nachweise", value: stats.evidence, color: "#88aaff" },
                { label: "Kritisch", value: stats.critical, color: "var(--danger)" },
              ].map(stat => (
                <div key={stat.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem 1.5rem" }}>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "1rem", fontWeight: 600, letterSpacing: "0.08em" }}>BEKANNTE KONZERNE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {corps.map(corp => {
                const corpCats = cats.filter(c => corp.categoryIds.includes(c.id))
                const col = SEVERITY_COLOR[corp.severity] ?? "#888"
                return (
                  <div key={corp.id} style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderLeft: `3px solid ${col}`, borderRadius: "10px",
                    padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{corp.name}</div>
                      {corp.aliases.length > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                          {corp.aliases.slice(0, 4).join(" · ")}{corp.aliases.length > 4 ? ` +${corp.aliases.length - 4}` : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {corpCats.map(c => (
                        <span key={c.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "20px", padding: "0.2rem 0.6rem", fontSize: "0.72rem", color: "var(--text-dim)" }}>
                          {c.icon} {c.name}
                        </span>
                      ))}
                    </div>
                    <span style={{ background: col + "22", color: col, border: `1px solid ${col}44`, borderRadius: "6px", padding: "0.2rem 0.5rem", fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {SEVERITY_LABEL[corp.severity]}
                    </span>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {corp.evidenceIds.length} Nachweise
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── SEARCH ── */}
        {tab === "search" && (
          <div style={{ maxWidth: "640px" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Produkt oder Konzern suchen</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>Gib einen Markennamen oder Konzern ein</p>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <input
                ref={searchRef}
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                placeholder="z.B. Maggi, Nescafé, Knorr..."
                style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--text)", fontSize: "1rem", outline: "none" }}
              />
              <button onClick={doSearch} disabled={searching} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "8px", padding: "0.75rem 1.5rem", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
                {searching ? "..." : "Suchen"}
              </button>
            </div>

            {searchResult && !searchResult.found && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.5rem", textAlign: "center", color: "var(--text-dim)" }}>
                ✓ Keine Einträge für &ldquo;{searchResult.query}&rdquo; gefunden
              </div>
            )}

            {searchResult?.found && searchResult.corporation && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{
                  background: "var(--surface)",
                  border: `1px solid ${SEVERITY_COLOR[searchResult.corporation.severity]}44`,
                  borderLeft: `4px solid ${SEVERITY_COLOR[searchResult.corporation.severity]}`,
                  borderRadius: "10px", padding: "1.25rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1.3rem" }}>{searchResult.corporation.name}</div>
                      <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginTop: "0.25rem" }}>{searchResult.corporation.aliases.join(" · ")}</div>
                    </div>
                    <span style={{ background: SEVERITY_COLOR[searchResult.corporation.severity] + "22", color: SEVERITY_COLOR[searchResult.corporation.severity], border: `1px solid ${SEVERITY_COLOR[searchResult.corporation.severity]}44`, borderRadius: "6px", padding: "0.3rem 0.7rem", fontWeight: 700, fontSize: "0.8rem" }}>
                      {SEVERITY_LABEL[searchResult.corporation.severity]}
                    </span>
                  </div>
                </div>

                {searchResult.categories && searchResult.categories.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "0.5rem", fontWeight: 600, letterSpacing: "0.08em" }}>PROBLEMBEREICHE</div>
                    {searchResult.categories.map(c => (
                      <div key={c.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", display: "flex", gap: "0.75rem", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "1.4rem" }}>{c.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>{c.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchResult.evidence && searchResult.evidence.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "0.5rem", fontWeight: 600, letterSpacing: "0.08em" }}>NACHWEISE</div>
                    {searchResult.evidence.map(e => (
                      <div key={e.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "0.5rem" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{e.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.25rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <span>{e.source} · {e.date}</span>
                          <span style={{ background: e.level === "verified" ? "rgba(46,204,138,0.15)" : "rgba(255,170,0,0.15)", color: e.level === "verified" ? "var(--accent)" : "var(--warning)", borderRadius: "4px", padding: "0.1rem 0.4rem", fontSize: "0.65rem", fontWeight: 600 }}>
                            {e.level === "verified" ? "✓ VERIFIZIERT" : "⏳ AUSSTEHEND"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── BOT ── */}
        {tab === "bot" && (
          <div style={{ maxWidth: "720px" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Bot mit neuen Infos füttern</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Füge Artikel, Berichte oder Studien ein — der Bot erkennt automatisch Konzerne und erstellt neue Kategorien
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <input
                value={botSource}
                onChange={e => setBotSource(e.target.value)}
                placeholder="Quelle (z.B. 'Der Spiegel 2024', 'EPA Report 2023')"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--text)", fontSize: "0.9rem", outline: "none" }}
              />
              <textarea
                value={botText}
                onChange={e => setBotText(e.target.value)}
                placeholder="Artikeltext, Bericht oder Nachweis hier einfügen..."
                rows={10}
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", color: "var(--text)", fontSize: "0.9rem", outline: "none", resize: "vertical", fontFamily: "inherit" }}
              />
              <button onClick={submitBot} disabled={botLoading || !botText.trim() || !botSource.trim()} style={{
                background: botLoading ? "var(--surface-2)" : "var(--accent)",
                color: botLoading ? "var(--text-dim)" : "#000",
                border: "none", borderRadius: "8px", padding: "0.9rem",
                fontWeight: 700, cursor: botLoading ? "not-allowed" : "pointer",
                fontSize: "0.95rem", transition: "all 0.2s",
              }}>
                {botLoading ? "⏳ Bot analysiert..." : "→ Analysieren & speichern"}
              </button>
            </div>

            {botResult && (
              <div style={{
                marginTop: "1rem",
                background: botResult.success ? "rgba(46,204,138,0.08)" : "rgba(255,68,85,0.08)",
                border: `1px solid ${botResult.success ? "rgba(46,204,138,0.3)" : "rgba(255,68,85,0.3)"}`,
                borderRadius: "10px", padding: "1rem 1.25rem",
              }}>
                {botResult.success ? (
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: "0.5rem" }}>✓ Erfolgreich analysiert</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
                      {botResult.extracted?.corporations} neue Konzerne · {botResult.extracted?.categories} neue Kategorien gespeichert
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "var(--danger)" }}>Fehler: {botResult.error}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── LIST ── */}
        {tab === "list" && (
          <div style={{ maxWidth: "700px" }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.4rem" }}>Meine Einkaufsliste</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
              Füge Produkte hinzu — TRUE zeigt dir sofort eine bessere Alternative.
            </p>

            {/* Routine Templates */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Einkaufs-Routinen</div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {[
                  { label: "🌿 Vegane Woche", items: [
                    { name: "Hafermilch", brand: "Oatly", issue: "Verpackung", alt: "Hafermilch Regional", altBrand: "Natumi", altPrice: "~1,79 €" },
                    { name: "Tofu Natur", brand: "Alnatura", issue: "–", alt: "Tofu Regional", altBrand: "VN Tofu", altPrice: "~2,49 €" },
                    { name: "Soja-Joghurt", brand: "Alpro", issue: "Palmöl", alt: "Lupinen-Joghurt", altBrand: "Prolupin", altPrice: "~2,99 €" },
                  ]},
                  { label: "☕ Frühstück", items: [
                    { name: "Nescafé Gold", brand: "Nestlé", issue: "Wasserrechte", alt: "Bio-Filterkaffee", altBrand: "Kaffa Noir", altPrice: "~4,90 €" },
                    { name: "Nutella", brand: "Ferrero", issue: "Palmöl", alt: "Nocciolata Bio", altBrand: "Rigoni di Asiago", altPrice: "~4,50 €" },
                    { name: "Kellogg's Cornflakes", brand: "Kellogg's", issue: "Palmöl", alt: "Bio Cornflakes", altBrand: "Alnatura", altPrice: "~2,49 €" },
                  ]},
                  { label: "🏠 Standard-Woche", items: [
                    { name: "KitKat", brand: "Nestlé", issue: "Palmöl", alt: "Veganer Schokoriegel", altBrand: "Vivani", altPrice: "~1,80 €" },
                    { name: "Knorr Fix", brand: "Unilever", issue: "Palmöl", alt: "Gemüsebrühe Bio", altBrand: "Alnatura", altPrice: "~1,99 €" },
                    { name: "Coca-Cola", brand: "Coca-Cola", issue: "Wasserrechte", alt: "Bio-Limo", altBrand: "Bionade", altPrice: "~1,20 €" },
                  ]},
                ].map((routine) => (
                  <button key={routine.label} onClick={() => {
                    const newItems = routine.items.map((item, i) => ({ id: Date.now() + i, checked: false, ...item }))
                    setListItems(prev => [...prev, ...newItems])
                  }} style={{
                    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px",
                    padding: "0.5rem 1rem", fontSize: "0.82rem", color: "var(--text)",
                    cursor: "pointer", fontWeight: 500, transition: "all 0.15s",
                  }}>
                    {routine.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Store picker */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                📍 Mein Supermarkt
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {STORES.map(s => (
                  <button key={s} onClick={() => setSelectedStore(s)} style={{
                    background: selectedStore === s ? "var(--accent-dim)" : "var(--surface)",
                    color: selectedStore === s ? "var(--accent)" : "var(--text-dim)",
                    border: `1px solid ${selectedStore === s ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "20px", padding: "0.35rem 0.85rem", fontSize: "0.8rem",
                    cursor: "pointer", fontWeight: selectedStore === s ? 700 : 400, transition: "all 0.15s",
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Add input */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.75rem" }}>
              <input
                value={listInput}
                onChange={e => setListInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key !== "Enter" || !listInput.trim()) return
                  const key = listInput.toLowerCase().replace(/\s+/g,"")
                  const found = Object.entries(ALTERNATIVES).find(([k]) => key.includes(k))
                  const info = found ? found[1] : ALTERNATIVES["default"]
                  setListItems(prev => [...prev, { id: Date.now(), name: listInput, brand: "Unbekannt", ...info, checked: false }])
                  setListInput("")
                }}
                placeholder="Produkt eingeben und Enter drücken..."
                style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.7rem 1rem", color: "var(--text)", fontSize: "0.9rem", outline: "none" }}
              />
            </div>

            {/* List items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {listItems.map(item => {
                const avail = STORE_AVAIL[item.altBrand] ?? []
                const inStore = selectedStore === "Alle" || avail.includes(selectedStore)
                const altStores = avail.filter(s => s !== selectedStore).slice(0, 2)
                return (
                  <div key={item.id} style={{
                    background: "var(--surface)", border: `1px solid ${inStore && selectedStore !== "Alle" ? "rgba(46,204,138,0.2)" : "var(--border)"}`,
                    borderRadius: "14px", padding: "1.1rem 1.25rem",
                    opacity: item.checked ? 0.45 : 1, transition: "opacity 0.2s",
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "1rem", alignItems: "start" }}>
                      <button onClick={() => setListItems(ps => ps.map(p => p.id === item.id ? { ...p, checked: !p.checked } : p))}
                        style={{ width: "24px", height: "24px", borderRadius: "7px", border: `2px solid ${item.checked ? "var(--accent)" : "var(--border)"}`, background: item.checked ? "var(--accent)" : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontSize: "0.8rem", fontWeight: 700, marginTop: "2px" }}>
                        {item.checked ? "✓" : ""}
                      </button>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.45rem", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.95rem", textDecoration: item.checked ? "line-through" : "none" }}>{item.name}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{item.brand}</span>
                          <button onClick={() => setIngredientModal(item.issue)}
                            style={{ background: "var(--danger-dim)", color: "var(--danger)", border: "none", borderRadius: "4px", padding: "0.1rem 0.4rem", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer" }}>
                            ⚠ {item.issue} ℹ
                          </button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                          <span style={{ color: "var(--text-dim)" }}>Alternative:</span>
                          <span style={{ color: "var(--accent)", fontWeight: 600 }}>{item.alt}</span>
                          <span style={{ color: "var(--text-dim)" }}>· {item.altBrand}</span>
                          <span style={{ background: "var(--accent-dim)", color: "var(--accent)", borderRadius: "4px", padding: "0.1rem 0.4rem", fontSize: "0.65rem", fontWeight: 700 }}>{item.altPrice}</span>
                        </div>
                        {selectedStore !== "Alle" && (
                          <div style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            {inStore ? (
                              <span style={{ color: "var(--accent)", fontWeight: 600 }}>✓ Verfügbar bei {selectedStore}</span>
                            ) : (
                              <span style={{ color: "var(--text-dim)" }}>
                                Nicht bei {selectedStore}
                                {altStores.length > 0 && <span> · erhältlich bei <strong style={{ color: "var(--text)" }}>{altStores.join(", ")}</strong></span>}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <button onClick={() => setListItems(ps => ps.filter(p => p.id !== item.id))}
                        style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.1rem", padding: "0.25rem" }}>
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {listItems.length > 0 && (
              <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "0.82rem", color: "var(--text-dim)", display: "flex", justifyContent: "space-between" }}>
                <span>{listItems.filter(i => i.checked).length} / {listItems.length} erledigt</span>
                <button onClick={() => setListItems(ps => ps.filter(p => !p.checked))} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.82rem" }}>
                  Erledigte löschen
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── INGREDIENT MODAL ── */}
        {ingredientModal && (() => {
          const info = INGREDIENT_INFO[ingredientModal]
          if (!info) return null
          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(16px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
              onClick={() => setIngredientModal(null)}>
              <div style={{ background: "var(--surface)", border: `1px solid ${info.color}33`, borderRadius: "22px", maxWidth: "520px", width: "100%", maxHeight: "85vh", overflowY: "auto" }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: "1.75rem 1.75rem 1rem", borderBottom: `1px solid ${info.color}22` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>{info.emoji}</div>
                      <h2 style={{ fontWeight: 900, fontSize: "1.4rem", color: info.color, margin: 0 }}>{info.title}</h2>
                    </div>
                    <button onClick={() => setIngredientModal(null)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.4rem", padding: "0.25rem" }}>×</button>
                  </div>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-dim)", lineHeight: 1.7, marginTop: "0.75rem" }}>{info.what}</p>
                </div>

                {/* Body cards */}
                <div style={{ padding: "1.25rem 1.75rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {info.body.map((b, i) => (
                    <div key={i} style={{ background: "var(--surface-2)", border: `1px solid ${info.color}18`, borderLeft: `3px solid ${info.color}`, borderRadius: "12px", padding: "1rem 1.1rem", display: "flex", gap: "0.85rem" }}>
                      <div style={{ fontSize: "1.6rem", flexShrink: 0 }}>{b.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem", color: info.color, marginBottom: "0.3rem" }}>{b.label}</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.65 }}>{b.text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tip */}
                <div style={{ margin: "0 1.75rem 1.75rem", padding: "0.9rem 1.1rem", background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "10px", fontSize: "0.82rem", color: "var(--accent)", lineHeight: 1.6 }}>
                  💡 <strong>Tipp:</strong> {info.tip}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── IMPACT ── */}
        {tab === "impact" && (
          <div style={{ maxWidth: "760px" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.4rem" }}>Mein Impact</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "0.9rem", marginBottom: "2rem" }}>
              Deine bewussten Entscheidungen seit du TRUE nutzt — sichtbar gemacht.
            </p>

            {/* Big stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Bewusste Einkäufe", value: "23", icon: "🛒", color: "var(--accent)", sub: "seit dem Start" },
                { label: "Konzerne gemieden", value: "5", icon: "🚫", color: "#ff4455", sub: "Nestlé, Unilever +3" },
                { label: "Umgeleitet", value: "€ 47", icon: "💚", color: "#2ECC8A", sub: "zu fairen Alternativen" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.5rem 1.25rem", textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.35rem" }}>{s.icon}</div>
                  <div style={{ fontSize: "1.9rem", fontWeight: 900, color: s.color, marginBottom: "0.2rem" }}>{s.value}</div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Weekly Insights */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.2rem" }}>📰</span>
                <span style={{ fontWeight: 700 }}>TRUE Weekly Insights</span>
                <span style={{ background: "var(--accent-dim)", color: "var(--accent)", borderRadius: "4px", padding: "0.1rem 0.5rem", fontSize: "0.65rem", fontWeight: 700 }}>DIESE WOCHE</span>
              </div>
              {[
                { icon: "🌿", text: "Neue Studie: Bio-Landwirtschaft senkt Pestizidrückstände im Trinkwasser um 68 %", color: "#2ECC8A" },
                { icon: "📉", text: "Community: TRUE-Community mied Nestlé-Produkte diese Woche → Börsenkurs -0,4 %", color: "#ff4455" },
                { icon: "🏪", text: "Neu in der Datenbank: 12 Konzerne, 34 neue Nachweise — davon 8 verifiziert", color: "#8888ff" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "0.75rem", padding: "0.7rem 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-dim)", lineHeight: 1.55 }}>
                    <span style={{ color: item.color, fontWeight: 600 }}>+</span> {item.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Avoided corps */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: 700, marginBottom: "1rem" }}>🚫 Gemiedene Konzerne</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[
                  { name: "Nestlé", count: 8, saving: "€ 14,20", color: "#ff4455" },
                  { name: "Unilever", count: 6, saving: "€ 11,50", color: "#ff8800" },
                  { name: "Bayer/Monsanto", count: 4, saving: "€ 9,80", color: "#cc66ff" },
                  { name: "Coca-Cola", count: 3, saving: "€ 7,60", color: "#ff4455" },
                  { name: "BP / Shell", count: 2, saving: "–", color: "#ffcc00" },
                ].map(c => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{c.name}</span>
                        <span style={{ fontSize: "0.78rem", color: "var(--accent)" }}>{c.saving} umgeleitet</span>
                      </div>
                      <div style={{ height: "5px", background: "var(--surface-2)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${c.count * 10}%`, background: c.color, borderRadius: "3px", transition: "width 0.8s ease" }} />
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>{c.count} Produkte ersetzt</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Community rank */}
            <div style={{ background: "linear-gradient(135deg, var(--accent-dim), transparent)", border: "1px solid var(--accent)", borderRadius: "14px", padding: "1.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>🏆</div>
              <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--accent)", marginBottom: "0.3rem" }}>Top 12 % der Community</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
                Du bist aktiver als 88 % der TRUE-Nutzer.<br />
                <strong style={{ color: "var(--text)" }}>84.400 Menschen</strong> bündeln gemeinsam ihre Kaufkraft.
              </div>
            </div>
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {tab === "categories" && (
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem" }}>Alle Kategorien</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1rem" }}>
              {cats.map(c => (
                <div key={c.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{c.icon}</div>
                  <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{c.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.5 }}>{c.description}</div>
                  <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em",
                      padding: "0.2rem 0.5rem", borderRadius: "4px",
                      background: c.createdBy === "auto" ? "rgba(136,136,255,0.15)" : "rgba(46,204,138,0.12)",
                      color: c.createdBy === "auto" ? "#8888ff" : "var(--accent)",
                    }}>
                      {c.createdBy === "auto" ? "🤖 AUTO" : "✋ MANUELL"}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{c.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
      <BottomNav />
    </div>
    </AuthGuard>
  )
}
