import { z } from "zod";

/** Shared wire contracts between source adapters, the deterministic processor, and the UI. */

export const SourceKindSchema = z.enum([
  "hacker_news",
  "github_issues",
  "github_discussions",
  "stack_exchange",
  "dev",
  "lobsters",
  "rss_atom",
  "gitlab",
  "discourse",
  "canny",
  "product_hunt",
]);
export type SourceKind = z.infer<typeof SourceKindSchema>;

export const TransportSchema = z.enum(["api", "rss", "html", "solari_browser"]);
export type Transport = z.infer<typeof TransportSchema>;

export const EngagementSchema = z
  .object({
    score: z.number().nonnegative().optional(),
    comments: z.number().int().nonnegative().optional(),
    reactions: z.number().int().nonnegative().optional(),
    views: z.number().int().nonnegative().optional(),
    normalized: z.number().min(0).max(1).optional(),
  })
  .passthrough();
export type Engagement = z.infer<typeof EngagementSchema>;

export const ProvenanceSchema = z
  .object({
    transport: TransportSchema,
    adapterVersion: z.string().min(1),
    requestUrl: z.string().url(),
    finalUrl: z.string().url().optional(),
    retrievedAt: z.string().min(1),
    solariRunRef: z.string().min(1).optional(),
    replayRef: z.string().min(1).optional(),
  })
  .passthrough();
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const NormalizedEvidenceSchema = z
  .object({
    sourceKind: SourceKindSchema,
    sourceInstanceId: z.string().min(1),
    externalId: z.string().min(1),
    canonicalUrl: z.string().url(),
    title: z.string().min(1).max(10_000),
    excerpt: z.string().min(1).max(20_000),
    context: z.string().max(50_000).optional(),
    authorRef: z.string().max(500).optional(),
    publishedAt: z.string().min(1).optional(),
    collectedAt: z.string().min(1),
    language: z.string().max(32).optional(),
    engagement: EngagementSchema,
    provenance: ProvenanceSchema,
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    rawPayload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type NormalizedEvidence = z.infer<typeof NormalizedEvidenceSchema>;

export const ContextItemKindSchema = z.enum([
  "positioning",
  "icp",
  "problem",
  "capability",
  "feature",
  "differentiator",
  "roadmap",
  "keyword",
]);
export type ContextItemKind = z.infer<typeof ContextItemKindSchema>;

export const ContextVisibilitySchema = z.enum(["public", "private"]);
export type ContextVisibility = z.infer<typeof ContextVisibilitySchema>;

export const ContextItemSchema = z.object({
  id: z.string().min(1),
  kind: ContextItemKindSchema,
  text: z.string().min(1).max(10_000),
  visibility: ContextVisibilitySchema,
  source: z.enum(["manual", "ai"]),
  sortOrder: z.number().int().nonnegative().default(0),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type ContextItem = z.infer<typeof ContextItemSchema>;

export const SourceConfigSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  adapterKey: z.string().min(1),
  displayName: z.string().min(1),
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).default({}),
});
export type SourceConfig = z.infer<typeof SourceConfigSchema>;

export const ScanStateSchema = z.enum([
  "queued",
  "collecting",
  "processing",
  "clustering",
  "scoring",
  "generating",
  "completed",
  "failed",
]);
export type ScanState = z.infer<typeof ScanStateSchema>;

export const ScanSourceStateSchema = z.enum(["queued", "collecting", "completed", "failed"]);
export type ScanSourceState = z.infer<typeof ScanSourceStateSchema>;

export const OpportunityStateSchema = z.enum(["existing", "roadmap", "unmapped"]);
export type OpportunityState = z.infer<typeof OpportunityStateSchema>;

export const TrendSchema = z.enum(["new", "rising", "stable", "falling"]);
export type Trend = z.infer<typeof TrendSchema>;

export const OpportunityStatusSchema = z.enum(["new", "watching", "accepted", "dismissed", "acted"]);
export type OpportunityStatus = z.infer<typeof OpportunityStatusSchema>;

export const ScoreExplanationSchema = z.object({
  volume: z.object({ value: z.number().min(0).max(1), weight: z.literal(0.35) }),
  sourceDiversity: z.object({ value: z.number().min(0).max(1), weight: z.literal(0.25) }),
  recency: z.object({ value: z.number().min(0).max(1), weight: z.literal(0.2) }),
  momentum: z.object({ value: z.number().min(0).max(1), weight: z.literal(0.15) }),
  engagement: z.object({ value: z.number().min(0).max(1), weight: z.literal(0.05) }),
});
export type ScoreExplanation = z.infer<typeof ScoreExplanationSchema>;

export const DemandClusterSchema = z.object({
  id: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  stableKey: z.string().regex(/^[a-f0-9]{24}$/),
  title: z.string().min(1).max(500),
  score: z.number().int().min(0).max(100),
  scoreExplanation: ScoreExplanationSchema,
  confidence: z.number().min(0).max(1),
  independentSignalCount: z.number().int().nonnegative(),
  independentSourceCount: z.number().int().nonnegative(),
  firstDetectedAt: z.string().min(1).optional(),
  lastDetectedAt: z.string().min(1).optional(),
  trend: TrendSchema,
  relatedPublicContextId: z.string().min(1).optional(),
  relatedPrivateContextId: z.string().min(1).optional(),
  opportunityState: OpportunityStateSchema,
  opportunityStatus: OpportunityStatusSchema.default("new"),
  suggestedAction: z.string().min(1).max(2_000),
  memberIds: z.array(z.string().min(1)),
  algorithmVersion: z.string().min(1),
});
export type DemandCluster = z.infer<typeof DemandClusterSchema>;

export const ScanRunSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  trigger: z.enum(["manual", "scheduled"]),
  status: ScanStateSchema,
  stageAttempt: z.number().int().nonnegative(),
  leaseUntil: z.string().min(1).optional(),
  startedAt: z.string().min(1).optional(),
  completedAt: z.string().min(1).optional(),
  durationMs: z.number().int().nonnegative().optional(),
  sourcesAttempted: z.number().int().nonnegative().default(0),
  sourcesSucceeded: z.number().int().nonnegative().default(0),
  rawSignalsDiscovered: z.number().int().nonnegative().default(0),
  clustersProduced: z.number().int().nonnegative().default(0),
  errorSummary: z.array(z.object({ sourceId: z.string(), code: z.string(), message: z.string() })).default([]),
  pipelineVersion: z.string().min(1),
});
export type ScanRun = z.infer<typeof ScanRunSchema>;

export const AdapterResultSchema = z.object({
  items: z.array(NormalizedEvidenceSchema),
  warnings: z.array(z.string()).default([]),
});
export type AdapterResult = z.infer<typeof AdapterResultSchema>;

export function parseNormalizedEvidence(input: unknown): NormalizedEvidence {
  return NormalizedEvidenceSchema.parse(input);
}

export function parseSourceConfig(input: unknown): SourceConfig {
  return SourceConfigSchema.parse(input);
}
