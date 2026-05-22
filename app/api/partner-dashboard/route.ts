import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// ── Auto-Verifikation via OpenFoodFacts ─────────────────────────────────────
async function autoVerify(barcode: string, productName: string): Promise<{
  verified: boolean
  verified_by: string | null
  needs_review: boolean
  off_data: any
}> {
  if (!barcode || barcode.trim().length < 8) {
    return { verified: false, verified_by: null, needs_review: true, off_data: null }
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode.trim()}?fields=product_name,product_name_de,brands,categories,nutriscore_grade,ecoscore_grade,labels`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) throw new Error("OFF not ok")
    const data = await res.json()

    if (data.status !== 1 || !data.product) {
      // Barcode nicht in OpenFoodFacts → manuelle Prüfung
      return { verified: false, verified_by: null, needs_review: true, off_data: null }
    }

    const off = data.product
    // Namens-Ähnlichkeit prüfen (einfach: enthält OFF-Name den eingereichten Namen oder umgekehrt?)
    const offName = (off.product_name_de || off.product_name || "").toLowerCase()
    const submittedName = productName.toLowerCase()
    const nameMatch =
      offName.includes(submittedName.substring(0, 6)) ||
      submittedName.includes(offName.substring(0, 6)) ||
      offName.split(" ").some((w: string) => w.length > 4 && submittedName.includes(w))

    if (nameMatch) {
      // Barcode bekannt + Name passt → Auto-verifiziert
      return { verified: true, verified_by: "auto", needs_review: false, off_data: off }
    } else {
      // Barcode bekannt, aber Name weicht ab → Queue für manuelle Prüfung
      return { verified: false, verified_by: null, needs_review: true, off_data: off }
    }
  } catch {
    // OFF nicht erreichbar → Queue
    return { verified: false, verified_by: null, needs_review: true, off_data: null }
  }
}

// GET — returns partner profile + products + aggregated stats
export async function GET(req: NextRequest) {
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  const partnerId = req.nextUrl.searchParams.get("partnerId")
  if (!partnerId) return NextResponse.json({ error: "partnerId fehlt" }, { status: 400 })

  const [profileRes, productsRes, eventsRes] = await Promise.all([
    supabase.from("partner_profiles").select("*").eq("id", partnerId).single(),
    supabase.from("partner_products").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }),
    supabase.from("partner_events").select("event_type, product_id, created_at")
      .eq("partner_id", partnerId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 404 })

  const events = eventsRes.data ?? []
  const stats = {
    impressions: events.filter((e: any) => e.event_type === "impression").length,
    clicks:      events.filter((e: any) => e.event_type === "click").length,
    list_adds:   events.filter((e: any) => e.event_type === "list_add").length,
  }

  return NextResponse.json({
    profile:  profileRes.data,
    products: productsRes.data ?? [],
    stats,
  })
}

// POST — create or update a product
export async function POST(req: NextRequest) {
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 })

  const { id, partner_id, ...fields } = body
  if (!partner_id) return NextResponse.json({ error: "partner_id fehlt" }, { status: 400 })

  // Auto-Verifikation bei neuem Produkt oder wenn Barcode geändert wurde
  const shouldAutoVerify = !id || body._barcodeChanged
  let verifyResult = { verified: false, verified_by: null as string | null, needs_review: true, off_data: null as any }
  if (shouldAutoVerify && fields.barcode) {
    verifyResult = await autoVerify(fields.barcode, fields.name ?? "")
  }

  if (id) {
    // Update — reset verification wenn Barcode geändert
    const updatePayload = shouldAutoVerify
      ? { ...fields, ...verifyResult }
      : fields
    const { data, error } = await supabase.from("partner_products").update(updatePayload).eq("id", id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ product: data, autoVerified: verifyResult.verified })
  } else {
    // Insert mit Auto-Verifikationsergebnis
    const { data, error } = await supabase.from("partner_products").insert({
      partner_id,
      ...fields,
      active: true,
      ...verifyResult,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ product: data, autoVerified: verifyResult.verified }, { status: 201 })
  }
}

// DELETE — remove a product
export async function DELETE(req: NextRequest) {
  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: "Server nicht konfiguriert" }, { status: 500 })

  const productId = req.nextUrl.searchParams.get("productId")
  if (!productId) return NextResponse.json({ error: "productId fehlt" }, { status: 400 })

  const { error } = await supabase.from("partner_products").delete().eq("id", productId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
