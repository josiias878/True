"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

interface PartnerProfile {
  id: string
  company_name: string
  tier: string
}

interface Product {
  id: number
  partner_id: string
  name: string
  description: string | null
  category: string | null
  tags: string[] | null
  image_url: string | null
  shop_url: string | null
  price_hint: string | null
  barcode: string | null
  active: boolean
  created_at: string
}

const CATEGORIES = [
  "Lebensmittel", "Milchprodukte", "Schokolade & Süßes", "Getränke",
  "Reinigung & Haushalt", "Snacks", "Kosmetik & Pflege", "Tierfutter", "Sonstiges",
]
const ALL_TAGS = [
  { id: "bio", label: "🌿 Bio" },
  { id: "palmöl-frei", label: "✋ Palmöl-frei" },
  { id: "regional", label: "📍 Regional" },
  { id: "vegan", label: "🌱 Vegan" },
  { id: "vegetarisch", label: "🥕 Vegetarisch" },
  { id: "plastikfrei", label: "♻️ Plastikfrei" },
  { id: "ohne-zusatzstoffe", label: "✅ Ohne Zusatzstoffe" },
  { id: "fairtrade", label: "🤝 Fairtrade" },
  { id: "glutenfrei", label: "🌾 Glutenfrei" },
  { id: "zuckerfrei", label: "🚫 Zuckerfrei" },
]

const CERTIFICATIONS = [
  { id: "bio-eu", label: "EU Bio (DE-ÖKO-...)" },
  { id: "demeter", label: "Demeter" },
  { id: "naturland", label: "Naturland" },
  { id: "fairtrade", label: "Fairtrade" },
  { id: "rainforest", label: "Rainforest Alliance" },
  { id: "msc", label: "MSC (Fischerei)" },
  { id: "bdih", label: "BDIH Kosmetik" },
  { id: "vegan-ges", label: "Vegan Gesellschaft" },
  { id: "utopia", label: "Utopia-geprüft" },
]

const TIER_LIMITS: Record<string, number> = { basic: 1, growth: 5, enterprise: Infinity }

const emptyForm = () => ({
  name: "", description: "", category: "", tags: [] as string[],
  image_url: "", shop_url: "", price_hint: "", barcode: "",
  certifications: [] as string[], cert_numbers: "",
  quality_claim: "",
})

export default function PartnerProductsPage() {
  const router = useRouter()
  const [profile, setProfile]     = useState<PartnerProfile | null>(null)
  const [products, setProducts]   = useState<Product[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<number | null>(null)
  const [form, setForm]           = useState(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState("")
  const [deleting, setDeleting]   = useState<number | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    if (!supabase) { router.push("/partner-register"); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push("/partner-register"); return }

    const { data: profileData } = await supabase
      .from("partner_profiles").select("id,company_name,tier").eq("user_id", session.user.id).single()
    if (!profileData) { router.push("/partner-register"); return }
    setProfile(profileData)

    await refreshProducts(profileData.id)
    setLoading(false)
  }

  async function refreshProducts(partnerId: string) {
    if (!supabase) return
    const { data } = await supabase
      .from("partner_products").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false })
    setProducts((data ?? []) as Product[])
  }

  function openAdd() {
    setEditId(null)
    setForm(emptyForm())
    setFormError("")
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditId(p.id)
    setForm({
      name: p.name, description: p.description ?? "", category: p.category ?? "",
      tags: p.tags ?? [], image_url: p.image_url ?? "", shop_url: p.shop_url ?? "",
      price_hint: p.price_hint ?? "", barcode: p.barcode ?? "",
      certifications: (p as any).certifications ?? [],
      cert_numbers: (p as any).cert_numbers ?? "",
      quality_claim: (p as any).quality_claim ?? "",
    })
    setFormError("")
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !profile) return
    setFormError("")

    const limit = TIER_LIMITS[profile.tier] ?? 1
    if (!editId && products.length >= limit) {
      setFormError(`Dein Paket erlaubt max. ${limit === Infinity ? "unbegrenzte" : limit} Produkt${limit > 1 ? "e" : ""}. Bitte upgraden.`)
      return
    }

    setSaving(true)
    try {
      const payload = {
        partner_id: profile.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category || null,
        tags: form.tags.length > 0 ? form.tags : null,
        image_url: form.image_url.trim() || null,
        shop_url: form.shop_url.trim() || null,
        price_hint: form.price_hint.trim() || null,
        barcode: form.barcode.trim() || null,
        certifications: form.certifications.length > 0 ? form.certifications : null,
        cert_numbers: form.cert_numbers.trim() || null,
        quality_claim: form.quality_claim.trim() || null,
        verified: false, // always reset to pending on save
      }
      if (editId) {
        const { error } = await supabase.from("partner_products").update(payload).eq("id", editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("partner_products").insert({ ...payload, active: true })
        if (error) throw error
      }
      await refreshProducts(profile.id)
      setShowForm(false)
      setForm(emptyForm())
    } catch (err: any) {
      setFormError(err?.message ?? "Fehler beim Speichern.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!supabase || !profile) return
    setDeleting(id)
    await supabase.from("partner_products").delete().eq("id", id)
    await refreshProducts(profile.id)
    setDeleting(null)
  }

  async function toggleActive(p: Product) {
    if (!supabase) return
    await supabase.from("partner_products").update({ active: !p.active }).eq("id", p.id)
    setProducts(ps => ps.map(x => x.id === p.id ? { ...x, active: !x.active } : x))
  }

  function toggleTag(tag: string) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "#0b1a10", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ color: "#2ECC8A", fontWeight: 800 }}>Laden…</div>
    </div>
  )

  const limit = TIER_LIMITS[profile?.tier ?? "basic"] ?? 1
  const canAdd = products.length < limit

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px", padding: "0.75rem 0.9rem",
    color: "#fff", fontSize: "0.88rem", outline: "none",
    fontFamily: "system-ui,-apple-system,sans-serif",
  }
  const labelStyle: React.CSSProperties = {
    fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.35rem", display: "block",
  }

  return (
    <div style={{ color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        input:focus, textarea:focus, select:focus { border-color: #2ECC8A !important; outline: none; }
        select option { background: #0b1a10; color: #fff; }
        .prod-row:hover { background: rgba(255,255,255,0.06) !important; }
        .tag-btn:hover { border-color: #2ECC8A !important; }
      `}</style>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: "1.3rem", letterSpacing: "-0.02em", margin: 0 }}>Produkte</h1>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", margin: "0.2rem 0 0" }}>
              {products.length} / {limit === Infinity ? "∞" : limit} Produkte
            </p>
          </div>
          {canAdd ? (
            <button onClick={openAdd}
              style={{ background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000", border: "none", borderRadius: "10px", padding: "8px 18px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>
              + Neues Produkt
            </button>
          ) : (
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "6px 12px" }}>
              Limit erreicht ({limit} Produkte)
            </span>
          )}
        </div>

        {/* Tier limit bar */}
        {limit !== Infinity && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "0.75rem 1rem" }}>
          {limit !== Infinity && (
            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min((products.length / limit) * 100, 100)}%`, background: products.length >= limit ? "#ff4455" : "#2ECC8A", borderRadius: 2 }} />
            </div>
          )}
          {!canAdd && (
            <a href="/partner-dashboard/pakete" style={{ color: "#4488ff", fontSize: "0.72rem", fontWeight: 700, textDecoration: "none" }}>Pakete ansehen →</a>
          )}
        </div>
        )}

        {/* Product list */}
        {products.length === 0 && !showForm ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "rgba(255,255,255,0.3)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📦</div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.4rem", color: "rgba(255,255,255,0.5)" }}>Noch keine Produkte</div>
            <div style={{ fontSize: "0.8rem", marginBottom: "1.5rem" }}>Füge dein erstes Produkt hinzu damit es bei Scan-Ergebnissen erscheint.</div>
            <button onClick={openAdd}
              style={{ background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000", border: "none", borderRadius: "12px", padding: "0.85rem 1.75rem", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}>
              + Erstes Produkt hinzufügen
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.5rem" }}>
            {products.map(p => (
              <div key={p.id} className="prod-row"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", transition: "background 0.15s" }}>
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{p.name}</span>
                    {(p as any).verified ? (
                      <span style={{ fontSize: "0.6rem", fontWeight: 800, background: "rgba(46,204,138,0.12)", border: "1px solid rgba(46,204,138,0.3)", color: "#2ECC8A", borderRadius: 5, padding: "1px 7px" }}>✓ Verifiziert</span>
                    ) : (
                      <span style={{ fontSize: "0.6rem", fontWeight: 700, background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.25)", color: "#ffc107", borderRadius: 5, padding: "1px 7px" }}>⏳ In Prüfung</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.25rem" }}>
                    {p.barcode && <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>#{p.barcode}</span>}
                    {p.category && <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)", borderRadius: 5, padding: "1px 7px" }}>{p.category}</span>}
                    {(p.tags ?? []).slice(0, 3).map(t => (
                      <span key={t} style={{ fontSize: "0.65rem", color: "#2ECC8A", background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 5, padding: "1px 7px" }}>{t}</span>
                    ))}
                    {(p as any).certifications?.slice(0, 2).map((c: string) => (
                      <span key={c} style={{ fontSize: "0.65rem", color: "#4488ff", background: "rgba(68,136,255,0.08)", border: "1px solid rgba(68,136,255,0.2)", borderRadius: 5, padding: "1px 7px" }}>{c}</span>
                    ))}
                    {p.price_hint && <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>· {p.price_hint}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  {/* Active toggle */}
                  <button onClick={() => toggleActive(p)}
                    style={{ background: p.active ? "rgba(46,204,138,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${p.active ? "rgba(46,204,138,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: "8px", padding: "4px 10px", fontSize: "0.68rem", fontWeight: 700, color: p.active ? "#2ECC8A" : "rgba(255,255,255,0.3)", cursor: "pointer" }}>
                    {p.active ? "Aktiv" : "Inaktiv"}
                  </button>
                  <button onClick={() => openEdit(p)}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "4px 10px", fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                    Bearbeiten
                  </button>
                  <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                    style={{ background: "rgba(255,68,85,0.08)", border: "1px solid rgba(255,68,85,0.2)", borderRadius: "8px", padding: "4px 10px", fontSize: "0.68rem", fontWeight: 700, color: "#ff7788", cursor: "pointer", opacity: deleting === p.id ? 0.5 : 1 }}>
                    {deleting === p.id ? "…" : "Löschen"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit form */}
        {showForm && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: "20px", padding: "1.5rem", marginTop: "1rem" }}>
            <h3 style={{ fontWeight: 900, fontSize: "1rem", marginBottom: "1.25rem" }}>
              {editId ? "Produkt bearbeiten" : "Neues Produkt hinzufügen"}
            </h3>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

              {/* ① Barcode — Pflichtfeld für Verifikation */}
              <div style={{ background: "rgba(46,204,138,0.05)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: "14px", padding: "1rem 1.1rem" }}>
                <label style={{ ...labelStyle, color: "#2ECC8A" }}>Barcode / EAN * — Pflichtfeld für Verifikation</label>
                <input required value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                  placeholder="z.B. 4000417025005 (13-stellige EAN)" style={inputStyle} />
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
                  TRUE gleicht den Barcode automatisch mit OpenFoodFacts ab und prüft deine Angaben innerhalb von 3–5 Werktagen.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {/* ② Name + Kategorie */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Produktname *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Bio Haselnuss-Aufstrich" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kategorie</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">Kategorie wählen…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Preis-Hinweis</label>
                  <input value={form.price_hint} onChange={e => setForm(f => ({ ...f, price_hint: e.target.value }))}
                    placeholder="ca. 4,50€" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Shop-URL</label>
                  <input type="url" value={form.shop_url} onChange={e => setForm(f => ({ ...f, shop_url: e.target.value }))}
                    placeholder="https://shop.beispiel.de/produkt" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Produktbild-URL</label>
                  <input type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://cdn.beispiel.de/bild.jpg" style={inputStyle} />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Kurzbeschreibung</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} placeholder="Was macht euer Produkt besonders? Woher kommen die Zutaten?"
                    style={{ ...inputStyle, resize: "vertical" as const }} />
                </div>

                {/* ③ Zertifizierungen */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Vorhandene Zertifizierungen (mehrere möglich)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.6rem" }}>
                    {CERTIFICATIONS.map(c => {
                      const active = form.certifications.includes(c.id)
                      return (
                        <button key={c.id} type="button"
                          onClick={() => setForm(f => ({ ...f, certifications: active ? f.certifications.filter(x => x !== c.id) : [...f.certifications, c.id] }))}
                          className="tag-btn"
                          style={{
                            padding: "5px 13px", borderRadius: "99px", cursor: "pointer", fontSize: "0.77rem", fontWeight: 700,
                            border: `1.5px solid ${active ? "#4488ff" : "rgba(255,255,255,0.15)"}`,
                            background: active ? "rgba(68,136,255,0.1)" : "transparent",
                            color: active ? "#4488ff" : "rgba(255,255,255,0.5)",
                            transition: "all 0.15s",
                          }}>
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                  {form.certifications.length > 0 && (
                    <div>
                      <label style={labelStyle}>Zertifikat-Nummern (optional, z.B. DE-ÖKO-006)</label>
                      <input value={form.cert_numbers} onChange={e => setForm(f => ({ ...f, cert_numbers: e.target.value }))}
                        placeholder="DE-ÖKO-006, FLO-12345" style={inputStyle} />
                      <p style={{ margin: "0.4rem 0 0", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", lineHeight: 1.4 }}>
                        Zertifikatnummern helfen TRUE bei der Verifikation. Du kannst sie auch per E-Mail nachreichen.
                      </p>
                    </div>
                  )}
                </div>

                {/* ④ Qualitäts-Claim */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Qualitäts-Versprechen (optional)</label>
                  <input value={form.quality_claim} onChange={e => setForm(f => ({ ...f, quality_claim: e.target.value }))}
                    placeholder='z.B. "100% Recyclat-Verpackung" oder "Hergestellt ohne Palmöl seit 2018"'
                    style={inputStyle} />
                  <p style={{ margin: "0.4rem 0 0", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", lineHeight: 1.4 }}>
                    TRUE prüft und bestätigt diese Aussage vor der Veröffentlichung.
                  </p>
                </div>

                {/* ⑤ Tags */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Eigenschaften / Tags</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {ALL_TAGS.map(t => (
                      <button key={t.id} type="button" onClick={() => toggleTag(t.id)} className="tag-btn"
                        style={{
                          padding: "5px 13px", borderRadius: "99px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700,
                          border: `1.5px solid ${form.tags.includes(t.id) ? "#2ECC8A" : "rgba(255,255,255,0.15)"}`,
                          background: form.tags.includes(t.id) ? "rgba(46,204,138,0.12)" : "transparent",
                          color: form.tags.includes(t.id) ? "#2ECC8A" : "rgba(255,255,255,0.5)",
                          transition: "all 0.15s",
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {formError && (
                <div style={{ background: "rgba(255,68,85,0.1)", border: "1px solid rgba(255,68,85,0.3)", borderRadius: "10px", padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#ff7788" }}>
                  {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.65rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "0.75rem 1.25rem", color: "rgba(255,255,255,0.5)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                  Abbrechen
                </button>
                <button type="submit" disabled={saving}
                  style={{ background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000", border: "none", borderRadius: "10px", padding: "0.75rem 1.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Speichern…" : editId ? "Änderungen speichern" : "Produkt hinzufügen"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
