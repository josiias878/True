"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

interface Profile {
  id: string; company_name: string; contact_email: string
  website: string | null; description: string | null; tier: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  // Edit states
  const [companyName, setCompanyName]     = useState("")
  const [contactEmail, setContactEmail]   = useState("")
  const [website, setWebsite]             = useState("")
  const [description, setDescription]     = useState("")
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [error, setError]                 = useState("")

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/partner-login"); return }
      const { data } = await supabase
        .from("partner_profiles").select("*")
        .eq("user_id", session.user.id).single()
      if (data) {
        setProfile(data)
        setCompanyName(data.company_name ?? "")
        setContactEmail(data.contact_email ?? "")
        setWebsite(data.website ?? "")
        setDescription(data.description ?? "")
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    if (!supabase || !profile) return
    if (!companyName.trim()) { setError("Firmenname darf nicht leer sein."); return }
    setSaving(true); setError(""); setSaved(false)
    try {
      const { error: err } = await supabase.from("partner_profiles").update({
        company_name:  companyName.trim(),
        contact_email: contactEmail.trim() || profile.contact_email,
        website:       website.trim() || null,
        description:   description.trim() || null,
      }).eq("id", profile.id)
      if (err) throw err
      setProfile({ ...profile, company_name: companyName.trim(), contact_email: contactEmail.trim(), website: website.trim() || null, description: description.trim() || null })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) { setError(e?.message ?? "Fehler beim Speichern.") }
    setSaving(false)
  }

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12, padding: ".8rem 1rem", color: "#fff",
    fontSize: ".9rem", outline: "none", fontFamily: "inherit",
  }
  const lbl: React.CSSProperties = {
    fontSize: ".7rem", fontWeight: 700, color: "rgba(255,255,255,0.38)",
    textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".35rem",
  }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"50vh", color:"rgba(255,255,255,.3)", fontSize:".85rem" }}>
      Laden…
    </div>
  )

  return (
    <div style={{ color:"#fff", fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <style>{`input:focus,textarea:focus{border-color:#2ECC8A!important;} input::placeholder,textarea::placeholder{color:rgba(255,255,255,.2);}`}</style>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"2rem 1.5rem" }}>

        <h1 style={{ fontWeight:900, fontSize:"1.3rem", letterSpacing:"-.02em", marginBottom:".3rem" }}>Einstellungen</h1>
        <p style={{ fontSize:".78rem", color:"rgba(255,255,255,.35)", marginBottom:"2rem" }}>Firmeninformationen & Account</p>

        {/* Profile section */}
        <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, overflow:"hidden", marginBottom:"1.5rem" }}>
          <div style={{ padding:"1.1rem 1.25rem", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
            <h2 style={{ fontWeight:800, fontSize:".9rem", margin:0 }}>Firmenprofil</h2>
          </div>
          <div style={{ padding:"1.5rem 1.25rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
            <div>
              <label style={lbl}>Firmenname *</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Meine GmbH" style={inp} />
            </div>
            <div>
              <label style={lbl}>Kontakt-E-Mail</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="kontakt@firma.de" style={inp} />
            </div>
            <div>
              <label style={lbl}>Website</label>
              <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://meinefirma.de" style={inp} />
            </div>
            <div>
              <label style={lbl}>Kurzbeschreibung</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={3} placeholder="Was macht euer Unternehmen besonders…"
                style={{ ...inp, resize:"vertical" }} />
            </div>

            {error && <div style={{ background:"rgba(255,68,85,.1)", border:"1px solid rgba(255,68,85,.3)", borderRadius:10, padding:".7rem 1rem", fontSize:".8rem", color:"#ff7788" }}>{error}</div>}
            {saved && <div style={{ background:"rgba(46,204,138,.08)", border:"1px solid rgba(46,204,138,.25)", borderRadius:10, padding:".7rem 1rem", fontSize:".8rem", color:"#2ECC8A" }}>✓ Gespeichert</div>}

            <button onClick={save} disabled={saving}
              style={{ background:"linear-gradient(135deg,#2ECC8A,#1aaa6e)", color:"#000", border:"none", borderRadius:12, padding:".85rem", fontWeight:800, fontSize:".88rem", cursor:saving?"not-allowed":"pointer", opacity:saving?.7:1, alignSelf:"flex-start", paddingLeft:"1.75rem", paddingRight:"1.75rem" }}>
              {saving ? "Speichern…" : "Speichern ✓"}
            </button>
          </div>
        </div>

        {/* Account info — read only */}
        <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:18, overflow:"hidden" }}>
          <div style={{ padding:"1.1rem 1.25rem", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
            <h2 style={{ fontWeight:800, fontSize:".9rem", margin:0 }}>Account</h2>
          </div>
          <div style={{ padding:"1.25rem" }}>
            {[
              { label:"Aktuelles Paket", value: profile ? (profile.tier === "trial" ? "Kein Abo (Free)" : profile.tier === "basic" ? "Starter" : profile.tier === "growth" ? "Wachstum" : "Premium") : "—" },
              { label:"Partner seit", value: "2025" },
            ].map(row => (
              <div key={row.label} style={{ display:"flex", gap:"1rem", padding:".6rem 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                <span style={{ fontSize:".75rem", color:"rgba(255,255,255,.35)", width:140, flexShrink:0 }}>{row.label}</span>
                <span style={{ fontSize:".82rem", color:"rgba(255,255,255,.65)" }}>{row.value}</span>
              </div>
            ))}
            <div style={{ marginTop:"1rem" }}>
              <a href="/partner-dashboard/pakete" style={{ fontSize:".78rem", color:"#2ECC8A", fontWeight:700, textDecoration:"none" }}>
                Paket wechseln →
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
