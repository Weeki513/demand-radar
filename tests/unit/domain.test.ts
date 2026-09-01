import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicPostInput, redactPrivateContext, assertNoPrivateContextLeak, PrivateContextLeakError } from "../../src/domain/redaction";
import { calculateScore, calculateTrend, classifyOpportunity, isHighConfidenceUnmapped } from "../../src/domain/scoring";
import { canTransitionScan, transitionScan, InvalidScanTransitionError } from "../../src/domain/state-machine";
import type { ContextItem, NormalizedEvidence } from "../../src/domain/contracts";

const signal = (sourceInstanceId: string, publishedAt = "2026-08-31T00:00:00.000Z"): NormalizedEvidence => ({
  sourceKind: "hacker_news",
  sourceInstanceId,
  externalId: `${sourceInstanceId}-1`,
  canonicalUrl: "https://example.com/item",
  title: "Persistent authenticated sessions",
  excerpt: "Keep browser sessions after a restart.",
  collectedAt: "2026-09-01T00:00:00.000Z",
  publishedAt,
  engagement: { normalized: 0.4 },
  provenance: { transport: "api", adapterVersion: "test", requestUrl: "https://example.com/api", retrievedAt: "2026-09-01T00:00:00.000Z" },
  contentHash: "a".repeat(64),
});

test("scoring uses the approved weights and bounded values", () => {
  const result = calculateScore({ signals: [signal("a"), signal("b")], now: new Date("2026-09-01T00:00:00Z"), recentCount: 2, previousCount: 1 });
  assert.equal(result.scoreExplanation.volume.weight, 0.35);
  assert.equal(result.scoreExplanation.sourceDiversity.weight, 0.25);
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.equal(calculateTrend("2026-08-01T00:00:00Z", [{ day: "2026-08-30T00:00:00Z", signalCount: 3 }, { day: "2026-08-20T00:00:00Z", signalCount: 1 }], new Date("2026-09-01T00:00:00Z")), "rising");
});

test("opportunity precedence and confidence guardrails are explicit", () => {
  assert.equal(classifyOpportunity({ publicSimilarity: 0.72, privateSimilarity: 0.99, publicContext: { id: "public" }, privateContext: { id: "private" } }).state, "existing");
  assert.equal(classifyOpportunity({ publicSimilarity: 0.1, privateSimilarity: 0.72, privateContext: { id: "private" } }).state, "roadmap");
  assert.equal(isHighConfidenceUnmapped({ opportunityState: "unmapped", independentSignalCount: 3, independentSourceCount: 2 }), true);
});

test("state machine rejects skipping pipeline stages", () => {
  assert.equal(canTransitionScan("queued", "collecting"), true);
  assert.equal(canTransitionScan("queued", "completed"), false);
  assert.throws(() => transitionScan("queued", "scoring"), InvalidScanTransitionError);
});

test("private context is not sent to public prompts and leaks fail closed", () => {
  const context = [
    { id: "public-feature", kind: "capability", text: "Public analytics", visibility: "public", source: "manual", sortOrder: 0, metadata: {} },
    { id: "roadmap-secret", kind: "roadmap", text: "Private authenticated sessions", visibility: "private", source: "manual", sortOrder: 1, metadata: {} },
  ] as ContextItem[];
  assert.equal(buildPublicPostInput("Demand", [], context).publicContext.length, 1);
  assert.equal(redactPrivateContext("We are building Private authenticated sessions", context).redacted, true);
  assert.throws(() => assertNoPrivateContextLeak("Private authenticated sessions", context), PrivateContextLeakError);
});
