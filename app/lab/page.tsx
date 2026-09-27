"use client"
import dynamic from "next/dynamic"

// Das Lab lebt komplett in localStorage → nur im Browser rendern (kein Hydration-Mismatch).
const LabApp = dynamic(() => import("./LabApp"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100dvh", background: "var(--background)" }} />,
})

export default function SupplementLabPage() {
  return <LabApp />
}
