import { Capacitor } from "@capacitor/core"
import { setHealthProvider } from "@/lib/health"

/**
 * Store-App: registriert die Apple-Health-/Health-Connect-Anbindung als Provider für
 * lib/health.ts. Im Web (TRUE) bleibt das ungenutzt — dort ist s.health immer leer.
 *
 * Store-Version 1.0 ohne Health: Das native Plugin wird dann gar nicht in die App-Projekte
 * eingebunden (capacitor.config.ts → includePlugins). Deshalb hier nur mit NEXT_PUBLIC_LAB_HEALTH=1
 * registrieren und das Plugin-JS erst dann nachladen – sonst gäbe es einen Provider, dessen
 * Aufrufe nativ ins Leere laufen.
 */
export async function initHealth(): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_LAB_HEALTH !== "1") return false
  if (!Capacitor.isNativePlatform()) return false
  const { SuppHealth } = await import("capacitor-supp-health")
  setHealthProvider({
    available: async () => (await SuppHealth.isAvailable()).available,
    requestPermission: async () => (await SuppHealth.requestPermissions()).granted,
    fetchSleep: async (start, end) => (await SuppHealth.getSleep({ startDate: start, endDate: end })).days,
    fetchHrv: async (start, end) => (await SuppHealth.getHrv({ startDate: start, endDate: end })).days,
  })
  return true
}
