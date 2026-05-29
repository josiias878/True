"use client"
import BottomNav from "@/components/BottomNav"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const TRUE_CHANNEL_ID = "true"
const ACCENT = "#2ECC8A"

interface TruePost {
  id: number
  type: string
  tag: string
  tagColor: string
  title?: string
  text: string
  source?: string
  img?: string
  likes: number
  createdAt: number
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return "Gerade eben"
  if (diff < 3_600_000) return `Vor ${Math.floor(diff / 60_000)} Min.`
  if (diff < 86_400_000) return `Vor ${Math.floor(diff / 3_600_000)} Std.`
  return `Vor ${Math.floor(diff / 86_400_000)} Tag${Math.floor(diff / 86_400_000) === 1 ? "" : "en"}`
}

const AUTHOR_META: Record<string, { name: string; emoji: string; color: string; title: string }> = {
  bot:    { name: "TRUE Bot", emoji: "📰", color: "#2ECC8A", title: "Automatische Recherche" },
  eva:    { name: "Julia",    emoji: "✍️", color: "#ffaa00", title: "Allgemeine Redaktion" },
  markus: { name: "Markus",  emoji: "⚡", color: "#fb923c", title: "Sportwissenschaftler" },
  sara:   { name: "Sara",    emoji: "🥗", color: "#44aaff", title: "Ernährungsberaterin" },
  tom:    { name: "Tom",     emoji: "📋", color: "#cc66ff", title: "Verbraucherschutz" },
}
function postAvatar(type: string) { return AUTHOR_META[type]?.emoji ?? "📡" }
function postFirstName(type: string) { return (AUTHOR_META[type]?.name ?? "TRUE Redaktion").split(" ")[0] }
function postName(type: string)   { return AUTHOR_META[type]?.name ?? "TRUE Redaktion" }
function postTitle(type: string)  { return AUTHOR_META[type]?.title ?? "TRUE Team" }
function postColor(type: string)  { return AUTHOR_META[type]?.color ?? ACCENT }

// ── Instagram-style vertical post viewer ─────────────────────────────────────
function PostFeed({
  posts, startIndex, liked, onToggleLike,
  comments, onAddComment, onClose,
}: {
  posts: TruePost[]
  startIndex: number
  liked: Set<number>
  onToggleLike: (id: number) => void
  comments: Record<number, { text: string; time: number }[]>
  onAddComment: (id: number, text: string) => void
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [commentInput, setCommentInput] = useState<Record<number, string>>({})
  const [showComments, setShowComments] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (containerRef.current && startIndex > 0) {
      const el = containerRef.current.children[startIndex] as HTMLElement
      if (el) el.scrollIntoView({ behavior: "instant" })
    }
  }, [startIndex])

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "var(--background)", overflowY: "auto", overscrollBehavior: "contain" }}
    >
      <button
        onClick={onClose}
        style={{ position: "fixed", top: 14, left: 14, zIndex: 310, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.1rem" }}
      >←</button>

      {posts.map(post => {
        const isLiked = liked.has(post.id)
        const postComments = comments[post.id] ?? []
        const isCommentsOpen = showComments.has(post.id)

        return (
          <div key={post.id} style={{ maxWidth: 480, margin: "0 auto", borderBottom: "8px solid var(--surface-2)" }}>
            {/* Author row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 10px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: postColor(post.type) + "20", border: `1.5px solid ${postColor(post.type)}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>
                {postAvatar(post.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text)" }}>{postFirstName(post.type)}</div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>{postTitle(post.type)} · {timeAgo(post.createdAt)}</div>
              </div>
              <span style={{ background: post.tagColor + "18", color: post.tagColor, border: `1px solid ${post.tagColor}33`, borderRadius: 20, padding: "3px 10px", fontSize: "0.68rem", fontWeight: 700 }}>{post.tag}</span>
            </div>

            {post.img && (
              <img src={post.img} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
            )}

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px 6px" }}>
              <button
                onClick={() => onToggleLike(post.id)}
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: isLiked ? "#ff4466" : "var(--text-dim)", fontSize: "1.3rem", padding: 0, transition: "transform 0.15s", transform: isLiked ? "scale(1.2)" : "scale(1)" }}
              >{isLiked ? "❤️" : "🤍"}</button>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dim)", marginLeft: -8 }}>{(post.likes + (isLiked ? 1 : 0)) || ""}</span>

              <button
                onClick={() => setShowComments(prev => { const n = new Set(prev); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: "1.2rem", padding: 0 }}
              >💬</button>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-dim)", marginLeft: -8 }}>{postComments.length || ""}</span>
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
                      <div>
                        <span style={{ fontSize: "0.8rem", color: "var(--text)", lineHeight: 1.5 }}>{c.text}</span>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: 2 }}>{timeAgo(c.time)}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: ACCENT + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 }}>🧑</div>
                    <input
                      value={commentInput[post.id] ?? ""}
                      onChange={e => setCommentInput(p => ({ ...p, [post.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === "Enter" && (commentInput[post.id] ?? "").trim()) {
                          onAddComment(post.id, commentInput[post.id].trim())
                          setCommentInput(p => ({ ...p, [post.id]: "" }))
                        }
                      }}
                      placeholder="Kommentar hinzufügen…"
                      style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 14px", fontSize: "0.82rem", outline: "none", color: "var(--text)" }}
                    />
                    {(commentInput[post.id] ?? "").trim() && (
                      <button
                        onClick={() => { onAddComment(post.id, commentInput[post.id].trim()); setCommentInput(p => ({ ...p, [post.id]: "" })) }}
                        style={{ background: ACCENT, color: "#000", border: "none", borderRadius: 20, padding: "7px 14px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
                      >Senden</button>
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

// ── TRUE Channel Page ─────────────────────────────────────────────────────────
export default function TrueChannelPage() {
  const router = useRouter()
  const [posts, setPosts]               = useState<TruePost[]>([])
  const [loading, setLoading]           = useState(true)
  const [followed, setFollowed]         = useState(false)
  const [followerCount, setFollowerCount] = useState<number | null>(null)
  const [openPostIndex, setOpenPostIndex] = useState<number | null>(null)
  const [liked, setLiked]               = useState<Set<number>>(new Set())
  const [comments, setComments]         = useState<Record<number, { text: string; time: number }[]>>({})

  useEffect(() => {
    // Auto-follow TRUE channel on first visit
    try {
      const raw = localStorage.getItem("true-followed-channels")
      const arr: string[] = raw ? JSON.parse(raw) : []
      if (!arr.includes(TRUE_CHANNEL_ID)) {
        arr.push(TRUE_CHANNEL_ID)
        localStorage.setItem("true-followed-channels", JSON.stringify(arr))
      }
      setFollowed(true)
    } catch {}

    try {
      const lk = localStorage.getItem(`channel-likes-${TRUE_CHANNEL_ID}`)
      if (lk) setLiked(new Set(JSON.parse(lk)))
    } catch {}
    try {
      const cm = localStorage.getItem(`channel-comments-${TRUE_CHANNEL_ID}`)
      if (cm) setComments(JSON.parse(cm))
    } catch {}

    // Echte Follower-Zahl von API holen
    fetch("/api/channel-follow?channel=true")
      .then(r => r.json())
      .then(d => { if (d.followers) setFollowerCount(d.followers) })
      .catch(() => {})

    if (!supabase) { setLoading(false); return }
    supabase
      .from("posts")
      .select("id, type, tag, tag_color, title, text, source, img_url, likes, created_at")
      .in("type", ["bot", "eva", "markus", "sara", "tom"])
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) {
          setPosts(data.map((p: {id:number;type:string;tag:string;tag_color:string;title:string|null;text:string;source:string|null;img_url:string|null;likes:number;created_at:string}) => ({
            id: p.id,
            type: p.type,
            tag: p.tag ?? "",
            tagColor: p.tag_color ?? ACCENT,
            title: p.title ?? undefined,
            text: p.text ?? "",
            source: p.source ?? undefined,
            img: p.img_url ?? undefined,
            likes: p.likes ?? 0,
            createdAt: new Date(p.created_at).getTime(),
          })))
        }
        setLoading(false)
      })
  }, [])

  function toggleFollow() {
    setFollowed(f => {
      const next = !f
      try {
        const raw = localStorage.getItem("true-followed-channels")
        const arr: string[] = raw ? JSON.parse(raw) : []
        const updated = next ? [...new Set([...arr, TRUE_CHANNEL_ID])] : arr.filter(c => c !== TRUE_CHANNEL_ID)
        localStorage.setItem("true-followed-channels", JSON.stringify(updated))
      } catch {}
      // Follower-Zahl sofort anpassen + Supabase sync (fire-and-forget)
      setFollowerCount(prev => (prev ?? 0) + (next ? 1 : -1))
      if (supabase) {
        supabase.auth.getSession().then(({ data }) => {
          const uid = data.session?.user?.id
          if (uid) {
            fetch("/api/channel-follow", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ channel: TRUE_CHANNEL_ID, userId: uid, action: next ? "follow" : "unfollow" }),
            }).catch(() => {})
          }
        })
      }
      return next
    })
  }

  function toggleLike(postId: number) {
    setLiked(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      try { localStorage.setItem(`channel-likes-${TRUE_CHANNEL_ID}`, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function addComment(postId: number, text: string) {
    setComments(prev => {
      const next = { ...prev, [postId]: [...(prev[postId] ?? []), { text, time: Date.now() }] }
      try { localStorage.setItem(`channel-comments-${TRUE_CHANNEL_ID}`, JSON.stringify(next)) } catch {}
      return next
    })
  }

  return (
      <div style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 80 }}>

        {/* Header */}
        <header style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--nav-bg)", backdropFilter: "blur(24px)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, padding: "0 1.25rem", height: 56 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", padding: "4px 8px 4px 0", fontSize: "1.1rem" }}>←</button>
          <span style={{ fontWeight: 800, fontSize: "1rem", flex: 1 }}>TRUE Offiziell</span>
          <span style={{ fontSize: "1rem", fontWeight: 900, letterSpacing: "-0.06em", color: ACCENT }}>TRUE</span>
        </header>

        <div style={{ maxWidth: 480, margin: "0 auto" }}>

          {/* Profile header */}
          <div style={{ padding: "24px 20px 16px" }}>
            <div style={{ height: 4, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}44)`, borderRadius: 2, marginBottom: 20 }} />

            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
              {/* Avatar — TRUE Logo */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", border: `3px solid ${ACCENT}`, overflow: "hidden", boxShadow: `0 0 24px ${ACCENT}33`, background: "#000" }}>
                  <img src="/true-logo.jpg" alt="TRUE" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ position: "absolute", bottom: 2, right: 2, width: 22, height: 22, borderRadius: "50%", background: ACCENT, border: "2.5px solid var(--background)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 900, color: "#000" }}>✓</div>
              </div>

              {/* Stats — Instagram-Style: Beiträge · Follower · Gefolgt */}
              <div style={{ flex: 1, display: "flex", justifyContent: "space-around", paddingTop: 8 }}>
                {[
                  { label: "Beiträge",  value: posts.length > 0 ? posts.length.toString() : (loading ? "…" : "0") },
                  { label: "Follower",  value: followerCount !== null ? followerCount.toLocaleString("de-DE") : "…" },
                  { label: "Gefolgt",   value: "0" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "var(--text)", lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Name + bio */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 800, fontSize: "1rem" }}>TRUE Offiziell</span>
                <span style={{ background: ACCENT + "18", color: ACCENT, border: `1px solid ${ACCENT}33`, borderRadius: 4, padding: "2px 7px", fontSize: "0.58rem", fontWeight: 800 }}>OFFIZIELL</span>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.55, margin: 0 }}>
                Täglich neue Recherchen, Fakten & Hintergründe — von Julia, Markus, Sara, Tom und dem TRUE Bot.
              </p>
            </div>

            {/* Follow + Back */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={toggleFollow}
                style={{ flex: 1, background: followed ? "transparent" : ACCENT, color: followed ? "var(--text)" : "#000", border: `1px solid ${followed ? "var(--border)" : ACCENT}`, borderRadius: 10, padding: "9px 0", fontWeight: 800, fontSize: "0.88rem", cursor: "pointer", transition: "all 0.15s" }}
              >
                {followed ? "✓ Gefolgt" : "Folgen"}
              </button>
              <button
                onClick={() => router.back()}
                style={{ flex: 1, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 0", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}
              >
                ← Zurück
              </button>
            </div>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "0 20px 2px" }} />

          {/* 3-Column Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTop: `3px solid ${ACCENT}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : posts.length === 0 ? (
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
                    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8, gap: 5 }}>
                      <span style={{ fontSize: "1.5rem" }}>{postAvatar(post.type)}</span>
                      <span style={{ background: post.tagColor + "33", color: post.tagColor, borderRadius: 4, padding: "2px 6px", fontSize: "0.55rem", fontWeight: 800, textAlign: "center", lineHeight: 1.3 }}>{post.tag}</span>
                    </div>
                  )}
                  {liked.has(post.id) && (
                    <div style={{ position: "absolute", top: 6, right: 6, fontSize: "0.75rem" }}>❤️</div>
                  )}
                  {post.title && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", padding: "16px 6px 6px", background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
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

        {/* Vertical post viewer */}
        {openPostIndex !== null && (
          <PostFeed
            posts={posts}
            startIndex={openPostIndex}
            liked={liked}
            onToggleLike={toggleLike}
            comments={comments}
            onAddComment={addComment}
            onClose={() => setOpenPostIndex(null)}
          />
        )}

        <BottomNav />
      </div>
  )
}
