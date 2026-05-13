"use client"
import React, { useState, useEffect, useCallback } from "react"
import { supabase, DbPost, DbComment } from "./supabase"
import type { User } from "@supabase/supabase-js"

export interface FeedPost {
  id: number
  type: string
  avatar: string
  name: string
  time: string
  createdAt?: number   // unix ms — if set, time is recomputed dynamically
  tag: string
  tagColor: string
  title?: string
  text: string
  likes: number
  comments?: number
  img?: string | null
  source?: string
  badge?: string
  isExample?: boolean
  location?: string
  user_id?: string
}

export interface FeedComment {
  id: string
  post_id: number
  author: string
  text: string
  time: number
}

// Minimal metadata stored per saved post so the profile can show a real preview
export interface SavedPostMeta {
  tag: string
  tagColor: string
  name: string
  avatar: string
  text: string
  img?: string | null
  time: string
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Gerade eben"
  if (m < 60) return `Vor ${m} Min.`
  const h = Math.floor(m / 60)
  if (h < 24) return `Vor ${h} Std.`
  const d = Math.floor(h / 24)
  return `Vor ${d} Tag${d === 1 ? "" : "en"}`
}

function dbToFeedPost(p: DbPost): FeedPost {
  return {
    id: p.id,
    type: p.type,
    avatar: p.author_avatar,
    name: p.author_name,
    time: relativeTime(p.created_at),
    // store as numeric timestamp so FeedPage can recompute dynamically
    createdAt: new Date(p.created_at).getTime(),
    tag: p.tag,
    tagColor: p.tag_color,
    title: p.title ?? undefined,
    text: p.text,
    likes: p.likes,
    img: p.img_url,
    source: p.source ?? undefined,
    user_id: p.user_id,
  }
}

export function useFeed(user: User | null, staticPosts: FeedPost[]) {
  const [userPosts, setUserPosts]   = useState<FeedPost[]>([])
  const [liked, setLiked]           = useState<Set<number>>(new Set())
  const [saved, setSaved]           = useState<Set<number>>(new Set())
  const [postComments, setPostComments] = useState<Record<number, FeedComment[]>>({})
  const [posting, setPosting]       = useState(false)

  // Hydrate from localStorage first
  useEffect(() => {
    try {
      const lk = localStorage.getItem("true-liked-posts")
      if (lk) setLiked(new Set(JSON.parse(lk)))
    } catch {}
    try {
      const sv = localStorage.getItem("true-saved-posts")
      if (sv) setSaved(new Set(JSON.parse(sv)))
    } catch {}
    try {
      const pc = localStorage.getItem("true-post-comments")
      if (pc) setPostComments(JSON.parse(pc))
    } catch {}
  }, [])

  // Lokal gelöschte Post-IDs — damit refetch sie nicht zurückbringt
  const deletedIdsRef = React.useRef<Set<number>>((() => {
    try {
      const raw = localStorage.getItem("true-deleted-posts")
      return new Set<number>(raw ? JSON.parse(raw) : [])
    } catch { return new Set<number>() }
  })())

  function markDeleted(id: number) {
    deletedIdsRef.current.add(id)
    try {
      localStorage.setItem("true-deleted-posts", JSON.stringify([...deletedIdsRef.current]))
    } catch {}
  }

  // Fetch user posts from Supabase — with polling fallback
  useEffect(() => {
    if (!supabase) return
    fetchUserPosts()
    const cleanup = subscribeToUserPosts()
    // Polling fallback: re-fetch every 30s in case realtime drops
    const pollId = setInterval(fetchUserPosts, 30_000)
    return () => {
      clearInterval(pollId)
      cleanup?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function fetchUserPosts() {
    if (!supabase) return
    try {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("type", "user")
        .order("created_at", { ascending: false })
        .limit(50)
      if (data) {
        // Filter out locally-deleted posts so they don't re-appear after refetch
        const filtered = (data as DbPost[])
          .filter(p => !deletedIdsRef.current.has(p.id))
          .map(dbToFeedPost)
        setUserPosts(filtered)
      }
    } catch {
      // silent — will retry on next poll
    }
  }

  function subscribeToUserPosts() {
    if (!supabase) return
    const channel = supabase
      .channel("posts-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, payload => {
        const newPost = dbToFeedPost(payload.new as DbPost)
        setUserPosts(prev => {
          if (prev.find(p => p.id === newPost.id)) return prev
          return [newPost, ...prev]
        })
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, payload => {
        setUserPosts(prev => prev.filter(p => p.id !== (payload.old as { id: number }).id))
      })
      .subscribe((status) => {
        // If subscription fails, re-fetch via polling (already set up above)
        if (status === "CHANNEL_ERROR") fetchUserPosts()
      })
    return () => { supabase?.removeChannel(channel) }
  }

  const toggleLike = useCallback(async (postId: number) => {
    const isLiked = liked.has(postId)
    setLiked(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(postId) : next.add(postId)
      localStorage.setItem("true-liked-posts", JSON.stringify([...next]))
      return next
    })
    // Update Supabase if available
    if (supabase && user) {
      if (isLiked) {
        await supabase.from("post_likes").delete().match({ post_id: postId, user_id: user.id })
      } else {
        await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id })
      }
    }
  }, [liked, user])

  const toggleSave = useCallback(async (postId: number, meta?: SavedPostMeta) => {
    const isSaved = saved.has(postId)
    setSaved(prev => {
      const next = new Set(prev)
      isSaved ? next.delete(postId) : next.add(postId)
      localStorage.setItem("true-saved-posts", JSON.stringify([...next]))
      return next
    })
    // Persist / remove post metadata so the profile tab can render real previews
    try {
      const raw = localStorage.getItem("true-saved-meta")
      const map: Record<number, SavedPostMeta> = raw ? JSON.parse(raw) : {}
      if (isSaved) { delete map[postId] } else if (meta) { map[postId] = meta }
      localStorage.setItem("true-saved-meta", JSON.stringify(map))
    } catch {}
    if (supabase && user) {
      if (isSaved) {
        await supabase.from("saved_posts").delete().match({ post_id: postId, user_id: user.id })
      } else {
        await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id })
      }
    }
  }, [saved, user])

  const addComment = useCallback(async (postId: number, text: string, authorName: string) => {
    const comment: FeedComment = {
      id: Date.now().toString(),
      post_id: postId,
      author: authorName,
      text,
      time: Date.now(),
    }
    setPostComments(prev => {
      const next = { ...prev, [postId]: [...(prev[postId] ?? []), comment] }
      localStorage.setItem("true-post-comments", JSON.stringify(next))
      return next
    })
    if (supabase && user) {
      await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        author_name: authorName,
        text,
      })
    }
  }, [user])

  const createPost = useCallback(async (data: {
    text: string
    tag: string
    tagColor: string
    authorName: string
    authorAvatar: string
    imgUrl?: string
  }): Promise<boolean> => {
    setPosting(true)
    if (supabase && user) {
      const { data: inserted, error } = await supabase.from("posts").insert({
        user_id: user.id,
        author_name: data.authorName,
        author_avatar: data.authorAvatar,
        type: "user",
        tag: data.tag,
        tag_color: data.tagColor,
        text: data.text,
        img_url: data.imgUrl ?? null,
        likes: 0,
      }).select().single()
      setPosting(false)
      if (error || !inserted) return false
      // Optimistically added via realtime subscription
      return true
    }
    // Fallback: store in localStorage only
    const localPost: FeedPost = {
      id: Date.now(),
      type: "user",
      avatar: data.authorAvatar,
      name: data.authorName,
      time: "Gerade eben",
      tag: data.tag,
      tagColor: data.tagColor,
      text: data.text,
      likes: 0,
      isExample: false,
    }
    try {
      const raw = localStorage.getItem("true-user-posts")
      const posts: FeedPost[] = raw ? JSON.parse(raw) : []
      posts.unshift(localPost)
      localStorage.setItem("true-user-posts", JSON.stringify(posts))
    } catch {}
    setUserPosts(prev => [localPost, ...prev])
    setPosting(false)
    return true
  }, [user])

  const deletePost = useCallback(async (postId: number) => {
    // 1. Sofort aus State entfernen
    setUserPosts(prev => prev.filter(p => p.id !== postId))
    // 2. In lokale Lösch-Liste aufnehmen → refetch bringt ihn nie zurück
    markDeleted(postId)
    // 3. Aus localStorage Fallback entfernen
    try {
      const raw = localStorage.getItem("true-user-posts")
      if (raw) {
        const posts: FeedPost[] = JSON.parse(raw)
        localStorage.setItem("true-user-posts", JSON.stringify(posts.filter(p => p.id !== postId)))
      }
    } catch {}
    // 4. Aus Supabase löschen
    if (supabase && user) {
      const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", user.id)
      if (error) console.warn("Delete post error:", error)
    }
  }, [user])

  return { userPosts, liked, saved, postComments, posting, toggleLike, toggleSave, addComment, createPost, deletePost }
}
