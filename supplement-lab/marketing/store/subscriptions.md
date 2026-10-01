# Lab Pro – Abos & Kauf in App Store Connect und Google Play

> **Für dich:** Schritt für Schritt zum Abtippen. Alles, was in `code-Schrift` steht, **exakt so**
> übernehmen (Produkt-IDs lassen sich später nie mehr ändern oder wiederverwenden).
> Entscheidungen (fix): 2,99 €/Monat · 19,99 €/Jahr · 39,99 € einmalig · RevenueCat · Entitlement `pro`.
> Im Code stehen dieselben IDs in `lib/labBilling.ts` (`PRODUCT_IDS`).

## Überblick

| Plan | Produkt-ID | Typ | Preis DE | Preis US (Vorschlag) | Testphase |
|---|---|---|---|---|---|
| Monatlich | `kolbi_pro_monthly` | Auto-Renewable Subscription, 1 Monat | **2,99 €** | $2.99 | – |
| Jährlich | `kolbi_pro_yearly` | Auto-Renewable Subscription, 1 Jahr | **19,99 €** | $19.99 | **7 Tage gratis** |
| Für immer | `kolbi_pro_lifetime` | Non-Consumable (einmalig) | **39,99 €** | $39.99 | – |

Abo-Gruppe (nur Apple): **`Kolbi Pro`** – beide Abos in **derselben** Gruppe.

---

## A. Apple – App Store Connect

Voraussetzung: Vertrag **„Paid Apps“** ist unterschrieben und aktiv, Steuer- und Bankdaten sind
eingetragen (sonst kann man nicht einmal im TestFlight testen) → siehe `STORE.md`.

### A1. Abo-Gruppe anlegen

Pfad: **App Store Connect → Apps → Kolbi → (links) Monetarisierung → Abonnements → Abo-Gruppe erstellen (+)**

| Feld | Eingabe |
|---|---|
| Referenzname (intern) | `Kolbi Pro` |

Danach in der Gruppe → **Lokalisierung hinzufügen** (zweimal):

| Sprache | Anzeigename der Gruppe | App-Name-Anzeige |
|---|---|---|
| Deutsch | `Lab Pro` | „Anzeigename der App verwenden“ |
| Englisch (USA) | `Lab Pro` | „Use App Display Name“ |

Diesen Namen sehen Nutzer unter *Einstellungen → [Name] → Abonnements*.

### A2. Die zwei Abos anlegen

In der Gruppe **Kolbi Pro → Abonnement erstellen (+)**:

| Feld | Monatlich | Jährlich |
|---|---|---|
| Referenzname (intern, max. 64) | `Kolbi Pro Monthly` | `Kolbi Pro Yearly` |
| Produkt-ID | `kolbi_pro_monthly` | `kolbi_pro_yearly` |
| Abodauer | 1 Monat | 1 Jahr |
| Verfügbarkeit | Alle Länder und Regionen | Alle Länder und Regionen |
| Familienfreigabe | **Aus** (lässt sich später einschalten, aber nie wieder aus) | **Aus** |
| Steuerkategorie | Standard (App Store-Software) | Standard |

**Stufen (Level) in der Gruppe** – per Ziehen sortieren:

1. **Stufe 1: `Kolbi Pro Yearly`**
2. **Stufe 2: `Kolbi Pro Monthly`**

*Warum:* Wechselt jemand von monatlich auf jährlich, gilt das als „Upgrade“ → sofort aktiv, der
Rest des Monats wird anteilig erstattet. Wechsel von jährlich auf monatlich startet erst nach Ablauf
des bezahlten Jahres. Inhaltlich sind beide gleich (alles von Lab Pro).

#### Anzeigename & Beschreibung (je Sprache: „Lokalisierung hinzufügen“)

Apple-Grenzen: **Anzeigename max. 30 Zeichen, Beschreibung max. 45 Zeichen** (gezählt, inkl. Leerzeichen).

| Produkt | Sprache | Anzeigename | Zeichen | Beschreibung | Zeichen |
|---|---|---|---|---|---|
| Monthly | DE | `Lab Pro – monatlich` | 19 | `Muster, Kosten & alle Experimente, monatlich` | 44 |
| Monthly | EN (US) | `Lab Pro – Monthly` | 17 | `Patterns, costs & all experiments, monthly` | 42 |
| Yearly | DE | `Lab Pro – jährlich` | 18 | `Muster, Kosten & alle Experimente, 1 Jahr` | 41 |
| Yearly | EN (US) | `Lab Pro – Yearly` | 16 | `Patterns, costs & all experiments, 1 year` | 41 |

#### Preise

Pfad: Abo anklicken → **Abopreise → Preis hinzufügen (+)**

1. **Land/Region für die Preisbasis:** `Deutschland (EUR)`.
2. Preis wählen: Monthly **2,99 €**, Yearly **19,99 €** → *Weiter*. Apple rechnet alle anderen Länder
   automatisch um (inkl. jeweiliger Steuer).
3. In der Länderliste **USA** suchen → Preis manuell auf **$2.99** bzw. **$19.99** setzen
   (US-Preise sind *ohne* Umsatzsteuer, deshalb gleiche Ziffern wie in Euro).
4. Optional ebenso: Großbritannien £2.99 / £19.99, Schweiz CHF 3.00 / CHF 20.00. Sonst Apple-Vorschlag lassen.
5. *Bestätigen*.

> Preise in anderen Euro-Ländern können wegen anderer Mehrwertsteuer leicht abweichen (z. B. 2,99 € vs. 3,49 €).
> Wer das nicht möchte: bei diesen Ländern manuell auf 2,99 € / 19,99 € setzen.

#### Gratis-Testphase (nur Jährlich)

Pfad: **Kolbi Pro Yearly → Abopreise → Einführungsangebote einrichten (Introductory Offer)**

| Feld | Eingabe |
|---|---|
| Länder | Alle |
| Startdatum | heute · Enddatum: **kein Enddatum** |
| Art | **Kostenlos (Free)** |
| Dauer | **1 Woche** |

*Warum 7 Tage gratis – und nur beim Jahresabo?*
- Kolbi braucht ein paar Tage (Reset + erster Test), bis man den Nutzen von Pro sieht – eine Woche
  reicht genau dafür.
- Der Test lenkt auf den Jahresplan (bester Wert für Nutzer, planbarer Umsatz, weniger Kündigungen).
- Beim Monatsabo wäre eine Testwoche ein Viertel des Zeitraums gratis – lohnt sich nicht.
- Apple gibt pro Person nur **ein** Einführungsangebot pro Abo-Gruppe → kein „Dauer-Testen“.

#### Prüfungs-Infos (pro Abo, ganz unten „Informationen zur Prüfung“)

- **Screenshot:** Paywall mit ausgewähltem Tarif, sichtbarem Preis und Rechtstext (iPhone-Größe,
  z. B. 1290 × 2796). Erst möglich, wenn der TestFlight-Build die echten Preise zeigt.
- **Notizen:** Text aus [`review-notes.md`](./review-notes.md) → „Notes for each In-App Purchase“.

### A3. Lifetime (einmaliger Kauf)

Pfad: **Monetarisierung → In-App-Käufe → (+) erstellen**

| Feld | Eingabe |
|---|---|
| Typ | **Nicht-konsumierbar (Non-Consumable)** |
| Referenzname | `Kolbi Pro Lifetime` |
| Produkt-ID | `kolbi_pro_lifetime` |
| Verfügbarkeit | Alle Länder · Familienfreigabe **Aus** |
| Preis | Basis Deutschland **39,99 €**, USA manuell **$39.99** |

| Sprache | Anzeigename | Zeichen | Beschreibung | Zeichen |
|---|---|---|---|---|
| DE | `Lab Pro – für immer` | 19 | `Alle Pro-Funktionen – einmal zahlen` | 35 |
| EN (US) | `Lab Pro – Lifetime` | 18 | `All Pro features – pay once, keep forever` | 41 |

Screenshot + Notizen wie bei den Abos.

### A4. Mit der ersten App-Version einreichen (wichtig!)

Neue Käufe werden **nur zusammen mit einer App-Version** geprüft:
**App Store-Tab → Version 1.0 → Abschnitt „In-App-Käufe und Abonnements“ → (+)** → alle drei
Produkte auswählen. Sonst sind sie beim Start nicht kaufbar.

### A5. Werbetext für den Store (optional, jederzeit ohne Prüfung änderbar)

Pfad: **App Store-Tab → Version → Werbetext (Promotional Text, max. 170)**

| Sprache | Text | Zeichen |
|---|---|---|
| DE | `Neu: Lab Pro! Muster-Detektor, Kosten & Sparen, alle Experimente, Timing-Check und mehr. Im Jahresabo 7 Tage gratis testen.` | 123 |
| EN | `New: Lab Pro! Pattern detector, cost & savings, all experiments, timing check and more. Try the yearly plan free for 7 days.` | 124 |

> Den bisherigen Werbetext aus `listing.md` erst nach dem Start (1. Dez.) hierdurch ersetzen.
> „In-App-Käufe bewerben“ (eigenes 1024 × 1024-Bild je Produkt) ist optional – später.

**Pflicht in der App-Beschreibung (ganz unten anhängen)**, weil wir Abos verkaufen:

```
Nutzungsbedingungen: https://kolbi-smoky.vercel.app/nutzungsbedingungen
Datenschutz: https://kolbi-smoky.vercel.app/datenschutz
```
```
Terms of Use: https://kolbi-smoky.vercel.app/en/terms
Privacy Policy: https://kolbi-smoky.vercel.app/en/privacy
```
Das Feld „Lizenzvereinbarung (EULA)“ in App Store Connect leer lassen → dann gilt zusätzlich Apples
Standard-EULA.

---

## B. Google – Play Console

### B1. Abos

Pfad: **Play Console → Kolbi → Monetarisieren → Produkte → Abos → Abo erstellen**

Google kennt keine „Gruppen“; wir legen **zwei Abos** mit denselben IDs wie bei Apple an, jedes mit
**einem Basis-Abo** (Base Plan).

| Feld | Monatlich | Jährlich |
|---|---|---|
| Produkt-ID | `kolbi_pro_monthly` | `kolbi_pro_yearly` |
| Name (max. 55) | `Lab Pro – monatlich` | `Lab Pro – jährlich` |
| Basis-Abo-ID | `monthly` | `yearly` |
| Typ | Automatische Verlängerung | Automatische Verlängerung |
| Abrechnungszeitraum | 1 Monat | 1 Jahr |
| Kulanzzeitraum / Kontosperre | Standard lassen | Standard lassen |
| Preis | Deutschland **2,99 €**, USA **$2.99**, Rest „Wechselkurs übernehmen“ | **19,99 €** / **$19.99** |

**Vorteile (Benefits, max. 4 × 40 Zeichen)** – bei beiden Abos gleich:

| DE | Zeichen | EN | Zeichen |
|---|---|---|---|
| `Muster-Detektor` | 15 | `Pattern detector` | 16 |
| `Kosten & Sparen` | 15 | `Cost & savings` | 14 |
| `Alle Experimente & Timing-Check` | 31 | `All experiments & timing check` | 30 |
| `Kalender-Abo & Community-Vergleich` | 34 | `Calendar sync & community comparison` | 36 |

Englisch: oben rechts **Übersetzungen verwalten → Englisch (USA)** hinzufügen.

**Testphase (nur Jährlich):** im Abo `kolbi_pro_yearly` → Basis-Abo `yearly` → **Angebot hinzufügen**

| Feld | Eingabe |
|---|---|
| Angebots-ID | `trial-7d` |
| Berechtigung | **Neukunden-Akquisition → „Hatte noch nie ein Abo in dieser App“** |
| Phase | **Kostenloser Testzeitraum, 7 Tage** |

Danach Basis-Abos und Angebot jeweils **aktivieren**.

### B2. Lifetime

Pfad: **Monetarisieren → Produkte → In-App-Produkte (Einmalkäufe) → Produkt erstellen**

| Feld | Eingabe |
|---|---|
| Produkt-ID | `kolbi_pro_lifetime` |
| Name (max. 55) | `Lab Pro – für immer` / EN `Lab Pro – Lifetime` |
| Beschreibung (max. 200) | `Alle Pro-Funktionen von Kolbi – einmal zahlen, kein Abo.` / EN `All Kolbi Pro features – pay once, no subscription.` |
| Preis | **39,99 €** / **$39.99** |

→ **Aktivieren**. (Dass es „nicht verbrauchbar“ ist, regelt RevenueCat – nichts weiter einstellen.)

> In der Play Console gibt es Produkte erst, wenn **ein Build mit Billing** hochgeladen wurde
> (mind. interner Test). Reihenfolge also: Claude lädt Build hoch → dann Produkte anlegen.

---

## C. RevenueCat (verbindet beide Stores)

Pfad: **app.revenuecat.com → Projekt „Kolbi“**

1. **Entitlement** anlegen: Identifier `pro`.
2. **Products**: die drei Apple-Produkte + die Google-Produkte importieren. Google-IDs heißen dort
   `kolbi_pro_monthly:monthly`, `kolbi_pro_yearly:yearly`, `kolbi_pro_lifetime`.
3. Alle Produkte dem Entitlement `pro` zuordnen.
4. **Offering** `default` (als *Current* markieren) mit drei Paketen:
   `$rc_monthly` → monthly, `$rc_annual` → yearly, `$rc_lifetime` → lifetime (jeweils Apple + Google).

---

## D. Pflicht-Rechtstext für die Paywall

Apple prüft das streng (Richtlinie 3.1.2). Auf der Paywall müssen **direkt beim Kaufknopf** stehen:
Name des Abos, Laufzeit, Preis (aus dem Store, nicht fest einprogrammiert), Testphase und was danach
passiert, Hinweis auf automatische Verlängerung, wie man kündigt, Links zu Nutzungsbedingungen und
Datenschutz, „Käufe wiederherstellen“. `{preis}` = lokalisierter Preis aus dem Store.

### Deutsch – iPhone

> **Jährlich:** 7 Tage gratis, danach {preis} pro Jahr. **Monatlich:** {preis} pro Monat.
> Die Zahlung wird bei Kaufbestätigung bzw. nach Ende der Gratis-Woche über deine Apple-ID abgerechnet.
> Das Abo verlängert sich automatisch um denselben Zeitraum zum selben Preis, wenn du es nicht
> mindestens 24 Stunden vor Ablauf kündigst; die Verlängerung wird in den letzten 24 Stunden vor
> Ablauf belastet. Kündigen und verwalten kannst du dein Abo jederzeit in den iPhone-Einstellungen
> unter *[dein Name] → Abonnements*. Kündigst du in der Gratis-Woche, zahlst du nichts.
> **Für immer:** einmalig {preis}, kein Abo, keine Verlängerung.
> [Nutzungsbedingungen] · [Datenschutz] · [Käufe wiederherstellen]

### English – iPhone

> **Yearly:** 7 days free, then {price} per year. **Monthly:** {price} per month.
> Payment is charged to your Apple ID at confirmation of purchase or when the free week ends.
> Your subscription renews automatically for the same period at the same price unless you cancel at
> least 24 hours before the end of the current period; renewal is charged within the 24 hours before
> it ends. You can manage or cancel any time in your iPhone Settings under *[your name] → Subscriptions*.
> Cancel during the free week and you won't be charged.
> **Lifetime:** one-time payment of {price}, no subscription, no renewal.
> [Terms of Use] · [Privacy Policy] · [Restore Purchases]

### Android-Abweichungen

- DE: „über dein Google-Play-Konto“ statt „über deine Apple-ID“; kündigen „in der Google-Play-App unter
  *Profil → Zahlungen & Abos → Abos*“.
- EN: "charged to your Google Play account"; cancel "in the Google Play app under
  *Profile → Payments & subscriptions → Subscriptions*".

### Hinweise für die Umsetzung (Claude)

- Der Rechtstext im heutigen `PaywallSheet` (`app/lab/grow.tsx`) deckt Verlängerung + Links ab; es
  fehlen noch: Testphase-Satz, Abrechnungszeitpunkt, Kündigungs-Pfad je Plattform, Preis aus dem Store.
- Wer schon ein Abo hat und „Für immer“ kauft: Hinweis zeigen „Dein Abo bitte in den Einstellungen
  kündigen“ (Apple beendet es nicht automatisch).
- Link-Ziele: DE `…/nutzungsbedingungen`, `…/datenschutz` · EN `…/en/terms`, `…/en/privacy`.
