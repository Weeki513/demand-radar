import type { NormalizedProductModel, ProductEvidence, ProductStructure } from "@/ai/contracts"

const LIMITS = { positioning: 3, icps: 6, problems: 6, capabilities: 8, differentiators: 6, keywords: 15 } as const
const genericWords = new Set(["fast", "secure", "scalable", "reliable", "flexible", "powerful", "easy", "simple", "modern", "robust"])

function tokens(value: string) {
  return new Set(value.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, " ").split(/\s+/).filter((token) => token.length > 2).map((token) => {
    if (token.endsWith("ing") && token.length > 6) {
      const stem = token.slice(0, -3)
      return stem.length > 1 && stem.at(-1) === stem.at(-2) ? stem.slice(0, -1) : stem
    }
    if (token.endsWith("s") && token.length > 4) return token.slice(0, -1)
    return token
  }))
}

function distinct<T>(values: T[], textOf: (value: T) => string) {
  const result: T[] = []
  for (const value of values) {
    const current = tokens(textOf(value))
    if (!current.size) continue
    const duplicate = result.some((existing) => {
      const previous = tokens(textOf(existing))
      const overlap = [...current].filter((token) => previous.has(token)).length
      return overlap / Math.max(current.size, previous.size) >= 0.8
    })
    if (!duplicate) result.push(value)
  }
  return result
}

function grounded<T extends { evidenceIds: string[] }>(values: T[], evidence: ProductEvidence) {
  const known = new Set(evidence.facts.map((fact) => fact.id))
  return values.filter((value) => value.evidenceIds.some((id) => known.has(id)))
}

function keepDifferentiator(claim: string) {
  const words = [...tokens(claim)]
  return words.length > 2 && !(words.length <= 5 && words.every((word) => genericWords.has(word)))
}

export function finalizeProductModel(model: NormalizedProductModel, evidence: ProductEvidence): ProductStructure {
  const positioning = distinct(model.positioning, (value) => value).slice(0, LIMITS.positioning)
  const icp = distinct(model.icps, (value) => value).slice(0, LIMITS.icps)
  const problems = distinct(model.problems, (value) => value).slice(0, LIMITS.problems)
  const capabilities = distinct(
    grounded(model.capabilityGroups, evidence),
    (value) => `${value.name} ${value.description}`,
  ).slice(0, LIMITS.capabilities).map((value) => `${value.name}: ${value.description}`)
  const differentiators = distinct(
    grounded(model.differentiatorCandidates, evidence).filter((value) => keepDifferentiator(value.claim)),
    (value) => value.claim,
  ).slice(0, LIMITS.differentiators).map((value) => value.claim)
  const keywords = distinct(
    grounded(model.keywordCandidates, evidence),
    (value) => value.term,
  ).slice(0, LIMITS.keywords).map((value) => value.term)

  return { positioning, icp, problems, capabilities, features: [], usp: differentiators, keywords }
}
