import { NextResponse } from "next/server"
import { sendMail } from "@/lib/mailer"

export async function POST(req: Request) {
  try {
    const { email, source } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Ungültige E-Mail" }, { status: 400 })
    }

    {
      await sendMail({
        to: email,
        subject: "👑 Du bist auf der Warteliste — TRUE Premium",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:system-ui,-apple-system,sans-serif;color:#e5e5e5;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">

    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:2.5rem;margin-bottom:8px;filter:drop-shadow(0 0 20px rgba(255,215,0,0.5))">👑</div>
      <div style="font-size:1.5rem;font-weight:900;letter-spacing:-0.03em;background:linear-gradient(135deg,#ffd700,#ffaa00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
        TRUE Premium
      </div>
    </div>

    <div style="background:#111a11;border:1px solid rgba(46,204,138,0.2);border-radius:20px;padding:28px;">
      <h1 style="font-size:1.3rem;font-weight:900;margin:0 0 12px;color:#fff;">🎉 Du bist dabei!</h1>
      <p style="color:rgba(255,255,255,0.65);line-height:1.7;margin:0 0 20px;font-size:0.92rem;">
        Hey! Du hast dich erfolgreich für die <strong style="color:#ffd700">TRUE Premium Warteliste</strong> eingetragen.<br><br>
        Sobald Premium startet, bist du als <strong style="color:#fff">Erstes informiert</strong> — und bekommst den Einführungspreis.
      </p>

      <div style="background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.2);border-radius:14px;padding:18px 20px;margin-bottom:20px;">
        <div style="font-weight:800;font-size:1rem;color:#ffd700;margin-bottom:12px;">Was dich erwartet:</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${[
            "📷 Unbegrenzte Scans täglich",
            "👨‍👩‍👧 Familien-Sicherheits-Score",
            "🥗 Ernährungscoach",
            "🎯 Ziel-Modus (Abnehmen · Vegan · Allergiefrei)",
            "📊 Persönlicher Wochenrückblick",
            "🛒 Einkaufsliste pro Person",
          ].map(f => `<div style="display:flex;align-items:center;gap:10px;font-size:0.85rem;color:rgba(255,255,255,0.75);">${f}</div>`).join("")}
        </div>
      </div>

      <div style="text-align:center;padding:16px 0;border-top:1px solid rgba(255,255,255,0.06);">
        <p style="font-size:0.8rem;color:rgba(255,255,255,0.4);margin:0 0 4px;">Alles für weniger als einen Kaffee im Monat.</p>
        <div style="font-size:1.3rem;font-weight:900;color:#ffd700;">2,99€ / Monat</div>
      </div>
    </div>

    <div style="text-align:center;margin-top:24px;padding:20px;background:#0e1a0e;border:1px solid rgba(255,255,255,0.06);border-radius:16px;">
      <p style="font-size:0.82rem;color:rgba(255,255,255,0.55);line-height:1.7;margin:0 0 12px;">
        Dein Körper ist dein größter Schatz. Damit du weißt, was wirklich in deinen Produkten steckt, arbeiten wir täglich daran, TRUE noch besser zu machen.
      </p>
      <p style="font-size:0.75rem;color:rgba(255,255,255,0.35);margin:0;">— Josias, Gründer TRUE</p>
    </div>

    <div style="text-align:center;margin-top:28px;">
      <a href="https://get-true.de" style="display:inline-block;background:linear-gradient(135deg,#2ECC8A,#1aaa6e);color:#000;border-radius:12px;padding:12px 28px;font-weight:800;font-size:0.92rem;text-decoration:none;">
        Zur App →
      </a>
    </div>

    <p style="text-align:center;font-size:0.7rem;color:rgba(255,255,255,0.2);margin-top:28px;">
      TRUE · get-true.de · Du erhältst diese E-Mail weil du dich auf die Warteliste eingetragen hast.
    </p>
  </div>
</body>
</html>
        `,
      })

      // Notify Josias
      await sendMail({
        to: "info@get-true.de",
        subject: `🎯 Neuer Wartelisten-Eintrag: ${email}`,
        html: `<p><strong>Neue Anmeldung für TRUE Premium:</strong></p><p>E-Mail: ${email}</p><p>Quelle: ${source ?? "unbekannt"}</p><p>Zeit: ${new Date().toLocaleString("de-DE")}</p>`,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Waitlist API error:", err)
    return NextResponse.json({ error: "Fehler beim Senden" }, { status: 500 })
  }
}
