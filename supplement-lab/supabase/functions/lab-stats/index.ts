// Supplement Lab · anonyme Nutzungsstatistik: nur Tageszähler je Ereignis/Sprache/Herkunftskanal.
// Keine Geräte-ID, keine IP, keine Inhalte. POST {e, lang, src}
import { createClient } from "npm:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
}
const EVENTS = new Set([
  "onboarding_view", "demo", "onboarded", "onboarded_pwa", "first_checkin", "checkin", "checkins_3", "checkins_7", "checkins_14", "checkins_30",
  "verdict", "experiment", "push_on", "invite", "share_card", "recap", "review_love", "review_ok", "review_meh", "feedback",
  "paywall_view", "purchase", "restore",
])
const SRC = /^[a-z]{1,20}$/

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (req.method !== "POST") return new Response(null, { status: 405, headers: CORS })
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return new Response(null, { status: 400, headers: CORS }) }
  const e = String(b.e ?? "")
  if (!EVENTS.has(e)) return new Response(null, { status: 400, headers: CORS })
  const lang = b.lang === "en" ? "en" : "de"
  const src = typeof b.src === "string" && SRC.test(b.src) ? b.src : ""
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const { error } = await db.rpc("lab_stats_hit", { p_event: e, p_lang: lang, p_src: src })
  return new Response(null, { status: error ? 500 : 204, headers: CORS })
})
