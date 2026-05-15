import { NextResponse } from "next/server"
import { sendMail } from "@/lib/mailer"

export async function POST(req: Request) {
  const { secret, to, subject, body } = await req.json()
  if (secret !== process.env.ADMIN_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!to || !subject || !body) return NextResponse.json({ error: "Felder fehlen" }, { status: 400 })

  await sendMail({
    to,
    subject,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:system-ui,-apple-system,sans-serif;color:#e5e5e5;">
<div style="max-width:520px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:1.4rem;font-weight:900;color:#2ECC8A;">TRUE</div>
    <div style="font-size:0.72rem;color:rgba(255,255,255,0.4);">Für transparente Marken</div>
  </div>
  <div style="background:#111a11;border:1px solid rgba(46,204,138,0.18);border-radius:20px;padding:28px;">
    <div style="font-size:0.92rem;line-height:1.8;color:rgba(255,255,255,0.8);white-space:pre-line;">${body.replace(/\n/g, "<br>")}</div>
  </div>
  <div style="text-align:center;margin-top:20px;">
    <a href="https://get-true.de/partner" style="display:inline-block;background:linear-gradient(135deg,#2ECC8A,#1aaa6e);color:#000;border-radius:10px;padding:10px 24px;font-weight:800;font-size:0.85rem;text-decoration:none;">
      Zur Partner-Seite →
    </a>
  </div>
  <p style="text-align:center;font-size:0.65rem;color:rgba(255,255,255,0.2);margin-top:20px;">
    TRUE · get-true.de · Bei Fragen: <a href="mailto:partner@get-true.de" style="color:rgba(255,255,255,0.3);">partner@get-true.de</a>
  </p>
</div>
</body></html>`,
  })

  return NextResponse.json({ ok: true })
}
