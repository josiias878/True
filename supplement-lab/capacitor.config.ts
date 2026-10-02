import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
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
