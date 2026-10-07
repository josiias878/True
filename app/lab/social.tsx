"use client"
// ── Kolbi Social S2: Einwilligung, Ergebnis-Posts, Profile, Folgen, Communities, Melden/Blockieren ──
// „Sicher zuerst“: kein Freitext, keine Bilder – nur strukturierte Ergebnisse, Pseudonym und Kolbi-Avatar.
// Lese-Flächen neutral (Grafit/Weiß), Lab-/Ziel-Farben nur als Akzent, Grün→Blau nur für „Selbst testen“.
// Server-Aufrufe ausschließlich über lib/labSocialApi (Edge Function „lab-social“).
import React, { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { DIMS, GOALS, LIB_BY_ID, type LabState, type LibSupp } from "@/lib/supplementLab"
import { AVATAR_ACCESSORIES, AVATAR_COLORS, AVATAR_MOODS, DEFAULT_AVATAR, LAB_GROUPS, avatarColorBg, labColor, loadAvatar, pseudoSeed, pseudonym, type LabAvatar, type LabGroup } from "@/lib/labSocial"
import { SITE_URL } from "@/lib/labGrow"
import { markSeen } from "@/lib/labNew"
import * as api from "@/lib/labSocialApi"
import type { ReactionKind, ReportReason, SocialCommunity, SocialPage, SocialPost, SocialProfile } from "@/lib/labSocialApi"
import { Btn, Icon, Sheet, TabHead, haptic } from "./ui"
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
/** Eigenes Konto (legt es bei Einwilligung an). null = offline/keine Einwilligung. */
export async function ensureMe(): Promise<string | null> {
  if (myId) return myId
  if (!api.socialConsent()) return null
  const a = await api.ensureAccount()
  myId = a?.id ?? null
  if (a && !!a.restricted !== restricted) restricted = !!a.restricted
  if (myId) emit()
  return myId
}
/** Vom Betreiber gesperrt → nur noch „Konto löschen“. */
const useRestricted = () => useSyncExternalStore(subscribe, () => restricted, () => false)
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
    myId = null; restricted = false
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

function ago(iso: string): string {
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
const signed = (v: number) => `${v > 0.04 ? "+" : v < -0.04 ? "−" : "±"}${dec(Math.abs(v), 1)}`
const decisionInfo = (d: SocialPost["decision"]) => ({
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

// ═══ Ergebnis-Post ═══════════════════════════════════════════════════════════════════════════
export function PostCard({ p, preview, onSelfTest }: { p: SocialPost; preview?: boolean; onSelfTest?: (libId: string) => void }) {
  const lib = LIB_BY_ID[p.lib]
  const color = labColor(lib)
  const d = decisionInfo(p.decision)
  const [mine, setMine] = useState<ReactionKind[]>(Array.isArray(p.mine) ? p.mine : [])
  const [counts, setCounts] = useState(p.counts ?? { durchhalten: 0, hilfreich: 0 })
  const [menu, setMenu] = useState(false)
  const own = preview || (!!myId && p.author?.id === myId)
  const dims = Object.entries(p.dims ?? {}).filter(([k, v]) => typeof v === "number" && Math.abs(v) >= 0.1 && DIMS.some(x => x.id === k))
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3)
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
  const pill: React.CSSProperties = { minHeight: 44, padding: "0 14px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: "0.86rem", whiteSpace: "nowrap" }
  return (
    <article className="lab-card lab-rise" data-post={p.id} style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 6px 8px 8px" }}>
        <button className="lab-press" disabled={preview} onClick={() => openSocial({ kind: "profile", id: p.author.id })} style={{ flex: 1, minWidth: 0, minHeight: 48, display: "flex", alignItems: "center", gap: 10, padding: "4px 6px", background: "none", border: "none", color: "var(--text)", textAlign: "left", borderRadius: 14 }}>
          <PublicAvatar avatar={p.author?.avatar} size={40} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 900, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.author?.name}</span>
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
            {dims.map(([k, v]) => { const x = DIMS.find(q => q.id === k)!; return (
              <span key={k} style={{ padding: "4px 10px", borderRadius: 999, background: "var(--surface)", fontSize: "0.78rem", fontWeight: 800 }}>{x.emoji} {x.label} {signed(v)}</span>
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
export function PostFeed({ feedKey, load, empty, offline, onSelfTest }: {
  feedKey: string; load: (cursor?: string) => Promise<SocialPage | null>; empty: React.ReactNode; offline?: React.ReactNode; onSelfTest?: (libId: string) => void
}) {
  const [st, setSt] = useState<{ state: "loading" | "ok" | "offline"; posts: SocialPost[]; next?: string }>({ state: "loading", posts: [] })
  const [more, setMore] = useState(false)
  const [retry, setRetry] = useState(0)
  useHideVersion()
  useBlocked()
  useRestricted()
  useEffect(() => {
    let on = true
    setSt({ state: "loading", posts: [] })
    void ensureMe().then(() => load()).then(r => {
      if (!on) return
      setSt(r && Array.isArray(r.posts) ? { state: "ok", posts: r.posts, next: r.next } : { state: "offline", posts: [] })
    })
    return () => { on = false }
  }, [feedKey, retry]) // eslint-disable-line react-hooks/exhaustive-deps
  const loadMore = async () => {
    if (!st.next) return
    setMore(true)
    const r = await load(st.next)
    setMore(false)
    if (!r) { flash(OFFLINE()); return }
    setSt(s => ({ state: "ok", posts: [...s.posts, ...r.posts.filter(p => !s.posts.some(q => q.id === p.id))], next: r.next }))
  }
  if (restricted) return <Empty mood="think" title={t("Dein Social-Konto ist gesperrt")} text={t("Du kannst es in den Einstellungen löschen. Deine eigenen Daten auf dem Gerät bleiben.")} />
  if (st.state === "loading") return <Loading />
  if (st.state === "offline") return <>{offline ?? <Offline onRetry={() => setRetry(x => x + 1)} />}</>
  const posts = st.posts.filter(visible)
  if (!posts.length && !st.next) return <>{empty}</>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {posts.map(p => <PostCard key={p.id} p={p} onSelfTest={onSelfTest} />)}
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
    const r = restricted ? false : await api.shareResultPost(s, suppId)
    setBusy(false)
    if (!r) { flash(restricted ? t("Dein Social-Konto ist gesperrt") : OFFLINE()); return }
    flash(t("✓ Gepostet – zu sehen in Entdecken"))
    onClose()
  }
  return (
    <Sheet open onClose={onClose} z={450} title={t("📣 Ergebnis posten")}>
      {preview ? <>
        <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "var(--text-dim)", marginBottom: 8 }}>{t("So sieht dein Beitrag aus")}</div>
        <PostCard p={preview} preview />
        <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.45, marginTop: 12 }}>
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
export function SocialHost({ s, onFlash }: { s: LabState; onFlash: (m: string) => void }) {
  useEffect(() => { flashFn = onFlash }, [onFlash])
  const a = useSyncExternalStore(subscribe, () => ask, () => null)
  const pf = useSyncExternalStore(subscribe, () => postFor, () => null)
  const closeAsk = useCallback(() => { ask = null; emit() }, [])
  const closePost = useCallback(() => { postFor = null; emit() }, [])
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

function useJoin(c0: SocialCommunity) {
  const [c, setC] = useState(c0)
  useEffect(() => { setC(c0) }, [c0])
  const toggle = async () => {
    markSeen("communities")
    const was = c.joined
    const set = (j: boolean) => setC(q => ({ ...q, joined: j, members: Math.max(0, q.members + (j ? 1 : -1)) }))
    set(!was)
    await ensureMe()
    const ok = await (was ? api.leave(c.id) : api.join(c.id))
    if (!ok) { set(was); flash(OFFLINE()) } else if (!was) flash(t("✓ Beigetreten"))
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

/** Labor › Communities: Suche + Kacheln (Beigetretene zuerst). */
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
  const sorted = Array.isArray(list) ? [...list].sort((a, b) => Number(b.joined) - Number(a.joined) || b.members - a.members) : []
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
        : sorted.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {sorted.map(c => <CommunityTile key={c.id} c0={c} />)}
          </div>
        ) : <Empty mood="think" title={q ? t("Nichts gefunden") : t("Noch keine Communities")} text={q ? t("Probier einen Supplement-Namen oder ein Ziel wie „Schlaf“.") : t("Schau später wieder rein.")} />}
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
  const account = on || hadAccount()
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
        {locked ? t("Dein Social-Konto ist gesperrt. Du kannst es nur noch löschen.")
          : on ? t("Andere sehen dein Pseudonym, deinen Kolbi-Avatar und was du postest. Tagesdaten und Notizen bleiben privat.")
          : account ? t("Aus: Du machst gerade nicht mit. Dein Profil und bisherige Posts bleiben gespeichert, bis du das Social-Konto löschst.")
          : t("Aus: Niemand sieht dich. Deine Daten bleiben auf dem Gerät.")}
      </div>
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
        <Sheet open onClose={() => setOff(false)} z={460} title={t("Sichtbar mitmachen ausschalten?")}>
          <div style={{ fontSize: "0.9rem", lineHeight: 1.5, fontWeight: 700 }}>{t("Ausschalten pausiert nur: Dein Profil, deine Posts, Follower und Communities bleiben gespeichert und für andere sichtbar. Wenn du alles entfernen willst, lösch dein Social-Konto.")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
            <Btn variant="danger" full disabled={busy} onClick={() => void doDelete()} style={{ minHeight: 48 }}>{busy ? t("Lädt …") : t("Social-Konto löschen")}</Btn>
            <Btn variant="soft" full onClick={() => { api.setSocialConsent(false); emit(); clearSocial(); setOff(false); flash(t("Sichtbar mitmachen ist aus. Ganz entfernen: „Social-Konto löschen“.")) }} style={{ minHeight: 48 }}>{t("Nur ausschalten")}</Btn>
            <Btn variant="ghost" full onClick={() => setOff(false)} style={{ minHeight: 48 }}>{t("Abbrechen")}</Btn>
          </div>
        </Sheet>
      )}
      {del && (
        <Sheet open onClose={() => setDel(false)} z={460} title={t("Social-Konto löschen?")}>
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
