"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  vorname: string
  avatar: string
  bio: string
  stadt: string
  telefon: string
  supermarkets: string[]
  preferences: string[]
  pushNotifications: boolean
  weeklyReport: boolean
  birthDay: string
  birthMonth: string
  photoUrl: string
}

export interface FamilyMember {
  id: string
  name: string
  relation: string
  avatar: string
  goals: string[]
}

export interface ScanHistoryItem {
  id: string
  query: string
  corpName: string
  found: boolean
  severity?: string
  timestamp: number
}

export interface ShoppingListItem {
  id: string
  name: string
  checked: boolean
  category?: string
  addedBy?: string
  scanResult?: unknown
  timestamp: number
}

export interface UserData {
  premium: boolean
  profile: UserProfile
  goals: string[]
  familyMembers: FamilyMember[]
  joinedCommunities: string[]
  following: string[]
  scanHistory: ScanHistoryItem[]
  shoppingList: ShoppingListItem[]
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  vorname: "", avatar: "🧑", bio: "", stadt: "", telefon: "",
  supermarkets: [], preferences: [], pushNotifications: false,
  weeklyReport: false, birthDay: "", birthMonth: "", photoUrl: "",
}

const DEFAULT_DATA: UserData = {
  premium: false,
  profile: DEFAULT_PROFILE,
  goals: [],
  familyMembers: [],
  joinedCommunities: [],
  following: [],
  scanHistory: [],
  shoppingList: [],
}

// ── localStorage keys ─────────────────────────────────────────────────────────

const LS_KEYS = {
  profile:           "true-profile",
  premium:           "true-premium",
  goals:             "true-goals",
  familyMembers:     "true-family-members",
  joinedCommunities: "true-joined-communities",
  following:         "true-following",
  scanHistory:       "true-scan-history",
  shoppingList:      "shopping-list-items-v1",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readLocalStorage(): Partial<UserData> {
  try {
    const rawProfile = localStorage.getItem(LS_KEYS.profile)
    const parsed = rawProfile ? JSON.parse(rawProfile) : {}
    // Migration: old keys
    if (parsed.phone && !parsed.telefon) parsed.telefon = parsed.phone
    if (parsed.name  && !parsed.vorname) parsed.vorname = parsed.name

    const profile: UserProfile = { ...DEFAULT_PROFILE, ...parsed }
    const photoUrl = localStorage.getItem("true-profile-photo") || parsed.photoUrl || ""
    if (photoUrl) profile.photoUrl = photoUrl

    const goals = (() => {
      try { return JSON.parse(localStorage.getItem(LS_KEYS.goals) || "[]") } catch { return parsed.goals ?? [] }
    })()

    const familyMembers = (() => {
      try { return JSON.parse(localStorage.getItem(LS_KEYS.familyMembers) || "[]") } catch { return [] }
    })()

    const joinedCommunities = (() => {
      try { return JSON.parse(localStorage.getItem(LS_KEYS.joinedCommunities) || "[]") } catch { return [] }
    })()

    const following = (() => {
      try { return JSON.parse(localStorage.getItem(LS_KEYS.following) || "[]") } catch { return [] }
    })()

    const scanHistory = (() => {
      try { return JSON.parse(localStorage.getItem(LS_KEYS.scanHistory) || "[]") } catch { return [] }
    })()

    const shoppingList = (() => {
      try { return JSON.parse(localStorage.getItem(LS_KEYS.shoppingList) || "[]") } catch { return [] }
    })()

    const premium = localStorage.getItem(LS_KEYS.premium) === "1"

    return { premium, profile, goals, familyMembers, joinedCommunities, following, scanHistory, shoppingList }
  } catch {
    return {}
  }
}

function writeLocalStorage(data: UserData) {
  try {
    localStorage.setItem(LS_KEYS.profile, JSON.stringify(data.profile))
    localStorage.setItem(LS_KEYS.premium, data.premium ? "1" : "0")
    localStorage.setItem(LS_KEYS.goals, JSON.stringify(data.goals))
    localStorage.setItem(LS_KEYS.familyMembers, JSON.stringify(data.familyMembers))
    localStorage.setItem(LS_KEYS.joinedCommunities, JSON.stringify(data.joinedCommunities))
    localStorage.setItem(LS_KEYS.following, JSON.stringify(data.following))
    localStorage.setItem(LS_KEYS.scanHistory, JSON.stringify(data.scanHistory))
    localStorage.setItem(LS_KEYS.shoppingList, JSON.stringify(data.shoppingList))
    // Legacy keys for backward compat
    localStorage.setItem("true-profile", JSON.stringify({ ...data.profile, goals: data.goals }))
  } catch {}
}

function toSupabaseRow(userId: string, data: UserData) {
  return {
    id:                 userId,
    premium:            data.premium,
    profile:            data.profile as unknown as Record<string, unknown>,
    goals:              data.goals,
    family_members:     data.familyMembers as unknown as Record<string, unknown>[],
    joined_communities: data.joinedCommunities,
    following:          data.following,
    scan_history:       data.scanHistory as unknown as Record<string, unknown>[],
    shopping_list:      data.shoppingList as unknown as Record<string, unknown>[],
    updated_at:         new Date().toISOString(),
  }
}

function fromSupabaseRow(row: Record<string, unknown>): UserData {
  return {
    premium:            Boolean(row.premium),
    profile:            { ...DEFAULT_PROFILE, ...(row.profile as Partial<UserProfile> ?? {}) },
    goals:              (row.goals as string[]) ?? [],
    familyMembers:      (row.family_members as FamilyMember[]) ?? [],
    joinedCommunities:  (row.joined_communities as string[]) ?? [],
    following:          (row.following as string[]) ?? [],
    scanHistory:        (row.scan_history as ScanHistoryItem[]) ?? [],
    shoppingList:       (row.shopping_list as ShoppingListItem[]) ?? [],
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUserData(user: User | null) {
  const [data, setDataState] = useState<UserData>(DEFAULT_DATA)
  const [loading, setLoading] = useState(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDataRef = useRef<UserData>(DEFAULT_DATA)

  // Load on mount or user change
  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function load() {
    setLoading(true)

    // 1. Instant render from localStorage
    const local = readLocalStorage()
    const withDefaults: UserData = { ...DEFAULT_DATA, ...local }
    setDataState(withDefaults)
    latestDataRef.current = withDefaults

    // 2. If logged in, fetch from Supabase and merge (Supabase wins on conflict)
    if (user && supabase) {
      try {
        const { data: row, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (row && !error) {
          const remote = fromSupabaseRow(row as Record<string, unknown>)
          // Merge: remote wins, but keep local scan history / shopping list merged
          const merged: UserData = {
            ...remote,
            // Merge scan histories (deduplicate by id)
            scanHistory: mergeById(remote.scanHistory, withDefaults.scanHistory),
            // Merge shopping lists (deduplicate by id)
            shoppingList: mergeById(remote.shoppingList, withDefaults.shoppingList),
          }
          setDataState(merged)
          latestDataRef.current = merged
          writeLocalStorage(merged)
        } else {
          // No row yet — push local data up
          await supabase
            .from("user_profiles")
            .upsert(toSupabaseRow(user.id, withDefaults))
            .throwOnError()
        }
      } catch (e) {
        console.warn("useUserData: Supabase load failed", e)
      }
    }

    setLoading(false)
  }

  // Debounced save to Supabase
  const scheduleSave = useCallback((next: UserData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!user || !supabase) return
      try {
        await supabase
          .from("user_profiles")
          .upsert(toSupabaseRow(user.id, next))
          .throwOnError()
      } catch (e) {
        console.warn("useUserData: Supabase save failed", e)
      }
    }, 1500)
  }, [user])

  // Main setter — updates state + localStorage + schedules Supabase save
  const setData = useCallback((updater: UserData | ((prev: UserData) => UserData)) => {
    setDataState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater
      latestDataRef.current = next
      writeLocalStorage(next)
      scheduleSave(next)
      return next
    })
  }, [scheduleSave])

  // Convenience partial updater
  const updateData = useCallback(<K extends keyof UserData>(key: K, value: UserData[K]) => {
    setData(prev => ({ ...prev, [key]: value }))
  }, [setData])

  return { data, setData, updateData, loading, reload: load }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mergeById<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of local)   map.set(item.id, item)
  for (const item of remote)  map.set(item.id, item) // remote wins
  return Array.from(map.values()).sort((a: unknown, b: unknown) => {
    const at = (a as { timestamp?: number }).timestamp ?? 0
    const bt = (b as { timestamp?: number }).timestamp ?? 0
    return bt - at
  })
}
