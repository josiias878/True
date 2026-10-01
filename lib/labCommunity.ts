// ── Supplement Lab: Community „Was andere erlebt haben“ ──────────────────────
// Freiwillig und anonym: Nach einem Test geht nur das Ergebnis an den Server
// (Supplement aus der Bibliothek, Testdauer, Urteil, ±★ gesamt und je Bereich, Nebenwirkungs-IDs).
// Keine Namen, keine Daten, keine Notizen, keine eigenen Einträge – und eine zufällige Geräte-ID.

import { LIB_BY_ID, STORE_MODE, libOf, testResult, type LabState } from "./supplementLab"

const URL_ = "https://mkdfohmshuuiroeruyyz.supabase.co/functions/v1/lab-community"
const DEVICE_KEY = "lab-device"
export const COMMUNITY_MIN = 5

export interface CommunityStats {
  lib: string; n: number; min: number
  keepPct?: number; maybePct?: number; avg?: number; quantiles?: number[]
  dims?: Record<string, number>; sides?: Record<string, number>; avgDays?: number
}

function device() {
  try {
    let d = localStorage.getItem(DEVICE_KEY)
    if (!d || !/^[a-f0-9]{32}$/.test(d)) {
      const b = new Uint8Array(16); crypto.getRandomValues(b)
      d = Array.from(b, x => x.toString(16).padStart(2, "0")).join("")
      localStorage.setItem(DEVICE_KEY, d)
    }
    return d
  } catch { return null }
}

/** Was würde geteilt? (Für die Vorschau in der Zustimmung und zum Senden.) */
export function communityPayload(s: LabState, suppId: string) {
  const x = s.supps.find(q => q.id === suppId)
  const lib = libOf(x)
  const v = s.verdicts[suppId]?.decision
  const r = testResult(s, suppId)
  if (!x || !lib || !v || !r || r.overall.base == null || r.overall.test == null) return null
  if (STORE_MODE && lib.category === "Peptide") return null
  const dims = Object.fromEntries(((r.dims ?? []) as string[]).map(d => [d, Math.round((((r.delta as Record<string, number> | null)?.[d]) ?? 0) * 100) / 100]))
  return {
    lib: lib.id, days: r.n || r.window.days, decision: v, delta: Math.round((r.overall.test - r.overall.base) * 100) / 100,
    dims, sides: r.sides.list.map((q: { id: string }) => q.id).slice(0, 8),
  }
}

export async function shareResult(s: LabState, suppId: string): Promise<boolean> {
  const p = communityPayload(s, suppId)
  const d = device()
  if (!p || !d) return false
  try {
    const res = await fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device: d, ...p }) })
    if (res.ok) cache.delete(p.lib)
    return res.ok
  } catch { return false }
}

export async function removeMyResults() {
  const d = device()
  if (!d) return
  try { await fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device: d, removeAll: true }) }) } catch {}
  cache.clear()
}

const cache = new Map<string, { t: number; v: CommunityStats | null }>()
export async function fetchStats(libId: string): Promise<CommunityStats | null> {
  if (!LIB_BY_ID[libId]) return null
  const hit = cache.get(libId)
  if (hit && Date.now() - hit.t < 10 * 60_000) return hit.v
  try {
    const res = await fetch(`${URL_}?lib=${encodeURIComponent(libId)}`)
    const v = res.ok ? await res.json() as CommunityStats : null
    cache.set(libId, { t: Date.now(), v })
    return v
  } catch { return null }
}

let overview: { t: number; v: { total: number; libs: Record<string, { n: number; keepPct: number | null }> } | null } | null = null
export async function fetchOverview() {
  if (overview && Date.now() - overview.t < 10 * 60_000) return overview.v
  try {
    const res = await fetch(`${URL_}?all=1`)
    const raw = res.ok ? await res.json() : null
    // Nur gültige Antworten übernehmen – sonst lieber „keine Daten“ als ein Absturz
    const v = raw && typeof raw.total === "number" && raw.libs && typeof raw.libs === "object" ? raw : null
    overview = { t: Date.now(), v }
    return v as { total: number; libs: Record<string, { n: number; keepPct: number | null }> } | null
  } catch { return null }
}

/** Wo liegt dein Ergebnis? (Anteil der anderen, die schlechter abgeschnitten haben – grob aus Quantilen.) */
export function percentile(delta: number, q: number[] | undefined): number | null {
  if (!q || q.length !== 5) return null
  const ps = [0.1, 0.25, 0.5, 0.75, 0.9]
  if (delta <= q[0]) return 5
  if (delta >= q[4]) return 95
  for (let i = 0; i < 4; i++) {
    if (delta >= q[i] && delta <= q[i + 1]) {
      const k = q[i + 1] === q[i] ? 0.5 : (delta - q[i]) / (q[i + 1] - q[i])
      return Math.round((ps[i] + k * (ps[i + 1] - ps[i])) * 100)
    }
  }
  return null
}
