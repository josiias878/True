import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// POST — Create auth user + partner profile in one server-side call (bypasses RLS)
export async function POST(req: NextRequest) {
  const db = getServiceClient()
  if (!db) return NextResponse.json({ error: "Server nicht konfiguriert (Service-Role-Key fehlt)" }, { status: 500 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 })

  const { email, password, companyName, contactEmail, website, description, tier } = body

  if (!email || !password) return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 })
  if (!companyName) return NextResponse.json({ error: "Firmenname erforderlich" }, { status: 400 })
  if (password.length < 8) return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen haben" }, { status: 400 })

  try {
    // 1. Create auth user — auto-confirm email so they can log in immediately
    const { data: authData, error: authErr } = await db.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // skip email confirmation for partner accounts
      user_metadata: { type: "partner", company_name: companyName },
    })

    if (authErr) {
      console.error("[partner-register] auth.admin.createUser failed:", authErr)
      const msg = authErr.message ?? ""
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered") || msg.toLowerCase().includes("exists")) {
        return NextResponse.json({ error: "Diese E-Mail ist bereits registriert. Bitte logge dich ein.", detail: msg }, { status: 409 })
      }
      return NextResponse.json({ error: `Auth-Fehler: ${msg}`, detail: msg }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      console.error("[partner-register] no user id returned from createUser:", authData)
      return NextResponse.json({ error: "User-ID nicht erhalten" }, { status: 500 })
    }

    // 2. Insert partner profile (with service-role, no RLS check)
    const { data: profile, error: profileErr } = await db
      .from("partner_profiles")
      .insert({
        user_id: userId,
        company_name: companyName.trim(),
        contact_email: (contactEmail || email).toLowerCase().trim(),
        website: website?.trim() || null,
        description: description?.trim() || null,
        tier: tier || "trial",
        verified: false,
      })
      .select()
      .single()

    if (profileErr) {
      console.error("[partner-register] partner_profiles.insert failed:", profileErr)
      // Roll back: delete the auth user we just created
      await db.auth.admin.deleteUser(userId).catch(e => console.error("[partner-register] rollback delete failed:", e))
      return NextResponse.json({
        error: `Profil konnte nicht erstellt werden: ${profileErr.message}`,
        detail: profileErr.details || profileErr.hint || profileErr.code,
      }, { status: 400 })
    }

    return NextResponse.json({ success: true, profile, userId }, { status: 201 })
  } catch (err: any) {
    console.error("[partner-register] unexpected error:", err)
    return NextResponse.json({ error: err?.message ?? "Unbekannter Fehler", detail: err?.stack?.split("\n")[0] }, { status: 500 })
  }
}
