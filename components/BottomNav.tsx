"use client"
import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const ITEMS = [
  {
    href: "/home",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9" stroke={active ? "var(--background)" : "currentColor"} strokeWidth="2" fill="none"/>
      </svg>
    ),
  },
  {
    href: "/scan",
    label: "Scannen",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" fill={active ? "currentColor" : "none"}/>
        <rect x="14" y="3" width="7" height="7" rx="1.5" fill={active ? "currentColor" : "none"}/>
        <rect x="3" y="14" width="7" height="7" rx="1.5" fill={active ? "currentColor" : "none"}/>
        <path d="M14 14h2v2h-2zM18 14h3M14 18v3M18 18h3v3h-3z" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
  },
  {
    href: "/community",
    label: "Community",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profil",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <>
      <div style={{ height: "calc(64px + env(safe-area-inset-bottom))" }} />
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
        background: "var(--nav-bg)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "stretch",
        height: "calc(64px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {ITEMS.map(item => {
          const active = path === item.href || path?.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 4,
              textDecoration: "none",
              color: active ? "var(--accent)" : "var(--text-dim)",
              transition: "color 0.18s",
              WebkitTapHighlightColor: "transparent",
              userSelect: "none",
            }}>
              {/* Icon in Pille wenn aktiv */}
              <div style={{
                width: 44, height: 28, borderRadius: 14,
                background: active ? "rgba(46,204,138,0.15)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.18s",
              }}>
                {item.icon(active)}
              </div>
              <span style={{
                fontSize: "0.6rem",
                fontWeight: active ? 700 : 400,
                letterSpacing: "0.01em",
                transition: "all 0.18s",
              }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
