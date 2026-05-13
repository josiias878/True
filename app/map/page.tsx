"use client"
import React from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import AuthGuard from "@/components/AuthGuard"
import { ThemeToggle } from "@/components/ThemeProvider"
import BottomNav from "@/components/BottomNav"

const WorldMap = dynamic(() => import("@/components/WorldMap"), { ssr: false })

export default function MapPage() {
  return (
    <AuthGuard>
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* NAV */}
      <nav style={{ borderBottom: "1px solid var(--border)", background: "var(--nav-bg)", backdropFilter: "blur(20px)", padding: "0 1.25rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/home" style={{ fontSize: "1.35rem", fontWeight: 900, letterSpacing: "-0.06em", color: "var(--accent)", textDecoration: "none" }}>TRUE</Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-dim)", fontWeight: 600 }}>🌍 Weltkarte</span>
          <ThemeToggle />
        </div>
      </nav>

      <div style={{ padding: "1.25rem 1rem", maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 900, letterSpacing: "-0.025em", marginBottom: "0.25rem" }}>🌍 Umwelt-Weltkarte</h1>
          <p style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
            14 dokumentierte Schadensfälle — tippe auf einen Marker für Details. Farben zeigen den Typ.
          </p>
        </div>

        <WorldMap height="calc(100vh - 200px)" />

        {/* Legend */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
          {[
            { color: "#ff6633", icon: "🌳", label: "Abholzung" },
            { color: "#44aaff", icon: "💧", label: "Wasserrechte" },
            { color: "#cc66ff", icon: "☠️", label: "Chemikalien" },
            { color: "#ffcc00", icon: "🐟", label: "Plastik/Meer" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "var(--surface)", border: `1px solid ${l.color}22`, borderRadius: "8px", padding: "0.35rem 0.7rem" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600 }}>{l.icon} {l.label}</span>
            </div>
          ))}
        </div>

        <p style={{ marginTop: "1rem", fontSize: "0.7rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
          Alle Vorfälle basieren auf veröffentlichten Studien, NGO-Berichten und Gerichtsurteilen. Quellen: WWF, UNEP, EFSA, IUCN, TU Berlin, US Federal Court u.a.
        </p>
      </div>

      <BottomNav />
    </div>
    </AuthGuard>
  )
}
