import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Check, Clock3, ExternalLink, Minus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SignalTable } from "@/components/signal-table"
import { demoClusters, pulseStats } from "@/lib/demo-data"

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  return trend === "up" ? <ArrowUpRight aria-hidden /> : trend === "down" ? <ArrowDownRight aria-hidden /> : <Minus aria-hidden />
}

export function PulseDashboard() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid border-y sm:grid-cols-2 lg:grid-cols-4">
        {pulseStats.map((stat, index) => (
          <div key={stat.label} className={`px-4 py-5 sm:px-5 ${index > 0 ? "border-t sm:border-l sm:border-t-0" : ""}`}>
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{stat.label}</p>
            <div className="mt-2 flex items-center justify-between gap-3"><p className="font-mono text-3xl tracking-[-0.06em]">{stat.value}</p><TrendIcon trend={stat.tone === "up" ? "up" : "neutral"} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        <section>
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Demand movement</p><h2 className="mt-2 text-lg font-medium tracking-[-0.025em]">What changed since your last check</h2></div><span className="text-xs text-muted-foreground">Last 24 hours</span></div>
          <SignalTable clusters={demoClusters.slice(0, 4)} compact />
        </section>
        <aside className="flex flex-col gap-6 lg:border-l lg:pl-8">
          <div><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Scan health</p><div className="mt-3 flex items-baseline justify-between"><span className="text-sm font-medium">11 / 12 sources succeeded</span><span className="font-mono text-xs">92%</span></div><Progress value={92} className="mt-3 h-1" /><p className="mt-2 text-xs leading-5 text-muted-foreground">One source was rate limited. Its previous evidence remains in the history.</p></div>
          <div className="border-t pt-5"><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Recent actions</p><div className="mt-3 flex flex-col gap-3"><div className="flex gap-3"><Check aria-hidden className="mt-0.5 shrink-0" /><div><p className="text-sm">Drafted a post about session recovery</p><p className="mt-1 text-xs text-muted-foreground">2 hours ago · Demand signals</p></div></div><div className="flex gap-3"><Clock3 aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" /><div><p className="text-sm">Added “failure explanations” to discovery</p><p className="mt-1 text-xs text-muted-foreground">Yesterday · Product context</p></div></div></div></div>
          <div className="border-t pt-5"><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Historical pull</p><p className="mt-2 text-sm leading-6">This workspace has 28 days of demand history. Trends become more useful as each scan adds another dated observation.</p><Link href="/app/atlas/scans" className="mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline">View scan history <ExternalLink aria-hidden /></Link></div>
        </aside>
      </div>
      <section className="border-t pt-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Opportunity queue</p><h2 className="mt-2 text-lg font-medium tracking-[-0.025em]">Unmapped demand worth investigating</h2></div><Badge variant="default">2 new</Badge></div><div className="mt-5 grid gap-0 border-y sm:grid-cols-2">{demoClusters.filter((cluster) => cluster.status === "Unmapped opportunity").map((cluster, index) => <div key={cluster.id} className={`p-5 ${index > 0 ? "border-t sm:border-l sm:border-t-0" : ""}`}><div className="flex items-start justify-between gap-4"><h3 className="text-sm font-medium">{cluster.title}</h3><span className="font-mono text-sm">{cluster.score}</span></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{cluster.action}</p><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><TrendIcon trend="up" /> {cluster.signalCount} signals · {cluster.sourceCount} sources</div></div>)}</div></section>
    </div>
  )
}
