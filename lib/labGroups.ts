// ── Gruppen-Steckbriefe: Kopfbild, Symbol und „Worum es hier geht“ je Community ──────────────────
// Ziel-Gruppen haben eigene 3D-Bilder (supplement-lab/public/groups/*.webp, nur Store-App), Supplement-Labs
// nutzen das vorhandene 3D-Symbol. Texte: KEINE Wirkversprechen, keine Dosierungen – nur, was man hier tut.
import { t } from "./labI18n"

export type GroupInfo = {
  /** 2–3 Sätze: Zweck der Gruppe */
  about: string
  /** Kopfbild (Ziel-Gruppen) */
  head?: string
  /** 3D-Symbol statt Emoji (Ziel-Gruppen) */
  icon?: string
}

const img = (kind: "icon" | "head", key: string) => `./groups/${kind}-${key}.webp`

const GOAL_ABOUT: Record<string, () => string> = {
  schlaf: () => t("Hier geht es um eure Nächte: Wie schnell schlaft ihr ein, wie erholt wacht ihr auf? Jeder testet für sich und vergleicht nur mit seinem eigenen Normal."),
  energie: () => t("Für alle, die tagsüber wacher sein wollen. Ihr teilt, was ihr testet und wie sich eure Energie im Vergleich zu eurem Normal verändert hat."),
  fokus: () => t("Konzentration, Kopf, klare Gedanken: Hier zeigt ihr eure Selbsttests rund um Fokus – ehrlich, auch wenn sich nichts geändert hat."),
  stress: () => t("Ruhiger werden, besser abschalten. Hier teilt ihr, wie es euch mit euren Tests geht – jeder in seinem eigenen Tempo."),
  muskel: () => t("Training, Kraft, Leistung: Hier landen eure Selbsttests rund ums Training – mit euren eigenen Daten statt Versprechen."),
  regeneration: () => t("Erholung nach Training und Alltag. Ihr teilt, wie ihr euch erholt fühlt und was ihr dabei gerade testet."),
  darm: () => t("Bauchgefühl im wörtlichen Sinn: Hier geht es um Verdauung und Wohlbefinden – jeder dokumentiert für sich und teilt, was er beobachtet."),
  haut: () => t("Haut und Haare brauchen Geduld. Hier teilt ihr längere Selbsttests und was ihr nach Wochen bei euch seht."),
  longevity: () => t("Der lange Weg: Gewohnheiten, die man über Monate durchzieht. Hier teilt ihr, was ihr testet und wie es euch damit geht."),
  immun: () => t("Rund ums Immunsystem und Wohlbefinden im Alltag. Hier teilt ihr eure Erfahrungen – ohne Heilversprechen, nur eure eigenen Beobachtungen."),
}

/** Steckbrief zu einer Community (kind/key wie lib/labSocialApi SocialCommunity) */
export function groupInfo(c: { kind: "lab" | "goal"; key: string }, labName?: string): GroupInfo {
  if (c.kind === "goal" && GOAL_ABOUT[c.key]) return { about: GOAL_ABOUT[c.key](), head: img("head", c.key), icon: img("icon", c.key) }
  return { about: t("Alles rund um {name}: Hier teilen Leute, die {name} selbst getestet haben, ihr Ergebnis – verglichen mit ihrem eigenen Normal, nicht mit Versprechen.", { name: labName ?? "" }) }
}

/** „So machst du mit“ – drei Schritte, für alle Gruppen gleich */
export function groupSteps(): { emoji: string; title: string; text: string }[] {
  return [
    { emoji: "👋", title: t("Beitreten"), text: t("Einmal tippen – dann siehst du die Beiträge dieser Gruppe auch in deinem Entdecken-Feed.") },
    { emoji: "🔬", title: t("Selbst testen"), text: t("Kolbi begleitet deinen Test: kurzer Check-in am Abend, am Ende dein Ergebnis.") },
    { emoji: "📣", title: t("Ergebnis teilen"), text: t("Nach dem Test: „Ergebnis posten“ antippen. Andere sehen nur Pseudonym, Supplement und Ergebnis.") },
  ]
}
