import nodemailer from "nodemailer"

function getTransporter() {
  const pass = process.env.STRATO_MAIL_PASSWORD
  if (!pass) return null

  return nodemailer.createTransport({
    host: "smtp.strato.de",
    port: 465,
    secure: true,
    auth: {
      user: "info@get-true.de",
      pass,
    },
  })
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
  const transporter = getTransporter()
  if (!transporter) {
    console.warn("STRATO_MAIL_PASSWORD nicht gesetzt — E-Mail übersprungen")
    return
  }
  await transporter.sendMail({ from, to, subject, html })
}
