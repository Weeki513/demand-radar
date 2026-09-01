import "server-only"

import { randomUUID } from "node:crypto"

import { OpenAITextGenerationProvider } from "@/ai/openai-provider"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { processEvidenceInSolariSandbox } from "@/solari/sandbox"
import { SolariBrowserFetcher } from "@/solari/source-browser"
import { sourceAdapters, SourceHttpError } from "@/sources"
import type { NormalizedEvidence, SourceConfig } from "@/domain/contracts"

type Row = Record<string, unknown>

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function sourceConfigFromRow(row: Row): SourceConfig {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    adapterKey: String(row.adapter_key),
    displayName: String(row.display_name),
    enabled: Boolean(row.enabled),
    config: (row.config as Record<string, unknown>) ?? {},
  }
}

function evidenceInsert(productId: string, sourceConfigId: string, item: NormalizedEvidence) {
  return {
    product_id: productId,
    source_config_id: sourceConfigId,
    external_id: item.externalId,
    canonical_url: item.canonicalUrl,
    title: item.title,
    excerpt: item.excerpt,
    context: item.context ?? "",
    author_ref: item.authorRef ?? null,
    published_at: item.publishedAt ?? null,
    collected_at: item.collectedAt,
    language: item.language ?? null,
    engagement: item.engagement,
    content_hash: item.contentHash,
    provenance: item.provenance,
    raw_payload: item.rawPayload ?? null,
  }
}

function evidenceForProcessor(row: Row) {
  return {
    sourceKind: String((row.provenance as Row)?.sourceKind ?? "unknown"),
    sourceInstanceId: String(row.source_config_id),
    externalId: String(row.external_id),
    canonicalUrl: String(row.canonical_url),
    title: String(row.title),
    excerpt: String(row.excerpt),
    context: String(row.context ?? ""),
    authorRef: row.author_ref,
    publishedAt: row.published_at,
    collectedAt: row.collected_at,
    language: row.language,
    engagement: row.engagement,
    provenance: row.provenance,
    contentHash: String(row.content_hash),
  }
}

async function collectOneSource(run: Row, workerId: string) {
  const admin = createSupabaseAdminClient()
  const { data: claimed, error: claimError } = await admin.rpc("claim_scan_source_attempt", {
    p_scan_run_id: run.id,
    p_worker_id: workerId,
    p_lease_seconds: 120,
  })
  if (claimError) throw new Error(claimError.message)
  const attempt = one(claimed as Row | Row[] | null)
  if (!attempt) return { kind: "idle" as const }

  const { data: configRow, error: configError } = await admin
    .from("source_configs")
    .select("*")
    .eq("id", attempt.source_config_id)
    .single()
  if (configError) throw new Error(configError.message)
  const config = sourceConfigFromRow(configRow as Row)
  const adapter = sourceAdapters.find((candidate) => candidate.supports(config))

  try {
    if (!adapter) throw new Error(`No adapter registered for ${config.adapterKey}`)
    const controller = new AbortController()
    const result = await adapter.collect({
      config,
      lookbackDays: 30,
      signal: controller.signal,
      timeoutMs: 20_000,
      browser: new SolariBrowserFetcher(),
    })
    if (result.items.length) {
      const { error: evidenceError } = await admin
        .from("evidence_items")
        .upsert(
          result.items.map((item) => evidenceInsert(String(run.product_id), config.id, item)),
          { onConflict: "product_id,source_config_id,external_id" },
        )
      if (evidenceError) throw new Error(evidenceError.message)
    }
    const { error: finishError } = await admin.rpc("complete_scan_source_attempt", {
      p_attempt_id: attempt.id,
      p_worker_id: workerId,
      p_status: "completed",
      p_raw_count: result.items.length,
      p_normalized_count: result.items.length,
      p_error_code: result.warnings.length ? "SOURCE_WARNING" : null,
      p_error_message: result.warnings.join("; ").slice(0, 2_000) || null,
    })
    if (finishError) throw new Error(finishError.message)
    return { kind: "source" as const, source: config.adapterKey, count: result.items.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Source collection failed"
    const status = error instanceof SourceHttpError ? error.status : undefined
    const attemptCount = Number(attempt.attempt_count ?? 1)
    const retryable =
      attemptCount < 3 &&
      !(config.adapterKey.includes("solari") && (status === 402 || status === 429)) &&
      (!(error instanceof SourceHttpError) || error.retryable)

    if (retryable) {
      const delaySeconds = Math.min(120, 2 ** attemptCount * 5 + Math.floor(Math.random() * 5))
      const { error: retryError } = await admin.rpc("retry_scan_source_attempt", {
        p_attempt_id: attempt.id,
        p_worker_id: workerId,
        p_error_code: status ? `HTTP_${status}` : "SOURCE_RETRY",
        p_error_message: message.slice(0, 2_000),
        p_delay_seconds: delaySeconds,
      })
      if (retryError) throw new Error(retryError.message)
      return { kind: "retry" as const, source: config.adapterKey, delaySeconds }
    }

    const { error: finishError } = await admin.rpc("complete_scan_source_attempt", {
      p_attempt_id: attempt.id,
      p_worker_id: workerId,
      p_status: "failed",
      p_raw_count: 0,
      p_normalized_count: 0,
      p_error_code: status ? `HTTP_${status}` : "SOURCE_FAILED",
      p_error_message: message.slice(0, 2_000),
    })
    if (finishError) throw new Error(finishError.message)
    return { kind: "source_failed" as const, source: config.adapterKey }
  }
}

async function processScan(run: Row, workerId: string) {
  const admin = createSupabaseAdminClient()
  const [{ data: evidence, error: evidenceError }, { data: context, error: contextError }] =
    await Promise.all([
      admin.from("evidence_items").select("*").eq("product_id", run.product_id),
      admin
        .from("product_context_items")
        .select("id,kind,text,visibility")
        .eq("product_id", run.product_id)
        .is("deleted_at", null),
    ])
  if (evidenceError) throw new Error(evidenceError.message)
  if (contextError) throw new Error(contextError.message)

  const processed = await processEvidenceInSolariSandbox({
    scanRunId: String(run.id),
    signals: (evidence as Row[]).map(evidenceForProcessor),
    contextItems: (context as Row[]) ?? [],
    now: new Date().toISOString(),
  })
  const evidenceByKey = new Map(
    (evidence as Row[]).map((item) => [
      `${String(item.source_config_id)}:${String(item.external_id)}`,
      String(item.id),
    ]),
  )

  for (const cluster of processed.clusters) {
    const state = String(cluster.opportunityState ?? "unmapped")
    const clusterRow = {
      product_id: run.product_id,
      stable_key: cluster.stableKey,
      title: String(cluster.title ?? "Demand cluster").slice(0, 240),
      score: cluster.score ?? 0,
      score_explanation: cluster.scoreExplanation ?? {},
      confidence: cluster.confidence ?? 0,
      independent_signal_count: cluster.independentSignalCount ?? 0,
      independent_source_count: cluster.independentSourceCount ?? 0,
      first_detected_at: cluster.firstDetectedAt ?? new Date().toISOString(),
      last_detected_at: cluster.lastDetectedAt ?? new Date().toISOString(),
      trend: cluster.trend ?? "new",
      related_public_context_id: state === "existing" ? cluster.relatedContextId ?? null : null,
      related_private_context_id: state === "roadmap" ? cluster.relatedContextId ?? null : null,
      opportunity_state: state,
      suggested_action: cluster.suggestedAction ?? "Review the supporting evidence.",
      centroid: cluster.centroid ?? {},
      algorithm_version: processed.pipelineVersion,
    }
    const { data: saved, error: clusterError } = await admin
      .from("demand_clusters")
      .upsert(clusterRow, { onConflict: "product_id,stable_key" })
      .select("id")
      .single()
    if (clusterError) throw new Error(clusterError.message)
    const clusterId = String(saved.id)

    const members = Array.isArray(cluster.members) ? (cluster.members as Row[]) : []
    const memberships = members
      .map((member) => {
        const evidenceId = evidenceByKey.get(
          `${String(member.sourceInstanceId)}:${String(member.externalId)}`,
        )
        return evidenceId
          ? {
              cluster_id: clusterId,
              evidence_id: evidenceId,
              scan_run_id: run.id,
              similarity: 1,
              matching_rationale: "Grouped by the deterministic TF-IDF processor.",
            }
          : null
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
    if (memberships.length) {
      const { error } = await admin.from("cluster_memberships").upsert(memberships, {
        onConflict: "scan_run_id,evidence_id",
      })
      if (error) throw new Error(error.message)
    }
    const { error: snapshotError } = await admin.from("cluster_snapshots").upsert(
      {
        cluster_id: clusterId,
        day: new Date().toISOString().slice(0, 10),
        signal_count: cluster.independentSignalCount ?? memberships.length,
        source_count: cluster.independentSourceCount ?? 0,
        score: cluster.score ?? 0,
        confidence: cluster.confidence ?? 0,
      },
      { onConflict: "cluster_id,day" },
    )
    if (snapshotError) throw new Error(snapshotError.message)
  }

  await advance(run, workerId, "processing", "clustering", {
    pipelineVersion: processed.pipelineVersion,
    normalizedSignals: processed.normalizedSignalCount,
    clusters: processed.clusters.length,
  })
  return { kind: "processing" as const, clusters: processed.clusters.length }
}

async function advance(
  run: Row,
  workerId: string,
  expected: string,
  next: string,
  checkpoint: Row = {},
) {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.rpc("advance_scan_stage", {
    p_scan_run_id: run.id,
    p_worker_id: workerId,
    p_expected_status: expected,
    p_next_status: next,
    p_checkpoint: checkpoint,
  })
  if (error) throw new Error(error.message)
}

async function generateInsights(run: Row, workerId: string) {
  const admin = createSupabaseAdminClient()
  const { data: clusters, error } = await admin
    .from("demand_clusters")
    .select("id,title,score,trend,suggested_action")
    .eq("product_id", run.product_id)
    .order("score", { ascending: false })
    .limit(3)
  if (error) throw new Error(error.message)

  const provider = new OpenAITextGenerationProvider()
  const warnings: string[] = []
  for (const cluster of (clusters as Row[]) ?? []) {
    try {
      const { data: memberships } = await admin
        .from("cluster_memberships")
        .select("evidence_items(title,excerpt,source_configs(adapter_key))")
        .eq("cluster_id", cluster.id)
        .limit(8)
      const evidence = ((memberships as Row[]) ?? []).map((membership) => {
        const item = membership.evidence_items as Row
        const source = item?.source_configs as Row
        return {
          title: String(item?.title ?? "Evidence"),
          excerpt: String(item?.excerpt ?? ""),
          platform: String(source?.adapter_key ?? "public web"),
        }
      })
      const insight = await provider.explainCluster({
        evidence,
        score: Number(cluster.score),
        trend: String(cluster.trend),
        publicCapabilities: [],
      })
      const { error: updateError } = await admin
        .from("demand_clusters")
        .update({ title: insight.title.slice(0, 240), suggested_action: insight.explanation })
        .eq("id", cluster.id)
      if (updateError) throw new Error(updateError.message)
    } catch (insightError) {
      warnings.push(insightError instanceof Error ? insightError.message : "Insight generation failed")
    }
  }
  await advance(run, workerId, "generating", "completed", {
    insightWarnings: warnings.slice(0, 10),
  })
  return { kind: "generating" as const, warnings: warnings.length }
}

export async function runOneWorkerUnit() {
  const admin = createSupabaseAdminClient()
  const workerId = `vercel:${randomUUID()}`
  const { data: claimed, error } = await admin.rpc("claim_next_scan", {
    p_worker_id: workerId,
    p_lease_seconds: 180,
  })
  if (error) throw new Error(error.message)
  const run = one(claimed as Row | Row[] | null)
  if (!run) return { kind: "idle" as const }

  try {
    const status = String(run.status)
    if (status === "collecting") return await collectOneSource(run, workerId)
    if (status === "processing") return await processScan(run, workerId)
    if (status === "clustering") {
      await advance(run, workerId, "clustering", "scoring")
      return { kind: "clustering" as const }
    }
    if (status === "scoring") {
      await advance(run, workerId, "scoring", "generating")
      return { kind: "scoring" as const }
    }
    if (status === "generating") return await generateInsights(run, workerId)
    return { kind: "idle" as const }
  } catch (workerError) {
    const message = workerError instanceof Error ? workerError.message : "Worker failed"
    await admin.rpc("fail_scan", {
      p_scan_run_id: run.id,
      p_worker_id: workerId,
      p_error_summary: { code: "WORKER_FAILED", message: message.slice(0, 2_000) },
    })
    throw workerError
  }
}
