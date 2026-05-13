"use client"
import React, { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { ThemeToggle, ThemeIcon } from "@/components/ThemeProvider"
import BottomNav from "@/components/BottomNav"
import NotificationBell from "@/components/NotificationBell"
import AuthModal from "@/components/AuthModal"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"
import { supabase } from "@/lib/supabase"

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000)   return "gerade eben"
  if (diff < 3_600_000) return `vor ${Math.floor(diff / 60_000)} Min.`
  if (diff < 86_400_000) return `vor ${Math.floor(diff / 3_600_000)} Std.`
  return `vor ${Math.floor(diff / 86_400_000)} Tag(en)`
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TOPICS = [
  { id: "all",      name: "Alle",             icon: "🌐", color: "#2ECC8A" },
  { id: "palmoil",  name: "Palmöl-Frei",      icon: "🌳", color: "#2ECC8A",  desc: "Produkte ohne Palmöl entdecken & austauschen" },
  { id: "plastik",  name: "Plastikfrei",       icon: "🌊", color: "#44aaff",  desc: "Verpackungsfreie Alternativen und Tipps" },
  { id: "wasser",   name: "Wasserrechte",      icon: "💧", color: "#66ccff",  desc: "Gegen Wassermonopole — Alternativen zu Nestlé & Co." },
  { id: "bio",      name: "Regional & Bio",    icon: "🌿", color: "#88ff66",  desc: "Lokale Produzenten und Bio-Alternativen" },
  { id: "chemfrei", name: "Chemikalien-Check", icon: "☠️", color: "#cc66ff",  desc: "PFAS, Glyphosat & Co. erkennen und vermeiden" },
  { id: "bewusst",  name: "Bewusst Leben",     icon: "✨", color: "#ffcc00",  desc: "Allgemeiner Austausch rund um nachhaltigen Konsum" },
]

interface Post {
  id: number; author: string; avatar: string; time: string
  title: string; body: string; topic: string
  likes: number; comments: number; liked: boolean
  img?: string
  isExample?: boolean
}

interface Comment {
  id: string; author: string; avatar: string; text: string; time: string
  replies?: Comment[]
}

const SEED_POSTS: Post[] = [
  // ── Palmöl-Frei ──────────────────────────────────────────────────────────
  {
    id: 1, author: "Marie K.", avatar: "M", time: "vor 2 Std.", isExample: true,
    title: "Palmöl-freie Schokocreme — endlich eine Lösung!",
    body: "Nach Wochen der Suche habe ich diese Woche 'Nocciolata Bio' von Rigoni di Asiago gefunden. Gleicher Geschmack, kein Palmöl, fairer Preis (~4,50€). Findet ihr im Bioladen oder bei Rewe.",
    topic: "palmoil", likes: 47, comments: 12, liked: false,
  },
  {
    id: 11, author: "Kai F.", avatar: "K", time: "vor 1 Tag", isExample: true,
    title: "Diese 8 Produkte enthalten verstecktes Palmöl 🌴",
    body: "Ich habe mal einen Supermarkt-Einkauf komplett durchleuchtet. Überraschung: Palmöl steckt auch in Margarine, Chips, Fertigsuppen und sogar in manchen Shampoos. Liste mit palmölfreien Alternativen im Kommentar.",
    topic: "palmoil", likes: 83, comments: 21, liked: false,
  },

  // ── Plastikfrei ───────────────────────────────────────────────────────────
  {
    id: 12, author: "Anna W.", avatar: "A", time: "vor 3 Std.", isExample: true,
    title: "Plastikfrei einkaufen — mein Starter-Kit 🛍",
    body: "Drei Dinge haben meinen Einkauf komplett verändert: 1) Netz-Beutel statt Plastikbeutel (2€ bei dm), 2) Glasbehälter für Aufschnitt an der Theke, 3) festes Shampoo statt Flasche. Ergebnis: 90% weniger Plastikmüll.",
    topic: "plastik", likes: 128, comments: 34, liked: false,
  },
  {
    id: 13, author: "Nils P.", avatar: "N", time: "vor 2 Tagen", isExample: true,
    title: "Unverpackt-Läden in Deutschland — eine Übersicht 📍",
    body: "Ich habe alle mir bekannten Unverpackt-Läden in einer Liste zusammengefasst. Berlin (12), Hamburg (7), München (5), Köln (4)... Kommentiert gerne euren Ort — ich ergänze ständig!",
    topic: "plastik", likes: 94, comments: 47, liked: false,
  },

  // ── Wasserrechte ──────────────────────────────────────────────────────────
  {
    id: 5, author: "Lena B.", avatar: "L", time: "vor 2 Tagen", isExample: true,
    title: "Leitungswasser vs. Flaschenwasser — der große Check",
    body: "Stiftung Warentest: Leitungswasser ist in Deutschland oft besser als Flaschenwasser. Hier die Details — und warum wir trotzdem Millionen für Nestlé & Evian ausgeben.",
    topic: "wasser", likes: 167, comments: 29, liked: false,
  },
  {
    id: 14, author: "Clara S.", avatar: "C", time: "vor 4 Tagen", isExample: true,
    title: "Petition: Nestlé-Wasserentnahme in Bayern stoppen 💧",
    body: "Nestlé entnimmt in Bad Aibling täglich 24 Mio. Liter Quellwasser für ~0,0009 Cent/Liter — und verkauft es für 50 Cent. Gleichzeitig kämpfen Gemeinden ums Trinkwasser. Link zur Petition im Kommentar.",
    topic: "wasser", likes: 312, comments: 88, liked: false,
  },

  // ── Regional & Bio ────────────────────────────────────────────────────────
  {
    id: 6, author: "Tom H.", avatar: "T", time: "vor 3 Tagen", isExample: true,
    title: "Regional kaufen in München — meine Top 5 Märkte",
    body: "Wochenmärkte, Hofläden und Bioläden in München die ich persönlich teste und empfehle. Alle ohne Konzern-Produkte, alle mit transparenten Lieferketten.",
    topic: "bio", likes: 91, comments: 18, liked: false,
  },
  {
    id: 15, author: "Rosa E.", avatar: "R", time: "vor 5 Tagen", isExample: true,
    title: "Bio vs. konventionell — wann lohnt es sich wirklich? 🌿",
    body: "Nicht alles Bio ist gleich gut, nicht alles Konventionell ist gleich schlecht. Ich habe 12 Produkte verglichen: Wo der Aufpreis sich lohnt (Obst, Blattgemüse, Milch) und wo nicht (Tiefkühlerbsen, Salz, Zucker).",
    topic: "bio", likes: 145, comments: 42, liked: false,
  },

  // ── Chemikalien-Check ─────────────────────────────────────────────────────
  {
    id: 4, author: "Felix M.", avatar: "F", time: "vor 1 Tag", isExample: true,
    title: "Glyphosat in Haferflocken nachgewiesen — was tun?",
    body: "Eine neue Studie zeigt Glyphosat-Rückstände in 14 von 20 deutschen Haferflocken-Marken. Ich liste hier die sicheren Marken auf die getestet wurden.",
    topic: "chemfrei", likes: 203, comments: 55, liked: false,
  },
  {
    id: 16, author: "Mia D.", avatar: "M", time: "vor 3 Tagen", isExample: true,
    title: "PFAS in meiner Pfanne — was ich getan habe ☠️",
    body: "Meine 3 Jahre alte Teflon-Pfanne hatte Kratzer — ich dachte nichts dabei. Dann las ich über PFAS. Jetzt habe ich auf Edelstahl gewechselt. Hier was ich gelernt habe und wie man sicher abbaut, welche Pfannen wirklich sicher sind.",
    topic: "chemfrei", likes: 176, comments: 39, liked: false,
  },

  // ── Bewusst Leben ─────────────────────────────────────────────────────────
  {
    id: 2, author: "Jonas R.", avatar: "J", time: "vor 5 Std.", isExample: true,
    title: "Nestlé Produkte identifizieren — vollständige Liste",
    body: "Ich habe eine Übersicht aller Nestlé-Marken zusammengestellt die man im deutschen Supermarkt findet. Schaut mal ob ihr etwas davon kauft und postet eure Alternative darunter.",
    topic: "bewusst", likes: 134, comments: 38, liked: false,
  },
  {
    id: 3, author: "Sara L.", avatar: "S", time: "vor 1 Tag", isExample: true,
    title: "30 Tage ohne Konzern-Produkte — mein Ergebnis",
    body: "30 Tage lang habe ich konsequent auf alle Produkte von Nestlé, Unilever und Bayer verzichtet. Was ich gelernt habe: Es ist einfacher als man denkt — wenn man TRUE benutzt. Hier meine Erfahrungen.",
    topic: "bewusst", likes: 289, comments: 71, liked: false,
  },
]

const USER_POSTS_KEY    = "true-community-user-posts"
const LIKES_KEY         = "true-post-likes-v1"
const DELETED_POSTS_KEY = "true-deleted-post-ids"

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const { user } = useSupabaseAuth()
  const [showLogin, setShowLogin]     = useState(false)
  const [activeTopic, setActiveTopic] = useState("all")
  const [sortMode, setSortMode]       = useState<"neu" | "beliebt">("neu")
  const [posts, setPosts]             = useState<Post[]>(SEED_POSTS)
  const [myName, setMyName]           = useState("Du")
  const [showNew, setShowNew]         = useState(false)
  const [newTitle, setNewTitle]       = useState("")
  const [newBody, setNewBody]         = useState("")
  const [newTopic, setNewTopic]       = useState("bewusst")
  const [newImg, setNewImg]           = useState<string | null>(null)
  const [joined, setJoined]           = useState<Set<string>>(new Set())
  const [openComments, setOpenComments]   = useState<Set<number>>(new Set())
  const [postComments, setPostComments]   = useState<Record<number, Comment[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({})
  const [postLikes, setPostLikes]         = useState<Record<number, string[]>>({})
  const [showLikesFor, setShowLikesFor]   = useState<number | null>(null)
  const [replyingTo, setReplyingTo]       = useState<{postId: number; commentId: string} | null>(null)
  const [replyInputs, setReplyInputs]     = useState<Record<string, string>>({})
  const scrollRef  = useRef<HTMLDivElement>(null)
  const photoRef   = useRef<HTMLInputElement>(null)

  // ── Load local data + name ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("true-profile") || "{}")
      setMyName(p.vorname || p.name || "Du")
    } catch {}
    try {
      const j = localStorage.getItem("true-joined-communities")
      if (j) setJoined(new Set(JSON.parse(j)))
    } catch {}
    try {
      const c = localStorage.getItem("true-community-comments")
      if (c) setPostComments(JSON.parse(c))
    } catch {}
    try {
      const lk = localStorage.getItem(LIKES_KEY)
      if (lk) setPostLikes(JSON.parse(lk))
    } catch {}
  }, [])

  // ── Load community posts from Supabase (+ seed posts als Fallback) ───────────
  useEffect(() => {
    async function loadPosts() {
      const deleted: number[] = (() => {
        try { return JSON.parse(localStorage.getItem(DELETED_POSTS_KEY) || "[]") } catch { return [] }
      })()

      if (!supabase) {
        // Fallback: nur localStorage + seeds
        try {
          const up = localStorage.getItem(USER_POSTS_KEY)
          const userPosts: Post[] = up ? JSON.parse(up) : []
          const visibleSeeds = SEED_POSTS.filter(p => !deleted.includes(p.id))
          setPosts([...userPosts.filter(p => !deleted.includes(p.id)), ...visibleSeeds])
        } catch {}
        return
      }

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("type", "community")
        .order("created_at", { ascending: false })
        .limit(100)

      if (error || !data) {
        // Supabase error → show local + seeds
        try {
          const up = localStorage.getItem(USER_POSTS_KEY)
          const userPosts: Post[] = up ? JSON.parse(up) : []
          const visibleSeeds = SEED_POSTS.filter(p => !deleted.includes(p.id))
          setPosts([...userPosts.filter(p => !deleted.includes(p.id)), ...visibleSeeds])
        } catch {}
        return
      }

      // Map Supabase rows → Post shape
      const remotePosts: Post[] = data
        .filter(row => !deleted.includes(row.id))
        .map(row => ({
          id: row.id,
          author: row.author_name ?? "Anonym",
          avatar: row.author_avatar ?? "?",
          time: timeAgo(row.created_at),
          title: row.title ?? "",
          body: row.text ?? "",
          topic: row.tag ?? "bewusst",
          likes: row.likes ?? 0,
          comments: 0,
          liked: false,
          img: row.img_url ?? undefined,
        }))

      // Seed posts are always shown (unless deleted)
      const visibleSeeds = SEED_POSTS.filter(p => !deleted.includes(p.id))
      // Merge: remote first, then seeds
      setPosts([...remotePosts, ...visibleSeeds])
    }

    loadPosts()
  }, []) // runs once on mount

  // ── Mark user's own likes ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !supabase) return
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const likedIds = new Set(data.map((r: any) => r.post_id))
        setPosts(prev => prev.map(p => likedIds.has(p.id) ? { ...p, liked: true } : p))
      })
  }, [user?.id])

  // ── Realtime: Like-Zähler live aktualisieren wenn andere Nutzer liken ────────
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel("posts-likes-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const updated = payload.new as { id: number; likes: number }
          setPosts(prev => prev.map(p =>
            p.id === updated.id ? { ...p, likes: updated.likes ?? p.likes } : p
          ))
        }
      )
      .subscribe()
    return () => { supabase?.removeChannel(channel) }
  }, [])

  const filtered = activeTopic === "all" ? posts : posts.filter(p => p.topic === activeTopic)
  const sorted   = [...filtered].sort((a, b) =>
    sortMode === "beliebt" ? b.likes - a.likes : b.id - a.id
  )

  function like(id: number) {
    if (!user) { setShowLogin(true); return }
    const me = myName
    const currentPost = posts.find(p => p.id === id)
    const isCurrentlyLiked = currentPost?.liked ?? false
    const currentLikes = currentPost?.likes ?? 0
    const isSeedPost = SEED_POSTS.some(p => p.id === id)

    // Optimistic UI update — sofort sichtbar, kein Warten auf DB
    setPosts(ps => ps.map(p => p.id === id ? { ...p, likes: p.liked ? p.likes - 1 : p.likes + 1, liked: !p.liked } : p))

    // Supabase likes für echte Posts: post_likes + posts.likes-Spalte aktualisieren
    if (user && supabase && !isSeedPost) {
      const nextLikes = isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1
      if (isCurrentlyLiked) {
        supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id).then(() => {})
      } else {
        supabase.from("post_likes").insert({ post_id: id, user_id: user.id }).then(() => {})
      }
      supabase.from("posts").update({ likes: nextLikes }).eq("id", id).then(() => {})
    }

    // localStorage likes for seed posts (or fallback)
    if (isSeedPost) {
      setPostLikes(prev => {
        const current = prev[id] ?? []
        const next = { ...prev, [id]: current.includes(me) ? current.filter(n => n !== me) : [...current, me] }
        try { localStorage.setItem(LIKES_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    }
  }

  function deletePost(id: number) {
    const isSeedPost = SEED_POSTS.some(p => p.id === id)
    // Delete from Supabase (only own non-seed posts)
    if (!isSeedPost && user && supabase) {
      supabase.from("posts").delete().eq("id", id).eq("user_id", user.id).then(() => {})
    }
    // Remove from localStorage user posts
    try {
      const saved: Post[] = JSON.parse(localStorage.getItem(USER_POSTS_KEY) || "[]")
      localStorage.setItem(USER_POSTS_KEY, JSON.stringify(saved.filter(p => p.id !== id)))
    } catch {}
    // Blacklist deleted IDs (so they don't reappear)
    try {
      const deleted: number[] = JSON.parse(localStorage.getItem(DELETED_POSTS_KEY) || "[]")
      if (!deleted.includes(id)) {
        localStorage.setItem(DELETED_POSTS_KEY, JSON.stringify([...deleted, id]))
      }
    } catch {}
    setPosts(ps => ps.filter(p => p.id !== id))
  }

  function deleteComment(postId: number, commentId: string) {
    setPostComments(prev => {
      const next = { ...prev, [postId]: (prev[postId] ?? []).filter(c => c.id !== commentId) }
      try { localStorage.setItem("true-community-comments", JSON.stringify(next)) } catch {}
      return next
    })
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, comments: Math.max(0, p.comments - 1) } : p))
  }

  function toggleComments(postId: number) {
    setOpenComments(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      return next
    })
  }

  function addComment(postId: number) {
    const text = commentInputs[postId]?.trim()
    if (!text) return
    const comment: Comment = {
      id: Date.now().toString(),
      author: myName,
      avatar: myName[0]?.toUpperCase() || "D",
      text,
      time: "gerade eben",
    }
    setPostComments(prev => {
      const next = { ...prev, [postId]: [...(prev[postId] ?? []), comment] }
      try { localStorage.setItem("true-community-comments", JSON.stringify(next)) } catch {}
      return next
    })
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p))
    setCommentInputs(prev => ({ ...prev, [postId]: "" }))
  }

  function addReply(postId: number, commentId: string) {
    const key  = `${postId}-${commentId}`
    const text = replyInputs[key]?.trim()
    if (!text) return
    const reply: Comment = {
      id: Date.now().toString(),
      author: myName,
      avatar: myName[0]?.toUpperCase() || "D",
      text,
      time: "gerade eben",
    }
    setPostComments(prev => {
      const next = {
        ...prev,
        [postId]: (prev[postId] ?? []).map(c =>
          c.id === commentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c
        ),
      }
      try { localStorage.setItem("true-community-comments", JSON.stringify(next)) } catch {}
      return next
    })
    setReplyInputs(prev => ({ ...prev, [key]: "" }))
    setReplyingTo(null)
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setNewImg(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function submit() {
    if (!newTitle.trim() || !newBody.trim()) return

    const topicColor = TOPICS.find(t => t.id === newTopic)?.color ?? "#2ECC8A"
    let postId = Date.now()

    // Save to Supabase if logged in
    if (user && supabase) {
      const { data } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          author_name: myName,
          author_avatar: myName[0]?.toUpperCase() || "?",
          type: "community",
          tag: newTopic,
          tag_color: topicColor,
          title: newTitle.trim(),
          text: newBody.trim(),
          img_url: newImg ?? null,
        })
        .select("id")
        .single()
      if (data?.id) postId = data.id
    }

    const newPost: Post = {
      id: postId,
      author: myName,
      avatar: myName[0]?.toUpperCase() || "?",
      time: "gerade eben",
      title: newTitle.trim(),
      body: newBody.trim(),
      topic: newTopic,
      likes: 0, comments: 0, liked: false,
      img: newImg ?? undefined,
    }

    setPosts(ps => {
      const next = [newPost, ...ps]
      // Only save non-Supabase posts to localStorage (for fallback)
      if (!user || !supabase) {
        try {
          const userPosts = next.filter(p => !p.isExample)
          localStorage.setItem(USER_POSTS_KEY, JSON.stringify(userPosts))
        } catch {}
      }
      return next
    })
    setNewTitle(""); setNewBody(""); setNewImg(null); setShowNew(false)
  }

  const activeTopic_ = TOPICS.find(t => t.id === activeTopic)!

  function toggleJoin(id: string) {
    setJoined(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem("true-joined-communities", JSON.stringify([...next]))
      return next
    })
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 80 }}>
      {showLogin && <AuthModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}

      {/* NAV */}
      <nav style={{ borderBottom: "1px solid var(--border)", background: "var(--nav-bg)", backdropFilter: "blur(20px)", padding: "0 1.25rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/home" style={{ fontSize: "1.2rem", fontWeight: 900, letterSpacing: "-0.05em", color: "var(--accent)", textDecoration: "none" }}>TRUE</Link>
        <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>Community</span>
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <ThemeIcon />
          <NotificationBell />
        </div>
      </nav>

      {/* Topic filter pills — horizontal scroll */}
      <div ref={scrollRef} style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", position: "sticky", top: 56, zIndex: 50, background: "var(--nav-bg)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(12px)" }}>
        {TOPICS.map(t => {
          const active = activeTopic === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTopic(t.id)}
              style={{
                flexShrink: 0,
                background: active ? t.color : "var(--surface)",
                color: active ? "#000" : "var(--text-dim)",
                border: `1px solid ${active ? t.color : "var(--border)"}`,
                borderRadius: 99, padding: "6px 14px",
                fontWeight: active ? 700 : 500, fontSize: "0.82rem",
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {t.icon} {t.name}
            </button>
          )
        })}
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 16px 0" }}>

        {/* New post button + sort toggle */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
          <button
            onClick={() => user ? setShowNew(v => !v) : setShowLogin(true)}
            style={{ flex: 1, background: showNew ? "var(--surface)" : "var(--accent)", color: showNew ? "var(--text-dim)" : "#000", border: `1px solid ${showNew ? "var(--border)" : "var(--accent)"}`, borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}
          >
            {showNew ? "✕ Abbrechen" : "✏️ Beitrag schreiben"}
          </button>
          {/* Sort toggle */}
          <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
            {(["neu", "beliebt"] as const).map(m => (
              <button key={m} onClick={() => setSortMode(m)} style={{ padding: "8px 12px", fontSize: "0.75rem", fontWeight: sortMode === m ? 700 : 500, background: sortMode === m ? "var(--accent)" : "transparent", color: sortMode === m ? "#000" : "var(--text-dim)", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
                {m === "neu" ? "🕐 Neu" : "🔥 Top"}
              </button>
            ))}
          </div>

          {/* Join current topic */}
          {activeTopic !== "all" && (
            <button
              onClick={() => toggleJoin(activeTopic)}
              style={{ background: joined.has(activeTopic) ? `${activeTopic_?.color}18` : "var(--surface)", border: `1px solid ${joined.has(activeTopic) ? `${activeTopic_?.color}40` : "var(--border)"}`, borderRadius: 12, padding: "10px 14px", color: joined.has(activeTopic) ? activeTopic_?.color : "var(--text-dim)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {joined.has(activeTopic) ? "✓ Dabei" : "+ Folgen"}
            </button>
          )}
        </div>

        {/* New post form */}
        {showNew && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 12 }}>Neuen Beitrag erstellen</div>
            <select value={newTopic} onChange={e => setNewTopic(e.target.value)} style={{ width: "100%", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", color: "var(--text)", fontSize: "0.88rem", marginBottom: 10, outline: "none" }}>
              {TOPICS.filter(t => t.id !== "all").map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </select>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titel…" style={{ width: "100%", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", color: "var(--text)", fontSize: "0.9rem", marginBottom: 10, outline: "none", boxSizing: "border-box", display: "block" }} />
            <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Dein Beitrag…" rows={3} style={{ width: "100%", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", color: "var(--text)", fontSize: "0.88rem", outline: "none", resize: "vertical", fontFamily: "inherit", display: "block", marginBottom: 10, boxSizing: "border-box" }} />

            {/* Photo upload */}
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            {newImg ? (
              <div style={{ position: "relative", marginBottom: 12 }}>
                <img src={newImg} alt="Vorschau" style={{ width: "100%", maxHeight: "180px", objectFit: "cover", borderRadius: 10, display: "block" }} />
                <button onClick={() => setNewImg(null)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            ) : (
              <button onClick={() => photoRef.current?.click()} style={{ width: "100%", background: "var(--background)", border: "1px dashed var(--border)", borderRadius: 10, padding: "10px", color: "var(--text-dim)", fontSize: "0.82rem", cursor: "pointer", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                📷 Foto hinzufügen (optional)
              </button>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={submit} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>Veröffentlichen</button>
              <button onClick={() => { setShowNew(false); setNewImg(null) }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: "0.9rem" }}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Active topic header — Reddit Subreddit style */}
        {activeTopic !== "all" && activeTopic_.desc && (
          <div style={{ background: `${activeTopic_.color}0d`, border: `1px solid ${activeTopic_.color}25`, borderRadius: 16, marginBottom: 14, overflow: "hidden" }}>
            {/* Banner stripe */}
            <div style={{ height: 5, background: `linear-gradient(90deg, ${activeTopic_.color}, ${activeTopic_.color}44)` }} />
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${activeTopic_.color}22`, border: `2px solid ${activeTopic_.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem", flexShrink: 0 }}>
                {activeTopic_.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, color: activeTopic_.color, fontSize: "1rem" }}>t/{activeTopic_.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 2, lineHeight: 1.45 }}>{activeTopic_.desc}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", fontWeight: 600 }}>
                    👥 {sorted.length} Beiträge
                  </span>
                  <span style={{ fontSize: "0.7rem", color: joined.has(activeTopic) ? activeTopic_.color : "var(--text-dim)", fontWeight: 700 }}>
                    {joined.has(activeTopic) ? "✓ Beigetreten" : "Community"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => toggleJoin(activeTopic)}
                style={{ background: joined.has(activeTopic) ? "transparent" : activeTopic_.color, color: joined.has(activeTopic) ? activeTopic_.color : "#000", border: `1px solid ${activeTopic_.color}`, borderRadius: 99, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}
              >{joined.has(activeTopic) ? "✓ Dabei" : "+ Folgen"}</button>
            </div>
          </div>
        )}

        {/* Posts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map(post => {
            const topic = TOPICS.find(t => t.id === post.topic)!
            return (
              <article key={post.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                  {/* Beispiel banner */}
                  {post.isExample && (
                    <div style={{ background: "rgba(255,204,0,0.07)", borderBottom: "1px solid rgba(255,204,0,0.18)", padding: "4px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.6rem", color: "#ffcc00", fontWeight: 700 }}>📌 BEISPIEL</span>
                      <span style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>Schreib deinen ersten Beitrag!</span>
                    </div>
                  )}

                  {/* Meta row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px 4px", flexWrap: "wrap" }}>
                    <span style={{ background: `${topic.color}14`, color: topic.color, borderRadius: 99, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 800 }}>
                      {topic.icon} {topic.name}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>· von</span>
                    <span style={{ fontWeight: 700, fontSize: "0.75rem" }}>{post.author}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{post.time}</span>
                    {!post.isExample && (
                      <button onClick={() => deletePost(post.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,68,85,0.45)", cursor: "pointer", fontSize: "0.9rem", padding: "0 4px", lineHeight: 1 }}>×</button>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: "0 12px 8px" }}>
                    <h3 style={{ fontWeight: 700, fontSize: "0.92rem", margin: "0 0 5px", lineHeight: 1.35, color: "var(--text)" }}>{post.title}</h3>
                    {post.img && <img src={post.img} alt="" style={{ width: "100%", maxHeight: "180px", objectFit: "cover", borderRadius: 8, marginBottom: 8, display: "block" }} />}
                    <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", lineHeight: 1.6, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: openComments.has(post.id) ? 999 : 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.body}</p>
                  </div>

                {/* Inline comment section */}
                {openComments.has(post.id) && (
                  <div style={{ borderTop: "1px solid var(--border)", marginBottom: 10, paddingTop: 10, padding: "10px 16px 0" }}>
                    {/* Existing comments */}
                    {(postComments[post.id] ?? []).length === 0 && (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: 8, textAlign: "center" }}>
                        Sei der Erste, der kommentiert! 👇
                      </div>
                    )}
                    {(postComments[post.id] ?? []).length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
                        {(postComments[post.id] ?? []).map(c => {
                          const replyKey = `${post.id}-${c.id}`
                          const isReplying = replyingTo?.postId === post.id && replyingTo?.commentId === c.id
                          return (
                            <div key={c.id}>
                              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, flexShrink: 0 }}>
                                  {c.avatar}
                                </div>
                                <div style={{ flex: 1, background: "var(--background)", borderRadius: "0 12px 12px 12px", padding: "6px 10px" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                                    <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>{c.author} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>{c.time}</span></span>
                                    {c.author === myName && (
                                      <button onClick={() => deleteComment(post.id, c.id)} style={{ background: "none", border: "none", color: "rgba(255,68,85,0.5)", cursor: "pointer", fontSize: "0.8rem", padding: "0 2px", lineHeight: 1 }}>×</button>
                                    )}
                                  </div>
                                  <div style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.5 }}>{c.text}</div>
                                  <button
                                    onClick={() => setReplyingTo(isReplying ? null : { postId: post.id, commentId: c.id })}
                                    style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.68rem", fontWeight: 600, cursor: "pointer", padding: "2px 0", marginTop: 4 }}
                                  >
                                    ↩ Antworten
                                  </button>
                                </div>
                              </div>

                              {/* Nested replies */}
                              {(c.replies ?? []).length > 0 && (
                                <div style={{ marginLeft: 36, marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                                  {(c.replies ?? []).map(r => (
                                    <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(46,204,138,0.2)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 800, flexShrink: 0 }}>
                                        {r.avatar}
                                      </div>
                                      <div style={{ flex: 1, background: "var(--background)", borderRadius: "0 10px 10px 10px", padding: "5px 9px" }}>
                                        <div style={{ fontSize: "0.68rem", fontWeight: 700, marginBottom: 1 }}>{r.author} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>{r.time}</span></div>
                                        <div style={{ fontSize: "0.78rem", color: "var(--text)", lineHeight: 1.45 }}>{r.text}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reply input */}
                              {isReplying && (
                                <div style={{ marginLeft: 36, marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                                  <input
                                    autoFocus
                                    value={replyInputs[replyKey] ?? ""}
                                    onChange={e => setReplyInputs(prev => ({ ...prev, [replyKey]: e.target.value }))}
                                    onKeyDown={e => e.key === "Enter" && addReply(post.id, c.id)}
                                    placeholder={`Antwort an ${c.author}…`}
                                    style={{ flex: 1, background: "var(--background)", border: "1px solid var(--accent)", borderRadius: 99, padding: "6px 12px", color: "var(--text)", fontSize: "0.78rem", outline: "none" }}
                                  />
                                  <button onClick={() => addReply(post.id, c.id)} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontWeight: 700, flexShrink: 0, fontSize: "0.8rem" }}>→</button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {/* Comment input */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={commentInputs[post.id] ?? ""}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && addComment(post.id)}
                        placeholder="Kommentar schreiben…"
                        style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 99, padding: "7px 14px", color: "var(--text)", fontSize: "0.82rem", outline: "none" }}
                      />
                      <button
                        onClick={() => addComment(post.id)}
                        style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontWeight: 700, flexShrink: 0, fontSize: "0.9rem" }}
                      >→</button>
                    </div>
                  </div>
                )}

                {/* Actions — Reddit style bottom bar */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "0 8px 10px", borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => like(post.id)}
                      style={{ background: post.liked ? "rgba(46,204,138,0.12)" : "transparent", border: `1px solid ${post.liked ? "rgba(46,204,138,0.3)" : "transparent"}`, borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", color: post.liked ? "var(--accent)" : "var(--text-dim)", fontSize: "0.78rem", fontWeight: post.liked ? 700 : 500, transition: "all 0.15s" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={post.liked ? "var(--accent)" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      {post.likes}
                    </button>
                    {/* Who liked — show on long press / click count */}
                    {(postLikes[post.id]?.length ?? 0) > 0 && (
                      <button
                        onClick={() => setShowLikesFor(showLikesFor === post.id ? null : post.id)}
                        style={{ background: "none", border: "none", fontSize: "0.62rem", color: "var(--text-dim)", cursor: "pointer", padding: "0 0 0 4px", display: "block", marginTop: 2 }}
                      >
                        {postLikes[post.id].slice(0,2).join(", ")}{postLikes[post.id].length > 2 ? ` +${postLikes[post.id].length - 2}` : ""} ♥
                      </button>
                    )}
                    {showLikesFor === post.id && (postLikes[post.id]?.length ?? 0) > 0 && (
                      <div style={{ position: "absolute", bottom: "110%", left: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", zIndex: 50, minWidth: 140, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", animation: "dropIn 0.15s ease" }}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>❤️ Gefällt</div>
                        {postLikes[post.id].map(name => (
                          <div key={name} style={{ fontSize: "0.78rem", color: "var(--text)", padding: "2px 0" }}>{name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleComments(post.id)}
                    style={{ background: openComments.has(post.id) ? "rgba(46,204,138,0.1)" : "var(--background)", border: `1px solid ${openComments.has(post.id) ? "rgba(46,204,138,0.3)" : "var(--border)"}`, borderRadius: 99, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", color: openComments.has(post.id) ? "var(--accent)" : "var(--text-dim)", fontSize: "0.82rem", transition: "all 0.15s" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {(postComments[post.id]?.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0) ?? 0) + post.comments}
                  </button>
                  <button
                    onClick={() => { if (navigator.share) navigator.share({ title: post.title, text: post.body }) }}
                    style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--text-dim)", fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                    Teilen
                  </button>
                </div>
              </article>
            )
          })}

          {sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-dim)" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✍️</div>
              <p style={{ fontWeight: 600 }}>Noch keine Beiträge hier.</p>
              <p style={{ fontSize: "0.82rem" }}>Sei der Erste und teile deine Erfahrungen!</p>
            </div>
          )}
        </div>
      </div>

      {joined.size > 0 && (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "12px 16px 0" }}>
          <div style={{ background: "rgba(46,204,138,0.07)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700 }}>✓ Du folgst:</span>
            {[...joined].map(id => {
              const t = TOPICS.find(x => x.id === id)
              return t ? (
                <span key={id} style={{ background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}33`, borderRadius: 99, padding: "2px 10px", fontSize: "0.72rem", fontWeight: 600 }}>
                  {t.icon} {t.name}
                </span>
              ) : null
            })}
            <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text-dim)" }}>Beiträge erscheinen im Feed</span>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}
