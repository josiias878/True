"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

const NAV = [
  { href: "/partner-dashboard",           icon: "⊞",  label: "Übersicht",      exact: true },
  { href: "/partner-dashboard/products",  icon: "📦", label: "Produkte" },
  { href: "/partner-dashboard/analytics", icon: "📊", label: "Analytics" },
  { href: "/partner-dashboard/pakete",    icon: "✨", label: "Pakete" },
  { href: "/partner-dashboard/settings",  icon: "⚙️", label: "Einstellungen" },
]

const TIER_COLOR: Record<string,string> = { trial:"#666", basic:"#2ECC8A", growth:"#4488ff", enterprise:"#ffd700" }
const TIER_LABEL: Record<string,string> = { trial:"Free", basic:"Starter", growth:"Wachstum", enterprise:"Premium" }

export default function Sidebar() {
  const pathname   = usePathname()
  const router     = useRouter()
  const [company, setCompany] = useState("")
  const [tier, setTier]       = useState("trial")
  const [open, setOpen]       = useState(false)   // mobile drawer

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase!.from("partner_profiles")
        .select("company_name,tier").eq("user_id", session.user.id).single()
        .then(({ data }) => { if (data) { setCompany(data.company_name); setTier(data.tier) } })
    })
  }, [])

  // Close mobile drawer on navigation
  useEffect(() => { setOpen(false) }, [pathname])

  async function logout() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push("/partner")
  }

  const tc = TIER_COLOR[tier] ?? "#666"

  function isActive(item: typeof NAV[0]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href)
  }

  const sidebarContent = (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: "#060f09",
      borderRight: "1px solid rgba(46,204,138,0.1)",
    }}>
      {/* Logo */}
      <div style={{ padding: "1.4rem 1.25rem 1.1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", letterSpacing: "-0.04em", color: "#2ECC8A" }}>TRUE</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", fontWeight: 600, marginTop: "1px", letterSpacing: "0.04em" }}>PARTNER</div>
          </div>
          {/* Mobile close */}
          <button onClick={() => setOpen(false)} className="sidebar-mobile-close"
            style={{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:"1.1rem", display:"none" }}>
            ✕
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0.6rem 0.6rem", overflowY: "auto" }}>
        {NAV.map(item => {
          const active = isActive(item)
          return (
            <Link key={item.href} href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: "0.65rem",
                padding: "0.6rem 0.85rem", borderRadius: "10px",
                background: active ? "rgba(46,204,138,0.12)" : "transparent",
                color: active ? "#2ECC8A" : "rgba(255,255,255,0.45)",
                textDecoration: "none",
                fontSize: "0.84rem", fontWeight: active ? 700 : 400,
                marginBottom: "2px",
                border: active ? "1px solid rgba(46,204,138,0.2)" : "1px solid transparent",
                transition: "background 0.12s, color 0.12s",
                position: "relative",
              }}
              className="sidebar-nav-item"
            >
              <span style={{ fontSize: "0.95rem", flexShrink: 0, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
              <span>{item.label}</span>
              {active && <span style={{ position:"absolute", right: 10, width: 5, height: 5, borderRadius: "50%", background: "#2ECC8A" }} />}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: "0.85rem 1rem 1.1rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "4px" }}>
            {company || "—"}
          </div>
          <span style={{ fontSize: "0.6rem", fontWeight: 800, borderRadius: "5px", padding: "2px 8px", background: `${tc}18`, color: tc, border: `1px solid ${tc}35` }}>
            {TIER_LABEL[tier] ?? tier}
          </span>
        </div>
        <button onClick={logout} style={{
          width: "100%", background: "rgba(255,68,85,0.07)",
          border: "1px solid rgba(255,68,85,0.15)", borderRadius: "9px",
          padding: "6px", color: "rgba(255,110,120,0.8)",
          fontWeight: 700, fontSize: "0.72rem", cursor: "pointer",
          fontFamily: "inherit", transition: "background 0.12s",
        }}
          className="sidebar-logout">
          Abmelden
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .sidebar-nav-item:hover { background: rgba(255,255,255,0.04) !important; color: rgba(255,255,255,0.75) !important; }
        .sidebar-logout:hover { background: rgba(255,68,85,0.14) !important; }
        /* Desktop sidebar */
        .sidebar-desktop { width: 220px; height: 100dvh; position: sticky; top: 0; flex-shrink: 0; }
        /* Mobile top bar */
        .sidebar-topbar { display: none; position: sticky; top: 0; z-index: 200; background: rgba(6,15,9,0.97); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(46,204,138,0.1); padding: 0 1rem; height: 52px; align-items: center; justify-content: space-between; }
        /* Mobile drawer overlay */
        .sidebar-overlay { display: none; position: fixed; inset: 0; z-index: 300; }
        .sidebar-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
        .sidebar-drawer { position: absolute; left: 0; top: 0; bottom: 0; width: 240px; }
        .sidebar-mobile-close { display: none !important; }
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-topbar { display: flex !important; }
          .sidebar-mobile-close { display: block !important; }
        }
        @media (min-width: 768px) {
          .sidebar-topbar { display: none !important; }
        }
      `}</style>

      {/* Desktop */}
      <aside className="sidebar-desktop">{sidebarContent}</aside>

      {/* Mobile top bar */}
      <div className="sidebar-topbar">
        <div style={{ fontWeight: 900, fontSize: "1rem", letterSpacing: "-0.04em", color: "#2ECC8A" }}>TRUE</div>
        <button onClick={() => setOpen(true)}
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "5px 11px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 700 }}>
          ☰ Menü
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sidebar-overlay" style={{ display: "block" }}>
          <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
          <div className="sidebar-drawer">{sidebarContent}</div>
        </div>
      )}
    </>
  )
}
