import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupabaseServerClient } from "@/lib/supabase/server"

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  publicUrl: z.string().url().max(2_048),
  additionalContext: z.string().trim().max(10_000).default(""),
})

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303)

  const form = await request.formData()
  const parsed = createSchema.safeParse({
    name: form.get("name"),
    publicUrl: form.get("publicUrl"),
    additionalContext: form.get("additionalContext") ?? "",
  })
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/app/new?error=invalid-input", request.url), 303)
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      public_url: parsed.data.publicUrl,
      additional_context: parsed.data.additionalContext,
    })
    .select("id")
    .single()
  if (error) {
    return NextResponse.redirect(new URL("/app/new?error=create-failed", request.url), 303)
  }
  await supabase.from("scan_configs").insert({ product_id: product.id })

  return NextResponse.redirect(new URL(`/app/${product.id}/context`, request.url), 303)
}
