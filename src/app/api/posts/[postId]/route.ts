import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupabaseServerClient } from "@/lib/supabase/server"

const saveSchema = z.object({
  editorJson: z.record(z.string(), z.unknown()),
  plainText: z.string().max(100_000),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const input = saveSchema.parse(await request.json())
  const { error } = await supabase.from("posts").update({
    editor_json: input.editorJson,
    plain_text: input.plainText,
    character_count: input.plainText.length,
  }).eq("id", postId)
  if (error) return NextResponse.json({ error: error.message }, { status: 422 })
  await supabase.from("post_revisions").insert({ post_id: postId, editor_json: input.editorJson, plain_text: input.plainText, revision_type: "autosave" })
  return NextResponse.json({ ok: true })
}
