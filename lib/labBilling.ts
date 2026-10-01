// ── Bezahlen: neutrale Schnittstelle, der Anbieter (RevenueCat iOS/Android/Web) wird später angesteckt ──
// Solange kein Anbieter registriert ist, gilt: niemand muss zahlen (lib/labGrow.ts → isPro).
// Anschluss später in supplement-lab/src/billing.ts: setBillingProvider(revenueCatAdapter(...)).

export type Plan = "monthly" | "yearly" | "lifetime"
export type BuyResult = "ok" | "cancelled" | "error" | "unavailable"

/** Produkt-IDs in App Store Connect / Google Play / RevenueCat (Entitlement „pro“) */
export const PRODUCT_IDS: Record<Plan, string> = {
  monthly: "kolbi_pro_monthly",
  yearly: "kolbi_pro_yearly",
  lifetime: "kolbi_pro_lifetime",
}

export interface BillingProvider {
  /** Lokalisierte Preise aus dem Store (z. B. „2,99 €“), falls verfügbar */
  prices(): Promise<Partial<Record<Plan, string>>>
  purchase(plan: Plan): Promise<BuyResult>
  /** Käufe wiederherstellen – true, wenn „pro“ aktiv ist */
  restore(): Promise<boolean>
  /** Aktueller Stand beim Store (z. B. nach Abo-Kündigung) */
  isEntitled(): Promise<boolean>
}

let provider: BillingProvider | null = null
export function setBillingProvider(p: BillingProvider | null) { provider = p }
export const paymentsReady = () => provider !== null

export async function storePrices(): Promise<Partial<Record<Plan, string>>> {
  try { return provider ? await provider.prices() : {} } catch { return {} }
}
export async function buy(plan: Plan): Promise<BuyResult> {
  if (!provider) return "unavailable"
  try { return await provider.purchase(plan) } catch { return "error" }
}
export async function restorePurchases(): Promise<boolean | null> {
  if (!provider) return null
  try { return await provider.restore() } catch { return false }
}
export async function checkEntitlement(): Promise<boolean | null> {
  if (!provider) return null
  try { return await provider.isEntitled() } catch { return null }
}

// Nur für automatische Tests auf localhost: simulierter Store (window.__LAB_FAKE_BILLING__ = true)
try {
  const w = globalThis as { __LAB_FAKE_BILLING__?: boolean; location?: Location }
  if (w.__LAB_FAKE_BILLING__ && /^(localhost|127\.0\.0\.1)$/.test(w.location?.hostname ?? "")) {
    let owned = false
    setBillingProvider({
      prices: async () => ({}),
      purchase: async () => { owned = true; return "ok" },
      restore: async () => owned,
      isEntitled: async () => owned,
    })
  }
} catch {}
