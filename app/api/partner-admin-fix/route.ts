import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// POST — Confirm a partner's email so they can log in
// Usage: POST /api/partner-admin-fix { email: "...", secret: "true2026admin" }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.email || body?.secret !== "true2026admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = getServiceClient()
  if (!db) return NextResponse.json({ error: "No service client" }, { status: 500 })

  // 1. Find user by email
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers()
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })

  const user = users.find(u => u.email?.toLowerCase() === body.email.toLowerCase().trim())
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // 2. Confirm email
  const { data, error: updateErr } = await db.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 3. Also make sure partner_profile exists
  const { data: profile } = await db
    .from("partner_profiles")
    .select("id, company_name")
    .eq("user_id", user.id)
    .single()

  return NextResponse.json({
    success: true,
    email: user.email,
    email_confirmed: true,
    has_profile: !!profile,
    profile_company: profile?.company_name ?? null,
  })
}
