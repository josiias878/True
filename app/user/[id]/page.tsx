"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import AuthGuard from "@/components/AuthGuard"
import BottomNav from "@/components/BottomNav"
import { supabase } from "@/lib/supabase"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"

interface UserProfile {
  id: string
  vorname?: string
  bio?: string
  avatar?: string
  stadt?: string
  isPublic?: boolean
}

interface Post {
  id: number
  title: string
  body: string
  topic: string
  img?: string
  likes: number
  time: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)    return "gerade eben"
  if (diff < 3_600_000)  return `vor ${Math.floor(diff / 60_000)} Min.`
  if (diff < 86_400_000) return `vor ${Math.floor(diff / 3_600_000)} Std.`
  return `vor ${Math.floor(diff / 86_400_000)} Tag(en)`
}

export default function UserProfilePage() {
  const { id } = useParams() as { id: string }
  const { user } = useSupabaseAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [savingVisibility, setSavingVisibility] = useState(false)

  useEffect(() => {
    if (!id || !supabase) return
    setIsOwnProfile(user?.id === id)

    async function load() {
      setLoading(true)

      // Load profile
      const { data: prof } = await supabase!
        .from("profiles")
        .select("id, vorname, bio, avatar, stadt, is_public")
        .eq("id", id)
        .single()

      if (!prof) { setLoading(false); return }

      const profileData: UserProfile = {
        id: prof.id,
        vorname: prof.vorname ?? undefined,
        bio: prof.bio ?? undefined,
        avatar: prof.avatar ?? "🧑",
        stadt: prof.stadt ?? undefined,
        isPublic: prof.is_public !== false, // default public
      }
      setProfile(profileData)
      setIsPublic(profileData.isPublic ?? true)

      // Only load posts if public or own profile
      if (profileData.isPublic || user?.id === id) {
        const { data: postData } = await supabase!
          .from("posts")
          .select("id, title, text, tag, img_url, created_at, likes")
          .eq("user_id", id)
          .eq("type", "community")
          .order("created_at", { ascending: false })
          .limit(50)

        if (postData) {
          setPosts(postData.map(row => ({
            id: row.id,
            title: row.title ?? "",
            body: row.text ?? "",
            topic: row.tag ?? "bewusst",
            img: row.img_url ?? undefined,
            likes: row.likes ?? 0,
            time: timeAgo(row.created_at),
          })))
        }
      }

      setLoading(false)
    }

    load()
  }, [id, user?.id])

  async function toggleVisibility() {
    if (!supabase || !user) return
    setSavingVisibility(true)
    const next = !isPublic
    await supabase.from("profiles").update({ is_public: next }).eq("id", user.id)
    setIsPublic(next)
    setSavingVisibility(false)
  }

  if (loading) return (
    <AuthGuard>
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AuthGuard>
  )

  if (!profile) return (
    <AuthGuard>
      <div style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 80 }}>
        <div style={{ fontSize: 40 }}>🔍</div>
        <p style={{ fontWeight: 700 }}>Profil nicht gefunden</p>
        <Link href="/community" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>← Zur Community</Link>
      </div>
      <BottomNav />
    </AuthGuard>
  )

  const displayName = profile.vorname || "Nutzer"
  const handle = profile.vorname ? `@${profile.vorname.toLowerCase().replace(/\s/g, ".")}` : `@user`

  return (
    <AuthGuard>
    <div style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 90 }}>

      {/* Nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--nav-bg)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, padding: "0 1rem", height: 56 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "6px 4px", fontWeight: 600, fontSize: "0.88rem" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
        </button>
        <span style={{ fontWeight: 700, fontSize: "1rem" }}>{displayName}</span>
        {isOwnProfile && (
          <button
            onClick={toggleVisibility}
            disabled={savingVisibility}
            style={{ marginLeft: "auto", background: isPublic ? "rgba(46,204,138,0.1)" : "rgba(255,68,85,0.1)", border: `1px solid ${isPublic ? "rgba(46,204,138,0.3)" : "rgba(255,68,85,0.3)"}`, borderRadius: 8, padding: "5px 12px", color: isPublic ? "var(--accent)" : "#ff4455", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}
          >
            {savingVisibility ? "⏳" : isPublic ? "🌐 Öffentlich" : "🔒 Privat"}
          </button>
        )}
      </header>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 0" }}>

        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #1A9E6A)", padding: 2, flexShrink: 0 }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
              {profile.avatar}
            </div>
          </div>
          <div style={{ flex: 1, paddingTop: 6 }}>
            <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{displayName}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 1 }}>{handle}</div>
            {profile.stadt && <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: 3 }}>📍 {profile.stadt}</div>}
            {profile.bio && <div style={{ fontSize: "0.82rem", color: "var(--text)", marginTop: 6, lineHeight: 1.5 }}>{profile.bio}</div>}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px", textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--accent)" }}>{posts.length}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 2 }}>Beiträge</div>
          </div>
          <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px", textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--accent)" }}>{posts.reduce((sum, p) => sum + p.likes, 0)}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 2 }}>Likes erhalten</div>
          </div>
          {isOwnProfile && (
            <Link href="/profile" style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px", textAlign: "center", textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--accent)" }}>✏️ Bearbeiten</div>
            </Link>
          )}
        </div>

        {/* Private profile gate */}
        {!isPublic && !isOwnProfile && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Dieses Profil ist privat</p>
            <p style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>Nur der Inhaber kann seine Beiträge sehen.</p>
          </div>
        )}

        {/* Posts */}
        {(isPublic || isOwnProfile) && (
          <>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {posts.length > 0 ? `${posts.length} Beiträge` : "Noch keine Beiträge"}
            </div>
            {posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-dim)" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✍️</div>
                <p style={{ fontSize: "0.88rem" }}>
                  {isOwnProfile ? "Du hast noch keine Beiträge geschrieben." : "Noch keine Beiträge."}
                </p>
                {isOwnProfile && (
                  <Link href="/community" style={{ display: "inline-block", marginTop: 12, background: "var(--accent)", color: "#000", borderRadius: 10, padding: "9px 20px", fontWeight: 700, textDecoration: "none", fontSize: "0.88rem" }}>
                    ✏️ Jetzt posten
                  </Link>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {posts.map(post => (
                  <Link key={post.id} href="/community" style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                      {post.img && (
                        <img src={post.img} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} />
                      )}
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)", marginBottom: 4, lineHeight: 1.35 }}>{post.title}</div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.5, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.body}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.72rem", color: "var(--text-dim)" }}>
                          <span>🕐 {post.time}</span>
                          <span>❤️ {post.likes}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

      </div>
      <BottomNav />
    </div>
    </AuthGuard>
  )
}
