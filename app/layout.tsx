import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import SwRegister from "@/components/SwRegister"
import PresencePing from "@/components/PresencePing"
import DataSync from "@/components/DataSync"

export const metadata: Metadata = {
  title: "TRUE — Transparenz für deine Lebensmittel",
  description: "Scanne Produkte und erfahre welche Konzerne dahinter stecken — kostenlos, unabhängig, transparent.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TRUE",
  },
  openGraph: {
    title: "TRUE — Transparenz für deine Lebensmittel",
    description: "Scanne Produkte und erfahre welche Konzerne dahinter stecken — kostenlos, unabhängig, transparent.",
    url: "https://get-true.de",
    siteName: "TRUE",
    images: [
      {
        url: "https://get-true.de/true-logo.jpg",
        width: 1024,
        height: 1024,
        alt: "TRUE App — Transparenz für deine Lebensmittel",
      },
    ],
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRUE — Transparenz für deine Lebensmittel",
    description: "Scanne Produkte und erfahre welche Konzerne dahinter stecken — kostenlos, unabhängig, transparent.",
    images: ["https://get-true.de/true-logo.jpg"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-touch-fullscreen": "yes",
  },
}

export const viewport: Viewport = {
  themeColor: "#2ECC8A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
        {/* Leaflet CSS — must load before any map renders */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      </head>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
        <SwRegister />
        <PresencePing />
        <DataSync />
      </body>
    </html>
  )
}
