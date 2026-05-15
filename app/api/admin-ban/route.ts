import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST: ban or unban a user, or send a warning
export async function POST(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret")
  if (secret !== process.env.ADMIN_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId, action, message } = await req.json()
  // action: "ban" | "unban" | "warn"

  const db = getSupabaseAdmin()
  if (!db) return NextResponse.json({ error: "DB nicht konfiguriert" }, { status: 500 })

  if (action === "ban") {
    const { error } = await db.auth.admin.updateUserById(userId, {
      ban_duration: "876600h", // ~100 years = permanent ban
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Mark in profile
    await db.from("profiles").upsert({ id: userId, bio: "[GESPERRT]" })
    return NextResponse.json({ ok: true, action: "banned" })
  }

  if (action === "unban") {
    const { error } = await db.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Clear ban marker from profile
    const { data: profile } = await db.from("profiles").select("bio").eq("id", userId).single()
    if (profile?.bio === "[GESPERRT]") {
      await db.from("profiles").update({ bio: "" }).eq("id", userId)
    }
    return NextResponse.json({ ok: true, action: "unbanned" })
  }

  if (action === "warn") {
    // Store warning in profile bio as a note (prepend)
    const note = `[VERWARNUNG: ${new Date().toLocaleDateString("de-DE")}] ${message || "Verstoß gegen Nutzungsbedingungen"}`
    const { data: profile } = await db.from("profiles").select("bio").eq("id", userId).single()
    const existingBio = profile?.bio ?? ""
    await db.from("profiles").upsert({ id: userId, bio: `${note}\n${existingBio}`.trim() })
    return NextResponse.json({ ok: true, action: "warned" })
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 })
}
