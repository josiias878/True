"use client"
import React, { useEffect, useState } from "react"
import { fetchOverview } from "@/lib/labCommunity"
import { BADGES, LIB_BY_ID, levelFor, streak, type LabState } from "@/lib/supplementLab"
import { FACT_COUNT, learnedFacts, nextFact } from "@/lib/labKnowledge"
import { isPro } from "@/lib/labGrow"
import type { CoachAction, CoachMsg, Mood } from "@/lib/labCoach"
import { Label, Sheet, haptic } from "./ui"
import { Guide, MASCOT_NAME, Mascot, TipsList } from "./mascot"
import { ProCard, inviteSub, inviteWithFlash } from "./grow"
import { t } from "@/lib/labI18n"

const JOBS = [
  { emoji: "⏰", title: t("Erinnern"), text: t("Zur richtigen Zeit – gebündelt, nicht nervig.") },
  { emoji: "🔬", title: t("Testen"), text: t("Eins nach dem anderen, damit man's sieht.") },
  { emoji: "📊", title: t("Auswerten"), text: t("Ich vergleiche mit deinem Normal.") },
  { emoji: "💡", title: t("Erklären"), text: t("Timing, Partner, Nebenwirkungen.") },
  { emoji: "🛒", title: t("Vorrat"), text: t("Ich sag dir, bevor was leer ist.") },
  { emoji: "📚", title: t("Lernen"), text: t("Jeden Tag ein kleiner Fakt.") },
]

type Panel = "mir" | "guide" | "badges" | "pro"

/** Kachel im Kolbi-Raster: Emoji, Titel, eine Zeile Status – Details erst beim Antippen. */
function Tile({ emoji, title, sub, onClick, arrow = true }: { emoji: string; title: string; sub: React.ReactNode; onClick: () => void; arrow?: boolean }) {
  return (
    <button onClick={onClick} className="lab-card lab-press" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, padding: "12px 12px 11px", minHeight: 88, textAlign: "left", color: "var(--text)", cursor: "pointer", width: "100%" }}>
      <span aria-hidden style={{ fontSize: "1.35rem", lineHeight: 1.2 }}>{emoji}</span>
      <span style={{ fontWeight: 900, fontSize: "0.88rem", marginTop: 2 }}>{title}</span>
      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.35 }}>{sub}</span>
      {arrow && <span aria-hidden style={{ position: "absolute", top: 10, right: 12, color: "var(--text-dim)" }}>›</span>}
    </button>
  )
}

/** Kolbi-Tab: oben Kolbi kompakt, dann Tipps (knapp), Wissens-Album, ruhiges Kachel-Raster mit Details im Blatt. */
export function KolbiPage({ s, mood, fill, murky, msgs, onAction, onFlash, onFeedback }: {
  s: LabState; mood: Mood; fill: number; murky: boolean; msgs: CoachMsg[]; onAction: (a: CoachAction, id: string) => void
  onFlash: (m: string) => void; onFeedback: () => void
}) {
  const [poke, setPoke] = useState(0)
  const [allTips, setAllTips] = useState(false)
  const [panel, setPanel] = useState<Panel | null>(null)
  const lvl = levelFor(s.xp)
  const st = streak(s)
  const facts = learnedFacts(s)
  const next = nextFact(s)
  const nextLib = next?.libId ? LIB_BY_ID[next.libId] : undefined
  const glow = st >= 3
  const pct = Math.round(fill * 100)
  const pro = isPro(s)
  const founder = !!s.pro?.founder
  const gotBadges = BADGES.filter(b => s.badges.includes(b.id))
  const states = [
    { on: true, emoji: "💧", title: t("{n} % voll", { n: pct }), text: t("So viel von heute ist erledigt. Mit jeder Einnahme und dem Check-in fülle ich mich.") },
    { on: glow, emoji: "✨", title: glow ? t("Ich leuchte – {n} Tage Serie!", { n: st }) : t("Leuchten ab 3 Tagen Serie"), text: glow ? t("Bleib dran, dann bleibt das so.") : st === 1 ? t("Du bist bei 1 Tag. Noch {r} und ich strahle.", { r: 3 - st }) : t("Du bist bei {n} Tagen. Noch {r} und ich strahle.", { n: st, r: 3 - st }) },
    { on: murky, emoji: murky ? "🌫️" : "🫧", title: murky ? t("Ich bin etwas trüb") : t("Klar und frisch"), text: murky ? t("Gestern fehlte der Check-in. Ein Check-in heute und ich bin wieder klar.") : t("Du checkst regelmäßig ein – so mag ich das.") },
  ]
  const chip: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999, background: "var(--surface-2)", fontSize: "0.74rem", fontWeight: 800, whiteSpace: "nowrap" }
  const shownTips = allTips ? msgs : msgs.slice(0, 2)
  const close = () => setPanel(null)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Kolbi kompakt: Figur, Stimmung, Level */}
      <div className="lab-card lab-rise" style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setPoke(p => p + 1)} aria-label={t("{name} anstupsen", { name: MASCOT_NAME })} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
          <div key={poke} className={poke ? "lab-squish" : "lab-float"} style={{ display: "inline-block" }}>
            <Mascot mood={poke % 3 === 2 ? "party" : mood} size={96} fill={0.12 + fill * 0.88} glow={glow} murky={murky} />
          </div>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "1.3rem", fontWeight: 900, lineHeight: 1.1 }}>{MASCOT_NAME}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{poke ? [t("Hihi, das kitzelt!"), t("Hey! 😄"), t("Ich bin voll dabei!")][poke % 3] : t("dein Lab-Coach")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
            <span style={chip}>💧 {pct} %</span>
            <span style={{ ...chip, opacity: st ? 1 : 0.6 }}>{glow ? "✨" : "🔥"} {st}</span>
            <span style={chip}>{murky ? `🌫️ ${t("trüb")}` : `🫧 ${t("klar")}`}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 9, fontSize: "0.78rem" }}>
            <span style={{ fontWeight: 900, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lvl.emoji} {lvl.name}</span>
            <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{s.xp} XP</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)", marginTop: 4, overflow: "hidden" }}>
            <div style={{ width: `${lvl.progress * 100}%`, height: "100%", background: "var(--lab-grad)", borderRadius: 3, transition: "width 1s" }} />
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 3 }}>{lvl.next ? t("Noch {xp} XP bis {emoji} {name}", { xp: lvl.next.xp - s.xp, emoji: lvl.next.emoji, name: lvl.next.name }) : t("Höchstes Level erreicht")}</div>
        </div>
      </div>

      {/* Tipps: höchstens 2, Rest auf Wunsch */}
      <div>
        <Label style={{ marginBottom: 8 }}>{t("💬 Meine Tipps für dich")}{msgs.length ? ` · ${msgs.length}` : ""}</Label>
        {msgs.length ? <TipsList msgs={shownTips} onAction={onAction} />
          : <div className="lab-card" style={{ padding: 14, fontSize: "0.86rem", color: "var(--text-dim)" }}>{t("Gerade alles im grünen Bereich. Ich melde mich, wenn es etwas Neues gibt. 👍")}</div>}
        {msgs.length > 2 && (
          <button onClick={() => setAllTips(a => !a)} style={{ marginTop: 8, background: "none", border: "none", color: "var(--accent)", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer", padding: "4px 2px" }}>
            {allTips ? t("Weniger zeigen") : msgs.length - 2 === 1 ? t("+ 1 weiterer Tipp") : t("+ {n} weitere Tipps", { n: msgs.length - 2 })}
          </button>
        )}
      </div>

      {/* Wissens-Album: breit und prominent */}
      <div className="lab-card lab-rise" style={{ padding: "14px 0 12px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, padding: "0 14px" }}>
          <span style={{ fontWeight: 900, fontSize: "1rem" }}>{t("📚 Wissens-Album")}</span>
          <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "var(--accent)", whiteSpace: "nowrap" }}>{t("{n} von {total} entdeckt", { n: facts.length, total: FACT_COUNT })}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden", margin: "8px 14px 12px" }}>
          <div style={{ width: `${(facts.length / Math.max(1, FACT_COUNT)) * 100}%`, height: "100%", background: "var(--lab-grad)", borderRadius: 3 }} />
        </div>
        <div className="lab-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", padding: "0 14px 4px", scrollSnapType: "x mandatory", scrollPaddingLeft: 14 }}>
          {facts.slice(0, 20).map(f => {
            const lib = f.libId ? LIB_BY_ID[f.libId] : undefined
            return (
              <div key={f.id} style={{ flexShrink: 0, width: 220, padding: 12, borderRadius: 16, background: "var(--surface-2)", scrollSnapAlign: "start" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "var(--accent)", marginBottom: 6 }}>{lib ? `${lib.emoji} ${lib.name.toUpperCase()}` : t("💡 ALLGEMEIN")}</div>
                <div style={{ fontSize: "0.82rem", lineHeight: 1.5 }}>{f.text}</div>
              </div>
            )
          })}
          <div style={{ flexShrink: 0, width: 170, padding: 12, borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", border: "1.5px dashed var(--border)", scrollSnapAlign: "start" }}>
            <div style={{ fontSize: "1.5rem" }}>🔒</div>
            <div style={{ fontWeight: 900, fontSize: "0.82rem", marginTop: 4 }}>{t("Noch {n} zu entdecken", { n: Math.max(0, FACT_COUNT - facts.length) })}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 4, lineHeight: 1.4 }}>{t("Nach der Tagesrunde und in deinen Supplements.")}</div>
          </div>
        </div>
        {next && (
          <div style={{ margin: "10px 14px 0", fontSize: "0.76rem", color: "var(--text-dim)", lineHeight: 1.4 }}>
            🔓 {t("Als Nächstes: {what} – nach deiner nächsten Tagesrunde", { what: nextLib ? `${nextLib.emoji} ${nextLib.name}` : t("💡 ein allgemeiner Fakt") })}
          </div>
        )}
      </div>

      {/* Ruhiges Raster: Details erst beim Antippen */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Tile emoji={murky ? "🌫️" : glow ? "✨" : "💭"} title={t("So geht's mir")} sub={t("{n} % voll", { n: pct })} onClick={() => setPanel("mir")} />
        <Tile emoji="🏅" title={t("Abzeichen")} sub={<>{t("{n} von {total}", { n: gotBadges.length, total: BADGES.length })} {gotBadges.slice(-3).map(b => b.emoji).join("")}</>} onClick={() => setPanel("badges")} />
        <Tile emoji="❓" title={t("So funktioniert's")} sub={t("Was ich mache + Fragen")} onClick={() => setPanel("guide")} />
        <Tile emoji="⭐" title={founder ? t("Gründer-Pro aktiv") : pro ? t("Lab Pro aktiv") : "Lab Pro"} sub={founder ? t("Für dich für immer gratis") : pro ? t("Gerade noch frei") : t("Alles, was drin ist")} onClick={() => setPanel("pro")} />
        <Tile emoji="💌" title={t("Freunde einladen")} sub={inviteSub()} onClick={() => inviteWithFlash(onFlash)} arrow={false} />
        <Tile emoji="💬" title="Feedback" sub={t("Sag mir, was fehlt")} onClick={() => { haptic(); onFeedback() }} arrow={false} />
      </div>

      <CommunityStat />

      {panel === "mir" && (
        <Sheet open onClose={close} title={t("💭 So geht's mir")}>
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
        </Sheet>
      )}
      {panel === "guide" && (
        <Sheet open onClose={close} title={t("❓ So funktioniert's")}>
          <Label style={{ marginBottom: 10 }}>{t("Was ich für dich mache")}</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {JOBS.map(j => (
              <div key={j.title} className="lab-card" style={{ padding: 12 }}>
                <div style={{ fontSize: "1.3rem" }}>{j.emoji}</div>
                <div style={{ fontWeight: 900, fontSize: "0.86rem", marginTop: 4 }}>{j.title}</div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.4 }}>{j.text}</div>
              </div>
            ))}
          </div>
          <Label style={{ margin: "18px 0 10px" }}>{t("Häufige Fragen")}</Label>
          <Guide />
        </Sheet>
      )}
      {panel === "badges" && (
        <Sheet open onClose={close} title={t("🏅 Abzeichen · {n}/{total}", { n: gotBadges.length, total: BADGES.length })}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 12 }}>
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
        </Sheet>
      )}
      {panel === "pro" && (
        <Sheet open onClose={close} title="⭐ Lab Pro">
          <ProCard s={s} startOpen />
        </Sheet>
      )}
    </div>
  )
}

/** Kleiner Social-Proof-Zähler: wie viele Selbstversuche schon anonym geteilt wurden. */
function CommunityStat() {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => { let on = true; fetchOverview().then(v => { if (on && v) setN(v.total) }); return () => { on = false } }, [])
  if (n == null) return null
  return (
    <div className="lab-rise" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 18, background: "linear-gradient(135deg, color-mix(in srgb, #3987e5 14%, var(--surface)), color-mix(in srgb, #2ECC8A 12%, var(--surface)))", border: "1px solid var(--glass-line)" }}>
      <span style={{ fontSize: "1.4rem" }}>🌍</span>
      <span style={{ flex: 1, fontSize: "0.84rem", fontWeight: 800 }}>{n ? (n === 1 ? t("1 Selbstversuch in der Community") : t("{n} Selbstversuche in der Community", { n })) : t("Die Community startet gerade – sei einer der Ersten")}</span>
    </div>
  )
}
