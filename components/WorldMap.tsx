"use client"
import React, { useEffect, useRef, useState } from "react"

interface Incident {
  id: number
  lat: number; lng: number
  label: string
  type: "deforestation" | "water" | "chemical" | "plastic"
  corp: string
  detail: string
  severity: "critical" | "high" | "medium"
  year: string
}

export const INCIDENTS: Incident[] = [
  // ── Abholzung ─────────────────────────────────────────────────────────────
  { id: 1,  lat: -4,   lng: -55,   label: "Amazonas, Brasilien",           type: "deforestation", corp: "Nestlé / JBS",                 detail: "500.000 ha Regenwald jährlich für Viehzucht & Palmöl vernichtet — WWF 2023",                     severity: "critical", year: "2023" },
  { id: 2,  lat: 0,    lng: 114,   label: "Borneo, Indonesien",            type: "deforestation", corp: "Unilever / Nestlé",             detail: "Größtes Palmöl-Anbaugebiet der Welt — 80 % der Orang-Utans seit 2000 verloren — IUCN 2022",     severity: "critical", year: "2022" },
  { id: 7,  lat: -5,   lng: 22,    label: "Kongobecken, DRC",              type: "deforestation", corp: "EU-Holzimporte",                detail: "Zweitgrößter Regenwald — Abholzungsrate +14 %/Jahr — GFW 2023",                                  severity: "high",     year: "2023" },
  { id: 8,  lat: -14,  lng: -47,   label: "Cerrado, Brasilien",            type: "deforestation", corp: "Cargill / ADM / Bunge",         detail: "90 % der Soja-Savanne vernichtet — 5 % aller Tierarten weltweit — WWF 2022",                    severity: "critical", year: "2022" },
  { id: 14, lat: 23,   lng: 90,    label: "Sundarbans, Bangladesch",       type: "deforestation", corp: "Garnelenindustrie",             detail: "50 % der Mangrovenwälder seit 1980 weg — Schutz für 400 Mio. Menschen — IUCN 2023",             severity: "high",     year: "2023" },
  { id: 15, lat: -2,   lng: 13,    label: "Gabun, Westafrika",             type: "deforestation", corp: "Olam / Wilmar",                 detail: "Palmöl-Konzessionen in geschützten Pufferzonen — Global Witness 2023",                          severity: "high",     year: "2023" },
  { id: 16, lat: 18,   lng: 102,   label: "Mekong-Region, Laos/Thailand",  type: "deforestation", corp: "Holzkonzerne SEA",              detail: "Illegale Abholzung für Gummi- & Zuckerrohrplantagen — UNODC 2023",                              severity: "high",     year: "2023" },
  // ── Wasser ────────────────────────────────────────────────────────────────
  { id: 3,  lat: 10,   lng: 107,   label: "Mekong-Delta, Vietnam",         type: "water",         corp: "Coca-Cola",                    detail: "Grundwasserabpumpen → Salzwassereinbrüche, Ernten zerstört — TU Berlin 2023",                   severity: "high",     year: "2023" },
  { id: 5,  lat: 45,   lng: 60,    label: "Aralsee, Zentralasien",         type: "water",         corp: "Textilkonzerne",               detail: "Baumwollanbau hat den Aralsee zu 90 % ausgetrocknet — UNEP 2021",                               severity: "critical", year: "2021" },
  { id: 9,  lat: 36,   lng: 116,   label: "Yellow River, China",           type: "water",         corp: "Industriebetriebe",            detail: "80 % des Flusswassers für Menschen untrinkbar — WHO 2022",                                      severity: "high",     year: "2022" },
  { id: 17, lat: 19,   lng: -99,   label: "Mexiko-Stadt, Mexiko",          type: "water",         corp: "Coca-Cola / Nestlé",           detail: "Grundwasserspiegel sinkt 50 cm/Jahr — Konzerne pumpen 1 Mrd. L tägl. — Bloomberg 2023",         severity: "critical", year: "2023" },
  { id: 18, lat: 16,   lng: 74,    label: "Maharashtra, Indien",           type: "water",         corp: "PepsiCo / Coca-Cola",          detail: "Zuckerrohr entzieht 250 Mrd. Liter Grundwasser/Jahr — Centre for Science 2022",                severity: "high",     year: "2022" },
  { id: 19, lat: -33,  lng: 18,    label: "Kapregion, Südafrika",          type: "water",         corp: "Agrarunternehmen",             detail: "Day-Zero-Krise: Groundwater-Übernutzung für Wein-Export — Lancet 2023",                         severity: "high",     year: "2023" },
  // ── Chemikalien ───────────────────────────────────────────────────────────
  { id: 4,  lat: 26,   lng: 81,    label: "Ganges-Ebene, Indien",          type: "chemical",      corp: "Bayer / Monsanto",             detail: "Glyphosat kontaminiert Trinkwasser von 200 Mio. Menschen — Lancet 2022",                        severity: "critical", year: "2022" },
  { id: 6,  lat: 29,   lng: -90,   label: "Golf von Mexiko, USA",          type: "chemical",      corp: "BP / Shell",                   detail: "Deepwater Horizon: 500.000 t Öl — noch heute toxische Sedimente — NOAA 2023",                   severity: "critical", year: "2010" },
  { id: 10, lat: 4.5,  lng: 6.5,   label: "Niger-Delta, Nigeria",          type: "chemical",      corp: "Shell",                        detail: "50 Jahre Ölverschmutzung — 70-Jahres-Erholung nötig — UN Environment 2022",                     severity: "critical", year: "2022" },
  { id: 11, lat: 45,   lng: 29,    label: "Donau, Rumänien/Bulgarien",     type: "chemical",      corp: "Chemiewerke EU",               detail: "PFAS in 70 % der Messstellen über EU-Grenzwert — EFSA 2023",                                    severity: "high",     year: "2023" },
  { id: 12, lat: -34,  lng: -64,   label: "Pampa, Argentinien",            type: "chemical",      corp: "Monsanto / Bayer",             detail: "Soja-Monokultur: +400 % Glyphosat-Einsatz in 10 Jahren — SENASA 2022",                         severity: "high",     year: "2022" },
  { id: 20, lat: 51,   lng: 6,     label: "Rhein-Ruhr, Deutschland",       type: "chemical",      corp: "BASF / Bayer",                 detail: "PFAS im Rhein 40× über EU-Grenzwert — BUND 2023",                                               severity: "high",     year: "2023" },
  { id: 21, lat: 37,   lng: -122,  label: "San Francisco Bay, USA",        type: "chemical",      corp: "3M / DuPont",                  detail: "PFAS-Kontamination von 43 Mio. US-Amerikanern — EPA 2023",                                      severity: "critical", year: "2023" },
  { id: 22, lat: -20,  lng: -40,   label: "Rio Doce, Brasilien",           type: "chemical",      corp: "BHP / Vale",                   detail: "Samarco-Dambruch: 40 Mio. m³ Giftschlamm — größte Umweltkatastrophe Brasiliens",               severity: "critical", year: "2015" },
  // ── Plastik ───────────────────────────────────────────────────────────────
  { id: 13, lat: 35,   lng: -140,  label: "Great Pacific Garbage Patch",   type: "plastic",       corp: "Coca-Cola / Nestlé / P&G",     detail: "1,8 Bio. Plastikteile — 3× Größe Frankreichs — BFFP Audit 2023",                              severity: "critical", year: "2023" },
  { id: 23, lat: 10,   lng: 85,    label: "Indischer Ozean",               type: "plastic",       corp: "PepsiCo / Unilever",           detail: "8 Mio. t Plastik/Jahr — Mikroplastik in 100 % geprüfter Meeresfrüchte — UNEP 2023",           severity: "high",     year: "2023" },
  { id: 24, lat: -15,  lng: 170,   label: "Pazifik-Inseln, Mikronesien",   type: "plastic",       corp: "Konsumgüterkonzerne",          detail: "50 % der Korallenriffe seit 1950 verschwunden — IPBES 2023",                                    severity: "high",     year: "2023" },
]

export const TYPE_STYLE = {
  deforestation: { color: "#ff6633", icon: "🌳", label: "Abholzung",  count: 7 },
  water:         { color: "#44aaff", icon: "💧", label: "Wasser",     count: 6 },
  chemical:      { color: "#cc66ff", icon: "☠️", label: "Chemie",     count: 8 },
  plastic:       { color: "#ffcc00", icon: "🐟", label: "Plastik",    count: 3 },
}

interface Props {
  height?: string
  compact?: boolean
}

export default function WorldMap({ height = "420px", compact = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const groupRef     = useRef<any>(null)
  const Lref         = useRef<any>(null)
  const [filter, setFilter] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activePopup, setActivePopup] = useState<Incident | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || !containerRef.current || mapRef.current) return
    let cancelled = false

    import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      Lref.current = L
      delete (L.Icon.Default.prototype as any)._getIconUrl

      const map = L.map(containerRef.current, {
        center: [20, 10],
        zoom: compact ? 1 : 2,
        zoomControl: false,
        scrollWheelZoom: !compact,
        dragging: !compact,
        attributionControl: false,
        minZoom: 1,
        maxZoom: 8,
      })

      // Colorful Voyager tile — shows real world geography with country borders & labels
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map)

      // Add zoom control bottom-right (not top-left)
      if (!compact) {
        L.control.zoom({ position: "bottomright" }).addTo(map)
      }

      groupRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      setTimeout(() => { if (!cancelled) map.invalidateSize() }, 150)
      setLoading(false)
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      groupRef.current = null
      Lref.current = null
    }
  }, [mounted, compact])

  useEffect(() => {
    const L = Lref.current
    const group = groupRef.current
    if (!L || !group) return
    group.clearLayers()

    const visible = filter ? INCIDENTS.filter(i => i.type === filter) : INCIDENTS
    visible.forEach(inc => {
      const t = TYPE_STYLE[inc.type]
      const isCritical = inc.severity === "critical"
      const radius = isCritical ? 9 : 7

      // Custom pulsing circle marker using divIcon
      const pulseHtml = `
        <div style="
          position:relative;
          width:${radius*2}px;height:${radius*2}px;
        ">
          <div style="
            position:absolute;inset:0;border-radius:50%;
            background:${t.color};opacity:0.18;
            animation:mapPulse ${isCritical ? '1.8s' : '2.4s'} ease-out infinite;
            transform-origin:center;
          "></div>
          <div style="
            position:absolute;inset:${isCritical ? 3 : 4}px;border-radius:50%;
            background:${t.color};opacity:0.95;
            border:2.5px solid rgba(0,0,0,0.55);
            box-shadow:0 2px ${isCritical ? 14 : 8}px rgba(0,0,0,0.5),0 0 ${isCritical ? 10 : 6}px ${t.color}cc;
          "></div>
        </div>
      `

      const icon = L.divIcon({
        html: pulseHtml,
        className: "",
        iconSize: [radius * 2, radius * 2],
        iconAnchor: [radius, radius],
      })

      const marker = L.marker([inc.lat, inc.lng], { icon })
      marker.on("click", () => setActivePopup(inc))
      marker.addTo(group)
    })
  }, [filter, loading])

  const visible = filter ? INCIDENTS.filter(i => i.type === filter) : INCIDENTS

  if (!mounted) {
    return (
      <div style={{ height, borderRadius: "16px", background: "#060d1a", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.25)", fontSize: "0.85rem" }}>
        🌍 Karte wird geladen…
      </div>
    )
  }

  const SEV_COLOR: Record<string, string> = { critical: "#ff2233", high: "#ff7700", medium: "#ffcc00" }
  const SEV_LABEL: Record<string, string> = { critical: "KRITISCH", high: "HOCH", medium: "MITTEL" }

  return (
    <div style={{ borderRadius: compact ? "14px" : "20px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}>

      {/* ── Top stats bar ── */}
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 8px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 12 }}>
            {Object.entries(TYPE_STYLE).map(([key, t]) => {
              const cnt = INCIDENTS.filter(i => i.type === key).length
              const active = filter === key
              return (
                <button key={key} onClick={() => setFilter(active ? null : key)} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: active ? t.color + "20" : "var(--surface-2)",
                  border: `1px solid ${active ? t.color + "88" : "var(--border)"}`,
                  borderRadius: 999, padding: "4px 10px",
                  cursor: "pointer", transition: "all 0.18s",
                }}>
                  <span style={{ fontSize: "0.75rem" }}>{t.icon}</span>
                  <span style={{ fontSize: "0.68rem", fontWeight: active ? 800 : 500, color: active ? t.color : "var(--text-dim)" }}>{t.label}</span>
                  <span style={{ fontSize: "0.58rem", color: active ? t.color : "var(--text-dim)", fontWeight: 700 }}>{cnt}</span>
                </button>
              )
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {filter && (
              <button onClick={() => setFilter(null)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.72rem" }}>
                Alle ✕
              </button>
            )}
            <span style={{ fontSize: "0.65rem", color: "#ff4455", fontWeight: 700, background: "rgba(255,68,85,0.1)", border: "1px solid rgba(255,68,85,0.2)", borderRadius: 999, padding: "3px 9px" }}>
              ⚠ {visible.length} Vorfälle
            </span>
          </div>
        </div>
      )}

      {/* ── Map container ── */}
      <div style={{ position: "relative" }}>
        <div ref={containerRef} style={{ height, width: "100%" }} />

        {/* Compact filter pills overlay (for compact/home mode) */}
        {compact && (
          <div style={{ position: "absolute", top: 10, left: 10, zIndex: 1000, display: "flex", gap: 5 }}>
            {Object.entries(TYPE_STYLE).map(([key, t]) => (
              <button key={key} onClick={() => setFilter(filter === key ? null : key)} style={{
                background: filter === key ? t.color + "33" : "rgba(6,13,26,0.85)",
                border: `1px solid ${filter === key ? t.color : "rgba(255,255,255,0.15)"}`,
                borderRadius: 999, padding: "3px 8px",
                cursor: "pointer", fontSize: "0.62rem", fontWeight: 700,
                color: filter === key ? t.color : "rgba(255,255,255,0.55)",
                backdropFilter: "blur(8px)",
              }}>
                {t.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Active Popup (custom, outside map) ── */}
      {activePopup && (() => {
        const t = TYPE_STYLE[activePopup.type]
        // Extract source from detail string (after "— Source" pattern)
        const detailParts = activePopup.detail.split(" — ")
        const mainText = detailParts[0]
        const source = detailParts.slice(1).join(" — ")
        const googleQuery = encodeURIComponent(`${activePopup.corp} ${activePopup.label} ${activePopup.year} ${t.label}`)
        return (
          <div style={{ background: "var(--surface)", borderTop: `3px solid ${t.color}`, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{t.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text)" }}>📍 {activePopup.label}</span>
                  <span style={{ background: SEV_COLOR[activePopup.severity] + "22", color: SEV_COLOR[activePopup.severity], border: `1px solid ${SEV_COLOR[activePopup.severity]}44`, borderRadius: 4, padding: "1px 6px", fontSize: "0.6rem", fontWeight: 800 }}>
                    {SEV_LABEL[activePopup.severity]}
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "var(--text-dim)", background: "var(--surface-2)", borderRadius: 4, padding: "1px 5px" }}>{activePopup.year}</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: t.color, fontWeight: 700, marginBottom: 5 }}>
                  🏭 {activePopup.corp}
                </div>
                {/* Full detail text */}
                <div style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.6, marginBottom: 8 }}>
                  {mainText}
                </div>
                {/* Source citation */}
                {source && (
                  <div style={{ background: "rgba(46,204,138,0.06)", border: "1px solid rgba(46,204,138,0.18)", borderRadius: 8, padding: "6px 10px", fontSize: "0.72rem", color: "var(--accent)", marginBottom: 8 }}>
                    📚 Quelle: {source}
                  </div>
                )}
                {/* Action buttons */}
                <div style={{ display: "flex", gap: 6 }}>
                  <a
                    href={`https://www.google.de/search?q=${googleQuery}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: "0.75rem", color: "var(--text)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                  >
                    🔍 Mehr lesen
                  </a>
                  <button
                    onClick={() => { if (navigator.share) navigator.share({ title: activePopup.label, text: mainText + (source ? `\n\nQuelle: ${source}` : ""), url: "https://true-app.de" }) }}
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: "0.75rem", color: "var(--text-dim)", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    Teilen
                  </button>
                  <button onClick={() => setActivePopup(null)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Styling ── */}
      <style>{`
        .leaflet-container { background: #e8e4dc !important; }
        .leaflet-control-zoom a { background: var(--surface) !important; color: var(--text) !important; border-color: var(--border) !important; font-weight: 700 !important; }
        .leaflet-control-zoom a:hover { background: var(--accent) !important; color: #000 !important; }
        .leaflet-control-zoom { border-radius: 10px !important; overflow: hidden; border: 1px solid var(--border) !important; box-shadow: 0 2px 10px rgba(0,0,0,0.15) !important; }
        @keyframes mapPulse { 0%{transform:scale(1);opacity:0.25} 60%{transform:scale(3);opacity:0} 100%{transform:scale(3);opacity:0} }
      `}</style>
    </div>
  )
}
