// Supplement Lab · Fällige Push-Nachrichten versenden. Wird jede Minute von pg_cron aufgerufen.
import { createClient } from "npm:@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

Deno.serve(async req => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const { data: cfgRows } = await db.from("lab_push_config").select("key,value")
  const cfg = Object.fromEntries((cfgRows ?? []).map(r => [r.key, r.value])) as Record<string, string>
  if (!cfg.cron_secret || req.headers.get("x-cron-secret") !== cfg.cron_secret) return new Response("forbidden", { status: 403 })

  webpush.setVapidDetails(cfg.vapid_subject, cfg.vapid_public, cfg.vapid_private)

  // Test-Modus: an eine übergebene Adresse senden (prüft Verschlüsselung & Signatur)
  const url = new URL(req.url)
  if (url.searchParams.get("test") === "1") {
    const t = await req.json()
    try {
      const r = await webpush.sendNotification(t.subscription, JSON.stringify(t.payload ?? { title: "Test" }), { TTL: 60 })
      return Response.json({ ok: true, status: r.statusCode })
    } catch (e) {
      const err = e as { statusCode?: number; body?: string; message?: string }
      return Response.json({ ok: false, status: err.statusCode, body: err.body, message: err.message })
    }
  }

  const nowIso = new Date().toISOString()
  const { data: due } = await db.from("lab_push_queue")
    .select("id, send_at, payload, sub:lab_push_subs(id, endpoint, p256dh, auth)")
    .is("sent_at", null).lte("send_at", nowIso).order("send_at").limit(300)

  let sent = 0, skipped = 0, gone = 0
  const done: number[] = []
  const deadSubs = new Set<string>()
  for (const row of due ?? []) {
    done.push(row.id)
    const sub = row.sub as unknown as { id: string; endpoint: string; p256dh: string; auth: string } | null
    if (!sub || deadSubs.has(sub.id)) continue
    // Mehr als 2 h zu spät (z. B. Ausfall) → nicht mehr senden, wäre nur noch störend
    if (Date.now() - Date.parse(row.send_at) > 2 * 3600_000) { skipped++; continue }
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(row.payload), { TTL: 3 * 3600, urgency: "normal" })
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) { deadSubs.add(sub.id); gone++ }
    }
  }
  if (done.length) await db.from("lab_push_queue").update({ sent_at: nowIso }).in("id", done)
  if (deadSubs.size) await db.from("lab_push_subs").delete().in("id", [...deadSubs])
  // Aufräumen: versendete Einträge nach 2 Tagen löschen
  await db.from("lab_push_queue").delete().lt("sent_at", new Date(Date.now() - 2 * 86400_000).toISOString())

  return Response.json({ sent, skipped, gone })
})
