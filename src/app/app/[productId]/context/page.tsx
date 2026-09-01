import { PageHeader } from "@/components/page-header"
import { ContextEditor } from "@/components/context-editor"
import { productFromRow } from "@/lib/product-data"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

export default async function ContextPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from("products").select("id,name,public_url,additional_context,product_context_items(kind,text,visibility)").eq("id", productId).single()
  if (!data) notFound()
  const product = productFromRow(data)
  return <div className="flex flex-col gap-8"><PageHeader eyebrow="Product model" title="Product context" description="The shared model behind every demand match. Keep what is public, what is planned, and what is still just a thought in one editable place." actions={<span className="text-xs text-muted-foreground">Last analyzed today</span>} /><ContextEditor product={product} /></div>
}
