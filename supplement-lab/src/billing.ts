// ── Bezahlen über RevenueCat (Entitlement „pro“) ───────────────────────────────
// Aktiv nur, wenn ein Schlüssel gesetzt ist (Vercel/Build-Umgebung):
//   VITE_RC_IOS_KEY (appl_…) · VITE_RC_ANDROID_KEY (goog_…) · VITE_RC_WEB_KEY (rcb_…, Web über Stripe)
// Ohne Schlüssel bleibt alles gratis (lib/labGrow.ts → freeForAll). Die SDKs werden nur dann nachgeladen.
// Im RevenueCat-Dashboard: Offering „default“ mit Paketen $rc_monthly, $rc_annual, $rc_lifetime.
import { Capacitor } from "@capacitor/core"
import { setBillingProvider, type BuyResult, type Plan, type StoreOffer } from "@/lib/labBilling"

const ENTITLEMENT = "pro"
const PKG: Record<Plan, string> = { monthly: "$rc_monthly", yearly: "$rc_annual", lifetime: "$rc_lifetime" }
const env = import.meta.env as Record<string, string | undefined>

// Nur die Felder, die wir lesen (purchases-capacitor 13 → product, purchases-js 1.x → webBillingProduct)
type Pkg = {
  identifier: string
  product?: {
    identifier?: string; priceString?: string; pricePerMonthString?: string | null
    introPrice?: { price?: number } | null                 // iOS: Einführungsangebot (Preis 0 = Gratis-Testphase)
    defaultOption?: { freePhase?: unknown } | null          // Android: Play liefert nur Angebote, für die der Nutzer berechtigt ist
  }
  webBillingProduct?: {
    currentPrice?: { formattedPrice?: string }
    freeTrialPhase?: unknown                                // Web: Testphase des Standardangebots (Berechtigung unbekannt)
    defaultSubscriptionOption?: { base?: { pricePerMonth?: { formattedPrice?: string } | null } | null } | null
  }
}
const priceOf = (p: Pkg) => p.product?.priceString ?? p.webBillingProduct?.currentPrice?.formattedPrice
const planOf = (p: Pkg) => (Object.keys(PKG) as Plan[]).find(k => PKG[k] === p.identifier)
const pricesOf = (list: Pkg[]) => Object.fromEntries(list.map(p => [planOf(p), priceOf(p)]).filter(([k, v]) => k && v))

/** Preise + Testphase/Monatspreis. `trial` bleibt undefined, wenn nicht gesichert (→ UI zeigt keinen Gratis-Text).
 *  `iosEligible`: Ergebnis von checkTrialOrIntroductoryPriceEligibility je Produkt-ID (nur iOS). */
function offersOf(list: Pkg[], platform: string, iosEligible: Record<string, boolean | undefined> = {}): Partial<Record<Plan, StoreOffer>> {
  const out: Partial<Record<Plan, StoreOffer>> = {}
  for (const p of list) {
    const plan = planOf(p), price = priceOf(p)
    if (!plan || !price) continue
    const o: StoreOffer = { price }
    if (plan !== "lifetime") {
      let trial: boolean | undefined
      if (platform === "ios") {
        const free = p.product?.introPrice != null && p.product.introPrice.price === 0
        const ok = p.product?.identifier ? iosEligible[p.product.identifier] : undefined
        if (free && ok === true) trial = true
        else if (!free || ok === false) trial = false            // kein Gratis-Angebot oder nicht berechtigt; sonst unbekannt
      } else if (platform === "android") {
        if (p.product && "defaultOption" in p.product) trial = !!p.product.defaultOption?.freePhase
      } else if (p.webBillingProduct && "freeTrialPhase" in p.webBillingProduct) {
        // Web: purchases-js sagt nicht verlässlich, ob DIESER Nutzer die Testphase bekommt → nur „keine“ ist gesichert
        if (!p.webBillingProduct.freeTrialPhase) trial = false
      }
      if (trial !== undefined) o.trial = trial
    }
    if (plan === "yearly") {
      const pm = p.product?.pricePerMonthString ?? p.webBillingProduct?.defaultSubscriptionOption?.base?.pricePerMonth?.formattedPrice
      if (pm) o.perMonth = pm
    }
    out[plan] = o
  }
  return out
}
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
        prices: async () => pricesOf(await pkgs()),
        offers: async () => {
          const list = await pkgs()
          const elig: Record<string, boolean | undefined> = {}
          if (platform === "ios") {
            // Apple: Testphase nur für Erstabonnenten. Status 2 = berechtigt, 1/3 = nein, 0 = unbekannt.
            const ids = list.filter(p => p.product?.introPrice?.price === 0 && p.product.identifier).map(p => p.product!.identifier!)
            if (ids.length) {
              try {
                const r = await Purchases.checkTrialOrIntroductoryPriceEligibility({ productIdentifiers: ids })
                for (const id of ids) { const st = r[id]?.status; elig[id] = st === 2 ? true : st === 1 || st === 3 ? false : undefined }
              } catch {}
            }
          }
          return offersOf(list, platform, elig)
        },
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
      prices: async () => pricesOf(await pkgs()),
      offers: async () => offersOf(await pkgs(), "web"),
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
