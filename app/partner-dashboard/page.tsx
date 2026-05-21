"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

interface PartnerProfile {
  id: string
  company_name: string
  contact_email: string
  website: string | null
  description: string | null
  tier: string
  verified: boolean
  created_at: string
}

interface PartnerEvent {
  id: number
  product_id: number | null
  event_type: string
  created_at: string
  metadata: any
}

interface Stats {
  impressions: number
  clicks: number
  list_adds: number
}

const TIER_LABEL: Record<string, string> = { trial: "Kein Abo", basic: "Starter", growth: "Wachstum", enterprise: "Premium" }
const TIER_COLOR: Record<string, string> = { trial: "#888", basic: "#2ECC8A", growth: "#4488ff", enterprise: "#ffd700" }
const EVENT_LABEL: Record<string, string> = { impression: "Impression", click: "Klick", list_add: "Zur Liste hinzugefügt" }
const EVENT_EMOJI: Record<string, string> = { impression: "👁", click: "👆", list_add: "✅" }

const TIERS_INFO = [
  {
    id: "basic", name: "Starter", price: "29€", emoji: "🧪", color: "#2ECC8A",
    tagline: "Zum Testen", trial: "14 Tage gratis",
    features: ["1 Produkt einreichen", "Als Alternative erscheinen", "Basis-Statistiken"],
  },
  {
    id: "growth", name: "Wachstum", price: "79€", emoji: "🚀", color: "#4488ff",
    tagline: "Für aktive Marken", trial: "14 Tage gratis", popular: true,
    features: ["Bis zu 5 Produkte", "Insights-Dashboard", "Priorisierte Platzierung", "CSV-Export"],
  },
  {
    id: "enterprise", name: "Premium", price: "149€", emoji: "👑", color: "#ffd700",
    tagline: "Für etablierte Marken", trial: "14 Tage gratis",
    features: ["Unbegrenzte Produkte", "Top-Platzierung", "TRUE-Kanal Erwähnung", "Eigene Kampagnenseite"],
  },
]

function relTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Gerade eben"
  if (m < 60) return `vor ${m} Min.`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std.`
  return `vor ${Math.floor(h / 24)} Tag(en)`
}

export default function PartnerDashboardPage() {
  const router = useRouter()
  const [profile, setProfile]   = useState<PartnerProfile | null>(null)
  const [stats, setStats]       = useState<Stats>({ impressions: 0, clicks: 0, list_adds: 0 })
  const [events, setEvents]     = useState<PartnerEvent[]>([])
  const [loading, setLoading]   = useState(true)
  const [authError, setAuthError] = useState(false)
  const [showTierModal, setShowTierModal] = useState(false)
  const [selectedTier, setSelectedTier]   = useState<string | null>(null)
  const [tierSaving, setTierSaving]       = useState(false)
  // Profile edit
  const [editingProfile, setEditingProfile] = useState(false)
  const [editWebsite, setEditWebsite]       = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editContactEmail, setEditContactEmail] = useState("")
  const [profileSaving, setProfileSaving]   = useState(false)
  const [profileSaved, setProfileSaved]     = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    if (!supabase) { setAuthError(true); setLoading(false); return }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push("/partner-login")
      return
    }

    // Load profile
    const { data: profileData, error: profileErr } = await supabase
      .from("partner_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (profileErr || !profileData) {
      router.push("/partner-login")
      return
    }
    setProfile(profileData)
    setEditWebsite(profileData.website ?? "")
    setEditDescription(profileData.description ?? "")
    setEditContactEmail(profileData.contact_email ?? "")

    // Load stats
    const { data: eventsData } = await supabase
      .from("partner_events")
      .select("*")
      .eq("partner_id", profileData.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (eventsData) {
      const allEvents = eventsData as PartnerEvent[]
      setEvents(allEvents.slice(0, 10))
      setStats({
        impressions: allEvents.filter(e => e.event_type === "impression").length,
        clicks:      allEvents.filter(e => e.event_type === "click").length,
        list_adds:   allEvents.filter(e => e.event_type === "list_add").length,
      })
    }

    setLoading(false)
  }

  async function handleLogout() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push("/partner")
  }

  async function handleTierSelect(tierId: string) {
    if (!supabase || !profile) return
    setTierSaving(true)
    setSelectedTier(tierId)
    try {
      const { error } = await supabase
        .from("partner_profiles")
        .update({ tier: tierId })
        .eq("id", profile.id)
      if (error) throw error
      setProfile({ ...profile, tier: tierId })
      setShowTierModal(false)
    } catch (err: any) {
      alert("Fehler beim Speichern: " + (err?.message ?? "Unbekannt"))
    }
    setTierSaving(false)
  }

  async function saveProfile() {
    if (!supabase || !profile) return
    setProfileSaving(true)
    try {
      const { error } = await supabase
        .from("partner_profiles")
        .update({
          website: editWebsite.trim() || null,
          description: editDescription.trim() || null,
          contact_email: editContactEmail.trim() || profile.contact_email,
        })
        .eq("id", profile.id)
      if (error) throw error
      setProfile({
        ...profile,
        website: editWebsite.trim() || null,
        description: editDescription.trim() || null,
        contact_email: editContactEmail.trim() || profile.contact_email,
      })
      setEditingProfile(false)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err: any) {
      alert("Fehler beim Speichern: " + (err?.message ?? "Unbekannt"))
    }
    setProfileSaving(false)
  }

  // Auto-open tier modal for trial users + handle pre-selected tier from URL
  useEffect(() => {
    if (!profile) return
    if (profile.tier === "trial") {
      setShowTierModal(true)
      try {
        const preselect = sessionStorage.getItem("true-preselect-tier")
        if (preselect) {
          const id = preselect === "starter" ? "basic" : preselect === "wachstum" ? "growth" : preselect === "premium" ? "enterprise" : null
          if (id) setSelectedTier(id)
          sessionStorage.removeItem("true-preselect-tier")
        }
      } catch {}
    }
  }, [profile?.tier])

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#0b1a10", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,-apple-system,sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2ECC8A", marginBottom: "0.75rem" }}>TRUE</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>Laden…</div>
        </div>
      </div>
    )
  }

  if (authError || !profile) return null

  const tier = profile.tier ?? "trial"
  const tierColor = TIER_COLOR[tier] ?? "#2ECC8A"
  const convRate = stats.impressions > 0 ? ((stats.list_adds / stats.impressions) * 100).toFixed(1) : "0.0"
  const isTrial = tier === "trial"

  return (
    <div style={{ minHeight: "100dvh", background: "#0b1a10", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        .dash-nav-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .dash-card-link:hover { transform: translateY(-3px); border-color: #2ECC8A !important; }
        .dash-stat-card { transition: transform 0.15s; }
        .dash-stat-card:hover { transform: translateY(-3px); }
        .dash-logout:hover { background: rgba(255,68,85,0.15) !important; }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(11,26,16,0.95)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(46,204,138,0.12)",
        padding: "0 1.5rem", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 900, letterSpacing: "-0.04em", color: "#2ECC8A" }}>TRUE</span>
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>Partner</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", fontWeight: 600, display: "none" }}
            className="nav-company">{profile.company_name}</span>
          <button onClick={handleLogout} className="dash-logout"
            style={{ background: "rgba(255,68,85,0.08)", border: "1px solid rgba(255,68,85,0.2)", borderRadius: "10px", padding: "6px 14px", color: "#ff7788", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
            Abmelden
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.25rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontWeight: 900, fontSize: "1.5rem", letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
                {profile.company_name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <button onClick={() => setShowTierModal(true)}
                  style={{
                    background: `${tierColor}18`, border: `1px solid ${tierColor}55`,
                    color: tierColor, borderRadius: "8px", padding: "3px 12px",
                    fontSize: "0.72rem", fontWeight: 800, cursor: "pointer",
                  }}
                  title={isTrial ? "Paket wählen" : "Paket ändern"}>
                  {TIER_LABEL[tier] ?? tier} {isTrial ? "→ wählen" : "↺"}
                </button>
                {profile.verified && (
                  <span style={{ background: "rgba(46,204,138,0.12)", border: "1px solid rgba(46,204,138,0.3)", color: "#2ECC8A", borderRadius: "8px", padding: "3px 12px", fontSize: "0.72rem", fontWeight: 800 }}>
                    ✓ Verifiziert
                  </span>
                )}
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>{profile.contact_email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.85rem", marginBottom: "2rem" }}>
          {[
            { label: "Impressionen", value: stats.impressions, emoji: "👁", color: "#4488ff" },
            { label: "Klicks", value: stats.clicks, emoji: "👆", color: "#2ECC8A" },
            { label: "Liste hinzugefügt", value: stats.list_adds, emoji: "✅", color: "#ffd700" },
            { label: "Conversion Rate", value: `${convRate}%`, emoji: "📈", color: "#ff8844" },
          ].map(s => (
            <div key={s.label} className="dash-stat-card"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "1.25rem" }}>
              <div style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>{s.emoji}</div>
              <div style={{ fontWeight: 900, fontSize: "1.5rem", color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "2rem" }}>
          <Link href="/partner-dashboard/products" className="dash-card-link"
            style={{
              display: "block", textDecoration: "none",
              background: "rgba(46,204,138,0.06)", border: "1px solid rgba(46,204,138,0.15)",
              borderRadius: "16px", padding: "1.25rem",
              transition: "transform 0.15s, border-color 0.15s",
            }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📦</div>
            <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#fff", marginBottom: "0.25rem" }}>Produkte</div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Produkte verwalten und hinzufügen</div>
          </Link>
          <Link href="/partner-dashboard/analytics" className="dash-card-link"
            style={{
              display: "block", textDecoration: "none",
              background: "rgba(68,136,255,0.06)", border: "1px solid rgba(68,136,255,0.15)",
              borderRadius: "16px", padding: "1.25rem",
              transition: "transform 0.15s, border-color 0.15s",
            }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📊</div>
            <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#fff", marginBottom: "0.25rem" }}>Analytics</div>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Statistiken der letzten 30 Tage</div>
          </Link>
        </div>

        {/* Recent activity */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
          <div style={{ padding: "1.1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 style={{ fontWeight: 800, fontSize: "0.92rem", margin: 0 }}>Letzte Aktivitäten</h2>
          </div>
          {events.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
              Noch keine Aktivitäten — veröffentliche ein Produkt um Impressionen zu erhalten.
            </div>
          ) : (
            <div>
              {events.map(ev => (
                <div key={ev.id} style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <span style={{ fontSize: "1rem" }}>{EVENT_EMOJI[ev.event_type] ?? "•"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{EVENT_LABEL[ev.event_type] ?? ev.event_type}</div>
                    {ev.metadata?.productName && (
                      <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", marginTop: "0.1rem" }}>{ev.metadata.productName}</div>
                    )}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{relTime(ev.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Firmeninformationen */}
        <div style={{ marginTop: "1.5rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontWeight: 800, fontSize: "0.92rem", margin: 0 }}>Firmeninformationen</h2>
            {!editingProfile && (
              <button onClick={() => { setEditingProfile(true); setProfileSaved(false) }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9px", padding: "5px 14px", color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                Bearbeiten
              </button>
            )}
          </div>
          <div style={{ padding: "1.25rem" }}>
            {editingProfile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                <div>
                  <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: "0.35rem" }}>Kontakt-E-Mail</label>
                  <input type="email" value={editContactEmail} onChange={e => setEditContactEmail(e.target.value)}
                    placeholder={profile.contact_email}
                    style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "0.75rem 0.9rem", color: "#fff", fontSize: "0.88rem", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: "0.35rem" }}>Website</label>
                  <input type="url" value={editWebsite} onChange={e => setEditWebsite(e.target.value)}
                    placeholder="https://meinefirma.de"
                    style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "0.75rem 0.9rem", color: "#fff", fontSize: "0.88rem", outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: "0.06em", display: "block", marginBottom: "0.35rem" }}>Kurzbeschreibung</label>
                  <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
                    rows={3} placeholder="Was macht euer Unternehmen besonders..."
                    style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "0.75rem 0.9rem", color: "#fff", fontSize: "0.88rem", outline: "none", resize: "vertical" as const, fontFamily: "inherit" }} />
                </div>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button onClick={() => setEditingProfile(false)}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "0.65rem 1.1rem", color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                    Abbrechen
                  </button>
                  <button onClick={saveProfile} disabled={profileSaving}
                    style={{ background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000", border: "none", borderRadius: "10px", padding: "0.65rem 1.25rem", fontWeight: 800, fontSize: "0.82rem", cursor: profileSaving ? "not-allowed" : "pointer", opacity: profileSaving ? 0.7 : 1 }}>
                    {profileSaving ? "Speichern…" : "Speichern ✓"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {profileSaved && (
                  <div style={{ background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: "8px", padding: "0.5rem 0.9rem", fontSize: "0.78rem", color: "#2ECC8A" }}>
                    ✓ Gespeichert
                  </div>
                )}
                {[
                  { label: "Kontakt-E-Mail", value: profile.contact_email },
                  { label: "Website", value: profile.website || "—" },
                  { label: "Beschreibung", value: profile.description || "—" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, width: 120, flexShrink: 0, paddingTop: "0.1rem" }}>{row.label}</span>
                    <span style={{ fontSize: "0.82rem", color: row.value === "—" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.75)", wordBreak: "break-all" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upgrade hint for basic tier */}
        {tier === "basic" && (
          <div style={{ marginTop: "1.5rem", background: "rgba(68,136,255,0.06)", border: "1px solid rgba(68,136,255,0.2)", borderRadius: "16px", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🚀</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: "0.2rem" }}>Auf Wachstum upgraden</div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Bis zu 5 Produkte, Insights-Dashboard und priorisierte Platzierung für 79€/Monat.</div>
            </div>
            <button onClick={() => setShowTierModal(true)} style={{ background: "linear-gradient(135deg,#4488ff,#2266cc)", color: "#fff", border: "none", borderRadius: "10px", padding: "7px 16px", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>
              Upgraden →
            </button>
          </div>
        )}
      </div>

      {/* ── Tier-Auswahl Modal (für Trial-Nutzer auto-open, sonst manuell) ── */}
      {showTierModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1.25rem", overflowY: "auto",
        }}>
          <div style={{
            background: "linear-gradient(180deg, #0d1f15 0%, #0b1a10 100%)",
            border: "1px solid rgba(46,204,138,0.25)",
            borderRadius: "24px", padding: "2rem 1.5rem",
            width: "100%", maxWidth: "640px", maxHeight: "92vh", overflowY: "auto",
            position: "relative",
          }}>
            {/* Close button (only if not trial) */}
            {!isTrial && (
              <button onClick={() => setShowTierModal(false)}
                style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 32, height: 32, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.9rem" }}>
                ✕
              </button>
            )}

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.4rem" }}>
                {isTrial ? "🎉 Willkommen bei TRUE" : "Paket ändern"}
              </div>
              <h2 style={{ fontWeight: 900, fontSize: "1.4rem", margin: "0 0 0.5rem" }}>
                {isTrial ? "Wähle dein Paket" : "Anderes Paket auswählen"}
              </h2>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>
                {isTrial
                  ? "Alle Pakete starten mit 14 Tagen kostenlos. Jederzeit kündbar — kein Risiko."
                  : "Du kannst dein Paket jederzeit anpassen — die Änderung gilt ab nächstem Abrechnungszyklus."}
              </p>
            </div>

            {/* Tiers */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {TIERS_INFO.map(t => {
                const isActive  = selectedTier === t.id || (selectedTier === null && tier === t.id)
                const isCurrent = tier === t.id
                return (
                  <button key={t.id} type="button" onClick={() => setSelectedTier(t.id)}
                    disabled={isCurrent}
                    style={{
                      background: isActive ? `${t.color}10` : "rgba(255,255,255,0.02)",
                      border: `1.5px solid ${isActive ? t.color : "rgba(255,255,255,0.08)"}`,
                      borderRadius: "16px", padding: "1rem 1.1rem",
                      cursor: isCurrent ? "default" : "pointer",
                      textAlign: "left", transition: "all 0.18s",
                      opacity: isCurrent ? 0.6 : 1,
                      position: "relative",
                    }}>
                    {t.popular && !isCurrent && (
                      <span style={{ position: "absolute", top: -8, right: 14, background: t.color, color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: "0.58rem", fontWeight: 900, letterSpacing: "0.05em" }}>
                        BELIEBT
                      </span>
                    )}
                    {isCurrent && (
                      <span style={{ position: "absolute", top: -8, right: 14, background: "rgba(46,204,138,0.2)", color: "#2ECC8A", border: "1px solid rgba(46,204,138,0.5)", borderRadius: 6, padding: "2px 8px", fontSize: "0.58rem", fontWeight: 900, letterSpacing: "0.05em" }}>
                        AKTUELL
                      </span>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "0.6rem" }}>
                      <div style={{ width: 42, height: 42, borderRadius: "12px", background: `${t.color}20`, border: `1px solid ${t.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>
                        {t.emoji}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "#fff" }}>{t.name}</div>
                        <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "1px" }}>{t.tagline}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: "1.2rem", color: t.color }}>{t.price}</div>
                        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)" }}>/ Monat</div>
                      </div>
                    </div>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0", display: "flex", flexWrap: "wrap", gap: "0.3rem 0.85rem" }}>
                      {t.features.map(f => (
                        <li key={f} style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", display: "flex", gap: 4 }}>
                          <span style={{ color: t.color, fontWeight: 700 }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                )
              })}
            </div>

            {/* CTA */}
            <button
              onClick={() => selectedTier && handleTierSelect(selectedTier)}
              disabled={!selectedTier || tierSaving || selectedTier === tier}
              style={{
                width: "100%", background: selectedTier && selectedTier !== tier ? "linear-gradient(135deg,#2ECC8A,#1aaa6e)" : "rgba(255,255,255,0.06)",
                color: selectedTier && selectedTier !== tier ? "#000" : "rgba(255,255,255,0.3)",
                border: "none", borderRadius: "14px", padding: "1rem", fontWeight: 800, fontSize: "0.95rem",
                cursor: !selectedTier || tierSaving || selectedTier === tier ? "not-allowed" : "pointer",
                opacity: tierSaving ? 0.7 : 1, marginBottom: "0.6rem",
              }}>
              {tierSaving ? "Wird gespeichert…" : !selectedTier ? "Paket auswählen" : selectedTier === tier ? "Bereits aktiv" : `${TIERS_INFO.find(t => t.id === selectedTier)?.name} starten — 14 Tage gratis`}
            </button>

            {/* Skip option (only for trial — but emphasize the trial) */}
            {isTrial && (
              <p style={{ textAlign: "center", fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", margin: 0, lineHeight: 1.6 }}>
                Während der 14-tägigen Testphase fallen keine Kosten an.<br/>Du kannst jederzeit wechseln oder kündigen.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
