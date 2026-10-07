// Supplement Lab · Kolbi Social Stufe 2 („sicher zuerst“): pseudonyme Profile, Folgen, Ergebnis-Posts,
// zwei feste Reaktionen, offizielle Communities, Melden/Blockieren.
// KEIN Freitext, KEINE Bilder, KEINE Peptide/Rx, keine Geräte-IDs/IPs/E-Mail.
//
// Anmeldung: Gerät erzeugt ein zufälliges 32-Byte-Geheimnis (64 hex). Der Server speichert nur SHA-256 davon.
//   Header  x-social-id: <Profil-UUID>   x-social-secret: <64 hex>
// POST {action, lang?, ...}
//   ensure {nameIdx?, avatar?}           → {id, name, avatar, restricted?}   (legt beim ersten Mal an; id-Header optional)
//   updateProfile {nameIdx?, avatar?}    → {ok}
//   getProfile {id}                      → {id, name, avatar, followers, following, isFollowing, isMe, posts, blocked?}
//   follow|unfollow|block|unblock {id}   → {ok}
//   feed {kind: following|discover, cursor?}  ·  communityFeed {id, cursor?}  → {posts, next?}
//   communities {query?}                 → {communities: [{id, kind, key, name, members, joined}]}
//   join|leave {id}                      → {ok}
//   shareResult {lib, days, decision, delta, dims}  → {ok}
//   react|unreact {post, kind}           → {ok}
//   report {type: post|profile, id, reason}          → {ok}
//   deleteAccount                        → {ok}   (löscht ALLES des Profils)
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
const NEW_PROFILES_PER_HOUR = 300 // grobe Bremse gegen Massen-Anlage (keine IPs gespeichert)
const MAX_FOLLOWS = 2000, MAX_MEMBERSHIPS = 100, PAGE = 20

// ── Validierung ──────────────────────────────────────────────────────────────
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const SECRET = /^[a-f0-9]{64}$/, LIB = /^[a-z0-9-]{2,40}$/, COMMUNITY = /^(lab|goal)-[a-z0-9-]{2,40}$/
const PEPTIDES = new Set(["bpc157", "tb500", "ghkcu", "cjc-ipa", "semax", "selank", "motsc", "epitalon", "ta1", "kpv", "glp1"])
const DIMS = new Set(["energie", "fokus", "stimmung", "ruhe", "schlaf", "koerper", "verdauung", "appetit", "haut", "gelenke", "libido"])
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

interface Me { id: string; name_idx: number; avatar: Avatar; hidden: boolean; banned: boolean; last_seen_on: string }
interface FeedRow {
  id: string; author: string; name_idx: number; avatar: Avatar; lib: string; days: number; decision: string; delta: number | string
  dims: Record<string, number>; created_at: string; n_durchhalten: number; n_hilfreich: number; mine: string[]
}

const WRITES = new Set(["updateProfile", "follow", "unfollow", "shareResult", "react", "unreact", "report", "block", "unblock", "join", "leave"])
const READS = new Set(["getProfile", "feed", "communityFeed", "communities"])

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (req.method !== "POST") return fail("method", 405)
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return fail("json") }
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
  const ME_COLS = "id, name_idx, avatar, hidden, banned, last_seen_on"
  const { data: meRow, error: meErr } = await db.from("social_profiles").select(ME_COLS).eq("secret_hash", hash).maybeSingle()
  if (meErr) return fail("db", 500)
  let me = meRow as Me | null
  if (me && hdrId && me.id !== hdrId) return fail("auth", 401)

  // ── ensure: anmelden oder (erstes Mal) anlegen ─────────────────────────────
  if (action === "ensure") {
    if (!me) {
      if (hdrId) return fail("auth", 401) // Profil gelöscht oder Geheimnis passt nicht → Client fängt neu an
      const { count } = await db.from("social_profiles").select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 3600_000).toISOString())
      if ((count ?? 0) >= NEW_PROFILES_PER_HOUR) return fail("busy", 429)
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
    return json({ id: me.id, name: nameAt(me.name_idx, en), avatar: me.avatar, ...(me.banned ? { restricted: true } : {}) })
  }

  if (!me) return fail("auth", 401)
  const myId = me.id
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
  /** Fremdes Profil, das ich sehen darf (nicht ausgeblendet/gesperrt, keine Blockierung) */
  const visibleProfile = async (id: string) => {
    if (!UUID.test(id)) return null
    const { data } = await db.from("social_profiles").select("id, name_idx, avatar, hidden, banned").eq("id", id).maybeSingle()
    if (!data) return null
    if (data.id !== myId && (data.hidden || data.banned)) return null
    return data as { id: string; name_idx: number; avatar: Avatar }
  }
  const toPost = (r: FeedRow) => ({
    id: r.id,
    author: { id: r.author, name: nameAt(r.name_idx, en), avatar: r.avatar },
    lib: r.lib, days: r.days, decision: r.decision, delta: Number(r.delta), dims: r.dims ?? {},
    createdAt: r.created_at,
    counts: { durchhalten: r.n_durchhalten, hilfreich: r.n_hilfreich },
    mine: r.mine ?? [],
  })
  const feed = async (mode: string, opts: { community?: string; author?: string }, cursor: unknown, limit = PAGE) => {
    const c = parseCursor(cursor)
    if (c === false) return fail("cursor")
    const { data, error } = await db.rpc("social_feed", {
      p_me: myId, p_mode: mode, p_community: opts.community ?? null, p_author: opts.author ?? null,
      p_before_ts: c?.ts ?? null, p_before_id: c?.id ?? null, p_limit: limit,
    })
    if (error) return fail("db", 500)
    const rows = (data ?? []) as FeedRow[]
    const last = rows[rows.length - 1]
    return json({ posts: rows.map(toPost), ...(rows.length === limit && last ? { next: `${last.created_at}|${last.id}` } : {}) })
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
      const [followers, following, isFollowing] = await Promise.all([
        db.from("social_follows").select("follower", { count: "exact", head: true }).eq("followee", p.id),
        db.from("social_follows").select("follower", { count: "exact", head: true }).eq("follower", p.id),
        isMe ? Promise.resolve({ count: 0 }) : db.from("social_follows").select("follower", { count: "exact", head: true }).eq("follower", myId).eq("followee", p.id),
      ])
      let posts: ReturnType<typeof toPost>[] = []
      if (!iBlocked) {
        const { data, error } = await db.rpc("social_feed", { p_me: myId, p_mode: "profile", p_community: null, p_author: p.id, p_before_ts: null, p_before_id: null, p_limit: 50 })
        if (error) return fail("db", 500)
        posts = ((data ?? []) as FeedRow[]).map(toPost)
      }
      return json({
        id: p.id, name: nameAt(p.name_idx, en), avatar: p.avatar,
        followers: followers.count ?? 0, following: following.count ?? 0, isFollowing: (isFollowing.count ?? 0) > 0, isMe, posts,
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
      const { data, error } = await db.rpc("social_communities", { p_me: myId })
      if (error) return fail("db", 500)
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      const q = typeof b.query === "string" ? norm(b.query.trim().slice(0, 40)) : ""
      const rows = ((data ?? []) as { id: string; kind: string; key: string; name_de: string; name_en: string; members: number; joined: boolean }[])
        .filter(c => !q || [c.key, c.name_de, c.name_en].some(s => norm(s).includes(q)))
      return json({ communities: rows.map(c => ({ id: c.id, kind: c.kind, key: c.key, name: en ? c.name_en : c.name_de, members: c.members, joined: c.joined })) })
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
      const row = { author: myId, kind: "result", lib, days: Math.round(clamp(b.days, 1, 120)), decision, delta: r2(clamp(b.delta, -4, 4)), dims }
      const { data: old } = await db.from("social_posts").select("id, hidden").eq("author", myId).eq("lib", lib).maybeSingle()
      if (old?.hidden) return fail("hidden", 403) // vom Inhaber ausgeblendet → nicht durch Neu-Teilen umgehen
      if (old) await db.from("social_posts").delete().eq("id", old.id) // neues Ergebnis ersetzt altes (inkl. Reaktionen)
      const { error } = await db.from("social_posts").insert(row)
      return error ? fail("db", 500) : json({ ok: true })
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
      const { data: p } = await db.from("social_posts").select("id, author, hidden").eq("id", post).maybeSingle()
      if (!p || p.hidden) return fail("notfound", 404)
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
      if (type === "post") {
        const { data: p } = await db.from("social_posts").select("author").eq("id", targetId).maybeSingle()
        if (!p) return fail("notfound", 404)
        if (p.author === myId) return fail("own")
      } else {
        const { data: p } = await db.from("social_profiles").select("id").eq("id", targetId).maybeSingle()
        if (!p) return fail("notfound", 404)
      }
      const { count } = await db.from("social_reports").select("id", { count: "exact", head: true })
        .eq("reporter", myId).gte("created_at", new Date(Date.now() - 86400_000).toISOString())
      if ((count ?? 0) >= REPORTS_PER_DAY) return fail("rate", 429)
      const { error } = await db.from("social_reports").upsert(
        { reporter: myId, target_type: type, target_id: targetId, reason },
        { onConflict: "reporter,target_type,target_id", ignoreDuplicates: true })
      return error ? fail("db", 500) : json({ ok: true })
    }
  }
  return fail("action")
})
