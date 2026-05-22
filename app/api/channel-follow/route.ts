import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
)

// GET /api/channel-follow?channel=true → { followers: number, posts: number }
export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel") ?? "true"
  try {
    // Follower = Profile-Einträge wo preferences das Flag "ch_${channel}" enthält
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .contains("preferences", [`ch_${channel}`])

    // Posts = Anzahl Posts in der posts-Tabelle mit type=bot (TRUE-Kanal)
    const { count: postCount } = await supabaseAdmin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .in("type", ["bot", "eva"])

    return NextResponse.json({
      followers: (count ?? 0) + 1200, // Seed-Offset: ehrliche Basis + echte neue Follower
      posts: postCount ?? 0,
    })
  } catch {
    return NextResponse.json({ followers: 1200, posts: 0 })
  }
}

// POST /api/channel-follow { channel, userId, action: "follow"|"unfollow" }
export async function POST(req: NextRequest) {
  try {
    const { channel, userId, action } = await req.json()
    if (!channel || !userId) return NextResponse.json({ ok: false }, { status: 400 })

    const flag = `ch_${channel}`

    // Lade aktuelles Profil
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("preferences")
      .eq("id", userId)
      .single()

    const prefs: string[] = profile?.preferences ?? []
    let updated: string[]

    if (action === "follow") {
      updated = prefs.includes(flag) ? prefs : [...prefs, flag]
    } else {
      updated = prefs.filter((p: string) => p !== flag)
    }

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, preferences: updated })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
