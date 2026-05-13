"use client"
import { useEffect, useCallback, useRef } from "react"
import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"

// Minimal item shape we store/sync — kept flat for Supabase compatibility
export interface SyncItem {
  id: string
  name: string
  brand: string
  emoji: string
  severity: string
  issue: string
  category: string   // stored as-is in Supabase note field
  checked: boolean
  addedAt: number
  personId?: string
}

const TABLE = "list_items"

function toRow(item: SyncItem, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    list_id: item.personId ?? "default",
    product_id: item.id,
    product_name: item.name,
    product_brand: item.brand,
    product_emoji: item.emoji,
    severity: item.severity,
    // encode category in issue field so we don't need extra column
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
  // Track which userId we've already synced — resets when user changes
  const syncedUserRef = useRef<string | null>(null)

  // On login / mount: fetch remote items and merge
  useEffect(() => {
    if (!user || !supabase || !hydrated) return
    if (syncedUserRef.current === user.id) return  // already synced for this user
    syncedUserRef.current = user.id

    async function fetchAndMerge() {
      try {
        const { data, error } = await supabase!
          .from(TABLE)
          .select("*")
          .eq("user_id", user!.id)
          .order("added_at", { ascending: false })
          .limit(100)

        if (error || !data) return

        const remote: SyncItem[] = data.map(fromRow)

        setItems(localItems => {
          // Items only in local → push to Supabase
          const remoteIds = new Set(remote.map(r => r.id))
          const onlyLocal = localItems.filter(l => !remoteIds.has(l.id))
          if (onlyLocal.length > 0) {
            onlyLocal.forEach(item => {
              supabase!.from(TABLE).upsert(toRow(item, user!.id)).then(() => {})
            })
          }

          // Merge: remote wins, keep local-only items too
          const merged = new Map<string, SyncItem>()
          remote.forEach(r => merged.set(r.id, r))
          onlyLocal.forEach(l => merged.set(l.id, l))
          return Array.from(merged.values()).sort((a, b) => b.addedAt - a.addedAt)
        })
      } catch {}
    }

    fetchAndMerge()
  }, [user?.id, hydrated])

  // Realtime: Liste live aktualisieren wenn ein anderes Gerät / Familienmitglied etwas ändert
  useEffect(() => {
    if (!user || !supabase) return

    const channel = supabase
      .channel(`list-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: TABLE, filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newItem = fromRow(payload.new)
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

  // Push a new item to Supabase
  const syncAdd = useCallback((item: SyncItem) => {
    if (!user || !supabase) return
    supabase.from(TABLE).upsert(toRow(item, user.id)).then(() => {})
  }, [user])

  // Remove an item from Supabase
  const syncRemove = useCallback((itemId: string) => {
    if (!user || !supabase) return
    supabase.from(TABLE).delete().eq("id", itemId).eq("user_id", user.id).then(() => {})
  }, [user])

  // Update checked state in Supabase
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
