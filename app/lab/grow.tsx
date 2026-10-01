"use client"
// ── Wachstum: Lab-Pro-Karte, Freunde einladen, Bewertungs-Moment, Feedback ─────
import React, { useState } from "react"
import { todayIso, type LabState } from "@/lib/supplementLab"
import { PRICES, PRICE_LABEL, PRO_FEATURES, SITE_URL, betaDaysLeft, betaEndLabel, betaOpen, freeForAll, inviteFriends, isPro, nativeReview, openPaywall, sendFeedback, type ProFeature } from "@/lib/labGrow"
import { buy, restorePurchases, storePrices, type Plan } from "@/lib/labBilling"
import { Btn, Sheet, haptic } from "./ui"
import { Mascot } from "./mascot"
import { track } from "@/lib/labStats"
import { t, isEn, euro } from "@/lib/labI18n"

const GRAD = "linear-gradient(135deg, #9085e9, #e87ba4)"

/** Lab Pro: in der Beta als „Gründer-Pro“ freigeschaltet – zeigt, was drin ist. */
export function ProCard({ s }: { s: LabState }) {
  const [open, setOpen] = useState(false)
  const pro = isPro(s)
  const founder = !!s.pro?.founder
  return (
    <div className="lab-rise" style={{ marginTop: 10, borderRadius: 24, overflow: "hidden", color: "#fff", background: GRAD, boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 12px 30px rgba(144,133,233,.3)" }}>
      <button className="lab-press" onClick={() => { haptic(); setOpen(o => !o) }} aria-expanded={open} style={{ width: "100%", border: "none", background: "transparent", color: "inherit", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textAlign: "left" }}>
        <span style={{ fontSize: "1.8rem" }}>{founder ? "🏅" : "⭐"}</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontWeight: 900, fontSize: "1rem" }}>{founder ? t("Gründer-Pro aktiv") : pro ? t("Lab Pro aktiv") : "Lab Pro"}</span>
          <span style={{ display: "block", fontSize: "0.76rem", opacity: 0.92 }}>
            {founder ? t("Für dich für immer gratis – sonst {price}.", { price: PRICE_LABEL.yearly }) : pro ? t("Gerade noch frei – bald ab {price}", { price: PRICE_LABEL.monthly }) : t("ab {price}", { price: PRICE_LABEL.monthly })}
          </span>
        </span>
        <span style={{ fontWeight: 900, transform: open ? "rotate(90deg)" : "none", transition: "transform .3s" }}>›</span>
      </button>
      {open && (
        <div className="lab-fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 12px 14px" }}>
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
            {t("Lab Pro: {m} · {y} · {l}", { m: PRICE_LABEL.monthly, y: PRICE_LABEL.yearly, l: PRICE_LABEL.lifetime })}<br />
            {betaOpen(todayIso()) && t("Beta: alles kostenlos. Wer bis {date} startet, behält Pro für immer.", { date: betaEndLabel() })}
          </div>
        </div>
      )}
    </div>
  )
}

/** Freunde einladen + Feedback – zwei kleine Knöpfe nebeneinander. */
export function InviteRow({ onFlash, onFeedback }: { onFlash: (m: string) => void; onFeedback: () => void }) {
  const invite = async () => {
    haptic()
    const r = await inviteFriends()
    if (r === "copied") onFlash(t("🔗 Link kopiert – schick ihn weiter!"))
    else if (r === "shared") onFlash(t("💌 Danke fürs Weitersagen!"))
    else if (r === "failed") onFlash(t("⚠️ Teilen hat nicht geklappt"))
  }
  const box: React.CSSProperties = { flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 20, border: "1px solid var(--glass-line)", background: "var(--surface)", textAlign: "left", color: "var(--text)" }
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <button className="lab-press" onClick={invite} style={box}>
        <span style={{ fontSize: "1.5rem" }}>💌</span>
        <span><span style={{ display: "block", fontWeight: 900, fontSize: "0.86rem" }}>{t("Freunde einladen")}</span><span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-dim)" }}>{(() => { const d = betaDaysLeft(todayIso()); return !betaOpen(todayIso()) ? t("Zusammen testen") : d === 1 ? t("Noch 1 Tag Gründer-Pro für sie") : t("Noch {n} Tage Gründer-Pro für sie", { n: d }) })()}</span></span>
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
export function ReviewSheet({ start = "ask", onAnswer, onClose, onFlash }: {
  start?: "ask" | "feedback"; onAnswer: (m: Mood) => void; onClose: () => void; onFlash: (m: string) => void
}) {
  const [step, setStep] = useState<"ask" | "love" | "feedback" | "thanks">(start)
  const [mood, setMood] = useState<Mood>(start === "feedback" ? "ok" : "love")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)

  const pick = async (m: Mood) => {
    haptic(); setMood(m); onAnswer(m); track(`review_${m}`)
    if (m === "love") { if (await nativeReview()) { onClose(); return } setStep("love") }
    else setStep("feedback")
  }
  const send = async () => {
    setBusy(true)
    const ok = await sendFeedback(mood, text, start === "feedback" ? "kolbi" : "review")
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

export function PaywallSheet({ s, from, onClose, onPurchased, onFlash }: {
  s: LabState; from?: ProFeature; onClose: () => void; onPurchased: (plan: Plan | "restored") => void; onFlash: (m: string) => void
}) {
  const [plan, setPlan] = useState<Plan>("yearly")
  const [busy, setBusy] = useState(false)
  const [store, setStore] = useState<Partial<Record<Plan, string>>>({})
  React.useEffect(() => { storePrices().then(setStore) }, [])
  const founder = !!s.pro?.founder
  const save = Math.round((1 - PRICES.yearly / (PRICES.monthly * 12)) * 100)
  const plans: { id: Plan; title: string; price: string; sub: string; badge?: string }[] = [
    { id: "yearly", title: t("Jährlich"), price: store.yearly ?? PRICE_LABEL.yearly, sub: t("nur {p} im Monat", { p: euro(PRICES.yearly / 12, true) }), badge: t("Beliebt · spar {n} %", { n: save }) },
    { id: "monthly", title: t("Monatlich"), price: store.monthly ?? PRICE_LABEL.monthly, sub: t("jederzeit kündbar") },
    { id: "lifetime", title: t("Für immer"), price: store.lifetime ?? PRICE_LABEL.lifetime, sub: t("einmal zahlen, kein Abo") },
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
  const hl = from ? PRO_FEATURES.find(x => x.id === from) : undefined
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

      {founder ? (
        <div style={{ textAlign: "center", padding: 14, borderRadius: 18, background: "var(--accent-dim)", fontWeight: 900 }}>🏅 {t("Du bist Gründer – Lab Pro ist für dich für immer gratis.")}</div>
      ) : <>
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
                  <span style={{ display: "block", fontSize: "0.74rem", color: "var(--text-dim)" }}>{p.sub}</span>
                </span>
                <span style={{ fontWeight: 900 }}>{p.price}</span>
                {p.badge && <span style={{ position: "absolute", top: -9, right: 12, fontSize: "0.62rem", fontWeight: 900, padding: "3px 8px", borderRadius: 999, background: GRAD, color: "#fff" }}>{p.badge}</span>}
              </button>
            )
          })}
        </div>
        <Btn full disabled={busy} onClick={go} style={{ marginTop: 14 }}>{busy ? t("Einen Moment …") : t("Weiter")}</Btn>
        <button onClick={restore} disabled={busy} style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>{t("Käufe wiederherstellen")}</button>
        <div style={{ fontSize: "0.66rem", color: "var(--text-dim)", lineHeight: 1.45, marginTop: 10, textAlign: "center" }}>
          {plan !== "lifetime" && <>{t("Das Abo verlängert sich automatisch, wenn du es nicht mindestens 24 Stunden vor Ablauf kündigst. Kündigen kannst du jederzeit in den Einstellungen deines Store-Kontos.")}{" "}</>}
          <a href={LEGAL.terms} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{t("Nutzungsbedingungen")}</a> · <a href={LEGAL.privacy} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{t("Datenschutz")}</a>
        </div>
        {freeForAll() && <div style={{ fontSize: "0.72rem", textAlign: "center", marginTop: 10, fontWeight: 800, color: "var(--accent)" }}>{t("Gerade ist alles gratis 🎁")}</div>}
      </>}
    </Sheet>
  )
}
