"use client"

import { useState } from "react"
import { Lightbulb, Plus, WandSparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { DemoProduct } from "@/lib/demo-data"

function EditableList({ label, description, initialItems }: { label: string; description: string; initialItems: string[] }) {
  const [items, setItems] = useState(initialItems)
  const [draft, setDraft] = useState("")

  function addItem() {
    const value = draft.trim()
    if (!value) return
    setItems((current) => [...current, value])
    setDraft("")
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">{label}</FieldLegend>
      <FieldDescription>{description}</FieldDescription>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-2 border-b pb-2">
            <Input value={item} onChange={(event) => setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? event.target.value : entry))} aria-label={`${label} item ${index + 1}`} />
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${item}`} onClick={() => setItems((current) => current.filter((_, entryIndex) => entryIndex !== index))}><X aria-hidden /></Button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1"><Input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addItem() } }} placeholder={`Add ${label.toLowerCase()} item`} aria-label={`Add ${label.toLowerCase()} item`} /><Button type="button" variant="outline" size="icon-sm" aria-label={`Add ${label.toLowerCase()} item`} onClick={addItem}><Plus aria-hidden /></Button></div>
      </div>
    </FieldSet>
  )
}

function MagicWandDialog() {
  const [thought, setThought] = useState("")
  const [converted, setConverted] = useState<string | null>(null)

  return (
    <Dialog>
      <DialogTrigger asChild><Button type="button" variant="outline" size="sm"><WandSparkles data-icon="inline-start" /> Magic Wand</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Turn a thought into product context</DialogTitle><DialogDescription>Write naturally. The structured version stays editable before it enters your product model.</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel htmlFor="magic-thought">Unstructured thought</FieldLabel><Textarea id="magic-thought" value={thought} onChange={(event) => setThought(event.target.value)} placeholder="We're working on making browser sessions survive authentication failures..." rows={4} /></Field>
        </FieldGroup>
        {converted ? <div className="border-l-2 border-foreground/20 bg-muted/40 p-3 text-sm leading-6"><p className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Structured capability</p>{converted}</div> : null}
        <DialogFooter><Button type="button" variant="outline" onClick={() => setConverted(null)}>Clear</Button><Button type="button" onClick={() => setConverted(thought.trim() ? "Resilient authenticated session recovery" : "Add a thought above to structure it.")}>Structure thought <WandSparkles data-icon="inline-end" /></Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ContextEditor({ product }: { product: DemoProduct }) {
  const [saved, setSaved] = useState(true)

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form className="flex flex-col gap-8" onChange={() => setSaved(false)} onSubmit={(event) => { event.preventDefault(); setSaved(true) }}>
        <FieldGroup>
          <Field><FieldLabel htmlFor="product-url">Public product URL</FieldLabel><Input id="product-url" type="url" defaultValue={`https://${product.url}`} /><FieldDescription>We use this to understand the public surface area before matching demand.</FieldDescription></Field>
          <Field><FieldLabel htmlFor="positioning">Positioning</FieldLabel><Textarea id="positioning" defaultValue={product.positioning} rows={3} /></Field>
          <Field><FieldLabel htmlFor="icp">Ideal customer profile</FieldLabel><Textarea id="icp" defaultValue={product.icp} rows={3} /></Field>
        </FieldGroup>
        <EditableList label="Problems solved" description="What your product helps someone do or avoid." initialItems={product.problems} />
        <EditableList label="Public capabilities" description="Only functionality users can access today." initialItems={product.capabilities} />
        <EditableList label="Private roadmap" description="Kept private and used only for internal classification." initialItems={product.roadmap} />
        <EditableList label="Relevant keywords" description="Terms and concepts that help source adapters find useful evidence." initialItems={product.keywords} />
        <div className="flex items-center justify-between gap-4 border-t pt-5"><span className="flex items-center gap-2 text-xs text-muted-foreground">{saved ? <><span className="size-1.5 rounded-full bg-foreground" aria-hidden /> All changes saved</> : <><span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden /> Unsaved changes</>}</span><Button type="submit">Save context</Button></div>
      </form>
      <aside className="flex flex-col gap-5 lg:border-l lg:pl-7">
        <div><p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">AI-assisted editing</p><h2 className="mt-2 text-base font-medium">Keep the model close to the source.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Generated context and your own notes live together. You can edit or remove every item before it affects matching.</p></div>
        <MagicWandDialog />
        <div className="flex gap-2 border-t pt-5 text-xs leading-5 text-muted-foreground"><Lightbulb aria-hidden className="mt-0.5 shrink-0" /> Tip: write the private roadmap in language your team actually uses. Matching gets clearer when the context is specific.</div>
      </aside>
    </div>
  )
}
