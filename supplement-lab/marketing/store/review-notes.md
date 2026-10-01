# App Review Notes, App Privacy & Data Safety

> **Für dich (Eigentümer):** Diese Datei ist zum **Kopieren in App Store Connect bzw. die Play Console**.
> Die Texte sind auf Englisch, weil die Prüfer Englisch lesen. Kästen mit ⚠️ vor dem Einreichen prüfen.
> Wo was hinkommt: siehe [`../../STORE.md`](../../STORE.md).

---

## 1. App Store Connect → App Review Information

| Field | Value |
|---|---|
| Sign-in required | **No** (leave username/password empty) |
| Contact | [Vorname Nachname] · [Telefon] · [E-Mail] |
| Attachment | optional: 30-second screen recording of onboarding → demo data → paywall |

### Notes (paste into "Notes", max 4000 characters)

```
Kolbi is a journaling and self-experiment tool for people who already take supplements. Users test
one supplement at a time, do a 1-minute evening check-in (sleep, energy, calm, focus) and compare
the results with their own baseline. The app does not recommend substances or doses and makes no
health claims.

NO ACCOUNT / NO LOGIN
There is no sign-up. All personal entries are stored locally on the device.

HOW TO TEST QUICKLY
1. Launch the app. On the first screen, tap "Look around with sample data first"
   (German UI: "Erst mal mit Beispiel-Daten umschauen"). This loads ~3 weeks of demo data
   (a "DEMO" badge is shown next to the title).
2. Explore the tabs: Today, Supps, Results, Kolbi.
3. Alternatively tap "Let's go · 1 minute" to run the real onboarding (about 1 minute).
4. Demo data can also be loaded or ended any time: Settings (gear icon, top right) →
   "View demo data (your data is backed up)" / "End demo".
5. Language follows the device language (German or English) and can be switched in Settings.

IN-APP PURCHASES (Lab Pro)
The core of the app is free: supplement tests, daily check-in, reminders and results.
"Lab Pro" unlocks these extra features:
 - Pattern detector (what is associated with your sleep & energy ratings in your own entries)
 - Cost & savings (what your stack costs per month and what you save)
 - All ready-made experiments (sleep, focus, calm, training and more)
 - Timing check (what to take apart, what together – on a day line)
 - Calendar sync (results automatically in your calendar)
 - Community comparison (anonymous, aggregated results of other users)
Products: kolbi_pro_monthly and kolbi_pro_yearly (auto-renewable, group "Kolbi Pro"; the yearly
plan has a 7-day free trial for new subscribers) and kolbi_pro_lifetime (non-consumable).
Where to find the paywall: Kolbi tab (bottom right) → "Lab Pro" card, or tap any feature marked
"🔒 Lab Pro". "Restore purchases" is directly below the purchase button on the paywall.
Early beta users (before Dec 1, 2026) received Lab Pro for free as a thank-you ("Founder").
[⚠️ CONFIRM: the review build must show the plans to the reviewer – see STORE.md, item "Paywall für Prüfer"]

APPLE HEALTH (optional)  [⚠️ remove this block if HealthKit is not in this build]
Settings → "Apple Health / Health Connect". The app only READS sleep duration and heart rate
variability (HRV) to show them next to the user's own check-ins. Health data never leaves the
device, is not used for advertising and is not stored in iCloud. Nothing is written to Health.

NOTIFICATIONS
Local notifications only (intake and evening check-in reminders), scheduled on the device.

OPTIONAL SERVER FEATURES (all anonymous, EU servers in Frankfurt)
 - Community results: opt-in only (asked after a finished test, toggle in Settings). Sends the
   library supplement ID, test length, verdict and rating changes with a random device ID – no
   name, no dates, no notes. Can be deleted any time in Settings.
 - Calendar sync: uploads a calendar file with neutral event titles under a random token;
   "Unsubscribe" deletes it.
 - Feedback form: free text without any identifier.
 - Anonymous usage counters (e.g. "first check-in" +1 per day), no device ID; can be switched off
   in Settings → "Anonymous stats".
No tracking, no ads SDKs, no third-party analytics in the app, no data sold.

MEDICAL DISCLAIMER
Kolbi is not a medical device. It does not diagnose or treat anything and does not replace
medical advice. The disclaimer is shown in onboarding, in the app and in the App Store
description. Research peptides and prescription drugs are not part of the in-app library.

Privacy policy: https://kolbi-smoky.vercel.app/en/privacy
Terms of use:   https://kolbi-smoky.vercel.app/en/terms
```

> ⚠️ **Vor dem Einreichen prüfen:** (1) Stehen die Beschriftungen noch so in der App? (`Look around with
> sample data first` → `app/lab/flows.tsx`, `View demo data …`/`End demo` → `app/lab/LabApp.tsx`).
> (2) Ist Apple Health in diesem Build drin? Sonst den Block löschen. (3) Endgültige Domain eintragen,
> falls sich `kolbi-smoky.vercel.app` ändert.

### Notes for each In-App Purchase (field "Review Notes" on the product page)

```
Unlocks Lab Pro (pattern detector, cost & savings, all experiments, timing check, calendar sync,
community comparison). Paywall: Kolbi tab → "Lab Pro" card, or any "🔒 Lab Pro" card.
Restore purchases: link below the purchase button on the paywall. No account needed.
```

**Review screenshot (Pflicht, je Produkt):** Screenshot der Pro-Seite (Paywall) auf dem iPhone, auf dem
der jeweilige Tarif **ausgewählt** ist (Jährlich / Monatlich / Für immer), inkl. Preis und Rechtstext.
Größe wie ein normaler iPhone-Screenshot (z. B. 1290 × 2796). Kann erst gemacht werden, wenn die Paywall
im TestFlight-Build die echten Store-Preise zeigt. Details: [`subscriptions.md`](./subscriptions.md).

---

## 2. App Store Connect → App Privacy ("Nutrition Label")

Pfad: **App Store Connect → Apps → Kolbi → App-Datenschutz (App Privacy) → Get Started**.
Muss zu `native/ios/PrivacyInfo.xcprivacy` passen.

**Q: Do you or your third-party partners collect data from this app?** → **Yes, we collect data from this app**

| Data type (Apple category) | What exactly | Linked to user? | Used for tracking? | Purposes |
|---|---|---|---|---|
| **Health & Fitness → Health** | Anonymous community result (library supplement ID, test days, verdict, rating changes, side-effect IDs) – **opt-in only** | No | No | App Functionality |
| **User Content → Other User Content** | Feedback text (no identifier); calendar-sync file (neutral titles; supplement names only if the user turns that on) | No | No | App Functionality |
| **Identifiers → Device ID** | Random ID created by the app (replace/delete own community results); random calendar token. Not IDFA/IDFV | No | No | App Functionality |
| **Usage Data → Product Interaction** | Anonymous daily counters per event ("onboarding done", "first check-in"), app language, referral channel; can be turned off | No | No | Analytics |
| **Purchases → Purchase History** | Purchase/subscription status processed by RevenueCat (anonymous app user ID) | No | No | App Functionality |

**Not collected** (answer "No" / don't select): Contact Info, Location, Sensitive Info, Contacts,
Financial Info, Browsing/Search History, Fitness, Diagnostics, Photos/Videos, Audio, Gameplay,
Customer Support, Advertising Data, Other Data. Health data from **Apple Health** stays on the device →
**not** "collected" in Apple's sense. Local check-ins/supplements stay on the device → not collected.

Result shown in the store: **"Data Not Linked to You"** – Health, User Content, Identifiers, Usage Data,
Purchases. **"Data Used to Track You": none.**

> Warum „Purchase History“? RevenueCat speichert den Kaufstatus auf seinen Servern. Erst ankreuzen,
> wenn RevenueCat wirklich eingebaut ist (Version 1 mit Lab Pro → ja).
>
> Hinweis: Vercel Web Analytics läuft **nur im Browser**, nicht in der Store-App → gehört hier nicht rein.
> Server-Push wird in der Store-App nicht benutzt (dort lokale Benachrichtigungen) → keine Push-Adresse.

**Privacy Policy URL:** `https://kolbi-smoky.vercel.app/en/privacy` (EN) / `…/datenschutz` (DE-Lokalisierung)

---

## 3. Google Play Console → App content → Data safety

Pfad: **Play Console → Kolbi → Policy → App content → Data safety → Start**.

**Overview questions**

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only) |
| Which of the following methods of account creation does your app support? | **My app does not allow users to create an account** |
| Do you provide a way for users to request that their data is deleted? | **Yes** – in Settings (community results, calendar sync); everything else is local or anonymous |

**Data types**

| Play category → type | Collected | Shared | Ephemeral? | Required/optional | Purposes |
|---|---|---|---|---|---|
| **Health and fitness → Health info** (anonymous community result) | Yes | No | No | **Optional** (opt-in) | App functionality |
| **App activity → App interactions** (anonymous daily event counters) | Yes | No | No | **Optional** (can be turned off in Settings) | Analytics |
| **App activity → Other user-generated content** (feedback text, calendar-sync file) | Yes | No | No | **Optional** | App functionality |
| **Device or other IDs** (random app-generated ID / calendar token) | Yes | No | No | **Optional** (only with community or calendar sync) | App functionality |
| **Financial info → Purchase history** (via Google Play Billing / RevenueCat) | Yes | No | No | **Optional** (only when buying) | App functionality |

Everything else: **not collected** (Location, Personal info, Messages, Photos, Audio, Files, Calendar,
Contacts, Web browsing, App info & performance). **Health Connect** data (sleep, HRV) is read and
processed on the device only → not collected.

> „Shared“ = Nein: Supabase (Server) und RevenueCat sind **Dienstleister**, die in unserem Auftrag
> arbeiten – das zählt bei Google nicht als „Teilen“.

**Zusätzlich in der Play Console (App content), sonst kein Release:**
- *Privacy policy*: `https://kolbi-smoky.vercel.app/datenschutz`
- *Ads*: **No, my app does not contain ads** (die Amazon-Suchlinks sind keine Werbe-SDKs; falls später
  ein Partner-Tag gesetzt wird, bleibt es „No ads“, aber in der Beschreibung als Anzeige kennzeichnen)
- *Health apps declaration*: Kategorie **Health & Fitness → Health/Wellness tracking**; „not a medical device“
- *Health Connect permissions* (nur wenn Health auf Android drin ist): READ_SLEEP und
  READ_HEART_RATE_VARIABILITY begründen: „Shown next to the user's own daily check-ins to compare
  test phases with the baseline. Read-only, processed on device, never uploaded.“
- *Target audience*: 18+ (keine Kinder-Zielgruppe)
- *Content rating* (IARC-Fragebogen): keine Gewalt etc.; „Medizinische Infos“ nur allgemein

---

## 4. Medical disclaimer (Kurzfassung für alle Formulare)

> Kolbi is a journaling and self-experiment tool, not a medical device. It does not diagnose, treat or
> prevent any condition and does not replace medical advice. Results are the user's own subjective
> ratings. The app does not recommend substances or doses.
