import { NextResponse } from "next/server"
import { z } from "zod"

import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { DEFAULT_SOURCE_CONFIGS } from "@/sources/default-configs"

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
})

export async function POST(request: Request) {
  const form = await request.formData()
  const parsed = signupSchema.safeParse({ email: form.get("email"), password: form.get("password") })
  if (!parsed.success) return NextResponse.redirect(new URL("/signup?error=invalid-input", request.url), 303)

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  })
  if (error || !data.user) {
    const code = error?.message.toLowerCase().includes("already") ? "already-registered" : "signup-failed"
    return NextResponse.redirect(new URL(`/signup?error=${code}`, request.url), 303)
  }

  const supabase = await createSupabaseServerClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password })
  if (signInError) return NextResponse.redirect(new URL("/login?error=signup-login-failed", request.url), 303)

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({ owner_id: data.user.id, name: "My first product", public_url: "https://example.com", additional_context: "", is_demo: false })
    .select("id")
    .single()
  if (productError || !product) return NextResponse.redirect(new URL("/app/new?error=workspace-create-failed", request.url), 303)

  await Promise.all([
    supabase.from("scan_configs").insert({ product_id: product.id }),
    supabase.from("source_configs").insert(DEFAULT_SOURCE_CONFIGS.map((config) => ({ ...config, product_id: product.id }))),
  ])
  return NextResponse.redirect(new URL(`/app/${product.id}/context`, request.url), 303)
}
