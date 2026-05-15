import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.ADMIN_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const db = getSupabaseAdmin()
  if (!db) return NextResponse.json({ error: "DB nicht konfiguriert" }, { status: 500 })

  // Fetch all auth users (bypasses RLS)
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also fetch profiles for names/avatars
  const { data: profiles } = await db.from("profiles").select("id, vorname, avatar, stadt")

  const profileMap: Record<string, any> = {}
  for (const p of (profiles ?? [])) profileMap[p.id] = p

  const users = (data.users ?? []).map(u => ({
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at ?? null,
    vorname: profileMap[u.id]?.vorname ?? "",
    avatar: profileMap[u.id]?.avatar ?? "🧑",
    stadt: profileMap[u.id]?.stadt ?? "",
  }))

  return NextResponse.json({ users })
}
