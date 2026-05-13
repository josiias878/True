"use client"
import React, { useEffect, useRef, useState } from "react"

// Loaded dynamically so Leaflet never runs on the server
interface Incident {
  lat: number
  lng: number
  color: string
  label: string
  corp: string
}

const INCIDENTS: Incident[] = [
  { lat:  1.0, lng: 114.0, color: "#ff4455", label: "Borneo: Palmöl-Abholzung",      corp: "Nestlé / Unilever"     },
  { lat: 16.0, lng: 108.0, color: "#ff7700", label: "Vietnam: Kaffeeplantagen",       corp: "Nestlé"                },
  { lat:  5.5, lng:   6.5, color: "#ff4455", label: "Niger-Delta: Ölpest",            corp: "Shell"                 },
  { lat:  6.5, lng:  -3.0, color: "#ffcc00", label: "Westafrika: Kakao-Kinderarbeit", corp: "Mondelez / Ferrero"    },
  { lat: 37.0, lng:-120.0, color: "#44aaff", label: "Kalifornien: Wasserrechte",      corp: "Nestlé Waters"         },
  { lat: 19.0, lng: -99.0, color: "#cc66ff", label: "Mexiko: Grundwasser-Krise",      corp: "Coca-Cola"             },
  { lat: -3.0, lng: -60.0, color: "#ff7700", label: "Amazonas: Regenwald",            corp: "Bayer / Monsanto"      },
  { lat: 51.0, lng:  10.0, color: "#2ECC8A", label: "EU: PFAS-Kontamination",         corp: "P&G / 3M"              },
  { lat: 30.0, lng:  70.0, color: "#ffcc00", label: "Pakistan: Pestizid-Einsatz",     corp: "Syngenta / Bayer"      },
  { lat:-23.5, lng: -46.5, color: "#ff7700", label: "São Paulo: Grundwasser",         corp: "Ambev / PepsiCo"       },
]

export default function TrueWorldMap() {
  const mapRef   = useRef<HTMLDivElement>(null)
  const leafRef  = useRef<unknown>(null)
  const [active, setActive] = useState<Incident | null>(null)
  const [error,  setError]  = useState(false)

  useEffect(() => {
    if (!mapRef.current || leafRef.current) return
    let map: unknown
    import("leaflet").then(L => {
      // Fix default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      if (!mapRef.current) return
      map = L.map(mapRef.current, {
        center:          [20, 10],
        zoom:            2,
        zoomControl:     true,
        scrollWheelZoom: false,
        attributionControl: false,
      })

      // Dark styled tiles via CartoDB
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 10, subdomains: "abcd" }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).addTo(map as any)

      // Pulsing circle markers
      INCIDENTS.forEach(inc => {
        const circle = L.circleMarker([inc.lat, inc.lng], {
          radius:      9,
          color:       inc.color,
          fillColor:   inc.color,
          fillOpacity: 0.85,
          weight:      2,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).addTo(map as any)

        circle.on("click", () => setActive(inc))
        circle.on("mouseover", function(this: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(this as any).setStyle({ radius: 13, fillOpacity: 1 })
        })
        circle.on("mouseout", function(this: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(this as any).setStyle({ radius: 9, fillOpacity: 0.85 })
        })
      })

      leafRef.current = map
    }).catch(() => setError(true))

    return () => {
      if (leafRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(leafRef.current as any).remove()
        leafRef.current = null
      }
    }
  }, [])

  if (error) return null

  return (
    <div style={{ borderRadius: "18px", overflow: "hidden", border: "1px solid var(--border)", marginBottom: "1.5rem", position: "relative" }}>
      {/* Header bar */}
      <div style={{ background: "var(--surface)", padding: "0.7rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontWeight: 800, fontSize: "0.88rem" }}>🌍 Welt-Übersicht</span>
          <span style={{ background: "#ff455520", color: "#ff4455", borderRadius: "4px", padding: "0.08rem 0.4rem", fontSize: "0.6rem", fontWeight: 700 }}>{INCIDENTS.length} Vorfälle</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#2ECC8A", display: "inline-block", animation: "pulseDot 1.8s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.62rem", color: "#2ECC8A", fontWeight: 600 }}>Live</span>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ height: "240px", background: "#0d1117" }} />

      {/* Tooltip overlay */}
      {active && (
        <div style={{ position: "absolute", bottom: "48px", left: "0.75rem", right: "0.75rem", background: "rgba(8,8,20,0.92)", backdropFilter: "blur(12px)", borderRadius: "12px", padding: "0.7rem 0.9rem", border: `1px solid ${active.color}55`, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1000 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: active.color }}>{active.label}</div>
            <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)", marginTop: "0.15rem" }}>{active.corp}</div>
          </div>
          <button onClick={() => setActive(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Legend */}
      <div style={{ background: "var(--surface)", padding: "0.55rem 0.85rem", display: "flex", gap: "1rem", overflowX: "auto", borderTop: "1px solid var(--border)" }}>
        {[
          { color: "#ff4455", label: "Umwelt / Wald" },
          { color: "#ffcc00", label: "Kinderarbeit"  },
          { color: "#44aaff", label: "Wasser"        },
          { color: "#2ECC8A", label: "Chemikalien"   },
          { color: "#ff7700", label: "Landwirtschaft"},
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: l.color, flexShrink: 0 }} />
            <span style={{ fontSize: "0.6rem", color: "var(--text-dim)", whiteSpace: "nowrap" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Leaflet CSS */}
      <style>{`
        @import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .leaflet-container { background:#0d1117 !important; }
        .leaflet-control-zoom { border:1px solid var(--border) !important; }
        .leaflet-control-zoom a { background:var(--surface) !important; color:var(--text) !important; border-color:var(--border) !important; }
      `}</style>
    </div>
  )
}
