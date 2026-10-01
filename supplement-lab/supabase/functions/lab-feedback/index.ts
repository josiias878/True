// Supplement Lab · Feedback an Kolbi – freiwillig, ohne Geräte-ID oder sonstige Kennung
// POST {mood: "love"|"ok"|"meh", text?, where?, v?} → speichern (Text max. 1000 Zeichen)
import { createClient } from "npm:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })
const MOODS = ["love", "ok", "meh"], WHERE = /^[a-z-]{2,20}$/, VER = /^[0-9a-z.\-]{1,20}$/
const HOURLY_MAX = 300 // grobe Bremse gegen Spam

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (req.method !== "POST") return json({ error: "method" }, 405)
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return json({ error: "json" }, 400) }
  const mood = String(b.mood ?? "")
  if (!MOODS.includes(mood)) return json({ error: "mood" }, 400)
  const text = typeof b.text === "string" ? b.text.trim().slice(0, 1000) : ""
  const where = typeof b.where === "string" && WHERE.test(b.where) ? b.where : null
  const v = typeof b.v === "string" && VER.test(b.v) ? b.v : null
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const { count } = await db.from("lab_feedback").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 3600_000).toISOString())
  if ((count ?? 0) >= HOURLY_MAX) return json({ error: "busy" }, 429)
  const { error } = await db.from("lab_feedback").insert({ mood, text: text || null, src: where, v })
  return error ? json({ error: "db" }, 500) : json({ ok: true })
})
