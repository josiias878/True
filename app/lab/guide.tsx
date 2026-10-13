"use client"
// ── „Kolbi führt dich“: Karte „Dein nächster Schritt“, schlanke Zeile, Zeitleiste „So geht es weiter“ ──
// Logik (welcher Schritt, Status, Zeitleiste): lib/labGuide.ts – hier nur Anzeige.
import React, { useEffect, useRef, useState } from "react"
import type { MySupp, Portion } from "@/lib/supplementLab"
import { fmtDate } from "@/lib/supplementLab"
import { guideProgress, type ExpGuide, type GuideMilestone, type GuideStep, type GuideStepId } from "@/lib/labGuide"
import type { CoachAction } from "@/lib/labCoach"
import { defaultPortion } from "@/lib/labDose"
import { t } from "@/lib/labI18n"
import { Btn, Sheet, haptic } from "./ui"
import { Mascot } from "./mascot"
import { PortionPick } from "./dose"

/** Dezenter Fortschrittsring „3/9“ */
export function GuideRing({ done, total, size = 40 }: { done: number; total: number; size?: number }) {
  const sw = size >= 36 ? 4 : 3
  const r = (size - sw) / 2, c = 2 * Math.PI * r
  const pct = total ? done / total : 0
  return (
    <span role="img" aria-label={t("{n} von {total} erledigt", { n: done, total })} style={{ position: "relative", width: size, height: size, flexShrink: 0, display: "inline-block" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <span aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size >= 36 ? "0.72rem" : "0.62rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
        {done}/{total}
      </span>
    </span>
  )
}

const kicker: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent-ink)" }
const quiet: React.CSSProperties = { minHeight: 44, padding: "0 8px", border: "none", background: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }

/** Kurze Kolbi-Reaktion nach dem Erledigen: merkt sich den zuletzt gezeigten Schritt und meldet, wenn er fertig ist. */
function useCheer(steps: GuideStep[], shown: GuideStep | null) {
  const last = useRef<{ id: GuideStepId; title: string } | null>(null)
  const [cheer, setCheer] = useState<string | null>(null)
  useEffect(() => {
    const prev = last.current
    if (prev && prev.id !== shown?.id && steps.find(x => x.id === prev.id)?.status === "done") {
      setCheer(prev.title)
      const tm = setTimeout(() => setCheer(null), 3200)
      last.current = shown ? { id: shown.id, title: shown.title } : null
      return () => clearTimeout(tm)
    }
    last.current = shown ? { id: shown.id, title: shown.title } : null
  }, [steps, shown?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return cheer
}

/**
 * Heute: „Dein nächster Schritt“. prominent = groß mit Kolbi und Sprechblase (wenn gerade nichts Dringendes dran ist),
 * sonst eine kompakte Zeile unter der Hauptsache. Ohne machbaren Schritt: schlanke „Als Nächstes …“-Zeile (wartet);
 * alles erledigt → nichts (nach einer kurzen Reaktion).
 */
export function GuideCard({ steps, next, waiting, prominent, onRun, onLater, onNever, onTimeline }: {
  steps: GuideStep[]; next: GuideStep | null; waiting: GuideStep | null; prominent: boolean
  onRun: (step: GuideStep) => void; onLater: (id: GuideStepId) => void; onNever: (id: GuideStepId) => void; onTimeline: () => void
}) {
  const { done, total } = guideProgress(steps)
  const cheer = useCheer(steps, next)
  const [more, setMore] = useState(false)
  useEffect(() => { setMore(false) }, [next?.id])

  // Alles erledigt: kurz feiern, dann verschwindet die Karte
  if (!next && !waiting) {
    if (!cheer || !total) return null
    return (
      <section className="lab-card lab-pop" role="status" style={{ padding: "14px 16px", borderRadius: 22, display: "flex", alignItems: "center", gap: 12 }}>
        <span className="lab-hop"><Mascot mood="party" size={44} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 900, fontSize: "0.95rem" }}>{t("Alles eingerichtet!")}</span>
          <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.4 }}>{t("Ab jetzt sage ich dir nur noch, wenn etwas dran ist.")}</span>
        </span>
        <GuideRing done={done} total={total} size={36} />
      </section>
    )
  }

  // Nichts machbar, aber etwas kommt von selbst (Morgen-Frage, Test nach dem Reset) → schlank
  if (!next && waiting) {
    return (
      <button className="lab-press lab-rise" onClick={() => { haptic(); onTimeline() }} style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 56, padding: "8px 14px 8px 10px", borderRadius: 20, textAlign: "left",
        border: "1px solid var(--glass-line)", background: "var(--surface)", color: "var(--text)",
      }}>
        <GuideRing done={done} total={total} size={36} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 800, color: "var(--text-dim)" }}>{cheer ? `✓ ${cheer}` : t("Als Nächstes")}</span>
          <span style={{ display: "block", fontSize: "0.88rem", fontWeight: 800, lineHeight: 1.3 }}>{waiting.emoji} {waiting.title}{waiting.wait ? <span style={{ fontWeight: 700, color: "var(--text-dim)" }}> · {waiting.wait}</span> : null}</span>
        </span>
        <span style={{ color: "var(--accent-ink)", fontWeight: 900, fontSize: "0.8rem", whiteSpace: "nowrap" }}>{t("Plan")} ›</span>
      </button>
    )
  }
  const step = next!

  if (!prominent) {
    return (
      <button className="lab-press lab-rise" onClick={() => { haptic(); onRun(step) }} style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 56, padding: "8px 14px 8px 10px", borderRadius: 20, textAlign: "left",
        border: "1px solid var(--glass-line)", background: "var(--surface)", color: "var(--text)",
      }}>
        <GuideRing done={done} total={total} size={36} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 800, color: cheer ? "var(--accent-ink)" : "var(--text-dim)" }}>{cheer ? `✓ ${cheer} – ${t("danach:")}` : t("Danach: dein nächster Schritt")}</span>
          <span style={{ display: "block", fontSize: "0.88rem", fontWeight: 800, lineHeight: 1.3 }}>{step.emoji} {step.title}</span>
        </span>
        <span aria-hidden style={{ color: "var(--text-dim)", fontWeight: 800, fontSize: "1.2rem" }}>›</span>
      </button>
    )
  }

  // Groß: Sprechblase der Kolbi-Figur oben im Feld (Zipfel nach oben), ein großer Knopf
  return (
    <div className="lab-rise" style={{ position: "relative", marginTop: 4 }}>
      <span aria-hidden style={{ position: "absolute", left: "50%", top: -7, width: 14, height: 14, marginLeft: -7, background: "var(--surface)", borderLeft: "1px solid var(--glass-line)", borderTop: "1px solid var(--glass-line)", transform: "rotate(45deg)", zIndex: 1 }} />
      <section className="lab-card" aria-label={t("Dein nächster Schritt")} style={{ padding: "12px 16px 4px", borderRadius: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ ...kicker, flex: 1 }}>{t("Dein nächster Schritt")}</span>
          <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{t("{n} von {total}", { n: done, total })}</span>
          <GuideRing done={done} total={total} size={34} />
        </div>
        {cheer && <div className="lab-pop" role="status" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 10px", borderRadius: 999, background: "var(--accent-dim)", fontSize: "0.78rem", fontWeight: 900, color: "var(--accent-ink)" }}>✓ {t("Erledigt: {title}", { title: cheer })}</div>}
        <div key={step.id} className="lab-rise" style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 10 }}>
          <span aria-hidden style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", background: "var(--surface-2)" }}>{step.emoji}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 900, fontSize: "1.05rem", lineHeight: 1.25 }}>{step.title}</span>
            <span style={{ display: "block", fontSize: "0.85rem", lineHeight: 1.45, color: "var(--text-dim)", marginTop: 3 }}>{step.why}</span>
          </span>
        </div>
        <Btn full onClick={() => { haptic(10); onRun(step) }} style={{ marginTop: 12, minHeight: 50, borderRadius: 16 }}>{step.cta}</Btn>
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: -8, marginRight: -8 }}>
          <button onClick={() => onLater(step.id)} style={quiet}>{t("Später")}</button>
          {more
            ? <button onClick={() => onNever(step.id)} style={quiet}>{t("Nicht für mich")}</button>
            : <button onClick={() => setMore(true)} aria-label={t("Weitere Optionen")} style={{ ...quiet, minWidth: 44 }}>···</button>}
          <span style={{ flex: 1 }} />
          <button onClick={() => { haptic(); onTimeline() }} style={{ ...quiet, color: "var(--accent-ink)" }}>{t("So geht es weiter")} ›</button>
        </div>
      </section>
    </div>
  )
}

/** Experiment-Führung: wo du stehst (Tag x von y) und was bis zum nächsten Meilenstein fehlt – schlank, ein Knopf. */
export function ExpCard({ exp, onAction, onTimeline }: { exp: ExpGuide; onAction: (a: CoachAction) => void; onTimeline: () => void }) {
  const pct = exp.progress ? Math.min(1, exp.progress.day / Math.max(1, exp.progress.days)) : null
  return (
    <section className="lab-card lab-rise" aria-label={t("Dein Experiment")} style={{ padding: "12px 14px", borderRadius: 22 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span aria-hidden style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", background: "var(--surface-2)" }}>{exp.emoji}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 900, fontSize: "0.95rem", lineHeight: 1.3 }}>{exp.title}</span>
          <span style={{ display: "block", fontSize: "0.82rem", lineHeight: 1.4, color: "var(--text-dim)", marginTop: 2 }}>{exp.sub}</span>
        </span>
        <button onClick={() => { haptic(); onTimeline() }} aria-label={t("So geht es weiter")} style={{ ...quiet, marginTop: -10, marginRight: -8, color: "var(--accent-ink)", whiteSpace: "nowrap" }}>{t("Plan")} ›</button>
      </div>
      {pct != null && (
        <div aria-hidden style={{ height: 6, borderRadius: 4, background: "var(--surface-2)", marginTop: 10, overflow: "hidden" }}>
          <div style={{ width: `${Math.max(6, pct * 100)}%`, height: "100%", borderRadius: 4, background: "var(--lab-grad)" }} />
        </div>
      )}
      {exp.action && <Btn full onClick={() => { haptic(10); onAction(exp.action!.action) }} style={{ marginTop: 12, minHeight: 48, borderRadius: 16 }}>{exp.action.label}</Btn>}
    </section>
  )
}

const STATUS_LABEL = (x: GuideStep): string =>
  x.status === "done" ? t("erledigt") : x.status === "open" ? t("jetzt möglich") : x.status === "waiting" ? (x.wait ?? t("kommt noch"))
  : x.status === "later" ? t("morgen wieder") : t("ausgeblendet")

/** „So geht es weiter“: Plan aus echten Daten + Einrichtungs-Schritte zum Abhaken. */
export function TimelineSheet({ items, steps, today, onClose, onRun, onRestore }: {
  items: GuideMilestone[]; steps: GuideStep[]; today: string; onClose: () => void; onRun: (step: GuideStep) => void; onRestore: () => void
}) {
  const { done, total } = guideProgress(steps)
  const hidden = steps.some(x => x.status === "never")
  return (
    <Sheet open onClose={onClose} title={t("🗺️ So geht es weiter")}>
      <div style={{ fontSize: "0.84rem", color: "var(--text-dim)", lineHeight: 1.45, marginTop: -4, marginBottom: 14 }}>
        {t("Dein Plan aus deinen echten Daten – er verschiebt sich, wenn du etwas änderst.")}
      </div>
      {items.length > 0 ? (
        <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((m, i) => {
            const lastItem = i === items.length - 1
            const dot = m.state === "done" ? "var(--accent)" : m.state === "now" ? "var(--surface)" : "var(--surface-2)"
            return (
              <li key={m.key} style={{ display: "flex", gap: 12, minHeight: 58 }}>
                <span style={{ width: 54, flexShrink: 0, textAlign: "right", paddingTop: 2 }}>
                  <span style={{ display: "block", fontSize: "0.78rem", fontWeight: 900, color: m.state === "now" ? "var(--accent-ink)" : "var(--text)", whiteSpace: "nowrap" }}>
                    {m.key === "today" ? t("Heute") : m.est ? t("ca. Tag {n}", { n: m.day }) : t("Tag {n}", { n: m.day })}
                  </span>
                  <span style={{ display: "block", fontSize: "0.66rem", fontWeight: 700, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{m.state === "now" && m.key !== "today" && m.date === today ? t("heute") : fmtDate(m.date).replace(/^\w+\.?,\s*/, "")}</span>
                </span>
                <span aria-hidden style={{ position: "relative", width: 22, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                  {!lastItem && <span style={{ position: "absolute", top: 20, bottom: -2, width: 2, borderRadius: 2, background: m.state === "done" ? "var(--accent)" : "var(--border)", opacity: m.state === "done" ? 0.6 : 1 }} />}
                  <span style={{
                    position: "relative", marginTop: 2, width: 18, height: 18, borderRadius: 999, background: dot, color: "#fff", fontSize: "0.62rem", fontWeight: 900,
                    border: m.state === "now" ? "3px solid var(--accent)" : m.state === "future" ? `2px ${m.est ? "dashed" : "solid"} var(--border)` : "none",
                    display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box",
                  }}>{m.state === "done" ? "✓" : ""}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0, paddingBottom: 12 }}>
                  <span style={{ display: "block", fontWeight: 900, fontSize: "0.92rem", lineHeight: 1.3, color: m.state === "done" ? "var(--text-dim)" : "var(--text)" }}>{m.emoji} {m.title}</span>
                  {m.sub && <span style={{ display: "block", fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.35, marginTop: 1 }}>{m.sub}</span>}
                </span>
              </li>
            )
          })}
        </ol>
      ) : <div style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>{t("Sobald dein Labor startet, siehst du hier deinen Plan.")}</div>}

      {steps.length > 0 && (
        <div style={{ marginTop: 10, padding: "12px 14px 6px", borderRadius: 20, background: "var(--surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ flex: 1, fontWeight: 900, fontSize: "0.92rem" }}>{t("Einrichten mit Kolbi")}</span>
            <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-dim)" }}>{t("{n} von {total}", { n: done, total })}</span>
          </div>
          {steps.map(x => {
            const can = x.status === "open" || x.status === "later"
            return (
              <button key={x.id} disabled={!can} onClick={() => can && onRun(x)} className={can ? "lab-press" : undefined} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, padding: "6px 0", border: "none", borderTop: "1px solid var(--border)",
                background: "none", color: "var(--text)", textAlign: "left", cursor: can ? "pointer" : "default", opacity: x.status === "never" ? 0.55 : 1,
              }}>
                <span aria-hidden style={{
                  width: 22, height: 22, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 900,
                  background: x.status === "done" ? "var(--accent)" : "var(--surface)", color: "#fff", border: x.status === "done" ? "none" : "2px solid var(--border)", boxSizing: "border-box",
                }}>{x.status === "done" ? "✓" : ""}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: "0.86rem", fontWeight: 800, textDecoration: x.status === "done" ? "none" : undefined, color: x.status === "done" ? "var(--text-dim)" : "var(--text)" }}>{x.emoji} {x.title}</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: x.status === "open" ? "var(--accent-ink)" : "var(--text-dim)", maxWidth: "42%", textAlign: "right", lineHeight: 1.3 }}>
                  {STATUS_LABEL(x)}{can ? " ›" : ""}
                </span>
              </button>
            )
          })}
          {hidden && <button onClick={onRestore} style={{ ...quiet, marginLeft: -8 }}>{t("Ausgeblendete wieder zeigen")}</button>}
        </div>
      )}
      <Btn variant="soft" full onClick={onClose} style={{ marginTop: 14 }}>{t("Fertig")}</Btn>
    </Sheet>
  )
}

/** „Menge pro Einnahme“ für alle ohne Standard-Menge – eins nach dem anderen, 1 Tipp je Supplement. */
export function PortionGuideSheet({ supps, startId, onPick, onClose }: {
  supps: MySupp[]; startId: string; onPick: (id: string, p: Portion) => void; onClose: () => void
}) {
  const [queue] = useState(() => {
    const open = supps.filter(x => !defaultPortion(x))
    const i = open.findIndex(x => x.id === startId)
    return i > 0 ? [...open.slice(i), ...open.slice(0, i)] : open
  })
  const [i, setI] = useState(0)
  const x = queue[i]
  useEffect(() => { if (!x) onClose() }, [x, onClose])
  if (!x) return null
  return (
    <Sheet open onClose={onClose} title={t("🥄 Menge pro Einnahme")}>
      <div key={x.id} className="lab-rise" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.6rem" }} aria-hidden>{x.emoji}</span>
          <span style={{ flex: 1, minWidth: 0, fontWeight: 900, fontSize: "1.1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</span>
          {queue.length > 1 && <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--text-dim)" }}>{t("{n} von {total}", { n: i + 1, total: queue.length })}</span>}
        </div>
        <PortionPick x={x} onPick={p => { onPick(x.id, p); setI(i + 1) }} label={t("Wie viel nimmst du pro Einnahme? Steht meist auf der Packung.")} />
        <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", lineHeight: 1.4 }}>{t("Nur zum Mitzählen – keine Dosierempfehlung. Ändern kannst du es jederzeit in Mein Stack.")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {queue.length > 1 && i < queue.length - 1 && <Btn variant="soft" onClick={() => setI(i + 1)} style={{ flex: 1 }}>{t("Überspringen")}</Btn>}
          <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>{t("Später")}</Btn>
        </div>
      </div>
    </Sheet>
  )
}
