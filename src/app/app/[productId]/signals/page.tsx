import { PageHeader } from "@/components/page-header"
import { MetricStrip } from "@/components/metric-strip"
import { SignalTable } from "@/components/signal-table"
import { RunScanButton } from "@/components/run-scan-button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DemandCluster, Evidence, OpportunityStatus, Trend } from "@/lib/demo-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type Row = Record<string, unknown>

function textOf(value: unknown) {
  if (Array.isArray(value)) return String((value[0] as Row | undefined)?.text ?? "") || null
  return value && typeof value === "object" ? String((value as Row).text ?? "") || null : null
}

function formatDate(value: unknown) {
  const date = new Date(String(value ?? ""))
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date)
    : "Unknown"
}

function statusOf(value: unknown): OpportunityStatus {
  return value === "existing" ? "Existing" : value === "roadmap" ? "Roadmap" : "Unmapped opportunity"
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
      sourceUrl: String(item.canonical_url),
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
    trend: String(row.trend) as Trend,
    publicCapability: textOf(row.public_match),
    roadmapCapability: textOf(row.private_match),
    status: statusOf(row.opportunity_state),
    action: String(row.suggested_action),
    generatedPost: "",
    evidence,
  }
}

export default async function SignalsPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("demand_clusters")
    .select("*,public_match:product_context_items!related_public_context_id(text),private_match:product_context_items!related_private_context_id(text),cluster_memberships(matching_rationale,evidence_items(id,canonical_url,title,excerpt,published_at,engagement,source_configs(display_name)))")
    .eq("product_id", productId)
    .order("score", { ascending: false })
  const clusters = ((data ?? []) as Row[]).map(clusterFromRow)
  const totalSignals = clusters.reduce((sum, cluster) => sum + cluster.signalCount, 0)
  const totalSources = new Set(clusters.flatMap((cluster) => cluster.evidence.map((item) => item.platform))).size
  const metrics = [
    { label: "Clusters", value: String(clusters.length), note: "Current lookback", tone: "neutral" as const },
    { label: "Rising", value: String(clusters.filter((item) => item.trend === "rising").length), note: "Needs review", tone: "up" as const },
    { label: "Unmapped", value: String(clusters.filter((item) => item.status === "Unmapped opportunity").length), note: "New opportunities", tone: "neutral" as const },
    { label: "Evidence", value: String(totalSignals), note: `${totalSources} sources`, tone: "neutral" as const },
  ]

  return <div className="flex flex-col gap-8"><PageHeader eyebrow="Primary analytics" title="Demand signals" description="One row is one demand cluster—not one URL. Expand a cluster to inspect provenance, matching rationale, and the action it suggests." actions={<><Select defaultValue="30"><SelectTrigger className="w-[130px]" aria-label="Filter by lookback"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem></SelectGroup></SelectContent></Select><RunScanButton productId={productId} /></>} /><MetricStrip metrics={metrics} /><div className="flex flex-col gap-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Sorted by signal strength</p><p className="mt-1 text-sm text-muted-foreground">{clusters.length} clusters · {totalSignals} independent signals · {totalSources} sources</p></div><span className="text-xs text-muted-foreground">Live workspace data</span></div><SignalTable clusters={clusters} /></div></div>
}
