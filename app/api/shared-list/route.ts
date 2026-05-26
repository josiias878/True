import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

// POST: Neue geteilte Liste erstellen → gibt kurzen Code zurück
export async function POST(req: NextRequest) {
  const { items, ownerName } = await req.json()
  if (!items?.length) return NextResponse.json({ error: "Keine Items" }, { status: 400 })

  const code = generateCode()
  const { error } = await supabase.from("shared_lists").insert({
    code,
    items,
    owner_name: ownerName ?? "Jemand",
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ code })
}

// GET: Liste per Code laden
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  if (!code) return NextResponse.json({ error: "Code fehlt" }, { status: 400 })

  const { data, error } = await supabase
    .from("shared_lists")
    .select("items, owner_name, created_at, expires_at")
    .eq("code", code)
    .single()

  if (error || !data) return NextResponse.json({ error: "Liste nicht gefunden" }, { status: 404 })

  // Abgelaufen?
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "Dieser Link ist abgelaufen (nach 7 Tagen)." }, { status: 410 })
  }

  return NextResponse.json({ items: data.items, ownerName: data.owner_name, createdAt: data.created_at })
}
