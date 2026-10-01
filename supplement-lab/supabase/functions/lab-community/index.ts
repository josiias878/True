// Supplement Lab · Community „Was andere erlebt haben“ – anonym und freiwillig
// POST {device, lib, days, decision, delta, dims, sides}  → Testergebnis teilen (ersetzt frühere Angabe)
// POST {device, lib, remove:true}                         → eigenen Beitrag löschen · {device, removeAll:true}
// GET  ?lib=<id>                                          → Statistik für ein Supplement
// GET  ?all=1                                             → Überblick (Anzahl pro Supplement)
// Details (Bereiche, Nebenwirkungen, Verteilung) erst ab MIN_N Beiträgen – sonst wären Einzelne erkennbar.
import { createClient } from "npm:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
}
const json = (body: unknown, status = 200, cache = false) => new Response(JSON.stringify(body), {
  status, headers: { ...CORS, "Content-Type": "application/json", ...(cache ? { "Cache-Control": "public, max-age=300" } : {}) },
})
const MIN_N = 5
const DEVICE = /^[a-f0-9]{32,64}$/, LIB = /^[a-z0-9-]{2,40}$/, KEY = /^[a-z0-9-]{2,24}$/
const clamp = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number(v) || 0))

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  if (req.method === "GET") {
    const q = new URL(req.url).searchParams
    if (q.get("all")) {
      const { data } = await db.from("lab_community").select("lib, decision").limit(50000)
      const by: Record<string, { n: number; keep: number }> = {}
      for (const r of data ?? []) { const b = (by[r.lib] ??= { n: 0, keep: 0 }); b.n++; if (r.decision === "keep") b.keep++ }
      return json({ total: data?.length ?? 0, libs: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, { n: v.n, keepPct: v.n >= MIN_N ? Math.round((v.keep / v.n) * 100) : null }])) }, 200, true)
    }
    const lib = q.get("lib") ?? ""
    if (!LIB.test(lib)) return json({ error: "lib" }, 400)
    const { data } = await db.from("lab_community").select("days, decision, delta, dims, sides").eq("lib", lib).limit(20000)
    const rows = data ?? []
    const n = rows.length
    if (n < MIN_N) return json({ lib, n, min: MIN_N }, 200, true)
    const deltas = rows.map(r => Number(r.delta)).sort((a, b) => a - b)
    const pct = (p: number) => deltas[Math.min(n - 1, Math.floor(p * (n - 1)))]
    const dimSum: Record<string, { s: number; c: number }> = {}
    for (const r of rows) for (const [k, v] of Object.entries((r.dims ?? {}) as Record<string, number>)) { const d = (dimSum[k] ??= { s: 0, c: 0 }); d.s += Number(v); d.c++ }
    const sideCount: Record<string, number> = {}
    for (const r of rows) for (const s of r.sides ?? []) sideCount[s] = (sideCount[s] ?? 0) + 1
    return json({
      lib, n, min: MIN_N,
      keepPct: Math.round((rows.filter(r => r.decision === "keep").length / n) * 100),
      maybePct: Math.round((rows.filter(r => r.decision === "maybe").length / n) * 100),
      avg: Math.round((deltas.reduce((a, b) => a + b, 0) / n) * 100) / 100,
      quantiles: [0.1, 0.25, 0.5, 0.75, 0.9].map(pct), // nur Quantile, keine Einzelwerte
      dims: Object.fromEntries(Object.entries(dimSum).filter(([, v]) => v.c >= MIN_N).map(([k, v]) => [k, Math.round((v.s / v.c) * 100) / 100])),
      sides: Object.fromEntries(Object.entries(sideCount).filter(([, c]) => c >= 2).map(([k, c]) => [k, Math.round((c / n) * 100)])),
      avgDays: Math.round(rows.reduce((a, r) => a + r.days, 0) / n),
    }, 200, true)
  }

  if (req.method !== "POST") return json({ error: "method" }, 405)
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return json({ error: "json" }, 400) }
  const device = String(b.device ?? "")
  if (!DEVICE.test(device)) return json({ error: "device" }, 400)
  if (b.removeAll) { await db.from("lab_community").delete().eq("device", device); return json({ ok: true }) }
  const lib = String(b.lib ?? "")
  if (!LIB.test(lib)) return json({ error: "lib" }, 400)
  if (b.remove) { await db.from("lab_community").delete().eq("device", device).eq("lib", lib); return json({ ok: true }) }
  const decision = String(b.decision ?? "")
  if (!["keep", "maybe", "drop"].includes(decision)) return json({ error: "decision" }, 400)
  const dimsIn = (b.dims && typeof b.dims === "object" ? b.dims : {}) as Record<string, unknown>
  const dims = Object.fromEntries(Object.entries(dimsIn).filter(([k]) => KEY.test(k)).slice(0, 12).map(([k, v]) => [k, Math.round(clamp(v, -4, 4) * 100) / 100]))
  const sides = (Array.isArray(b.sides) ? b.sides : []).map(String).filter(s => KEY.test(s)).slice(0, 8)
  const row = { device, lib, days: Math.round(clamp(b.days, 1, 120)), decision, delta: Math.round(clamp(b.delta, -4, 4) * 100) / 100, dims, sides, created_at: new Date().toISOString() }
  const { error } = await db.from("lab_community").upsert(row, { onConflict: "device,lib" })
  return error ? json({ error: "db" }, 500) : json({ ok: true })
})
