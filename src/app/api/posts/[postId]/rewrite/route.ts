import { NextResponse } from "next/server"
import { z } from "zod"

import { OpenAITextGenerationProvider } from "@/ai/openai-provider"
import { redactPrivateContext } from "@/domain/redaction"
import type { ContextItem } from "@/domain/contracts"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const rewriteSchema = z.object({ instruction: z.string().trim().min(1).max(2_000) })

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const input = rewriteSchema.parse(await request.json())
  const { data: post, error } = await supabase.from("posts").select("plain_text,platform,product_id").eq("id", postId).single()
  if (error) return NextResponse.json({ error: "Post not found" }, { status: 404 })
  const { data: privateRows } = await supabase.from("product_context_items").select("id,kind,text,visibility,source,sort_order,metadata").eq("product_id", post.product_id).or("visibility.eq.private,kind.eq.roadmap")
  const provider = new OpenAITextGenerationProvider()
  try {
    const preview = await provider.rewritePost({ platform: post.platform, body: post.plain_text, instruction: input.instruction })
    const privateItems: ContextItem[] = (privateRows ?? []).map((row) => ({ id: row.id, kind: row.kind, text: row.text, visibility: row.visibility, source: row.source, sortOrder: row.sort_order, metadata: row.metadata }))
    const safe = redactPrivateContext(preview.body, privateItems)
    if (safe.redacted) return NextResponse.json({ error: "Rewrite referenced private product context." }, { status: 422 })
    return NextResponse.json({ preview })
  } catch (rewriteError) {
    return NextResponse.json({ error: rewriteError instanceof Error ? rewriteError.message : "Rewrite failed", retryable: true }, { status: 503 })
  }
}
