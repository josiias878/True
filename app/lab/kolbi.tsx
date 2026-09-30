"use client"
import React, { useState } from "react"
import { BADGES, LIB_BY_ID, levelFor, streak, type LabState } from "@/lib/supplementLab"
import { FACT_COUNT, learnedFacts } from "@/lib/labKnowledge"
import type { CoachAction, CoachMsg, Mood } from "@/lib/labCoach"
import { Label } from "./ui"
import { Guide, MASCOT_NAME, Mascot, TipsList } from "./mascot"

const JOBS = [
  { emoji: "⏰", title: "Erinnern", text: "Zur richtigen Zeit – gebündelt, nicht nervig." },
  { emoji: "🔬", title: "Testen", text: "Eins nach dem anderen, damit man's sieht." },
  { emoji: "📊", title: "Auswerten", text: "Ich vergleiche mit deinem Normal." },
  { emoji: "💡", title: "Erklären", text: "Timing, Partner, Nebenwirkungen." },
  { emoji: "🛒", title: "Vorrat", text: "Ich sag dir, bevor was leer ist." },
  { emoji: "📚", title: "Lernen", text: "Jeden Tag ein kleiner Fakt." },
]

/** Kolbi-Tab: seine Tipps, warum er so aussieht, was er macht, Wissens-Album, Abzeichen, Hilfe. */
export function KolbiPage({ s, mood, fill, murky, msgs, onAction }: {
  s: LabState; mood: Mood; fill: number; murky: boolean; msgs: CoachMsg[]; onAction: (a: CoachAction, id: string) => void
}) {
  const [poke, setPoke] = useState(0)
  const lvl = levelFor(s.xp)
  const st = streak(s)
  const facts = learnedFacts(s)
  const glow = st >= 3
  const states = [
    { on: true, emoji: "💧", title: `${Math.round(fill * 100)} % voll`, text: "So viel von heute ist erledigt. Mit jeder Einnahme und dem Check-in fülle ich mich." },
    { on: glow, emoji: "✨", title: glow ? `Ich leuchte – ${st} Tage Serie!` : "Leuchten ab 3 Tagen Serie", text: glow ? "Bleib dran, dann bleibt das so." : `Du bist bei ${st} ${st === 1 ? "Tag" : "Tagen"}. Noch ${3 - st} und ich strahle.` },
    { on: murky, emoji: murky ? "🌫️" : "🫧", title: murky ? "Ich bin etwas trüb" : "Klar und frisch", text: murky ? "Gestern fehlte der Check-in. Ein Check-in heute und ich bin wieder klar." : "Du checkst regelmäßig ein – so mag ich das." },
  ]
  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <button onClick={() => setPoke(p => p + 1)} aria-label={`${MASCOT_NAME} anstupsen`} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
          <div key={poke} className={poke ? "lab-squish" : "lab-float"} style={{ display: "inline-block" }}>
            <Mascot mood={poke % 3 === 2 ? "party" : mood} size={150} fill={0.12 + fill * 0.88} glow={glow} murky={murky} />
          </div>
        </button>
        <div style={{ fontSize: "1.5rem", fontWeight: 900, marginTop: 4 }}>{MASCOT_NAME}</div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>{poke ? ["Hihi, das kitzelt!", "Hey! 😄", "Ich bin voll dabei!"][poke % 3] : "dein Lab-Coach"}</div>
      </div>

      {/* Tipps */}
      <Label style={{ margin: "20px 0 10px" }}>💬 Meine Tipps für dich{msgs.length ? ` · ${msgs.length}` : ""}</Label>
      {msgs.length ? <TipsList msgs={msgs} onAction={onAction} />
        : <div className="lab-card" style={{ padding: 14, fontSize: "0.86rem", color: "var(--text-dim)" }}>Gerade alles im grünen Bereich. Ich melde mich, wenn es etwas Neues gibt. 👍</div>}

      {/* Level */}
      <div className="lab-card lab-rise" style={{ padding: 16, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "2rem" }}>{lvl.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>{lvl.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{lvl.next ? `Noch ${lvl.next.xp - s.xp} XP bis ${lvl.next.emoji} ${lvl.next.name}` : "Höchstes Level erreicht"}</div>
          </div>
          <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{s.xp} XP</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "var(--surface-2)", marginTop: 12, overflow: "hidden" }}>
          <div style={{ width: `${lvl.progress * 100}%`, height: "100%", background: "var(--lab-grad)", borderRadius: 4, transition: "width 1s" }} />
        </div>
      </div>

      {/* Warum er so aussieht */}
      <Label style={{ margin: "20px 0 10px" }}>So geht's mir gerade</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {states.map((x, k) => (
          <div key={k} className="lab-rise" style={{ animationDelay: `${k * 0.06}s`, display: "flex", gap: 12, alignItems: "flex-start", padding: 12, borderRadius: 18, background: x.on ? "var(--accent-dim)" : "var(--surface-2)" }}>
            <span style={{ fontSize: "1.4rem" }}>{x.emoji}</span>
            <span>
              <span style={{ display: "block", fontWeight: 900, fontSize: "0.9rem" }}>{x.title}</span>
              <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.45 }}>{x.text}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Was er macht */}
      <Label style={{ margin: "20px 0 10px" }}>Was ich für dich mache</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {JOBS.map((j, k) => (
          <div key={j.title} className="lab-card lab-rise" style={{ animationDelay: `${k * 0.05}s`, padding: 12 }}>
            <div style={{ fontSize: "1.4rem" }}>{j.emoji}</div>
            <div style={{ fontWeight: 900, fontSize: "0.88rem", marginTop: 4 }}>{j.title}</div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.4 }}>{j.text}</div>
          </div>
        ))}
      </div>

      {/* Wissens-Album */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 0 10px" }}>
        <Label>📚 Wissens-Album</Label>
        <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "var(--accent)" }}>{facts.length} / {FACT_COUNT}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "var(--surface-2)", overflow: "hidden", marginBottom: 10 }}>
        <div style={{ width: `${(facts.length / Math.max(1, FACT_COUNT)) * 100}%`, height: "100%", background: "var(--lab-grad)", borderRadius: 4 }} />
      </div>
      <div className="lab-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollSnapType: "x mandatory" }}>
        {facts.slice(0, 20).map(f => {
          const lib = f.libId ? LIB_BY_ID[f.libId] : undefined
          return (
            <div key={f.id} className="lab-card" style={{ flexShrink: 0, width: 220, padding: 14, scrollSnapAlign: "start" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "var(--accent)", marginBottom: 6 }}>{lib ? `${lib.emoji} ${lib.name.toUpperCase()}` : "💡 ALLGEMEIN"}</div>
              <div style={{ fontSize: "0.82rem", lineHeight: 1.5 }}>{f.text}</div>
            </div>
          )
        })}
        <div className="lab-card" style={{ flexShrink: 0, width: 180, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", background: "var(--surface-2)", scrollSnapAlign: "start" }}>
          <div style={{ fontSize: "1.6rem" }}>🔒</div>
          <div style={{ fontWeight: 900, fontSize: "0.85rem", marginTop: 4 }}>Noch {Math.max(0, FACT_COUNT - facts.length)} zu entdecken</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 4, lineHeight: 1.4 }}>Nach der Tagesrunde und in deinen Supplements.</div>
        </div>
      </div>

      {/* Abzeichen */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 0 10px" }}>
        <Label>🏅 Abzeichen</Label>
        <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "var(--text-dim)" }}>{s.badges.length} / {BADGES.length}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10 }}>
        {BADGES.map(b => {
          const got = s.badges.includes(b.id)
          return (
            <div key={b.id} title={`${b.name}: ${b.desc}`} style={{ textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, margin: "0 auto", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem",
                background: got ? "var(--accent-dim)" : "var(--surface-2)", filter: got ? undefined : "grayscale(1)", opacity: got ? 1 : 0.4,
              }}>{got ? b.emoji : "🔒"}</div>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, marginTop: 4, color: got ? "var(--text)" : "var(--text-dim)", lineHeight: 1.2 }}>{got ? b.name : b.desc}</div>
            </div>
          )
        })}
      </div>

      <Label style={{ margin: "24px 0 10px" }}>❓ So funktioniert die App</Label>
      <Guide />
    </div>
  )
}
