import Link from "next/link"
import { ArrowRight, Check, GitBranch, Radar, ScanLine, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SignalTable } from "@/components/signal-table"
import { demoClusters } from "@/lib/demo-data"

export function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.02em]">
          <span className="flex size-6 items-center justify-center rounded-sm bg-foreground text-background"><Radar aria-hidden /></span>
          demand radar
        </Link>
        <nav className="flex items-center gap-3 text-xs">
          <a href="https://github.com/Weeki513/demand-radar" target="_blank" rel="noreferrer" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex sm:items-center sm:gap-1.5"><GitBranch aria-hidden /> GitHub</a>
          <Button variant="outline" size="sm" asChild><Link href="/login">Login</Link></Button>
          <Button size="sm" asChild><Link href="/signup">Register</Link></Button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-10 lg:pb-32 lg:pt-24">
        <div className="max-w-xl">
          <Badge variant="outline" className="mb-6 rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"><span className="mr-1.5 size-1.5 rounded-full bg-foreground" aria-hidden /> recurring market intelligence</Badge>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.06em] sm:text-6xl">Know what your market wants before you build it.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">Demand Radar continuously finds, clusters, and explains the conversations that should change your roadmap—across the public web.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <form action="/api/demo/login" method="post"><Button size="lg" type="submit">Try the demo <ArrowRight data-icon="inline-end" /></Button></form>
            <Button variant="ghost" size="lg" asChild><a href="#how-it-works">See how it works</a></Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">A Solari-powered research workspace for founders and indie hackers.</p>
        </div>

        <div className="min-w-0 border bg-muted/20 p-4 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">atlas browser · weekly pull</p>
              <p className="mt-2 text-lg font-medium tracking-[-0.03em]">What changed since Monday</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">09:14</span>
          </div>
          <SignalTable clusters={demoClusters.slice(0, 3)} compact />
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>18 clusters · 184 raw signals</span><form action="/api/demo/login" method="post"><button type="submit" className="inline-flex items-center gap-1 text-foreground hover:underline">Open workspace <ArrowRight aria-hidden /></button></form></div>
        </div>
      </section>

      <section id="how-it-works" className="border-y bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="max-w-xl"><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">The loop</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">A living layer between your roadmap and the market.</h2></div>
          <div className="mt-14 grid gap-0 border-y md:grid-cols-3">
            {[{ number: "01", icon: Sparkles, title: "Describe what you build", text: "Give Demand Radar your public capabilities, private roadmap, and the language your users use." }, { number: "02", icon: ScanLine, title: "We continuously scan public demand", text: "Scheduled research collects evidence from useful public sources, then normalizes and clusters it." }, { number: "03", icon: Check, title: "See what the market wants next", text: "Understand what is already covered, what is on the roadmap, and what is still unmapped." }].map((step, index) => { const Icon = step.icon; return <div key={step.number} className={`flex flex-col gap-7 py-7 md:px-7 ${index > 0 ? "border-t md:border-l md:border-t-0" : "md:pl-0"}`}><div className="flex items-center justify-between"><span className="font-mono text-xs text-muted-foreground">{step.number}</span><Icon aria-hidden className="text-muted-foreground" /></div><div><h3 className="text-base font-medium">{step.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p></div></div> })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.65fr_1.35fr] lg:items-start">
          <div className="max-w-sm"><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">One source of truth</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">Make demand explainable.</h2><p className="mt-5 text-sm leading-6 text-muted-foreground">Every cluster keeps its evidence, matching rationale, trend, and suggested next action in view. Your private roadmap stays private.</p><div className="mt-7 flex flex-col gap-3 text-sm"><span className="flex items-center gap-2"><Check aria-hidden className="text-muted-foreground" /> Independent evidence, not URL counts</span><span className="flex items-center gap-2"><Check aria-hidden className="text-muted-foreground" /> Existing, roadmap, or unmapped</span><span className="flex items-center gap-2"><Check aria-hidden className="text-muted-foreground" /> Historical pull that compounds</span></div></div>
          <div className="min-w-0"><div className="mb-4 flex items-center justify-between text-xs"><span className="font-medium">Demand signals</span><span className="text-muted-foreground">5 clusters · sorted by score</span></div><SignalTable clusters={demoClusters} /></div>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-16 sm:flex-row sm:items-end sm:justify-between lg:px-10 lg:py-20"><div className="max-w-lg"><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Start with your next decision</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">Build from evidence, not vibes.</h2></div><div className="flex flex-wrap items-center gap-3"><form action="/api/demo/login" method="post"><Button size="lg" type="submit">Try the demo <ArrowRight data-icon="inline-end" /></Button></form><Button variant="outline" size="lg" asChild><a href="https://github.com/Weeki513/demand-radar" target="_blank" rel="noreferrer">View on GitHub <GitBranch data-icon="inline-end" /></a></Button></div></div>
        <Separator />
        <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10"><span>Demand Radar · a recurring market intelligence workspace</span><div className="flex gap-4"><a href="https://console.getsolari.com" target="_blank" rel="noreferrer" className="hover:text-foreground">Built with Solari</a><Link href="/login" className="hover:text-foreground">Sign in</Link></div></footer>
      </section>
    </main>
  )
}
