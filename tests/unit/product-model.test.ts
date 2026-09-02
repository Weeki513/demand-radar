import assert from "node:assert/strict"
import test from "node:test"

import type { NormalizedProductModel, ProductEvidence } from "../../src/ai/contracts"
import { finalizeProductModel } from "../../src/ai/product-model"

const evidence: ProductEvidence = {
  facts: [
    { id: "browser", type: "feature", claim: "Cloud browsers support scraping and authenticated workflows.", sourceUrl: "https://example.com", sourceText: "Cloud browsers for scraping and authenticated workflows", confidence: 0.98 },
    { id: "sandbox", type: "feature", claim: "Isolated sandboxes run code and tools.", sourceUrl: "https://example.com", sourceText: "Run code in isolated sandboxes", confidence: 0.98 },
    { id: "desktop", type: "feature", claim: "Full desktops support GUI automation.", sourceUrl: "https://example.com", sourceText: "Computer desktops for GUI automation", confidence: 0.96 },
    { id: "benchmark", type: "benchmark", claim: "Environments resume in 400ms in the published benchmark.", sourceUrl: "https://example.com/benchmarks", sourceText: "Resume in 400ms", confidence: 0.95 },
  ],
}

const baseModel = (overrides: Partial<NormalizedProductModel> = {}): NormalizedProductModel => ({
  positioning: ["Infrastructure for agent workloads", "Infrastructure for agent workloads"],
  icps: ["Teams building autonomous AI agents", "Teams building autonomous AI agents"],
  problems: ["Teams need reliable automation", "Teams need reliable automation"],
  capabilityGroups: [],
  differentiatorCandidates: [],
  keywordCandidates: [],
  privatePlan: [],
  ...overrides,
})

test("collapses implementation details into broad capability groups", () => {
  const result = finalizeProductModel(baseModel({
    capabilityGroups: [
      { name: "Cloud browsers", description: "Scraping and authenticated browser workflows with Playwright, CDP, stealth, proxies, and CAPTCHA handling.", supportingFeatures: ["Playwright", "CDP", "Stealth"], evidenceIds: ["browser"], confidence: 0.98 },
      { name: "Isolated sandboxes", description: "Secure environments for code execution and agent tools.", supportingFeatures: ["Code execution"], evidenceIds: ["sandbox"], confidence: 0.98 },
      { name: "Computer desktops", description: "Full GUI and operating-system automation environments.", supportingFeatures: ["GUI automation"], evidenceIds: ["desktop"], confidence: 0.96 },
    ],
  }), evidence)

  assert.equal(result.capabilities.length, 3)
  assert.match(result.capabilities[0], /Playwright/)
  assert.ok(!result.capabilities.some((item) => item === "Playwright" || item === "CDP"))
})

test("deduplicates repeated positioning, ICP, and problem copy", () => {
  const result = finalizeProductModel(baseModel({
    positioning: ["A reliable automation platform", "Reliable automation platform"],
    icps: ["Automation platforms running browser workflows", "Automation platforms that run browser workflows"],
    problems: ["Workers fail during long workflows", "Long workflows fail on workers"],
  }), evidence)

  assert.equal(result.positioning.length, 1)
  assert.equal(result.icp.length, 1)
  assert.equal(result.problems.length, 1)
})

test("keeps genuinely separate product surfaces and grounded benchmarks", () => {
  const result = finalizeProductModel(baseModel({
    capabilityGroups: [
      { name: "Browser automation", description: "Automate authenticated web workflows.", supportingFeatures: [], evidenceIds: ["browser"], confidence: 0.98 },
      { name: "Code execution", description: "Run agent tools in isolated environments.", supportingFeatures: [], evidenceIds: ["sandbox"], confidence: 0.98 },
      { name: "GUI automation", description: "Operate full computer desktops.", supportingFeatures: [], evidenceIds: ["desktop"], confidence: 0.96 },
    ],
    differentiatorCandidates: [
      { claim: "Environments resume in 400ms in the published benchmark.", evidenceIds: ["benchmark"], confidence: 0.95 },
      { claim: "Fast and scalable", evidenceIds: [], confidence: 0.2 },
    ],
  }), evidence)

  assert.equal(result.capabilities.length, 3)
  assert.deepEqual(result.usp, ["Environments resume in 400ms in the published benchmark."])
})

test("does not invent output for sparse evidence or private roadmap", () => {
  const result = finalizeProductModel(baseModel({
    positioning: [],
    icps: [],
    problems: [],
    capabilityGroups: [],
    differentiatorCandidates: [],
    keywordCandidates: [],
    privatePlan: [],
  }), { facts: [] })

  assert.deepEqual(result.positioning, [])
  assert.deepEqual(result.capabilities, [])
  assert.deepEqual(result.usp, [])
  assert.deepEqual(result.features, [])
})
