"use client"
/**
 * DataSync — unsichtbare Komponente im Layout
 *
 * Beim Login:  Supabase → localStorage (Daten laden)
 * Alle 60s:   localStorage → Supabase (Daten speichern)
 * Bei Blur:   localStorage → Supabase (App schließen / Tab wechseln)
 */
import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"

// ── Keys ──────────────────────────────────────────────────────────────────────

const LS = {
  profile:           "true-profile",
  premium:           "true-premium",
  goals:             "true-goals",
  familyMembers:     "true-family-members",
  joinedCommunities: "true-joined-communities",
  following:         "true-following",
  scanHistory:       "true-scan-history",
  shoppingList:      "shopping-list-items-v1",
  photoUrl:          "true-profile-photo",
}

// ── Read all localStorage into one object ─────────────────────────────────────

function readLocal() {
  const get = (key: string, fallback: unknown = null) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
  }
  const profile = get(LS.profile, {})
  // Migration
  if (profile.phone && !profile.telefon) profile.telefon = profile.phone
  if (profile.name  && !profile.vorname) profile.vorname  = profile.name

  return {
    premium:            localStorage.getItem(LS.premium) === "1",
    profile,
    goals:              get(LS.goals, profile.goals ?? []),
    family_members:     get(LS.familyMembers, []),
    joined_communities: get(LS.joinedCommunities, []),
    following:          get(LS.following, []),
    scan_history:       get(LS.scanHistory, []),
    shopping_list:      get(LS.shoppingList, []),
    photo_url:          localStorage.getItem(LS.photoUrl) ?? "",
  }
}

// ── Write Supabase row → localStorage ─────────────────────────────────────────

function writeLocal(row: Record<string, unknown>) {
  try {
    const profile = (row.profile ?? {}) as Record<string, unknown>
    // Merge goals into profile for backward compat
    const merged = { ...profile, goals: row.goals ?? profile.goals ?? [] }
    localStorage.setItem(LS.profile,           JSON.stringify(merged))
    localStorage.setItem(LS.premium,           row.premium ? "1" : "0")
    localStorage.setItem(LS.goals,             JSON.stringify(row.goals             ?? []))
    localStorage.setItem(LS.familyMembers,     JSON.stringify(row.family_members    ?? []))
    localStorage.setItem(LS.joinedCommunities, JSON.stringify(row.joined_communities ?? []))
    localStorage.setItem(LS.following,         JSON.stringify(row.following         ?? []))
    localStorage.setItem(LS.scanHistory,       JSON.stringify(row.scan_history      ?? []))
    localStorage.setItem(LS.shoppingList,      JSON.stringify(row.shopping_list     ?? []))
    if (row.photo_url) localStorage.setItem(LS.photoUrl, row.photo_url as string)
  } catch {}
}

// ── Save localStorage → Supabase ──────────────────────────────────────────────

async function pushToSupabase(userId: string) {
  if (!supabase) return
  try {
    const local = readLocal()
    await supabase.from("user_profiles").upsert({
      id:                 userId,
      premium:            local.premium,
      profile:            local.profile,
      goals:              local.goals,
      family_members:     local.family_members,
      joined_communities: local.joined_communities,
      following:          local.following,
      scan_history:       (local.scan_history as unknown[]).slice(0, 50), // max 50 items
      shopping_list:      (local.shopping_list as unknown[]).slice(0, 100),
      photo_url:          local.photo_url,
      updated_at:         new Date().toISOString(),
    })
  } catch (e) {
    console.warn("DataSync push failed:", e)
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DataSync() {
  const { user } = useSupabaseAuth()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user || !supabase) return

    // Pull on login (new user session)
    if (lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id
      ;(async () => {
        try {
          const { data: row, error } = await supabase!
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single()

          if (row && !error) {
            // Merge remote + local (remote wins, but keep local scan history / shopping list merged)
            const local = readLocal()
            const mergedScanHistory = mergeById(
              (row.scan_history as Record<string,unknown>[] ?? []),
              (local.scan_history as Record<string,unknown>[] ?? [])
            ).slice(0, 50)
            const mergedShoppingList = mergeById(
              (row.shopping_list as Record<string,unknown>[] ?? []),
              (local.shopping_list as Record<string,unknown>[] ?? [])
            ).slice(0, 100)
            writeLocal({
              ...row,
              scan_history:  mergedScanHistory,
              shopping_list: mergedShoppingList,
            })
            // Immediately push merged data back
            await supabase!.from("user_profiles").upsert({
              ...row,
              scan_history:  mergedScanHistory,
              shopping_list: mergedShoppingList,
              updated_at:    new Date().toISOString(),
            })
          } else {
            // No row yet — push local data up
            await pushToSupabase(user.id)
          }
        } catch (e) {
          console.warn("DataSync pull failed:", e)
        }
      })()
    }

    // Auto-push every 60 seconds
    intervalRef.current = setInterval(() => pushToSupabase(user.id), 60_000)

    // Push on tab blur (user switches app / closes tab)
    const onBlur = () => pushToSupabase(user.id)
    const onVis  = () => { if (document.visibilityState === "hidden") pushToSupabase(user.id) }
    window.addEventListener("blur", onBlur)
    document.addEventListener("visibilitychange", onVis)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [user?.id])

  return null // unsichtbar
}

// ── Helper ────────────────────────────────────────────────────────────────────

function mergeById(
  remote: Record<string,unknown>[],
  local:  Record<string,unknown>[]
): Record<string,unknown>[] {
  const map = new Map<string, Record<string,unknown>>()
  for (const item of local)  if (item.id) map.set(item.id as string, item)
  for (const item of remote) if (item.id) map.set(item.id as string, item) // remote wins
  return Array.from(map.values()).sort((a, b) =>
    ((b.timestamp as number) ?? 0) - ((a.timestamp as number) ?? 0)
  )
}
