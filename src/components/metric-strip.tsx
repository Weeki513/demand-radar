"use client"

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { useLocale } from "@/lib/i18n"

type Metric = { label: string; value: string; note: string; tone?: "up" | "down" | "neutral" }

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  const { t } = useLocale()
  return (
    <div className="grid border-y sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const TrendIcon = metric.tone === "up" ? ArrowUpRight : metric.tone === "down" ? ArrowDownRight : Minus
        return (
          <div key={metric.label} className={cn("px-4 py-4 sm:px-5", index > 0 && "border-t sm:border-l sm:border-t-0")}>
            <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{t(metric.label)}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="font-mono text-2xl tracking-[-0.06em]">{metric.value}</p>
              <TrendIcon aria-hidden className="mb-1 text-muted-foreground" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t(metric.note)}</p>
          </div>
        )
      })}
    </div>
  )
}
