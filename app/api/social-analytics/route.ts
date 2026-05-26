import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Analytics von Plattformen holen ───────────────────────────────────────────

async function getInstagramAnalytics(postId: string): Promise<Record<string, number>> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) return {}
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${postId}/insights?metric=impressions,reach,likes_count,comments_count,saved&access_token=${token}`
  )
  const data = await res.json()
  if (!data.data) return {}
  const result: Record<string, number> = {}
  for (const item of data.data) result[item.name] = item.values?.[0]?.value ?? 0
  return result
}

async function getLinkedInAnalytics(postId: string): Promise<Record<string, number>> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  if (!token) return {}
  const res = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postId)}`,
    { headers: { "Authorization": `Bearer ${token}` } }
  )
  const data = await res.json()
  return {
    likes: data.likesSummary?.totalLikes ?? 0,
    comments: data.commentsSummary?.totalFirstLevelComments ?? 0,
  }
}

// ── GET: Analytics für alle geposteten Posts aktualisieren ────────────────────

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "true"

  // Posts mit platform_post_id laden
  const { data: posts, error } = await supabase
    .from("social_posts")
    .select("id, platform, platform_post_id, analytics")
    .eq("status", "posted")
    .not("platform_post_id", "is", null)
    .order("posted_at", { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!refresh) {
    // Nur gespeicherte Analytics zurückgeben (kein API-Call)
    return NextResponse.json({ posts: posts ?? [] })
  }

  // Analytics aktualisieren
  const updated = []
  for (const post of posts ?? []) {
    try {
      let analytics: Record<string, number> = {}
      if (post.platform === "instagram") analytics = await getInstagramAnalytics(post.platform_post_id)
      if (post.platform === "linkedin")  analytics = await getLinkedInAnalytics(post.platform_post_id)

      if (Object.keys(analytics).length > 0) {
        await supabase.from("social_posts")
          .update({ analytics, analytics_updated_at: new Date().toISOString() })
          .eq("id", post.id)
        updated.push({ id: post.id, analytics })
      }
    } catch {}
  }

  return NextResponse.json({ updated, total: updated.length })
}

// ── POST: Übersichts-Statistiken ──────────────────────────────────────────────

export async function POST() {
  const { data: posts } = await supabase
    .from("social_posts")
    .select("platform, status, analytics, created_at")
    .order("created_at", { ascending: false })

  if (!posts) return NextResponse.json({ stats: {} })

  const stats: Record<string, {
    total: number; posted: number; failed: number; scheduled: number
    totalLikes: number; totalComments: number; totalReach: number
  }> = {}

  const platforms = ["instagram", "linkedin", "reddit"]
  for (const p of platforms) {
    const pp = posts.filter(x => x.platform === p)
    const analytics = pp.flatMap(x => x.analytics ? [x.analytics] : [])
    stats[p] = {
      total:     pp.length,
      posted:    pp.filter(x => x.status === "posted").length,
      failed:    pp.filter(x => x.status === "failed").length,
      scheduled: pp.filter(x => x.status === "scheduled").length,
      totalLikes:    analytics.reduce((s, a) => s + (a.likes ?? a.likes_count ?? 0), 0),
      totalComments: analytics.reduce((s, a) => s + (a.comments ?? a.comments_count ?? 0), 0),
      totalReach:    analytics.reduce((s, a) => s + (a.reach ?? 0), 0),
    }
  }

  return NextResponse.json({ stats, recentPosts: posts.slice(0, 10) })
}
