import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// DELETE: remove one or many posts
export async function DELETE(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== "true2026admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { ids } = await req.json() // array of post IDs
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Keine IDs angegeben" }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  if (!db) return NextResponse.json({ error: "DB nicht konfiguriert" }, { status: 500 })

  const { error } = await db.from("posts").delete().in("id", ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, deleted: ids.length })
}
