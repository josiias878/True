import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// POST — track a partner event (impression, click, list_add)
// Public endpoint — no auth required
export async function POST(req: NextRequest) {
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 })

  const { productId, partnerId, eventType, metadata } = body

  if (!productId || !partnerId || !eventType) {
    return NextResponse.json({ error: "productId, partnerId und eventType sind erforderlich" }, { status: 400 })
  }

  const VALID_EVENTS = ["impression", "click", "list_add"]
  if (!VALID_EVENTS.includes(eventType)) {
    return NextResponse.json({ error: "Ungültiger eventType" }, { status: 400 })
  }

  const { error } = await supabase.from("partner_events").insert({
    partner_id:  partnerId,
    product_id:  productId,
    event_type:  eventType,
    metadata:    metadata ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
