import type {
  ContextItem,
  DemandCluster,
  NormalizedEvidence,
  OpportunityState,
  ScoreExplanation,
  Trend,
} from "./contracts";

export const SCORE_WEIGHTS = {
  volume: 0.35,
  sourceDiversity: 0.25,
  recency: 0.2,
  momentum: 0.15,
  engagement: 0.05,
} as const;

export const OPPORTUNITY_THRESHOLD = 0.72;

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

function daysSince(value: string | undefined, now: Date): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, (now.getTime() - timestamp) / 86_400_000);
}

function engagement(signals: readonly NormalizedEvidence[]): number {
  const values = signals
    .map((signal) => signal.engagement.normalized)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length === 0 ? 0 : clamp(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export interface ScoreInput {
  signals: readonly NormalizedEvidence[];
  now?: Date;
  recentCount?: number;
  previousCount?: number;
}

export interface ScoreResult {
  score: number;
  components: Record<keyof typeof SCORE_WEIGHTS, number>;
  scoreExplanation: ScoreExplanation;
}

/** Calculate the approved explainable score, with every component bounded to 0..1. */
export function calculateScore(input: ScoreInput): ScoreResult {
  const now = input.now ?? new Date();
  const signals = input.signals;
  const sourceCount = new Set(signals.map((signal) => signal.sourceInstanceId)).size;
  const latest = signals.reduce<Date | undefined>((result, signal) => {
    if (!signal.publishedAt) return result;
    const candidate = new Date(signal.publishedAt);
    if (!Number.isFinite(candidate.getTime())) return result;
    return !result || candidate > result ? candidate : result;
  }, undefined);
  const recentCount =
    input.recentCount ?? signals.filter((signal) => daysSince(signal.publishedAt, now) <= 7).length;
  const previousCount =
    input.previousCount ??
    signals.filter((signal) => {
      const age = daysSince(signal.publishedAt, now);
      return age > 7 && age <= 14;
    }).length;
  const momentum =
    previousCount === 0
      ? recentCount > 0
        ? 1
        : 0
      : clamp((recentCount / previousCount) / (recentCount / previousCount + 1));
  const components = {
    volume: 1 - Math.exp(-signals.length / 5),
    sourceDiversity: Math.min(sourceCount / 4, 1),
    recency: signals.length === 0 ? 0 : Math.exp(-daysSince(latest?.toISOString(), now) / 30),
    momentum,
    engagement: engagement(signals),
  };
  const score = Math.round(
    100 *
      (SCORE_WEIGHTS.volume * components.volume +
        SCORE_WEIGHTS.sourceDiversity * components.sourceDiversity +
        SCORE_WEIGHTS.recency * components.recency +
        SCORE_WEIGHTS.momentum * components.momentum +
        SCORE_WEIGHTS.engagement * components.engagement),
  );
  const scoreExplanation = {
    volume: { value: components.volume, weight: SCORE_WEIGHTS.volume },
    sourceDiversity: { value: components.sourceDiversity, weight: SCORE_WEIGHTS.sourceDiversity },
    recency: { value: components.recency, weight: SCORE_WEIGHTS.recency },
    momentum: { value: components.momentum, weight: SCORE_WEIGHTS.momentum },
    engagement: { value: components.engagement, weight: SCORE_WEIGHTS.engagement },
  } as ScoreExplanation;
  return { score: clamp(score, 0, 100), components, scoreExplanation };
}

export interface ClusterSnapshotLike {
  day: string;
  signalCount: number;
  sourceCount?: number;
}

/** Apply the fixed 14-day / 1.2x / 0.8x trend policy. */
export function calculateTrend(
  firstDetectedAt: string | undefined,
  snapshots: readonly ClusterSnapshotLike[],
  now = new Date(),
): Trend {
  if (!firstDetectedAt || daysSince(firstDetectedAt, now) < 14) return "new";
  const recent = snapshots
    .filter((snapshot) => daysSince(snapshot.day, now) <= 7)
    .reduce((sum, snapshot) => sum + snapshot.signalCount, 0);
  const previous = snapshots
    .filter((snapshot) => {
      const age = daysSince(snapshot.day, now);
      return age > 7 && age <= 14;
    })
    .reduce((sum, snapshot) => sum + snapshot.signalCount, 0);
  if (recent === 0 && previous === 0) return "stable";
  if (recent >= previous * 1.2) return "rising";
  if (recent <= previous * 0.8) return "falling";
  return "stable";
}

export function confidenceForCluster(signalCount: number, sourceCount: number): number {
  return clamp(0.6 * Math.min(signalCount / 3, 1) + 0.4 * Math.min(sourceCount / 2, 1));
}

export function isHighConfidenceUnmapped(cluster: Pick<DemandCluster, "opportunityState" | "independentSignalCount" | "independentSourceCount">): boolean {
  return (
    cluster.opportunityState === "unmapped" &&
    cluster.independentSignalCount >= 3 &&
    cluster.independentSourceCount >= 2
  );
}

export interface OpportunityMatch {
  publicContext?: Pick<ContextItem, "id">;
  privateContext?: Pick<ContextItem, "id">;
  publicSimilarity: number;
  privateSimilarity: number;
}

/** Public capability wins over private roadmap at the approved 0.72 threshold. */
export function classifyOpportunity(match: OpportunityMatch): {
  state: OpportunityState;
  relatedPublicContextId?: string;
  relatedPrivateContextId?: string;
  matchingSimilarity: number;
} {
  if (match.publicSimilarity >= OPPORTUNITY_THRESHOLD) {
    return {
      state: "existing",
      relatedPublicContextId: match.publicContext?.id,
      matchingSimilarity: match.publicSimilarity,
    };
  }
  if (match.privateSimilarity >= OPPORTUNITY_THRESHOLD) {
    return {
      state: "roadmap",
      relatedPrivateContextId: match.privateContext?.id,
      matchingSimilarity: match.privateSimilarity,
    };
  }
  return { state: "unmapped", matchingSimilarity: Math.max(match.publicSimilarity, match.privateSimilarity) };
}
