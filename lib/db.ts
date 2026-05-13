import data from "../data/seed.json"

export type EvidenceLevel = "verified" | "pending" | "disputed"
export type Severity = "low" | "medium" | "high" | "critical"
export type BotStatus = "pending" | "processing" | "done" | "error"

export interface Evidence {
  id: string; title: string; source: string
  url?: string; date: string; level: EvidenceLevel
}
export interface Category {
  id: string; name: string; description: string
  icon: string; createdBy: "auto" | "manual"; createdAt: string
}
export interface Corporation {
  id: string; name: string; aliases: string[]
  categoryIds: string[]; evidenceIds: string[]
  severity: Severity; lastUpdated: string
}
export interface BotIngestion {
  id: string; rawText: string; source: string
  processedAt?: string; extractedCorporations: string[]
  extractedCategories: string[]; status: BotStatus
}

// In-memory store (in production: use a real DB)
const store = {
  categories: data.categories as Category[],
  corporations: data.corporations as Corporation[],
  evidence: data.evidence as Evidence[],
  ingestions: [] as BotIngestion[],
}

export function getCategories() { return store.categories }
export function getCorporations() { return store.corporations }
export function getEvidence() { return store.evidence }
export function getIngestions() { return store.ingestions }

export function addCategory(cat: Category) {
  store.categories.push(cat)
  return cat
}
export function addCorporation(corp: Corporation) {
  store.corporations.push(corp)
  return corp
}
export function addEvidence(ev: Evidence) {
  store.evidence.push(ev)
  return ev
}
export function addIngestion(ing: BotIngestion) {
  store.ingestions.push(ing)
  return ing
}
export function updateIngestion(id: string, updates: Partial<BotIngestion>) {
  const idx = store.ingestions.findIndex(i => i.id === id)
  if (idx >= 0) store.ingestions[idx] = { ...store.ingestions[idx], ...updates }
}

export function lookupByName(query: string): Corporation | undefined {
  const q = query.toLowerCase()
  return store.corporations.find(c =>
    c.name.toLowerCase().includes(q) ||
    c.aliases.some(a => a.toLowerCase().includes(q))
  )
}

export function getStats() {
  return {
    corporations: store.corporations.length,
    categories: store.categories.length,
    evidence: store.evidence.length,
    critical: store.corporations.filter(c => c.severity === "critical").length,
  }
}
