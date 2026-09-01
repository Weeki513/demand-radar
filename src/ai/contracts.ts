import { z } from "zod"

export const productStructureSchema = z.object({
  positioning: z.string(),
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

export type ProductStructure = z.infer<typeof productStructureSchema>
export type ClusterInsight = z.infer<typeof clusterInsightSchema>
export type PostDraft = z.infer<typeof postDraftSchema>

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
}
