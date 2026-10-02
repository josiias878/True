import type { CapacitorConfig } from "@capacitor/cli"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Native Plugins = alle Abhängigkeiten aus package.json (wie Capacitor-Standard), AUSSER dem
// Health-Plugin: Store-Version 1.0 startet ohne Apple Health / Health Connect. Ohne diesen Ausschluss
// würde `cap sync` das HealthKit-Framework mitlinken (Apple: „App referenziert HealthKit“, Rückfragen
// im Review) und auf Android die Health-Connect-Bibliothek samt <queries> einbauen.
// Wieder an: NEXT_PUBLIC_LAB_HEALTH=1 beim `vite build` UND beim `cap sync` setzen (dieselbe Variable
// schaltet in lib/health.ts die Oberfläche frei) – plus HealthKit-Capability, Info.plist-Text und
// Health-Connect-Manifest-Einträge laut packages/capacitor-supp-health/README.md.
const HEALTH = process.env.NEXT_PUBLIC_LAB_HEALTH === "1"
const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { dependencies?: Record<string, string> }
const nativePlugins = Object.keys(pkg.dependencies ?? {}).filter(name => HEALTH || name !== "capacitor-supp-health")

const config: CapacitorConfig = {
  // Nicht-Plugins in der Liste (react, …) ignoriert Capacitor beim Auflösen.
  includePlugins: nativePlugins,
  // App-ID (iOS Bundle ID + Android Package Name), vom Inhaber entschieden am 2. Okt 2026: "app.kolbi".
  // ⚠️ Nach dem ersten Upload in App Store Connect / Google Play NIE MEHR änderbar (eine neue ID =
  // eine komplett neue App ohne Bewertungen/Käufer). Steht zusätzlich fest in ios/App/App.xcodeproj
  // (PRODUCT_BUNDLE_IDENTIFIER) und android/app/build.gradle (namespace/applicationId).
  appId: "app.kolbi",
  // Name unter dem App-Icon auf dem Home-Bildschirm (kurz halten, max. ~12 Zeichen sichtbar).
  // Der lange Store-Name („Kolbi: Supplement-Check“ / „Kolbi: Supplement Lab“) wird nur im Store gesetzt.
  appName: "Kolbi",
  webDir: "dist",
  ios: { contentInset: "never", backgroundColor: "#0f0f1a" },
  android: { backgroundColor: "#0f0f1a" },
  plugins: {
    LocalNotifications: {
      // Android-Statusleisten-Symbol: einfarbige Kolben-Silhouette (android/app/src/main/res/drawable/ic_stat_kolbi.xml);
      // ohne eigenes Small-Icon zeigt Android nur ein weißes Quadrat
      smallIcon: "ic_stat_kolbi",
      iconColor: "#2ECC8A",
    },
  },
}

export default config
