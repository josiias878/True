"use client"
import { useState, useEffect, useCallback } from "react"

export const FREE_DAILY_LIMIT = 5

function todayKey() {
  return `true-scans-${new Date().toISOString().slice(0, 10)}`
}

export function useScanLimit() {
  const [scansToday, setScansToday] = useState(0)
  const [isPremium,  setIsPremium]  = useState(false)

  useEffect(() => {
    try {
      const n = parseInt(localStorage.getItem(todayKey()) ?? "0", 10)
      setScansToday(isNaN(n) ? 0 : n)
    } catch {}
    try {
      setIsPremium(localStorage.getItem("true-premium") === "1")
    } catch {}
  }, [])

  const scansLeft   = Math.max(0, FREE_DAILY_LIMIT - scansToday)
  const canScan     = isPremium || scansLeft > 0
  const isLimitHit  = !isPremium && scansToday >= FREE_DAILY_LIMIT

  const recordScan = useCallback(() => {
    if (isPremium) return
    setScansToday(prev => {
      const next = prev + 1
      try { localStorage.setItem(todayKey(), String(next)) } catch {}
      return next
    })
  }, [isPremium])

  return { canScan, scansLeft, scansToday, isLimitHit, isPremium, recordScan, FREE_DAILY_LIMIT }
}
