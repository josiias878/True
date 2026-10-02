# capacitor-supp-health

Eigenes, sehr kleines Capacitor-Plugin, nur für Supplement Lab. Liest **ausschließlich zwei
Werte**: Schlafdauer und Herzratenvariabilität (HRV) — aus Apple Health (iOS) bzw. Google
Health Connect (Android). Bewusst kein Training, keine Schritte, keine Workouts.

⚠️ **Dieser Code ist neu und ungetestet** (Swift/Kotlin lassen sich hier nicht kompilieren —
keine Xcode-/Android-Studio-Umgebung verfügbar). Wenn beim Bauen Fehler auftauchen, schick sie
einfach zurück, dann fixe ich sie.

Es gibt aktuell kein fertiges Capacitor-Plugin, das Schlaf **und** HRV auf **beiden**
Plattformen abdeckt (geprüft: `capacitor-health`, `@perfood/capacitor-healthkit`,
`capacitor-health-connect` — keins von denen deckt beides ab). Daher dieses eigene, minimale
Plugin statt einer Fremdabhängigkeit.

## Setup iOS (in Xcode, nach `npx cap add ios`)

1. Target auswählen → **Signing & Capabilities** → **+ Capability** → **HealthKit** hinzufügen.
2. In der `Info.plist` (unter `ios/App/App/Info.plist`) ergänzen:
   ```xml
   <key>NSHealthShareUsageDescription</key>
   <string>Supplement Lab liest deinen Schlaf und deine HRV, um zu zeigen, wie sich deine Supplements auf Erholung und Stress auswirken. Alles bleibt auf deinem Gerät.</string>
   ```
3. `npx cap sync ios` — das Plugin wird automatisch als lokales Swift Package eingebunden
   (`Package.swift` hier im Ordner; die `.podspec` bleibt für CocoaPods-Projekte).

## Setup Android (nach `npx cap add android`)

Die App braucht `minSdkVersion = 26` (Health Connect), steht in `android/variables.gradle`.

In `android/app/src/main/AndroidManifest.xml` ergänzen:

```xml
<!-- im <manifest>-Root -->
<queries>
    <package android:name="com.google.android.apps.healthdata" />
</queries>
<uses-permission android:name="android.permission.health.READ_SLEEP" />
<uses-permission android:name="android.permission.health.READ_HEART_RATE_VARIABILITY" />

<!-- im <application>-Tag: Rationale-Screen, den Health Connect verlangt -->
<activity
    android:name="androidx.health.connect.client.PermissionController$RationaleActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
    </intent-filter>
</activity>
<activity-alias
    android:name="ViewPermissionUsageActivity"
    android:exported="true"
    android:targetActivity="androidx.health.connect.client.PermissionController$RationaleActivity"
    android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
    <intent-filter>
        <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
        <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
    </intent-filter>
</activity-alias>
```

Health Connect muss auf dem Gerät installiert sein (ab Android 14 vorinstalliert, davor über
den Play Store nachinstallierbar). Ist es nicht installiert, bleibt `isAvailable()` einfach
`false` — die App fragt dann gar nicht erst nach Health-Daten.

## API

```ts
import { SuppHealth } from "capacitor-supp-health"

await SuppHealth.isAvailable()        // { available: boolean }
await SuppHealth.requestPermissions() // { granted: boolean }
await SuppHealth.getSleep({ startDate: "...", endDate: "..." }) // { days: [{ date, hours }] }
await SuppHealth.getHrv({ startDate: "...", endDate: "..." })   // { days: [{ date, ms }] }
```
