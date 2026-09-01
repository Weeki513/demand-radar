"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { socialProfiles } from "@/lib/demo-data"

export function SettingsForm() {
  const [scanEnabled, setScanEnabled] = useState(true)
  const [saved, setSaved] = useState(true)

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form className="flex flex-col gap-10" onChange={() => setSaved(false)} onSubmit={(event) => { event.preventDefault(); setSaved(true) }}>
        <FieldSet><FieldLegend>Scheduled scanning</FieldLegend><FieldDescription>Manual and scheduled scans use the same pipeline. A source failure is recorded without stopping the rest of the run.</FieldDescription><FieldGroup className="mt-2"><Field orientation="horizontal"><FieldContent><FieldLabel htmlFor="scan-enabled">Enable recurring scans</FieldLabel><FieldDescription>Collect public demand on the schedule below.</FieldDescription></FieldContent><Switch id="scan-enabled" checked={scanEnabled} onCheckedChange={setScanEnabled} /></Field><div className="grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor="scan-frequency">Frequency</FieldLabel><Select defaultValue="daily"><SelectTrigger id="scan-frequency" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="daily">Every day</SelectItem><SelectItem value="weekly">Every week</SelectItem><SelectItem value="manual">Manual only</SelectItem></SelectGroup></SelectContent></Select></Field><Field><FieldLabel htmlFor="scan-time">Execution time</FieldLabel><Input id="scan-time" type="time" defaultValue="09:00" /></Field></div><div className="grid gap-5 sm:grid-cols-2"><Field><FieldLabel htmlFor="scan-timezone">Timezone</FieldLabel><Select defaultValue="asia-tbilisi"><SelectTrigger id="scan-timezone" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="asia-tbilisi">Asia / Tbilisi</SelectItem><SelectItem value="utc">UTC</SelectItem><SelectItem value="america-new-york">America / New York</SelectItem></SelectGroup></SelectContent></Select></Field><Field><FieldLabel htmlFor="lookback">Lookback period</FieldLabel><Select defaultValue="30"><SelectTrigger id="lookback" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="7">7 days</SelectItem><SelectItem value="30">30 days</SelectItem><SelectItem value="90">90 days</SelectItem></SelectGroup></SelectContent></Select></Field></div></FieldGroup></FieldSet>
        <FieldSet><FieldLegend>Source pool</FieldLegend><FieldDescription>Keep the initial pipeline focused on public sources that are useful without requiring member login.</FieldDescription><div className="mt-2 grid gap-0 border-y sm:grid-cols-2">{["Hacker News", "GitHub Issues", "Stack Overflow", "DEV Community", "Lobsters", "Public RSS feeds"].map((source, index) => <Field key={source} orientation="horizontal" className={`px-3 py-3 ${index % 2 === 1 ? "sm:border-l" : ""} ${index > 1 ? "border-t" : ""}`}><FieldContent><FieldLabel htmlFor={`source-${index}`}>{source}</FieldLabel><FieldDescription>Public, no login</FieldDescription></FieldContent><Switch id={`source-${index}`} defaultChecked /></Field>)}</div></FieldSet>
        <FieldSet><FieldLegend>Social profiles</FieldLegend><FieldDescription>Each platform has its own writing constraints and tone of voice.</FieldDescription><div className="mt-2 flex flex-col gap-0 border-y">{socialProfiles.map((profile) => <div key={profile.name} className="grid gap-4 border-b py-4 last:border-b-0 sm:grid-cols-[1fr_160px_120px] sm:items-center"><div><p className="text-sm font-medium">{profile.name}</p><p className="mt-1 text-xs text-muted-foreground">{profile.handle}</p></div><div className="text-xs text-muted-foreground">{profile.length}<br />{profile.tone}</div><Switch defaultChecked={profile.enabled} aria-label={`Enable ${profile.name}`} /></div>)}</div></FieldSet>
        <FieldSet><FieldLegend>Additional writing instructions</FieldLegend><FieldDescription>Applied independently to generated posts for this workspace.</FieldDescription><Textarea className="mt-2" defaultValue="Prefer specific observations over broad claims. Never mention private roadmap items." rows={4} /></FieldSet>
        <div className="flex items-center justify-between gap-4 border-t pt-5"><span className="flex items-center gap-2 text-xs text-muted-foreground">{saved ? <><Check aria-hidden /> Settings saved</> : "Unsaved changes"}</span><Button type="submit">Save settings</Button></div>
      </form>
      <aside className="flex flex-col gap-5 lg:border-l lg:pl-7"><Badge variant="outline" className="w-fit">Demo configuration</Badge><div><p className="text-sm font-medium">Built for a recurring loop</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Start with a daily scan, then let your own history tell you which sources and opportunities deserve more attention.</p></div><div className="border-t pt-5 text-xs leading-5 text-muted-foreground">Credentials, API keys, and scheduled jobs will connect here when the backend is integrated.</div></aside>
    </div>
  )
}

