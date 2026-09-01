import { NextResponse } from "next/server"
import { z } from "zod"

import { OpenAITextGenerationProvider } from "@/ai/openai-provider"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const requestSchema = z.object({ thought: z.string().trim().min(3).max(8_000) })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Add a longer thought to structure" }, { status: 422 })

  const { data: product, error } = await supabase
    .from("products")
    .select("name,public_url,additional_context,product_context_items(kind,text,visibility)")
    .eq("id", productId)
    .maybeSingle()
  if (error || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  const publicItems = (product.product_context_items ?? [])
    .filter((item) => item.visibility === "public")
    .map((item) => `${item.kind}: ${item.text}`)
    .join("\n")
  const sourceText = [
    `Product: ${product.name}`,
    `Public URL: ${product.public_url}`,
    product.additional_context ? `Public description: ${product.additional_context}` : "",
    publicItems ? `Existing public context:\n${publicItems}` : "",
    `New unstructured thought:\n${parsed.data.thought}`,
  ]
    .filter(Boolean)
    .join("\n\n")

  try {
    const preview = await new OpenAITextGenerationProvider().structureProduct({
      sourceUrl: product.public_url,
      sourceText,
    })
    return NextResponse.json({ preview })
  } catch {
    return NextResponse.json(
      { error: "The AI structuring request failed. Try again in a moment." },
      { status: 503 },
    )
  }
}
