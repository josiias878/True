"use client"
// ── Fertige Experimente: Karten zum Stöbern, ein Tipp zum Starten ─────────────
import React, { useState } from "react"
import { LIB_BY_ID, type LabState } from "@/lib/supplementLab"
import { availableExperiments, type Experiment } from "@/lib/labExperiments"
import { Btn, Sheet } from "./ui"
import { Mascot } from "./mascot"
import { t } from "@/lib/labI18n"

export function ExperimentsView({ s, onPick }: { s: LabState; onPick: (e: Experiment) => void }) {
  const list = availableExperiments()
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="lab-rise" style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 2px" }}>
        <Mascot mood="think" size={48} alive />
        <div>
          <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>{t("Was willst du herausfinden?")}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{t("Fertige Experimente – ich plane Reihenfolge und Dauer.")}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {list.map((e, i) => {
          const running = s.experiment === e.id
          return (
            <button key={e.id} className="lab-press lab-pop" onClick={() => onPick(e)} style={{
              animationDelay: `${i * 50}ms`, position: "relative", overflow: "hidden", textAlign: "left", border: "none", borderRadius: 24, padding: "14px 14px 12px", minHeight: 168,
              color: "#fff", background: `linear-gradient(150deg, ${e.colors[0]}, ${e.colors[1]})`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,.35), 0 10px 26px color-mix(in srgb, ${e.colors[0]} 35%, transparent)`,
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <span aria-hidden style={{ position: "absolute", right: -18, top: -18, width: 90, height: 90, borderRadius: 999, background: "rgba(255,255,255,.16)" }} />
              <span style={{ fontSize: "2.2rem", lineHeight: 1 }}>{e.emoji}</span>
              <span style={{ fontWeight: 900, fontSize: "1rem", lineHeight: 1.15 }}>{e.title}</span>
              <span style={{ fontSize: "0.72rem", opacity: 0.9, lineHeight: 1.3, flex: 1 }}>{e.question}</span>
              <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
                {e.supps.map(x => <span key={x.lib} style={{ width: 24, height: 24, borderRadius: 999, background: "rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>{LIB_BY_ID[x.lib]?.emoji}</span>)}
                <span style={{ marginLeft: "auto", fontSize: "0.62rem", fontWeight: 900, padding: "2px 7px", borderRadius: 999, background: running ? "#fff" : "rgba(0,0,0,.18)", color: running ? e.colors[0] : "#fff" }}>{running ? t("LÄUFT") : e.weeks}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ExperimentSheet({ s, e, onClose, onStart }: { s: LabState; e: Experiment; onClose: () => void; onStart: (away: Set<string>) => void }) {
  const have = (lib: string) => s.supps.find(x => (x.lib ?? x.id) === lib)
  const [away, setAway] = useState<Set<string>>(() => new Set(e.supps.filter(x => have(x.lib)?.away).map(x => x.lib)))
  const tests = e.supps.filter(x => x.mode === "test")
  const steady = e.supps.filter(x => x.mode === "konstant")
  const resetDone = !!s.startDate
  const toggle = (lib: string, v: boolean) => setAway(a => { const n = new Set(a); if (v) n.add(lib); else n.delete(lib); return n })
  return (
    <Sheet open onClose={onClose}>
      <div style={{ margin: "-10px -18px 0", padding: "26px 20px 22px", borderRadius: "28px 28px 0 0", color: "#fff", textAlign: "center", position: "relative", overflow: "hidden",
        background: `linear-gradient(150deg, ${e.colors[0]}, ${e.colors[1]})` }}>
        <span aria-hidden style={{ position: "absolute", left: -30, bottom: -40, width: 140, height: 140, borderRadius: 999, background: "rgba(255,255,255,.14)" }} />
        <div className="lab-float" style={{ fontSize: "3.4rem" }}>{e.emoji}</div>
        <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{e.title}</div>
        <div style={{ fontSize: "0.9rem", opacity: 0.92, marginTop: 4 }}>{e.question}</div>
        <div style={{ display: "inline-block", marginTop: 10, fontSize: "0.72rem", fontWeight: 900, padding: "4px 10px", borderRadius: 999, background: "rgba(0,0,0,.18)" }}>⏱️ {e.weeks}</div>
      </div>

      {/* Ablauf als kleine Strecke */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", padding: "18px 2px 6px" }} className="lab-scroll">
        {[{ e: "🧘", l: resetDone ? t("Reset ✓") : t("Reset"), done: resetDone }, ...tests.map(x => ({ e: LIB_BY_ID[x.lib]?.emoji ?? "💊", l: LIB_BY_ID[x.lib]?.name.replace(/\s*\(.*\)/, "") ?? x.lib, done: !!s.verdicts[have(x.lib)?.id ?? ""] })), { e: "🏆", l: t("Dein Ergebnis"), done: false }].map((st, i, arr) => (
          <React.Fragment key={i}>
            <div className="lab-pop" style={{ animationDelay: `${i * 70}ms`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, width: 70 }}>
              <span style={{ width: 46, height: 46, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
                background: st.done ? "var(--accent)" : "var(--surface-2)", border: st.done ? "none" : "2px dashed var(--border)" }}>{st.e}</span>
              <span style={{ fontSize: "0.66rem", fontWeight: 800, textAlign: "center", lineHeight: 1.15 }}>{st.l}</span>
            </div>
            {i < arr.length - 1 && <span style={{ flexShrink: 0, color: "var(--text-dim)", fontWeight: 900, marginTop: -16 }}>›</span>}
          </React.Fragment>
        ))}
      </div>
      <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.45, margin: "4px 2px 14px" }}>{e.note}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {e.supps.map(x => {
          const lib = LIB_BY_ID[x.lib]
          const isAway = away.has(x.lib)
          return (
            <div key={x.lib} className="lab-card" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.4rem" }}>{lib?.emoji}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 900, fontSize: "0.9rem" }}>{lib?.name}</span>
                <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-dim)" }}>{x.mode === "test" ? t("🔬 wird getestet") : t("📌 läuft durchgehend")}{have(x.lib) ? t(" · schon in deiner Liste") : ""}</span>
              </span>
              <span style={{ display: "flex", borderRadius: 12, background: "var(--surface-2)", padding: 3 }}>
                {[[false, t("✓ Da")], [true, t("🛒 Kaufen")]].map(([v, l]) => (
                  <button key={String(v)} className="lab-press" onClick={() => toggle(x.lib, v as boolean)} style={{
                    border: "none", borderRadius: 10, padding: "6px 9px", fontSize: "0.72rem", fontWeight: 900,
                    background: isAway === v ? "var(--surface)" : "transparent", color: isAway === v ? "var(--text)" : "var(--text-dim)", boxShadow: isAway === v ? "0 1px 4px rgba(0,0,0,.12)" : "none",
                  }}>{l as string}</button>
                ))}
              </span>
            </div>
          )
        })}
      </div>
      <Btn full onClick={() => onStart(away)} style={{ marginTop: 16 }}>{t("🚀 Experiment starten")}</Btn>
      {steady.length > 0 && tests.length === 0 && <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", textAlign: "center", marginTop: 8 }}>{t("Kein Test nötig – alles läuft durchgehend mit.")}</div>}
    </Sheet>
  )
}
