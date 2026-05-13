# TRUE App — Übergabe-Dokument (Stand: 9. Mai 2026)

> Dieses Dokument beschreibt den exakten Stand des Projekts. Lies es vollständig, bevor du irgendwas tust.

---

## 1. Was ist TRUE?

Eine **Progressive Web App (PWA)** für bewussten Einkauf:
- Barcode scannen → Konzern erkennen → Schäden sehen
- Persönliche Einkaufsliste (synced)
- Community-Posts (Supabase)
- Konzerne meiden (Meidliste)

**Live unter:** `https://get-true.de`

---

## 2. Infrastruktur

| Was | Wo |
|---|---|
| **Lokales Projekt** | `/Users/josiias878/Desktop/TRUE/` |
| **Server** | `82.165.114.183` (STRATO VPS) |
| **App-Pfad Server** | `/var/www/true/` |
| **PM2 App-Name** | `true` (ID 0) |
| **Domain** | `https://get-true.de` |
| **Supabase** | Keys in `.env.local` |

### Deploy-Befehl (immer gleich):
```bash
cd /Users/josiias878/Desktop/TRUE
npm run build
rsync -az --delete .next/ root@82.165.114.183:/var/www/true/.next/
ssh root@82.165.114.183 "pm2 restart true"
```

---

## 3. Tech-Stack

- **Next.js 15/16** App Router, React 19, TypeScript
- **Supabase** — Auth (OTP per E-Mail) + PostgreSQL
- **PM2 + Nginx** Reverse Proxy auf STRATO VPS
- **PWA** — manifest.json, Service Worker, installierbar
- **Barcode:** `@zxing/browser` Fallback
- **Karte:** Leaflet + OpenStreetMap

---

## 4. Supabase Tabellen

### `posts`
```
id, type (bot|eva|coach|user|community), author_name, author_avatar,
tag, tag_color, title, text, source, img_url, likes, created_at, user_id
```
- **`type="community"`** = Nutzer-Posts aus Community-Seite
- **`type="bot/eva/coach"`** = automatisch generierte Inhalte
- Seed-Posts in `community/page.tsx` haben `isExample: true` Flag

### `post_likes`
```
post_id, user_id   ← composite primary key (kein Double-Like)
```

### `profiles`
```
id, vorname, avatar, bio, stadt, telefon, supermarkets[], preferences[]
```
- `goals` ist **nur in localStorage** (`true-profile`), nicht in DB

### `list_items`
```
id, user_id, name, amount, category, checked, created_at
```

---

## 5. Wichtige LocalStorage Keys

| Key | Inhalt |
|---|---|
| `true-theme` | `"dark"` oder `"light"` — Default immer `"dark"` |
| `true-profile` | Profil-Objekt inkl. `goals[]` |
| `true-meidliste` | Array von Konzern-Namen |
| `true-premium` | `"1"` wenn Premium |
| `true-saved-posts` | Array von gespeicherten Post-IDs |
| `shopping-list-items-v1` | Lokale Einkaufslisten-Items (Fallback) |
| `true-notifications-v2` | Benachrichtigungs-Array |
| `true-family-members` | Familie-Mitglieder Array |

---

## 6. Dateien & ihre Funktion

| Datei | Zweck |
|---|---|
| `app/page.tsx` | **Landing Page** — Hero, 4 Feature-Sektionen mit Phone-Mockups |
| `app/home/page.tsx` | Home — Quick-Add, Impact-Ringe, Shopping-Vorschau |
| `app/scan/page.tsx` | Barcode-Scanner (Yuka-Style) |
| `app/community/page.tsx` | Community-Feed (Supabase-synced) |
| `app/list/page.tsx` | Einkaufsliste mit Kategorien |
| `app/profile/page.tsx` | Profil + Settings (Accordion-Style) |
| `app/admin/page.tsx` | Admin-Dashboard — Statistiken, Posts, Nutzer |
| `app/channel/[id]/page.tsx` | Konzern-Channel-Seite |
| `components/AuthModal.tsx` | Login/Registrierung + Onboarding-Tour (`DoneTour`) |
| `components/AuthGuard.tsx` | Schützt Seiten vor nicht-eingeloggten Nutzern |
| `components/BottomNav.tsx` | 3-Tab Navigation (Home, Scan, Community) |
| `components/ThemeProvider.tsx` | Dark/Light Mode — Default immer Dark |
| `components/NotificationBell.tsx` | Glocke mit Benachrichtigungs-Pool |
| `lib/useListSync.ts` | Einkaufsliste Supabase-Sync Hook |
| `lib/useSupabaseAuth.ts` | Auth-Hook (user, loading, signOut) |
| `lib/useProfile.ts` | Profil-Hook (DB + localStorage) |
| `lib/supabase.ts` | Supabase Client |

---

## 7. Was in dieser Session alles gemacht wurde

### Landingpage (`app/page.tsx`) — Komplett neu gebaut
Die Landingpage wurde **zwei Mal vollständig umgebaut**. Aktueller Stand:

**Struktur:**
```
NAV (transparent → dunkel beim Scrollen)
HERO (Bildslider, vereinfacht — nur Headline + 1 Tagline + 2 Buttons)
APP-INTRO-STRIP (4 farbige Pills: Scanner | Liste | Community | Konzerne)
4 NUMMERIERTE FEATURE-SEKTIONEN (01–04) mit Phone-Mockups
  → alternierend weiß / #f4f7f4
  → riesige Zahl als Hintergrund-Deko
  → kleine CSS-Phone-Mockups mit echten App-Screens
  → Titel fett, Schlüsselwörter grün unterstrichen (<G> Komponente)
  → Phones schweben dauerhaft (float0–float3 CSS-Animation)
STATS (3 Zahlen mit Count-Up-Animation)
CTA (dunkel, Wald-Hintergrundbild, grüner Glow)
FOOTER (weiß, Links: Impressum, Datenschutz, Community, Kontakt)
```

**Phone-Mockups (CSS, kein Bild):**
- `SmallPhone` Component — 163px breit, 320px Screen-Höhe, iPhone-Stil
- `ScanScreen` — Kamera-Viewfinder, animierter Scan-Strahl, Maggi/Nestlé Ergebnis
- `ListScreen` — 5 Items, Progress-Bar, Familie-Teilen-Footer
- `CommunityScreen` — 3 Posts mit Avataren, Tags, Likes
- `KonzerneScreen` — Nestlé/Unilever/Bayer mit KRITISCH/HOCH-Badges

**Wichtige Fixes:**
- `<G>` Komponente: grüne Unterstreichung mit Glow für Schlüsselbegriffe
- Mission-Video `"App jetzt öffnen →"` öffnet jetzt Modal statt `/login`-Seite
- CTA-Text: `"Ohne Account"` → `"Schnell registriert"` (war widersprüchlich)
- Theme: Seite ist **hell** (weiß) — nur Hero und CTA sind dunkel

---

### `app/profile/page.tsx` — Bereinigt
Toten Code entfernt:
- `import type { SavedPostMeta } from "@/lib/useFeed"` → weg
- `interface UserPost` → weg
- `userPosts` State + localStorage-Load → weg
- `savedMeta` State + Load → weg
- `postCount` Variable → weg
- `{false && (...)}` Block (altes Post-Grid, 50+ Zeilen) → weg
- Posts-Tab zeigt jetzt Community-CTA statt altes Grid
- Saved-Tab zeigt einfache Link-Karten zur Community

---

### `lib/useListSync.ts` — Bug gefixt
**Problem:** Einkaufsliste verschwand bei Logout + Login  
**Ursache:** `syncedRef.current = true` wurde nie zurückgesetzt  
**Fix:** `syncedUserRef.current` speichert jetzt `user.id` (String statt Boolean)
```typescript
// Vorher:
const syncedRef = useRef(false)
if (syncedRef.current) return
syncedRef.current = true

// Nachher:
const syncedUserRef = useRef<string | null>(null)
if (syncedUserRef.current === user.id) return
syncedUserRef.current = user.id
```

---

### `app/community/page.tsx` — Supabase-Sync gebaut
- Posts werden aus Supabase geladen (`type="community"`)
- Seed-Posts (`isExample: true`) bleiben immer sichtbar
- Neuer Post → wird in Supabase gespeichert (mit `type:"community"`)
- Likes → `post_likes` Tabelle (Insert/Delete)
- Delete → Supabase-Delete für echte Posts, nur State für Seed-Posts

---

### `app/admin/page.tsx` — Aktualisiert
- Push-Notification URL: `/feed` → `/home`
- "User-Posts" Stat → "Community" (zählt `type="community"`)
- "Bot-Posts" Stat zählt jetzt `type=bot|eva|coach`
- Post-Badges: dreistufig — Community (lila) / User (pink) / Bot (grün)

---

### `components/AuthModal.tsx` — Onboarding-Tour
Nach der Registrierung läuft eine animierte Tour (`DoneTour`):
- Welcome-Screen (Name wird angezeigt)
- 3 Feature-Karten: Scannen → Einkaufsliste → Community
- Progress-Dots
- PWA-Install-Hinweis auf letzter Karte (iOS / Android)
- "Los geht's 🚀" führt zur App

---

### `components/ThemeProvider.tsx` — Dark-Mode-Default
```typescript
// Vorher: OS-Preference als Fallback
const preferred = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
const initial = saved ?? preferred

// Nachher: immer Dark für neue Nutzer
const initial = saved ?? "dark"
```

---

### `/feed` Links entfernt
Alle Links zu `/feed` in der App ersetzt durch `/community` oder `/home`:
- `app/home/page.tsx` — 3 Links
- `app/channel/[id]/page.tsx` — 3 Links
- `app/admin/page.tsx` — 1 Link
- `/feed` Seite existiert noch als Datei, ist aber nirgends mehr verlinkt

---

## 8. Bekannte Patterns & Gotchas

### Deploy
- Immer: `npm run build` → `rsync .next/` → `pm2 restart true`
- Nur `.next/` muss synced werden (node_modules + source sind schon da)

### useSearchParams → Suspense-Fehler
```typescript
// FALSCH:
import { useSearchParams } from "next/navigation"
// → Crash ohne <Suspense> wrapper

// RICHTIG für statische Seiten:
useEffect(() => {
  const param = new URLSearchParams(window.location.search).get("foo")
}, [])
// ODER: Komponente in <Suspense> wrappen
```

### AuthGuard
`<AuthGuard>` schützt Seiten — leitet nicht-eingeloggte Nutzer zu `/` weiter.  
Community-Seite nutzt AuthGuard → Gäste können Community nicht browsen.

### Supabase Seed-Posts
Posts mit `isExample: true` in `community/page.tsx` sind hartkodiert.  
Sie haben IDs 1–16. Supabase IDs starten auch bei 1 → potenzieller Konflikt wird über `isExample` Flag aufgelöst.

### Cron-Jobs (Server)
```
0 8  * * * curl http://localhost:3000/api/cron?type=bot&secret=true-cron-2024
0 20 * * * curl http://localhost:3000/api/cron?type=bot&secret=true-cron-2024
0 9  * * * curl http://localhost:3000/api/cron?type=eva&secret=true-cron-2024
0 15 * * * curl http://localhost:3000/api/cron?type=eva&secret=true-cron-2024
0 12 * * 1 curl http://localhost:3000/api/cron?type=coach&secret=true-cron-2024
```

---

## 9. CSS Custom Properties (globals.css)

```css
/* Dark Mode (Standard) */
--background: #0f0f17
--surface: #1a1a2e
--surface-2: #252538
--border: rgba(255,255,255,0.08)
--accent: #2ECC8A
--text: #e8e8f2
--text-dim: rgba(255,255,255,0.45)
--nav-bg: rgba(15,15,23,0.85)

/* Light Mode */
--background: #fafafa
--surface: #ffffff
--surface-2: #f0f0f0
--border: #dbdbdb
--accent: #1EA872
--text: #262626
--text-dim: #8e8e8e
--nav-bg: rgba(255,255,255,0.97)
```

**ThemeProvider:** `localStorage["true-theme"]` → `document.documentElement.classList.toggle("light", ...)`  
**Default:** immer `"dark"` für neue Nutzer

---

## 10. Layout-Konstanten (App-Seiten)

- **BottomNav:** `fixed, bottom: 0, height: 72px, zIndex: 200`
- **Floating-Bars:** `fixed, bottom: 72px, zIndex: 150`
- **Content padding-bottom:** mindestens `140px` wenn Floating-Bar vorhanden, sonst `80px`
- **Header:** `sticky, top: 0, height: 56px, zIndex: 100`

---

## 11. Was noch offen ist (mögliche nächste Schritte)

1. **Meidliste-Warnungen in /list** — Produkte von gemiedenen Konzernen sollen ein Warn-Badge bekommen
2. **Community: AuthGuard entfernen** — Gäste sollen browsén können, nur Posten erfordert Login
3. **Saved Posts in Profil** — aktuell zeigt Saved-Tab nur Platzhalter-Links, kein echter Inhalt
4. **E-Mail-Bestätigung** — Nutzer bekommen nach Registrierung evtl. keine Bestätigungs-Mail (Supabase-Setting prüfen)
5. **Landingpage Mobile** — Phone-Mockups im 2×2-Grid auf kleinen Screens testen
6. **Feed-Seite** (`/feed`) entfernen oder redirect auf `/community` setzen
7. **KI-Ernährungsberater** — AI Nutrition Bot in /list
8. **TRUE Channel-Profile** — Instagram-Style Profil für Channels

---

## 12. Wie man einen Test macht (Checkliste)

- [ ] `get-true.de` lädt korrekt (Landing Page, weiß, 4 Phone-Sektionen)
- [ ] Hero-Bildslider wechselt automatisch alle 7s
- [ ] "Jetzt starten" öffnet Auth-Modal
- [ ] Registrierung per OTP-Mail funktioniert
- [ ] Nach Login: Onboarding-Tour erscheint (3 Karten + PWA-Hinweis)
- [ ] Nach Tour: landet auf `/home`
- [ ] Dark Mode ist Standard
- [ ] Barcode-Scanner öffnet Kamera
- [ ] Scan-Ergebnis zeigt Konzern + Score + Alternativen
- [ ] "Zur Liste" fügt Produkt zur Einkaufsliste hinzu
- [ ] Liste bleibt nach Logout + Login erhalten (Supabase-Sync)
- [ ] Community-Posts laden (Supabase)
- [ ] Neuer Post in Community wird gespeichert und erscheint sofort
- [ ] Like-Button funktioniert (kein Double-Like)
- [ ] Profil speichern (Name, Avatar, Präferenzen)
- [ ] Meidliste: Konzern hinzufügen
- [ ] Admin-Dashboard: `get-true.de/admin` (Passwort in Code)
- [ ] Notifications-Glocke zeigt tägliche Nachrichten
