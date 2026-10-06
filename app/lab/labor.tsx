"use client"
// ── Labor: meine Labs als große Kacheln + Suche in der Bibliothek; Lab-Seite pro Supplement ──
import React, { useEffect, useMemo, useState } from "react"
import {
  LIBRARY, LIB_BY_ID, LIB_SIDES, ONSET_INFO, SIDE_BY_ID, diffDays, libOf, phaseAt, phaseWindows, suppStatus, testResult,
  type LabState, type LibSupp, type MySupp, type PhaseWindow, type SuppStatusKey,
} from "@/lib/supplementLab"
import { fetchStats, type CommunityStats } from "@/lib/labCommunity"
import { factsFor } from "@/lib/labKnowledge"
import { LAB_GROUPS, keepWords, labColor, labGroup, tierOf } from "@/lib/labSocial"
import { Btn, DemoBadge, Icon, TabHead, UnderTabs, haptic } from "./ui"
import { Mascot } from "./mascot"
import { CommunityCard } from "./community"
import { labTitle } from "./discover"
import { t, dec } from "@/lib/labI18n"

export type LabTab = "ueberblick" | "andere" | "wissen"
export type LaborView = "stack" | "exp" | "vorrat"

const ORDER: SuppStatusKey[] = ["testing", "verdict", "observing", "waiting", "kept", "constant", "maybe", "away", "paused", "dropped"]

// ── Startseite Labor ──────────────────────────────────────────────────────────

export function LaborHome({ s, today, adv, shopCount, onOpen, onOpenLib, onAdd, onView, onMore }: {
  s: LabState; today: string; adv: boolean; shopCount: number
  onOpen: (suppId: string) => void; onOpenLib: (libId: string) => void; onAdd: () => void; onView: (v: LaborView) => void; onMore: () => void
}) {
  const [q, setQ] = useState("")
  const ql = q.trim().toLowerCase()
  const hits = useMemo(() => ql ? LIBRARY.filter(l => l.name.toLowerCase().includes(ql) || l.aliases.some(a => a.includes(ql))).slice(0, 8) : [], [ql])
  const w = phaseAt(s, today)
  const supps = [...s.supps].sort((a, b) => ORDER.indexOf(suppStatus(s, a.id, today).key) - ORDER.indexOf(suppStatus(s, b.id, today).key))
  const small: React.CSSProperties = {
    flex: 1, minWidth: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 8px", borderRadius: 16,
    border: "1px solid var(--glass-line)", background: "var(--surface)", color: "var(--text)", fontWeight: 800, fontSize: "0.84rem", whiteSpace: "nowrap",
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <TabHead kicker={t("Labor")} title={t("Deine Labs")} right={s.demo ? <DemoBadge /> : undefined} />

      <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", borderRadius: 16, background: "var(--surface)", border: "1px solid var(--glass-line)", color: "var(--text-dim)" }}>
        <Icon name="search" size={18} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("Supplement suchen …")} maxLength={40} aria-label={t("Supplement suchen …")}
          style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", padding: "13px 0", fontSize: "0.95rem", outline: "none" }} />
        {q && <button onClick={() => setQ("")} aria-label={t("Schließen")} style={{ background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.95rem" }}>✕</button>}
      </label>

      {ql ? (
        <div className="lab-card lab-rise" style={{ padding: 4 }}>
          {hits.map(l => {
            const mine = s.supps.find(x => x.lib === l.id)
            return (
              <button key={l.id} onClick={() => { setQ(""); if (mine) onOpen(mine.id); else onOpenLib(l.id) }} className="lab-press" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", background: "none", border: "none", color: "var(--text)", textAlign: "left" }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", background: `color-mix(in srgb, ${labColor(l)} 20%, var(--surface-2))` }}>{l.emoji}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{labTitle(l)}</span>
                  <span style={{ display: "block", fontSize: "0.74rem", color: "var(--text-dim)" }}>{mine ? t("in deinem Labor") : LAB_GROUPS[labGroup(l)].label}</span>
                </span>
                <span style={{ color: "var(--text-dim)" }}>›</span>
              </button>
            )
          })}
          {!hits.length && <div style={{ padding: 12, fontSize: "0.86rem", color: "var(--text-dim)", lineHeight: 1.45 }}>{t("Nicht in der Bibliothek. Über „+ Supplement“ kannst du es als eigenen Eintrag anlegen.")}</div>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {supps.map(x => {
            const lib = libOf(x)
            const color = lib ? labColor(lib) : LAB_GROUPS.sonstiges.color
            const st = suppStatus(s, x.id, today)
            const testing = st.key === "testing" && w && !w.open
            const day = testing ? diffDays(w!.start, today) + 1 : 0
            return (
              <button key={x.id} onClick={() => { haptic(); onOpen(x.id) }} className="lab-press lab-card lab-rise" style={{
                position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "16px 14px 14px", minHeight: 140,
                textAlign: "left", color: "var(--text)", borderRadius: 22, opacity: x.away ? 0.7 : 1,
              }}>
                <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 0, height: 4, background: color }} />
                <span style={{ width: 46, height: 46, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", background: `color-mix(in srgb, ${color} 20%, var(--surface-2))` }}>{x.emoji}</span>
                <span style={{ fontWeight: 900, fontSize: "1rem", lineHeight: 1.2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</span>
                <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-dim)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {testing ? t("Test · Tag {n}/{total}", { n: day, total: w!.days }) : `${st.emoji} ${st.label}`}
                </span>
                {testing && (
                  <span style={{ display: "block", width: "100%", height: 5, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                    <span style={{ display: "block", width: `${Math.max(6, Math.min(1, day / w!.days) * 100)}%`, height: "100%", background: "var(--lab-grad)" }} />
                  </span>
                )}
              </button>
            )
          })}
          <button onClick={() => { haptic(); onAdd() }} className="lab-press" style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 140, borderRadius: 22,
            border: "2px dashed var(--border)", background: "transparent", color: "var(--text-dim)", fontWeight: 900, fontSize: "0.92rem",
          }}>
            <Icon name="plus" size={26} />{t("Supplement")}
          </button>
        </div>
      )}

      {!ql && (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="lab-press" onClick={() => onView("stack")} style={small}>🏆 {t("Stack")}</button>
          {adv && <button className="lab-press" onClick={() => onView("exp")} style={small}>🧪 {t("Experimente")}</button>}
          <button className="lab-press" onClick={() => onView("vorrat")} style={small}>
            🛒 {t("Vorrat")}
            {shopCount > 0 && <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "#eda100", color: "#fff", fontSize: "0.68rem", fontWeight: 900, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{shopCount}</span>}
          </button>
        </div>
      )}
      {!ql && !adv && <button onClick={onMore} style={{ alignSelf: "center", background: "none", border: "none", color: "var(--text-dim)", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", padding: "4px 8px" }}>{t("Mehr Funktionen anzeigen ›")}</button>}
    </div>
  )
}

// ── Lab-Seite pro Supplement ──────────────────────────────────────────────────

/** Großer Kreis mit Inhalt in der Mitte (Hauptzahl). */
function BigRing({ pct, grad, children }: { pct: number; grad?: boolean; children: React.ReactNode }) {
  const size = 196, stroke = 16, r = (size - stroke) / 2, C = 2 * Math.PI * r
  const [on, setOn] = useState(false)
  useEffect(() => { const id = setTimeout(() => setOn(true), 60); return () => clearTimeout(id) }, [])
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <defs><linearGradient id="labRingGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2ECC8A" /><stop offset="1" stopColor="#3987e5" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={grad ? "url(#labRingGrad)" : "var(--accent)"} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={on ? C * (1 - Math.max(0, Math.min(100, pct)) / 100) : C} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.3,.9,.3,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>{children}</div>
    </div>
  )
}

const VERDICT_TEXT = () => ({ keep: t("💚 Behalten"), maybe: t("🤔 Vielleicht"), drop: t("✂️ Raus") })

export function LabPage({ s, today, suppId, libId, tab, setTab, onBack, onSelfTest, onDetails, onVerdict, onPhase, onArrived, onJoin, onLearn }: {
  s: LabState; today: string; suppId?: string; libId?: string; tab: LabTab; setTab: (t: LabTab) => void; onBack: () => void
  onSelfTest: (libId: string | null, suppId?: string) => void; onDetails: (suppId: string) => void; onVerdict: (suppId: string) => void
  onPhase: (w: PhaseWindow) => void; onArrived: (suppId: string) => void; onJoin: (suppId: string | null) => void; onLearn: (ids: string[]) => void
}) {
  const x: MySupp | undefined = suppId ? s.supps.find(q => q.id === suppId) : s.supps.find(q => q.lib === libId)
  const lib: LibSupp | undefined = x ? libOf(x) : libId ? LIB_BY_ID[libId] : undefined
  const color = lib ? labColor(lib) : LAB_GROUPS.sonstiges.color
  const [stats, setStats] = useState<CommunityStats | null>(null)
  useEffect(() => { if (!lib) return; let on = true; fetchStats(lib.id).then(v => { if (on) setStats(v) }); return () => { on = false } }, [lib])
  // Wissen: Fakten gelten beim Ansehen als entdeckt (Wissens-Album)
  const facts = lib ? factsFor(lib.id) : []
  const [fresh] = useState(() => new Set(facts.map(f => f.id).filter(f => !s.learned.includes(f))))
  useEffect(() => { if (tab === "wissen" && fresh.size) onLearn([...fresh]) }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!x && !lib) return null

  const name = x?.name ?? lib!.name
  const emoji = x?.emoji ?? lib!.emoji
  const w = phaseAt(s, today)
  const st = x ? suppStatus(s, x.id, today) : null
  const verdict = x ? s.verdicts[x.id]?.decision : undefined
  const r = x && verdict ? testResult(s, x.id) : null
  const tier = stats ? tierOf(stats.n) : "none"
  const baseDone = phaseWindows(s).some(p => p.kind === "baseline" && p.end < today) || (!!w && w.kind !== "baseline")
  const canStart = baseDone && w?.kind !== "test"
  const testing = st?.key === "testing" && w ? w : null
  const day = testing ? diffDays(testing.start, today) + 1 : 0

  // Haupt-Knopf je nach Stand
  const cta: { label: string; go: () => void; soft?: boolean } =
    lib?.rx ? { label: x ? t("⚙️ Dosis & Uhrzeit") : t("📌 Nur mitprotokollieren"), go: () => x ? onDetails(x.id) : onSelfTest(lib.id), soft: true }
    : !x ? { label: t("🔬 Selbst testen"), go: () => onSelfTest(lib!.id) }
    : testing ? { label: testing.open ? t("🔬 Test läuft") : t("🔬 Test läuft · Tag {n}/{total}", { n: day, total: testing.days }), go: () => onPhase(testing) }
    : st?.key === "verdict" ? { label: t("🎁 Ergebnis aufdecken"), go: () => onVerdict(x.id) }
    : verdict ? { label: t("📊 Mein Ergebnis"), go: () => onVerdict(x.id), soft: true }
    : x.away ? { label: t("📦 Ist angekommen"), go: () => onArrived(x.id), soft: true }
    : st?.key === "observing" && w ? { label: t("👀 Beobachtung läuft"), go: () => onPhase(w), soft: true }
    : st?.key === "constant" ? { label: t("🔬 Doch einzeln testen"), go: () => onSelfTest(x.lib ?? null, x.id) }
    : canStart ? { label: t("🔬 Selbst testen"), go: () => onSelfTest(x.lib ?? null, x.id) }
    : { label: w?.kind === "test" ? t("⏳ Nach deinem aktuellen Test") : t("⏳ Nach deiner Reset-Phase"), go: () => onSelfTest(x.lib ?? null, x.id), soft: true }

  const pill: React.CSSProperties = { padding: "9px 14px", borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text)", fontWeight: 800, fontSize: "0.82rem" }
  const mine = x ? (
    testing ? t("Bei dir: Test läuft") : st?.key === "verdict" ? t("Bei dir: Ergebnis wartet") : verdict ? `${t("Bei dir:")} ${VERDICT_TEXT()[verdict]}` : null
  ) : null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <TabHead onBack={onBack} kicker={lib ? LAB_GROUPS[labGroup(lib)].label : t("Eigener Eintrag")} title={lib ? labTitle(lib) : name}
        right={<span aria-hidden style={{ width: 48, height: 48, borderRadius: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", background: `color-mix(in srgb, ${color} 24%, var(--surface-2))`, border: `2px solid ${color}` }}>{emoji}</span>} />

      <UnderTabs value={tab} onChange={setTab} options={[
        { id: "ueberblick", label: t("Überblick") },
        ...(lib ? [{ id: "andere" as const, label: t("Was andere erlebt haben") }] : []),
        { id: "wissen", label: t("Wissen") },
      ]} />

      {tab === "ueberblick" && (
        <div className="lab-card lab-rise" style={{ padding: "26px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center", borderRadius: 28 }}>
          {tier === "pct" && stats?.keepPct != null ? <>
            <BigRing pct={stats.keepPct}>
              <span style={{ fontSize: "2.8rem", fontWeight: 900, lineHeight: 1 }}>{stats.keepPct} %</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-dim)", marginTop: 4 }}>{t("behalten")}</span>
            </BigRing>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-dim)" }}>{t("aus {n} Selbsttests · im Schnitt {d} Tage", { n: stats.n, d: stats.avgDays ?? "–" })}</div>
          </> : tier === "words" && stats?.keepPct != null ? (() => { const kw = keepWords(stats.keepPct); return <>
            <div style={{ width: 196, height: 196, borderRadius: 999, border: "16px solid var(--surface-2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 10 }}>
              <span style={{ fontSize: "1.55rem", fontWeight: 900, lineHeight: 1.1 }}>{kw.big}</span>
              <span style={{ fontSize: "0.84rem", fontWeight: 800, color: "var(--text-dim)", marginTop: 4 }}>{kw.rest}</span>
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-dim)" }}>{t("{n} Selbsttests · noch wenige Daten", { n: stats.n })}</div>
          </> })() : testing && !testing.open ? <>
            <BigRing pct={(day / testing.days) * 100} grad>
              <span style={{ fontSize: "2.6rem", fontWeight: 900, lineHeight: 1 }}>{t("Tag {n}", { n: day })}</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-dim)", marginTop: 4 }}>{t("von {total}", { total: testing.days })}</span>
            </BigRing>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-dim)" }}>{t("Ich vergleiche mit deinem Normal.")}</div>
          </> : verdict ? <>
            <div style={{ fontSize: "4.2rem", lineHeight: 1 }}>{{ keep: "💚", maybe: "🤔", drop: "✂️" }[verdict]}</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900 }}>{VERDICT_TEXT()[verdict].replace(/^\S+\s/, "")}</div>
            {r?.overall.base != null && r.overall.test != null && <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-dim)" }}>{t("{a}★ im Reset → {b}★ im Test", { a: dec(r.overall.base, 1), b: dec(r.overall.test, 1) })}</div>}
          </> : <>
            <Mascot mood={st?.key === "verdict" ? "party" : "think"} size={110} />
            <div style={{ fontSize: "1.45rem", fontWeight: 900 }}>
              {!x ? t("Noch nicht in deinem Labor") : st?.key === "verdict" ? t("Dein Ergebnis ist da") : st?.key === "constant" ? t("Läuft durchgehend") : x.away ? t("Noch nicht da") : t("Noch nicht getestet")}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-dim)", lineHeight: 1.45, maxWidth: 300 }}>
              {lib?.rx ? t("Verschriebene Mittel testest du nicht selbst – Änderungen nur mit Ärztin oder Arzt.") : lib ? t("Finde raus, ob {name} bei dir einen Unterschied macht – verglichen mit deinem Normal.", { name }) : t("Teste es wie jedes andere – ich vergleiche mit deinem Normal.")}
            </div>
          </>}

          {mine && tier !== "none" && <span style={{ fontSize: "0.8rem", fontWeight: 800, padding: "6px 12px", borderRadius: 999, background: "var(--surface-2)" }}>{mine}</span>}

          {x && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              {!lib?.rx && <button className="lab-press" onClick={() => onDetails(x.id)} style={pill}>⚙️ {t("Dosis & Uhrzeit")}</button>}
              {verdict && <button className="lab-press" onClick={() => onVerdict(x.id)} style={pill}>⚖️ {t("Urteil ändern")}</button>}
            </div>
          )}
        </div>
      )}

      {tab === "andere" && lib && (
        <CommunityCard s={s} libId={lib.id} onJoin={() => onJoin(x && s.verdicts[x.id] ? x.id : null)} />
      )}

      {tab === "wissen" && (
        <div className="lab-card lab-rise" style={{ padding: 18, fontSize: "0.9rem", lineHeight: 1.55, display: "flex", flexDirection: "column", gap: 10 }}>
          {lib ? <>
            <div><b>{t("Wofür genutzt:")}</b> {lib.effect}</div>
            <div><b>{t("Zeitrahmen:")}</b> {ONSET_INFO[lib.onset].emoji} {ONSET_INFO[lib.onset].label}</div>
            {LIB_SIDES[lib.id]?.length ? <div><b>{t("Mögliche Nebenwirkungen:")}</b> {LIB_SIDES[lib.id].map(sid => SIDE_BY_ID[sid]?.label).join(", ")}</div> : null}
            {lib.caution && <div style={{ color: "var(--warning)" }}>⚠️ {lib.caution}</div>}
            {facts.map(f => (
              <div key={f.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, borderRadius: 14, background: "var(--surface-2)" }}>
                <span aria-hidden>📚</span><span style={{ flex: 1 }}>{f.text}</span>
                {fresh.has(f.id) && <span style={{ fontSize: "0.6rem", fontWeight: 900, background: "var(--accent)", color: "#fff", padding: "2px 6px", borderRadius: 6, flexShrink: 0 }}>{t("NEU")}</span>}
              </div>
            ))}
          </> : <div style={{ color: "var(--text-dim)" }}>{t("Zu eigenen Einträgen habe ich kein Wissen – nur zu Supplements aus der Bibliothek.")}</div>}
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{t("Kein Medizinprodukt, keine Diagnose. Bei Beschwerden, Schwangerschaft oder Medikamenten vorher mit Ärztin, Arzt oder Apotheke sprechen.")}</div>
        </div>
      )}

      {/* Haupt-Knopf: klebt über der Leiste */}
      <div style={{ position: "sticky", bottom: "calc(92px + env(safe-area-inset-bottom))", zIndex: 5, paddingTop: 4 }}>
        <Btn full variant={cta.soft ? "soft" : "primary"} onClick={() => { haptic(); cta.go() }} style={{ padding: "15px 16px", fontSize: "1rem", boxShadow: cta.soft ? undefined : "0 10px 26px rgba(46,204,138,.3)" }}>{cta.label}</Btn>
      </div>
    </div>
  )
}
