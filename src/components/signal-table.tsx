"use client"

import { Fragment, useState } from "react"
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp, ExternalLink, Minus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DemandCluster } from "@/lib/demo-data"
import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/i18n"

function StatusBadge({ status }: { status: DemandCluster["status"] }) {
  const { t } = useLocale()
  const variant = status === "Unmapped opportunity" ? "default" : status === "Roadmap" ? "secondary" : "outline"
  return <Badge variant={variant}>{t(status)}</Badge>
}

function TrendBadge({ trend }: { trend: DemandCluster["trend"] }) {
  const { t } = useLocale()
  const TrendIcon = trend === "rising" ? ArrowUpRight : trend === "falling" ? ArrowDownRight : Minus
  return (
    <Badge variant="outline" className="gap-1">
      <TrendIcon aria-hidden />
      {t(trend)}
    </Badge>
  )
}

export function SignalTable({ clusters, compact = false }: { clusters: DemandCluster[]; compact?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { locale, t } = useLocale()

  return (
    <div className="overflow-hidden border-y">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[38%]">{t("Demand cluster")}</TableHead>
            <TableHead>{t("Score")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("Evidence")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("Trend")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("Match")}</TableHead>
            <TableHead className="text-right">{t("Last seen")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clusters.map((cluster) => {
            const expanded = expandedId === cluster.id
            return (
              <Fragment key={cluster.id}>
                <TableRow key={cluster.id} className={cn(expanded && "bg-muted/40 hover:bg-muted/40")}>
                  <TableCell className="whitespace-normal">
                    <div className="flex items-start gap-2">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="mt-0.5 shrink-0"
                        aria-label={`${t(expanded ? "Collapse" : "Expand")} ${cluster.title}`}
                        aria-expanded={expanded}
                        aria-controls={`evidence-${cluster.id}`}
                        onClick={() => setExpandedId(expanded ? null : cluster.id)}
                      >
                        {expanded ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
                      </Button>
                      <div className="min-w-0">
                        <p className="font-medium leading-5">{cluster.title}</p>
                        {!compact ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{t(cluster.scoreExplanation)}</p> : null}
                        <div className="mt-2 lg:hidden"><StatusBadge status={cluster.status} /></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-base font-medium tracking-[-0.04em]">{cluster.score}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{cluster.signalCount} {locale === "ru" ? "сигналов" : "signals"} · {cluster.sourceCount} {locale === "ru" ? "источников" : "sources"}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell"><TrendBadge trend={cluster.trend} /></TableCell>
                  <TableCell className="hidden lg:table-cell"><StatusBadge status={cluster.status} /></TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{cluster.lastDetected}</TableCell>
                </TableRow>
                {expanded ? (
                  <TableRow key={`${cluster.id}-evidence`} id={`evidence-${cluster.id}`} className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={6} className="whitespace-normal py-5">
                      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:pl-10">
                        <div>
                          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{cluster.signalCount} {locale === "ru" ? "независимых сигналов" : "independent signals"}</span>
                            <span aria-hidden>·</span>
                            <span>{cluster.sourceCount} {locale === "ru" ? "источников" : "sources"}</span>
                            <span aria-hidden>·</span>
                            <span>{locale === "ru" ? "Впервые обнаружено" : "First detected"} {cluster.firstDetected}</span>
                          </div>
                          <div className="flex flex-col gap-4">
                            {cluster.evidence.map((evidence) => (
                              <article key={evidence.id} className="border-l-2 border-foreground/15 pl-4">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-medium">{evidence.platform}</span>
                                  <span className="text-muted-foreground">{evidence.date}</span>
                                  <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                                    {t("Open source")} <ExternalLink aria-hidden />
                                  </a>
                                </div>
                                <p className="mt-2 text-sm leading-6">“{evidence.excerpt}”</p>
                                <p className="mt-2 text-xs leading-5 text-muted-foreground">{evidence.rationale} · {evidence.engagement}</p>
                              </article>
                            ))}
                          </div>
                        </div>
                        <aside className="border-l pl-4 lg:border-l">
                          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{t("Suggested action")}</p>
                          <p className="mt-2 text-sm leading-6">{cluster.action}</p>
                          {cluster.publicCapability ? <p className="mt-4 text-xs text-muted-foreground">{t("Public match")}: <span className="text-foreground">{cluster.publicCapability}</span></p> : null}
                          {cluster.roadmapCapability ? <p className="mt-2 text-xs text-muted-foreground">{t("Private roadmap match")}: <span className="text-foreground">{cluster.roadmapCapability}</span></p> : null}
                        </aside>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
