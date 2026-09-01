import { PageHeader } from "@/components/page-header"
import { PulseDashboard } from "@/components/pulse-dashboard"

export default function PulsePage() {
  return <div className="flex flex-col gap-8"><PageHeader eyebrow="Recurring loop" title="Pulse" description="What changed since you last checked? Pulse turns your scan history into a short, decision-ready read." /><PulseDashboard /></div>
}

