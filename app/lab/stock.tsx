"use client"
import React, { useEffect, useState } from "react"
import { addDays, fmtDate, libOf, suppColor, todayIso, type LabState, type MySupp, type Stock, type StockForm } from "@/lib/supplementLab"
import {
  FORMS, doseCheck, doseLabel, doseRange, fmtNum, gramDosed, guessForm, guessPerDay, openShop, perUse, shopIsAd, shopUrl,
  stockInfo, buyInfo, LOW_DAYS, monthlyCost, fmtEuro, type StockInfo,
} from "@/lib/labStock"
import { Btn, Sheet } from "./ui"
import { KolbiTip, Mascot } from "./mascot"
import { t, euro } from "@/lib/labI18n"

// ── Animierte Dose: Füllstand = Vorrat ─────────────────────────────────────────

export function Jar({ form, pct, color, size = 120, animate = true }: { form: StockForm; pct: number; color: string; size?: number; animate?: boolean }) {
  const [p, setP] = useState(animate ? 0 : pct)
  useEffect(() => { const t = setTimeout(() => setP(pct), animate ? 120 : 0); return () => clearTimeout(t) }, [pct, animate])
  const clamp = Math.max(0, Math.min(1, p))
  // Körperform je nach Packung
  const body = form === "tropfen"
    ? "M36 34 h28 v6 c8 4 12 10 12 18 v26 c0 6 -4 10 -10 10 H34 c-6 0 -10 -4 -10 -10 V58 c0 -8 4 -14 12 -18 z"
    : form === "pulver"
      ? "M18 30 h64 v56 c0 6 -4 10 -10 10 H28 c-6 0 -10 -4 -10 -10 z"
      : "M28 28 h44 c4 0 6 2 6 6 v54 c0 5 -3 8 -8 8 H30 c-5 0 -8 -3 -8 -8 V34 c0 -4 2 -6 6 -6 z"
  const lid = form === "tropfen" ? <><rect x="40" y="10" width="20" height="24" rx="5" fill="#1a1c20" /><rect x="44" y="4" width="12" height="8" rx="3" fill="#1a1c20" /></>
    : form === "pulver" ? <rect x="14" y="18" width="72" height="14" rx="5" fill="#1a1c20" />
    : <rect x="30" y="14" width="40" height="16" rx="5" fill="#1a1c20" />
  const top = 30, bottom = 96
  const y = bottom - (bottom - top) * clamp
  const id = `jar-${form}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden style={{ display: "block", overflow: "visible" }}>
      <defs><clipPath id={id}><path d={body} /></clipPath></defs>
      <path d={body} fill="var(--surface-2)" />
      <g clipPath={`url(#${id})`}>
        <g style={{ transform: `translateY(${y}px)`, transition: "transform 1.2s cubic-bezier(.3,.9,.3,1)" }}>
          <path className="lab-wave" d="M-20 0 C -4 -5, 10 5, 24 0 S 50 -5, 64 0 S 90 5, 104 0 S 128 -5, 140 0 V 120 H-20 Z" fill={color} opacity=".9" />
          {form === "kapseln" && [[34, 12], [52, 18], [64, 9], [42, 28], [58, 34]].map(([cx, cy], k) => (
            <rect key={k} x={cx - 7} y={cy} width="14" height="7" rx="3.5" fill="#fff" opacity=".55" transform={`rotate(${k * 37} ${cx} ${cy + 3})`} />
          ))}
          {form === "pulver" && [[30, 10], [50, 16], [70, 8], [40, 26], [62, 30]].map(([cx, cy], k) => <circle key={k} cx={cx} cy={cy} r="1.8" fill="#fff" opacity=".6" />)}
        </g>
      </g>
      <path d={body} fill="none" stroke="#1a1c20" strokeWidth="3" strokeLinejoin="round" />
      {lid}
      <rect x={form === "pulver" ? 30 : 34} y="50" width={form === "pulver" ? 40 : 32} height="22" rx="4" fill="#fff" opacity=".85" />
    </svg>
  )
}

function CountUp({ to, ms = 1100 }: { to: number; ms?: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return <>{v}</>
}

// ── Eingaben ───────────────────────────────────────────────────────────────────

function NumberPick({ value, onChange, chips, unit, max, step = 1 }: { value: number; onChange: (v: number) => void; chips: number[]; unit: string; max: number; step?: number }) {
  const b: React.CSSProperties = { width: 52, height: 52, borderRadius: 18, border: "none", background: "var(--surface-2)", color: "var(--text)", fontWeight: 900, fontSize: "1.4rem" }
  const set = (v: number) => onChange(Math.max(0, Math.min(max, Math.round(v * 100) / 100)))
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button className="lab-press" style={b} aria-label={t("weniger")} onClick={() => set(value - step)}>−</button>
        <label style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <input type="number" inputMode="decimal" value={value || ""} placeholder="0" onChange={e => set(Number(e.target.value.replace(",", ".")))}
            style={{ width: 110, textAlign: "center", fontSize: "2.4rem", fontWeight: 900, border: "none", background: "transparent", color: "var(--text)", outline: "none", fontVariantNumeric: "tabular-nums" }} />
          <span style={{ fontWeight: 800, color: "var(--text-dim)" }}>{unit}</span>
        </label>
        <button className="lab-press" style={b} aria-label={t("mehr")} onClick={() => set(value + step)}>+</button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {chips.map(c => (
          <button key={c} className="lab-press" onClick={() => set(c)} style={{
            padding: "9px 14px", borderRadius: 999, border: "none", fontWeight: 800, fontSize: "0.85rem",
            background: value === c ? "var(--accent)" : "var(--surface-2)", color: value === c ? "#fff" : "var(--text)",
          }}>{fmtNum(c)}</button>
        ))}
      </div>
    </div>
  )
}

function Dots({ n, i }: { n: number; i: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "0 0 18px" }}>
      {Array.from({ length: n }, (_, k) => (
        <span key={k} style={{ height: 6, width: k === i ? 22 : 6, borderRadius: 3, background: k <= i ? "var(--accent)" : "var(--border)", transition: "all .3s" }} />
      ))}
    </div>
  )
}

// ── Vorrat eintragen: Schritt für Schritt ──────────────────────────────────────

export function StockSheet({ s, suppId, onClose, onSave }: {
  s: LabState; suppId: string; onClose: () => void; onSave: (stock: Stock, dose: string) => void
}) {
  const x = s.supps.find(q => q.id === suppId)!
  const prev = x.stock
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<StockForm>(prev?.form ?? guessForm(x))
  const [pack, setPack] = useState(prev?.pack ?? FORMS[prev?.form ?? guessForm(x)].packChips[1])
  const [opened, setOpened] = useState(false)
  const [left, setLeft] = useState(prev ? Math.round((stockInfo(s, x)?.left ?? prev.pack) * 10) / 10 : 0)
  const [perDay, setPerDay] = useState(prev?.perDay ?? guessPerDay(x, prev?.form ?? guessForm(x)))
  const [active, setActive] = useState(prev?.active ?? 0)
  const [price, setPrice] = useState(prev?.price ?? 0)
  const range = doseRange(libOf(x))
  const unit = range?.unit === "IE" ? "IE" : range && range.max < 1 ? "µg" : "mg"
  const [activeUnit, setActiveUnit] = useState<"mg" | "µg" | "IE">(prev?.activeUnit ?? unit)
  const f = FORMS[form]
  const askActive = !!range && !gramDosed(x, form) && !libOf(x)?.rx && libOf(x)?.category !== "Peptide"

  const pickForm = (v: StockForm) => {
    setForm(v)
    if (!prev || prev.form !== v) { setPack(FORMS[v].packChips[1]); setPerDay(guessPerDay(x, v)); setActive(0) }
    setStep(1)
  }
  const stock: Stock = {
    form, pack, perDay, left: opened ? Math.min(left, pack) : pack, at: todayIso(),
    ...(askActive && active > 0 ? { active, activeUnit } : {}),
    ...(price > 0 ? { price } : {}),
  }
  const perMonth = monthlyCost({ ...x, stock })
  const uses = perUse(stock) > 0 ? Math.floor(stock.left / perUse(stock) + 1e-9) : 0
  const days = libOf(x)?.weekly ? uses * 7 : uses
  const check = doseCheck(x, stock)
  const color = suppColor(x)
  const steps = 4
  const perUnit = form === "kapseln" ? t("Kapsel") : form === "tropfen" ? t("Tropfen") : form === "pulver" ? "g" : "ml"

  return (
    <Sheet open onClose={onClose} title={`${x.emoji} ${t("Vorrat: {name}", { name: x.name })}`}>
      <Dots n={steps} i={step} />
      {step === 0 && (
        <div key="s0" className="lab-rise" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, textAlign: "center", marginBottom: 6 }}>{t("Wie sieht es aus?")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(Object.keys(FORMS) as StockForm[]).map(k => (
              <button key={k} className="lab-press" onClick={() => pickForm(k)} style={{
                padding: "16px 10px 12px", borderRadius: 22, border: form === k ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: form === k ? "var(--accent-dim)" : "var(--surface)", color: "var(--text)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}>
                <Jar form={k} pct={0.6} color={color} size={64} animate={false} />
                <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>{FORMS[k].label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {step === 1 && (
        <div key="s1" className="lab-rise" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, textAlign: "center" }}>{t("Wie viel ist in einer Packung?")}</div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", textAlign: "center", marginTop: -10 }}>{form === "tropfen" ? t("Steht meist vorne drauf (Inhalt in ml).") : t("Steht meist vorne drauf.")}</div>
          <NumberPick value={pack} onChange={setPack} chips={f.packChips} unit={f.packUnit} max={f.packMax} step={form === "kapseln" ? 10 : form === "pulver" ? 50 : 5} />
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {[[false, t("📦 Neu / voll")], [true, t("✂️ Schon angebrochen")]].map(([v, l]) => (
              <button key={String(v)} className="lab-press" onClick={() => { setOpened(v as boolean); if (v && !left) setLeft(Math.round(pack / 2)) }} style={{
                padding: "9px 14px", borderRadius: 999, fontWeight: 800, fontSize: "0.82rem",
                border: opened === v ? "2px solid var(--accent)" : "1px solid var(--border)", background: opened === v ? "var(--accent-dim)" : "transparent", color: "var(--text)",
              }}>{l as string}</button>
            ))}
          </div>
          {opened && (
            <div className="lab-rise" style={{ padding: 14, borderRadius: 20, background: "var(--surface-2)" }}>
              <div style={{ fontWeight: 800, textAlign: "center", marginBottom: 8 }}>{t("Ungefähr noch drin?")}</div>
              <NumberPick value={left} onChange={setLeft} chips={[0.25, 0.5, 0.75].map(k => Math.round(pack * k))} unit={f.packUnit} max={pack} step={form === "kapseln" ? 5 : 10} />
            </div>
          )}
          <Btn full disabled={!pack} onClick={() => setStep(2)}>{t("Weiter")}</Btn>
        </div>
      )}
      {step === 2 && (
        <div key="s2" className="lab-rise" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: "1.25rem", fontWeight: 900, textAlign: "center" }}>{libOf(x)?.weekly ? t("Wie viel nimmst du pro Einnahme?") : t("Wie viel nimmst du am Tag?")}</div>
          {libOf(x) && <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", textAlign: "center", marginTop: -10 }}>{t("Übliche Packungsangabe: {dose}", { dose: libOf(x)!.dose })}</div>}
          <NumberPick value={perDay} onChange={setPerDay} chips={f.doseChips} unit={f.doseUnit} max={f.doseMax} step={form === "fluessig" ? 5 : 1} />
          {askActive && (
            <div style={{ padding: 14, borderRadius: 20, background: "var(--surface-2)" }}>
              <div style={{ fontWeight: 800, textAlign: "center" }}>{t("Wirkstoff pro {unit}?", { unit: perUnit })} <span style={{ fontWeight: 600, color: "var(--text-dim)" }}>{t("(optional)")}</span></div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", textAlign: "center", margin: "2px 0 10px" }}>{t("Dann rechne ich nach, ob die Dosis passt.")}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <input type="number" inputMode="decimal" value={active || ""} placeholder={t("z. B. 25")} onChange={e => setActive(Math.max(0, Number(e.target.value.replace(",", "."))))}
                  style={{ width: 110, padding: "10px 12px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: "1.1rem", fontWeight: 800, textAlign: "center" }} />
                {(range?.unit === "IE" ? ["IE"] as const : ["mg", "µg"] as const).map(u => (
                  <button key={u} className="lab-press" onClick={() => setActiveUnit(u)} style={{
                    padding: "9px 12px", borderRadius: 12, border: "none", fontWeight: 800,
                    background: activeUnit === u ? "var(--accent)" : "var(--surface)", color: activeUnit === u ? "#fff" : "var(--text)",
                  }}>{u === "IE" ? t("IE") : u}</button>
                ))}
              </div>
            </div>
          )}
          <Btn full disabled={!perDay} onClick={() => setStep(3)}>{t("Ausrechnen ✨")}</Btn>
        </div>
      )}
      {step === 3 && (
        <div key="s3" className="lab-rise" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <div style={{ position: "relative" }}>
            <Jar form={form} pct={stock.left / pack} color={color} size={130} />
            <div className="lab-pop" style={{ position: "absolute", right: -30, bottom: 6 }}><Mascot mood="party" size={54} /></div>
          </div>
          <div style={{ fontSize: "0.72rem", fontWeight: 900, letterSpacing: ".1em", color: "var(--accent)" }}>{t("REICHT FÜR CA.")}</div>
          <div style={{ fontSize: "3rem", fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}><CountUp to={days} /> <span style={{ fontSize: "1.3rem" }}>{t("Tage")}</span></div>
          <div style={{ color: "var(--text-dim)", fontSize: "0.88rem" }}>
            {days > 0 ? `${t("bis {date}", { date: fmtDate(addDays(todayIso(), days)) })} · ${doseLabel(stock)} ${libOf(x)?.weekly ? t("pro Woche") : t("am Tag")}` : t("Da ist nichts mehr drin.")}
          </div>
          {check && (
            <div className="lab-late" style={{ width: "100%", textAlign: "left" }}>
              <KolbiTip mood={check.level === "ok" ? "happy" : "think"} title={`${check.level === "ok" ? "✅" : check.level === "high" ? "⚠️" : "🤏"} ${t("{amount} am Tag", { amount: check.amount })}`}>
                {check.text}
                {check.better && <> <b>{check.better === 1 ? t("1 Kapsel würde reichen") : t("{n} Kapseln würden reichen", { n: check.better })}</b> {t("– dann hält die Packung ca. {a} statt {b} Tage.", { a: Math.floor(stock.left / check.better), b: uses })}</>}
              </KolbiTip>
            </div>
          )}
          <div className="lab-late" style={{ width: "100%", padding: 14, borderRadius: 20, background: "var(--surface-2)", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.4rem" }}>💶</span>
              <span style={{ flex: 1, fontWeight: 900, fontSize: "0.9rem" }}>{t("Preis pro Packung")} <span style={{ fontWeight: 600, color: "var(--text-dim)" }}>{t("(optional)")}</span></span>
              <label style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <input type="number" inputMode="decimal" value={price || ""} placeholder="0" onChange={e => setPrice(Math.max(0, Number(e.target.value.replace(",", "."))))}
                  style={{ width: 64, border: "none", background: "transparent", color: "var(--text)", fontSize: "1.05rem", fontWeight: 900, textAlign: "right", outline: "none" }} />
                <span style={{ fontWeight: 900 }}>€</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {[10, 15, 20, 25, 35].map(v => (
                <button key={v} className="lab-press" onClick={() => setPrice(v)} style={{ padding: "6px 11px", borderRadius: 999, border: "none", fontWeight: 800, fontSize: "0.8rem",
                  background: price === v ? "var(--accent)" : "var(--surface)", color: price === v ? "#fff" : "var(--text)" }}>{euro(v)}</button>
              ))}
            </div>
            {perMonth != null && (
              <div key={Math.round(perMonth * 100)} className="lab-pop" style={{ marginTop: 10, display: "inline-flex", alignItems: "baseline", gap: 6, padding: "8px 14px", borderRadius: 999, background: "linear-gradient(135deg, #1baf7a, #2ECC8A)", color: "#fff" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: 900 }}>{fmtEuro(perMonth)}</span><span style={{ fontSize: "0.78rem", fontWeight: 800 }}>{t("pro Monat")}</span>
              </div>
            )}
          </div>
          <div className="lab-late" style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>{t("🛒 Ich sag dir {n} Tage vorher Bescheid.", { n: LOW_DAYS })}</div>
          <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 6 }}>
            <Btn variant="soft" onClick={() => setStep(2)} style={{ flex: 1 }}>{t("Ändern")}</Btn>
            <Btn onClick={() => onSave(stock, doseLabel(stock))} style={{ flex: 2 }}>{t("Speichern")}</Btn>
          </div>
        </div>
      )}
      {step > 0 && step < 3 && <button onClick={() => setStep(step - 1)} style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "var(--text-dim)", fontWeight: 700 }}>{t("← Zurück")}</button>}
    </Sheet>
  )
}

// ── Kauf-Link (bei Affiliate als Anzeige markiert) ─────────────────────────────

export function ShopButton({ x, label = t("🛒 Kaufen"), small }: { x: MySupp; label?: string; small?: boolean }) {
  if (!shopUrl(x)) return null
  return (
    <button className="lab-press" onClick={e => { e.stopPropagation(); openShop(x) }} style={{
      padding: small ? "7px 11px" : "10px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)",
      fontWeight: 800, fontSize: small ? "0.75rem" : "0.85rem", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
    }}>
      {label}{shopIsAd() && <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "var(--text-dim)" }}>{t("Anzeige")}</span>}
    </button>
  )
}

// ── Vorrat im Supplement-Blatt ─────────────────────────────────────────────────

export function StockCard({ s, x, onEdit, onRefill, onOrdered }: {
  s: LabState; x: MySupp; onEdit: () => void; onRefill: () => void; onOrdered: () => void
}) {
  const info = stockInfo(s, x)
  if (!x.stock || !info) {
    return (
      <button className="lab-press lab-card" onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, width: "100%", textAlign: "left", color: "var(--text)" }}>
        <Jar form={guessForm(x)} pct={0.35} color={suppColor(x)} size={46} animate={false} />
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontWeight: 900 }}>{t("📦 Vorrat eintragen")}</span>
          <span style={{ display: "block", fontSize: "0.78rem", color: "var(--text-dim)" }}>{t("Ich rechne aus, wie lange es reicht, und erinnere dich rechtzeitig.")}</span>
        </span>
        <span style={{ color: "var(--text-dim)" }}>›</span>
      </button>
    )
  }
  const alt = buyInfo(x).alt
  return (
    <div className="lab-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Jar form={x.stock.form} pct={info.pct} color={info.low ? "#eda100" : suppColor(x)} size={58} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 900, letterSpacing: ".08em", color: info.low ? "var(--warning)" : "var(--text-dim)" }}>{t("VORRAT")}</div>
          <div style={{ fontWeight: 900, fontSize: "1.05rem" }}>{info.empty ? t("Leer") : info.days === 1 ? t("Reicht noch 1 Tag") : t("Reicht noch {n} Tage", { n: info.days })}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            {fmtNum(info.left)} {FORMS[x.stock.form].packUnit} {t("übrig")} · {doseLabel(x.stock)}{info.until ? ` · ${t("bis {date}", { date: fmtDate(info.until) })}` : ""}{monthlyCost(x) != null ? ` · 💶 ${t("{amount}/Monat", { amount: fmtEuro(monthlyCost(x)!) })}` : ""}
          </div>
        </div>
        <button className="lab-press" onClick={onEdit} aria-label={t("Vorrat ändern")} style={{ border: "none", background: "var(--surface-2)", borderRadius: 12, padding: "8px 10px", color: "var(--text-dim)", fontWeight: 800 }}>✎</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {x.stock.ordered
          ? <Btn onClick={onRefill} style={{ flex: 1, padding: "10px 12px", fontSize: "0.85rem" }}>{t("📦 Neue Packung ist da")}</Btn>
          : <>
              <Btn variant="soft" onClick={onRefill} style={{ flex: 1, padding: "10px 12px", fontSize: "0.85rem" }}>{t("↻ Nachgekauft")}</Btn>
              {info.low && <Btn variant="soft" onClick={onOrdered} style={{ flex: 1, padding: "10px 12px", fontSize: "0.85rem" }}>{t("📦 Bestellt")}</Btn>}
            </>}
        <ShopButton x={x} label={t("🛒 Nachkaufen")} />
      </div>
      {info.low && alt && <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 10, lineHeight: 1.45 }}>{t("💡 Beim Nachkauf:")} {alt}</div>}
    </div>
  )
}

// ── Einkaufsliste auf „Heute“ ──────────────────────────────────────────────────

export function ShoppingCard({ s, away, low, onArrived, onOpen }: {
  s: LabState; away: MySupp[]; low: MySupp[]; onArrived: (id: string) => void; onOpen: (id: string) => void
}) {
  const [popped, setPopped] = useState<string | null>(null)
  if (!away.length && !low.length) return null
  const row = (x: MySupp, info: StockInfo | null) => (
    <div key={x.id} className={popped === x.id ? "lab-fade" : undefined} onClick={() => onOpen(x.id)} role="button" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", cursor: "pointer" }}>
      <span style={{ width: 38, height: 38, borderRadius: 13, background: suppColor(x), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0, opacity: x.away ? 0.55 : 1 }}>{x.emoji}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 800, fontSize: "0.92rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.name}</span>
        <span style={{ display: "block", fontSize: "0.72rem", color: info ? "var(--warning)" : "var(--text-dim)" }}>
          {info ? (info.empty ? t("leer") : info.days === 1 ? t("reicht noch 1 Tag") : t("reicht noch {n} Tage", { n: info.days })) : x.stock?.ordered ? t("bestellt") : t("noch nicht da")}
        </span>
      </span>
      {x.away
        ? <button className="lab-press" onClick={e => { e.stopPropagation(); setPopped(x.id); setTimeout(() => onArrived(x.id), 250) }} style={{
            padding: "8px 12px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 800, fontSize: "0.78rem", flexShrink: 0,
          }}>{t("✓ Ist da")}</button>
        : <ShopButton x={x} small />}
    </div>
  )
  return (
    <div className="lab-card lab-rise" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span className="lab-wiggle" style={{ fontSize: "1.2rem", display: "inline-block" }}>🛒</span>
        <span style={{ fontWeight: 900 }}>{t("Einkaufsliste")}</span>
        <span style={{ marginLeft: "auto", fontSize: "0.72rem", fontWeight: 800, color: "var(--text-dim)" }}>{away.length + low.length}</span>
      </div>
      {away.map(x => row(x, null))}
      {low.map(x => row(x, stockInfo(s, x)))}
    </div>
  )
}
