"use client"
// ── Heute: genau EINE fällige Hauptsache groß, darunter feste ruhige Bereiche (todayStack.tsx) ──
// Reihenfolge: Ergebnis aufdecken > Morgen-Frage > fällige Einnahme > Abend-Check-in > „Alles erledigt“ mit Kolbi.
import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  FACES, FACE_LABELS, STORE_MODE, addDays, dayRef, nightRef, checkinOpensMin, daySum, fmtCountdown, fromMin, intakeOn, streak, extrasOn, skippedOn,
  type LabState, type PhaseWindow, type Portion, type TakenAmount,
} from "@/lib/supplementLab"
import { sidesOf, type ExtraInput } from "@/lib/labDay"
import type { CoachAction, CoachMsg } from "@/lib/labCoach"
import { Btn, Capsule, DayKicker, DemoBadge, Sheet, TabHead, haptic } from "./ui"
import { Mascot, MASCOT_NAME } from "./mascot"
import { MorningPanel, type DayTab } from "./day"
import { dayProgress, type RoundStep } from "./round"
import { NewBadge, useMarkSeen } from "./newbadge"
import { RecapTeaser } from "./insights"
import { markSeen } from "@/lib/labNew"
import { CostSection, StackSection, StateSection } from "./todayStack"
import { t, dec, clock, LOCALE } from "@/lib/labI18n"
import { NewsRing, NewsTicker } from "./news"
import { recentNews, type LabNews } from "@/lib/labNews"


const fmt = (n: number) => dec(n, 1)

/** Sperrt den Check-in bis zur gewünschten Uhrzeit — Countdown, Freischalten nur per Long-Press. */
export function LockedCheckin({ unlockAt, now, onUnlock }: { unlockAt: string; now: Date; onUnlock: () => void }) {
  const HOLD_MS = 900
  const [pressing, setPressing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = () => { setPressing(true); timerRef.current = setTimeout(onUnlock, HOLD_MS) }
  const cancel = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null } setPressing(false) }
  const [h, m] = unlockAt.split(":").map(Number)
  const target = new Date(now); target.setHours(h, m, 0, 0)
  const remaining = Math.max(0, target.getTime() - now.getTime())
  const R = 30, C = 2 * Math.PI * R
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 20, background: "var(--surface-2)", textAlign: "left" }}>
      <button
        onPointerDown={e => { e.stopPropagation(); start() }} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} onClick={e => e.stopPropagation()}
        aria-label={t("Lange drücken zum vorzeitigen Freischalten")}
        style={{ width: 60, height: 60, borderRadius: "50%", border: "none", background: "none", position: "relative", cursor: "pointer", touchAction: "none", flexShrink: 0 }}
      >
        <svg width={60} height={60} viewBox="0 0 72 72" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={36} cy={36} r={R} fill="none" stroke="var(--border)" strokeWidth={5} />
          <circle cx={36} cy={36} r={R} fill="none" stroke="var(--accent)" strokeWidth={5} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={pressing ? 0 : C} style={{ transition: pressing ? `stroke-dashoffset ${HOLD_MS}ms linear` : "none" }} />
        </svg>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>{pressing ? "🔓" : "🔒"}</span>
      </button>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 900, fontSize: "0.9rem" }}>{t("Check-in ab {time}", { time: clock(unlockAt) })}</span>
        <span style={{ display: "block", fontSize: "0.74rem", color: "var(--text-dim)" }}>{t("noch")} <b style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCountdown(remaining)}</b> {t("· früher: Schloss lange drücken")}</span>
      </span>
    </div>
  )
}

/** Kolbis Sprechblase: ein Satz, ein Knopf – der Rest unter Ich → Kolbi & Hilfe. */
export function KolbiSays({ msg, more, onAction, onMore, tail = true }: { msg: CoachMsg; more: number; onAction: (a: CoachAction, id: string) => void; onMore: () => void; tail?: boolean }) {
  const [open, setOpen] = useState(false)
  const main = msg.actions?.find(a => a.primary) ?? msg.actions?.[0]
  const second = msg.actions?.find(a => a !== main)
  return (
    <div className="lab-rise" style={{ position: "relative", marginTop: 4 }}>
      {tail && <span aria-hidden style={{ position: "absolute", left: "50%", top: -7, width: 14, height: 14, marginLeft: -7, background: "var(--surface)", borderLeft: "1px solid var(--border)", borderTop: "1px solid var(--border)", transform: "rotate(45deg)" }} />}
      <div className="lab-card" style={{ padding: "14px 16px", textAlign: "left" }}>
        <div style={{ fontWeight: 900, fontSize: "0.98rem" }}>{msg.title}</div>
        <div onClick={() => setOpen(o => !o)} style={{
          fontSize: "0.86rem", lineHeight: 1.45, color: "var(--text-dim)", marginTop: 3, cursor: "pointer",
          ...(open ? {} : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }),
        }}>{msg.text}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {main && <Btn onClick={() => onAction(main.action, msg.id)} style={{ minHeight: 44, padding: "9px 14px", fontSize: "0.84rem", borderRadius: 12 }}>{main.label}</Btn>}
          {open && second && <Btn variant="soft" onClick={() => onAction(second.action, msg.id)} style={{ minHeight: 44, padding: "9px 12px", fontSize: "0.82rem", borderRadius: 12 }}>{second.label}</Btn>}
          <span style={{ flex: 1 }} />
          {!open && (msg.actions?.length ?? 0) > 1 && <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer", minWidth: 44, minHeight: 44, padding: "0 8px" }}>{t("Mehr")}</button>}
          {more > 0 && <button onClick={onMore} style={{ background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer", minWidth: 44, minHeight: 44, padding: "0 8px" }}>+{more} ›</button>}
        </div>
      </div>
    </div>
  )
}

function greeting(now: Date) {
  const h = now.getHours()
  return h < 5 ? t("Gute Nacht") : h < 11 ? t("Guten Morgen") : h < 17 ? t("Hallo") : h < 22 ? t("Guten Abend") : t("Gute Nacht")
}

type Main = "notStarted" | "reveal" | "morning" | "take" | "checkin" | "locked" | "done"

export function TodayView({ s, wins, today, now, pending, checkinLocked, tips, recap, onRecap, pushHint, onPush, onAction, onRound, onTakeAll, onTake, onSkip, onMorning, onUnlock, onCheckin, goTab, onVorrat, onExtra, onExtraRemove, onOpenSupp, onAddMany, onAmount, onPortion, onNews }: {
  s: LabState; wins: PhaseWindow[]; today: string; now: Date; pending: RoundStep[]; checkinLocked: boolean; tips: CoachMsg[]
  /** Wochenrückblick bereit und noch nicht gesehen → schmale Zeile unter der Hauptsache */
  recap: { ready: boolean; end: string }; onRecap: () => void
  /** Erinnerungen an, aber Push aus („off“: einschaltbar) bzw. blockiert („denied“) → dezenter Hinweis */
  pushHint: "off" | "denied" | null; onPush: () => void
  onAction: (a: CoachAction, id: string) => void
  onRound: (steps: RoundStep[]) => void; onTakeAll: (ids: string[]) => void; onTake: (id: string) => void; onSkip: (id: string, on: boolean, restore?: { at?: string; amt?: TakenAmount }) => void
  onMorning: (v: { sleep?: number; fit?: number }) => void; onUnlock: () => void; onCheckin: (d: string) => void
  onPhase: (w: PhaseWindow) => void; goTab: (t: string) => void; onVorrat: () => void
  onExtra: (date: string, item: ExtraInput, label: string) => void; onExtraRemove: (date: string, id: string) => void
  onOpenSupp: (id: string) => void; onOpenLab: (libId: string) => void; onAddMany: () => void
  onAmount: (id: string, p: Portion) => void; onPortion: (id: string, p: Portion) => void
  /** „Neu bei Kolbi“-Kreis antippen → Storys mit diesen (ungesehenen) Neuheiten */
  onNews?: (items: LabNews[], start?: number) => void
}) {
  const [mHold, setMHold] = useState(false)
  const first = wins[0]
  const notStarted = !!first && today < first.start
  const checked = s.checkins[today]
  const yesterday = addDays(today, -1)
  const sleepy = !!first && yesterday >= first.start && !s.checkins[yesterday] && !checked
  const fill = dayProgress(s, today)
  const st = streak(s)
  const reveal = pending.filter(p => p.kind === "reveal")
  const takes = pending.filter(p => p.kind === "take") as { kind: "take"; id: string }[]
  const checks = pending.filter(p => p.kind === "checkin" || p.kind === "sides")
  const morningDue = pending.some(p => p.kind === "morning")
  const lockedUntil = !checked && checkinLocked ? fromMin(checkinOpensMin(s)) : null

  const main: Main = notStarted ? "notStarted"
    : reveal.length ? "reveal"
    : morningDue || mHold ? "morning"
    : takes.length ? "take"
    : checks.length ? "checkin"
    : lockedUntil ? "locked" : "done"

  // Hüpfer, wenn sich Kolbi füllt
  useMarkSeen("morning-question", main === "morning" && !!s.morning?.[today])
  const prevFill = useRef<number | null>(null)
  const [hop, setHop] = useState(0)
  useEffect(() => { if (prevFill.current != null && fill > prevFill.current + 0.001) setHop(h => h + 1); prevFill.current = fill }, [fill])

  const hour = now.getHours()
  const evening = hour >= 20 || hour < 5
  const mood = main === "reveal" ? "party" : main === "notStarted" ? "happy" : main === "done" && fill >= 1 ? "party" : sleepy ? "sleepy" : evening && main !== "take" ? "sleepy" : "happy"
  const accessory = evening && fill >= 1 ? "nightcap" as const : st >= 7 ? "shades" as const : null

  const revealName = reveal[0] && reveal[0].kind === "reveal" ? s.supps.find(x => x.id === reveal[0].suppId)?.name : undefined
  const catchUp = checks.some(p => p.kind === "checkin" && p.date && p.date !== today)
  const startIn = notStarted ? new Date(first.start + "T00:00:00").getTime() - now.getTime() : null
  const tipsShown = main === "done" || main === "locked"
  const top = tips[0]
  const showRecap = recap.ready && !notStarted
  // Eine Hauptsache pro Bildschirm: Push-Hinweis + Rückblick reichen – dann kein Kolbi-Tipp (Kacheln bleiben sichtbar)
  const showTip = tipsShown && !!top && !(pushHint && showRecap)
  // „Ich melde mich …“ stimmt bei geschlossener App nur mit Push → genau dort dezent darauf hinweisen
  const pushRow = tipsShown && pushHint ? (
    <div style={{ marginTop: 16, width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 12px", borderRadius: 16, background: "var(--surface-2)", textAlign: "left" }}>
      {pushHint === "off" && <span aria-hidden style={{ fontSize: "1.1rem" }}>🔔</span>}
      <span style={{ flex: 1, minWidth: 0, fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.35, color: "var(--text-dim)", padding: pushHint === "denied" ? "6px 4px 6px 0" : undefined }}>
        {pushHint === "denied" ? t("⚠️ Benachrichtigungen sind blockiert (Einstellungen → Mitteilungen)") : t("Erinnerungen, auch wenn die App zu ist")}
      </span>
      {pushHint === "off" && <Btn onClick={onPush} style={{ minHeight: 44, padding: "8px 16px", fontSize: "0.84rem", borderRadius: 12 }}>{t("An")}</Btn>}
    </div>
  ) : null

  const bigBtn: React.CSSProperties = {
    marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 30px", borderRadius: 999, border: "none",
    background: "var(--lab-grad)", color: "#fff", fontWeight: 900, fontSize: "1.05rem",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.45), inset 0 -2px 0 rgba(0,0,0,.12), 0 12px 28px rgba(46,204,138,.35)",
  }
  // Kolbi-Ticker im großen Feld, wenn gerade nichts zu tun ist – Feld wird dafür kompakter
  const ticker = !!onNews && !s.demo && recentNews(today).length > 0 && (main === "done" || main === "locked" || main === "notStarted") ? <NewsTicker s={s} today={today} onOpen={onNews} /> : null
  const title = (x: React.ReactNode) => <div style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-.01em", lineHeight: 1.15 }}>{x}</div>
  const sub = (x: React.ReactNode) => <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.4 }}>{x}</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <TabHead kicker={`${now.toLocaleDateString(LOCALE, { weekday: "long" })} · ${t("nur für dich")}`} title={greeting(now)}
        right={<>
          {s.demo && <DemoBadge />}
          {onNews && <NewsRing s={s} today={today} onOpen={onNews} />}
          {!STORE_MODE && <Link href="/home" aria-label={t("Zurück zu TRUE")} style={{ color: "var(--text-dim)", textDecoration: "none", fontSize: "0.8rem", fontWeight: 800 }}>TRUE</Link>}
        </>} />

      {/* ── Die eine Hauptsache ── */}
      <div className="lab-rise" style={{
        position: "relative", overflow: "hidden", isolation: "isolate", borderRadius: 30, padding: "22px 18px 24px", textAlign: "center",
        minHeight: (tipsShown && top) || ticker ? undefined : "min(44vh, 380px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "var(--surface)", border: "1px solid var(--glass-line)",
      }}>
        {/* Marken-Licht: Selbsttest-Fläche */}
        <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: -1, opacity: sleepy ? 0.18 : 0.3 }}>
          <span className="lab-blob" style={{ width: "70%", height: "60%", left: "-15%", top: "-15%", background: "#2ECC8A" }} />
          <span className="lab-blob" style={{ width: "65%", height: "60%", right: "-18%", bottom: "-10%", background: "#3987e5", animationDelay: "-6s", animationDuration: "17s" }} />
        </div>
        <div className={hop ? "lab-hop" : "lab-float"} key={`k${hop}`} role="button" tabIndex={0} aria-label={t("{name}: Tipps, Profil und Hilfe", { name: MASCOT_NAME })}
          onClick={() => goTab("kolbi")} onKeyDown={e => { if (e.key === "Enter") goTab("kolbi") }} onAnimationEnd={e => { if (e.animationName === "labHop") setHop(0) }}
          style={{ cursor: "pointer", marginBottom: 10 }}>
          <Mascot mood={mood} size={main === "morning" ? 96 : 120} fill={0.12 + fill * 0.88} glow={st >= 3} murky={sleepy} alive accessory={accessory} />
        </div>

        {main === "notStarted" && <>
          {title(t("Bald geht's los"))}
          {sub(t("Start in {time} – bis dahin alles wie gewohnt.", { time: startIn != null ? fmtCountdown(startIn) : t("Kürze") }))}
          {ticker}
        </>}

        {main === "reveal" && <>
          {title(t("Dein Ergebnis ist da"))}
          {sub(revealName ? t("{name}: Test geschafft. Was sagen deine Daten?", { name: revealName }) : t("Test geschafft. Was sagen deine Daten?"))}
          <button onClick={() => { haptic(); onRound(reveal) }} className="lab-press lab-drop" style={bigBtn}>▶ {t("Ergebnis aufdecken")}</button>
        </>}

        {main === "morning" && <>
          <DayKicker>{nightRef(today)}</DayKicker>
          {title(<>{t("🌙 Wie hast du geschlafen?")} <NewBadge id="morning-question" /></>)}
          {sub(t("1 Tipp genügt."))}
          <div style={{ marginTop: 16, width: "100%" }}>
            <MorningPanel entry={s.morning?.[today]} size={52} onSave={v => { setMHold(true); onMorning(v) }} onDone={() => setMHold(false)} />
          </div>
        </>}

        {main === "take" && <>
          {title(takes.length === 1 ? t("Jetzt dran: {name}", { name: s.supps.find(x => x.id === takes[0].id)?.name ?? "" }) : t("{n} Einnahmen jetzt dran", { n: takes.length }))}
          {takes.length > 1 && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 12 }}>
              {takes.slice(0, 5).map(p => <Capsule key={p.id} supp={s.supps.find(x => x.id === p.id)} size="sm" />)}
              {takes.length > 5 && <span style={{ alignSelf: "center", fontWeight: 800, color: "var(--text-dim)" }}>+{takes.length - 5}</span>}
            </div>
          )}
          <button onClick={() => { haptic(12); onTakeAll(takes.map(p => p.id)) }} className="lab-press lab-drop" style={bigBtn}>✓ {t("Genommen")}</button>
          {takes.length > 1 && <button onClick={() => onRound(takes)} style={{ marginTop: 12, background: "none", border: "none", color: "var(--text-dim)", fontWeight: 800, fontSize: "0.86rem", cursor: "pointer" }}>{t("Einzeln abhaken ›")}</button>}
        </>}

        {main === "checkin" && <>
          <DayKicker>{dayRef(catchUp ? yesterday : today, today)}</DayKicker>
          {title(catchUp ? t("Gestern fehlt noch") : t("Wie war dein Tag?"))}
          {sub(catchUp ? t("1 Minute nachtragen – sonst fehlt der Tag im Vergleich.") : t("1 Minute. Ich vergleiche mit deinem Normal."))}
          <button onClick={() => { haptic(); onRound(checks) }} className="lab-press lab-drop" style={bigBtn}>▶ {catchUp ? t("Nachtragen") : t("Check-in starten")}</button>
        </>}

        {main === "locked" && lockedUntil && <>
          {title(t("Bis zum Check-in hast du frei"))}
          {sub(t("Ich melde mich am Abend für deine Minute."))}
          <div style={{ marginTop: 16, width: "100%" }}><LockedCheckin unlockAt={lockedUntil} now={now} onUnlock={onUnlock} /></div>
          {ticker}
          {pushRow}
        </>}

        {main === "done" && <>
          {title(fill >= 1 ? t("Heute alles erledigt") : t("Gerade nichts zu tun"))}
          {sub(fill >= 1 ? (st > 1 ? t("{n} Tage am Stück. Stark!", { n: st }) : t("Bis morgen!")) : t("Ich melde mich, wenn wieder etwas dran ist."))}
          {checked && (
            <button onClick={() => onCheckin(today)} className="lab-press" style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "8px 16px", borderRadius: 999, border: "none", background: "var(--surface-2)", color: "var(--text)", fontWeight: 800, fontSize: "0.82rem" }}>
              {checked.quick && checked.face
                ? <>{FACES[checked.face - 1]} {t("Heute: {label}", { label: FACE_LABELS[checked.face - 1] })}</>
                : <>{FACES[Math.round(daySum(checked)) - 1]} {t("Heute")} {fmt(daySum(checked))}★</>} · <span style={{ color: "var(--accent)" }}>{checked.quick ? t("genauer") : t("ändern")}</span>
            </button>
          )}
          {ticker}
          {pushRow}
        </>}
      </div>

      {!notStarted && <RefineRow s={s} today={today} hideToday={main === "done"} onCheckin={onCheckin} />}
      {showRecap && <RecapTeaser slim end={recap.end} onOpen={onRecap} />}
      {showTip && <KolbiSays msg={top} more={tips.length - 1} onAction={onAction} onMore={() => goTab("kolbi")} tail={!showRecap} />}

      {/* ── Feste Bereiche: Stack · Kosten & Coach · Zustand · Weg · Community ── */}
      <div id="lab-today-stack" style={{ scrollMarginTop: 16 }}><StackSection s={s} today={today} onTake={onTake} onSkip={onSkip} onExtra={onExtra} onExtraRemove={onExtraRemove} onOpenSupp={onOpenSupp} onVorrat={onVorrat} onAddMany={onAddMany} goTab={goTab} onAmount={onAmount} onPortion={onPortion} /></div>
      <CostSection s={s} today={today} onVorrat={onVorrat} onAction={onAction} />
      <StateSection s={s} today={today} onOpen={() => goTab("reise")} />

    </div>
  )
}

/**
 * „genauer“ jederzeit: Schnellantwort von heute (wenn die Hauptkarte etwas anderes zeigt) bzw. von gestern
 * (Nachtrag-Zeitraum, solange heute noch kein Check-in da ist) mit 1 Tipp in Sterne je Bereich öffnen.
 */
function RefineRow({ s, today, hideToday, onCheckin }: { s: LabState; today: string; hideToday: boolean; onCheckin: (d: string) => void }) {
  const y = addDays(today, -1)
  const c = s.checkins[today]
  const date = c ? (c.quick && !hideToday ? today : null) : s.checkins[y]?.quick ? y : null
  if (!date) return null
  const q = s.checkins[date]
  const face = q.face ?? Math.round(daySum(q))
  return (
    <button className="lab-press" onClick={() => { haptic(); onCheckin(date) }} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 48, padding: "8px 14px", borderRadius: 16,
      border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", textAlign: "left",
    }}>
      <span aria-hidden style={{ fontSize: "1.25rem" }}>{FACES[face - 1]}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: "0.84rem", fontWeight: 800 }}>
        {date === today ? t("Heute: {label}", { label: FACE_LABELS[face - 1] }) : t("Gestern: {label}", { label: FACE_LABELS[face - 1] })}
        <span style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)" }}>{q.est ? t("Sterne von Kolbi vorgeschlagen") : t("Sterne je Bereich nachtragen")}</span>
      </span>
      <span style={{ color: "var(--accent-ink)", fontWeight: 900, fontSize: "0.84rem", whiteSpace: "nowrap" }}>{t("genauer")} ›</span>
    </button>
  )
}

// ── ＋ Schnell eintragen ───────────────────────────────────────────────────────

export function QuickSheet({ s, today, now, checkinLocked, onClose, onTake, onDay, onCheckin, onRound, onUnlock }: {
  s: LabState; today: string; now: Date; checkinLocked: boolean; onClose: () => void
  onTake: (id: string) => void; onDay: (tab: DayTab) => void; onCheckin: () => void; onRound: () => void; onUnlock: () => void
}) {
  const [view, setView] = useState<"menu" | "take">("menu")
  const intake = intakeOn(s, today)
  const took = s.took[today] ?? []
  const skip = skippedOn(s, today)
  const open = intake.filter(id => !skip.includes(id)) // „Heute nicht“ zählt nicht mit
  const checked = s.checkins[today]
  const nx = extrasOn(s, today).length
  const ns = Object.keys(sidesOf(s, today).sides).length
  const locked = !checked && checkinLocked
  const tile = (emoji: string, label: string, subText: string, onClick: () => void, badge?: React.ReactNode) => (
    <button onClick={() => { haptic(); onClick() }} className="lab-press lab-card" style={{
      position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "16px 14px", minHeight: 112, textAlign: "left", color: "var(--text)", borderRadius: 22,
    }}>
      <span style={{ fontSize: "1.7rem", lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontWeight: 900, fontSize: "1rem", marginTop: 6 }}>{label}</span>
      <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text-dim)", lineHeight: 1.3 }}>{subText}</span>
      {badge}
    </button>
  )
  const count = (k: number) => k > 0 ? <span style={{ position: "absolute", top: 12, right: 12, minWidth: 22, height: 22, padding: "0 6px", borderRadius: 999, background: "var(--surface-2)", fontSize: "0.74rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{k}</span> : null
  return (
    <Sheet open onClose={onClose} title={view === "take" ? t("✓ Genommen") : t("Schnell eintragen")}>
      {view === "menu" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {tile("✓", t("Genommen"), open.length ? t("{n} von {total} heute", { n: took.filter(id => open.includes(id)).length, total: open.length }) : intake.length ? t("heute ausgelassen") : t("Heute nichts geplant"), () => { markSeen("taken-check"); setView("take") }, <NewBadge id="taken-check" style={{ position: "absolute", top: 14, right: 12 }} />)}
            {tile("➕", t("Zusätzlich"), t("außerhalb deines Plans"), () => { markSeen("extra-taken"); onClose(); onDay("take") }, <>{count(nx)}<NewBadge id="extra-taken" style={{ position: "absolute", top: 14, right: nx ? 40 : 12 }} /></>)}
            {tile("🤕", t("Beschwerde"), t("tagsüber notieren"), () => { markSeen("complaints"); onClose(); onDay("sides") }, <>{count(ns)}<NewBadge id="complaints" style={{ position: "absolute", top: 14, right: ns ? 40 : 12 }} /></>)}
            {tile("📝", t("Check-in"), checked ? t("Heute {v}★ · ändern", { v: fmt(daySum(checked)) }) : locked ? t("ab {time}", { time: clock(fromMin(checkinOpensMin(s))) }) : t("1 Minute"),
              () => { if (checked) { onClose(); onCheckin() } else if (!locked) { onClose(); onRound() } })}
          </div>
          {locked && <LockedCheckin unlockAt={fromMin(checkinOpensMin(s))} now={now} onUnlock={() => { onClose(); onUnlock() }} />}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {intake.length === 0 && <div style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>{t("Heute ist nichts geplant. Für Spontanes: „Zusätzlich“.")}</div>}
          {intake.map(id => {
            const x = s.supps.find(q => q.id === id)
            const on = took.includes(id)
            const off = !on && skip.includes(id)
            return (
              <button key={id} onClick={() => { haptic(10); onTake(id) }} className="lab-press" aria-pressed={on} style={{
                opacity: off ? 0.6 : 1,
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, textAlign: "left", color: "var(--text)",
                border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)",
              }}>
                <span style={{ fontSize: "1.3rem" }}>{x?.emoji ?? "💊"}</span>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x?.name}</span>
                {off && <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{t("heute ausgelassen")}</span>}
                <span style={{ width: 28, height: 28, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, background: on ? "var(--accent)" : "var(--surface-2)", color: on ? "#fff" : "var(--text-dim)" }}>{on ? "✓" : ""}</span>
              </button>
            )
          })}
          <Btn full onClick={() => setView("menu")} variant="soft" style={{ marginTop: 6 }}>{t("Fertig")}</Btn>
        </div>
      )}
    </Sheet>
  )
}
