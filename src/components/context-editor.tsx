"use client"

import { useMemo, useState } from "react"
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

export type ContextItemKind =
  | "positioning"
  | "icp"
  | "problem"
  | "capability"
  | "feature"
  | "differentiator"
  | "roadmap"
  | "keyword"

export type ContextItem = {
  id: string
  product_id: string
  kind: ContextItemKind
  text: string
  visibility: "public" | "private"
  source: "manual" | "ai"
  sort_order: number
  metadata?: Record<string, unknown>
}

type ProductPreview = {
  positioning: string
  icp: string[]
  problems: string[]
  capabilities: string[]
  features: string[]
  usp: string[]
  keywords: string[]
}

type PreviewEntry = {
  id: string
  label: string
  kind: ContextItemKind
  text: string
}

type ContextEditorProps = {
  product: DemoProduct
  initialItems: ContextItem[]
}

type RequestResult<T> = { item: T }

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const body = (await response.json().catch(() => null)) as { error?: string } | null
  if (!response.ok) throw new Error(body?.error ?? "Could not save product context")
  return body as T
}

function entriesFromPreview(preview: ProductPreview): PreviewEntry[] {
  const entries: PreviewEntry[] = []
  if (preview.positioning.trim()) entries.push({ id: "positioning-0", label: "Positioning", kind: "positioning", text: preview.positioning.trim() })
  for (const [index, text] of preview.icp.entries()) if (text.trim()) entries.push({ id: `icp-${index}`, label: "Ideal customer profile", kind: "icp", text: text.trim() })
  for (const [index, text] of preview.problems.entries()) if (text.trim()) entries.push({ id: `problem-${index}`, label: "Problem", kind: "problem", text: text.trim() })
  for (const [index, text] of preview.capabilities.entries()) if (text.trim()) entries.push({ id: `capability-${index}`, label: "Capability", kind: "capability", text: text.trim() })
  for (const [index, text] of preview.features.entries()) if (text.trim()) entries.push({ id: `feature-${index}`, label: "Feature", kind: "feature", text: text.trim() })
  for (const [index, text] of preview.usp.entries()) if (text.trim()) entries.push({ id: `differentiator-${index}`, label: "Differentiator", kind: "differentiator", text: text.trim() })
  for (const [index, text] of preview.keywords.entries()) if (text.trim()) entries.push({ id: `keyword-${index}`, label: "Keyword", kind: "keyword", text: text.trim() })
  return entries
}

function EditableList({
  label,
  description,
  items,
  kinds,
  defaultKind,
  visibility,
  multiline = false,
  onChange,
  onAdd,
  onDelete,
}: {
  label: string
  description: string
  items: ContextItem[]
  kinds: ContextItemKind[]
  defaultKind: ContextItemKind
  visibility: "public" | "private"
  multiline?: boolean
  onChange: (id: string, text: string) => void
  onAdd: (kind: ContextItemKind, visibility: "public" | "private", text: string) => Promise<void>
  onDelete: (item: ContextItem) => Promise<void>
}) {
  const [draft, setDraft] = useState("")
  const visibleItems = items.filter((item) => kinds.includes(item.kind))

  async function addItem() {
    const value = draft.trim()
    if (!value) return
    await onAdd(defaultKind, visibility, value)
    setDraft("")
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">{label}</FieldLegend>
      <FieldDescription>{description}</FieldDescription>
      <div className="flex flex-col gap-2">
        {visibleItems.map((item) => (
          <div key={item.id} className="flex items-start gap-2 border-b pb-2">
            {multiline ? (
              <Textarea value={item.text} onChange={(event) => onChange(item.id, event.target.value)} rows={2} aria-label={`${label} item`} />
            ) : (
              <Input value={item.text} onChange={(event) => onChange(item.id, event.target.value)} aria-label={`${label} item`} />
            )}
            {item.visibility === "private" ? <span className="mt-2 shrink-0 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Private</span> : null}
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${item.text}`} onClick={() => void onDelete(item)}><X aria-hidden /></Button>
          </div>
        ))}
        <div className="flex items-start gap-2 pt-1">
          {multiline ? (
            <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void addItem() } }} placeholder={`Add ${label.toLowerCase()} item`} aria-label={`Add ${label.toLowerCase()} item`} rows={2} />
          ) : (
            <Input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addItem() } }} placeholder={`Add ${label.toLowerCase()} item`} aria-label={`Add ${label.toLowerCase()} item`} />
          )}
          <Button type="button" variant="outline" size="icon-sm" aria-label={`Add ${label.toLowerCase()} item`} onClick={() => void addItem()}><Plus aria-hidden /></Button>
        </div>
      </div>
    </FieldSet>
  )
}

function MagicWandDialog({ productId, onItemsCreated }: { productId: string; onItemsCreated: (items: ContextItem[]) => void }) {
  const [open, setOpen] = useState(false)
  const [thought, setThought] = useState("")
  const [preview, setPreview] = useState<ProductPreview | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const entries = useMemo(() => preview ? entriesFromPreview(preview) : [], [preview])

  function reset() {
    setThought("")
    setPreview(null)
    setSelected(new Set())
    setLoading(false)
    setAccepting(false)
    setError(null)
  }

  async function structureThought() {
    setLoading(true)
    setError(null)
    try {
      const result = await requestJson<{ preview: ProductPreview }>(`/api/products/${productId}/context/structure`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ thought }),
      })
      setPreview(result.preview)
      setSelected(new Set(entriesFromPreview(result.preview).map((entry) => entry.id)))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not structure this thought")
    } finally {
      setLoading(false)
    }
  }

  async function acceptPreview() {
    const acceptedEntries = entries.filter((entry) => selected.has(entry.id))
    if (!acceptedEntries.length) {
      setError("Select at least one item to add")
      return
    }
    setAccepting(true)
    setError(null)
    try {
      const results = await Promise.all(acceptedEntries.map((entry, index) => requestJson<RequestResult<ContextItem>>(`/api/products/${productId}/context`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: entry.kind, text: entry.text, visibility: "public", source: "ai", sortOrder: index }),
      })))
      onItemsCreated(results.map((result) => result.item))
      setOpen(false)
      reset()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not accept the structured context")
    } finally {
      setAccepting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) reset() }}>
      <DialogTrigger asChild><Button type="button" variant="outline" size="sm"><WandSparkles data-icon="inline-start" /> Magic Wand</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Turn a thought into product context</DialogTitle><DialogDescription>Luna structures only the public product model. Review every item, then accept or reject the preview before anything is saved.</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel htmlFor="magic-thought">Unstructured thought</FieldLabel><Textarea id="magic-thought" value={thought} onChange={(event) => setThought(event.target.value)} placeholder="We're working on making browser sessions survive authentication failures..." rows={4} /></Field>
        </FieldGroup>
        {entries.length ? (
          <div className="max-h-72 overflow-y-auto border-y py-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Preview — choose what to add</p>
            <div className="flex flex-col gap-2">
              {entries.map((entry) => (
                <label key={entry.id} className="flex cursor-pointer items-start gap-3 text-sm leading-5">
                  <input type="checkbox" checked={selected.has(entry.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(entry.id); else next.delete(entry.id); return next })} className="mt-1 accent-foreground" />
                  <span><span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{entry.label}</span>{entry.text}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { setOpen(false); reset() }}>Reject</Button>
          {preview ? <Button type="button" onClick={() => void acceptPreview()} disabled={accepting}>{accepting ? "Saving…" : "Accept selected"}</Button> : <Button type="button" onClick={() => void structureThought()} disabled={loading || thought.trim().length < 3}>{loading ? "Structuring…" : "Structure thought"} <WandSparkles data-icon="inline-end" /></Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ContextEditor({ product, initialItems }: ContextEditorProps) {
  const initialWithFallbacks = useMemo(() => {
    const items = [...initialItems]
    if (!items.some((item) => item.kind === "positioning") && product.positioning.trim()) {
      items.unshift({ id: `local-positioning-${product.id}`, product_id: product.id, kind: "positioning", text: product.positioning, visibility: "public", source: "manual", sort_order: -2 })
    }
    if (!items.some((item) => item.kind === "icp") && product.icp.trim()) {
      items.unshift({ id: `local-icp-${product.id}`, product_id: product.id, kind: "icp", text: product.icp, visibility: "public", source: "manual", sort_order: -1 })
    }
    return items
  }, [initialItems, product.id, product.icp, product.positioning])
  const [items, setItems] = useState<ContextItem[]>(initialWithFallbacks)
  const [productUrl, setProductUrl] = useState(`https://${product.url}`)
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<"saved" | "dirty" | "saving" | "error">("saved")
  const [error, setError] = useState<string | null>(null)

  function updateText(id: string, text: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, text } : item))
    setDirtyIds((current) => new Set(current).add(id))
    setStatus("dirty")
    setError(null)
  }

  async function addItem(kind: ContextItemKind, visibility: "public" | "private", text: string) {
    setStatus("saving")
    setError(null)
    try {
      const result = await requestJson<RequestResult<ContextItem>>(`/api/products/${product.id}/context`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, visibility, source: "manual", text, sortOrder: items.length }),
      })
      setItems((current) => [...current, result.item])
      setStatus("saved")
    } catch (requestError) {
      setStatus("error")
      setError(requestError instanceof Error ? requestError.message : "Could not add context item")
      throw requestError
    }
  }

  async function deleteItem(item: ContextItem) {
    setStatus("saving")
    setError(null)
    try {
      if (!item.id.startsWith("local-")) {
        await requestJson<unknown>(`/api/products/${product.id}/context/${item.id}`, { method: "DELETE" })
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      setDirtyIds((current) => { const next = new Set(current); next.delete(item.id); return next })
      setStatus("saved")
    } catch (requestError) {
      setStatus("error")
      setError(requestError instanceof Error ? requestError.message : "Could not delete context item")
    }
  }

  async function saveContext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("saving")
    setError(null)
    try {
      const parsedUrl = new URL(productUrl)
      if (!/^https?:$/.test(parsedUrl.protocol)) throw new Error("Use an http or https product URL")
      const changedItems = items.filter((item) => dirtyIds.has(item.id) && item.text.trim())
      const savedItems = await Promise.all(changedItems.map(async (item) => {
        if (item.id.startsWith("local-")) {
          const result = await requestJson<RequestResult<ContextItem>>(`/api/products/${product.id}/context`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind: item.kind, visibility: item.visibility, source: "manual", text: item.text, sortOrder: item.sort_order }),
          })
          return result.item
        }
        const result = await requestJson<RequestResult<ContextItem>>(`/api/products/${product.id}/context/${item.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: item.text }),
        })
        return result.item
      }))
      await requestJson(`/api/products/${product.id}/context`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicUrl: productUrl }),
      })
      setItems((current) => current.map((item) => savedItems.find((saved) => saved.id === item.id || (item.id.startsWith("local-") && saved.kind === item.kind && saved.text === item.text)) ?? item))
      setDirtyIds(new Set())
      setStatus("saved")
    } catch (requestError) {
      setStatus("error")
      setError(requestError instanceof Error ? requestError.message : "Could not save product context")
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form className="flex flex-col gap-8" onSubmit={saveContext}>
        <FieldGroup>
          <Field><FieldLabel htmlFor="product-url">Public product URL</FieldLabel><Input id="product-url" type="url" value={productUrl} onChange={(event) => { setProductUrl(event.target.value); setStatus("dirty") }} /><FieldDescription>We use this to understand the public surface area before matching demand.</FieldDescription></Field>
        </FieldGroup>
        <EditableList label="Positioning" description="The clearest sentence describing why this product exists." items={items} kinds={["positioning"]} defaultKind="positioning" visibility="public" multiline onChange={updateText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Ideal customer profile" description="Who gets the most value from this product." items={items} kinds={["icp"]} defaultKind="icp" visibility="public" multiline onChange={updateText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Problems solved" description="What your product helps someone do or avoid." items={items} kinds={["problem"]} defaultKind="problem" visibility="public" onChange={updateText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Public capabilities" description="Only functionality users can access today." items={items} kinds={["capability", "feature"]} defaultKind="capability" visibility="public" onChange={updateText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Differentiators" description="Public reasons to choose this product." items={items} kinds={["differentiator"]} defaultKind="differentiator" visibility="public" onChange={updateText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Private roadmap" description="Kept private and used only for internal classification." items={items} kinds={["roadmap"]} defaultKind="roadmap" visibility="private" multiline onChange={updateText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Relevant keywords" description="Terms and concepts that help source adapters find useful evidence." items={items} kinds={["keyword"]} defaultKind="keyword" visibility="public" onChange={updateText} onAdd={addItem} onDelete={deleteItem} />
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex items-center justify-between gap-4 border-t pt-5"><span className="flex items-center gap-2 text-xs text-muted-foreground">{status === "saved" ? <><span className="size-1.5 rounded-full bg-foreground" aria-hidden /> All changes saved</> : status === "saving" ? <><span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden /> Saving changes…</> : <><span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden /> Unsaved changes</>}</span><Button type="submit" disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save context"}</Button></div>
      </form>
      <aside className="flex flex-col gap-5 lg:border-l lg:pl-7">
        <div><p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">AI-assisted editing</p><h2 className="mt-2 text-base font-medium">Keep the model close to the source.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Generated context and your own notes live together. You can edit or remove every item before it affects matching.</p></div>
        <MagicWandDialog productId={product.id} onItemsCreated={(createdItems) => { setItems((current) => [...current, ...createdItems]); setStatus("saved") }} />
        <div className="flex gap-2 border-t pt-5 text-xs leading-5 text-muted-foreground"><Lightbulb aria-hidden className="mt-0.5 shrink-0" /> Tip: write the private roadmap in language your team actually uses. Matching gets clearer when the context is specific.</div>
      </aside>
    </div>
  )
}
