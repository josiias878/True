"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

export interface AppNotification {
  id: string
  title: string
  body: string
  url?: string
  time: number
  read: boolean
  type: "alert" | "tip" | "positive" | "community"
}

const STORAGE_KEY = "true-notifications-v2"

// Returns a daily-rotating integer (changes at midnight)
function dayIndex(): number {
  return Math.floor(Date.now() / 86_400_000)
}

// ─── Large pool of notifications ─────────────────────────────────────────────
const NOTIFICATION_POOL: Omit<AppNotification, "time" | "read">[] = [
  { id: "p1",  type: "alert",    title: "⚠️ Nestlé unter Druck",           body: "Neue Berichte über Palmöl-Lieferketten in Borneo — Umweltschäden bestätigt.",           url: "/home" },
  { id: "p2",  type: "positive", title: "✅ Unilever macht Fortschritte",   body: "3 umstrittene Palmöl-Lieferanten ausgeschlossen. Erste positive Schritte.",             url: "/home" },
  { id: "p3",  type: "tip",      title: "💡 Tipp der Woche",               body: "Nocciolata Bio ist eine echte Nutella-Alternative — ohne Palmöl, erhältlich bei Rewe.",  url: "/home" },
  { id: "p4",  type: "alert",    title: "⚠️ Coca-Cola & Plastik",          body: "6. Jahr in Folge: Coca-Cola ist laut Brand Audit der größte Plastik-Verschmutzer.",      url: "/home" },
  { id: "p5",  type: "tip",      title: "💡 Palmöl erkennen",              body: "Über 200 Begriffe verstecken Palmöl im Zutatenverzeichnis — TRUE hilft dir dabei.",      url: "/scan" },
  { id: "p6",  type: "positive", title: "✅ Danone verbessert Score",       body: "Danone erreicht erstmals Eco-Score B für zwei Joghurt-Linien. Gute Entwicklung.",        url: "/home" },
  { id: "p7",  type: "alert",    title: "⚠️ PepsiCo im Visier",            body: "Studie: Lay's und Doritos enthalten hochverarbeitete Zusatzstoffe (NOVA Gruppe 4).",     url: "/home" },
  { id: "p8",  type: "tip",      title: "💡 Besser scannen",               body: "Tipp: Halte die Kamera 15–20 cm entfernt. TRUE erkennt 8–13-stellige Barcodes.",         url: "/scan" },
  { id: "p9",  type: "community",title: "👥 Community-Highlight",          body: "Ein Mitglied teilte: 'Seit TRUE kaufe ich kein Maggi mehr — Rapunzel-Brühe ist besser!'", url: "/community" },
  { id: "p10", type: "alert",    title: "⚠️ Glyphosat-Debatte",            body: "EFSA-Neubewertung läuft — Bayer/Monsanto unter Druck. Entscheidung erwartet.",          url: "/home" },
  { id: "p11", type: "positive", title: "✅ Alnatura ohne Palmöl",          body: "Alle Alnatura-Eigenmarken sind jetzt palmölfrei — bestätigt durch Öko-Test.",           url: "/home" },
  { id: "p12", type: "tip",      title: "💡 Einkaufsliste nutzen",          body: "Speichere TRUE-Alternativen in deiner Liste — so kaufst du im Supermarkt gezielt ein.", url: "/home" },
  { id: "p13", type: "alert",    title: "⚠️ Shell ignoriert Urteil",        body: "Trotz Gerichtsurteil: Shell investiert 2024 mehr in Öl als in erneuerbare Energien.",  url: "/home" },
  { id: "p14", type: "community",title: "👥 Neue Beiträge in der Community",body: "Mitglieder diskutieren gerade über Produkt-Alternativen — komm dazu!",                  url: "/community" },
  { id: "p15", type: "tip",      title: "💡 Wusstest du?",                 body: "Amazon vernichtete 2021 täglich über 3 Mio. unverkaufte Artikel. TRUE zeigt Alternativen.", url: "/home" },
  { id: "p16", type: "positive", title: "✅ Oatly mit besserem Score",      body: "Oatly Hafermilch erzielt Eco-Score A — nachhaltig und ohne Palmöl.",                    url: "/home" },
  { id: "p17", type: "alert",    title: "⚠️ Zuckersteuer blockiert",        body: "Konzernlobby verhindert EU-Zuckersteuer — PepsiCo und Coca-Cola federführend.",        url: "/home" },
  { id: "p18", type: "tip",      title: "💡 NOVA-Gruppe verstehen",         body: "NOVA 4 = ultra-verarbeitet. Weniger davon im Alltag verbessert Gesundheit deutlich.",   url: "/scan" },
  { id: "p19", type: "community",title: "👥 Frag die Community",            body: "Du hast eine Frage zu einem Produkt? Teile sie — andere Mitglieder helfen gerne.",      url: "/community" },
  { id: "p20", type: "alert",    title: "⚠️ Nestlé Wasserrechte",           body: "In drei US-Bundesstaaten entzieht Nestlé Grundwasser ohne gültige Genehmigung.",      url: "/home" },
  { id: "p21", type: "positive", title: "✅ Demeter-Siegel zuverlässig",    body: "Demeter bleibt laut Stiftung Warentest das strengste Bio-Siegel in Deutschland.",      url: "/home" },
  { id: "p22", type: "tip",      title: "💡 Barcodes überall",              body: "Auch Kosmetik & Reinigungsmittel haben Barcodes — TRUE prüft mehr als nur Lebensmittel.", url: "/scan" },
]

// Build today's default set: pick 3 notifications based on day index
function buildDailyDefaults(): AppNotification[] {
  const base = dayIndex()
  const now = Date.now()
  const picked: AppNotification[] = []
  const indices = [base % NOTIFICATION_POOL.length, (base + 7) % NOTIFICATION_POOL.length, (base + 14) % NOTIFICATION_POOL.length]
  indices.forEach((idx, i) => {
    const n = NOTIFICATION_POOL[idx]
    picked.push({ ...n, time: now - (i === 0 ? 1000 * 60 * 5 : i === 1 ? 1000 * 60 * 60 * 3 : 1000 * 60 * 60 * 18), read: i > 0 })
  })
  return picked
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const stored: AppNotification[] = JSON.parse(raw)
        // Check if stored notifications are from today (by comparing day index stored alongside)
        const storedDay = parseInt(localStorage.getItem(STORAGE_KEY + "-day") ?? "0", 10)
        if (storedDay === dayIndex()) {
          setNotifications(stored)
        } else {
          // New day — refresh with today's daily set
          const fresh = buildDailyDefaults()
          setNotifications(fresh)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
          localStorage.setItem(STORAGE_KEY + "-day", String(dayIndex()))
        }
      } else {
        const fresh = buildDailyDefaults()
        setNotifications(fresh)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
        localStorage.setItem(STORAGE_KEY + "-day", String(dayIndex()))
      }
    } catch (e) {
      console.error("[NotificationBell] localStorage read failed:", e)
      setNotifications(buildDailyDefaults())
    }
  }, [])

  function persist(next: AppNotification[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      localStorage.setItem(STORAGE_KEY + "-day", String(dayIndex()))
    } catch (e) { console.error("[NotificationBell] localStorage write failed:", e) }
  }

  function markAllRead() {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      persist(next)
      return next
    })
  }

  function markRead(id: string) {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n)
      persist(next)
      return next
    })
  }

  const unread = notifications.filter(n => !n.read).length
  return { notifications, unread, markAllRead, markRead }
}

// ─── Bell Component ────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const { notifications, unread, markAllRead, markRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const TYPE_COLOR = { alert: "#ff4455", tip: "#ffcc00", positive: "#2ECC8A", community: "#cc66ff" }
  const TYPE_ICON  = { alert: "⚠️", tip: "💡", positive: "✅", community: "👥" }

  function formatTime(ms: number) {
    const diff = Date.now() - ms
    if (diff < 60000) return "Gerade eben"
    if (diff < 3600000) return `Vor ${Math.floor(diff / 60000)} Min.`
    if (diff < 86400000) return `Vor ${Math.floor(diff / 3600000)} Std.`
    return `Vor ${Math.floor(diff / 86400000)} Tag(en)`
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(v => !v); if (!open && unread > 0) markAllRead() }}
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          width: "38px", height: "38px",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.3rem",
          color: "var(--text-dim)",
        }}
        aria-label="Benachrichtigungen"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            background: "#ff4455", color: "#fff",
            borderRadius: "50%", width: "16px", height: "16px",
            fontSize: "0.55rem", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--background)",
            animation: "bellPulse 2s ease infinite",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "fixed",
          top: "64px",
          right: "8px",
          width: "min(320px, calc(100vw - 16px))",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          zIndex: 500,
          overflow: "hidden",
          animation: "dropIn 0.2s cubic-bezier(.22,1,.36,1)",
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Benachrichtigungen</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: "transparent", border: "none", color: "var(--text-dim)", fontSize: "0.72rem", cursor: "pointer" }}>
                Alle gelesen
              </button>
            )}
          </div>

          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                Keine Benachrichtigungen
              </div>
            ) : notifications.map(n => (
              <button
                key={n.id}
                onClick={() => { markRead(n.id); setOpen(false); router.push(n.url ?? "/home") }}
                style={{
                  width: "100%", display: "flex", gap: "12px", alignItems: "flex-start",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                  textDecoration: "none", background: n.read ? "transparent" : "rgba(46,204,138,0.04)",
                  transition: "background 0.15s", border: "none", cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{
                  width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                  background: TYPE_COLOR[n.type] + "18",
                  border: `1.5px solid ${TYPE_COLOR[n.type]}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.95rem",
                }}>
                  {TYPE_ICON[n.type]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.read ? 500 : 700, fontSize: "0.82rem", color: "var(--text)", marginBottom: "2px" }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.4, marginBottom: "4px" }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>{formatTime(n.time)}</div>
                </div>
                {!n.read && (
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2ECC8A", flexShrink: 0, marginTop: 4 }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes bellPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
        @keyframes dropIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
