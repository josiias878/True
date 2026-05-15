import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get("secret")
  const userId = searchParams.get("userId")

  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!userId) {
    return NextResponse.json({ error: "userId fehlt" }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  if (!db) return NextResponse.json({ error: "DB nicht konfiguriert" }, { status: 500 })

  // Delete all posts by this user first
  await db.from("posts").delete().eq("user_id", userId)

  // Delete profile data
  await db.from("profiles").delete().eq("id", userId)

  // Delete from Supabase Auth (this is the main one)
  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
