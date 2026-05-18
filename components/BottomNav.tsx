"use client"
import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const ITEMS = [
  { href: "/home",      icon: "🏠", label: "Home"      },
  { href: "/scan",      icon: "📷", label: "Scannen"   },
  { href: "/community", icon: "👥", label: "Community" },
  { href: "/profile",   icon: "👤", label: "Profil"    },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <>
      <div style={{ height: "calc(60px + env(safe-area-inset-bottom))" }} />
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
        background: "var(--nav-bg)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "stretch",
        // Höhe wächst mit Safe-Area damit Labels über dem Home-Indikator bleiben
        height: "calc(60px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {ITEMS.map(item => {
          const active = path === item.href || path?.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "3px",
              textDecoration: "none",
              color: active ? "var(--accent)" : "var(--text-dim)",
              transition: "color 0.15s",
              position: "relative",
            }}>
              {active && (
                <span style={{
                  position: "absolute", top: 0, left: "25%", right: "25%",
                  height: "2px", background: "var(--accent)",
                  borderRadius: "0 0 2px 2px",
                }} />
              )}
              <span style={{
                width: 36, height: 36, borderRadius: 12,
                background: active ? "var(--accent)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.1rem",
                boxShadow: active ? "0 0 12px rgba(46,204,138,0.3)" : "none",
                transition: "all 0.15s",
                filter: active ? "none" : "grayscale(0.2)",
              }}>{item.icon}</span>
              <span style={{ fontSize: "0.57rem", fontWeight: active ? 700 : 400, letterSpacing: "0.02em" }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
