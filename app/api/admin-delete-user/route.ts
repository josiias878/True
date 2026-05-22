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

  if (secret !== process.env.ADMIN_SECRET && secret !== process.env.NEXT_PUBLIC_ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!userId) {
    return NextResponse.json({ error: "userId fehlt" }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  if (!db) return NextResponse.json({ error: "DB nicht konfiguriert" }, { status: 500 })

  // Alle User-Daten in der richtigen Reihenfolge löschen (Foreign Keys beachten)
  const tables = [
    "post_likes",
    "scan_history",
    "list_items",
    "posts",
    "profiles",
  ]

  for (const table of tables) {
    const { error } = await db.from(table).delete().eq("user_id", userId)
    if (error) {
      console.error(`[admin-delete-user] Fehler beim Löschen aus ${table}:`, error.message)
      // Nicht abbrechen — weiter mit anderen Tabellen
    }
  }

  // Zuletzt Auth-User löschen (erst wenn alle FK-Daten weg sind)
  const { error: authError } = await db.auth.admin.deleteUser(userId)
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
