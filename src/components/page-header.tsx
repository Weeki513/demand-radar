import type { ReactNode } from "react"

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">{title}</h1>
        {description ? <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

