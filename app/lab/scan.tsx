"use client"
// ── Supplement per Barcode hinzufügen ─────────────────────────────────────────
// Kamera → Zahlencode (BarcodeDetector, sonst @zxing lazy geladen) → lab-barcode → Auswahl vorbefüllt → du bestätigst.
// Das Kamerabild bleibt auf dem Gerät; gesendet wird nur der Code (und auf Wunsch die anonyme Zuordnung).
import React, { useEffect, useMemo, useRef, useState } from "react"
import type { LibSupp } from "@/lib/supplementLab"
import {
  BARCODE_LIBRARY, buildCandidates, lookupBarcode, normalizeBarcode, offProductUrl, productName, submitBarcode, usesOff,
  type BarcodeCand, type LookupResult,
} from "@/lib/labBarcode"
import { Btn, Label, Sheet, SuppIcon } from "./ui"
import { t, LANG } from "@/lib/labI18n"

type Phase = "scan" | "manual" | "loading" | "result"
export interface ScanItem { lib: LibSupp | null; name: string; dose: string }

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type DetectorCtor = { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> }

/** Kamera-Scan: liefert genau einen gültigen Code (EAN-13/EAN-8/UPC) an onCode. */
function useScanner(active: boolean, video: React.RefObject<HTMLVideoElement | null>, onCode: (c: string) => void, onFail: () => void) {
  const cb = useRef({ onCode, onFail })
  cb.current = { onCode, onFail }
  useEffect(() => {
    if (!active) return
    let stop = false, timer = 0, done = false
    let stream: MediaStream | null = null
    let zx: { stop: () => void } | null = null
    const accept = (raw: string) => {
      const c = normalizeBarcode(raw)
      if (!c || done || stop) return false
      done = true
      try { navigator.vibrate?.(30) } catch {}
      cb.current.onCode(c)
      return true
    }
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("nocam")
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } })
        const v = video.current
        if (stop || !v) { stream.getTracks().forEach(x => x.stop()); return }
        v.srcObject = stream
        await v.play().catch(() => {})
        const BD = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
        let formats: string[] = []
        if (BD) { try { formats = (await BD.getSupportedFormats?.()) ?? [] } catch {} }
        if (BD && formats.includes("ean_13")) {
          const det = new BD({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"].filter(f => formats.includes(f)) })
          const tick = async () => {
            if (stop || done) return
            try { if (v.readyState >= 2) for (const r of await det.detect(v)) if (accept(r.rawValue)) return } catch {}
            timer = window.setTimeout(tick, 160)
          }
          tick()
        } else {
          // Fallback (z. B. iOS-WebView): zxing erst jetzt laden – hält das Haupt-Bundle klein
          const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")])
          if (stop) return
          const hints = new Map()
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E])
          const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
          const ctl = await reader.decodeFromVideoElement(v, res => { if (res) accept(res.getText()) })
          if (stop || done) ctl.stop(); else zx = ctl
        }
      } catch { if (!stop) cb.current.onFail() }
    })()
    return () => {
      stop = true
      window.clearTimeout(timer)
      try { zx?.stop() } catch {}
      stream?.getTracks().forEach(x => x.stop())
      if (video.current) video.current.srcObject = null
    }
  }, [active, video])
}

const SOURCE_LABEL: Record<BarcodeCand["source"], string> = {
  map: t("✓ geprüfte Zuordnung"),
  crowd: t("👥 von anderen Nutzern zugeordnet"),
  name: t("laut Produktname"),
  ingredients: t("laut Zutaten"),
}

export function ScanSheet({ owned, onClose, onAdd }: {
  /** Bibliotheks-IDs, die schon in der Liste sind */
  owned: Set<string>
  onClose: () => void
  onAdd: (items: ScanItem[]) => void
}) {
  const [phase, setPhase] = useState<Phase>("scan")
  const [camErr, setCamErr] = useState(false)
  const [typed, setTyped] = useState("")
  const [code, setCode] = useState("")
  const [res, setRes] = useState<LookupResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [doses, setDoses] = useState<Record<string, string>>({})
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState("")
  const [share, setShare] = useState(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const lookup = async (c: string) => {
    setCode(c); setPhase("loading"); setFailed(false); setPicking(false); setQ("")
    const r = await lookupBarcode(c, LANG)
    setRes(r); setFailed(!r)
    const { cands, preselect } = buildCandidates(r)
    setSel(preselect.filter(id => !owned.has(id)))
    setDoses(Object.fromEntries(cands.map(x => [x.lib.id, x.dose])))
    if (!cands.length) setPicking(true)
    setPhase("result")
  }
  useScanner(phase === "scan", videoRef, c => { void lookup(c) }, () => { setCamErr(true); setPhase("manual") })

  const built = useMemo(() => buildCandidates(res), [res])
  const name = productName(res)
  const confirmedOnly = built.cands.length > 0 && sel.every(id => built.cands.find(c => c.lib.id === id)?.source === "map")
  const ql = q.trim().toLowerCase()
  const listed = BARCODE_LIBRARY.filter(l => !built.cands.some(c => c.lib.id === l.id) && (!ql || l.name.toLowerCase().includes(ql) || l.aliases.some(a => a.includes(ql))))

  const toggle = (id: string) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : p.length >= 3 ? p : [...p, id])
  const confirm = () => {
    const libs = sel.map(id => BARCODE_LIBRARY.find(l => l.id === id)).filter((l): l is LibSupp => !!l)
    if (!libs.length) return
    onAdd(libs.map(l => ({ lib: l, name: l.name, dose: (doses[l.id] ?? "").trim().slice(0, 40) })))
    if (share && !confirmedOnly) void submitBarcode(code, libs.map(l => l.id))
    onClose()
  }
  const submitManual = () => {
    const c = normalizeBarcode(typed)
    if (c) void lookup(c)
  }
  const typedOk = !!normalizeBarcode(typed)

  const row = (lib: LibSupp, sub?: React.ReactNode) => {
    const on = sel.includes(lib.id), have = owned.has(lib.id)
    return (
      <div key={lib.id}>
        <button className="lab-press" disabled={have} onClick={() => toggle(lib.id)} aria-pressed={on} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, textAlign: "left",
          border: on ? "2px solid var(--accent)" : "1px solid var(--border)", background: on ? "var(--accent-dim)" : "var(--surface)",
          color: "var(--text)", opacity: have ? 0.5 : 1,
        }}>
          <span style={{ width: 26, display: "inline-flex", justifyContent: "center" }}><SuppIcon lib={lib.id} emoji={lib.emoji} size={24} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 800, fontSize: "0.9rem" }}>{lib.name}</span>
            {(sub || have) && <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600 }}>{have ? t("schon in deiner Liste") : sub}</span>}
          </span>
          <span style={{ fontWeight: 900, color: on ? "var(--accent)" : "var(--text-dim)" }}>{on ? "✓" : "+"}</span>
        </button>
        {on && (
          <input value={doses[lib.id] ?? ""} onChange={e => setDoses(d => ({ ...d, [lib.id]: e.target.value }))} maxLength={40}
            placeholder={t("Menge pro Portion (optional), z. B. 400 mg")} aria-label={t("Menge pro Portion")}
            style={{ width: "100%", marginTop: 6, padding: "9px 12px", borderRadius: 12, fontSize: "0.85rem" }} />
        )}
      </div>
    )
  }

  return (
    <Sheet open portal z={520} onClose={onClose} title={t("📷 Scannen")}>
      {phase === "scan" && (
        <div className="lab-rise">
          <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: "#000", aspectRatio: "4 / 3" }}>
            <video ref={videoRef} playsInline muted autoPlay style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div aria-hidden style={{ position: "absolute", left: "12%", right: "12%", top: "36%", bottom: "36%", border: "3px solid rgba(255,255,255,.85)", borderRadius: 14, boxShadow: "0 0 0 999px rgba(0,0,0,.25)" }} />
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.45, margin: "10px 2px 12px" }}>
            {t("Halte den Strichcode der Packung in den Rahmen. Das Kamerabild bleibt auf deinem Gerät – nur die Zahl wird nachgeschlagen.")}
          </div>
          <Btn variant="ghost" full onClick={() => setPhase("manual")}>{t("⌨️ Code eintippen")}</Btn>
        </div>
      )}

      {phase === "manual" && (
        <div className="lab-rise">
          {camErr && <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.45, marginBottom: 10 }}>{t("Kamera nicht verfügbar oder nicht erlaubt. Tipp die Zahl unter dem Strichcode einfach ab.")}</div>}
          <input value={typed} onChange={e => setTyped(e.target.value.replace(/[^\d\s-]/g, ""))} inputMode="numeric" autoFocus maxLength={18}
            onKeyDown={e => { if (e.key === "Enter") submitManual() }}
            placeholder={t("z. B. 4058172309250")} aria-label={t("Strichcode-Nummer")}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 14, fontSize: "1.05rem", letterSpacing: 1, marginBottom: 6 }} />
          {typed.replace(/\D/g, "").length >= 8 && !typedOk && <div style={{ fontSize: "0.75rem", color: "var(--warning)", marginBottom: 6 }}>{t("Die Nummer scheint nicht zu stimmen – bitte noch mal prüfen.")}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {!camErr && <Btn variant="ghost" onClick={() => setPhase("scan")}>{t("📷 Kamera")}</Btn>}
            <Btn full disabled={!typedOk} onClick={submitManual}>{t("Nachschlagen")}</Btn>
          </div>
        </div>
      )}

      {phase === "loading" && (
        <div className="lab-fade" style={{ textAlign: "center", padding: "36px 0", color: "var(--text-dim)", fontWeight: 700 }}>{t("Suche {code} …", { code })}</div>
      )}

      {phase === "result" && (
        <div className="lab-rise">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 900, fontSize: "1.02rem", lineHeight: 1.3 }}>{name || t("Unbekanntes Produkt")}</div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", fontWeight: 600 }}>{[res?.off?.brand, `EAN ${code}`].filter(Boolean).join(" · ")}</div>
          </div>

          {failed || res?.offError && !built.cands.length ? (
            <div style={{ fontSize: "0.84rem", lineHeight: 1.45, padding: "10px 12px", borderRadius: 14, background: "var(--surface-2)", marginBottom: 12 }}>
              {t("Gerade keine Verbindung zur Produktsuche – wähle einfach aus der Liste.")}
            </div>
          ) : !built.cands.length ? (
            <div style={{ fontSize: "0.84rem", lineHeight: 1.45, padding: "10px 12px", borderRadius: 14, background: "var(--surface-2)", marginBottom: 12 }}>
              {t("Nicht gefunden – wähle aus der Liste. Deine Auswahl hilft beim nächsten Scan.")}
            </div>
          ) : (
            <>
              <Label style={{ marginBottom: 8 }}>{built.cands.length > 1 ? t("Was ist drin? Wähle aus") : t("Erkannt")}</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {built.cands.map(c => row(c.lib, SOURCE_LABEL[c.source]))}
              </div>
              {built.cands.some(c => c.source === "crowd") && (
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.4, marginBottom: 10 }}>{t("Von anderen Nutzern zugeordnet heißt: noch nicht bestätigt – bitte kurz mit der Packung vergleichen.")}</div>
              )}
            </>
          )}

          {picking ? (
            <div style={{ marginBottom: 12 }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("🔍 Suchen … (z. B. Magnesium, BPC)")}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 14, fontSize: "0.92rem", marginBottom: 8 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                {listed.slice(0, ql ? 30 : 60).map(l => row(l))}
              </div>
            </div>
          ) : (
            <button className="lab-press" onClick={() => setPicking(true)} style={{ border: "none", background: "none", color: "var(--accent)", fontWeight: 800, fontSize: "0.84rem", padding: "4px 0", marginBottom: 10 }}>
              {t("Nicht dabei? Aus der Liste wählen")}
            </button>
          )}

          {sel.length > 0 && !confirmedOnly && (
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.4, marginBottom: 10 }}>
              <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} style={{ marginTop: 2 }} />
              <span>{t("Zuordnung anonym teilen (nur Strichcode + Supplement), damit der Scan für andere klappt.")}</span>
            </label>
          )}

          <Btn full disabled={!sel.length} onClick={confirm}>{sel.length > 1 ? t("✓ {n} übernehmen", { n: sel.length }) : t("✓ Übernehmen")}</Btn>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" full onClick={() => { setRes(null); setTyped(""); setPhase(camErr ? "manual" : "scan") }}>{t("Neu scannen")}</Btn>
            {name && !sel.length && <Btn variant="soft" full onClick={() => { onAdd([{ lib: null, name: name.slice(0, 60), dose: "" }]); onClose() }}>{t("Als eigenes")}</Btn>}
          </div>

          <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: 1.45, marginTop: 12 }}>
            {t("Bitte Angaben mit der Packung vergleichen.")}
            {usesOff(res) && <> {t("Daten teilweise von")} <a href={offProductUrl(code)} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>Open Food Facts</a> (ODbL).</>}
          </div>
        </div>
      )}
    </Sheet>
  )
}
