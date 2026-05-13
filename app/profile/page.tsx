"use client"
import AuthGuard from "@/components/AuthGuard"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ThemeToggle } from "@/components/ThemeProvider"
import BottomNav from "@/components/BottomNav"
import NotificationBell from "@/components/NotificationBell"
import AuthModal from "@/components/AuthModal"
import { useSupabaseAuth } from "@/lib/useSupabaseAuth"
import { useProfile } from "@/lib/useProfile"
import { supabase } from "@/lib/supabase"
import { loadRings } from "@/components/Rings"

const EMOJI_OPTIONS = ["🧑","👩","👨","🧑‍🦱","👩‍🦱","🧑‍🦲","👴","👵","🧒","👦","👧","🤷","🙋","🦸","🧑‍💻","🌱"]
const FAMILY_EMOJIS = ["👶","🧒","👦","👧","🧑","👩","👨","👴","👵","🐶","🐱"]
const FAMILY_KEY = "true-family-members"

interface FamilyMember { id: string; name: string; age: string; emoji: string }

// ─── Suggested users (example data until Supabase users exist) ────────────────

const SUGGESTED_USERS = [
  { id: "u1", name: "Marie K.",   avatar: "👩", handle: "@marie.k",    bio: "Palmöl-frei seit 2023 🌴", posts: 12, followers: 34 },
  { id: "u2", name: "Jonas R.",   avatar: "👨", handle: "@jonas.r",    bio: "Nestlé Boykott Club 💪",    posts: 8,  followers: 51 },
  { id: "u3", name: "Sara L.",    avatar: "🧑", handle: "@sara.l",     bio: "Nachhaltig in Hamburg 🌱", posts: 21, followers: 88 },
  { id: "u4", name: "Felix M.",   avatar: "👦", handle: "@felix.m",    bio: "Glyphosat-Tracker 🔬",     posts: 5,  followers: 19 },
  { id: "u5", name: "Eva Müller", avatar: "✍️", handle: "@eva.mueller", bio: "TRUE Journalistin",        posts: 47, followers: 1203 },
]

const PREFERENCE_OPTIONS = [
  { id: "ernaehrung",  label: "Ernährung",   emoji: "🥗" },
  { id: "umwelt",      label: "Umwelt",      emoji: "🌱" },
  { id: "gesundheit",  label: "Gesundheit",  emoji: "💊" },
  { id: "familie",     label: "Familie",     emoji: "👨‍👩‍👧" },
  { id: "budget",      label: "Budget",      emoji: "💸" },
  { id: "wasser",      label: "Wasser",      emoji: "💧" },
  { id: "waelder",     label: "Wälder",      emoji: "🌳" },
  { id: "chemikalien", label: "Chemikalien", emoji: "☠️" },
]

interface SupportMessage { id: string; text: string; time: number; from: "user" | "support" }

// ─── Passwort-Sektion ─────────────────────────────────────────────────────────
function PasswordSection() {
  const { updatePassword } = useSupabaseAuth()
  const [open, setOpen]     = useState(false)
  const [pw, setPw]         = useState("")
  const [pw2, setPw2]       = useState("")
  const [show, setShow]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState<{ text: string; ok: boolean } | null>(null)

  async function handleSave() {
    setMsg(null)
    if (pw.length < 6) { setMsg({ text: "Mindestens 6 Zeichen.", ok: false }); return }
    if (pw !== pw2)    { setMsg({ text: "Passwörter stimmen nicht überein.", ok: false }); return }
    setSaving(true)
    const { error } = await updatePassword(pw) as any
    setSaving(false)
    if (error) { setMsg({ text: "Fehler: " + error.message, ok: false }); return }
    setMsg({ text: "Passwort gesetzt ✓", ok: true })
    setPw(""); setPw2(""); setTimeout(() => { setOpen(false); setMsg(null) }, 1500)
  }

  return (
    <div style={{ marginTop: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: "1.1rem" }}>🔑</span>
        <span style={{ flex: 1, fontWeight: 700, fontSize: "0.88rem", color: "var(--text)" }}>Passwort setzen (optional)</span>
        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", margin: "10px 0 10px", lineHeight: 1.5 }}>
            Du hast dich per E-Mail-Code registriert. Ein Passwort ist optional — damit kannst du dich auch ohne Code einloggen.
          </p>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input type={show ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)}
              placeholder="Neues Passwort (min. 6 Zeichen)"
              style={{ width: "100%", boxSizing: "border-box", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 40px 11px 12px", fontSize: "0.88rem", color: "var(--text)", outline: "none" }} />
            <button onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-dim)" }}>{show ? "🙈" : "👁"}</button>
          </div>
          <input type={show ? "text" : "password"} value={pw2} onChange={e => setPw2(e.target.value)}
            placeholder="Passwort wiederholen"
            style={{ width: "100%", boxSizing: "border-box", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 12px", fontSize: "0.88rem", color: "var(--text)", outline: "none", marginBottom: 10 }} />
          {msg && <div style={{ fontSize: "0.78rem", color: msg.ok ? "var(--accent)" : "#ff4455", marginBottom: 8 }}>{msg.text}</div>}
          <button onClick={handleSave} disabled={saving}
            style={{ width: "100%", background: saving ? "var(--surface-2)" : "var(--accent)", border: "none", borderRadius: 10, padding: "11px", fontWeight: 800, fontSize: "0.88rem", color: saving ? "var(--text-dim)" : "#000", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Wird gespeichert…" : "Passwort speichern"}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useSupabaseAuth()
  const { profile, setProfile, saveProfile: saveProfileToDb, saving } = useProfile(user)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]         = useState(false)
  const [photoUrl, setPhotoUrl]           = useState<string | null>(null)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [savedToast, setSavedToast]       = useState(false)
  const [activeTab, setActiveTab]         = useState<"posts" | "saved" | "settings">("posts")
  const [savedPosts, setSavedPosts]       = useState<number[]>([])
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([])
  const [supportInput, setSupportInput]   = useState("")
  const [pushStatus, setPushStatus]       = useState<"idle" | "requesting" | "granted" | "denied">("idle")
  const [rings, setRings]                 = useState({ totalScans: 0, totalAvoided: 0, streak: 0 })
  const [following, setFollowing]         = useState<Set<string>>(new Set())
  const [showSearch, setShowSearch]       = useState(false)
  const [searchQuery, setSearchQuery]     = useState("")
  const [showSupport, setShowSupport]     = useState(false)
  const [editMode, setEditMode]           = useState(false)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMember, setNewMember]         = useState<Omit<FamilyMember,"id">>({ name: "", age: "", emoji: "🧒" })
  const [userGoals, setUserGoals]         = useState<string[]>([])
  const [nutritionGoals, setNutritionGoals] = useState<string[]>([])
  const [allergies, setAllergies]         = useState<string[]>([])
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [customStore, setCustomStore]     = useState("")
  const [isPremium, setIsPremium]         = useState(false)
  const [meidliste, setMeidliste]         = useState<string[]>([])
  const [meidInput, setMeidInput]         = useState("")
  const [meidExpanded, setMeidExpanded]   = useState(false)
  const [meidError, setMeidError]         = useState("")
  const [openSetting, setOpenSetting]     = useState<string | null>(null)

  const KONZERNE_OPTIONS = [
    { name: "Nestlé",           badge: "KRITISCH", color: "#ff3b30" },
    { name: "Coca-Cola",        badge: "KRITISCH", color: "#ff3b30" },
    { name: "Unilever",         badge: "HOCH",     color: "#ff9500" },
    { name: "PepsiCo",          badge: "HOCH",     color: "#ff9500" },
    { name: "Bayer / Monsanto", badge: "HOCH",     color: "#af52de" },
    { name: "Procter & Gamble", badge: "MITTEL",   color: "#ffcc00" },
    { name: "Kraft Heinz",      badge: "MITTEL",   color: "#ffcc00" },
    { name: "Mondelez",         badge: "MITTEL",   color: "#ffcc00" },
    { name: "Mars",             badge: "MITTEL",   color: "#ffcc00" },
    { name: "Ferrero",          badge: "MITTEL",   color: "#ffcc00" },
    { name: "Danone",           badge: "MITTEL",   color: "#ffcc00" },
    { name: "Henkel",           badge: "MITTEL",   color: "#ffcc00" },
    { name: "Amazon",           badge: "HOCH",     color: "#ff9500" },
    { name: "Shell",            badge: "KRITISCH", color: "#ff3b30" },
  ]

  function syncMeidToDb(next: string[]) {
    if (!user || !supabase) return
    supabase.from("profiles").update({ meidliste: next }).eq("id", user.id).then(() => {})
  }

  function toggleMeid(name: string) {
    setMeidliste(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
      try { localStorage.setItem("true-meidliste", JSON.stringify(next)) } catch (e) { console.error("[Profile] toggleMeid save failed:", e) }
      syncMeidToDb(next)
      return next
    })
  }

  function addCustomMeid() {
    const v = meidInput.trim()
    if (!v) { setMeidError("Bitte einen Namen eingeben."); return }
    if (v.length > 50) { setMeidError("Maximal 50 Zeichen erlaubt."); return }
    if (meidliste.includes(v)) { setMeidError(`"${v}" ist bereits auf der Meidliste.`); return }
    setMeidError("")
    const next = [...meidliste, v]
    setMeidliste(next)
    try { localStorage.setItem("true-meidliste", JSON.stringify(next)) } catch (e) { console.error("[Profile] addCustomMeid save failed:", e) }
    syncMeidToDb(next)
    setMeidInput("")
  }

  const STORE_OPTIONS = ["Rewe", "Edeka", "Lidl", "Aldi", "dm", "Alnatura", "Bio Company", "Kaufland", "Netto", "Penny", "Rossmann"]

  useEffect(() => {
    try {
      const raw = localStorage.getItem("true-profile")
      if (raw) {
        const p = JSON.parse(raw)
        if (Array.isArray(p.goals)) setUserGoals(p.goals)
        if (Array.isArray(p.nutritionGoals)) setNutritionGoals(p.nutritionGoals)
        if (Array.isArray(p.allergies)) setAllergies(p.allergies)
        if (Array.isArray(p.supermarkets)) setSelectedStores(p.supermarkets)
        if (p.customStore) setCustomStore(p.customStore)
      }
    } catch (e) { console.error("[Profile] true-profile load failed:", e) }
    try {
      setIsPremium(localStorage.getItem("true-premium") === "1")
    } catch (e) { console.error("[Profile] true-premium load failed:", e) }
    try {
      const ml = localStorage.getItem("true-meidliste")
      if (ml) setMeidliste(JSON.parse(ml))
    } catch (e) { console.error("[Profile] true-meidliste load failed:", e) }
  }, [])

  // Meidliste von Supabase laden und mit localStorage mergen (Geräte-Sync)
  useEffect(() => {
    if (!user || !supabase) return
    supabase.from("profiles").select("meidliste").eq("id", user.id).single()
      .then(({ data }) => {
        if (!data?.meidliste || data.meidliste.length === 0) return
        setMeidliste(prev => {
          const merged = Array.from(new Set([...data.meidliste, ...prev]))
          try { localStorage.setItem("true-meidliste", JSON.stringify(merged)) } catch {}
          return merged
        })
      })
  }, [user?.id])

  useEffect(() => {
    try {
      const sv = localStorage.getItem("true-saved-posts")
      if (sv) setSavedPosts(JSON.parse(sv))
    } catch (e) { console.error("[Profile] true-saved-posts load failed:", e) }
    try {
      const sm = localStorage.getItem("true-support-messages")
      if (sm) setSupportMessages(JSON.parse(sm))
    } catch (e) { console.error("[Profile] true-support-messages load failed:", e) }
    try {
      const fw = localStorage.getItem("true-following")
      if (fw) setFollowing(new Set(JSON.parse(fw)))
    } catch (e) { console.error("[Profile] true-following load failed:", e) }
    try {
      const ph = localStorage.getItem("true-profile-photo")
      if (ph) setPhotoUrl(ph)
    } catch (e) { console.error("[Profile] true-profile-photo load failed:", e) }
    try {
      const fm = localStorage.getItem(FAMILY_KEY)
      if (fm) setFamilyMembers(JSON.parse(fm))
    } catch (e) { console.error("[Profile] family-members load failed:", e) }
    const r = loadRings()
    setRings({ totalScans: r.totalScans, totalAvoided: r.totalAvoided, streak: r.streak })
    if ("Notification" in window) {
      if (Notification.permission === "granted") setPushStatus("granted")
      else if (Notification.permission === "denied") setPushStatus("denied")
    }
  }, [])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setShowAvatarMenu(false)
    try {
      // Resize to max 600px using canvas before upload
      const blobUrl = URL.createObjectURL(file)
      const img = new Image()
      img.src = blobUrl
      await new Promise(res => { img.onload = res })
      const maxSize = 600
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement("canvas")
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(blobUrl)

      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), "image/jpeg", 0.82))

      if (supabase && user) {
        // Upload to Supabase Storage
        const path = `${user.id}/avatar.jpg`
        const { error } = await supabase.storage.from("profile-images").upload(path, blob, { upsert: true, contentType: "image/jpeg" })
        if (!error) {
          const { data } = supabase.storage.from("profile-images").getPublicUrl(path)
          const url = data.publicUrl + `?t=${Date.now()}` // cache-bust
          setPhotoUrl(url)
          try { localStorage.setItem("true-profile-photo", url) } catch {}
          setUploading(false)
          return
        }
      }
      // Fallback: store as base64 data URL in localStorage
      const reader = new FileReader()
      reader.onload = ev => {
        const url = ev.target?.result as string
        setPhotoUrl(url)
        try { localStorage.setItem("true-profile-photo", url) } catch {}
        setUploading(false)
      }
      reader.readAsDataURL(blob)
    } catch {
      setUploading(false)
    }
  }

  function removePhoto() {
    setPhotoUrl(null)
    setShowAvatarMenu(false)
    try { localStorage.removeItem("true-profile-photo") } catch {}
    if (supabase && user) {
      supabase.storage.from("profile-images").remove([`${user.id}/avatar.jpg`]).catch(() => {})
    }
  }

  async function saveProfile(next?: typeof profile) {
    const p = next ?? profile
    await saveProfileToDb(p)
    setSavedToast(true); setEditMode(false)
    setTimeout(() => setSavedToast(false), 2000)
  }

  function toggleFollow(userId: string) {
    setFollowing(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      localStorage.setItem("true-following", JSON.stringify([...next]))
      return next
    })
  }

  function sendSupportMessage() {
    if (!supportInput.trim()) return
    const msg: SupportMessage = { id: Date.now().toString(), text: supportInput.trim(), time: Date.now(), from: "user" }
    const next = [...supportMessages, msg]
    setSupportMessages(next)
    try { localStorage.setItem("true-support-messages", JSON.stringify(next)) } catch {}
    setSupportInput("")
    setTimeout(() => {
      const reply: SupportMessage = { id: (Date.now() + 1).toString(), text: "Danke für deine Nachricht! Unser Team meldet sich in Kürze. Bei dringenden Fragen: support@true-app.de", time: Date.now() + 1000, from: "support" }
      const withReply = [...next, reply]
      setSupportMessages(withReply)
      try { localStorage.setItem("true-support-messages", JSON.stringify(withReply)) } catch {}
    }, 1500)
  }

  async function togglePushNotifications() {
    if (pushStatus === "denied") { alert("Push-Benachrichtigungen blockiert. Bitte in Browser-Einstellungen erlauben."); return }
    if (profile.pushNotifications) {
      const next = { ...profile, pushNotifications: false }
      setProfile(next); saveProfileToDb(next); setPushStatus("idle"); return
    }
    if (!("Notification" in window)) { alert("Dein Browser unterstützt keine Push-Benachrichtigungen."); return }
    setPushStatus("requesting")
    const perm = await Notification.requestPermission()
    if (perm === "granted") {
      setPushStatus("granted")
      const next = { ...profile, pushNotifications: true }
      setProfile(next); saveProfileToDb(next)
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready
        reg.showNotification("TRUE Benachrichtigungen aktiv 🔔", { body: "Du erhältst jetzt Benachrichtigungen über neue Skandale.", icon: "/icon-192.png" })
      }
    } else {
      setPushStatus("denied")
    }
  }

  function toggleGoal(id: string) {
    setUserGoals(prev => {
      const next = prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
      try {
        const raw = localStorage.getItem("true-profile")
        const p = raw ? JSON.parse(raw) : {}
        localStorage.setItem("true-profile", JSON.stringify({ ...p, goals: next }))
      } catch (e) { console.error("[Profile] toggleGoal save failed:", e) }
      // Also update the useProfile state + sync to Supabase
      const updated = { ...profile, goals: next }
      setProfile(updated)
      saveProfileToDb(updated)
      return next
    })
  }

  function toggleNutritionGoal(id: string) {
    setNutritionGoals(prev => {
      const next = prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
      try {
        const raw = localStorage.getItem("true-profile")
        const p = raw ? JSON.parse(raw) : {}
        localStorage.setItem("true-profile", JSON.stringify({ ...p, nutritionGoals: next }))
      } catch (e) { console.error("[Profile] toggleNutritionGoal save failed:", e) }
      return next
    })
  }

  function toggleAllergy(id: string) {
    setAllergies(prev => {
      const next = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
      try {
        const raw = localStorage.getItem("true-profile")
        const p = raw ? JSON.parse(raw) : {}
        localStorage.setItem("true-profile", JSON.stringify({ ...p, allergies: next }))
      } catch (e) { console.error("[Profile] toggleAllergy save failed:", e) }
      return next
    })
  }

  function toggleStore(name: string) {
    setSelectedStores(prev => {
      const next = prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
      try {
        const raw = localStorage.getItem("true-profile")
        const p = raw ? JSON.parse(raw) : {}
        localStorage.setItem("true-profile", JSON.stringify({ ...p, supermarkets: next }))
      } catch (e) { console.error("[Profile] toggleStore save failed:", e) }
      return next
    })
  }

  function saveCustomStore(val: string) {
    setCustomStore(val)
    try {
      const raw = localStorage.getItem("true-profile")
      const p = raw ? JSON.parse(raw) : {}
      localStorage.setItem("true-profile", JSON.stringify({ ...p, customStore: val }))
    } catch (e) { console.error("[Profile] saveCustomStore failed:", e) }
  }

  function saveFamilyMembers(members: FamilyMember[]) {
    setFamilyMembers(members)
    try { localStorage.setItem(FAMILY_KEY, JSON.stringify(members)) } catch {}
  }

  function addFamilyMember() {
    if (!newMember.name.trim()) return
    const member: FamilyMember = { id: Date.now().toString(), ...newMember, name: newMember.name.trim() }
    saveFamilyMembers([...familyMembers, member])
    setNewMember({ name: "", age: "", emoji: "🧒" })
    setShowAddMember(false)
  }

  function removeFamilyMember(id: string) {
    saveFamilyMembers(familyMembers.filter(m => m.id !== id))
  }

  const displayName = profile.vorname || "Dein Profil"
  const handle      = profile.vorname ? `@${profile.vorname.toLowerCase().replace(/\s/g, ".")}` : ""
  const followingCount = following.size
  const savedCount  = savedPosts.length

  const filteredSuggested = searchQuery.trim()
    ? SUGGESTED_USERS.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.handle.includes(searchQuery.toLowerCase()))
    : SUGGESTED_USERS

  const isSaved = savedToast || saving

  return (
    <AuthGuard>
    <div style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--text)", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--nav-bg)", backdropFilter: "blur(24px)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.25rem", height: "56px" }}>
        <Link href="/home" style={{ textDecoration: "none" }}>
          <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em", color: "var(--accent)" }}>TRUE</span>
        </Link>
        <span style={{ fontWeight: 700, fontSize: "1rem" }}>{displayName || "Profil"}</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button onClick={() => setShowSearch(true)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <NotificationBell />
        </div>
      </header>

      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* ── Profile Header (Instagram style) ─────────────────────────── */}
        <div style={{ padding: "20px 20px 0" }}>

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 14 }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                onClick={() => setShowAvatarMenu(v => !v)}
                style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #1A9E6A)", padding: 2, cursor: "pointer" }}
              >
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.4rem", overflow: "hidden" }}>
                  {photoUrl ? (
                    <img src={photoUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                  ) : (
                    profile.avatar
                  )}
                </div>
              </div>
              {/* Camera badge */}
              <div style={{ position: "absolute", bottom: 2, right: 2, width: 22, height: 22, borderRadius: "50%", background: uploading ? "var(--accent)" : "var(--surface)", border: "2px solid var(--background)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
                {uploading ? (
                  <span style={{ fontSize: "0.6rem" }}>⏳</span>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ flex: 1, display: "flex", justifyContent: "space-around", paddingTop: 10 }}>
              {[
                { label: "Folge ich", value: followingCount },
                { label: "Gespeichert", value: savedCount },
                { label: "Community", value: "👥" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: "1.25rem", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Avatar menu */}
          {showAvatarMenu && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => { setShowAvatarMenu(false); fileInputRef.current?.click() }}
                  style={{ flex: 1, background: "var(--accent)", color: "#000", border: "none", borderRadius: 10, padding: "9px 0", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                >
                  📷 Foto hochladen
                </button>
                {photoUrl && (
                  <button
                    onClick={removePhoto}
                    style={{ background: "rgba(255,60,60,0.1)", color: "#ff3c3c", border: "1px solid rgba(255,60,60,0.25)", borderRadius: 10, padding: "9px 14px", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    🗑 Entfernen
                  </button>
                )}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600, marginBottom: 6 }}>Oder Emoji wählen</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 6 }}>
                {EMOJI_OPTIONS.map(emoji => (
                  <button key={emoji} onClick={() => { setProfile(p => ({ ...p, avatar: emoji })); setShowAvatarMenu(false) }} style={{ background: !photoUrl && profile.avatar === emoji ? "var(--accent)" : "transparent", border: "none", borderRadius: 8, padding: "0.35rem", fontSize: "1.3rem", cursor: "pointer" }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name + bio */}
          {!editMode ? (
            <div style={{ marginBottom: 12 }}>
              {profile.vorname && <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{profile.vorname}</div>}
              {handle && <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>{handle}</div>}
              {profile.stadt && <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: 2 }}>📍 {profile.stadt}</div>}
              {profile.bio && <div style={{ fontSize: "0.85rem", color: "var(--text)", marginTop: 6, lineHeight: 1.5 }}>{profile.bio}</div>}
              {profile.preferences.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {profile.preferences.map(id => {
                    const p = PREFERENCE_OPTIONS.find(x => x.id === id)
                    return p ? (
                      <span key={id} style={{ background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 99, padding: "2px 9px", fontSize: "0.72rem", color: "var(--accent)" }}>
                        {p.emoji} {p.label}
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => setEditMode(v => !v)} style={{ flex: 1, background: editMode ? "var(--accent)" : "var(--surface)", color: editMode ? "#000" : "var(--text)", border: `1px solid ${editMode ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, padding: "8px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
              {editMode ? "✓ Speichern" : "✏️ Profil bearbeiten"}
            </button>
            <button onClick={() => setShowSearch(true)} style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
              👥 Suchen
            </button>
            <button onClick={() => setShowSupport(v => !v)} style={{ background: "var(--surface)", color: "var(--text-dim)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          {/* Auth status */}
          {!authLoading && !user && supabase && (
            <button onClick={() => setShowAuthModal(true)} style={{ width: "100%", background: "linear-gradient(135deg, rgba(46,204,138,0.15), rgba(46,204,138,0.05))", border: "1px solid rgba(46,204,138,0.3)", borderRadius: 12, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>☁️</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)" }}>Konto verbinden</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Profil & Posts auf allen Geräten synchronisieren</div>
              </div>
              <span style={{ background: "var(--accent)", color: "#000", padding: "4px 12px", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem" }}>Anmelden</span>
            </button>
          )}
          {!authLoading && user && (
            <div style={{ background: "rgba(46,204,138,0.06)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <div style={{ flex: 1, fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>Synchronisiert · </span>
                <span style={{ color: "var(--text-dim)" }}>{user.phone || user.email}</span>
              </div>
              <button onClick={signOut} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px", color: "var(--text-dim)", fontSize: "0.75rem", cursor: "pointer" }}>Abmelden</button>
            </div>
          )}
        </div>

        {/* ── Edit Profile Form ────────────────────────────────────────── */}
        {editMode && (
          <div style={{ padding: "0 20px", marginBottom: 16 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" value={profile.vorname} onChange={e => setProfile(p => ({ ...p, vorname: e.target.value }))} placeholder="Vorname" style={inputSt} />
              <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Bio — kurz über dich…" rows={2} style={{ ...inputSt, resize: "none", fontFamily: "inherit" }} />
              <input type="text" value={profile.stadt} onChange={e => setProfile(p => ({ ...p, stadt: e.target.value }))} placeholder="Stadt" style={inputSt} />
              <div>
                <input type="tel" value={profile.telefon} onChange={e => setProfile(p => ({ ...p, telefon: e.target.value }))} placeholder="Handynummer (optional)" style={inputSt} />
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 4, paddingLeft: 4 }}>
                  📱 Optional · Wird gespeichert und kann später für SMS-Benachrichtigungen genutzt werden · Niemals öffentlich
                </div>
              </div>

              {/* Birthday — for push notification */}
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600, marginBottom: 6 }}>🎂 Geburtstag (für Geburtstags-Benachrichtigung)</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number" min="1" max="31"
                    value={profile.birthDay}
                    onChange={e => setProfile(p => ({ ...p, birthDay: e.target.value }))}
                    placeholder="Tag (1–31)"
                    style={{ ...inputSt, flex: 1 }}
                  />
                  <input
                    type="number" min="1" max="12"
                    value={profile.birthMonth}
                    onChange={e => setProfile(p => ({ ...p, birthMonth: e.target.value }))}
                    placeholder="Monat (1–12)"
                    style={{ ...inputSt, flex: 1 }}
                  />
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: 4, paddingLeft: 4 }}>
                  Nur für die Geburtstags-Benachrichtigung · Kein Jahr nötig · Niemals öffentlich
                </div>
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontWeight: 600, marginTop: 4 }}>Interessen</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PREFERENCE_OPTIONS.map(pref => {
                  const active = profile.preferences.includes(pref.id)
                  return (
                    <button key={pref.id} onClick={() => setProfile(p => ({ ...p, preferences: active ? p.preferences.filter(x => x !== pref.id) : [...p.preferences, pref.id] }))} style={{ background: active ? "var(--accent)" : "var(--surface-2)", color: active ? "#000" : "var(--text)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, borderRadius: 99, padding: "4px 12px", cursor: "pointer", fontSize: "0.78rem", fontWeight: active ? 700 : 400 }}>
                      {pref.emoji} {pref.label}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => saveProfile()} style={{ flex: 1, background: "var(--accent)", border: "none", borderRadius: 10, padding: "11px", fontWeight: 800, color: "#000", cursor: "pointer", fontSize: "0.9rem", opacity: isSaved ? 0.8 : 1 }}>
                  {isSaved ? "✓ Gespeichert!" : "Profil speichern"}
                </button>
                <button onClick={() => setEditMode(false)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 16px", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.9rem" }}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab Bar ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", position: "sticky", top: 56, zIndex: 50, background: "var(--nav-bg)", backdropFilter: "blur(12px)" }}>
          {([
            ["posts",    <svg key="g" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>],
            ["saved",    <svg key="b" width="20" height="20" viewBox="0 0 24 24" fill={activeTab === "saved" ? "var(--accent)" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>],
            ["settings", <svg key="s" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>],
          ] as [typeof activeTab, React.ReactNode][]).map(([key, icon]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === key ? "var(--text)" : "transparent"}`, padding: "12px 0", cursor: "pointer", color: activeTab === key ? "var(--text)" : "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {icon}
            </button>
          ))}
        </div>

        {/* ── Posts Tab ─────────────────────────────────────────────── */}
        {activeTab === "posts" && (
          <div style={{ padding: "16px" }}>
            {/* Community CTA */}
            <div style={{ textAlign: "center", padding: "2.5rem 1rem 1.5rem", color: "var(--text-dim)" }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>👥</div>
              <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", marginBottom: 6 }}>Beiträge in der Community</p>
              <p style={{ fontSize: "0.82rem", marginBottom: 20, lineHeight: 1.5 }}>
                Teile Entdeckungen, Alternativen und Tipps direkt in der TRUE Community — alle sehen es sofort.
              </p>
              <Link href="/community" style={{ background: "var(--accent)", color: "#000", borderRadius: 10, padding: "11px 24px", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem", display: "inline-block" }}>
                ✏️ Jetzt in der Community posten
              </Link>
            </div>

            {/* Info card */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", marginTop: 8 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>💡</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>Was kannst du posten?</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
                    Einkaufstipps · Produkt-Alternativen · Konzern-News · Aktionen · Fragen an die Community
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── Saved Tab ────────────────────────────────────────────────── */}
        {activeTab === "saved" && (
          <div style={{ padding: "16px 16px 0" }}>
            {savedPosts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-dim)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🔖</div>
                <p style={{ fontWeight: 600 }}>Noch nichts gespeichert</p>
                <p style={{ fontSize: "0.82rem" }}>Tippe in der Community auf das Lesezeichen-Icon 🔖</p>
                <Link href="/community" style={{ display: "inline-block", marginTop: 14, background: "var(--accent)", color: "#000", borderRadius: 10, padding: "9px 20px", fontWeight: 700, textDecoration: "none", fontSize: "0.88rem" }}>
                  👥 Community öffnen
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-dim)", fontWeight: 600 }}>{savedPosts.length} gespeicherte Posts</span>
                  <Link href="/community" style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>Community öffnen →</Link>
                </div>
                {/* Saved post placeholders → link to Community */}
                {savedPosts.map(id => (
                  <Link key={id} href="/community" style={{ textDecoration: "none", display: "block" }}>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-dim)" }}>Gespeicherter Post #{id}</span>
                      <span style={{ marginLeft: "auto", color: "var(--accent)", fontSize: "0.78rem", fontWeight: 600 }}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* My Impact — real data from Rings */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px", marginTop: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "0.95rem", fontWeight: 700 }}>⚡ Mein Impact</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { v: rings.totalScans.toString(),           l: "bewusste Scans" },
                  { v: rings.totalAvoided.toString(),         l: "Konzerne gemieden" },
                  { v: `${rings.streak}🔥`,                   l: "Tage Streak" },
                ].map(s => (
                  <div key={s.l} style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent)" }}>{s.v}</div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-dim)", marginTop: 2, lineHeight: 1.3 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {rings.totalScans === 0 && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", textAlign: "center", margin: "10px 0 0" }}>
                  Scanne dein erstes Produkt um deinen Impact zu tracken 📷
                </p>
              )}
            </div>

            {/* Suggested users */}
            <div style={{ marginTop: 16 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "0.92rem", fontWeight: 700 }}>👥 Empfohlene Profile</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SUGGESTED_USERS.slice(0, 4).map(u => (
                  <SuggestedUserCard key={u.id} user={u} following={following.has(u.id)} onFollow={() => toggleFollow(u.id)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Settings Tab ─────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <div style={{ padding: "12px 16px 80px", display: "flex", flexDirection: "column", gap: 0 }}>

            {/* ── Accordion Menu ─────────────────────────────────────────── */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>

              {/* 1 · Erscheinungsbild */}
              <div style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setOpenSetting(openSetting === "design" ? null : "design")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>🎨</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>Erscheinungsbild</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Hell / Dunkel</div>
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", transform: openSetting === "design" ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {openSetting === "design" && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12 }}>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>Dunkles Design</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Zwischen Hell und Dunkel wechseln</div>
                      </div>
                      <ThemeToggle />
                    </div>
                  </div>
                )}
              </div>

              {/* 2 · Premium */}
              <div style={{ borderBottom: "1px solid var(--border)", background: isPremium ? "rgba(255,215,0,0.03)" : "transparent" }}>
                <button onClick={() => setOpenSetting(openSetting === "premium" ? null : "premium")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>👑</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: isPremium ? "#ffd700" : "var(--text)" }}>Premium</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{isPremium ? "✓ Aktiv" : "14 Tage kostenlos testen"}</div>
                  </div>
                  {!isPremium && <span style={{ background: "rgba(255,170,0,0.15)", color: "#ffaa00", border: "1px solid rgba(255,170,0,0.4)", borderRadius: 6, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 800, flexShrink: 0 }}>UPGRADE</span>}
                  <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", transform: openSetting === "premium" ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {openSetting === "premium" && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                    {isPremium ? (
                      <div style={{ paddingTop: 12 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                          {[
                            { icon: "📷", label: "Unbegrenzte Scans" },
                            { icon: "💡", label: "Vollständige Hintergründe & Quellen" },
                            { icon: "🔄", label: "Bessere Alternativen" },
                            { icon: "🎯", label: "Ziel-Modus" },
                            { icon: "👨‍👩‍👧", label: "Familien-Score" },
                            { icon: "🥗", label: "Ernährungscoach" },
                          ].map(f => (
                            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: "0.9rem" }}>{f.icon}</span>
                              <span style={{ fontSize: "0.8rem", color: "var(--text)", fontWeight: 600 }}>{f.label}</span>
                              <span style={{ marginLeft: "auto", color: "#ffd700", fontSize: "0.75rem", fontWeight: 800 }}>✓</span>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => { localStorage.setItem("true-premium","0"); setIsPremium(false) }}
                          style={{ width: "100%", background: "transparent", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 10, padding: "8px", color: "var(--text-dim)", fontSize: "0.72rem", cursor: "pointer" }}>
                          Premium deaktivieren
                        </button>
                      </div>
                    ) : (
                      <div style={{ paddingTop: 12 }}>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.6 }}>
                          Unbegrenzte Scans · Familienprofil · KI-Ernährungscoach · Meide-Liste · Ziel-Modus
                        </div>
                        <Link href="/premium" style={{ display: "block", background: "linear-gradient(135deg, #ffd700, #ffaa00)", color: "#000", borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: "0.88rem", textDecoration: "none", textAlign: "center" }}>
                          Jetzt upgraden — 2,99€/Monat →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3 · Benachrichtigungen */}
              <div style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setOpenSetting(openSetting === "notifs" ? null : "notifs")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>🔔</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>Benachrichtigungen</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{profile.pushNotifications ? "Push aktiv" : "Nicht aktiv"}</div>
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", transform: openSetting === "notifs" ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {openSetting === "notifs" && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>Push-Benachrichtigungen</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Neue Skandale & positive Entwicklungen</div>
                      </div>
                      <button onClick={togglePushNotifications} disabled={pushStatus === "requesting"} style={{ background: profile.pushNotifications ? "var(--accent)" : "var(--surface-2)", color: profile.pushNotifications ? "#000" : "var(--text-dim)", border: `1px solid ${profile.pushNotifications ? "var(--accent)" : "var(--border)"}`, borderRadius: 99, padding: "5px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                        {pushStatus === "requesting" ? "⏳" : pushStatus === "denied" ? "⛔ Blockiert" : profile.pushNotifications ? "✓ Aktiv" : "Aktivieren"}
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.88rem" }}>📊 Wöchentlicher Report</span>
                      <button role="switch" aria-checked={profile.weeklyReport} onClick={() => { const n = { ...profile, weeklyReport: !profile.weeklyReport }; setProfile(n); saveProfileToDb(n) }} style={{ width: 44, height: 26, borderRadius: 13, background: profile.weeklyReport ? "var(--accent)" : "var(--surface-2)", border: `1px solid ${profile.weeklyReport ? "var(--accent)" : "var(--border)"}`, position: "relative", cursor: "pointer" }}>
                        <span style={{ position: "absolute", top: 3, left: profile.weeklyReport ? 19 : 3, width: 18, height: 18, borderRadius: "50%", background: profile.weeklyReport ? "#000" : "var(--text-dim)", transition: "left 0.2s" }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4 · Meine Ziele */}
              <div style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setOpenSetting(openSetting === "goals" ? null : "goals")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>🎯</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>Meine Ziele</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{userGoals.length > 0 ? `${userGoals.length} ausgewählt` : "Keine Ziele gewählt"}</div>
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", transform: openSetting === "goals" ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {openSetting === "goals" && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                    <p style={{ margin: "10px 0 12px", fontSize: "0.72rem", color: "var(--text-dim)" }}>Beeinflusst deinen Scan-Kontext und persönliche Hinweise.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { id: "env",    icon: "🌱", label: "Umwelt schützen",   desc: "Konzerne & Abholzung aufdecken" },
                        { id: "health", icon: "💪", label: "Gesünder leben",    desc: "Schädliche Inhaltsstoffe meiden" },
                        { id: "family", icon: "👨‍👩‍👧", label: "Familie schützen", desc: "Sichere Produkte für Kinder" },
                        { id: "truth",  icon: "🔍", label: "Wahrheit kennen",   desc: "Was steckt wirklich dahinter?" },
                        { id: "action", icon: "✊", label: "Etwas bewegen",     desc: "Mit jedem Kauf einen Unterschied machen" },
                        { id: "budget", icon: "💸", label: "Clever sparen",     desc: "Faire Alternativen zum günstigeren Preis" },
                      ].map(g => {
                        const active = userGoals.includes(g.id)
                        return (
                          <button key={g.id} onClick={() => toggleGoal(g.id)} style={{ display: "flex", alignItems: "center", gap: 12, background: active ? "rgba(46,204,138,0.08)" : "var(--background)", border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s" }}>
                            <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{g.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: active ? "var(--accent)" : "var(--text)" }}>{g.label}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{g.desc}</div>
                            </div>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`, background: active ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: active ? "#000" : "transparent" }}>✓</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5 · Ernährung & Allergien */}
              <div style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setOpenSetting(openSetting === "nutrition" ? null : "nutrition")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>🥗</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>Ernährung & Allergien</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                      {[...nutritionGoals, ...allergies].length > 0
                        ? `${nutritionGoals.length > 0 ? nutritionGoals[0] : ""}${allergies.length > 0 ? ` · ${allergies.length} Allergie(n)` : ""}`
                        : "Für präzise Coach-Hinweise setzen"}
                    </div>
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", transform: openSetting === "nutrition" ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {openSetting === "nutrition" && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>

                    {/* Ernährungsziele */}
                    <p style={{ margin: "12px 0 8px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ernährungsziel</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {[
                        { id: "abnehmen",     label: "🔥 Abnehmen" },
                        { id: "muskelaufbau", label: "💪 Muskelaufbau" },
                        { id: "vegan",        label: "🌱 Vegan" },
                        { id: "vegetarisch",  label: "🥦 Vegetarisch" },
                        { id: "kind",         label: "👶 Kind / Familie" },
                        { id: "diabetes",     label: "💉 Diabetes" },
                        { id: "herzgesund",   label: "❤️ Herzgesund" },
                      ].map(g => {
                        const active = nutritionGoals.includes(g.id)
                        return (
                          <button key={g.id} onClick={() => toggleNutritionGoal(g.id)}
                            style={{ background: active ? "rgba(46,204,138,0.12)" : "var(--background)", border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`, borderRadius: 99, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem", fontWeight: active ? 700 : 500, color: active ? "var(--accent)" : "var(--text)", transition: "all 0.15s" }}>
                            {g.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Allergien & Unverträglichkeiten */}
                    <p style={{ margin: "0 0 8px", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Allergien & Unverträglichkeiten</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {[
                        { id: "laktose",      label: "🥛 Laktose" },
                        { id: "gluten",       label: "🌾 Gluten" },
                        { id: "nuesse",       label: "🥜 Nüsse" },
                        { id: "eier",         label: "🥚 Eier" },
                        { id: "soja",         label: "🫘 Soja" },
                        { id: "fisch",        label: "🐟 Fisch" },
                        { id: "meeresfrüchte",label: "🦐 Meeresfrüchte" },
                        { id: "sellerie",     label: "🥬 Sellerie" },
                        { id: "sesam",        label: "🌰 Sesam" },
                        { id: "palmöl",       label: "🌴 Palmöl meiden" },
                      ].map(a => {
                        const active = allergies.includes(a.id)
                        return (
                          <button key={a.id} onClick={() => toggleAllergy(a.id)}
                            style={{ background: active ? "rgba(255,68,85,0.10)" : "var(--background)", border: `1.5px solid ${active ? "#ff4455" : "var(--border)"}`, borderRadius: 99, padding: "7px 14px", cursor: "pointer", fontSize: "0.82rem", fontWeight: active ? 700 : 500, color: active ? "#ff4455" : "var(--text)", transition: "all 0.15s" }}>
                            {a.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 6 · Einkaufsläden */}
              <div style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setOpenSetting(openSetting === "stores" ? null : "stores")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>🏪</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>Einkaufsläden</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{selectedStores.length > 0 ? selectedStores.slice(0,2).join(", ") + (selectedStores.length > 2 ? ` +${selectedStores.length - 2}` : "") : "Keine ausgewählt"}</div>
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", transform: openSetting === "stores" ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {openSetting === "stores" && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                    <p style={{ margin: "10px 0 12px", fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.5 }}>Wo kaufst du ein? TRUE zeigt dir passende Alternativen in deinen Läden.</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                      {STORE_OPTIONS.map(s => {
                        const active = selectedStores.includes(s)
                        return (
                          <button key={s} onClick={() => toggleStore(s)}
                            style={{ background: active ? "rgba(46,204,138,0.1)" : "var(--background)", border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`, borderRadius: 99, padding: "6px 14px", cursor: "pointer", fontSize: "0.82rem", fontWeight: active ? 700 : 500, color: active ? "var(--accent)" : "var(--text)", transition: "all 0.15s" }}>
                            {s}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        value={customStore}
                        onChange={e => saveCustomStore(e.target.value)}
                        placeholder="Anderer Laden (z.B. Tegut, Wasgau…)"
                        style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 99, padding: "8px 14px", color: "var(--text)", fontSize: "0.82rem", outline: "none" }}
                      />
                    </div>
                    {selectedStores.length > 0 && (
                      <div style={{ marginTop: 10, fontSize: "0.68rem", color: "var(--accent)", fontWeight: 600 }}>
                        ✓ {[...selectedStores, ...(customStore ? [customStore] : [])].join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 6 · Familie */}
              <div style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setOpenSetting(openSetting === "family" ? null : "family")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>👨‍👩‍👧</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>Familie</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{familyMembers.length > 0 ? `${familyMembers.length} Mitglied${familyMembers.length > 1 ? "er" : ""}` : "Noch keine Mitglieder"}</div>
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", transform: openSetting === "family" ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {openSetting === "family" && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>Familienmitglieder</span>
                      <button onClick={() => setShowAddMember(v => !v)} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 8, padding: "5px 12px", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                        + Hinzufügen
                      </button>
                    </div>
                    {showAddMember && (
                      <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontWeight: 600, marginBottom: 8 }}>Emoji wählen</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                          {FAMILY_EMOJIS.map(em => (
                            <button key={em} onClick={() => setNewMember(m => ({ ...m, emoji: em }))} style={{ background: newMember.emoji === em ? "var(--accent)" : "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 8px", fontSize: "1.1rem", cursor: "pointer" }}>
                              {em}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <input
                            value={newMember.name} onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && addFamilyMember()}
                            placeholder="Name (z.B. Lena)"
                            style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: "0.85rem", outline: "none" }}
                          />
                          <input
                            value={newMember.age} onChange={e => setNewMember(m => ({ ...m, age: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && addFamilyMember()}
                            placeholder="Alter" type="number" min="0" max="120"
                            style={{ width: 64, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: "0.85rem", outline: "none" }}
                          />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={addFamilyMember} style={{ flex: 1, background: "var(--accent)", color: "#000", border: "none", borderRadius: 8, padding: "9px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>✓ Speichern</button>
                          <button onClick={() => setShowAddMember(false)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 14px", color: "var(--text-dim)", cursor: "pointer", fontSize: "0.82rem" }}>Abbrechen</button>
                        </div>
                      </div>
                    )}
                    {familyMembers.length === 0 ? (
                      <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                        Noch keine Familienmitglieder.<br />Füge z.B. deine Kinder hinzu.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {familyMembers.map(member => (
                          <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px" }}>
                            <span style={{ fontSize: "1.4rem" }}>{member.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{member.name}</div>
                              {member.age && <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{member.age} Jahre</div>}
                            </div>
                            <button onClick={() => removeFamilyMember(member.id)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.1rem", padding: "0 4px", lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 7 · Meide-Liste */}
              <div style={{ borderBottom: "1px solid var(--border)", background: !isPremium ? "rgba(255,170,0,0.02)" : "transparent" }}>
                <button onClick={() => setOpenSetting(openSetting === "meid" ? null : "meid")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>🚫</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>Meide-Liste</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{isPremium ? (meidliste.length > 0 ? `${meidliste.length} Konzern${meidliste.length > 1 ? "e" : ""}` : "Leer") : "👑 Premium"}</div>
                  </div>
                  {!isPremium && <span style={{ background: "rgba(255,170,0,0.15)", color: "#ffaa00", border: "1px solid rgba(255,170,0,0.4)", borderRadius: 6, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 800, flexShrink: 0 }}>PREMIUM</span>}
                  <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", transform: openSetting === "meid" ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {openSetting === "meid" && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                    {!isPremium ? (
                      <div style={{ position: "relative", paddingTop: 12 }}>
                        <div style={{ filter: "blur(3px)", pointerEvents: "none", userSelect: "none" }}>
                          {["Nestlé", "Coca-Cola", "Unilever"].map(n => (
                            <div key={n} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", opacity: 0.6 }}>
                              <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{n}</span>
                              <span style={{ background: "#ff3b3022", color: "#ff3b30", borderRadius: 6, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 }}>KRITISCH</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                          <span style={{ fontSize: "1.8rem" }}>🔒</span>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)", textAlign: "center" }}>Premium freischalten</div>
                          <a href="/premium" style={{ background: "#ffaa00", color: "#000", borderRadius: 10, padding: "8px 20px", fontWeight: 800, fontSize: "0.82rem", textDecoration: "none" }}>Jetzt upgraden →</a>
                        </div>
                      </div>
                    ) : (
                      <div style={{ paddingTop: 12 }}>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Konzern meiden</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                          {(meidExpanded ? KONZERNE_OPTIONS : KONZERNE_OPTIONS.slice(0, 4)).map(k => {
                            const active = meidliste.includes(k.name)
                            return (
                              <button key={k.name} onClick={() => toggleMeid(k.name)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: active ? k.color + "12" : "var(--background)", border: `1.5px solid ${active ? k.color + "66" : "var(--border)"}`, borderRadius: 10, cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.15s" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text)" }}>{k.name}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ background: k.color + "22", color: k.color, border: `1px solid ${k.color}44`, borderRadius: 6, padding: "2px 8px", fontSize: "0.62rem", fontWeight: 700 }}>{k.badge}</span>
                                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${active ? k.color : "var(--border)"}`, background: active ? k.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: active ? "#000" : "transparent", flexShrink: 0 }}>✓</div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        {!meidExpanded && (
                          <button onClick={() => setMeidExpanded(true)} style={{ width: "100%", padding: "8px", background: "transparent", border: "1px dashed var(--border)", borderRadius: 10, color: "var(--text-dim)", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600, marginBottom: 14 }}>
                            ↓ {KONZERNE_OPTIONS.length - 4} weitere Konzerne anzeigen
                          </button>
                        )}
                        {meidExpanded && <div style={{ marginBottom: 14 }} />}
                        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Eigenen Konzern hinzufügen</div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                          <input value={meidInput} onChange={e => { setMeidInput(e.target.value); setMeidError("") }} onKeyDown={e => e.key === "Enter" && addCustomMeid()} placeholder="z.B. Aldi, Lidl, H&M …" maxLength={50}
                            style={{ flex: 1, background: "var(--background)", border: `1px solid ${meidError ? "var(--danger)" : "var(--border)"}`, borderRadius: 10, padding: "8px 12px", color: "var(--text)", fontSize: "0.82rem", outline: "none" }} />
                          <button onClick={addCustomMeid} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: 10, padding: "0 14px", fontWeight: 800, cursor: "pointer", fontSize: "0.85rem" }}>＋</button>
                        </div>
                        {meidError && (
                          <div style={{ fontSize: "0.72rem", color: "var(--danger)", marginBottom: 8, paddingLeft: 2 }}>{meidError}</div>
                        )}
                        {meidliste.filter(n => !KONZERNE_OPTIONS.find(k => k.name === n)).map(n => (
                          <div key={n} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: "rgba(255,68,85,0.08)", border: "1px solid rgba(255,68,85,0.2)", borderRadius: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>🚫 {n}</span>
                            <button onClick={() => toggleMeid(n)} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1rem", padding: "0 4px" }}>×</button>
                          </div>
                        ))}
                        {meidliste.length === 0 && <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "0.78rem", padding: "12px 0" }}>Noch keine Konzerne ausgewählt.</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 8 · Score-Methodik */}
              <div style={{ borderBottom: "1px solid var(--border)" }}>
                <button onClick={() => setOpenSetting(openSetting === "score" ? null : "score")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>📊</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>Score-Methodik</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Wie wird bewertet?</div>
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", transform: openSetting === "score" ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {openSetting === "score" && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12 }}>
                      {[
                        { icon: "⚖️", title: "Konzern-Schweregrad (Basis)", text: "Ausgangspunkt: critical = 25, high = 50, medium = 70, low = 88. Bewertet wie schwerwiegend die bekannten Praktiken sind." },
                        { icon: "📋", title: "Beweislage (bis −20 Punkte)", text: "Für jeden verifizierten Beleg (Gerichtsurteil, Studie, NGO-Report) werden Punkte abgezogen." },
                        { icon: "🏷️", title: "Problemfelder (bis −15 Punkte)", text: "Schwere Kategorien wie PFAS oder Kinderarbeit zählen mehr als z.B. Greenwashing." },
                        { icon: "🎯", title: "Dein Ziel (bis −10 Punkte extra)", text: "Wenn du 'Umwelt schützen' gewählt hast, werden Palmöl und Abholzung doppelt gewichtet." },
                      ].map(item => (
                        <div key={item.title} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                          <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: 2 }}>{item.title}</div>
                            <div style={{ fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.55 }}>{item.text}</div>
                          </div>
                        </div>
                      ))}
                      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", lineHeight: 1.6, paddingTop: 4 }}>
                        <strong style={{ color: "var(--text)" }}>Skala:</strong> 80–100 Gut · 65–79 Okay · 45–64 Bedenklich · 25–44 Kritisch · 5–24 Gefährlich
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 9 · Über TRUE */}
              <div>
                <button onClick={() => setOpenSetting(openSetting === "about" ? null : "about")}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: "1.3rem", width: 28, textAlign: "center" }}>ℹ️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>Über TRUE</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Version 0.1</div>
                  </div>
                  <span style={{ color: "var(--text-dim)", fontSize: "1.1rem", transform: openSetting === "about" ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {openSetting === "about" && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 12 }}>
                      {[
                        { label: "Datenschutz", href: "#" },
                        { label: "Nutzungsbedingungen", href: "#" },
                        { label: "Impressum", href: "#" },
                      ].map(l => (
                        <a key={l.label} href={l.href} style={{ color: "var(--text-dim)", textDecoration: "none", fontSize: "0.85rem", display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                          {l.label} <span>›</span>
                        </a>
                      ))}
                      <div style={{ paddingTop: 8, fontSize: "0.72rem", color: "var(--text-dim)", textAlign: "center" }}>
                        TRUE · Version 0.1 · support@true-app.de
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>{/* end accordion card */}

            {/* Passwort setzen */}
            <PasswordSection />

            {/* Logout button */}
            <button onClick={signOut} style={{ width: "100%", marginTop: 12, background: "transparent", border: "1px solid rgba(255,68,85,0.3)", borderRadius: 12, padding: "12px", color: "#ff4455", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
              🚪 Abmelden
            </button>
          </div>
        )}
      </div>

      {/* ── Support drawer ────────────────────────────────────────────────── */}
      {showSupport && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)" }} onClick={() => setShowSupport(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 16px" }} />
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>💬 Support-Chat</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginBottom: 14 }}>Antwortzeit: unter 24 Stunden</div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {supportMessages.length === 0 && <p style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "0.82rem" }}>Schreib uns — wir helfen gerne!</p>}
              {supportMessages.map(msg => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.from === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", background: msg.from === "user" ? "var(--accent)" : "var(--background)", color: msg.from === "user" ? "#000" : "var(--text)", border: `1px solid ${msg.from === "user" ? "var(--accent)" : "var(--border)"}`, borderRadius: msg.from === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "8px 12px", fontSize: "0.84rem", lineHeight: 1.5 }}>
                    {msg.from === "support" && <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>TRUE Support</div>}
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={supportInput} onChange={e => setSupportInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendSupportMessage()} placeholder="Schreib uns…" style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 99, padding: "10px 16px", color: "var(--text)", fontSize: "0.88rem", outline: "none" }} />
              <button onClick={sendSupportMessage} style={{ background: "var(--accent)", color: "#000", border: "none", borderRadius: "50%", width: 42, height: 42, cursor: "pointer", fontWeight: 700, flexShrink: 0 }}>→</button>
            </div>
          </div>
        </div>
      )}

      {/* ── User Search modal ────────────────────────────────────────────── */}
      {showSearch && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)" }} onClick={() => setShowSearch(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: "var(--surface)", borderRadius: "0 0 20px 20px", padding: "16px 16px 20px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, padding: "0 12px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Name oder @handle suchen…" style={{ flex: 1, background: "none", border: "none", color: "var(--text)", fontSize: "0.92rem", outline: "none", padding: "11px 0" }} />
              </div>
              <button onClick={() => setShowSearch(false)} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontWeight: 600, fontSize: "0.88rem" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredSuggested.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "0.85rem", padding: "2rem 0" }}>Kein Ergebnis für „{searchQuery}"</p>
              ) : (
                filteredSuggested.map(u => (
                  <SuggestedUserCard key={u.id} user={u} following={following.has(u.id)} onFollow={() => toggleFollow(u.id)} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => { setSavedToast(true); setTimeout(() => setSavedToast(false), 2000) }} />
      )}

      <BottomNav />
    </div>
    </AuthGuard>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: "100%", background: "var(--background)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: "0.9rem",
  outline: "none", boxSizing: "border-box", display: "block",
}

// ─── Suggested User Card ─────────────────────────────────────────────────────
function SuggestedUserCard({ user, following, onFollow }: { user: typeof SUGGESTED_USERS[0]; following: boolean; onFollow: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px" }}>
      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #1A9E6A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>
        {user.avatar}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{user.name}</div>
        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{user.handle} · {user.followers} Follower</div>
        <div style={{ fontSize: "0.75rem", color: "var(--text)", marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{user.bio}</div>
      </div>
      <button
        onClick={onFollow}
        style={{ background: following ? "var(--surface)" : "var(--accent)", color: following ? "var(--text-dim)" : "#000", border: `1px solid ${following ? "var(--border)" : "var(--accent)"}`, borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
      >
        {following ? "Folge ich" : "Folgen"}
      </button>
    </div>
  )
}
