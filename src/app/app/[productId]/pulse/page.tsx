import { PageHeader } from "@/components/page-header"
import { PulseDashboard, type PulseAction, type PulsePost, type PulseScan, type PulseStats } from "@/components/pulse-dashboard"
import type { DemandCluster, Evidence, OpportunityStatus, Trend } from "@/lib/demo-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type Row = Record<string, unknown>

function textOf(value: unknown) {
  if (Array.isArray(value)) return String((value[0] as Row | undefined)?.text ?? "") || null
  return value && typeof value === "object" ? String((value as Row).text ?? "") || null : null
}

function formatDate(value: unknown, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(String(value ?? ""))
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", options ?? { month: "short", day: "numeric", year: "numeric" }).format(date)
    : "Unknown"
}

function statusOf(value: unknown): OpportunityStatus {
  return value === "existing" ? "Existing" : value === "roadmap" ? "Roadmap" : "Unmapped opportunity"
}

function trendOf(value: unknown): Trend {
  return value === "falling" ? "falling" : value === "stable" ? "steady" : "rising"
}

function clusterFromRow(row: Row): DemandCluster {
  const memberships = Array.isArray(row.cluster_memberships) ? (row.cluster_memberships as Row[]) : []
  const evidence: Evidence[] = memberships.map((membership) => {
    const item = (membership.evidence_items as Row | null) ?? {}
    const source = (item.source_configs as Row | null) ?? {}
    const engagement = (item.engagement as Row | null) ?? {}
    return {
      id: String(item.id),
      platform: String(source.display_name ?? "Public web"),
      sourceUrl: String(item.canonical_url ?? ""),
      date: formatDate(item.published_at),
      excerpt: String(item.excerpt ?? item.title ?? ""),
      engagement: Object.entries(engagement).map(([key, value]) => `${value} ${key}`).join(" · ") || "Engagement unavailable",
      rationale: String(membership.matching_rationale ?? "Grouped by the deterministic evidence processor."),
    }
  })
  const explanation = (row.score_explanation as Row | null) ?? {}

  return {
    id: String(row.id),
    title: String(row.title),
    score: Number(row.score),
    scoreExplanation: Object.keys(explanation).length
      ? "Weighted from volume, source diversity, recency, momentum, and normalized engagement."
      : "Deterministic score explanation is available after the next scan.",
    signalCount: Number(row.independent_signal_count),
    sourceCount: Number(row.independent_source_count),
    firstDetected: formatDate(row.first_detected_at),
    lastDetected: formatDate(row.last_detected_at),
    trend: trendOf(row.trend),
    publicCapability: textOf(row.public_match),
    roadmapCapability: null,
    status: statusOf(row.opportunity_state),
    action: String(row.suggested_action ?? ""),
    generatedPost: "",
    evidence,
  }
}

function changedAfter(value: unknown, checkpoint: string | null) {
  if (!checkpoint) return true
  const timestamp = new Date(String(value ?? "")).getTime()
  return Number.isFinite(timestamp) && timestamp > new Date(checkpoint).getTime()
}

export default async function PulsePage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: state }, { data: clusterRows }, { data: scanRows }, { data: postRows }] = await Promise.all([
    supabase.from("product_user_state").select("last_pulse_checked_at").eq("product_id", productId).eq("user_id", user?.id ?? "").maybeSingle(),
    supabase
      .from("demand_clusters")
      .select("id,title,score,score_explanation,independent_signal_count,independent_source_count,first_detected_at,last_detected_at,trend,opportunity_state,suggested_action,cluster_memberships(matching_rationale,evidence_items(id,canonical_url,title,excerpt,published_at,engagement,source_configs(display_name)))")
      .eq("product_id", productId)
      .order("score", { ascending: false }),
    supabase
      .from("scan_runs")
      .select("id,created_at,duration_ms,status,sources_attempted,sources_succeeded,raw_signals_discovered,clusters_produced")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("posts")
      .select("id,platform,status,plain_text,character_count,updated_at,cluster:demand_clusters(title)")
      .eq("product_id", productId)
      .order("updated_at", { ascending: false })
      .limit(4),
  ])

  const checkpoint = state?.last_pulse_checked_at ?? null
  const clusters = ((clusterRows ?? []) as Row[]).map(clusterFromRow)
  const rawClusters = (clusterRows ?? []) as Row[]
  const changedClusters = rawClusters.filter((row) => changedAfter(row.last_detected_at, checkpoint))
  const changedEvidence = changedClusters.flatMap((row) => {
    const memberships = Array.isArray(row.cluster_memberships) ? (row.cluster_memberships as Row[]) : []
    return memberships.map((membership) => (membership.evidence_items as Row | null) ?? {})
  })
  const evidenceSinceCheckpoint = changedEvidence.filter((item) => changedAfter(item.published_at, checkpoint))
  const unmappedChanged = changedClusters.filter((row) => row.opportunity_state === "unmapped")
  const latestScan = (scanRows?.[0] ?? null) as Row | null
  const scans: PulseScan[] = ((scanRows ?? []) as Row[]).map((row) => ({
    id: String(row.id),
    date: formatDate(row.created_at, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    status: row.status === "completed" ? "Completed" : row.status === "failed" ? "Partial" : String(row.status ?? "Queued"),
    attempted: Number(row.sources_attempted ?? 0),
    succeeded: Number(row.sources_succeeded ?? 0),
    raw: Number(row.raw_signals_discovered ?? 0),
    clusters: Number(row.clusters_produced ?? 0),
  }))
  const posts: PulsePost[] = ((postRows ?? []) as Row[]).map((row) => {
    const cluster = (row.cluster as Row | null) ?? {}
    return {
      id: String(row.id),
      platform: String(row.platform ?? "post").toUpperCase(),
      status: String(row.status ?? "draft"),
      text: String(row.plain_text ?? ""),
      clusterTitle: cluster.title ? String(cluster.title) : null,
      updatedAt: formatDate(row.updated_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    }
  })

  const actionRows = clusters.length
    ? await supabase
        .from("signal_actions")
        .select("id,action,created_at,cluster_id")
        .in("cluster_id", clusters.map((cluster) => cluster.id))
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: [] as Row[] }
  const actions: PulseAction[] = ((actionRows.data ?? []) as Row[]).map((row) => ({
    id: String(row.id),
    action: String(row.action ?? "saved"),
    createdAt: formatDate(row.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    clusterTitle: clusters.find((cluster) => cluster.id === String(row.cluster_id))?.title ?? "Demand signal",
  }))

  const stats: PulseStats[] = [
    { label: "New demand", value: String(evidenceSinceCheckpoint.length), note: checkpoint ? "Since your last check" : "Current lookback", tone: "up" },
    { label: "Rising clusters", value: String(clusters.filter((cluster) => cluster.trend === "rising").length), note: `${clusters.filter((cluster) => cluster.trend === "rising" && cluster.status === "Unmapped opportunity").length} high-confidence opportunities`, tone: "up" },
    { label: "New opportunities", value: String(unmappedChanged.length), note: checkpoint ? "Since your last check" : "First visit · current lookback", tone: "neutral" },
    { label: "Signals acted on", value: String(actions.filter((action) => action.action === "acted_on").length), note: "Visible actions in this workspace", tone: "neutral" },
  ]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Recurring loop" title="Pulse" description="What changed since you last checked? Pulse turns your scan history into a short, decision-ready read." />
      <PulseDashboard
        productId={productId}
        clusters={clusters}
        stats={stats}
        scans={scans}
        actions={actions}
        posts={posts}
        lastCheckedAt={checkpoint}
        latestScan={latestScan ? { attempted: Number(latestScan.sources_attempted ?? 0), succeeded: Number(latestScan.sources_succeeded ?? 0), status: String(latestScan.status ?? "queued") } : null}
      />
    </div>
  )
}
