// ── Bezahlen über RevenueCat (Entitlement „pro“) ───────────────────────────────
// Aktiv nur, wenn ein Schlüssel gesetzt ist (Vercel/Build-Umgebung):
//   VITE_RC_IOS_KEY (appl_…) · VITE_RC_ANDROID_KEY (goog_…) · VITE_RC_WEB_KEY (rcb_…, Web über Stripe)
// Ohne Schlüssel bleibt alles gratis (lib/labGrow.ts → freeForAll). Die SDKs werden nur dann nachgeladen.
// Im RevenueCat-Dashboard: Offering „default“ mit Paketen $rc_monthly, $rc_annual, $rc_lifetime.
import { Capacitor } from "@capacitor/core"
import { setBillingProvider, type BuyResult, type Plan } from "@/lib/labBilling"

const ENTITLEMENT = "pro"
const PKG: Record<Plan, string> = { monthly: "$rc_monthly", yearly: "$rc_annual", lifetime: "$rc_lifetime" }
const env = import.meta.env as Record<string, string | undefined>

type Pkg = { identifier: string; product?: { priceString?: string }; webBillingProduct?: { currentPrice?: { formattedPrice?: string } } }
const priceOf = (p: Pkg) => p.product?.priceString ?? p.webBillingProduct?.currentPrice?.formattedPrice
const active = (info: unknown) => !!(info as { entitlements?: { active?: Record<string, unknown> } })?.entitlements?.active?.[ENTITLEMENT]
const cancelled = (e: unknown) => {
  const x = e as { userCancelled?: boolean; code?: string | number; errorCode?: number }
  return x?.userCancelled === true || x?.code === "1" || x?.code === 1 || x?.errorCode === 1
}

/** Anonyme, zufällige Kennung für Web-Käufe (nur für RevenueCat, keine persönlichen Daten) */
function webUserId(): string {
  try {
    const k = "lab-rc-user"
    let id = localStorage.getItem(k)
    if (!id) { id = `kolbi_${crypto.randomUUID()}`; localStorage.setItem(k, id) }
    return id
  } catch { return `kolbi_${Math.random().toString(36).slice(2)}` }
}

export async function initBilling(): Promise<boolean> {
  const platform = Capacitor.getPlatform()
  try {
    if (platform === "ios" || platform === "android") {
      const key = platform === "ios" ? env.VITE_RC_IOS_KEY : env.VITE_RC_ANDROID_KEY
      if (!key) return false
      const { Purchases } = await import("@revenuecat/purchases-capacitor")
      await Purchases.configure({ apiKey: key })
      const pkgs = async () => ((await Purchases.getOfferings()).current?.availablePackages ?? []) as unknown as Pkg[]
      setBillingProvider({
        prices: async () => Object.fromEntries((await pkgs()).map(p => [(Object.keys(PKG) as Plan[]).find(k => PKG[k] === p.identifier), priceOf(p)]).filter(([k, v]) => k && v)),
        purchase: async (plan): Promise<BuyResult> => {
          const p = (await pkgs()).find(x => x.identifier === PKG[plan])
          if (!p) return "error"
          try { const r = await Purchases.purchasePackage({ aPackage: p as never }); return active(r.customerInfo) ? "ok" : "error" }
          catch (e) { return cancelled(e) ? "cancelled" : "error" }
        },
        restore: async () => active((await Purchases.restorePurchases()).customerInfo),
        isEntitled: async () => active((await Purchases.getCustomerInfo()).customerInfo),
      })
      return true
    }
    const key = env.VITE_RC_WEB_KEY
    if (!key) return false
    const { Purchases } = await import("@revenuecat/purchases-js")
    const rc = Purchases.configure(key, webUserId())
    const pkgs = async () => ((await rc.getOfferings()).current?.availablePackages ?? []) as unknown as Pkg[]
    setBillingProvider({
      prices: async () => Object.fromEntries((await pkgs()).map(p => [(Object.keys(PKG) as Plan[]).find(k => PKG[k] === p.identifier), priceOf(p)]).filter(([k, v]) => k && v)),
      purchase: async (plan): Promise<BuyResult> => {
        const p = (await pkgs()).find(x => x.identifier === PKG[plan])
        if (!p) return "error"
        try { const r = await rc.purchase({ rcPackage: p as never }); return active(r.customerInfo) ? "ok" : "error" }
        catch (e) { return cancelled(e) ? "cancelled" : "error" }
      },
      restore: async () => active(await rc.getCustomerInfo()),
      isEntitled: async () => active(await rc.getCustomerInfo()),
    })
    return true
  } catch { return false }
}
