// Supplement Lab · Barcode → Bibliothek (anonym; das Kamerabild verlässt nie das Gerät, nur der Zahlencode)
// POST {action:"lookup", device, code, lang?}  → { code, map:[{lib,name?,amount?,unit?}], crowd:[{lib,n}], off|null, offError? }
// POST {action:"submit", device, code, libs:[…]} → anonyme Zuordnung (ersetzt eigene frühere Meldung zu diesem Code)
// Reihenfolge: barcode_map (nur vom Betreiber gepflegt, source 'manual') › barcode_votes (Vorschläge, nur bei
// klarer Mehrheit: ≥ 3 Stimmen und > 50 % der Geräte für diesen Code) › Open Food Facts (gecacht in barcode_off).
// Crowd-Meldungen werden NIE automatisch zu bestätigten Zuordnungen (gefälschte Geräte-IDs wären billig).
// Abgleich OFF → Bibliothek passiert in der App (lib/labBarcode.ts, Aliase aus lib/supplementLab.ts). Keine Peptide/Rx.
// Gespeichert wird je Meldung nur SHA-256(Code + Barcode-Geräte-ID) – nicht über Codes verknüpfbar. Bremse je
// Gerät und je IP: die IP nur als SHA-256 mit Tagessalz (nicht im Klartext, Zähler nach ≤ 2 Tagen gelöscht).
// Kein Freitext außer dem OFF-Produktnamen (gekürzt, Werbe-/Heilaussagen → Name verworfen).
import { createClient } from "npm:@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })

const DEVICE = /^[a-f0-9]{32,64}$/, CODE = /^(\d{8}|\d{13})$/
const CROWD_MIN = 3
/** Höchstens so viele Geräte pro Code (gegen Fluten einzelner Codes) */
const VOTERS_PER_CODE = 40
const OFF_UA = "Kolbi/1.0"
const OFF_FIELDS = [
  "product_name", "product_name_de", "product_name_en", "generic_name", "generic_name_de", "generic_name_en", "brands",
  "ingredients_text", "ingredients_text_de", "ingredients_text_en", "categories_tags", "quantity", "serving_size", "nutriments",
].join(",")
const NUTRIENTS = ["vitamin-d", "vitamin-b12", "vitamin-c", "magnesium", "zinc", "iron", "calcium", "selenium", "iodine",
  "vitamin-b9", "folates", "biotin", "copper", "caffeine", "omega-3-fat", "taurine"]
const DAY = 86_400_000
const CACHE_FOUND = 30 * DAY, CACHE_MISSING = 2 * DAY

// Bibliotheks-IDs, die ein Barcode treffen darf: alle außer Peptiden und verschreibungspflichtigen Mitteln.
// Muss zu lib/labBarcode.ts → BARCODE_LIBRARY passen (geprüft in supplement-lab/tools/test-barcode.mjs).
const ALLOWED = new Set([
  "magnesium", "glycin", "melatonin", "theanin", "koffein", "rhodiola", "ashwagandha", "vitd", "omega3", "zink", "eisen",
  "b12", "bkomplex", "vitc", "probiotika", "kreatin", "citrullin", "betaalanin", "elektrolyte", "kollagen", "q10",
  "lionsmane", "curcumin", "calcium", "gaba", "apigenin", "baldrian", "lavendel", "taurin", "inositol", "tyrosin",
  "citicolin", "alphagpc", "bacopa", "ginkgo", "cordyceps", "alcar", "nac", "nmn", "safran", "reishi", "tongkat", "maca",
  "shilajit", "kupfer", "multivitamin", "selen", "jod", "folat", "biotin", "whey", "eaa", "hmb", "glutamin", "betain",
  "flohsamen", "berberin", "quercetin", "ingwer", "astaxanthin", "hyaluron",
])

/** Prüfziffer EAN-8/EAN-13 */
function gtinOk(c: string) {
  const d = c.split("").map(Number)
  const check = d.pop()!
  let sum = 0
  d.reverse().forEach((x, i) => { sum += x * (i % 2 === 0 ? 3 : 1) })
  return (10 - (sum % 10)) % 10 === check
}

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, "0")).join("")
}

/** Produktnamen mit Heil-/Werbeaussagen nicht anzeigen (dann zeigt die App den Bibliotheksnamen) */
const CLAIM = /\b(heil|gegen\b|krebs|tumor|corona|covid|virus|viren|diabet|blutzucker|cholesterin|blutdruck|abnehm|schlank|fettverbrenn|fatburn|detox|entgift|wunder|arthros|rheuma|alzheimer|demenz|depress|burn-?out|therap|heilt|heals?|cures?|cancer|against|prevents?|verhinder|beugt|weight ?loss|immunbooster|booster)/i
const cleanName = (s: string) => { const n = s.slice(0, 60).trim(); return n && !CLAIM.test(n) ? n : "" }

/** Text aus OFF: Steuerzeichen/Spitzklammern raus, gekürzt */
const txt = (v: unknown, max: number) => typeof v === "string" ? v.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""

/** OFF-Produkt → kompakte, sichere Form (keine Claims, keine Bilder, nur was der Abgleich braucht) */
function compact(p: Record<string, unknown>, lang: string) {
  const other = lang === "en" ? "de" : "en"
  const names = [...new Set([txt(p.product_name, 120), txt(p[`product_name_${lang}`], 120), txt(p[`product_name_${other}`], 120)].map(cleanName).filter(Boolean))]
  const nut = (p.nutriments && typeof p.nutriments === "object" ? p.nutriments : {}) as Record<string, unknown>
  const nutrients: Record<string, number> = {}
  for (const k of NUTRIENTS) {
    const v = Number(nut[`${k}_serving`])
    if (Number.isFinite(v) && v > 0 && v < 100) nutrients[k] = v
  }
  const categories = (Array.isArray(p.categories_tags) ? p.categories_tags : [])
    .map(c => txt(c, 80).replace(/^[a-z]{2}:/, "").toLowerCase()).filter(Boolean).slice(0, 30)
  return {
    names,
    generic: txt(p[`generic_name_${lang}`], 200) || txt(p.generic_name, 200) || undefined,
    brand: cleanName(txt(p.brands, 60)) || undefined,
    ingredients: txt(p[`ingredients_text_${lang}`], 1500) || txt(p.ingredients_text, 1500) || txt(p[`ingredients_text_${other}`], 1500) || undefined,
    categories,
    nutrients,
    serving: txt(p.serving_size, 40) || undefined,
    quantity: txt(p.quantity, 40) || undefined,
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS })
  if (req.method !== "POST") return json({ error: "method" }, 405)
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

  let b: Record<string, unknown>
  try {
    const raw = await req.json()
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return json({ error: "json" }, 400)
    b = raw as Record<string, unknown>
  } catch { return json({ error: "json" }, 400) }
  const action = String(b.action ?? "")
  const device = String(b.device ?? "")
  const code = String(b.code ?? "")
  if (!DEVICE.test(device)) return json({ error: "device" }, 400)
  if (!CODE.test(code) || !gtinOk(code)) return json({ error: "code" }, 400)
  // Je Code eigener Hash: Meldungen verschiedener Codes lassen sich nicht zu einem Gerät verknüpfen
  const voter = await sha256(`kolbi-barcode|${code}|${device}`)
  // Nur für die Bremse (barcode_rate, nach ≤ 2 Tagen gelöscht): Gerät + IP (gehasht mit Tagessalz, nie im Klartext)
  const rk = (await sha256(`kolbi-rate|${device}`)).slice(0, 32)
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown"
  const day = new Date().toISOString().slice(0, 10)
  const ipk = (await sha256(`kolbi-ip|${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}|${day}|${ip}`)).slice(0, 32)

  const hit = async (key: string, seconds: number, max: number) => {
    const { data, error } = await db.rpc("barcode_hit", { p_key: key, p_seconds: seconds, p_max: max })
    return !error && data === true
  }

  /** OFF-Daten (Cache, sonst API). null = nicht gefunden, "error" = nicht erreichbar */
  const offInfo = async (lang: string): Promise<Record<string, unknown> | null | "error"> => {
    const { data: c } = await db.from("barcode_off").select("found, data, fetched_at").eq("code", code).maybeSingle()
    const age = c ? Date.now() - new Date(c.fetched_at).getTime() : Infinity
    const fresh = c && age < (c.found ? CACHE_FOUND : CACHE_MISSING)
    const fromCache = () => c?.found ? compact((c.data ?? {}) as Record<string, unknown>, lang) : null
    if (fresh) return fromCache()
    // Bremse je IP-Hash und global: OFF erlaubt ~100 Produkt-Abrufe/min – wir bleiben deutlich darunter
    if (!(await hit(`o:${ipk}`, 60, 15)) || !(await hit(`O:${ipk}`, DAY / 1000, 150)) || !(await hit("off", 60, 60))) return c ? fromCache() : "error"
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, {
        headers: { "User-Agent": OFF_UA, Accept: "application/json" }, signal: AbortSignal.timeout(6000),
      })
      if (r.status === 404) {
        await db.from("barcode_off").upsert({ code, found: false, data: null, fetched_at: new Date().toISOString() })
        return null
      }
      if (!r.ok) return c ? fromCache() : "error"
      const j = await r.json() as { status?: number; product?: Record<string, unknown> }
      if (!j.product || j.status === 0) {
        await db.from("barcode_off").upsert({ code, found: false, data: null, fetched_at: new Date().toISOString() })
        return null
      }
      // Rohdaten nur in der Teilmenge speichern, die compact() braucht (beide Sprachen, damit der Cache für alle passt)
      const p = j.product
      const keep: Record<string, unknown> = {}
      for (const k of OFF_FIELDS.split(",")) if (k !== "nutriments" && p[k] != null) keep[k] = typeof p[k] === "string" ? txt(p[k], 1500) : p[k]
      const nut = (p.nutriments && typeof p.nutriments === "object" ? p.nutriments : {}) as Record<string, unknown>
      keep.nutriments = Object.fromEntries(NUTRIENTS.map(k => [`${k}_serving`, nut[`${k}_serving`]]).filter(([, v]) => v != null))
      if (Array.isArray(keep.categories_tags)) keep.categories_tags = (keep.categories_tags as unknown[]).slice(0, 30)
      await db.from("barcode_off").upsert({ code, found: true, data: keep, fetched_at: new Date().toISOString() })
      return compact(keep, lang)
    } catch {
      return c ? fromCache() : "error"
    }
  }

  if (action === "lookup") {
    const lang = b.lang === "en" ? "en" : "de"
    if (!(await hit(`l:${rk}`, 60, 20)) || !(await hit(`L:${rk}`, DAY / 1000, 300))
      || !(await hit(`i:${ipk}`, 60, 40)) || !(await hit(`I:${ipk}`, DAY / 1000, 600))) return json({ error: "rate" }, 429)
    const [{ data: map }, { data: votes }] = await Promise.all([
      db.from("barcode_map").select("lib, name, amount, unit").eq("code", code).eq("source", "manual").limit(10),
      db.from("barcode_votes").select("lib, voter").eq("code", code).limit(VOTERS_PER_CODE * 3),
    ])
    const mapRows = (map ?? []).filter(m => ALLOWED.has(m.lib))
    const inMap = new Set(mapRows.map(m => m.lib))
    // Vorschlag nur bei klarer Mehrheit: ≥ CROWD_MIN Geräte und mehr als die Hälfte aller Geräte für diesen Code
    const voters = new Set((votes ?? []).map(v => v.voter)).size
    const count: Record<string, number> = {}
    for (const v of votes ?? []) if (ALLOWED.has(v.lib) && !inMap.has(v.lib)) count[v.lib] = (count[v.lib] ?? 0) + 1
    const crowd = Object.entries(count).filter(([, n]) => n >= CROWD_MIN && n * 2 > voters)
      .sort((a, b) => b[1] - a[1]).slice(0, 2).map(([lib, n]) => ({ lib, n }))
    // Bestätigte Zuordnung mit Namen → OFF nicht nötig
    const needOff = !mapRows.some(m => m.name)
    const off = needOff ? await offInfo(lang) : null
    return json({
      code,
      map: mapRows.map(m => ({ lib: m.lib, ...(m.name && cleanName(m.name) ? { name: cleanName(m.name) } : {}), ...(m.amount != null ? { amount: Number(m.amount) } : {}), ...(m.unit ? { unit: m.unit } : {}) })),
      crowd,
      off: off === "error" ? null : off,
      ...(off === "error" ? { offError: true } : {}),
    })
  }

  if (action === "submit") {
    const libs = [...new Set((Array.isArray(b.libs) ? b.libs : []).map(String))].filter(l => ALLOWED.has(l)).slice(0, 3)
    if (!libs.length) return json({ error: "lib" }, 400)
    if (!(await hit(`s:${rk}`, 60, 10)) || !(await hit(`S:${rk}`, DAY / 1000, 60))
      || !(await hit(`u:${ipk}`, 60, 10)) || !(await hit(`U:${ipk}`, DAY / 1000, 40))) return json({ error: "rate" }, 429)
    // Pro Code begrenzt: neue Geräte nur, solange der Code noch nicht „voll“ ist
    const { data: existing } = await db.from("barcode_votes").select("voter").eq("code", code).limit(VOTERS_PER_CODE * 3)
    const known = new Set((existing ?? []).map(v => v.voter))
    if (!known.has(voter) && known.size >= VOTERS_PER_CODE) return json({ ok: true, stored: false })
    // Eigene frühere Meldung zu diesem Code ersetzen (Korrektur statt Mehrfach-Stimme)
    const { error: delErr } = await db.from("barcode_votes").delete().eq("code", code).eq("voter", voter)
    if (delErr) return json({ error: "db" }, 500)
    const { error } = await db.from("barcode_votes").insert(libs.map(lib => ({ code, voter, lib })))
    if (error) return json({ error: "db" }, 500)
    // Bewusst KEINE automatische Bestätigung – die pflegt nur der Betreiber (supabase/inhaber/barcode.sql)
    return json({ ok: true, stored: true })
  }

  return json({ error: "action" }, 400)
})
