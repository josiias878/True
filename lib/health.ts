// ── Objektive Gesundheitsdaten (optional) ───────────────────────────────────────
// Ergänzt die gefühlte Tagesbewertung um zwei Messwerte aus Apple Health / Google
// Health Connect: Schlafdauer und Herzratenvariabilität (HRV). Bewusst nur diese
// zwei — kein Training, keine Schritte. Nur in der Store-App verfügbar (native
// Capacitor-Plugin); im Web (TRUE /lab) bleibt s.health immer leer, alles bleibt
// optional und lokal auf dem Gerät.

import { type HealthDay, type LabState } from "./supplementLab"

export function mergeHealthDay(s: LabState, date: string, day: Partial<HealthDay>) {
  const cur = s.health[date] ?? {}
  s.health[date] = { ...cur, ...day }
}

function avgOf(s: LabState, key: keyof HealthDay, start: string, end: string): number | null {
  const vals: number[] = []
  for (const [date, d] of Object.entries(s.health)) {
    if (date < start || date > end) continue
    const v = d[key]
    if (v != null) vals.push(v)
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export function avgSleep(s: LabState, start: string, end: string) { return avgOf(s, "sleepHours", start, end) }
export function avgHrv(s: LabState, start: string, end: string) { return avgOf(s, "hrvMs", start, end) }

export function hasHealthData(s: LabState) { return Object.keys(s.health).length > 0 }

export interface HealthCompare { baseSleep: number | null; testSleep: number | null; baseHrv: number | null; testHrv: number | null }

/** Vergleich Reset- vs. Test-Fenster. Null, wenn gar keine Health-Daten vorliegen. */
export function healthCompare(s: LabState, base: { start: string; end: string } | undefined, test: { start: string; end: string }): HealthCompare | null {
  if (!hasHealthData(s)) return null
  return {
    baseSleep: base ? avgSleep(s, base.start, base.end) : null,
    testSleep: avgSleep(s, test.start, test.end),
    baseHrv: base ? avgHrv(s, base.start, base.end) : null,
    testHrv: avgHrv(s, test.start, test.end),
  }
}

// ── Native Anbindung (Store-App via Capacitor); im Web ein No-op ───────────────

export interface HealthProvider {
  available(): Promise<boolean>
  requestPermission(): Promise<boolean>
  fetchSleep(startIso: string, endIso: string): Promise<{ date: string; hours: number }[]>
  fetchHrv(startIso: string, endIso: string): Promise<{ date: string; ms: number }[]>
}

let provider: HealthProvider | null = null
export function setHealthProvider(p: HealthProvider | null) { provider = p }
export function hasHealthProvider() { return provider != null }
export async function healthAvailable() { return provider ? provider.available() : false }
export async function requestHealthPermission() { return provider ? provider.requestPermission() : false }

/** Holt Schlaf + HRV seit `sinceDate` (Standard: Experiment-Start) und gibt sie tagesweise zusammengeführt zurück. */
export async function fetchHealthSince(sinceDate: string, todayIso: string): Promise<Record<string, HealthDay>> {
  if (!provider) return {}
  const startIso = `${sinceDate}T00:00:00.000Z`
  const endIso = `${todayIso}T23:59:59.000Z`
  const out: Record<string, HealthDay> = {}
  try {
    const [sleep, hrv] = await Promise.all([provider.fetchSleep(startIso, endIso), provider.fetchHrv(startIso, endIso)])
    for (const d of sleep) out[d.date] = { ...out[d.date], sleepHours: d.hours }
    for (const d of hrv) out[d.date] = { ...out[d.date], hrvMs: d.ms }
  } catch { /* Health-Daten sind immer nur ein Extra, nie Voraussetzung */ }
  return out
}
