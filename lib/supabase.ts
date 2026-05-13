import { createClient } from "@supabase/supabase-js"

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ""
const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

// Singleton client — safe to import on client + server
export const supabase = url && key ? createClient(url, key) : null

// ─── Database types (generated from schema below) ─────────────────────────────

export interface DbProfile {
  id: string            // auth.users.id (UUID)
  vorname: string
  avatar: string
  bio: string
  stadt: string
  telefon: string
  supermarkets: string[]
  preferences: string[]
  meidliste: string[]
  push_token: string | null
  created_at: string
}

export interface DbPost {
  id: number
  user_id: string
  author_name: string
  author_avatar: string
  type: "user" | "bot" | "eva" | "positive"
  tag: string
  tag_color: string
  title: string | null
  text: string
  img_url: string | null
  source: string | null
  likes: number
  created_at: string
}

export interface DbComment {
  id: number
  post_id: number
  user_id: string | null
  author_name: string
  text: string
  created_at: string
}

export interface DbListItem {
  id: string
  user_id: string
  list_id: string        // shared list identifier
  product_id: string
  product_name: string
  product_brand: string
  product_emoji: string
  severity: string
  issue: string
  checked: boolean
  added_at: string
}

export interface DbListComment {
  id: string
  list_id: string
  item_id: string
  user_id: string | null
  author_name: string
  text: string
  created_at: string
}

export interface DbSavedPost {
  id: number
  user_id: string
  post_id: number
  saved_at: string
}

export interface DbScanHistory {
  id: string
  user_id: string
  query: string
  found: boolean
  corp_name: string | null
  severity: string | null
  scanned_at: string
}
