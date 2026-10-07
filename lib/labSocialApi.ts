// ── Kolbi Social S2: Client für die Edge Function „lab-social“ ────────────────────────────────
// Sicher zuerst (PLAN.md 6. Okt 2026): kein Freitext, keine Bilder, keine Peptide, nur pseudonyme Daten.
// Konto ohne E-Mail: zufälliges 32-Byte-Geheimnis auf dem Gerät (der Server kennt nur dessen SHA-256).
// An den Server gehen nur: Position des Pseudonyms in der Wortliste (nie der lokale Startwert), Avatar-Auswahl,
// strukturierte Ergebnisse (Supplement-ID, Tage, Urteil, ±★ gesamt/je Bereich), Folgen, Reaktionen, Meldungen.
// Alle Aufrufe nur mit Einwilligung (socialConsent). Netzwerk-/Serverfehler → null bzw. false, nie eine Ausnahme.
import { GOAL_BY_ID, LIB_BY_ID, type GoalId, type LabState } from "./supplementLab"
import { communityPayload } from "./labCommunity"
import {
  AVATAR_ACCESSORIES, AVATAR_COLORS, AVATAR_MOODS, DEFAULT_AVATAR, loadAvatar, pseudoSeed, pseudonymIndex, type LabAvatar,
} from "./labSocial"
import { LANG } from "./labI18n"

const URL_ = "https://mkdfohmshuuiroeruyyz.supabase.co/functions/v1/lab-social"
const CONSENT_KEY = "lab-social-consent"
const SECRET_KEY = "lab-social-secret"
const ID_KEY = "lab-social-id"
const SECRET_RE = /^[a-f0-9]{64}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** Nie teilen (auch wenn die Bibliothek sie im Web noch kennt) – der Server lehnt sie ebenfalls ab. */
const BLOCKED_LIBS = new Set(["bpc157", "tb500", "ghkcu", "cjc-ipa", "semax", "selank", "motsc", "epitalon", "ta1", "kpv", "glp1"])

// ── Typen (Vertrag mit der Oberfläche) ────────────────────────────────────────
export type Avatar = LabAvatar
export type ReactionKind = "durchhalten" | "hilfreich"
export type ReportReason = "spam" | "beleidigung" | "gesundheitsversprechen" | "sonstiges"
export interface SocialAuthor { id: string; name: string; avatar: Avatar }
export interface Post {
  id: string; author: SocialAuthor; lib: string; days: number; decision: "keep" | "maybe" | "drop"
  delta: number; dims: Record<string, number>; createdAt: string
  counts: { durchhalten: number; hilfreich: number }; mine: ReactionKind[]
}
export type SocialPost = Post
export interface SocialProfile {
  id: string; name: string; avatar: Avatar; followers: number; following: number
  isFollowing: boolean; isMe: boolean; posts: Post[]
  /** nur für mich sichtbar: ich habe dieses Profil blockiert (dann keine Posts) */
  blocked?: boolean
}
export interface SocialPage { posts: Post[]; next?: string }
export interface SocialCommunity { id: string; kind: "lab" | "goal"; key: string; name: string; members: number; joined: boolean }
export interface SocialAccount {
  id: string; name: string; avatar: Avatar
  /** vom Betreiber gesperrt: nur noch Konto löschen möglich */
  restricted?: boolean
}

// ── Einwilligung ──────────────────────────────────────────────────────────────
export function socialConsent(): boolean {
  try { return localStorage.getItem(CONSENT_KEY) === "1" } catch { return false }
}
export function setSocialConsent(v: boolean): void {
  try { if (v) localStorage.setItem(CONSENT_KEY, "1"); else localStorage.removeItem(CONSENT_KEY) } catch { /* privat/voll */ }
  if (!v) accountP = null
}

// ── Gerät: Geheimnis + Profil-ID ──────────────────────────────────────────────
function get(k: string): string | null { try { return localStorage.getItem(k) } catch { return null } }
function set(k: string, v: string | null) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* privat/voll */ } }

function secret(): string | null {
  let s = get(SECRET_KEY)
  if (s && SECRET_RE.test(s)) return s
  try {
    const b = new Uint8Array(32); crypto.getRandomValues(b)
    s = Array.from(b, x => x.toString(16).padStart(2, "0")).join("")
  } catch { return null }
  set(SECRET_KEY, s)
  return get(SECRET_KEY) === s ? s : null // ohne Speicher kein Konto (sonst entstünden Waisen-Profile)
}

// ── Antworten prüfen (lieber „keine Daten“ als ein Absturz) ──────────────────
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d)

function avatarOf(v: unknown): Avatar {
  const o = isObj(v) ? v : {}
  return {
    color: AVATAR_COLORS.some(c => c.id === o.color) ? o.color as string : DEFAULT_AVATAR.color,
    accessory: AVATAR_ACCESSORIES.some(a => a.id === o.accessory) ? o.accessory as Avatar["accessory"] : DEFAULT_AVATAR.accessory,
    mood: AVATAR_MOODS.some(m => m.id === o.mood) ? o.mood as Avatar["mood"] : DEFAULT_AVATAR.mood,
  }
}
function authorOf(v: unknown): SocialAuthor | null {
  if (!isObj(v) || typeof v.id !== "string" || typeof v.name !== "string") return null
  return { id: v.id, name: v.name, avatar: avatarOf(v.avatar) }
}
function postOf(v: unknown): Post | null {
  if (!isObj(v) || typeof v.id !== "string" || typeof v.lib !== "string" || typeof v.createdAt !== "string") return null
  const author = authorOf(v.author)
  const decision = v.decision === "keep" || v.decision === "maybe" || v.decision === "drop" ? v.decision : null
  if (!author || !decision) return null
  const dims: Record<string, number> = {}
  if (isObj(v.dims)) for (const [k, x] of Object.entries(v.dims)) if (typeof x === "number" && Number.isFinite(x)) dims[k] = x
  const c = isObj(v.counts) ? v.counts : {}
  return {
    id: v.id, author, lib: v.lib, days: num(v.days), decision, delta: num(v.delta), dims, createdAt: v.createdAt,
    counts: { durchhalten: num(c.durchhalten), hilfreich: num(c.hilfreich) },
    mine: (Array.isArray(v.mine) ? v.mine : []).filter((k): k is ReactionKind => k === "durchhalten" || k === "hilfreich"),
  }
}
const postsOf = (v: unknown): Post[] => (Array.isArray(v) ? v : []).map(postOf).filter((p): p is Post => !!p)
function pageOf(v: unknown): SocialPage | null {
  if (!isObj(v) || !Array.isArray(v.posts)) return null
  return { posts: postsOf(v.posts), ...(typeof v.next === "string" && v.next ? { next: v.next } : {}) }
}

// ── Transport ─────────────────────────────────────────────────────────────────
type Res = { status: number; body: unknown } | null
async function send(action: string, body: Record<string, unknown> = {}, withId = true, needConsent = true): Promise<Res> {
  if (needConsent && !socialConsent()) return null
  const s = secret()
  if (!s) return null
  const id = withId ? get(ID_KEY) : null
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-social-secret": s }
  if (id && UUID_RE.test(id)) headers["x-social-id"] = id
  try {
    const res = await fetch(URL_, { method: "POST", headers, body: JSON.stringify({ action, lang: LANG, ...body }) })
    let parsed: unknown = null
    try { parsed = await res.json() } catch { parsed = null }
    return { status: res.status, body: parsed }
  } catch { return null }
}

let accountP: Promise<SocialAccount | null> | null = null

/** Konto anmelden bzw. beim ersten Mal anlegen (mit aktuellem Pseudonym + Avatar). Pro Sitzung einmal. */
export function ensureAccount(): Promise<SocialAccount | null> {
  if (!socialConsent()) return Promise.resolve(null)
  if (!accountP) {
    accountP = (async () => {
      const first = { nameIdx: pseudonymIndex(pseudoSeed()), avatar: loadAvatar() ?? DEFAULT_AVATAR }
      let r = await send("ensure", first)
      if (r?.status === 401 && get(ID_KEY)) {
        // Profil gibt es nicht mehr (gelöscht) → neu anfangen, mit neuem Geheimnis
        set(ID_KEY, null); set(SECRET_KEY, null)
        r = await send("ensure", first, false)
      }
      const b = r?.status === 200 && isObj(r.body) ? r.body : null
      if (!b || typeof b.id !== "string" || !UUID_RE.test(b.id) || typeof b.name !== "string") return null
      set(ID_KEY, b.id)
      return { id: b.id, name: b.name, avatar: avatarOf(b.avatar), ...(b.restricted ? { restricted: true } : {}) }
    })()
    accountP.then(a => { if (!a) accountP = null }, () => { accountP = null })
  }
  return accountP
}

/** Aktion mit Konto: erst ensureAccount, dann senden. */
async function authed(action: string, body: Record<string, unknown> = {}): Promise<Res> {
  const acc = await ensureAccount()
  if (!acc) return null
  const r = await send(action, body)
  if (r?.status === 401) accountP = null // beim nächsten Mal neu anmelden
  return r
}
const ok = (r: Res) => r?.status === 200 && isObj(r.body) && r.body.ok === true

// ── Profil ────────────────────────────────────────────────────────────────────
/** Neues Pseudonym (aus dem lokalen Startwert – gesendet wird nur die Position in der Wortliste) und/oder Avatar. */
export async function updateProfile(p: { nameSeed?: string; avatar?: Avatar }): Promise<boolean> {
  const body: Record<string, unknown> = {}
  if (typeof p.nameSeed === "string" && p.nameSeed) body.nameIdx = pseudonymIndex(p.nameSeed)
  if (p.avatar) body.avatar = avatarOf(p.avatar)
  const r = await authed("updateProfile", body)
  if (ok(r)) { accountP = null; return true } // nächstes ensureAccount liefert den neuen Namen
  return false
}

export async function getProfile(id: string): Promise<SocialProfile | null> {
  if (!UUID_RE.test(id)) return null
  const r = await authed("getProfile", { id })
  const b = r?.status === 200 && isObj(r.body) ? r.body : null
  if (!b || typeof b.id !== "string" || typeof b.name !== "string") return null
  return {
    id: b.id, name: b.name, avatar: avatarOf(b.avatar), followers: num(b.followers), following: num(b.following),
    isFollowing: b.isFollowing === true, isMe: b.isMe === true, posts: postsOf(b.posts), ...(b.blocked ? { blocked: true } : {}),
  }
}

export const follow = async (id: string) => UUID_RE.test(id) && ok(await authed("follow", { id }))
export const unfollow = async (id: string) => UUID_RE.test(id) && ok(await authed("unfollow", { id }))
export const block = async (id: string) => UUID_RE.test(id) && ok(await authed("block", { id }))
export const unblock = async (id: string) => UUID_RE.test(id) && ok(await authed("unblock", { id }))

// ── Feeds (chronologisch, kein Ranking) ───────────────────────────────────────
export async function feed(kind: "following" | "discover", cursor?: string): Promise<SocialPage | null> {
  if (kind !== "following" && kind !== "discover") return null
  const r = await authed("feed", { kind, ...(cursor ? { cursor } : {}) })
  return r?.status === 200 ? pageOf(r.body) : null
}
export async function communityFeed(id: string, cursor?: string): Promise<SocialPage | null> {
  const r = await authed("communityFeed", { id, ...(cursor ? { cursor } : {}) })
  return r?.status === 200 ? pageOf(r.body) : null
}

// ── Reaktionen ────────────────────────────────────────────────────────────────
const KIND_OK = (k: string) => k === "durchhalten" || k === "hilfreich"
export const react = async (postId: string, kind: ReactionKind) => UUID_RE.test(postId) && KIND_OK(kind) && ok(await authed("react", { post: postId, kind }))
export const unreact = async (postId: string, kind: ReactionKind) => UUID_RE.test(postId) && KIND_OK(kind) && ok(await authed("unreact", { post: postId, kind }))

// ── Ergebnis teilen (gleiche Felder wie die anonyme Community, ohne Nebenwirkungen) ──
/** Was ginge als Post raus? null = nicht teilbar (kein Ergebnis, Peptid/Rx, eigene Substanz). */
export function resultPostPayload(s: LabState, suppId: string) {
  const p = communityPayload(s, suppId)
  if (!p) return null
  const lib = LIB_BY_ID[p.lib]
  if (!lib || BLOCKED_LIBS.has(p.lib) || lib.rx || lib.category === "Peptide" || lib.category === "Verschriebene Medikamente") return null
  return { lib: p.lib, days: p.days, decision: p.decision, delta: p.delta, dims: p.dims }
}
export async function shareResultPost(s: LabState, suppId: string): Promise<boolean> {
  const p = resultPostPayload(s, suppId)
  if (!p) return false
  return ok(await authed("shareResult", p))
}

// ── Communities (nur vordefiniert: Labs + Ziele) ─────────────────────────────
export async function communities(query?: string): Promise<SocialCommunity[] | null> {
  const r = await authed("communities", typeof query === "string" && query.trim() ? { query: query.trim().slice(0, 40) } : {})
  const list = r?.status === 200 && isObj(r.body) && Array.isArray(r.body.communities) ? r.body.communities : null
  if (!list) return null
  return list.flatMap((c: unknown): SocialCommunity[] => {
    if (!isObj(c) || typeof c.id !== "string" || typeof c.key !== "string" || (c.kind !== "lab" && c.kind !== "goal")) return []
    // Anzeigename lokal (gleiche Übersetzung wie überall in der App), sonst der vom Server
    const local = c.kind === "lab" ? LIB_BY_ID[c.key]?.name : GOAL_BY_ID[c.key as GoalId]?.label
    if (c.kind === "lab" && !LIB_BY_ID[c.key]) return [] // in dieser App-Version unbekannt
    return [{ id: c.id, kind: c.kind, key: c.key, name: local ?? (typeof c.name === "string" ? c.name : c.key), members: num(c.members), joined: c.joined === true }]
  })
}
export const join = async (id: string) => ok(await authed("join", { id }))
export const leave = async (id: string) => ok(await authed("leave", { id }))

// ── Melden (sieht nur der Betreiber) ─────────────────────────────────────────
const REASONS: ReportReason[] = ["spam", "beleidigung", "gesundheitsversprechen", "sonstiges"]
export async function report(target: { type: "post" | "profile"; id: string }, reason: ReportReason): Promise<boolean> {
  if (!target || (target.type !== "post" && target.type !== "profile") || !UUID_RE.test(target.id) || !REASONS.includes(reason)) return false
  return ok(await authed("report", { type: target.type, id: target.id, reason }))
}

// ── Konto löschen: alles auf dem Server, dann Geheimnis/ID/Einwilligung auf dem Gerät ──
// Geht auch ohne (bzw. nach widerrufener) Einwilligung – Löschen muss immer möglich sein.
export async function deleteAccount(): Promise<boolean> {
  const clear = () => { set(ID_KEY, null); set(SECRET_KEY, null); setSocialConsent(false) }
  const s = get(SECRET_KEY)
  if (!s || !SECRET_RE.test(s)) { clear(); return true } // nie ein Konto angelegt
  // nur mit Geheimnis (ohne ID-Header): 401 heißt dann sicher „zu diesem Geheimnis gibt es nichts (mehr)“
  const r = await send("deleteAccount", {}, false, false)
  const done = ok(r) || r?.status === 401
  if (done) clear()
  return done
}
