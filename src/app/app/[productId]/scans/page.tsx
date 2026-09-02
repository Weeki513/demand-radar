import { PageHeader } from "@/components/page-header"
import { RunScanButton } from "@/components/run-scan-button"
import { ScanHistory, type ScanHistoryRow } from "@/components/scan-history"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function ScansPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("scan_runs")
    .select("id,created_at,duration_ms,status,sources_attempted,sources_succeeded,raw_signals_discovered,clusters_produced")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(30)
  const scans: ScanHistoryRow[] = (data ?? []).map((row) => ({
    id: row.id,
    date: row.created_at,
    duration: row.duration_ms ? `${Math.floor(row.duration_ms / 60_000)}m ${Math.floor((row.duration_ms % 60_000) / 1_000)}s` : "Queued",
    status: row.status === "completed" ? "Completed" : row.status === "failed" ? "Partial" : row.status,
    attempted: row.sources_attempted,
    succeeded: row.sources_succeeded,
    raw: row.raw_signals_discovered,
    clusters: row.clusters_produced,
  }))

  return <div className="flex flex-col gap-8"><PageHeader eyebrow="Recurring research" title="Scan history" description="Manual and scheduled scans share one pipeline. Review what ran, which sources succeeded, and how raw evidence became clusters." actions={<RunScanButton productId={productId} />} /><ScanHistory scanRuns={scans} /></div>
}
