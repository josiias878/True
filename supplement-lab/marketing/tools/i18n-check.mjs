// Prüft die Übersetzung: (1) t("…")-Schlüssel ohne englischen Eintrag, (2) verdächtige deutsche Texte ohne t().
// Aufruf (im Repo-Root): node supplement-lab/marketing/tools/i18n-check.mjs [dateien…]   (ohne Dateien: alle)
import fs from "fs"
import path from "path"
const ROOT = new URL("../../../", import.meta.url).pathname
const dictFiles = fs.readdirSync(path.join(ROOT, "lib/i18n")).filter(f => /^en-.*\.ts$/.test(f))
const dict = {}, dupes = []
for (const f of dictFiles) {
  const src = fs.readFileSync(path.join(ROOT, "lib/i18n", f), "utf8")
  const body = src.slice(src.indexOf("{", src.indexOf("=")) + 1, src.lastIndexOf("}"))
  let obj
  try { obj = JSON.parse("{" + body.trim().replace(/,\s*$/, "") + "}") } catch (e) { console.log(`✗ ${f}: kein gültiges JSON-Format (${e.message})`); process.exitCode = 1; continue }
  for (const [k, v] of Object.entries(obj)) { if (k in dict && dict[k] !== v) dupes.push(`${k} (${f})`); dict[k] = v }
}
const files = process.argv.slice(2).length ? process.argv.slice(2) : [
  ...fs.readdirSync(path.join(ROOT, "app/lab")).filter(f => f.endsWith(".tsx")).map(f => `app/lab/${f}`),
  ...fs.readdirSync(path.join(ROOT, "lib")).filter(f => /^(supplementLab|lab[A-Z].*)\.ts$/.test(f) && f !== "labI18n.ts").map(f => `lib/${f}`),
]
const unq = s => { try { return JSON.parse(`"${s.replace(/\\'/g, "'")}"`) } catch { return s } }
const DE = /[äöüÄÖÜß]|\b(der|die|das|und|nicht|ist|du|dein|deine|deinen|mit|für|noch|heute|gestern|morgen|Tag|Tage|Tagen|Woche|ich|mich|mir|wie|was|bei|auf|zum|zur|eine?n?|aus|oder|schon|jetzt|nach|Einnahme|Abend|Morgen|Ergebnis|bitte|alles)\b/
let missing = 0, suspicious = 0
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8")
  for (const m of src.matchAll(/\bt\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\$]|\\.)*)`)/g)) {
    const key = unq(m[1] ?? m[2] ?? m[3])
    if (!(key in dict)) { missing++; console.log(`fehlt  ${f}: ${JSON.stringify(key)}`) }
  }
  src.split("\n").forEach((line, i) => {
    const l = line.trim()
    if (!l || l.startsWith("//") || l.startsWith("*") || l.startsWith("/*") || l.startsWith("import ")) return
    const code = l.replace(/\/\/.*$/, "").replace(/\bt\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, "t(_)")
    const strs = [...code.matchAll(/"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`|>([^<>{}]*[A-Za-zÄÖÜäöü][^<>{}]*)</g)].map(m => m[1] ?? m[2] ?? m[3])
    if (strs.some(s => s && DE.test(s) && !/^[a-z0-9_\-:.\/]+$/i.test(s) && !/^(lab|true)-/.test(s))) { suspicious++; if (!process.env.QUIET) console.log(`deutsch? ${f}:${i + 1}: ${l.slice(0, 140)}`) }
  })
}
console.log(`\n${Object.keys(dict).length} Einträge · ${missing} fehlende Übersetzungen · ${suspicious} verdächtige Zeilen${dupes.length ? ` · ${dupes.length} widersprüchliche Doppel: ${dupes.slice(0, 5).join(", ")}` : ""}`)
if (missing) process.exitCode = 1
