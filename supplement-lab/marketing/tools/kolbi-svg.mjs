// Kolbi als eigenständige SVGs (alle Stimmungen) – direkt aus der App-Komponente.
// Aufruf (im Ordner supplement-lab): node marketing/tools/kolbi-svg.mjs
import { createServer } from "vite"
import fs from "node:fs"
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" })
import { createRequire } from "node:module"
const require = createRequire(new URL("../../package.json", import.meta.url))
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const { Mascot } = await vite.ssrLoadModule("/../app/lab/mascot.tsx")
const out = new URL("../brand/", import.meta.url)
const variants = [
  ["happy", {}], ["party", {}], ["think", {}], ["alert", {}], ["sleepy", {}],
  ["happy-glow", { mood: "happy", glow: true, fill: 0.85 }], ["party-glow", { mood: "party", glow: true, fill: 0.9 }],
  ["happy-shades", { mood: "happy", accessory: "shades", fill: 0.7 }], ["sleepy-nightcap", { mood: "sleepy", accessory: "nightcap", fill: 1 }],
  ["happy-alive", { mood: "happy", alive: true, glow: true, fill: 0.8 }], ["party-alive", { mood: "party", alive: true, glow: true, fill: 0.9 }], ["think-alive", { mood: "think", alive: true, fill: 0.5 }],
  ["happy-empty", { mood: "happy", fill: 0.15 }], ["think-murky", { mood: "think", murky: true, fill: 0.3 }],
]
for (const [name, p] of variants) {
  const props = { mood: name.split("-")[0], size: 512, fill: 0.75, ...p }
  let svg = renderToStaticMarkup(React.createElement(Mascot, props))
  if (!svg.includes("xmlns=")) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
  fs.writeFileSync(new URL(`kolbi-${name}.svg`, out), svg)
  console.log("✓", name, svg.length)
}
await vite.close()
