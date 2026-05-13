# TRUE — Vollständige Codebase-Dokumentation
**Stand: April 2026 · Version 2.0**

> Diese Datei dokumentiert den gesamten Code der TRUE-App so vollständig, dass sie von Grund auf neu aufgebaut werden kann. Alle Technologien, Strukturen, Umgebungsvariablen, Datenbankschemas und Logiken sind hier erfasst.

---

## 📂 Wo liegt das Projekt?

```
/Users/josiias878/Desktop/TRUE/
```

**Im Finder öffnen:**
```bash
open /Users/josiias878/Desktop/TRUE
```

**In VS Code öffnen:**
```bash
code /Users/josiias878/Desktop/TRUE
```

**Lokal starten:**
```bash
cd /Users/josiias878/Desktop/TRUE
npm run dev
# → http://localhost:3000
```

---

## 📋 Alle Dateien auf einen Blick

### app/ — Seiten

| Datei | Route | Was macht sie |
|---|---|---|
| `app/page.tsx` | `/` | Landingpage für neue Nutzer |
| `app/layout.tsx` | alle | Root-Layout: Navigation, Theme, Service Worker |
| `app/not-found.tsx` | `404` | Seite nicht gefunden |
| `app/home/page.tsx` | `/home` | ⭐ Hauptseite nach Login: Feed, Quick-Scan, Tipp |
| `app/scan/page.tsx` | `/scan` | ⭐ Barcode-Scanner + Produktbewertung |
| `app/feed/page.tsx` | `/feed` | News-Artikel (Bot + Redaktion) |
| `app/community/page.tsx` | `/community` | Nutzer-Posts, Folgen, Kommentare |
| `app/list/page.tsx` | `/list` | Persönliche Einkaufsliste |
| `app/list/shared/page.tsx` | `/list/shared` | Geteilte Liste via Link (ohne Login) |
| `app/profile/page.tsx` | `/profile` | Profil, Ziele, Theme, Benachrichtigungen |
| `app/dashboard/page.tsx` | `/dashboard` | Nutzer-Statistiken und Badges |
| `app/premium/page.tsx` | `/premium` | Premium-Warteliste und Feature-Vorschau |
| `app/partner/page.tsx` | `/partner` | B2B-Landingpage für Unternehmenspartner |
| `app/map/page.tsx` | `/map` | Konzern-Skandale auf Weltkarte |
| `app/admin/page.tsx` | `/admin` | Admin-Panel (Passwort: true2026admin) |
| `app/login/page.tsx` | `/login` | Login-Seite |
| `app/datenschutz/page.tsx` | `/datenschutz` | Datenschutzerklärung |
| `app/impressum/page.tsx` | `/impressum` | Impressum |
| `app/auth/callback/page.tsx` | `/auth/callback` | Supabase Auth-Callback nach E-Mail |
| `app/auth/reset-password/page.tsx` | `/auth/reset-password` | Passwort neu setzen |

### app/api/ — Backend-Routen

| Datei | Endpoint | Funktion |
|---|---|---|
| `api/lookup/route.ts` | `/api/lookup?q=` | Barcode → Produktdaten (Open Food Facts + eigene DB) |
| `api/bot/route.ts` | `/api/bot` | Bot-Verarbeitung |
| `api/cron/route.ts` | `/api/cron` | Automatische News-Posts (täglich per Cron) |
| `api/social/route.ts` | `/api/social` | Social-Media-Bot |
| `api/waitlist/route.ts` | `/api/waitlist` | Premium-Warteliste + Bestätigungsmail |
| `api/partner-contact/route.ts` | `/api/partner-contact` | Partner-Anfragen + E-Mail-Benachrichtigung |
| `api/review-suggestion/route.ts` | `/api/review-suggestion` | KI-generierter App-Bewertungstext |
| `api/admin-users/route.ts` | `/api/admin-users` | Admin: Nutzer abrufen |
| `api/admin-ban/route.ts` | `/api/admin-ban` | Admin: Nutzer sperren |
| `api/admin-email/route.ts` | `/api/admin-email` | Admin: E-Mail versenden |
| `api/admin-posts/route.ts` | `/api/admin-posts` | Admin: Posts löschen (Service Role) |

### components/ — UI-Bausteine

| Datei | Funktion |
|---|---|
| `AuthGuard.tsx` | Schützt alle App-Seiten — leitet nicht-eingeloggte Nutzer weg |
| `AuthModal.tsx` | Login-Popup (E-Mail OTP in 2 Schritten) |
| `BottomNav.tsx` | Mobile Navigation (Home, Scan, Feed, Liste, Profil) |
| `ProductScore.tsx` | ⭐ Score-Ring A–F mit Farbe, Tip, Probleme-Liste |
| `PremiumGate.tsx` | Upgrade-Modal für gesperrte Premium-Features |
| `Onboarding.tsx` | Erster-Start-Einführung mit Ziel-Auswahl |
| `OnboardingTour.tsx` | Interaktive Tooltips für neue Nutzer |
| `DashboardTour.tsx` | Tour speziell für das Dashboard |
| `NotificationBell.tsx` | Benachrichtigungs-Glocke mit Dropdown |
| `BadgeToast.tsx` | Popup + Konfetti wenn Nutzer Badge erhält |
| `Confetti.tsx` | Canvas-Konfetti-Animation |
| `InstallButton.tsx` | "App installieren" Banner (PWA) |
| `SwRegister.tsx` | Service Worker + Push-Notifications (Geburtstag, täglich, wöchentlich) |
| `ThemeProvider.tsx` | Dark/Light Mode (verhindert Flash beim Laden) |
| `PresencePing.tsx` | Meldet Nutzer als "online" in Supabase |
| `RatingBlock.tsx` | App-Bewertungsaufforderung nach 7 Tagen |
| `Rings.tsx` | Aktivitäts-Ringe (gescannte Produkte, vermiedene Konzerne) |
| `TrueWorldMap.tsx` | Vollständige Konzern-Weltkarte mit Daten |
| `WorldMap.tsx` | Basis-Leaflet-Karte ohne Daten |

### lib/ — Logik & Hooks

| Datei | Funktion |
|---|---|
| `productScore.ts` | ⭐ Score-Berechnung (0–100, Note A–F) für Produkte und Konzerne |
| `supabase.ts` | Supabase-Client-Initialisierung |
| `useSupabaseAuth.ts` | Auth-Hook: user, signIn, signOut, OTP-Verify |
| `useProfile.ts` | Profil laden/speichern (localStorage + Supabase) |
| `useFeed.ts` | News-Artikel laden mit Pagination und Realtime |
| `useListSync.ts` | Einkaufsliste offline-fähig sync |
| `useScanLimit.ts` | Free-Nutzer Scan-Limit (10/Tag) prüfen |
| `db.ts` | Konzern-Datenbank-Hilfsfunktionen |
| `mailer.ts` | Nodemailer STRATO SMTP Konfiguration |

### data/ — Lokale Daten

| Datei | Inhalt |
|---|---|
| `data/products.ts` | 20 bekannte Problemprodukte mit Issues, Fotos, Marken |

### public/ — Statische Dateien

| Datei | Bedeutung |
|---|---|
| `sw.js` | Service Worker (Offline, Push, Cache) |
| `manifest.json` | PWA-Manifest (Name, Icons, Startseite) |
| `icon-192.png` | App-Icon (klein) |
| `icon-512.png` | App-Icon (groß) |
| `apple-touch-icon.png` | iOS App-Icon |
| `favicon.ico` | Browser-Tab-Icon |
| `offline.html` | Seite bei Offline-Zustand |
| `true-logo.jpg` | TRUE Logo |
| `products/` | Produktfotos als JPG |

### Konfiguration

| Datei | Zweck |
|---|---|
| `.env.local` | ⚠️ Geheime Keys — NICHT committen! |
| `next.config.ts` | Next.js Einstellungen |
| `package.json` | Abhängigkeiten + npm Scripts |
| `tsconfig.json` | TypeScript-Konfiguration |
| `SUPABASE_SETUP.sql` | Komplettes Datenbank-Schema |

---

## 1. Projektübersicht

**TRUE** ist eine Progressive Web App (PWA), die Verbrauchern hilft, Produkte per Barcode-Scan zu prüfen und Konzern-Hintergründe zu verstehen.

- **Domain:** https://get-true.de
- **Server:** STRATO VPS, IP `82.165.114.183`
- **Prozessmanager:** PM2 (Prozessname: `true`)
- **Node.js:** v20.20.2
- **Framework:** Next.js 15 (App Router), TypeScript

---

## 2. Tech-Stack

| Bereich | Technologie |
|---|---|
| Framework | Next.js 15 App Router |
| Sprache | TypeScript |
| Styling | Inline CSS (kein Tailwind, kein CSS-Modul) |
| Datenbank | Supabase (PostgreSQL) |
| Auth | Supabase Auth (OTP per E-Mail) |
| E-Mail | Nodemailer + STRATO SMTP |
| KI | Anthropic Claude (claude-haiku-4-5) |
| Push | Web Push API + VAPID |
| Karten | Leaflet + react-leaflet |
| Bilder | Pexels CDN |
| Barcode | ZXing (dynamisch geladen) |
| Extern | Open Food Facts API (Barcode-Lookup) |
| Hosting | STRATO VPS (Linux, Nginx Reverse Proxy) |
| Prozesse | PM2 (`npm start` → Next.js Server) |

---

## 3. Verzeichnisstruktur

```
/Users/josiias878/Desktop/TRUE/   ← Lokaler Projektordner
/var/www/true/                    ← Server-Root (deploy-Ziel)
├── app/                ← Next.js App Router
│   ├── page.tsx        ← Landingpage (/)
│   ├── layout.tsx      ← Root-Layout (Meta, PWA, Theme)
│   ├── home/page.tsx   ← Haupt-Dashboard (geschützt)
│   ├── scan/page.tsx   ← Barcode-Scanner (geschützt)
│   ├── list/page.tsx   ← Einkaufsliste (geschützt)
│   ├── list/shared/page.tsx  ← Geteilte Liste (öffentlich)
│   ├── feed/page.tsx   ← News-Feed (geschützt)
│   ├── community/page.tsx   ← Community (geschützt)
│   ├── profile/page.tsx     ← Profil (geschützt)
│   ├── premium/page.tsx     ← Premium-Seite (geschützt)
│   ├── admin/page.tsx  ← Admin-Dashboard (Passwort: true2026admin)
│   ├── partner/page.tsx     ← Partner-Landingpage (öffentlich)
│   ├── map/page.tsx    ← Konzern-Weltkarte (öffentlich)
│   ├── dashboard/page.tsx   ← Weiterleitung
│   └── api/
│       ├── lookup/route.ts       ← Barcode/Konzern-Suche
│       ├── cron/route.ts         ← Bot-Posts generieren
│       ├── admin-posts/route.ts  ← Posts löschen (Service Role)
│       ├── admin-email/route.ts  ← E-Mail an Partner senden
│       ├── partner-contact/route.ts ← Partner-Anfragen
│       ├── waitlist/route.ts     ← Premium-Warteliste
│       ├── review-suggestion/route.ts ← KI-Bewertungstext
│       ├── social/route.ts       ← Social-Media-Bot
│       └── bot/route.ts          ← Bot-Verarbeitung
├── components/
│   ├── AuthGuard.tsx     ← Schützt alle App-Seiten
│   ├── AuthModal.tsx     ← Login-Modal (E-Mail OTP)
│   ├── BottomNav.tsx     ← Mobile Navigation (5 Icons)
│   ├── PremiumGate.tsx   ← Premium-Upgrade-Modal
│   ├── ProductScore.tsx  ← Sicherheits-Score-Ring (A–F)
│   ├── RatingBlock.tsx   ← App-Bewertung nach 7 Tagen
│   ├── Rings.tsx         ← Scan/Vermieden-Fortschrittsringe
│   ├── ThemeProvider.tsx ← Dark/Light Mode
│   ├── BottomNav.tsx     ← Navigation
│   ├── InstallButton.tsx ← PWA-Installations-Hint
│   ├── NotificationBell.tsx ← Push-Benachrichtigungen
│   ├── Onboarding.tsx    ← Erster-Start-Tour
│   ├── PresencePing.tsx  ← Realtime-Präsenz (Supabase)
│   ├── SwRegister.tsx    ← Service Worker registrieren
│   ├── WorldMap.tsx      ← Leaflet-Karte (lazy)
│   └── TrueWorldMap.tsx  ← Konzern-Weltkarte
├── lib/
│   ├── supabase.ts         ← Supabase-Client + DB-Typen
│   ├── useSupabaseAuth.ts  ← Auth-Hook (OTP Login)
│   ├── mailer.ts           ← Nodemailer (STRATO SMTP)
│   ├── productScore.ts     ← Bewertungs-Engine (A–F Score)
│   ├── useScanLimit.ts     ← Scan-Limit (Free: 10/Tag)
│   ├── useFeed.ts          ← Feed-Daten-Hook
│   ├── useProfile.ts       ← Profil-Hook
│   └── db.ts               ← In-Memory Konzern-DB
├── data/
│   ├── products.ts   ← 20 bekannte Problemprodukte
│   └── seed.json     ← Konzerne, Kategorien, Belege
├── public/
│   ├── manifest.json       ← PWA-Manifest
│   ├── sw.js               ← Service Worker
│   ├── icon-192.png        ← PWA-Icon
│   ├── icon-512.png        ← PWA-Icon groß
│   └── products/           ← Produktfotos (JPG)
│       ├── kitkat.jpg, nutella.jpg, coca-cola.jpg ...
├── .env.local      ← Umgebungsvariablen (NICHT committen)
├── next.config.ts  ← Pexels-Domain erlaubt
└── package.json
```

---

## 4. Umgebungsvariablen (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ebzphqqztoejqntlyaic.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  (anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...      (service role — nur Server!)

# App
NEXT_PUBLIC_APP_URL=https://get-true.de

# E-Mail (STRATO SMTP)
STRATO_MAIL_PASSWORD=...   ← STRATO Postfach-Passwort für info@get-true.de

# KI (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Push-Benachrichtigungen (VAPID)
VAPID_PUBLIC_KEY=BLzEHn7sZS5p...
VAPID_PRIVATE_KEY=OTMzUKZHfu...
VAPID_EMAIL=mailto:info@get-true.de

# Bot
BOT_SECRET=truebot2026secret

# Resend (deaktiviert — MX-Record fehlt bei STRATO)
RESEND_API_KEY=   ← leer lassen
```

> **Wichtig:** Die Service Role Key darf NUR serverseitig verwendet werden (API Routes). Der Anon Key ist öffentlich und client-seitig sicher.

---

## 5. Supabase Datenbank-Schema

### Tabellen

#### `auth.users` (Supabase built-in)
Wird automatisch von Supabase Auth verwaltet. UUID als Primary Key.

#### `profiles`
```sql
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id),
  vorname      TEXT DEFAULT '',
  avatar       TEXT DEFAULT '',
  bio          TEXT DEFAULT '',
  stadt        TEXT DEFAULT '',
  telefon      TEXT DEFAULT '',
  supermarkets TEXT[] DEFAULT '{}',
  preferences  TEXT[] DEFAULT '{}',
  push_token   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```
RLS: Nutzer kann nur eigenes Profil lesen/schreiben.

#### `posts`
```sql
CREATE TABLE posts (
  id            SERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id),
  author_name   TEXT NOT NULL,
  author_avatar TEXT DEFAULT '',
  type          TEXT DEFAULT 'user',  -- 'user' | 'bot' | 'eva' | 'positive'
  tag           TEXT DEFAULT '',
  tag_color     TEXT DEFAULT '#2ECC8A',
  title         TEXT,
  text          TEXT NOT NULL,
  img_url       TEXT,
  source        TEXT,
  likes         INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```
RLS: Jeder kann lesen. Nur eingeloggte Nutzer können eigene Posts schreiben.
Löschen: Nur über Service Role Key (API-Route `/api/admin-posts`).

#### `comments`
```sql
CREATE TABLE comments (
  id           SERIAL PRIMARY KEY,
  post_id      INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id),
  author_name  TEXT NOT NULL,
  text         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `list_items`
```sql
CREATE TABLE list_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id),
  list_id        TEXT NOT NULL,  -- geteilt via URL: /list/shared?id=LIST_ID
  product_id     TEXT NOT NULL,
  product_name   TEXT NOT NULL,
  product_brand  TEXT DEFAULT '',
  product_emoji  TEXT DEFAULT '🛒',
  severity       TEXT DEFAULT 'medium',
  issue          TEXT DEFAULT '',
  checked        BOOLEAN DEFAULT FALSE,
  added_at       TIMESTAMPTZ DEFAULT NOW()
);
```

#### `list_comments`
```sql
CREATE TABLE list_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id     TEXT NOT NULL,
  item_id     UUID REFERENCES list_items(id) ON DELETE CASCADE,
  user_id     UUID,
  author_name TEXT NOT NULL,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### `saved_posts`
```sql
CREATE TABLE saved_posts (
  id       SERIAL PRIMARY KEY,
  user_id  UUID REFERENCES auth.users(id),
  post_id  INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);
```

#### `partner_leads`
```sql
CREATE TABLE partner_leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  tier         TEXT DEFAULT '',
  status       TEXT DEFAULT 'new',  -- 'new' | 'contacted' | 'active' | 'inactive'
  notes        TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```
Kein RLS — nur über Service Role Key zugänglich.

---

## 6. Authentication

**Flow:** E-Mail OTP (Passwortlos)

1. Nutzer gibt E-Mail ein → `supabase.auth.signInWithOtp({ email })`
2. Supabase sendet 6-stelligen Code per E-Mail
3. Nutzer gibt Code ein → `supabase.auth.verifyOtp({ email, token, type: "email" })`
4. Session wird gesetzt (localStorage + Cookie)

**Dateien:**
- `lib/useSupabaseAuth.ts` — Hook mit `user`, `loading`, `signInWithEmail`, `verifyEmailOtp`, `signOut`
- `components/AuthModal.tsx` — Modal mit 2 Steps: E-Mail → OTP-Eingabe
- `components/AuthGuard.tsx` — Wrapper für geschützte Seiten

**AuthGuard-Logik:**
```tsx
// Alle App-Seiten sind so gewrappt:
return (
  <AuthGuard>
    {/* Seiteninhalt */}
  </AuthGuard>
)
// Wenn kein User → redirect zu /?login=1
// Landing-Page hört auf ?login=1 und öffnet AuthModal
```

**Geschützte Seiten:** home, scan, list, community, feed, profile, premium

---

## 7. E-Mail (STRATO SMTP)

**Konfiguration:** `lib/mailer.ts`

```typescript
nodemailer.createTransport({
  host: "smtp.strato.de",
  port: 465,
  secure: true,
  auth: { user: "info@get-true.de", pass: process.env.STRATO_MAIL_PASSWORD }
})
```

**Gesendete E-Mails:**

| Route | Empfänger | Betreff |
|---|---|---|
| `/api/waitlist` | Nutzer + info@get-true.de | Wartelisten-Bestätigung + Benachrichtigung |
| `/api/partner-contact` | Unternehmen + info@get-true.de | Partner-Anfrage-Bestätigung |
| `/api/admin-email` | Beliebig (admin-geschützt) | Admin-E-Mail an Partner |

**Alias-Setup bei STRATO:**
- `info@get-true.de` → Haupt-Postfach (Login für SMTP)
- `social@get-true.de` → Alias (leitet weiter zu info@)
- Postfach ist im iPhone Mail konfiguriert

---

## 8. Barcode-Scanner & Lookup

**`/api/lookup?q=QUERY`**

Ablauf:
1. Sucht zuerst in `data/seed.json` (interne Konzern-DB) per Name/Alias
2. Wenn 8–13-stellige Zahl → Open Food Facts API: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
3. Mapped Ecoscore (A–E) auf Severity (low/medium/high/critical)
4. Mapped NOVA-Gruppe (1–4) auf Verarbeitungsgrad

**Scan-Limit (Free):** 10 Scans/Tag (via localStorage-Key `true-scans-YYYY-MM-DD`)
**Premium:** Unbegrenzt (localStorage `true-premium=1`)

---

## 9. Produkt-Sicherheits-Score (`lib/productScore.ts`)

**Funktion:** `calcProductScore(issues: string[]): ProductScoreResult`

**Bewertungs-Logik:**
- Start: 100 Punkte
- Abzüge nach Schwere der Issues:

| Kategorie | Beispiele | Abzug |
|---|---|---|
| Kritisch | Glyphosat, PFAS, Krebsrisiko | −30 bis −32 |
| Hoch | Kinderarbeit, Palmöl, NOVA 4, Glutamat | −15 bis −25 |
| Mittel | Übersalzung, Zucker, Plastik, Grundwasser | −8 bis −13 |
| Niedrig | Monokulturen, Alu-Kapseln, nicht recycelbar | −4 bis −6 |

**Noten:**
| Score | Note | Farbe | Label |
|---|---|---|---|
| 80–100 | A | #2ECC8A (grün) | Gut |
| 60–79 | B | #88cc44 | Okay |
| 40–59 | C | #ffcc00 (gelb) | Bedenklich |
| 20–39 | D | #ff8800 (orange) | Kritisch |
| 0–19 | F | #ff3355 (rot) | Gefährlich |

**Frequenz-Tipps:**
- A: "Täglich okay"
- B: "2–3× pro Woche unbedenklich"
- C: "Maximal 1× pro Woche"
- D: "Max. 1–2× im Monat"
- F: "Besser meiden"

**Für Scan-Ergebnisse (Konzern-Severity):** `calcScoreFromSeverity(severity, aliases, categories)`

**Komponente:** `components/ProductScore.tsx` — SVG-Ring + Note + Tip (Größen: sm/md/lg)

---

## 10. Bekannte Problemprodukte (`data/products.ts`)

20 Produkte mit je: `id, name, brand, img, emoji, color, issues[], issue, addedAt`

**Issue-Typen:** `"Palmöl" | "Wasser" | "PFAS" | "Glyphosat"`

**Produktfotos:** in `/public/products/` als JPG (400px breit)
- Workflow: `sips -s format jpeg -Z 400 input.jpg --out public/products/name.jpg`
- Nur Fotos von Wikimedia Commons (lizenzfrei)

---

## 11. Content-Bot (`/api/cron`)

**Secret:** `true-cron-2024` (URL-Parameter)

**Types:**
- `type=bot` — Tages-News aus `BOT_NEWS[]` Pool (10 Einträge, rotiert täglich)
- `type=eva` — EVA_POSTS (KI-Journalistin-Posts)
- `type=coach` — COACH_POSTS (Ernährungstipps)

**Crontab auf Server:**
```bash
0 8  * * * curl "https://get-true.de/api/cron?type=bot&secret=true-cron-2024"
0 20 * * * curl "https://get-true.de/api/cron?type=bot&secret=true-cron-2024"
```

---

## 12. Admin-Dashboard (`/admin`)

**Passwort:** `true2026admin` (in sessionStorage gecacht)

**Tabs:**
- **Übersicht** — Supabase-Status, Post/User-Counts, Activity-Chart, Online-Nutzer (Realtime)
- **Partner** — Leads verwalten, Status (neu/kontaktiert/aktiv/inaktiv), E-Mail schreiben
- **Nutzer** — Alle registrierten Profiles
- **Posts** — Alle Posts, Checkbox-Auswahl, Einzel- und Bulk-Löschen
- **Content** — Script-Generator für TikTok/Instagram/Twitter
- **Bots** — Social-Media-Bot aktivieren, Twitter API-Keys eingeben
- **Push** — Broadcast-Push an alle Nutzer
- **Support** — Nutzer-Nachrichten
- **System** — Cron-Log, Server-Crontab, Env-Check

**Post-Löschen:** Via `/api/admin-posts` (DELETE, Service Role Key → bypasses RLS)

---

## 13. Partner-System

**Landingpage:** `/partner` — Öffentlich, erklärt das Partner-Programm

**Pakete:**
- **Starter:** 29€/Monat (30 Tage kostenlos)
- **Wachstum:** 69€/Monat (hervorgehoben)
- **Enterprise:** Auf Anfrage

**Flow:**
1. Unternehmen füllt Formular aus → `/api/partner-contact` (POST)
2. Bestätigungs-E-Mail an Unternehmen
3. Benachrichtigungs-E-Mail an info@get-true.de
4. Lead erscheint im Admin-Dashboard → Tab "Partner"

---

## 14. Premium-System

**Status:** Warteliste (noch nicht live)

**Warteliste:** `/api/waitlist` — Speichert E-Mail lokal + sendet Bestätigungs-Mail

**PremiumGate-Trigger:**
- `scan` — Nach 10 Scans/Tag
- `list` — Bei Personen-Listen-Feature
- `coach` — Bei Ernährungscoach
- `family` — Bei Familien-Features

**Geplante Features (Premium):**
- Unbegrenzte Scans
- Familien-Sicherheits-Score
- KI-Ernährungscoach mit Zielmodus (Abnehmen, Vegan, Muskelaufbau, Allergiefrei)
- Nährstoff-Tracker
- Wochenrückblick
- Einkaufsliste pro Person

**Preis:** 2,99€/Monat (14 Tage gratis)

---

## 15. Deployment

### Lokaler Build & Deploy

```bash
# Im Ordner /Users/josiias878/true/dashboard/
npm run build

# Deploy zum Server
rsync -az --delete .next/      root@82.165.114.183:/var/www/true/.next/
rsync -az --delete app/        root@82.165.114.183:/var/www/true/app/
rsync -az --delete components/ root@82.165.114.183:/var/www/true/components/
rsync -az --delete lib/        root@82.165.114.183:/var/www/true/lib/
rsync -az          public/     root@82.165.114.183:/var/www/true/public/

# Server neu starten
ssh root@82.165.114.183 "cd /var/www/true && pm2 restart true"
```

### Server-Konfiguration

**PM2:**
```bash
pm2 list            # Status prüfen
pm2 logs true       # Logs anzeigen
pm2 restart true    # Neustart
```

**Nginx (Reverse Proxy):**
Leitet Port 80/443 → Next.js auf Port 3000 weiter.
SSL via Let's Encrypt.

**Server .env.local** liegt in `/var/www/true/.env.local`
Enthält dieselben Keys wie lokal.

### Neuen Server aufsetzen (von Null)
```bash
# 1. Node.js 20 installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 2. PM2 global installieren
npm install -g pm2

# 3. Projektordner anlegen
mkdir -p /var/www/true
cd /var/www/true

# 4. package.json + node_modules (einmalig)
npm install

# 5. .env.local anlegen mit allen Keys (siehe Abschnitt 4)

# 6. Mit PM2 starten
pm2 start npm --name "true" -- start
pm2 save
pm2 startup
```

---

## 16. PWA-Konfiguration

**manifest.json** (`/public/manifest.json`):
- `name`: "TRUE"
- `start_url`: "/home"
- `display`: "standalone"
- `icons`: 192px + 512px

**Service Worker** (`/public/sw.js`):
- Push-Benachrichtigungen empfangen
- Offline-Caching (Shell-Dateien)

**PWA-Install-Hint:** `components/InstallButton.tsx`
- Grüner Banner mit Unterstrich
- Nur sichtbar wenn `beforeinstallprompt` Event verfügbar

---

## 17. Schlüsselkomponenten im Detail

### `components/AuthGuard.tsx`
Schützt Seiten. Wartet auf Auth-State. Wenn kein User → redirect zu `/?login=1`.
Zeigt Lade-Spinner mit TRUE-Logo während Auth lädt.

### `components/PremiumGate.tsx`
Bottom-Sheet Modal. Zeigt Feature-Liste, Preis (14 Tage gratis, dann 2,99€/Monat), Wartelisten-E-Mail-Input.
Props: `trigger` ("scan" | "list" | "coach" | "family"), `onClose`

### `components/ProductScore.tsx`
SVG-Kreisring mit Note (A–F) innen. 
Props: `issues[]`, `size` (sm/md/lg), `showTip`, `isPremium`, `scoreOverride`
- Free: zeigt kurzen Tipp
- Premium: zeigt detaillierte Reason-Breakdown mit Schwere-Label

### `components/RatingBlock.tsx`
Erscheint nach 7 Tagen Nutzung (localStorage `true_first_open`).
Sterne → Keyword-Chips → KI-generierter Text → App-Store-Link.
KI: `/api/review-suggestion` → claude-haiku-4-5

### `components/Rings.tsx`
Fortschrittsringe für "Gescannte Produkte" und "Vermiedene Konzerne".
Werte in localStorage: `true-scans-count`, `true-avoided-count`.

---

## 18. Seiten-Übersicht

### `/` (Landingpage)
Öffentlich. Vollbild-Slideshow mit Konzern-Fakten, Mission-Video (CSS-animiert), Partner-Sektion.
"Jetzt starten" → öffnet `AuthModal`. Nach Login → redirect `/home`.
Bei `?login=1` im URL → AuthModal öffnet sich automatisch.

### `/home`
Haupt-Dashboard. Begrüßung, Schnellscan, Konzern des Tages, Feed-Vorschau (aus Supabase), Mini-Einkaufsliste, Karte.

### `/scan`
Kamera-Scan (ZXing) + Manuelle Eingabe. Konzern-Lookup. Score-Ring im Ergebnis.
Free: 10 Scans/Tag. Premium: unbegrenzt.

### `/list`
Einkaufsliste mit Swipe-Actions, Sortierung, Kommentaren. Teilen via Link.
Premium-Banner: KI-Ernährungshelfer mit Zielmodus.

### `/feed`
Posts aus Supabase (Bot + Eva + User). Like, Kommentar, Speichern.

### `/community`
Community-Posts erstellen, folgen, Trending-Tags.

### `/profile`
Profil bearbeiten (Vorname, Bio, Stadt, Supermarkt-Präferenzen).

### `/premium`
Wartelisten-Seite. Feature-Preview, Preis, E-Mail-Eintragung.

### `/partner`
B2B-Landingpage. 3 Pakete (Starter, Wachstum, Enterprise). Regen-Animation (gute/schlechte Produkte).

### `/admin`
Vollständiges Admin-Dashboard. Passwort-geschützt (`true2026admin`).

---

## 19. API-Routen

| Route | Method | Auth | Funktion |
|---|---|---|---|
| `/api/lookup?q=` | GET | - | Konzern/Barcode-Suche |
| `/api/cron?type=&secret=` | GET | Secret | Bot-Posts erstellen |
| `/api/admin-posts?secret=` | DELETE | Secret | Posts löschen (Service Role) |
| `/api/admin-email?secret=` | POST | Secret | E-Mail an Partner |
| `/api/partner-contact` | POST/GET/PATCH | GET/PATCH: Secret | Partner-Leads |
| `/api/waitlist` | POST | - | Wartelisten-Eintrag |
| `/api/review-suggestion` | POST | - | KI-Bewertungstext |
| `/api/social` | POST | Secret | Social-Media-Post |
| `/api/bot` | POST | Secret | Bot-Ingestion |

**Admin-Secret:** `true2026admin`
**Cron-Secret:** `true-cron-2024`
**Bot-Secret:** `truebot2026secret`

---

## 20. Wichtige lokale Storage-Keys

```javascript
"true-premium"          // "1" = Premium aktiv
"true-scans-YYYY-MM-DD" // Anzahl Scans heute (Free Limit)
"true-first-open"       // Timestamp erstes Öffnen (für RatingBlock)
"true-rated"            // "1" = Bewertung abgegeben
"true-premium-waitlist" // JSON-Array von E-Mails
"true-support-messages" // JSON-Array Support-Chat
"true-cron-log"         // JSON-Array Cron-Log
"true-bot-log"          // JSON-Array Bot-Post-Log
"true-bot-enabled"      // "1" = Bot aktiv
"true-twitter-keys"     // JSON {key, secret, token, tokenSec}
"true-scans-count"      // Gesamte Scans (Rings-Anzeige)
"true-avoided-count"    // Vermiedene Konzerne (Rings)
"true-admin-authed"     // "1" = Admin eingeloggt (sessionStorage)
```

---

## 21. Abhängigkeiten (package.json)

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "KI (Claude haiku)",
    "@supabase/supabase-js": "Datenbank + Auth",
    "@types/leaflet": "Karten-Typen",
    "@types/nodemailer": "E-Mail-Typen",
    "leaflet": "Interaktive Karte",
    "lucide-react": "Icons",
    "next": "15.x Framework",
    "nodemailer": "E-Mail via STRATO SMTP",
    "react": "19.x",
    "react-dom": "19.x",
    "react-leaflet": "React-Karten-Wrapper",
    "resend": "installiert aber deaktiviert (MX-Record fehlt)"
  }
}
```

---

## 22. Bekannte Einschränkungen & To-Dos

| # | Thema | Status |
|---|---|---|
| 1 | Premium-Zahlungssystem (Stripe) | Noch nicht integriert |
| 2 | App Store Listing (iOS) | APP_STORE_ID in RatingBlock.tsx leer |
| 3 | Social-Media-Bot (Twitter API) | Keys müssen in Admin eingetragen werden |
| 4 | Resend E-Mail | Deaktiviert (MX-Record fehlt bei STRATO) |
| 5 | Scanner-Zuverlässigkeit | Muss manuell geprüft werden |
| 6 | STRATO Passwort | Nach Änderung in .env.local auf Server updaten |
| 7 | Echte Produktfotos | Nur 10 Produkte haben Fotos, Rest Emoji-Fallback |

---

## 23. Schnell-Referenz: Häufige Aufgaben

```bash
# Lokal entwickeln
cd /Users/josiias878/Desktop/TRUE
npm run dev           # → http://localhost:3000

# Bauen & deployen
npm run build && rsync -az --delete .next/ root@82.165.114.183:/var/www/true/.next/ && rsync -az --delete app/ root@82.165.114.183:/var/www/true/app/ && rsync -az --delete components/ root@82.165.114.183:/var/www/true/components/ && rsync -az --delete lib/ root@82.165.114.183:/var/www/true/lib/ && rsync -az public/ root@82.165.114.183:/var/www/true/public/ && ssh root@82.165.114.183 "cd /var/www/true && pm2 restart true"

# Server-Logs anzeigen
ssh root@82.165.114.183 "pm2 logs true --lines 50"

# Umgebungsvariable auf Server updaten
ssh root@82.165.114.183 "nano /var/www/true/.env.local"
# dann: pm2 restart true

# Supabase-Tabellen prüfen
# → https://app.supabase.com/project/ebzphqqztoejqntlyaic/editor

# Admin-Dashboard
# → https://get-true.de/admin  (Passwort: true2026admin)
```

---

*Erstellt: April 2026 · TRUE — Für transparente Märkte · get-true.de*
