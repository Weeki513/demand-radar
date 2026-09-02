import { PageHeader } from "@/components/page-header"
import { ContextEditor, type ContextItem, type ContextItemKind } from "@/components/context-editor"
import { productFromRow } from "@/lib/product-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { LocalizedText } from "@/lib/i18n"

export default async function ContextPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from("products").select("id,name,public_url,additional_context,product_context_items(id,product_id,kind,text,visibility,source,sort_order,metadata)").eq("id", productId).single()
  if (!data) notFound()
  const product = productFromRow(data)
  const contextItems = (data.product_context_items ?? []).map((item) => ({
    id: item.id,
    product_id: item.product_id,
    kind: item.kind as ContextItemKind,
    text: item.text,
    visibility: item.visibility as "public" | "private",
    source: item.source as "manual" | "ai",
    sort_order: item.sort_order,
    metadata: item.metadata as Record<string, unknown> | undefined,
  })) satisfies ContextItem[]
  return <div className="flex flex-col gap-8"><PageHeader eyebrow="Product model" title="Product context" description="The shared model behind every demand match. Keep what is public, what is planned, and what is still just a thought in one editable place." actions={<span className="text-xs text-muted-foreground"><LocalizedText text="Last analyzed today" /></span>} /><ContextEditor product={product} initialItems={contextItems} /></div>
}
