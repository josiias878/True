import { Capacitor } from "@capacitor/core"
import { SuppHealth } from "capacitor-supp-health"
import { setHealthProvider } from "@/lib/health"

/**
 * Store-App: registriert die Apple-Health-/Health-Connect-Anbindung als Provider für
 * lib/health.ts. Im Web (TRUE) bleibt das ungenutzt — dort ist s.health immer leer.
 */
export async function initHealth(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  setHealthProvider({
    available: async () => (await SuppHealth.isAvailable()).available,
    requestPermission: async () => (await SuppHealth.requestPermissions()).granted,
    fetchSleep: async (start, end) => (await SuppHealth.getSleep({ startDate: start, endDate: end })).days,
    fetchHrv: async (start, end) => (await SuppHealth.getHrv({ startDate: start, endDate: end })).days,
  })
  return true
}
