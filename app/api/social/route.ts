import { NextRequest, NextResponse } from "next/server"

const SECRET = "true-cron-2024"

// ── Konzerne pool (same rotation as feed + admin) ───────────────────────────
const KONZERNE = [
  { name: "Nestlé",        emoji: "☕", category: "Lebensmittel & Wasser",
    facts: ["Entzieht in Dürreregionen Millionen Liter Grundwasser — teils ohne gültige Genehmigung", "Vermarktet Babynahrung in Entwicklungsländern gegen WHO-Empfehlungen", "Besitzt über 2.000 Marken — von KitKat bis Nescafé"],
    source: "WHO / US Forest Service 2023" },
  { name: "Coca-Cola",     emoji: "🥤", category: "Getränke & Plastik",
    facts: ["Größter Plastik-Verschmutzer der Welt — 6 Jahre in Folge laut Brand Audit", "Entnimmt täglich 1,8 Milliarden Liter Grundwasser weltweit", "Kämpft juristisch gegen staatliche Zuckersteuer in mehreren Ländern"],
    source: "Break Free From Plastic / TU Berlin 2023" },
  { name: "Bayer/Monsanto",emoji: "☠️", category: "Agrochemie",
    facts: ["Glyphosat von WHO-Agentur IARC als 'wahrscheinlich krebserregend' eingestuft", "Zahlte 13 Milliarden USD Schadensersatz in US-Sammelklagen", "Verkauft Pestizide in Ländern, die in der EU längst verboten sind"],
    source: "IARC / US District Courts 2023" },
  { name: "PepsiCo",       emoji: "🌽", category: "Snacks & Getränke",
    facts: ["Zweitgrößter Plastik-Verschmutzer weltweit nach Coca-Cola", "Lay's und Doritos: hochverarbeitete Zusatzstoffe (NOVA Gruppe 4)", "Vermarktet zuckerreiche Produkte gezielt an Kinder in Schwellenländern"],
    source: "BFFP Brand Audit / NOVA 2023" },
  { name: "Unilever",      emoji: "🧴", category: "Konsumgüter",
    facts: ["Einer der größten Palmöl-Käufer weltweit — trotz Nachhaltigkeitsversprechen", "Klagte gegen Ben & Jerry's wegen Boykott-Aussagen", "85 % der Plastikverpackungen nicht recycelbar"],
    source: "Rainforest Action Network / Guardian 2022" },
  { name: "Amazon",        emoji: "📦", category: "Tech & Logistik",
    facts: ["Vernichtete 2021 offiziell über 3 Millionen unverkaufte Artikel — täglich", "Lagerarbeiter haben doppelt so hohe Verletzungsrate wie US-Branchendurchschnitt", "Zahlt in Luxemburg effektiven Steuersatz von unter 1 % auf EU-Gewinne"],
    source: "ITV / OSHA / EU Commission 2022" },
  { name: "Shell",         emoji: "🛢️", category: "Energie & Öl",
    facts: ["Im Niger-Delta verursachte Shell Ölpesten, die 50 Jahre zur Sanierung benötigen", "Holländisches Gericht verurteilte Shell zu CO₂-Reduzierung — ignoriert", "Investierte 2022 mehr in neue Ölfelder als in erneuerbare Energien"],
    source: "UN / Haager Gericht 2021–2023" },
]

// ── Human-sounding tweet variants ───────────────────────────────────────────
const TWEET_INTROS = [
  "Das weiß fast niemand:",
  "Kurze Erinnerung daran,",
  "Ich fass das kurz zusammen:",
  "Was kaum jemand thematisiert:",
  "Fakt des Tages:",
  "Mal ehrlich —",
  "Wusstet ihr das?",
  "Gerade wieder gelesen und immer noch schockiert:",
  "Für alle die das noch nicht wussten:",
  "Das steht in keiner Werbung:",
]

const TWEET_OUTROS = [
  "\n\n→ TRUE App: einfach Barcode scannen, Konzern dahinter sehen. get-true.de",
  "\n\nDie TRUE App zeigt dir welche Konzerne hinter deinen Produkten stecken → get-true.de",
  "\n\n#Verbraucherschutz tut not. TRUE App hilft dabei → get-true.de",
  "\n\nInformiert einkaufen: TRUE App → get-true.de",
  "\n\nDas und mehr in der TRUE App → get-true.de",
]

function dayIndex() {
  return Math.floor(Date.now() / 86_400_000)
}

function pickItem<T>(arr: T[], salt = 0): T {
  return arr[(dayIndex() + salt) % arr.length]
}

function buildTweet(konzern: typeof KONZERNE[0]): string {
  const intro = pickItem(TWEET_INTROS, 1)
  const fact   = konzern.facts[dayIndex() % konzern.facts.length]
  const outro  = pickItem(TWEET_OUTROS, 2)
  const hashtags = `\n\n#${konzern.name.replace(/[^a-zA-ZäöüÄÖÜ]/g, "")} #Verbraucherschutz #Nachhaltigkeit`

  return `${konzern.emoji} ${intro}\n\n${konzern.name}: ${fact}\n\nQuelle: ${konzern.source}${hashtags}${outro}`
}

// ── POST to X/Twitter via v2 API ─────────────────────────────────────────────
async function postToTwitter(text: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey       = process.env.TWITTER_API_KEY
  const apiSecret    = process.env.TWITTER_API_SECRET
  const accessToken  = process.env.TWITTER_ACCESS_TOKEN
  const accessSecret = process.env.TWITTER_ACCESS_SECRET

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { ok: false, error: "Twitter API keys nicht konfiguriert. Bitte in .env.local setzen: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET" }
  }

  // OAuth 1.0a signature for Twitter v2
  const url    = "https://api.twitter.com/2/tweets"
  const method = "POST"
  const body   = JSON.stringify({ text })

  const oauthParams: Record<string, string> = {
    oauth_consumer_key:     apiKey,
    oauth_nonce:            Math.random().toString(36).slice(2) + Date.now().toString(36),
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            accessToken,
    oauth_version:          "1.0",
  }

  // Build signature base string
  const paramStr = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")

  const sigBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`
  const sigKey  = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`

  // HMAC-SHA256 via Web Crypto
  const keyData  = new TextEncoder().encode(sigKey)
  const msgData  = new TextEncoder().encode(sigBase)
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData)
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))

  oauthParams["oauth_signature"] = signature

  const authHeader = "OAuth " + Object.entries(oauthParams)
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ")

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Authorization":  authHeader,
        "Content-Type":   "application/json",
      },
      body,
    })
    const json = await res.json() as { data?: { id: string }; errors?: { message: string }[] }
    if (json.data?.id) return { ok: true, id: json.data.id }
    const errMsg = json.errors?.[0]?.message ?? `HTTP ${res.status}`
    return { ok: false, error: errMsg }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { type?: string; platform?: string; text?: string; secret?: string }

    if (body.secret !== SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    // Manual post with custom text
    if (body.text && body.platform === "twitter") {
      const result = await postToTwitter(body.text)
      return NextResponse.json(result)
    }

    // Daily auto-post: pick today's konzern, build human tweet
    const konzern = pickItem(KONZERNE)
    const tweet   = buildTweet(konzern)

    if (body.type === "daily" || body.platform === "twitter") {
      const result = await postToTwitter(tweet)
      return NextResponse.json({ ...result, preview: tweet.slice(0, 100) })
    }

    // GET preview (no post)
    return NextResponse.json({ ok: true, preview: tweet, konzern: konzern.name })

  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// GET: preview what would be posted today
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }
  const konzern = pickItem(KONZERNE)
  const tweet   = buildTweet(konzern)
  return NextResponse.json({ ok: true, konzern: konzern.name, preview: tweet })
}
