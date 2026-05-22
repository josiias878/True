"use client"
import { useState, useEffect } from "react"
import { supabase, DbProfile } from "./supabase"
import type { User } from "@supabase/supabase-js"

export interface Profile {
  vorname: string
  telefon: string
  stadt: string
  avatar: string
  bio: string
  preferences: string[]
  supermarkets: string[]
  goals: string[]
  nutritionGoals: string[]
  allergies: string[]
  pushNotifications: boolean
  weeklyReport: boolean
  birthDay: string
  birthMonth: string
}

export const DEFAULT_PROFILE: Profile = {
  vorname: "", telefon: "", stadt: "", avatar: "🧑", bio: "",
  preferences: [], supermarkets: [], goals: [],
  nutritionGoals: [], allergies: [],
  pushNotifications: false, weeklyReport: false,
  birthDay: "", birthMonth: "",
}

const LS_KEY = "true-profile"

function toDbProfile(p: Profile, userId: string): Partial<DbProfile> & { goals?: string[] } {
  return {
    id: userId,
    vorname: p.vorname,
    avatar: p.avatar,
    bio: p.bio,
    stadt: p.stadt,
    telefon: p.telefon,
    supermarkets: p.supermarkets,
    preferences: p.preferences,
    goals: p.goals ?? [],
  }
}

function fromDbProfile(db: DbProfile): Partial<Profile> {
  return {
    vorname: db.vorname,
    avatar: db.avatar,
    bio: db.bio,
    stadt: db.stadt,
    telefon: db.telefon,
    supermarkets: db.supermarkets ?? [],
    preferences: db.preferences ?? [],
  }
}

export function useProfile(user: User | null) {
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE)
  const [loading, setLoading]      = useState(true)
  const [saving, setSaving]        = useState(false)

  // Load on mount / user change
  useEffect(() => {
    loadProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  function mergeGoalsFromOnboarding(parsed: Record<string, any>): Record<string, any> {
    // Onboarding stores goals in "true-goals-v1" — always merge into profile if present
    try {
      const v1Raw = localStorage.getItem("true-goals-v1")
      if (v1Raw) {
        const v1Goals: string[] = JSON.parse(v1Raw)
        if (Array.isArray(v1Goals) && v1Goals.length > 0) {
          // Merge: combine both arrays, deduplicate, prefer onboarding goals if profile goals empty
          const existing: string[] = Array.isArray(parsed.goals) ? parsed.goals : []
          const merged = Array.from(new Set([...v1Goals, ...existing]))
          parsed.goals = merged
        }
      }
    } catch (e) { console.error("[useProfile] goals-v1 merge failed:", e) }
    return parsed
  }

  async function loadProfile() {
    setLoading(true)
    // First load from localStorage for instant render
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        let parsed = JSON.parse(raw)
        // Migration: Onboarding stores "phone" and "name" — map to "telefon" / "vorname"
        if (parsed.phone && !parsed.telefon) parsed.telefon = parsed.phone
        if (parsed.name  && !parsed.vorname) parsed.vorname = parsed.name
        // Sync goals from onboarding key
        parsed = mergeGoalsFromOnboarding(parsed)
        setProfileState({ ...DEFAULT_PROFILE, ...parsed })
      } else {
        // No profile yet — still check onboarding goals
        const bare: Record<string, any> = {}
        const merged = mergeGoalsFromOnboarding(bare)
        if (merged.goals?.length) setProfileState({ ...DEFAULT_PROFILE, ...merged })
      }
    } catch (e) { console.error("[useProfile] localStorage read failed:", e) }

    // If logged in + Supabase available, fetch from DB
    if (user && supabase) {
      try {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        // Re-read localStorage AFTER the async fetch — user may have changed goals/settings while waiting
        const lsRaw = localStorage.getItem(LS_KEY)
        let lsParsed = lsRaw ? JSON.parse(lsRaw) : {}
        if (lsParsed.phone && !lsParsed.telefon) lsParsed.telefon = lsParsed.phone
        if (lsParsed.name  && !lsParsed.vorname) lsParsed.vorname = lsParsed.name
        // Always merge onboarding goals here too
        lsParsed = mergeGoalsFromOnboarding(lsParsed)
        const authPhone = user.phone ?? ""
        if (data) {
          const dbData = fromDbProfile(data as DbProfile)
          // Merge: DB wins for fields it has, localStorage wins for goals/local-only fields
          const merged: Profile = { ...DEFAULT_PROFILE, ...lsParsed, telefon: authPhone || lsParsed.telefon || "" }
          for (const key of Object.keys(dbData) as (keyof typeof dbData)[]) {
            // Never overwrite goals from localStorage with empty DB value
            if (key === "goals") continue
            const val = dbData[key]
            if (val !== undefined && val !== null && val !== "" &&
                !(Array.isArray(val) && val.length === 0)) {
              (merged as any)[key] = val
            }
          }
          setProfileState(merged)
          localStorage.setItem(LS_KEY, JSON.stringify(merged))
        } else if (authPhone) {
          const merged: Profile = { ...DEFAULT_PROFILE, ...lsParsed, telefon: authPhone }
          setProfileState(merged)
          localStorage.setItem(LS_KEY, JSON.stringify(merged))
        }
      } catch (e) { console.error("[useProfile] Supabase merge failed:", e) }
    } else {
      // Load fresh from localStorage
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(raw) })
      } catch (e) { console.error("[useProfile] localStorage fallback read failed:", e) }
    }
    setLoading(false)
  }

  async function saveProfile(next: Profile): Promise<void> {
    setProfileState(next)
    // Merge mit bestehenden localStorage-Daten — bewahrt Felder wie nutritionGoals, allergies
    try {
      const existing = JSON.parse(localStorage.getItem(LS_KEY) || "{}")
      localStorage.setItem(LS_KEY, JSON.stringify({ ...existing, ...next }))
    } catch {
      localStorage.setItem(LS_KEY, JSON.stringify(next))
    }
    if (!user || !supabase) return
    setSaving(true)
    try {
      await supabase.from("profiles").upsert(toDbProfile(next, user.id))
    } catch (e) { console.error("[useProfile] saveProfile Supabase failed:", e) }
    setSaving(false)
  }

  return { profile, setProfile: setProfileState, saveProfile, loading, saving }
}
