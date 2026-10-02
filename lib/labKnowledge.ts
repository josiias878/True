// ── Kolbis Wissen: Partner-Tipps, Nebenwirkungs-Ursachen, kurze Fakten ─────────
// Bewusst kurz und vorsichtig formuliert: Wissen und Denkanstöße, keine Diagnose.

import { t } from "./labI18n"
import { LIB_BY_ID, libOf, checkinsIn, todayIso, addDays, type LabState } from "./supplementLab"

/** Passt gut zusammen bzw. gleicht etwas aus — wird nur vorgeschlagen, wenn der Partner noch fehlt. */
export interface Partner { with: string; title: string; text: string }

export const PARTNERS: Record<string, Partner[]> = {
  zink: [{ with: "kupfer", title: t("Zink braucht Kupfer im Blick"),
    text: t("Zink bremst auf Dauer die Kupfer-Aufnahme. Wer über Monate höher dosiert, kann in einen Kupfermangel rutschen (Müdigkeit, Blutarmut). Viele nehmen deshalb ein Zink-Präparat mit etwas Kupfer – im Zweifel Blutwerte checken.") }],
  vitd: [{ with: "magnesium", title: t("Vitamin D braucht Magnesium"),
    text: t("Um Vitamin D zu aktivieren, verbraucht der Körper Magnesium. Bei hohen D-Dosen lohnt es sich, auf genug Magnesium zu achten.") }],
  calcium: [{ with: "vitd", title: t("Calcium braucht Vitamin D"),
    text: t("Vitamin D trägt zur normalen Aufnahme von Calcium aus dem Darm bei.") }],
  eisen: [{ with: "vitc", title: t("Eisen + Vitamin C"),
    text: t("Vitamin C erhöht die Eisenaufnahme – z. B. ein Glas O-Saft oder eine Kapsel dazu.") }],
  koffein: [{ with: "theanin", title: t("Kaffee + L-Theanin"),
    text: t("L-Theanin (aus Grüntee) wird oft mit Kaffee kombiniert – viele empfinden das als ruhiger und weniger zittrig.") }],
  b12: [{ with: "folat", title: t("B12 und Folat sind ein Team"),
    text: t("Beide arbeiten bei Blutbildung und Nerven zusammen. Fehlt eins, kann das andere seinen Job schlechter machen.") }],
  folat: [{ with: "b12", title: t("Folat und B12 sind ein Team"),
    text: t("Viel Folat kann einen B12-Mangel verdecken. Deshalb werden die beiden oft zusammen genommen.") }],
  whey: [{ with: "kreatin", title: t("Eiweiß + Kreatin"),
    text: t("Kreatin gehört zu den am besten untersuchten Supplements im Kraftsport und passt gut zu einem Eiweiß-Fokus.") }],
}

/** Nebenwirkung, während man X nimmt → typische Ursache und was meist hilft. */
export interface SideCause { lib: string; sides: string[]; text: string; add?: string }

export const SIDE_CAUSES: SideCause[] = [
  { lib: "magnesium", sides: ["durchfall", "blaehungen"], text: t("Magnesium zieht Wasser in den Darm. Glycinat statt Citrat oder die Dosis auf zwei Portionen aufteilen hilft meist.") },
  { lib: "zink", sides: ["uebelkeit"], text: t("Zink auf leeren Magen macht oft Übelkeit – nimm es zu einer Mahlzeit.") },
  { lib: "zink", sides: ["muede"], text: t("Nimmst du Zink schon länger höher dosiert? Dann kann ein Kupfermangel dahinterstecken. Kupfer im Blick behalten, im Zweifel Blutbild."), add: "kupfer" },
  { lib: "eisen", sides: ["verstopfung", "uebelkeit"], text: t("Eisen schlägt oft auf den Magen. Niedrigere Dosis, jeden 2. Tag oder Eisen-Bisglycinat sind meist besser verträglich.") },
  { lib: "kreatin", sides: ["blaehungen", "durchfall", "wasser"], text: t("Kreatin zieht Wasser in die Muskeln. Genug trinken und die Portion aufteilen hilft; 1–2 kg mehr auf der Waage sind normal.") },
  { lib: "omega3", sides: ["uebelkeit", "blaehungen"], text: t("Fischaufstoßen? Zu einer Mahlzeit nehmen oder die Kapseln im Gefrierfach lagern.") },
  { lib: "koffein", sides: ["schlafprob", "unruhe", "herzrasen"], text: t("Nach 5–6 Stunden ist noch rund die Hälfte des Koffeins im Blut. Letzte Tasse spätestens 8 h vor dem Schlafen; manche kombinieren Kaffee mit L-Theanin."), add: "theanin" },
  { lib: "melatonin", sides: ["kopfschmerz", "traeume", "muede"], text: t("Kopfschmerzen, lebhafte Träume oder ein dumpfer Morgen hängen bei Melatonin oft mit der Stärke zusammen. Vergleiche mit der Packungsangabe und frag bei Unsicherheit in der Apotheke.") },
  { lib: "betaalanin", sides: ["kribbeln"], text: t("Das Kribbeln ist harmlos. Kleinere Portionen über den Tag verteilt verhindern es.") },
  { lib: "b12", sides: ["schlafprob", "unruhe"], text: t("B-Vitamine können aktivieren – nimm sie morgens statt abends.") },
  { lib: "bkomplex", sides: ["schlafprob", "unruhe"], text: t("B-Vitamine können aktivieren – nimm sie morgens statt abends.") },
  { lib: "rhodiola", sides: ["unruhe", "schlafprob"], text: t("Rhodiola kann wach machen – nur morgens nehmen, nicht nach 14 Uhr.") },
  { lib: "tyrosin", sides: ["unruhe", "schlafprob"], text: t("Tyrosin kann wach machen – nur morgens nehmen, nicht nach 14 Uhr.") },
  { lib: "alcar", sides: ["unruhe", "schlafprob"], text: t("Carnitin kann aktivieren – nur morgens nehmen.") },
  { lib: "ashwagandha", sides: ["muede"], text: t("Ashwagandha kann müde machen – dann besser abends nehmen.") },
  { lib: "flohsamen", sides: ["blaehungen", "verstopfung"], text: t("Mit wenig anfangen und viel Wasser trinken (mind. 300 ml pro Portion) – sonst bläht und stopft es.") },
  { lib: "berberin", sides: ["verstopfung", "durchfall", "blaehungen", "uebelkeit"], text: t("Berberin zu einer Mahlzeit nehmen und langsam steigern – der Darm gewöhnt sich meist.") },
  { lib: "vitc", sides: ["durchfall", "blaehungen"], text: t("Hohe Vitamin-C-Dosen wirken abführend – Dosis teilen oder reduzieren.") },
  { lib: "probiotika", sides: ["blaehungen"], text: t("Blähungen am Anfang sind häufig und legen sich meist nach 1–2 Wochen.") },
  { lib: "glp1", sides: ["uebelkeit", "verstopfung", "durchfall", "blaehungen"], text: t("Typisch für GLP-1, v. a. nach einer Dosis-Erhöhung. Kleinere Mahlzeiten helfen – bei starken Beschwerden ärztlich melden.") },
  { lib: "alphagpc", sides: ["kopfschmerz"], text: t("Cholin kann Kopfschmerzen machen – eine kleinere Dosis probieren.") },
  { lib: "citicolin", sides: ["kopfschmerz"], text: t("Cholin kann Kopfschmerzen machen – eine kleinere Dosis probieren.") },
  { lib: "bacopa", sides: ["uebelkeit", "durchfall"], text: t("Bacopa immer zu einer fettreichen Mahlzeit nehmen – dann ist es magenfreundlicher.") },
  { lib: "nac", sides: ["uebelkeit"], text: t("NAC mit viel Wasser nehmen; bei empfindlichem Magen zu einer Mahlzeit.") },
]

/** Kurze Fakten zum Mitlernen. */
export const FACTS: Record<string, string[]> = {
  magnesium: [t("Über 300 Enzyme im Körper brauchen Magnesium – für Muskeln, Nerven und Energie."), t("Die Form macht den Unterschied: Citrat wirkt eher abführend, Glycinat ist magenfreundlich.")],
  glycin: [t("In Studien sank mit Glycin die Körpertemperatur leicht – ein Signal, das zum Einschlafen gehört.")],
  melatonin: [t("Melatonin ist eher ein Zeitgeber als ein Schlafmittel: Es sagt dem Körper „jetzt ist Nacht“."), t("Bei Melatonin ist mehr nicht automatisch besser – die Stärken unterscheiden sich von Packung zu Packung stark.")],
  theanin: [t("L-Theanin steckt natürlich im Grüntee – ein Grund, warum viele Tee als ruhiger empfinden als Kaffee.")],
  koffein: [t("Koffein hat eine Halbwertszeit von ca. 5 Stunden: Der Kaffee um 16 Uhr ist um 21 Uhr noch halb im Blut."), t("Koffein blockiert Adenosin – den Botenstoff, der Müdigkeit meldet.")],
  rhodiola: [t("Rhodiola wächst in kalten Bergregionen und wurde dort traditionell in fordernden Zeiten genutzt.")],
  ashwagandha: [t("„Ashwagandha“ heißt auf Sanskrit ungefähr „Geruch des Pferdes“ – wegen der Wurzel."), t("Studien deuten auf niedrigere Cortisol-Werte hin – wenn, dann erst nach einigen Wochen.")],
  vitd: [t("Vitamin D ist eigentlich ein Hormon, das die Haut mit Sonnenlicht bildet."), t("In Deutschland reicht die Sonne von Oktober bis März meist nicht für genug Vitamin D.")],
  omega3: [t("Fische haben ihr Omega-3 aus Algen – Algenöl ist die vegane Quelle."), t("Leinöl liefert nur eine Vorstufe, die der Körper schlecht in EPA/DHA umwandelt.")],
  zink: [t("Zink ist an über 300 Enzymen beteiligt, z. B. für Immunsystem, Haut und Stoffwechsel."), t("Zink und Kupfer konkurrieren im Darm um dieselbe Aufnahme.")],
  kupfer: [t("Kupfer brauchst du für rote Blutkörperchen und Bindegewebe – Nüsse und Kakao sind gute Quellen.")],
  eisen: [t("Kaffee und Tee können die Eisenaufnahme um mehr als die Hälfte senken."), t("Zu viel Eisen schadet – deshalb nur nach Blutbild (Ferritin).")],
  b12: [t("Vitamin B12 steckt fast nur in tierischen Lebensmitteln – bei veganer Ernährung ist es Pflicht.")],
  bkomplex: [t("Der knallgelbe Urin nach B-Vitaminen kommt von Riboflavin (B2) – harmlos.")],
  vitc: [t("Menschen können Vitamin C nicht selbst bilden – im Gegensatz zu fast allen Tieren.")],
  probiotika: [t("Bakterienkulturen sind stammspezifisch: Jede Sorte verhält sich anders – deshalb lohnt der eigene Test.")],
  kreatin: [t("Kreatin ist eines der am besten untersuchten Supplements überhaupt."), t("Dein Körper bildet selbst etwa 1 g Kreatin pro Tag.")],
  citrullin: [t("Der Name kommt von der Wassermelone (Citrullus) – dort wurde Citrullin entdeckt."), t("Citrullin wird im Körper zu Arginin – das weitet die Blutgefäße (der „Pump“).")],
  betaalanin: [t("Das Kribbeln nach Beta-Alanin heißt Parästhesie – harmlos und nach ca. 1 Stunde vorbei.")],
  elektrolyte: [t("Kopfweh bei Low-Carb („Keto-Grippe“) kommt oft von zu wenig Natrium.")],
  kollagen: [t("Kollagen ist das häufigste Eiweiß im Körper – es hält Haut, Sehnen und Knochen zusammen.")],
  q10: [t("Cholesterinsenker (Statine) senken auch den körpereigenen Q10-Spiegel.")],
  lionsmane: [t("Auf Deutsch heißt Lion's Mane „Igelstachelbart“ – er sieht aus wie eine Löwenmähne.")],
  curcumin: [t("Ohne schwarzen Pfeffer (Piperin) wird Curcumin kaum aufgenommen.")],
  calcium: [t("99 % des Calciums im Körper stecken in Knochen und Zähnen.")],
  gaba: [t("GABA ist die wichtigste „Bremse“ unter den Botenstoffen im Gehirn.")],
  apigenin: [t("Eine Tasse Kamillentee enthält nur wenige Milligramm Apigenin – Kapseln deutlich mehr.")],
  baldrian: [t("Für viele riecht Baldrian unangenehm – Katzen lieben den Geruch.")],
  taurin: [t("Taurin steckt in Energydrinks, gilt aber eher als beruhigend als aufputschend.")],
  tyrosin: [t("Aus Tyrosin baut der Körper Dopamin, Noradrenalin und Schilddrüsenhormone.")],
  citicolin: [t("Cholin ist Baustein von Acetylcholin – dem Botenstoff für Lernen und Muskelbewegung.")],
  alphagpc: [t("Cholin ist Baustein von Acetylcholin – dem Botenstoff für Lernen und Muskelbewegung.")],
  bacopa: [t("Bacopa wird im Ayurveda seit Jahrhunderten fürs Gedächtnis genutzt – Studien dazu laufen über viele Wochen.")],
  ginkgo: [t("Ginkgo gilt als „lebendes Fossil“: Den Baum gibt es seit über 200 Millionen Jahren.")],
  cordyceps: [t("Wilde Cordyceps wachsen auf Raupen – in Supplements steckt meist gezüchteter Cordyceps militaris.")],
  alcar: [t("Carnitin bringt Fettsäuren in die Kraftwerke der Zellen, die Mitochondrien.")],
  nac: [t("NAC wird in Kliniken als Gegenmittel bei Paracetamol-Vergiftungen eingesetzt.")],
  nmn: [t("Der NAD⁺-Spiegel sinkt mit dem Alter – deshalb interessiert sich die Longevity-Forschung dafür.")],
  safran: [t("Für 1 kg Safran braucht man rund 150.000 Krokusblüten – daher der Preis.")],
  reishi: [t("Reishi galt im alten China als „Pilz der Unsterblichkeit“.")],
  maca: [t("Maca wächst in den Anden auf über 4.000 Metern Höhe.")],
  selen: [t("Schon zwei Paranüsse können den Tagesbedarf an Selen decken.")],
  jod: [t("Deutschland gilt als Jodmangelgebiet – deshalb gibt es Jodsalz.")],
  folat: [t("„Folat“ kommt von lat. folium (Blatt) – grünes Blattgemüse ist reich daran.")],
  biotin: [t("Hohe Biotin-Dosen können Laborwerte verfälschen, z. B. Schilddrüsen- und Herztests.")],
  whey: [t("Whey ist das Molkenprotein aus der Käseherstellung – es wird besonders schnell aufgenommen.")],
  eaa: [t("Es gibt 9 essenzielle Aminosäuren – dein Körper kann sie nicht selbst bilden.")],
  hmb: [t("HMB entsteht im Körper aus der Aminosäure Leucin.")],
  glutamin: [t("Glutamin ist die häufigste Aminosäure im Blut.")],
  betain: [t("Betain wurde zuerst in Zuckerrüben entdeckt – lat. beta heißt Rübe.")],
  inositol: [t("Inositol wurde früher „Vitamin B8“ genannt.")],
  lavendel: [t("Bestimmte Lavendelöl-Kapseln (Silexan) sind in Deutschland als pflanzliches Arzneimittel zugelassen.")],
  flohsamen: [t("Flohsamenschalen quellen auf ein Vielfaches ihres Volumens – deshalb immer viel Wasser dazu.")],
  berberin: [t("Berberin ist knallgelb und wurde früher zum Färben von Stoffen genutzt.")],
  quercetin: [t("Quercetin steckt in Zwiebeln, Äpfeln und Kapern.")],
  ingwer: [t("Ingwer wird seit Jahrhunderten als Gewürz und Tee genutzt – gern auch auf Reisen.")],
  astaxanthin: [t("Astaxanthin macht Lachs, Garnelen und Flamingos rosa.")],
  hyaluron: [t("Hyaluronsäure kann ein Vielfaches ihres Gewichts an Wasser binden.")],
  glp1: [t("GLP-1 ist ein körpereigenes Darmhormon, das nach dem Essen Sättigung meldet.")],
  bpc157: [t("BPC steht für „Body Protection Compound“ – es wurde aus Magensaft isoliert.")],
}

export const GENERAL_FACTS = [
  t("Der Placebo-Effekt ist echt – genau deshalb vergleichen wir mit deinem Reset."),
  t("Immer nur eins testen: Nur so weißt du, was bei dir wirklich wirkt."),
  t("Bei vielen Supplements merkt man nur etwas, wenn vorher ein Mangel da war."),
  t("Die Vitamine A, D, E und K sind fettlöslich – sie brauchen eine Mahlzeit mit Fett."),
  t("Regelmäßigkeit schlägt Dosis: Jeden Tag zur gleichen Zeit bringt mehr als mal viel."),
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
