import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  // ⚠️ Bundle-ID vor dem ersten Upload final festlegen — danach nicht mehr änderbar.
  appId: "de.gettrue.supplementlab",
  appName: "Supplement Lab",
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
