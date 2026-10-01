"use client"
import React, { useEffect, useState } from "react"
import { fetchOverview } from "@/lib/labCommunity"
import { BADGES, LIB_BY_ID, levelFor, streak, type LabState } from "@/lib/supplementLab"
import { FACT_COUNT, learnedFacts } from "@/lib/labKnowledge"
import type { CoachAction, CoachMsg, Mood } from "@/lib/labCoach"
import { Label } from "./ui"
import { Guide, MASCOT_NAME, Mascot, TipsList } from "./mascot"
import { InviteRow, ProCard } from "./grow"
import { t } from "@/lib/labI18n"

const JOBS = [
  { emoji: "⏰", title: t("Erinnern"), text: t("Zur richtigen Zeit – gebündelt, nicht nervig.") },
  { emoji: "🔬", title: t("Testen"), text: t("Eins nach dem anderen, damit man's sieht.") },
  { emoji: "📊", title: t("Auswerten"), text: t("Ich vergleiche mit deinem Normal.") },
  { emoji: "💡", title: t("Erklären"), text: t("Timing, Partner, Nebenwirkungen.") },
  { emoji: "🛒", title: t("Vorrat"), text: t("Ich sag dir, bevor was leer ist.") },
  { emoji: "📚", title: t("Lernen"), text: t("Jeden Tag ein kleiner Fakt.") },
]

/** Kolbi-Tab: seine Tipps, warum er so aussieht, was er macht, Wissens-Album, Abzeichen, Hilfe. */
export function KolbiPage({ s, mood, fill, murky, msgs, onAction, onFlash, onFeedback }: {
  s: LabState; mood: Mood; fill: number; murky: boolean; msgs: CoachMsg[]; onAction: (a: CoachAction, id: string) => void
  onFlash: (m: string) => void; onFeedback: () => void
}) {
  const [poke, setPoke] = useState(0)
  const lvl = levelFor(s.xp)
  const st = streak(s)
  const facts = learnedFacts(s)
  const glow = st >= 3
  const states = [
    { on: true, emoji: "💧", title: t("{n} % voll", { n: Math.round(fill * 100) }), text: t("So viel von heute ist erledigt. Mit jeder Einnahme und dem Check-in fülle ich mich.") },
    { on: glow, emoji: "✨", title: glow ? t("Ich leuchte – {n} Tage Serie!", { n: st }) : t("Leuchten ab 3 Tagen Serie"), text: glow ? t("Bleib dran, dann bleibt das so.") : st === 1 ? t("Du bist bei 1 Tag. Noch {r} und ich strahle.", { r: 3 - st }) : t("Du bist bei {n} Tagen. Noch {r} und ich strahle.", { n: st, r: 3 - st }) },
    { on: murky, emoji: murky ? "🌫️" : "🫧", title: murky ? t("Ich bin etwas trüb") : t("Klar und frisch"), text: murky ? t("Gestern fehlte der Check-in. Ein Check-in heute und ich bin wieder klar.") : t("Du checkst regelmäßig ein – so mag ich das.") },
  ]
  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <button onClick={() => setPoke(p => p + 1)} aria-label={t("{name} anstupsen", { name: MASCOT_NAME })} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
          <div key={poke} className={poke ? "lab-squish" : "lab-float"} style={{ display: "inline-block" }}>
            <Mascot mood={poke % 3 === 2 ? "party" : mood} size={150} fill={0.12 + fill * 0.88} glow={glow} murky={murky} />
          </div>
        </button>
        <div style={{ fontSize: "1.5rem", fontWeight: 900, marginTop: 4 }}>{MASCOT_NAME}</div>
        <div style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>{poke ? [t("Hihi, das kitzelt!"), t("Hey! 😄"), t("Ich bin voll dabei!")][poke % 3] : t("dein Lab-Coach")}</div>
      </div>

      {/* Tipps */}
      <Label style={{ margin: "20px 0 10px" }}>{t("💬 Meine Tipps für dich")}{msgs.length ? ` · ${msgs.length}` : ""}</Label>
      {msgs.length ? <TipsList msgs={msgs} onAction={onAction} />
        : <div className="lab-card" style={{ padding: 14, fontSize: "0.86rem", color: "var(--text-dim)" }}>{t("Gerade alles im grünen Bereich. Ich melde mich, wenn es etwas Neues gibt. 👍")}</div>}

      {/* Level */}
      <div className="lab-card lab-rise" style={{ padding: 16, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "2rem" }}>{lvl.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>{lvl.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{lvl.next ? t("Noch {xp} XP bis {emoji} {name}", { xp: lvl.next.xp - s.xp, emoji: lvl.next.emoji, name: lvl.next.name }) : t("Höchstes Level erreicht")}</div>
          </div>
          <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{s.xp} XP</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "var(--surface-2)", marginTop: 12, overflow: "hidden" }}>
          <div style={{ width: `${lvl.progress * 100}%`, height: "100%", background: "var(--lab-grad)", borderRadius: 4, transition: "width 1s" }} />
        </div>
      </div>

      <ProCard s={s} />
      <InviteRow onFlash={onFlash} onFeedback={onFeedback} />
      <CommunityStat />

      {/* Warum er so aussieht */}
      <Label style={{ margin: "20px 0 10px" }}>{t("So geht's mir gerade")}</Label>
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
      <Label style={{ margin: "20px 0 10px" }}>{t("Was ich für dich mache")}</Label>
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
        <Label>{t("📚 Wissens-Album")}</Label>
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
              <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "var(--accent)", marginBottom: 6 }}>{lib ? `${lib.emoji} ${lib.name.toUpperCase()}` : t("💡 ALLGEMEIN")}</div>
              <div style={{ fontSize: "0.82rem", lineHeight: 1.5 }}>{f.text}</div>
            </div>
          )
        })}
        <div className="lab-card" style={{ flexShrink: 0, width: 180, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", background: "var(--surface-2)", scrollSnapAlign: "start" }}>
          <div style={{ fontSize: "1.6rem" }}>🔒</div>
          <div style={{ fontWeight: 900, fontSize: "0.85rem", marginTop: 4 }}>{t("Noch {n} zu entdecken", { n: Math.max(0, FACT_COUNT - facts.length) })}</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 4, lineHeight: 1.4 }}>{t("Nach der Tagesrunde und in deinen Supplements.")}</div>
        </div>
      </div>

      {/* Abzeichen */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 0 10px" }}>
        <Label>{t("🏅 Abzeichen")}</Label>
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

      <Label style={{ margin: "24px 0 10px" }}>{t("❓ So funktioniert die App")}</Label>
      <Guide />
    </div>
  )
}

/** Kleiner Social-Proof-Zähler: wie viele Selbstversuche schon anonym geteilt wurden. */
function CommunityStat() {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => { let on = true; fetchOverview().then(v => { if (on && v) setN(v.total) }); return () => { on = false } }, [])
  if (n == null) return null
  return (
    <div className="lab-rise" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 18, background: "linear-gradient(135deg, color-mix(in srgb, #3987e5 14%, var(--surface)), color-mix(in srgb, #2ECC8A 12%, var(--surface)))", border: "1px solid var(--glass-line)" }}>
      <span style={{ fontSize: "1.4rem" }}>🌍</span>
      <span style={{ flex: 1, fontSize: "0.84rem", fontWeight: 800 }}>{n ? (n === 1 ? t("1 Selbstversuche in der Community") : t("{n} Selbstversuche in der Community", { n })) : t("Die Community startet gerade – sei einer der Ersten")}</span>
    </div>
  )
}
