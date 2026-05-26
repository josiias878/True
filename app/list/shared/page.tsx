"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low" | "none"

interface SharedItem {
  id: string
  name: string
  brand: string
  emoji: string
  checked: boolean
  severity: Severity
  issue: string
}

interface Comment {
  id: string
  author: string
  text: string
  time: number
}

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ff2244",
  high:     "#ff5533",
  medium:   "#ffaa00",
  low:      "#44aaff",
  none:     "transparent",
}

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Kritisch",
  high:     "Hoch",
  medium:   "Mittel",
  low:      "Niedrig",
  none:     "OK",
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SharedListPage() {
  const [items, setItems]               = useState<SharedItem[]>([])
  const [comments, setComments]         = useState<Record<string, Comment[]>>({})
  const [checkedLocal, setCheckedLocal] = useState<Set<string>>(new Set())
  const [error, setError]               = useState("")
  const [loading, setLoading]           = useState(true)
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [newComment, setNewComment]     = useState("")
  const [authorName, setAuthorName]     = useState("Gast")
  const [copyToast, setCopyToast]       = useState(false)
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Load list from API via short code
  useEffect(() => {
    // Load author name from profile
    try {
      const p = localStorage.getItem("true-profile")
      if (p) {
        const parsed = JSON.parse(p)
        const name = parsed.name || parsed.vorname
        if (name) setAuthorName(name)
      }
    } catch {}
    // Load comments from localStorage (per device)
    try {
      const raw = localStorage.getItem("shared-list-comments-v1")
      if (raw) setComments(JSON.parse(raw))
    } catch {}

    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")
    if (!code) { setError("Kein Einladungscode gefunden."); setLoading(false); return }

    fetch(`/api/shared-list?code=${encodeURIComponent(code)}`)
      .then(async res => {
        const data = await res.json()
        if (res.status === 410) { setError("Dieser Link ist abgelaufen (nach 7 Tagen)."); return }
        if (!res.ok || !data.items) { setError("Liste nicht gefunden. Der Link ist möglicherweise ungültig."); return }
        setItems(data.items)
      })
      .catch(() => setError("Die Liste konnte nicht geladen werden. Bitte versuche es erneut."))
      .finally(() => setLoading(false))
  }, [])

  function toggleCheck(id: string) {
    setCheckedLocal(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function addComment(itemId: string) {
    if (!newComment.trim()) return
    const comment: Comment = {
      id: Date.now().toString(),
      author: authorName,
      text: newComment.trim(),
      time: Date.now(),
    }
    setComments(prev => {
      const next = { ...prev, [itemId]: [...(prev[itemId] ?? []), comment] }
      try { localStorage.setItem("shared-list-comments-v1", JSON.stringify(next)) } catch {}
      return next
    })
    setNewComment("")
    commentInputRef.current?.focus()
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 2000)
    })
  }

  function shareWhatsApp() {
    const text = `Schau dir diese Einkaufsliste in TRUE an 🛒\n${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
  }

  const checkedItems   = items.filter(it => checkedLocal.has(it.id))
  const uncheckedItems = items.filter(it => !checkedLocal.has(it.id))
  const problemCount   = items.filter(it => it.severity !== "none").length

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
          <p style={{ color: "var(--text-dim)" }}>Liste wird geladen…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: "var(--text)", fontWeight: 600, marginBottom: 8 }}>Link ungültig</p>
          <p style={{ color: "var(--text-dim)", marginBottom: 24, fontSize: "0.9rem" }}>{error}</p>
          <Link href="/list" style={{ display: "inline-block", background: "var(--accent)", color: "#000", padding: "10px 24px", borderRadius: 12, fontWeight: 700, textDecoration: "none" }}>
            Eigene Liste erstellen
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--background)", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: "var(--nav-bg)", borderBottom: "1px solid var(--border)", padding: "16px 20px", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>🛒</span>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>
                Geteilte Einkaufsliste
              </h1>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-dim)" }}>
                {items.length} Produkte · {problemCount} problematisch
              </p>
            </div>
            <button onClick={shareWhatsApp} style={{ background: "#25D366", border: "none", borderRadius: 10, padding: "8px 12px", color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <span>📤</span> Teilen
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 0" }}>
        {/* Info banner */}
        <div style={{ background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
          <div>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text)", fontWeight: 600 }}>
              Diese Liste wurde mit dir geteilt
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-dim)" }}>
              Hake Produkte ab, die du schon im Einkaufskorb hast. Tippe auf 💬, um einen Kommentar hinzuzufügen.
            </p>
          </div>
        </div>

        {/* Stats */}
        {items.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Gesamt", value: items.length, color: "var(--text)" },
              { label: "Problematisch", value: problemCount, color: "#ff5533" },
              { label: "Abgehakt", value: checkedItems.length, color: "var(--accent)" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Unchecked items */}
        {uncheckedItems.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {uncheckedItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                checked={false}
                comments={comments[item.id] ?? []}
                openComments={openComments === item.id}
                onToggle={() => toggleCheck(item.id)}
                onToggleComments={() => setOpenComments(prev => prev === item.id ? null : item.id)}
                newComment={openComments === item.id ? newComment : ""}
                onCommentChange={setNewComment}
                onAddComment={() => addComment(item.id)}
                commentInputRef={openComments === item.id ? commentInputRef : undefined}
                authorName={authorName}
              />
            ))}
          </div>
        )}

        {/* Checked items */}
        {checkedItems.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              ✅ Bereits im Korb ({checkedItems.length})
            </p>
            {checkedItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                checked={true}
                comments={comments[item.id] ?? []}
                openComments={openComments === item.id}
                onToggle={() => toggleCheck(item.id)}
                onToggleComments={() => setOpenComments(prev => prev === item.id ? null : item.id)}
                newComment={openComments === item.id ? newComment : ""}
                onCommentChange={setNewComment}
                onAddComment={() => addComment(item.id)}
                commentInputRef={openComments === item.id ? commentInputRef : undefined}
                authorName={authorName}
              />
            ))}
          </div>
        )}

        {/* CTA: install TRUE */}
        <div style={{ background: "linear-gradient(135deg, rgba(46,204,138,0.15), rgba(46,204,138,0.05))", border: "1px solid rgba(46,204,138,0.25)", borderRadius: 16, padding: "20px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
          <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--text)", fontSize: "1rem" }}>
            Willst du auch bessere Alternativen entdecken?
          </p>
          <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "var(--text-dim)" }}>
            TRUE zeigt dir, welche Konzerne hinter deinen Produkten stecken — und schlägt echte Alternativen vor.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{ background: "var(--accent)", color: "#000", padding: "10px 20px", borderRadius: 12, fontWeight: 700, fontSize: "0.88rem", textDecoration: "none" }}>
              TRUE herunterladen
            </Link>
            <button onClick={copyLink} style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 20px", borderRadius: 12, fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}>
              Link kopieren
            </button>
          </div>
        </div>
      </div>

      {/* Copy toast */}
      {copyToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--accent)", color: "#000", padding: "10px 20px", borderRadius: 99, fontWeight: 700, fontSize: "0.88rem", zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(46,204,138,0.4)" }}>
          ✅ Link kopiert!
        </div>
      )}
    </div>
  )
}

// ─── Item Card ────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: SharedItem
  checked: boolean
  comments: Comment[]
  openComments: boolean
  onToggle: () => void
  onToggleComments: () => void
  newComment: string
  onCommentChange: (v: string) => void
  onAddComment: () => void
  commentInputRef?: React.RefObject<HTMLInputElement | null>
  authorName: string
}

function ItemCard({ item, checked, comments, openComments, onToggle, onToggleComments, newComment, onCommentChange, onAddComment, commentInputRef, authorName }: ItemCardProps) {
  const hasProblem = item.severity !== "none"
  const color = SEVERITY_COLOR[item.severity]

  return (
    <div style={{
      background: "var(--surface)",
      border: `1px solid ${hasProblem && !checked ? color + "44" : "var(--border)"}`,
      borderRadius: 14,
      marginBottom: 10,
      overflow: "hidden",
      opacity: checked ? 0.55 : 1,
      transition: "opacity 0.2s",
    }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
        {/* Checkbox */}
        <button onClick={onToggle} style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${checked ? "var(--accent)" : "var(--border)"}`, background: checked ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", transition: "all 0.2s" }}>
          {checked && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>

        {/* Emoji */}
        <span style={{ fontSize: 26, flexShrink: 0 }}>{item.emoji}</span>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", textDecoration: checked ? "line-through" : "none" }}>
              {item.name}
            </span>
            {hasProblem && (
              <span style={{ background: color + "22", color, fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: 6, flexShrink: 0 }}>
                {SEVERITY_LABEL[item.severity]}
              </span>
            )}
          </div>
          {item.brand && <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{item.brand}</div>}
          {item.issue !== "—" && (
            <div style={{ fontSize: "0.72rem", color: color, marginTop: 2 }}>⚠ {item.issue}</div>
          )}
        </div>

        {/* Comment button */}
        <button onClick={onToggleComments} style={{ background: openComments ? "rgba(46,204,138,0.15)" : "transparent", border: `1px solid ${openComments ? "rgba(46,204,138,0.3)" : "var(--border)"}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: openComments ? "var(--accent)" : "var(--text-dim)", fontSize: "0.75rem", flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {comments.length > 0 && <span>{comments.length}</span>}
        </button>
      </div>

      {/* Comments section */}
      {openComments && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 14px", background: "rgba(0,0,0,0.04)" }}>
          {comments.length === 0 && (
            <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", margin: "0 0 10px", textAlign: "center" }}>
              Noch kein Kommentar — sei der Erste!
            </p>
          )}
          {comments.map(c => (
            <div key={c.id} style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--accent)" }}>{c.author}</span>
              <span style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginLeft: 6 }}>
                {new Date(c.time).toLocaleTimeString("de", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--text)" }}>{c.text}</p>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              ref={commentInputRef as React.RefObject<HTMLInputElement>}
              value={newComment}
              onChange={e => onCommentChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onAddComment()}
              placeholder={`Als ${authorName} kommentieren…`}
              style={{ flex: 1, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", color: "var(--text)", outline: "none" }}
            />
            <button onClick={onAddComment} disabled={!newComment.trim()} style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, color: "#000", cursor: "pointer", fontSize: "0.85rem", opacity: newComment.trim() ? 1 : 0.5 }}>
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
