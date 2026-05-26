import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Platform Poster ────────────────────────────────────────────────────────────

async function postToInstagram(content: string, imageUrl: string): Promise<{ id: string; url: string }> {
  const token    = process.env.INSTAGRAM_ACCESS_TOKEN
  const igUserId = process.env.INSTAGRAM_BUSINESS_ID
  if (!token || !igUserId) throw new Error("Instagram nicht konfiguriert — INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ID fehlen")

  // Schritt 1: Media-Container erstellen
  const mediaRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, caption: content, access_token: token }),
    }
  )
  const mediaData = await mediaRes.json()
  if (!mediaData.id) throw new Error(`Instagram Media-Container Fehler: ${JSON.stringify(mediaData)}`)

  // Schritt 2: Container veröffentlichen
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: mediaData.id, access_token: token }),
    }
  )
  const publishData = await publishRes.json()
  if (!publishData.id) throw new Error(`Instagram Publish Fehler: ${JSON.stringify(publishData)}`)

  return {
    id: publishData.id,
    url: `https://www.instagram.com/p/${publishData.id}/`,
  }
}

async function postToLinkedIn(content: string, imageUrl?: string): Promise<{ id: string; url: string }> {
  const token    = process.env.LINKEDIN_ACCESS_TOKEN
  const personId = process.env.LINKEDIN_PERSON_ID // urn:li:person:xxx oder urn:li:organization:xxx
  if (!token || !personId) throw new Error("LinkedIn nicht konfiguriert — LINKEDIN_ACCESS_TOKEN + LINKEDIN_PERSON_ID fehlen")

  const body: Record<string, unknown> = {
    author: personId,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
        ...(imageUrl && {
          media: [{
            status: "READY",
            description: { text: "TRUE App" },
            originalUrl: imageUrl,
          }],
        }),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  }

  const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`LinkedIn Fehler: ${JSON.stringify(data)}`)

  const postId = data.id?.split(":").pop() ?? data.id
  return {
    id: data.id,
    url: `https://www.linkedin.com/feed/update/${data.id}/`,
  }
}

async function postToReddit(content: string, imageUrl?: string, subreddit = "sustainability"): Promise<{ id: string; url: string }> {
  const clientId     = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET
  const username     = process.env.REDDIT_USERNAME
  const password     = process.env.REDDIT_PASSWORD
  if (!clientId || !clientSecret || !username || !password)
    throw new Error("Reddit nicht konfiguriert — REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD fehlen")

  // OAuth Token holen
  const authRes = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "TRUEApp/1.0",
    },
    body: new URLSearchParams({ grant_type: "password", username, password }),
  })
  const authData = await authRes.json()
  if (!authData.access_token) throw new Error(`Reddit Auth Fehler: ${JSON.stringify(authData)}`)

  // Post erstellen
  const postRes = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authData.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "TRUEApp/1.0",
    },
    body: new URLSearchParams({
      sr: subreddit,
      kind: imageUrl ? "image" : "self",
      title: content.split("\n")[0].slice(0, 300),
      text: content,
      url: imageUrl ?? "",
      resubmit: "true",
    }),
  })
  const postData = await postRes.json()
  const postId = postData?.jquery?.find((x: unknown[]) => Array.isArray(x) && x[3] === "call" && String(x[1]).includes("reddit.com"))?.[3] ?? "unknown"

  return {
    id: String(postData?.json?.data?.id ?? ""),
    url: `https://www.reddit.com/r/${subreddit}/`,
  }
}

// ── AI Caption Generator ───────────────────────────────────────────────────────

async function generateCaption(topic: string, platform: string, postType: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return topic

  const platformGuide: Record<string, string> = {
    instagram: "Instagram: kurz, emotional, 3-5 relevante Hashtags am Ende (#TRUEApp #Nachhaltigkeit #BewusstEinkaufen)",
    linkedin:  "LinkedIn: professionell, informativ, kein Hashtag-Spam, max 2 Hashtags",
    reddit:    "Reddit: authentisch, kein Marketing-Speak, informativ, Community-freundlich",
  }

  const typeGuide: Record<string, string> = {
    feature:  "Stelle eine App-Funktion vor, die das Leben einfacher und nachhaltiger macht",
    fact:     "Teile einen schockierenden Konzern-Fakt (Palmöl, Wasserraub, etc.) und biete eine Lösung an",
    tip:      "Gib einen konkreten Einkaufs-Tipp, der sofort umsetzbar ist",
    partner:  "Stelle ein nachhaltiges Partnerprodukt als echte Alternative vor",
    general:  "Teile eine inspirierende Nachricht über bewusstes Einkaufen",
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system: `Du bist Social Media Manager für TRUE — eine App die zeigt welcher Konzern hinter Produkten steckt und nachhaltige Alternativen empfiehlt.
Schreibe authentische, emotionale Posts die zum Handeln motivieren.
${platformGuide[platform] ?? ""}
${typeGuide[postType] ?? ""}
Antworte NUR mit dem Post-Text, keine Erklärungen.`,
      messages: [{ role: "user", content: `Thema: ${topic}` }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text ?? topic
}

// ── POST Handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { platforms, content, imageUrl, postType, topic, generateAI, scheduledAt, redditSubreddit } = await req.json()

  if (!platforms?.length) return NextResponse.json({ error: "Keine Plattform ausgewählt" }, { status: 400 })

  // AI Caption generieren falls gewünscht
  const finalContent = generateAI && topic
    ? await generateCaption(topic, platforms[0], postType ?? "general")
    : (content ?? "")

  if (!finalContent) return NextResponse.json({ error: "Kein Content angegeben" }, { status: 400 })

  // Scheduled? → In DB speichern und fertig
  if (scheduledAt) {
    const rows = platforms.map((p: string) => ({
      platform: p,
      status: "scheduled",
      content: finalContent,
      image_url: imageUrl ?? null,
      post_type: postType ?? "general",
      scheduled_at: scheduledAt,
    }))
    const { data, error } = await supabase.from("social_posts").insert(rows).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, scheduled: true, posts: data })
  }

  // Sofort posten
  const results: Record<string, { success: boolean; postId?: string; url?: string; error?: string }> = {}

  for (const platform of platforms) {
    try {
      let platformResult: { id: string; url: string }

      if (platform === "instagram") {
        if (!imageUrl) { results.instagram = { success: false, error: "Instagram braucht ein Bild" }; continue }
        platformResult = await postToInstagram(finalContent, imageUrl)
      } else if (platform === "linkedin") {
        platformResult = await postToLinkedIn(finalContent, imageUrl)
      } else if (platform === "reddit") {
        platformResult = await postToReddit(finalContent, imageUrl, redditSubreddit ?? "sustainability")
      } else {
        results[platform] = { success: false, error: "Unbekannte Plattform" }
        continue
      }

      // In DB speichern
      await supabase.from("social_posts").insert({
        platform,
        status: "posted",
        content: finalContent,
        image_url: imageUrl ?? null,
        post_type: postType ?? "general",
        platform_post_id: platformResult.id,
        platform_url: platformResult.url,
        posted_at: new Date().toISOString(),
      })

      results[platform] = { success: true, postId: platformResult.id, url: platformResult.url }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler"
      results[platform] = { success: false, error: msg }

      // Fehler in DB loggen
      await supabase.from("social_posts").insert({
        platform,
        status: "failed",
        content: finalContent,
        image_url: imageUrl ?? null,
        post_type: postType ?? "general",
        posted_at: new Date().toISOString(),
        error_msg: msg,
      })
    }
  }

  return NextResponse.json({ success: true, results, content: finalContent })
}

// ── GET: Posts aus DB laden ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const limit  = parseInt(req.nextUrl.searchParams.get("limit") ?? "50")
  const status = req.nextUrl.searchParams.get("status")

  let query = supabase
    .from("social_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data ?? [] })
}

// ── PATCH: Analytics updaten / Post-Status ändern ─────────────────────────────

export async function PATCH(req: NextRequest) {
  const { id, analytics, status } = await req.json()
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (analytics) { update.analytics = analytics; update.analytics_updated_at = new Date().toISOString() }
  if (status)    update.status = status

  const { error } = await supabase.from("social_posts").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
