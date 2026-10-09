"use client"
// ── Kolbi Social S2: Einwilligung, Ergebnis-Posts, Profile, Folgen, Communities, Melden/Blockieren ──
// „Sicher zuerst“: kein Freitext, keine Bilder – nur strukturierte Ergebnisse, Pseudonym und Kolbi-Avatar.
// Lese-Flächen neutral (Grafit/Weiß), Lab-/Ziel-Farben nur als Akzent, Grün→Blau nur für „Selbst testen“.
// Server-Aufrufe ausschließlich über lib/labSocialApi (Edge Function „lab-social“).
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { DIMS, GOALS, LIB_BY_ID, type LabState, type LibSupp } from "@/lib/supplementLab"
import { AVATAR_ACCESSORIES, AVATAR_COLORS, AVATAR_MOODS, DEFAULT_AVATAR, LAB_GROUPS, avatarColorBg, labColor, loadAvatar, pseudoSeed, pseudonym, type LabAvatar, type LabGroup } from "@/lib/labSocial"
import { SITE_URL, appVersion } from "@/lib/labGrow"
import { markSeen } from "@/lib/labNew"
import * as api from "@/lib/labSocialApi"
import type { OfficialPost, ReactionKind, ReportReason, SocialCommunity, SocialPage, SocialPost, SocialProfile } from "@/lib/labSocialApi"
import { Btn, Icon, Sheet, SuppIcon, TabHead, haptic } from "./ui"
import { Mascot } from "./mascot"
import { NewBadge } from "./newbadge"
import { t, dec, isEn, LOCALE } from "@/lib/labI18n"

// ═══ Kleiner Zustand (Modul): Einwilligung, Navigation, Ausgeblendetes, Blockierte ═══════════════════
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

let flashFn: (m: string) => void = () => {}
const flash = (m: string) => flashFn(m)
const OFFLINE = () => t("Gerade keine Verbindung – versuch es gleich nochmal.")

/** Sichtbar mitmachen? (Einwilligung, live) */
export function useSocialOn(): boolean {
  return useSyncExternalStore(subscribe, api.socialConsent, () => false)
}

// Gibt es auf diesem Gerät ein Social-Konto? (Profil-ID von lib/labSocialApi) → Löschen auch nach „Aus“ anbieten
const hadAccount = () => { try { return !!localStorage.getItem("lab-social-id") } catch { return false } }
let myId: string | null = null
let restricted = false

// Entscheidungen der Moderation über eigene Posts/das eigene Profil (kommen mit dem Konto, lib/labSocialApi)
export type ModDecision = { target: "post" | "profile"; action: "hidden" | "banned"; lib?: string; note: string; at: string }
let decisions: ModDecision[] = []
function decisionsOf(v: unknown): ModDecision[] {
  if (!Array.isArray(v)) return []
  return v.flatMap((d): ModDecision[] => {
    if (!d || typeof d !== "object") return []
    const o = d as Record<string, unknown>
    if ((o.target !== "post" && o.target !== "profile") || (o.action !== "hidden" && o.action !== "banned") || typeof o.at !== "string" || !Number.isFinite(Date.parse(o.at))) return []
    return [{ target: o.target, action: o.action, ...(typeof o.lib === "string" && o.lib ? { lib: o.lib } : {}), note: typeof o.note === "string" ? o.note.trim().slice(0, 400) : "", at: o.at }]
  }).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 50)
}
const DEC_SEEN_KEY = "lab-social-decisions-seen"
const decSeen = (): number => { try { return Number(localStorage.getItem(DEC_SEEN_KEY)) || 0 } catch { return 0 } }
const markDecSeen = (list: ModDecision[]) => { try { const m = Math.max(decSeen(), ...list.map(d => Date.parse(d.at))); localStorage.setItem(DEC_SEEN_KEY, String(m)) } catch {} }
const useDecisions = () => useSyncExternalStore(subscribe, () => decisions, () => [] as ModDecision[])
// Sperre kann über das Profil oder über einen gemeldeten Post kommen → jede „banned“-Entscheidung zählt (neueste zuerst)
const banReason = () => decisions.find(d => d.action === "banned")?.note ?? ""

/** Eigenes Konto (legt es bei Einwilligung an). null = offline/keine Einwilligung. */
export async function ensureMe(): Promise<string | null> {
  if (myId) return myId
  if (!api.socialConsent()) return null
  const a = await api.ensureAccount()
  myId = a?.id ?? null
  if (a && !!a.restricted !== restricted) restricted = !!a.restricted
  if (a) decisions = decisionsOf((a as { decisions?: unknown }).decisions)
  if (a) await api.syncTester() // Testmodus: Wunsch auf dem Gerät → Server (bevor Feeds laden)
  if (myId) emit()
  return myId
}
/** Vom Betreiber gesperrt → nur noch „Konto löschen“. */
const useRestricted = () => useSyncExternalStore(subscribe, () => restricted, () => false)
/** Ist gerade ein Social-Sheet (Einwilligung/Posten-Vorschau) offen? → andere Sheets warten. */
export function useSocialSheetOpen(): boolean {
  return useSyncExternalStore(subscribe, () => !!ask || !!postFor, () => false)
}
/** Zurücksetzen ohne Verbindung: nur pausieren – Geheimnis + Profil-ID bleiben, damit späteres Löschen geht. */
export function pauseSocial() {
  api.setSocialConsent(false)
  myId = null
  nav = []
  emit()
}
const publicAvatar = (): LabAvatar => loadAvatar() ?? DEFAULT_AVATAR
/** Pseudonym/Avatar geändert → öffentliches Profil nachziehen (nur mit Einwilligung). */
export function syncPublicProfile() {
  if (!api.socialConsent()) return
  void ensureMe().then(id => { if (id) void api.updateProfile({ nameSeed: pseudoSeed(), avatar: publicAvatar() }) })
}

// Einwilligung erfragen: danach (nur bei Ja) `then` ausführen
let ask: { then?: () => void } | null = null
export function askSocial(then?: () => void) {
  if (api.socialConsent()) { then?.(); return }
  ask = { then }; emit()
}

// Navigation: Profil-/Community-Seiten legen sich über den aktuellen Reiter
export type SocialView = { kind: "profile"; id: string } | { kind: "community"; id: string; c?: SocialCommunity }
let nav: SocialView[] = []
export function openSocial(v: SocialView) { haptic(); nav = [...nav, v]; emit(); try { window.scrollTo({ top: 0 }) } catch {} }
export function backSocial() { nav = nav.slice(0, -1); emit(); try { window.scrollTo({ top: 0 }) } catch {} }
export function clearSocial() { if (nav.length) { nav = []; emit() } }
export function useSocialView(): SocialView | null {
  return useSyncExternalStore(subscribe, () => nav[nav.length - 1] ?? null, () => null)
}

// Ergebnis posten (nach Einwilligung → Vorschau)
let postFor: string | null = null
export function startPost(suppId: string) { askSocial(() => { postFor = suppId; emit() }) }

// Gemeldete Posts + blockierte Profile sofort ausblenden; Blockierte lokal merken (Liste in den Einstellungen)
type Blocked = { id: string; name: string; avatar: LabAvatar | null }
const BLOCK_KEY = "lab-social-blocked"
const hiddenPosts = new Set<string>()
let blockedCache: Blocked[] | null = null
function blockedList(): Blocked[] {
  if (blockedCache) return blockedCache
  try {
    const v = JSON.parse(localStorage.getItem(BLOCK_KEY) || "[]")
    blockedCache = Array.isArray(v) ? v.filter(b => b && typeof b.id === "string" && typeof b.name === "string").slice(0, 500) : []
  } catch { blockedCache = [] }
  return blockedCache
}
function setBlocked(list: Blocked[]) {
  blockedCache = list
  try { if (list.length) localStorage.setItem(BLOCK_KEY, JSON.stringify(list)); else localStorage.removeItem(BLOCK_KEY) } catch {}
  emit()
}
const useBlocked = () => useSyncExternalStore(subscribe, blockedList, () => [] as Blocked[])
let hideVer = 0
const useHideVersion = () => useSyncExternalStore(subscribe, () => hideVer, () => 0)
const visible = (p: SocialPost) => !hiddenPosts.has(p.id) && !blockedList().some(b => b.id === p.author?.id)

/** Social-Konto löschen (Server + lokale Merker). true = gelöscht. */
export async function deleteSocialAccount(): Promise<boolean> {
  const ok = !!(await api.deleteAccount())
  if (ok) {
    api.setSocialConsent(false)
    myId = null; restricted = false; decisions = []
    try { localStorage.removeItem(DEC_SEEN_KEY) } catch {}
    setBlocked([])
  }
  return ok
}
/** Gibt es (vermutlich) ein Social-Konto auf diesem Gerät? (für „Alles löschen“) */
export const hasSocialAccount = () => api.socialConsent() || hadAccount()

// ═══ Bausteine ═══════════════════════════════════════════════════════════════════════════════
const clean = (a: LabAvatar | null | undefined): LabAvatar => ({
  color: AVATAR_COLORS.some(c => c.id === a?.color) ? a!.color : DEFAULT_AVATAR.color,
  accessory: AVATAR_ACCESSORIES.some(x => x.id === a?.accessory) ? a!.accessory : DEFAULT_AVATAR.accessory,
  mood: AVATAR_MOODS.some(m => m.id === a?.mood) ? a!.mood : DEFAULT_AVATAR.mood,
})

/** Kolbi-Avatar einer (fremden) Person – nur aus festen Bausteinen. */
export function PublicAvatar({ avatar, size = 40 }: { avatar: LabAvatar | null | undefined; size?: number }) {
  const a = clean(avatar)
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: 999, background: avatarColorBg(a.color), display: "inline-flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
      <span style={{ marginBottom: -size * 0.06, display: "flex" }}><Mascot mood={a.mood} size={size * 0.86} accessory={a.accessory === "none" ? null : a.accessory} /></span>
    </span>
  )
}

/** Neutraler Haupt-Knopf (Tinte) – Grün→Blau bleibt Selbsttest-Elementen vorbehalten. */
function InkBtn({ on, children, onClick, disabled, style }: { on?: boolean; children: React.ReactNode; onClick: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <button className="lab-press" disabled={disabled} aria-pressed={on} onClick={() => { haptic(); onClick() }} style={{
      minHeight: 48, padding: "12px 20px", borderRadius: 16, fontWeight: 900, fontSize: "0.98rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
      border: on ? "1px solid var(--border)" : "none", background: on ? "var(--surface-2)" : "var(--text)", color: on ? "var(--text)" : "var(--background)",
      opacity: disabled ? 0.45 : 1, ...style,
    }}>{children}</button>
  )
}

/** Umschalter oben (max. 3 Optionen), optional mit „Neu“-Abzeichen. */
export function SwitchTabs<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; badge?: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 16, background: "var(--surface-2)" }}>
      {options.map(o => {
        const on = o.id === value
        return (
          <button key={o.id} role="tab" aria-selected={on} onClick={() => { haptic(5); onChange(o.id) }} className="lab-press" style={{
            flex: 1, minWidth: 0, minHeight: 44, borderRadius: 12, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: on ? "var(--surface)" : "transparent", color: on ? "var(--text)" : "var(--text-dim)", fontWeight: on ? 900 : 800, fontSize: "0.9rem",
            boxShadow: on ? "0 1px 4px rgba(0,0,0,.12)" : "none", whiteSpace: "nowrap",
          }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
            {o.badge && <NewBadge id={o.badge} />}
          </button>
        )
      })}
    </div>
  )
}

export function ago(iso: string): string {
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms)) return ""
  const m = Math.max(0, Math.round(ms / 60000))
  if (m < 1) return t("gerade eben")
  if (m < 60) return t("vor {n} Min.", { n: m })
  const h = Math.round(m / 60)
  if (h < 24) return t("vor {n} Std.", { n: h })
  const d = Math.round(h / 24)
  if (d < 7) return d === 1 ? t("vor 1 Tag") : t("vor {n} Tagen", { n: d })
  try { return new Date(iso).toLocaleDateString(LOCALE, { day: "numeric", month: "short" }) } catch { return "" }
}
export const signed = (v: number) => `${v > 0.04 ? "+" : v < -0.04 ? "−" : "±"}${dec(Math.abs(v), 1)}`
export const decisionInfo = (d: SocialPost["decision"]) => ({
  keep: { emoji: "💚", label: t("Behalten"), dot: "#1baf7a" },
  maybe: { emoji: "🤔", label: t("Vielleicht"), dot: "#eda100" },
  drop: { emoji: "✂️", label: t("Raus"), dot: "#8c8c99" },
})[d] ?? { emoji: "🧪", label: "", dot: "#8c8c99" }
const REACTIONS: { id: ReactionKind; emoji: string; label: () => string }[] = [
  { id: "durchhalten", emoji: "💪", label: () => t("Durchhalten") },
  { id: "hilfreich", emoji: "▲", label: () => t("Hilfreich") },
]
const labName = (lib: LibSupp | undefined, fallback: string) => lib ? t("Lab {name}", { name: lib.name }) : fallback

function Loading({ h = 300 }: { h?: number }) {
  return <div className="lab-card lab-shine" aria-label={t("Lädt …")} style={{ height: h, background: "linear-gradient(90deg, var(--surface-2), var(--surface), var(--surface-2))" }} />
}

function Offline({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="lab-card lab-rise" role="status" style={{ padding: "26px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Mascot mood="think" size={88} />
      <div style={{ fontSize: "1.25rem", fontWeight: 900, marginTop: 8 }}>{t("Gerade keine Verbindung")}</div>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.45 }}>{t("Deine eigenen Daten sind sicher auf dem Gerät. Beiträge lade ich, sobald du wieder online bist.")}</div>
      <Btn variant="soft" onClick={onRetry} style={{ marginTop: 14, minHeight: 44 }}>{t("Nochmal versuchen")}</Btn>
    </div>
  )
}

function Empty({ mood = "happy", title, text, children }: { mood?: "happy" | "think"; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="lab-card lab-rise" style={{ padding: "26px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="lab-float"><Mascot mood={mood} size={92} /></div>
      <div style={{ fontSize: "1.25rem", fontWeight: 900, marginTop: 8 }}>{title}</div>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.45, maxWidth: 320 }}>{text}</div>
      {children}
    </div>
  )
}

function EndOfFeed() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "18px 0 6px", color: "var(--text-dim)", textAlign: "center" }}>
      <Mascot mood="happy" size={52} />
      <div style={{ fontWeight: 900, color: "var(--text)" }}>{t("✓ Du bist auf dem neuesten Stand")}</div>
      <div style={{ fontSize: "0.8rem" }}>{t("Neue Beiträge kommen, sobald andere ihre Tests beenden.")}</div>
    </div>
  )
}

// ═══ Entscheidungen der Moderation (eigene Posts/eigenes Profil) ══════════════════════════════
const termsHref = () => `${SITE_URL}${isEn ? "/en/terms" : "/nutzungsbedingungen"}`
function AppealLink() {
  return <a href={termsHref()} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, color: "var(--accent)", fontWeight: 800, fontSize: "0.8rem", lineHeight: 1.3 }}>{t("Widerspruch per E-Mail – siehe Nutzungsbedingungen")} ›</a>
}
function decDate(iso: string) {
  try { return new Date(iso).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" }) } catch { return "" }
}
function DecisionRow({ d }: { d: ModDecision }) {
  const lib = d.lib ? LIB_BY_ID[d.lib] : undefined
  const what = d.target === "profile" ? t("Dein Profil") : d.lib ? t("Post zu {name}", { name: lib?.name ?? d.lib }) : t("Ein Post von dir")
  return (
    <div data-decision style={{ padding: "10px 12px", borderRadius: 14, background: "var(--surface-2)", textAlign: "left" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1, minWidth: 0, fontWeight: 900, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{what}</span>
        <span style={{ flexShrink: 0, fontSize: "0.72rem", fontWeight: 900, padding: "3px 9px", borderRadius: 999, border: "1px solid var(--border)", background: "var(--surface)" }}>{d.action === "banned" ? t("Konto gesperrt") : t("Ausgeblendet")}</span>
      </div>
      {d.note && <div style={{ fontSize: "0.82rem", fontWeight: 700, marginTop: 4, lineHeight: 1.4, wordBreak: "break-word" }}>{t("Begründung: {note}", { note: d.note })}</div>}
      <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)", marginTop: 2 }}>{decDate(d.at)}</div>
    </div>
  )
}
/** Gesperrt: Begründung + Widerspruch. */
function BanNote() {
  useDecisions()
  const why = banReason()
  return (
    <div style={{ marginTop: 10, maxWidth: 320 }}>
      {why && <div data-ban-reason style={{ fontSize: "0.86rem", fontWeight: 800, lineHeight: 1.45, wordBreak: "break-word" }}>{t("Begründung: {note}", { note: why })}</div>}
      <AppealLink />
    </div>
  )
}
/** Entdecken: einmaliger Hinweis auf neue Entscheidungen (danach nur noch in Einstellungen › Social-Konto). */
export function ModerationNotice() {
  const on = useSocialOn()
  const list = useDecisions()
  const locked = useRestricted()
  const [shown, setShown] = useState<ModDecision[] | null>(null)
  useEffect(() => {
    if (!on || shown) return
    const seen = decSeen()
    const fresh = list.filter(d => Date.parse(d.at) > seen)
    if (!fresh.length) return
    markDecSeen(list)
    setShown(locked ? [] : fresh) // gesperrt: Begründung steht schon groß im Feed
  }, [on, list, locked, shown])
  if (!shown?.length) return null
  return (
    <div className="lab-card lab-rise" role="status" data-mod-notice style={{ padding: 16, borderRadius: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Mascot mood="think" size={44} />
        <span style={{ fontWeight: 900, fontSize: "1rem", lineHeight: 1.3 }}>{shown.length === 1 ? t("Neue Entscheidung der Moderation") : t("{n} neue Entscheidungen der Moderation", { n: shown.length })}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {shown.slice(0, 3).map((d, i) => <DecisionRow key={i} d={d} />)}
      </div>
      {shown.length > 3 && <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)", marginTop: 6 }}>{t("Alle findest du in Einstellungen › Social-Konto.")}</div>}
      <AppealLink />
      <Btn variant="soft" full onClick={() => setShown([])} style={{ minHeight: 44, marginTop: 2 }}>{t("Verstanden")}</Btn>
    </div>
  )
}

// ═══ Testmodus-Abzeichen + offizielle Kolbi-Posts ═══════════════════════════════════════════
/** „TEST“ an Inhalten aus dem Testmodus (sehen nur Tester). */
export function TestBadge() {
  return <span data-test-badge title={t("Nur für Tester sichtbar")} style={{ flexShrink: 0, fontSize: "0.64rem", fontWeight: 900, letterSpacing: "0.06em", padding: "2px 7px", borderRadius: 999, background: "var(--warning-dim)", border: "1px solid var(--warning)", color: "var(--text)" }}>TEST</span>
}

function officialDate(d: string) {
  try { return new Date(`${d}T12:00:00Z`).toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric" }) } catch { return d }
}
/** Offizieller Kolbi-Post: Kolbi-Avatar, „Kolbi-Team · offiziell“, Titel, Text, 3D-Icon, Datum. Keine Reaktionen. */
export function OfficialCard({ o, pinned, where, onOpen }: { o: OfficialPost; pinned?: boolean
  /** Home-Feed: Name der Community unter „Kolbi-Team“ + Text gekürzt; Tippen öffnet die Community */
  where?: string; onOpen?: () => void }) {
  const lib = o.icon ? LIB_BY_ID[o.icon] : undefined
  const clamp: React.CSSProperties = onOpen ? { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}
  return (
    <article className="lab-card lab-rise" data-official={o.id} onClick={onOpen ? () => { haptic(); onOpen() } : undefined} role={onOpen ? "button" : undefined} tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen() } } : undefined}
      style={{ padding: 0, overflow: "hidden", borderRadius: 24, border: "1px solid var(--accent)", cursor: onOpen ? "pointer" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 6px" }}>
        <PublicAvatar avatar={DEFAULT_AVATAR} size={40} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, fontSize: "0.95rem" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("Kolbi-Team · offiziell")}</span>
            <span aria-hidden style={{ color: "var(--accent)" }}>✓</span>
          </span>
          <span style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{where ? `${where} · ` : ""}{officialDate(o.date)}</span>
        </span>
        {pinned && <span style={{ flexShrink: 0, fontSize: "0.7rem", fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: "var(--surface-2)", color: "var(--text-dim)" }}>📌 {t("Angepinnt")}</span>}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "6px 14px 16px" }}>
        {o.icon && (
          <span style={{ width: 64, height: 64, borderRadius: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", background: `color-mix(in srgb, ${labColor(lib)} 18%, var(--surface-2))` }}>
            <SuppIcon lib={o.icon} emoji={lib?.emoji ?? "🧪"} size={56} />
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: "1.08rem", lineHeight: 1.3, wordBreak: "break-word" }}>{o.title}</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, lineHeight: 1.5, marginTop: 6, whiteSpace: "pre-line", wordBreak: "break-word", ...clamp }}>{o.body}</div>
          {onOpen && <div style={{ marginTop: 8, fontSize: "0.82rem", fontWeight: 900, color: "var(--accent)" }}>{t("Weiterlesen ›")}</div>}
        </div>
      </div>
    </article>
  )
}

// Zuletzt gesehener Kolbi-Post je Community (für den Hinweis „Neuer Kolbi-Post in …“)
const OFFICIAL_SEEN_KEY = "lab-social-official-seen"
function officialSeen(): Record<string, string> {
  try { const v = JSON.parse(localStorage.getItem(OFFICIAL_SEEN_KEY) || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {} } catch { return {} }
}
let officialVer = 0
function markOfficialSeen(community: string, o: { id: string; date: string } | undefined) {
  if (!o) return
  const m = officialSeen()
  const k = `${o.date}|${o.id}`
  if (m[community] && m[community] >= k) return
  m[community] = k
  try { localStorage.setItem(OFFICIAL_SEEN_KEY, JSON.stringify(m)) } catch {}
  officialVer++; emit()
}
const useOfficialVer = () => useSyncExternalStore(subscribe, () => officialVer, () => 0)

/** Entdecken: „📣 Neuer Kolbi-Post in Schlaf“ – nur für beigetretene Communities, verschwindet nach dem Öffnen. */
export function OfficialHint() {
  const on = useSocialOn()
  useOfficialVer()
  const [list, setList] = useState<SocialCommunity[] | null>(null)
  useEffect(() => {
    if (!on) return
    let alive = true
    void ensureMe().then(() => api.communities()).then(v => { if (alive) setList(Array.isArray(v) ? v : null) })
    return () => { alive = false }
  }, [on])
  if (!on || !list) return null
  const seen = officialSeen()
  const fresh = list.filter(c => c.joined && c.official && (!seen[c.id] || seen[c.id] < `${c.official.date}|${c.official.id}`))
    .sort((a, b) => (b.official!.date).localeCompare(a.official!.date))
  const c = fresh[0]
  if (!c) return null
  const m = meta(c)
  return (
    <button className="lab-card lab-press lab-rise" data-official-hint={c.id} onClick={() => { markOfficialSeen(c.id, c.official); openSocial({ kind: "community", id: c.id, c }) }}
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", minHeight: 60, textAlign: "left", color: "var(--text)", borderRadius: 20 }}>
      <PublicAvatar avatar={DEFAULT_AVATAR} size={40} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 900, fontSize: "0.92rem" }}>📣 {t("Neuer Kolbi-Post in {name}", { name: m.title })}</span>
        <span style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-dim)" }}>{fresh.length === 2 ? t("und in 1 weiteren Community") : fresh.length > 2 ? t("und in {n} weiteren Communities", { n: fresh.length - 1 }) : t("Vom Kolbi-Team")}</span>
      </span>
      <span aria-hidden style={{ color: "var(--text-dim)" }}>›</span>
    </button>
  )
}

// ═══ Ergebnis-Post ═══════════════════════════════════════════════════════════════════════════
export function PostCard({ p, preview, onSelfTest, compact }: { p: SocialPost; preview?: boolean; onSelfTest?: (libId: string) => void
  /** Home-Feed (schmale Karte): kleinere Reaktions-Knöpfe, damit beide in eine Zeile passen */
  compact?: boolean }) {
  const lib = LIB_BY_ID[p.lib]
  const color = labColor(lib)
  const d = decisionInfo(p.decision)
  const [mine, setMine] = useState<ReactionKind[]>(Array.isArray(p.mine) ? p.mine : [])
  const [counts, setCounts] = useState(p.counts ?? { durchhalten: 0, hilfreich: 0 })
  const [menu, setMenu] = useState(false)
  const own = preview || (!!myId && p.author?.id === myId)
  // Feed: die 3 deutlichsten Bereiche · Vorschau vor dem Posten: GENAU alles, was gesendet wird
  const dims = Object.entries(p.dims ?? {}).filter(([k, v]) => typeof v === "number" && (preview || (Math.abs(v) >= 0.1 && DIMS.some(x => x.id === k))))
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, preview ? undefined : 3)
  const toggle = async (k: ReactionKind) => {
    if (preview) return
    markSeen("reactions")
    const on = mine.includes(k)
    const flip = (add: boolean) => {
      setMine(m => add ? [...m.filter(x => x !== k), k] : m.filter(x => x !== k))
      setCounts(c => ({ ...c, [k]: Math.max(0, (c[k] ?? 0) + (add ? 1 : -1)) }))
    }
    flip(!on)
    const ok = await (on ? api.unreact(p.id, k) : api.react(p.id, k))
    if (!ok) { flip(on); flash(OFFLINE()) }
  }
  const pill: React.CSSProperties = { minHeight: 44, padding: compact ? "0 10px" : "0 14px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: compact ? 4 : 6, fontWeight: 800, fontSize: compact ? "0.8rem" : "0.86rem", whiteSpace: "nowrap" }
  return (
    <article className="lab-card lab-rise" data-post={p.id} style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 6px 8px 8px" }}>
        <button className="lab-press" disabled={preview} onClick={() => openSocial({ kind: "profile", id: p.author.id })} style={{ flex: 1, minWidth: 0, minHeight: 48, display: "flex", alignItems: "center", gap: 10, padding: "4px 6px", background: "none", border: "none", color: "var(--text)", textAlign: "left", borderRadius: 14 }}>
          <PublicAvatar avatar={p.author?.avatar} size={40} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span style={{ fontWeight: 900, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.author?.name}</span>
              {(p.tester || p.author?.tester) && <TestBadge />}
            </span>
            <span style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)" }}>{ago(p.createdAt)}</span>
          </span>
        </button>
        {!own && (
          <button className="lab-press" onClick={() => { haptic(); setMenu(true) }} aria-label={t("Mehr Optionen")} style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: "transparent", color: "var(--text-dim)", fontSize: "1.3rem", fontWeight: 900, flexShrink: 0 }}>⋯</button>
        )}
      </div>

      <div style={{ margin: "0 14px", padding: "20px 16px 18px", borderRadius: 18, background: "var(--surface-2)", textAlign: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 800, color: "var(--text-dim)", maxWidth: "100%" }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lib?.emoji} {labName(lib, p.lib)}</span>
        </span>
        <div style={{ fontSize: "2.1rem", fontWeight: 900, lineHeight: 1.1, marginTop: 8 }}><span aria-hidden>{d.emoji}</span> {d.label}</div>
        <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text-dim)", marginTop: 6 }}>
          {t("{d}★ gegenüber dem eigenen Normal · {n} Tage", { d: signed(p.delta), n: p.days })}
        </div>
        {dims.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 10 }}>
            {dims.map(([k, v]) => { const x = DIMS.find(q => q.id === k); return (
              <span key={k} data-dim={k} style={{ padding: "4px 10px", borderRadius: 999, background: "var(--surface)", fontSize: "0.78rem", fontWeight: 800 }}>{x ? `${x.emoji} ${x.label}` : k} {signed(v)}</span>
            ) })}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "12px 14px 4px" }}>
        {REACTIONS.map(r => {
          const on = mine.includes(r.id)
          return (
            <button key={r.id} className="lab-press" aria-pressed={on} disabled={preview} onClick={() => { haptic(); void toggle(r.id) }} style={{
              ...pill, border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)", color: "var(--text)",
            }}>
              <span aria-hidden>{r.emoji}</span>{r.label()}
              <span style={{ fontVariantNumeric: "tabular-nums", color: on ? "var(--text)" : "var(--text-dim)", fontWeight: 900 }}>{counts[r.id] ?? 0}</span>
            </button>
          )
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 6px 14px" }}>
        <span style={{ flex: 1, fontSize: "0.7rem", color: "var(--text-dim)", lineHeight: 1.3 }}>{t("Selbsttest einer Person · keine Studie")}</span>
        {onSelfTest && lib && !lib.rx && !preview && (
          <button className="lab-press" onClick={() => { haptic(); onSelfTest(lib.id) }} style={{ minHeight: 44, padding: "0 10px", border: "none", background: "none", color: "var(--accent)", fontWeight: 900, fontSize: "0.84rem", whiteSpace: "nowrap" }}>{t("🔬 Selbst testen ›")}</button>
        )}
      </div>
      {menu && <ModerationSheet target={{ type: "post", id: p.id }} author={p.author} onClose={() => setMenu(false)} />}
    </article>
  )
}

/** ⋯-Menü: Melden (4 feste Gründe) · Blockieren (mit Bestätigung). */
function ModerationSheet({ target, author, onClose }: { target: { type: "post" | "profile"; id: string }; author: { id: string; name: string; avatar: LabAvatar | null }; onClose: () => void }) {
  const [step, setStep] = useState<"menu" | "report" | "block">("menu")
  const [busy, setBusy] = useState(false)
  const reasons: { id: ReportReason; label: string; sub: string }[] = [
    { id: "spam", label: t("Spam"), sub: t("Werbung, Massen-Aktionen") },
    { id: "beleidigung", label: t("Beleidigung"), sub: t("Belästigung, Bloßstellen") },
    { id: "gesundheitsversprechen", label: t("Gesundheitsversprechen"), sub: t("Heil- oder Wirkversprechen") },
    { id: "sonstiges", label: t("Sonstiges"), sub: t("Etwas anderes passt nicht") },
  ]
  const row: React.CSSProperties = { width: "100%", minHeight: 56, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", textAlign: "left", fontWeight: 900, fontSize: "0.95rem" }
  const sendReport = async (r: ReportReason) => {
    setBusy(true)
    const ok = await api.report(target, r)
    setBusy(false)
    if (!ok) { flash(OFFLINE()); return }
    if (target.type === "post") { hiddenPosts.add(target.id); hideVer++; emit() }
    flash(t("Danke – wir schauen es uns an."))
    onClose()
  }
  const doBlock = async () => {
    setBusy(true)
    const ok = await api.block(author.id)
    setBusy(false)
    if (!ok) { flash(OFFLINE()); return }
    setBlocked([...blockedList().filter(b => b.id !== author.id), { id: author.id, name: author.name, avatar: author.avatar ?? null }])
    hideVer++; emit()
    flash(t("{name} ist blockiert", { name: author.name }))
    onClose()
    if (target.type === "profile") backSocial()
  }
  return (
    <Sheet open onClose={onClose} z={450} title={step === "report" ? t("Warum meldest du das?") : step === "block" ? t("{name} blockieren?", { name: author.name }) : undefined}>
      {step === "menu" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="lab-press" style={row} onClick={() => setStep("report")}><span aria-hidden>🚩</span>{target.type === "post" ? t("Beitrag melden") : t("Profil melden")}</button>
          <button className="lab-press" style={row} onClick={() => setStep("block")}><span aria-hidden>🚫</span>{t("{name} blockieren", { name: author.name })}</button>
          <Btn variant="ghost" full onClick={onClose} style={{ marginTop: 4, minHeight: 48 }}>{t("Abbrechen")}</Btn>
        </div>
      )}
      {step === "report" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reasons.map(r => (
            <button key={r.id} className="lab-press" disabled={busy} style={{ ...row, opacity: busy ? 0.5 : 1 }} onClick={() => void sendReport(r.id)}>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block" }}>{r.label}</span>
                <span style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-dim)" }}>{r.sub}</span>
              </span>
              <span aria-hidden style={{ color: "var(--text-dim)" }}>›</span>
            </button>
          ))}
          <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.45, marginTop: 4 }}>{t("Meldungen sehen nur wir. Die Person erfährt nicht, wer gemeldet hat.")}</div>
        </div>
      )}
      {step === "block" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, background: "var(--surface-2)" }}>
            <PublicAvatar avatar={author.avatar} size={44} />
            <div style={{ fontSize: "0.88rem", lineHeight: 1.45, fontWeight: 700 }}>{t("Du siehst nichts mehr von {name}. Aufheben kannst du das jederzeit in den Einstellungen.", { name: author.name })}</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Btn variant="soft" onClick={onClose} style={{ flex: 1, minHeight: 48 }}>{t("Abbrechen")}</Btn>
            <Btn variant="danger" disabled={busy} onClick={() => void doBlock()} style={{ flex: 1, minHeight: 48 }}>{t("Blockieren")}</Btn>
          </div>
        </div>
      )}
    </Sheet>
  )
}

// ═══ Feed (generisch: Entdecken, Gefolgt, Community) ═════════════════════════════════════════
export function PostFeed({ feedKey, load, empty, offline, onSelfTest, onOfficial }: {
  feedKey: string; load: (cursor?: string) => Promise<SocialPage | null>; empty: React.ReactNode; offline?: React.ReactNode; onSelfTest?: (libId: string) => void
  /** offizielle Kolbi-Posts der ersten Seite geladen (neueste zuerst) */
  onOfficial?: (o: OfficialPost[]) => void
}) {
  const [st, setSt] = useState<{ state: "loading" | "ok" | "offline"; posts: SocialPost[]; next?: string; official?: OfficialPost[] }>({ state: "loading", posts: [] })
  const [more, setMore] = useState(false)
  const [retry, setRetry] = useState(0)
  useHideVersion()
  useBlocked()
  useRestricted()
  useDecisions()
  useEffect(() => {
    let on = true
    setSt({ state: "loading", posts: [] })
    void ensureMe().then(() => load()).then(r => {
      if (!on) return
      setSt(r && Array.isArray(r.posts) ? { state: "ok", posts: r.posts, next: r.next, official: r.official } : { state: "offline", posts: [] })
      if (r?.official) onOfficial?.(r.official)
    })
    return () => { on = false }
  }, [feedKey, retry]) // eslint-disable-line react-hooks/exhaustive-deps
  const loadMore = async () => {
    if (!st.next) return
    setMore(true)
    const r = await load(st.next)
    setMore(false)
    if (!r) { flash(OFFLINE()); return }
    setSt(s => ({ ...s, state: "ok", posts: [...s.posts, ...r.posts.filter(p => !s.posts.some(q => q.id === p.id))], next: r.next }))
  }
  if (restricted) return (
    <Empty mood="think" title={t("Dein Social-Konto ist gesperrt")} text={t("Du kannst es in den Einstellungen löschen. Deine eigenen Daten auf dem Gerät bleiben.")}>
      <BanNote />
    </Empty>
  )
  if (st.state === "loading") return <Loading />
  if (st.state === "offline") return <>{offline ?? <Offline onRetry={() => setRetry(x => x + 1)} />}</>
  const posts = st.posts.filter(visible)
  // Kolbi-Posts: neuester oben angepinnt, die übrigen nach Datum zwischen die Beiträge gemischt
  // (ältere als der letzte geladene Beitrag erst, wenn nichts mehr nachkommt)
  const off = st.official ?? []
  const pinned = off[0]
  const offAt = (o: OfficialPost) => Date.parse(`${o.date}T00:00:00Z`)
  const lastAt = posts.length ? Date.parse(posts[posts.length - 1].createdAt) : Infinity
  const rest = off.slice(1).filter(o => !st.next || offAt(o) >= lastAt)
  type Item = { k: "post"; p: SocialPost; at: number } | { k: "off"; o: OfficialPost; at: number }
  const items: Item[] = [...posts.map(p => ({ k: "post" as const, p, at: Date.parse(p.createdAt) })), ...rest.map(o => ({ k: "off" as const, o, at: offAt(o) + 86399999 }))]
    .sort((a, b) => b.at - a.at)
  if (!posts.length && !off.length && !st.next) return <>{empty}</>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {pinned && <OfficialCard o={pinned} pinned />}
      {items.map(it => it.k === "post" ? <PostCard key={it.p.id} p={it.p} onSelfTest={onSelfTest} /> : <OfficialCard key={`o-${it.o.id}`} o={it.o} />)}
      {st.next ? <Btn variant="soft" onClick={() => void loadMore()} disabled={more} style={{ alignSelf: "center", minHeight: 44 }}>{more ? t("Lädt …") : t("Weitere laden")}</Btn> : <EndOfFeed />}
    </div>
  )
}

/** Einstieg ohne Einwilligung (Entdecken): schmale Zeile, öffnet die Einwilligung. */
export function JoinRow() {
  return (
    <button className="lab-card lab-press" onClick={() => { haptic(); askSocial() }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", minHeight: 64, textAlign: "left", color: "var(--text)", borderRadius: 20 }}>
      <PublicAvatar avatar={loadAvatar()} size={42} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, fontSize: "0.95rem" }}>{t("Sichtbar mitmachen")} <NewBadge id="follow" /></span>
        <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-dim)" }}>{t("Folgen, reagieren, Communities – unter Pseudonym")}</span>
      </span>
      <span aria-hidden style={{ color: "var(--text-dim)" }}>›</span>
    </button>
  )
}

/** Ohne Einwilligung an Stellen, die sie brauchen (Communities, Beiträge). */
export function JoinIntro({ text }: { text: string }) {
  return (
    <Empty title={t("Sichtbar mitmachen")} text={text}>
      <InkBtn onClick={() => askSocial()} style={{ marginTop: 16 }}>{t("👥 Mitmachen")}</InkBtn>
      <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", marginTop: 10 }}>{t("Ohne Mitmachen bleibt alles privat wie bisher.")}</div>
    </Empty>
  )
}

// ═══ Einwilligung ════════════════════════════════════════════════════════════════════════════
function Check({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 12, minHeight: 44, padding: "10px 12px", borderRadius: 14, background: on ? "var(--accent-dim)" : "var(--surface-2)", border: on ? "2px solid var(--accent)" : "2px solid transparent", cursor: "pointer", fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.4 }}>
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} style={{ width: 22, height: 22, flexShrink: 0, marginTop: 1, accentColor: "var(--accent)" }} />
      <span>{children}</span>
    </label>
  )
}

function ConsentSheet({ then, onClose }: { then?: () => void; onClose: () => void }) {
  const [adult, setAdult] = useState(false)
  const [art9, setArt9] = useState(false)
  const [busy, setBusy] = useState(false)
  const name = pseudonym(pseudoSeed(), isEn)
  const yes = async () => {
    setBusy(true)
    api.setSocialConsent(true); emit()
    const id = await ensureMe()
    if (id) await api.updateProfile({ nameSeed: pseudoSeed(), avatar: publicAvatar() })
    setBusy(false)
    flash(id ? t("✓ Du bist dabei – als {name}", { name }) : t("Du bist dabei. Gerade keine Verbindung – ich verbinde dich, sobald es geht."))
    onClose()
    then?.()
  }
  const li = (ok: boolean, text: string) => (
    <div key={text} style={{ display: "flex", gap: 8, fontSize: "0.86rem", fontWeight: 700, lineHeight: 1.4 }}><span aria-hidden style={{ color: ok ? "var(--accent)" : "var(--text-dim)", flexShrink: 0 }}>{ok ? "✓" : "✕"}</span>{text}</div>
  )
  const link = (href: string, label: string) => <a href={`${SITE_URL}${href}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 800, display: "inline-flex", alignItems: "center", minHeight: 44 }}>{label}</a>
  return (
    <Sheet open onClose={onClose} z={460}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "inline-flex" }}><PublicAvatar avatar={publicAvatar()} size={84} /></div>
        <div style={{ fontSize: "1.35rem", fontWeight: 900, marginTop: 8 }}>{t("Sichtbar mitmachen")}</div>
        <div style={{ fontSize: "0.88rem", color: "var(--text-dim)", marginTop: 4, lineHeight: 1.45 }}>{t("Folge anderen, reagiere auf Ergebnisse und tritt Communities bei – als {name}.", { name })}</div>
      </div>
      <div style={{ marginTop: 16, fontSize: "0.72rem", fontWeight: 900, letterSpacing: ".08em", color: "var(--text-dim)" }}>{t("DAS SEHEN ANDERE IN DER APP")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {li(true, t("Dein Pseudonym und dein Kolbi-Avatar"))}
        {li(true, t("Ergebnisse, die du selbst postest (Supplement, Dauer, Urteil, ±★)"))}
        {li(true, t("Wem du folgst, deine Reaktionen und Communities"))}
      </div>
      <div style={{ marginTop: 14, fontSize: "0.72rem", fontWeight: 900, letterSpacing: ".08em", color: "var(--text-dim)" }}>{t("BLEIBT PRIVAT")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {li(false, t("Deine Tagesdaten, Check-ins und Notizen"))}
        {li(false, t("Kein Name, keine E-Mail, keine Fotos"))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        <Check on={adult} onChange={setAdult}>{t("Ich bin mindestens 18 Jahre alt.")}</Check>
        <Check on={art9} onChange={setArt9}>{t("Ich willige ausdrücklich ein, dass Ergebnisse, die ich poste (Gesundheitsdaten), unter meinem Pseudonym für andere in der App sichtbar sind.")}</Check>
      </div>
      <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", marginTop: 10, lineHeight: 1.45 }}>
        {t("Jederzeit widerrufbar: Einstellungen › Social-Konto – dort kannst du auch alles löschen.")}
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 16 }}>
          {link(isEn ? "/en/privacy" : "/datenschutz", t("Datenschutz §8a"))}
          {link(isEn ? "/en/terms" : "/nutzungsbedingungen", t("Community-Regeln"))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Btn variant="soft" onClick={onClose} style={{ flex: 1, minHeight: 48 }}>{t("Nein danke")}</Btn>
        <InkBtn onClick={() => void yes()} disabled={!adult || !art9 || busy} style={{ flex: 2 }}>{t("Ja, mitmachen")}</InkBtn>
      </div>
    </Sheet>
  )
}

// ═══ Ergebnis posten (Vorschau) ══════════════════════════════════════════════════════════════
function SharePostSheet({ s, suppId, onClose }: { s: LabState; suppId: string; onClose: () => void }) {
  const p = s.demo ? null : api.resultPostPayload(s, suppId) // Demo-Daten werden nie gepostet
  const locked = useRestricted()
  const [busy, setBusy] = useState(false)
  const preview: SocialPost | null = p ? {
    id: "preview", author: { id: "me", name: pseudonym(pseudoSeed(), isEn), avatar: publicAvatar() }, lib: p.lib, days: p.days, decision: p.decision,
    delta: p.delta, dims: p.dims, createdAt: new Date().toISOString(), counts: { durchhalten: 0, hilfreich: 0 }, mine: [],
  } : null
  const post = async () => {
    setBusy(true)
    await ensureMe()
    // true = gepostet · "hidden" = von der Moderation ausgeblendet · "pending" = Prüfung läuft · false = keine Verbindung
    const r = (restricted ? false : await api.shareResultPost(s, suppId)) as boolean | "hidden" | "pending"
    setBusy(false)
    if (r === "hidden") { flash(t("Dieser Beitrag wurde von der Moderation ausgeblendet")); onClose(); return }
    if (r === "pending") { flash(t("Zu diesem Beitrag läuft gerade eine Prüfung – bitte später erneut")); onClose(); return }
    if (r !== true) { flash(restricted ? t("Dein Social-Konto ist gesperrt") : OFFLINE()); return }
    flash(t("✓ Gepostet – zu sehen in Entdecken"))
    onClose()
  }
  return (
    <Sheet open onClose={onClose} z={450} title={t("📣 Ergebnis posten")}>
      {preview ? <>
        <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "var(--text-dim)", marginBottom: 8 }}>{t("So sieht dein Beitrag aus")}</div>
        <PostCard p={preview} preview />
        <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.45, marginTop: 12 }}>
          {Object.keys(p!.dims ?? {}).length > 3 && <>{t("Gesendet werden genau die Bereiche oben – im Feed stehen davon die 3 deutlichsten.")} </>}
          {t("Sichtbar für andere in der App unter deinem Pseudonym. Nicht dabei: deine Tagesdaten und Notizen.")}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <Btn variant="soft" onClick={onClose} style={{ flex: 1, minHeight: 48 }}>{t("Abbrechen")}</Btn>
          <InkBtn onClick={() => void post()} disabled={busy || locked} style={{ flex: 2 }}>{busy ? t("Lädt …") : t("📣 Jetzt posten")}</InkBtn>
        </div>
      </> : (
        <Empty mood="think" title={t("Noch nichts zum Posten")} text={s.demo ? t("Demo-Daten kann man nicht posten – nur echte Ergebnisse.") : t("Posten geht mit einem fertigen Test zu einem Supplement aus der Bibliothek (keine Peptide, nichts Verschriebenes).")} />
      )}
    </Sheet>
  )
}

/** Einmal in LabApp einhängen: Einwilligung + Posten-Vorschau + Meldungen. */
export function SocialHost({ s, onFlash, hold }: { s: LabState; onFlash: (m: string) => void; hold?: boolean }) {
  useEffect(() => { flashFn = onFlash }, [onFlash])
  const a = useSyncExternalStore(subscribe, () => ask, () => null)
  const pf = useSyncExternalStore(subscribe, () => postFor, () => null)
  const closeAsk = useCallback(() => { ask = null; emit() }, [])
  const closePost = useCallback(() => { postFor = null; emit() }, [])
  if (hold) return null // anderes Overlay (z. B. Abzeichen) zuerst – danach geht es hier weiter
  return <>
    {a && <ConsentSheet then={a.then} onClose={closeAsk} />}
    {pf && !a && <SharePostSheet s={s} suppId={pf} onClose={closePost} />}
  </>
}

// ═══ Profil ══════════════════════════════════════════════════════════════════════════════════
function Stat({ v, l }: { v: number | string; l: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
      <div style={{ fontSize: "1.35rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{v}</div>
      <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-dim)" }}>{l}</div>
    </div>
  )
}

function ProfileScreen({ id, onSelfTest }: { id: string; onSelfTest?: (libId: string) => void }) {
  const [p, setP] = useState<SocialProfile | null | "loading">("loading")
  const [retry, setRetry] = useState(0)
  const [menu, setMenu] = useState(false)
  const [open, setOpen] = useState<SocialPost | null>(null)
  useHideVersion()
  useEffect(() => { let on = true; setP("loading"); void ensureMe().then(() => api.getProfile(id)).then(v => { if (on) setP(v ?? null) }); return () => { on = false } }, [id, retry])
  const unblockHere = async () => {
    if (!p || p === "loading") return
    if (!(await api.unblock(p.id))) { flash(OFFLINE()); return }
    setBlocked(blockedList().filter(x => x.id !== p.id)); hideVer++; emit()
    flash(t("{name} ist nicht mehr blockiert", { name: p.name }))
    setRetry(x => x + 1)
  }
  const toggleFollow = async () => {
    if (!p || p === "loading") return
    const was = p.isFollowing
    const set = (f: boolean) => setP(q => q && q !== "loading" ? { ...q, isFollowing: f, followers: Math.max(0, q.followers + (f ? 1 : -1)) } : q)
    set(!was)
    const ok = await (was ? api.unfollow(p.id) : api.follow(p.id))
    if (!ok) { set(was); flash(OFFLINE()) }
  }
  if (p === "loading") return <div><TabHead onBack={backSocial} kicker={t("Profil")} title="…" /><Loading h={360} /></div>
  if (!p) return <div><TabHead onBack={backSocial} kicker={t("Profil")} title={t("Profil")} /><Offline onRetry={() => setRetry(x => x + 1)} /></div>
  const posts = (p.posts ?? []).filter(visible)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <TabHead onBack={backSocial} kicker={p.isMe ? t("Mein öffentliches Profil") : t("Profil")} title={p.name}
        right={!p.isMe && !p.blocked ? <button className="lab-press" onClick={() => setMenu(true)} aria-label={t("Mehr Optionen")} style={{ width: 44, height: 44, borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text)", fontSize: "1.3rem", fontWeight: 900, flexShrink: 0 }}>⋯</button> : undefined} />
      <div className="lab-card lab-rise" style={{ padding: "22px 16px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, borderRadius: 28 }}>
        <PublicAvatar avatar={p.avatar} size={112} />
        <div style={{ fontSize: "1.45rem", fontWeight: 900, textAlign: "center", wordBreak: "break-word" }}>{p.name}</div>
        {p.tester && <TestBadge />}
        <div style={{ display: "flex", width: "100%", maxWidth: 320 }}>
          <Stat v={p.followers} l={t("Follower")} />
          <Stat v={p.following} l={t("Gefolgt")} />
          <Stat v={posts.length} l={posts.length === 1 ? t("Ergebnis") : t("Ergebnisse")} />
        </div>
        {p.blocked
          ? <><div style={{ fontSize: "0.86rem", fontWeight: 800, color: "var(--text-dim)", textAlign: "center" }}>{t("Du hast {name} blockiert.", { name: p.name })}</div>
            <InkBtn on onClick={() => void unblockHere()} style={{ width: "100%", maxWidth: 320 }}>{t("Blockierung aufheben")}</InkBtn></>
          : p.isMe
          ? <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-dim)", textAlign: "center" }}>{t("So sehen andere dich in der App.")}</div>
          : <InkBtn on={p.isFollowing} onClick={() => void toggleFollow()} style={{ width: "100%", maxWidth: 320 }}>{p.isFollowing ? t("✓ Gefolgt") : t("Folgen")}</InkBtn>}
      </div>
      <div style={{ fontSize: "0.82rem", fontWeight: 900, color: "var(--text-dim)", padding: "0 2px" }}>{t("Geteilte Ergebnisse")}</div>
      {posts.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {posts.map(q => {
            const lib = LIB_BY_ID[q.lib]
            const d = decisionInfo(q.decision)
            return (
              <button key={q.id} className="lab-card lab-press" onClick={() => setOpen(q)} style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "16px 12px 12px", minHeight: 120, textAlign: "left", color: "var(--text)", borderRadius: 20 }}>
                <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 0, height: 4, background: labColor(lib) }} />
                <span style={{ fontSize: "1.4rem" }}>{lib?.emoji ?? "🧪"}</span>
                <span style={{ fontWeight: 900, fontSize: "0.92rem", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lib?.name ?? q.lib}</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>{d.emoji} {d.label}</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-dim)" }}>{t("{d}★ · {n} Tage", { d: signed(q.delta), n: q.days })}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="lab-card" style={{ padding: 16, fontSize: "0.88rem", color: "var(--text-dim)", textAlign: "center" }}>{p.isMe ? t("Du hast noch kein Ergebnis gepostet. Nach deinem nächsten Test geht das mit einem Tipp.") : t("Noch keine geteilten Ergebnisse.")}</div>
      )}
      {open && <Sheet open onClose={() => setOpen(null)} z={420}><PostCard p={open} onSelfTest={onSelfTest ? lib => { setOpen(null); onSelfTest(lib) } : undefined} /></Sheet>}
      {menu && <ModerationSheet target={{ type: "profile", id: p.id }} author={{ id: p.id, name: p.name, avatar: p.avatar }} onClose={() => setMenu(false)} />}
    </div>
  )
}

/** Ich: Follower/Gefolgt + „Mein öffentliches Profil ansehen“ (nur mit Einwilligung). */
export function MySocialStats() {
  const on = useSocialOn()
  const [p, setP] = useState<SocialProfile | null>(null)
  useEffect(() => {
    if (!on) { setP(null); return }
    let alive = true
    void ensureMe().then(id => id ? api.getProfile(id) : null).then(v => { if (alive) setP(v ?? null) })
    return () => { alive = false }
  }, [on])
  if (!on) return null
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {p && <div style={{ fontSize: "0.86rem", fontWeight: 800 }}>
        <b style={{ fontVariantNumeric: "tabular-nums" }}>{p.followers}</b> <span style={{ color: "var(--text-dim)" }}>{t("Follower")}</span>
        <span style={{ color: "var(--text-dim)" }}> · </span>
        <b style={{ fontVariantNumeric: "tabular-nums" }}>{p.following}</b> <span style={{ color: "var(--text-dim)" }}>{t("Gefolgt")}</span>
      </div>}
      <button className="lab-press" disabled={!p} onClick={() => p && openSocial({ kind: "profile", id: p.id })} style={{ minHeight: 44, padding: "0 12px", border: "none", background: "none", color: p ? "var(--accent)" : "var(--text-dim)", fontWeight: 900, fontSize: "0.86rem" }}>
        {p ? t("Mein öffentliches Profil ansehen ›") : t("Öffentliches Profil gerade nicht erreichbar")}
      </button>
    </div>
  )
}

// ═══ Communities ═════════════════════════════════════════════════════════════════════════════
const GOAL_GROUP: Record<string, LabGroup> = { schlaf: "schlaf", fokus: "fokus", stress: "ruhe", muskel: "training", regeneration: "training", energie: "energie", darm: "darm", haut: "haut" }
function meta(c: SocialCommunity) {
  if (c.kind === "lab") {
    const lib = LIB_BY_ID[c.key]
    return { emoji: lib?.emoji ?? "🧪", color: labColor(lib), title: labName(lib, c.name), kicker: t("Lab-Community") }
  }
  const g = GOALS.find(x => x.id === c.key)
  const grp = (LAB_GROUPS as Record<string, { color: string; label: string }>)[c.key] ?? LAB_GROUPS[GOAL_GROUP[c.key] ?? "sonstiges"]
  return { emoji: g?.emoji ?? "🎯", color: grp.color, title: g?.label ?? grp.label ?? c.name, kicker: t("Ziel-Community") }
}
const membersText = (n: number) => n === 1 ? t("1 Mitglied") : t("{n} Mitglieder", { n: n.toLocaleString(LOCALE) })

function useJoin(c0: SocialCommunity, onJoined?: () => void) {
  const [c, setC] = useState(c0)
  useEffect(() => { setC(c0) }, [c0])
  const toggle = async () => {
    markSeen("communities")
    const was = c.joined
    const set = (j: boolean) => setC(q => ({ ...q, joined: j, members: Math.max(0, q.members + (j ? 1 : -1)) }))
    set(!was)
    await ensureMe()
    const ok = await (was ? api.leave(c.id) : api.join(c.id))
    if (!ok) { set(was); flash(OFFLINE()) } else if (!was) { flash(t("✓ Beigetreten")); onJoined?.() }
  }
  return [c, toggle] as const
}

function JoinBtn({ joined, onClick, small }: { joined: boolean; onClick: () => void; small?: boolean }) {
  return <InkBtn on={joined} onClick={onClick} style={small ? { minHeight: 44, padding: "0 14px", fontSize: "0.84rem", borderRadius: 12, width: "100%" } : { width: "100%" }}>{joined ? t("✓ Beigetreten") : t("Beitreten")}</InkBtn>
}

function CommunityTile({ c0 }: { c0: SocialCommunity }) {
  const [c, toggle] = useJoin(c0)
  const m = meta(c)
  return (
    <div className="lab-card lab-rise" data-community={c.id} style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 22 }}>
      <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 0, height: 4, background: m.color }} />
      <button className="lab-press" onClick={() => openSocial({ kind: "community", id: c.id, c })} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "16px 12px 8px", background: "none", border: "none", color: "var(--text)", textAlign: "left", minHeight: 108 }}>
        <span style={{ width: 42, height: 42, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.35rem", background: `color-mix(in srgb, ${m.color} 20%, var(--surface-2))` }}>{m.emoji}</span>
        <span style={{ fontWeight: 900, fontSize: "0.95rem", lineHeight: 1.2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</span>
        <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-dim)" }}>{membersText(c.members)}</span>
      </button>
      <div style={{ padding: "0 10px 10px" }}><JoinBtn small joined={c.joined} onClick={() => void toggle()} /></div>
    </div>
  )
}

/** Start-Gruppe: große Zeile mit einem Beitreten-Knopf (ein Tipp). */
function StartGroupCard({ c0, onJoined }: { c0: SocialCommunity; onJoined?: () => void }) {
  const [c, toggle] = useJoin(c0, onJoined)
  const m = meta(c)
  return (
    <div className="lab-card lab-rise" data-community={c.id} data-featured={c.featured} style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 12, padding: "12px 12px 12px 16px", borderRadius: 22 }}>
      <span aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: m.color }} />
      <button className="lab-press" onClick={() => openSocial({ kind: "community", id: c.id, c })} style={{ flex: 1, minWidth: 0, minHeight: 56, display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", color: "var(--text)", textAlign: "left", padding: 0 }}>
        <span style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", background: `color-mix(in srgb, ${m.color} 22%, var(--surface-2))` }}>{m.emoji}</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 900, fontSize: "1.05rem", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</span>
          <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--text-dim)" }}>{membersText(c.members)}</span>
        </span>
      </button>
      <InkBtn on={c.joined} onClick={() => void toggle()} style={{ flexShrink: 0, minWidth: 100, minHeight: 52, fontSize: "1rem" }}>{c.joined ? t("✓ Dabei") : t("Beitreten")}</InkBtn>
    </div>
  )
}

// ═══ Home-Feed (Heute) ═══════════════════════════════════════════════════════════════════════
type FeedItem = { k: "post"; p: SocialPost; at: number } | { k: "off"; o: OfficialPost; at: number }
const HOME_FEED_MAX = 10

/**
 * Wischbarer Feed auf Heute (wie Instagram): Kolbi-Posts aus meinen Gruppen + Beiträge von Leuten, denen ich folge
 * (bei wenig Inhalt ergänzt um Beiträge zu meinen Supplements). Chronologisch, kein Ranking.
 * Noch keine Gruppe → Start-Gruppen mit einem Tipp beitreten. Fehler → null (Bereich zeigt dann nur den Rest).
 */
export function HomeFeed({ myLibs, onSelfTest, onEmpty }: { myLibs: Set<string>; onSelfTest?: (libId: string) => void; onEmpty?: (empty: boolean) => void }) {
  // Stabiler Schlüssel: nur neu laden, wenn sich die Menge der Supplements wirklich ändert (nicht bei jeder Einnahme)
  const libsKey = [...myLibs].sort().join(",")
  const [st, setSt] = useState<{ state: "loading" | "ok" | "offline"; items: FeedItem[]; comms: SocialCommunity[] }>({ state: "loading", items: [], comms: [] })
  const [reload, setReload] = useState(0)
  const [idx, setIdx] = useState(0)
  const rowRef = useRef<HTMLDivElement | null>(null)
  useHideVersion()
  useBlocked()
  useRestricted()
  useDecisions()
  useEffect(() => {
    let on = true
    void (async () => {
      await ensureMe()
      const [a, cs] = await Promise.all([api.feed("following", undefined, { home: true }), api.communities()])
      if (!on) return
      if (!a) { setSt({ state: "offline", items: [], comms: [] }); return }
      let posts = a.posts
      if (posts.length < 3) {
        const b = await api.feed("discover")
        posts = [...posts, ...(b?.posts ?? []).filter(p => myLibs.has(p.lib))]
      }
      const uniq = [...new Map(posts.map(p => [p.id, p])).values()].filter(p => LIB_BY_ID[p.lib])
      const items: FeedItem[] = [
        ...uniq.map(p => ({ k: "post" as const, p, at: Date.parse(p.createdAt) })),
        ...(a.official ?? []).map(o => ({ k: "off" as const, o, at: Date.parse(`${o.date}T00:00:00Z`) + 86399999 })),
      ].sort((x, y) => y.at - x.at).slice(0, HOME_FEED_MAX)
      if (on) setSt({ state: "ok", items, comms: Array.isArray(cs) ? cs : [] })
    })()
    return () => { on = false }
  }, [reload, libsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const items = st.items.filter(it => it.k === "off" || visible(it.p))
  const joined = st.comms.filter(c => c.joined)
  const start = st.comms.filter(c => c.featured && !c.joined).sort((a, b) => (a.featured ?? 99) - (b.featured ?? 99)).slice(0, 3)
  const empty = st.state === "ok" && !items.length
  useEffect(() => { if (st.state !== "loading") onEmpty?.(st.state === "offline" || (empty && !start.length)) }, [st.state, empty, start.length]) // eslint-disable-line react-hooks/exhaustive-deps
  if (restricted) return null
  if (st.state === "loading") return <div className="lab-shine" style={{ height: 120, borderRadius: 18, background: "linear-gradient(90deg, var(--surface-2), var(--surface), var(--surface-2))" }} />
  if (st.state === "offline") return null
  const onScroll = () => {
    const el = rowRef.current
    if (!el || !el.firstElementChild) return
    const w = (el.firstElementChild as HTMLElement).offsetWidth + 10
    setIdx(Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / w))))
  }
  const name = (id?: string) => { const c = id ? st.comms.find(x => x.id === id) : undefined; return c ? meta(c).title : undefined }
  return (
    <div data-home-feed>
      {items.length > 0 && <>
        <div ref={rowRef} onScroll={onScroll} role="list" aria-label={t("Neue Beiträge")} style={{
          display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain",
          margin: "0 -14px", padding: "2px 14px 6px", scrollPaddingLeft: 14, scrollbarWidth: "none", alignItems: "flex-start",
        }}>
          {items.map(it => (
            <div key={it.k === "post" ? it.p.id : `o-${it.o.id}`} role="listitem" style={{ flex: `0 0 ${items.length === 1 ? "100%" : "88%"}`, scrollSnapAlign: "start", minWidth: 0 }}>
              {it.k === "post"
                ? <PostCard p={it.p} onSelfTest={onSelfTest} compact />
                : (() => {
                    const c = st.comms.find(x => x.id === it.o.community)
                    // Community unbekannt (alte App-Version / offline) → voller Text, nicht anklickbar
                    return <OfficialCard o={it.o} where={name(it.o.community)} onOpen={c ? () => { markOfficialSeen(c.id, { id: it.o.id, date: it.o.date }); openSocial({ kind: "community", id: c.id, c }) } : undefined} />
                  })()}
            </div>
          ))}
        </div>
        {items.length > 1 && (
          <div aria-hidden style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 6 }}>
            {items.map((it, j) => <span key={j} style={{ width: j === idx ? 16 : 6, height: 6, borderRadius: 6, background: j === idx ? "var(--accent)" : "var(--border)", transition: "width .3s ease, background .3s ease" }} />)}
          </div>
        )}
      </>}
      {!joined.length && start.length > 0 && (
        <div style={{ marginTop: items.length ? 12 : 0 }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-dim)", margin: "0 0 8px" }}>{t("Tritt einer Start-Gruppe bei – dann füllt sich dein Feed:")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {start.map(c => <StartGroupCard key={c.id} c0={c} onJoined={() => setReload(x => x + 1)} />)}
          </div>
        </div>
      )}
      {empty && !start.length && <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.4 }}>{t("Noch keine neuen Beiträge aus deinen Labs.")}</div>}
    </div>
  )
}

/** Labor › Communities: Start-Gruppen oben, darunter Suche-Ergebnisse/Kacheln (Beigetretene zuerst). */
export function CommunitiesView() {
  const on = useSocialOn()
  const [q, setQ] = useState("")
  const [list, setList] = useState<SocialCommunity[] | null | "loading">("loading")
  const [retry, setRetry] = useState(0)
  useEffect(() => { markSeen("communities") }, [])
  useEffect(() => {
    if (!on) return
    let alive = true
    setList("loading")
    const id = setTimeout(() => { void ensureMe().then(() => api.communities(q.trim() || undefined)).then(v => { if (alive) setList(Array.isArray(v) ? v : null) }) }, q ? 300 : 0)
    return () => { alive = false; clearTimeout(id) }
  }, [on, q, retry])
  if (!on) return <JoinIntro text={t("Tritt Labs zu deinen Supplements oder Ziel-Communities wie Schlaf und Fokus bei – und sieh, was andere dort testen.")} />
  const all = Array.isArray(list) ? list : []
  const start = q ? [] : all.filter(c => c.featured).sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0))
  const sorted = all.filter(c => !start.includes(c)).sort((a, b) => Number(b.joined) - Number(a.joined) || b.members - a.members)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--glass-line)", color: "var(--text-dim)" }}>
        <Icon name="search" size={18} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("Community suchen …")} maxLength={40} aria-label={t("Community suchen …")}
          style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", padding: "13px 0", fontSize: "0.95rem", outline: "none" }} />
        {q && <button onClick={() => setQ("")} aria-label={t("Schließen")} style={{ width: 44, height: 44, background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.95rem" }}>✕</button>}
      </label>
      {list === "loading" ? <Loading h={240} />
        : list === null ? <Offline onRetry={() => setRetry(x => x + 1)} />
        : sorted.length || start.length ? <>
          {start.length > 0 && <>
            <div style={{ fontSize: "0.82rem", fontWeight: 900, color: "var(--text-dim)", padding: "0 2px" }}>{t("Start-Gruppen")}</div>
            <div data-start-groups style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {start.map(c => <StartGroupCard key={c.id} c0={c} />)}
            </div>
            {sorted.length > 0 && <div style={{ fontSize: "0.82rem", fontWeight: 900, color: "var(--text-dim)", padding: "6px 2px 0" }}>{t("Alle Communities")}</div>}
          </>}
          {sorted.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {sorted.map(c => <CommunityTile key={c.id} c0={c} />)}
          </div>}
        </> : <Empty mood="think" title={q ? t("Nichts gefunden") : t("Noch keine Communities")} text={q ? t("Probier einen Supplement-Namen oder ein Ziel wie „Schlaf“.") : t("Schau später wieder rein.")} />}
    </div>
  )
}

function CommunityScreen({ id, c0, onSelfTest }: { id: string; c0?: SocialCommunity; onSelfTest?: (libId: string) => void }) {
  const [c, setC] = useState<SocialCommunity | null | "loading">(c0 ?? "loading")
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (c0) return
    let alive = true
    setC("loading")
    void ensureMe().then(() => api.communities()).then(v => { if (alive) setC(Array.isArray(v) ? v.find(x => x.id === id) ?? null : null) })
    return () => { alive = false }
  }, [id, c0, retry])
  if (c === "loading") return <div><TabHead onBack={backSocial} kicker={t("Community")} title="…" /><Loading /></div>
  if (!c) return <div><TabHead onBack={backSocial} kicker={t("Community")} title={t("Community")} /><Offline onRetry={() => setRetry(x => x + 1)} /></div>
  return <CommunityBody c0={c} onSelfTest={onSelfTest} />
}

function CommunityBody({ c0, onSelfTest }: { c0: SocialCommunity; onSelfTest?: (libId: string) => void }) {
  const [c, toggle] = useJoin(c0)
  const m = meta(c)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <TabHead onBack={backSocial} kicker={m.kicker} title={m.title}
        right={<span aria-hidden style={{ width: 48, height: 48, borderRadius: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", background: `color-mix(in srgb, ${m.color} 24%, var(--surface-2))`, border: `2px solid ${m.color}` }}>{m.emoji}</span>} />
      <div className="lab-card lab-rise" style={{ padding: "22px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center", borderRadius: 28 }}>
        <div style={{ fontSize: "3rem", fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{c.members.toLocaleString(LOCALE)}</div>
        <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-dim)" }}>{c.members === 1 ? t("Mitglied") : t("Mitglieder")}</div>
        <div style={{ width: "100%", maxWidth: 320, marginTop: 10 }}><JoinBtn joined={c.joined} onClick={() => void toggle()} /></div>
      </div>
      <div style={{ fontSize: "0.82rem", fontWeight: 900, color: "var(--text-dim)", padding: "0 2px" }}>{t("Beiträge")}</div>
      <PostFeed feedKey={`c-${c.id}`} load={cur => api.communityFeed(c.id, cur)} onSelfTest={onSelfTest}
        onOfficial={o => { if (o[0]) markOfficialSeen(c.id, o[0]) }}
        empty={<Empty title={t("Noch keine Beiträge")} text={t("Sobald jemand hier ein Ergebnis postet, siehst du es hier.")} />} />
    </div>
  )
}

/** Gemeinsame Ansicht für Profil-/Community-Seiten (legt sich über den Reiter). */
export function SocialScreen({ v, onSelfTest }: { v: SocialView; onSelfTest?: (libId: string) => void }) {
  return v.kind === "profile" ? <ProfileScreen id={v.id} onSelfTest={onSelfTest} /> : <CommunityScreen id={v.id} c0={v.c} onSelfTest={onSelfTest} />
}

// ═══ Lab-Seite: Community beitreten + Reiter „Beiträge“ ═══════════════════════════════════════
const labCache = new Map<string, SocialCommunity | null>()
function useLabCommunity(lib: LibSupp | undefined, on: boolean) {
  // "none" = es gibt (noch) keine Community zu diesem Supplement · null = offline
  const [c, setC] = useState<SocialCommunity | null | "loading" | "none">(() => lib && labCache.has(lib.id) ? labCache.get(lib.id) ?? "none" : "loading")
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!lib || !on) return
    let alive = true
    void ensureMe().then(() => api.communities(lib.id)).then(v => { // Suche trifft auch den Schlüssel (= Bibliotheks-ID)
      const hit = Array.isArray(v) ? v.find(x => x.kind === "lab" && x.key === lib.id) ?? null : null
      if (Array.isArray(v)) labCache.set(lib.id, hit)
      if (alive) setC(Array.isArray(v) ? hit ?? "none" : null)
    })
    return () => { alive = false }
  }, [lib, on, retry])
  return [c, () => setRetry(x => x + 1)] as const
}

/** Kleiner Knopf auf der Lab-Seite (Überblick): „👥 Community beitreten“ / „✓ In der Community“. */
export function LabJoinPill({ lib, style }: { lib: LibSupp; style: React.CSSProperties }) {
  const on = useSocialOn()
  const [c] = useLabCommunity(lib, on)
  if (!on) return <button className="lab-press" onClick={() => askSocial()} style={style}>👥 {t("Community beitreten")}</button>
  if (!c || c === "loading" || c === "none") return null
  return <LabJoinPillOn c0={c} style={style} />
}
function LabJoinPillOn({ c0, style }: { c0: SocialCommunity; style: React.CSSProperties }) {
  const [c, toggle] = useJoin(c0)
  return <button className="lab-press" aria-pressed={c.joined} onClick={() => { haptic(); void toggle() }} style={style}>{c.joined ? t("✓ In der Community") : `👥 ${t("Community beitreten")}`}</button>
}

/** Reiter „Beiträge“ einer Lab-Seite. */
export function LabPosts({ lib, onSelfTest }: { lib: LibSupp; onSelfTest?: (libId: string) => void }) {
  const on = useSocialOn()
  const [c, again] = useLabCommunity(lib, on)
  if (!on) return <JoinIntro text={t("Sieh geteilte Ergebnisse zu {name}, folge anderen und tritt der Community bei.", { name: lib.name })} />
  if (c === "loading") return <Loading />
  if (!c) return <Offline onRetry={again} />
  if (c === "none") return <Empty mood="think" title={t("Noch keine Community")} text={t("Zu diesem Supplement gibt es noch keine Community. Schau später wieder rein.")} />
  return <LabPostsOn c0={c} onSelfTest={onSelfTest} />
}
function LabPostsOn({ c0, onSelfTest }: { c0: SocialCommunity; onSelfTest?: (libId: string) => void }) {
  const [c, toggle] = useJoin(c0)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="lab-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 20 }}>
        <button className="lab-press" onClick={() => openSocial({ kind: "community", id: c.id, c })} style={{ flex: 1, minWidth: 0, minHeight: 44, background: "none", border: "none", color: "var(--text)", textAlign: "left", padding: 0 }}>
          <span style={{ display: "block", fontWeight: 900, fontSize: "1.1rem", fontVariantNumeric: "tabular-nums" }}>{membersText(c.members)}</span>
          <span style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, color: "var(--text-dim)" }}>{t("in der Community ›")}</span>
        </button>
        <div style={{ width: 140, flexShrink: 0 }}><JoinBtn small joined={c.joined} onClick={() => void toggle()} /></div>
      </div>
      <PostFeed feedKey={`lab-${c.id}`} load={cur => api.communityFeed(c.id, cur)} onSelfTest={onSelfTest}
        onOfficial={o => { if (o[0]) markOfficialSeen(c.id, o[0]) }}
        empty={<Empty title={t("Noch keine Beiträge")} text={t("Nach deinem Test kannst du dein Ergebnis hier als Erstes posten.")} />} />
    </div>
  )
}

// ═══ Einstellungen › Social-Konto ═════════════════════════════════════════════════════════════
export function SocialSettingsCard() {
  const on = useSocialOn()
  const blocked = useBlocked()
  const [del, setDel] = useState(false)
  const [off, setOff] = useState(false)
  const [busy, setBusy] = useState(false)
  const locked = useRestricted()
  const decs = useDecisions()
  const [allDecs, setAllDecs] = useState(false)
  const account = on || hadAccount()
  useEffect(() => { if (on) void ensureMe() }, [on])
  const unblockOne = async (b: Blocked) => {
    const ok = await api.unblock(b.id)
    if (!ok) { flash(OFFLINE()); return }
    setBlocked(blockedList().filter(x => x.id !== b.id))
    hideVer++; emit()
    flash(t("{name} ist nicht mehr blockiert", { name: b.name }))
  }
  const doDelete = async () => {
    setBusy(true)
    const ok = await deleteSocialAccount()
    setBusy(false)
    if (!ok) { flash(t("Gerade keine Verbindung – nichts gelöscht. Versuch es später nochmal.")); return }
    setDel(false); setOff(false); clearSocial()
    flash(t("✓ Social-Konto gelöscht"))
  }
  return (
    <div className="lab-card" style={{ padding: 16, marginBottom: 12 }} data-social-settings>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontWeight: 900, fontSize: "0.95rem" }}>👥 {t("Social-Konto")}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
        <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>{t("Sichtbar mitmachen")}</span>
        <button className="lab-press" role="switch" aria-checked={on} aria-label={t("Sichtbar mitmachen")} onClick={() => {
          if (on) setOff(true); else askSocial()
        }} style={{ width: 60, height: 44, border: "none", background: "none", padding: "7px 4px", flexShrink: 0 }}>
          <span style={{ display: "block", position: "relative", width: 52, height: 30, borderRadius: 999, background: on ? "var(--accent)" : "var(--surface-2)", transition: "background .25s" }}>
            <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: 999, background: "#fff", transition: "left .3s cubic-bezier(.34,1.56,.64,1)", boxShadow: "0 1px 4px rgba(0,0,0,.25)" }} />
          </span>
        </button>
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.45 }}>
        {locked ? <>{t("Dein Social-Konto ist gesperrt. Du kannst es nur noch löschen.")}{banReason() && <> {t("Begründung: {note}", { note: banReason() })}</>}</>
          : on ? t("Andere sehen dein Pseudonym, deinen Kolbi-Avatar und was du postest. Tagesdaten und Notizen bleiben privat.")
          : account ? t("Aus: Du machst gerade nicht mit. Profil und Beiträge bleiben gespeichert und für andere sichtbar, bis du sie löschst.")
          : t("Aus: Niemand sieht dich. Deine Daten bleiben auf dem Gerät.")}
      </div>
      {account && decs.length > 0 && <div data-mod-decisions>
        <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "var(--text-dim)", marginTop: 14 }}>{t("Moderations-Entscheidungen")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
          {decs.slice(0, allDecs ? 50 : 3).map((d, i) => <DecisionRow key={i} d={d} />)}
        </div>
        {decs.length > 3 && !allDecs && <button className="lab-press" onClick={() => setAllDecs(true)} style={{ minHeight: 44, padding: 0, background: "none", border: "none", color: "var(--text)", fontWeight: 800, fontSize: "0.84rem" }}>{t("Alle {n} anzeigen ›", { n: decs.length })}</button>}
        <div><AppealLink /></div>
      </div>}
      {on && !locked && blocked.length > 0 && <>
        <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "var(--text-dim)", marginTop: 14 }}>{t("Blockiert ({n})", { n: blocked.length })}</div>
        {blocked.map(b => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, marginTop: 4 }}>
            <PublicAvatar avatar={b.avatar} size={34} />
            <span style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
            <button className="lab-press" onClick={() => void unblockOne(b)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontWeight: 800, fontSize: "0.82rem" }}>{t("Aufheben")}</button>
          </div>
        ))}
      </>}
      {account && (
        <button className="lab-press" onClick={() => setDel(true)} style={{ marginTop: 10, minHeight: 44, padding: 0, background: "none", border: "none", color: "var(--danger)", fontSize: "0.84rem", fontWeight: 800 }}>{t("Social-Konto löschen")}</button>
      )}
      {off && (
        <Sheet open onClose={() => setOff(false)} z={460} portal title={t("Sichtbar mitmachen ausschalten?")}>
          <div style={{ fontSize: "0.9rem", lineHeight: 1.5, fontWeight: 700 }}>{t("Ausschalten pausiert nur: Dein Profil, deine Posts, Follower und Communities bleiben gespeichert und für andere sichtbar. Wenn du alles entfernen willst, lösch dein Social-Konto.")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
            <Btn variant="danger" full disabled={busy} onClick={() => void doDelete()} style={{ minHeight: 48 }}>{busy ? t("Lädt …") : t("Social-Konto löschen")}</Btn>
            <Btn variant="soft" full onClick={() => { api.setSocialConsent(false); emit(); clearSocial(); setOff(false); flash(t("Sichtbar mitmachen ist aus. Profil und Beiträge bleiben gespeichert und für andere sichtbar, bis du sie löschst.")) }} style={{ minHeight: 48 }}>{t("Nur ausschalten")}</Btn>
            <Btn variant="ghost" full onClick={() => setOff(false)} style={{ minHeight: 48 }}>{t("Abbrechen")}</Btn>
          </div>
        </Sheet>
      )}
      {del && (
        <Sheet open onClose={() => setDel(false)} z={460} portal title={t("Social-Konto löschen?")}>
          <div style={{ fontSize: "0.9rem", lineHeight: 1.5, fontWeight: 700 }}>{t("Gelöscht werden dein öffentliches Profil, deine Posts, Reaktionen, Follower und Community-Mitgliedschaften. Deine Tagesdaten auf diesem Gerät bleiben.")}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <Btn variant="soft" onClick={() => setDel(false)} style={{ flex: 1, minHeight: 48 }}>{t("Abbrechen")}</Btn>
            <Btn variant="danger" disabled={busy} onClick={() => void doDelete()} style={{ flex: 1, minHeight: 48 }}>{busy ? t("Lädt …") : t("Endgültig löschen")}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  )
}

// ═══ Testmodus (versteckt: 5× auf die Versionszeile tippen oder ?tester=1) ═══════════════════════
let testerUnlocked = false
let testerOn = false
function readTester() { testerUnlocked = api.testerUnlocked(); testerOn = api.testerMode() }
const useTester = () => {
  const u = useSyncExternalStore(subscribe, () => testerUnlocked, () => false)
  const o = useSyncExternalStore(subscribe, () => testerOn, () => false)
  return [u, o] as const
}
/** ?tester=1 in der Adresse schaltet den Schalter frei (einmal pro Gerät). */
function unlockFromUrl() {
  try { if (new URLSearchParams(window.location.search).get("tester") === "1") api.unlockTester() } catch {}
}

/** Unterste Zeile der Einstellungen: App-Version. 5× tippen → Testmodus-Schalter erscheint. */
export function VersionLine() {
  const [taps, setTaps] = useState(0)
  const [unlocked] = useTester()
  useEffect(() => { unlockFromUrl(); readTester(); emit() }, [])
  const tap = () => {
    if (unlocked) return
    const n = taps + 1
    setTaps(n)
    if (n >= 5) { api.unlockTester(); readTester(); emit(); haptic(20); flash(t("Testmodus-Schalter freigeschaltet")) }
  }
  return (
    <button onClick={tap} data-version-line aria-label={t("Version {v}", { v: appVersion() })} style={{ display: "block", width: "100%", minHeight: 44, marginTop: 8, background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.72rem", fontWeight: 700, textAlign: "center", WebkitTapHighlightColor: "transparent" }}>
      Kolbi · {t("Version {v}", { v: appVersion() })}
    </button>
  )
}

/** Einstellungen: „Testmodus (für Tester)“ – nur sichtbar, wenn freigeschaltet. */
export function TesterSettingsCard() {
  const [unlocked, on] = useTester()
  const [busy, setBusy] = useState(false)
  const [off, setOff] = useState(false)
  useEffect(() => { unlockFromUrl(); readTester(); emit() }, [])
  if (!unlocked) return null
  const apply = async (v: boolean) => {
    setBusy(true)
    myId = null // neu anmelden: Server-Stand + Feeds frisch
    const ok = await api.setTester(v)
    setBusy(false)
    if (!ok) { flash(OFFLINE()); return }
    readTester(); hideVer++; emit()
    flash(v ? t("Testmodus an – deine Beiträge sehen nur andere Tester.") : t("Testmodus aus"))
  }
  const toggle = () => {
    if (busy) return
    if (on) { setOff(true); return }
    askSocial(() => { void apply(true) })
  }
  const doDelete = async () => {
    setBusy(true)
    const ok = await deleteSocialAccount()
    setBusy(false)
    if (!ok) { flash(t("Gerade keine Verbindung – nichts gelöscht. Versuch es später nochmal.")); return }
    readTester(); setOff(false); clearSocial(); emit()
    flash(t("✓ Testprofil gelöscht"))
  }
  return (
    <div className="lab-card" style={{ padding: 16, marginBottom: 12, border: "1px dashed var(--warning)" }} data-tester-settings>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: "0.95rem" }}>🧪 {t("Testmodus (für Tester)")} {on && <TestBadge />}</span>
        <button className="lab-press" role="switch" aria-checked={on} aria-label={t("Testmodus (für Tester)")} disabled={busy} onClick={toggle} style={{ width: 60, height: 44, border: "none", background: "none", padding: "7px 4px", flexShrink: 0, opacity: busy ? 0.5 : 1 }}>
          <span style={{ display: "block", position: "relative", width: 52, height: 30, borderRadius: 999, background: on ? "var(--warning)" : "var(--surface-2)", transition: "background .25s" }}>
            <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: 999, background: "#fff", transition: "left .3s cubic-bezier(.34,1.56,.64,1)", boxShadow: "0 1px 4px rgba(0,0,0,.25)" }} />
          </span>
        </button>
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.45, marginTop: 4 }}>
        {on ? t("An: Dein Profil und alles, was du jetzt teilst, sehen nur andere Tester. Du siehst echte Beiträge und Test-Beiträge (mit „TEST“).")
          : t("Zum Ausprobieren von Teilen, Folgen, Reaktionen und Melden, ohne den echten Feed zu stören. Test-Inhalte sehen nur andere Tester.")}
      </div>
      {off && (
        <Sheet open onClose={() => setOff(false)} z={460} portal title={t("Testmodus ausschalten?")}>
          <div style={{ fontSize: "0.9rem", lineHeight: 1.5, fontWeight: 700 }}>{t("Ein Testprofil bleibt immer unsichtbar für echte Nutzer. Zum Ausschalten wird es gelöscht – mit allen Test-Beiträgen, Reaktionen und Follows. Danach kannst du ein normales Profil anlegen.")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
            <Btn variant="danger" full disabled={busy} onClick={() => void doDelete()} style={{ minHeight: 48 }}>{busy ? t("Lädt …") : t("Testprofil löschen")}</Btn>
            <Btn variant="ghost" full onClick={() => setOff(false)} style={{ minHeight: 48 }}>{t("Abbrechen")}</Btn>
          </div>
        </Sheet>
      )}
    </div>
  )
}
