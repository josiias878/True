"use client"
import React, { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    // Saved preference wins. New users always start in light mode.
    const saved = localStorage.getItem("true-theme") as Theme | null
    const initial = saved ?? "light"
    setTheme(initial)
    document.documentElement.classList.toggle("light", initial === "light")
    document.documentElement.classList.toggle("dark", initial === "dark")
  }, [])

  function toggle() {
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark"
      localStorage.setItem("true-theme", next)
      document.documentElement.classList.toggle("light", next === "light")
      document.documentElement.classList.toggle("dark", next === "dark")
      return next
    })
  }

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}

export function useTheme() { return useContext(Ctx) }

export function ThemeToggle({ style }: { style?: React.CSSProperties }) {
  const { theme, toggle } = useTheme()
  const dark = theme === "dark"
  return (
    <button
      onClick={toggle}
      title={dark ? "Helles Design aktivieren" : "Dunkles Design aktivieren"}
      style={{
        display: "flex", alignItems: "center", gap: "0.4rem",
        background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: "20px", padding: "0.3rem 0.65rem",
        cursor: "pointer", color: "var(--text-dim)",
        fontSize: "0.78rem", fontWeight: 600,
        transition: "all 0.2s",
        ...style,
      }}
    >
      {/* Track */}
      <span style={{
        display: "inline-flex", width: "28px", height: "16px",
        borderRadius: "8px",
        background: dark ? "#252538" : "#d0e8d8",
        position: "relative", transition: "background 0.25s",
        border: "1px solid var(--border)",
      }}>
        <span style={{
          position: "absolute", top: "2px",
          left: dark ? "2px" : "12px",
          width: "10px", height: "10px", borderRadius: "50%",
          background: dark ? "#7a7a9a" : "#1EA872",
          transition: "left 0.2s",
        }} />
      </span>
      {dark ? "🌙 Dunkel" : "☀️ Hell"}
    </button>
  )
}

/** Kleiner Icon-Button für alle Hauptseiten-Header */
export function ThemeIcon() {
  const { theme, toggle } = useTheme()
  const dark = theme === "dark"
  return (
    <button
      onClick={toggle}
      title={dark ? "Hell" : "Dunkel"}
      style={{
        width: 36, height: 36, borderRadius: "50%",
        background: "var(--surface-2)", border: "1px solid var(--border)",
        cursor: "pointer", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "1.05rem", flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      {dark ? "🌙" : "☀️"}
    </button>
  )
}
