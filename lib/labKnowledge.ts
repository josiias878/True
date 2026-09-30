// ── Kolbis Wissen: Partner-Tipps, Nebenwirkungs-Ursachen, kurze Fakten ─────────
// Bewusst kurz und vorsichtig formuliert: Wissen und Denkanstöße, keine Diagnose.

import { LIB_BY_ID, libOf, checkinsIn, todayIso, addDays, type LabState } from "./supplementLab"

/** Passt gut zusammen bzw. gleicht etwas aus — wird nur vorgeschlagen, wenn der Partner noch fehlt. */
export interface Partner { with: string; title: string; text: string }

export const PARTNERS: Record<string, Partner[]> = {
  zink: [{ with: "kupfer", title: "Zink braucht Kupfer im Blick",
    text: "Zink bremst auf Dauer die Kupfer-Aufnahme. Wer über Monate höher dosiert, kann in einen Kupfermangel rutschen (Müdigkeit, Blutarmut). Viele nehmen deshalb ein Zink-Präparat mit etwas Kupfer – im Zweifel Blutwerte checken." }],
  vitd: [{ with: "magnesium", title: "Vitamin D braucht Magnesium",
    text: "Um Vitamin D zu aktivieren, verbraucht der Körper Magnesium. Bei hohen D-Dosen lohnt es sich, auf genug Magnesium zu achten." }],
  calcium: [{ with: "vitd", title: "Calcium braucht Vitamin D",
    text: "Ohne Vitamin D kommt kaum Calcium aus dem Darm in die Knochen." }],
  eisen: [{ with: "vitc", title: "Eisen + Vitamin C",
    text: "Vitamin C verbessert die Eisenaufnahme deutlich – z. B. ein Glas O-Saft oder eine Kapsel dazu." }],
  koffein: [{ with: "theanin", title: "Kaffee + L-Theanin",
    text: "L-Theanin (aus Grüntee) glättet die Koffein-Nervosität: klar und fokussiert statt zittrig." }],
  b12: [{ with: "folat", title: "B12 und Folat sind ein Team",
    text: "Beide arbeiten bei Blutbildung und Nerven zusammen. Fehlt eins, kann das andere seinen Job schlechter machen." }],
  folat: [{ with: "b12", title: "Folat und B12 sind ein Team",
    text: "Viel Folat kann einen B12-Mangel verdecken. Deshalb werden die beiden oft zusammen genommen." }],
  whey: [{ with: "kreatin", title: "Eiweiß + Kreatin",
    text: "Kreatin ist das am besten untersuchte Supplement für Kraft und passt gut zu einem Eiweiß-Fokus." }],
}

/** Nebenwirkung, während man X nimmt → typische Ursache und was meist hilft. */
export interface SideCause { lib: string; sides: string[]; text: string; add?: string }

export const SIDE_CAUSES: SideCause[] = [
  { lib: "magnesium", sides: ["durchfall", "blaehungen"], text: "Magnesium zieht Wasser in den Darm. Glycinat statt Citrat oder die Dosis auf zwei Portionen aufteilen hilft meist." },
  { lib: "zink", sides: ["uebelkeit"], text: "Zink auf leeren Magen macht oft Übelkeit – nimm es zu einer Mahlzeit." },
  { lib: "zink", sides: ["muede"], text: "Nimmst du Zink schon länger höher dosiert? Dann kann ein Kupfermangel dahinterstecken. Kupfer im Blick behalten, im Zweifel Blutbild.", add: "kupfer" },
  { lib: "eisen", sides: ["verstopfung", "uebelkeit"], text: "Eisen schlägt oft auf den Magen. Niedrigere Dosis, jeden 2. Tag oder Eisen-Bisglycinat sind meist besser verträglich." },
  { lib: "kreatin", sides: ["blaehungen", "durchfall", "wasser"], text: "Kreatin zieht Wasser in die Muskeln. Genug trinken und die Portion aufteilen hilft; 1–2 kg mehr auf der Waage sind normal." },
  { lib: "omega3", sides: ["uebelkeit", "blaehungen"], text: "Fischaufstoßen? Zu einer Mahlzeit nehmen oder die Kapseln im Gefrierfach lagern." },
  { lib: "koffein", sides: ["schlafprob", "unruhe", "herzrasen"], text: "Koffein wirkt 5–6 Stunden nach. Letzte Tasse spätestens 8 h vor dem Schlafen; L-Theanin dämpft die Nervosität.", add: "theanin" },
  { lib: "melatonin", sides: ["kopfschmerz", "traeume", "muede"], text: "Oft ist die Dosis zu hoch: 0,3–1 mg reichen meist und machen morgens weniger dumpf." },
  { lib: "betaalanin", sides: ["kribbeln"], text: "Das Kribbeln ist harmlos. Kleinere Portionen über den Tag verteilt verhindern es." },
  { lib: "b12", sides: ["schlafprob", "unruhe"], text: "B-Vitamine können aktivieren – nimm sie morgens statt abends." },
  { lib: "bkomplex", sides: ["schlafprob", "unruhe"], text: "B-Vitamine können aktivieren – nimm sie morgens statt abends." },
  { lib: "rhodiola", sides: ["unruhe", "schlafprob"], text: "Rhodiola wirkt aktivierend – nur morgens nehmen, nicht nach 14 Uhr." },
  { lib: "tyrosin", sides: ["unruhe", "schlafprob"], text: "Tyrosin wirkt aktivierend – nur morgens nehmen, nicht nach 14 Uhr." },
  { lib: "alcar", sides: ["unruhe", "schlafprob"], text: "Carnitin kann aktivieren – nur morgens nehmen." },
  { lib: "ashwagandha", sides: ["muede"], text: "Ashwagandha kann müde machen – dann besser abends nehmen." },
  { lib: "flohsamen", sides: ["blaehungen", "verstopfung"], text: "Mit wenig anfangen und viel Wasser trinken (mind. 300 ml pro Portion) – sonst bläht und stopft es." },
  { lib: "berberin", sides: ["verstopfung", "durchfall", "blaehungen", "uebelkeit"], text: "Berberin zu einer Mahlzeit nehmen und langsam steigern – der Darm gewöhnt sich meist." },
  { lib: "vitc", sides: ["durchfall", "blaehungen"], text: "Hohe Vitamin-C-Dosen wirken abführend – Dosis teilen oder reduzieren." },
  { lib: "probiotika", sides: ["blaehungen"], text: "Blähungen am Anfang sind häufig und legen sich meist nach 1–2 Wochen." },
  { lib: "glp1", sides: ["uebelkeit", "verstopfung", "durchfall", "blaehungen"], text: "Typisch für GLP-1, v. a. nach einer Dosis-Erhöhung. Kleinere Mahlzeiten helfen – bei starken Beschwerden ärztlich melden." },
  { lib: "alphagpc", sides: ["kopfschmerz"], text: "Cholin kann Kopfschmerzen machen – eine kleinere Dosis probieren." },
  { lib: "citicolin", sides: ["kopfschmerz"], text: "Cholin kann Kopfschmerzen machen – eine kleinere Dosis probieren." },
  { lib: "bacopa", sides: ["uebelkeit", "durchfall"], text: "Bacopa immer zu einer fettreichen Mahlzeit nehmen – dann ist es magenfreundlicher." },
  { lib: "nac", sides: ["uebelkeit"], text: "NAC mit viel Wasser nehmen; bei empfindlichem Magen zu einer Mahlzeit." },
]

/** Kurze Fakten zum Mitlernen. */
export const FACTS: Record<string, string[]> = {
  magnesium: ["Über 300 Enzyme im Körper brauchen Magnesium – für Muskeln, Nerven und Energie.", "Die Form macht den Unterschied: Citrat wirkt eher abführend, Glycinat ist magenfreundlich."],
  glycin: ["Glycin senkt leicht die Körpertemperatur – ein Signal, das beim Einschlafen hilft."],
  melatonin: ["Melatonin ist eher ein Zeitgeber als ein Schlafmittel: Es sagt dem Körper „jetzt ist Nacht“.", "Oft wirken 0,3–1 mg genauso gut wie viel höhere Dosen."],
  theanin: ["L-Theanin steckt natürlich im Grüntee – deshalb macht Tee ruhiger wach als Kaffee."],
  koffein: ["Koffein hat eine Halbwertszeit von ca. 5 Stunden: Der Kaffee um 16 Uhr ist um 21 Uhr noch halb im Blut.", "Koffein blockiert Adenosin – den Botenstoff, der Müdigkeit meldet."],
  rhodiola: ["Rhodiola wächst in kalten Bergregionen und wurde traditionell gegen Erschöpfung genutzt."],
  ashwagandha: ["„Ashwagandha“ heißt auf Sanskrit ungefähr „Geruch des Pferdes“ – wegen der Wurzel.", "In Studien sank das Stresshormon Cortisol – aber erst nach einigen Wochen."],
  vitd: ["Vitamin D ist eigentlich ein Hormon, das die Haut mit Sonnenlicht bildet.", "In Deutschland reicht die Sonne von Oktober bis März meist nicht für genug Vitamin D."],
  omega3: ["Fische haben ihr Omega-3 aus Algen – Algenöl ist die vegane Quelle.", "Leinöl liefert nur eine Vorstufe, die der Körper schlecht in EPA/DHA umwandelt."],
  zink: ["Zink ist an über 300 Enzymen beteiligt, z. B. für Immunsystem und Wundheilung.", "Zink und Kupfer konkurrieren im Darm um dieselbe Aufnahme."],
  kupfer: ["Kupfer brauchst du für rote Blutkörperchen und Bindegewebe – Nüsse und Kakao sind gute Quellen."],
  eisen: ["Kaffee und Tee können die Eisenaufnahme um mehr als die Hälfte senken.", "Zu viel Eisen schadet – deshalb nur nach Blutbild (Ferritin)."],
  b12: ["Vitamin B12 steckt fast nur in tierischen Lebensmitteln – bei veganer Ernährung ist es Pflicht."],
  bkomplex: ["Der knallgelbe Urin nach B-Vitaminen kommt von Riboflavin (B2) – harmlos."],
  vitc: ["Menschen können Vitamin C nicht selbst bilden – im Gegensatz zu fast allen Tieren."],
  probiotika: ["Probiotika wirken stammspezifisch: Nicht jede Sorte hilft bei jedem Problem."],
  kreatin: ["Kreatin ist eines der am besten untersuchten Supplements überhaupt.", "Dein Körper bildet selbst etwa 1 g Kreatin pro Tag."],
  citrullin: ["Der Name kommt von der Wassermelone (Citrullus) – dort wurde Citrullin entdeckt.", "Citrullin wird im Körper zu Arginin – das weitet die Blutgefäße (der „Pump“)."],
  betaalanin: ["Das Kribbeln nach Beta-Alanin heißt Parästhesie – harmlos und nach ca. 1 Stunde vorbei."],
  elektrolyte: ["Kopfweh bei Low-Carb („Keto-Grippe“) kommt oft von zu wenig Natrium."],
  kollagen: ["Kollagen ist das häufigste Eiweiß im Körper – es hält Haut, Sehnen und Knochen zusammen."],
  q10: ["Cholesterinsenker (Statine) senken auch den körpereigenen Q10-Spiegel."],
  lionsmane: ["Auf Deutsch heißt Lion's Mane „Igelstachelbart“ – er sieht aus wie eine Löwenmähne."],
  curcumin: ["Ohne schwarzen Pfeffer (Piperin) wird Curcumin kaum aufgenommen."],
  calcium: ["99 % des Calciums im Körper stecken in Knochen und Zähnen."],
  gaba: ["GABA ist die wichtigste „Bremse“ unter den Botenstoffen im Gehirn."],
  apigenin: ["Eine Tasse Kamillentee enthält nur wenige Milligramm Apigenin – Kapseln deutlich mehr."],
  baldrian: ["Für viele riecht Baldrian unangenehm – Katzen lieben den Geruch."],
  taurin: ["Taurin steckt in Energydrinks, wirkt aber eher beruhigend als aufputschend."],
  tyrosin: ["Aus Tyrosin baut der Körper Dopamin, Noradrenalin und Schilddrüsenhormone."],
  citicolin: ["Cholin ist Baustein von Acetylcholin – dem Botenstoff für Lernen und Muskelbewegung."],
  alphagpc: ["Cholin ist Baustein von Acetylcholin – dem Botenstoff für Lernen und Muskelbewegung."],
  bacopa: ["Bacopa wird im Ayurveda seit Jahrhunderten fürs Gedächtnis genutzt – Effekte brauchen Wochen."],
  ginkgo: ["Ginkgo gilt als „lebendes Fossil“: Den Baum gibt es seit über 200 Millionen Jahren."],
  cordyceps: ["Wilde Cordyceps wachsen auf Raupen – in Supplements steckt meist gezüchteter Cordyceps militaris."],
  alcar: ["Carnitin bringt Fettsäuren in die Kraftwerke der Zellen, die Mitochondrien."],
  nac: ["NAC wird in Kliniken als Gegenmittel bei Paracetamol-Vergiftungen eingesetzt."],
  nmn: ["Der NAD⁺-Spiegel sinkt mit dem Alter – deshalb interessiert sich die Longevity-Forschung dafür."],
  safran: ["Für 1 kg Safran braucht man rund 150.000 Krokusblüten – daher der Preis."],
  reishi: ["Reishi galt im alten China als „Pilz der Unsterblichkeit“."],
  maca: ["Maca wächst in den Anden auf über 4.000 Metern Höhe."],
  selen: ["Schon zwei Paranüsse können den Tagesbedarf an Selen decken."],
  jod: ["Deutschland gilt als Jodmangelgebiet – deshalb gibt es Jodsalz."],
  folat: ["„Folat“ kommt von lat. folium (Blatt) – grünes Blattgemüse ist reich daran."],
  biotin: ["Hohe Biotin-Dosen können Laborwerte verfälschen, z. B. Schilddrüsen- und Herztests."],
  whey: ["Whey ist das Molkenprotein aus der Käseherstellung – es wird besonders schnell aufgenommen."],
  eaa: ["Es gibt 9 essenzielle Aminosäuren – dein Körper kann sie nicht selbst bilden."],
  hmb: ["HMB entsteht im Körper aus der Aminosäure Leucin."],
  glutamin: ["Glutamin ist die häufigste Aminosäure im Blut."],
  betain: ["Betain wurde zuerst in Zuckerrüben entdeckt – lat. beta heißt Rübe."],
  inositol: ["Inositol wurde früher „Vitamin B8“ genannt."],
  lavendel: ["Lavendelöl-Kapseln (Silexan) sind in Deutschland als Arzneimittel gegen Unruhe zugelassen."],
  flohsamen: ["Flohsamenschalen quellen auf ein Vielfaches ihres Volumens – deshalb immer viel Wasser dazu."],
  berberin: ["Berberin ist knallgelb und wurde früher zum Färben von Stoffen genutzt."],
  quercetin: ["Quercetin steckt in Zwiebeln, Äpfeln und Kapern."],
  ingwer: ["Gegen Reiseübelkeit ist Ingwer in Studien gut belegt."],
  astaxanthin: ["Astaxanthin macht Lachs, Garnelen und Flamingos rosa."],
  hyaluron: ["Hyaluronsäure kann ein Vielfaches ihres Gewichts an Wasser binden."],
  glp1: ["GLP-1 ist ein körpereigenes Darmhormon, das nach dem Essen Sättigung meldet."],
  bpc157: ["BPC steht für „Body Protection Compound“ – es wurde aus Magensaft isoliert."],
}

export const GENERAL_FACTS = [
  "Der Placebo-Effekt ist echt – genau deshalb vergleichen wir mit deinem Reset.",
  "Immer nur eins testen: Nur so weißt du, was wirklich wirkt.",
  "Viele Supplements wirken nur spürbar, wenn vorher ein Mangel da war.",
  "Die Vitamine A, D, E und K sind fettlöslich – sie brauchen eine Mahlzeit mit Fett.",
  "Regelmäßigkeit schlägt Dosis: Jeden Tag zur gleichen Zeit bringt mehr als mal viel.",
]

export interface Fact { id: string; text: string; libId?: string }

export function factsFor(libId: string): Fact[] {
  return (FACTS[libId] ?? []).map((text, i) => ({ id: `${libId}:${i}`, text, libId }))
}

// Nur Fakten zu Supplements, die es in dieser App-Version gibt (Store: ohne Research-Peptide)
const ALL_FACTS: Fact[] = [
  ...Object.keys(FACTS).filter(id => LIB_BY_ID[id]).flatMap(factsFor),
  ...GENERAL_FACTS.map((text, i) => ({ id: `general:${i}`, text })),
]
export const FACT_COUNT = ALL_FACTS.length

/** Nächster noch nicht entdeckter Fakt: zuerst zu deinen Supplements, dann allgemeine, dann der Rest. */
export function nextFact(s: LabState): Fact | null {
  const learned = new Set(s.learned)
  const mine = s.supps.flatMap(x => (x.lib ? factsFor(x.lib) : []))
  const general = ALL_FACTS.filter(f => !f.libId)
  return [...mine, ...general, ...ALL_FACTS].find(f => !learned.has(f.id)) ?? null
}

/** Partner-Tipps, deren Partner du noch nicht in der Liste hast. */
export function partnerTips(s: LabState, suppId: string) {
  const lib = libOf(s.supps.find(x => x.id === suppId))
  if (!lib) return []
  const have = new Set(s.supps.map(x => x.lib ?? x.id))
  return (PARTNERS[lib.id] ?? []).filter(p => !have.has(p.with) && LIB_BY_ID[p.with])
}

/** Nebenwirkungen der letzten Tage (aus den Check-ins). */
export function recentSides(s: LabState, days = 7): Set<string> {
  const today = todayIso()
  const cs = checkinsIn(s, { start: addDays(today, -days + 1), end: today })
  return new Set(cs.flatMap(c => Object.entries(c.sides ?? {}).filter(([, v]) => v > 0).map(([id]) => id)))
}

/** Passende Erklärungen zu Nebenwirkungen, die zu diesem Supplement passen. */
export function sideCauses(s: LabState, suppId: string, sides = recentSides(s)) {
  const lib = libOf(s.supps.find(x => x.id === suppId))
  if (!lib) return []
  return SIDE_CAUSES.filter(c => c.lib === lib.id && c.sides.some(x => sides.has(x)))
    .map(c => ({ ...c, matched: c.sides.filter(x => sides.has(x)) }))
}

/** Entdeckte Fakten (neueste zuerst) — fürs Wissens-Album. */
export function learnedFacts(s: LabState): Fact[] {
  const byId = new Map(ALL_FACTS.map(f => [f.id, f]))
  return [...s.learned].reverse().map(id => byId.get(id)).filter((f): f is Fact => !!f)
}
