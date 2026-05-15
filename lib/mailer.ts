import { Resend } from "resend"

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export async function sendMail({
  to,
  subject,
  html,
  from = "TRUE <info@get-true.de>",
}: {
  to: string | string[]
  subject: string
  html: string
  from?: string
}) {
  const resend = getResend()
  if (!resend) {
    console.warn("RESEND_API_KEY nicht gesetzt — E-Mail übersprungen")
    return
  }
  const { error } = await resend.emails.send({
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  })
  if (error) console.error("Resend Fehler:", error)
}
