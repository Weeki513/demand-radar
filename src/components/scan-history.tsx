"use client"

import { Check, CircleAlert, Clock3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLocale } from "@/lib/i18n"
export type ScanHistoryRow = { id: string; date: string; duration: string; status: string; attempted: number; succeeded: number; raw: number; clusters: number }

export function ScanHistory({ scanRuns }: { scanRuns: ScanHistoryRow[] }) {
  const { locale, t } = useLocale()
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
  return (
    <div className="flex flex-col gap-8">
      <div className="grid border-y sm:grid-cols-3"><div className="px-4 py-5 sm:px-5"><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t("Last run")}</p><p className="mt-2 text-lg font-medium">{scanRuns[0] ? formatDate(scanRuns[0].date) : t("No runs yet")}</p><p className="mt-1 text-xs text-muted-foreground">{scanRuns[0]?.duration ?? "—"} · {scanRuns[0] ? t(scanRuns[0].status) : locale === "ru" ? "не запущено" : "not started"}</p></div><div className="border-t px-4 py-5 sm:border-l sm:border-t-0 sm:px-5"><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t("Sources")}</p><p className="mt-2 text-lg font-medium">{scanRuns[0]?.succeeded ?? 0} / {scanRuns[0]?.attempted ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">{t("Last completed attempt")}</p></div><div className="border-t px-4 py-5 sm:border-l sm:border-t-0 sm:px-5"><p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t("Clusters")}</p><p className="mt-2 text-lg font-medium">{scanRuns[0]?.clusters ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">{locale === "ru" ? `${scanRuns[0]?.raw ?? 0} исходных сигналов` : `From ${scanRuns[0]?.raw ?? 0} raw signals`}</p></div></div>
      <div className="overflow-hidden border-y"><Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead>{t("Date")}</TableHead><TableHead>{t("Status")}</TableHead><TableHead className="hidden md:table-cell">{t("Duration")}</TableHead><TableHead className="hidden lg:table-cell">{t("Sources")}</TableHead><TableHead>{t("Signals")}</TableHead><TableHead className="text-right">{t("Clusters")}</TableHead></TableRow></TableHeader><TableBody>{scanRuns.map((run) => <TableRow key={run.id}><TableCell><p className="font-medium">{formatDate(run.date)}</p><p className="mt-1 text-[11px] text-muted-foreground">{run.id}</p></TableCell><TableCell>{run.status === "Completed" ? <Badge variant="outline"><Check data-icon="inline-start" /> {t("Completed")}</Badge> : <Badge variant="secondary"><CircleAlert data-icon="inline-start" /> {t("Partial")}</Badge>}</TableCell><TableCell className="hidden text-xs text-muted-foreground md:table-cell"><span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden /> {run.duration}</span></TableCell><TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{run.succeeded} / {run.attempted} {locale === "ru" ? "успешно" : "succeeded"}</TableCell><TableCell className="text-xs text-muted-foreground">{run.raw} {locale === "ru" ? "исходных" : "raw"}</TableCell><TableCell className="text-right font-mono text-sm">{run.clusters}</TableCell></TableRow>)}</TableBody></Table></div>
      <div className="border-l-2 border-foreground/20 px-4 py-1 text-sm leading-6 text-muted-foreground">{t("Each run preserves start/end time, source outcomes, raw evidence count, cluster count, and errors for review.")}</div>
    </div>
  )
}
