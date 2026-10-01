// Supplement Lab · Kalender-Abo
// GET  ?t=<token>          → aktuelle ICS-Datei (für „Kalender abonnieren“ / webcal://)
// POST {token, ics}        → ICS vom Gerät aktualisieren · POST {token, remove:true} → löschen
// Das Token ist zufällig und wird nur auf dem Gerät erzeugt – wer es nicht kennt, sieht nichts.
import { createClient } from "npm:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })
const TOKEN = /^[a-f0-9]{40,64}$/
const EMPTY = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Supplement Lab//DE", "X-WR-CALNAME:Supplement Lab", "END:VCALENDAR"].join("\r\n")

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  if (req.method === "GET") {
    const t = new URL(req.url).searchParams.get("t") ?? ""
    let ics = EMPTY
    if (TOKEN.test(t)) {
      const { data } = await db.from("lab_cal").select("ics").eq("token", t).maybeSingle()
      if (data?.ics) {
        ics = data.ics
        await db.from("lab_cal").update({ fetched_at: new Date().toISOString() }).eq("token", t)
      }
    }
    return new Response(ics, { headers: { ...CORS, "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-cache", "Content-Disposition": 'inline; filename="supplement-lab.ics"' } })
  }

  if (req.method !== "POST") return json({ error: "method" }, 405)
  let body: { token?: string; ics?: string; remove?: boolean }
  try { body = await req.json() } catch { return json({ error: "json" }, 400) }
  const token = String(body.token ?? "")
  if (!TOKEN.test(token)) return json({ error: "token" }, 400)
  if (body.remove) { await db.from("lab_cal").delete().eq("token", token); return json({ ok: true }) }
  const ics = String(body.ics ?? "")
  if (!ics.startsWith("BEGIN:VCALENDAR") || ics.length > 200000) return json({ error: "ics" }, 400)
  const { error } = await db.from("lab_cal").upsert({ token, ics, updated_at: new Date().toISOString() }, { onConflict: "token" })
  return error ? json({ error: "db" }, 500) : json({ ok: true })
})
