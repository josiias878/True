"use client"
// ── Wachstum: Lab-Pro-Karte, Freunde einladen, Bewertungs-Moment, Feedback ─────
import React, { useState } from "react"
import type { LabState } from "@/lib/supplementLab"
import { BETA, PRO_FEATURES, PRO_PRICE, inviteFriends, isPro, nativeReview, sendFeedback } from "@/lib/labGrow"
import { Btn, Sheet, haptic } from "./ui"
import { Mascot } from "./mascot"
import { track } from "@/lib/labStats"
import { t } from "@/lib/labI18n"

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
            {founder ? t("Danke, dass du in der Beta dabei bist – Pro bleibt für dich gratis.") : pro ? t("Alles freigeschaltet") : t("Einmalig {price} · kein Abo", { price: PRO_PRICE })}
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
          {BETA && <div style={{ gridColumn: "1 / -1", fontSize: "0.7rem", opacity: 0.9, textAlign: "center", marginTop: 2 }}>{t("Beta: alles kostenlos. Später bleibt der Kern gratis, Pro kostet einmalig {price}.", { price: PRO_PRICE })}</div>}
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
        <span><span style={{ display: "block", fontWeight: 900, fontSize: "0.86rem" }}>{t("Freunde einladen")}</span><span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-dim)" }}>{t("Zusammen testen")}</span></span>
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
