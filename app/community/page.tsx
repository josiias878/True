"use client"
import React, { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { ThemeToggle, ThemeIcon } from "@/components/ThemeProvider"
import BottomNav from "@/components/BottomNav"
import FloatingAssistant from "@/components/FloatingAssistant"
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
  userId?: string
  createdAt?: number  // unix ms — for reliable "Neu" sorting
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

const USER_POSTS_KEY       = "true-community-user-posts"
const LIKES_KEY            = "true-post-likes-v1"
const DELETED_POSTS_KEY    = "true-deleted-post-ids"
const CUSTOM_TOPICS_KEY    = "true-custom-topics"
const SAVED_POSTS_KEY      = "true-saved-posts-v2"
const NOTIF_KEY            = "true-notifications-v2"
const NOTIF_DAY_KEY        = "true-notifications-v2-day"

// Push a notification directly into the local bell store
function pushLocalNotif(id: string, title: string, body: string, url = "/community") {
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    const current = raw ? JSON.parse(raw) : []
    // Deduplicate by id
    if (current.some((n: any) => n.id === id)) return
    const notif = { id, type: "community", title, body, url, time: Date.now(), read: false }
    const next = [notif, ...current].slice(0, 60)
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next))
    localStorage.setItem(NOTIF_DAY_KEY, String(Math.floor(Date.now() / 86_400_000)))
  } catch {}
}

interface CustomTopic { id: string; name: string; icon: string; color: string; desc: string }

const TOPIC_ICONS = ["🌿","🔬","🌍","💡","🏠","🐾","🌺","♻️","🧘","🍃","⚡","🫁","🧪","🌾","🤝","🦋"]
const TOPIC_COLORS = ["#2ECC8A","#44aaff","#ff9500","#cc66ff","#ff6b6b","#ffcc00","#66ccff","#88ff66","#ff8c69","#a8e6cf"]

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
  const [savedPostIds, setSavedPostIds]   = useState<Set<number>>(new Set())
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editTitle, setEditTitle]         = useState("")
  const [editBody, setEditBody]           = useState("")
  const [searchQuery, setSearchQuery]     = useState("")
  const [showSearch, setShowSearch]       = useState(false)
  const [searchMode, setSearchMode]       = useState<"profiles" | "communities">("profiles")
  const [profileResults, setProfileResults] = useState<{id: string; name: string; avatar: string}[]>([])
  const [customTopics, setCustomTopics]   = useState<CustomTopic[]>([])
  const [showNewCommunity, setShowNewCommunity] = useState(false)
  const [newCommunityName, setNewCommunityName] = useState("")
  const [newCommunityIcon, setNewCommunityIcon] = useState("🌿")
  const [newCommunityColor, setNewCommunityColor] = useState("#2ECC8A")
  const [newCommunityDesc, setNewCommunityDesc]   = useState("")
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
    try {
      const ct = localStorage.getItem(CUSTOM_TOPICS_KEY)
      if (ct) setCustomTopics(JSON.parse(ct))
    } catch {}
    try {
      const sp = localStorage.getItem(SAVED_POSTS_KEY)
      if (sp) {
        const parsed: { id: number }[] = JSON.parse(sp)
        setSavedPostIds(new Set(parsed.map(p => p.id)))
      }
    } catch {}
  }, [])

  // ── Load posts + apply liked state in one shot (no race condition) ───────────
  useEffect(() => {
    async function loadPosts() {
      const deleted: number[] = (() => {
        try { return JSON.parse(localStorage.getItem(DELETED_POSTS_KEY) || "[]") } catch { return [] }
      })()

      if (!supabase) {
        try {
          const up = localStorage.getItem(USER_POSTS_KEY)
          const userPosts: Post[] = up ? JSON.parse(up) : []
          const visibleSeeds = SEED_POSTS.filter(p => !deleted.includes(p.id))
          setPosts([...userPosts.filter(p => !deleted.includes(p.id)), ...visibleSeeds])
        } catch {}
        return
      }

      // Fetch posts + liked IDs in parallel
      const [postsResult, likesResult] = await Promise.all([
        supabase.from("posts").select("*").eq("type", "community").order("created_at", { ascending: false }).limit(100),
        user ? supabase.from("post_likes").select("post_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      ])

      const likedIds = new Set<number>((likesResult.data ?? []).map((r: any) => r.post_id))

      if (postsResult.error || !postsResult.data) {
        try {
          const up = localStorage.getItem(USER_POSTS_KEY)
          const userPosts: Post[] = up ? JSON.parse(up) : []
          const visibleSeeds = SEED_POSTS.filter(p => !deleted.includes(p.id))
          setPosts([...userPosts.filter(p => !deleted.includes(p.id)), ...visibleSeeds])
        } catch {}
        return
      }

      // Supabase hat erfolgreich geantwortet → alten localStorage leeren
      // (verhindert dass Posts vom alten Account / ohne Login-Session auftauchen)
      try { localStorage.removeItem(USER_POSTS_KEY) } catch {}

      const remotePosts: Post[] = postsResult.data
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
          liked: likedIds.has(row.id),
          img: row.img_url ?? undefined,
          userId: row.user_id ?? undefined,
          createdAt: new Date(row.created_at).getTime(),
        }))

      const visibleSeeds = SEED_POSTS.filter(p => !deleted.includes(p.id))
      setPosts([...remotePosts, ...visibleSeeds])
    }

    loadPosts()
  }, [user?.id]) // re-run when user logs in

  // ── Kommentar-Benachrichtigungen aus Supabase holen ─────────────────────────
  useEffect(() => {
    if (!user || !supabase) return
    supabase
      .from("posts")
      .select("id, title, text, author_name")
      .eq("type", "comment_notif")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data || data.length === 0) return
        // Push each into local notification bell
        data.forEach((row: any) => {
          pushLocalNotif(
            `comment-notif-${row.id}`,
            `💬 ${row.author_name ?? "Jemand"} hat kommentiert`,
            row.title ? `Auf deinen Beitrag „${row.title}"` : row.text ?? "",
          )
        })
        // Clean up — delete these notifications from Supabase so they don't repeat
        const ids = data.map((r: any) => r.id)
        supabase?.from("posts").delete().in("id", ids).then(() => {})
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

  const [visibleCount, setVisibleCount] = useState(20)

  const searched = posts
  // Topics that already have real user posts — example posts for those topics are hidden
  const realPostTopics = new Set(posts.filter(p => !p.isExample).map(p => p.topic))
  const baseFiltered = (activeTopic === "all" ? searched : searched.filter(p => p.topic === activeTopic))
    .filter(p => !p.isExample || !realPostTopics.has(p.topic))
  // Im "Alle"-View maximal 2 Beispiel-Posts zeigen (damit nicht 12 Seed-Posts alles überschwemmen)
  const filtered = (() => {
    if (activeTopic !== "all") return baseFiltered
    let seedCount = 0
    return baseFiltered.filter(p => {
      if (!p.isExample) return true
      seedCount++
      return seedCount <= 2
    })
  })()
  const sorted   = [...filtered].sort((a, b) =>
    sortMode === "beliebt"
      ? b.likes - a.likes
      : (b.createdAt ?? b.id) - (a.createdAt ?? a.id)
  )
  const visible  = user ? sorted.slice(0, visibleCount) : sorted.slice(0, 2)
  const hasMore  = sorted.length > visibleCount

  function like(id: number) {
    if (!user) { setShowLogin(true); return }
    const me = myName
    const currentPost = posts.find(p => p.id === id)
    const isCurrentlyLiked = currentPost?.liked ?? false
    const currentLikes = currentPost?.likes ?? 0
    const isSeedPost = SEED_POSTS.some(p => p.id === id)

    // Optimistic UI update — sofort sichtbar, kein Warten auf DB
    setPosts(ps => ps.map(p => p.id === id ? { ...p, likes: p.liked ? Math.max(0, p.likes - 1) : p.likes + 1, liked: !p.liked } : p))

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

  function startEdit(post: Post) {
    setEditingPostId(post.id)
    setEditTitle(post.title)
    setEditBody(post.body)
  }

  function saveEdit(postId: number) {
    const title = editTitle.trim()
    const body  = editBody.trim()
    if (!title || !body) return
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, title, body } : p))
    if (supabase && user) {
      supabase.from("posts").update({ title, text: body }).eq("id", postId).eq("user_id", user.id).then(() => {})
    }
    setEditingPostId(null)
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
    if (!user) { setShowLogin(true); return }
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

    // Benachrichtigung für Post-Besitzer (nur wenn es nicht der eigene Post ist)
    const post = posts.find(p => p.id === postId)
    if (post?.userId && user && post.userId !== user.id && supabase) {
      supabase.from("posts").insert({
        type: "comment_notif",
        user_id: post.userId,
        author_name: myName,
        title: post.title,
        text: text,
        tag: String(postId),
        tag_color: "#2ECC8A",
      }).then(() => {})
    }
  }

  function addReply(postId: number, commentId: string) {
    if (!user) { setShowLogin(true); return }
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
      createdAt: Date.now(),
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

  function toggleJoin(id: string) {
    setJoined(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem("true-joined-communities", JSON.stringify([...next]))
      return next
    })
  }

  function toggleSave(post: Post) {
    setSavedPostIds(prev => {
      const next = new Set(prev)
      if (next.has(post.id)) {
        next.delete(post.id)
      } else {
        next.add(post.id)
      }
      // Store full post content so profile can display it
      try {
        const existing: any[] = (() => {
          try { return JSON.parse(localStorage.getItem(SAVED_POSTS_KEY) || "[]") } catch { return [] }
        })()
        const filtered = existing.filter(p => p.id !== post.id)
        if (!prev.has(post.id)) {
          // saving — prepend full content
          filtered.unshift({ id: post.id, title: post.title, body: post.body, topic: post.topic, img: post.img, time: post.time, author: post.author })
        }
        localStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(filtered))
      } catch {}
      return next
    })
  }

  function createCommunity() {
    if (!user) { setShowNewCommunity(false); setShowLogin(true); return }
    const name = newCommunityName.trim()
    if (!name) return
    const id = `custom-${Date.now()}`
    const topic: CustomTopic = { id, name, icon: newCommunityIcon, color: newCommunityColor, desc: newCommunityDesc.trim() || `Austausch rund um ${name}` }
    const next = [...customTopics, topic]
    setCustomTopics(next)
    try { localStorage.setItem(CUSTOM_TOPICS_KEY, JSON.stringify(next)) } catch {}
    // auto-join the new community
    setJoined(prev => {
      const j = new Set(prev); j.add(id)
      localStorage.setItem("true-joined-communities", JSON.stringify([...j]))
      return j
    })
    setNewCommunityName(""); setNewCommunityDesc(""); setNewCommunityIcon("🌿"); setNewCommunityColor("#2ECC8A")
    setShowNewCommunity(false)
    setActiveTopic(id)
  }

  // Profile search
  async function searchProfiles(q: string) {
    if (!q.trim() || !supabase) { setProfileResults([]); return }
    const { data } = await supabase
      .from("profiles")
      .select("id, vorname, name, avatar, is_premium")
      .or(`vorname.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(20)
    if (data) {
      const mapped = data.map((r: any) => ({
        id: r.id,
        name: [r.vorname, r.name].filter(Boolean).join(" ") || "Nutzer",
        avatar: r.avatar || r.vorname?.[0]?.toUpperCase() || "?",
        isPremium: !!r.is_premium,
      }))
      // Premium users appear first
      mapped.sort((a: any, b: any) => (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0))
      setProfileResults(mapped.slice(0, 10))
    }
  }

  // Avatar color based on first letter (deterministic)
  function avatarColor(letter: string): string {
    const palette = ["#2ECC8A","#44aaff","#ff7700","#cc66ff","#ff6b6b","#ffcc00","#66ccff","#ff9500","#a8e6cf","#f7797d"]
    const idx = (letter.toUpperCase().charCodeAt(0) - 65) % palette.length
    return palette[Math.max(0, idx)]
  }

  // All topics (built-in + user-created)
  const allTopics = [
    ...TOPICS,
    ...customTopics.map(ct => ({ id: ct.id, name: ct.name, icon: ct.icon, color: ct.color, desc: ct.desc }))
  ]
  const activeTopic_ = allTopics.find(t => t.id === activeTopic) ?? allTopics[0]

  // Trending: count real (non-seed) posts per topic
  const topicCounts: Record<string, number> = {}
  posts.filter(p => !p.isExample).forEach(p => {
    topicCounts[p.topic] = (topicCounts[p.topic] ?? 0) + 1
  })
  const maxCount = Math.max(0, ...Object.values(topicCounts))
  const trendingTopicId = maxCount > 0 ? Object.entries(topicCounts).find(([,v]) => v === maxCount)?.[0] : null

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

      {/* ── Instagram-style Search Overlay ── */}
      {showSearch && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "var(--background)", display: "flex", flexDirection: "column" }}>
          {/* Search header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--nav-bg)", backdropFilter: "blur(20px)" }}>
            <button onClick={() => { setShowSearch(false); setSearchQuery(""); setProfileResults([]) }} style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", fontSize: "0.88rem", fontWeight: 700, padding: "4px 8px 4px 0", flexShrink: 0 }}>
              ← Zurück
            </button>
            <input autoFocus value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (searchMode === "profiles") searchProfiles(e.target.value) }}
              placeholder={searchMode === "profiles" ? "Person suchen…" : "Community suchen…"}
              style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 22, padding: "9px 16px", color: "var(--text)", fontSize: "0.9rem", outline: "none" }}
            />
          </div>
          {/* Mode tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            {(["profiles", "communities"] as const).map(m => (
              <button key={m} onClick={() => { setSearchMode(m); setSearchQuery(""); setProfileResults([]) }}
                style={{ flex: 1, background: "transparent", border: "none", borderBottom: `2px solid ${searchMode === m ? "var(--accent)" : "transparent"}`, color: searchMode === m ? "var(--accent)" : "var(--text-dim)", padding: "11px 0", fontSize: "0.82rem", fontWeight: searchMode === m ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                {m === "profiles" ? "👤 Profile" : "🏘 Communities"}
              </button>
            ))}
          </div>
          {/* Results */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Profile results */}
            {searchMode === "profiles" && !searchQuery && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>👤</div>
                Nutzernamen eingeben zum Suchen
              </div>
            )}
            {searchMode === "profiles" && searchQuery && profileResults.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: "0.82rem" }}>Keine Profile gefunden.</div>
            )}
            {searchMode === "profiles" && profileResults.map(p => {
              const av = avatarColor(p.avatar[0] || "?")
              return (
                <Link key={p.id} href={`/user/${p.id}`} onClick={() => { setShowSearch(false); setSearchQuery("") }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", textDecoration: "none", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: av + "22", border: `2px solid ${av}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", fontWeight: 800, color: av, flexShrink: 0 }}>
                    {p.avatar[0]?.toUpperCase() || "?"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>{p.name}</span>
                      {(p as any).isPremium && <span style={{ background: "linear-gradient(135deg,#ffd700,#ffaa00)", color: "#000", borderRadius: 99, padding: "1px 7px", fontSize: "0.6rem", fontWeight: 800 }}>👑</span>}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Profil ansehen</div>
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 700 }}>→</span>
                </Link>
              )
            })}
            {/* Community results */}
            {searchMode === "communities" && (
              <>
                {!searchQuery && (
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Alle Communities</div>
                )}
                {allTopics.filter(t => t.id !== "all" && (!searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))).map(t => (
                  <button key={t.id} onClick={() => { setActiveTopic(t.id); setShowSearch(false); setSearchQuery(""); setVisibleCount(20) }}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", textAlign: "left", width: "100%" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: t.color + "22", border: `2px solid ${t.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>
                      {t.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>{t.name}</div>
                      {t.desc && <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 1 }}>{t.desc.length > 55 ? t.desc.slice(0, 55) + "…" : t.desc}</div>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleJoin(t.id) }}
                      style={{ background: joined.has(t.id) ? "transparent" : t.color, color: joined.has(t.id) ? t.color : "#000", border: `1.5px solid ${t.color}`, borderRadius: 99, padding: "5px 12px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>
                      {joined.has(t.id) ? "✓ Dabei" : "+ Folgen"}
                    </button>
                  </button>
                ))}
                {searchQuery && allTopics.filter(t => t.id !== "all" && t.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: "0.82rem" }}>Keine Communities gefunden.</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Topic pills (sticky) — only joined communities shown */}
      <div style={{ position: "sticky", top: 56, zIndex: 50, background: "var(--nav-bg)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Scrollable pills */}
          <div ref={scrollRef} style={{ display: "flex", gap: 7, padding: "8px 12px", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", flex: 1 }}>
            {/* "Alle" pill always visible */}
            {(() => {
              const t = allTopics[0]
              const active = activeTopic === "all"
              return (
                <button key="all" onClick={() => { setActiveTopic("all"); setVisibleCount(20) }}
                  style={{ flexShrink: 0, background: active ? t.color : "var(--surface)", color: active ? "#000" : "var(--text-dim)", border: `1px solid ${active ? t.color : "var(--border)"}`, borderRadius: 99, padding: "5px 13px", fontWeight: active ? 700 : 500, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}>
                  🌐 Alle
                </button>
              )
            })()}
            {/* Only joined communities */}
            {allTopics.filter(t => t.id !== "all" && joined.has(t.id)).map(t => {
              const active = activeTopic === t.id
              const isTrending = t.id === trendingTopicId
              const count = topicCounts[t.id] ?? 0
              return (
                <button key={t.id} onClick={() => { setActiveTopic(t.id); setVisibleCount(20) }}
                  style={{ flexShrink: 0, background: active ? t.color : "var(--surface)", color: active ? "#000" : "var(--text-dim)", border: `1px solid ${active ? t.color : isTrending ? "rgba(255,119,0,0.4)" : "var(--border)"}`, borderRadius: 99, padding: "5px 13px", fontWeight: active ? 700 : 500, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}>
                  {t.icon} {t.name}
                  {isTrending && <span style={{ marginLeft: 4, fontSize: "0.68rem", fontWeight: 800, color: active ? "#000" : "#ff7700" }}>🔥{count}</span>}
                </button>
              )
            })}
            {/* Hint if no communities joined yet */}
            {allTopics.filter(t => t.id !== "all" && joined.has(t.id)).length === 0 && (
              <button onClick={() => { setShowSearch(true); setSearchMode("communities") }}
                style={{ flexShrink: 0, background: "transparent", color: "var(--text-dim)", border: "1px dashed var(--border)", borderRadius: 99, padding: "5px 13px", fontWeight: 500, fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                + Communities folgen
              </button>
            )}
          </div>
          {/* Search icon — outside scroll */}
          <button onClick={() => setShowSearch(true)}
            style={{ flexShrink: 0, padding: "8px 14px 8px 8px", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", display: "flex", alignItems: "center" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
      </div>

      {/* New Community Modal */}
      {showNewCommunity && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) setShowNewCommunity(false) }}>
          <div style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "90dvh", display: "flex", flexDirection: "column" }}>
            {/* sticky header */}
            <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontWeight: 800, fontSize: "1rem" }}>🏠 Community gründen</span>
              <button onClick={() => setShowNewCommunity(false)} style={{ background: "none", border: "none", fontSize: "1.3rem", color: "var(--text-dim)", cursor: "pointer", padding: 4 }}>✕</button>
            </div>
            </div>{/* end sticky header */}
            {/* scrollable body */}
            <div style={{ overflowY: "auto", flex: 1, padding: "0 20px" }}>
            {/* Icon picker */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 6, fontWeight: 600 }}>Icon wählen</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {TOPIC_ICONS.map(ic => (
                  <button key={ic} onClick={() => setNewCommunityIcon(ic)} style={{ width: 36, height: 36, borderRadius: 10, background: newCommunityIcon === ic ? "var(--accent)" : "var(--background)", border: `1.5px solid ${newCommunityIcon === ic ? "var(--accent)" : "var(--border)"}`, fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            {/* Color picker */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 6, fontWeight: 600 }}>Farbe wählen</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TOPIC_COLORS.map(col => (
                  <button key={col} onClick={() => setNewCommunityColor(col)} style={{ width: 28, height: 28, borderRadius: "50%", background: col, border: newCommunityColor === col ? "3px solid var(--text)" : "3px solid transparent", cursor: "pointer", flexShrink: 0 }} />
                ))}
              </div>
            </div>
            <input
              value={newCommunityName}
              onChange={e => setNewCommunityName(e.target.value)}
              placeholder="Name der Community…"
              maxLength={40}
              style={{ width: "100%", boxSizing: "border-box", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: "0.9rem", outline: "none", marginBottom: 10 }}
            />
            <input
              value={newCommunityDesc}
              onChange={e => setNewCommunityDesc(e.target.value)}
              placeholder="Kurze Beschreibung (optional)…"
              maxLength={100}
              style={{ width: "100%", boxSizing: "border-box", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: "0.88rem", outline: "none", marginBottom: 14 }}
            />
            {/* Preview */}
            {newCommunityName.trim() && (
              <div style={{ background: `${newCommunityColor}18`, border: `1px solid ${newCommunityColor}33`, borderRadius: 10, padding: "8px 12px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.2rem" }}>{newCommunityIcon}</span>
                <span style={{ fontWeight: 700, color: newCommunityColor, fontSize: "0.88rem" }}>{newCommunityName}</span>
              </div>
            )}
            </div>{/* end scrollable body */}
            {/* sticky footer button */}
            <div style={{ padding: "14px 20px 32px", flexShrink: 0, borderTop: "1px solid var(--border)" }}>
              <button onClick={createCommunity} disabled={!newCommunityName.trim()} style={{ width: "100%", background: newCommunityName.trim() ? "var(--accent)" : "var(--surface-2)", color: newCommunityName.trim() ? "#000" : "var(--text-dim)", border: "none", borderRadius: 12, padding: "13px", fontWeight: 800, fontSize: "0.95rem", cursor: newCommunityName.trim() ? "pointer" : "not-allowed" }}>
                Community erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 16px 0" }}>

        {/* Action bar: Schreiben · Community · Neu · Top */}
        <div style={{ display: "flex", gap: 7, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => user ? setShowNew(v => !v) : setShowLogin(true)}
            style={{ background: showNew ? "var(--surface)" : "rgba(46,204,138,0.12)", color: showNew ? "var(--text-dim)" : "var(--accent)", border: `1.5px solid ${showNew ? "var(--border)" : "rgba(46,204,138,0.4)"}`, borderRadius: 99, padding: "5px 13px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }}
          >
            {showNew ? "✕ Abbrechen" : "✏️ Schreiben"}
          </button>
          <button
            onClick={() => user ? setShowNewCommunity(true) : setShowLogin(true)}
            style={{ background: "transparent", color: "var(--text-dim)", border: "1.5px solid var(--border)", borderRadius: 99, padding: "5px 13px", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", flexShrink: 0 }}
          >
            🏠 Community
          </button>
          <div style={{ flex: 1 }} />
          {/* Sort toggle */}
          <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
            {(["neu", "beliebt"] as const).map(m => (
              <button key={m} onClick={() => { setSortMode(m); setVisibleCount(20) }} style={{ padding: "5px 12px", fontSize: "0.75rem", fontWeight: sortMode === m ? 700 : 500, background: sortMode === m ? "var(--accent)" : "transparent", color: sortMode === m ? "#000" : "var(--text-dim)", border: "none", cursor: "pointer", transition: "all 0.15s" }}>
                {m === "neu" ? "✨ Neu" : "🔥 Top"}
              </button>
            ))}
          </div>
        </div>

        {/* New post form */}
        {showNew && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 12 }}>Neuen Beitrag erstellen</div>
            <select value={newTopic} onChange={e => setNewTopic(e.target.value)} style={{ width: "100%", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", color: "var(--text)", fontSize: "0.88rem", marginBottom: 10, outline: "none" }}>
              {allTopics.filter(t => t.id !== "all").map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
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
          {visible.map(post => {
            const topic = allTopics.find(t => t.id === post.topic) ?? allTopics[0]
            const avColor = avatarColor(post.avatar)
            return (
              <article key={post.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", borderLeft: `3px solid ${topic.color}55` }}>
                  {/* Beispiel banner */}
                  {post.isExample && (
                    <div style={{ background: "rgba(255,204,0,0.06)", borderBottom: "1px solid rgba(255,204,0,0.15)", padding: "4px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.6rem", color: "#cc9900", fontWeight: 700, letterSpacing: "0.06em" }}>📌 BEISPIEL</span>
                      <span style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>Schreib deinen ersten Beitrag!</span>
                      <button
                        onClick={e => { e.stopPropagation(); deletePost(post.id) }}
                        style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1, padding: "0 2px" }}
                      >×</button>
                    </div>
                  )}

                  {/* Meta row — Avatar + Author + Topic chip */}
                  <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 14px 6px" }}>
                    {/* Avatar */}
                    {post.userId && !post.isExample ? (
                      <a href={`/user/${post.userId}`} onClick={e => e.stopPropagation()} style={{ textDecoration: "none", flexShrink: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: avColor + "22", border: `1.5px solid ${avColor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 800, color: avColor }}>
                          {post.avatar}
                        </div>
                      </a>
                    ) : (
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: avColor + "22", border: `1.5px solid ${avColor}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 800, color: avColor, flexShrink: 0 }}>
                        {post.avatar}
                      </div>
                    )}
                    {/* Author + time */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {post.userId && !post.isExample ? (
                          <a href={`/user/${post.userId}`} style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text)", textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                            {post.author}
                          </a>
                        ) : (
                          <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text)" }}>{post.author}</span>
                        )}
                        <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>{post.time}</span>
                        {/* Topic badge */}
                        <button
                          onClick={e => { e.stopPropagation(); setActiveTopic(post.topic); scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }) }}
                          style={{ background: `${topic.color}14`, color: topic.color, borderRadius: 99, padding: "1px 8px", fontSize: "0.6rem", fontWeight: 700, border: `1px solid ${topic.color}30`, cursor: "pointer" }}
                        >
                          {topic.icon} {topic.name}
                        </button>
                      </div>
                    </div>
                    {/* Löschen/Bearbeiten nur wenn user_id übereinstimmt */}
                    {!post.isExample && user && post.userId && post.userId === user.id && (
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <button onClick={() => editingPostId === post.id ? setEditingPostId(null) : startEdit(post)} style={{ background: "none", border: "none", color: editingPostId === post.id ? "var(--accent)" : "var(--text-dim)", cursor: "pointer", fontSize: "0.8rem", padding: "0 5px", lineHeight: 1 }}>✏️</button>
                        <button onClick={() => deletePost(post.id)} style={{ background: "none", border: "none", color: "rgba(255,68,85,0.45)", cursor: "pointer", fontSize: "0.9rem", padding: "0 4px", lineHeight: 1 }}>×</button>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: "0 14px 10px" }}>
                    {editingPostId === post.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ background: "var(--background)", border: "1px solid var(--accent)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: "0.88rem", outline: "none", fontWeight: 700 }} />
                        <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={3} style={{ background: "var(--background)", border: "1px solid var(--accent)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: "0.82rem", outline: "none", resize: "vertical", fontFamily: "inherit" }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => saveEdit(post.id)} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>✓ Speichern</button>
                          <button onClick={() => setEditingPostId(null)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.82rem" }}>Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ fontWeight: 800, fontSize: "0.95rem", margin: "0 0 5px", lineHeight: 1.35, color: "var(--text)" }}>{post.title}</h3>
                        <p style={{ fontSize: "0.83rem", color: "var(--text-dim)", lineHeight: 1.65, margin: "0 0 8px", display: "-webkit-box", WebkitLineClamp: openComments.has(post.id) ? 999 : 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.body}</p>
                        {post.img && <img src={post.img} alt="" style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: 10, marginBottom: 4, display: "block" }} />}
                      </>
                    )}
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
                                <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarColor(c.avatar) + "22", border: `1.5px solid ${avatarColor(c.avatar)}55`, color: avatarColor(c.avatar), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, flexShrink: 0 }}>
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

                {/* Actions — modern bottom bar */}
                <div style={{ display: "flex", gap: 2, alignItems: "center", padding: "6px 10px 10px", borderTop: "1px solid var(--border)" }}>
                  {/* Like button */}
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => like(post.id)}
                      style={{ background: post.liked ? `${topic.color}14` : "transparent", border: `1px solid ${post.liked ? `${topic.color}44` : "transparent"}`, borderRadius: 99, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", color: post.liked ? topic.color : "var(--text-dim)", fontSize: "0.8rem", fontWeight: post.liked ? 700 : 500, transition: "all 0.15s" }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={post.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      {post.likes}
                    </button>
                    {/* Who liked */}
                    {(postLikes[post.id]?.length ?? 0) > 0 && (
                      <button
                        onClick={() => setShowLikesFor(showLikesFor === post.id ? null : post.id)}
                        style={{ background: "none", border: "none", fontSize: "0.6rem", color: "var(--text-dim)", cursor: "pointer", padding: "0 0 0 4px", display: "block", marginTop: 1 }}
                      >
                        {postLikes[post.id].slice(0,2).join(", ")}{postLikes[post.id].length > 2 ? ` +${postLikes[post.id].length - 2}` : ""} ♥
                      </button>
                    )}
                    {showLikesFor === post.id && (postLikes[post.id]?.length ?? 0) > 0 && (
                      <div style={{ position: "absolute", bottom: "110%", left: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", zIndex: 50, minWidth: 140, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
                        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>❤️ Gefällt</div>
                        {postLikes[post.id].map(name => (
                          <div key={name} style={{ fontSize: "0.78rem", color: "var(--text)", padding: "2px 0" }}>{name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Comment button */}
                  <button
                    onClick={() => toggleComments(post.id)}
                    style={{ background: openComments.has(post.id) ? `${topic.color}12` : "transparent", border: `1px solid ${openComments.has(post.id) ? `${topic.color}33` : "transparent"}`, borderRadius: 99, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer", color: openComments.has(post.id) ? topic.color : "var(--text-dim)", fontSize: "0.8rem", transition: "all 0.15s" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {postComments[post.id]?.length
                      ? postComments[post.id].reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0)
                      : post.comments}
                  </button>
                  {/* Spacer */}
                  <div style={{ flex: 1 }} />
                  {/* Bookmark */}
                  <button
                    onClick={() => toggleSave(post)}
                    style={{ background: "transparent", border: "none", color: savedPostIds.has(post.id) ? "var(--accent)" : "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 8 }}
                    title={savedPostIds.has(post.id) ? "Gespeichert" : "Speichern"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={savedPostIds.has(post.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                  {/* Share */}
                  <button
                    onClick={() => { if (navigator.share) navigator.share({ title: post.title, text: post.body }) }}
                    style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", borderRadius: 8 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                    </svg>
                  </button>
                </div>
              </article>
            )
          })}

          {hasMore && (
            <div style={{ padding: "8px 16px 16px", textAlign: "center" }}>
              <button
                onClick={() => setVisibleCount(v => v + 20)}
                style={{
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "10px 28px",
                  fontWeight: 700, fontSize: "0.85rem", color: "var(--text-dim)",
                  cursor: "pointer",
                }}
              >
                Mehr laden ({sorted.length - visibleCount} weitere)
              </button>
            </div>
          )}

          {sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-dim)" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✍️</div>
              <p style={{ fontWeight: 600 }}>Noch keine Beiträge hier.</p>
              <p style={{ fontSize: "0.82rem" }}>Sei der Erste und teile deine Erfahrungen!</p>
            </div>
          )}
        </div>

        {/* Login gate for non-authenticated users */}
        {!user && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 20px", textAlign: "center", marginTop: 8 }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>👥</div>
            <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 6 }}>Werde Teil der Community</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: 18, lineHeight: 1.65 }}>
              Melde dich kostenlos an um alle Beiträge zu sehen, selbst zu schreiben und Communities beizutreten.
            </div>
            <button onClick={() => setShowLogin(true)}
              style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 12, padding: "12px 32px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}>
              Kostenlos anmelden →
            </button>
            <div style={{ marginTop: 10, fontSize: "0.7rem", color: "var(--text-dim)" }}>Bereits Mitglied? <button onClick={() => setShowLogin(true)} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer", fontSize: "0.7rem" }}>Einloggen</button></div>
          </div>
        )}
      </div>

      {joined.size > 0 && (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "12px 16px 0" }}>
          <div style={{ background: "rgba(46,204,138,0.07)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700 }}>✓ Du folgst:</span>
            {[...joined].map(id => {
              const t = allTopics.find(x => x.id === id)
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
      <FloatingAssistant page="community" tips={[
        { icon: "📝", text: "Tippe auf ‚Schreiben' um einen Beitrag in einer Community zu erstellen." },
        { icon: "🏠", text: "Gründe deine eigene Community über den ‚Community eröffnen' Button unter den Filter-Kategorien." },
        { icon: "👤", text: "Klicke auf einen Autorennamen, um sein Profil zu sehen — oder suche Nutzer über das Lupensymbol." },
        { icon: "🔥", text: "Wechsle zwischen ‚Neu' und ‚Top', um die beliebtesten Beiträge zu sehen." },
      ]} />
      <BottomNav />
    </div>
  )
}
