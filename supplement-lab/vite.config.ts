import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"

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
  },
  resolve: {
    alias: [
      { find: "next/link", replacement: path.resolve(import.meta.dirname, "src/shims/next-link.tsx") },
      { find: /^@\//, replacement: path.resolve(import.meta.dirname, "..") + "/" },
    ],
    // Nur eine React-Kopie (die geteilten Dateien liegen außerhalb dieses Ordners)
    dedupe: ["react", "react-dom"],
  },
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 1200 },
})
