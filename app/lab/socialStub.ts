// ── TEMPORÄR: Platzhalter für lib/labSocialApi.ts (wird parallel von „Logik“ gebaut) ─────────────
// EINZIGE Import-Stelle der UI für Social S2. Sobald lib/labSocialApi.ts existiert, diese Datei ersetzen durch:
//   export * from "@/lib/labSocialApi"
// Bis dahin: gleiche Signaturen, alles liefert null/leer (= ehrlicher „offline“-Zustand in der UI).
// Nur für Tests: Ein Testskript kann window.__LAB_SOCIAL_MOCK__ setzen (gleiche Funktionsnamen) – im Produkt nie gesetzt.
import type { LabState } from "@/lib/supplementLab"
import type { LabAvatar } from "@/lib/labSocial"

export type ReactionKind = "durchhalten" | "hilfreich"
export type ReportReason = "spam" | "beleidigung" | "gesundheitsversprechen" | "sonstiges"
export interface SocialAuthor { id: string; name: string; avatar: LabAvatar | null }
export interface SocialPost {
  id: string; author: SocialAuthor; lib: string; days: number; decision: "keep" | "maybe" | "drop"
  delta: number; dims: Record<string, number>; createdAt: string
  counts: { durchhalten: number; hilfreich: number }; mine: ReactionKind[]
}
export interface SocialProfile {
  id: string; name: string; avatar: LabAvatar | null; followers: number; following: number
  isFollowing: boolean; isMe: boolean; posts: SocialPost[]
}
export interface SocialPage { posts: SocialPost[]; next?: string }
export interface SocialCommunity { id: string; kind: "lab" | "goal"; key: string; name: string; members: number; joined: boolean }
export interface SocialAccount { id: string }

type Mock = Partial<Record<string, (...a: unknown[]) => unknown>>
const mock = (): Mock | undefined => typeof window === "undefined" ? undefined : (window as { __LAB_SOCIAL_MOCK__?: Mock }).__LAB_SOCIAL_MOCK__
async function call<T>(name: string, ...args: unknown[]): Promise<T | null> {
  const f = mock()?.[name]
  if (!f) return null
  try { return (await f(...args)) as T } catch { return null }
}

const CONSENT_KEY = "lab-social-consent"
export function socialConsent(): boolean {
  const f = mock()?.socialConsent
  if (f) return !!f()
  try { return localStorage.getItem(CONSENT_KEY) === "1" } catch { return false }
}
export function setSocialConsent(v: boolean): void {
  try { if (v) localStorage.setItem(CONSENT_KEY, "1"); else localStorage.removeItem(CONSENT_KEY) } catch {}
  mock()?.setSocialConsent?.(v)
}

export const ensureAccount = () => call<SocialAccount>("ensureAccount")
export const updateProfile = (p: { nameSeed?: string; avatar?: LabAvatar }) => call<boolean>("updateProfile", p)
export const getProfile = (id: string) => call<SocialProfile>("getProfile", id)
export const follow = (id: string) => call<boolean>("follow", id)
export const unfollow = (id: string) => call<boolean>("unfollow", id)
export const feed = (kind: "following" | "discover", cursor?: string) => call<SocialPage>("feed", kind, cursor)
export const react = (postId: string, kind: ReactionKind) => call<boolean>("react", postId, kind)
export const unreact = (postId: string, kind: ReactionKind) => call<boolean>("unreact", postId, kind)
export const shareResultPost = (s: LabState, suppId: string) => call<SocialPost | boolean>("shareResultPost", s, suppId)
export const communities = (query?: string) => call<SocialCommunity[]>("communities", query)
export const join = (id: string) => call<boolean>("join", id)
export const leave = (id: string) => call<boolean>("leave", id)
export const communityFeed = (id: string, cursor?: string) => call<SocialPage>("communityFeed", id, cursor)
export const report = (target: { type: "post" | "profile"; id: string }, reason: ReportReason) => call<boolean>("report", target, reason)
export const block = (id: string) => call<boolean>("block", id)
export const unblock = (id: string) => call<boolean>("unblock", id)
export const deleteAccount = () => call<boolean>("deleteAccount")
