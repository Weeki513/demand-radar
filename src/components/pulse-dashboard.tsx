"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowDownRight, ArrowUpRight, Check, Clock3, ExternalLink, Minus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { SignalTable } from "@/components/signal-table"
import type { DemandCluster } from "@/lib/demo-data"
import { useLocale } from "@/lib/i18n"

export type PulseStats = { label: string; value: string; note: string; tone: "up" | "neutral" }
export type PulseScan = { id: string; date: string; status: string; attempted: number; succeeded: number; raw: number; clusters: number }
export type PulseAction = { id: string; action: string; createdAt: string; clusterTitle: string }
export type PulsePost = { id: string; platform: string; status: string; text: string; clusterTitle: string | null; updatedAt: string }

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  return trend === "up" ? <ArrowUpRight aria-hidden /> : trend === "down" ? <ArrowDownRight aria-hidden /> : <Minus aria-hidden />
}

export function PulseDashboard({ productId, clusters, stats, scans, actions, posts, lastCheckedAt, latestScan }: {
  productId: string
  clusters: DemandCluster[]
  stats: PulseStats[]
  scans: PulseScan[]
  actions: PulseAction[]
  posts: PulsePost[]
  lastCheckedAt: string | null
  latestScan: { attempted: number; succeeded: number; status: string } | null
}) {
  const router = useRouter()
  const { locale, t } = useLocale()
  const [isPending, startTransition] = useTransition()
  const [checkpointError, setCheckpointError] = useState<string | null>(null)
  const [checkpointSaved, setCheckpointSaved] = useState(false)
  const health = latestScan && latestScan.attempted > 0 ? Math.round((latestScan.succeeded / latestScan.attempted) * 100) : 0
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`
  const actionLabel = (action: string) => locale === "ru"
    ? action === "acted_on" ? "Отмечено выполненным" : action === "dismissed" ? "Сигнал отклонён" : action === "post_created" ? "Создана публикация" : "Сигнал сохранён"
    : action === "acted_on" ? "Marked as acted on" : action === "dismissed" ? "Dismissed a signal" : action === "post_created" ? "Created a post" : "Saved a signal"

  function markReviewed() {
    setCheckpointError(null)
    setCheckpointSaved(false)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/products/${productId}/pulse/checkpoint`, { method: "POST" })
        if (!response.ok) throw new Error("checkpoint request failed")
        setCheckpointSaved(true)
        router.refresh()
      } catch {
        setCheckpointError(t("Could not save the review checkpoint. Try again."))
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
        <p className="text-xs text-muted-foreground">
          {lastCheckedAt ? `${locale === "ru" ? "Последний просмотр" : "Last reviewed"} ${new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(lastCheckedAt))}` : t("This is your first Pulse review for this product.")}
        </p>
        <div className="flex items-center gap-3">
          {checkpointSaved ? <span className="text-xs text-muted-foreground" role="status">{t("Checkpoint saved")}</span> : null}
          <Button type="button" size="sm" onClick={markReviewed} disabled={isPending}>{t(isPending ? "Saving…" : "Mark as reviewed")}</Button>
        </div>
      </div>
      {checkpointError ? <p className="text-sm text-destructive" role="alert">{checkpointError}</p> : null}

      <div className="grid border-y sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={stat.label} className={`px-4 py-5 sm:px-5 ${index > 0 ? "border-t sm:border-l sm:border-t-0" : ""}`}>
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t(stat.label)}</p>
            <div className="mt-2 flex items-center justify-between gap-3"><p className="font-mono text-3xl tracking-[-0.06em]">{stat.value}</p><TrendIcon trend={stat.tone === "up" ? "up" : "neutral"} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{t(stat.note)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        <section className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t("Demand movement")}</p><h2 className="mt-2 text-lg font-medium tracking-[-0.025em]">{t("What changed since your last check")}</h2></div><span className="text-xs text-muted-foreground">{t("Live workspace data")}</span></div>
          {clusters.length ? <SignalTable clusters={clusters} compact /> : <p className="border-y py-8 text-sm text-muted-foreground">{t("No demand clusters yet. Run a scan to build the first Pulse.")}</p>}
        </section>
        <aside className="min-w-0 flex flex-col gap-6 lg:border-l lg:pl-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t("Scan health")}</p>
            <div className="mt-3 flex items-baseline justify-between"><span className="text-sm font-medium">{latestScan ? `${latestScan.succeeded} / ${latestScan.attempted} ${locale === "ru" ? "источников успешно" : "sources succeeded"}` : t("No scans yet")}</span><span className="font-mono text-xs">{latestScan ? `${health}%` : "—"}</span></div>
            <Progress value={health} className="mt-3 h-1" />
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{t(latestScan?.status === "completed" ? "Latest scan completed. Source-level failures remain visible in scan history." : latestScan ? "Latest scan is still moving through the recurring pipeline." : "Run your first scan to see source health.")}</p>
          </div>
          <div className="border-t pt-5"><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t("Recent actions")}</p><div className="mt-3 flex flex-col gap-3">{actions.length ? actions.slice(0, 4).map((item) => <div key={item.id} className="flex gap-3"><Check aria-hidden className="mt-0.5 shrink-0" /><div><p className="text-sm">{actionLabel(item.action)}: {item.clusterTitle}</p><p className="mt-1 text-xs text-muted-foreground">{item.createdAt} · {t("Demand signals")}</p></div></div>) : <p className="mt-3 text-sm text-muted-foreground">{t("No signal actions recorded yet.")}</p>}</div></div>
          <div className="border-t pt-5"><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t("Recent posts")}</p><div className="mt-3 flex flex-col gap-3">{posts.length ? posts.slice(0, 3).map((post) => <div key={post.id} className="flex gap-3"><Clock3 aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" /><div><p className="text-sm">{post.platform} {locale === "ru" ? "черновик" : "draft"}{post.clusterTitle ? ` · ${post.clusterTitle}` : ""}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{post.text}</p><p className="mt-1 text-xs text-muted-foreground">{locale === "ru" ? "Обновлено" : "Updated"} {post.updatedAt}</p></div></div>) : <p className="mt-3 text-sm text-muted-foreground">{t("No posts created yet.")}</p>}</div></div>
          <div className="border-t pt-5"><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t("Historical pull")}</p><p className="mt-2 text-sm leading-6">{scans.length ? locale === "ru" ? `В этом пространстве ${plural(scans.length, "сохранённое сканирование", "сохранённых сканирований")} истории спроса. С каждым новым наблюдением тренды становятся полезнее.` : `This workspace has ${scans.length === 1 ? "one recorded scan" : `${scans.length} recorded scans`} of demand history. Trends become more useful as each scan adds another dated observation.` : t("Your first scan will start the demand history.")}</p><Link href={`/app/${productId}/scans`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline">{t("View scan history")} <ExternalLink aria-hidden /></Link></div>
        </aside>
      </div>

      <section className="border-t pt-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t("Opportunity queue")}</p><h2 className="mt-2 text-lg font-medium tracking-[-0.025em]">{t("Unmapped demand worth investigating")}</h2></div><Badge variant="default">{clusters.filter((cluster) => cluster.status === "Unmapped opportunity").length} {locale === "ru" ? "активно" : "active"}</Badge></div><div className="mt-5 grid gap-0 border-y sm:grid-cols-2">{clusters.filter((cluster) => cluster.status === "Unmapped opportunity").map((cluster, index) => <div key={cluster.id} className={`p-5 ${index > 0 ? "border-t sm:border-l sm:border-t-0" : ""}`}><div className="flex items-start justify-between gap-4"><h3 className="text-sm font-medium">{cluster.title}</h3><span className="font-mono text-sm">{cluster.score}</span></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{cluster.action}</p><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><TrendIcon trend="up" /> {cluster.signalCount} {locale === "ru" ? "сигналов" : "signals"} · {cluster.sourceCount} {locale === "ru" ? "источников" : "sources"}</div></div>)}{!clusters.some((cluster) => cluster.status === "Unmapped opportunity") ? <p className="col-span-full p-5 text-sm text-muted-foreground">{t("No unmapped opportunities in the current lookback.")}</p> : null}</div></section>
    </div>
  )
}
