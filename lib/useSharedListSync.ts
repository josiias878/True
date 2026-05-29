"use client"
import { useEffect, useCallback, useRef } from "react"
import { supabase } from "./supabase"

export interface SharedItem {
  id: string
  name: string
  brand: string
  emoji: string
  severity: string
  issue: string
  category: string
  checked: boolean
  addedAt: number
  addedBy: string
  personId?: string
}

const TABLE = "shared_list_items"

function toRow(item: SharedItem, listId: string, addedBy: string) {
  const sep = item.issue.indexOf("||")
  const rawCategory = sep > -1 ? item.issue.slice(0, sep) : item.category
  const rawIssue    = sep > -1 ? item.issue.slice(sep + 2) : item.issue
  return {
    list_id:       listId,
    product_id:    item.id,
    product_name:  item.name,
    product_brand: item.brand,
    product_emoji: item.emoji,
    severity:      item.severity,
    issue:         `${rawCategory}||${rawIssue}`,
    checked:       item.checked,
    added_by:      addedBy,
    added_at:      new Date(item.addedAt).toISOString(),
  }
}

function fromRow(row: any): SharedItem {
  const raw: string = row.issue ?? ""
  const sep = raw.indexOf("||")
  const category = sep > -1 ? raw.slice(0, sep) : "other"
  const issue     = sep > -1 ? raw.slice(sep + 2) : raw
  return {
    id:       row.product_id ?? row.id,
    name:     row.product_name ?? "",
    brand:    row.product_brand ?? "",
    emoji:    row.product_emoji ?? "🛒",
    severity: row.severity ?? "none",
    issue,
    category,
    checked:  row.checked ?? false,
    addedAt:  row.added_at ? new Date(row.added_at).getTime() : Date.now(),
    addedBy:  row.added_by ?? "",
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSharedListSync(
  listId: string | null,
  setItems: (fn: (prev: SharedItem[]) => SharedItem[]) => void,
  hydrated: boolean,
  myName: string,
  onNewItemByOther?: (addedBy: string, itemName: string) => void,
) {
  const fetchedRef    = useRef(false)
  const isFetchingRef = useRef(false)

  const fetchFromSupabase = useCallback(async () => {
    if (!listId || !supabase || !hydrated) return
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("list_id", listId)
        .order("added_at", { ascending: false })
        .limit(200)

      if (error) {
        console.warn("[useSharedListSync] fetch error:", error.message)
        return
      }
      const remote = (data ?? []).map(fromRow)
      setItems(() => {
        const deduped = new Map<string, SharedItem>()
        remote.forEach(r => deduped.set(r.id, r))
        return Array.from(deduped.values()).sort((a, b) => b.addedAt - a.addedAt)
      })
    } finally {
      isFetchingRef.current = false
    }
  }, [listId, hydrated, setItems])

  // Initial fetch when listId becomes available
  useEffect(() => {
    if (!listId || !hydrated || fetchedRef.current) return
    fetchedRef.current = true
    fetchFromSupabase()
  }, [listId, hydrated, fetchFromSupabase])

  // Re-fetch when app regains focus
  useEffect(() => {
    if (!listId || !supabase) return
    function onVisible() {
      if (document.visibilityState === "visible") fetchFromSupabase()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [listId, fetchFromSupabase])

  // Realtime subscription
  useEffect(() => {
    if (!listId || !supabase) return

    const channel = supabase
      .channel(`shared-list-${listId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: TABLE, filter: `list_id=eq.${listId}` },
        (payload: any) => {
          const newItem = fromRow(payload.new)
          setItems(prev => prev.some(i => i.id === newItem.id) ? prev : [newItem, ...prev])
          if (newItem.addedBy && newItem.addedBy !== myName) {
            onNewItemByOther?.(newItem.addedBy, newItem.name)
          }
        }
      )
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: TABLE, filter: `list_id=eq.${listId}` },
        (payload: any) => {
          const updated = fromRow(payload.new)
          setItems(prev => prev.map(i => i.id === updated.id ? { ...i, checked: updated.checked } : i))
        }
      )
      .on(
        "postgres_changes" as any,
        { event: "DELETE", schema: "public", table: TABLE, filter: `list_id=eq.${listId}` },
        (payload: any) => {
          const deletedId: string | undefined = payload.old?.product_id ?? payload.old?.id
          if (deletedId) setItems(prev => prev.filter(i => i.id !== deletedId))
        }
      )
      .subscribe()

    return () => { supabase?.removeChannel(channel) }
  }, [listId])

  const syncAdd = useCallback((item: SharedItem) => {
    if (!listId || !supabase) return
    supabase.from(TABLE)
      .upsert(toRow(item, listId, myName), { onConflict: "list_id,product_id" })
      .then(({ error }) => { if (error) console.warn("[useSharedListSync] syncAdd error:", error.message) })
  }, [listId, myName])

  const syncRemove = useCallback((itemId: string) => {
    if (!listId || !supabase) return
    supabase.from(TABLE)
      .delete()
      .eq("list_id", listId)
      .eq("product_id", itemId)
      .then(({ error }) => { if (error) console.warn("[useSharedListSync] syncRemove error:", error.message) })
  }, [listId])

  const syncToggle = useCallback((itemId: string, checked: boolean) => {
    if (!listId || !supabase) return
    supabase.from(TABLE)
      .update({ checked })
      .eq("list_id", listId)
      .eq("product_id", itemId)
      .then(({ error }) => { if (error) console.warn("[useSharedListSync] syncToggle error:", error.message) })
  }, [listId])

  // Upload existing local items to shared list (called once when sharing starts)
  const uploadExisting = useCallback((localItems: SharedItem[]) => {
    if (!listId || !supabase || localItems.length === 0) return
    const rows = localItems.map(i => toRow(i, listId, myName))
    supabase.from(TABLE)
      .upsert(rows, { onConflict: "list_id,product_id" })
      .then(({ error }) => { if (error) console.warn("[useSharedListSync] uploadExisting error:", error.message) })
  }, [listId, myName])

  return { syncAdd, syncRemove, syncToggle, uploadExisting, refetch: fetchFromSupabase }
}
