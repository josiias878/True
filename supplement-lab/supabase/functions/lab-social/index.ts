// Supplement Lab · Kolbi Social Stufe 2 („sicher zuerst“): pseudonyme Profile, Folgen, Ergebnis-Posts,
// zwei feste Reaktionen, offizielle Communities, Melden/Blockieren.
// KEIN Freitext, KEINE Bilder, KEINE Peptide/Rx, keine Geräte-IDs/IPs/E-Mail.
//
// Anmeldung: Gerät erzeugt ein zufälliges 32-Byte-Geheimnis (64 hex). Der Server speichert nur SHA-256 davon.
//   Header  x-social-id: <Profil-UUID>   x-social-secret: <64 hex>
// POST {action, lang?, ...}
//   ensure {nameIdx?, avatar?}           → {id, name, avatar, restricted?, tester?, decisions}   (legt beim ersten Mal an; id-Header optional)
//     decisions: [{target: post|profile, action: hidden|banned, lib?, note, at}] – Entscheidungen des Inhabers über
//     mich/meine Posts mit Begründung (DSA Art. 17), neueste zuerst, max. 10
//   updateProfile {nameIdx?, avatar?}    → {ok}
//   setTester {on: boolean}              → {ok}   Testmodus: Profil + danach geteilte Posts nur für andere Tester sichtbar;
//     Tester sehen echte + Test-Inhalte (author.tester / tester = true → „TEST“-Abzeichen). Im Testmodus geteilte Posts
//     bleiben auch nach dem Ausschalten nur für Tester sichtbar.
//   getProfile {id}                      → {id, name, avatar, tester?, followers, following, isFollowing, isMe, posts, blocked?}
//   follow|unfollow|block|unblock {id}   → {ok}
//   feed {kind: following|discover, cursor?}  ·  communityFeed {id, cursor?}  → {posts, next?}
//     communityFeed liefert auf der ersten Seite (ohne cursor) zusätzlich official: [{id, date, title, body, icon?}]
//     = offizielle Kolbi-Posts dieser Community (publish_on <= heute, nicht ausgeblendet), neueste zuerst, max. 30
//     feed following (erste Seite) liefert official: [{id, community, date, title, body, icon?}] aus allen beigetretenen
//     Communities der letzten 21 Tage, max. 10 (für den Home-Feed)
//   communities {query?}                 → {communities: [{id, kind, key, name, members, joined, featured?, official?: {id, date}}]}
//     featured = Rang als Start-Gruppe (1…) · official = neuester sichtbarer Kolbi-Post
//   join|leave {id}                      → {ok}
//   shareResult {lib, days, decision, delta, dims}  → {ok} · 403 {error:"hidden"} · 409 {error:"pending"}
//     (erneutes Teilen aktualisiert den Post an Ort und Stelle – gleiche ID, Reaktionen weg; bei offenen Meldungen gesperrt)
//   react|unreact {post, kind}           → {ok}
//   report {type: post|profile, id, reason}          → {ok}
//   deleteAccount                        → {ok}   (löscht ALLES des Profils)
// Fehler 401: {error:"noprofile"} = zu diesem Geheimnis gibt es (k)ein Profil mehr → Client darf neu anfangen;
//             {error:"auth"} = Geheimnis/ID ungültig oder passen nicht zusammen → Client behält seine Schlüssel.
// Anfragen > 8 KB → 413 {error:"size"}.
// Nie ausgeliefert: ausgeblendete/gesperrte Inhalte, Inhalte blockierter Profile (beide Richtungen).
// Kein automatisches Ausblenden nach Meldungen – nur der Inhaber entscheidet (SQL: moderate()).
import { createClient } from "npm:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info, x-social-id, x-social-secret",
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })
const fail = (error: string, status = 400) => json({ error }, status)

// ── Grenzen ──────────────────────────────────────────────────────────────────
const WRITE_PER_MIN = 30, READ_PER_MIN = 120, REPORTS_PER_DAY = 10
const NEW_PROFILES_PER_HOUR = 300, NEW_PROFILES_PER_5MIN = 30 // grobe Bremse gegen Massen-Anlage (keine IPs gespeichert)
const MAX_BODY = 8192
const MAX_FOLLOWS = 2000, MAX_MEMBERSHIPS = 100, PAGE = 20

// ── Validierung ──────────────────────────────────────────────────────────────
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const SECRET = /^[a-f0-9]{64}$/, LIB = /^[a-z0-9-]{2,40}$/, COMMUNITY = /^(lab|goal)-[a-z0-9-]{2,40}$/
const PEPTIDES = new Set(["bpc157", "tb500", "ghkcu", "cjc-ipa", "semax", "selank", "motsc", "epitalon", "ta1", "kpv", "glp1"])
// ohne „libido“: wird nie veröffentlicht (Art. 9 DSGVO, Sexualleben) – die DB lehnt es ebenfalls ab (social_dims_ok)
const DIMS = new Set(["energie", "fokus", "stimmung", "ruhe", "schlaf", "koerper", "verdauung", "appetit", "haut", "gelenke"])
const COLORS = ["kolbi", "blau", "violett", "rosa", "tuerkis", "bernstein", "koralle", "oliv"]
const ACCESSORIES = ["none", "shades", "nightcap"], MOODS = ["happy", "party", "think", "sleepy", "alert"]
const REACTIONS = ["durchhalten", "hilfreich"], DECISIONS = ["keep", "maybe", "drop"]
const REASONS = ["spam", "beleidigung", "gesundheitsversprechen", "sonstiges"]
const clamp = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number(v) || 0))
const r2 = (v: number) => Math.round(v * 100) / 100

interface Avatar { color: string; accessory: string; mood: string }
const DEFAULT_AVATAR: Avatar = { color: "kolbi", accessory: "none", mood: "happy" }
function avatarOf(v: unknown): Avatar | null {
  if (!v || typeof v !== "object") return null
  const o = v as Record<string, unknown>
  if (!COLORS.includes(o.color as string) || !ACCESSORIES.includes(o.accessory as string) || !MOODS.includes(o.mood as string)) return null
  return { color: o.color as string, accessory: o.accessory as string, mood: o.mood as string }
}
const nameIdxOf = (v: unknown): number | null => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 25599 ? v as number : null

// ── Pseudonym: dieselben Wortlisten wie lib/labSocial.ts (PSEUDO_WORDS) – nur Position 0…25599 ──
const WORDS = {
  de: {
    a: ["Früh", "Mond", "Nacht", "Sonnen", "Wald", "Nebel", "Funken", "Stern", "Regen", "Wolken", "Berg", "See", "Wind", "Moos", "Tau", "Blitz"],
    n: ["Kolben", "Fuchs", "Becher", "Glas", "Tropfen", "Pipette", "Spatz", "Igel", "Otter", "Eule", "Biber", "Dachs", "Falke", "Luchs", "Kauz", "Hase"],
  },
  en: {
    a: ["Early", "Moon", "Night", "Sun", "Forest", "Mist", "Spark", "Star", "Rain", "Cloud", "Peak", "Lake", "Wind", "Moss", "Dew", "Bolt"],
    n: ["Flask", "Fox", "Beaker", "Glass", "Drop", "Pipette", "Sparrow", "Hedgehog", "Otter", "Owl", "Beaver", "Badger", "Falcon", "Lynx", "Owlet", "Hare"],
  },
}
function nameAt(idx: number, en: boolean): string {
  const w = en ? WORDS.en : WORDS.de
  return `${w.a[idx % 16]}${w.n[(idx >> 4) % 16]}-${String(Math.floor(idx / 256)).padStart(2, "0")}`
}

async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return Array.from(new Uint8Array(d), x => x.toString(16).padStart(2, "0")).join("")
}

// ── Cursor: "<created_at>|<post-id>" (opak für den Client) ───────────────────
function parseCursor(v: unknown): { ts: string; id: string } | null | false {
  if (v == null || v === "") return null
  if (typeof v !== "string" || v.length > 80) return false
  const [ts, id] = v.split("|")
  return ts && id && UUID.test(id) && Number.isFinite(Date.parse(ts)) ? { ts, id } : false
}

interface Me { id: string; name_idx: number; avatar: Avatar; hidden: boolean; banned: boolean; last_seen_on: string; tester: boolean }
interface FeedRow {
  id: string; author: string; name_idx: number; avatar: Avatar; lib: string; days: number; decision: string; delta: number | string
  dims: Record<string, number>; created_at: string; n_durchhalten: number; n_hilfreich: number; mine: string[]; tester?: boolean
}
const OFFICIAL_MAX = 30
const OFFICIAL_HOME_DAYS = 21 // Home-Feed: Kolbi-Posts der letzten 3 Wochen
const OFFICIAL_HOME_MAX = 10

/** Body lesen, aber höchstens MAX_BODY Bytes (auch ohne/mit falschem Content-Length) – null = zu groß */
async function readCapped(req: Request): Promise<string | null> {
  const len = Number(req.headers.get("content-length") ?? "0")
  if (len > MAX_BODY) return null
  if (!req.body) return ""
  const reader = req.body.getReader(), parts: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BODY) { try { await reader.cancel() } catch { /* egal */ } return null }
    parts.push(value)
  }
  const all = new Uint8Array(size)
  let o = 0
  for (const p of parts) { all.set(p, o); o += p.byteLength }
  return new TextDecoder().decode(all)
}

const WRITES = new Set(["updateProfile", "setTester", "follow", "unfollow", "shareResult", "react", "unreact", "report", "block", "unblock", "join", "leave"])
const READS = new Set(["getProfile", "feed", "communityFeed", "communities"])

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (req.method !== "POST") return fail("method", 405)
  const raw = await readCapped(req)
  if (raw === null) return fail("size", 413)
  let b: Record<string, unknown>
  try { b = JSON.parse(raw) } catch { return fail("json") }
  if (!b || typeof b !== "object") return fail("json")
  const action = String(b.action ?? "")
  if (action !== "ensure" && action !== "deleteAccount" && !WRITES.has(action) && !READS.has(action)) return fail("action")
  const en = b.lang === "en"

  const hdrId = req.headers.get("x-social-id") ?? ""
  const secret = req.headers.get("x-social-secret") ?? ""
  if (!SECRET.test(secret)) return fail("auth", 401)
  if (hdrId && !UUID.test(hdrId)) return fail("auth", 401)
  const hash = await sha256(secret)

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const ME_COLS = "id, name_idx, avatar, hidden, banned, last_seen_on, tester"
  const { data: meRow, error: meErr } = await db.from("social_profiles").select(ME_COLS).eq("secret_hash", hash).maybeSingle()
  if (meErr) return fail("db", 500)
  let me = meRow as Me | null
  // Geheimnis passt zu einem anderen Profil als die mitgeschickte ID: nur ensure meldet sich über das Geheimnis an
  // (Client übernimmt dann die richtige ID); alle anderen Aktionen → "auth" (Client behält seine Schlüssel).
  if (me && hdrId && me.id !== hdrId && action !== "ensure") return fail("auth", 401)

  // ── ensure: anmelden oder (erstes Mal) anlegen ─────────────────────────────
  if (action === "ensure") {
    if (!me) {
      if (hdrId) return fail("noprofile", 401) // Profil gelöscht → Client fängt mit neuem Geheimnis neu an
      const since = (ms: number) => new Date(Date.now() - ms).toISOString()
      const [hour, burst] = await Promise.all([
        db.from("social_profiles").select("id", { count: "exact", head: true }).gte("created_at", since(3600_000)),
        db.from("social_profiles").select("id", { count: "exact", head: true }).gte("created_at", since(300_000)),
      ])
      if (hour.error || burst.error) return fail("db", 500)
      if ((hour.count ?? 0) >= NEW_PROFILES_PER_HOUR || (burst.count ?? 0) >= NEW_PROFILES_PER_5MIN) return fail("busy", 429)
      const idx = nameIdxOf(b.nameIdx) ?? Math.floor(Math.random() * 25600)
      const avatar = avatarOf(b.avatar) ?? DEFAULT_AVATAR
      const { data, error } = await db.from("social_profiles")
        .insert({ secret_hash: hash, name_idx: idx, handle: nameAt(idx, false), avatar }).select(ME_COLS).single()
      if (error || !data) return fail("db", 500)
      me = data as Me
    } else {
      const today = new Date().toISOString().slice(0, 10)
      if (me.last_seen_on !== today) await db.from("social_profiles").update({ last_seen_on: today }).eq("id", me.id)
    }
    const { data: dec, error: decErr } = await db.rpc("social_decisions", { p_me: me.id })
    if (decErr) return fail("db", 500)
    const decisions = ((dec ?? []) as { target: string; action: string; lib: string | null; note: string; at: string }[])
      .map(d => ({ target: d.target, action: d.action, ...(d.lib ? { lib: d.lib } : {}), note: d.note ?? "", at: d.at }))
    return json({
      id: me.id, name: nameAt(me.name_idx, en), avatar: me.avatar, ...(me.banned ? { restricted: true } : {}),
      ...(me.tester ? { tester: true } : {}), decisions,
    })
  }

  if (!me) return fail("noprofile", 401)
  const myId = me.id, iTest = !!me.tester
  if (action === "deleteAccount") {
    const { error } = await db.rpc("social_delete_profile", { p: myId })
    return error ? fail("db", 500) : json({ ok: true })
  }
  if (me.banned) return fail("banned", 403)

  // ── Bremse ─────────────────────────────────────────────────────────────────
  const write = WRITES.has(action)
  const { data: allowed, error: rateErr } = await db.rpc("social_hit", {
    p_profile: myId, p_bucket: write ? "w" : "r", p_seconds: 60, p_max: write ? WRITE_PER_MIN : READ_PER_MIN,
  })
  if (rateErr) return fail("db", 500)
  if (!allowed) return fail("rate", 429)

  // ── Hilfen ─────────────────────────────────────────────────────────────────
  const blockedEither = async (other: string) => {
    const { count } = await db.from("social_blocks").select("blocker", { count: "exact", head: true })
      .or(`and(blocker.eq.${myId},blocked.eq.${other}),and(blocker.eq.${other},blocked.eq.${myId})`)
    return (count ?? 0) > 0
  }
  /** Fremdes Profil, das ich sehen darf (nicht ausgeblendet/gesperrt; Tester-Profile nur für Tester) */
  const visibleProfile = async (id: string) => {
    if (!UUID.test(id)) return null
    const { data } = await db.from("social_profiles").select("id, name_idx, avatar, hidden, banned, tester").eq("id", id).maybeSingle()
    if (!data) return null
    if (data.id !== myId && (data.hidden || data.banned || (data.tester && !iTest))) return null
    return data as { id: string; name_idx: number; avatar: Avatar; tester: boolean }
  }
  const toPost = (r: FeedRow) => ({
    id: r.id,
    author: { id: r.author, name: nameAt(r.name_idx, en), avatar: r.avatar, ...(r.tester ? { tester: true } : {}) },
    lib: r.lib, days: r.days, decision: r.decision, delta: Number(r.delta), dims: r.dims ?? {},
    createdAt: r.created_at,
    counts: { durchhalten: r.n_durchhalten, hilfreich: r.n_hilfreich },
    mine: r.mine ?? [],
    ...(r.tester ? { tester: true } : {}),
  })
  const feed = async (mode: string, opts: { community?: string; author?: string }, cursor: unknown, limit = PAGE) => {
    const c = parseCursor(cursor)
    if (c === false) return fail("cursor")
    // Offizielle Kolbi-Posts: nur Community, nur erste Seite (Client mischt sie nach Datum ein, neuester oben angepinnt)
    let official: unknown[] | undefined
    if (mode === "community" && !c && opts.community) {
      const today = new Date().toISOString().slice(0, 10)
      const { data: op, error: opErr } = await db.from("official_posts").select("id, publish_on, title_de, body_de, title_en, body_en, icon")
        .eq("community", opts.community).eq("hidden", false).lte("publish_on", today)
        .order("publish_on", { ascending: false }).order("id", { ascending: false }).limit(OFFICIAL_MAX)
      if (opErr) return fail("db", 500)
      official = ((op ?? []) as { id: string; publish_on: string; title_de: string; body_de: string; title_en: string; body_en: string; icon: string | null }[])
        .map(o => ({ id: o.id, date: o.publish_on, title: en ? o.title_en : o.title_de, body: en ? o.body_en : o.body_de, ...(o.icon ? { icon: o.icon } : {}) }))
    }
    // Home-Feed („following“, erste Seite): Kolbi-Posts aus meinen Gruppen der letzten OFFICIAL_HOME_DAYS Tage, mit Community-ID
    if (mode === "following" && !c) {
      const { data: mem, error: memErr } = await db.from("community_members").select("community").eq("profile", myId).limit(100)
      if (memErr) return fail("db", 500)
      const ids = ((mem ?? []) as { community: string }[]).map(m => m.community)
      official = []
      if (ids.length) {
        const now = new Date()
        const today = now.toISOString().slice(0, 10)
        const from = new Date(now.getTime() - OFFICIAL_HOME_DAYS * 86400000).toISOString().slice(0, 10)
        const { data: op, error: opErr } = await db.from("official_posts").select("id, community, publish_on, title_de, body_de, title_en, body_en, icon")
          .in("community", ids).eq("hidden", false).lte("publish_on", today).gte("publish_on", from)
          .order("publish_on", { ascending: false }).order("id", { ascending: false }).limit(OFFICIAL_HOME_MAX)
        if (opErr) return fail("db", 500)
        official = ((op ?? []) as { id: string; community: string; publish_on: string; title_de: string; body_de: string; title_en: string; body_en: string; icon: string | null }[])
          .map(o => ({ id: o.id, community: o.community, date: o.publish_on, title: en ? o.title_en : o.title_de, body: en ? o.body_en : o.body_de, ...(o.icon ? { icon: o.icon } : {}) }))
      }
    }
    const { data, error } = await db.rpc("social_feed_v2", {
      p_me: myId, p_mode: mode, p_community: opts.community ?? null, p_author: opts.author ?? null,
      p_before_ts: c?.ts ?? null, p_before_id: c?.id ?? null, p_limit: limit,
    })
    if (error) return fail("db", 500)
    const rows = (data ?? []) as FeedRow[]
    const last = rows[rows.length - 1]
    return json({ posts: rows.map(toPost), ...(rows.length === limit && last ? { next: `${last.created_at}|${last.id}` } : {}), ...(official ? { official } : {}) })
  }
  const targetId = String(b.id ?? "")

  switch (action) {
    case "updateProfile": {
      const patch: Record<string, unknown> = {}
      if (b.nameIdx !== undefined) {
        const idx = nameIdxOf(b.nameIdx)
        if (idx == null) return fail("name")
        patch.name_idx = idx; patch.handle = nameAt(idx, false)
      }
      if (b.avatar !== undefined) {
        const a = avatarOf(b.avatar)
        if (!a) return fail("avatar")
        patch.avatar = a
      }
      if (!Object.keys(patch).length) return json({ ok: true })
      const { error } = await db.from("social_profiles").update(patch).eq("id", myId)
      return error ? fail("db", 500) : json({ ok: true })
    }

    case "setTester": {
      if (typeof b.on !== "boolean") return fail("on")
      if (b.on === iTest) return json({ ok: true })
      // Einbahnstraße: Ein Testprofil wird nie öffentlich (sonst würden alte Test-Reaktionen/Follows/Mitgliedschaften
      // mitzählen). Aussteigen = Profil löschen.
      if (!b.on) return fail("tester_permanent", 409)
      const { error } = await db.from("social_profiles").update({ tester: b.on }).eq("id", myId)
      return error ? fail("db", 500) : json({ ok: true })
    }

    case "getProfile": {
      const p = await visibleProfile(targetId)
      if (!p) return fail("notfound", 404)
      const isMe = p.id === myId
      let iBlocked = false
      if (!isMe) {
        const { count: theyBlockedMe } = await db.from("social_blocks").select("blocker", { count: "exact", head: true }).eq("blocker", p.id).eq("blocked", myId)
        if ((theyBlockedMe ?? 0) > 0) return fail("notfound", 404)
        const { count: mine } = await db.from("social_blocks").select("blocker", { count: "exact", head: true }).eq("blocker", myId).eq("blocked", p.id)
        iBlocked = (mine ?? 0) > 0
      }
      // Zähler aus meiner Sicht: Tester zählen nur für Tester
      const { data: st, error: stErr } = await db.rpc("social_follow_stats", { p_me: myId, p_profile: p.id })
      if (stErr) return fail("db", 500)
      const stats = (Array.isArray(st) ? st[0] : st) as { followers: number; following: number; is_following: boolean } | null
      let posts: ReturnType<typeof toPost>[] = []
      if (!iBlocked) {
        const { data, error } = await db.rpc("social_feed_v2", { p_me: myId, p_mode: "profile", p_community: null, p_author: p.id, p_before_ts: null, p_before_id: null, p_limit: 50 })
        if (error) return fail("db", 500)
        posts = ((data ?? []) as FeedRow[]).map(toPost)
      }
      return json({
        id: p.id, name: nameAt(p.name_idx, en), avatar: p.avatar, ...(p.tester ? { tester: true } : {}),
        followers: stats?.followers ?? 0, following: stats?.following ?? 0, isFollowing: !isMe && !!stats?.is_following, isMe, posts,
        ...(iBlocked ? { blocked: true } : {}),
      })
    }

    case "follow": {
      const p = await visibleProfile(targetId)
      if (!p || p.id === myId || await blockedEither(p.id)) return fail("notfound", 404)
      const { count } = await db.from("social_follows").select("followee", { count: "exact", head: true }).eq("follower", myId)
      if ((count ?? 0) >= MAX_FOLLOWS) return fail("limit", 429)
      const { error } = await db.from("social_follows").upsert({ follower: myId, followee: p.id }, { onConflict: "follower,followee", ignoreDuplicates: true })
      return error ? fail("db", 500) : json({ ok: true })
    }
    case "unfollow": {
      if (!UUID.test(targetId)) return fail("id")
      await db.from("social_follows").delete().eq("follower", myId).eq("followee", targetId)
      return json({ ok: true })
    }

    case "block": {
      if (!UUID.test(targetId) || targetId === myId) return fail("id")
      const { data: exists } = await db.from("social_profiles").select("id").eq("id", targetId).maybeSingle()
      if (!exists) return fail("notfound", 404)
      const { error } = await db.from("social_blocks").upsert({ blocker: myId, blocked: targetId }, { onConflict: "blocker,blocked", ignoreDuplicates: true })
      if (error) return fail("db", 500)
      await db.from("social_follows").delete().or(`and(follower.eq.${myId},followee.eq.${targetId}),and(follower.eq.${targetId},followee.eq.${myId})`)
      return json({ ok: true })
    }
    case "unblock": {
      if (!UUID.test(targetId)) return fail("id")
      await db.from("social_blocks").delete().eq("blocker", myId).eq("blocked", targetId)
      return json({ ok: true })
    }

    case "feed": {
      const kind = b.kind === "following" ? "following" : b.kind === "discover" ? "discover" : null
      if (!kind) return fail("kind")
      return await feed(kind, {}, b.cursor)
    }
    case "communityFeed": {
      if (!COMMUNITY.test(targetId)) return fail("id")
      return await feed("community", { community: targetId }, b.cursor)
    }

    case "communities": {
      const { data, error } = await db.rpc("social_communities_v2", { p_me: myId })
      if (error) return fail("db", 500)
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      const q = typeof b.query === "string" ? norm(b.query.trim().slice(0, 40)) : ""
      const rows = ((data ?? []) as {
        id: string; kind: string; key: string; name_de: string; name_en: string; members: number; joined: boolean
        featured: number | null; official_id: string | null; official_on: string | null
      }[]).filter(c => !q || [c.key, c.name_de, c.name_en].some(s => norm(s).includes(q)))
      return json({ communities: rows.map(c => ({
        id: c.id, kind: c.kind, key: c.key, name: en ? c.name_en : c.name_de, members: c.members, joined: c.joined,
        ...(c.featured ? { featured: c.featured } : {}),
        ...(c.official_id && c.official_on ? { official: { id: c.official_id, date: c.official_on } } : {}),
      })) })
    }
    case "join": {
      if (!COMMUNITY.test(targetId)) return fail("id")
      const { data: c } = await db.from("communities").select("id").eq("id", targetId).maybeSingle()
      if (!c) return fail("notfound", 404)
      const { count } = await db.from("community_members").select("community", { count: "exact", head: true }).eq("profile", myId)
      if ((count ?? 0) >= MAX_MEMBERSHIPS) return fail("limit", 429)
      const { error } = await db.from("community_members").upsert({ community: targetId, profile: myId }, { onConflict: "community,profile", ignoreDuplicates: true })
      return error ? fail("db", 500) : json({ ok: true })
    }
    case "leave": {
      if (!COMMUNITY.test(targetId)) return fail("id")
      await db.from("community_members").delete().eq("community", targetId).eq("profile", myId)
      return json({ ok: true })
    }

    case "shareResult": {
      // Gleiche Felder wie lab-community (ohne Nebenwirkungen), Peptide/Rx abgelehnt
      const lib = String(b.lib ?? "")
      if (!LIB.test(lib) || PEPTIDES.has(lib)) return fail("lib")
      const { data: lab } = await db.from("communities").select("id").eq("id", `lab-${lib}`).maybeSingle()
      if (!lab) return fail("lib")
      const decision = String(b.decision ?? "")
      if (!DECISIONS.includes(decision)) return fail("decision")
      const dimsIn = (b.dims && typeof b.dims === "object" && !Array.isArray(b.dims) ? b.dims : {}) as Record<string, unknown>
      const dims = Object.fromEntries(Object.entries(dimsIn).filter(([k, v]) => DIMS.has(k) && Number.isFinite(Number(v))).slice(0, 11).map(([k, v]) => [k, r2(clamp(v, -4, 4))]))
      // Erneutes Teilen: gleicher Post (gleiche ID) wird aktualisiert, Reaktionen gelöscht – Meldungen bleiben dran.
      // Ausgeblendet → "hidden"; offene Meldungen → "pending" (erst nach Entscheidung des Inhabers wieder teilbar).
      const { data: res, error } = await db.rpc("social_share", {
        p_me: myId, p_lib: lib, p_days: Math.round(clamp(b.days, 1, 120)), p_decision: decision, p_delta: r2(clamp(b.delta, -4, 4)), p_dims: dims,
      })
      if (error) return fail("db", 500)
      if (res === "ok") return json({ ok: true })
      if (res === "hidden") return fail("hidden", 403)
      if (res === "pending") return fail("pending", 409)
      return fail("busy", 409)
    }

    case "react":
    case "unreact": {
      const post = String(b.post ?? ""), kind = String(b.kind ?? "")
      if (!UUID.test(post)) return fail("post")
      if (!REACTIONS.includes(kind)) return fail("kind")
      if (action === "unreact") {
        await db.from("social_reactions").delete().eq("post", post).eq("profile", myId).eq("kind", kind)
        return json({ ok: true })
      }
      const { data: p } = await db.from("social_posts").select("id, author, hidden, tester").eq("id", post).maybeSingle()
      if (!p || p.hidden || (p.tester && !iTest)) return fail("notfound", 404)
      if (p.author === myId) return fail("own")
      if (!await visibleProfile(p.author) || await blockedEither(p.author)) return fail("notfound", 404)
      const { error } = await db.from("social_reactions").upsert({ post, profile: myId, kind }, { onConflict: "post,profile,kind", ignoreDuplicates: true })
      return error ? fail("db", 500) : json({ ok: true })
    }

    case "report": {
      const type = b.type === "post" ? "post" : b.type === "profile" ? "profile" : null
      const reason = String(b.reason ?? "")
      if (!type) return fail("type")
      if (!REASONS.includes(reason)) return fail("reason")
      if (!UUID.test(targetId) || targetId === myId) return fail("id")
      let author = targetId, postAt = ""
      if (type === "post") {
        const { data: p } = await db.from("social_posts").select("author, created_at").eq("id", targetId).maybeSingle()
        if (!p) return fail("notfound", 404)
        if (p.author === myId) return fail("own")
        author = p.author; postAt = p.created_at
      } else {
        const { data: p } = await db.from("social_profiles").select("id").eq("id", targetId).maybeSingle()
        if (!p) return fail("notfound", 404)
      }
      const { count } = await db.from("social_reports").select("id", { count: "exact", head: true })
        .eq("reporter", myId).gte("created_at", new Date(Date.now() - 86400_000).toISOString())
      if ((count ?? 0) >= REPORTS_PER_DAY) return fail("rate", 429)
      const { data: prev } = await db.from("social_reports").select("id, status, decided_at")
        .eq("reporter", myId).eq("target_type", type).eq("target_id", targetId).maybeSingle()
      if (prev) {
        // Schon gemeldet. Nur wenn der Inhaber „bleibt“ entschieden hat und der Post seitdem neu geteilt wurde
        // (gleiche ID, neuer Inhalt), wird die Meldung wieder offen.
        if (type === "post" && prev.status === "kept" && prev.decided_at && Date.parse(postAt) > Date.parse(prev.decided_at)) {
          const { error } = await db.from("social_reports").update({
            status: "open", reason, target_author: author, created_at: new Date().toISOString(), decided_at: null, note: null,
          }).eq("id", prev.id)
          if (error) return fail("db", 500)
        }
        return json({ ok: true })
      }
      const { error } = await db.from("social_reports").upsert(
        { reporter: myId, target_type: type, target_id: targetId, target_author: author, reason },
        { onConflict: "reporter,target_type,target_id", ignoreDuplicates: true })
      return error ? fail("db", 500) : json({ ok: true })
    }
  }
  return fail("action")
})
