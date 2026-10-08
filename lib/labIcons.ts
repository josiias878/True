// Supplement-Symbolbilder (3D, Higgsfield) – reiner Anzeige-Helfer.
// Quelle der URLs: supplement-lab/marketing/content/higgsfield/icons.json
// Die Dateien legt der Workflow .github/workflows/fetch-icons.yml unter supplement-lab/public/icons/<id>.webp ab.
// Diese Liste von Hand mit icons.json synchron halten (nur IDs, deren Datei wirklich im Repo liegt).
import { STORE_MODE } from "./supplementLab"

export const SUPP_ICONS: ReadonlySet<string> = new Set([
  "magnesium", "omega3", "vitd", "kreatin", "koffein", "glycin", "melatonin", "theanin", "rhodiola", "ashwagandha", "zink", "eisen", "b12", "bkomplex", "vitc", "probiotika", "citrullin", "betaalanin", "elektrolyte", "kollagen", "q10", "lionsmane", "curcumin", "calcium", "gaba", "apigenin", "baldrian", "lavendel", "taurin", "inositol", "tyrosin", "citicolin", "alphagpc", "bacopa", "ginkgo", "cordyceps", "alcar", "nac", "nmn", "safran", "reishi", "tongkat", "maca", "shilajit", "kupfer", "multivitamin", "selen", "jod", "folat", "biotin", "whey", "eaa", "hmb", "glutamin", "betain", "flohsamen", "berberin", "quercetin", "ingwer", "astaxanthin", "hyaluron",
])

/** Standard-Emoji eigener Mittel ohne Bibliothekseintrag (siehe makeSupp in supplementLab.ts). */
const DEFAULT_CUSTOM_EMOJI = "💊"

/**
 * Bild-URL für ein Mittel oder null (→ Emoji wie bisher).
 * - Bibliotheks-Mittel mit eigenem Bild → ./icons/<id>.webp
 * - Eigenes Mittel ohne Bibliothekseintrag (lib leer) mit Standard-Emoji (💊) oder ohne Emoji
 *   → neutrale Kapsel ./icons/custom.webp; ein bewusst gewähltes anderes Emoji bleibt.
 * - Bibliotheks-Mittel ohne Bild (z. B. Peptide) → null (Emoji).
 * Nur in der Vite-App (Store-Modus, base "./" → relativ zu index.html); die Next-App unter /lab
 * hat keine Icons in ihrem public-Ordner und zeigt weiter Emojis.
 */
export function suppIconSrc(libId: string | undefined | null, emoji?: unknown): string | null {
  if (!STORE_MODE) return null
  if (!libId) {
    const e = typeof emoji === "string" ? emoji.replace(/\uFE0F/g, "").trim() : emoji
    return e == null || e === "" || e === DEFAULT_CUSTOM_EMOJI ? "./icons/custom.webp" : null
  }
  if (!SUPP_ICONS.has(libId)) return null
  return `./icons/${libId}.webp`
}
