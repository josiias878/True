"use client"
import AuthGuard from "@/components/AuthGuard"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import BottomNav from "@/components/BottomNav"
import { CHANNEL_META, FeedPost } from "@/lib/feedData"
import { supabase } from "@/lib/supabase"
import { useEffect, useRef, useState } from "react"

function relativeTime(createdAt?: number): string {
  if (!createdAt) return ""
  const diff = Date.now() - createdAt
  if (diff < 60_000) return "Gerade eben"
  if (diff < 3_600_000) return `Vor ${Math.floor(diff / 60_000)} Min.`
  if (diff < 86_400_000) return `Vor ${Math.floor(diff / 3_600_000)} Std.`
  return `Vor ${Math.floor(diff / 86_400_000)} Tag${Math.floor(diff / 86_400_000) === 1 ? "" : "en"}`
}

// ── Post Detail Feed ─────────────────────────────────────────────────────────

function PostFeed({
  posts, startIndex, avatar, name, accentColor,
  liked, onToggleLike, comments, onAddComment, onClose,
}: {
  posts: FeedPost[]
  startIndex: number
  avatar: string
  name: string
  accentColor: string
  liked: Set<string|number>
  onToggleLike: (id: string|number) => void
  comments: Record<string|number, { text: string; time: number }[]>
  onAddComment: (id: string|number, text: string) => void
  onClose: () => void
}) {
  const [commentInput, setCommentInput] = useState<Record<string|number, string>>({})
  const [showComments, setShowComments] = useState<Set<string|number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to start post on mount
  useEffect(() => {
    if (containerRef.current && startIndex > 0) {
      const el = containerRef.current.children[startIndex] as HTMLElement
      if (el) el.scrollIntoView({ behavior: "instant" })
    }
  }, [startIndex])

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "var(--background)", overflowY: "auto", overscrollBehavior: "contain" }} ref={containerRef}>
      {/* Sticky back button */}
      <button
        onClick={onClose}
        style={{ position: "fixed", top: 14, left: 14, zIndex: 310, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.1rem" }}
      >←</button>

      {posts.map((post, idx) => {
        const isLiked = liked.has(post.id)
        const postComments = comments[post.id] ?? []
        const isCommentsOpen = showComments.has(post.id)
        const likeCount = (post.likes ?? 0) + (isLiked ? 1 : 0)

        return (
          <div key={post.id} style={{ maxWidth: 480, margin: "0 auto", borderBottom: "8px solid var(--surface-2)" }}>
            {/* Author row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 10px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: accentColor + "18", border: `1.5px solid ${accentColor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>
                {avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>{name}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{relativeTime(post.createdAt)}</div>
              </div>
              <span style={{ background: post.tagColor + "18", color: post.tagColor, border: `1px solid ${post.tagColor}33`, borderRadius: 20, padding: "3px 10px", fontSize: "0.68rem", fontWeight: 700 }}>{post.tag}</span>
            </div>

            {/* Image */}
            {post.img && (
              <img src={post.img} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
            )}

            {/* Action bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px 6px" }}>
              <button
                onClick={() => onToggleLike(post.id)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: isLiked ? "#ff4466" : "var(--text-dim)", fontSize: "1.3rem", padding: 0, transition: "transform 0.15s", transform: isLiked ? "scale(1.2)" : "scale(1)" }}
              >
                {isLiked ? "❤️" : "🤍"}
              </button>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dim)", marginLeft: -8 }}>{likeCount > 0 ? likeCount : ""}</span>

              <button
                onClick={() => setShowComments(prev => {
                  const next = new Set(prev)
                  next.has(post.id) ? next.delete(post.id) : next.add(post.id)
                  return next
                })}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "var(--text-dim)", fontSize: "1.2rem", padding: 0 }}
              >
                💬
              </button>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dim)", marginLeft: -8 }}>{postComments.length > 0 ? postComments.length : ""}</span>

              <button
                onClick={() => { if (navigator.share) navigator.share({ title: post.title ?? "", text: post.text, url: window.location.href }) }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: "1.2rem", padding: 0, marginLeft: "auto" }}
              >
                ↗
              </button>
            </div>

            {/* Caption */}
            <div style={{ padding: "0 16px 12px" }}>
              {post.title && <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: 5, color: "var(--text)", lineHeight: 1.35 }}>{post.title}</div>}
              <p style={{ fontSize: "0.85rem", lineHeight: 1.65, color: "var(--text)", margin: 0 }}>{post.text}</p>
              {post.source && <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontStyle: "italic", marginTop: 6 }}>Quelle: {post.source}</div>}
            </div>

            {/* Comments */}
            {isCommentsOpen && (
              <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                <div style={{ paddingTop: 12 }}>
                  {postComments.length === 0 && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", textAlign: "center", padding: "8px 0 12px" }}>Noch keine Kommentare</div>
                  )}
                  {postComments.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 }}>👤</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text)", lineHeight: 1.5 }}>{c.text}</span>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: 2 }}>{relativeTime(c.time)}</div>
                      </div>
                    </div>
                  ))}
                  {/* Input */}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: accentColor + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 }}>🧑</div>
                    <input
                      value={commentInput[post.id] ?? ""}
                      onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === "Enter" && (commentInput[post.id] ?? "").trim()) {
                          onAddComment(post.id, commentInput[post.id].trim())
                          setCommentInput(prev => ({ ...prev, [post.id]: "" }))
                        }
                      }}
                      placeholder="Kommentar hinzufügen…"
                      style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 14px", fontSize: "0.82rem", outline: "none", color: "var(--text)" }}
                    />
                    {(commentInput[post.id] ?? "").trim() && (
                      <button
                        onClick={() => {
                          onAddComment(post.id, commentInput[post.id].trim())
                          setCommentInput(prev => ({ ...prev, [post.id]: "" }))
                        }}
                        style={{ background: accentColor, color: "#000", border: "none", borderRadius: 20, padding: "7px 14px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        Senden
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      <div style={{ height: 80 }} />
    </div>
  )
}

// ── Channel Page ─────────────────────────────────────────────────────────────

export default function ChannelPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params.id === "string" ? params.id : ""

  const isUserChannel = id.startsWith("u-")
  const userId = isUserChannel ? id.slice(2) : ""

  const [userPosts, setUserPosts] = useState<FeedPost[]>([])
  const [userName, setUserName] = useState("")
  const [userAvatar, setUserAvatar] = useState("🧑")
  const [followed, setFollowed] = useState(false)
  const [openPostIndex, setOpenPostIndex] = useState<number | null>(null)
  const [liked, setLiked] = useState<Set<string|number>>(new Set())
  const [comments, setComments] = useState<Record<string|number, { text: string; time: number }[]>>({})

  const channel = CHANNEL_META[id]

  useEffect(() => {
    try {
      const fc = localStorage.getItem("true-followed-channels")
      if (fc) { const arr: string[] = JSON.parse(fc); setFollowed(arr.includes(id)) }
    } catch {}
    try {
      const lk = localStorage.getItem(`channel-likes-${id}`)
      if (lk) setLiked(new Set(JSON.parse(lk)))
    } catch {}
    try {
      const cm = localStorage.getItem(`channel-comments-${id}`)
      if (cm) setComments(JSON.parse(cm))
    } catch {}

    if (isUserChannel && supabase) {
      supabase.from("posts").select("*").eq("type", "user").eq("user_id", userId).order("created_at", { ascending: false }).limit(50)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setUserName(data[0].author_name)
            setUserAvatar(data[0].author_avatar)
            setUserPosts(data.map((p: any) => ({
              id: p.id, type: "user", avatar: p.author_avatar, name: p.author_name,
              time: "", createdAt: new Date(p.created_at).getTime(),
              tag: p.tag, tagColor: p.tag_color, text: p.text, likes: p.likes,
              img: p.img_url, user_id: p.user_id,
            })))
          }
        })
    }
  }, [id, isUserChannel, userId])

  function toggleFollow() {
    setFollowed(f => {
      const next = !f
      try {
        const fc = localStorage.getItem("true-followed-channels")
        const arr: string[] = fc ? JSON.parse(fc) : []
        const updated = next ? [...arr, id] : arr.filter(c => c !== id)
        localStorage.setItem("true-followed-channels", JSON.stringify(updated))
      } catch {}
      return next
    })
  }

  function toggleLike(postId: string|number) {
    setLiked(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      try { localStorage.setItem(`channel-likes-${id}`, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function addComment(postId: string|number, text: string) {
    setComments(prev => {
      const next = { ...prev, [postId]: [...(prev[postId] ?? []), { text, time: Date.now() }] }
      try { localStorage.setItem(`channel-comments-${id}`, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const posts = isUserChannel ? userPosts : (channel?.posts ?? [])
  const name = isUserChannel ? userName : channel?.name ?? "Kanal"
  const avatar = isUserChannel ? userAvatar : channel?.avatar ?? "👤"
  const bio = isUserChannel ? "TRUE Community Mitglied" : channel?.bio ?? ""
  const badge = isUserChannel ? "MITGLIED" : channel?.badge ?? ""
  const badgeColor = isUserChannel ? "#8888ff" : channel?.badgeColor ?? "#2ECC8A"
  const accentColor = isUserChannel ? "#8888ff" : channel?.accentColor ?? "#2ECC8A"
  const verified = !isUserChannel && channel?.verified

  if (!channel && !isUserChannel) {
    return (
      <AuthGuard>
        <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ fontSize: "3rem" }}>🔍</div>
          <div style={{ fontWeight: 700 }}>Kanal nicht gefunden</div>
          <Link href="/community" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>← Zur Community</Link>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 80 }}>

        {/* Header */}
        <header style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--nav-bg)", backdropFilter: "blur(24px)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, padding: "0 1.25rem", height: "56px" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: "4px 8px 4px 0", fontSize: "1.1rem" }}>←</button>
          <span style={{ fontWeight: 800, fontSize: "1rem", flex: 1 }}>{name}</span>
          <Link href="/home" style={{ fontSize: "1.1rem", fontWeight: 900, letterSpacing: "-0.06em", color: "var(--accent)", textDecoration: "none" }}>TRUE</Link>
        </header>

        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {/* Profile Header */}
          <div style={{ padding: "24px 20px 16px" }}>
            <div style={{ height: 4, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)`, borderRadius: 2, marginBottom: 20 }} />

            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: accentColor + "18", border: `3px solid ${accentColor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem", boxShadow: `0 0 20px ${accentColor}22` }}>
                  {avatar}
                </div>
                {verified && (
                  <div style={{ position: "absolute", bottom: 2, right: 2, width: 22, height: 22, borderRadius: "50%", background: accentColor, border: "2.5px solid var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 900, color: "#000" }}>✓</div>
                )}
              </div>

              <div style={{ flex: 1, display: "flex", justifyContent: "space-around", paddingTop: 12 }}>
                {[
                  { label: "Posts", value: posts.length },
                  { label: "Follower", value: followed ? "Du" : "—" },
                  { label: "Seit", value: "2024" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text)", lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: "1rem" }}>{name}</span>
                {badge && (
                  <span style={{ background: badgeColor + "18", color: badgeColor, border: `1px solid ${badgeColor}33`, borderRadius: 4, padding: "2px 7px", fontSize: "0.58rem", fontWeight: 800 }}>{badge}</span>
                )}
              </div>
              {bio && <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.55, margin: 0 }}>{bio}</p>}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={toggleFollow} style={{ flex: 1, background: followed ? "transparent" : accentColor, color: followed ? "var(--text)" : "#000", border: `1px solid ${followed ? "var(--border)" : accentColor}`, borderRadius: 10, padding: "9px 0", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer", transition: "all 0.15s" }}>
                {followed ? "✓ Gefolgt" : "Folgen"}
              </button>
              <Link href="/community" style={{ flex: 1, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 0", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                In Community
              </Link>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "0 20px 2px" }} />

          {/* Posts Grid */}
          {posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-dim)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📭</div>
              <div style={{ fontWeight: 600 }}>Noch keine Posts</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, padding: "2px 0" }}>
              {posts.map((post, idx) => (
                <div
                  key={post.id}
                  onClick={() => setOpenPostIndex(idx)}
                  style={{ aspectRatio: "1", background: post.img ? "var(--surface-2)" : (post.tagColor + "18"), overflow: "hidden", position: "relative", cursor: "pointer" }}
                >
                  {post.img ? (
                    <img src={post.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8, gap: 4 }}>
                      <span style={{ fontSize: "1.4rem" }}>{avatar}</span>
                      <span style={{ background: post.tagColor + "33", color: post.tagColor, borderRadius: 4, padding: "1px 6px", fontSize: "0.55rem", fontWeight: 800, textAlign: "center", lineHeight: 1.3 }}>{post.tag}</span>
                    </div>
                  )}
                  {/* Like indicator */}
                  {liked.has(post.id) && (
                    <div style={{ position: "absolute", top: 6, right: 6, fontSize: "0.75rem" }}>❤️</div>
                  )}
                  {post.title && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", padding: "16px 6px 6px", background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)" }}>
                        <p style={{ margin: 0, fontSize: "0.6rem", color: "#fff", fontWeight: 700, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {post.title}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instagram-style Post Feed */}
        {openPostIndex !== null && (
          <PostFeed
            posts={posts}
            startIndex={openPostIndex}
            avatar={avatar}
            name={name}
            accentColor={accentColor}
            liked={liked}
            onToggleLike={toggleLike}
            comments={comments}
            onAddComment={addComment}
            onClose={() => setOpenPostIndex(null)}
          />
        )}

        <BottomNav />
      </div>
    </AuthGuard>
  )
}
