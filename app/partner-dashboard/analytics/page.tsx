"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

interface ProductStat {
  productId: number
  productName: string
  impressions: number
  clicks: number
  listAdds: number
  convRate: string
}

interface DailyBucket {
  date: string
  impressions: number
  clicks: number
  listAdds: number
}

export default function PartnerAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading]             = useState(true)
  const [partnerId, setPartnerId]         = useState("")
  const [companyName, setCompanyName]     = useState("")
  const [productStats, setProductStats]   = useState<ProductStat[]>([])
  const [dailyBuckets, setDailyBuckets]   = useState<DailyBucket[]>([])
  const [totalStats, setTotalStats]       = useState({ impressions: 0, clicks: 0, listAdds: 0 })

  useEffect(() => { loadAnalytics() }, [])

  async function loadAnalytics() {
    if (!supabase) { router.push("/partner-register"); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push("/partner-register"); return }

    const { data: profileData } = await supabase
      .from("partner_profiles").select("id,company_name").eq("user_id", session.user.id).single()
    if (!profileData) { router.push("/partner-register"); return }
    setPartnerId(profileData.id)
    setCompanyName(profileData.company_name)

    // Events last 30 days
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: eventsData } = await supabase
      .from("partner_events")
      .select("product_id, event_type, created_at, metadata")
      .eq("partner_id", profileData.id)
      .gte("created_at", since)

    // Products
    const { data: productsData } = await supabase
      .from("partner_products").select("id, name").eq("partner_id", profileData.id)

    const events = eventsData ?? []
    const products = productsData ?? []

    // Per-product stats
    const statsMap: Record<number, ProductStat> = {}
    products.forEach((p: any) => {
      statsMap[p.id] = { productId: p.id, productName: p.name, impressions: 0, clicks: 0, listAdds: 0, convRate: "0.0" }
    })
    events.forEach((ev: any) => {
      const pid = ev.product_id
      if (!pid || !statsMap[pid]) return
      if (ev.event_type === "impression") statsMap[pid].impressions++
      else if (ev.event_type === "click") statsMap[pid].clicks++
      else if (ev.event_type === "list_add") statsMap[pid].listAdds++
    })
    Object.values(statsMap).forEach(s => {
      s.convRate = s.impressions > 0 ? ((s.listAdds / s.impressions) * 100).toFixed(1) : "0.0"
    })
    setProductStats(Object.values(statsMap))

    // Total
    const tot = { impressions: 0, clicks: 0, listAdds: 0 }
    events.forEach((ev: any) => {
      if (ev.event_type === "impression") tot.impressions++
      else if (ev.event_type === "click") tot.clicks++
      else if (ev.event_type === "list_add") tot.listAdds++
    })
    setTotalStats(tot)

    // Daily buckets (last 14 days)
    const buckets: Record<string, DailyBucket> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      buckets[key] = { date: key, impressions: 0, clicks: 0, listAdds: 0 }
    }
    events.forEach((ev: any) => {
      const key = new Date(ev.created_at).toISOString().slice(0, 10)
      if (!buckets[key]) return
      if (ev.event_type === "impression") buckets[key].impressions++
      else if (ev.event_type === "click") buckets[key].clicks++
      else if (ev.event_type === "list_add") buckets[key].listAdds++
    })
    setDailyBuckets(Object.values(buckets))
    setLoading(false)
  }

  function exportCsv() {
    const header = "Datum,Impressionen,Klicks,Listen-Adds\n"
    const rows = dailyBuckets.map(b => `${b.date},${b.impressions},${b.clicks},${b.listAdds}`).join("\n")
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `true-analytics-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "#0b1a10", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <div style={{ color: "#2ECC8A", fontWeight: 800 }}>Laden…</div>
    </div>
  )

  const maxImpressions = Math.max(...dailyBuckets.map(b => b.impressions), 1)
  const maxClicks      = Math.max(...dailyBuckets.map(b => b.clicks), 1)

  return (
    <div style={{ color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: "1.3rem", letterSpacing: "-0.02em", margin: 0 }}>Analytics</h1>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", margin: "0.2rem 0 0" }}>Letzte 30 Tage</p>
          </div>
          <button onClick={exportCsv}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "6px 14px", color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
            CSV exportieren ↓
          </button>
        </div>
        {/* Total stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
          {[
            { label: "Impressionen", value: totalStats.impressions, color: "#4488ff" },
            { label: "Klicks", value: totalStats.clicks, color: "#2ECC8A" },
            { label: "Listen-Adds", value: totalStats.listAdds, color: "#ffd700" },
            { label: "Conv. Rate", value: totalStats.impressions > 0 ? `${((totalStats.listAdds / totalStats.impressions) * 100).toFixed(1)}%` : "0.0%", color: "#ff8844" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "1.1rem" }}>
              <div style={{ fontWeight: 900, fontSize: "1.6rem", color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginTop: "0.2rem" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bar chart — Impressions (14 days) */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h2 style={{ fontWeight: 800, fontSize: "0.9rem", margin: 0 }}>Impressionen (14 Tage)</h2>
            <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>
              <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#4488ff", marginRight: 4 }} />Impressionen</span>
              <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#2ECC8A", marginRight: 4 }} />Klicks</span>
            </div>
          </div>
          {/* Chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3rem", height: "120px" }}>
            {dailyBuckets.map(b => (
              <div key={b.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", height: "100%", justifyContent: "flex-end" }}>
                <div style={{ width: "100%", display: "flex", gap: "1px", alignItems: "flex-end", height: "100%" }}>
                  <div style={{ flex: 1, background: "#4488ff", borderRadius: "3px 3px 0 0", height: `${(b.impressions / maxImpressions) * 100}%`, minHeight: b.impressions > 0 ? 3 : 0, opacity: 0.8 }} />
                  <div style={{ flex: 1, background: "#2ECC8A", borderRadius: "3px 3px 0 0", height: `${(b.clicks / maxImpressions) * 100}%`, minHeight: b.clicks > 0 ? 3 : 0, opacity: 0.8 }} />
                </div>
              </div>
            ))}
          </div>
          {/* X labels */}
          <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.4rem" }}>
            {dailyBuckets.map((b, i) => (
              <div key={b.date} style={{ flex: 1, textAlign: "center", fontSize: "0.48rem", color: "rgba(255,255,255,0.25)" }}>
                {i === 0 || i === 6 || i === 13 ? b.date.slice(5) : ""}
              </div>
            ))}
          </div>
        </div>

        {/* Per-product stats */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
          <div style={{ padding: "1.1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 style={{ fontWeight: 800, fontSize: "0.9rem", margin: 0 }}>Statistiken pro Produkt</h2>
          </div>
          {productStats.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.82rem" }}>
              Keine Produkte vorhanden.
            </div>
          ) : (
            <div>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px", gap: "0.5rem", padding: "0.65rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["Produkt", "Impr.", "Klicks", "Adds", "Conv."].map(h => (
                  <div key={h} style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, letterSpacing: "0.05em", textAlign: h === "Produkt" ? "left" : "center" }}>{h}</div>
                ))}
              </div>
              {productStats.map(ps => (
                <div key={ps.productId}
                  style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 80px", gap: "0.5rem", padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ps.productName}</div>
                  <div style={{ textAlign: "center", fontWeight: 700, fontSize: "0.85rem", color: "#4488ff" }}>{ps.impressions}</div>
                  <div style={{ textAlign: "center", fontWeight: 700, fontSize: "0.85rem", color: "#2ECC8A" }}>{ps.clicks}</div>
                  <div style={{ textAlign: "center", fontWeight: 700, fontSize: "0.85rem", color: "#ffd700" }}>{ps.listAdds}</div>
                  <div style={{ textAlign: "center", fontSize: "0.78rem", color: parseFloat(ps.convRate) > 5 ? "#2ECC8A" : "rgba(255,255,255,0.5)", fontWeight: 700 }}>{ps.convRate}%</div>
                </div>
              ))}
              {/* Conversion bar visualization per product */}
              {productStats.map(ps => {
                const pct = Math.min(parseFloat(ps.convRate), 100)
                return (
                  <div key={`bar-${ps.productId}`} style={{ padding: "0 1.25rem 0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct > 5 ? "#2ECC8A" : "#4488ff", borderRadius: 2, transition: "width 0.5s ease" }} />
                      </div>
                      <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", width: 40, textAlign: "right" }}>{ps.productName.slice(0, 12)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
