import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Supplement Lab — TRUE",
  description: "Finde heraus, welche Supplements bei dir wirklich wirken: Reset-Woche, Einzeltests, täglicher Check-in und dein persönlicher Stack.",
}

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children
}
