"use client"
import { useState } from "react"

// ── TRUE Business Plan ────────────────────────────────────────────────────────
// Druckbare Übersicht aller relevanten Zahlen, Strategie und Prognosen.
// Cmd+P → "Als PDF speichern" — die Seite ist print-optimiert.

const TODAY = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })

// ── 5-Jahres-Projektion (Basis-Szenario) ─────────────────────────────────────
// Annahmen:
// - Starter 29€  → ~40% der Partner (Tester, kleine Marken)
// - Wachstum 79€ → ~45% der Partner (Hauptzielgruppe)
// - Premium 149€ → ~15% der Partner (etablierte Marken)
const YEARS = [
  {
    year: "Jahr 1",
    period: "2026",
    phase: "Netzwerk-Aufbau",
    users: "0 → 2.000",
    usersEnd: 2000,
    partners: 10,
    starter: 6, growth: 3, premium: 1,
    monthlyCosts: 30,
    teamSize: "1 (Du + Claude)",
    note: "Fokus auf User-Akquise. Partnerprogramm offen halten aber nicht aggressiv pushen.",
  },
  {
    year: "Jahr 2",
    period: "2027",
    phase: "Wachstum & erste Marken",
    users: "2.000 → 10.000",
    usersEnd: 10000,
    partners: 35,
    starter: 14, growth: 16, premium: 5,
    monthlyCosts: 80,
    teamSize: "1 (Du + Claude)",
    note: "Erste echten Marken kommen rein. Verifikation noch alleine machbar.",
  },
  {
    year: "Jahr 3",
    period: "2028",
    phase: "Skalierung",
    users: "10.000 → 30.000",
    usersEnd: 30000,
    partners: 85,
    starter: 30, growth: 40, premium: 15,
    monthlyCosts: 350,
    teamSize: "1 + Teilzeit-VA (Verifikation)",
    note: "VA übernimmt Produkt-Verifikation. Du fokussierst auf Wachstum & Marken-Akquise.",
  },
  {
    year: "Jahr 4",
    period: "2029",
    phase: "Etablierung",
    users: "30.000 → 80.000",
    usersEnd: 80000,
    partners: 160,
    starter: 50, growth: 80, premium: 30,
    monthlyCosts: 2000,
    teamSize: "Du + 1 Vollzeit",
    note: "Vollzeit-Mitarbeiter für Partner-Management. Marketingbudget einrechnen.",
  },
  {
    year: "Jahr 5",
    period: "2030",
    phase: "Marktreife",
    users: "80.000 → 150.000",
    usersEnd: 150000,
    partners: 250,
    starter: 80, growth: 130, premium: 40,
    monthlyCosts: 5500,
    teamSize: "Du + 2 Vollzeit",
    note: "Etablierter Player. Optional: Investoren-Runde oder Ausweitung DACH-Raum.",
  },
]

function calcRevenue(y: typeof YEARS[0]) {
  return y.starter * 29 + y.growth * 79 + y.premium * 149
}

const TOTAL_5Y_REVENUE = YEARS.reduce((sum, y) => sum + calcRevenue(y) * 12, 0)
const TOTAL_5Y_COSTS   = YEARS.reduce((sum, y) => sum + y.monthlyCosts * 12, 0)
const TOTAL_5Y_PROFIT  = TOTAL_5Y_REVENUE - TOTAL_5Y_COSTS

// ── Kostenstruktur aktuell ────────────────────────────────────────────────────
const CURRENT_COSTS = [
  { name: "Claude Pro Abo", price: 15, note: "Entwicklung & Content-Generierung" },
  { name: "Strato VPS + Domain", price: 4, note: "Hosting inkl. get-true.de" },
  { name: "Supabase Free Tier", price: 0, note: "Datenbank + Auth (bis 50k Nutzer)" },
  { name: "OpenFoodFacts API", price: 0, note: "Open Source — kostenlos" },
]
const CURRENT_TOTAL = CURRENT_COSTS.reduce((s, c) => s + c.price, 0)

// ── Break-Even ────────────────────────────────────────────────────────────────
const BREAK_EVEN_STARTER = Math.ceil(CURRENT_TOTAL / 29)   // 1 Starter-Kunde reicht
const BREAK_EVEN_GROWTH  = Math.ceil(CURRENT_TOTAL / 79)
// ── Marketing-Kanäle ─────────────────────────────────────────────────────────
const MARKETING_CHANNELS = [
  {
    name: "Anonymous-Style Aufklärung",
    type: "Organic Social",
    cost: "0€ (eigene Zeit)",
    target: "Bewusste Verbraucher, kritische Köpfe",
    content: "Maskierte Aktionen am Bahnhof / öffentlichen Orten — Zettel verteilen mit Fakten über Konzerne, QR-Code zur App. Filmen & viral verbreiten.",
    platform: "TikTok, Instagram Reels, YouTube Shorts",
    expected: "Viralpotenzial hoch — 10-100k Views pro gutes Video",
    priority: 1,
  },
  {
    name: "Reddit-Communities",
    type: "Organic Community",
    cost: "0€",
    target: "r/Nachhaltigkeit, r/de_IAmA, r/Vegan, r/Verbraucherschutz",
    content: "Ehrliche Posts: 'Ich habe eine App gebaut die zeigt welche Konzerne hinter Produkten stehen'. Transparent über Status, offen für Feedback.",
    platform: "Reddit",
    expected: "Bei gutem Post: 500-5.000 Klicks. Hohe Conversion (engagierte Zielgruppe).",
    priority: 2,
  },
  {
    name: "Instagram Nischen-Gruppen",
    type: "Community Outreach",
    cost: "0€ (Direktnachrichten)",
    target: "Vegan-Influencer, Schwangerschaftsgruppen, Eltern, Zero-Waste-Community",
    content: "Pers. Nachrichten an Mikro-Influencer (1-10k Follower). 'Kannst du das mal testen und mir Feedback geben?'. Authentisch, kein Werbedeal.",
    platform: "Instagram DMs",
    expected: "5-15 Antworten von 100 Nachrichten. Davon 1-3 organische Posts.",
    priority: 3,
  },
  {
    name: "TikTok-Hooks zu Konzernen",
    type: "Organic Video",
    cost: "0€",
    target: "Gen Z + Millennials",
    content: "'Das weiß fast niemand über Nestlé...' Format. Bereits in /admin generierbar. 1 Post pro Tag minimum.",
    platform: "TikTok",
    expected: "1 von 10 Videos geht durch (10k+ Views). Bei 1k Views → ~5 App-Installs.",
    priority: 4,
  },
  {
    name: "Schwangerschafts- & Eltern-Gruppen",
    type: "Community Outreach",
    cost: "0€",
    target: "Werdende Eltern (höchste Kaufentscheidungs-Sensibilität)",
    content: "Facebook-Gruppen, NetMoms-Forum, urbia.de. Vorsicht: nicht spammen, sondern in Diskussionen organisch erwähnen.",
    platform: "Facebook, Foren",
    expected: "Sehr engagierte Zielgruppe — niedrige Reichweite aber höchste Conversion.",
    priority: 5,
  },
  {
    name: "Influencer-Kooperationen",
    type: "Paid (später)",
    cost: "100-500€/Post (ab Jahr 2)",
    target: "Bio- und Nachhaltigkeits-Influencer",
    content: "Mikro-Influencer mit echtem Engagement. Vorzugsweise auf Provision (10€ pro Partner-Conversion) statt Festpreis.",
    platform: "Instagram, YouTube",
    expected: "Erst sinnvoll wenn 5.000+ Nutzer vorhanden und Conversion-Daten existieren.",
    priority: 6,
  },
]

// ── Roadmap / Nächste Schritte ───────────────────────────────────────────────
const ROADMAP = [
  {
    phase: "Phase 1: Erste 500 Nutzer",
    when: "Jetzt → 3 Monate",
    goals: [
      "Funktionalität stabil & bug-frei",
      "Anonymous-Style Content auf TikTok starten (3-5 Posts/Woche)",
      "Reddit-Outreach in 5 relevanten Communities",
      "Persönliche Einladungen an Freunde & Familie",
      "Erste 5 Partner kostenlos für Testimonials gewinnen",
    ],
  },
  {
    phase: "Phase 2: 500 → 5.000 Nutzer",
    when: "3 → 9 Monate",
    goals: [
      "Instagram-Mikro-Influencer kontaktieren (10-15 pro Woche)",
      "Schwangerschafts- & Familienforen bespielen",
      "Partnerprogramm offiziell launchen",
      "App Store Optimization (ASO) wenn native App live",
      "Ersten zahlenden Partner gewinnen",
    ],
  },
  {
    phase: "Phase 3: 5.000 → 20.000 Nutzer",
    when: "9 → 18 Monate",
    goals: [
      "Pressekontakt zu utopia.de, Öko-Test, Greenpeace Magazin",
      "Partner-Akquise aktiv: 50 Marken direkt anschreiben",
      "Marketing-Budget freischalten (Influencer-Provisionen)",
      "Erster Teilzeit-VA für Verifikation",
      "Break-Even auf MRR-Basis",
    ],
  },
  {
    phase: "Phase 4: 20.000 → 50.000+ Nutzer",
    when: "18+ Monate",
    goals: [
      "Vollzeit-Mitarbeiter für Partner-Management",
      "Optional: Investoren-Pitch (Bootstrapped bleiben prüfen)",
      "Ausweitung Österreich & Schweiz",
      "B2B-Sales Team aufbauen",
    ],
  },
]

// ── Automatisierungspotenzial ─────────────────────────────────────────────────
const AUTOMATION = [
  { task: "Produkt-Verifikation (Standardfälle)", automation: "100% via OpenFoodFacts-Check", needsHuman: "Nur Edge-Cases" },
  { task: "Partner-Onboarding", automation: "100% Self-Service via /partner-register", needsHuman: "Keiner" },
  { task: "Content für Social Media", automation: "80% via Claude-Generator in /admin", needsHuman: "Auswahl & Posten" },
  { task: "Community-Moderation", automation: "60% (Spam-Filter, Auto-Flag)", needsHuman: "Bei Konflikten" },
  { task: "Statistik-Reports für Partner", automation: "100% Dashboard + automat. Email", needsHuman: "Keiner" },
  { task: "Kunden-Support", automation: "70% via FAQ + Chat-Bot", needsHuman: "Bei komplexen Fällen" },
  { task: "Buchhaltung", automation: "Mit Tool wie sevDesk/lexoffice 90%", needsHuman: "Steuerberater 1x/Jahr" },
]

export default function BusinessPlanPage() {
  const [showSensitivity, setShowSensitivity] = useState(false)

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section id={id} className="bp-section" style={{ marginBottom: "3rem", pageBreakInside: "avoid" }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid #2ECC8A" }}>
        {title}
      </h2>
      {children}
    </section>
  )

  return (
    <div style={{ minHeight: "100dvh", background: "#fff", color: "#111", fontFamily: "system-ui,-apple-system,sans-serif", padding: 0, lineHeight: 1.6 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          .bp-section { page-break-inside: avoid; }
          h1, h2, h3 { page-break-after: avoid; }
          table { page-break-inside: avoid; }
          @page { margin: 1.5cm 1.2cm; size: A4; }
        }
        .bp-table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; }
        .bp-table th, .bp-table td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 0.85rem; }
        .bp-table th { background: #f5f9f7; font-weight: 700; }
        .bp-table tr:nth-child(even) { background: #fafafa; }
        .bp-callout { background: #f5f9f7; border-left: 4px solid #2ECC8A; padding: 12px 16px; margin: 1rem 0; font-size: 0.9rem; border-radius: 0 8px 8px 0; }
        .bp-warning { background: #fef9e7; border-left: 4px solid #f5b800; padding: 12px 16px; margin: 1rem 0; font-size: 0.9rem; border-radius: 0 8px 8px 0; }
        .bp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .bp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .bp-kpi { background: #fafafa; border: 1px solid #ddd; border-radius: 10px; padding: 14px 16px; }
        .bp-kpi-value { font-size: 1.6rem; font-weight: 900; color: #2ECC8A; line-height: 1; }
        .bp-kpi-label { font-size: 0.72rem; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        @media (max-width: 700px) {
          .bp-grid-2, .bp-grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Sticky Print Bar (nicht im Print sichtbar) */}
      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 100, background: "#0b1a10", color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontWeight: 900, color: "#2ECC8A", fontSize: "1rem" }}>TRUE</span>
          <span style={{ background: "#2ECC8A22", color: "#2ECC8A", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>BUSINESS PLAN</span>
        </div>
        <button onClick={() => window.print()}
          style={{ background: "#2ECC8A", color: "#000", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 800, cursor: "pointer", fontSize: "0.85rem" }}>
          🖨️ Als PDF speichern
        </button>
      </div>

      <main style={{ maxWidth: "880px", margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>

        {/* ── COVER ── */}
        <div style={{ textAlign: "center", marginBottom: "3rem", paddingBottom: "2rem", borderBottom: "1px solid #eee" }}>
          <div style={{ fontSize: "0.7rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>Business Plan & Strategie</div>
          <h1 style={{ fontSize: "3rem", fontWeight: 900, color: "#2ECC8A", letterSpacing: "-0.04em", margin: "0 0 0.5rem" }}>TRUE</h1>
          <div style={{ fontSize: "1.1rem", color: "#444", fontWeight: 500, marginBottom: "1.5rem" }}>
            Die Verbraucher-App für ehrliche Produkt-Transparenz
          </div>
          <div style={{ fontSize: "0.85rem", color: "#888" }}>Stand: {TODAY}</div>
          <div style={{ fontSize: "0.78rem", color: "#888", marginTop: "0.25rem" }}>get-true.de</div>
        </div>

        {/* ── INHALTSVERZEICHNIS ── */}
        <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 12, padding: "1.25rem 1.5rem", marginBottom: "2.5rem" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#666" }}>Inhalt</h3>
          <ol style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.9, fontSize: "0.9rem" }}>
            <li><a href="#summary" style={{ color: "#111", textDecoration: "none" }}>Executive Summary</a></li>
            <li><a href="#produkt" style={{ color: "#111", textDecoration: "none" }}>Das Produkt — Was ist TRUE</a></li>
            <li><a href="#zielgruppe" style={{ color: "#111", textDecoration: "none" }}>Zielgruppen (B2C & B2B)</a></li>
            <li><a href="#kunde" style={{ color: "#111", textDecoration: "none" }}>A-Z aus Kundensicht</a></li>
            <li><a href="#unternehmer" style={{ color: "#111", textDecoration: "none" }}>A-Z aus Unternehmersicht</a></li>
            <li><a href="#preise" style={{ color: "#111", textDecoration: "none" }}>Preismodell & Tiers</a></li>
            <li><a href="#finanzen" style={{ color: "#111", textDecoration: "none" }}>Finanzplan & Break-Even</a></li>
            <li><a href="#prognose" style={{ color: "#111", textDecoration: "none" }}>5-Jahres-Prognose</a></li>
            <li><a href="#marketing" style={{ color: "#111", textDecoration: "none" }}>Marketing-Strategie</a></li>
            <li><a href="#operations" style={{ color: "#111", textDecoration: "none" }}>Operations & Team-Skalierung</a></li>
            <li><a href="#roadmap" style={{ color: "#111", textDecoration: "none" }}>Roadmap & Meilensteine</a></li>
            <li><a href="#risiken" style={{ color: "#111", textDecoration: "none" }}>Risiken & Gegenmaßnahmen</a></li>
          </ol>
        </div>

        {/* ── 1. EXECUTIVE SUMMARY ── */}
        <Section id="summary" title="1. Executive Summary">
          <p>
            <b>TRUE</b> ist eine Smartphone-App, die Verbrauchern beim Einkauf zeigt, welche Konzerne hinter Produkten stehen,
            welche ethischen Probleme damit verbunden sind und welche besseren Alternativen es gibt. Per Barcode-Scan oder
            Eingabe in die Einkaufsliste erhält der Nutzer in Sekunden eine ehrliche Einschätzung — basierend auf
            unabhängigen Datenbanken (OpenFoodFacts) und einer verifizierten Partner-Datenbank.
          </p>

          <div className="bp-callout">
            <b>Vision:</b> Der Standard für transparenten Konsum im DACH-Raum werden. Wenn jemand wissen will, was wirklich
            in seinem Einkaufskorb steckt — soll TRUE die erste App sein, an die er denkt.
          </div>

          <div className="bp-grid-3" style={{ marginTop: "1.5rem" }}>
            <div className="bp-kpi">
              <div className="bp-kpi-value">19€</div>
              <div className="bp-kpi-label">Aktuelle Kosten / Monat</div>
            </div>
            <div className="bp-kpi">
              <div className="bp-kpi-value">1</div>
              <div className="bp-kpi-label">Starter-Kunde = Break-Even</div>
            </div>
            <div className="bp-kpi">
              <div className="bp-kpi-value">5.000</div>
              <div className="bp-kpi-label">User-Ziel Jahr 1-2</div>
            </div>
          </div>
        </Section>

        {/* ── 2. PRODUKT ── */}
        <Section id="produkt" title="2. Das Produkt — Was ist TRUE">
          <p>TRUE besteht aus drei Kernbestandteilen:</p>
          <table className="bp-table">
            <tbody>
              <tr>
                <td style={{ width: "30%", fontWeight: 700 }}>📷 Scan & Lookup</td>
                <td>Barcode oder Produktname eingeben → sofortige Bewertung mit Hintergrund-Infos zum Konzern, NOVA-Klassifikation, Nutri-Score und ethischen Bewertungen.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>🛒 Smarte Einkaufsliste</td>
                <td>Kollaborative Einkaufslisten für die ganze Familie. Vorschläge für bessere Alternativen direkt in der Liste.</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>👥 Community</td>
                <td>Erfahrungsaustausch, Posts von Bots & Nutzern, Themen-Channels (Plastik, Bio, Tierhaltung, Politik).</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>🤝 Partner-Marketplace</td>
                <td>Verifizierte Marken bezahlen, um als Alternative bei Scans angezeigt zu werden — das ist unser Geschäftsmodell.</td>
              </tr>
            </tbody>
          </table>

          <p style={{ marginTop: "1rem" }}><b>USP (Alleinstellungsmerkmal):</b></p>
          <ul>
            <li>Eine der ersten deutschsprachigen Apps mit kombinierter Konzern-Aufklärung + Alternative-Empfehlung</li>
            <li>Verifizierungs-System: nur geprüfte Alternativen werden empfohlen (im Gegensatz zu reinen Bewertungs-Apps)</li>
            <li>Community-getrieben statt Werbe-getrieben</li>
            <li>Datenschutzfreundlich (kein Tracking, deutsche Server)</li>
          </ul>
        </Section>

        {/* ── 3. ZIELGRUPPEN ── */}
        <Section id="zielgruppe" title="3. Zielgruppen (B2C & B2B)">
          <div className="bp-grid-2">
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.5rem" }}>🧑 Endnutzer (B2C)</h3>
              <ul style={{ fontSize: "0.88rem" }}>
                <li>Bewusste Verbraucher 20-45</li>
                <li>Eltern (junge Familien)</li>
                <li>Schwangere & Werdende Eltern</li>
                <li>Veganer / Vegetarier</li>
                <li>Zero-Waste-Community</li>
                <li>Politisch Interessierte (Konsumkritik)</li>
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.5rem" }}>🏢 Partner (B2B)</h3>
              <ul style={{ fontSize: "0.88rem" }}>
                <li>Bio- und Demeter-Marken</li>
                <li>Fair-Trade-Hersteller</li>
                <li>Regionale Produzenten</li>
                <li>Plastikfreie / Verpackungs-Alternativen</li>
                <li>Öko-Kosmetik & Pflege</li>
                <li>Nachhaltige Reinigungsmittel</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* ── 4. A-Z KUNDE ── */}
        <Section id="kunde" title="4. A-Z aus Kundensicht (Nutzer-Journey)">
          <ol style={{ lineHeight: 1.9 }}>
            <li><b>Aufmerksamkeit:</b> Nutzer sieht TikTok-Video, Reddit-Post oder Empfehlung von Freund → Neugierig auf "Was steckt wirklich in meinem Einkauf?"</li>
            <li><b>Installation:</b> Lädt TRUE App / öffnet get-true.de — keine E-Mail-Pflicht, Nutzung sofort möglich.</li>
            <li><b>Erste Erfahrung:</b> Scannt ein Alltagsprodukt (z.B. Nutella) → sieht Konzern-Background, Nährwerte, bessere Alternativen.</li>
            <li><b>Einkaufsliste:</b> Erstellt eine Liste, lädt Familienmitglieder per Link ein → kollaboratives Einkaufen.</li>
            <li><b>Community:</b> Liest in der Community Erfahrungen, sieht Bot-Posts mit Aufklärung über Konzerne.</li>
            <li><b>Verhaltensänderung:</b> Wechselt schrittweise zu Alternativen, beeinflusst Freunde — TRUE wird zum Alltagstool.</li>
            <li><b>Engagement:</b> Postet selbst, kommentiert, teilt Funde — wird Teil der Community.</li>
            <li><b>Retention:</b> Wiederkehrende Nutzung durch Einkaufsliste, regelmäßige Push-Benachrichtigungen mit relevanten Themen.</li>
          </ol>

          <div className="bp-callout">
            <b>Kernwert für Kunden:</b> Ehrliche Information ohne Werbe-BS, in Sekunden, kostenlos.
          </div>
        </Section>

        {/* ── 5. A-Z UNTERNEHMER ── */}
        <Section id="unternehmer" title="5. A-Z aus Unternehmersicht (Partner-Journey)">
          <ol style={{ lineHeight: 1.9 }}>
            <li><b>Entdeckung:</b> Marken-Manager hört von TRUE über Verbraucher-Feedback oder Branchen-Newsletter.</li>
            <li><b>Recherche:</b> Besucht get-true.de/partner → sieht klare Preise, transparente Wirkung, Verifikations-Versprechen.</li>
            <li><b>Test:</b> Registriert sich für 14 Tage kostenlosen Test (Starter).</li>
            <li><b>Produkt einreichen:</b> Gibt Barcode, Foto, Beschreibung, Zertifikate ein → Auto-Verifikation via OpenFoodFacts oder manuelle Prüfung.</li>
            <li><b>Erste Sichtbarkeit:</b> Produkt erscheint nach Freigabe (3-5 Tage) als Alternative bei passenden Scans.</li>
            <li><b>Tracking:</b> Dashboard zeigt Impressionen, Klicks, Einkaufslisten-Adds in Echtzeit.</li>
            <li><b>Wachstum:</b> Bei guter Performance Upgrade zu Wachstum oder Premium-Tier.</li>
            <li><b>Retention:</b> Monatliche Statistik-Mail mit Highlights & Vergleichszahlen.</li>
          </ol>

          <div className="bp-callout">
            <b>Kernwert für Partner:</b> Werbung im Moment der höchsten Kaufabsicht — der Nutzer scannt gerade ein Konkurrenzprodukt.
          </div>
        </Section>

        {/* ── 6. PREISMODELL ── */}
        <Section id="preise" title="6. Preismodell & Tiers">
          <p>Drei klar abgestufte Tiers — mit 14 Tagen kostenlosem Test in allen Stufen:</p>
          <table className="bp-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th style={{ textAlign: "center" }}>🧪 Starter<br/><span style={{ fontWeight: 400, fontSize: "0.78rem" }}>29€/Monat</span></th>
                <th style={{ textAlign: "center" }}>🚀 Wachstum<br/><span style={{ fontWeight: 400, fontSize: "0.78rem" }}>79€/Monat</span></th>
                <th style={{ textAlign: "center" }}>👑 Premium<br/><span style={{ fontWeight: 400, fontSize: "0.78rem" }}>149€/Monat</span></th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Anzahl Produkte</td><td style={{ textAlign: "center" }}>1</td><td style={{ textAlign: "center" }}>5</td><td style={{ textAlign: "center" }}>∞</td></tr>
              <tr><td>Als Alternative anzeigen</td><td style={{ textAlign: "center" }}>✓</td><td style={{ textAlign: "center" }}>✓ priorisiert</td><td style={{ textAlign: "center" }}>✓ top-platziert</td></tr>
              <tr><td>Statistiken</td><td style={{ textAlign: "center" }}>Basis</td><td style={{ textAlign: "center" }}>Vollständig</td><td style={{ textAlign: "center" }}>Vollständig + Export</td></tr>
              <tr><td>CSV-Export</td><td style={{ textAlign: "center" }}>—</td><td style={{ textAlign: "center" }}>✓</td><td style={{ textAlign: "center" }}>✓</td></tr>
              <tr><td>TRUE-Kanal Erwähnung</td><td style={{ textAlign: "center" }}>—</td><td style={{ textAlign: "center" }}>—</td><td style={{ textAlign: "center" }}>✓</td></tr>
              <tr><td>Eigene Kampagnenseite</td><td style={{ textAlign: "center" }}>—</td><td style={{ textAlign: "center" }}>—</td><td style={{ textAlign: "center" }}>✓</td></tr>
              <tr><td>14 Tage kostenlos testen</td><td style={{ textAlign: "center" }}>✓</td><td style={{ textAlign: "center" }}>✓</td><td style={{ textAlign: "center" }}>✓</td></tr>
            </tbody>
          </table>

          <div className="bp-warning">
            <b>Wichtig:</b> Das Partnerprogramm wird erst <u>aktiv vermarktet</u>, sobald mind. 500-1.000 Nutzer
            aktiv sind. Vorher: offen halten für Early-Adopter, aber Fokus auf User-Wachstum.
          </div>
        </Section>

        {/* ── 7. FINANZPLAN ── */}
        <Section id="finanzen" title="7. Finanzplan & Break-Even">
          <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.5rem" }}>Aktuelle monatliche Kosten</h3>
          <table className="bp-table">
            <thead>
              <tr><th>Position</th><th style={{ textAlign: "right" }}>Kosten</th><th>Anmerkung</th></tr>
            </thead>
            <tbody>
              {CURRENT_COSTS.map(c => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{c.price}€</td>
                  <td style={{ fontSize: "0.8rem", color: "#666" }}>{c.note}</td>
                </tr>
              ))}
              <tr style={{ background: "#f5f9f7" }}>
                <td style={{ fontWeight: 800 }}>GESAMT / Monat</td>
                <td style={{ textAlign: "right", fontWeight: 900, color: "#2ECC8A" }}>{CURRENT_TOTAL}€</td>
                <td style={{ fontSize: "0.8rem", color: "#666" }}>= {CURRENT_TOTAL * 12}€ / Jahr</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "1.5rem 0 0.5rem" }}>Break-Even-Punkt</h3>
          <div className="bp-callout">
            Bei aktuellen Kosten von <b>{CURRENT_TOTAL}€/Monat</b> bedeutet das:
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
              <li><b>{BREAK_EVEN_STARTER} Starter-Kunde (29€)</b> deckt bereits alle Kosten</li>
              <li><b>{BREAK_EVEN_GROWTH} Wachstum-Kunde (79€)</b> = +60€ Profit pro Monat</li>
              <li><b>1 Premium-Kunde (149€)</b> = 130€ Profit pro Monat</li>
            </ul>
            Das ist extrem niedrig — der Solo-Bootstrap-Vorteil. Du brauchst keine Investoren bis 50k+ Nutzer.
          </div>
        </Section>

        {/* ── 8. 5-JAHRES-PROGNOSE ── */}
        <Section id="prognose" title="8. 5-Jahres-Prognose (Basis-Szenario)">
          <p style={{ fontSize: "0.88rem", color: "#666" }}>
            Annahme: 40% Starter, 45% Wachstum, 15% Premium der Partner. Konservativ-realistisches Szenario.
          </p>

          <table className="bp-table">
            <thead>
              <tr>
                <th></th>
                {YEARS.map(y => <th key={y.year} style={{ textAlign: "center" }}>{y.year}<br/><span style={{ fontWeight: 400, fontSize: "0.75rem" }}>{y.period}</span></th>)}
              </tr>
            </thead>
            <tbody>
              <tr><td><b>Phase</b></td>{YEARS.map(y => <td key={y.year} style={{ textAlign: "center", fontSize: "0.78rem" }}>{y.phase}</td>)}</tr>
              <tr><td>Nutzer (Ende)</td>{YEARS.map(y => <td key={y.year} style={{ textAlign: "center" }}>{y.usersEnd.toLocaleString("de-DE")}</td>)}</tr>
              <tr><td>Partner gesamt</td>{YEARS.map(y => <td key={y.year} style={{ textAlign: "center" }}>{y.partners}</td>)}</tr>
              <tr><td>— Starter (29€)</td>{YEARS.map(y => <td key={y.year} style={{ textAlign: "center" }}>{y.starter}</td>)}</tr>
              <tr><td>— Wachstum (79€)</td>{YEARS.map(y => <td key={y.year} style={{ textAlign: "center" }}>{y.growth}</td>)}</tr>
              <tr><td>— Premium (149€)</td>{YEARS.map(y => <td key={y.year} style={{ textAlign: "center" }}>{y.premium}</td>)}</tr>
              <tr style={{ background: "#f5f9f7" }}>
                <td><b>MRR (Monatlicher Umsatz)</b></td>
                {YEARS.map(y => <td key={y.year} style={{ textAlign: "center", fontWeight: 800 }}>{calcRevenue(y).toLocaleString("de-DE")}€</td>)}
              </tr>
              <tr>
                <td><b>Jahresumsatz</b></td>
                {YEARS.map(y => <td key={y.year} style={{ textAlign: "center", fontWeight: 700, color: "#2ECC8A" }}>{(calcRevenue(y) * 12).toLocaleString("de-DE")}€</td>)}
              </tr>
              <tr><td>Monatliche Kosten</td>{YEARS.map(y => <td key={y.year} style={{ textAlign: "center" }}>{y.monthlyCosts}€</td>)}</tr>
              <tr style={{ background: "#f5f9f7" }}>
                <td><b>Jahresprofit (vor Steuern)</b></td>
                {YEARS.map(y => <td key={y.year} style={{ textAlign: "center", fontWeight: 900, color: "#2ECC8A" }}>{((calcRevenue(y) - y.monthlyCosts) * 12).toLocaleString("de-DE")}€</td>)}
              </tr>
              <tr><td>Team</td>{YEARS.map(y => <td key={y.year} style={{ textAlign: "center", fontSize: "0.75rem" }}>{y.teamSize}</td>)}</tr>
            </tbody>
          </table>

          <div className="bp-grid-3" style={{ marginTop: "1.5rem" }}>
            <div className="bp-kpi">
              <div className="bp-kpi-value">{TOTAL_5Y_REVENUE.toLocaleString("de-DE")}€</div>
              <div className="bp-kpi-label">5-Jahres-Umsatz (kumuliert)</div>
            </div>
            <div className="bp-kpi">
              <div className="bp-kpi-value">{TOTAL_5Y_COSTS.toLocaleString("de-DE")}€</div>
              <div className="bp-kpi-label">5-Jahres-Kosten (kumuliert)</div>
            </div>
            <div className="bp-kpi">
              <div className="bp-kpi-value">{TOTAL_5Y_PROFIT.toLocaleString("de-DE")}€</div>
              <div className="bp-kpi-label">5-Jahres-Profit (vor Steuern)</div>
            </div>
          </div>

          <div className="bp-warning" style={{ marginTop: "1.5rem" }}>
            <b>Hinweis:</b> Diese Zahlen sind Prognosen, keine Garantien. Sie basieren auf realistischen Annahmen ohne
            virale Effekte. Bei viralem Erfolg kann sich die Kurve drastisch steiler entwickeln. Bei stagnierendem
            User-Wachstum entsprechend flacher. Die Stärke des Modells: Selbst im Negativfall ist Break-Even durch
            niedrige Fixkosten quasi garantiert.
          </div>

          <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "1.5rem 0 0.5rem" }}>Notizen zu jedem Jahr</h3>
          <ul>
            {YEARS.map(y => (
              <li key={y.year} style={{ marginBottom: "0.5rem" }}><b>{y.year} ({y.phase}):</b> {y.note}</li>
            ))}
          </ul>
        </Section>

        {/* ── 9. MARKETING ── */}
        <Section id="marketing" title="9. Marketing-Strategie">
          <p>Fokus auf <b>organisches Wachstum</b> ohne Werbebudget — bis zur User-Marke von ~5.000.</p>

          {MARKETING_CHANNELS.map(c => (
            <div key={c.name} style={{ border: "1px solid #eee", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800 }}>{c.priority}. {c.name}</h4>
                <span style={{ background: "#f5f9f7", color: "#2ECC8A", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>{c.type}</span>
              </div>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
                <div style={{ marginBottom: "0.25rem" }}><b>Kosten:</b> {c.cost}</div>
                <div style={{ marginBottom: "0.25rem" }}><b>Zielgruppe:</b> {c.target}</div>
                <div style={{ marginBottom: "0.25rem" }}><b>Format:</b> {c.content}</div>
                <div style={{ marginBottom: "0.25rem" }}><b>Plattform:</b> {c.platform}</div>
                <div style={{ color: "#666", fontStyle: "italic" }}>Erwartung: {c.expected}</div>
              </div>
            </div>
          ))}
        </Section>

        {/* ── 10. OPERATIONS ── */}
        <Section id="operations" title="10. Operations & Team-Skalierung">
          <p>Welche Aufgaben können automatisiert werden, wo brauchst du Menschen?</p>
          <table className="bp-table">
            <thead>
              <tr><th>Aufgabe</th><th>Automatisierungsgrad</th><th>Mensch nötig für…</th></tr>
            </thead>
            <tbody>
              {AUTOMATION.map(a => (
                <tr key={a.task}>
                  <td>{a.task}</td>
                  <td style={{ fontSize: "0.82rem", color: "#2ECC8A", fontWeight: 700 }}>{a.automation}</td>
                  <td style={{ fontSize: "0.82rem", color: "#666" }}>{a.needsHuman}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bp-callout" style={{ marginTop: "1rem" }}>
            <b>Erkenntnis:</b> Bis ~10.000 Nutzer komplett solo machbar. Erste Teilzeitkraft (5-10h/Woche)
            bei ~10.000-20.000 Nutzern für Produkt-Verifikation sinnvoll. Vollzeit erst ab 50.000+ Nutzern.
          </div>
        </Section>

        {/* ── 11. ROADMAP ── */}
        <Section id="roadmap" title="11. Roadmap & Meilensteine">
          {ROADMAP.map(p => (
            <div key={p.phase} style={{ border: "1px solid #eee", borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800 }}>{p.phase}</h4>
                <span style={{ background: "#f5f9f7", color: "#2ECC8A", padding: "2px 10px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700 }}>{p.when}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.88rem", lineHeight: 1.7 }}>
                {p.goals.map(g => <li key={g}>{g}</li>)}
              </ul>
            </div>
          ))}
        </Section>

        {/* ── 12. RISIKEN ── */}
        <Section id="risiken" title="12. Risiken & Gegenmaßnahmen">
          <table className="bp-table">
            <thead><tr><th>Risiko</th><th>Wahrscheinlichkeit</th><th>Gegenmaßnahme</th></tr></thead>
            <tbody>
              <tr><td>Kein User-Wachstum trotz Marketing</td><td>Mittel</td><td>Kosten extrem niedrig, kein Cashburn — Zeit für mehrere Anläufe & Iterationen.</td></tr>
              <tr><td>Marken zahlen nicht / niedrige Conversion</td><td>Mittel-Hoch</td><td>Erst Reichweite aufbauen, dann monetarisieren. Bis dahin: Free-Tier-Tester für Testimonials.</td></tr>
              <tr><td>Konkurrenz (CodeCheck, ToxFox)</td><td>Hoch</td><td>USP: Community + Alternativen-Empfehlung + ehrlicher, unwerblicher Ton.</td></tr>
              <tr><td>Rechtliche Probleme (Verleumdung)</td><td>Niedrig-Mittel</td><td>Quellen-basiert (WHO, IARC, Gerichtsurteile). Keine eigenen Behauptungen ohne Beleg.</td></tr>
              <tr><td>Technische Skalierung</td><td>Niedrig</td><td>Next.js + Supabase skalieren bis weit über 100k Nutzer. Stack ist solide.</td></tr>
              <tr><td>Burnout / Solo-Risiko</td><td>Hoch</td><td>Realistische Zeitplanung, Claude als Co-Dev, frühzeitig delegieren wenn Cashflow stabil.</td></tr>
              <tr><td>Partner fühlen sich getäuscht (Verifikation)</td><td>Mittel</td><td>Strikte, transparente Verifikation. Lieber wenige verifizierte Partner als viele oberflächlich geprüfte.</td></tr>
            </tbody>
          </table>
        </Section>

        {/* ── Footer ── */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: "1.5rem", marginTop: "3rem", fontSize: "0.78rem", color: "#999", textAlign: "center" }}>
          TRUE Business Plan · Stand {TODAY} · get-true.de<br/>
          Dieses Dokument ist intern. Nicht für Veröffentlichung ohne Rücksprache geeignet.
        </div>
      </main>
    </div>
  )
}
