// Supplement Lab · Gerät für Push anmelden und Plan ersetzen.
// Empfängt NUR die Push-Adresse und neutrale Termine — keine Supplement-Namen, keine Gesundheitsdaten.
// Optional (Phase „Wiederkommen“, freiwillig): social = {secret, on, lang} verknüpft bzw. trennt das Social-Profil
// (Geheimnis wie bei lab-social, Server speichert nur SHA-256) mit dieser Push-Adresse für die tägliche
// Community-Zusammenfassung (Tabelle social_push). Ohne social bleibt alles wie bisher.
import { createClient } from "npm:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })

interface PlanItem { at: string; payload: { id: string; title: string; body: string; url: string; tag: string } }

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (req.method !== "POST") return json({ error: "method" }, 405)
  let body: { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; plan?: PlanItem[]; unsubscribe?: boolean
    social?: { secret?: string; on?: boolean; lang?: string } }
  try { body = await req.json() } catch { return json({ error: "json" }, 400) }

  const sub = body.subscription
  const endpoint = sub?.endpoint
  if (!endpoint || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) return json({ error: "endpoint" }, 400)

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  if (body.unsubscribe) {
    await db.from("lab_push_subs").delete().eq("endpoint", endpoint)
    return json({ ok: true })
  }

  const p256dh = sub?.keys?.p256dh, auth = sub?.keys?.auth
  if (!p256dh || !auth || p256dh.length > 200 || auth.length > 100) return json({ error: "keys" }, 400)

  const { data: row, error } = await db.from("lab_push_subs")
    .upsert({ endpoint, p256dh, auth, updated_at: new Date().toISOString() }, { onConflict: "endpoint" })
    .select("id").single()
  if (error || !row) return json({ error: "db" }, 500)

  // Plan komplett ersetzen: nur Zukunft, höchstens 14 Tage, höchstens 80 Einträge
  const now = Date.now()
  const max = now + 14 * 86400_000
  const s = (v: unknown, n: number) => String(v ?? "").slice(0, n)
  const items = (Array.isArray(body.plan) ? body.plan : [])
    .map(p => ({ t: Date.parse(p?.at), p: p?.payload }))
    .filter(x => Number.isFinite(x.t) && x.t > now - 60_000 && x.t < max && x.p)
    .slice(0, 80)
    .map(x => ({
      sub_id: row.id,
      send_at: new Date(x.t).toISOString(),
      payload: { id: s(x.p.id, 80), title: s(x.p.title, 120), body: s(x.p.body, 240), url: s(x.p.url, 200), tag: s(x.p.tag, 80) },
    }))

  // Community-Zusammenfassung an/aus (nur mit gültigem Social-Geheimnis eines bestehenden Profils)
  let social: boolean | undefined
  if (body.social && typeof body.social === "object") {
    const sec = String(body.social.secret ?? "")
    if (!/^[a-f0-9]{64}$/.test(sec)) return json({ error: "social" }, 400)
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sec))
    const hash = Array.from(new Uint8Array(d), x => x.toString(16).padStart(2, "0")).join("")
    const { data: prof, error: pErr } = await db.from("social_profiles").select("id, banned").eq("secret_hash", hash).maybeSingle()
    if (pErr) return json({ error: "db" }, 500)
    if (!prof) return json({ error: "noprofile" }, 401)
    if (body.social.on === true && !prof.banned) {
      const lang = body.social.lang === "en" ? "en" : "de"
      const { error: sErr } = await db.from("social_push").upsert({ profile: prof.id, sub_id: row.id, lang }, { onConflict: "profile" })
      if (sErr) return json({ error: "db" }, 500)
      social = true
    } else {
      await db.from("social_push").delete().eq("profile", prof.id)
      social = false
    }
  }

  // Plan nur ersetzen, wenn einer mitkommt (reine Social-An/Aus-Anfragen lassen die Erinnerungen stehen);
  // die Community-Zusammenfassung bleibt beim Ersetzen erhalten
  if (Array.isArray(body.plan)) {
    await db.from("lab_push_queue").delete().eq("sub_id", row.id).is("sent_at", null).neq("payload->>tag", "kolbi-community")
    if (items.length) {
      const { error: e2 } = await db.from("lab_push_queue").insert(items)
      if (e2) return json({ error: "queue" }, 500)
    }
  }
  return json({ ok: true, scheduled: items.length, ...(social !== undefined ? { social } : {}) })
})
