import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  // ⚠️ BUNDLE-ID VOR DEM ERSTEN UPLOAD FINAL FESTLEGEN — danach in App Store Connect und
  // Google Play NIE MEHR änderbar (eine neue ID = eine komplett neue App ohne Bewertungen/Käufer).
  //
  // Vorschlag: "app.kolbi.supplementlab"
  //   – passt zur Marke „Kolbi“ statt zu TRUE/get-true.de,
  //   – funktioniert auch ohne eigene Domain (die ID ist nur ein eindeutiger Name, keine Web-Adresse),
  //   – dieselbe ID für iOS (Bundle ID) und Android (Package Name) verwenden.
  // Erst ändern, wenn der Eigentümer zugestimmt hat, und BEVOR `npx cap add ios/android` läuft
  // (sonst muss die ID zusätzlich in Xcode und android/app/build.gradle angepasst werden).
  // Der aktuelle Wert bleibt bis zur Entscheidung stehen:
  appId: "de.gettrue.supplementlab",
  // Name unter dem App-Icon auf dem Home-Bildschirm (kurz halten, max. ~12 Zeichen sichtbar).
  // Der lange Store-Name („Kolbi: Supplement-Check“ / „Kolbi: Supplement Lab“) wird nur im Store gesetzt.
  appName: "Kolbi",
  webDir: "dist",
  ios: { contentInset: "never", backgroundColor: "#0f0f1a" },
  android: { backgroundColor: "#0f0f1a" },
  plugins: {
    LocalNotifications: {
      iconColor: "#2ECC8A",
    },
  },
}

export default config
