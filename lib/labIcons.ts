// Supplement-Symbolbilder (3D, Higgsfield) – reiner Anzeige-Helfer.
// Quelle der URLs: supplement-lab/marketing/content/higgsfield/icons.json
// Die Dateien legt der Workflow .github/workflows/fetch-icons.yml unter supplement-lab/public/icons/<id>.webp ab.
// Diese Liste von Hand mit icons.json synchron halten (nur IDs, deren Datei wirklich im Repo liegt).
import { STORE_MODE } from "./supplementLab"

export const SUPP_ICONS: ReadonlySet<string> = new Set(["magnesium", "omega3", "vitd", "kreatin", "koffein"])

/**
 * Bild-URL für ein Bibliotheks-Mittel oder null (→ Emoji wie bisher).
 * Nur in der Vite-App (Store-Modus, base "./" → relativ zu index.html); die Next-App unter /lab
 * hat keine Icons in ihrem public-Ordner und zeigt weiter Emojis.
 */
export function suppIconSrc(libId: string | undefined | null): string | null {
  if (!STORE_MODE || !libId || !SUPP_ICONS.has(libId)) return null
  return `./icons/${libId}.webp`
}
