"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ThemeToggle } from "@/components/ThemeProvider"
import { supabase } from "@/lib/supabase"

// Admin-Zugang: nur Supabase-Konten mit diesen E-Mails haben Zugriff
const ADMIN_EMAILS = ["info@get-true.de", "social@get-true.de", "mgognon99@gmail.com"]
const AUTH_KEY = "true-admin-authed-v2"

type Tab = "overview" | "users" | "posts" | "support" | "push" | "system" | "content" | "bots" | "partner" | "social"

// ── Konzerne pool (same as feed) ────────────────────────────────────────────
const KONZERNE = [
  { name: "Nestlé",        emoji: "☕", color: "#ff4455", category: "Lebensmittel & Wasser",
    facts: ["Entzieht in Dürreregionen Millionen Liter Grundwasser — teils ohne gültige Genehmigung", "Vermarktet Babynahrung in Entwicklungsländern gegen WHO-Empfehlungen", "Besitzt über 2.000 Marken — von KitKat bis Nescafé"],
    source: "WHO / US Forest Service 2023" },
  { name: "Coca-Cola",     emoji: "🥤", color: "#ff2233", category: "Getränke & Plastik",
    facts: ["Größter Plastik-Verschmutzer der Welt — 6 Jahre in Folge laut Brand Audit", "Entnimmt täglich 1,8 Milliarden Liter Grundwasser weltweit", "Kämpft juristisch gegen staatliche Zuckersteuer in mehreren Ländern"],
    source: "Break Free From Plastic / TU Berlin 2023" },
  { name: "Bayer/Monsanto",emoji: "☠️", color: "#cc66ff", category: "Agrochemie",
    facts: ["Glyphosat (Roundup) von WHO-Agentur IARC als 'wahrscheinlich krebserregend' eingestuft", "Zahlte 13 Milliarden USD Schadensersatz in US-Sammelklagen", "Verkauft Pestizide in Ländern, die in der EU längst verboten sind"],
    source: "IARC / US District Courts 2023" },
  { name: "PepsiCo",       emoji: "🌽", color: "#ffaa00", category: "Snacks & Getränke",
    facts: ["Zweitgrößter Plastik-Verschmutzer weltweit nach Coca-Cola", "Lay's und Doritos enthalten hochverarbeitete Zusatzstoffe (NOVA Gruppe 4)", "Vermarktet zuckerreiche Produkte gezielt an Kinder in Schwellenländern"],
    source: "BFFP Brand Audit / NOVA 2023" },
  { name: "Unilever",      emoji: "🧴", color: "#44aaff", category: "Konsumgüter",
    facts: ["Einer der größten Palmöl-Käufer weltweit — trotz Nachhaltigkeitsversprechen", "Klagte gegen Ben & Jerry's wegen Boykott-Aussagen", "85 % der Plastikverpackungen nicht recycelbar"],
    source: "Rainforest Action Network / Guardian 2022" },
  { name: "Amazon",        emoji: "📦", color: "#ffcc00", category: "Tech & Logistik",
    facts: ["Vernichtete 2021 offiziell über 3 Millionen unverkaufte Artikel — täglich", "Lagerarbeiter haben doppelt so hohe Verletzungsrate wie US-Durchschnitt", "Zahlt in Luxemburg effektiven Steuersatz von unter 1 % auf EU-Gewinne"],
    source: "ITV / OSHA / EU Commission 2022" },
  { name: "Shell",         emoji: "🛢️", color: "#ff7700", category: "Energie & Öl",
    facts: ["Im Niger-Delta verursachte Shell Ölpesten, die 50 Jahre zur Sanierung benötigen", "Holländisches Gericht verurteilte Shell zu CO₂-Reduzierung — ignoriert", "Investierte 2022 mehr in neue Ölfelder als in erneuerbare Energien"],
    source: "UN / Haager Gericht 2021–2023" },
]

// ── Content templates ───────────────────────────────────────────────────────
function generateContent(konzern: typeof KONZERNE[0], platform: string): { sections: {label: string; text: string}[]; hashtags: string } {
  const f0 = konzern.facts[0]
  const f1 = konzern.facts[1]
  const f2 = konzern.facts[2]

  if (platform === "tiktok") {
    return {
      sections: [
        { label: "🎬 HOOK (erste 3 Sekunden)", text: `Das weiß fast niemand über ${konzern.name}... ${konzern.emoji}` },
        { label: "📖 HAUPTTEIL (10–30 Sek.)", text: `${f0}\n\n${f1}\n\n${f2}` },
        { label: "😱 REAKTION", text: `Ich dachte auch, das kann nicht wahr sein. Aber die Quelle ist: ${konzern.source}` },
        { label: "🎯 CALL TO ACTION", text: `Willst du wissen was in deinen Produkten steckt? → TRUE App (Link in Bio) — einfach Barcode scannen` },
      ],
      hashtags: `#${konzern.name.replace(/[^a-zA-Z]/g, "")} #Verbraucherschutz #WasNiemandDirSagt #TRUE #Konzerne #Nachhaltigkeit #Skandal #FoodTok #GesundLeben #fyp`,
    }
  }
  if (platform === "instagram") {
    return {
      sections: [
        { label: "📸 CAPTION", text: `${konzern.emoji} Was ${konzern.name} lieber nicht in der Werbung zeigt:\n\n→ ${f0}\n\n→ ${f1}\n\n→ ${f2}\n\nQuelle: ${konzern.source}\n\nDu willst wissen was wirklich in deinen Produkten steckt? Die TRUE App zeigt dir mit einem Barcode-Scan die echten Fakten hinter Konzernen wie ${konzern.name}.\n\nLink in Bio ↑` },
      ],
      hashtags: `#Verbraucherschutz #${konzern.name.replace(/[^a-zA-Z]/g, "")} #Nachhaltigkeit #BewusstEinkaufen #TRUEApp #Konzerne #Lebensmittel #Gesundheit #WissenIstMacht #Deutschland`,
    }
  }
  // twitter/x
  return {
    sections: [
      { label: "Tweet 1 / Thread-Start", text: `${konzern.emoji} Was ${konzern.name} dir nicht sagt — ein kurzer Thread 🧵` },
      { label: "Tweet 2", text: `1/ ${f0}\n\nQuelle: ${konzern.source}` },
      { label: "Tweet 3", text: `2/ ${f1}` },
      { label: "Tweet 4", text: `3/ ${f2}` },
      { label: "Tweet 5 / CTA", text: `Was kannst du tun? Die TRUE App scannt deinen Barcode und zeigt dir welche Konzerne hinter welchen Produkten stecken. → get-true.de` },
    ],
    hashtags: `#${konzern.name.replace(/[^a-zA-Z]/g, "")} #Verbraucherschutz #Nachhaltigkeit`,
  }
}

interface DbUser { id: string; created_at: string; email?: string; last_sign_in?: string | null; vorname?: string; avatar?: string; stadt?: string; banned?: boolean }
interface DbPost { id: number; created_at: string; author_name: string; type: string; tag: string; text: string; likes: number; user_id: string | null }
interface SupportMsg { id: string; text: string; time: number; from: "user" | "support" }

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed]     = useState(false)
  const [loginEmail, setLoginEmail]   = useState("")
  const [loginPw, setLoginPw]         = useState("")
  const [loginError, setLoginError]   = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [forgotMode, setForgotMode]   = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent]   = useState(false)
  const [forgotError, setForgotError] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [loading, setLoading]   = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // User moderation
  const [actionModal, setActionModal] = useState<{ user: DbUser; type: "warn" | "ban" | "unban" } | null>(null)
  const [actionMsg, setActionMsg] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionDone, setActionDone] = useState<string | null>(null)

  // User deletion
  const [deleteUserConfirm, setDeleteUserConfirm] = useState<DbUser | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)

  // Data
  const [users, setUsers]       = useState<DbUser[]>([])
  const [posts, setPosts]       = useState<DbPost[]>([])
  const [support, setSupport]   = useState<SupportMsg[]>([])
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [selectedPosts, setSelectedPosts] = useState<Set<number>>(new Set())
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Push
  const [pushTitle, setPushTitle] = useState("")
  const [pushBody, setPushBody]   = useState("")
  const [pushSent, setPushSent]   = useState(false)

  // Cron
  const [cronLog, setCronLog]   = useState<{type:string; time:string; status:string}[]>([])

  // Content generator
  const [cgKonzern, setCgKonzern] = useState(0)
  const [cgPlatform, setCgPlatform] = useState<"tiktok"|"instagram"|"twitter">("tiktok")
  const [cgCopied, setCgCopied]   = useState<string | null>(null)

  // Social Media
  interface SocialPost { id: number; platform: string; status: string; content: string; image_url: string | null; post_type: string; platform_url: string | null; posted_at: string | null; scheduled_at: string | null; error_msg: string | null; analytics: Record<string, number>; created_at: string }
  const [socialPosts, setSocialPosts]         = useState<SocialPost[]>([])
  const [socialLoading, setSocialLoading]     = useState(false)
  const [socialPosting, setSocialPosting]     = useState(false)
  const [socialStats, setSocialStats]         = useState<Record<string, { total: number; posted: number; failed: number; scheduled: number; totalLikes: number; totalComments: number; totalReach: number }>>({})
  // Composer
  const [scPlatforms, setScPlatforms]         = useState<string[]>(["instagram", "linkedin"])
  const [scContent, setScContent]             = useState("")
  const [scImageUrl, setScImageUrl]           = useState("")
  const [scPostType, setScPostType]           = useState("general")
  const [scSchedule, setScSchedule]           = useState("")
  const [scTopic, setScTopic]                 = useState("")
  const [scGenerateAI, setScGenerateAI]       = useState(false)
  const [scGenerating, setScGenerating]       = useState(false)
  const [scResult, setScResult]               = useState<{ success: boolean; results: Record<string, { success: boolean; url?: string; error?: string }>; content: string } | null>(null)

  // Partner leads
  interface PartnerLead { id: string; created_at: string; email: string; company_name: string; tier: string; status: string; notes: string }
  const [partnerLeads, setPartnerLeads]   = useState<PartnerLead[]>([])
  const [partnerLoading, setPartnerLoading] = useState(false)
  const [emailTarget, setEmailTarget]     = useState<PartnerLead | null>(null)
  const [emailSubject, setEmailSubject]   = useState("")
  const [emailBody, setEmailBody]         = useState("")
  const [emailSending, setEmailSending]   = useState(false)
  const [emailSent, setEmailSent]         = useState(false)
  const [leadNoteEdit, setLeadNoteEdit]   = useState<string | null>(null)
  const [leadNoteText, setLeadNoteText]   = useState("")

  // Verification queue
  interface VerifProduct {
    id: number; name: string; barcode: string | null; category: string | null
    tags: string[] | null; certifications: string[] | null; cert_numbers: string | null
    quality_claim: string | null; off_data: any; needs_review: boolean
    verified: boolean; verified_by: string | null; review_notes: string | null
    created_at: string; partner_id: string
    partner_profiles: { company_name: string; contact_email: string; tier: string } | null
  }
  interface VerifStats {
    total_products: number; verified_auto: number; verified_admin: number
    needs_review: number; rejected: number; total_partners: number
    partners_by_tier: { basic: number; growth: number; enterprise: number }
    mrr_estimate: number
  }
  const [verifQueue, setVerifQueue]       = useState<VerifProduct[]>([])
  const [verifStats, setVerifStats]       = useState<VerifStats | null>(null)
  const [verifLoading, setVerifLoading]   = useState(false)
  const [verifAction, setVerifAction]     = useState<{ product: VerifProduct; type: "approve" | "reject" } | null>(null)
  const [verifNote, setVerifNote]         = useState("")
  const [verifDoing, setVerifDoing]       = useState(false)

  // Bot manager
  const [twitterKey, setTwitterKey]       = useState("")
  const [twitterSecret, setTwitterSecret] = useState("")
  const [twitterToken, setTwitterToken]   = useState("")
  const [twitterTokenSec, setTwitterTokenSec] = useState("")
  const [botSchedule, setBotSchedule]     = useState("08:00 + 20:00")
  const [botPosting, setBotPosting]       = useState(false)
  const [botLog, setBotLog]               = useState<{time:string; platform:string; status:string; preview:string}[]>([])
  const [botEnabled, setBotEnabled]       = useState(false)
  const [twitterSaved, setTwitterSaved]   = useState(false)

  // Online users + activity
  const [onlineCount, setOnlineCount]     = useState<number | null>(null)
  const [activityData, setActivityData]   = useState<{hour: number; count: number}[]>([])
  const [cronBusy, setCronBusy]           = useState<string | null>(null)

  // ── Auth: always verify Supabase session — sessionStorage is not trusted ─────
  useEffect(() => {
    async function checkAuth() {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      const email = data.session?.user?.email ?? ""
      if (ADMIN_EMAILS.includes(email)) {
        setAuthed(true)
        sessionStorage.setItem(AUTH_KEY, "1")
      } else {
        sessionStorage.removeItem(AUTH_KEY)
        setAuthed(false)
      }
    }
    checkAuth()
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      try { const raw = localStorage.getItem("true-support-messages"); if (raw) setSupport(JSON.parse(raw)) } catch {}
      try { const cl = localStorage.getItem("true-cron-log"); if (cl) setCronLog(JSON.parse(cl)) } catch {}
      try { const bl = localStorage.getItem("true-bot-log"); if (bl) setBotLog(JSON.parse(bl)) } catch {}
      try { const be = localStorage.getItem("true-bot-enabled"); if (be) setBotEnabled(be === "1") } catch {}
      try {
        const tk = localStorage.getItem("true-twitter-keys")
        if (tk) { const k = JSON.parse(tk); setTwitterKey(k.key||""); setTwitterSecret(k.secret||""); setTwitterToken(k.token||""); setTwitterTokenSec(k.tokenSec||"") }
      } catch {}

      if (!supabase) { setLoading(false); setLastRefresh(new Date()); return }
      const { error: pingError } = await supabase.from("posts").select("id").limit(1)
      setSupabaseOk(!pingError)
      // Exclude comment_notif (notification helper rows) — they're not real content posts
      const { data: postsData } = await supabase.from("posts")
        .select("id, created_at, author_name, type, tag, text, likes, user_id")
        .neq("type", "comment_notif")
        .order("created_at", { ascending: false })
        .limit(200)
      if (postsData) setPosts(postsData as DbPost[])
      // Use service-role API to get all auth users (bypasses RLS)
      try {
        const usersRes = await fetch(`/api/admin-users?secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}`)
        if (usersRes.ok) {
          const usersJson = await usersRes.json()
          if (usersJson.users) setUsers(usersJson.users as DbUser[])
        }
      } catch {}

      // Activity chart: count posts per hour-of-day across all posts
      if (postsData && postsData.length > 0) {
        const hourCounts: Record<number, number> = {}
        for (let h = 0; h < 24; h++) hourCounts[h] = 0
        postsData.forEach(p => {
          const h = new Date(p.created_at).getHours()
          hourCounts[h] = (hourCounts[h] || 0) + 1
        })
        setActivityData(Object.entries(hourCounts).map(([h, c]) => ({ hour: +h, count: c })))
      }
    } catch (e) { console.error("Admin load error:", e) }
    setLoading(false)
    setLastRefresh(new Date())
  }, [])

  useEffect(() => { if (authed) loadData() }, [authed, loadData])

  // Supabase Realtime presence — count online users
  useEffect(() => {
    if (!authed || !supabase) return
    const channel = supabase.channel("admin-presence-watch")
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState()
      setOnlineCount(Object.keys(state).length)
    }).subscribe()
    return () => { supabase?.removeChannel(channel) }
  }, [authed])

  async function logout() {
    setAuthed(false)
    sessionStorage.removeItem(AUTH_KEY)
    if (supabase) await supabase.auth.signOut()
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setLoginError("")
    setLoginLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPw })
    setLoginLoading(false)
    if (error || !data.session) { setLoginError("E-Mail oder Passwort falsch."); return }
    const email = data.session.user.email ?? ""
    if (!ADMIN_EMAILS.includes(email)) { setLoginError("Kein Admin-Zugang für diese E-Mail."); await supabase.auth.signOut(); return }
    setAuthed(true)
    sessionStorage.setItem(AUTH_KEY, "1")
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setForgotError("")
    const email = forgotEmail.trim().toLowerCase()
    if (!ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) {
      setForgotError("Diese E-Mail hat keinen Admin-Zugang.")
      return
    }
    if (!supabase) return
    setForgotLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://get-true.de/auth/reset-password?from=admin",
    })
    setForgotLoading(false)
    if (error) { setForgotError("Fehler: " + error.message); return }
    setForgotSent(true)
  }

  async function deletePost(postId: number) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin-posts?secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [postId] }),
      })
      const json = await res.json()
      if (json.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId))
        setSelectedPosts(prev => { const s = new Set(prev); s.delete(postId); return s })
      } else {
        alert("Fehler: " + (json.error ?? "Unbekannt"))
      }
    } catch { alert("Netzwerkfehler") }
    setDeleteConfirm(null)
    setDeleting(false)
  }

  async function deleteSelected() {
    const ids = Array.from(selectedPosts)
    if (ids.length === 0) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin-posts?secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      const json = await res.json()
      if (json.ok) {
        setPosts(prev => prev.filter(p => !selectedPosts.has(p.id)))
        setSelectedPosts(new Set())
      } else {
        alert("Fehler: " + (json.error ?? "Unbekannt"))
      }
    } catch { alert("Netzwerkfehler") }
    setDeleteAllConfirm(false)
    setDeleting(false)
  }

  function toggleSelectPost(id: number) {
    setSelectedPosts(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function toggleSelectAll() {
    if (selectedPosts.size === posts.length) {
      setSelectedPosts(new Set())
    } else {
      setSelectedPosts(new Set(posts.map(p => p.id)))
    }
  }

  async function sendPush() {
    if (!pushTitle.trim()) return
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification(pushTitle, { body: pushBody, icon: "/icon-192.png", tag: "true-admin-" + Date.now(), data: { url: "/home" } })
        setPushSent(true); setTimeout(() => setPushSent(false), 3000)
        setPushTitle(""); setPushBody("")
        const newLog = { type: "push", time: new Date().toLocaleTimeString("de-DE"), status: "✓ Gesendet" }
        const updated = [newLog, ...cronLog.slice(0, 19)]
        setCronLog(updated)
        try { localStorage.setItem("true-cron-log", JSON.stringify(updated)) } catch {}
      } catch { alert("Service Worker nicht verfügbar") }
    }
  }

  async function triggerCron(type: "bot" | "eva" | "coach") {
    setCronBusy(type)
    try {
      const res  = await fetch(`/api/cron?type=${type}&secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}`)
      const json = await res.json()
      const entry = { type: `cron/${type}`, time: new Date().toLocaleTimeString("de-DE"), status: json.ok ? `✓ Post erstellt` : `✗ ${json.error ?? "Fehler"}` }
      const updated = [entry, ...cronLog.slice(0, 19)]
      setCronLog(updated)
      try { localStorage.setItem("true-cron-log", JSON.stringify(updated)) } catch {}
      if (json.ok) loadData()
    } catch {
      const entry = { type: `cron/${type}`, time: new Date().toLocaleTimeString("de-DE"), status: "✗ Netzwerkfehler" }
      setCronLog(prev => [entry, ...prev.slice(0, 19)])
    }
    setCronBusy(null)
  }

  async function loadVerifQueue() {
    if (!supabase) return
    setVerifLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      const res = await fetch("/api/admin/verification", { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      setVerifQueue(json.queue ?? [])
      setVerifStats(json.stats ?? null)
    } catch {}
    setVerifLoading(false)
  }

  async function handleVerifAction(action: "approve" | "reject") {
    if (!verifAction || !supabase) return
    setVerifDoing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      await fetch("/api/admin/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: verifAction.product.id, action, notes: verifNote }),
      })
      setVerifQueue(q => q.filter(p => p.id !== verifAction.product.id))
      setVerifStats(s => s ? { ...s, needs_review: s.needs_review - 1, [action === "approve" ? "verified_admin" : "rejected"]: (s as any)[action === "approve" ? "verified_admin" : "rejected"] + 1 } : s)
    } catch {}
    setVerifDoing(false)
    setVerifAction(null)
    setVerifNote("")
  }

  async function loadPartnerLeads() {
    setPartnerLoading(true)
    try {
      const res = await fetch(`/api/partner-contact?secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}`)
      const json = await res.json()
      setPartnerLeads(json.leads ?? [])
    } catch {}
    setPartnerLoading(false)
  }

  async function updateLeadStatus(id: string, status: string, notes: string) {
    await fetch(`/api/partner-contact?secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, notes }),
    })
    setPartnerLeads(prev => prev.map(l => l.id === id ? { ...l, status, notes } : l))
  }

  async function sendPartnerEmail() {
    if (!emailTarget || !emailSubject.trim() || !emailBody.trim()) return
    setEmailSending(true)
    try {
      await fetch("/api/admin-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: process.env.NEXT_PUBLIC_ADMIN_SECRET, to: emailTarget.email, subject: emailSubject, body: emailBody }),
      })
      setEmailSent(true)
      setTimeout(() => { setEmailSent(false); setEmailTarget(null); setEmailSubject(""); setEmailBody("") }, 2500)
    } catch {}
    setEmailSending(false)
  }

  async function loadSocialData() {
    setSocialLoading(true)
    try {
      const [postsRes, statsRes] = await Promise.all([
        fetch("/api/social-post?limit=30"),
        fetch("/api/social-analytics", { method: "POST" }),
      ])
      const postsData = await postsRes.json()
      const statsData = await statsRes.json()
      if (postsData.posts) setSocialPosts(postsData.posts)
      if (statsData.stats) setSocialStats(statsData.stats)
    } catch {}
    setSocialLoading(false)
  }

  async function submitSocialPost() {
    if (!scContent && !scGenerateAI) return
    setSocialPosting(true)
    setScResult(null)
    try {
      const res = await fetch("/api/social-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: scPlatforms,
          content: scContent,
          imageUrl: scImageUrl || undefined,
          postType: scPostType,
          topic: scTopic,
          generateAI: scGenerateAI,
          scheduledAt: scSchedule || undefined,
        }),
      })
      const data = await res.json()
      setScResult(data)
      if (data.success) {
        setScContent(data.content ?? scContent)
        loadSocialData()
      }
    } catch {}
    setSocialPosting(false)
  }

  async function generateAICaption() {
    if (!scTopic) return
    setScGenerating(true)
    try {
      const res = await fetch("/api/social-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms: scPlatforms, topic: scTopic, postType: scPostType, generateAI: true, scheduledAt: "preview-only" }),
      })
      const data = await res.json()
      if (data.content) setScContent(data.content)
    } catch {}
    setScGenerating(false)
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    if (tab === "partner" && partnerLeads.length === 0) loadPartnerLeads()
    if (tab === "partner" && verifStats === null) loadVerifQueue()
    if (tab === "social" && socialPosts.length === 0) loadSocialData()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCgCopied(key)
      setTimeout(() => setCgCopied(null), 2000)
    })
  }

  function saveTwitterKeys() {
    try { localStorage.setItem("true-twitter-keys", JSON.stringify({ key: twitterKey, secret: twitterSecret, token: twitterToken, tokenSec: twitterTokenSec })) } catch {}
    setTwitterSaved(true)
    setTimeout(() => setTwitterSaved(false), 2500)
  }

  async function postBotNow(platform: string) {
    setBotPosting(true)
    const konzern = KONZERNE[Math.floor(Date.now() / 86_400_000) % KONZERNE.length]
    const content = generateContent(konzern, platform)
    const mainText = content.sections[1]?.text || content.sections[0]?.text
    const full = `${mainText}\n\n${content.hashtags}`

    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, text: full, secret: "true-cron-2024" }),
      })
      const json = await res.json()
      const entry = { time: new Date().toLocaleTimeString("de-DE"), platform, status: json.ok ? "✓ Gepostet" : `✗ ${json.error || "Fehler"}`, preview: mainText.slice(0, 80) }
      const updated = [entry, ...botLog.slice(0, 19)]
      setBotLog(updated)
      try { localStorage.setItem("true-bot-log", JSON.stringify(updated)) } catch {}
    } catch {
      const entry = { time: new Date().toLocaleTimeString("de-DE"), platform, status: "✗ Netzwerkfehler", preview: mainText.slice(0, 80) }
      const updated = [entry, ...botLog.slice(0, 19)]
      setBotLog(updated)
    }
    setBotPosting(false)
  }

  function toggleBot(on: boolean) {
    setBotEnabled(on)
    try { localStorage.setItem("true-bot-enabled", on ? "1" : "0") } catch {}
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
  }

  async function executeAction() {
    if (!actionModal) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin-ban?secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: actionModal.user.id, action: actionModal.type, message: actionMsg }),
      })
      const data = await res.json()
      if (data.ok) {
        setActionDone(actionModal.type === "ban" ? "Nutzer gesperrt ✓" : actionModal.type === "unban" ? "Sperre aufgehoben ✓" : "Verwarnung gesendet ✓")
        // Update local state to reflect ban
        if (actionModal.type === "ban") {
          setUsers(u => u.map(x => x.id === actionModal.user.id ? { ...x, banned: true } : x))
        } else if (actionModal.type === "unban") {
          setUsers(u => u.map(x => x.id === actionModal.user.id ? { ...x, banned: false } : x))
        }
        setTimeout(() => { setActionModal(null); setActionDone(null); setActionMsg("") }, 1800)
      } else {
        setActionDone("Fehler: " + (data.error ?? "Unbekannt"))
      }
    } catch { setActionDone("Netzwerkfehler") }
    setActionLoading(false)
  }

  async function handleDeleteUser(user: DbUser) {
    setDeletingUser(true)
    try {
      const res = await fetch(`/api/admin-delete-user?secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}&userId=${user.id}`, { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        setUsers(u => u.filter(x => x.id !== user.id))
        setDeleteUserConfirm(null)
      } else {
        alert("Fehler: " + (data.error ?? "Unbekannt"))
      }
    } catch { alert("Netzwerkfehler") }
    setDeletingUser(false)
  }

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "system-ui,-apple-system,sans-serif" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "2.5rem", maxWidth: "360px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🛡️</div>
          <h1 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: "0.3rem" }}>Admin Dashboard</h1>
          <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginBottom: "1.5rem" }}>
            Nur für autorisierte TRUE-Konten zugänglich.
          </p>
          {!forgotMode ? (
            <>
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>E-Mail</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="admin@get-true.de"
                    required
                    style={{ width: "100%", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem 0.9rem", color: "var(--text)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Passwort</label>
                  <input
                    type="password"
                    value={loginPw}
                    onChange={e => setLoginPw(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ width: "100%", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem 0.9rem", color: "var(--text)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const }}
                  />
                </div>
                {loginError && (
                  <div style={{ background: "rgba(255,68,85,0.1)", border: "1px solid rgba(255,68,85,0.3)", borderRadius: 8, padding: "0.5rem 0.75rem", fontSize: "0.78rem", color: "#ff4455" }}>
                    {loginError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 12, padding: "0.85rem", fontWeight: 800, cursor: loginLoading ? "not-allowed" : "pointer", fontSize: "1rem", opacity: loginLoading ? 0.7 : 1, marginTop: 4 }}
                >
                  {loginLoading ? "Wird geprüft…" : "Anmelden →"}
                </button>
              </form>
              <button
                onClick={() => { setForgotMode(true); setForgotEmail(loginEmail); setForgotSent(false); setForgotError("") }}
                style={{ display: "block", width: "100%", marginTop: "0.75rem", background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.8rem", cursor: "pointer", textAlign: "center", textDecoration: "underline" }}
              >
                Passwort vergessen?
              </button>
            </>
          ) : (
            <>
              {!forgotSent ? (
                <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", textAlign: "left" }}>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", margin: "0 0 4px", textAlign: "center" }}>
                    Gib deine Admin-E-Mail ein. Du erhältst einen Reset-Link.
                  </p>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="admin@get-true.de"
                    required
                    autoFocus
                    style={{ width: "100%", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem 0.9rem", color: "var(--text)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const }}
                  />
                  {forgotError && (
                    <div style={{ background: "rgba(255,68,85,0.1)", border: "1px solid rgba(255,68,85,0.3)", borderRadius: 8, padding: "0.5rem 0.75rem", fontSize: "0.78rem", color: "#ff4455" }}>
                      {forgotError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 12, padding: "0.85rem", fontWeight: 800, cursor: forgotLoading ? "not-allowed" : "pointer", fontSize: "1rem", opacity: forgotLoading ? 0.7 : 1 }}
                  >
                    {forgotLoading ? "Wird gesendet…" : "Reset-Link senden →"}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>📧</div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 6 }}>E-Mail gesendet!</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", lineHeight: 1.5 }}>
                    Prüfe dein Postfach und klicke auf den Link, um dein Passwort zurückzusetzen.
                  </div>
                </div>
              )}
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotError("") }}
                style={{ display: "block", width: "100%", marginTop: "0.75rem", background: "none", border: "none", color: "var(--text-dim)", fontSize: "0.8rem", cursor: "pointer", textAlign: "center" }}
              >
                ← Zurück zum Login
              </button>
            </>
          )}
          <Link href="/" style={{ display: "block", marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-dim)", textDecoration: "none", textAlign: "center" }}>← Zurück zur Startseite</Link>
        </div>
      </div>
    )
  }

  const TABS: [Tab, string][] = [
    ["overview", "📊"],
    ["partner",  "🤝"],
    ["social",   "📱"],
    ["users",    "👥"],
    ["posts",    "📝"],
    ["content",  "🎬"],
    ["bots",     "🤖"],
    ["push",     "🔔"],
    ["support",  "💬"],
    ["system",   "⚙️"],
  ]
  const TAB_LABELS: Record<Tab, string> = {
    overview: "Übersicht", partner: "Partner", social: "Social", users: "Nutzer", posts: "Posts",
    content: "Content", bots: "Bots", push: "Push", support: "Support", system: "System",
  }

  const cgData = generateContent(KONZERNE[cgKonzern], cgPlatform)

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--nav-bg)", backdropFilter: "blur(24px)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1rem", height: "52px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontWeight: 900, fontSize: "1rem", color: "var(--accent)" }}>TRUE</span>
          <span style={{ background: "#ff455518", color: "#ff4455", border: "1px solid #ff455540", borderRadius: "6px", padding: "0.1rem 0.45rem", fontSize: "0.6rem", fontWeight: 700 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {lastRefresh && <span style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>{lastRefresh.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>}
          <button onClick={loadData} disabled={loading} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "4px 9px", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.75rem" }}>{loading ? "⏳" : "↺"}</button>
          <ThemeToggle />
          <button onClick={logout} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.75rem" }}>Logout</button>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", borderBottom: "1px solid var(--border)", background: "var(--nav-bg)", backdropFilter: "blur(12px)", position: "sticky", top: 52, zIndex: 50 }}>
        {TABS.map(([key, icon]) => (
          <button key={key} onClick={() => switchTab(key)} style={{ flexShrink: 0, padding: "9px 14px", border: "none", borderBottom: `2px solid ${activeTab === key ? "var(--accent)" : "transparent"}`, background: "transparent", color: activeTab === key ? "var(--accent)" : "var(--text-dim)", fontWeight: activeTab === key ? 700 : 500, fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap", display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
            <span style={{ fontSize: "1rem" }}>{icon}</span>
            <span style={{ fontSize: "0.55rem", letterSpacing: "0.04em" }}>{TAB_LABELS[key]}</span>
          </button>
        ))}
      </div>

      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "1.25rem 1rem 4rem" }}>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 800 }}>System-Übersicht</h2>
            <div style={{ background: supabase ? (supabaseOk === null ? "var(--surface)" : supabaseOk ? "rgba(46,204,138,0.07)" : "rgba(255,60,60,0.08)") : "rgba(255,180,0,0.08)", border: `1px solid ${supabase ? (supabaseOk === null ? "var(--border)" : supabaseOk ? "rgba(46,204,138,0.3)" : "rgba(255,60,60,0.3)") : "rgba(255,180,0,0.3)"}`, borderRadius: "12px", padding: "12px 16px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.3rem" }}>{supabase ? (supabaseOk === null ? "🔄" : supabaseOk ? "✅" : "❌") : "⚠️"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{supabase ? (supabaseOk === null ? "Supabase wird geprüft…" : supabaseOk ? "Supabase verbunden" : "Verbindungsfehler") : "Supabase nicht konfiguriert"}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{supabase ? "Datenbank aktiv" : "Env-Variablen fehlen"}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", marginBottom: "1rem" }}>
              {[
                { label: "Nutzer", value: users.length, color: "#2ECC8A" },
                { label: "Posts gesamt", value: posts.length, color: "#44aaff" },
                { label: "Community", value: posts.filter(p => p.type === "community").length, color: "#A78BFA" },
                { label: "Partner", value: verifStats?.total_partners ?? "–", color: "#ffd700" },
                { label: "MRR (est.)", value: verifStats ? `${verifStats.mrr_estimate}€` : "–", color: "#2ECC8A" },
                { label: "Queue offen", value: verifStats?.needs_review ?? "–", color: verifStats?.needs_review ? "#ffc107" : "#2ECC8A" },
              ].map(s => (
                <div key={s.label} onClick={() => s.label.includes("Queue") || s.label === "Partner" || s.label === "MRR" ? switchTab("partner") : null}
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px 10px", textAlign: "center", cursor: s.label.includes("Queue") || s.label === "Partner" || s.label === "MRR" ? "pointer" : "default" }}>
                  <div style={{ fontWeight: 900, fontSize: "1.4rem", color: s.color, lineHeight: 1 }}>{loading ? "…" : s.value}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-dim)", marginTop: "4px" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Online now banner */}
            <div style={{ background: onlineCount && onlineCount > 0 ? "rgba(46,204,138,0.08)" : "var(--surface)", border: `1px solid ${onlineCount && onlineCount > 0 ? "rgba(46,204,138,0.3)" : "var(--border)"}`, borderRadius: "12px", padding: "12px 16px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: onlineCount && onlineCount > 0 ? "#2ECC8A" : "#888", boxShadow: onlineCount && onlineCount > 0 ? "0 0 8px #2ECC8A" : "none", animation: onlineCount && onlineCount > 0 ? "pulse 2s infinite" : "none", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                  {onlineCount === null ? "Verbinde Realtime…" : onlineCount === 0 ? "Gerade niemand aktiv" : `${onlineCount} Nutzer gerade aktiv`}
                </span>
              </div>
              {onlineCount !== null && onlineCount > 0 && (
                <span style={{ background: "rgba(46,204,138,0.15)", color: "#2ECC8A", borderRadius: "20px", padding: "2px 10px", fontSize: "0.68rem", fontWeight: 800 }}>LIVE</span>
              )}
            </div>

            {/* Activity chart by hour */}
            {activityData.length > 0 && (() => {
              const maxCount = Math.max(...activityData.map(d => d.count), 1)
              const currentHour = new Date().getHours()
              return (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <h3 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700 }}>📊 Aktivität nach Uhrzeit</h3>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>Basierend auf {posts.length} Posts</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "60px" }}>
                    {activityData.map(d => (
                      <div key={d.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                        <div style={{ width: "100%", background: d.hour === currentHour ? "#2ECC8A" : d.count === maxCount ? "#ffcc00" : "var(--accent-dim,rgba(46,204,138,0.25))", borderRadius: "3px 3px 0 0", height: `${Math.max(3, (d.count / maxCount) * 52)}px`, transition: "height 0.5s ease" }} title={`${d.hour}:00 — ${d.count} Aktionen`} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                    {[0, 6, 12, 18, 23].map(h => (
                      <span key={h} style={{ fontSize: "0.58rem", color: "var(--text-dim)" }}>{h}h</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}><span style={{ color: "#2ECC8A" }}>■</span> Jetzt</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}><span style={{ color: "#ffcc00" }}>■</span> Aktivste Stunde</span>
                    {activityData.length > 0 && <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>Peak: {activityData.reduce((a, b) => b.count > a.count ? b : a).hour}:00 Uhr</span>}
                  </div>
                </div>
              )
            })()}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px", marginBottom: "1rem" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "0.88rem", fontWeight: 700 }}>⚡ Schnellaktionen</h3>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {([["bot","🤖 Bot-Post"], ["eva","✍️ Eva-Post"], ["coach","🥗 Coach-Post"]] as ["bot"|"eva"|"coach", string][]).map(([t, label]) => (
                  <button key={t} onClick={() => triggerCron(t)} disabled={cronBusy === t}
                    style={{ background: cronBusy === t ? "var(--accent-dim)" : "var(--background)", border: `1px solid ${cronBusy === t ? "var(--accent)" : "var(--border)"}`, borderRadius: "10px", padding: "7px 14px", fontSize: "0.8rem", cursor: cronBusy === t ? "not-allowed" : "pointer", color: cronBusy === t ? "var(--accent)" : "var(--text)", fontWeight: 600 }}>
                    {cronBusy === t ? "⏳ Läuft…" : label}
                  </button>
                ))}
                <button onClick={() => switchTab("content")} style={{ background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: "10px", padding: "7px 14px", fontSize: "0.8rem", cursor: "pointer", color: "var(--accent)", fontWeight: 700 }}>🎬 Content erstellen</button>
              </div>
            </div>
            {posts.length > 0 && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px" }}>
                <h3 style={{ margin: "0 0 10px", fontSize: "0.88rem", fontWeight: 700 }}>🕐 Letzte Posts</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {posts.slice(0, 5).map(p => (
                    <div key={p.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start", padding: "8px", background: "var(--background)", borderRadius: "8px" }}>
                      <span style={{ fontSize: "0.62rem", background: p.type === "community" ? "#A78BFA22" : p.type === "user" ? "#cc66ff22" : "#2ECC8A22", color: p.type === "community" ? "#A78BFA" : p.type === "user" ? "#cc66ff" : "#2ECC8A", borderRadius: "5px", padding: "2px 6px", fontWeight: 700, flexShrink: 0 }}>{p.type.toUpperCase()}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.text.slice(0, 90)}…</div>
                      </div>
                      <span style={{ fontSize: "0.62rem", color: "var(--text-dim)", flexShrink: 0 }}>{formatDate(p.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PARTNER ── */}
        {activeTab === "partner" && (
          <div>
            {/* ── Partner KPI Stats ── */}
            {verifStats && (
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.55rem", marginBottom: "0.55rem" }}>
                  {[
                    { label: "Partner gesamt", value: verifStats.total_partners, color: "#2ECC8A", icon: "🤝" },
                    { label: "Produkte gesamt", value: verifStats.total_products, color: "#44aaff", icon: "📦" },
                    { label: "MRR (est.)", value: `${verifStats.mrr_estimate}€`, color: "#ffd700", icon: "💰" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: "1rem", marginBottom: "2px" }}>{s.icon}</div>
                      <div style={{ fontWeight: 900, fontSize: "1.3rem", color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: "0.58rem", color: "var(--text-dim)", marginTop: "4px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.55rem", marginBottom: "0.55rem" }}>
                  {[
                    { label: "Auto-verifiziert", value: verifStats.verified_auto, color: "#2ECC8A" },
                    { label: "Admin-verifiziert", value: verifStats.verified_admin, color: "#44aaff" },
                    { label: "In Queue", value: verifStats.needs_review, color: "#ffc107" },
                    { label: "Abgelehnt", value: verifStats.rejected, color: "#ff4455" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "var(--surface)", border: `1px solid ${s.value > 0 && s.label === "In Queue" ? "rgba(255,193,7,0.3)" : "var(--border)"}`, borderRadius: "10px", padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontWeight: 900, fontSize: "1.2rem", color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: "0.58rem", color: "var(--text-dim)", marginTop: "3px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Tier-Verteilung */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600 }}>Tier-Verteilung:</span>
                  {[
                    { label: "🌱 Starter", value: verifStats.partners_by_tier.basic, color: "#2ECC8A" },
                    { label: "🚀 Wachstum", value: verifStats.partners_by_tier.growth, color: "#4488ff" },
                    { label: "👑 Enterprise", value: verifStats.partners_by_tier.enterprise, color: "#ffd700" },
                  ].map(t => (
                    <div key={t.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: 800, color: t.color, fontSize: "1rem" }}>{t.value}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Verifikations-Queue ── */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
                  🔍 Verifikations-Queue
                  {verifStats && verifStats.needs_review > 0 && (
                    <span style={{ marginLeft: 8, background: "#ffc10718", border: "1px solid #ffc10740", color: "#ffc107", borderRadius: 99, padding: "1px 9px", fontSize: "0.65rem", fontWeight: 800 }}>
                      {verifStats.needs_review} offen
                    </span>
                  )}
                </h2>
                <button onClick={loadVerifQueue} disabled={verifLoading}
                  style={{ marginLeft: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "4px 10px", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.75rem" }}>
                  {verifLoading ? "⏳" : "↺"}
                </button>
              </div>

              {verifQueue.length === 0 ? (
                <div style={{ background: "rgba(46,204,138,0.05)", border: "1px solid rgba(46,204,138,0.15)", borderRadius: "14px", padding: "1.5rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem", marginBottom: "6px" }}>✅</div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#2ECC8A" }}>Queue leer</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>Alle Produkte geprüft.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {verifQueue.map(p => (
                    <div key={p.id} style={{ background: "var(--surface)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: "14px", padding: "14px 16px" }}>
                      {/* Header */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{p.name}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "2px" }}>
                            von <b style={{ color: "var(--text)" }}>{p.partner_profiles?.company_name ?? "Unbekannt"}</b>
                            {p.partner_profiles?.tier && <span style={{ marginLeft: 6, color: "#2ECC8A", fontWeight: 700 }}>{p.partner_profiles.tier}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.62rem", color: "var(--text-dim)", flexShrink: 0, fontFamily: "monospace" }}>
                          {new Date(p.created_at).toLocaleDateString("de-DE")}
                        </span>
                      </div>

                      {/* Details */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "10px" }}>
                        {p.barcode && (
                          <span style={{ background: "rgba(255,255,255,0.06)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.68rem", fontFamily: "monospace", color: "var(--text-dim)" }}>
                            EAN: {p.barcode}
                          </span>
                        )}
                        {p.category && (
                          <span style={{ background: "rgba(255,255,255,0.06)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.68rem", color: "var(--text-dim)" }}>{p.category}</span>
                        )}
                        {(p.tags ?? []).map(t => (
                          <span key={t} style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.68rem", color: "#2ECC8A" }}>{t}</span>
                        ))}
                        {(p.certifications ?? []).map(c => (
                          <span key={c} style={{ background: "rgba(68,136,255,0.08)", border: "1px solid rgba(68,136,255,0.2)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.68rem", color: "#4488ff" }}>{c}</span>
                        ))}
                      </div>

                      {/* OpenFoodFacts Match */}
                      <div style={{ background: p.off_data ? "rgba(46,204,138,0.05)" : "rgba(255,193,7,0.05)", border: `1px solid ${p.off_data ? "rgba(46,204,138,0.15)" : "rgba(255,193,7,0.15)"}`, borderRadius: "8px", padding: "8px 10px", marginBottom: "10px", fontSize: "0.72rem" }}>
                        {p.off_data ? (
                          <span style={{ color: "#2ECC8A" }}>
                            ✓ Barcode in OpenFoodFacts gefunden — Name stimmt nicht exakt überein (manuelle Prüfung)
                            {p.off_data.product_name_de && <> · OFF-Name: <b>{p.off_data.product_name_de}</b></>}
                            {p.off_data.nutriscore_grade && <> · Nutri-Score: <b style={{ textTransform: "uppercase" }}>{p.off_data.nutriscore_grade}</b></>}
                          </span>
                        ) : (
                          <span style={{ color: "#ffc107" }}>⚠️ Barcode nicht in OpenFoodFacts — nur mit Zertifikat prüfbar</span>
                        )}
                      </div>

                      {p.quality_claim && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic", marginBottom: "10px" }}>
                          „{p.quality_claim}"
                        </div>
                      )}

                      {p.cert_numbers && (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "10px" }}>
                          🏅 Zertifikat-Nr.: <span style={{ color: "var(--text)", fontFamily: "monospace" }}>{p.cert_numbers}</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => { setVerifAction({ product: p, type: "approve" }); setVerifNote("") }}
                          style={{ flex: 1, background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: "8px", padding: "7px", fontSize: "0.78rem", fontWeight: 700, color: "#2ECC8A", cursor: "pointer" }}>
                          ✓ Genehmigen
                        </button>
                        <button
                          onClick={() => { setVerifAction({ product: p, type: "reject" }); setVerifNote("") }}
                          style={{ flex: 1, background: "rgba(255,68,85,0.06)", border: "1px solid rgba(255,68,85,0.2)", borderRadius: "8px", padding: "7px", fontSize: "0.78rem", fontWeight: 700, color: "#ff7788", cursor: "pointer" }}>
                          ✗ Ablehnen
                        </button>
                        {p.off_data?.shop_url && (
                          <a href={p.off_data.shop_url} target="_blank" rel="noreferrer"
                            style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 12px", fontSize: "0.78rem", color: "var(--text-dim)", textDecoration: "none", cursor: "pointer" }}>
                            🌐
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirm Modal */}
              {verifAction && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "1.5rem", width: "100%", maxWidth: "380px" }}>
                    <h3 style={{ margin: "0 0 0.75rem", fontWeight: 800 }}>
                      {verifAction.type === "approve" ? "✓ Produkt genehmigen?" : "✗ Produkt ablehnen?"}
                    </h3>
                    <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--text-dim)" }}>
                      <b style={{ color: "var(--text)" }}>{verifAction.product.name}</b> von {verifAction.product.partner_profiles?.company_name}
                    </p>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-dim)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Notiz / Begründung {verifAction.type === "reject" ? "(Pflicht)" : "(optional)"}
                      </label>
                      <textarea
                        value={verifNote}
                        onChange={e => setVerifNote(e.target.value)}
                        rows={3}
                        placeholder={verifAction.type === "approve" ? "z.B. Zertifikat geprüft ✓" : "z.B. Barcode stimmt nicht mit Produktname überein"}
                        style={{ width: "100%", boxSizing: "border-box", background: "var(--background)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.7rem", color: "var(--text)", fontSize: "0.82rem", outline: "none", resize: "vertical" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "0.6rem" }}>
                      <button onClick={() => setVerifAction(null)}
                        style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.75rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", color: "var(--text-dim)" }}>
                        Abbrechen
                      </button>
                      <button
                        onClick={() => handleVerifAction(verifAction.type)}
                        disabled={verifDoing || (verifAction.type === "reject" && !verifNote.trim())}
                        style={{ flex: 1, background: verifAction.type === "approve" ? "linear-gradient(135deg,#2ECC8A,#1aaa6e)" : "rgba(255,68,85,0.15)", border: verifAction.type === "reject" ? "1px solid rgba(255,68,85,0.4)" : "none", borderRadius: "10px", padding: "0.75rem", fontWeight: 800, fontSize: "0.85rem", cursor: verifDoing ? "not-allowed" : "pointer", color: verifAction.type === "approve" ? "#000" : "#ff7788", opacity: verifDoing ? 0.7 : 1 }}>
                        {verifDoing ? "…" : verifAction.type === "approve" ? "Genehmigen" : "Ablehnen"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Partner-Leads (CRM) ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>🤝 Partner-Anfragen (CRM)</h2>
              <button onClick={loadPartnerLeads} disabled={partnerLoading} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "5px 12px", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.78rem" }}>
                {partnerLoading ? "⏳" : "↺ Laden"}
              </button>
            </div>

            {/* Status legend */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {[
                { key: "new",        label: "Neu",         color: "#4488ff" },
                { key: "contacted",  label: "Kontaktiert", color: "#ffaa00" },
                { key: "active",     label: "Aktiv",       color: "#2ECC8A" },
                { key: "inactive",   label: "Inaktiv",     color: "#888" },
              ].map(s => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                  {s.label}
                </div>
              ))}
            </div>

            {/* Leads list */}
            {partnerLeads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-dim)", background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>📭</div>
                <p style={{ fontWeight: 600, margin: "0 0 4px" }}>Noch keine Anfragen</p>
                <p style={{ fontSize: "0.8rem", margin: 0 }}>Wenn sich ein Unternehmen über get-true.de/partner einträgt, erscheint es hier.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {partnerLeads.map(lead => {
                  const statusColors: Record<string, string> = { new: "#4488ff", contacted: "#ffaa00", active: "#2ECC8A", inactive: "#888" }
                  const statusLabels: Record<string, string> = { new: "Neu", contacted: "Kontaktiert", active: "Aktiv", inactive: "Inaktiv" }
                  const nextStatus: Record<string, string> = { new: "contacted", contacted: "active", active: "inactive", inactive: "new" }
                  const col = statusColors[lead.status] ?? "#888"

                  return (
                    <div key={lead.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px" }}>
                      {/* Header row */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                        {/* Avatar */}
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: col + "22", border: `1.5px solid ${col}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>
                          🏢
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {lead.company_name || lead.email}
                          </div>
                          {lead.company_name && (
                            <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email}</div>
                          )}
                        </div>
                        {/* Status pill — click to advance */}
                        <button
                          onClick={() => updateLeadStatus(lead.id, nextStatus[lead.status] ?? "new", lead.notes)}
                          style={{ background: col + "18", border: `1px solid ${col}44`, color: col, borderRadius: 99, padding: "3px 10px", fontSize: "0.65rem", fontWeight: 800, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
                          title="Klicken um Status weiterzuschalten"
                        >
                          {statusLabels[lead.status] ?? lead.status} →
                        </button>
                      </div>

                      {/* Meta row */}
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: 10 }}>
                        {lead.tier && (
                          <span style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", fontSize: "0.65rem", fontWeight: 600, color: "var(--text-dim)" }}>
                            📦 {lead.tier}
                          </span>
                        )}
                        <span style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", fontSize: "0.65rem", color: "var(--text-dim)" }}>
                          {new Date(lead.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Notes */}
                      {leadNoteEdit === lead.id ? (
                        <div style={{ marginBottom: 10 }}>
                          <textarea
                            value={leadNoteText}
                            onChange={e => setLeadNoteText(e.target.value)}
                            placeholder="Notizen (intern)…"
                            rows={2}
                            style={{ width: "100%", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: "0.8rem", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                          />
                          <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                            <button onClick={() => { updateLeadStatus(lead.id, lead.status, leadNoteText); setLeadNoteEdit(null) }} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 7, padding: "5px 12px", fontWeight: 700, cursor: "pointer", fontSize: "0.78rem" }}>Speichern</button>
                            <button onClick={() => setLeadNoteEdit(null)} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.78rem" }}>Abbrechen</button>
                          </div>
                        </div>
                      ) : lead.notes ? (
                        <div onClick={() => { setLeadNoteEdit(lead.id); setLeadNoteText(lead.notes) }} style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 10, cursor: "pointer", lineHeight: 1.5 }}>
                          📝 {lead.notes}
                        </div>
                      ) : null}

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          onClick={() => { setEmailTarget(lead); setEmailSubject("Deine Anfrage bei TRUE"); setEmailBody(`Hallo${lead.company_name ? ` ${lead.company_name}` : ""},\n\nvielen Dank für dein Interesse an einer Partnerschaft mit TRUE.\n\n`); }}
                          style={{ background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.25)", color: "var(--accent)", borderRadius: 8, padding: "5px 12px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          ✉️ E-Mail schreiben
                        </button>
                        <button
                          onClick={() => { setLeadNoteEdit(lead.id); setLeadNoteText(lead.notes ?? "") }}
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-dim)", borderRadius: 8, padding: "5px 12px", fontSize: "0.75rem", cursor: "pointer" }}
                        >
                          📝 Notiz
                        </button>
                        <a
                          href={`mailto:${lead.email}`}
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-dim)", borderRadius: 8, padding: "5px 12px", fontSize: "0.75rem", cursor: "pointer", textDecoration: "none" }}
                        >
                          📧 Mailto
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* E-Mail compose modal */}
            {emailTarget && (
              <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
                onClick={e => { if (e.target === e.currentTarget) setEmailTarget(null) }}>
                <div style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto", padding: "20px 20px 36px" }}>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 16px" }} />
                  <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 4 }}>✉️ E-Mail an {emailTarget.company_name || emailTarget.email}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 14 }}>An: <strong>{emailTarget.email}</strong></div>

                  {emailSent ? (
                    <div style={{ textAlign: "center", padding: "1.5rem" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>✅</div>
                      <div style={{ fontWeight: 700 }}>E-Mail gesendet!</div>
                    </div>
                  ) : (
                    <>
                      <input
                        value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                        placeholder="Betreff"
                        style={{ width: "100%", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: "0.88rem", outline: "none", marginBottom: 10, boxSizing: "border-box" as const }}
                      />
                      <textarea
                        value={emailBody} onChange={e => setEmailBody(e.target.value)}
                        placeholder="E-Mail-Text…"
                        rows={7}
                        style={{ width: "100%", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: "0.85rem", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" as const, marginBottom: 12 }}
                      />

                      {/* Quick templates */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontWeight: 700, marginBottom: 6 }}>Vorlagen:</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {[
                            { label: "Willkommen", body: `Hallo ${emailTarget.company_name || ""},\n\nwillkommen bei TRUE! Wir freuen uns sehr, dich als Partner begrüßen zu dürfen.\n\nDein Profil wird in den nächsten Tagen eingerichtet. Bei Fragen stehen wir jederzeit zur Verfügung.\n\nMit freundlichen Grüßen,\nJosias\nGründer TRUE` },
                            { label: "Danke", body: `Hallo ${emailTarget.company_name || ""},\n\nvielen Dank für dein Interesse! Wir haben deine Anfrage erhalten und melden uns innerhalb von 24 Stunden mit weiteren Details.\n\nBeste Grüße,\nJosias\nTRUE` },
                            { label: "Info-Call", body: `Hallo ${emailTarget.company_name || ""},\n\nvielen Dank für deine Anfrage!\n\nIch würde gerne kurz mit dir sprechen, um alles zu erklären und deine Fragen zu beantworten. Wann passt es dir für ein 15-minütiges Gespräch?\n\nMelde dich gerne direkt zurück.\n\nBeste Grüße,\nJosias\nTRUE` },
                          ].map(t => (
                            <button key={t.label} onClick={() => { setEmailSubject(t.label === "Willkommen" ? "Willkommen bei TRUE Partner! 🌱" : t.label === "Info-Call" ? "Lass uns kurz sprechen — TRUE Partner" : "Danke für deine TRUE-Anfrage"); setEmailBody(t.body) }}
                              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 7, padding: "4px 10px", fontSize: "0.72rem", cursor: "pointer", color: "var(--text-dim)" }}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={sendPartnerEmail} disabled={emailSending}
                          style={{ flex: 1, background: "linear-gradient(135deg,#2ECC8A,#1aaa6e)", color: "#000", border: "none", borderRadius: 12, padding: "12px", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem", opacity: emailSending ? 0.7 : 1 }}>
                          {emailSending ? "Sende…" : "E-Mail senden →"}
                        </button>
                        <button onClick={() => setEmailTarget(null)}
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", color: "var(--text-dim)", cursor: "pointer" }}>
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === "users" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Registrierte Nutzer</h2>
              <span style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700 }}>{users.length} Profile</span>
            </div>
            {users.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👥</div>
                <p style={{ fontWeight: 600 }}>Noch keine Nutzer</p>
                <p style={{ fontSize: "0.8rem" }}>Profile erscheinen hier sobald sich Nutzer anmelden</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {users.map((u) => {
                  const displayName = u.vorname || u.email?.split("@")[0] || "Anonym"
                  const lastSeen = u.last_sign_in ? formatDate(u.last_sign_in) : "—"
                  const isBanned = u.banned
                  return (
                    <div key={u.id} style={{ background: "var(--surface)", border: `1px solid ${isBanned ? "rgba(255,68,85,0.3)" : "var(--border)"}`, borderRadius: "12px", padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: isBanned ? "rgba(255,68,85,0.15)" : "var(--accent)20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                          {isBanned ? "🚫" : (u.avatar || "🧑")}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                            {displayName}
                            {isBanned && <span style={{ background: "rgba(255,68,85,0.15)", color: "#ff4455", borderRadius: "4px", padding: "1px 6px", fontSize: "0.6rem", fontWeight: 800 }}>GESPERRT</span>}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email || u.id}</div>
                          <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: 2 }}>
                            Registriert: {formatDate(u.created_at)} · Login: {lastSeen}
                          </div>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button onClick={() => { setActionModal({ user: u, type: "warn" }); setActionMsg("") }}
                          style={{ flex: 1, background: "rgba(255,180,0,0.1)", border: "1px solid rgba(255,180,0,0.25)", color: "#ffb400", borderRadius: "8px", padding: "5px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                          ⚠️ Verwarnen
                        </button>
                        {isBanned ? (
                          <button onClick={() => setActionModal({ user: u, type: "unban" })}
                            style={{ flex: 1, background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.25)", color: "var(--accent)", borderRadius: "8px", padding: "5px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                            ✓ Entsperren
                          </button>
                        ) : (
                          <button onClick={() => setActionModal({ user: u, type: "ban" })}
                            style={{ flex: 1, background: "rgba(255,68,85,0.1)", border: "1px solid rgba(255,68,85,0.25)", color: "#ff4455", borderRadius: "8px", padding: "5px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                            🚫 Sperren
                          </button>
                        )}
                        <button onClick={() => setDeleteUserConfirm(u)}
                          style={{ background: "rgba(255,68,85,0.12)", border: "1px solid rgba(255,68,85,0.3)", color: "#ff4455", borderRadius: "8px", padding: "5px 10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── POSTS ── */}
        {activeTab === "posts" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>Alle Posts</h2>
              <span style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700 }}>{posts.length} Posts</span>
            </div>

            {/* Bulk actions bar */}
            {posts.length > 0 && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                <button onClick={toggleSelectAll} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "5px 12px", fontSize: "0.75rem", cursor: "pointer", color: "var(--text-dim)", fontWeight: 600 }}>
                  {selectedPosts.size === posts.length ? "✓ Alle abwählen" : "Alle wählen"}
                </button>
                {selectedPosts.size > 0 && (
                  <>
                    <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 700 }}>{selectedPosts.size} ausgewählt</span>
                    {deleteAllConfirm ? (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={deleteSelected} disabled={deleting} style={{ background: "#ff3c3c", color: "#fff", border: "none", borderRadius: "8px", padding: "5px 14px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                          {deleting ? "⏳ Läuft…" : `Ja, ${selectedPosts.size} löschen`}
                        </button>
                        <button onClick={() => setDeleteAllConfirm(false)} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "5px 10px", fontSize: "0.75rem", cursor: "pointer", color: "var(--text-dim)" }}>Abbrechen</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteAllConfirm(true)} style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.3)", color: "#ff4455", borderRadius: "8px", padding: "5px 14px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                        🗑 Auswahl löschen
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
                <p>Noch keine Posts in der Datenbank</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {posts.map(p => (
                  <div key={p.id} style={{ background: selectedPosts.has(p.id) ? "rgba(46,204,138,0.06)" : "var(--surface)", border: `1px solid ${selectedPosts.has(p.id) ? "rgba(46,204,138,0.35)" : "var(--border)"}`, borderRadius: "12px", padding: "10px 12px", transition: "border-color 0.15s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                      {/* Checkbox */}
                      <div onClick={() => toggleSelectPost(p.id)} style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selectedPosts.has(p.id) ? "var(--accent)" : "var(--border)"}`, background: selectedPosts.has(p.id) ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: "0.65rem", color: "#000", fontWeight: 900 }}>
                        {selectedPosts.has(p.id) ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: "0.6rem", background: p.type === "community" ? "#A78BFA22" : p.type === "user" ? "#cc66ff22" : "#2ECC8A22", color: p.type === "community" ? "#A78BFA" : p.type === "user" ? "#cc66ff" : "#2ECC8A", borderRadius: "5px", padding: "2px 6px", fontWeight: 700 }}>{p.type.toUpperCase()}</span>
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", flex: 1 }}>{p.author_name}</span>
                      <span style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>#{p.id}</span>
                      <span style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>{formatDate(p.created_at)}</span>
                      {deleteConfirm === p.id ? (
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button onClick={() => deletePost(p.id)} disabled={deleting} style={{ background: "#ff3c3c", color: "#fff", border: "none", borderRadius: "6px", padding: "3px 9px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>{deleting ? "…" : "Löschen"}</button>
                          <button onClick={() => setDeleteConfirm(null)} style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "6px", padding: "3px 7px", fontSize: "0.7rem", cursor: "pointer", color: "var(--text-dim)" }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(p.id)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.85rem" }} title="Löschen">🗑</button>
                      )}
                    </div>
                    <p style={{ margin: "0 0 4px", fontSize: "0.8rem", lineHeight: 1.5 }}>{p.text.slice(0, 160)}{p.text.length > 160 ? "…" : ""}</p>
                    <div style={{ display: "flex", gap: "10px", fontSize: "0.68rem", color: "var(--text-dim)" }}>
                      <span>🏷 {p.tag}</span><span>❤️ {p.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CONTENT GENERATOR ── */}
        {activeTab === "content" && (
          <div>
            <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.05rem", fontWeight: 800 }}>🎬 Content Generator</h2>
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.78rem", color: "var(--text-dim)" }}>Fertige Scripts & Captions für TikTok, Instagram und X/Twitter — einfach kopieren & posten.</p>

            {/* Controls */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Konzern</label>
                <select value={cgKonzern} onChange={e => setCgKonzern(+e.target.value)} style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "9px 10px", color: "var(--text)", fontSize: "0.88rem", outline: "none" }}>
                  {KONZERNE.map((k, i) => <option key={i} value={i}>{k.emoji} {k.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Plattform</label>
                <div style={{ display: "flex", gap: "4px" }}>
                  {(["tiktok","instagram","twitter"] as const).map(p => (
                    <button key={p} onClick={() => setCgPlatform(p)} style={{ flex: 1, background: cgPlatform === p ? "var(--accent)" : "var(--surface)", color: cgPlatform === p ? "#000" : "var(--text-dim)", border: `1px solid ${cgPlatform === p ? "var(--accent)" : "var(--border)"}`, borderRadius: "9px", padding: "8px 4px", fontSize: "0.65rem", cursor: "pointer", fontWeight: 700 }}>
                      {p === "tiktok" ? "TikTok" : p === "instagram" ? "Insta" : "X/Twitter"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated content */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {cgData.sections.map((section, i) => (
                <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
                  <div style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)" }}>{section.label}</span>
                    <button onClick={() => copyText(section.text, `s${i}`)} style={{ background: cgCopied === `s${i}` ? "rgba(46,204,138,0.15)" : "var(--background)", color: cgCopied === `s${i}` ? "var(--accent)" : "var(--text-dim)", border: "1px solid var(--border)", borderRadius: "8px", padding: "3px 10px", fontSize: "0.68rem", cursor: "pointer", fontWeight: 600 }}>
                      {cgCopied === `s${i}` ? "✓ Kopiert!" : "Kopieren"}
                    </button>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <pre style={{ margin: 0, fontFamily: "inherit", fontSize: "0.82rem", lineHeight: 1.65, color: "var(--text)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{section.text}</pre>
                  </div>
                </div>
              ))}

              {/* Hashtags */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", overflow: "hidden" }}>
                <div style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#44aaff" }}># Hashtags</span>
                  <button onClick={() => copyText(cgData.hashtags, "ht")} style={{ background: cgCopied === "ht" ? "rgba(46,204,138,0.15)" : "var(--background)", color: cgCopied === "ht" ? "var(--accent)" : "var(--text-dim)", border: "1px solid var(--border)", borderRadius: "8px", padding: "3px 10px", fontSize: "0.68rem", cursor: "pointer", fontWeight: 600 }}>
                    {cgCopied === "ht" ? "✓ Kopiert!" : "Kopieren"}
                  </button>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#44aaff", lineHeight: 1.9, wordBreak: "break-word" }}>{cgData.hashtags}</p>
                </div>
              </div>

              <button onClick={() => copyText(cgData.sections.map(s => `${s.label}\n${s.text}`).join("\n\n") + "\n\n" + cgData.hashtags, "all")}
                style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "12px", padding: "0.85rem", fontWeight: 800, cursor: "pointer", fontSize: "0.9rem" }}>
                {cgCopied === "all" ? "✓ Alles kopiert!" : "📋 Alles auf einmal kopieren"}
              </button>
            </div>
          </div>
        )}

        {/* ── SOCIAL MEDIA ── */}
        {activeTab === "social" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Plattform-Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {(["instagram","linkedin","reddit"] as const).map(p => {
                const s = socialStats[p]
                const icons: Record<string,string> = { instagram:"📸", linkedin:"💼", reddit:"🟠" }
                const colors: Record<string,string> = { instagram:"#e1306c", linkedin:"#0077b5", reddit:"#ff4500" }
                const configured: Record<string,boolean> = {
                  instagram: !!(process.env.INSTAGRAM_ACCESS_TOKEN),
                  linkedin:  !!(process.env.LINKEDIN_ACCESS_TOKEN),
                  reddit:    !!(process.env.REDDIT_CLIENT_ID),
                }
                return (
                  <div key={p} style={{ background: "var(--surface)", border: `1px solid ${colors[p]}33`, borderRadius: 14, padding: "12px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                      <span style={{ fontSize:"1.2rem" }}>{icons[p]}</span>
                      <span style={{ fontWeight:800, fontSize:"0.8rem", textTransform:"capitalize" }}>{p}</span>
                    </div>
                    {s ? (
                      <>
                        <div style={{ fontSize:"1.4rem", fontWeight:900, color:colors[p] }}>{s.posted}</div>
                        <div style={{ fontSize:"0.62rem", color:"var(--text-dim)" }}>Posts</div>
                        <div style={{ marginTop:6, display:"flex", gap:8, fontSize:"0.62rem", color:"var(--text-dim)" }}>
                          <span>❤️ {s.totalLikes}</span>
                          <span>💬 {s.totalComments}</span>
                          {s.totalReach > 0 && <span>👁 {s.totalReach}</span>}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize:"0.65rem", color:"var(--text-dim)", marginTop:4 }}>
                        {socialLoading ? "Lade…" : "Noch keine Posts"}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Post Composer */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:20 }}>
              <div style={{ fontWeight:900, fontSize:"0.95rem", marginBottom:16 }}>✍️ Neuer Post</div>

              {/* Plattform-Auswahl */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text-dim)", marginBottom:8, textTransform:"uppercase" }}>Plattformen</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {(["instagram","linkedin","reddit"] as const).map(p => {
                    const icons: Record<string,string> = { instagram:"📸", linkedin:"💼", reddit:"🟠" }
                    const sel = scPlatforms.includes(p)
                    return (
                      <button key={p} onClick={() => setScPlatforms(prev => sel ? prev.filter(x=>x!==p) : [...prev,p])}
                        style={{ padding:"6px 14px", borderRadius:99, border:`2px solid ${sel ? "var(--accent)" : "var(--border)"}`, background: sel ? "rgba(46,204,138,0.12)" : "transparent", cursor:"pointer", fontSize:"0.8rem", fontWeight:700, color: sel ? "var(--accent)" : "var(--text-dim)", display:"flex", alignItems:"center", gap:6 }}>
                        {icons[p]} {p.charAt(0).toUpperCase()+p.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Post-Typ */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text-dim)", marginBottom:8, textTransform:"uppercase" }}>Post-Typ</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {([["general","💬 Allgemein"],["feature","⭐ Feature"],["fact","📊 Fakt"],["tip","💡 Tipp"],["partner","🤝 Partner"]] as [string,string][]).map(([val,label]) => (
                    <button key={val} onClick={() => setScPostType(val)}
                      style={{ padding:"5px 12px", borderRadius:99, border:`1px solid ${scPostType===val ? "var(--accent)" : "var(--border)"}`, background: scPostType===val ? "rgba(46,204,138,0.1)" : "transparent", cursor:"pointer", fontSize:"0.72rem", fontWeight: scPostType===val ? 700 : 500, color: scPostType===val ? "var(--accent)" : "var(--text-dim)" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* KI-Caption Generator */}
              <div style={{ marginBottom:14, padding:12, background:"rgba(46,204,138,0.06)", borderRadius:10, border:"1px solid rgba(46,204,138,0.2)" }}>
                <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--accent)", marginBottom:8, textTransform:"uppercase" }}>🤖 KI Caption Generator</div>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={scTopic} onChange={e=>setScTopic(e.target.value)}
                    placeholder="Thema z.B. 'Nestlé Wasserraub' oder 'Barcode Scanner Feature'"
                    style={{ flex:1, background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", fontSize:"0.8rem", color:"var(--text)" }} />
                  <button onClick={generateAICaption} disabled={!scTopic || scGenerating}
                    style={{ padding:"8px 16px", background: scTopic && !scGenerating ? "var(--accent)" : "var(--border)", color:"#000", border:"none", borderRadius:8, fontWeight:700, cursor: scTopic && !scGenerating ? "pointer" : "default", fontSize:"0.78rem", whiteSpace:"nowrap" }}>
                    {scGenerating ? "⏳" : "✨ Generieren"}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text-dim)", marginBottom:6, textTransform:"uppercase" }}>Post-Text</div>
                <textarea value={scContent} onChange={e=>setScContent(e.target.value)} rows={5}
                  placeholder="Post-Text hier eingeben oder oben KI-Caption generieren…"
                  style={{ width:"100%", background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:10, padding:"10px 14px", fontSize:"0.82rem", color:"var(--text)", resize:"vertical", boxSizing:"border-box", lineHeight:1.6 }} />
                <div style={{ fontSize:"0.62rem", color:"var(--text-dim)", marginTop:4 }}>{scContent.length} Zeichen</div>
              </div>

              {/* Bild-URL */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text-dim)", marginBottom:6, textTransform:"uppercase" }}>Bild-URL {scPlatforms.includes("instagram") && <span style={{ color:"#e1306c" }}>* (Instagram Pflicht)</span>}</div>
                <input value={scImageUrl} onChange={e=>setScImageUrl(e.target.value)}
                  placeholder="https://images.pexels.com/... oder eigene Bild-URL"
                  style={{ width:"100%", background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", fontSize:"0.8rem", color:"var(--text)", boxSizing:"border-box" }} />
                {scImageUrl && (
                  <img src={scImageUrl} alt="Preview" style={{ marginTop:8, width:"100%", maxHeight:180, objectFit:"cover", borderRadius:8, border:"1px solid var(--border)" }} />
                )}
              </div>

              {/* Zeitplanung */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text-dim)", marginBottom:6, textTransform:"uppercase" }}>Zeitplanung (optional — leer = sofort)</div>
                <input type="datetime-local" value={scSchedule} onChange={e=>setScSchedule(e.target.value)}
                  style={{ background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8, padding:"8px 12px", fontSize:"0.8rem", color:"var(--text)" }} />
              </div>

              {/* Post Button */}
              <button onClick={submitSocialPost} disabled={socialPosting || scPlatforms.length === 0 || (!scContent && !scTopic)}
                style={{ width:"100%", padding:"13px", background: !socialPosting && scPlatforms.length > 0 && (scContent || scTopic) ? "var(--accent)" : "var(--border)", color:"#000", border:"none", borderRadius:12, fontWeight:900, fontSize:"0.92rem", cursor: !socialPosting ? "pointer" : "default" }}>
                {socialPosting ? "⏳ Wird gepostet…" : scSchedule ? `📅 Einplanen (${scPlatforms.length} Plattform${scPlatforms.length>1?"en":""})` : `🚀 Jetzt posten (${scPlatforms.length} Plattform${scPlatforms.length>1?"en":""})`}
              </button>

              {/* Ergebnis */}
              {scResult && (
                <div style={{ marginTop:14, padding:14, borderRadius:10, border:`1px solid ${scResult.success ? "rgba(46,204,138,0.4)" : "rgba(255,68,85,0.4)"}`, background: scResult.success ? "rgba(46,204,138,0.07)" : "rgba(255,68,85,0.07)" }}>
                  {Object.entries(scResult.results ?? {}).map(([platform, r]) => (
                    <div key={platform} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, fontSize:"0.8rem" }}>
                      <span>{r.success ? "✅" : "❌"}</span>
                      <span style={{ fontWeight:700, textTransform:"capitalize" }}>{platform}</span>
                      {r.success && r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color:"var(--accent)", fontSize:"0.72rem" }}>→ Post ansehen</a>}
                      {!r.success && r.error && <span style={{ color:"#ff4455", fontSize:"0.7rem" }}>{r.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Post-History */}
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:20 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ fontWeight:900, fontSize:"0.95rem" }}>📋 Post-History</div>
                <button onClick={loadSocialData} style={{ background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8, padding:"5px 12px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", color:"var(--text-dim)" }}>
                  {socialLoading ? "⏳" : "↻ Refresh"}
                </button>
              </div>

              {socialPosts.length === 0 ? (
                <div style={{ textAlign:"center", padding:"24px 0", color:"var(--text-dim)", fontSize:"0.8rem" }}>
                  {socialLoading ? "Lade Posts…" : "Noch keine Posts — erstelle deinen ersten Post oben!"}
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {socialPosts.map(post => {
                    const icons: Record<string,string> = { instagram:"📸", linkedin:"💼", reddit:"🟠" }
                    const statusColor: Record<string,string> = { posted:"#2ECC8A", failed:"#ff4455", scheduled:"#ffaa00", draft:"#888" }
                    const statusLabel: Record<string,string> = { posted:"Gepostet", failed:"Fehler", scheduled:"Geplant", draft:"Entwurf" }
                    return (
                      <div key={post.id} style={{ padding:"11px 14px", background:"var(--background)", borderRadius:10, border:"1px solid var(--border)" }}>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                          <span style={{ fontSize:"1.1rem", flexShrink:0 }}>{icons[post.platform] ?? "📱"}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4, flexWrap:"wrap" }}>
                              <span style={{ fontWeight:700, fontSize:"0.78rem", textTransform:"capitalize" }}>{post.platform}</span>
                              <span style={{ background: statusColor[post.status]+"22", color: statusColor[post.status], borderRadius:99, padding:"1px 8px", fontSize:"0.6rem", fontWeight:700 }}>{statusLabel[post.status] ?? post.status}</span>
                              <span style={{ fontSize:"0.62rem", color:"var(--text-dim)" }}>{post.posted_at ? new Date(post.posted_at).toLocaleDateString("de-DE") : post.scheduled_at ? `📅 ${new Date(post.scheduled_at).toLocaleDateString("de-DE")}` : ""}</span>
                            </div>
                            <div style={{ fontSize:"0.75rem", color:"var(--text-dim)", lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{post.content}</div>
                            {post.error_msg && <div style={{ fontSize:"0.68rem", color:"#ff4455", marginTop:3 }}>⚠️ {post.error_msg}</div>}
                            <div style={{ display:"flex", gap:12, marginTop:4, fontSize:"0.65rem", color:"var(--text-dim)" }}>
                              {post.analytics?.likes > 0 && <span>❤️ {post.analytics.likes}</span>}
                              {post.analytics?.comments > 0 && <span>💬 {post.analytics.comments}</span>}
                              {post.analytics?.reach > 0 && <span>👁 {post.analytics.reach}</span>}
                              {post.platform_url && <a href={post.platform_url} target="_blank" rel="noopener noreferrer" style={{ color:"var(--accent)", fontWeight:600 }}>→ Ansehen</a>}
                            </div>
                          </div>
                          {post.image_url && <img src={post.image_url} alt="" style={{ width:48, height:48, borderRadius:6, objectFit:"cover", flexShrink:0 }} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Setup-Anleitung */}
            <div style={{ background:"rgba(255,170,0,0.06)", border:"1px solid rgba(255,170,0,0.25)", borderRadius:14, padding:16 }}>
              <div style={{ fontWeight:800, fontSize:"0.88rem", marginBottom:10 }}>🔑 API Keys einrichten</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:"0.78rem", color:"var(--text-dim)", lineHeight:1.6 }}>
                <div><strong style={{ color:"var(--text)" }}>📸 Instagram:</strong> Meta Developer → App erstellen → Instagram Basic Display → <code style={{ background:"var(--surface-2)", padding:"1px 5px", borderRadius:4 }}>INSTAGRAM_ACCESS_TOKEN</code> + <code style={{ background:"var(--surface-2)", padding:"1px 5px", borderRadius:4 }}>INSTAGRAM_BUSINESS_ID</code></div>
                <div><strong style={{ color:"var(--text)" }}>💼 LinkedIn:</strong> linkedin.com/developers → App → Products: Share on LinkedIn → <code style={{ background:"var(--surface-2)", padding:"1px 5px", borderRadius:4 }}>LINKEDIN_ACCESS_TOKEN</code> + <code style={{ background:"var(--surface-2)", padding:"1px 5px", borderRadius:4 }}>LINKEDIN_PERSON_ID</code></div>
                <div><strong style={{ color:"var(--text)" }}>🟠 Reddit:</strong> reddit.com/prefs/apps → Script App → <code style={{ background:"var(--surface-2)", padding:"1px 5px", borderRadius:4 }}>REDDIT_CLIENT_ID</code> + <code style={{ background:"var(--surface-2)", padding:"1px 5px", borderRadius:4 }}>REDDIT_CLIENT_SECRET</code> + Username + Password</div>
                <div style={{ marginTop:4, padding:"8px 10px", background:"var(--surface)", borderRadius:8, fontSize:"0.72rem" }}>
                  ➤ Keys in <strong>.env.local</strong> eintragen → deploy.sh ausführen → fertig
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── BOT MANAGER ── */}
        {activeTab === "bots" && (
          <div>
            <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.05rem", fontWeight: 800 }}>🤖 Social Media Bot</h2>
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.78rem", color: "var(--text-dim)" }}>Täglich automatisch posten — menschlich formuliert, auf Basis des Konzern im Fokus.</p>

            {/* Bot status bar */}
            <div style={{ background: botEnabled ? "rgba(46,204,138,0.08)" : "rgba(255,100,0,0.06)", border: `1px solid ${botEnabled ? "rgba(46,204,138,0.3)" : "rgba(255,100,0,0.25)"}`, borderRadius: "14px", padding: "14px 16px", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: botEnabled ? "#2ECC8A" : "#ff7700", boxShadow: botEnabled ? "0 0 8px #2ECC8A" : "none", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{botEnabled ? "Bot ist aktiv" : "Bot ist pausiert"}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Postet täglich · {botSchedule} Uhr · X/Twitter</div>
              </div>
              <button onClick={() => toggleBot(!botEnabled)} style={{ background: botEnabled ? "rgba(255,60,60,0.1)" : "rgba(46,204,138,0.15)", color: botEnabled ? "#ff4455" : "#2ECC8A", border: `1px solid ${botEnabled ? "rgba(255,60,60,0.3)" : "rgba(46,204,138,0.3)"}`, borderRadius: "10px", padding: "6px 16px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                {botEnabled ? "⏸ Pausieren" : "▶ Aktivieren"}
              </button>
            </div>

            {/* Today's preview */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px", marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "10px" }}>👁 Heute wird gepostet:</div>
              <div style={{ background: "var(--background)", borderRadius: "10px", padding: "12px", fontSize: "0.8rem", lineHeight: 1.7, color: "var(--text)", marginBottom: "10px", whiteSpace: "pre-wrap" }}>
                {generateContent(KONZERNE[Math.floor(Date.now() / 86_400_000) % KONZERNE.length], "twitter").sections[1]?.text}
                {"\n\n"}
                {generateContent(KONZERNE[Math.floor(Date.now() / 86_400_000) % KONZERNE.length], "twitter").hashtags}
              </div>
              <button onClick={() => postBotNow("twitter")} disabled={botPosting} style={{ background: botPosting ? "var(--surface-2)" : "var(--accent)", color: botPosting ? "var(--text-dim)" : "#000", border: "none", borderRadius: "10px", padding: "8px 18px", fontWeight: 700, cursor: botPosting ? "not-allowed" : "pointer", fontSize: "0.85rem" }}>
                {botPosting ? "⏳ Wird gepostet…" : "🚀 Jetzt manuell posten"}
              </button>
            </div>

            {/* Twitter API Keys */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px", marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>🔑 X/Twitter API Keys</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "12px", lineHeight: 1.5 }}>Benötigst du einen <strong>Developer Account</strong> bei developer.twitter.com → App erstellen → Keys kopieren</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { label: "API Key (Consumer Key)", val: twitterKey, set: setTwitterKey, ph: "xxxxxxxxxxxxxxxxxxx" },
                  { label: "API Secret", val: twitterSecret, set: setTwitterSecret, ph: "xxxxxxxxxxxxxxxxxxxxxxxxxxx" },
                  { label: "Access Token", val: twitterToken, set: setTwitterToken, ph: "000000000-xxxxxxx" },
                  { label: "Access Token Secret", val: twitterTokenSec, set: setTwitterTokenSec, ph: "xxxxxxxxxxxxxx" },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: "block", fontSize: "0.62rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "3px" }}>{f.label}</label>
                    <input type="password" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                      style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "9px", padding: "8px 10px", color: "var(--text)", fontSize: "0.82rem", outline: "none", fontFamily: "monospace", boxSizing: "border-box" as const }} />
                  </div>
                ))}
                <button onClick={saveTwitterKeys} style={{ background: twitterSaved ? "rgba(46,204,138,0.15)" : "var(--accent)", color: twitterSaved ? "var(--accent)" : "#000", border: twitterSaved ? "1px solid rgba(46,204,138,0.3)" : "none", borderRadius: "10px", padding: "9px", fontWeight: 700, cursor: "pointer", fontSize: "0.88rem", marginTop: "4px" }}>
                  {twitterSaved ? "✓ Gespeichert!" : "Keys speichern"}
                </button>
              </div>
            </div>

            {/* Schedule */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px", marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "10px" }}>⏰ Posting-Zeiten</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["08:00 + 20:00", "07:00 + 19:00", "09:00 + 21:00", "12:00 täglich"].map(s => (
                  <button key={s} onClick={() => setBotSchedule(s)} style={{ background: botSchedule === s ? "var(--accent)" : "var(--surface-2)", color: botSchedule === s ? "#000" : "var(--text-dim)", border: `1px solid ${botSchedule === s ? "var(--accent)" : "var(--border)"}`, borderRadius: "20px", padding: "5px 14px", fontSize: "0.78rem", cursor: "pointer", fontWeight: botSchedule === s ? 700 : 400 }}>
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: "12px", background: "var(--background)", borderRadius: "10px", padding: "10px 12px", fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "monospace" }}>
                <div style={{ color: "var(--accent)", marginBottom: "4px" }}># Server Crontab für Bot</div>
                <div>0 8 * * * curl -X POST "https://get-true.de/api/social" \</div>
                <div style={{ paddingLeft: "12px" }}>-H "Content-Type: application/json" \</div>
                <div style={{ paddingLeft: "12px" }}>{`-d '{"type":"daily","secret":"true-cron-2024"}'`}</div>
              </div>
            </div>

            {/* Bot log */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px" }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "10px" }}>📋 Post-Log</div>
              {botLog.length === 0 ? (
                <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", margin: 0 }}>Noch keine Bot-Posts</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {botLog.map((entry, i) => (
                    <div key={i} style={{ background: "var(--background)", borderRadius: "8px", padding: "8px 10px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "3px" }}>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-dim)", fontFamily: "monospace" }}>{entry.time}</span>
                        <span style={{ fontSize: "0.65rem", background: "#44aaff22", color: "#44aaff", borderRadius: "4px", padding: "1px 6px", fontWeight: 700 }}>{entry.platform}</span>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: entry.status.startsWith("✓") ? "#2ECC8A" : "#ff4455" }}>{entry.status}</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", lineHeight: 1.4 }}>{entry.preview}…</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TRUE Kanal — manueller Post-Trigger */}
            <div style={{ background: "var(--surface)", border: "1px solid rgba(46,204,138,0.3)", borderRadius: "14px", padding: "14px", marginTop: "1.25rem" }}>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: "4px", color: "var(--accent)" }}>📡 TRUE Kanal posten</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: "14px", lineHeight: 1.5 }}>
                Postet sofort einen neuen täglichen Beitrag in den offiziellen TRUE Kanal (app-intern, sichtbar für alle Nutzer).
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {([
                  { type: "bot",   label: "📰 TRUE Bot",    color: "#44aaff" },
                  { type: "eva",   label: "✍️ Eva Müller",  color: "#ffcc00" },
                  { type: "coach", label: "🥗 Coach",       color: "#2ECC8A" },
                ] as { type: string; label: string; color: string }[]).map(({ type, label, color }) => (
                  <button
                    key={type}
                    onClick={async () => {
                      const res = await fetch(`/api/cron?secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}&type=${type}`)
                      const json = await res.json()
                      alert(json.ok ? `✅ ${label} gepostet (ID ${json.id})` : `❌ Fehler: ${json.error}`)
                    }}
                    style={{ background: color + "15", color, border: `1px solid ${color}44`, borderRadius: "10px", padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PUSH ── */}
        {activeTab === "push" && (
          <div>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 800 }}>Push-Benachrichtigungen</h2>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "0.9rem", fontWeight: 700 }}>🔔 Broadcast senden</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: "1rem", lineHeight: 1.6 }}>Sendet eine Benachrichtigung an alle Nutzer die Push aktiviert haben.</p>
              <div style={{ marginBottom: "0.65rem" }}>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>Titel *</label>
                <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} placeholder="z.B. ⚠️ Neuer Nestlé-Skandal" style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.65rem", color: "var(--text)", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>Nachricht</label>
                <textarea value={pushBody} onChange={e => setPushBody(e.target.value)} placeholder="Kurze Beschreibung…" rows={3} style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.65rem", color: "var(--text)", fontSize: "0.88rem", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />
              </div>
              <button onClick={sendPush} disabled={!pushTitle.trim()} style={{ width: "100%", background: pushTitle.trim() ? "var(--accent)" : "var(--surface-2)", color: pushTitle.trim() ? "#000" : "var(--text-dim)", border: "none", borderRadius: "10px", padding: "0.8rem", fontWeight: 700, cursor: pushTitle.trim() ? "pointer" : "not-allowed", fontSize: "0.9rem" }}>
                {pushSent ? "✓ Gesendet!" : "🔔 Senden"}
              </button>
            </div>
          </div>
        )}

        {/* ── SUPPORT ── */}
        {activeTab === "support" && (
          <div>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 800 }}>Support-Nachrichten</h2>
            {support.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
                <p style={{ fontWeight: 600 }}>Keine Support-Anfragen</p>
              </div>
            ) : (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px" }}>
                <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "0.88rem" }}>Nutzer-Nachrichten ({support.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {support.map(msg => (
                    <div key={msg.id} style={{ display: "flex", justifyContent: msg.from === "user" ? "flex-start" : "flex-end" }}>
                      <div style={{ maxWidth: "80%", background: msg.from === "user" ? "var(--surface-2)" : "var(--accent)", color: msg.from === "user" ? "var(--text)" : "#000", borderRadius: "12px", padding: "8px 12px", fontSize: "0.82rem", lineHeight: 1.5 }}>
                        <div style={{ fontSize: "0.6rem", fontWeight: 700, marginBottom: "2px", opacity: 0.7 }}>{msg.from === "user" ? "📨 Nutzer" : "🤖 Bot"} · {new Date(msg.time).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SYSTEM ── */}
        {activeTab === "system" && (
          <div>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 800 }}>System & Cron</h2>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px", marginBottom: "1rem" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "0.88rem", fontWeight: 700 }}>⏰ Cron-Jobs</h3>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                {([["bot","🤖 Bot"], ["eva","✍️ Eva"], ["coach","🥗 Coach"]] as ["bot"|"eva"|"coach", string][]).map(([t, label]) => (
                  <button key={t} onClick={() => triggerCron(t)} disabled={cronBusy === t}
                    style={{ background: cronBusy === t ? "var(--accent-dim)" : "var(--background)", border: `1px solid ${cronBusy === t ? "var(--accent)" : "var(--border)"}`, borderRadius: "10px", padding: "7px 14px", fontSize: "0.8rem", cursor: cronBusy === t ? "not-allowed" : "pointer", color: cronBusy === t ? "var(--accent)" : "var(--text)", fontWeight: 600 }}>
                    {cronBusy === t ? "⏳ Läuft…" : label}
                  </button>
                ))}
              </div>
              <div style={{ background: "var(--background)", borderRadius: "10px", padding: "10px 12px" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: "6px", textTransform: "uppercase" }}>Log</div>
                {cronLog.length === 0 ? <p style={{ color: "var(--text-dim)", fontSize: "0.75rem", margin: 0 }}>Leer</p> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {cronLog.map((entry, i) => (
                      <div key={i} style={{ display: "flex", gap: "10px", fontSize: "0.72rem", fontFamily: "monospace" }}>
                        <span style={{ color: "var(--text-dim)" }}>{entry.time}</span>
                        <span style={{ color: "var(--accent)", flex: 1 }}>{entry.type}</span>
                        <span style={{ color: entry.status.startsWith("✓") ? "#2ECC8A" : "#ff3c3c" }}>{entry.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px", marginBottom: "1rem" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "0.88rem", fontWeight: 700 }}>🖥 Server Crontab</h3>
              <div style={{ background: "var(--background)", borderRadius: "10px", padding: "12px", fontFamily: "monospace", fontSize: "0.7rem", color: "#2ECC8A", lineHeight: 2, overflowX: "auto" }}>
                <div style={{ color: "var(--text-dim)", marginBottom: "2px" }}># TRUE Bot Posts</div>
                <div>0 8 * * * curl "https://get-true.de/api/cron?type=bot&secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}"</div>
                <div>0 20 * * * curl "https://get-true.de/api/cron?type=bot&secret=${process.env.NEXT_PUBLIC_ADMIN_SECRET}"</div>
                <div style={{ color: "var(--text-dim)", marginTop: "6px", marginBottom: "2px" }}># Social Media Bot</div>
                <div>{`0 8 * * * curl -X POST https://get-true.de/api/social -H "Content-Type: application/json" -d '{"type":"daily","secret":"true-cron-2024"}'`}</div>
              </div>
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px", padding: "14px" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "0.88rem", fontWeight: 700 }}>🔑 Env-Variablen</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  { key: "NEXT_PUBLIC_SUPABASE_URL", ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
                  { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
                  { key: "TWITTER_API_KEY", ok: false },
                  { key: "TWITTER_API_SECRET", ok: false },
                ].map(({ key, ok }) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: "var(--background)", borderRadius: "8px" }}>
                    <code style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{key}</code>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: ok ? "#2ECC8A" : "#ff3c3c" }}>{ok ? "✓ Gesetzt" : "✗ Fehlt"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── Action Modal (Warn / Ban / Unban) ── */}
      {actionModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => { if (!actionLoading) setActionModal(null) }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", padding: "24px", width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: "1.8rem", textAlign: "center", marginBottom: 12 }}>
              {actionModal.type === "ban" ? "🚫" : actionModal.type === "unban" ? "✅" : "⚠️"}
            </div>
            <h3 style={{ margin: "0 0 6px", textAlign: "center", fontWeight: 900 }}>
              {actionModal.type === "ban" ? "Nutzer sperren" : actionModal.type === "unban" ? "Sperre aufheben" : "Verwarnung senden"}
            </h3>
            <p style={{ textAlign: "center", fontSize: "0.83rem", color: "var(--text-dim)", margin: "0 0 16px" }}>
              {actionModal.user.vorname || actionModal.user.email?.split("@")[0] || "Nutzer"}
              {actionModal.user.email && <><br /><span style={{ fontSize: "0.75rem", opacity: 0.6 }}>{actionModal.user.email}</span></>}
            </p>

            {actionModal.type !== "unban" && (
              <textarea
                value={actionMsg}
                onChange={e => setActionMsg(e.target.value)}
                placeholder={actionModal.type === "warn" ? "Grund der Verwarnung (optional)..." : "Grund der Sperrung (optional)..."}
                rows={3}
                style={{ width: "100%", boxSizing: "border-box", background: "var(--background)", border: "1px solid var(--border)", borderRadius: "12px", padding: "10px 14px", color: "var(--text)", fontSize: "0.85rem", resize: "none", outline: "none", marginBottom: 12 }}
              />
            )}

            {actionDone ? (
              <div style={{ textAlign: "center", fontWeight: 700, color: actionDone.startsWith("Fehler") ? "#ff4455" : "var(--accent)", padding: "12px" }}>{actionDone}</div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setActionModal(null)} disabled={actionLoading}
                  style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px", fontWeight: 700, cursor: "pointer", color: "var(--text-dim)" }}>
                  Abbrechen
                </button>
                <button onClick={executeAction} disabled={actionLoading}
                  style={{ flex: 2, background: actionModal.type === "ban" ? "#ff4455" : actionModal.type === "unban" ? "var(--accent)" : "#ffb400", border: "none", borderRadius: "12px", padding: "12px", fontWeight: 800, cursor: "pointer", color: "#000", opacity: actionLoading ? 0.6 : 1 }}>
                  {actionLoading ? "..." : actionModal.type === "ban" ? "Jetzt sperren" : actionModal.type === "unban" ? "Entsperren" : "Verwarnung senden"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── User-Löschen Bestätigungs-Modal ───────────────────────────────────── */}
      {deleteUserConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "var(--surface)", borderRadius: "20px", padding: "1.5rem", maxWidth: "340px", width: "100%", border: "1px solid rgba(255,68,85,0.4)" }}>
            <div style={{ fontSize: "2rem", textAlign: "center", marginBottom: "0.5rem" }}>🗑️</div>
            <h3 style={{ textAlign: "center", fontWeight: 800, fontSize: "1.05rem", margin: "0 0 0.4rem" }}>Account endgültig löschen?</h3>
            <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-dim)", margin: "0 0 1rem" }}>
              <strong style={{ color: "var(--text)" }}>{deleteUserConfirm.vorname || deleteUserConfirm.email?.split("@")[0] || "Nutzer"}</strong>
              {deleteUserConfirm.email && <><br />{deleteUserConfirm.email}</>}
              <br /><br />
              Dieser Account wird aus Supabase Auth und dem Profil dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDeleteUserConfirm(null)}
                style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "11px", fontWeight: 700, cursor: "pointer", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                Abbrechen
              </button>
              <button onClick={() => handleDeleteUser(deleteUserConfirm)} disabled={deletingUser}
                style={{ flex: 2, background: "#ff4455", border: "none", borderRadius: "12px", padding: "11px", fontWeight: 800, cursor: "pointer", color: "#fff", fontSize: "0.85rem", opacity: deletingUser ? 0.6 : 1 }}>
                {deletingUser ? "⏳ Läuft…" : "Ja, löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
