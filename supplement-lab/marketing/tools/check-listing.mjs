// Prüft die Längen-Grenzen der Store-Texte in store/listing.md
import { readFileSync } from "node:fs"
const t = readFileSync(new URL("../store/listing.md", import.meta.url), "utf8")
const len = s => [...s].length
const rules = [["App-Name", 30], ["App name", 30], ["Untertitel", 30], ["Subtitle", 30], ["Kurzbeschreibung", 80]]
let ok = true
for (const [k, max] of rules) for (const m of t.matchAll(new RegExp(`\\*\\*${k}[^*]*:\\*\\*\\s*(.+)`, "g"))) {
  const v = m[1].trim(); const bad = len(v) > max; ok &&= !bad
  console.log(`${bad ? "✗" : "✓"} ${k}: ${len(v)}/${max}  ${v}`)
}
for (const [h, max] of [["Werbetext", 170], ["Promotional text", 170], ["Keywords", 100]]) {
  for (const m of t.matchAll(new RegExp(`\\*\\*${h}[^*]*:\\*\\*\\n([\\s\\S]*?)\\n\\n`, "g"))) {
    const v = h === "Keywords" ? m[1].trim() : m[1].replace(/\n/g, " ").trim(); const bad = len(v) > max; ok &&= !bad
    console.log(`${bad ? "✗" : "✓"} ${h}: ${len(v)}/${max}`)
  }
}
for (const h of ["Beschreibung", "Description"]) {
  const m = t.match(new RegExp(`\\*\\*${h}[^*]*:\\*\\*\\n([\\s\\S]*?)\\n\\*\\*Keywords`))
  if (m) { const bad = len(m[1]) > 4000; ok &&= !bad; console.log(`${bad ? "✗" : "✓"} ${h}: ${len(m[1].trim())}/4000`) }
}
process.exit(ok ? 0 : 1)
