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
Kolbi is a journaling and self-experiment tool for adults who already take supplements. Users test
one supplement at a time, do a 1-minute evening check-in (sleep, energy, calm, focus) and compare
the results with their own baseline. The app does not recommend supplements or personal doses and
makes no health claims. It is not a medical device.

NO ACCOUNT / NO LOGIN
There is no sign-up. All personal entries are stored locally on the device.

HOW TO TEST QUICKLY
1. Launch the app. On the first screen, tap "Look around with sample data first"
   (German UI: "Erst mal mit Beispiel-Daten umschauen"). This loads about 3 weeks of sample
   data; a "DEMO" badge (German: "BEISPIEL") is shown next to the title.
2. Explore the tabs: Today, Supps, Results, Kolbi.
3. Alternatively tap "Let's go · 1 minute" to run the real onboarding (about 1 minute).
4. Sample data can be loaded or ended any time: Settings (gear icon, top right) ->
   "View demo data (your data is backed up)" / "End demo".
5. Language follows the device language (German or English) and can be switched in Settings.

IN-APP PURCHASES (Lab Pro)
The core of the app is free: supplement tests, daily check-in, reminders and results.
"Lab Pro" unlocks: pattern detector, cost & savings, all ready-made experiments, timing check,
calendar sync and the anonymous community comparison.
Products: kolbi_pro_monthly and kolbi_pro_yearly (auto-renewable, group "Kolbi Pro"; the yearly
plan has a 7-day free trial for new subscribers) and kolbi_pro_lifetime (non-consumable).
Where to find the plans: Kolbi tab (bottom right) -> "Lab Pro" card -> "See plans".
"Restore purchases" is directly below the purchase button.
Note on "Founder": everyone who starts the app before December 1, 2026 gets Lab Pro for free as
a thank-you for joining early (shown as "Founder Pro active"). If this review happens before
Dec 1, your device will show Founder status and the Pro features are already unlocked. The plans,
the purchase button ("Support Kolbi anyway") and "Restore purchases" stay reachable via the path
above, so all three products can be bought in the sandbox.

NOTIFICATIONS
Local notifications only (intake and evening check-in reminders), scheduled on the device.

OPTIONAL SERVER FEATURES (all anonymous, EU servers in Frankfurt)
 - Community results: opt-in only. Sends the library supplement ID, test length, verdict and
   rating changes with a random app-generated ID - no name, no dates, no notes. Can be deleted
   any time in Settings ("Delete my shared results").
 - Calendar sync (Lab Pro): uploads a calendar file with neutral event titles under a random
   token; "End subscription (link stops working)" in the calendar card deletes it (this is the
   calendar feed, not the Lab Pro subscription).
 - Feedback form: free text without any identifier.
 - Anonymous usage counters (e.g. "first check-in" +1 per day), no device ID; can be switched off
   in Settings -> "Anonymous stats".
Purchases are processed by Apple; RevenueCat checks the subscription status with an anonymous ID.
No tracking, no ads, no third-party analytics, no data sold. No HealthKit in this version.

SHOPPING LINKS
For some supplements the app shows a plain Amazon search link that opens in the browser. Nothing is
sold in the app except Lab Pro.

MEDICAL DISCLAIMER
Kolbi is not a medical device. It does not diagnose, treat, cure or prevent any condition and does
not replace medical advice. Results are the user's own subjective ratings. The disclaimer is shown
in onboarding, in the app and in the App Store description. Research peptides are not part of the
in-app library; prescription drugs only appear as a neutral category the user can log.

Privacy policy: https://kolbi-smoky.vercel.app/en/privacy
Terms of use:   https://kolbi-smoky.vercel.app/en/terms
```

> ⚠️ **Vor dem Einreichen prüfen:**
> (1) **„Lab Pro“-Karte → „See plans“ gibt es heute noch nicht.** Heute öffnet die Tarif-Seite nur über eine
> gesperrte „🔒 Lab Pro“-Karte – und die sehen Gründer nicht. Übergabe an Logik (`forms.md` Abschnitt 4, Punkt 1).
> Erst wenn der Knopf im TestFlight-Build ist, die Beschriftung hier exakt übernehmen (DE/EN).
> (2) Beschriftungen in der App noch gleich? (`Look around with sample data first` → `app/lab/flows.tsx`,
> `View demo data …`/`End demo`/`Anonymous stats`/`Delete my shared results` → `app/lab/LabApp.tsx`,
> `Founder Pro active`/`Support Kolbi anyway`/`Restore purchases` → `app/lab/grow.tsx`).
> (3) Kauf-Tipps mit Mengenangaben im Vorrat (`lib/labStock.ts`) im Store-Modus neutral? Sonst passt
> „does not recommend … personal doses“ nicht (Übergabe an Logik, Punkt 4).
> (4) Endgültige Domain eintragen, falls sich `kolbi-smoky.vercel.app` ändert.
> (5) Länge prüfen: max. 4000 Zeichen.

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

## 2. App Store Connect → App Privacy („Nutrition Label“)

→ **Maßgeblich ist jetzt [`forms.md`](./forms.md) Abschnitt 2.2** (Stand 2. Okt 2026, im Code geprüft:
5 Datentypen, nichts verknüpft, kein Tracking; Kaufverlauf mit Zwecken App-Funktionalität + Analysen laut
RevenueCat-Doku; kein HealthKit in 1.0).

---

## 3. Google Play Console → App content (Datensicherheit, Gesundheits-Apps, Zielgruppe …)

→ **Maßgeblich ist jetzt [`forms.md`](./forms.md) Abschnitt 1** (Datenschutz-URL, App-Zugriff, Werbung,
IARC-Fragebogen, Zielgruppe 18+, Datensicherheit je Datentyp, Gesundheits-Apps, Werbe-ID, Kategorie, Kontakt).
Version 1.0 enthält **kein Health Connect** – keine Health-Connect-Erklärung nötig.

---

## 4. Medical disclaimer (Kurzfassung für alle Formulare)

> Kolbi is a journaling and self-experiment tool, not a medical device. It does not diagnose, treat, cure
> or prevent any condition and does not replace medical advice. Results are the user's own subjective
> ratings. The app does not recommend supplements or personal doses.
>
> DE und Begründung je Richtlinie: [`forms.md`](./forms.md) Abschnitt 2.4.
