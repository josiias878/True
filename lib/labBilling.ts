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

/** Angebot eines Tarifs, wie der Store es gerade liefert (alles außer `price` nur, wenn gesichert) */
export interface StoreOffer {
  /** Lokalisierter Preis (z. B. „19,99 €“) */
  price: string
  /** true NUR, wenn der Store eine kostenlose Testphase liefert UND dieser Nutzer sie bekommt
   *  (iOS: Einführungsangebot mit Preis 0 + Berechtigung „eligible“; Android/Web: Gratis-Phase im Standardangebot).
   *  Fehlt/undefined = unbekannt → kein Gratis-Text anzeigen. */
  trial?: boolean
  /** Monatspreis-Umrechnung vom Store (z. B. „1,66 €“), nur Jahrestarif und nur falls geliefert */
  perMonth?: string
}

export interface BillingProvider {
  /** Lokalisierte Preise aus dem Store (z. B. „2,99 €“), falls verfügbar */
  prices(): Promise<Partial<Record<Plan, string>>>
  /** Wie prices(), aber mit Zusatzinfos (Testphase, Monatspreis). Optional – fehlt es, wird aus prices() abgeleitet. */
  offers?(): Promise<Partial<Record<Plan, StoreOffer>>>
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
/** Preise samt Testphase/Monatspreis – für die Kaufseite. Gratis-Text nur bei `offers.yearly?.trial === true`. */
export async function storeOffers(): Promise<Partial<Record<Plan, StoreOffer>>> {
  if (!provider) return {}
  try {
    if (provider.offers) return await provider.offers()
    const p = await provider.prices()
    return Object.fromEntries(Object.entries(p).filter(([, v]) => v).map(([k, v]) => [k, { price: v as string }]))
  } catch { return {} }
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
