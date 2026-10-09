// Tests: Barcode → Bibliothek (lib/labBarcode.ts) – Code-Prüfung, Abgleich mit echten Open-Food-Facts-Daten,
// Reihenfolge Zuordnung › Crowd › OFF, keine Peptide/Rx, Allow-Liste der Edge-Function synchron.
// Aufruf (im Repo-Root): node supplement-lab/tools/test-barcode.mjs
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createServer } from "vite"

const server = await createServer({ configFile: new URL("../vite.config.ts", import.meta.url).pathname, server: { middlewareMode: true }, appType: "custom", logLevel: "error" })
const load = p => server.ssrLoadModule(p)
let failed = 0, passed = 0
const test = async (name, fn) => {
  try { await fn(); passed++; console.log(`✓ ${name}`) } catch (e) { failed++; console.log(`✗ ${name}\n  ${e.message}`) }
}

// Echte OFF-Produkte (Abruf 9. Okt 2026, kompakt wie lab-barcode sie liefert; Zutaten gekürzt)
const OFF = {
  "4058172309250": { names: ["Magnesium"], brand: "Mivolis", categories: ["dietary-supplements", "mineral-supplements", "magnesium-supplements"],
    ingredients: "Säuerungsmittel Citronensäure, Säureregulator Natriumhydrogencarbonat, Magnesiumcarbonat, Füllstoff Sorbit, Maisstärke, Aroma, Süßungsmittel Natriumcyclamat und Natriumsaccharin, Farbstoff Riboflavin.", nutrients: { magnesium: 0.00769 } },
  "4058172309519": { names: ["Multivitamin"], brand: "Mivolis, dm", generic: "Nahrungsergänzungsmittel mit 10 Vitaminen. Mit Süßungsmitteln.",
    categories: ["dietary-supplements", "vitamin-supplements", "multivitamin-and-mineral-supplements"],
    ingredients: "Säuerungsmittel Citronensäure, Füllstoff Sorbit, L-Ascorbinsäure (Vitamin C), DL-a-Tocopherylacetat (Vitamin E), Nicotinamid, Pyridoxinhydrochlorid (Vitamin B6), Riboflavin (Vitamin B2), Cyanocobalamin (Vitamin B12)" },
  "4058172310232": { names: ["Brausetabletten Vitamin C"], brand: "DM, mivolis (dm)", categories: ["beverages", "dietary-supplements"],
    ingredients: "Säuerungsmittel Citronensäure, Säureregulator Natriumhydrogencarbonat, L-Ascorbinsäure (Vitamin C), Aromen", nutrients: { "vitamin-c": 0.24 } },
  "9780201379624": { names: ["Creatine Monohydrate", "Rahm-Möhren"], brand: "Trust Labs", categories: ["dietary-supplements", "creatina", "suplementos"],
    ingredients: "Monohidrato de Creatina Creapure® (min. 99.9% de pureza)" },
  "4058172308277": { names: ["Eisen + Vitamin C"], brand: "Mivolis", categories: ["beverages", "dietary-supplements", "vitamin-supplements"],
    ingredients: "Säuerungsmittel Citronensäure, Säureregulator Natriumhydrogencarbonat, L-Ascorbinsäure (Vitamin C), Eisen-II-lactat, Farbstoff Riboflavin." },
  "4058172922077": { names: ["Vitamin B12"], brand: "Mivolis", categories: ["dietary-supplements", "vitamin-supplements", "vitamin-b12-supplements"],
    ingredients: "Säuerungsmittel Citronensäure, Cyanocobalamin (Vitamin B12). Nahrungsergänzungsmittel mit Vitamin B12." },
  "4058172922091": { names: ["Multi-Mineral"], brand: "Mivolis", generic: "Nahrungsergänzungsmittel mit Mineralstoffen", categories: ["beverages", "dietary-supplements"],
    ingredients: "Calciumcarbonat, Magnesiumcarbonat, Zinkcitrat, Kupfercitrat, Natriumselenit.", nutrients: { zinc: 0.000205, magnesium: 0.00385, calcium: 0.0082 } },
  "20289119": { names: [], brand: "MinaVit, Optisana", categories: ["dietary-supplements", "vitamin-supplements", "supplements"],
    ingredients: "Ingredientes: acidulante: ácido cítrico; tocoferol (vitamina E), nicotinamida (niacina), D-pantotenato" },
  "8718836397110": { names: ["Premium Omega-3"], brand: "Ocean's Essentials", categories: ["fats", "dietary-supplements", "fish-oils", "omega-3"],
    ingredients: "esters éthyliques d'acide gras oméga-3 (provenant d'huile de poisson estérifiée), gélule (gélatine bovine)" },
  "4305615614366": { names: ["Brausetabletten Magnesium, Orangengeschmack"], brand: "Rossmann, altapharma", categories: ["dietary-supplements"],
    ingredients: "Säuerungsmittel: Citronensäure, Magnesiumcarbonat, Säureregulator: Natriumhydrogencarbonat, Stärke, Inulin, Aroma" },
  "4061458007696": { names: ["Magnesium Brausetabletten"], brand: "Vitalis", categories: ["beverages", "dietary-supplements", "vitamin-supplements"],
    ingredients: "Citronensäure; Magnesiumcarbonat; L-Ascorbinsäure; Trennmittel: Tricalciumphosphat; D-Biotin; Cyanocobalamin", nutrients: { biotin: 0.05, magnesium: 0.24, "vitamin-c": 0.0801 } },
}
// Was ein Mensch auf der Packung als Hauptwirkstoff erkennen würde (null = keine eindeutige Antwort)
const EXPECT = {
  "4058172309250": "magnesium", "4058172309519": "multivitamin", "4058172310232": "vitc", "9780201379624": "kreatin",
  "4058172308277": "eisen", "4058172922077": "b12", "4058172922091": "multivitamin", "20289119": null,
  "8718836397110": "omega3", "4305615614366": "magnesium", "4061458007696": "magnesium",
}

try {
  const B = await load("/../lib/labBarcode.ts")
  const L = await load("/../lib/supplementLab.ts")
  const res = (o = {}) => ({ code: "4058172309250", map: [], crowd: [], off: null, ...o })

  await test("normalizeBarcode: EAN-13/EAN-8/UPC-A/UPC-E mit Prüfziffer", () => {
    assert.equal(B.normalizeBarcode("4058172309250"), "4058172309250")
    assert.equal(B.normalizeBarcode("4058172309251"), null)
    assert.equal(B.normalizeBarcode(" 4058-172 309250 "), "4058172309250")
    assert.equal(B.normalizeBarcode("20289119"), "20289119")
    assert.equal(B.normalizeBarcode("722252387530"), "0722252387530")
    assert.equal(B.normalizeBarcode("04252614"), "0042100005264")
    assert.equal(B.normalizeBarcode("00722252387530"), "0722252387530")
    assert.equal(B.normalizeBarcode("12345"), null)
    // 8 Stellen: Format vom Scanner entscheidet (UPC-E ≠ EAN-8)
    assert.equal(B.normalizeBarcode("04252614", "upc_e"), "0042100005264")
    assert.equal(B.normalizeBarcode("04252614", "ean_8"), null)
    assert.equal(B.normalizeBarcode("20289119", "ean_8"), "20289119")
    assert.equal(B.normalizeBarcode("20289119", "upc_e"), null)
    assert.equal(B.normalizeBarcode("4058172309250", "ean_13"), "4058172309250")
    assert.equal(B.normalizeBarcode("abc4058172309250"), null)
  })

  await test("Echte OFF-Produkte: Hauptwirkstoff wird erkannt und vorausgewählt", () => {
    let ok = 0
    for (const [code, off] of Object.entries(OFF)) {
      const { cands, preselect } = B.buildCandidates(res({ code, off }))
      const want = EXPECT[code]
      if (want === null) { assert.deepEqual(preselect, [], `${code}: nichts vorauswählen`); ok++; continue }
      assert.equal(cands[0]?.lib.id, want, `${code}: erster Vorschlag ${cands[0]?.lib.id} statt ${want}`)
      assert.deepEqual(preselect, [want], `${code}: vorausgewählt ${preselect}`)
      ok++
    }
    console.log(`  ${ok}/${Object.keys(OFF).length} echte Codes korrekt`)
  })

  await test("Kombis bieten Auswahl an (Eisen + Vitamin C), Multivitamin unterdrückt Einzelstoffe", () => {
    const iron = B.buildCandidates(res({ off: OFF["4058172308277"] }))
    assert.deepEqual(iron.cands.slice(0, 2).map(c => c.lib.id), ["eisen", "vitc"])
    assert.equal(iron.cands[1].source, "name")
    const multi = B.buildCandidates(res({ off: OFF["4058172309519"] }))
    assert.deepEqual(multi.cands.map(c => c.lib.id), ["multivitamin"])
  })

  await test("Hilfsstoffe zählen nicht: Natrium-/Calcium-Salze und Magnesiumstearat", () => {
    const m = B.matchOff({ names: ["Vitamin C 500"], ingredients: "Ascorbinsäure, Natriumcyclamat, Trennmittel Magnesiumstearat, Tricalciumphosphat, Siliciumdioxid" })
    assert.deepEqual(m.map(x => x.lib.id), ["vitc"])
  })

  await test("Menge aus dem Produktnamen, D3+K2 = ein Eintrag", () => {
    const d = B.matchOff({ names: ["Vitamin D3 + K2 2000 I.E. Tropfen"] })
    assert.equal(d.length, 1)
    assert.equal(d[0].lib.id, "vitd")
    assert.equal(d[0].dose, "2000 IE")
    const a = B.matchOff({ names: ["Ashwagandha KSM-66 600 mg Kapseln"] })
    assert.equal(a[0].lib.id, "ashwagandha")
    assert.equal(a[0].dose, "600 mg")
    // Nährwerte aus OFF sind oft falsch erfasst → keine Menge daraus
    assert.equal(B.matchOff(OFF["4058172309250"])[0].dose, "")
    // Packungsgrößen (g/ml) und unplausible Werte nie als Portion
    assert.equal(B.doseFromName("Whey Protein Vanille 1000 g"), "")
    assert.equal(B.doseFromName("Elektrolyt Drink 500 ml"), "")
    assert.equal(B.doseFromName("Magnesium 400 mg 120 Kapseln"), "400 mg")
    assert.equal(B.doseFromName("Vitamin D3 2.000 IE"), "2.000 IE")
    assert.equal(B.doseFromName("B12 1000 µg"), "1000 µg")
    assert.equal(B.doseFromName("Kreatin 50000 mg"), "")
    assert.equal(B.doseFromName("Vitamin D 5 IE"), "")
    assert.equal(B.matchOff({ names: ["Whey Protein 1000 g"] })[0].dose, "")
  })

  await test("Keine Peptide und keine verschreibungspflichtigen Mittel", () => {
    assert.deepEqual(B.matchOff({ names: ["BPC-157 Kapseln"] }), [])
    assert.deepEqual(B.matchOff({ names: ["Ozempic Pen"] }), [])
    const all = L.LIBRARY.filter(l => l.category === "Peptide" || l.rx)
    assert.ok(all.length > 0)
    const r = B.buildCandidates(res({ map: all.map(l => ({ lib: l.id })), crowd: all.map(l => ({ lib: l.id, n: 5 })) }))
    assert.deepEqual(r.cands, [])
  })

  await test("Reihenfolge: geprüft › Produktname › Crowd; Crowd nie vor einem Namens-Treffer", () => {
    const off = OFF["4061458007696"]
    const r = B.buildCandidates(res({ map: [{ lib: "zink", amount: 25, unit: "mg" }], crowd: [{ lib: "selen", n: 4 }, { lib: "zink", n: 3 }], off }))
    assert.deepEqual(r.cands.slice(0, 3).map(c => [c.lib.id, c.source]), [["zink", "map"], ["magnesium", "name"], ["selen", "crowd"]])
    assert.equal(r.cands[0].dose, "25 mg")
    assert.deepEqual(r.preselect, ["zink"])
    // Namens-Treffer vorhanden → Crowd-Vorschlag wird gezeigt, aber nicht vorausgewählt
    const c = B.buildCandidates(res({ crowd: [{ lib: "selen", n: 5 }], off }))
    assert.deepEqual(c.preselect, ["magnesium"])
    assert.equal(c.cands.find(x => x.lib.id === "selen")?.votes, 5)
    // Auch ohne Namens-Treffer: Crowd-Vorschlag wird angeboten, aber nie vorausgewählt
    const u = B.buildCandidates(res({ crowd: [{ lib: "selen", n: 3 }], off: OFF["20289119"] }))
    assert.equal(u.cands[0]?.lib.id, "selen")
    assert.deepEqual(u.preselect, [])
    // Unter 3 Stimmen: gar nicht anzeigen
    assert.deepEqual(B.buildCandidates(res({ crowd: [{ lib: "selen", n: 2 }] })).cands, [])
    assert.deepEqual(B.buildCandidates(null), { cands: [], preselect: [] })
    assert.deepEqual(B.buildCandidates(res()).cands, [])
  })

  await test("ODbL-Hinweis nur mit OFF-Daten; Produktname gekürzt, Heil-/Werbeaussagen verworfen", () => {
    assert.equal(B.usesOff(res()), false)
    assert.equal(B.usesOff(res({ off: OFF["4058172309250"] })), true)
    assert.deepEqual(B.productInfo(res({ off: OFF["9780201379624"] })), { name: "Creatine Monohydrate", fromOff: true })
    assert.deepEqual(B.productInfo(res({ map: [{ lib: "zink", name: "Zink 25" }], off: OFF["9780201379624"] })), { name: "Zink 25", fromOff: false })
    assert.deepEqual(B.productInfo(res({ off: { names: ["Immun-Komplex gegen Erkältung"] } })), { name: "", fromOff: false })
    for (const bad of ["Heilt Gelenke", "Anti-Krebs Formel", "Corona Schutz", "Diabetes Balance", "Detox Kur", "Fatburner Extreme"]) assert.equal(B.cleanProductName(bad), "", bad)
    assert.equal(B.cleanProductName("Magnesium Brausetabletten"), "Magnesium Brausetabletten")
    assert.equal(B.cleanProductName("x".repeat(80)).length, 60)
  })

  await test("Allow-Liste der Edge-Function = BARCODE_LIBRARY", () => {
    const src = readFileSync(new URL("../supabase/functions/lab-barcode/index.ts", import.meta.url), "utf8")
    const block = src.slice(src.indexOf("const ALLOWED = new Set(["), src.indexOf("])", src.indexOf("const ALLOWED")))
    const allowed = [...block.matchAll(/"([a-z0-9-]+)"/g)].map(m => m[1]).sort()
    assert.deepEqual(allowed, B.BARCODE_LIBRARY.map(l => l.id).sort())
    assert.deepEqual(Object.values(B.NUTRIENT_LIB).filter(id => !L.LIB_BY_ID[id]), [], "NUTRIENT_LIB zeigt auf unbekannte IDs")
    // Claim-Wortliste in App und Edge-Function identisch
    const appSrc = readFileSync(new URL("../../lib/labBarcode.ts", import.meta.url), "utf8")
    const claim = t => t.match(/const CLAIM = (\/.*\/i)/)?.[1]
    assert.ok(claim(src) && claim(src) === claim(appSrc), "CLAIM-Liste weicht ab")
    // Rollierende Grenze pro Code, Bremse je IP-Hash + Code, IP aus cf-connecting-ip (nicht erster XFF-Eintrag)
    assert.ok(/SUBMITS_PER_IP_CODE = 2/.test(src) && /hit\(`c:\$\{ipk\}:\$\{code\}`/.test(src), "Bremse je IP + Code fehlt")
    assert.ok(!/stored: false/.test(src) && /\.in\("voter", drop\)/.test(src), "Grenze pro Code nicht rollierend")
    assert.ok(/cf-connecting-ip/.test(src) && /xff\[xff\.length - 1\]/.test(src) && !/split\(","\)\[0\]/.test(src), "IP-Ermittlung")
    assert.ok(!/echo-headers/.test(src), "Echo-Aktion noch drin")
    // Crowd wird nie automatisch zu barcode_map
    assert.ok(!/from\("barcode_map"\)\.(upsert|insert)/.test(src), "Edge-Function schreibt barcode_map")
  })
} finally {
  await server.close()
}
console.log(`\n${passed} bestanden · ${failed} fehlgeschlagen`)
if (failed) process.exitCode = 1
