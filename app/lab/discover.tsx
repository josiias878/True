"use client"
// ── Entdecken: Stories-Leiste + Feed großer Ergebnis-Karten aus der anonymen Community ──
// Nur echte Daten: Karten erst ab 5 geteilten Tests (5–19 grobe Worte, ab 20 Prozente). Keine erfundenen Nutzer oder Posts.
import React, { useEffect, useState } from "react"
import { diffDays, phaseAt, type LabState, type LibSupp } from "@/lib/supplementLab"
import { fetchOverview } from "@/lib/labCommunity"
import { LAB_GROUPS, feedOrder, keepWords, labColor, labGroup, tierOf, WORDS_MIN, type FeedEntry } from "@/lib/labSocial"
import { Btn, DemoBadge, SuppIcon, TabHead, haptic } from "./ui"
import { Mascot } from "./mascot"
import { Avatar } from "./me"
import { t } from "@/lib/labI18n"
import { markSeen } from "@/lib/labNew"
import { JoinRow, ModerationNotice, PostFeed, SwitchTabs, useSocialOn } from "./social"
import * as socialApi from "@/lib/labSocialApi"

type FeedMode = "neueste" | "gefolgt"
let lastMode: FeedMode = "neueste" // bleibt beim Zurückkommen aus Profil/Community erhalten

type Overview = { total: number; libs: Record<string, { n: number; keepPct: number | null }> }

export const labTitle = (lib: Pick<LibSupp, "name">) => t("Lab {name}", { name: lib.name })

/** Runder Story-Kreis. */
function Story({ label, ring, dashed, dot, onClick, children }: { label: string; ring?: string; dashed?: boolean; dot?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={() => { haptic(); onClick() }} className="lab-press" style={{ flex: "none", width: 78, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--text)", padding: 0 }}>
      <span style={{
        position: "relative", width: 62, height: 62, borderRadius: 999, padding: 3, display: "flex",
        background: dashed ? "transparent" : ring ?? "var(--border)", border: dashed ? "2px dashed var(--border)" : "none",
      }}>
        <span style={{ flex: 1, borderRadius: 999, background: "var(--surface)", border: dashed ? "none" : "3px solid var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.45rem" }}>{children}</span>
        {dot && <span aria-hidden style={{ position: "absolute", right: 0, top: 2, width: 12, height: 12, borderRadius: 999, background: "var(--accent)", border: "2px solid var(--background)" }} />}
      </span>
      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-dim)", maxWidth: 78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  )
}

/** Eine große Ergebnis-Karte (Aggregat pro Supplement, keine Einzelperson). */
function ResultCard({ e, onOpen, onSelfTest }: { e: FeedEntry; onOpen: () => void; onSelfTest: () => void }) {
  const color = labColor(e.lib)
  const tier = tierOf(e.n)
  const w = e.keepPct != null ? keepWords(e.keepPct) : null
  return (
    <article className="lab-card lab-rise" style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
      <button onClick={onOpen} className="lab-press" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 14px", background: "none", border: "none", color: "var(--text)", textAlign: "left" }}>
        <span style={{ width: 38, height: 38, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", background: `color-mix(in srgb, ${color} 22%, var(--surface-2))` }}><SuppIcon lib={e.lib.id} emoji={e.lib.emoji} size={32} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 900, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{labTitle(e.lib)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-dim)" }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
            {LAB_GROUPS[labGroup(e.lib)].label} · {t("{n} geteilte Selbsttests", { n: e.n })}
          </span>
        </span>
        <span style={{ color: "var(--text-dim)" }}>›</span>
      </button>
      <div onClick={onOpen} style={{ margin: "0 14px", padding: "26px 18px", borderRadius: 18, background: "var(--surface-2)", textAlign: "center", cursor: "pointer" }}>
        {tier === "pct" && e.keepPct != null ? <>
          <div style={{ fontSize: "3.2rem", fontWeight: 900, lineHeight: 1 }}>{e.keepPct} %</div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-dim)", marginTop: 6 }}>{t("haben es nach ihrem Test behalten")}</div>
        </> : w ? <>
          <div style={{ fontSize: "2.1rem", fontWeight: 900, lineHeight: 1.1 }}>{w.big}</div>
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-dim)", marginTop: 4 }}>{w.rest}</div>
          <div style={{ display: "inline-block", marginTop: 10, fontSize: "0.7rem", fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: "var(--surface)", color: "var(--text-dim)" }}>{t("noch wenige Daten")}</div>
        </> : <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{t("{n} Selbsttests", { n: e.n })}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 14px" }}>
        {e.lib.rx ? <span style={{ flex: 1, fontSize: "0.76rem", color: "var(--text-dim)" }}>{t("Verschrieben – nur mitprotokollieren, nicht selbst testen.")}</span>
          : e.mine ? <Btn variant="soft" onClick={onOpen} style={{ flex: 1, padding: "11px 12px", fontSize: "0.88rem" }}>{t("Mein Lab ›")}</Btn>
          : <Btn onClick={onSelfTest} style={{ flex: 1, padding: "11px 12px", fontSize: "0.88rem" }}>{t("🔬 Selbst testen")}</Btn>}
        <span style={{ fontSize: "0.68rem", color: "var(--text-dim)", maxWidth: 120, lineHeight: 1.3 }}>{t("anonym · keine Studie")}</span>
      </div>
    </article>
  )
}

export function DiscoverView({ s, today, recapReady, onRecap, onOpenLab, onSelfTest, onJoin, onFlash, goLabor }: {
  s: LabState; today: string; recapReady: boolean; onRecap: () => void
  onOpenLab: (libId: string, tab?: "andere") => void; onSelfTest: (libId: string) => void; onJoin: () => void; onFlash: (m: string) => void; goLabor: () => void
}) {
  const [ov, setOv] = useState<Overview | null | "loading">("loading")
  useEffect(() => { let on = true; fetchOverview().then(v => { if (on) setOv(v) }); return () => { on = false } }, [])
  const feed = ov && ov !== "loading" ? feedOrder(s, ov.libs) : []
  const canRecap = Object.keys(s.checkins).length >= 3
  const myLabs = feed.filter(e => e.mine)
  const w = phaseAt(s, today)
  const wName = w?.suppId ? s.supps.find(x => x.id === w.suppId)?.name : undefined
  const day = w ? diffDays(w.start, today) + 1 : 0
  const social = useSocialOn()
  const [mode, setModeRaw] = useState<FeedMode>(lastMode)
  const setMode = (m: FeedMode) => { lastMode = m; setModeRaw(m); if (m === "gefolgt") markSeen("follow") }

  // S1-Inhalt: anonyme Ergebnis-Karten pro Supplement (ohne Einwilligung = alles wie bisher)
  const s1 = ov === "loading" ? (
        <div className="lab-card lab-shine" style={{ height: 320, background: "linear-gradient(90deg, var(--surface-2), var(--surface), var(--surface-2))" }} />
      ) : feed.length ? (
        <>
          {feed.map(e => <ResultCard key={e.lib.id} e={e} onOpen={() => onOpenLab(e.lib.id, "andere")} onSelfTest={() => onSelfTest(e.lib.id)} />)}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "18px 0 6px", color: "var(--text-dim)" }}>
            <Mascot mood="happy" size={52} />
            <div style={{ fontWeight: 900, color: "var(--text)" }}>{t("✓ Du bist auf dem neuesten Stand")}</div>
            <div style={{ fontSize: "0.8rem" }}>{t("Neue Ergebnisse kommen, sobald andere ihre Tests beenden.")}</div>
          </div>
        </>
      ) : (
        <div className="lab-card lab-rise" style={{ padding: "28px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="lab-float"><Mascot mood="think" size={104} /></div>
          {/* Ohne Verbindung eigener Zustand – nicht „leer“, sondern „gerade nicht erreichbar“ */}
          <div style={{ fontSize: "1.35rem", fontWeight: 900, marginTop: 8 }}>{ov === null ? t("Gerade keine Verbindung") : t("Noch ist es hier ruhig")}</div>
          <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.45 }}>
            {ov === null ? t("Schau später wieder rein.")
              : <>{t("Dein Ergebnis kann das erste sein.")}{ov.total > 0 ? <>{" "}{t("Schon {n} Selbsttests geteilt – ab {min} pro Supplement zeige ich sie hier.", { n: ov.total, min: WORDS_MIN })}</> : null}</>}
          </div>
          {w && (w.kind === "test" || w.kind === "baseline") && !w.open ? (
            <div style={{ width: "100%", marginTop: 18, padding: "14px 16px", borderRadius: 18, background: "var(--surface-2)", textAlign: "left" }}>
              <div style={{ fontWeight: 900, fontSize: "0.92rem" }}>
                {w.kind === "test" ? t("Dein {name}-Test · Tag {n} von {total}", { name: wName ?? "", n: day, total: w.days }) : t("Reset · Tag {n} von {total}", { n: day, total: w.days })}
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--surface)", marginTop: 8, overflow: "hidden" }}>
                <div style={{ width: `${Math.max(6, Math.min(1, day / w.days) * 100)}%`, height: "100%", background: "var(--lab-grad)", borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-dim)", marginTop: 6 }}>
                {w.kind === "test" ? t("Danach deckst du dein Ergebnis auf – und kannst es anonym teilen.") : t("Danach startet dein erster Test.")}
              </div>
            </div>
          ) : (
            <Btn onClick={goLabor} style={{ marginTop: 18 }}>{t("🔬 Test starten")}</Btn>
          )}
          {s.community !== true && ov !== null && <Btn variant="soft" onClick={onJoin} style={{ marginTop: 10, minHeight: 44, padding: "10px 14px", fontSize: "0.84rem" }}>{t("🌍 Anonym mitmachen")}</Btn>}
        </div>
      )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <TabHead kicker={t("Entdecken")} title={t("Gerade im Labor")} right={s.demo ? <DemoBadge /> : undefined} />
      {social && <SwitchTabs value={mode} onChange={setMode} options={[
        { id: "neueste", label: t("Neueste"), badge: "reactions" },
        { id: "gefolgt", label: t("Gefolgt"), badge: "follow" },
      ]} />}
      {social && <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-dim)", marginTop: -6, textAlign: "center" }}>
        {mode === "gefolgt" ? t("Neueste zuerst · nur Leute, denen du folgst") : t("Alle Ergebnisse, neueste zuerst – kein Ranking")}
      </div>}

      {/* Stories: eigene Woche + Labs mit echten Daten */}
      <div className="lab-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "-4px -16px 0", padding: "0 16px 2px" }}>
        <Story label={t("Deine Woche")} ring={recapReady ? "linear-gradient(135deg, #2ECC8A, #3987e5)" : undefined} dashed={!canRecap} dot={recapReady}
          onClick={() => canRecap ? onRecap() : onFlash(t("📊 Deine Woche gibt's ab 3 Check-ins"))}><Avatar s={s} size={50} shadow={false} /></Story>
        {myLabs.map(e => (
          <Story key={e.lib.id} label={e.lib.name} ring={labColor(e.lib)} onClick={() => onOpenLab(e.lib.id, "andere")}><SuppIcon lib={e.lib.id} emoji={e.lib.emoji} size={40} /></Story>
        ))}
      </div>

      {!social && <JoinRow />}
      {social && <ModerationNotice />}

      {!social ? s1
        : mode === "gefolgt" ? (
          <PostFeed feedKey="following" load={c => socialApi.feed("following", c)} onSelfTest={onSelfTest}
            empty={<div className="lab-card lab-rise" style={{ padding: "26px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="lab-float"><Mascot mood="happy" size={92} /></div>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, marginTop: 8 }}>{t("Du folgst noch niemandem")}</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.45 }}>{t("Tipp in „Neueste“ auf einen Namen und dann auf „Folgen“.")}</div>
              <Btn variant="soft" onClick={() => setMode("neueste")} style={{ marginTop: 14, minHeight: 44 }}>{t("Zu „Neueste“")}</Btn>
            </div>} />
        ) : (
          <PostFeed feedKey="discover" load={c => socialApi.feed("discover", c)} onSelfTest={onSelfTest} empty={s1}
            offline={feed.length ? <>
              <div role="status" style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-dim)", textAlign: "center" }}>{t("Beiträge gerade nicht erreichbar – hier die anonymen Ergebnisse:")}</div>
              {s1}
            </> : undefined} />
        )}

    </div>
  )
}
