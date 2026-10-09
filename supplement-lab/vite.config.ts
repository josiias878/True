import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { readFileSync } from "node:fs"

// App-Version fürs Feedback (lib/labGrow.ts → appVersion): VITE_APP_VERSION oder package.json-Version
const pkgVersion = (JSON.parse(readFileSync(path.join(import.meta.dirname, "package.json"), "utf8")) as { version?: string }).version ?? ""

// Die Lab-Oberfläche lebt im TRUE-Repo (app/lab, lib/) und wird hier 1:1 wiederverwendet.
// Store-Modus: keine Research-Peptide in der Bibliothek, kein Link zurück zu TRUE.
export default defineConfig({
  plugins: [react()],
  root: import.meta.dirname,
  base: "./",
  define: {
    "process.env.NEXT_PUBLIC_LAB_STORE": JSON.stringify("1"),
    // Apple Health / Health Connect: in Store-Version 1.0 aus (siehe lib/health.ts → HEALTH_UI)
    "process.env.NEXT_PUBLIC_LAB_HEALTH": JSON.stringify(process.env.NEXT_PUBLIC_LAB_HEALTH ?? ""),
    "process.env.NEXT_PUBLIC_LAB_VERSION": JSON.stringify(process.env.VITE_APP_VERSION || pkgVersion),
    // Nur für Test-Builds: feste Statistik-Quelle, z. B. VITE_STATS_SRC=playtest (lib/labStats.ts → BUILD_SRC)
    "process.env.NEXT_PUBLIC_LAB_STATS_SRC": JSON.stringify(process.env.VITE_STATS_SRC ?? ""),
  },
  resolve: {
    alias: [
      { find: "next/link", replacement: path.resolve(import.meta.dirname, "src/shims/next-link.tsx") },
      { find: /^@\//, replacement: path.resolve(import.meta.dirname, "..") + "/" },
      // Geteilte Dateien (app/lab/scan.tsx) liegen außerhalb – zxing aus diesem node_modules nehmen (frischer Clone hat kein Root-node_modules)
      { find: /^@zxing\/(browser|library)$/, replacement: path.resolve(import.meta.dirname, "node_modules/@zxing") + "/$1" },
    ],
    // Nur eine React-Kopie (die geteilten Dateien liegen außerhalb dieses Ordners)
    dedupe: ["react", "react-dom"],
  },
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 1200 },
})
