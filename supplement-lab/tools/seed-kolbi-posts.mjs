#!/usr/bin/env node
// Offizielle Kolbi-Posts → Upsert-SQL für public.official_posts (Migration 20261009120000_lab_social_start_testmode.sql).
//
//   node supplement-lab/tools/seed-kolbi-posts.mjs [eingabe.json] [ausgabe.sql]
//   Standard: supplement-lab/content/community/kolbi-posts.json → supplement-lab/supabase/seed/kolbi-posts.sql
//
// Format der Eingabe: [{id, community, publish_on, title_de, body_de, title_en, body_en, icon}]
// Prüft Felder streng (sonst Abbruch ohne Ausgabe) und warnt bei möglichen Heil-/Wirkversprechen
// (legal/health-claims-check.md gilt trotzdem – die Warnliste ersetzt keine Durchsicht).
// Upsert: gleiche id → Inhalt wird aktualisiert, „hidden“ bleibt wie vom Inhaber gesetzt. Nichts wird gelöscht.
// Anwenden: Ausgabe im Supabase-SQL-Editor ausführen (oder per MCP execute_sql).
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const inFile = process.argv[2] ?? path.join(root, "content/community/kolbi-posts.json")
const outFile = process.argv[3] ?? path.join(root, "supabase/seed/kolbi-posts.sql")

// Communities wie im Seed der Social-Migration (Ziele + Labs ohne Peptide/Rx)
const GOALS = ["schlaf", "energie", "fokus", "stress", "muskel", "regeneration", "darm", "haut", "longevity", "immun"]
const COMMUNITY = /^(lab-[a-z0-9-]{2,40}|goal-(?:[a-z0-9-]{2,40}))$/
const ID = /^[a-z0-9][a-z0-9-]{1,63}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const ICON = /^[a-z0-9-]{2,40}$/
const PEPTIDES = new Set(["bpc157", "tb500", "ghkcu", "cjc-ipa", "semax", "selank", "motsc", "epitalon", "ta1", "kpv", "glp1"])
// grobe Warnliste (nur Hinweis): Heilversprechen, Krankheitsbezug, Superlative
const CLAIM_WORDS = /\b(heilt|heilen|heilung|kuriert|wirkt gegen|gegen (?:krebs|depression|angst)|behandelt|garantiert|beweist|bewiesen|cures?|heals?|treats?|guaranteed|proven to|prevents?)\b/i

function fail(msg) { console.error(`✗ ${msg}`); process.exit(1) }
const q = s => `'${String(s).replace(/'/g, "''")}'`

if (!fs.existsSync(inFile)) fail(`Datei fehlt: ${path.relative(process.cwd(), inFile)}`)
let data
try { data = JSON.parse(fs.readFileSync(inFile, "utf8")) } catch (e) { fail(`Kein gültiges JSON: ${e.message}`) }
if (!Array.isArray(data) || !data.length) fail("Erwarte ein nicht-leeres Array")

const seen = new Set(), rows = [], warnings = []
data.forEach((p, i) => {
  const at = `#${i} (${p?.id ?? "ohne id"})`
  if (!p || typeof p !== "object") fail(`${at}: kein Objekt`)
  if (typeof p.id !== "string" || !ID.test(p.id)) fail(`${at}: id muss ^[a-z0-9][a-z0-9-]{1,63}$ sein`)
  if (seen.has(p.id)) fail(`${at}: id doppelt`)
  seen.add(p.id)
  if (typeof p.community !== "string" || !COMMUNITY.test(p.community)) fail(`${at}: community ungültig`)
  if (p.community.startsWith("goal-") && !GOALS.includes(p.community.slice(5))) fail(`${at}: unbekannte Ziel-Community ${p.community}`)
  if (p.community.startsWith("lab-") && PEPTIDES.has(p.community.slice(4))) fail(`${at}: keine Peptid-Communities`)
  if (typeof p.publish_on !== "string" || !DATE.test(p.publish_on) || Number.isNaN(Date.parse(`${p.publish_on}T00:00:00Z`))) fail(`${at}: publish_on muss YYYY-MM-DD sein`)
  for (const k of ["title_de", "title_en"]) if (typeof p[k] !== "string" || !p[k].trim() || p[k].length > 140) fail(`${at}: ${k} fehlt oder > 140 Zeichen`)
  for (const k of ["body_de", "body_en"]) if (typeof p[k] !== "string" || !p[k].trim() || p[k].length > 1500) fail(`${at}: ${k} fehlt oder > 1500 Zeichen`)
  const icon = p.icon == null || p.icon === "" ? null : p.icon
  if (icon !== null && (typeof icon !== "string" || !ICON.test(icon) || PEPTIDES.has(icon))) fail(`${at}: icon muss eine Bibliotheks-ID sein (oder null)`)
  for (const k of ["title_de", "body_de", "title_en", "body_en"]) {
    const m = p[k].match(CLAIM_WORDS)
    if (m) warnings.push(`${at} ${k}: „${m[0]}“ – Health-Claims prüfen`)
  }
  rows.push(`  (${[q(p.id), q(p.community), `${q(p.publish_on)}::date`, q(p.title_de.trim()), q(p.body_de.trim()), q(p.title_en.trim()), q(p.body_en.trim()), icon ? q(icon) : "null"].join(", ")})`)
})

const sql = `-- Offizielle Kolbi-Posts (erzeugt von supplement-lab/tools/seed-kolbi-posts.mjs aus ${path.relative(root, inFile)})
-- ${rows.length} Posts · Upsert (hidden bleibt unverändert, nichts wird gelöscht). Nicht von Hand bearbeiten.
insert into public.official_posts (id, community, publish_on, title_de, body_de, title_en, body_en, icon) values
${rows.join(",\n")}
on conflict (id) do update set
  community = excluded.community, publish_on = excluded.publish_on,
  title_de = excluded.title_de, body_de = excluded.body_de, title_en = excluded.title_en, body_en = excluded.body_en,
  icon = excluded.icon, updated_at = now()
where (official_posts.community, official_posts.publish_on, official_posts.title_de, official_posts.body_de,
       official_posts.title_en, official_posts.body_en, official_posts.icon)
  is distinct from (excluded.community, excluded.publish_on, excluded.title_de, excluded.body_de,
       excluded.title_en, excluded.body_en, excluded.icon);
`
fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, sql)
console.log(`✓ ${rows.length} Posts → ${path.relative(process.cwd(), outFile)}`)
for (const w of warnings) console.warn(`⚠ ${w}`)
