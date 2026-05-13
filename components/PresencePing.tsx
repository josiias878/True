"use client"
// Meldet den aktuellen Nutzer als "online" über Supabase Realtime Presence.
// Wird in layout.tsx eingebunden — läuft im Hintergrund auf jeder Seite.
import { useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function PresencePing() {
  useEffect(() => {
    if (!supabase) return
    const uid = (() => {
      try {
        let id = sessionStorage.getItem("true-presence-id")
        if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem("true-presence-id", id) }
        return id
      } catch { return Math.random().toString(36).slice(2) }
    })()

    const channel = supabase.channel("app-presence", { config: { presence: { key: uid } } })
    channel.subscribe(async status => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() })
      }
    })
    return () => { supabase?.removeChannel(channel) }
  }, [])

  return null
}
