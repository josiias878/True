"use client"
import { useEffect, useCallback, useRef } from "react"
import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

export interface SyncItem {
  id: string
  name: string
  brand: string
  emoji: string
  severity: string
  issue: string
  category: string
  checked: boolean
  addedAt: number
  personId?: string
}

const TABLE = "list_items"

const DEFAULT_ITEM_IDS = new Set([
  "nutella","cocacola","milram","toast","bananen","ariel","kitkat","danone","wasa"
])

function toRow(item: SyncItem, userId: string) {
  return {
    user_id: userId,
    list_id: item.personId ?? "default",
    product_id: item.id,
    product_name: item.name,
    product_brand: item.brand,
    product_emoji: item.emoji,
    severity: item.severity,
    issue: `${item.category}||${item.issue}`,
    checked: item.checked,
    added_at: new Date(item.addedAt).toISOString(),
  }
}

function fromRow(row: any): SyncItem {
  const raw: string = row.issue ?? ""
  const sep = raw.indexOf("||")
  const category = sep > -1 ? raw.slice(0, sep) : "snacks"
  const issue     = sep > -1 ? raw.slice(sep + 2) : raw
  return {
    id: row.product_id ?? row.id,
    name: row.product_name ?? "",
    brand: row.product_brand ?? "",
    emoji: row.product_emoji ?? "🛒",
    severity: row.severity ?? "none",
    issue,
    category,
    checked: row.checked ?? false,
    addedAt: row.added_at ? new Date(row.added_at).getTime() : Date.now(),
    personId: row.list_id !== "default" ? row.list_id : undefined,
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useListSync(
  user: User | null,
  items: SyncItem[],
  setItems: (fn: (prev: SyncItem[]) => SyncItem[]) => void,
  hydrated: boolean,
) {
  const syncedUserRef = useRef<string | null>(null)
  const isFetchingRef = useRef(false)

  // ── Core fetch: Supabase is ALWAYS and ONLY the source of truth ──
  const fetchFromSupabase = useCallback(async () => {
    if (!user || !supabase || !hydrated) return
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_id", user.id)
        .order("added_at", { ascending: false })
        .limit(200)

      if (error) {
        console.warn("[useListSync] fetch error:", error.message)
        return
      }

      const remote: SyncItem[] = (data ?? []).map(fromRow)

      // Clean up accidentally synced default placeholder items
      const contaminated = remote.filter(r => DEFAULT_ITEM_IDS.has(r.id))
      if (contaminated.length > 0) {
        contaminated.forEach(item => {
          supabase!.from(TABLE)
            .delete()
            .eq("product_id", item.id)
            .eq("user_id", user.id)
            .then(() => {})
        })
      }
      const cleanRemote = remote.filter(r => !DEFAULT_ITEM_IDS.has(r.id))

      setItems(localItems => {
        if (cleanRemote.length > 0) {
          // ── SUPABASE HAS DATA → it is the SOLE source of truth ──
          // Never push local items back — they may have been deleted on another device
          const deduped = new Map<string, SyncItem>()
          cleanRemote.forEach(r => deduped.set(r.id, r))
          return Array.from(deduped.values()).sort((a, b) => b.addedAt - a.addedAt)
        }

        // ── SUPABASE IS EMPTY → first login, push real local items up ──
        const realLocal = localItems.filter(l => !DEFAULT_ITEM_IDS.has(l.id))
        if (realLocal.length > 0) {
          realLocal.forEach(item => {
            supabase!.from(TABLE)
              .upsert(toRow(item, user.id), { onConflict: "product_id,user_id" })
              .then(() => {})
          })
          return realLocal.sort((a, b) => b.addedAt - a.addedAt)
        }

        return localItems
      })
    } catch (e) {
      console.warn("[useListSync] unexpected error:", e)
    } finally {
      isFetchingRef.current = false
    }
  }, [user, hydrated, setItems])

  // ── On login / hydration: initial fetch ──
  useEffect(() => {
    if (!user || !supabase || !hydrated) return
    if (syncedUserRef.current === user.id) return
    syncedUserRef.current = user.id
    fetchFromSupabase()
  }, [user?.id, hydrated, fetchFromSupabase])

  // ── Re-fetch when app comes back into view (phone ↔ laptop) ──
  useEffect(() => {
    if (!user || !supabase) return

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchFromSupabase()
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [user?.id, fetchFromSupabase])

  // ── Realtime: live updates from other devices ──
  useEffect(() => {
    if (!user || !supabase) return

    const channel = supabase
      .channel(`list-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: TABLE, filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newItem = fromRow(payload.new)
          if (DEFAULT_ITEM_IDS.has(newItem.id)) return
          setItems(prev => prev.some(i => i.id === newItem.id) ? prev : [newItem, ...prev])
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: TABLE, filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = fromRow(payload.new)
          setItems(prev => prev.map(i => i.id === updated.id ? { ...i, checked: updated.checked } : i))
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: TABLE, filter: `user_id=eq.${user.id}` },
        (payload) => {
          const deletedId: string | undefined = payload.old?.product_id ?? payload.old?.id
          if (deletedId) setItems(prev => prev.filter(i => i.id !== deletedId))
        }
      )
      .subscribe()

    return () => { supabase?.removeChannel(channel) }
  }, [user?.id])

  // ── Push new item to Supabase ──
  const syncAdd = useCallback((item: SyncItem) => {
    if (!user || !supabase || DEFAULT_ITEM_IDS.has(item.id)) return
    supabase.from(TABLE)
      .upsert(toRow(item, user.id), { onConflict: "product_id,user_id" })
      .then(() => {})
  }, [user])

  // ── Remove item from Supabase ──
  const syncRemove = useCallback((itemId: string) => {
    if (!user || !supabase) return
    supabase.from(TABLE)
      .delete()
      .eq("product_id", itemId)
      .eq("user_id", user.id)
      .then(() => {})
  }, [user])

  // ── Update checked state ──
  const syncToggle = useCallback((itemId: string, checked: boolean) => {
    if (!user || !supabase) return
    supabase.from(TABLE)
      .update({ checked })
      .eq("product_id", itemId)
      .eq("user_id", user.id)
      .then(() => {})
  }, [user])

  return { syncAdd, syncRemove, syncToggle }
}
