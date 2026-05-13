import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendMail } from "@/lib/mailer"

// Service role key — bypasses RLS, only used server-side
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: Request) {
  try {
    const { email, companyName, tier } = await req.json()
    if (!email) return NextResponse.json({ error: "E-Mail fehlt" }, { status: 400 })

    // Save to Supabase
    const db = getSupabaseAdmin()
    if (db) {
      await db.from("partner_leads").insert({
        email,
        company_name: companyName ?? "",
        tier: tier ?? "",
        status: "new",
        notes: "",
      })
    }

    // Confirmation to company
    await sendMail({
      to: email,
      subject: "✅ Deine Partner-Anfrage bei TRUE",
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:system-ui,-apple-system,sans-serif;color:#e5e5e5;">
<div style="max-width:520px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-size:1.4rem;font-weight:900;color:#2ECC8A;letter-spacing:-0.03em;">TRUE</div>
    <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-top:2px;">Für transparente Marken</div>
  </div>
  <div style="background:#111a11;border:1px solid rgba(46,204,138,0.2);border-radius:20px;padding:28px;">
    <h1 style="font-size:1.2rem;font-weight:900;margin:0 0 12px;color:#fff;">👋 Anfrage erhalten!</h1>
    <p style="color:rgba(255,255,255,0.65);line-height:1.7;margin:0 0 16px;font-size:0.9rem;">
      Wir haben deine Partner-Anfrage${companyName ? ` von <strong style="color:#fff">${companyName}</strong>` : ""} erhalten
      ${tier ? `(Paket: <strong style="color:#2ECC8A">${tier}</strong>)` : ""} und melden uns innerhalb von <strong style="color:#fff">24 Stunden</strong>.
    </p>
    <div style="background:rgba(46,204,138,0.07);border:1px solid rgba(46,204,138,0.2);border-radius:12px;padding:16px;margin-bottom:16px;">
      <div style="font-size:0.72rem;font-weight:800;color:#2ECC8A;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Was dich als Partner erwartet</div>
      ${["🎯 Erscheine genau wenn Nutzer dein Konkurrenzprodukt scannen",
         "📊 Monatliche Insights: Impressionen, Klicks, Conversions",
         "💚 Zugang zu bewussten Käufern mit hoher Kaufabsicht",
         "🌱 Teil einer Bewegung für mehr Transparenz"].map(f =>
        `<div style="font-size:0.82rem;color:rgba(255,255,255,0.7);margin-bottom:6px;">${f}</div>`
      ).join("")}
    </div>
    <p style="font-size:0.78rem;color:rgba(255,255,255,0.4);margin:0;">
      Fragen? Schreib uns direkt: <a href="mailto:info@get-true.de" style="color:#2ECC8A;">info@get-true.de</a>
    </p>
  </div>
  <div style="text-align:center;margin-top:24px;">
    <a href="https://get-true.de/partner" style="display:inline-block;background:linear-gradient(135deg,#2ECC8A,#1aaa6e);color:#000;border-radius:12px;padding:12px 28px;font-weight:800;font-size:0.9rem;text-decoration:none;">
      Zur Partner-Seite →
    </a>
  </div>
  <p style="text-align:center;font-size:0.68rem;color:rgba(255,255,255,0.2);margin-top:24px;">TRUE · get-true.de · info@get-true.de</p>
</div>
</body></html>`,
    })

    // Notification to Josias
    await sendMail({
      to: "info@get-true.de",
      subject: `🤝 Neue Partner-Anfrage${companyName ? `: ${companyName}` : ""} — ${tier || "kein Paket"}`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#2ECC8A;">Neue Partner-Anfrage</h2>
        <table style="border-collapse:collapse;width:100%;">
          <tr><td style="padding:6px;color:#888;font-size:0.82rem;">E-Mail</td><td style="padding:6px;font-weight:700;">${email}</td></tr>
          <tr><td style="padding:6px;color:#888;font-size:0.82rem;">Firma</td><td style="padding:6px;">${companyName || "–"}</td></tr>
          <tr><td style="padding:6px;color:#888;font-size:0.82rem;">Paket</td><td style="padding:6px;"><strong>${tier || "nicht angegeben"}</strong></td></tr>
          <tr><td style="padding:6px;color:#888;font-size:0.82rem;">Zeit</td><td style="padding:6px;">${new Date().toLocaleString("de-DE")}</td></tr>
        </table>
        <p style="margin-top:16px;"><a href="https://get-true.de/admin" style="background:#2ECC8A;color:#000;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:700;">Im Admin ansehen →</a></p>
      </div>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Partner contact error:", err)
    return NextResponse.json({ error: "Fehler" }, { status: 500 })
  }
}

// GET: all leads (for admin)
export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== "true2026admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = getSupabaseAdmin()
  if (!db) return NextResponse.json({ leads: [] })

  const { data } = await db.from("partner_leads").select("*").order("created_at", { ascending: false })
  return NextResponse.json({ leads: data ?? [] })
}

// PATCH: update lead status/notes
export async function PATCH(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== "true2026admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, status, notes } = await req.json()
  const db = getSupabaseAdmin()
  if (!db) return NextResponse.json({ ok: false })

  await db.from("partner_leads").update({ status, notes }).eq("id", id)
  return NextResponse.json({ ok: true })
}
