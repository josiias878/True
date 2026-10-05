"use client"
// ── Wachstum: Lab-Pro-Karte, Freunde einladen, Bewertungs-Moment, Feedback ─────
import React, { useState } from "react"
import { todayIso, type LabState } from "@/lib/supplementLab"
import { PRICES, PRICE_LABEL, PRO_FEATURES, SITE_URL, betaDaysLeft, betaEndLabel, betaOpen, freeForAll, inviteFriends, isPro, nativeReview, openPaywall, sendFeedback, type ProFeature } from "@/lib/labGrow"
import { buy, paymentsReady, restorePurchases, storePrices, type Plan } from "@/lib/labBilling"
import { Btn, Sheet, haptic } from "./ui"
import { Mascot } from "./mascot"
import { track } from "@/lib/labStats"
import { t, isEn, euro } from "@/lib/labI18n"

const GRAD = "linear-gradient(135deg, #9085e9, #e87ba4)"

/**
 * Store-Preis-Eintrag lesen – heute ein String („19,99 €“), künftig evtl. ein Objekt mit Zusatzinfos
 * (z. B. `{ priceString, pricePerMonthString, trial }`). Funktioniert mit beiden Formen.
 */
type StoreEntry = string | { priceString?: unknown; price?: unknown; formattedPrice?: unknown; pricePerMonthString?: unknown; perMonth?: unknown; trial?: unknown }
const nonEmpty = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined)
const entry = (v: unknown): StoreEntry | undefined => (typeof v === "string" || (v && typeof v === "object") ? (v as StoreEntry) : undefined)
/** Lokalisierter Preis-String des Stores */
export function storePriceStr(v: unknown): string | undefined {
  const e = entry(v)
  return typeof e === "string" ? nonEmpty(e) : e ? nonEmpty(e.priceString) ?? nonEmpty(e.price) ?? nonEmpty(e.formattedPrice) : undefined
}
/** Monatspreis-String, falls der Store ihn liefert (für „nur … im Monat“) */
function storePerMonth(v: unknown): string | undefined {
  const e = entry(v)
  return e && typeof e === "object" ? nonEmpty(e.pricePerMonthString) ?? nonEmpty(e.perMonth) : undefined
}
/** Gratis-Woche nur, wenn der Store sie für diesen Nutzer ausdrücklich bestätigt */
function storeTrial(v: unknown): boolean {
  const e = entry(v)
  return !!e && typeof e === "object" && e.trial === true
}
type StorePrices = Partial<Record<Plan, unknown>>
const storeStrings = (sp: StorePrices): Partial<Record<Plan, string>> => ({ monthly: storePriceStr(sp.monthly), yearly: storePriceStr(sp.yearly), lifetime: storePriceStr(sp.lifetime) })

/** Lab Pro: in der Beta als „Gründer-Pro“ freigeschaltet – zeigt, was drin ist. */
export function ProCard({ s, startOpen = false, onPlans }: { s: LabState; startOpen?: boolean; onPlans?: () => void }) {
  const [open, setOpen] = useState(startOpen)
  // In der Store-App kommen die Preise aus dem Store (Währung/Land), sonst unsere Standardpreise
  const [storeRaw, setStore] = useState<StorePrices>({})
  React.useEffect(() => { storePrices().then(setStore) }, [])
  const store = storeStrings(storeRaw)
  // Tarife nur zeigen, wenn wirklich gekauft werden kann (Bezahl-Anbieter aktiv) oder in der Store-App (Prüfer)
  const canBuy = paymentsReady() || appPlatform() !== "web"
  const P = { monthly: store.monthly ? t("{p}/Monat", { p: store.monthly }) : PRICE_LABEL.monthly, yearly: store.yearly ? t("{p}/Jahr", { p: store.yearly }) : PRICE_LABEL.yearly, lifetime: store.lifetime ? t("{p} einmalig", { p: store.lifetime }) : PRICE_LABEL.lifetime }
  const pro = isPro(s)
  const founder = !!s.pro?.founder
  return (
    <div className="lab-rise" style={{ marginTop: 10, borderRadius: 24, overflow: "hidden", color: "#fff", background: GRAD, boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 12px 30px rgba(144,133,233,.3)" }}>
      <button className="lab-press" onClick={() => { haptic(); setOpen(o => !o) }} aria-expanded={open} style={{ width: "100%", border: "none", background: "transparent", color: "inherit", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textAlign: "left" }}>
        <span style={{ fontSize: "1.8rem" }}>{founder ? "🏅" : "⭐"}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontWeight: 900, fontSize: "1rem" }}>{founder ? t("Gründer-Pro aktiv") : pro ? t("Lab Pro aktiv") : "Lab Pro"}</span>
          <span style={{ display: "block", fontSize: "0.76rem", opacity: 0.92 }}>
            {founder ? t("Für dich für immer gratis – sonst {price}.", { price: P.yearly }) : pro ? t("Gerade noch frei – bald ab {price}", { price: P.monthly }) : t("ab {price}", { price: P.monthly })}
          </span>
        </span>
        <span style={{ fontWeight: 900, transform: open ? "rotate(90deg)" : "none", transition: "transform .3s" }}>›</span>
      </button>
      {open && (
        <div className="lab-fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 12px 10px" }}>
          {PRO_FEATURES.map(f => (
            <div key={f.title} style={{ background: "rgba(255,255,255,.16)", borderRadius: 16, padding: "10px 11px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.2rem" }}>{f.emoji}</span>
                {pro && <span style={{ width: 18, height: 18, borderRadius: 999, background: "#fff", color: "#9085e9", fontSize: "0.66rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
              </div>
              <div style={{ fontWeight: 900, fontSize: "0.8rem", marginTop: 2 }}>{f.title}</div>
              <div style={{ fontSize: "0.68rem", opacity: 0.9, lineHeight: 1.35 }}>{f.text}</div>
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1", fontSize: "0.7rem", opacity: 0.92, textAlign: "center", marginTop: 2, lineHeight: 1.45 }}>
            {t("Lab Pro: {m} · {y} · {l}", { m: P.monthly, y: P.yearly, l: P.lifetime })}<br />
            {betaOpen(todayIso()) && t("Beta: alles kostenlos. Wer bis {date} startet, behält Pro für immer.", { date: betaEndLabel() })}
          </div>
        </div>
      )}
      {/* Sichtbar, sobald gekauft werden kann (auch für Gründer): Tarife, Kauf und „Käufe wiederherstellen“ – Store-Prüfer müssen den Kauf finden */}
      {canBuy && <div style={{ padding: "0 12px 12px" }}>
        <button className="lab-press" onClick={() => { haptic(); onPlans?.(); openPaywall() }} style={{
          width: "100%", border: "none", borderRadius: 999, padding: "11px 14px", background: "#fff", color: "#6f63d9", fontWeight: 900, fontSize: "0.9rem", cursor: "pointer",
          boxShadow: "0 4px 14px rgba(60,40,120,.18)",
        }}>{t("Tarife ansehen")} ›</button>
      </div>}
    </div>
  )
}

/** Freunde einladen + Feedback – zwei kleine Knöpfe nebeneinander. */
export async function inviteWithFlash(onFlash: (m: string) => void) {
  haptic()
  const r = await inviteFriends()
  if (r === "copied") onFlash(t("🔗 Link kopiert – schick ihn weiter!"))
  else if (r === "shared") onFlash(t("💌 Danke fürs Weitersagen!"))
  else if (r === "failed") onFlash(t("⚠️ Teilen hat nicht geklappt"))
}
/** Untertitel für „Freunde einladen“ (Gründer-Pro-Frist während der Beta). */
export function inviteSub() {
  const d = betaDaysLeft(todayIso())
  return !betaOpen(todayIso()) ? t("Zusammen testen") : d === 1 ? t("Noch 1 Tag Gründer-Pro für sie") : t("Noch {n} Tage Gründer-Pro für sie", { n: d })
}

export function InviteRow({ onFlash, onFeedback }: { onFlash: (m: string) => void; onFeedback: () => void }) {
  const invite = () => inviteWithFlash(onFlash)
  const box: React.CSSProperties = { flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 20, border: "1px solid var(--glass-line)", background: "var(--surface)", textAlign: "left", color: "var(--text)" }
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <button className="lab-press" onClick={invite} style={box}>
        <span style={{ fontSize: "1.5rem" }}>💌</span>
        <span><span style={{ display: "block", fontWeight: 900, fontSize: "0.86rem" }}>{t("Freunde einladen")}</span><span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-dim)" }}>{inviteSub()}</span></span>
      </button>
      <button className="lab-press" onClick={() => { haptic(); onFeedback() }} style={box}>
        <span style={{ fontSize: "1.5rem" }}>💬</span>
        <span><span style={{ display: "block", fontWeight: 900, fontSize: "0.86rem" }}>Feedback</span><span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-dim)" }}>{t("Sag mir, was fehlt")}</span></span>
      </button>
    </div>
  )
}

type Mood = "love" | "ok" | "meh"
const FACES: { m: Mood; e: string; l: string }[] = [{ m: "love", e: "😍", l: t("Super") }, { m: "ok", e: "🙂", l: t("Ganz gut") }, { m: "meh", e: "😕", l: t("Geht so") }]

/**
 * Bewertungs-Moment nach einem Erfolgserlebnis (oder Feedback direkt, mit start="feedback").
 * 😍 → Store-Bewertung (native) bzw. Weitersagen · 🙂/😕 → was besser werden soll (anonym an Kolbi).
 */
export function ReviewSheet({ start = "ask", where, initialMood, onAnswer, onClose, onFlash }: {
  start?: "ask" | "feedback"; where?: string; initialMood?: Mood; onAnswer: (m: Mood) => void; onClose: () => void; onFlash: (m: string) => void
}) {
  const [step, setStep] = useState<"ask" | "love" | "feedback" | "thanks">(start)
  const [mood, setMood] = useState<Mood>(initialMood ?? (start === "feedback" ? "ok" : "love"))
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)

  const pick = async (m: Mood) => {
    haptic(); setMood(m); onAnswer(m); track(`review_${m}`)
    if (m === "love") { if (await nativeReview()) { onClose(); return } setStep("love") }
    else setStep("feedback")
  }
  const send = async () => {
    setBusy(true)
    const ok = await sendFeedback(mood, text, where ?? (start === "feedback" ? "kolbi" : "review"))
    setBusy(false)
    if (ok) setStep("thanks"); else onFlash(t("⚠️ Senden hat nicht geklappt – versuch's später nochmal"))
  }

  return (
    <Sheet open onClose={onClose}>
      <div style={{ textAlign: "center", padding: "6px 4px 4px" }}>
        <div className="lab-float" style={{ display: "inline-block" }}>
          <Mascot mood={step === "love" || step === "thanks" ? "party" : step === "feedback" ? "think" : "happy"} size={96} alive glow={step !== "feedback"} fill={0.85} />
        </div>

        {step === "ask" && <>
          <div style={{ fontSize: "1.35rem", fontWeight: 900, marginTop: 8 }}>{t("Wie gefällt dir Kolbi bisher?")}</div>
          <div style={{ fontSize: "0.86rem", color: "var(--text-dim)", marginTop: 4 }}>{t("Ehrlich – ich lerne daraus.")}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", margin: "20px 0 6px" }}>
            {FACES.map((f, i) => (
              <button key={f.m} className="lab-press lab-pop" onClick={() => pick(f.m)} style={{
                animationDelay: `${i * 70}ms`, flex: 1, maxWidth: 104, border: "1px solid var(--glass-line)", borderRadius: 22, padding: "14px 6px", background: "var(--surface-2)", color: "var(--text)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontWeight: 900, fontSize: "0.8rem",
              }}><span style={{ fontSize: "2.2rem" }}>{f.e}</span>{f.l}</button>
            ))}
          </div>
        </>}

        {step === "love" && <>
          <div style={{ fontSize: "1.35rem", fontWeight: 900, marginTop: 8 }}>{t("Yay, das freut mich! 🥳")}</div>
          <div style={{ fontSize: "0.88rem", color: "var(--text-dim)", margin: "4px 0 18px", lineHeight: 1.45 }}>{t("Kennst du jemanden, der auch Supplements nimmt? Zusammen testen macht mehr Spaß.")}</div>
          <Btn full onClick={async () => { const r = await inviteFriends(); if (r === "copied") onFlash(t("🔗 Link kopiert – schick ihn weiter!")); if (r !== "cancelled") onClose() }}>{t("💌 Kolbi weiterempfehlen")}</Btn>
          <Btn full variant="ghost" onClick={onClose} style={{ marginTop: 8 }}>{t("Vielleicht später")}</Btn>
        </>}

        {step === "feedback" && <>
          <div style={{ fontSize: "1.3rem", fontWeight: 900, marginTop: 8 }}>{start === "feedback" ? t("Was soll ich besser machen?") : t("Was fehlt dir noch?")}</div>
          {start === "feedback" && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "12px 0 2px" }}>
              {FACES.map(f => (
                <button key={f.m} className="lab-press" onClick={() => setMood(f.m)} aria-pressed={mood === f.m} style={{
                  border: "none", borderRadius: 999, padding: "6px 12px", fontWeight: 900, fontSize: "0.78rem",
                  background: mood === f.m ? "var(--accent)" : "var(--surface-2)", color: mood === f.m ? "#fff" : "var(--text-dim)",
                }}>{f.e} {f.l}</button>
              ))}
            </div>
          )}
          <textarea value={text} onChange={e => setText(e.target.value.slice(0, 1000))} rows={4} autoFocus placeholder={t("z. B. „Ich wünsche mir …“ oder „Das hat mich verwirrt …“")} style={{
            width: "100%", marginTop: 14, borderRadius: 18, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", padding: 14, fontSize: "0.95rem", fontFamily: "inherit", resize: "none", boxSizing: "border-box",
          }} />
          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", textAlign: "left", margin: "6px 2px 14px", lineHeight: 1.4 }}>{t("🔒 Geht anonym an Kolbis Entwickler – ohne Geräte-ID. Bitte keine Namen oder persönlichen Gesundheitsdaten.")}</div>
          <Btn full disabled={busy || !text.trim()} onClick={send}>{busy ? t("Sende …") : t("📨 Abschicken")}</Btn>
          <Btn full variant="ghost" onClick={onClose} style={{ marginTop: 8 }}>{t("Abbrechen")}</Btn>
        </>}

        {step === "thanks" && <>
          <div style={{ fontSize: "1.35rem", fontWeight: 900, marginTop: 8 }}>{t("Danke! 💚")}</div>
          <div style={{ fontSize: "0.88rem", color: "var(--text-dim)", margin: "4px 0 18px" }}>{t("Ich lese alles und werde besser.")}</div>
          <Btn full onClick={onClose}>{t("Gern geschehen")}</Btn>
        </>}
      </div>
    </Sheet>
  )
}


// ── Lab Pro: Sperre mit Vorschau + Pro-Seite ──────────────────────────────────

/** Zeigt den Inhalt mit Pro; ohne Pro eine freundliche Vorschau mit Schloss (öffnet die Pro-Seite). */
export function ProGate({ s, feature, children, gap = 0 }: { s: LabState; feature: ProFeature; children: React.ReactNode; gap?: number }) {
  if (isPro(s)) return <>{children}</>
  const f = PRO_FEATURES.find(x => x.id === feature)!
  return (
    <button className="lab-press lab-card" onClick={() => { haptic(); openPaywall(feature) }} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 16, marginBottom: gap, textAlign: "left", color: "var(--text)", cursor: "pointer",
      background: "linear-gradient(135deg, color-mix(in srgb, #9085e9 16%, var(--surface)), color-mix(in srgb, #e87ba4 12%, var(--surface)))",
    }}>
      <span style={{ fontSize: "1.8rem" }}>{f.emoji}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontWeight: 900 }}>{f.title}</span>
        <span style={{ display: "block", fontSize: "0.78rem", color: "var(--text-dim)" }}>{f.text}</span>
      </span>
      <span style={{ fontSize: "0.72rem", fontWeight: 900, padding: "6px 10px", borderRadius: 999, background: GRAD, color: "#fff", whiteSpace: "nowrap" }}>🔒 {t("Lab Pro")}</span>
    </button>
  )
}

const LEGAL = isEn ? { terms: `${SITE_URL}/en/terms`, privacy: `${SITE_URL}/en/privacy` } : { terms: `${SITE_URL}/nutzungsbedingungen`, privacy: `${SITE_URL}/datenschutz` }

/** Store-App (Capacitor) oder Web – ohne Import, damit Next (get-true.de/lab) nichts nachladen muss */
type Platform = "ios" | "android" | "web"
export function appPlatform(): Platform {
  try {
    const p = (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.()
    return p === "ios" || p === "android" ? p : "web"
  } catch { return "web" }
}

/**
 * Store-Preis lesen („19,99 €“, „$19.99“, „CHF 20.00“, „¥3,000“, „1.234,56 €“): Zahl + Formatierer, der
 * Währung, Trennzeichen und Nachkommastellen des Stores übernimmt (für „nur … im Monat“). Nicht lesbar → null.
 */
export function readPrice(str?: string): { value: number; fmt: (n: number) => string } | null {
  if (!str) return null
  const m = str.match(/\d(?:[\d.,\s  ']*\d)?/)
  if (!m || m.index === undefined) return null
  const raw = m[0], at = m.index
  const seps = raw.match(/[.,]/g) ?? []
  // Ein einziges Trennzeichen mit genau drei Ziffern danach („KWD 6.990“ vs. „¥3,000“) ist nicht eindeutig → lieber nichts rechnen
  if (seps.length === 1 && /[.,]\d{3}$/.test(raw)) return null
  // Zwei verschiedene Trennzeichen: das letzte ist das Komma-Zeichen, auch mit 3 Nachkommastellen („KWD 1,234.567“)
  const d = raw.match(new Set(seps).size > 1 ? /([.,])(\d{1,3})$/ : /([.,])(\d{1,2})$/)
  const intPart = d ? raw.slice(0, -d[0].length) : raw
  const group = intPart.match(/\D/)?.[0] ?? ""
  const value = Number(intPart.replace(/\D/g, "") + (d ? `.${d[2]}` : ""))
  if (!Number.isFinite(value) || value <= 0) return null
  const places = d ? d[2].length : 0
  const fmt = (n: number) => {
    const f = 10 ** places
    const [i, frac] = (Math.ceil(n * f - 1e-6) / f).toFixed(places).split(".") // aufrunden: nie zu niedrig anzeigen
    const int = group ? i.replace(/\B(?=(\d{3})+(?!\d))/g, group) : i
    return str.slice(0, at) + int + (frac ? d![1] + frac : "") + str.slice(at + raw.length)
  }
  return { value, fmt }
}

export function PaywallSheet({ s, from, onClose, onPurchased, onFlash }: {
  s: LabState; from?: ProFeature; onClose: () => void; onPurchased: (plan: Plan | "restored") => void; onFlash: (m: string) => void
}) {
  const [plan, setPlan] = useState<Plan>("yearly")
  const [busy, setBusy] = useState(false)
  // Preise kommen aus dem Store (Währung/Land/Steuer). null = lädt noch.
  const [store, setStore] = useState<StorePrices | null>(null)
  React.useEffect(() => { storePrices().then(setStore) }, [])
  const founder = !!s.pro?.founder
  const plat = appPlatform()
  const loading = paymentsReady() && store === null
  const sp = storeStrings(store ?? {})
  // Gratis-Woche nur, wenn der Store sie für diesen Nutzer bestätigt (sonst neutraler Abo-Text)
  const trial = storeTrial(store?.yearly)
  // Ohne Store-Preis: unsere Euro-Preise als Richtpreis (klar gekennzeichnet)
  const raw: Record<Plan, string> = {
    monthly: sp.monthly ?? euro(PRICES.monthly, true), yearly: sp.yearly ?? euro(PRICES.yearly, true), lifetime: sp.lifetime ?? euro(PRICES.lifetime, true),
  }
  const guide = !loading && (!sp.monthly || !sp.yearly || !sp.lifetime)
  const yp = readPrice(raw.yearly), mp = readPrice(raw.monthly)
  // Ersparnis und „pro Monat“ nur, wenn beide Preise aus derselben Quelle stammen
  const sameSource = !!sp.yearly === !!sp.monthly
  const save = sameSource && yp && mp ? Math.round((1 - yp.value / (mp.value * 12)) * 100) : 0
  const perMonth = storePerMonth(store?.yearly) ?? (yp ? yp.fmt(yp.value / 12) : "")
  const dots = "…"
  const yearlySub = [trial ? t("7 Tage gratis") : "", perMonth && !loading ? t("nur {p} im Monat", { p: perMonth }) : ""].filter(Boolean).join(" · ")
  const plans: { id: Plan; title: string; price: string; sub: string; badge?: string }[] = [
    { id: "yearly", title: t("Jährlich"), price: loading ? dots : t("{p}/Jahr", { p: raw.yearly }), sub: yearlySub, badge: save > 0 ? t("Beliebt · spar {n} %", { n: save }) : t("Beliebt") },
    { id: "monthly", title: t("Monatlich"), price: loading ? dots : t("{p}/Monat", { p: raw.monthly }), sub: t("jederzeit kündbar") },
    { id: "lifetime", title: t("Für immer"), price: loading ? dots : t("{p} einmalig", { p: raw.lifetime }), sub: t("einmal zahlen, kein Abo") },
  ]
  const go = async () => {
    haptic(); setBusy(true)
    const r = await buy(plan)
    setBusy(false)
    if (r === "ok") { onPurchased(plan); onFlash(t("🎉 Willkommen bei Lab Pro!")) }
    else if (r === "unavailable") onFlash(t("Bald verfügbar – gerade ist alles gratis 🎁"))
    else if (r === "error") onFlash(t("⚠️ Kauf hat nicht geklappt – versuch's gleich nochmal"))
  }
  const restore = async () => {
    setBusy(true)
    const r = await restorePurchases()
    setBusy(false)
    if (r) { onPurchased("restored"); onFlash(t("✓ Lab Pro wiederhergestellt")) }
    else onFlash(r === null ? t("Bald verfügbar – gerade ist alles gratis 🎁") : t("Kein Kauf gefunden"))
  }
  const hasSub = s.pro?.plan === "monthly" || s.pro?.plan === "yearly"
  const hl = from ? PRO_FEATURES.find(x => x.id === from) : undefined
  const link: React.CSSProperties = { color: "inherit", fontWeight: 800 }
  return (
    <Sheet open onClose={onClose}>
      <div style={{ margin: "-10px -18px 0", padding: "24px 20px 20px", borderRadius: "28px 28px 0 0", color: "#fff", textAlign: "center", background: GRAD, position: "relative", overflow: "hidden" }}>
        <div className="lab-float" style={{ display: "inline-block" }}><Mascot mood="party" size={86} alive glow fill={0.9} accessory="shades" /></div>
        <div style={{ fontSize: "1.6rem", fontWeight: 900, marginTop: 4 }}>Lab Pro</div>
        <div style={{ fontSize: "0.88rem", opacity: 0.92 }}>{hl ? t("{f} und alles andere freischalten", { f: hl.title }) : t("Hol mehr aus deinen eigenen Daten")}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "16px 0" }}>
        {PRO_FEATURES.map(f => (
          <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 14, background: f.id === from ? "var(--accent-dim)" : "var(--surface-2)" }}>
            <span style={{ fontSize: "1.1rem" }}>{f.emoji}</span>
            <span style={{ fontSize: "0.74rem", fontWeight: 800, lineHeight: 1.2 }}>{f.title}</span>
          </div>
        ))}
      </div>

      {founder && (
        <div style={{ textAlign: "center", padding: 12, borderRadius: 18, background: "var(--accent-dim)", marginBottom: 12 }}>
          <div style={{ fontWeight: 900 }}>🏅 {t("Du bist Gründer – Lab Pro ist für dich für immer gratis.")}</div>
          <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", marginTop: 2 }}>{t("Du musst nichts kaufen. Wenn du Kolbi trotzdem unterstützen magst: danke! 💚")}</div>
        </div>
      )}
      <>
        <div role="radiogroup" aria-label={t("Tarif wählen")} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {plans.map(p => {
            const on = plan === p.id
            return (
              <button key={p.id} role="radio" aria-checked={on} className="lab-press" onClick={() => { haptic(6); setPlan(p.id) }} style={{
                position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 18, textAlign: "left", color: "var(--text)",
                border: on ? "2px solid #9085e9" : "2px solid var(--glass-line)", background: on ? "color-mix(in srgb, #9085e9 12%, var(--surface))" : "var(--surface)",
              }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, border: on ? "7px solid #9085e9" : "2px solid var(--border)", flexShrink: 0, boxSizing: "border-box" }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 900 }}>{p.title}</span>
                  {p.sub && <span style={{ display: "block", fontSize: "0.74rem", color: "var(--text-dim)" }}>{p.sub}</span>}
                </span>
                <span style={{ fontWeight: 900, whiteSpace: "nowrap" }}>{p.price}</span>
                {p.badge && <span style={{ position: "absolute", top: -9, right: 12, fontSize: "0.62rem", fontWeight: 900, padding: "3px 8px", borderRadius: 999, background: GRAD, color: "#fff" }}>{p.badge}</span>}
              </button>
            )
          })}
        </div>
        {guide && <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", textAlign: "center", marginTop: 8 }}>{t("Richtpreise in Euro – verbindlich ist der Preis, der dir beim Kauf angezeigt wird.")}</div>}
        {hasSub && plan === "lifetime" && <div style={{ fontSize: "0.74rem", textAlign: "center", marginTop: 8, fontWeight: 700 }}>{t("Du hast schon ein Abo? Es endet nicht von selbst – bitte danach in den Store-Einstellungen kündigen.")}</div>}
        <Btn full disabled={busy || loading} onClick={go} style={{ marginTop: 14 }}>{busy ? t("Einen Moment …") : founder ? t("💚 Kolbi trotzdem unterstützen") : t("Weiter")}</Btn>
        <button onClick={restore} disabled={busy} style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>{t("Käufe wiederherstellen")}</button>
        {/* Pflicht-Rechtstext (Apple 3.1.2 / Google Play) direkt beim Kaufknopf – store/subscriptions.md Teil D */}
        <div style={{ fontSize: "0.66rem", color: "var(--text-dim)", lineHeight: 1.5, marginTop: 10 }}>
          <b>{t("Jährlich:")}</b> {trial ? t("7 Tage gratis, danach {p} pro Jahr.", { p: raw.yearly }) : t("{p} pro Jahr.", { p: raw.yearly })}{" "}
          <b>{t("Monatlich:")}</b> {t("{p} pro Monat.", { p: raw.monthly })}{" "}
          {plat === "ios" ? <>
            {trial ? t("Die Zahlung wird bei Kaufbestätigung bzw. nach Ende der Gratis-Woche über deine Apple-ID abgerechnet.") : t("Die Zahlung wird bei Kaufbestätigung über deine Apple-ID abgerechnet.")}{" "}
            {t("Das Abo verlängert sich automatisch um denselben Zeitraum zum selben Preis, wenn du es nicht mindestens 24 Stunden vor Ablauf kündigst; die Verlängerung wird in den letzten 24 Stunden vor Ablauf belastet.")}{" "}
            {t("Kündigen und verwalten kannst du dein Abo jederzeit in den iPhone-Einstellungen unter [dein Name] → Abonnements.")}{" "}
            {trial && <>{t("Kündigst du in der Gratis-Woche, zahlst du nichts.")}{" "}</>}
          </> : plat === "android" ? <>
            {trial ? t("Die Zahlung wird bei Kaufbestätigung bzw. nach Ende der Gratis-Woche über dein Google-Play-Konto abgerechnet.") : t("Die Zahlung wird bei Kaufbestätigung über dein Google-Play-Konto abgerechnet.")}{" "}
            {t("Das Abo verlängert sich automatisch um denselben Zeitraum zum selben Preis, wenn du es nicht mindestens 24 Stunden vor Ablauf kündigst; die Verlängerung wird in den letzten 24 Stunden vor Ablauf belastet.")}{" "}
            {t("Kündigen und verwalten kannst du dein Abo jederzeit in der Google-Play-App unter Profil → Zahlungen & Abos → Abos.")}{" "}
            {trial && <>{t("Kündigst du in der Gratis-Woche, zahlst du nichts.")}{" "}</>}
          </> : <>
            {t("Das Abo verlängert sich automatisch, wenn du es nicht mindestens 24 Stunden vor Ablauf kündigst. Kündigen kannst du jederzeit in den Einstellungen deines Store-Kontos.")}{" "}
          </>}
          <b>{t("Für immer:")}</b> {t("einmalig {p}, kein Abo, keine Verlängerung.", { p: raw.lifetime })}
          <div style={{ textAlign: "center", marginTop: 6 }}>
            <a href={LEGAL.terms} target="_blank" rel="noreferrer" style={link}>{t("Nutzungsbedingungen")}</a> · <a href={LEGAL.privacy} target="_blank" rel="noreferrer" style={link}>{t("Datenschutz")}</a>
          </div>
        </div>
        {freeForAll() && <div style={{ fontSize: "0.72rem", textAlign: "center", marginTop: 10, fontWeight: 800, color: "var(--accent)" }}>{t("Gerade ist alles gratis 🎁")}</div>}
      </>
    </Sheet>
  )
}

/** Nach der Einrichtung in der Beta: „Du bist Gründer“ – Freude + Anlass zum Weitersagen */
export function FounderWelcome({ onClose, onFlash }: { onClose: () => void; onFlash: (m: string) => void }) {
  return (
    <div className="lab-fade" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 520, background: "rgba(5,5,12,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="lab-pop lab-card" onClick={e => e.stopPropagation()} style={{ padding: 26, textAlign: "center", maxWidth: 340, overflow: "hidden", position: "relative" }}>
        <div aria-hidden style={{ position: "absolute", inset: "0 0 auto 0", height: 120, background: GRAD, opacity: 0.25 }} />
        <div className="lab-float" style={{ display: "inline-block", position: "relative" }}><Mascot mood="party" size={104} alive glow fill={0.9} accessory="shades" /></div>
        <div style={{ fontSize: "0.72rem", fontWeight: 900, letterSpacing: ".1em", color: "#9085e9", marginTop: 6 }}>{t("GRÜNDER-BETA")}</div>
        <div style={{ fontSize: "1.45rem", fontWeight: 900, marginTop: 2 }}>🏅 {t("Du bist Gründer!")}</div>
        <div style={{ color: "var(--text-dim)", margin: "8px 0 18px", lineHeight: 1.45, fontSize: "0.9rem" }}>
          {t("Weil du in der Beta dabei bist, ist Lab Pro für dich für immer gratis – sonst {price}. Danke! 💚", { price: PRICE_LABEL.yearly })}
        </div>
        <Btn full onClick={async () => { const r = await inviteFriends(); if (r === "copied") onFlash(t("🔗 Link kopiert – schick ihn weiter!")); onClose() }}>💌 {t("Freunden Bescheid sagen")}</Btn>
        <Btn full variant="ghost" onClick={onClose} style={{ marginTop: 8 }}>{t("Los geht's")}</Btn>
      </div>
    </div>
  )
}
