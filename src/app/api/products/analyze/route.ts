import { NextResponse } from "next/server"
import { z } from "zod"

import { OpenAITextGenerationProvider } from "@/ai/openai-provider"
import { readPublicProductPage } from "@/solari/browser"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const requestSchema = z.object({ url: z.string().url().max(2_048) })

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { url } = requestSchema.parse(await request.json())
    const page = await readPublicProductPage(url)
    const provider = new OpenAITextGenerationProvider()
    const preview = await provider.structureProduct({
      sourceUrl: page.finalUrl,
      sourceText: [page.title, page.description, page.text].filter(Boolean).join("\n\n"),
    })

    return NextResponse.json({
      preview,
      source: {
        requestedUrl: page.requestedUrl,
        finalUrl: page.finalUrl,
        retrievedAt: page.retrievedAt,
        transport: page.transport,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed"
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
