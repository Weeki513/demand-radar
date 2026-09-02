import { z } from "zod"

const evidenceTypeSchema = z.enum([
  "claim",
  "feature",
  "workflow",
  "target_user",
  "use_case",
  "problem",
  "technical_property",
  "metric",
  "benchmark",
  "integration",
  "category",
  "terminology",
])

export const productEvidenceSchema = z.object({
  facts: z.array(z.object({
    id: z.string().min(1).max(80),
    type: evidenceTypeSchema,
    claim: z.string().min(1).max(500),
    sourceUrl: z.string().url().max(2_048),
    sourceText: z.string().min(1).max(1_000),
    confidence: z.number().min(0).max(1),
  })).max(80),
})

const capabilityGroupSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(500),
  supportingFeatures: z.array(z.string().min(1).max(160)).max(12),
  evidenceIds: z.array(z.string().min(1).max(80)).max(20),
  confidence: z.number().min(0).max(1),
})

const differentiatorCandidateSchema = z.object({
  claim: z.string().min(1).max(300),
  evidenceIds: z.array(z.string().min(1).max(80)).max(20),
  confidence: z.number().min(0).max(1),
})

const keywordCandidateSchema = z.object({
  term: z.string().min(1).max(100),
  category: z.enum(["category", "problem", "workflow", "technology", "adjacent"]),
  evidenceIds: z.array(z.string().min(1).max(20)),
})

export const normalizedProductModelSchema = z.object({
  positioning: z.array(z.string().min(1).max(300)).max(3),
  icps: z.array(z.string().min(1).max(300)).max(8),
  problems: z.array(z.string().min(1).max(300)).max(8),
  capabilityGroups: z.array(capabilityGroupSchema).max(12),
  differentiatorCandidates: z.array(differentiatorCandidateSchema).max(8),
  keywordCandidates: z.array(keywordCandidateSchema).max(25),
  privatePlan: z.array(z.string()).max(0),
})

export const productStructureSchema = z.object({
  positioning: z.array(z.string().min(1).max(300)).max(3),
  icp: z.array(z.string()).max(8),
  problems: z.array(z.string()).max(12),
  capabilities: z.array(z.string()).max(20),
  features: z.array(z.string()).max(20),
  usp: z.array(z.string()).max(8),
  keywords: z.array(z.string()).max(30),
})

export const clusterInsightSchema = z.object({
  title: z.string(),
  summary: z.string(),
  explanation: z.string(),
  rationale: z.string(),
})

export const postDraftSchema = z.object({
  title: z.string(),
  body: z.string(),
})

export const contextRewriteSchema = z.object({ text: z.string().trim().min(1).max(2_000) })

export type ProductStructure = z.infer<typeof productStructureSchema>
export type ProductEvidence = z.infer<typeof productEvidenceSchema>
export type NormalizedProductModel = z.infer<typeof normalizedProductModelSchema>
export type ClusterInsight = z.infer<typeof clusterInsightSchema>
export type PostDraft = z.infer<typeof postDraftSchema>
export type ContextRewrite = z.infer<typeof contextRewriteSchema>

export interface TextGenerationProvider {
  structureProduct(input: {
    sourceText: string
    sourceUrl?: string
  }): Promise<ProductStructure>
  explainCluster(input: {
    evidence: Array<{ title: string; excerpt: string; platform: string }>
    score: number
    trend: string
    publicCapabilities: string[]
  }): Promise<ClusterInsight>
  generatePost(input: {
    platform: string
    clusterTitle: string
    publicSummary: string
    evidenceExcerpts: string[]
    tone?: string
  }): Promise<PostDraft>
  rewritePost(input: {
    platform: string
    body: string
    instruction: string
  }): Promise<PostDraft>
  rewriteContext(input: {
    kind: string
    text: string
  }): Promise<ContextRewrite>
}
