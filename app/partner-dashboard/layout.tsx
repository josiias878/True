"use client"
import { usePathname } from "next/navigation"
import Sidebar from "./_components/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Onboarding is full-screen — no sidebar
  if (pathname === "/partner-dashboard/onboarding") {
    return <>{children}</>
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100dvh",
      background: "#0b1a10",
      fontFamily: "system-ui,-apple-system,sans-serif",
      color: "#fff",
    }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  )
}
