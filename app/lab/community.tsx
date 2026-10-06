"use client"
// ── Community: „Was andere erlebt haben“ – anonym, freiwillig, visuell ─────────
import React, { useEffect, useState } from "react"
import { DIMS, LIB_BY_ID, SIDE_BY_ID, testResult, type LabState } from "@/lib/supplementLab"
import { COMMUNITY_MIN, communityPayload, fetchStats, percentile, type CommunityStats } from "@/lib/labCommunity"
import { Btn, Sheet } from "./ui"
import { ProGate } from "./grow"
import { keepWords, sidesShown, tierOf } from "@/lib/labSocial"
import { Mascot } from "./mascot"
import { t, dec } from "@/lib/labI18n"

const fmt1 = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${dec(Math.abs(n), 1)}`

function KeepRing({ pct, size = 92 }: { pct: number; size?: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), 80); return () => clearTimeout(t) }, [])
  const stroke = 11, r = (size - stroke) / 2, C = 2 * Math.PI * r
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={on ? C * (1 - pct / 100) : C} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.3,.9,.3,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--text-dim)" }}>{t("behalten")}</span>
      </div>
    </div>
  )
}

/** Verteilung der Ergebnisse (10.–90. Perzentil) mit Median und „Du“-Markierung. */
function Spread({ q, mine }: { q: number[]; mine: number | null }) {
  const lo = Math.min(-2, q[0], mine ?? 0), hi = Math.max(2, q[4], mine ?? 0)
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`
  return (
    <div style={{ position: "relative", height: 46, margin: "4px 6px 0" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 18, height: 6, borderRadius: 3, background: "var(--surface-2)" }} />
      <div style={{ position: "absolute", top: 17, height: 8, borderRadius: 4, left: x(q[0]), width: `calc(${x(q[4])} - ${x(q[0])})`, background: "color-mix(in srgb, #3987e5 35%, transparent)" }} />
      <div style={{ position: "absolute", top: 15, height: 12, borderRadius: 6, left: x(q[1]), width: `calc(${x(q[3])} - ${x(q[1])})`, background: "#3987e5", opacity: 0.75 }} />
      <div style={{ position: "absolute", left: x(0), top: 10, width: 2, height: 22, background: "var(--text-dim)", opacity: 0.5 }} />
      <span title="Median" style={{ position: "absolute", left: x(q[2]), top: 21, width: 14, height: 14, transform: "translate(-50%, -50%)", borderRadius: 999, background: "#fff", border: "3px solid #3987e5" }} />
      {mine != null && (
        <span className="lab-pop" style={{ position: "absolute", left: x(mine), top: 21, transform: "translate(-50%, -50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ width: 18, height: 18, borderRadius: 999, background: "var(--accent)", border: "3px solid var(--surface)", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }} />
          <span style={{ marginTop: 2, fontSize: "0.62rem", fontWeight: 900, color: "var(--accent)" }}>{t("DU")}</span>
        </span>
      )}
      <span style={{ position: "absolute", left: 0, top: 32, fontSize: "0.62rem", color: "var(--text-dim)" }}>{t("schlechter")}</span>
      <span style={{ position: "absolute", right: 0, top: 32, fontSize: "0.62rem", color: "var(--text-dim)" }}>{t("besser")}</span>
    </div>
  )
}

/**
 * „Was andere erlebt haben“ – gestuft nach Datenmenge (PLAN.md): unter 5 nur „x von 5“, 5–19 grobe Worte,
 * ab 20 Prozente; Verteilung und Bereiche (Tiefe) mit Lab Pro; Beschwerden erst ab 3 Nennungen.
 */
export function CommunityCard({ s, suppId, libId: libId0, onJoin, flat }: { s: LabState; suppId?: string; libId?: string; onJoin?: () => void; flat?: boolean }) {
  const x = suppId ? s.supps.find(q => q.id === suppId) : s.supps.find(q => q.lib === libId0)
  const libId = libId0 ?? x?.lib
  const [st, setSt] = useState<CommunityStats | null | "loading">("loading")
  useEffect(() => { if (!libId) return; let on = true; setSt("loading"); fetchStats(libId).then(v => { if (on) setSt(v) }); return () => { on = false } }, [libId])
  if (!libId || !LIB_BY_ID[libId]) return null
  const r = x ? testResult(s, x.id) : null
  const mineDelta = x && s.verdicts[x.id] && r?.overall.base != null && r.overall.test != null ? r.overall.test - r.overall.base : null
  const tier = st !== "loading" && st ? tierOf(st.n) : "none"
  const sides = st !== "loading" && st ? sidesShown(st.sides, st.n) : []

  return (
    <div className={flat ? "lab-rise" : "lab-card lab-rise"} style={{ padding: flat ? 0 : 16, marginBottom: 12 }}>
      {!flat && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontWeight: 900, fontSize: "1rem", flex: 1 }}>{t("🌍 Was andere erlebt haben")}</span>
          {tier !== "none" && st !== "loading" && st && <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-dim)" }}>{t("{n} Tests", { n: st.n })}</span>}
        </div>
      )}
      {st === "loading" ? (
        <div className="lab-shine" style={{ height: 80, borderRadius: 16, background: "linear-gradient(90deg, var(--surface-2), color-mix(in srgb, var(--surface-2) 50%, var(--surface)), var(--surface-2))" }} />
      ) : st === null ? (
        <div style={{ fontSize: "0.84rem", color: "var(--text-dim)", lineHeight: 1.45 }}>{t("Gerade keine Verbindung – ich zeige es dir, sobald du wieder online bist.")}</div>
      ) : tier === "none" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: COMMUNITY_MIN }, (_, k) => (
              <span key={k} className="lab-pop" style={{ animationDelay: `${k * 60}ms`, width: 16, height: 16, borderRadius: 999, background: k < st.n ? "var(--accent)" : "var(--surface-2)" }} />
            ))}
          </div>
          <span style={{ flex: 1, fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.4 }}>
            {st.n ? t("Erst {n} von {min} Tests", { n: st.n, min: COMMUNITY_MIN }) : t("Noch niemand")}{t(" – ab {min} zeige ich, was andere erlebt haben.", { min: COMMUNITY_MIN })}{s.community !== true && onJoin ? t(" Sei einer der Ersten!") : ""}
          </span>
        </div>
      ) : tier === "words" ? (
        <>
          {st.keepPct != null && (() => { const w = keepWords(st.keepPct); return (
            <div>
              <div style={{ fontSize: "1.9rem", fontWeight: 900, lineHeight: 1.1 }}>{w.big}</div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-dim)", marginTop: 2 }}>{w.rest}</div>
            </div>
          ) })()}
          <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: 10, lineHeight: 1.45 }}>
            {t("{n} Selbsttests · noch wenige Daten, deshalb nur grob", { n: st.n })}{st.avgDays ? ` · ${t("Ø {n} Tage getestet", { n: st.avgDays })}` : ""}
          </div>
          {sides.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--text-dim)", padding: "4px 0" }}>{t("Genannt:")}</span>
              {sides.slice(0, 4).map(([id]) => (
                <span key={id} style={{ fontSize: "0.74rem", fontWeight: 800, padding: "4px 9px", borderRadius: 999, background: "var(--surface-2)" }}>{SIDE_BY_ID[id]?.emoji} {SIDE_BY_ID[id]?.label ?? id}</span>
              ))}
            </div>
          )}
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 10 }}>{t("Anonyme Selbstversuche anderer Nutzer – keine Studie, aber ein ehrliches Bild.")}</div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <KeepRing pct={st.keepPct ?? 0} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-dim)" }}>{t("Im Schnitt")}</div>
              <div style={{ fontSize: "1.9rem", fontWeight: 900, lineHeight: 1.05 }}>{fmt1(st.avg ?? 0)}★</div>
              <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>{t("Gesamtgefühl · Ø {n} Tage getestet", { n: st.avgDays ?? "" })}</div>
            </div>
          </div>
          {(st.quantiles || (st.dims && Object.keys(st.dims).length > 0)) && (
            <div style={{ marginTop: 10 }}>
              <ProGate s={s} feature="community">
                {st.quantiles && <Spread q={st.quantiles} mine={mineDelta} />}
                {mineDelta != null && st.quantiles && (
                  <div className="lab-pop" style={{ marginTop: 6, padding: "8px 12px", borderRadius: 14, background: "var(--surface-2)", fontSize: "0.82rem", fontWeight: 800 }}>
                    {t("Bei dir {d}★ – besser als ca. {p} % der anderen", { d: fmt1(mineDelta), p: percentile(mineDelta, st.quantiles) ?? "" })}
                  </div>
                )}
                {st.dims && Object.keys(st.dims).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                    {Object.entries(st.dims).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).map(([d, v]) => {
                      const info = DIMS.find(q => q.id === d)
                      const len = Math.min(1, Math.abs(v) / 1.5) * 50
                      return (
                        <div key={d} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", fontWeight: 800 }}>
                          <span style={{ width: 92, flexShrink: 0 }}>{info?.emoji} {info?.label ?? d}</span>
                          <span style={{ flex: 1, position: "relative", height: 10, borderRadius: 5, background: "var(--surface-2)" }}>
                            <span style={{ position: "absolute", top: 0, bottom: 0, borderRadius: 5, background: v >= 0 ? "#1baf7a" : "#e34948", ...(v >= 0 ? { left: "50%", width: `${len}%` } : { right: "50%", width: `${len}%` }) }} />
                            <span style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 2, background: "var(--text-dim)", opacity: 0.4 }} />
                          </span>
                          <span style={{ width: 40, textAlign: "right" }}>{fmt1(v)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ProGate>
            </div>
          )}
          {sides.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {sides.slice(0, 4).map(([id, p]) => (
                <span key={id} style={{ fontSize: "0.74rem", fontWeight: 800, padding: "4px 9px", borderRadius: 999, background: "var(--surface-2)" }}>{SIDE_BY_ID[id]?.emoji} {SIDE_BY_ID[id]?.label ?? id} · {p} %</span>
              ))}
            </div>
          )}
          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 10 }}>{t("Anonyme Selbstversuche anderer Nutzer – keine Studie, aber ein ehrliches Bild.")}</div>
        </>
      )}
      {s.community !== true && onJoin && (
        <Btn variant="soft" onClick={onJoin} style={{ marginTop: 12, width: "100%", padding: "10px 12px", fontSize: "0.84rem" }}>{t("🌍 Mitmachen – anonym teilen")}</Btn>
      )}
    </div>
  )
}

/** Zustimmung: zeigt genau, was geteilt würde. */
export function CommunityConsent({ s, suppId, onYes, onNo }: { s: LabState; suppId: string | null; onYes: () => void; onNo: () => void }) {
  const p = suppId ? communityPayload(s, suppId) : null
  const lib = p ? LIB_BY_ID[p.lib] : null
  const verdict = p ? { keep: t("💚 behalten"), maybe: t("🤔 vielleicht"), drop: t("✂️ raus") }[p.decision] : null
  return (
    <Sheet open onClose={onNo}>
      <div style={{ textAlign: "center" }}>
        <div className="lab-float" style={{ display: "inline-block" }}><Mascot mood="happy" size={96} /></div>
        <div style={{ fontSize: "1.35rem", fontWeight: 900, marginTop: 6 }}>{t("🌍 Hilf anderen – anonym")}</div>
        <div style={{ fontSize: "0.88rem", color: "var(--text-dim)", marginTop: 6, lineHeight: 1.45 }}>
          {t("Dein Testergebnis fließt in „Was andere erlebt haben“ ein. So sieht jeder, was echte Menschen mit einem Supplement erleben – nicht nur in der Werbung.")}
        </div>
      </div>
      <div style={{ marginTop: 16, fontSize: "0.72rem", fontWeight: 900, letterSpacing: ".08em", color: "var(--text-dim)" }}>{t("DAS WÜRDE GETEILT")}</div>
      <div className="lab-pop" style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, padding: 12, borderRadius: 18, background: "var(--surface-2)" }}>
        {p && lib ? <>
          <span style={{ padding: "6px 10px", borderRadius: 999, background: "var(--surface)", fontWeight: 800, fontSize: "0.82rem" }}>{lib.emoji} {lib.name}</span>
          <span style={{ padding: "6px 10px", borderRadius: 999, background: "var(--surface)", fontWeight: 800, fontSize: "0.82rem" }}>{t("⏱️ {n} Tage", { n: p.days })}</span>
          <span style={{ padding: "6px 10px", borderRadius: 999, background: "var(--surface)", fontWeight: 800, fontSize: "0.82rem" }}>{fmt1(p.delta)}★</span>
          <span style={{ padding: "6px 10px", borderRadius: 999, background: "var(--surface)", fontWeight: 800, fontSize: "0.82rem" }}>{verdict}</span>
          {p.sides.length > 0 && <span style={{ padding: "6px 10px", borderRadius: 999, background: "var(--surface)", fontWeight: 800, fontSize: "0.82rem" }}>{p.sides.map(id => SIDE_BY_ID[id]?.emoji).join(" ")}</span>}
        </> : <span style={{ fontSize: "0.84rem", fontWeight: 700 }}>{t("Supplement · Testdauer · ±★ · dein Urteil · Nebenwirkungen")}</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14, fontSize: "0.84rem", fontWeight: 700 }}>
        {[t("Keine Namen, kein Konto, keine Daten oder Notizen"), t("Nur Supplements aus der Bibliothek – nie eigene Einträge"), t("Jederzeit in den Einstellungen löschbar")].map(x => (
          <div key={x} style={{ display: "flex", gap: 8 }}><span style={{ color: "var(--accent)" }}>✓</span>{x}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <Btn variant="soft" onClick={onNo} style={{ flex: 1 }}>{t("Nein danke")}</Btn>
        <Btn onClick={onYes} style={{ flex: 2 }}>{t("🌍 Ja, anonym teilen")}</Btn>
      </div>
    </Sheet>
  )
}
