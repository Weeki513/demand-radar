import { PageHeader } from "@/components/page-header"
import { SettingsForm } from "@/components/settings-form"

export default function SettingsPage() {
  return <div className="flex flex-col gap-8"><PageHeader eyebrow="Workspace configuration" title="Settings" description="Choose where Demand Radar looks, how often it checks, and how generated writing should sound on each platform." /><SettingsForm /></div>
}

