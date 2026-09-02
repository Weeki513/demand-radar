import { NextResponse } from "next/server"
import { z } from "zod"

import { OpenAITextGenerationProvider } from "@/ai/openai-provider"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const requestSchema = z.object({
  kind: z.enum(["positioning", "icp", "problem", "capability", "feature", "differentiator", "roadmap", "keyword"]),
  text: z.string().trim().min(1).max(2_000),
})

export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Enter some context to rewrite" }, { status: 422 })

  const { data: product, error: productError } = await supabase.from("products").select("id").eq("id", productId).maybeSingle()
  if (productError || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  try {
    const result = await new OpenAITextGenerationProvider().rewriteContext(parsed.data)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "The AI rewrite failed. Try again in a moment." }, { status: 503 })
  }
}
