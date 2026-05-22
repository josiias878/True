import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const ADMIN_EMAILS = ["info@get-true.de", "social@get-true.de", "mgognon99@gmail.com"]

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// GET — alle Produkte in der Review-Queue + Stats
export async function GET(req: NextRequest) {
  const db = getServiceClient()
  if (!db) return NextResponse.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  // Auth prüfen
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  const { data: { user } } = await db.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes(user.email ?? ""))
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 })

  const [queueRes, allRes, profilesRes] = await Promise.all([
    // Produkte in der Queue (needs_review = true)
    db.from("partner_products")
      .select("*, partner_profiles(company_name, contact_email, tier)")
      .eq("needs_review", true)
      .order("created_at", { ascending: true }),

    // Alle Produkte für Stats
    db.from("partner_products").select("id, verified, verified_by, needs_review, created_at"),

    // Alle Partner-Profile
    db.from("partner_profiles").select("id, company_name, tier, verified, created_at"),
  ])

  const all = allRes.data ?? []
  const profiles = profilesRes.data ?? []

  const stats = {
    total_products:     all.length,
    verified_auto:      all.filter((p: any) => p.verified_by === "auto").length,
    verified_admin:     all.filter((p: any) => p.verified_by === "admin").length,
    needs_review:       all.filter((p: any) => p.needs_review).length,
    rejected:           all.filter((p: any) => !p.verified && !p.needs_review).length,
    total_partners:     profiles.length,
    partners_by_tier:   {
      basic:      profiles.filter((p: any) => p.tier === "basic").length,
      growth:     profiles.filter((p: any) => p.tier === "growth").length,
      enterprise: profiles.filter((p: any) => p.tier === "enterprise").length,
    },
    mrr_estimate:
      profiles.filter((p: any) => p.tier === "basic").length * 29 +
      profiles.filter((p: any) => p.tier === "growth").length * 79 +
      profiles.filter((p: any) => p.tier === "enterprise").length * 149,
  }

  return NextResponse.json({ queue: queueRes.data ?? [], stats })
}

// PATCH — Produkt genehmigen oder ablehnen
export async function PATCH(req: NextRequest) {
  const db = getServiceClient()
  if (!db) return NextResponse.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  const { data: { user } } = await db.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes(user.email ?? ""))
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body?.productId || !body?.action) return NextResponse.json({ error: "productId und action erforderlich" }, { status: 400 })

  const { productId, action, notes } = body

  if (action === "approve") {
    const { error } = await db.from("partner_products").update({
      verified: true,
      verified_by: "admin",
      needs_review: false,
      review_notes: notes ?? null,
    }).eq("id", productId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, action: "approved" })
  }

  if (action === "reject") {
    const { error } = await db.from("partner_products").update({
      verified: false,
      verified_by: null,
      needs_review: false,
      review_notes: notes ?? "Abgelehnt",
    }).eq("id", productId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, action: "rejected" })
  }

  if (action === "requeue") {
    const { error } = await db.from("partner_products").update({
      verified: false,
      verified_by: null,
      needs_review: true,
      review_notes: null,
    }).eq("id", productId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, action: "requeued" })
  }

  return NextResponse.json({ error: "Unbekannte Action" }, { status: 400 })
}
