"use client"

import { useMemo, useState } from "react"
import { Plus, WandSparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { useLocale } from "@/lib/i18n"

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
  positioning: string[]
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
  for (const [index, text] of preview.positioning.entries()) if (text.trim()) entries.push({ id: `positioning-${index}`, label: "Positioning", kind: "positioning", text: text.trim() })
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
  onMagicWand,
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
  onMagicWand: (id: string, kind: ContextItemKind, text: string) => Promise<string | null>
  onAdd: (kind: ContextItemKind, visibility: "public" | "private", text: string) => Promise<void>
  onDelete: (item: ContextItem) => Promise<void>
}) {
  const [draft, setDraft] = useState("")
  const { t } = useLocale()
  const visibleItems = items.filter((item) => kinds.includes(item.kind))

  async function addItem() {
    const value = draft.trim()
    if (!value) return
    await onAdd(defaultKind, visibility, value)
    setDraft("")
  }

  return (
    <FieldSet>
      <FieldLegend variant="label">{t(label)}</FieldLegend>
      <FieldDescription>{t(description)}</FieldDescription>
      <div className="flex flex-col gap-2">
        {visibleItems.map((item) => (
          <div key={item.id} className="flex items-start gap-2 border-b pb-2">
            {multiline ? (
              <Textarea value={item.text} onChange={(event) => onChange(item.id, event.target.value)} rows={2} aria-label={`${t(label)} — ${t("item")}`} />
            ) : (
              <Input value={item.text} onChange={(event) => onChange(item.id, event.target.value)} aria-label={`${t(label)} — ${t("item")}`} />
            )}
            <Button type="button" variant="default" size="icon-sm" aria-label={`${t("Rewrite")} ${t(label).toLowerCase()}`} title={t("Rewrite")} disabled={!item.text.trim()} onClick={() => void onMagicWand(item.id, item.kind, item.text).then((text) => { if (text) onChange(item.id, text) })}><WandSparkles aria-hidden /></Button>
            {item.visibility === "private" ? <span className="mt-2 shrink-0 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{t("Private")}</span> : null}
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`${t("Delete")} ${item.text}`} onClick={() => void onDelete(item)}><X aria-hidden /></Button>
          </div>
        ))}
        <div className="flex items-start gap-2 pt-1">
          {multiline ? (
            <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void addItem() } }} placeholder={`${t("Add")} ${t(label).toLowerCase()}`} aria-label={`${t("Add")} ${t(label).toLowerCase()}`} rows={2} />
          ) : (
            <Input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addItem() } }} placeholder={`${t("Add")} ${t(label).toLowerCase()}`} aria-label={`${t("Add")} ${t(label).toLowerCase()}`} />
          )}
          <Button type="button" variant="default" size="icon-sm" aria-label={`${t("Rewrite")} ${t(label).toLowerCase()}`} title={t("Rewrite")} disabled={!draft.trim()} onClick={() => void onMagicWand("draft", defaultKind, draft).then((text) => { if (text) setDraft(text) })}><WandSparkles aria-hidden /></Button>
          <Button type="button" variant="outline" size="icon-sm" aria-label={`Add ${label.toLowerCase()} item`} onClick={() => void addItem()}><Plus aria-hidden /></Button>
        </div>
      </div>
    </FieldSet>
  )
}

export function ContextEditor({ product, initialItems }: ContextEditorProps) {
  const { locale, t } = useLocale()
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
  const [, setWandLoadingId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  function updateText(id: string, text: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, text } : item))
    setDirtyIds((current) => new Set(current).add(id))
    setStatus("dirty")
    setError(null)
  }

  async function rewriteText(id: string, kind: ContextItemKind, text: string) {
    if (!text.trim()) return null
    setWandLoadingId(id)
    setError(null)
    try {
      const result = await requestJson<{ text: string }>(`/api/products/${product.id}/context/rewrite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, text }),
      })
      setStatus("dirty")
      return result.text
    } catch (requestError) {
      setStatus("error")
      setError(requestError instanceof Error ? requestError.message : "Could not rewrite context")
      return null
    } finally {
      setWandLoadingId(null)
    }
  }

  async function autofillFromUrl() {
    if (!productUrl.trim()) return
    setAnalyzing(true)
    setError(null)
    try {
      const result = await requestJson<{ preview: ProductPreview }>("/api/products/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
      })
      const generated = entriesFromPreview(result.preview)
      const additions = generated.filter((entry) => !items.some((item) => item.kind === entry.kind && item.text.trim())).map((entry, index) => ({
        id: `local-ai-${entry.id}-${Date.now()}-${index}`,
        product_id: product.id,
        kind: entry.kind,
        text: entry.text,
        visibility: "public" as const,
        source: "ai" as const,
        sort_order: items.length + index,
      }))
      setItems((current) => [...current, ...additions])
      setDirtyIds((current) => new Set([...current, ...additions.map((item) => item.id)]))
      setStatus(additions.length ? "dirty" : "saved")
    } catch (requestError) {
      setStatus("error")
      setError(requestError instanceof Error ? requestError.message : "Could not analyze product URL")
    } finally {
      setAnalyzing(false)
    }
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
          <Field><FieldLabel htmlFor="product-url">{t("Public product URL")}</FieldLabel><div className="flex items-center gap-2"><Input id="product-url" type="url" value={productUrl} onChange={(event) => { setProductUrl(event.target.value); setStatus("dirty") }} /><Button type="button" size="sm" onClick={() => void autofillFromUrl()} disabled={analyzing || !productUrl.trim()}><WandSparkles data-icon="inline-start" />{analyzing ? (locale === "ru" ? "Анализируем…" : "Analyzing…") : (locale === "ru" ? "Заполнить" : "Autofill")}</Button></div><FieldDescription>{locale === "ru" ? "Используем его, чтобы понять публичные возможности продукта перед сопоставлением со спросом." : "We use this to understand the public surface area before matching demand."}</FieldDescription></Field>
        </FieldGroup>
        <EditableList label="Positioning" description="The clearest sentence describing why this product exists." items={items} kinds={["positioning"]} defaultKind="positioning" visibility="public" multiline onChange={updateText} onMagicWand={rewriteText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Ideal customer profile" description="Who gets the most value from this product." items={items} kinds={["icp"]} defaultKind="icp" visibility="public" multiline onChange={updateText} onMagicWand={rewriteText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Problems solved" description="What your product helps someone do or avoid." items={items} kinds={["problem"]} defaultKind="problem" visibility="public" onChange={updateText} onMagicWand={rewriteText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Public capabilities" description="Only functionality users can access today." items={items} kinds={["capability", "feature"]} defaultKind="capability" visibility="public" onChange={updateText} onMagicWand={rewriteText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Differentiators" description="Public reasons to choose this product." items={items} kinds={["differentiator"]} defaultKind="differentiator" visibility="public" onChange={updateText} onMagicWand={rewriteText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Private roadmap" description="Kept private and used only for internal classification." items={items} kinds={["roadmap"]} defaultKind="roadmap" visibility="private" multiline onChange={updateText} onMagicWand={rewriteText} onAdd={addItem} onDelete={deleteItem} />
        <EditableList label="Relevant keywords" description="Terms and concepts that help source adapters find useful evidence." items={items} kinds={["keyword"]} defaultKind="keyword" visibility="public" onChange={updateText} onMagicWand={rewriteText} onAdd={addItem} onDelete={deleteItem} />
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex items-center justify-between gap-4 border-t pt-5"><span className="flex items-center gap-2 text-xs text-muted-foreground">{status === "saved" ? <><span className="size-1.5 rounded-full bg-foreground" aria-hidden /> {t("All changes saved")}</> : status === "saving" ? <><span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden /> {locale === "ru" ? "Сохранение изменений…" : "Saving changes…"}</> : <><span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden /> {t("Unsaved changes")}</>}</span><Button type="submit" disabled={status === "saving"}>{t(status === "saving" ? "Saving…" : "Save context")}</Button></div>
      </form>
    </div>
  )
}
